/* SUS4 with Wellington 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   既存の sus4w-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   カラー選択のグローバル状態（sus4wColors, engravingColor）をそのまま参照する。

   本体（革1）は708worksロゴが入っている側の端と、名入れ刻印を追加できる側の端が
   分かれている（SUS4単体と同じ考え方）。sus4_w_wellington_color_order.svg には
   バッグ装着コンテキスト側 <g id="kokuin">（バッグに装着された状態で革が巻き込まれる
   関係で天地が逆さま）と、フラットな商品イメージ側 <g id="kokuin1">（通常向き）の
   2箇所に刻印エリアがあり、両方に同じ文字を描画する。 */
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

  // #kokuin（バッグ装着コンテキスト・小さい）と #kokuin1（フラット商品イメージ・
  // 大きい）には、革の上に実際に刻印する角度・向きの見本として「kokuin」という文字が
  // アウトライン化された状態で仕込まれている。角度は各文字パスの中心座標を実測し、
  // 先頭文字→末尾文字のベクトルからdeg換算した値（SUS4単体とほぼ同じ角度になっており、
  // 同じフラップ形状の使い回しであることと整合している）。
  //   #kokuin  : バッグに装着された状態では革が巻き込まれる関係で天地が逆さま（SUS4単体と同仕様）
  //   #kokuin1 : フラットな商品イメージでは通常向き
  // maxWidthは「kokuin」プレースホルダー自体の幅ではなく、革1パーツ（#leather01 /
  // #leather011 の該当パス）の輪郭を実際にisPointInFillでサンプリングして、アンカー点
  // からベースライン方向へ左右にどれだけ余裕があるかを実測した値（安全マージンとして
  // 実測値の80%）。（kokuin: 実測33.7 → ×0.8 ≈ 26.9 / kokuin1: 実測43.4 → ×0.8 ≈ 34.7）
  const TARGETS = [
    { groupId: 'kokuin',  anchor: { x: 300.33, y: 847.42 }, angle: -173.2, baseFontSize: 10, maxWidth: 26.9 },
    { groupId: 'kokuin1', anchor: { x: 161.38, y: 109.95 }, angle: 27.4,   baseFontSize: 12, maxWidth: 34.7 }
  ];

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };

  window.SUS4W_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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

  function mainSvg() {
    return document.querySelector('#sus4w-svg-wrap svg');
  }

  function applySus4wKokuinColors() {
    drawKokuinText();
  }
  window.applySus4wKokuinColors = applySus4wKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('sus4w-kokuin-font-select');
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
    const input = document.getElementById('sus4w-kokuin-text');
    const countEl = document.getElementById('sus4w-kokuin-char-count');
    const warnEl = document.getElementById('sus4w-kokuin-warn');
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

    window.SUS4W_KOKUIN_STATE = {
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
    if (typeof updateSus4wPriceDisplay === 'function') updateSus4wPriceDisplay();
  }

  function updateFontSwatch() {
    const swatch = document.getElementById('sus4w-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  function drawKokuinText() {
    const svg = mainSvg();
    if (!svg) {
      if (state.enabled) setTimeout(drawKokuinText, 150);
      return;
    }

    const text = state.text || '';
    const font = currentFont();
    // 刻印は革1（本体、708worksロゴが入っていない側の端）に入るため、
    // 革1色に対してコントラストが出る色を使う
    const baseHex = (typeof sus4wColors !== 'undefined') ? sus4wColors.leather1 : null;
    const fillColor = (baseHex && typeof engravingColor === 'function') ? engravingColor(baseHex) : '#2a1710';

    TARGETS.forEach(({ groupId, anchor, angle, baseFontSize, maxWidth }) => {
      const group = svg.querySelector('#' + groupId);
      if (!group) return;
      group.innerHTML = '';
      if (!text || !state.enabled) return;

      const ns = 'http://www.w3.org/2000/svg';
      const textEl = document.createElementNS(ns, 'text');
      textEl.setAttribute('x', anchor.x);
      textEl.setAttribute('y', anchor.y);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'central');
      if (angle) textEl.setAttribute('transform', `rotate(${angle} ${anchor.x} ${anchor.y})`);
      textEl.setAttribute('font-family', font.family);
      textEl.setAttribute('font-weight', font.weight);
      textEl.setAttribute('font-size', baseFontSize);
      textEl.setAttribute('fill', fillColor);
      textEl.setAttribute('fill-opacity', '0.82');
      textEl.textContent = text;
      group.appendChild(textEl);

      let fontSize = baseFontSize;
      let measuredWidth = textEl.getBBox().width;
      while (measuredWidth > maxWidth && fontSize > 3) {
        fontSize -= 0.5;
        textEl.setAttribute('font-size', fontSize);
        measuredWidth = textEl.getBBox().width;
      }
    });
  }

  async function onToggleChange() {
    const toggle = document.getElementById('sus4w-kokuin-toggle');
    const section = document.getElementById('sus4w-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled) await loadFonts();

    validateAndDraw();
  }

  function init() {
    const toggle = document.getElementById('sus4w-kokuin-toggle');
    const input = document.getElementById('sus4w-kokuin-text');
    if (!toggle || !input) { setTimeout(init, 100); return; }

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.SUS4W_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
