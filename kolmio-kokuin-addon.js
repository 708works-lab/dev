/* Kolmio 名入れ刻印アドオン（有料オプション、+¥1,100税込・要確認）
   既存の kolmio-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   刻印は先端(1番)パーツに乗るため、色は常に kPieceColors[1]（先端パーツの色）を参照する。 */
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

  // kolmio_kokuin_base.svg内のサンプル刻印「ABCDEFG」の実測値から算出
  // （先頭〜末尾パーツのbbox中心を結んだ直線の傾き・全体bboxの中心）
  const ANCHOR = { x: 578.825, y: 360.69 };
  const ANGLE_DEG = -60.12;
  const BASE_FONT_SIZE = 22;
  const MAX_TEXT_WIDTH = 180;

  const KOKUIN_PRICE_ADD = 1100; // 暫定額（他シリーズの刻印オプションと同額。要確認）

  let state = { enabled: false, text: '', fontId: 'A' };
  let svgLoaded = false;
  let kokuinShadowRoot = null;

  window.KOLMIO_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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

  async function loadBaseSvg() {
    const wrap = document.getElementById('kolmio-kokuin-svg-wrap');
    if (!wrap || svgLoaded) return;
    const res = await fetch('https://708works-lab.github.io/dev/kolmio_kokuin_base.svg');
    const svgText = await res.text();
    // Shadow DOMで隔離する。カラーシミュレーター本体のSVGも同じ .st0 クラス名を
    // 使っており、light DOMにそのまま挿入すると<style>がページ全体に漏れて色が混線するため。
    kokuinShadowRoot = wrap.attachShadow({ mode: 'open' });
    kokuinShadowRoot.innerHTML = `<style>svg{width:100%;height:auto;display:block;}</style>${svgText}`;
    // Shopifyテーマのbase.cssに div:empty{display:none} があり、shadow rootを持つだけの
    // （light DOM上は子を持たない）divが非表示にされてしまうため、インラインで明示的に上書きする。
    wrap.style.display = 'block';
    svgLoaded = true;
    applyKolmioKokuinColors();
  }

  // カラーシミュレーター本体の先端(1番)パーツの色を刻印プレビューSVGにも反映する
  function applyKolmioKokuinColors() {
    const svg = kokuinShadowRoot?.querySelector('svg');
    if (!svg || typeof kPieceColors === 'undefined') return;
    const hex = kPieceColors[1];
    if (hex) {
      svg.querySelectorAll('.st0').forEach(el => { el.style.fill = hex; });
    }
    drawKokuinText();
  }
  window.applyKolmioKokuinColors = applyKolmioKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('kolmio-kokuin-font-select');
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
    const input = document.getElementById('kolmio-kokuin-text');
    const countEl = document.getElementById('kolmio-kokuin-char-count');
    const warnEl = document.getElementById('kolmio-kokuin-warn');
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

    window.KOLMIO_KOKUIN_STATE = {
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
    const swatch = document.getElementById('kolmio-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  function drawKokuinText() {
    const group = kokuinShadowRoot?.getElementById('kokuin');
    if (!group) return;
    group.innerHTML = '';

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();
    const ns = 'http://www.w3.org/2000/svg';
    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('x', ANCHOR.x);
    textEl.setAttribute('y', ANCHOR.y);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
    textEl.setAttribute('font-family', font.family);
    textEl.setAttribute('font-weight', font.weight);
    textEl.setAttribute('font-size', BASE_FONT_SIZE);
    // レーザー刻印は革の色に関わらず視認できるため、先端パーツ（色1）に対して
    // コントラストが出る色を使う
    const baseHex = (typeof kPieceColors !== 'undefined') ? kPieceColors[1] : null;
    const fillColor = (baseHex && typeof kolmioEngravingColor === 'function') ? kolmioEngravingColor(baseHex) : '#2a1710';
    textEl.setAttribute('fill', fillColor);
    textEl.setAttribute('fill-opacity', '0.82');
    textEl.textContent = text;
    group.appendChild(textEl);

    let fontSize = BASE_FONT_SIZE;
    let measuredWidth = textEl.getBBox().width;
    while (measuredWidth > MAX_TEXT_WIDTH && fontSize > 4) {
      fontSize -= 1;
      textEl.setAttribute('font-size', fontSize);
      measuredWidth = textEl.getBBox().width;
    }
  }

  async function onToggleChange() {
    const toggle = document.getElementById('kolmio-kokuin-toggle');
    const section = document.getElementById('kolmio-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled && !svgLoaded) {
      await Promise.all([loadFonts(), loadBaseSvg()]);
    } else if (state.enabled) {
      applyKolmioKokuinColors();
    }

    validateAndDraw();
    if (typeof updateKolmioPriceDisplay === 'function') updateKolmioPriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('kolmio-kokuin-toggle');
    const input = document.getElementById('kolmio-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.KOLMIO_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
