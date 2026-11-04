// ============================================================================
// ストラップ診断 本体（設問・文言は finder-config.js を編集する）
//  - #strap-finder に描画。自己完結（CSSは finder.css、名前空間 .sf-）
//  - GA4: dataLayer に gtag 形式で push
//      diag_open / diag_q_<id>（各設問の表示）/ diag_answer（答えた内容）/ diag_done（結果表示）
//      diag_result_click（商品ページへ）/ diag_restart / diag_consult
//  - ?debug=1 を付けると、結果の下に判定の内訳を表示する
// ============================================================================
(function (root) {
  'use strict';
  // このスクリプト自身の置き場所を基準に、素材(../*-worn-svg.js など)の場所を決める。
  // Shopifyのページに置いても、GitHub Pages上でも、同じ設定のまま素材を読める
  var SELF_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
  function assetUrl(u) { try { return SELF_SRC ? new URL(u, SELF_SRC).href : u; } catch (e) { return u; } }

  // ---------- 純粋なロジック（Nodeでもテストできる） ----------
  // Duetは CW73(ウロコ正位置) / CW73R(逆向き) のどちらも人気なので、診断のたびにランダムで片方を提案する(同じ診断中は固定)
  var duetPick = null;
  function variantOf(cfg, id) {
    var vs = cfg.variants && cfg.variants[id];
    if (!vs) return id;
    if (!duetPick) duetPick = vs[Math.floor(Math.random() * vs.length)].id;
    var v = vs.filter(function (x) { return x.id === duetPick; })[0];
    if (!cfg.models[v.id]) { cfg.models[v.id] = Object.assign({}, cfg.models[id], v.model); }
    return v.id;
  }
  function visibleSteps(cfg, a) {
    return cfg.steps.filter(function (s) { return !s.show || s.show(a); });
  }

  function computeResult(cfg, a) {
    if (a.inst === 'other') return { consult: true };
    var group = cfg.groupOf(a);
    var rule = cfg.rules[group] && cfg.rules[group][a.focus];
    if (!rule) return { error: 'rule not found: ' + group + '/' + a.focus };
    var models = rule.map(function (id0, i) {
      var id = variantOf(cfg, id0);
      var m = cfg.models[id];
      var sur = null;
      cfg.surprises.forEach(function (s) {
        if (s.model === id0 && s.groups.indexOf(group) >= 0) sur = s.text;
      });
      return { id: id, model: m, surprise: sur, rank: i + 1 };
    });
    var heavy = group === 'elec_heavy' || group === 'bass';
    var top = models[0].model;
    var notes = [];
    if (heavy) notes.push(cfg.notes.heavy);
    // 「少し伸びることがある」の注意書きは、重い楽器(エレキの重め・ベース)を選んだ人にだけ出す
    var pin = (a.pin === 'pin1' || a.pin === 'pin0');
    // 配色: 選んだ組み合わせ + 同じ雰囲気の他の配色（重複する名前は除く）
    var main = null, others = [];
    cfg.recipes.forEach(function (r) {
      if (r.color === a.color && r.mood === a.mood) main = r;
    });
    cfg.recipes.forEach(function (r) {
      if (r.mood === a.mood && r !== main && r.color !== 'unknown' && r.color !== a.color &&
          (!main || r.name !== main.name) && !others.some(function (o) { return o.name === r.name; })) others.push(r);
    });
    return { group: group, models: models, notes: notes, pin: pin, recipe: main, otherRecipes: others.slice(0, 2) };
  }

  var api = { visibleSteps: visibleSteps, computeResult: computeResult };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof document === 'undefined') { return; }

  // ---------- 画面 ----------
  var cfg = root.STRAP_FINDER_CONFIG;
  var el = document.getElementById('strap-finder');
  if (!cfg || !el) return;

  var dbg = /[?&]debug=1/.test(location.search);
  var state = { a: {}, idx: -1, opened: false };
  var history = [];

  root.dataLayer = root.dataLayer || [];
  function gtag() { root.dataLayer.push(arguments); }
  function track(name, extra) {
    try { gtag('event', name, extra || {}); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function hex(id) { return cfg.palette[id] ? cfg.palette[id].hex : '#ccc'; }
  function cname(id) { return cfg.palette[id] ? cfg.palette[id].name : id; }
  function dot(id) { return '<span class="sf-dot" style="background:' + hex(id) + '" title="' + esc(cname(id)) + '"></span>'; }

  function shell(inner, progress) {
    var banner = cfg.prototypeBanner ? '<div class="sf-proto">試作版（公開前の確認用）</div>' : '';
    var bar = '';
    if (progress) {
      var segs = '';
      for (var i = 0; i < progress.total; i++) segs += '<i class="' + (i < progress.now ? 'on' : '') + '"></i>';
      bar = '<div class="sf-top"><button type="button" class="sf-back" data-act="back" aria-label="' + esc(cfg.buttons.back) + '">‹</button>' +
        '<div class="sf-bar">' + segs + '</div><span class="sf-count">' + progress.now + ' / ' + progress.total + '</span></div>';
    }
    el.innerHTML = banner + '<div class="sf-card">' + bar + inner + '</div>';
    el.scrollIntoView ? window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 8), behavior: 'auto' }) : 0;
  }

  var introTimer = null;
  function renderIntro() {
    var t = cfg.intro;
    if (introTimer) { clearInterval(introTimer); introTimer = null; }
    var steps = (t.steps || []).map(function (x, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(x) + '</span></li>'; }).join('');
    shell('<div class="sf-intro"><div class="sf-kicker">' + esc(t.kicker) + '</div><h1 class="sf-h1">' + br(t.title) + '</h1>' +
      '<div class="sf-intro-art" id="sf-intro-art"><span class="sf-worn-load">&nbsp;</span></div><p class="sf-intro-cap" id="sf-intro-cap"></p>' +
      '<p class="sf-lead">' + esc(t.lead) + '</p>' + (steps ? '<ol class="sf-steps">' + steps + '</ol>' : '') +
      '<button type="button" class="sf-main" data-act="start">' + esc(t.start) + '</button><p class="sf-time">' + esc(t.time) + '</p></div>');
    initIntroArt();
  }
  // 診断の入口に、着用イラストの配色が次々に変わる絵を出す(「やってみたい」と思ってもらうための飾り)
  function initIntroArt() {
    // 開くたびに、着用イラストのあるモデルをランダムに1つ選び、配色を次々に変えて見せる
    var ids = Object.keys(cfg.wornMap || {}).filter(function (id) { return id !== 'kolmio_thick' && !cfg.worn[cfg.wornMap[id]].file; });
    var id = ids[Math.floor(Math.random() * ids.length)], key = cfg.wornMap[id];
    var inst = { i: 'intro', sel: '#sf-intro-art', id: id, key: key, view: 'front', ready: false };
    var seen = {}, list = cfg.recipes.filter(function (r) { if (seen[r.name]) return false; seen[r.name] = 1; return true; });
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
    if (!cfg.models[id]) Object.keys(cfg.variants || {}).forEach(function (base) {   // Duetは片方の型番を指す
      (cfg.variants[base] || []).forEach(function (v) { if (v.id === id) cfg.models[id] = Object.assign({}, cfg.models[base], v.model); });
    });
    var mm = cfg.models[id], k = 0, cap = function (r) { var c = el.querySelector('#sf-intro-cap'); if (c) c.textContent = (mm ? mm.name + '｜' : '') + '配色の例：' + r.name; };
    function paint() {
      var r = list[k % list.length]; k++;
      worn.fams = [r]; worn.famIdx = 0; worn.pat = cfg.patternDefault; worn.rnd = null;
      paintInst(inst); cap(r);
    }
    inst.onReady = function () {
      paint();
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!still) introTimer = setInterval(function () {
        if (!el.querySelector('#sf-intro-art svg')) { clearInterval(introTimer); introTimer = null; return; }
        paint();
      }, 2800);
    };
    initInst(inst);
  }

  function renderStep() {
    var steps = visibleSteps(cfg, state.a);
    var s = steps[state.idx];
    var total = state.a.inst ? Math.max(steps.length, 1) : 5; // 楽器を選ぶ前は、標準的な5問として表示
    var html = '<h2 class="sf-q">' + esc(s.title) + '</h2>' + (s.note ? '<p class="sf-note">' + esc(s.note) + '</p>' : '');
    var cls = s.layout === 'grid' ? 'sf-opts sf-grid' : 'sf-opts';
    if (s.layout === 'grid' && (root.STRAP_FINDER_ICONS || {})[s.id]) cls += ' sf-grid-pic';
    html += '<div class="' + cls + '">';
    s.options.forEach(function (o, i) {
      var sel = state.a[s.id] === o.value && o._sel !== false ? '' : '';
      var extra = '';
      var icons = (root.STRAP_FINDER_ICONS || {})[s.id] || {};
      var pic = icons[o.value] ? '<span class="sf-pic">' + icons[o.value] + '</span>' : '';
      if (o.dots) extra = '<span class="sf-dots">' + o.dots.map(dot).join('') + '</span>';
      if (o.dot) extra = '<span class="sf-dots"><span class="sf-dot sf-dot-lg" style="background:' + o.dot + '"></span></span>';
      if (pic) extra = '';  // 絵があるときは色の丸は出さない
      html += '<button type="button" class="sf-opt' + (pic ? ' sf-has-pic' : '') + '" data-act="pick" data-i="' + i + '">' + pic +
        '<span class="sf-opt-tx"><span class="sf-opt-t">' + br(o.label) + '</span>' +
        (o.sub ? '<span class="sf-opt-s">' + esc(o.sub) + '</span>' : '') + extra + '</span></button>';
    });
    html += '</div>';
    shell(html, { now: state.idx + 1, total: total });
    track('diag_q_' + s.id, { diag_step: state.idx + 1 });
  }

  function recipeHtml(r, big) {
    return '<div class="sf-recipe' + (big ? ' sf-recipe-main' : '') + '"><div class="sf-swatches">' +
      r.c.map(function (id) { return '<span class="sf-sw" style="background:' + hex(id) + '"></span>'; }).join('') + '</div>' +
      '<div class="sf-rname">' + esc(r.name) + '</div>' +
      '<div class="sf-rcols">' + r.c.map(cname).join(' / ') + '</div>' +
      '<div class="sf-rtext">' + esc(r.text) + '</div></div>';
  }

  function styleQ(mm) { return mm && mm.extraQuery ? '&' + mm.extraQuery : ''; }  // シミュレーター側が読む追加パラメータ(Duetのウロコ向き・Kolmioの厚革)
  function colorQuery(r) { return r ? ('?diag=1&diag_colors=' + r.c.join(',')) : '?diag=1'; }

  function modelCard(m, big, recipe, extraHtml) {
    var mm = m.model;
    var html = '<div class="sf-model' + (big ? ' sf-model-main' : '') + '">';
    if (m.tag) html += '<div class="sf-tag">' + esc(m.tag) + '</div>';
    else if (m.surprise) html += '<div class="sf-tag">こんな使い方もできます</div>';
    html += '<div class="sf-mname">' + esc(mm.name) + '<small>' + esc(mm.ja) + '</small></div>';
    html += '<p class="sf-mline">' + esc(m.surprise || mm.line) + '</p>';
    if (m.surprise) html += '<p class="sf-mline sf-sub">' + esc(mm.line) + '</p>';
    if (mm.how && (big || m.surprise)) html += '<p class="sf-how">' + esc(mm.how) + '</p>';
    if (extraHtml) html += extraHtml;
    html += '<div class="sf-mfoot"><span class="sf-price">' + esc(mm.price) + '</span>' +
      '<a class="' + (big ? 'sf-main' : 'sf-sec') + '" href="' + esc(mm.url + (recipe ? linkQuery(m.id) : '?diag=1' + styleQ(mm) + (m.id === 'onstage' ? '' : SIM_HASH))) + '" data-act="go" data-model="' + esc(m.id) + '">' +
      esc(big && recipe && mm.handoff ? cfg.buttons.simulator : cfg.buttons.open)  /* 配色を引き継げるモデルだけ「この配色で〜」 */ + '</a></div></div>';
    return html;
  }

  function renderResult() {
    var res = computeResult(cfg, state.a);
    if (res.consult) {
      shell('<h2 class="sf-q">お気軽にご相談ください</h2><p class="sf-note">選択肢にない楽器でも、ぴったりのストラップをご提案します。</p>' +
        '<a class="sf-main" href="' + esc(cfg.consultUrl) + '" data-act="consult">' + esc(cfg.buttons.consult) + '</a>' +
        '<button type="button" class="sf-link" data-act="restart">' + esc(cfg.buttons.restart) + '</button>');
      track('diag_done', { diag_result: 'consult' });
      return;
    }
    if (res.error) { shell('<p class="sf-note">' + esc(res.error) + '</p><button type="button" class="sf-link" data-act="restart">' + esc(cfg.buttons.restart) + '</button>'); return; }

    var html = '<div class="sf-kicker">RESULT</div><h2 class="sf-q">あなたにおすすめは</h2>';
    // 配色の状態（系統・色の入れ方）を決めてから描画する
    worn.res = res; worn.fams = res.recipe ? [res.recipe].concat(res.otherRecipes) : []; worn.famIdx = 0;
    var topPats = patternsOf(res.models[0].id);
    worn.pat = topPats.indexOf(cfg.patternDefault) >= 0 ? cfg.patternDefault : topPats[0];
    worn.insts = []; worn.rnd = null;
    res.models.forEach(function (m, i) { var k = cfg.wornMap && cfg.wornMap[m.id]; if (k) worn.insts.push({ i: i, id: m.id, key: k, view: 'front', ready: false }); });
    var hasFam = worn.fams.length > 0;
    html += modelCard(res.models[0], true, hasFam ? res.recipe : null);
    if (hasFam) {
      html += '<h3 class="sf-h3">おすすめの配色</h3>';
      var i0 = instOf(0);
      if (i0) html += stageHtml(i0, false);
      html += '<div class="sf-h4">配色の系統</div><div class="sf-rpick" id="sf-rpick">' + famChips() + '</div>';
      if (topPats.length > 1) html += '<div class="sf-h4">色の入れ方</div><div class="sf-pats" id="sf-pats">' + patChips() + '</div>';
      html += '<p class="sf-note sf-rnote">選んだあとも、シミュレーターで自由に変更できます。</p>';
      var rand = res.models.some(function (m) { var h = m.model && m.model.handoff; return h && (h.belt || h.kind); });   // ベルト・PVC・金具などの提案があるときだけ
      if (rand) html += '<button type="button" class="sf-shuffle" data-act="shuffle">ベルトや金具の組み合わせを変えてみる</button>';
    }
    if (res.notes.length) html += '<div class="sf-notes">' + res.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>';
    if (res.pin) html += modelCard({ id: 'onstage', model: cfg.models.onstage, surprise: null, tag: cfg.notes.pinTag }, false, null).replace('sf-model"', 'sf-model sf-model-pin"');
    if (res.models.length > 1) {
      html += '<h3 class="sf-h3">ほかの候補</h3>' + (worn.insts.length > 1 ? '<p class="sf-note">同じ配色で着けると、こんな雰囲気です。</p>' : '');
      res.models.slice(1).forEach(function (m, j) {
        var ii = instOf(j + 1);
        html += modelCard(m, false, hasFam ? res.recipe : null, ii ? stageHtml(ii, true) : '');
      });
    }
    html += '<button type="button" class="sf-link" data-act="restart">' + esc(cfg.buttons.restart) + '</button>';
    if (dbg) {
      html += '<pre class="sf-debug">' + esc(JSON.stringify({ answers: state.a, group: res.group,
        models: res.models.map(function (m) { return m.id; }), recipe: res.recipe && res.recipe.name }, null, 1)) + '</pre>';
    }
    shell(html);
    initAllWorn();
    track('diag_done', { diag_group: res.group, diag_top: res.models[0].id, diag_focus: state.a.focus, diag_color: state.a.color, diag_mood: state.a.mood });
  }


  // ---------- 配色パターンと着用イラスト ----------
  var worn = { res: null, fams: [], famIdx: 0, pat: 'trio', insts: [] };
  var wornLoaded = {};
  function patById(id) { var r = null; cfg.patterns.forEach(function (p) { if (p.id === id) r = p; }); return r; }
  function patternsOf(modelId) { var m = cfg.models[modelId]; return (m && m.patterns && m.patterns.length) ? m.patterns : [cfg.patternDefault]; }
  // そのモデルで選べる色の入れ方に丸める（選べない場合は3色→先頭の順）
  function effPat(modelId) {
    var ps = patternsOf(modelId);
    if (ps.indexOf(worn.pat) >= 0) return worn.pat;
    return ps.indexOf(cfg.patternDefault) >= 0 ? cfg.patternDefault : ps[0];
  }
  function curSeq(modelId) { var f = worn.fams[worn.famIdx]; return f ? patById(modelId ? effPat(modelId) : worn.pat).seq(f) : []; }
  // 診断の配色を、各シミュレーターが読めるURLパラメータ(?folklore=… ?kolmio=… ?duet=… ?courier=…)に変換する
  // handoff: n=パーツ数, belt=ベルト色(診断では選ばないので固定), reverse=true なら「先頭=末端、最後=先端」の並び
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function nearest(hx, pal) {   // pal: {id: hex}。診断の色にいちばん近い色のid
    var a = rgb(hx), best = null, bd = 1e9;
    Object.keys(pal).forEach(function (id) { var b = rgb(pal[id]), d = 0; for (var k = 0; k < 3; k++) d += (a[k] - b[k]) * (a[k] - b[k]); if (d < bd) { bd = d; best = id; } });
    return best;
  }
  // 系統ごとの候補(配列)から、診断ごとに決めた乱数で1つ選ぶ。同じ診断中は変わらない
  function pickOf(f, key, dflt) {
    var v = f && f[key]; if (!v) return dflt;
    if (!Array.isArray(v)) return v;
    if (!worn.rnd) worn.rnd = {};
    if (worn.rnd[key] == null) worn.rnd[key] = Math.random();
    return v[Math.floor(worn.rnd[key] * v.length)];
  }
  function handoffQ(modelId, seq) {
    var mm = cfg.models[modelId], h = mm && mm.handoff, f = worn.fams[worn.famIdx];
    if (!h || !seq.length) return '';
    var at = function (i) { return seq[i % seq.length]; }, ids = [], i;
    if (h.kind === 'triad') {          // ベルト3本(先端から)+取付け革+金具
      for (i = 0; i < 3; i++) ids.push(nearest(hex(at(i)), cfg.triadBelts));
      ids.push(pickOf(f, 'parts', 'brown')); ids.push(pickOf(f, 'metal', 'gold'));
      return '&' + h.param + '=' + ids.join('-');
    }
    if (h.kind === 'clear') {          // PVC色-後端の革-前端の革
      return '&' + h.param + '=' + [pickOf(f, 'pvc', 'cwhite'), at(1), at(0)].join('-');
    }
    for (i = 0; i < h.n; i++) ids.push(at(i));
    if (h.reverse) ids.reverse();
    if (h.belt) ids.push(pickOf(f, 'belt', 'brown'));
    return '&' + h.param + '=' + ids.join('-');
  }
  var SIM_HASH = '#color-simulator';   // 商品ページのシミュレーター位置までスクロールして開く
  function linkQuery(modelId) {
    var mm = cfg.models[modelId], f = worn.fams[worn.famIdx];
    if (!f) return '?diag=1' + styleQ(mm) + SIM_HASH;
    var seq = curSeq(modelId);
    return '?diag=1&diag_pattern=' + effPat(modelId) + '&diag_colors=' + seq.join(',') + handoffQ(modelId, seq) + styleQ(mm) + SIM_HASH;
  }
  function curQuery() {
    var f = worn.fams[worn.famIdx]; if (!f) return '?diag=1';
    var top = worn.res ? worn.res.models[0].id : null;
    return '?diag=1&diag_pattern=' + (top ? effPat(top) : worn.pat) + '&diag_colors=' + curSeq(top).join(',');
  }
  function instOf(i) { var r = null; worn.insts.forEach(function (x) { if (x.i === i) r = x; }); return r; }
  function bar(seq, n) {
    var h = '<span class="sf-pbar">'; for (var k = 0; k < n; k++) h += '<i style="background:' + hex(seq[k % seq.length]) + '"></i>'; return h + '</span>';
  }
  function famChips() {
    return worn.fams.map(function (r, i) {
      return '<button type="button" class="sf-recipe' + (i === worn.famIdx ? ' on' : '') + '" data-act="family" data-i="' + i + '"><div class="sf-swatches">' +
        r.c.map(function (id) { return '<span class="sf-sw" style="background:' + hex(id) + '"></span>'; }).join('') + '</div>' +
        '<div class="sf-rname">' + esc(r.name) + '</div><div class="sf-rcols">' + r.c.map(cname).join(' / ') + '</div></button>';
    }).join('');
  }
  function patChips() {
    var top = worn.res.models[0].id, f = worn.fams[worn.famIdx];
    return patternsOf(top).map(function (id) {
      var p = patById(id);
      return '<button type="button" class="sf-pat' + (id === worn.pat ? ' on' : '') + '" data-act="pat" data-p="' + id + '">' + bar(p.seq(f), 8) + '<span>' + esc(p.name) + '</span></button>';
    }).join('');
  }
  function stageHtml(inst, small) {
    return '<div class="sf-worn' + (small ? ' sf-worn-sm' : '') + '" data-inst="' + inst.i + '"><div class="sf-worn-tabs"' + ((cfg.worn[inst.key] || {}).single ? ' style="display:none"' : '') + '>' +
      '<button type="button" class="on" data-act="wornview" data-inst="' + inst.i + '" data-v="front">' + esc(cfg.wornTexts.front) + '</button>' +
      '<button type="button" data-act="wornview" data-inst="' + inst.i + '" data-v="back">' + esc(cfg.wornTexts.back) + '</button></div>' +
      '<div class="sf-worn-stage"><span class="sf-worn-load">' + esc(cfg.wornTexts.loading) + '</span></div>' +
      '<p class="sf-worn-note"></p></div>';
  }
  function loadScript(src) {
    if (wornLoaded[src]) return wornLoaded[src];
    wornLoaded[src] = new Promise(function (ok, ng) {
      var sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = function () { delete wornLoaded[src]; ng(new Error('load')); };
      document.head.appendChild(sc);
    });
    return wornLoaded[src];
  }
  function hexToHsl(h) {
    var r = parseInt(h.substr(1, 2), 16) / 255, g = parseInt(h.substr(3, 2), 16) / 255, b = parseInt(h.substr(5, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hh = 0, ss = 0;
    if (d) { ss = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
    return [hh, ss, l];
  }
  function hslToHex(h, s, l) {
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    var r, g, b; if (!s) { r = g = b = l; } else { var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
    return '#' + [r, g, b].map(function (x) { return ('0' + Math.round(x * 255).toString(16)).slice(-2); }).join('');
  }
  function logoColor(hx) { var a = hexToHsl(hx), l = a[2] > .40 ? Math.max(.05, a[2] - .30) : Math.min(.90, a[2] + .30); return hslToHex(a[0], a[1], l); }
  function decodeId(id, def, front) {
    if (front && def.frontAlias && def.frontAlias[id] != null) return def.frontAlias[id];
    return +id.replace(/_x(\d\d)_/g, function (m, c) { return String.fromCharCode(parseInt(c, 16)); });
  }
  function stageOf(inst) { if (inst.sel) return el.querySelector(inst.sel); return el.querySelector('.sf-worn[data-inst="' + inst.i + '"] .sf-worn-stage'); }
  function initInst(inst) {
    var def = cfg.worn[inst.key], stage = stageOf(inst);
    if (!def || !stage || inst.started) return;
    inst.started = true;
    if (def.file) {   // 商品イメージのSVGファイルを読み込み、スタイルの色を書き換えて塗る(Triad系。着用の絵は無い)
      fetch(assetUrl(def.file)).then(function (r) { if (!r.ok) throw new Error('load'); return r.text(); }).then(function (txt) {
        stage = stageOf(inst); if (!stage) return;
        var doc = new DOMParser().parseFromString(txt, 'image/svg+xml'), src = doc.documentElement;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', src.getAttribute('viewBox')); svg.setAttribute('class', 'sf-worn-svg'); svg.setAttribute('data-v', 'front');
        svg.innerHTML = src.innerHTML;
        var st = svg.querySelector('style'); svg._css = st ? st.textContent : ''; svg._style = st;
        stage.innerHTML = ''; stage.appendChild(svg);
        inst.ready = true; if (inst.onReady) inst.onReady(); else paintInst(inst);
      }).catch(function () { inst.started = false; var s2 = stageOf(inst); if (inst.sel) { if (s2) s2.style.display = 'none'; return; } if (s2) s2.innerHTML = '<span class="sf-worn-load">イメージを読み込めませんでした。</span>'; });
      return;
    }
    if (def.zones) {   // パーツ区分(data-zone)で色を指定するタイプ(Duet/Courier)
      Promise.all(['front', 'back'].map(function (v) { return loadScript(assetUrl(def[v].src)); })).then(function () {
        stage = stageOf(inst); if (!stage) return;
        var NS = 'http://www.w3.org/2000/svg';
        stage.innerHTML = '';
        ['front', 'back'].forEach(function (v) {
          var d = root[def.global][def[v].key];
          var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', d.vb); svg.setAttribute('class', 'sf-worn-svg'); svg.setAttribute('data-v', v);
          svg.innerHTML = d.inner; svg._p = [];
          svg.querySelectorAll('[data-zone]').forEach(function (g) { var z = g.getAttribute('data-zone'); g.dataset.zone = z; svg._p.push(g); });
          svg.style.display = v === inst.view ? '' : 'none';
          stage.appendChild(svg);
        });
        inst.ready = true; if (inst.onReady) inst.onReady(); else paintInst(inst);
      }).catch(function () { inst.started = false; var s2 = stageOf(inst); if (inst.sel) { if (s2) s2.style.display = 'none'; return; } if (s2) s2.innerHTML = '<span class="sf-worn-load">着用イメージを読み込めませんでした。</span>'; });
      return;
    }
    loadScript(assetUrl(def.src)).then(function () {
      stage = stageOf(inst); if (!stage) return;   // 読み込み中に画面が変わった
      var inner = root[def.global], NS = 'http://www.w3.org/2000/svg';
      stage.innerHTML = '';
      ['front', 'back'].forEach(function (v) {
        var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', def[v].vb); svg.setAttribute('class', 'sf-worn-svg'); svg.setAttribute('data-v', v);
        svg.innerHTML = inner;
        var hide = svg.querySelector(def[v].hide); if (hide) hide.remove();
        svg._p = [];
        svg.querySelectorAll(def[v].pieces).forEach(function (g) { g.dataset.num = decodeId(g.id, def, v === 'front'); svg._p.push(g); });
        if (def.greyClass) svg.querySelectorAll(def.greyClass).forEach(function (e) { if (e.id !== 'logo') e.setAttribute('fill', '#7c7c7c'); });
        svg.style.display = v === inst.view ? '' : 'none';
        stage.appendChild(svg);
        if (def.clear && v === 'front') {   // PVC版のロゴは先端(1枚目・本革)に載る。3枚目から1枚目へ平行移動する
          try {
            var g1 = svg.querySelector('#front #_x31_'), g3 = svg.querySelector('#front #_x33_'), lg = g3 && g3.querySelector('#logo');
            if (g1 && lg) { var b1 = g1.getBBox(), b3 = g3.getBBox(); lg.setAttribute('transform', 'translate(' + ((b1.x + b1.width / 2) - (b3.x + b3.width / 2)).toFixed(3) + ',' + ((b1.y + b1.height / 2) - (b3.y + b3.height / 2)).toFixed(3) + ')'); g1.appendChild(lg); }
          } catch (e) {}
        }
      });
      inst.ready = true; if (inst.onReady) inst.onReady(); else paintInst(inst);
    }).catch(function () { inst.started = false; var s2 = stageOf(inst); if (inst.sel) { if (s2) s2.style.display = 'none'; return; } if (s2) s2.innerHTML = '<span class="sf-worn-load">着用イメージを読み込めませんでした。</span>'; });
  }
  // folklore Clear: 先端(前)と末端(後ろ)だけ本革、間はPVC(透け感のグラデーション)。シミュレーターと同じ塗り方
  function paintClear(inst, svg, def, seq) {
    var NS = 'http://www.w3.org/2000/svg', front = svg.getAttribute('data-v') === 'front', fm = worn.fams[worn.famIdx];
    var pvc = pickOf(fm, 'pvc', 'cwhite'), pre = 'sfc' + inst.i + (front ? 'f' : 'b');
    if (!svg._pvcDefs) {
      var d = document.createElementNS(NS, 'defs');
      Object.keys(cfg.pvcColors).forEach(function (id) {
        var hx = cfg.pvcColors[id], g = document.createElementNS(NS, 'linearGradient');
        g.setAttribute('id', pre + '-' + id); g.setAttribute('x1', '15%'); g.setAttribute('y1', '0%'); g.setAttribute('x2', '85%'); g.setAttribute('y2', '100%');
        var hl = hexToHsl(hx), shade = function (dl) { return hslToHex(hl[0], hl[1], Math.max(0.04, Math.min(0.96, hl[2] + dl))); };
        [[0, shade(0.32)], [38, shade(0.10)], [60, hx], [100, shade(-0.10)]].forEach(function (st) {
          var sp = document.createElementNS(NS, 'stop'); sp.setAttribute('offset', st[0] + '%'); sp.setAttribute('stop-color', st[1]); g.appendChild(sp);
        });
        d.appendChild(g);
      });
      svg.insertBefore(d, svg.firstChild); svg._pvcDefs = true;
    }
    var tip = hex(seq[0]), end = hex(seq[1 % seq.length]);
    (svg._p || []).forEach(function (g) {
      var n = +g.dataset.num, isEnd = front ? n === 1 : n === 20, col = isEnd ? (front ? tip : end) : null;
      g.querySelectorAll(def.fill).forEach(function (e) {
        if (e.id === 'logo') return;
        var f = col || 'url(#' + pre + '-' + pvc + ')';
        e.setAttribute('fill', f); e.style.fill = f;
        if (col) { e.removeAttribute('fill-opacity'); e.style.fillOpacity = ''; } else { e.setAttribute('fill-opacity', '0.9'); e.style.fillOpacity = '0.9'; }
      });
    });
    var lg = svg.querySelector('#logo');
    if (lg) { var lc = logoColor(tip); lg.setAttribute('fill', lc); lg.style.fill = lc; lg.setAttribute('fill-opacity', front ? '1' : '0'); lg.style.fillOpacity = front ? '1' : '0'; }
  }
  function paintInst(inst) {
    var def = cfg.worn[inst.key], stage = stageOf(inst), seq = curSeq(inst.id);
    if (!def || !seq.length || !stage || !inst.ready) return;
    stage.querySelectorAll('svg').forEach(function (svg) {
      if (def.file) {
        var fm2 = worn.fams[worn.famIdx], css = svg._css, hexOf = {};
        for (var zi = 0; zi < 3; zi++) hexOf['leather' + (zi + 1)] = cfg.triadBelts[nearest(hex(seq[zi % seq.length]), cfg.triadBelts)];
        hexOf.parts = cfg.triadParts[pickOf(fm2, 'parts', 'brown')]; hexOf.hardware = cfg.triadMetals[pickOf(fm2, 'metal', 'gold')];
        Object.keys(def.cls).forEach(function (z) {
          css = css.replace(new RegExp('(\\.' + def.cls[z] + '\\s*{[^}]*fill:\\s*)#[0-9a-fA-F]{3,6}'), '$1' + hexOf[z]);
        });
        if (svg._style) svg._style.textContent = css;
        var lg = svg.querySelector('#logo'); if (lg) lg.style.fill = logoColor(hexOf.parts);
        return;
      }
      if (def.zones) {
        var colOf = function (n) { return hex(seq[(n - 1) % seq.length]); };
        (svg._p || []).forEach(function (g) {
          var z = g.dataset.zone, fm = worn.fams[worn.famIdx], col = z === 'belt' ? (cfg.belts[pickOf(fm, 'belt', '')] || def.belt) : z === 'logo' ? logoColor(colOf(def.logoOn)) : (def.zones[z] ? colOf(def.zones[z]) : null);
          if (!col) return;
          (g.tagName.toLowerCase() === 'g' ? g.querySelectorAll('path,polygon,rect,circle') : [g]).forEach(function (n) { n.style.fill = col; });
        });
        return;
      }
      if (def.clear) { paintClear(inst, svg, def, seq); return; }
      (svg._p || []).forEach(function (g) {
        var col = hex(seq[(+g.dataset.num - 1) % seq.length]);
        g.querySelectorAll(def.fill).forEach(function (e) { e.setAttribute('fill', col); e.style.fill = col; });
        if (def.logo) g.querySelectorAll(def.logo).forEach(function (e) { var lc = logoColor(col); e.setAttribute('fill', lc); e.style.fill = lc; });
      });
    });
    // 選んだ色の入れ方がそのモデルで使えない場合は、近い入れ方で表示していることを伝える
    var note = el.querySelector('.sf-worn[data-inst="' + inst.i + '"] .sf-worn-note');
    if (note) {
      var used = effPat(inst.id);
      var mm = cfg.models[inst.id], pre = mm && mm.wornNote ? mm.wornNote : '';
      note.textContent = used !== worn.pat ? 'このモデルでは「' + patById(worn.pat).name + '」は選べないため、「' + patById(used).name + '」で表示しています。' : pre + (def.note || cfg.wornTexts.note);
    }
  }
  function refreshAll() {
    worn.insts.forEach(paintInst);
    // 商品ページへのリンクも、選んだ配色・色の入れ方にそろえる
    el.querySelectorAll('.sf-model a[data-model]').forEach(function (a) {
      if (a.getAttribute('data-model') === 'onstage') return;
      a.setAttribute('href', a.getAttribute('href').split('?')[0] + linkQuery(a.getAttribute('data-model')));
    });
  }
  function initAllWorn() {
    worn.insts.forEach(function (inst, k) {
      if (inst.i === 0 || !('IntersectionObserver' in root)) { initInst(inst); return; }
      var box = el.querySelector('.sf-worn[data-inst="' + inst.i + '"]');
      if (!box) return;
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); initInst(inst); } }); }, { rootMargin: '300px' });
      io.observe(box);   // ほかの候補は、画面に近づいたときに読み込む（通信量を抑える）
    });
  }

  function advance() {
    var steps = visibleSteps(cfg, state.a);
    if (state.a.inst === 'other' || state.idx + 1 >= steps.length) { state.idx = steps.length; renderResult(); }
    else { state.idx++; renderStep(); }
  }

  function goBack() {
    if (state.idx <= 0) { state.idx = -1; renderIntro(); return; }
    if (state.a.inst === 'other') { state.idx = 0; renderStep(); return; }
    // 戻る: 直前に表示した設問へ。結果画面からは最後の設問へ
    var steps = visibleSteps(cfg, state.a);
    state.idx = Math.min(state.idx, steps.length) - 1;
    renderStep();
  }

  el.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !el.contains(t)) return;
    var act = t.getAttribute('data-act');
    if (act === 'start') { if (!state.opened) { state.opened = true; track('diag_open', {}); } state.idx = 0; renderStep(); }
    else if (act === 'back') { goBack(); }
    else if (act === 'restart') { track('diag_restart', {}); state = { a: {}, idx: -1, opened: true }; renderIntro(); }
    else if (act === 'pick') {
      var steps = visibleSteps(cfg, state.a), s = steps[state.idx];
      var o = s.options[+t.getAttribute('data-i')];
      state.a[s.id] = o.value;
      // 以降の設問の答えが、変更により無効になる場合に備えて、表示されない設問の答えは消す
      cfg.steps.forEach(function (x) { if (x.show && !x.show(state.a)) delete state.a[x.id]; });
      track('diag_answer', { diag_q: s.id, diag_value: o.value });
      t.classList.add('sf-picked');
      setTimeout(advance, 140);
    }
    else if (act === 'family') {
      worn.famIdx = +t.getAttribute('data-i');
      el.querySelectorAll('#sf-rpick .sf-recipe').forEach(function (b, i) { b.classList.toggle('on', i === worn.famIdx); });
      var pc = document.getElementById('sf-pats'); if (pc) pc.innerHTML = patChips();
      refreshAll(); track('diag_recipe_pick', { diag_recipe: worn.fams[worn.famIdx].name, diag_pattern: worn.pat });
    }
    else if (act === 'shuffle') {
      worn.rnd = null; refreshAll(); track('diag_shuffle', { diag_recipe: worn.fams[worn.famIdx].name });
    }
    else if (act === 'pat') {
      worn.pat = t.getAttribute('data-p');
      el.querySelectorAll('#sf-pats .sf-pat').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === worn.pat); });
      refreshAll(); track('diag_pattern_pick', { diag_pattern: worn.pat, diag_recipe: worn.fams[worn.famIdx].name });
    }
    else if (act === 'wornview') {
      var inst = instOf(+t.getAttribute('data-inst')), v = t.getAttribute('data-v');
      if (inst) {
        inst.view = v;
        var box = el.querySelector('.sf-worn[data-inst="' + inst.i + '"]');
        box.querySelectorAll('.sf-worn-tabs button').forEach(function (b) { b.classList.toggle('on', b === t); });
        box.querySelectorAll('svg').forEach(function (svg) { svg.style.display = svg.getAttribute('data-v') === v ? '' : 'none'; });
      }
      track('diag_worn_view', { diag_view: v });
    }
    else if (act === 'go') { track('diag_result_click', { diag_model: t.getAttribute('data-model') }); }
    else if (act === 'consult') { track('diag_consult', {}); }
  });

  renderIntro();
})(typeof window !== 'undefined' ? window : globalThis);
