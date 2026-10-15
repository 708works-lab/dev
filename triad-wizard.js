// ============================================================================
// Triad「おまかせで選ぶ」ウィザード
//  - 雰囲気(3択) → 配色案(3案) → 仕上げ(金具・取付け革・長さ) → 確認 → 既存シミュレーターへ配色を反映
//  - 既存の triad-simulator.js のグローバル(TRIAD_*, triadColors 等)を利用し、既存コードは変更しない
//  - 入口は [data-tw-open="<流入元>"] を持つ要素。クリックで開く（イベント委譲）
//  - GA4: dataLayerにgtag形式でpush（既存の sim_view 等と同じ方式。sim_product=triad を付与）
//      sim_wiz_open / sim_wiz_s1〜s4(各ステップ表示) / sim_wiz_done(シミュレーターへ反映)
//      sim_wiz_close_s1〜s4(ステップ別の離脱) / sim_wiz_manual(自分で選ぶを選択)
// ============================================================================
(function () {
  if (window.__triadWizardLoaded) return;
  window.__triadWizardLoaded = true;

  var SVG_URL = 'https://708works-lab.github.io/dev/triad_color_order.svg';
  var PRODUCT = 'triad';

  // 配色案: [ベルト①, ベルト②, ベルト③, 取付け革, 金具, 名前]（idは triad-simulator.js のパレットid）
  var MOODS = [
    { id: 'soft', name: 'やさしい・ナチュラル', desc: '革の風合いを活かした、やわらかな雰囲気', dots: ['natural', 'camel', 'lightgrn'],
      props: [
        ['natural', 'camel', 'lightgrn', 'brown', 'gold', 'はちみつミルク'],
        ['camel', 'natural', 'brown', 'brown', 'gold', 'キャラメルラテ'],
        ['natural', 'sora', 'camel', 'brown', 'silver', 'そよ風']
      ] },
    { id: 'pop', name: 'はっきり・カラフル', desc: 'ステージでも映える、元気な配色', dots: ['red', 'sora', 'lightgrn'],
      props: [
        ['red', 'sora', 'lightgrn', 'black', 'silver', 'ポップなトリコロール'],
        ['deepred', 'camel', 'green', 'brown', 'gold', '秋の実り'],
        ['red', 'navy', 'camel', 'brown', 'gold', 'クラシックトリコ']
      ] },
    { id: 'chic', name: '落ち着き・シック', desc: 'どんなギターにも合わせやすい、大人の配色', dots: ['black', 'navy', 'darkbrown'],
      props: [
        ['black', 'navy', 'darkbrown', 'black', 'silver', 'ミッドナイト'],
        ['navy', 'grey', 'black', 'black', 'silver', 'ブルーグレー'],
        ['darkbrown', 'brown', 'camel', 'brown', 'gold', 'ココアブラウン']
      ] }
  ];

  var st = null;      // {step, mood, pick(array), hw, parts, len}
  var svgText = '';
  var root = null;
  var lastFocus = null;

  function track(name, extra) {
    try {
      window.dataLayer = window.dataLayer || [];
      var p = { sim_product: PRODUCT, sim_in_app: /Instagram|FBAN|FBAV|Line\/|TikTok|MicroMessenger/i.test(navigator.userAgent) ? 'yes' : 'no' };
      for (var k in (extra || {})) p[k] = extra[k];
      (function () { window.dataLayer.push(arguments); })('event', name, p);
    } catch (e) {}
  }

  function simReady() {
    return typeof TRIAD_BELT_COLORS !== 'undefined' && typeof TRIAD_PARTS_COLORS !== 'undefined' &&
      typeof TRIAD_HARDWARE_COLORS !== 'undefined' && typeof TRIAD_LENGTHS !== 'undefined' && typeof triadColors !== 'undefined';
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function belt(id) { return find(TRIAD_BELT_COLORS, id); }
  function parts(id) { return find(TRIAD_PARTS_COLORS, id); }
  function hw(id) { return find(TRIAD_HARDWARE_COLORS, id); }
  function yen(n) { return '¥' + n.toLocaleString(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- CSS（.tw- 名前空間。テーマCSSの div:empty{display:none} 対策で空divには display を明示）
  function injectCss() {
    if (document.getElementById('tw-css')) return;
    var css = [
      '.tw-root{position:fixed;inset:0;z-index:2147483000;display:none;font-family:inherit;color:#3a3226}',
      '.tw-root.tw-on{display:block}',
      '.tw-back{display:block;position:absolute;inset:0;background:rgba(60,48,28,.45)}',
      '.tw-sheet{position:absolute;left:0;right:0;bottom:0;top:0;background:#fffdf7;display:flex;flex-direction:column;overflow:hidden;animation:tw-up .3s ease}',
      '@keyframes tw-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}',
      '@media (min-width:750px){.tw-sheet{left:50%;right:auto;width:480px;top:5vh;bottom:5vh;margin-left:-240px;border-radius:20px;box-shadow:0 10px 40px rgba(60,48,28,.3)}}',
      '.tw-head{display:flex;align-items:center;padding:14px 16px 8px}',
      '.tw-x{border:0;background:none;font-size:26px;line-height:1;color:#8b8170;cursor:pointer;padding:0 6px 0 0}',
      '.tw-prog{display:flex;gap:6px;flex:1;margin:0 12px}',
      '.tw-prog i{display:block;flex:1;height:4px;border-radius:2px;background:#e8dfc9}',
      '.tw-prog i.tw-p-on{background:#b8964e}',
      '.tw-no{font-size:11px;color:#8b8170}',
      '.tw-body{flex:1;overflow:auto;padding:4px 18px 12px;-webkit-overflow-scrolling:touch}',
      '.tw-body h2{font-size:18px;margin:8px 0 4px;line-height:1.5}',
      '.tw-sub{font-size:12px;color:#8b8170;margin:0 0 14px;line-height:1.7}',
      '.tw-mood{display:block;width:100%;text-align:left;border:1px solid #e8dfc9;background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;box-shadow:0 2px 8px rgba(120,95,40,.06);color:inherit;font-family:inherit}',
      '.tw-mood b{font-size:15px;display:block;margin-bottom:2px}',
      '.tw-mood span{font-size:12px;color:#8b8170}',
      '.tw-dots{display:flex;gap:5px;margin-top:8px}',
      '.tw-dots em{display:block;width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}',
      '.tw-prop{display:flex;gap:12px;align-items:center;border:2px solid #e8dfc9;background:#fff;border-radius:14px;padding:8px;margin-bottom:10px;cursor:pointer;width:100%;text-align:left;color:inherit;font-family:inherit}',
      '.tw-prop.tw-sel{border-color:#b8964e;background:#fffaf0}',
      '.tw-thumb{width:92px;height:92px;flex:none;background:#faf7ef;border-radius:10px;overflow:hidden;display:block}',
      '.tw-thumb svg{width:100%;height:100%;display:block}',
      '.tw-prop b{font-size:13px;display:block;margin-bottom:4px}',
      '.tw-chips{display:flex;gap:4px;margin-bottom:4px}',
      '.tw-chips em{display:block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.1)}',
      '.tw-prop span.tw-names{font-size:11px;color:#8b8170}',
      '.tw-big{background:#faf7ef;border-radius:14px;height:270px;overflow:hidden;margin-bottom:12px}',
      '.tw-big svg{width:100%;height:100%;display:block}',
      '.tw-lab{font-size:12px;color:#8b8170;margin:4px 0 6px}',
      '.tw-opt{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}',
      '.tw-opt button{flex:1 1 40%;border:2px solid #e8dfc9;background:#fff;border-radius:12px;padding:10px 6px;font-size:13px;cursor:pointer;color:#3a3226;font-family:inherit}',
      '.tw-opt button.tw-sel{border-color:#b8964e;background:#fffaf0;font-weight:700}',
      '.tw-opt small{display:block;color:#8b8170;font-weight:400;font-size:11px;margin-top:2px}',
      '.tw-sum{border:1px solid #e8dfc9;border-radius:12px;background:#fff;padding:12px 14px;font-size:13px;line-height:1.9;margin-bottom:12px}',
      '.tw-price{font-size:20px;font-weight:700}',
      '.tw-sum small{color:#8b8170}',
      '.tw-foot{padding:10px 18px 18px;border-top:1px solid #e8dfc9;background:#fffdf7;display:flex;gap:10px}',
      '.tw-btn-back{flex:none;border:1px solid #e8dfc9;background:#fff;border-radius:99px;padding:13px 18px;font-size:13px;color:#3a3226;cursor:pointer;font-family:inherit}',
      '.tw-btn-next{flex:1;border:0;border-radius:99px;background:#8a6d32;color:#fff;font-size:14px;font-weight:700;padding:13px;cursor:pointer;font-family:inherit}',
      '.tw-btn-next[disabled]{background:#d8cfb9;cursor:default}',
      '.tw-link{display:block;text-align:center;font-size:12px;color:#8a6d32;margin-top:8px;text-decoration:underline;cursor:pointer;background:none;border:0;width:100%;font-family:inherit}',
      '.tw-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#3a3226;color:#fff;font-size:12px;padding:10px 16px;border-radius:99px;z-index:2147483001;max-width:88vw;text-align:center;line-height:1.5}',
      /* 入口（テンプレート側の要素） */
      '.tw-entry{border:0;background:none;padding:0;font-family:inherit;color:#8a6d32;text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-size:12px}',
      '.tw-entry-btn{display:block;width:100%;box-sizing:border-box;text-align:center;margin:8px 0 12px;padding:13px 16px;border:1.5px solid #b8964e;background:#fffaf0;color:#8a6d32;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}'
    ].join('\n');
    var s = document.createElement('style'); s.id = 'tw-css'; s.textContent = css; document.head.appendChild(s);
  }

  // ---- SVG（本物のストラップ画像に配色を適用して返す）
  function colorize(vals, vb) {
    if (!svgText) return '<div style="width:100%;height:100%"></div>';
    var map = { st1: belt(vals[0]).hex, st4: belt(vals[1]).hex, st2: belt(vals[2]).hex, st5: parts(vals[3]).hex, st6: hw(vals[4]).hex };
    var t = svgText;
    for (var c in map) t = t.replace(new RegExp('(\\.' + c + '\\s*\\{[^}]*fill:\\s*)#[0-9a-fA-F]{3,6}'), '$1' + map[c]);
    var u = 'tw' + Math.random().toString(36).slice(2, 7); // 同一ページ内のクラス衝突回避
    t = t.replace(/\.st(\d)/g, '.' + u + 'st$1').replace(/class="st(\d)"/g, 'class="' + u + 'st$1"');
    t = t.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
    return t.replace('viewBox="0 0 470.31 973.91"', 'viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice"')
            .replace(/\sid="[^"]*"/g, '');
  }
  function loadSvg(cb) {
    if (svgText) return cb && cb();
    fetch(SVG_URL).then(function (r) { return r.text(); }).then(function (t) { svgText = t; cb && cb(); }).catch(function () {});
  }

  function cur() { var p = st.pick; return [p[0], p[1], p[2], st.parts || p[3], st.hw || p[4]]; }

  // ---- 描画
  function render() {
    var steps = [0, 1, 2, 3];
    root.querySelector('.tw-prog').innerHTML = steps.map(function (i) { return '<i class="' + (i <= st.step ? 'tw-p-on' : '') + '"></i>'; }).join('');
    root.querySelector('.tw-no').textContent = (st.step + 1) + ' / 4';
    var body = root.querySelector('.tw-body'), foot = root.querySelector('.tw-foot');
    var h = '', f = '';
    if (st.step === 0) {
      h = '<h2>どんな雰囲気がお好みですか?</h2><p class="tw-sub">1つ選ぶだけで、おすすめの配色を3つご提案します。<br>選んだあとも自由に変更できます。</p>' +
        MOODS.map(function (m) {
          return '<button type="button" class="tw-mood" data-mood="' + m.id + '"><b>' + m.name + '</b><span>' + m.desc + '</span><div class="tw-dots">' +
            m.dots.map(function (d) { return '<em style="background:' + belt(d).hex + '"></em>'; }).join('') + '</div></button>';
        }).join('') +
        '<button type="button" class="tw-link" data-manual>おまかせを使わず、自分で1から選ぶ</button>';
    } else if (st.step === 1) {
      var m = MOODS.filter(function (x) { return x.id === st.mood; })[0];
      h = '<h2>' + m.name + 'のおすすめ</h2><p class="tw-sub">気に入ったものをタップしてください。</p>' +
        m.props.map(function (p, i) {
          var sel = st.pick && st.pick.join() === p.join();
          return '<button type="button" class="tw-prop ' + (sel ? 'tw-sel' : '') + '" data-pick="' + i + '"><span class="tw-thumb">' + colorize(p, '165 40 170 210') + '</span><span><b>' + esc(p[5]) +
            '</b><span class="tw-chips">' + p.slice(0, 3).map(function (c) { return '<em style="background:' + belt(c).hex + '"></em>'; }).join('') + '</span><span class="tw-names">' +
            p.slice(0, 3).map(function (c) { return belt(c).name; }).join(' / ') + '</span></span></button>';
        }).join('');
      f = '<button type="button" class="tw-btn-back" data-back>戻る</button><button type="button" class="tw-btn-next" data-next ' + (st.pick ? '' : 'disabled') + '>この配色で進む</button>';
    } else if (st.step === 2) {
      var c = cur();
      h = '<h2>仕上げを選びましょう</h2><div class="tw-big">' + colorize(c, '140 30 220 270').replace('slice', 'meet') + '</div>' +
        '<div class="tw-lab">金具(バックル・カシメ)</div><div class="tw-opt">' + TRIAD_HARDWARE_COLORS.map(function (x) { return '<button type="button" class="' + (c[4] === x.id ? 'tw-sel' : '') + '" data-hw="' + x.id + '">' + x.name + '</button>'; }).join('') + '</div>' +
        '<div class="tw-lab">取付け革(ピン側の革)</div><div class="tw-opt">' + TRIAD_PARTS_COLORS.map(function (x) { return '<button type="button" class="' + (c[3] === x.id ? 'tw-sel' : '') + '" data-parts="' + x.id + '">' + x.name + '</button>'; }).join('') + '</div>' +
        '<div class="tw-lab">長さ</div><div class="tw-opt">' + TRIAD_LENGTHS.map(function (x, i) { return '<button type="button" class="' + (st.len === i ? 'tw-sel' : '') + '" data-len="' + i + '">' + esc(x.label) + '<small>' + esc(x.range) + (x.add ? ' +' + yen(x.add) : '') + '</small></button>'; }).join('') + '</div>';
      f = '<button type="button" class="tw-btn-back" data-back>戻る</button><button type="button" class="tw-btn-next" data-next>確認する</button>';
    } else {
      var d = cur(), L = TRIAD_LENGTHS[st.len];
      h = '<h2>この内容でよろしいですか?</h2><div class="tw-big">' + colorize(d, '140 30 220 270').replace('slice', 'meet') + '</div>' +
        '<div class="tw-sum">ベルト①　' + belt(d[0]).name + '<br>ベルト②　' + belt(d[1]).name + '<br>ベルト③　' + belt(d[2]).name + '<br>取付け革　' + parts(d[3]).name + '　/　金具　' + hw(d[4]).name +
        '<br>長さ　' + esc(L.label) + '(' + esc(L.range) + ')<hr style="border:0;border-top:1px solid #e8dfc9;margin:8px 0"><span class="tw-price">' + yen(TRIAD_PRICE + L.add) +
        '</span> <small>税込・送料別</small><br><small>ご注文後、7〜14日で製作・発送します</small></div>' +
        '<p class="tw-sub" style="text-align:center">名入れ刻印の追加や、色の微調整はシミュレーターでできます。</p>';
      f = '<button type="button" class="tw-btn-back" data-back>戻る</button><button type="button" class="tw-btn-next" data-done>この配色でシミュレーターへ</button>';
    }
    body.innerHTML = h; foot.innerHTML = f; foot.style.display = f ? 'flex' : 'none';
    body.scrollTop = 0;
  }

  function stepEvent() {
    var extra = {};
    if (st.mood) extra.wiz_mood = st.mood;
    if (st.pick) extra.wiz_pick = st.pick[5];
    track('sim_wiz_s' + (st.step + 1), extra);
  }

  // ---- 開閉
  function build() {
    if (root) return;
    injectCss();
    root = document.createElement('div');
    root.className = 'tw-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'おまかせで配色を選ぶ');
    root.innerHTML = '<div class="tw-back" data-close></div><div class="tw-sheet"><div class="tw-head"><button type="button" class="tw-x" data-close aria-label="閉じる">×</button><div class="tw-prog"></div><div class="tw-no"></div></div><div class="tw-body"></div><div class="tw-foot"></div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
  }
  function open(src) {
    if (!simReady()) { toast('読み込み中です。少し待ってからもう一度お試しください'); return; }
    build();
    st = { step: 0, mood: null, pick: null, hw: null, parts: null, len: (typeof TRIAD_DEFAULT_LENGTH_INDEX !== 'undefined' ? TRIAD_DEFAULT_LENGTH_INDEX : 1) };
    lastFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    root.classList.add('tw-on');
    loadSvg(function () { if (root.classList.contains('tw-on')) render(); });
    track('sim_wiz_open', { wiz_src: src || 'unknown' });
    render(); stepEvent();
  }
  function close(reason) {
    if (!root || !root.classList.contains('tw-on')) return;
    if (reason !== 'done') track('sim_wiz_close_s' + (st.step + 1), { wiz_step: st.step + 1 });
    root.classList.remove('tw-on');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'tw-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4500);
  }

  // ---- 既存シミュレーターへ配色・長さを反映（既存関数を呼ぶだけ。既存コードは変更しない）
  function applyToSimulator() {
    var c = cur();
    if (typeof saveTriadHistory === 'function') saveTriadHistory();
    triadColors.leather1 = belt(c[0]).hex; triadColors.leather2 = belt(c[1]).hex; triadColors.leather3 = belt(c[2]).hex;
    triadColors.parts = parts(c[3]).hex; triadColors.hardware = hw(c[4]).hex;
    triadImageSaved = false;
    triadLengthIndex = st.len;
    var sel = document.getElementById('triad-length-select'); if (sel) sel.value = String(st.len);
    if (typeof buildTriadZoneButtons === 'function') buildTriadZoneButtons();
    if (typeof buildTriadPalette === 'function') buildTriadPalette();
    if (typeof updateTriadSummary === 'function') updateTriadSummary();
    if (typeof updateTriadPriceDisplay === 'function') updateTriadPriceDisplay();
    if (typeof updateTriadCartButtonState === 'function') updateTriadCartButtonState();
    if (typeof applyTriadColors === 'function') applyTriadColors();
  }
  function scrollToSimulator() {
    var s = document.getElementById('color-simulator') || document.querySelector('[id$="__simulator"]');
    if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onClick(e) {
    var t = e.target.closest('[data-close],[data-mood],[data-pick],[data-next],[data-back],[data-hw],[data-parts],[data-len],[data-done],[data-manual]');
    if (!t) return;
    var changedStep = false;
    if ('close' in t.dataset) { close(); return; }
    if (t.dataset.mood) { st.mood = t.dataset.mood; st.pick = null; st.hw = st.parts = null; st.step = 1; changedStep = true; }
    else if (t.dataset.pick !== undefined) { st.pick = MOODS.filter(function (x) { return x.id === st.mood; })[0].props[+t.dataset.pick]; st.hw = st.parts = null; }
    else if ('next' in t.dataset) { if (st.step === 1 && !st.pick) return; st.step++; changedStep = true; }
    else if ('back' in t.dataset) { st.step--; changedStep = false; }
    else if (t.dataset.hw) { st.hw = t.dataset.hw; }
    else if (t.dataset.parts) { st.parts = t.dataset.parts; }
    else if (t.dataset.len) { st.len = +t.dataset.len; }
    else if ('manual' in t.dataset) { track('sim_wiz_manual'); close('done'); scrollToSimulator(); return; }
    else if ('done' in t.dataset) {
      var c = cur();
      track('sim_wiz_done', { wiz_mood: st.mood, wiz_pick: st.pick[5], wiz_len: st.len, wiz_hw: c[4], wiz_parts: c[3] });
      try { if (window.clarity) window.clarity('set', 'triad_wizard', 'done'); } catch (er) {}
      applyToSimulator(); close('done'); scrollToSimulator();
      setTimeout(function () { toast('おまかせの配色を反映しました。色は自由に変更できます'); }, 600);
      return;
    }
    render();
    if (changedStep) stepEvent();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tw-open]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-tw-open'));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  try { if (window.clarity) window.clarity('set', 'triad_wizard', 'loaded'); } catch (er) {}
  window.triadWizardOpen = open;
})();
