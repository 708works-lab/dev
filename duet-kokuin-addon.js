/* Duet 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   既存の duet-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   先端パーツ（CW73／CW73R）は別パーツ・別SVGのため、選択中のパーツに応じて
   刻印プレビュー用のベースSVGを動的に切り替える。 */
(function () {
  const FONTS = [
    { id: 'A', family: 'Cabin Sketch', weight: '700', google: true, googleParam: 'Cabin+Sketch:wght@700', category: '手書き' },
    { id: 'B', family: 'Special Elite', weight: '400', google: true, googleParam: 'Special+Elite', category: 'スタンプ風' },
    { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true, localUrl: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf', category: 'スタンプ風' },
    { id: 'C', family: 'Lobster', weight: '400', google: true, googleParam: 'Lobster', category: '筆記体' },
    { id: 'D', family: 'Playball', weight: '400', google: true, googleParam: 'Playball', category: '筆記体' },
    { id: 'H', family: 'Great Vibes', weight: '400', google: true, googleParam: 'Great+Vibes', category: '筆記体' },
    { id: 'F', family: 'Bebas Neue', weight: '400', google: true, googleParam: 'Bebas+Neue', category: 'モダン' },
    { id: 'G', family: 'UnifrakturMaguntia', weight: '400', google: true, googleParam: 'UnifrakturMaguntia', category: 'ゴシック' }
  ];
  const MAX_LEN = 15;
  const ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;
  const ALLOWED_HINT = '半角英数字と一部の記号（- _ . , : ; $ !）のみご利用いただけます。絵文字・機種依存文字・全角文字はご利用いただけません。';

  // 先端パーツ（duetSelectedStyle）ごとの配置基準・ベースSVG（duet-cw73/cw73r-kokuin-simulator.jsと同じ値）
  // pieceSelectors は実物同様に4枚（先端①〜④）が個別パスとして存在するため、それぞれを
  // 個別に塗り分けるためのCSSセレクタ（CW73とCW73Rでid付与のされ方が異なるため別々に定義）
  const STYLE_CONFIG = {
    standard: {
      svgUrl: 'https://708works-lab.github.io/dev/duet_cw73_kokuin_base.svg',
      groupId: 'kokuin1',
      anchor: { x: 358.71, y: 213.89 },
      angleDeg: -57.70,
      pieceSelectors: { front1: '#_x31_1', front2: '#_x32_1', front3: '#_x33_2', front4: '#_x34_1' }
    },
    reverse: {
      svgUrl: 'https://708works-lab.github.io/dev/duet_cw73r_kokuin_base.svg',
      groupId: 'kokuin',
      anchor: { x: 360.0, y: 214.73 },
      angleDeg: -57.70,
      pieceSelectors: { front1: '#_x31_', front2: '#_x32_', front3: '#_x33_ path', front4: '#_x34_ path' }
    }
  };

  const BASE_FONT_SIZE = 20;
  const MAX_TEXT_WIDTH = 130;
  const MIN_FONT_SIZE = 14;
  const HARD_FLOOR_FONT_SIZE = 6;
  const LINE_GAP_RATIO = 1.15;

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };
  let svgLoaded = false;
  let currentStyleId = null;
  let kokuinShadowRoot = null;

  window.DUET_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

  function currentFont() {
    return FONTS.find(f => f.id === state.fontId);
  }

  function isValid(text, font) {
    if (!text) return false;
    if (text.length > MAX_LEN) return false;
    if (!ALLOWED_PATTERN.test(text)) return false;
    if (font.noUppercase && /[A-Z]/.test(text)) return false;
    return true;
  }

  async function loadFonts() {
    const agStencil = FONTS.find(f => f.id === 'E');
    const localFont = new FontFace('AG Stencil', `url(${agStencil.localUrl})`);
    document.fonts.add(localFont);
    const specs = FONTS.map(f => `${f.weight} 40px "${f.family}"`);
    await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => {})));
    await localFont.load().catch(() => {});
  }

  function ensureShadowRoot() {
    const wrap = document.getElementById('duet-kokuin-svg-wrap');
    if (!wrap) return null;
    if (!kokuinShadowRoot) {
      kokuinShadowRoot = wrap.attachShadow({ mode: 'open' });
      // Shopifyテーマのdiv:empty{display:none}対策（Shadow DOM内の内容はlight DOM上は「空」判定される）
      wrap.style.display = 'block';
    }
    return kokuinShadowRoot;
  }

  async function loadBaseSvgForStyle(styleId) {
    const root = ensureShadowRoot();
    if (!root) return;
    const cfg = STYLE_CONFIG[styleId];
    if (!cfg) return;
    const res = await fetch(cfg.svgUrl);
    const svgText = await res.text();
    root.innerHTML = `<style>svg{width:100%;height:auto;display:block;}</style>${svgText}`;
    currentStyleId = styleId;
    svgLoaded = true;
    applyDuetKokuinColors();
    drawKokuinText();
  }

  // カラーシミュレーター本体で選ばれた各先端パーツ（①〜④）・ベルトの色を、
  // 刻印プレビューSVGの該当パーツそれぞれに個別に反映する
  function applyDuetKokuinColors() {
    const svg = kokuinShadowRoot?.querySelector('svg');
    if (!svg || typeof duetColors === 'undefined' || !currentStyleId) return;
    const cfg = STYLE_CONFIG[currentStyleId];
    if (!cfg) return;

    const belt = svg.querySelector('#part-belt');
    if (belt && duetColors.belt) belt.style.fill = duetColors.belt;

    ['front1', 'front2', 'front3', 'front4'].forEach(zone => {
      const hex = duetColors[zone];
      const sel = cfg.pieceSelectors[zone];
      if (!hex || !sel) return;
      svg.querySelectorAll(sel).forEach(p => { p.style.fill = hex; });
    });

    drawKokuinText();
  }
  window.applyDuetKokuinColors = applyDuetKokuinColors;

  // 先端パーツ（通常／R）が切り替わったら、刻印プレビューのベースSVGも差し替える
  window.onDuetFrontStyleChangeForKokuin = function (styleId) {
    if (state.enabled && svgLoaded && STYLE_CONFIG[styleId]) {
      loadBaseSvgForStyle(styleId);
    }
  };

  function buildFontSelect() {
    const select = document.getElementById('duet-kokuin-font-select');
    if (!select) return;
    select.innerHTML = '';
    FONTS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `フォント${f.id}（${f.category}）${f.noUppercase ? '・大文字非対応' : ''}`;
      if (f.id === state.fontId) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      state.fontId = select.value;
      validateAndDraw();
    });
  }

  function validateAndDraw() {
    const input = document.getElementById('duet-kokuin-text');
    const countEl = document.getElementById('duet-kokuin-char-count');
    const warnEl = document.getElementById('duet-kokuin-warn');
    if (!input) return;
    const text = input.value;

    const overLen = text.length > MAX_LEN;
    if (countEl) {
      countEl.textContent = `${text.length} / ${MAX_LEN}`;
      countEl.classList.toggle('over', overLen);
    }

    const font = currentFont();
    const warnings = [];
    if (!ALLOWED_PATTERN.test(text)) warnings.push(ALLOWED_HINT);
    if (font.noUppercase && /[A-Z]/.test(text)) warnings.push(`フォント${font.id}は大文字に対応していません。小文字でご入力ください。`);
    if (overLen) warnings.push(`文字数の上限は${MAX_LEN}文字です。`);
    if (!text) warnings.push('刻印する文字を入力してください。');
    if (warnEl) {
      warnEl.innerHTML = warnings.join('<br>');
      warnEl.classList.toggle('show', warnings.length > 0);
    }

    const valid = isValid(text, font);
    state.text = text;

    window.DUET_KOKUIN_STATE = {
      enabled: state.enabled,
      text: state.text,
      fontId: font.id,
      fontFamily: font.family,
      fontWeight: font.weight,
      fontLabel: `フォント${font.id}：${font.family}`,
      valid: state.enabled ? valid : true
    };

    drawKokuinText();
    updateFontSwatch();
  }

  function updateFontSwatch() {
    const swatch = document.getElementById('duet-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  function makeTextEl(font) {
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, 'text');
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('dominant-baseline', 'central');
    el.setAttribute('font-family', font.family);
    el.setAttribute('font-weight', font.weight);
    // レーザー刻印は革の色に関わらず視認できるため、刻印箇所の革色（先端③）に対して
    // コントラストが出る色（本体シミュレーターのロゴ刻印と同じロジック）を使う
    const baseHex = (typeof duetColors !== 'undefined') ? duetColors.front3 : null;
    const fillColor = (baseHex && typeof engravingColor === 'function') ? engravingColor(baseHex) : '#2a1710';
    el.setAttribute('fill', fillColor);
    el.setAttribute('fill-opacity', '0.82');
    return el;
  }

  function fitFontSize(el, text, maxWidth, startSize, floorSize) {
    el.textContent = text;
    let size = startSize;
    el.setAttribute('font-size', size);
    let width = el.getBBox().width;
    while (width > maxWidth && size > floorSize) {
      size -= 1;
      el.setAttribute('font-size', size);
      width = el.getBBox().width;
    }
    return { size, width };
  }

  function splitInHalf(text) {
    if (text.includes(' ')) {
      const mid = text.length / 2;
      let best = -1, bestDist = Infinity;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          const d = Math.abs(i - mid);
          if (d < bestDist) { bestDist = d; best = i; }
        }
      }
      if (best >= 0) {
        return [text.slice(0, best).trim(), text.slice(best + 1).trim()];
      }
    }
    const mid = Math.ceil(text.length / 2);
    return [text.slice(0, mid), text.slice(mid)];
  }

  function drawKokuinText() {
    if (!currentStyleId) return;
    const cfg = STYLE_CONFIG[currentStyleId];
    const group = kokuinShadowRoot?.getElementById(cfg.groupId);
    if (!group) return;
    group.innerHTML = '';

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();
    const ANCHOR = cfg.anchor, ANGLE_DEG = cfg.angleDeg;

    const line1 = makeTextEl(font);
    group.appendChild(line1);
    const singleFit = fitFontSize(line1, text, MAX_TEXT_WIDTH, BASE_FONT_SIZE, MIN_FONT_SIZE);

    if (singleFit.width <= MAX_TEXT_WIDTH) {
      line1.setAttribute('x', ANCHOR.x);
      line1.setAttribute('y', ANCHOR.y);
      line1.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
      return;
    }

    group.innerHTML = '';
    const [textA, textB] = splitInHalf(text);
    const lineA = makeTextEl(font);
    const lineB = makeTextEl(font);
    group.appendChild(lineA);
    group.appendChild(lineB);

    const fitA = fitFontSize(lineA, textA, MAX_TEXT_WIDTH, BASE_FONT_SIZE, HARD_FLOOR_FONT_SIZE);
    const fitB = fitFontSize(lineB, textB, MAX_TEXT_WIDTH, BASE_FONT_SIZE, HARD_FLOOR_FONT_SIZE);
    const sharedSize = Math.min(fitA.size, fitB.size);
    lineA.setAttribute('font-size', sharedSize);
    lineB.setAttribute('font-size', sharedSize);

    const lineGap = sharedSize * LINE_GAP_RATIO;
    lineA.setAttribute('x', ANCHOR.x);
    lineA.setAttribute('y', ANCHOR.y - lineGap / 2);
    lineA.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
    lineB.setAttribute('x', ANCHOR.x);
    lineB.setAttribute('y', ANCHOR.y + lineGap / 2);
    lineB.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
  }

  async function onToggleChange() {
    const toggle = document.getElementById('duet-kokuin-toggle');
    const section = document.getElementById('duet-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled && !svgLoaded) {
      const styleId = (typeof duetSelectedStyle !== 'undefined') ? duetSelectedStyle : 'standard';
      await Promise.all([loadFonts(), loadBaseSvgForStyle(styleId)]);
    } else if (state.enabled) {
      applyDuetKokuinColors();
    }

    validateAndDraw();
    if (typeof updateDuetPriceDisplay === 'function') updateDuetPriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('duet-kokuin-toggle');
    const input = document.getElementById('duet-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.DUET_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
