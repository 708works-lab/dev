/* Capo 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   既存の capo-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   カラー選択のグローバル状態（capoColors, engravingColor）をそのまま参照する。

   Capoは2個1セットのうち「708worksロゴ刻印入りバネホックが使われている側」の革にのみ
   名入れ刻印を入れる（もう一方のパーツはバネホックの刻印も名入れ刻印も一切無い）。
   capo_color_order.svg には装着イメージ側 <g id="kokuin"> と商品イメージ側
   <g id="kokuin1"> の2箇所に刻印エリアがあり、両方に同じ文字を描画する。 */
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

  // capo_color_order.svg 内、#kokuin（装着イメージ・小さい）と #kokuin1（商品イメージ・
  // 大きい）には、革の上に実際に刻印する角度・向きの見本として「kokuin」という文字が
  // アウトライン化された状態で仕込まれている（サンプル文字そのものは表示せず削除する
  // が、位置・角度の基準としてそのまま利用する）。角度は各文字パスの中心座標を実測し、
  // 最小二乗法でベースライン方向を求めた値（documentのpath順が先頭→末尾で意味の並び
  // 順と一致しているため、その向きにdeg換算している）。
  //   #kokuin  : 装着時は革が巻き込まれる関係で天地が逆さまになる（実写サンプルの
  //              Naoya刻印も同様に逆さまに写っている）
  //   #kokuin1 : 商品単体イメージでは通常向き（右肩上がりの対角線）
  // maxWidthは「kokuin」プレースホルダー自体の幅ではなく、革パーツ（#leather /
  // #leather1 の該当パス）の輪郭を実際にサンプリングして、アンカー点からベースライン
  // 方向へ左右にどれだけ余裕があるかを実測した値（安全マージンとして実測値の80%）。
  // こうすることで「kokuinの枠は超えてよいが、革レイヤーからははみ出さない」という
  // 仕様を満たす。（leather: 実測134.7 → 中心対称で約132 → ×0.8 ≈ 105 /
  // leather1: 実測355.5 → 中心対称で約346 → ×0.8 ≈ 275）
  const TARGETS = [
    { groupId: 'kokuin',  anchor: { x: 287.06, y: 462.77 }, angle: 191.9, baseFontSize: 10, maxWidth: 105 },
    { groupId: 'kokuin1', anchor: { x: 274.39, y: 136.15 }, angle: 42.6,  baseFontSize: 22, maxWidth: 275 }
  ];

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };

  window.CAPO_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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
    return document.querySelector('#capo-svg-wrap svg');
  }

  // カラーシミュレーター本体で選ばれた色が変わった際にも呼ばれる（capo-simulator.jsから）
  function applyCapoKokuinColors() {
    drawKokuinText();
  }
  window.applyCapoKokuinColors = applyCapoKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('capo-kokuin-font-select');
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
    const input = document.getElementById('capo-kokuin-text');
    const countEl = document.getElementById('capo-kokuin-char-count');
    const warnEl = document.getElementById('capo-kokuin-warn');
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

    window.CAPO_KOKUIN_STATE = {
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
    if (typeof updateCapoPriceDisplay === 'function') updateCapoPriceDisplay();
  }

  function updateFontSwatch() {
    const swatch = document.getElementById('capo-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  // 商品イメージ・装着イメージ両方の刻印エリアへ直接刻印テキストを描画する。
  // SVGが未ロードならロード完了を待って再試行する。
  function drawKokuinText() {
    const svg = mainSvg();
    if (!svg) {
      if (state.enabled) setTimeout(drawKokuinText, 150);
      return;
    }

    const text = state.text || '';
    const font = currentFont();
    const baseHex = (typeof capoColors !== 'undefined') ? capoColors.leather : null;
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
      // 型押しはレザー面に直接乗るため、レザー色に対してコントラストが出る色を使う
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
    const toggle = document.getElementById('capo-kokuin-toggle');
    const section = document.getElementById('capo-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled) await loadFonts();

    validateAndDraw();
  }

  function init() {
    const toggle = document.getElementById('capo-kokuin-toggle');
    const input = document.getElementById('capo-kokuin-text');
    if (!toggle || !input) { setTimeout(init, 100); return; }

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.CAPO_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
