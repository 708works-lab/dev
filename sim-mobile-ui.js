/* 708works カラーシミュレーター スマホ新UI(2026-10-16)  ※既存シミュレーターのロジックは触らず、表示の再配置だけ行う
   - プレビューを上部固定+タブ切替(ストラップ拡大/全身正面/全身背面)
   - パーツ選択を横スクロールのチップに
   - 画面下に価格+「カートに入れる」の固定バー(既存の注文ボタンのclickを呼ぶだけ)
   設定は商品ごと(CONFIG)。対象外の商品・PC幅では何もしない。 */
(function () {
  'use strict';
  var CONFIG = {
    'triad': { root: '.triad-simulator', svg: '#triad-strap-wrap svg', zones: '#triad-zones', stage: ['#triad-zones', '#triad-palette-label', '.pal-box'],
      views: [{ k: 'close', t: 'ストラップ', vb: '150 40 230 300' }, { k: 'front', t: '全身（正面）', half: 0 }, { k: 'back', t: '全身（背面）', half: 1 }] }
  };
  var handle = (location.pathname.match(/\/products\/([^\/?#]+)/) || [])[1];
  var cfg = CONFIG[handle];
  if (!cfg) return;
  var mq = window.matchMedia('(max-width:480px)');

  function init(tries) {
    var root = document.querySelector(cfg.root);
    var svg = root && root.querySelector(cfg.svg);
    var pcol = root && root.querySelector('.preview-col');
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
    var tabs = document.createElement('div'); tabs.className = 'sim-mui-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'プレビュー切替');
    var btns = cfg.views.map(function (v, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = v.t; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
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
    var stageEls = (cfg.stage || []).map(function (s) { return root.querySelector(s); }).filter(Boolean);
    var homes = stageEls.map(function (el) { var ph = document.createComment('sim-mui-home'); el.parentNode.insertBefore(ph, el); return ph; });
    function moveStage(on) {
      stageEls.forEach(function (el, i) {
        if (on) pcol.appendChild(el); else homes[i].parentNode.insertBefore(el, homes[i].nextSibling);
      });
      if (zones) zones.scrollLeft = 0;
    }

    // 固定バー
    var bar = document.createElement('div'); bar.className = 'sim-mui-bar';
    bar.innerHTML = '<div class="p"><small>価格（税込）</small><b>—</b></div><button type="button">カートに入れる →</button>';
    document.body.appendChild(bar);
    var priceEl = bar.querySelector('b');
    function readPrice() {
      var pb = root.querySelector('.price-bar'); if (!pb) return;
      var m = (pb.textContent || '').match(/[¥￥]\s*[\d,]+/); if (m) priceEl.textContent = m[0].replace(/\s/g, '');
    }
    var pbNode = root.querySelector('.price-bar'); if (pbNode) new MutationObserver(readPrice).observe(pbNode, { childList: true, subtree: true, characterData: true });
    readPrice();
    bar.querySelector('button').addEventListener('click', function () { track('sim_mui_bar_click'); orderBtn.click(); });

    // 固定バーの表示: シミュレーターが画面内にあり、本体のカートボタンが見えていない間
    var simVisible = false, btnVisible = false;
    function upd() { bar.classList.toggle('is-on', mq.matches && simVisible && !btnVisible); }
    new IntersectionObserver(function (es) { simVisible = es[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(root);
    new IntersectionObserver(function (es) { btnVisible = es[0].isIntersecting; upd(); }, { threshold: 0.6 }).observe(orderBtn);

    // 名入れ刻印ON中は固定を解除(CSS側: .sim-kokuin)
    var kk = root.querySelector(cfg.kokuin || '.kokuin-toggle input[type=checkbox]');
    function syncKokuin() { root.classList.toggle('sim-kokuin', !!(kk && kk.checked)); }
    if (kk) { kk.addEventListener('change', syncKokuin); syncKokuin(); }
    // 入力中(キーボード表示)はプレビューを縮める
    root.addEventListener('focusin', function (e) { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'checkbox') root.classList.add('sim-kb'); });
    root.addEventListener('focusout', function () { root.classList.remove('sim-kb'); });

    function apply() {
      moveStage(mq.matches);
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
