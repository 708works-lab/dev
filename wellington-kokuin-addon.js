/* Wellington 名入れ刻印アドオン（有料オプション、+¥1,100税込・要確認。Kolmio(kolmio-kokuin-addon.js)を土台に移植）
   既存の wellington-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   刻印は先端(1番=front)パーツに乗るため、色は常に wlCurState().colors[1]（先端パーツの色）を参照する。
   ギター/ウクレレどちらのブランチでもプレビューは共通の1枚のSVG（先端付近のクローズアップ）を使う。 */
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

  // wellington_kokuin_base.svg内の装飾サンプル刻印パス（"kokuin"グループ）の各サブパスの
  // 絶対始点(M座標)からPCAで算出した重心・主軸角度。Kolmio(-60.12度)とほぼ同じ傾き(-59.06度)
  // になっており、ブランド共通のデザイン意図と考えられる。ローカル検証で実際の見た目を
  // 確認し、必要なら微調整すること。
  const ANCHOR = { x: 302.63, y: 192.63 };
  const ANGLE_DEG = -59.06;
  const BASE_FONT_SIZE = 30;
  // Kolmioは719x479のうち片側だけ大きく使う縦長クローズアップだったのに対し、Wellingtonの
  // kokuin SVGは横長(719x479.53)でパーツがより大きく写っているため、文字の許容幅もその分広い。
  // 初期値は控えめに見積り、ローカル検証で輪郭内に収まるよう調整すること。
  const MAX_TEXT_WIDTH = 70;
  // 1行表示を試みる際のフォントサイズ下限。18だと「708works」(8文字)のような短めの文字列でも
  // 幅70に収まらず2段組みに落ちてしまっていたため、実測（Cabin Sketch 700での幅測定）に基づき
  // 14まで下げた。2段組み時のHARD_FLOOR_FONT_SIZE(10)より高いので、本当に長い文字列（12〜15文字）
  // は引き続き2段組みにフォールバックする。
  const MIN_FONT_SIZE = 14;
  const HARD_FLOOR_FONT_SIZE = 10;
  const LINE_GAP_RATIO = 1.15;

  // 刻印プレビューSVG(wellington_kokuin_base.svg)に写っている先端側パーツのID⇔論理ピース番号対応
  // （wellington-simulator.jsの論理番号: 1=front, 2=物理2番...と共通）
  const KOKUIN_PIECE_IDS = { 5: '_x35_', 4: '_x34_', 3: '_x33_', 2: '_x32_', 1: 'front' };

  const KOKUIN_PRICE_ADD = 1100; // 暫定額（他シリーズの刻印オプションと同額。要確認）

  let state = { enabled: false, text: '', fontId: 'A' };
  let svgLoaded = false;
  let kokuinShadowRoot = null;

  window.WL_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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
    const wrap = document.getElementById('wl-kokuin-svg-wrap');
    if (!wrap || svgLoaded) return;
    const res = await fetch('https://708works-lab.github.io/dev/wellington_kokuin_base.svg');
    const svgText = await res.text();
    // Shadow DOMで隔離する。カラーシミュレーター本体のSVGも同じ.st0/.st1クラス名を
    // 使っており、light DOMにそのまま挿入すると<style>がページ全体に漏れて色が混線するため。
    kokuinShadowRoot = wrap.attachShadow({ mode: 'open' });
    kokuinShadowRoot.innerHTML = `<style>svg{width:100%;height:auto;display:block;}</style>${svgText}`;
    // Shopifyテーマのbase.cssに div:empty{display:none} があり、shadow rootを持つだけの
    // （light DOM上は子を持たない）divが非表示にされてしまうため、インラインで明示的に上書きする。
    wrap.style.display = 'block';
    svgLoaded = true;
    applyWlKokuinColors();
  }

  // カラーシミュレーター本体の先端側パーツ(1〜5番)の色を、刻印プレビューSVGの
  // 対応する各パーツにそれぞれ反映する（一律1色ではなく、パーツごとの実際の色を使う）
  function applyWlKokuinColors() {
    const svg = kokuinShadowRoot?.querySelector('svg');
    if (!svg || typeof wlCurState !== 'function') return;
    const st = wlCurState();
    Object.entries(KOKUIN_PIECE_IDS).forEach(([pieceNum, id]) => {
      const el = svg.querySelector('#' + CSS.escape(id));
      const hex = st.colors[pieceNum];
      if (el && hex) el.style.fill = hex;
    });
    drawKokuinText();
  }
  window.applyWlKokuinColors = applyWlKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('wl-kokuin-font-select');
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
    const input = document.getElementById('wl-kokuin-text');
    const countEl = document.getElementById('wl-kokuin-char-count');
    const warnEl = document.getElementById('wl-kokuin-warn');
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

    window.WL_KOKUIN_STATE = {
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
    const swatch = document.getElementById('wl-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  function kokuinFillColor() {
    // 刻印テキストのANCHOR位置は実測bboxでpiece3番の上に乗ることを確認済み（front=1番ではない）。
    // レーザー刻印は革の色に関わらず視認できるため、実際に乗っているpiece3番の色に対して
    // コントラストが出る色を使う
    const baseHex = (typeof wlCurState === 'function') ? wlCurState().colors[3] : null;
    return (baseHex && typeof wlEngravingColor === 'function') ? wlEngravingColor(baseHex) : '#2a1710';
  }

  function makeKokuinTextEl(font) {
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, 'text');
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('dominant-baseline', 'central');
    el.setAttribute('font-family', font.family);
    el.setAttribute('font-weight', font.weight);
    el.setAttribute('fill', kokuinFillColor());
    el.setAttribute('fill-opacity', '0.82');
    return el;
  }

  // el（SVGに追加済み）の文字列をmaxWidth以内に収まるまでfloorSizeを下限として縮小する
  function fitKokuinFontSize(el, text, maxWidth, startSize, floorSize) {
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

  // 中央付近のスペースで分割。スペースがなければ文字数で半分に分割する
  function splitKokuinInHalf(text) {
    if (text.includes(' ')) {
      const mid = text.length / 2;
      let best = -1, bestDist = Infinity;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          const d = Math.abs(i - mid);
          if (d < bestDist) { bestDist = d; best = i; }
        }
      }
      if (best >= 0) return [text.slice(0, best).trim(), text.slice(best + 1).trim()];
    }
    const mid = Math.ceil(text.length / 2);
    return [text.slice(0, mid), text.slice(mid)];
  }

  function drawKokuinText() {
    const group = kokuinShadowRoot?.getElementById('kokuin');
    if (!group) return;
    group.innerHTML = '';

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();

    // まず1行での配置を試みる（MIN_FONT_SIZEまで縮小して収まればそのまま採用）
    const line1 = makeKokuinTextEl(font);
    group.appendChild(line1);
    const singleFit = fitKokuinFontSize(line1, text, MAX_TEXT_WIDTH, BASE_FONT_SIZE, MIN_FONT_SIZE);

    if (singleFit.width <= MAX_TEXT_WIDTH) {
      line1.setAttribute('x', ANCHOR.x);
      line1.setAttribute('y', ANCHOR.y);
      line1.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
      return;
    }

    // 1行では収まらないため2段組みに切り替える
    group.innerHTML = '';
    const [textA, textB] = splitKokuinInHalf(text);
    const lineA = makeKokuinTextEl(font);
    const lineB = makeKokuinTextEl(font);
    group.appendChild(lineA);
    group.appendChild(lineB);

    const fitA = fitKokuinFontSize(lineA, textA, MAX_TEXT_WIDTH, BASE_FONT_SIZE, HARD_FLOOR_FONT_SIZE);
    const fitB = fitKokuinFontSize(lineB, textB, MAX_TEXT_WIDTH, BASE_FONT_SIZE, HARD_FLOOR_FONT_SIZE);
    const sharedSize = Math.min(fitA.size, fitB.size);
    lineA.setAttribute('font-size', sharedSize);
    lineB.setAttribute('font-size', sharedSize);

    // 2行とも同じ回転軸（ANCHOR）を中心に回転させることでストラップ角度に対して垂直に積む
    const lineGap = sharedSize * LINE_GAP_RATIO;
    lineA.setAttribute('x', ANCHOR.x);
    lineA.setAttribute('y', ANCHOR.y - lineGap / 2);
    lineA.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
    lineB.setAttribute('x', ANCHOR.x);
    lineB.setAttribute('y', ANCHOR.y + lineGap / 2);
    lineB.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
  }

  async function onToggleChange() {
    const toggle = document.getElementById('wl-kokuin-toggle');
    const section = document.getElementById('wl-kokuin-section');
    state.enabled = toggle.checked;
    // wellington-simulator.js側のトップレベルlet変数（同一ページ内のscript間で共有される
    // グローバル字句スコープ経由で参照可能。windowプロパティにはならない点に注意）を更新する。
    wlKokuinEnabled = state.enabled;
    if (section) section.hidden = !state.enabled;

    if (state.enabled && !svgLoaded) {
      await Promise.all([loadFonts(), loadBaseSvg()]);
    } else if (state.enabled) {
      applyWlKokuinColors();
    }

    validateAndDraw();
    if (typeof updateWlPriceDisplay === 'function') updateWlPriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('wl-kokuin-toggle');
    const input = document.getElementById('wl-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.WL_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
