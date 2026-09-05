/* Wellington Clear ver. 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   本革版 wellington-kokuin-addon.js をフォークし、刻印・ロゴの基準ピースを
   3番目（PVC範囲）から1番目（front・本革）へ変更したもの。
   既存の wellington-clear-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。 */
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

  // wellington_kokuin_base.svg（本革版と共通の共有アセット、未改変）内で、本革版は
  // 3番目パーツ（_x33_）を基準にANCHORを実測していた。Clear ver.では名入れ刻印・ロゴともに
  // 1番目（front・本革）に乗せる必要があるため、front/_x33_のbboxの中心差分を実測し
  // （dx=+305.77, dy=+179.39）、本革版のANCHORにそのまま加算した値を使う。
  const ANCHOR = { x: 608.40, y: 372.02 };
  const ANGLE_DEG = -59.06;
  const BASE_FONT_SIZE = 30;
  const OUTLINE_MARGIN = 6; // SVG単位。輪郭からの安全マージン
  const MIN_FONT_SIZE = 12;
  const HARD_FLOOR_FONT_SIZE = 10;
  const LINE_GAP_RATIO = 1.15;

  // 刻印プレビューSVG(wellington_kokuin_base.svg、本革版と共通)のID⇔論理ピース番号対応
  const KOKUIN_PIECE_IDS = { 5: '_x35_', 4: '_x34_', 3: '_x33_', 2: '_x32_', 1: 'front' };

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };
  let svgLoaded = false;
  let kokuinShadowRoot = null;

  window.WC_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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
    const wrap = document.getElementById('wc-kokuin-svg-wrap');
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

    // 元のsvgのDOM順は _x35_,_x34_,_x33_,#kokuin,_x32_,front の順（本革版は3番目パーツの
    // 領域に刻印を乗せる設計だったため、#kokuinがそこで前面に出れば十分だった）。
    // Clear ver.は刻印をfrontの上に乗せるが、frontは#kokuinより後ろ（＝手前）に描画される
    // ため、そのままだと刻印テキストがfrontの不透明な塗りで完全に隠れてしまう。
    // #kokuinをsvgの最後（＝最前面）に移動し、常にfrontより手前に表示されるようにする。
    const svg = kokuinShadowRoot.querySelector('svg');
    const kokuinGroup = svg?.querySelector('#kokuin');
    if (svg && kokuinGroup) svg.appendChild(kokuinGroup);

    svgLoaded = true;
    applyWcKokuinColors();
  }

  // カラーシミュレーター本体の配色を、刻印プレビューSVGの対応する各パーツに反映する。
  // 1番目(front)は本革の前端色、2〜5番目はPVC本体の単色をそのまま使う（グラデーションは
  // このクローズアップでは付けない。folklore-clear-kokuin-addon.jsと同じ簡略化）。
  function applyWcKokuinColors() {
    const svg = kokuinShadowRoot?.querySelector('svg');
    if (!svg || typeof wcFrontColor === 'undefined' || typeof wcPvcColor === 'undefined') return;
    Object.entries(KOKUIN_PIECE_IDS).forEach(([pieceNum, id]) => {
      const el = svg.querySelector('#' + CSS.escape(id));
      const hex = pieceNum === '1' ? wcFrontColor.hex : wcPvcColor.hex;
      if (el && hex) el.style.fill = hex;
    });
    drawKokuinText();
  }
  window.applyWcKokuinColors = applyWcKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('wc-kokuin-font-select');
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
    const input = document.getElementById('wc-kokuin-text');
    const countEl = document.getElementById('wc-kokuin-char-count');
    const warnEl = document.getElementById('wc-kokuin-warn');
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

    window.WC_KOKUIN_STATE = {
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
    const swatch = document.getElementById('wc-kokuin-font-swatch');
    if (!swatch) return;
    const font = currentFont();
    swatch.textContent = state.text || '';
    swatch.style.fontFamily = `'${font.family}'`;
    swatch.style.fontWeight = font.weight;
  }

  function kokuinFillColor() {
    // 刻印テキストは1番目(front・本革)の上に乗るため、その色に対してコントラストが出る色を使う
    const baseHex = (typeof wcFrontColor !== 'undefined') ? wcFrontColor.hex : null;
    return (baseHex && typeof wcGetLogoColor === 'function') ? wcGetLogoColor(baseHex) : '#2a1710';
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

  // (x,y)を中心(cx,cy)まわりにdeg度回転させる
  function rotatePoint(x, y, cx, cy, deg) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = x - cx, dy = y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  // 幅w・高さhのテキスト外周（OUTLINE_MARGIN込み）を中心(cx,cy)・角度ANGLE_DEGで配置した際、
  // 全周がpieceEl（1番目・front）の輪郭内に収まるかを判定する
  function textFitsInPiece(pieceEl, w, h, cx, cy) {
    const hw = w / 2 + OUTLINE_MARGIN, hh = h / 2 + OUTLINE_MARGIN;
    const localPts = [];
    for (let t = -1; t <= 1.001; t += 0.5) {
      localPts.push([t * hw, -hh]);
      localPts.push([t * hw, hh]);
    }
    localPts.push([-hw, 0], [hw, 0]);
    return localPts.every(([lx, ly]) => {
      const p = rotatePoint(cx + lx, cy + ly, ANCHOR.x, ANCHOR.y, ANGLE_DEG);
      return pieceEl.isPointInFill(new DOMPoint(p.x, p.y));
    });
  }

  // el（SVGに追加済み）の文字列について、中心(cx,cy)に置いたときpieceElの輪郭内
  // （マージン込み）に収まる最大フォントサイズをfloorSizeを下限として探す。見つからなければnull。
  function fitKokuinFontSize(el, text, pieceEl, cx, cy, startSize, floorSize) {
    el.textContent = text;
    for (let size = startSize; size >= floorSize; size--) {
      el.setAttribute('font-size', size);
      const b = el.getBBox();
      if (textFitsInPiece(pieceEl, b.width, b.height, cx, cy)) return size;
    }
    return null;
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
    const svg = kokuinShadowRoot.querySelector('svg');
    const pieceEl = svg && svg.querySelector('#' + CSS.escape(KOKUIN_PIECE_IDS[1]));
    if (!pieceEl) return;

    // まず1行での配置を試みる。1番目パーツ（front）の実際の輪郭に対する幾何学的な内包判定で、
    // マージンOUTLINE_MARGIN込みで収まる最大サイズを探す。
    const line1 = makeKokuinTextEl(font);
    group.appendChild(line1);
    const singleSize = fitKokuinFontSize(line1, text, pieceEl, ANCHOR.x, ANCHOR.y, BASE_FONT_SIZE, MIN_FONT_SIZE);

    if (singleSize != null) {
      line1.setAttribute('font-size', singleSize);
      line1.setAttribute('x', ANCHOR.x);
      line1.setAttribute('y', ANCHOR.y);
      line1.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
      return;
    }

    // 1行では収まらない極端な入力のみ2段組みにフォールバック
    group.innerHTML = '';
    const [textA, textB] = splitKokuinInHalf(text);
    const lineA = makeKokuinTextEl(font);
    const lineB = makeKokuinTextEl(font);
    group.appendChild(lineA);
    group.appendChild(lineB);

    let sharedSize = HARD_FLOOR_FONT_SIZE;
    for (let size = MIN_FONT_SIZE; size >= HARD_FLOOR_FONT_SIZE; size--) {
      const gap = size * LINE_GAP_RATIO;
      lineA.setAttribute('font-size', size); lineA.textContent = textA;
      lineB.setAttribute('font-size', size); lineB.textContent = textB;
      const ba = lineA.getBBox(), bb = lineB.getBBox();
      const okA = textFitsInPiece(pieceEl, ba.width, ba.height, ANCHOR.x, ANCHOR.y - gap / 2);
      const okB = textFitsInPiece(pieceEl, bb.width, bb.height, ANCHOR.x, ANCHOR.y + gap / 2);
      if (okA && okB) { sharedSize = size; break; }
    }
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
    const toggle = document.getElementById('wc-kokuin-toggle');
    const section = document.getElementById('wc-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled && !svgLoaded) {
      await Promise.all([loadFonts(), loadBaseSvg()]);
    } else if (state.enabled) {
      applyWcKokuinColors();
    }

    validateAndDraw();
    if (typeof wcUpdatePriceDisplay === 'function') wcUpdatePriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('wc-kokuin-toggle');
    const input = document.getElementById('wc-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.WC_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
