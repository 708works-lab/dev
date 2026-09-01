/* Backstage 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   既存の backstage-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   カラー選択のグローバル状態（backstageColors, engravingColor）をそのまま参照する。

   他シリーズと異なり、backstage_color_order.svg は商品イメージと刻印プレビューが
   最初から1枚に統合されている（<g id="kokuin"> が product_image/right の中に存在）ため、
   別ファイルを取得してShadow DOMに展開する拡大プレビューは作らず、backstage-simulator.js
   が読み込んだメインSVG（#backstage-svg-wrap 内）の #kokuin グループへ直接テキストを
   描画する。SVG内のサンプル文字「ABCDEFGHIJK」は本体側で既に空にされている前提。 */
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

  // backstage_color_order.svg内、サンプル文字「ABCDEFGHIJK」が元々あった位置の中心
  // （プレート円の下、レザー面上。プレート円 cx=320.59/cy=98.4/r=20.63 とは重ならない）
  const ANCHOR = { x: 320.55, y: 148.08 };
  const ANGLE_DEG = 0;
  const BASE_FONT_SIZE = 22;
  const MAX_TEXT_WIDTH = 140;

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };

  window.BACKSTAGE_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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

  function mainKokuinGroup() {
    return document.querySelector('#backstage-svg-wrap svg #kokuin');
  }

  // カラーシミュレーター本体で選ばれた色が変わった際にも呼ばれる（backstage-simulator.jsから）
  function applyBackstageKokuinColors() {
    drawKokuinText();
  }
  window.applyBackstageKokuinColors = applyBackstageKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('backstage-kokuin-font-select');
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
    const input = document.getElementById('backstage-kokuin-text');
    const countEl = document.getElementById('backstage-kokuin-char-count');
    const warnEl = document.getElementById('backstage-kokuin-warn');
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

    window.BACKSTAGE_KOKUIN_STATE = {
      enabled: state.enabled,
      text: state.text,
      fontId: font.id,
      fontFamily: font.family,
      fontWeight: font.weight,
      // 注文properties用：スタッフがサンプルシートの「フォントA」等とすぐ照合できるよう記号名も併記
      fontLabel: `フォント${font.id}：${font.family}`,
      valid: state.enabled ? valid : true
    };

    drawKokuinText();
    updateFontSwatch();
  }

  function updateFontSwatch() {
    const swatch = document.getElementById('backstage-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  // 商品イメージSVG本体の #kokuin グループへ直接刻印テキストを描画する（別ウィンドウの
  // 拡大プレビューは作らない）。SVGが未ロードならロード完了を待って再試行する。
  function drawKokuinText() {
    const group = mainKokuinGroup();
    if (!group) {
      if (state.enabled) setTimeout(drawKokuinText, 150);
      return;
    }
    group.innerHTML = '';

    const text = state.text || '';
    if (!text || !state.enabled) return;

    const font = currentFont();
    const ns = 'http://www.w3.org/2000/svg';
    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('x', ANCHOR.x);
    textEl.setAttribute('y', ANCHOR.y);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    if (ANGLE_DEG) textEl.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
    textEl.setAttribute('font-family', font.family);
    textEl.setAttribute('font-weight', font.weight);
    textEl.setAttribute('font-size', BASE_FONT_SIZE);
    // 型押しはレザー面に直接乗るため、レザー色に対してコントラストが出る色を使う
    const baseHex = (typeof backstageColors !== 'undefined') ? backstageColors.leather : null;
    const fillColor = (baseHex && typeof engravingColor === 'function') ? engravingColor(baseHex) : '#2a1710';
    textEl.setAttribute('fill', fillColor);
    textEl.setAttribute('fill-opacity', '0.82');
    textEl.textContent = text;
    group.appendChild(textEl);

    let fontSize = BASE_FONT_SIZE;
    let measuredWidth = textEl.getBBox().width;
    while (measuredWidth > MAX_TEXT_WIDTH && fontSize > 4) {
      fontSize -= 0.5;
      textEl.setAttribute('font-size', fontSize);
      measuredWidth = textEl.getBBox().width;
    }
  }

  async function onToggleChange() {
    const toggle = document.getElementById('backstage-kokuin-toggle');
    const section = document.getElementById('backstage-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled) await loadFonts();

    validateAndDraw();
    if (typeof updateBackstagePriceDisplay === 'function') updateBackstagePriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('backstage-kokuin-toggle');
    const input = document.getElementById('backstage-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.BACKSTAGE_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
