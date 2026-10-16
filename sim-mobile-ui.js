/* 708works カラーシミュレーター スマホ新UI(2026-10-16)  ※既存シミュレーターのロジックは触らず、表示の再配置だけ行う
   - プレビュー+タブ切替(固定表示はしない)(ストラップ拡大/全身正面/全身背面)
   - パーツ選択を横スクロールのチップに
   - 画面下に価格+「カートに入れる」の固定バー(既存の注文ボタンのclickを呼ぶだけ)
   設定は商品ごと(CONFIG)。対象外の商品・PC幅では何もしない。 */
(function () {
  'use strict';
  var HALF2 = function (a, b) { return [{ k: 'prod', t: a.t, vb: a.vb }, { k: 'worn', t: b.t, vb: b.vb }]; };
  var CONFIG = {
    'triad': { root: '.triad-simulator', svg: '#triad-strap-wrap svg', zones: '#triad-zones', stage: ['#triad-zones', '#triad-palette-label', '.pal-box'],
      views: [{ k: 'close', t: 'ストラップ', vb: '150 40 230 300' }, { k: 'front', t: '全身（正面）', half: 0 }, { k: 'back', t: '全身（背面）', half: 1 }] },
    'triad-ukulele': { root: '.triad-simulator', svg: '#triad-strap-wrap svg', zones: '#triad-zones', stage: ['#triad-zones', '#triad-palette-label', '.pal-box'],
      views: [{ k: 'close', t: 'ストラップ', vb: '120 30 220 300' }, { k: 'front', t: '全身（正面）', vb: '19 0 319 458' }, { k: 'back', t: '全身（背面）', vb: '0 500 356 458' }] },
    'backstage-bag': { root: '.backstage-simulator', svg: '.strap-wrap svg', palettes: true,
      views: HALF2({ t: '商品', vb: '0 0 416 430' }, { t: '使用イメージ', vb: '10 500 400 410' }) },
    'backstage-camera': { root: '.backstage-camera-simulator', svg: '.strap-wrap svg', palettes: true,
      views: HALF2({ t: '商品', vb: '0 0 414 552' }, { t: '使用イメージ', vb: '95 568 275 430' }) },
    'capo': { root: '.capo-simulator', svg: '.strap-wrap svg', palettes: true,
      views: HALF2({ t: '商品', vb: '20 0 410 303' }, { t: '使用イメージ', vb: '0 415 451 565' }) },
    'sus4-attachment': { root: '.sus4-simulator', svg: '.strap-wrap svg', palettes: true,
      views: HALF2({ t: '商品', vb: '35 0 392 410' }, { t: '使用イメージ', vb: '0 496 463 501' }) },
    'sus4-with-wellington': { root: '.sus4w-simulator', svg: '.strap-wrap svg', palettes: true,
      views: HALF2({ t: '商品', vb: '10 0 334 548' }, { t: '使用イメージ', vb: '0 591 354 590' }) },
    // --- プレビュー切替のない商品(レイアウトだけ調整+固定バー)。cls があれば root に付く(courier/duet等は既存CSSの [class$="-simulator"] 判定を壊さないよう付けない) ---
    'folklore': { root: '.folklore-simulator', cls: 'sim-mui2', hint: '.strap-col .strap-scroll' },
    'folklole-clear': { root: '.folklore-simulator', cls: 'sim-mui2', hint: '.strap-col .strap-scroll' },
    'wellington-ukulele': { root: '.wellington-simulator', cls: 'sim-mui2', hint: '.strap-col .strap-scroll' },
    'wellington-ukulele-clear': { root: '.wellington-simulator', cls: 'sim-mui2', hint: '.strap-col .strap-scroll' },
    'kolmio-ukulele': { root: '.kolmio-simulator', cls: 'sim-mui2', hint: '.strap-col .strap-scroll' },
    'soundhole-cover-ag': { root: '.shc-simulator', svg: '#shc-svg-scroll svg', pcol: '.svg-col', stage: ['.ctrl-col > .pal-box:nth-child(3)'],
      views: [{ k: 'worn', t: 'ギターに装着', vb: '0 350 382 390' }, { k: 'back', t: 'カバー（裏面）', vb: '70 0 240 290' }] },
    'soundhole-cover-uk': { root: '.shc-simulator', svg: '#shc-svg-scroll svg', pcol: '.svg-col', stage: ['.ctrl-col > .pal-box:nth-child(3)'],
      views: [{ k: 'worn', t: 'ウクレレに装着', vb: '0 330 320 505' }, { k: 'back', t: 'カバー（裏面）', vb: '40 0 240 290' }] },
    'courier': { root: '.courier-simulator', hint: '.preview-col .strap-wrap' },
    'duet-cw73r': { root: '.duet-simulator', hint: '.preview-col .strap-wrap' },
    'keyholder01': { root: '.keyholder-simulator' },
    'nametag-ag': { root: '.nametag-simulator', cls: 'sim-mui5' }
  };
  // --- 多言語(ja / zh-TW / en)。新UIで足した文言のみ。キーは日本語(設定・ページ上の表記)。未登録なら日本語のまま ---
  var LANG = (function () { var l = (document.documentElement.lang || 'ja').toLowerCase(); return /^zh/.test(l) ? 'zh' : (/^ja/.test(l) ? 'ja' : 'en'); })();
  var I18N = {
    zh: { 'ストラップ': '背帶特寫', '全身（正面）': '全身（正面）', '全身（背面）': '全身（背面）', '商品': '商品', '使用イメージ': '使用示意',
      'ギターに装着': '裝在吉他上', 'ウクレレに装着': '裝在烏克麗麗上', 'カバー（裏面）': '音孔蓋（背面）',
      '革': '皮革', '金具': '五金', '本体': '本體', 'バッグ接続部分': '包包連接部分', 'バネホック': '彈簧釦',
      '価格（税込）': '價格（含稅）', 'カートに入れる →': '加入購物車 →', '▲ スクロール': '▲ 向上捲動', '▼ スクロール': '▼ 向下捲動', 'プレビュー切替': '切換預覽' },
    en: { 'ストラップ': 'Strap close-up', '全身（正面）': 'Full body (front)', '全身（背面）': 'Full body (back)', '商品': 'Product', '使用イメージ': 'In use',
      'ギターに装着': 'On guitar', 'ウクレレに装着': 'On ukulele', 'カバー（裏面）': 'Cover (back)',
      '革': 'Leather', '金具': 'Hardware', '本体': 'Body', 'バッグ接続部分': 'Bag connector', 'バネホック': 'Snap button',
      '価格（税込）': 'Price (tax incl.)', 'カートに入れる →': 'Add to cart →', '▲ スクロール': 'Scroll ▲', '▼ スクロール': 'Scroll ▼', 'プレビュー切替': 'Switch preview' }
  };
  function tr(s) { return (I18N[LANG] && I18N[LANG][s]) || s; }
  var handle = (location.pathname.match(/\/products\/([^\/?#]+)/) || [])[1];
  var cfg = CONFIG[handle];
  if (!cfg) return;
  var mq = window.matchMedia('(max-width:480px)');

  function init(tries) {
    var root = document.querySelector(cfg.root);
    var light = !cfg.svg;   // プレビュー切替なし(レイアウトCSS+固定バーのみ)
    var svg = light ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : (root && root.querySelector(cfg.svg));
    var pcol = light ? document.createElement('div') : (root && root.querySelector(cfg.pcol || '.preview-col'));   // light時はダミー(未接続)
    if (light) cfg.views = [{ k: 'x', t: 'x', vb: '0 0 1 1' }];
    var orderBtn = document.querySelector('.btn-order');
    if (!root || !svg || !pcol || !orderBtn) { if ((tries || 0) < 40) setTimeout(function () { init((tries || 0) + 1); }, 250); return; }
    if (root.dataset.simMui) return; root.dataset.simMui = '1';

    var full = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
    var origVB = svg.getAttribute('viewBox');
    function vbOf(v) {
      if (v.vb) return v.vb;
      var h = full[3] / 2; return full[0] + ' ' + (full[1] + v.half * h) + ' ' + full[2] + ' ' + h;
    }
    // タブ
    var tabs = document.createElement('div'); tabs.className = 'sim-mui-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', tr('プレビュー切替'));
    var btns = cfg.views.map(function (v, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = tr(v.t); b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (mq.matches) svg.setAttribute('viewBox', vbOf(v));
        track('sim_mui_tab_' + v.k);
      });
      tabs.appendChild(b); return b;
    });
    pcol.insertBefore(tabs, pcol.firstChild);
    var zones = cfg.zones && root.querySelector(cfg.zones); if (zones) zones.classList.add('sim-mui-zones');
    // ステージ: パーツチップ+カラーパレットもプレビューと一緒に固定(色を選ぶたびに変化が見える)。DOMを移動するだけでイベントは保持される
    // パレットが複数ある商品(Backstage/Capo/Sus4): ボックスの見出しからチップを生成し、選んだパーツのパレットだけを表示する
    var palMoves = [], palHomes = [], palHost = null;
    if (cfg.palettes) {
      var cl = root.querySelector('.ctrl-left'), pairs = [];
      [].slice.call(cl.children).forEach(function (el, i, arr) {
        if (el.classList.contains('pal-box') && arr[i - 1] && arr[i - 1].classList.contains('box-label')) pairs.push({ label: arr[i - 1], box: el });
      });
      if (pairs.length > 1) {
        var chipRow = document.createElement('div'); chipRow.className = 'sim-mui-pchips';
        var host = document.createElement('div'); host.className = 'sim-mui-palhost';
        var short = function (t) { return t.replace(/の色を選択.*$/, '').replace(/を選択.*$/, '').replace(/（.*$/, '').trim() || t; };
        var chips = pairs.map(function (p, i) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'sim-mui-pchip' + (i === 0 ? ' on' : '');
          b.innerHTML = '<i></i><span></span>'; b.lastChild.textContent = tr(short(p.label.textContent));
          p.label.classList.add('sim-mui-label-off');
          b.addEventListener('click', function () {
            chips.forEach(function (c, j) { c.classList.toggle('on', c === b); pairs[j].box.classList.toggle('sim-mui-pal-off', j !== i); });
            track('sim_mui_part_' + (i + 1));
          });
          return b;
        });
        pairs.forEach(function (p, i) { chipRow.appendChild(chips[i]); if (i !== 0) p.box.classList.add('sim-mui-pal-off'); });
        function dot(i) {
          var sel = pairs[i].box.querySelector('.selected'); if (!sel) return;
          var sw = sel.querySelector('.hw-chip-swatch') || sel; var c = getComputedStyle(sw).backgroundColor;
          chips[i].firstChild.style.background = c;
        }
        pairs.forEach(function (p, i) { new MutationObserver(function () { dot(i); }).observe(p.box, { attributes: true, subtree: true, attributeFilter: ['class'] }); dot(i); });
        pairs.forEach(function (p) { palMoves.push(p.box); });
        pcol.appendChild(chipRow); pcol.appendChild(host);
        palHomes = palMoves.map(function (bx) { var ph = document.createComment('sim-mui-pal-home'); bx.parentNode.insertBefore(ph, bx); return ph; });
        palHost = host;
      }
    }
    var stageEls = (cfg.stage || []).map(function (s) { return root.querySelector(s); }).filter(Boolean);
    var homes = stageEls.map(function (el) { var ph = document.createComment('sim-mui-home'); el.parentNode.insertBefore(ph, el); return ph; });
    function moveStage(on) {
      stageEls.forEach(function (el, i) {
        if (on) pcol.appendChild(el); else homes[i].parentNode.insertBefore(el, homes[i].nextSibling);
      });
      palMoves.forEach(function (bx, i) { if (on) palHost.appendChild(bx); else palHomes[i].parentNode.insertBefore(bx, palHomes[i].nextSibling); });
      if (zones) zones.scrollLeft = 0;
    }

    // 固定バー
    var bar = document.createElement('div'); bar.className = 'sim-mui-bar';
    bar.innerHTML = '<div class="p"><small></small><b>—</b></div><button type="button"></button>';
    bar.querySelector('small').textContent = tr('価格（税込）'); bar.querySelector('button').textContent = tr('カートに入れる →');
    document.body.appendChild(bar);
    var priceEl = bar.querySelector('b');
    function readPrice() {
      var pb = root.querySelector('.price-bar'); if (!pb) return;
      var m = (pb.textContent || '').match(/[¥￥]\s*[\d,]+/); if (m) priceEl.textContent = m[0].replace(/\s/g, '');
    }
    var pbNode = root.querySelector('.price-bar'); if (pbNode) new MutationObserver(readPrice).observe(pbNode, { childList: true, subtree: true, characterData: true });
    readPrice();
    bar.querySelector('button').addEventListener('click', function () { track('sim_mui_bar_click'); orderBtn.click(); });

    // 固定バーの表示: 既存の「色を選んで注文する↓」バー(シミュレーター上端が画面の75%より下にある間だけ表示)と
    // 完全に排他にする。シミュレーター上端が75%より上に来たら新バーに切り替え、本体のカートボタンが見えている間は出さない
    var host = document.getElementById('color-simulator') || root;
    var btnVisible = false, tick = false;
    function upd() {
      tick = false;
      var r = host.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      var on = mq.matches && r.top <= vh * 0.75 && r.bottom > 0 && !btnVisible;
      bar.classList.toggle('is-on', on);
      document.body.classList.toggle('sim-mui-bar-on', on);
    }
    function req() { if (!tick) { tick = true; requestAnimationFrame(upd); } }
    window.addEventListener('scroll', req, { passive: true }); window.addEventListener('resize', req);
    new IntersectionObserver(function (es) { btnVisible = es[0].isIntersecting; req(); }, { threshold: 0.6 }).observe(orderBtn);

    // 内部スクロールするストラップ列: 先端(下端)の意匠が特徴なので、初期は下端を見せる。
    // 上下どちらにスクロールできるかを、端のグラデ+「▲/▼ スクロール」で示す。初回に少し動かす
    var hintEl = null, hintTop = null, hintScroller = null, nudged = false, started = false;
    function ensureHint(on) {
      if (!cfg.hint) return;
      if (!on) { if (hintEl) { hintEl.remove(); hintTop.remove(); hintEl = hintTop = null; } return; }
      var sc = root.querySelector(cfg.hint); if (!sc) return;
      if (hintEl && hintScroller === sc) return;
      hintScroller = sc;
      hintTop = document.createElement('div'); hintTop.className = 'sim-mui-hint sim-mui-hint-top'; hintTop.innerHTML = '<span></span>'; hintTop.firstChild.textContent = tr('▲ スクロール');
      hintEl = document.createElement('div'); hintEl.className = 'sim-mui-hint'; hintEl.innerHTML = '<span></span>'; hintEl.firstChild.textContent = tr('▼ スクロール');
      sc.parentNode.insertBefore(hintTop, sc); sc.parentNode.insertBefore(hintEl, sc.nextSibling);
      function sync() {
        var max = sc.scrollHeight - sc.clientHeight;
        if (!started && max > 8) { started = true; sc.scrollTop = max; }   // 初期は先端(下端)
        hintEl.classList.toggle('is-on', max > 8 && sc.scrollTop < max - 6);
        hintTop.classList.toggle('is-on', max > 8 && sc.scrollTop > 6);
      }
      sc.addEventListener('scroll', function () { sync(); }, { passive: true }); window.addEventListener('resize', sync);
      [150, 500, 1200, 2500].forEach(function (ms) { setTimeout(sync, ms); });
      if (!nudged && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting || nudged) return;
          nudged = true; io.disconnect();
          var max = sc.scrollHeight - sc.clientHeight;
          if (max > 40 && sc.scrollTop > max - 5) { sc.scrollTo({ top: max - 56, behavior: 'smooth' }); setTimeout(function () { if (sc.scrollTop > max - 80) sc.scrollTo({ top: max, behavior: 'smooth' }); }, 700); }
        }, { threshold: 0.6 }); io.observe(sc);
      }
    }
    function apply() {
      moveStage(mq.matches);
      ensureHint(mq.matches);
      if (light) { if (cfg.cls) root.classList.toggle(cfg.cls, mq.matches); upd(); return; }
      if (mq.matches) { root.classList.add('sim-mui'); var a = btns.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; }); svg.setAttribute('viewBox', vbOf(cfg.views[Math.max(a, 0)])); }
      else { root.classList.remove('sim-mui'); svg.setAttribute('viewBox', origVB); }
      upd();
    }
    (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
    apply();
  }
  function track(name) {
    try { window.dataLayer = window.dataLayer || []; (function () { window.dataLayer.push(arguments); })('event', name, { sim_product: handle }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(0); }); else init(0);
})();
