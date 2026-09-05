/* folklore Clear ver. 名入れ刻印アドオン（有料オプション、+¥1,100税込）
   folklore-clear-simulator.js（カラーシミュレーター本体）と同じページに読み込まれる前提。
   PVC版は2〜19枚目がPVC（単色のみ）のため、刻印は唯一の本革部分である
   「先頭（前/ボディ上部側）＝1枚目」の色に連動させる。本革版folkloreの
   「先頭から3番目」から刻印位置が変わっている点に注意。
   閉じ込め用のプレビューSVG（folklore_kokuin_base.svg）自体は本革版と共通のものを
   流用し、空の #kokuin グループをJS側で_x33_（P3）から_x31_（P1）へ付け替える。 */
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

  // folklore_kokuin_base.svgのP1（_x31_）のbboxを実測し、本革版のP3用ANCHORから
  // 同じ並進量だけ移動させた座標（回転角は全ピース共通のため変更なし）
  const ANCHOR = { x: 609.76, y: 375.22 };
  const ANGLE_DEG = -60.70;
  const BASE_FONT_SIZE = 20;
  const MAX_TEXT_WIDTH = 130;
  const MIN_FONT_SIZE = 14;
  const HARD_FLOOR_FONT_SIZE = 6;
  const LINE_GAP_RATIO = 1.15;

  // folklore_kokuin_base.svg は先頭（前）から5枚分のウロコが個別のグループ
  // （_x31_〜_x35_ = P1〜P5）として並んでいる。各グループを対応するfcPartColorsの色で
  // 個別に塗り分ける（インデックスは配列末尾がP1＝先頭になる並び）。
  const KOKUIN_PIECE_GROUPS = ['_x31_', '_x32_', '_x33_', '_x34_', '_x35_']; // P1〜P5

  const KOKUIN_PRICE_ADD = 1100;

  let state = { enabled: false, text: '', fontId: 'A' };
  let svgLoaded = false;
  let kokuinShadowRoot = null;

  window.FOLKLORE_KOKUIN_STATE = { enabled: false, text: '', fontFamily: '', valid: false };

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
    const wrap = document.getElementById('folklore-kokuin-svg-wrap');
    if (!wrap || svgLoaded) return;
    const res = await fetch('https://708works-lab.github.io/dev/folklore_kokuin_base.svg');
    const svgText = await res.text();
    kokuinShadowRoot = wrap.attachShadow({ mode: 'open' });
    kokuinShadowRoot.innerHTML = `<style>svg{width:100%;height:auto;display:block;}</style>${svgText}`;
    // Shopifyテーマのdiv:empty{display:none}対策（Shadow DOM内の内容はlight DOM上は「空」判定される）
    wrap.style.display = 'block';

    const svg = kokuinShadowRoot.querySelector('svg');
    // viewBox・P5の表示は本革版（folklore-kokuin-addon.js）と同一のまま変更しない
    // （P5が左上で一部欠けて見えるのはsvgアセット自体の仕様で、本革版も同じ見え方）

    // 空の#kokuinグループを、刻印位置であるP1（_x31_）の子要素へ付け替える
    // （元のsvgファイルはP3=_x33_の子として持っているため、本革版とは異なりここで移設が必要）
    const kokuinGroup = svg?.querySelector('#kokuin');
    const p1Group = svg?.querySelector('#_x31_');
    if (kokuinGroup && p1Group) p1Group.appendChild(kokuinGroup);

    svgLoaded = true;
    applyFolkloreKokuinColors();
  }

  // カラーシミュレーター本体で選ばれた各ウロコの色を、刻印プレビューSVGの5枚それぞれに反映する
  // （P1〜P5 = 先頭から1〜5枚目。P1は本革=前の色、P2〜P5はPVC本体色がそのまま入る）
  function applyFolkloreKokuinColors() {
    const svg = kokuinShadowRoot?.querySelector('svg');
    if (!svg || typeof fcPartColors === 'undefined' || typeof fcN === 'undefined') return;
    KOKUIN_PIECE_GROUPS.forEach((groupId, i) => {
      const frontNum = i + 1; // 1〜5
      const hex = fcPartColors[fcN - frontNum];
      if (!hex) return;
      const group = svg.querySelector(`#${groupId}`);
      if (!group) return;
      group.querySelectorAll('path:not(.st0)').forEach(p => { p.style.fill = hex; });
    });
    drawKokuinText();
  }
  window.applyFolkloreKokuinColors = applyFolkloreKokuinColors;

  function buildFontSelect() {
    const select = document.getElementById('folklore-kokuin-font-select');
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
    const input = document.getElementById('folklore-kokuin-text');
    const countEl = document.getElementById('folklore-kokuin-char-count');
    const warnEl = document.getElementById('folklore-kokuin-warn');
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

    window.FOLKLORE_KOKUIN_STATE = {
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
    const swatch = document.getElementById('folklore-kokuin-font-swatch');
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
    // レーザー刻印は革の色に関わらず視認できるため、刻印箇所の革色（先頭=1番目のウロコ、本革）に
    // 対して コントラストが出る色（本体シミュレーターのロゴ刻印と同じロジック）を使う
    const baseHex = (typeof fcPartColors !== 'undefined' && typeof fcN !== 'undefined') ? fcPartColors[fcN - 1] : null;
    const fillColor = (baseHex && typeof fcGetLogoColor === 'function') ? fcGetLogoColor(baseHex) : '#2a1710';
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
    const group = kokuinShadowRoot?.getElementById('kokuin');
    if (!group) return;
    group.innerHTML = '';

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();

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
    const toggle = document.getElementById('folklore-kokuin-toggle');
    const section = document.getElementById('folklore-kokuin-section');
    state.enabled = toggle.checked;
    if (section) section.hidden = !state.enabled;

    if (state.enabled && !svgLoaded) {
      await Promise.all([loadFonts(), loadBaseSvg()]);
    } else if (state.enabled) {
      applyFolkloreKokuinColors();
    }

    validateAndDraw();
    if (typeof fcUpdatePriceDisplay === 'function') fcUpdatePriceDisplay();
  }

  function init() {
    const toggle = document.getElementById('folklore-kokuin-toggle');
    const input = document.getElementById('folklore-kokuin-text');
    if (!toggle || !input) return;

    toggle.addEventListener('change', onToggleChange);
    input.addEventListener('input', validateAndDraw);
    buildFontSelect();
    validateAndDraw();
  }

  window.FOLKLORE_KOKUIN_PRICE_ADD = KOKUIN_PRICE_ADD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
