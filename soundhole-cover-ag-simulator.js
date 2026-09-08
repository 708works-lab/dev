// ============================================================================
// サウンドホールカバー｜アコースティックギター用（soundhole-cover-ag）カラーシミュレーター
// soundhole-cover-uk-simulator.js を「完全に踏襲」する方針で、関数名・変数名・IDは一切変更せず、
// データ部分（SVGアセット・円弧ジオメトリ・価格・直径範囲等）のみ差し替えている
// （ホスティング先が別ページのため名前衝突リスクはゼロ、Triad for ukuleleと同じ戦略）。
// SVGは708works提供の soundholecover_color_order.svg をそのまま流用。
// 構造：viewBox全体(0 0 381.94 737.31)に「上部：直径/装着楽器キャプション＋クローズアップ」
// 「下部：ギター本体に装着したイメージ」が縦に並んでいる、単一の連続イラスト。
// 装着楽器（右利き用／左利き用）ごとに、本体側は guitar-image-left/guitar-image-right、
// 上部キャプション側は discription内の left/right という別々のトグルペアで管理されている
// （ukulele版と同一構造。guitar-image-left = 左利き用、guitar-image-right = 右利き用）。
// 革の色（leather/leather1/クローズアップ土台円）はすべて class="st0" を共有しているため、
// CSSルールを書き換えるだけで一括着色できる（Triadと同じ手法）。
// 直径「XXmm」はsizeグループ内の"X""X""m""m"4パスのアウトラインで、先頭2パス（"X""X"）を
// 実際の2桁の数字に差し替える。刻印（kokuin/kokuin1）は円弧に沿って並んだ"A"のプレースホルダーで、
// 円の中心・半径・開始角度をあらかじめ実測してハードコードしてあるため、
// 実行時のgetBBox計測（モバイルSafariでdisplay:noneの祖先を持つ要素を測ると壊れる既知のバグ）が不要。
// ============================================================================

const SHC_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const SHC_SHOPIFY_DOMAIN = '708works.jp';
const SHC_PRICE_BASE = 4950;
const SHC_PRICE_KOKUIN_ADD = 1100;
const SHC_VARIANT_MAP = {
  noeng: '46634551017722',
  eng: '50255934652666',
};

// 本革20色パレット（この商品自体のGlobo設定から取得。他ラインと微妙に異なる色あり）
const SHC_COLORS = [
  { id: 'white', name: 'White', hex: '#f2f2f2' },
  { id: 'yellow', name: 'Yellow', hex: '#f2d68d' },
  { id: 'lgrn', name: 'Light GRN', hex: '#c4ca5e' },
  { id: 'lbl', name: 'Light BL', hex: '#77a6c4' },
  { id: 'orange', name: 'Orange', hex: '#dd4421' },
  { id: 'sakura', name: 'Sakura', hex: '#f1a9b5' },
  { id: 'pink', name: 'Pink', hex: '#e098c0' },
  { id: 'red', name: 'Red', hex: '#c84d50' },
  { id: 'winered', name: 'Wine Red', hex: '#973e48' },
  { id: 'navy', name: 'Navy', hex: '#2f3850' },
  { id: 'natural', name: 'Natural', hex: '#e8c7ae' },
  { id: 'tan', name: 'Tan', hex: '#f0933c' },
  { id: 'camel', name: 'Camel', hex: '#d56534' },
  { id: 'brown', name: 'Brown', hex: '#b54b3c' },
  { id: 'choco', name: 'Choco', hex: '#543d3e' },
  { id: 'grey', name: 'Grey', hex: '#937c79' },
  { id: 'olive', name: 'Olive', hex: '#997c5b' },
  { id: 'green', name: 'Green', hex: '#675f4a' },
  { id: 'greenbl', name: 'Green Blue', hex: '#3e4c55' },
  { id: 'black', name: 'Black', hex: '#2b2a30' },
];

// サウンドホールカバーは表革・裏革の2枚を縫い合わせた構造。表面の色は選べるが、
// 裏面はBlack固定（縫製・強度の都合上、色選択の対象外）。カラーサマリー等で明示する。
const SHC_BACK_COLOR = { name: 'Black', hex: '#2b2a30' };

// フォント（他ラインの名入れ刻印アドオンと共通の8書体）
const SHC_FONTS = [
  { id: 'A', family: 'Cabin Sketch', weight: '700', googleParam: 'Cabin+Sketch:wght@700', category: '手書き' },
  { id: 'B', family: 'Special Elite', weight: '400', googleParam: 'Special+Elite', category: 'スタンプ風' },
  { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true, localUrl: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf', category: 'スタンプ風' },
  { id: 'C', family: 'Lobster', weight: '400', googleParam: 'Lobster', category: '筆記体' },
  { id: 'D', family: 'Playball', weight: '400', googleParam: 'Playball', category: '筆記体' },
  { id: 'H', family: 'Great Vibes', weight: '400', googleParam: 'Great+Vibes', category: '筆記体' },
  { id: 'F', family: 'Bebas Neue', weight: '400', googleParam: 'Bebas+Neue', category: 'モダン' },
  { id: 'G', family: 'UnifrakturMaguntia', weight: '400', googleParam: 'UnifrakturMaguntia', category: 'ゴシック' },
];

const SHC_MAX_LEN = 12; // 刻印の円弧プレースホルダーが12文字分だったため、それに合わせる
const SHC_ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;
const SHC_ALLOWED_HINT = '半角英数字と一部の記号（- _ . , : ; $ !）のみご利用いただけます。絵文字・機種依存文字・全角文字はご利用いただけません。';

const SHC_DIAMETER_MIN = 70;
const SHC_DIAMETER_MAX = 110;
const SHC_DIAMETER_DEFAULT = 100; // Globoの default_value を踏襲

// 刻印の円弧ジオメトリ（2026-09-08、実SVGの"A"プレースホルダー12個からKasa法で円をフィットして実測）。
// 実行時に測定し直さない（display:noneの祖先を持つ要素のgetBBoxはSafariで壊れるため、事前計算値を使う）。
const SHC_ARC = {
  left: { cx: 188.40509, cy: 568.65077, r: 55.50724, startAngle: 109.41, endAngle: 167.77 },
  right: { cx: 193.48188, cy: 568.61632, r: 55.56642, startAngle: 70.54, endAngle: 12.25 },
};

// 直径「XXmm」の"X""X"プレースホルダーのbbox（size グループ内、常時表示・懐柔非依存の固定値）
const SHC_SIZE_DIGIT_BOXES = [
  { x: 148.22, y: 13.38, w: 18.15, h: 19.81 },
  { x: 166.67, y: 13.38, w: 18.15, h: 19.81 },
];

const SHC_VIEWBOX = '0 0 381.94 737.31';

// ============================================================================
// グローバル状態
// ============================================================================

let shcColor = SHC_COLORS.find((c) => c.id === 'camel');
let shcHandedness = 'right'; // 'right'(右利き用) | 'left'(左利き用)
let shcDiameter = SHC_DIAMETER_DEFAULT;
let shcKokuinEnabled = false;
let shcKokuinText = '';
let shcKokuinValid = true;
let shcFontId = 'A';
let shcHistory = [];
let shcLastUploadedImage = null;
let shcHasDownloadedImage = false;
let shcFontsLoaded = false;

function shcCurrentFont() {
  return SHC_FONTS.find((f) => f.id === shcFontId);
}

// ============================================================================
// 初期化
// ============================================================================

async function initializeSHCSimulator() {
  if (window.shcSimulatorInitialized) return;
  const svgScrollEl = document.getElementById('shc-svg-scroll');
  const handednessEl = document.getElementById('shc-handedness-buttons');
  if (!svgScrollEl || !handednessEl) { setTimeout(initializeSHCSimulator, 100); return; }
  window.shcSimulatorInitialized = true;

  shcBuildPalette();
  shcBuildHandednessButtons();
  shcBuildDiameterSelect();
  shcBuildFontSelect();
  shcUpdateSummary();
  shcUpdatePriceDisplay();
  shcUpdateFontPreview();
  await shcLoadFonts();
  shcBuildSvg();

  document.getElementById('shc-btn-reset')?.addEventListener('click', shcResetAll);
  document.getElementById('shc-btn-undo')?.addEventListener('click', shcUndo);
  document.getElementById('shc-btn-order')?.addEventListener('click', shcGoOrder);
  document.getElementById('shc-kokuin-toggle')?.addEventListener('change', shcOnKokuinToggleChange);
  document.getElementById('shc-kokuin-text')?.addEventListener('input', shcValidateAndRedraw);
  shcSetupFloatingBar();
}

// ============================================================================
// カラーパレット
// ============================================================================

function shcBuildPalette() {
  const el = document.getElementById('shc-palette');
  if (!el) return;
  el.innerHTML = '';
  SHC_COLORS.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'shc-swatch' + (c.id === shcColor.id ? ' selected' : '');
    btn.style.background = c.hex;
    btn.title = c.name;
    btn.addEventListener('click', () => shcSetColor(c));
    el.appendChild(btn);
  });
}

function shcSetColor(c) {
  shcSaveHistory();
  shcColor = c;
  shcBuildPalette();
  shcUpdateSummary();
  shcApplyColor();
}

function shcApplyColor() {
  const svg = document.getElementById('shc-svg');
  if (!svg) return;
  const styleEl = svg.querySelector('style');
  if (!styleEl) return;
  let css = styleEl.textContent;
  css = css.replace(/(\.st0\s*{[^}]*fill:\s*)#[0-9a-fA-F]{3,6}/, `$1${shcColor.hex}`);
  styleEl.textContent = css;
}

function shcUpdateSummary() {
  const nameEl = document.getElementById('shc-summary-color-name');
  if (nameEl) nameEl.textContent = shcColor.name;
  const dotEl = document.getElementById('shc-summary-color-dot');
  if (dotEl) dotEl.style.background = shcColor.hex;
  const backNameEl = document.getElementById('shc-summary-back-color-name');
  if (backNameEl) backNameEl.textContent = `${SHC_BACK_COLOR.name}（固定）`;
  const backDotEl = document.getElementById('shc-summary-back-color-dot');
  if (backDotEl) backDotEl.style.background = SHC_BACK_COLOR.hex;
}

// ============================================================================
// 装着する楽器（右利き用／左利き用）
// ============================================================================

function shcBuildHandednessButtons() {
  const el = document.getElementById('shc-handedness-buttons');
  if (!el) return;
  el.innerHTML = '';
  [['right', '右利き用'], ['left', '左利き用']].forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.className = 'shc-handedness-btn' + (val === shcHandedness ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => shcSetHandedness(val));
    el.appendChild(btn);
  });
}

function shcSetHandedness(val) {
  if (val === shcHandedness) return;
  shcSaveHistory();
  shcHandedness = val;
  shcBuildHandednessButtons();
  shcApplyHandedness();
}

function shcApplyHandedness() {
  const svg = document.getElementById('shc-svg');
  if (!svg) return;
  const showLeft = shcHandedness === 'left';
  const bodyLeft = svg.getElementById('guitar-image-left');
  const bodyRight = svg.getElementById('guitar-image-right');
  const capLeft = svg.getElementById('left');
  const capRight = svg.getElementById('right');
  if (bodyLeft) bodyLeft.style.display = showLeft ? '' : 'none';
  if (bodyRight) bodyRight.style.display = showLeft ? 'none' : '';
  if (capLeft) capLeft.style.display = showLeft ? '' : 'none';
  if (capRight) capRight.style.display = showLeft ? 'none' : '';
  shcRedrawKokuin();
}

// ============================================================================
// サウンドホール直径（XXmm）
// ============================================================================

function shcBuildDiameterSelect() {
  const el = document.getElementById('shc-diameter-select');
  if (!el) return;
  el.innerHTML = '';
  for (let d = SHC_DIAMETER_MIN; d <= SHC_DIAMETER_MAX; d++) {
    const opt = document.createElement('option');
    opt.value = String(d);
    opt.textContent = `${d}mm`;
    if (d === shcDiameter) opt.selected = true;
    el.appendChild(opt);
  }
  el.addEventListener('change', () => {
    shcSaveHistory();
    shcDiameter = parseInt(el.value, 10);
    shcApplyDiameter();
  });
}

function shcApplyDiameter() {
  const svg = document.getElementById('shc-svg');
  if (!svg) return;
  const sizeGroup = svg.getElementById('size');
  if (!sizeGroup) return;
  const digitsStr = String(shcDiameter);
  const paths = Array.from(sizeGroup.children);
  // 先頭2パス（"X" "X"）を隠し、代わりに実際の数字をtextで重ねる。
  // 直径が3桁になる商品（ギター用: 70〜110mm）もあるため、2つのプレースホルダーの
  // 合計幅を1つの表示エリアとみなし、桁数に応じて均等割り＋フォントサイズを自動調整する
  // （2桁固定decoで実装するとSHC_SIZE_DIGIT_BOXES[2]がundefinedになり例外で処理が止まる）。
  paths[0].style.display = 'none';
  paths[1].style.display = 'none';
  let overlay = sizeGroup.querySelector('#shc-size-digits');
  if (!overlay) {
    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('id', 'shc-size-digits');
    sizeGroup.appendChild(overlay);
  }
  overlay.innerHTML = '';

  const box0 = SHC_SIZE_DIGIT_BOXES[0];
  const box1 = SHC_SIZE_DIGIT_BOXES[1];
  const areaX = box0.x;
  const areaW = (box1.x + box1.w) - box0.x;
  const areaY = box0.y;
  const areaH = box0.h;
  const n = digitsStr.length;
  const slotW = areaW / n;
  const fontSize = Math.min(areaH * 0.98, slotW * 1.05);

  digitsStr.split('').forEach((d, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', areaX + slotW * (i + 0.5));
    t.setAttribute('y', areaY + areaH / 2);
    t.setAttribute('font-size', fontSize);
    t.setAttribute('font-family', 'Arial, "Hiragino Sans", sans-serif');
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', '#000');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = d;
    overlay.appendChild(t);
  });
}

// ============================================================================
// 刻印（円弧配置）
// ============================================================================

function shcOnKokuinToggleChange(e) {
  shcSaveHistory();
  shcKokuinEnabled = e.target.checked;
  document.getElementById('shc-kokuin-fields')?.toggleAttribute('hidden', !shcKokuinEnabled);
  shcUpdatePriceDisplay();
  shcRedrawKokuin();
}

function shcValidateAndRedraw() {
  const input = document.getElementById('shc-kokuin-text');
  const countEl = document.getElementById('shc-kokuin-char-count');
  const warnEl = document.getElementById('shc-kokuin-warn');
  if (!input) return;
  const text = input.value;
  const font = shcCurrentFont();

  if (countEl) {
    const overLen = text.length > SHC_MAX_LEN;
    countEl.textContent = `${text.length} / ${SHC_MAX_LEN}`;
    countEl.classList.toggle('over', overLen);
  }

  const warnings = [];
  if (text && !SHC_ALLOWED_PATTERN.test(text)) warnings.push(SHC_ALLOWED_HINT);
  if (text && font.noUppercase && /[A-Z]/.test(text)) warnings.push(`フォント${font.id}は大文字に対応していません。小文字でご入力ください。`);
  if (text.length > SHC_MAX_LEN) warnings.push(`文字数の上限は${SHC_MAX_LEN}文字です。`);
  if (warnEl) {
    warnEl.innerHTML = warnings.join('<br>');
    warnEl.classList.toggle('show', warnings.length > 0);
  }

  shcKokuinText = text;
  shcKokuinValid = warnings.length === 0;
  shcRedrawKokuin();
  shcUpdateFontPreview();
  shcHasDownloadedImage = false;
}

// 刻印入力欄の直下に、選択中のフォントで実際の文字列を大きく表示するプレビュー。
// 円弧上の実際の刻印は小さく読み取りづらいため、書体の違いを分かりやすくする目的。
function shcUpdateFontPreview() {
  const el = document.getElementById('shc-kokuin-font-preview');
  if (!el) return;
  const font = shcCurrentFont();
  el.textContent = shcKokuinText || 'Sample';
  el.style.fontFamily = `'${font.family}'`;
  el.style.fontWeight = font.weight;
  el.classList.toggle('shc-font-preview-placeholder', !shcKokuinText);
}

function shcRedrawKokuin() {
  const svg = document.getElementById('shc-svg');
  if (!svg) return;
  const groupId = shcHandedness === 'left' ? 'kokuin' : 'kokuin1';
  const kokuinGroup = svg.getElementById(groupId);
  if (!kokuinGroup) return;

  // プレースホルダーの"A"文字パスを隠す
  Array.from(kokuinGroup.children).forEach((el) => {
    if (el.id !== 'shc-kokuin-text-group') el.style.display = 'none';
  });

  let textGroup = kokuinGroup.querySelector('#shc-kokuin-text-group');
  if (!textGroup) {
    textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('id', 'shc-kokuin-text-group');
    kokuinGroup.appendChild(textGroup);
  }
  textGroup.innerHTML = '';

  if (!shcKokuinEnabled || !shcKokuinText) return;

  const arc = SHC_ARC[shcHandedness];
  const font = shcCurrentFont();
  const text = shcKokuinText;
  const n = text.length;
  // 左右のkokuin/kokuin1は鏡写しの円弧のため、両方とも同じ「startAngle→endAngle」の向きで
  // 文字を並べると、片方は正しく読めてももう片方は逆順（鏡文字の並び）になってしまう。
  // 位置（円弧の範囲）はそのままに、文字を置き始める端だけ左右で入れ替えて読む向きを揃える。
  const reverseOrder = shcHandedness === 'left';
  const effStartAngle = reverseOrder ? arc.endAngle : arc.startAngle;
  const effEndAngle = reverseOrder ? arc.startAngle : arc.endAngle;
  const step = n > 1 ? (effEndAngle - effStartAngle) / 11 : 0; // プレースホルダーと同じ間隔(12文字分/11ギャップ)を維持
  const baseHex = shcColor.hex;
  const fillColor = shcContrastColor(baseHex);

  for (let i = 0; i < n; i++) {
    const angleDeg = effStartAngle + i * step;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = arc.cx + arc.r * Math.cos(angleRad);
    const y = arc.cy + arc.r * Math.sin(angleRad);
    const rot = angleDeg - 90; // 文字の上端が円の中心を向くように（+90だと外向きになってしまう）
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('font-size', '6.2');
    t.setAttribute('font-family', font.family);
    t.setAttribute('font-weight', font.weight);
    t.setAttribute('fill', fillColor);
    t.setAttribute('fill-opacity', '0.82');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('transform', `rotate(${rot} ${x} ${y})`);
    t.textContent = text[i];
    textGroup.appendChild(t);
  }
}

function shcContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
}

async function shcLoadFonts() {
  if (shcFontsLoaded) return;
  shcFontsLoaded = true;
  const agStencil = SHC_FONTS.find((f) => f.id === 'E');
  if (agStencil) {
    const localFont = new FontFace('AG Stencil', `url(${agStencil.localUrl})`);
    document.fonts.add(localFont);
    await localFont.load().catch(() => {});
  }
  const specs = SHC_FONTS.filter((f) => f.googleParam).map((f) => `${f.weight} 40px "${f.family}"`);
  await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => {})));
}

function shcBuildFontSelect() {
  const select = document.getElementById('shc-kokuin-font-select');
  if (!select) return;
  select.innerHTML = '';
  SHC_FONTS.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `フォント${f.id}（${f.category}）${f.noUppercase ? '・大文字非対応' : ''}`;
    if (f.id === shcFontId) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    shcFontId = select.value;
    shcValidateAndRedraw();
  });
}

// ============================================================================
// 価格表示
// ============================================================================

function shcUpdatePriceDisplay() {
  const el = document.getElementById('shc-price-display');
  if (!el) return;
  const price = SHC_PRICE_BASE + (shcKokuinEnabled ? SHC_PRICE_KOKUIN_ADD : 0);
  const text = `¥${price.toLocaleString()}（税込）`;
  el.textContent = text;
  const floatPriceEl = document.getElementById('shc-float-price-value');
  if (floatPriceEl) floatPriceEl.textContent = text;
}

// ============================================================================
// モバイル用フローティングCTAバー
// スマホ閲覧時、シミュレーターに到達するまでの距離が長い（ヒーロー・商品説明を経由する）ことと、
// 「画像を保存してカートに入れる」ボタンがシミュレーター最下部にしか無く見つけにくいことへの対策。
// PC（2カラムレイアウト、CSS側の@media (min-width:860px)）では非表示にする——PCでは一目で
// 全体が見渡せるため、常時表示のバーはむしろ邪魔になる。
// ============================================================================

function shcSetupFloatingBar() {
  const bar = document.getElementById('shc-float-bar');
  const jumpMode = document.getElementById('shc-float-jump-mode');
  const orderMode = document.getElementById('shc-float-order-mode');
  const jumpBtn = document.getElementById('shc-float-jump-btn');
  const orderBtn = document.getElementById('shc-float-order-btn');
  const simEl = document.querySelector('.shc-simulator');
  const realOrderBtn = document.getElementById('shc-btn-order');
  if (!bar || !jumpMode || !orderMode || !simEl || !realOrderBtn) return;

  jumpBtn?.addEventListener('click', () => {
    simEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  orderBtn?.addEventListener('click', () => realOrderBtn.click());

  let ticking = false;
  function update() {
    ticking = false;
    const simRect = simEl.getBoundingClientRect();
    const btnRect = realOrderBtn.getBoundingClientRect();
    const vh = window.innerHeight;

    // シミュレーター自体を通り過ぎた（ご注文の流れ・注意事項エリア等）→常に非表示
    if (simRect.bottom < 0) { bar.classList.remove('show'); return; }

    // シミュレーターにまだ到達していない（ヒーロー・商品説明の途中）→「今すぐ選ぶ」ジャンプボタン
    const notReachedYet = simRect.top > vh * 0.7;
    if (notReachedYet) {
      if (window.scrollY < 200) { bar.classList.remove('show'); return; }
      jumpMode.hidden = false; orderMode.hidden = true;
      bar.classList.add('show');
      return;
    }

    // シミュレーター内で、実物の「カートに入れる」ボタンが画面内に見えていれば重複表示しない
    const realBtnVisible = btnRect.top < vh && btnRect.bottom > 0;
    if (realBtnVisible) { bar.classList.remove('show'); return; }

    // シミュレーター内で実ボタンが見えていない→価格＋カートボタンを常時表示
    jumpMode.hidden = true; orderMode.hidden = false;
    bar.classList.add('show');
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// ============================================================================
// SVG構築
// ============================================================================

function shcBuildSvg() {
  const scroll = document.getElementById('shc-svg-scroll');
  if (!scroll) return;
  scroll.innerHTML = `<svg id="shc-svg" viewBox="${SHC_VIEWBOX}"
    style="display:block;margin:0 auto;max-width:340px;" xmlns="http://www.w3.org/2000/svg">${SHC_SVG_INNER}</svg>`;
  const svg = document.getElementById('shc-svg');
  svg.setAttribute('width', 340);
  svg.setAttribute('height', Math.round(340 * (737.31 / 381.94)));
  shcApplyColor();
  shcApplyHandedness();
  shcApplyDiameter();
  shcRedrawKokuin();
}

// ============================================================================
// 履歴（元に戻す・リセット）
// ============================================================================

function shcSaveHistory() {
  shcHistory.push({
    color: shcColor, handedness: shcHandedness, diameter: shcDiameter,
    kokuinEnabled: shcKokuinEnabled, kokuinText: shcKokuinText, fontId: shcFontId,
  });
  if (shcHistory.length > 30) shcHistory.shift();
  const btn = document.getElementById('shc-btn-undo');
  if (btn) btn.disabled = false;
}

function shcUndo() {
  if (!shcHistory.length) return;
  const prev = shcHistory.pop();
  shcColor = prev.color; shcHandedness = prev.handedness; shcDiameter = prev.diameter;
  shcKokuinEnabled = prev.kokuinEnabled; shcKokuinText = prev.kokuinText; shcFontId = prev.fontId;
  shcSyncUI();
  shcBuildSvg();
  const btn = document.getElementById('shc-btn-undo');
  if (!shcHistory.length && btn) btn.disabled = true;
}

function shcResetAll() {
  shcSaveHistory();
  shcColor = SHC_COLORS.find((c) => c.id === 'camel');
  shcHandedness = 'right';
  shcDiameter = SHC_DIAMETER_DEFAULT;
  shcKokuinEnabled = false;
  shcKokuinText = '';
  shcKokuinValid = true;
  shcFontId = 'A';
  shcSyncUI();
  shcBuildSvg();
}

function shcSyncUI() {
  shcBuildPalette();
  shcBuildHandednessButtons();
  const diaSelect = document.getElementById('shc-diameter-select');
  if (diaSelect) diaSelect.value = String(shcDiameter);
  const toggle = document.getElementById('shc-kokuin-toggle');
  if (toggle) toggle.checked = shcKokuinEnabled;
  document.getElementById('shc-kokuin-fields')?.toggleAttribute('hidden', !shcKokuinEnabled);
  const textInput = document.getElementById('shc-kokuin-text');
  if (textInput) textInput.value = shcKokuinText;
  const countEl = document.getElementById('shc-kokuin-char-count');
  if (countEl) countEl.textContent = `${shcKokuinText.length} / ${SHC_MAX_LEN}`;
  const warnEl = document.getElementById('shc-kokuin-warn');
  if (warnEl) { warnEl.innerHTML = ''; warnEl.classList.remove('show'); }
  shcKokuinValid = true;
  const fontSelect = document.getElementById('shc-kokuin-font-select');
  if (fontSelect) fontSelect.value = shcFontId;
  shcUpdateSummary();
  shcUpdatePriceDisplay();
  shcUpdateFontPreview();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showShcToast(msg) {
  const t = document.getElementById('shc-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function showShcLoading(text = '処理中...') {
  const loadingText = document.getElementById('shc-loading-text');
  const loadingOverlay = document.getElementById('shc-loading-overlay');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}
function hideShcLoading() {
  const el = document.getElementById('shc-loading-overlay');
  if (el) el.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

// キャンバス上の長いラベル行が右端で見切れないよう、maxWidthに収まるように折り返す
function shcWrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function shcBuildSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 680;

  const liveSvg = document.getElementById('shc-svg');
  const vbW = 381.94, vbH = 737.31;
  const svgSaveW = 260;
  const svgSaveH = Math.round(vbH * (svgSaveW / vbW));

  const headerH = 50, topLabelH = 10, bottomLabelH = 10, footerH = 28;
  const svgX = Math.round(cw / 2 - svgSaveW / 2);
  const svgY0 = headerH + topLabelH;
  const ch = svgY0 + svgSaveH + bottomLabelH + footerH + 10;

  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8'; ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SOUNDHOLE COVER GUITAR', cw / 2, 28);
  ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 42);

  if (liveSvg) {
    const cloned = liveSvg.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    const svgStr = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, svgX, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  const labelX = svgX + svgSaveW + 18;
  const labelMaxWidth = cw - labelX - 16;
  let ly = svgY0 + 16;

  const drawWrappedLine = (text, indent = 0) => {
    ctx.fillStyle = '#333'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    const lines = shcWrapCanvasText(ctx, text, labelMaxWidth - indent);
    lines.forEach((line) => {
      ctx.fillText(line, labelX + indent, ly + 3);
      ly += 16;
    });
    ly += 6;
  };

  ctx.beginPath(); ctx.arc(labelX + 6, ly, 5, 0, Math.PI * 2);
  ctx.fillStyle = shcColor.hex; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
  drawWrappedLine(`表面の色: ${shcColor.name}`, 16);

  ctx.beginPath(); ctx.arc(labelX + 6, ly, 5, 0, Math.PI * 2);
  ctx.fillStyle = SHC_BACK_COLOR.hex; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
  drawWrappedLine(`裏面: ${SHC_BACK_COLOR.name}（固定）`, 16);

  drawWrappedLine(`装着予定の楽器: ${shcHandedness === 'left' ? '左利き用' : '右利き用'}`);
  drawWrappedLine(`サウンドホール適応サイズ: ${shcDiameter}mm`);

  if (shcKokuinEnabled && shcKokuinText) {
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif';
    ctx.fillText('名入れ刻印', labelX, ly + 4);
    ly += 18;
    const font = shcCurrentFont();
    await document.fonts.load(`${font.weight} 16px "${font.family}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a'; ctx.font = `${font.weight} 15px "${font.family}"`;
    const kokuinLines = shcWrapCanvasText(ctx, shcKokuinText, labelMaxWidth);
    kokuinLines.forEach((line) => {
      ctx.fillText(line, labelX, ly + 3);
      ly += 20;
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

  return cv;
}

async function shcSaveImage() {
  showShcLoading('画像を生成中...');
  try {
    const canvas = await shcBuildSaveCanvas();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `soundhole-cover-ag-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideShcLoading();
    shcHasDownloadedImage = true;
    showShcToast('画像を保存しました');
  } catch (e) {
    console.error(e);
    hideShcLoading();
    showShcToast('保存に失敗しました');
  }
}

// ============================================================================
// R2アップロード・オーダー処理
// ============================================================================

async function shcUploadOrderImage(canvas) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const orderId = `SHCAG-${Date.now()}`;
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  try {
    const res = await fetch(SHC_WORKER_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    if (!data.success && !data.url && !data.imageUrl) throw new Error(data.error || 'Upload failed');
    return { imageUrl: data.imageUrl || data.url, orderId };
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

async function shcGoOrder() {
  if (shcKokuinEnabled && (!shcKokuinValid || !shcKokuinText)) {
    showShcToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!shcHasDownloadedImage) await shcSaveImage();
  showShcLoading('画像をアップロード中...');
  try {
    const canvas = await shcBuildSaveCanvas();
    const uploadResult = await shcUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    shcLastUploadedImage = uploadResult;
    hideShcLoading();
    showShcConfirmModal(uploadResult);
  } catch (error) {
    console.error(error);
    hideShcLoading();
    showShcToast('エラーが発生しました: ' + error.message);
  }
}

function showShcConfirmModal(uploadResult) {
  const modal = document.getElementById('shc-confirm-modal');
  const modalImage = document.getElementById('shc-modal-image');
  const modalInfo = document.getElementById('shc-modal-info');
  if (!modal || !modalImage || !modalInfo) return;
  modalImage.src = uploadResult.imageUrl;

  const price = SHC_PRICE_BASE + (shcKokuinEnabled ? SHC_PRICE_KOKUIN_ADD : 0);
  const kokuinLine = shcKokuinEnabled && shcKokuinText
    ? `<p><strong>刻印:</strong> ${shcKokuinText}（フォント${shcFontId}：${shcCurrentFont().family}）</p>`
    : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    <p style="margin-top:12px;"><strong>仕様:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">
      表面の色: ${shcColor.name}<br>
      裏面: ${SHC_BACK_COLOR.name}（固定）<br>
      装着予定の楽器: ${shcHandedness === 'left' ? '左利き用' : '右利き用'}<br>
      サウンドホール適応サイズ: ${shcDiameter}mm
    </div>
    ${kokuinLine}
  `;
  modal.classList.add('show');
}

function closeShcModal() {
  const modal = document.getElementById('shc-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function shcProceedToCart() {
  if (!shcLastUploadedImage) {
    showShcToast('画像情報が見つかりません');
    return;
  }
  closeShcModal();
  showShcLoading('カートに追加中...');
  try {
    const variantId = shcKokuinEnabled ? SHC_VARIANT_MAP.eng : SHC_VARIANT_MAP.noeng;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${SHC_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display = 'none';

    [['id', variantId], ['quantity', '1']].forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
    });

    const props = {
      'Order ID': shcLastUploadedImage.orderId,
      '表面の色': shcColor.name,
      '裏面': `${SHC_BACK_COLOR.name}（固定）`,
      '装着予定の楽器': shcHandedness === 'left' ? '左利き用' : '右利き用',
      'サウンドホール適応サイズ': `${shcDiameter}mm`,
      'Image URL': shcLastUploadedImage.imageUrl,
    };
    if (shcKokuinEnabled && shcKokuinText) {
      props['刻印文字'] = shcKokuinText;
      props['刻印フォント'] = `フォント${shcFontId}：${shcCurrentFont().family}`;
    }
    Object.entries(props).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = `properties[${k}]`; i.value = v; form.appendChild(i);
    });

    document.body.appendChild(form);
    hideShcLoading();
    showShcToast('カートに追加します...');
    setTimeout(() => form.submit(), 500);
  } catch (error) {
    console.error(error);
    hideShcLoading();
    showShcToast('カート追加に失敗しました: ' + error.message);
  }
}


// Auto-generated from soundhole_cover_ag_color_order.svg
const SHC_SVG_INNER = `
  <!-- Generator: Adobe Illustrator 30.6.0, SVG Export Plug-In . SVG Version: 2.1.4 Build 109)  -->
  <defs>
    <style>
      .st0 {
        fill: #c3bb00;
      }

      .st1 {
        isolation: isolate;
      }

      .st2 {
        fill: #303030;
      }

      .st3 {
        fill: #494949;
      }

      .st4 {
        fill: #4c4c4c;
      }
    </style>
  </defs>
  <g id="guitar-image-left">
    <g id="leather">
      <path class="st0" d="M129.57,586.43c4.37,12.93,11.79,21.53,16.38,26.08-.04-.28-.07-.55-.11-.83.04.03.07.06.11.08v.74s8.91,7.2,8.91,7.2c1.59.98,3.19,1.96,4.78,2.93-.02-.19-.04-.38-.06-.57.02.01.05.03.07.04v.54s3.4,1.62,3.4,1.62c3.69,1.31,7.37,2.62,11.06,3.92-.04-.18-.08-.37-.12-.55.04.01.09.02.13.03v.52s2.63.63,2.63.63l8.88.99c.38.06.77.11,1.17.13l.17.02h0s.02-.01.03-.01h-.03s.1,0,.15,0c.09,0,.17,0,.26,0,.55,0,1.08-.05,1.59-.12.05,0,.1,0,.16-.01v.06s1.61-.19,1.61-.19c1.13-.11,2.33-.25,3.57-.43l4.98-.59,2.22-.63v-.16c.82-.2,1.65-.42,2.48-.66v.29c4.28-1.24,8.26-2.82,12.42-4.97v-.32c3.27-1.75,6.53-3.88,9.67-6.5,2.24-1.87,4.21-3.82,5.95-5.77l4.54-5.55c3.55-4.33,5.83-9.27,7.95-14.44,5.66-13.79,6.57-29.78,2.63-44.23-1.21-4.46-2.64-8.71-4.69-12.86l-1.22-2.48c-2.05-4.16-4.36-8.13-7.51-11.54l-3.95-4.26-7.95-.29c-.7-.03-1.61-.52-2.52-1-.34-.37-.82-.69-1.41-.95-.46-.32-1.07-.73-1.84-1.21v-.04c-3.71-2.29-7.4-4.01-11.61-5.55v.16c-.81-.27-1.64-.53-2.5-.77v-.16c-4.01-1.01-7.61-1.64-11.63-1.97v.27c-.68-.03-1.37-.04-2.07-.04l.02-.3c-4.41.17-8.09.63-12.18,1.69v.18c-.34.09-.68.18-1.03.28v-.09c-4.72,1.39-8.76,3.07-12.95,5.55v.14c-.28.16-.56.33-.84.5v-.17s-1.76,1.29-1.76,1.29c-1.9,1.24-3.81,2.63-5.73,4.19-1.41,1.03-2.72,1.93-4.58,2.09-.55-.25-1.15-.39-1.79-.39-.55,0-1.07.11-1.56.3h-1.77c-.49,0-1.53.46-1.85.88-2.72,3.56-5.61,7.54-7.55,11.7l-2.27,4.88c-2.16,4.64-3.55,9.31-4.66,14.3-1.12,5.02-3.92,19.43,1.81,36.37Z"/>
      <path class="st0" d="M159.87,613.15s.07,0,.11,0h0c-.05,0-.08,0-.11,0Z"/>
    </g>
    <g id="kokuin">
      <path d="M171.51,617.82l.71.26-.1,6.03-.62-.23.05-1.95-1.95-.71-1.23,1.51-.65-.24,3.8-4.67ZM171.58,621.42l.03-1.81c.02-.37.04-.75.08-1.1h-.02c-.19.28-.41.58-.66.91l-1.13,1.38,1.7.62Z"/>
      <path d="M166.94,615.89l.68.32-.62,6-.6-.28.21-1.94-1.88-.88-1.36,1.4-.62-.29,4.19-4.33ZM166.7,619.49l.18-1.8c.05-.37.1-.74.18-1.09h-.02c-.21.26-.46.54-.73.84l-1.25,1.28,1.64.76Z"/>
      <path d="M162.59,613.58l.65.38-1.16,5.92-.57-.33.39-1.91-1.79-1.04-1.48,1.28-.59-.35,4.56-3.94ZM162.02,617.13l.35-1.78c.08-.37.17-.73.28-1.07h-.02c-.24.24-.5.5-.81.77l-1.36,1.17,1.56.91Z"/>
      <path d="M158.52,610.91l.61.44-1.75,5.77-.54-.39.58-1.86-1.68-1.22-1.61,1.12-.56-.4,4.94-3.46ZM157.59,614.39l.52-1.74c.12-.35.25-.71.38-1.03h-.02c-.26.21-.55.44-.88.69l-1.47,1.02,1.46,1.06Z"/>
      <path d="M154.6,607.82l.57.49-2.21,5.61-.5-.43.73-1.81-1.57-1.35-1.69.98-.52-.45,5.21-3.04ZM153.4,611.22l.66-1.69c.15-.34.3-.69.47-1l-.02-.02c-.28.21-.59.41-.94.62l-1.54.9,1.37,1.18Z"/>
      <path d="M151.05,604.42l.52.54-2.74,5.37-.46-.48.9-1.73-1.44-1.49-1.78.82-.48-.5,5.47-2.54ZM149.54,607.68l.82-1.62c.18-.33.37-.66.56-.95l-.02-.02c-.3.18-.63.35-.99.53l-1.63.75,1.25,1.3Z"/>
      <path d="M147.82,600.69l.47.59-3.21,5.1-.42-.52,1.05-1.64-1.29-1.62-1.84.65-.43-.54,5.67-2.02ZM146.01,603.8l.96-1.53c.21-.31.42-.62.64-.9v-.02c-.33.15-.67.29-1.05.44l-1.68.6,1.13,1.41Z"/>
      <path d="M144.94,596.67l.42.63-3.66,4.79-.37-.55,1.19-1.54-1.14-1.73-1.89.49-.38-.57,5.83-1.51ZM142.86,599.61l1.1-1.44c.24-.29.48-.58.72-.83v-.02c-.34.12-.69.23-1.08.34l-1.73.45,1,1.5Z"/>
      <path d="M142.4,592.4l.36.66-4.05,4.46-.32-.58,1.32-1.43-1-1.82-1.93.32-.33-.6,5.95-1ZM140.08,595.15l1.22-1.34c.26-.27.52-.54.79-.77v-.02c-.34.09-.71.18-1.11.25l-1.76.3.87,1.59Z"/>
      <path d="M140.24,587.97l.31.69-4.41,4.11-.27-.61,1.43-1.32-.84-1.89-1.95.17-.28-.63,6.01-.51ZM137.7,590.52l1.32-1.24c.28-.25.57-.49.85-.7v-.02c-.35.07-.72.12-1.13.16l-1.78.15.74,1.65Z"/>
      <path d="M138.44,583.34l.25.71-4.71,3.76-.22-.63,1.53-1.21-.69-1.95h-1.96s-.23-.64-.23-.64l6.03-.05ZM135.7,585.69l1.42-1.13c.3-.22.6-.45.9-.64v-.02c-.35.04-.72.06-1.13.08h-1.79s.6,1.71.6,1.71Z"/>
      <path d="M136.98,578.58l.2.73-4.99,3.38-.17-.64,1.62-1.08-.54-2-1.95-.14-.18-.67,6.01.43ZM134.08,580.71l1.5-1.02c.32-.2.64-.4.95-.56v-.02c-.35.01-.72,0-1.13-.01l-1.78-.13.47,1.74Z"/>
    </g>
    <g id="guitar-image">
      <rect class="st4" x="183.43" y="509.57" width=".92" height="3.09" transform="translate(682.21 294.96) rotate(86.34)"/>
      <rect class="st4" x="179.37" y="510.27" width=".91" height="3.03" transform="translate(651.46 243.8) rotate(79.76)"/>
      <rect class="st4" x="179.27" y="615.3" width="2.96" height=".82" transform="translate(125.04 -23.56) rotate(11.38)"/>
      <path class="st4" d="M185.52,616.73c.16.02.78-.58.63-.61l-.79-.16-2.1-.3.02.85,2.23.22Z"/>
      <rect class="st4" x="175.49" y="614.49" width="2.74" height=".84" transform="translate(169.87 -24.89) rotate(15.42)"/>
      <rect class="st4" x="171.36" y="512.3" width=".95" height="3.26" transform="translate(570.63 147.03) rotate(65.87)"/>
      <rect class="st4" x="160.99" y="608.18" width="3.05" height=".85" transform="translate(383.77 18.81) rotate(35.51)"/>
      <rect class="st4" x="164.38" y="610.14" width="2.96" height=".88" transform="translate(307.1 -6.16) rotate(28.1)"/>
      <rect class="st4" x="167.8" y="611.87" width="3.09" height=".87" transform="translate(278.78 -13.49) rotate(25.38)"/>
      <path class="st4" d="M163.02,517.97l1.27.36,2.01-1.63c-.5-.05-1.04-.09-1.22.02l-2.07,1.25Z"/>
      <rect class="st4" x="167.6" y="514.18" width=".94" height="2.89" transform="translate(553.49 134.09) rotate(63.34)"/>
      <path class="st4" d="M142.11,582.88l1.33,2.43-.59.51c-.09.08-.3-.4-.35-.51l-1.08-2.1c.3-.03.53-.15.69-.33Z"/>
      <path class="st4" d="M140.29,576.84c-.12,0-.22.02-.32.05-.02-.16-.05-.32-.1-.49l-.41-1.44c-.04-.15,0-.55.02-.72.02-.16.92.08.95.24.18.92.27,1.72.31,2.45-.13-.06-.29-.09-.46-.09Z"/>
      <path class="st4" d="M140.66,579.08c.21,0,.38-.05.53-.13.03.78.08,1.44.31,2.05-.25.03-.45.14-.59.29-.33-.9-.45-1.61-.49-2.23.08.01.16.02.24.02Z"/>
      <rect class="st4" x="139.24" y="554.79" width=".84" height="2.95" transform="translate(81.88 -14.35) rotate(8.31)"/>
      <rect class="st4" x="143.68" y="539.57" width=".88" height="3.12" transform="translate(246.82 -9.37) rotate(25.48)"/>
      <rect class="st4" x="145.42" y="536.11" width=".86" height="2.84" transform="translate(296.85 1.42) rotate(30.91)"/>
      <rect class="st4" x="140.96" y="546.99" width=".85" height="2.89" transform="translate(159.61 -17.64) rotate(16.3)"/>
      <rect class="st4" x="139.94" y="550.77" width=".84" height="3" transform="translate(114.48 -16.97) rotate(11.66)"/>
      <rect class="st4" x="138.86" y="558.58" width=".79" height="3.02" transform="translate(42.78 -8.93) rotate(4.34)"/>
      <rect class="st4" x="138.16" y="571.55" width="2.92" height=".8" transform="translate(687.71 356.97) rotate(82.3)"/>
      <rect class="st4" x="142.17" y="543.21" width=".87" height="2.95" transform="translate(200.94 -15.33) rotate(20.62)"/>
      <rect class="st4" x="137.71" y="567.59" width="3" height=".76" transform="translate(696.71 391.41) rotate(86.2)"/>
      <rect class="st4" x="138.73" y="562.63" width=".75" height="2.98"/>
      <rect class="st4" x="142.81" y="587.49" width="2.87" height=".84" transform="translate(604.34 194.52) rotate(63.25)"/>
      <rect class="st4" x="154.53" y="603.12" width="2.95" height=".81" transform="translate(425.43 41.4) rotate(40.1)"/>
      <rect class="st4" x="152" y="526.36" width=".82" height="2.99" transform="translate(372.04 24.25) rotate(39.67)"/>
      <rect class="st4" x="149.49" y="529.41" width=".87" height="3.02" transform="translate(351.55 17.4) rotate(37.21)"/>
      <rect class="st4" x="151.63" y="600.35" width="2.99" height=".85" transform="translate(501.09 87.65) rotate(48.44)"/>
      <rect class="st4" x="149.16" y="597.37" width="2.9" height=".86" transform="translate(521.78 105.59) rotate(51.16)"/>
      <rect class="st4" x="157.66" y="520.73" width=".88" height="2.82" transform="translate(450.2 61.37) rotate(49.22)"/>
      <rect class="st4" x="154.72" y="523.42" width=".82" height="3.01" transform="translate(415.45 43.42) rotate(44.86)"/>
      <rect class="st4" x="146.71" y="594.24" width="2.99" height=".8" transform="translate(562.13 142.73) rotate(56.48)"/>
      <rect class="st4" x="223.22" y="599.12" width=".86" height="2.94" transform="translate(472.64 10.06) rotate(43.29)"/>
      <rect class="st4" x="220.09" y="524.91" width="3.23" height=".86" transform="translate(424.11 -7.73) rotate(43.67)"/>
      <rect class="st4" x="231.77" y="542.42" width="3.04" height=".87" transform="translate(640.55 114.77) rotate(66.83)"/>
      <rect class="st4" x="225.51" y="531.32" width="3.24" height=".87" transform="translate(532.89 40.98) rotate(55.05)"/>
      <path class="st4" d="M225.05,529.75l.92-.31-2.3-2.51c-.08.44-.02,1.06.14,1.27l1.24,1.55Z"/>
      <rect class="st4" x="235.12" y="554.61" width="3.2" height=".85" transform="translate(744.75 229.45) rotate(80.44)"/>
      <rect class="st4" x="227.88" y="534.87" width="3.15" height=".9" transform="translate(583.12 72.57) rotate(60.59)"/>
      <path class="st4" d="M232.06,540.67c.12-.12.29-.87.17-1.11l-1.07-2.04-.69.49,1.6,2.65Z"/>
      <rect class="st4" x="233.11" y="546.36" width="3.2" height=".87" transform="translate(680.15 152.27) rotate(71.7)"/>
      <rect class="st4" x="220.5" y="601.73" width=".87" height="3.23" transform="translate(533.62 42.04) rotate(49.23)"/>
      <path class="st4" d="M227.9,595.77l1.4-1.89c.07-.09.33-.49.34-.47s-.25-.33-.32-.42c-.21-.29-2.11,1.61-1.42,2.78Z"/>
      <rect class="st4" x="234.73" y="578.31" width=".88" height="3.07" transform="translate(210.5 -45.39) rotate(19.82)"/>
      <rect class="st4" x="234.26" y="550.45" width="3.22" height=".81" transform="translate(718.18 195.27) rotate(76.78)"/>
      <rect class="st4" x="236.97" y="566.02" width=".77" height="3.3" transform="translate(47.12 -17.48) rotate(4.68)"/>
      <rect class="st4" x="230.15" y="589.36" width=".88" height="3.03" transform="translate(317.87 -37.36) rotate(29.23)"/>
      <rect class="st4" x="236.51" y="570.17" width=".78" height="3.14" transform="translate(90.07 -29.47) rotate(8.78)"/>
      <rect class="st4" x="235.75" y="574.31" width=".82" height="3.12" transform="translate(129.53 -37.34) rotate(12.43)"/>
      <rect class="st4" x="233.47" y="582.07" width=".87" height="3.14" transform="translate(231.16 -45.12) rotate(21.59)"/>
      <rect class="st4" x="237.18" y="561.89" width=".75" height="2.98"/>
      <rect class="st4" x="231.89" y="585.92" width=".89" height="2.98" transform="translate(270.88 -43.1) rotate(25.08)"/>
      <rect class="st4" x="236.8" y="557.78" width=".75" height="2.8"/>
      <rect class="st4" x="225.77" y="596.05" width=".82" height="2.96" transform="translate(391.36 -19.65) rotate(35.72)"/>
      <rect class="st4" x="206.62" y="515.16" width="3.22" height=".91" transform="translate(253.01 -38.65) rotate(26.61)"/>
      <rect class="st4" x="210.82" y="609" width=".88" height="3.02" transform="translate(651.46 137.67) rotate(62.04)"/>
      <rect class="st4" x="207.35" y="610.81" width=".9" height="2.86" transform="translate(694.51 186.66) rotate(67.58)"/>
      <rect class="st4" x="210.4" y="517.23" width="3.12" height=".85" transform="translate(308.29 -33.36) rotate(32.18)"/>
      <rect class="st4" x="214.27" y="606.9" width=".84" height="2.98" transform="translate(595.23 87.41) rotate(55.58)"/>
      <rect class="st4" x="198.84" y="512.21" width="2.88" height=".83" transform="translate(147.38 -35.19) rotate(15.82)"/>
      <path class="st4" d="M191.18,616.68l2.02-.04c.2,0,.59-.42.94-.86l-3.02.11c0-.06.05.66.06.79Z"/>
      <path class="st4" d="M0,729.33v7.46c.1.14.25-.25.28-.38l.16-.73.11-.53.13-.57.38-1.55.17-.69.13-.51.16-.63.13-.53.15-.59.16-.65,2.41-8.35.21-.61,1.92-5.95.18-.5,1.39-3.83.22-.6,3.53-9,.38-.86c4.53-10.35,9.63-20.26,15.38-30.04l1.55-2.64,5.51-9.01,4.99-7.77,13.14-20.74.51-.9.29-.53.26-.48.8-1.48.49-.92c5.33-10.01,7.4-21.27,6.39-32.72l-1.97-12.58-1.46-6.06-1.76-6.4-6.81-22.69-6.33-23.12-3.1-16.94c-1.04-7.82-1.25-15.41-.86-23.4.59-12.23,3.39-23.82,8.2-34.98l.35-.81.8-1.83,2.48-4.96c3.95-7.9,9.12-14.75,15.36-21.19,7.13-7.36,15.14-13.15,23.93-18.2l1.15-.66,5.8-2.86,2.34-1.07,1.2-.53,12.56-4.31,10.48-2.54c8.08-1.59,15.97-2.63,24.2-3.39.08-.01,1.07.36.93.46-.29.19-1.01.51-1.33.53l-1.06.09-2.88.24-1.63.14-1.5.12-.85.17-2.72.31-1.97.25-.91.2-.99.1-.73.07-.63.06-.52.17-.71.11-1.47.22-.74.11-1.5.29-.75.15-1.1.22-.78.16-.65.13-.84.17-.76.15-1.7.39-.91.2-.77.17-1.1.25-.83.19-.93.34-.84.21-.86.22-.63.11-3.72,1.23-.5.16-.66.22-1.1.36-.51.17-1.92.74-1.06.41-.84.21-.76.42-.52.16-.58.18-.54.27-.96.48-.48.22-.68.19-.95.45-.52.25-.49.25-3.74,1.89-5.53,3.06-.9.54c-13.53,8.2-24.72,19.22-32.71,32.91l-1.39,2.39-.5.94-.5,1.01-2.14,4.26-.48.99-.97,2.39-.44,1.08-.21.51-.3.75-.25.63-.39.99-.19.51-.22.59-.16.49-.21.64-.29.88-.44,1.33-.18.52-.37,1.09-.23.67-.22.85-.22.85-.2.67-.42,1.45-.15.52-.13.61-.22,1.07-.4,1.91-.15.74-.2,1.06-.26,1.61-.17,1.07-.14.77-.2.86-.05.98-.04.73-.04.76c0,.07-.19.32-.31.5l-.02,2.49v.76c0,.07-.22.29-.38.47v18.92c.13.37.34,1.12.36,1.43l.14,2.64.22,1.48.15,1.76.24.86v.75s.03.75.03.75l.19.85.1.64.12.73.45,2.45.38,2.05.27,1.47.16.87.22.98.25.51.15,1.61.22.51.12.79.18.82.36,1.49.3,1.25.22.86.22.86.16.64.22.88.37,1.48.21.65.4,1.47.45,1.67.44,1.46.43,1.31.2,1.03.26.86.33,1.09.28.92.41,1.37.2.74.45,1.67.44,1.45.43,1.31.21,1.01.3.87.25.73.44,1.52.31,1.08.19.66.3.89.45,1.33.28.89.44,1.51.39,1.33.18.56.26.85.44,1.5.39,1.31.21,1.01.32.87.19.52.38,1.34.22.77.38,1.34.25.88.31,1.09.26.9.17.62.17.64.18.84.13.63.26.44.16.69.34,1.46.2.55.3,1.42.16.77.13.65.17.85.29,1.47.33,1.64.23,1.36.15.88.36,2.26.29,2.66c.05.16.25.83.25,1v4.41s0,7.69,0,7.69l-.21,1.03-.29,2.12-.24,1.45-.25,1.47-.14.83-.2.82-.4,1.45-.4,1.45-.91,2.87-1.36,3.45-.33.84-.57,1.35-8.5,14.94-11.11,17.25-15.72,26.76c-4.12,7.75-7.71,15.33-10.8,23.49l-.42,1.11-.52,1.4-6.44,19.95-.94,3.56-1.07,4.19-.32,1.24.62.35c3.26-14.05,7.75-27.72,13.63-41l.46-1.03.26-.57.47-1.03c4.3-9.46,9.33-18.36,14.69-27.32l3.83-6.39.55-.84,1.93-2.95,9.81-15.18,9.38-15.63.47-1,1.15-2.62.43-.99.2-.61.83-2.56.33-1.02.38-1.15.37-1.12.25-.86.18-.66.29-1.27.33-1.46.19-.86.29-2.02.27-2.31c.02-.17.21-.73.28-.91l.05-11.07-.13-.76-.24-1.11-.05-1.87-.1-.77-.18-1.11-.12-.72-.18-1.07-.3-1.8-.25-1.23-.22-1.09-.33-1.65-.16-.64-.22-.85-.31-1.25-.22-.87-.22-.87-.36-1.48-.16-.63-.32-1.07-.34-1.13-.33-1.27-.28-1.25-.29-.86-.28-.74-.26-.87-.28-1.04-.31-1.13-.29-1.07-.17-.61-.17-.5-.37-1.1-.3-.9-.27-1.24-.3-.88-.45-1.33-.17-.51-.22-.63-.33-1.27-.29-1.13-.3-.67-.31-1.13-.22-.78-.35-1.16-.33-1.11-.45-1.49-.34-1.13-.33-1.12-.43-1.49-.32-1.12-.31-1.09-.58-2-.25-1.04-.37-1.05-.17-.49-.48-1.76-.24-.86-.15-.63-.2-.82-.25-.67-.43-1.71-.23-.89-.22-.88-.53-2.1-.16-.64-.21-.85-.21-.86-.16-.64-.21-.85-.15-.63-.15-.62-.1-.51-.15-.72-.22-1.09-.16-.78-.22-1.08-.38-1.9-.28-1.41-.15-.83-.14-.74-.21-.54-.18-2.09-.25-1.11-.03-.75-.03-.75c0-.06-.18-.35-.27-.52l-.16-2.09-.26-1.14-.06-2.22-.31-1.53-.09-5.33-.33-1.14.06-7.77.32-1.12.06-5.04.3-1.2.11-1.82.33-2.26.18-1.26.29-2.1.21-1.11.16-.8.22-1.09.15-.74.39-1.7.23-.91.28-1.09.21-.82.28-1.07.48-1.77.33-1.22.34-1.08.96-2.77.38-.97.35-.9.2-.63.3-.77.51-1.31.26-.55.46-.97.21-.43.24-.8,1.89-3.83.5-1.02.39-.78c3.94-7.89,9.02-15.02,15.13-21.38l6.74-6.37c5.84-4.96,12.01-9.32,18.89-12.76l1.03-.52,1.21-.6.54-.27,1.17-.58,1.04-.52.74-.37.51-.19.85-.31.51-.21.49-.27.49-.27.62-.17.5-.21.53-.25.49-.17.58-.2.6-.31,3.54-1.18,4.97-1.66.76-.17,1.32-.38,1.47-.39,1.5-.38,1.48-.35,1.89-.43.89-.2.66-.15.84-.17.77-.15,1.48-.29,1.04-.2,1.18-.21.86-.15,1.82-.28,1.45-.22.73-.11.51-.22,2.73-.15c.16-.07.7-.27.86-.27l1.11-.02h.77c.07-.01.34-.2.51-.31l3.05-.13c.17-.05.8-.24.97-.25l2.59-.11,2.23-.25c.24-.03.33.75.32,1l-.04,1.01-.71.15c-14.22,1.08-33.72,4.44-46.28,10l-2.91,1.29c-6.37,2.82-12.42,6.02-17.87,10.4l-7.86,6.32-7.45,7.45c-3.89,4.37-7.08,8.84-10.04,13.88-7.93,13.48-12.38,28.45-13.27,44.15-.72,12.77.54,25.24,3.34,37.64l.21.91.85,3.69,1.67,6.41,3.57,12.53,1.81,6.06,2.75,9.09,3.99,13.65c4.92,16.82,6.68,35.8-.93,51.83l-2.15,4.54-9.71,15.99-4.84,7.48-5.66,8.88-3.96,6.49-7.58,12.91-2.86,5.34-4.11,8.21c-6.46,14.31-11.48,28.93-15.11,44.22.4-.1.85-.61.9-.9l.19-1.04c2.78-10.99,6.26-21.6,10.4-32.13l.51-1.3.23-.58.33-.81.26-.63.23-.57,1.31-2.96,3.09-6.6,1.99-3.94,2.59-4.88.39-.69,4.13-7.1,4.17-7.02,5.54-8.97,5.7-8.86,4.69-7.24,3.03-4.83c7.34-11.71,12.06-22.59,12.09-36.85.01-5.85-.13-11.49-1.59-17.16l-4.61-17.85-4.29-14.25-8-28.64c-2.5-10.36-4.09-20.65-4.05-31.32l.02-4.56c.03-10.31,1.84-20.33,5.06-30.04l.34-1.01.22-.61c1.8-5.08,3.96-9.73,6.55-14.39,4.32-7.79,9.55-14.69,16.04-20.86,13.56-12.91,30.1-21.47,48.25-25.67,5.44-1.26,10.69-2.41,16.19-3.05l12.62-1.47.69.53-.76.34c-7.09.53-13.88,1.49-20.83,2.77l-7.39,1.58c-6.33,1.35-12.44,3.13-18.34,5.87l-5.35,2.49c-9.07,4.62-17.4,10.24-24.76,17.29l-6.49,6.99-6.25,8.65-2.39,3.97-2.98,5.64c-6.6,12.49-9.69,28.89-9.66,43.27.03,16.29,2.67,30.03,7.2,45.46l5.4,18.38,2.99,10.02,3.18,11.13c4.04,14.15,5.51,29.88,1.07,44.04-1.35,4.33-2.92,8.41-5.29,12.29l-10.03,16.42-8.77,13.61-4.66,7.64-2.92,4.92-4.01,6.81-1.62,2.88-7.57,15.16-1,2.33-6.94,18.48-5.17,17.54-.57,2.2.87.04.87-3.26,6.19-20.27,7.74-19.21,10.45-19.73,15.96-25.76,5.61-8.62,6.87-11.71,2.18-4.13.33.18c-2.04,7.82-3.6,15.46-4.41,23.47-1.8,17.84,4.12,34.15,16.78,46.49,11.45,11.16,26.92,17.72,43.12,17.06,6.76-.28,13.31-1.39,19.29-4.34l6.12-3.01-.08,8.96-.34.47-.02,13.7c-.09.12-.37.8-.36,1.03l.02,7.98.13.85c.02.16.6-.3.62-.37l-.04-10.54.36-1.23.06-13.16c.08-.13.35-.8.35-.96l-.02-4.35.02-2.59c0-.14.5-.5.65-.6l4.94-3.55c3.12-2.25,5.6-5.01,8.19-7.86l.34-.24v2.2s0,4.21,0,4.21c0,.16-.29.81-.33.94v16.68s-.38.46-.38.46v16.07s-.36.54-.36.54l-.02,3.84c0,.16.58.67.6.51l.14-.84.02-.67v-.78s0-.83,0-.83v-4.27c0-.07.28-.48.37-.6v-17.06s.37-.47.37-.47v-15.92s.14-.86.14-.86l.09-4.09c9.21-11.84,14.41-25.7,14.36-40.91l-.9-10.06,1.11.28c.23.06.24.91.24,1.17l-.23,14.21-.58,34.26-.24,15.58-.48,31.72h1.01s.53-31.84.53-31.84l.41-26.85.34-22.5.25-15.45c4.35.85,8.58,1.31,12.93,1.6l.08,1.9.03,10.1-.38.46v37.42s-.38.9-.38.9v37.98s-.38.57-.38.57l.04,4.83c0,.16.54.77.67.89l.06-8.29c0-.1.29-.63.35-.72v-38.16s.38-.9.38-.9v-39.84s.36-.52.36-.52l-.03-4.36v-3.75s.07-23.71.07-23.71c.04-.3.09-.78.09-.97l-.08-2.38.33-.92v-37.88s.38-.89.38-.89v-32.68s.37-.52.37-.52v-40.22s.36-.52.36-.52v-38.16s.38-.9.38-.9v-35.01s.36-.51.36-.51v-37.42s.38-.89.38-.89v-31.68s-.38,0-.38,0l-.2,1.38-2.04.04-6.71.14-2.53.05-.09-1.62h-.75s-.22,1.77-.22,1.77l-2.02.03-7.45.13-2.32.04.07-1.96h-.77s.08,2.04.08,2.04l-2.28.12-9.43.15.12-1.94h11.12s.09-.37.09-.37h-14.95s-.29,4.48-.29,4.48l-.68,21.24-8.64.93c-10.37,1.12-20.42,3.09-30.4,6.04-20.42,6.04-38.46,17.8-51.71,34.78-3.09,3.96-6,7.62-8.15,12.04l-6.34,13.02c-4.72,11.54-7.14,23.57-7.56,36.09-.2,6.01-.16,11.68.79,17.56l3.02,18.67c2.34,10.7,5.21,20.89,8.4,31.31l3.98,13.02c2.2,7.19,4.15,14.21,5.57,21.61,1.24,6.49,1.47,12.85.7,19.43-1.23,10.48-6.44,20.88-11.99,29.83l-8.13,13.11-4.91,7.81-14.23,24.5-5.47,10.92-2.24,4.88c-3.87,8.45-6.94,17.02-9.52,25.91l-1.77,6.1L0,729.33ZM159.38,616.1c.17.34.17.77,0,1.11,0,.12-.01.23-.04.34l-.07,4.61-4.15-2.46-8.91-7.2v-6.42c-.02-.09.26-.59.33-.72l.05-11.32.23-1.33v-.98s.06-3.75.06-3.75l.1-9.95.35-.45-.03-12.74.37-.84.02-12.21.35-.46.06-14.46.33-2.91.23-.62-.24-.73.05-8.49.35-1.18-.07-4.55c2.42.04,3.92-1.11,5.66-2.38l7.14-5.22v3.05s0,4.72,0,4.72c-.23.41-1.13,1.21-1.58,1.61l.3.56,1.19-.6.06,5.78c0,.21-.29.89-.38,1.01l-.02,16.31-.37.47v16.69s-.37.47-.37.47v17.31s-.38.48-.38.48l-.02,17.79c-.08.12-.37.8-.37,1.03l.02,8.45-1.66-.98c-.01.34,0,.87.13.98l1.58,1.37-.15,6.32c.08.31.04.65-.11.92.04.23.02.47-.06.68.11.27.11.59.02.87ZM173.21,636.92l-3.03-.93-1.52-.39-5.4-1.99-2.18-.9-1.01-.43c-.2-.08-.51-.85-.49-.92l1.04.4,3.2,1.24,5.2,1.92,1.39.4,2.68.74.11.87ZM173.17,635.3l-13.52-4.85.14-2.21c4.67,2.07,8.88,3.63,13.53,4.9l-.15,2.16ZM159.5,626.87c.5,0,1-.02,1.17.07l3.15,1.54,1.09.42,3.3,1.24,1.15.43,1.46.4,1.46.35c.22.05.64.31,1.17.61l-1.79-.03-.88-.33-1.51-.43-1.07-.36-1.31-.49-1.31-.49-1.14-.42-1.09-.43-2.73-1.29c-.28-.13-.78-.53-1.12-.8ZM171.6,629.5l-4.23-1.47-.84-.33-1.35-.54-1.33-.52-4.16-2.05.43-.35,4.09,2.02,1.33.53,1.18.47,1.02.4,5.69,1.98c-.41.07-1.38.03-1.82-.13ZM164.02,437.82l.08-15.84,12.5.07-.08,15.84-12.5-.07ZM176.56,492.18h12.11s-.06,7.13-.06,7.13l-12.2-.12.15-7.02ZM176.96,401.81l-.23,17.27-12.37-.17.23-17.27,12.37.17ZM164.83,401.28l-.02-1.96,12.18-.15.02,1.96-12.18.15ZM152.88,383.98l-.06-2.96,5.29-.08,6.56-.17-.18,2.15-.08,13.77-.09,1.92-3.21.07-5.99.13-2.8.06.17-2.19.05-11.21c.11-.31.33-1.12.33-1.48ZM151.69,419.81l12.04-.12.02,1.96-12.04.12-.02-1.96ZM163.82,422.15l-.25,16.08-12.35-.19.25-16.08,12.35.19ZM151.72,419.1l.15-17.29,12.31.11-.15,17.29-12.31-.11ZM152.24,399.57l11.97-.36.06,2.03-11.97.36-.06-2.03ZM152.86,380.27l.05-1.81,7.07-.14,4.7-.12-.02,1.8-6.17.17-5.62.09ZM176.69,419.45l-.11,1.87-9.9.03-2.36.1.2-1.77,4.81-.04,2.94-.12,4.41-.07ZM176.36,440.35l-12.39.1-.02-1.98,12.39-.1.02,1.98ZM176.33,441.06l-.05,3.74-.18,10.92-8.29.17-2.25.05-1.92-.12.02-2.08.1-10.09.15-2.45,2.01-.11,10.42-.03ZM176.1,458.29l-3.42.04-9.11.12.03-1.83h2.35s1.49-.02,1.49-.02l8.6-.09.06,1.77ZM176,459.07l-.02,6.98-.05,4.45-.09,2.22-12.6.06.03-2.26.12-9.33.13-1.98,8.77-.13,1.84-.02,1.87.02ZM175.81,475.36l-12.7.03v-1.89s12.7-.03,12.7-.03v1.89ZM175.76,476.09l-.16,12.74h-12.69s.02-2.27.02-2.27l.08-8.6.15-1.85,12.6-.02ZM175.59,491.48l-12.81.02v-1.96s12.81-.02,12.81-.02v1.96ZM175.5,492.18l-.12,7.04-12.81-.07.08-4.77.09-2.2h12.76ZM175.34,500.65l-.06,2.55c-3.84,1.25-7.29,2.51-10.79,4.31l-2.11,1.08.16-6.4c.9-.46,2.45-1.49,3.35-1.49l9.45-.05ZM150.11,475.43v-1.92s12.43-.04,12.43-.04v1.92s-12.43.04-12.43.04ZM162.28,478.08l-.11,10.75h-2.2s-8.19,0-8.19,0l-2.12.02.18-2.28.13-8.6.1-1.82,12.39-.06-.17,1.99ZM149.13,503.07l3.06-2.42,3.42.07-6.49,4.78v-2.43ZM150.2,505.6l1.59-1.13,1.1-.79,1.5-1.08,1.15-.78,1.13-.78c.31-.21,1.28-.3,1.45-.25l-1.28.86-2.41,1.63-1.17.79-1.49,1.13-1.55,1.18c-.28.21-.96.51-1.48.69l1.46-1.47ZM149.44,499.08l.05-2.07.11-4.84h12.46s-.11,2.63-.11,2.63v4.34s-12.51-.06-12.51-.06ZM149.6,489.55l12.55-.05v1.99s-12.54.05-12.54.05v-1.99ZM162.21,501l-1.57,1.12c-4.26,2.49-7.99,5.2-11.8,8.34.04-.42.42-1.24.75-1.49l4.78-3.63,4.84-3.13,1.98-1.23,1.03.02ZM161.82,502.54l-.03,6.35-1.35.88-7.9,5.91c-1.11.83-2.4,1.22-3.72,1.2l.08-5.13c3.49-3.09,6.99-5.81,10.99-8.1l1.92-1.1ZM139.51,610.4l5.44,5.63c.15.16.33.79.37,1.18l-4-3.86-7.1-8.91-.75-1.18-.98-1.58-.55-.91-2.08-3.92-.59-1.2-1.3-2.83-.35-.84-.31-.79-.42-1.07-1.22-3.61-1.12-3.76-.29-1.1-.32-1.47-.36-1.65-.3-1.98-.19-1.26-.25-1.65-.18-3.46c0-.07-.24-.45-.33-.58l-.02-9.23.26-.92.27-3.76.23-1.61.2-1.28.31-1.98.36-1.64.33-1.51.33-1.5.69-2.59,2.59-7.84.45-1.05,1.31-2.87.55-1.29.48-.99.91-1.58.59-1.02.93-1.61.45-.77.73-1.11.74-1.12.76-1.16,1.01-1.52,3.77-4.8,7.55-7.68.39.59c-2.95,2.64-5.54,5.15-7.98,8.13l-2.53,3.09-1.07,1.42-.79,1.18-.75,1.12-.74,1.1-.39.77-.73,1.11-.42.78-.71,1.09-2.46,4.97-.54,1.32-.59,1.33-.41,1.03-1.31,3.67-.85,2.44-.25.89-.39,1.52-.38,1.5-.36,1.48-.34,1.47-.2.86-.26,2.01-.17.88-.31,1.61-.16,2.78c0,.17-.23.75-.31.92l-.04,12.58.31.47.22,3.14.25,1.59.19,1.25.31,1.62.35,1.67.35,1.46.38,1.5.32,1.11.43,1.5.42,1.28.42,1.1.49,1.31.43,1.14.53,1.34,1.17,2.49.28.94,1.67,3.15.54.89.97,1.61.46.76.73,1.13.74,1.1,4.52,6ZM136.01,603.26l-1.15-2.22.9.63.74,1.28.8,1.38c-.58-.39-1.15-.79-1.29-1.07ZM148.56,510.75l-3.1,3.06-3.73,4.07-1.52,1.85-1.49,1.86-.73,1.13-.73,1.12-.47.79-.92,1.53-.63.98-3.83,7.62-.51,1.35-.47,1.16-.46,1.07-2.06,6.35-.74,2.61-.28,1.11-.33,1.29-.3,1.61-.32,1.66-.27,1.48-.23,1.63-.25,4.1-.28,1.09.05,8.51.36,1.14-.09,3.25-.23-.18-.39-3.23-.11-11.87.33-.47.22-2.75.25-1.61.19-1.25.3-1.98.36-1.65.34-1.49.36-1.51.29-1.06.94-3.17.44-1.49.47-1.29.53-1.34.44-1.1.55-1.37.51-1.35,3.45-6.87.61-.98,1-1.53.76-1.17.75-1.12.75-1.12,1.48-1.89,1.09-1.48,7.19-7.65.45.53ZM148.33,512.19l-.09,4.63-4.39-.06,4.48-4.57ZM148.05,615.77l2.24,2.24-.37.37-2.24-2.24.37-.37ZM153.21,620.01l1.53,1.13.77.46,1.63.97,1.05.66-.97.09-.97-.66-1.13-.74-1.14-.75-1.16-.76c-.28-.18-.73-.68-1.1-1.13l1.47.73ZM159.27,626.9l-2.39-1.24-.92-.49-1.51-.97-1.19-.78-1.13-.75-1.12-.74-1.91-1.52-2.8-2.23c-.16-.13-.33-.9-.37-1.24l3.05,2.57,2.03,1.68,1.09.74,1.15.76,1.12.74,1.11.73.76.4,1.12.72.82.41c.3.15.67.64,1.07,1.22ZM155.2,625.57l3.9,2.25-.12,2.22c-4.92-2.56-8.99-5.23-13.1-8.56l.06-2.54c3.11,2.55,5.98,4.74,9.26,6.63ZM158.76,631.63c-4.56-2.29-8.4-4.76-12.37-7.69l-.18-1.08c4.04,3.01,7.91,5.54,12.5,7.97.55-.04.63.89.05.8ZM158.77,634.2l-3.3-1.67-2.93-1.66-1.17-.71-1.19-.81-4.02-2.76c-.13-.09-.27-.84-.29-1.13l4.45,3.19,1.52,1,2.85,1.64,3.97,2.12.11.78ZM145.74,609.06l-.37,2.49c-16.05-16.41-22.37-38.98-17.35-61.49,1.11-4.99,2.5-9.66,4.66-14.3l2.27-4.88c1.94-4.16,4.83-8.14,7.55-11.7.32-.41,1.36-.88,1.85-.88h3.73s-.03,10.07-.03,10.07l-.38.46.1,2.18c.03.58.03,1.93-.16,2.45l-.67,1.82.7-.08.05,5.31c0,.2-.29.87-.37,1l-.02,12.95-.35.58-.05,12.51-.33,1.05-.03,12.58c-.08.12-.36.8-.36,1l.02,7.95c-.71.04-1.18.3-.81.54.49,1.23.89,2.05.78,2.89l-.28,2.09-.15,13.42ZM145.44,613.54l-.37.37-3.92-3.92.37-.37,3.92,3.92ZM145.38,618.59l-.17,2.4-5.13-4.93c-4.94-4.75-8.8-10.3-11.86-16.42l-2.13-4.26c-5.69-12.97-7.78-27.11-5.84-41.19,1.03-7.46,2.61-14.62,5.9-21.3l2.95-6,4.49-7.46c4.2-6.05,9-11.29,14.82-15.89l.17,2.37-1.91,1.68c-18.68,16.4-27.8,42.91-24.3,67.69,1.85,13.08,7.05,24.87,15.28,35.04l7.76,8.27ZM145.19,622.88l-2.38-2.1c-3.78-3.34-7.35-6.88-10.09-11.12l-5.12-7.93-4.26-9.16-2.2-6.46-.44-1.49-.28-1.07-1.22-5.68-.23-1.43-.22-1.65-.2-2.41-.3-.99-.02-13.79c.09-.17.32-.84.33-.99l.19-2.41.25-1.63.19-1.25.3-1.62.36-1.65.35-1.48.36-1.5.35-1.48.3-1.16,1.9-5.92.79-2.17,1.1-2.55.36-.92,2.86-5.61c4.35-8.52,12.21-17.75,20.18-23.71l.36.66c-7.79,6.06-14.31,13.25-19.03,21.95l-3.49,6.43-.46,1.18-1.31,3.19-2.74,8.05-.42,1.68-.34,1.52-.42,1.88-.32,1.45-.35,2.03-.32,2.35-.23,1.65-.3,1.65v14.56s.3,1.64.3,1.64l.24,1.65.28,2.37.19.86,1.26,5.63.37,1.48.39,1.51.42,1.27.43,1.12.46,1.3.37,1.11,2.96,6.82,1.17,2.17c2.71,5.01,5.64,9.8,9.68,13.8l7.62,7.54.03.84ZM145.08,624.91l-.31.63-5.33-4.73-5.74-6.18c-3.12-3.36-5.66-7.13-7.74-11.26l-3.12-6.18-.56-1.34-.45-1.02-.91-2.47-1.99-5.83-.25-1.08-.38-1.53-.37-1.5-.32-1.27-.28-1.99-.2-.88-.28-1.22-.23-2.71c-.05-.16-.26-.8-.26-.96l-.03-2.76-.36-.5v-10.87s.31-.5.31-.5l.19-4.13.25-1.64.21-1.29.29-2.35.35-1.66.35-1.46.38-1.5.38-1.49.38-1.49.31-1.11.43-1.49.42-1.29.41-1.1.49-1.33,1.58-4.04,2.05-4.26c2.32-4.83,4.78-9.54,8.38-13.65l6.62-7.56,6.36-5.63.6.39c-7.44,6.09-13.49,12.89-18.15,20.89l-2.26,3.87-.82,1.61-1.97,4.34-1.31,2.94-.43,1.03-1.94,5.83-.42,1.49-.37,1.35-.37,1.47-.38,1.87-.33,1.63-.31,1.97-.26,1.64-.19,1.27-.26,3.07-.27.86.02,14.07c.1.14.33.49.33.56l.12,2.77.22.9.28,1.6.29,1.98.36,1.65.35,1.48.36,1.5.36,1.5.27,1.08,1.41,4.19,1.21,3.29.46,1.17,3.97,7.84c4.76,8.32,10.86,15.44,18.35,21.56ZM146.67,499.08l.16-6.91,2.14.05-.16,6.91-2.14-.05ZM146.9,489.63h2.2v1.89h-2.2v-1.89ZM146.97,488.84l.44-12.7h2.05s.08,2.57.08,2.57c0,.26-.22,1.04-.33,1.26l-.08,8.9-2.16-.03ZM147.4,473.56l2.13-.03.03,1.93-2.13.03-.03-1.93ZM147.52,472.8l.39-13.49h2.05s-.09,7.37-.09,7.37c-.07.1-.35.8-.34.98l.07,5.06-2.08.08ZM147.91,456.68h2.14s0,1.95,0,1.95h-2.14s0-1.95,0-1.95ZM148.04,455.94l.41-14.57,2.07-.02-.2,2.34-.05,10.4-.25,1.9-1.97-.05ZM148.47,438.71h2.09s0,1.94,0,1.94h-2.09s0-1.94,0-1.94ZM150.58,461.59v-2.26s10.15-.04,10.15-.04h2.11s-.16,2.41-.16,2.41l-.17,11.07h-12.29s.03-2.26.03-2.26l.1-7.79.24-1.14ZM150.6,456.66l12.3-.05v1.97s-12.3.05-12.3.05v-1.97ZM150.64,449.95c0-.16.37-1.07.37-1.06l.04-7.52,2.22.04,4.08-.07,5.85-.17.16,5.12-.41.75v8.81s-1.84.11-1.84.11h-10.41s-.06-6.01-.06-6.01ZM151.11,438.74l2.54.04,2.61-.06,7.1-.15-.06,1.89-5.56.15-6.61.07v-1.94ZM149.05,421.7l-.04-1.85,2.13-.05.04,1.85-2.13.05ZM149.7,402.25h2.01s-.27,2.3-.27,2.3l-.08,12.15-.28,2.46-1.91-.09.52-16.82ZM149.69,399.61h2.02v1.94h-2.02v-1.94ZM150.38,381.06h1.82s-.06,8.38-.06,8.38c0,.24-.25.89-.33,1.02l-.05,8.38h-1.92s.54-17.78.54-17.78ZM150.35,378.53l1.92-.06.06,1.83-1.92.06-.06-1.83ZM150.51,377.66l.63-19.19,1.77-.05v5.69c0,.21-.27.88-.35,1l-.05,10.68-.18,2.08-1.81-.21ZM153.03,357.73l-1.85.04-.04-2,1.85-.04.04,2ZM165.21,365.74c-.07.13-.33.65-.35.78l-.08,10.9-4.44.16-7.36.11-.1-4.02c0-.17.28-.83.37-.97l.04-12.54.33-1.82,8.97-.14,2.59-.07.03,7.61ZM177.31,380.53l-.29,18.26-12.27-.19.29-18.26,12.27.19ZM165.32,378.06l12-.12.02,1.94-12,.12-.02-1.94ZM177.69,357.71l-.29,16.59-.05,2.91-6.91.1-4.99.07.08-2.33.11-13.27c.12-.45.23-1.18.23-1.54v-2.24s1.95-.03,1.95-.03l7.46-.13,2.41-.12ZM178.23,377.16l.18-19.85,11.61.1-.18,19.85-11.61-.1ZM184.97,377.76l4.8-.12-.03,1.86-7.38.11-4.02.1-.05-1.76,6.67-.19ZM189.71,396.3l-.13,1.87-6.11.08-5.45.1.24-17.84,3.73-.16,7.82-.1-.05,6.76c-1.01-1.23-2.49-1.71-4.03-1.08-1.69.69-2.4,2.66-1.78,4.31.67,1.77,2.71,2.54,4.38,1.6l1.42-.79.03,1.91-.08,3.32ZM187,391.53c-1.41,0-2.55-1.14-2.55-2.55s1.14-2.55,2.55-2.55,2.55,1.14,2.55,2.55-1.14,2.55-2.55,2.55ZM189.66,400.81l-11.72.16-.03-1.97,11.72-.16.03,1.97ZM177.67,418.72l.12-17.25,11.79.08-.12,17.25-11.79-.08ZM189.36,419.34l.02,1.93-11.76.1-.02-1.93,11.76-.1ZM189.21,434.76l-.07,2.89-1.92.03-9.83.03.18-15.66,11.83-.06-.02,2.66v2.58c-.86-.73-1.94-1.34-3.02-1.31-.88.03-2.08.79-2.6,1.58-1.08,1.62-.59,3.6.66,4.63,1.41,1.16,3.35,1.02,4.87-.39l-.08,3.03ZM186.59,432.14c-1.5,0-2.71-1.21-2.71-2.71s1.21-2.71,2.71-2.71,2.71,1.21,2.71,2.71-1.21,2.71-2.71,2.71ZM189.17,440.3l-11.88.06v-1.94s11.87-.06,11.87-.06v1.94ZM189.13,455.75l-12.02-.02.02-14.8,12.02.02-.02,14.8ZM189.02,456.3v1.97s-11.97.06-11.97.06v-1.97s11.97-.06,11.97-.06ZM188.74,466.98l.03,3.49.02,2.25-11.95.02-.03-2.24.05-4.45.23-7.01,1.92-.06,10-.02.03,1.94.08,5.01-.36,1.07ZM188.84,475.36l-12.08.02v-1.93s12.07-.02,12.07-.02v1.93ZM188.82,476.02l-.1,12.96-12.12-.1.1-12.96,12.12.1ZM188.73,491.47l-12.19.03v-1.95s12.18-.03,12.18-.03v1.95ZM188.23,501.41c-4.04.05-7.77.55-11.76,1.49l-.05-2.2,12.27.03-.47.68ZM187.36,616.84l-.12,2.12v8.56s-.01,2.43-.01,2.43l-10.22-1.14-2.64-.63.06-4.35s.1.03.16.05c-.06-.2-.07-.42-.03-.63-.05-.22-.03-.44.03-.65-.07-.23-.08-.47-.02-.7-.06-.21-.06-.44,0-.66-.03-.11-.04-.22-.04-.34-.07-.2-.09-.41-.06-.62h0l.49-34.11.05-3.46.74-42.77.02-1.19.23-16.38.08-6,.03-2.66c0-.4.37-.84.94-1.48.21.1-.24-.11-.84-.41l.12-7.4c4.09-1.05,7.77-1.52,12.18-1.69l-.11,2.13-.02,3.29.09,2.3-1.59.12c-.2.01-.55.67-.34.7l.7.09,1.25.16-.16,2.29-.02,29.67-.37.89v33.8s-.37.51-.37.51v35.36s-.36,1.99-.36,1.99c-.16-.14-.03.51.15.8ZM174.3,635.57l.03-2.16,12.88,1.63-.04,2.08-12.87-1.55ZM174.54,636.41l1.6.27,1.98.32,1.65.26,1.29.21,4.45.21c.16,0,.81.22.96.29l.72.34h-5.51s-1.25-.3-1.25-.3l-2.03-.19-2.04-.34-1.84-.31c-.31.17-.28-.78.01-.75ZM174.11,632.1l1.62.07,1.67.34.86.17,1.65.32,3.04.21c.16.06.79.28.95.28h2.9c.16,0,.63.54.47.59-.16.05-.67.23-.83.2l-1.64-.3-3.73-.23-.95-.2-1.72-.22-1.66-.31-1.52-.29c-.21-.04-.61-.29-1.1-.64ZM187.01,631.65l-5.32-.2-2.54-.33-2.05-.35-1.19-.2c-.39-.07-1.09-.4-1.44-.69l1.48.14,1.93.35,2,.36,3.05.26c.16.05.8.23.99.23l3.26.09-.19.33ZM174.33,638.7l.68.26,1.63.26,1.24.25,1.31.26,2.72.13c.07,0,.39.19.64.33l4.19.02c.16,0,.7.56.54.59l-.9.17-3.49-.1-.97-.26-2.38-.16-1.67-.27-1.46-.25-1.63-.31c-.18-.03-.52-.23-.66-.32-.14-.09.05-.66.2-.6ZM173.35,622.95l-.02.54v4.51s-10.02-3.74-10.02-3.74l-3.41-1.62.08-4.1.27-3.58.05-.1c-.12-.26-.15-.57-.07-.85-.08-.29-.05-.61.08-.87-.09,0-.15.01-.19.02.02,0,.05,0,.11,0l.09-3.57.11-2.51-.11-.78.04-12.34s.28-.87.37-1.06v-16.6s.37-.58.37-.58v-15.55s.39-.85.39-.85l-.02-16.81.37-.54.05-15.98.34-1.05-.05-2.55.05-2.55.21-.91-.28-.8.21-7.75c4.19-2.48,8.23-4.16,12.95-5.55l-.09,7.44-1.15.79,1.11.37-.03,3.03-.36,22.33-.02,1.17-.34,20.86-.04,1.51-.3,20.48-.06,3.53-.48,26.57c0,.35-.93.4-1.44.24-.09.08-.51.81-.31.56l1.82.86-.27,8.44ZM170.77,638.62l-1.15-.32-1.06-.3-4.48-1.49-1.07-.44-2.16-.92c-.57-.24-1-.53-1.4-1.22l1.45.55,1.32.51,1.13.44,1.02.45,4.72,1.57,1.69.43,1.54.37c.23.06.64.35,1.15.75h-1.4s-1.31-.38-1.31-.38ZM158.46,678.2l.4-.44v-16.48s.36-.72.36-.72l.03-17.19c.09-.16.37-.89.37-1.08l-.06-5.72,11.09,3.89c3.18,16.66-2.02,34.56-12.13,48.14l-.06-10.41ZM143.6,699.87c-.01-.25.19-1.01.31-1.27l.06-12.79.36-.84-.03-12.37.38-.45v-12.83s.38-.46.38-.46v-13.71s.36-.45.36-.45l.03-12.22c.06-.18.19-.71.2-.9l.11-3.08,9.54,5.92,3.59,1.88-.04,9.53-.36.82v17.42s-.37.55-.37.55l-.02,15.6c-.08.18-.36.94-.36,1.1l.02,3.6-.04,4.82c-4.14,4.96-8.62,9.21-14.01,12.55l-.13-2.41ZM71.72,596.67c10.52-27.65,27.06-54.12,52.17-71.43l-2.69,5.72c-5.95,12.63-7.84,26.59-6.65,40.57l1.63,10.63c3.89,18.2,13.91,34.24,28.89,45.74l-.03,6.79-.34,1v12.36s-.35.57-.35.57l-.05,12.87c0,.18-.34,1.04-.35,1.05l.02,12-.38.45v12.83s-.37.46-.37.46l-.05,11.57-.17,2.87-6.38,3.28c-13.88,5.99-29.15,5.96-43.07-.07-11.72-5.08-21.51-13.55-27.97-24.64-6.13-10.51-8.19-22.61-6.71-34.73.8-6.56,1.93-12.66,3.54-18.94l2.59-10.08.76-2.61,5.97-18.26ZM148.62,390.8l-.35,11.87-.75,25.19-.58,18.83-1.73,53.17c-7.95,6.33-14.07,13.82-18.97,22.31-.22.39-.78.77-1.32.94-7.31,4.82-14.09,10.13-19.87,16.64l-7.22,8.13c-5.83,7.2-11.09,14.69-15.47,22.88l-2.87,5.37-2.21,4.43-1.88,4.12-7.05,17.93-1.35,4.04-.56,1.15.15-1.48c.87-8.44.82-16.72-1.21-24.77l-3.93-15.57-9.71-32.76-3.89-15.09c-2.35-9.12-3.41-18.34-3.42-27.82v-5.27c-.03-21.05,8.97-44.91,22.97-60.47,4.27-4.74,8.71-8.85,13.9-12.61,7.86-5.69,15.99-10.52,25.09-13.61l6.5-2.21c11.65-3.14,23.32-5.11,35.44-6.11l.29.76ZM149.03,422.41l2.03.04-.08,7.49-.33,1.23v6.79s-2.1-.04-2.1-.04l.47-15.52ZM60.71,605.52l-.33-.23.11-4.05.3-1.03v-3.57c0-.07-.25-.42-.36-.58l-.02-4.74-.33-.71-.15-2.49-.29-1.23-.21-.89-.26-2.02-.23-.84-.23-.86-.28-1.38-.35-1.5-.38-1.5-.38-1.49-.38-1.49-.38-1.5-.38-1.51-.31-1.1-.43-1.49-.38-1.34-.25-.87-1.15-3.75-.27-.86-.36-1.13-2.93-9.72-.51-1.7-.27-.88-1.36-4.37-.5-1.56-1.64-5.88-.43-1.53-.39-1.47-.39-1.49-.39-1.51-.36-1.31-.25-.89-.24-.85-.29-1.64-.22-.86-.22-.89-.43-1.73-.35-1.45-.41-1.89-.33-1.49-.36-1.64-.31-1.97-.31-1.66-.28-1.47-.23-1.23-.27-2.37-.19-.84-.27-2.02-.26-2.73c-.05-.09-.27-.49-.27-.55v-2.87c0-.07-.22-.41-.33-.6l-.12-4.11c0-.16-.27-.79-.31-.93l.04-12.57c.08-.16.31-.75.32-.93l.13-3.29.18-1.47.57-4.14.25-1.46.22-1.25.3-1.61.37-1.65.35-1.48.36-1.51.35-1.49.28-1.14,3.21-9.71.36-.82.55-1.39.55-1.36,3.15-6.42,6.37-10.81,1.1-1.56c10.01-14.19,23.88-25.32,39.5-32.48,4.6-2.11,8.99-3.85,13.85-5.25l1.16-.33,1.49-.39,1.49-.38,1.49-.38,1.49-.37,1.49-.37,1.49-.37,1.51-.37,1.43-.31,1.09-.22,1.67-.34,1.99-.31.86-.15,1.62-.28,1.97-.32,1.62-.29.86-.15,2.74-.31,1.62-.21,1.64-.21,2.05-.23.97-.19,3.39-.22,1.28-.31c.28-.04.28.89,0,.79l-1.49.3-2.93.13c-.16,0-.8.19-.96.23l-3.04.2c-.17.05-.77.2-.93.22l-2.07.2-1.63.26-1.25.19-2.37.29-.86.19-1.24.28-2,.29-.86.18-1.47.3-1.64.34-1.6.3-1.67.35-1.45.34-1.5.38-1.49.37-1.5.38-1.5.38-1.32.39c-17.63,5.2-35.21,15.69-47.83,29.69l-6.12,7.37-.63.8-.75,1.17-.73,1.14-1.44,2.28-3.49,5.87-.45.72-1.94,3.93-.52,1.29-.95,2.1-.46,1.08-.33.79-.4,1.04-1.5,4.11-1.45,4.13-.41,1.5-.36,1.33-.4,1.5-.34,1.26-.27,1.63-.18.86-.31,1.47-.35,1.65-.28,1.99-.7,4.96-.16.92-.2,4.1c0,.16-.23.75-.28.93l.03,14.8c.1.17.36.76.36.92v3.23c0,.07.22.46.28.56l.23,3.13.25,1.59.2,1.26.31,2.38.15.86.29,1.62.3,1.97.36,1.64.33,1.5.32,1.46.19.86.3,1.62.31,1.28.35,1.47.43,1.87.35,1.53.38,1.45.31,1.14.4,1.48.41,1.49.37,1.3.43,1.49,2.52,8.73.23.78,1.75,5.74.44,1.47.34,1.12,2.44,8.08.44,1.49.33,1.13.33,1.13.43,1.48.32,1.12.43,1.49.33,1.14.4,1.47.39,1.49.4,1.52.32,1.11.37,1.44.43,1.9.34,1.51.31,1.45.22,1.09.34,1.67.31,2.35.19,1.26.24,1.64.19,3.11.29,1.1.05,7.36c-.16.27-.36.57-.36.64l-.08,2.49-.03.81ZM56.99,618.86l1.18-4.05.58-2,.42-1.45.29-1.6.31-1.66.25-1.45.18-1.12.25.19-.19,2.29-.36,2.01-.33,1.48-.37,1.53-.28,1.05-1.32,4.3-.62.49Z"/>
      <rect class="st4" x="196.07" y="614.28" width=".82" height="2.92" transform="translate(767.92 313.77) rotate(79.84)"/>
      <path class="st4" d="M195.15,511.83l2.09.45c.35.08.35-.82,0-.78l-1.81-.37c-.16-.03-.68.18-.84.23s.38.43.56.47Z"/>
      <g>
        <path class="st4" d="M216.66,355.31s-.15.63-.15.8l.09,3.28.02,14.53v8.22s.04,13.41.04,13.41v7.85s.03,20.11.03,20.11l.03,11.94v7.09s.02,11.17.02,11.17l.11,6.39.09,1.59.03,8.44v8.2s.03,8.21.03,8.21v7.82s0,2.61,0,2.61l.02,4.17.04,63.63.31,5.72.03,32.73v2.34s.52.1.52.1l-.53,1.32.05,31.33v40.98s.32,5.31.32,5.31l.04,41.67v.79s0,.74,0,.74v.72s-.01,8.45-.01,8.45l-.73-.17-.02-52.57-.33-4.59-.02-40.17v-3.23s-.46.15-.46.15l-11.98,3.84-.23,5.26-.02,91.52h-.75s.1-91.16.1-91.16l.22-20.22.05-9.69v-4.56s.02-72.88.02-72.88l.38-.51-.04-21.61-.03-4.49v-4.48s.01-10.06.01-10.06v-3.37s.05-20.15.05-20.15v-37.23s.32-2.08.32-2.08v-10.97s.02-7.14.02-7.14l.03-19v-15.29s.01-1.52.01-1.52v-25.33s.74,0,.74,0l.34,1.07,4.52-.26,5.9-.1.05-.71.74.02ZM205.11,376.6h10.81s0-19.81,0-19.81h-10.81s0,19.81,0,19.81ZM205.14,377.27l.03,2.01,10.71-.16-.03-2.01-10.71.16ZM205.03,379.74l.03,18.16,10.88-.02-.03-18.16-10.88.02ZM205.03,398.58l.03,1.95,10.91-.16-.03-1.95-10.91.16ZM204.93,401.15l.05,17.19,11.01-.03-.05-17.19-11.01.03ZM204.95,419.02l.02,1.98,11.06-.1-.02-1.98-11.06.1ZM204.81,435.46l.04,1.91,11.21-.06-.13-2.23.02-11.16v-2.32s-2.25.03-2.25.03l-8.68.1.03,2.28.09,5.75c0,.18-.26.85-.42,1.18l.09,4.53ZM204.8,438.1l.02,1.95,11.25-.11-.02-1.95-11.25.11ZM216.27,453.73v-2.46c-.07-.12-.36-.64-.36-.7l.06-7.52.1-2.4-11.2.09-.12,1.83.02,11.17v1.85s11.29-.02,11.29-.02l.22-1.84ZM204.75,456.29v1.97s11.41-.06,11.41-.06v-1.97s-11.41.06-11.41.06ZM216.11,472.56l.17-2.02v-10.1s-.16-1.59-.16-1.59l-2.45.05-6.69.05h-2.23s-.01,13.65-.01,13.65l11.37-.04ZM212.89,475.29l3.27-.12-.04-1.88-11.33.08-.11,1.86,1.94.07h6.27ZM204.7,488.83h11.53s0-12.9,0-12.9l-3-.09c-.39-.01-1.1.09-1.57.22h-4.69s-2.24-.04-2.24-.04l-.03,12.8ZM204.66,489.54v1.93s11.58-.02,11.58-.02v-1.93s-11.58.02-11.58.02ZM204.62,499.42h11.67s0-7.27,0-7.27h-11.67s0,7.27,0,7.27ZM216.24,503.53c0-.47-4.01-2.45-4.69-2.48l-6.9-.26-.06,3.17,4.73,1.86,6.94,3.43-.03-5.72ZM204.29,624.89l-.05,2.61c4.29-1.24,8.27-2.82,12.42-4.97l-.02-14.4v-4.51s-.02-33.48-.02-33.48l-.3-5.7-.04-41.29v-2.14s-2.34-1.67-2.34-1.67l.64-.45,1.68.94.03-8.74c-3.71-2.29-7.4-4.01-11.61-5.55v2.65s-.05,3.36-.05,3.36l-.03,1.85,1.6,1.26h-1.59s.06,2.1.06,2.1l.06,11.07-.39.56v82.63s-.16,2.17-.16,2.17h1.43s-1.3,1.12-1.3,1.12v1.84s-.04,8.74-.04,8.74ZM208.19,628.59l8.07-3.14c.26-.1.49-1.07.38-1.17l-11.66,4.61-.99.78c.15.03,1.1-.08,1.45-.19l2.75-.88ZM203.92,631.79c.45.12,1.42.21,1.87.06l6.8-2.3,1.09-.5,1.31-.56,1.32-.56c.15-.06.57-.65.4-.65s-.54,0-.68.05l-1.78.76-1.31.55-1.32.55-.86.36-4.11,1.32-2.72.92ZM204.19,635.18c4.63-1.14,8.35-2.47,12.52-4.31v-2.26s-12.45,4.45-12.45,4.45l-.08,2.12ZM212.24,634.33l3.79-1.47.66-.33c.15-.08-.33-.74-.29-.61l-11.89,4.03c-.12.09-.21.38-.27.9l8.01-2.53ZM204.38,639.22c4.44-.62,13.36-4.37,12.34-4.45l-.72-.05-10.95,3.58c-.34-.09-.87.54-.67.92Z"/>
        <path class="st4" d="M203.61,355.29v25.32s-.34,2.02-.34,2.02l.02,13.64v7.13s-.04,13.03-.04,13.03v7.15s-.04,50.22-.04,50.22l-.31,3.79v9.33s.04,7.08.04,7.08v3.35s-.07,9.39-.07,9.39v59.55s-.38.84-.38.84v59.19s-.03,16.5-.03,16.5l.03,38.72v3.3c0,.07-.29.47-.38.58v51.4s-.75.02-.75.02v-37.7s.38-.84.38-.84v-57.58s-12.6,1.31-12.6,1.31l-.07,1.91-.02,28.95-.37.52v42.44c-.07.2-.26.82-.38.97v19.59c-.04.34-.37.66-.73.74v-18.56s.36-.5.36-.5v-39.11s.37-.79.37-.79v-33.86s.37-4.21.37-4.21v-38.33s.38-.9.38-.9v-36.77s.37-.9.37-.9v-31.83s.39-.52.39-.52v-39.84s.36-.9.36-.9v-36.77s.38-.79.38-.79v-36.87s.37-.51.37-.51v-36.03s.37-1.12.37-1.12v-22.78h.75l.03,1.39,4.08-.22,6.61-.1.09-1.07h.75ZM191.68,376.92h11.19s0-19.84,0-19.84h-11.19s0,19.84,0,19.84ZM191.77,377.63l.05,1.98,10.95-.27-.05-1.98-10.95.27ZM191.6,398.16l11.2.06.09-18.2-11.2-.06-.09,18.2ZM191.55,398.89l.03,2.01,11.07-.15-.03-2.01-11.07.15ZM191.29,418.54l11.27.03.04-17.21-11.27-.03-.04,17.21ZM191.35,419.13l.02,2,11.21-.13-.02-2-11.21.13ZM191.26,437.58l7.9-.13,3.31-.05.04-15.66h-7.08s-4.03.15-4.03.15l-.07,2.01-.07,11.56v2.12ZM198.02,440.06l2.22-.1,2.24.11v-1.83s-1.87-.13-1.87-.13l-1.84.08-7.48.14-.1,1.86,6.83-.13ZM190.9,453.72l.24,1.92,11.26-.05.08-1.85v-11.19s0-1.78,0-1.78l-1.88-.03-2.94.03-6.49.2.13,2.34-.16,5.93-.25,4.48ZM191.01,456.36v1.9s11.42-.05,11.42-.05v-1.9s-11.42.05-11.42.05ZM190.86,472.76h11.63s0-13.88,0-13.88h-11.63s0,13.88,0,13.88ZM190.81,475.37h11.56s0-1.96,0-1.96h-11.56s0,1.96,0,1.96ZM190.55,488.77l9.34.06h2.35s-.06-2.29-.06-2.29l-.03-6.91c.16-.4.35-1.25.32-1.6l-.16-2.01-2.45.05h-6.69s-2.33-.04-2.33-.04l.03,2.42.08,6.08-.32,1.29-.09,2.96ZM190.64,489.54v1.93s11.64,0,11.64,0v-1.93s-11.64,0-11.64,0ZM190.56,499.33h11.69s0-7.18,0-7.18h-11.69s0,7.18,0,7.18ZM202.21,503.28l-.02-2.47h-10.86s-.82.05-.82.05c-.16.01.37.62.36.53,4.01.34,7.35.91,11.33,1.89ZM189.54,616.97c-.12.1-.1.6-.1.84l-.04,9.7-.02,2.36,10.17-1.21,2.22-.63-.04-13.12-2.61.7c-.14-.03-.21-.73-.05-.77l1.51-.43c.32-.09.5-.17.61-.14l.57.13-.02-40.54.38-.92v-65.79s.09-2.37.09-2.37c-4.02-1.01-7.62-1.64-11.64-1.97v7.91s2.25.01,2.25.01c.28,0,.91.48,1.18.76l-2.96.04-.49-.13.03,10.65-.39.81v33.42s-.37.9-.37.9v36.3s-.38.5-.38.5v21.86s.76.62.76.62l-.65.53ZM189.42,631.34c-.16,0,.04.72.19.65s.58-.29.74-.29l3.84-.11c.2,0,.83-.17.99-.22l2.68-.27,1.65-.32,1.82-.35c.36.19.33-.77,0-.72l-1.21.28-2,.3-1.61.28-.88.21-2.73.17c-.13.07-.48.26-.54.27l-2.18.11-.78.03ZM190.45,634.29l1.58-.3,3.97-.28,1.63-.21,1.45-.24,2.84-.58c-.52-.6-.63-.73-.4-.46l-2.31.3-.85.16-1.6.3-2.74.22c-.07.03-.56.25-.63.26l-4.36.1c.24.35,1.02.8,1.4.73ZM201.74,635.73v-2.15s-12.47,1.41-12.47,1.41v2.14s12.47-1.4,12.47-1.4ZM189.01,638.12c.53.63,1.59.79,2.46.29l3.5-.1c.18,0,.82-.19.98-.24l2.7-.22.9-.18,1.57-.31c.16-.03.52-.22.66-.29s-.04-.66-.2-.6l-.66.25-2.02.28-1.24.2-1.64.26-3.92.29-3.07.38ZM189,640.92l5.18.03c.16-.14.44-.37.5-.37h2.19c.17-.01.75-.21.91-.27l2.35-.23,1.23-.28c.31.12.28-.82,0-.68l-1.87.31-1.58.26-3.13.21c-.08.04-.54.3-.6.3l-4.36-.03-.82.74Z"/>
      </g>
      <path class="st4" d="M229.7,355.31l-.12.4.06,7.88c4.9,4.09,7.73,9.65,9.36,16.14,10.19.83,20.18,2.37,30.25,5.01,9.01,2.37,17.22,5.7,25.67,9.4l5.23,2.28,7.99,3.84,4.92,2.58c5.3,2.78,10.15,5.92,15.1,9.51,11.5,8.34,21.18,18.35,27.52,31.02l.52,1.03c5.88,11.75,8.64,24.77,9.41,37.93.45,7.63.4,15.04-.39,22.62-1.08,10.33-4.25,23.23-7.69,33.03l-2.62,7.47-3,8.14-4.12,11.17-1.48,4.11-2.05,6.1c-2,5.96-3.42,11.93-4.25,18.23-1.27,9.61.38,20.32,4.23,29.07l6.28,11.95,3.77,6.35,9.84,15.85,8.35,13.63,3.34,5.65,3.78,6.64,1.49,2.68c.47.84.88,2.29.8,3.17l-.14,1.52-.17-.32-3.39-6.38-1.46-2.62-2.34-4.03-6.41-10.72-4.13-6.72-11.11-17.93-1.41-2.34-3.84-6.6-3.23-6.07c-8.57-16.11-7.17-34.37-1.44-51.36l2.42-7.17,8.59-23.48c3.64-9.96,6.62-19.68,8.55-30.19,2.97-16.09,2.68-32.28-.49-48.2-2.89-14.5-10.1-28.97-20.4-39.69-8.74-9.1-17.85-15.23-28.54-21.44-1.5-.87-3.01-1.62-4.76-2.19,9.22,6.91,16.59,13.9,23.26,23.24,11.4,15.96,17.25,33.05,18.49,52.73l.21,7.66c-.44,18.9-4.44,37.08-10.85,54.72l-5.07,13.94-3.2,8.83c-2.52,6.95-4.78,13.71-6.71,20.86-4.12,15.31-2.82,31.46,4.23,45.49l2.88,5.72,1.86,3.35,4.87,8.2,8.69,14.04,5.24,8.58,6.81,11.44,4.48,7.83,1.99,3.61,3.13,5.84,4.32,8.66,2.28,4.87,6.82,17.05-.03.8-.03.76-.03.72-.1,1.47-.32-.65-2.07-5.75-8.57-20.04-3.39-6.76-2.98-5.6-2.25-4.1-5.86-10.17-6.17-10.27-9.22-14.98-5.72-9.24-1.37-2.32-3.5-6.22-1.81-3.43c-8.54-16.16-10.45-34.23-4.93-51.84l2.95-9.41,2.11-6.16,10.36-28.77c5.67-15.74,9.2-33.88,9.66-50.74.19-6.9-.56-13.53-1.71-20.25-2.65-15.58-9.14-29.82-18.85-42.41-9.02-11.71-20.41-20.93-33.46-27.64-17.08-8.78-37.63-13.4-56.84-14.69l-7.52-.5-.9.78,1,.67c23.09.72,47.98,5.69,67.54,17.53l1.17.71c2.87,1.74,5.46,3.62,8.17,5.65,13.09,9.82,24.46,23.7,30.42,38.52l2.23,5.54.48,1.38.82,2.68.25.86.36,1.32.39,1.52.36,1.46.35,1.52.38,1.67.34,1.46.31,1.99.16.87.29,1.62.2,2.13.28.73.09,2.93.31,1.24v4.66s.32,1.06.32,1.06l.08,5.61c0,.07-.27.52-.39.73v6.32c-.01.07-.29.59-.35.68l-.07,3.48c-.08.14-.3.51-.31.57l-.12,2.76-.21.92c-.1.42-.22,1.19-.29,1.59l-.32,2.35-.31,1.66-.27,1.47-.27,1.46-.31,1.65-.3,1.61-.32,1.27-.38,1.49-.38,1.49-.39,1.54-.3,1.08-.41,1.49-.42,1.51-.31,1.1-.43,1.53-.33,1.06-.42,1.35-.29.92-.3,1.08-3.48,10.33-1.87,5.22-.9,2.5-.49,1.34-.41,1.13-.49,1.32-.33.9-.37,1.01-1.29,3.56-2.45,6.92-4.2,12.46-.34,1.26-.24.9-.46,1.71-.23.88-.27,1.08-.38,1.51-.32,1.27-.31,1.61-.25,1.25-.21,1.05-.37,2.09-.16,2.11c-.02.27-.2.93-.32,1.23l-.05,12.92.28.87.21,2.46.23,1.15.17,1.37.2.87.34,1.45.39,1.48.32,1.14.23.8.33,1.14.32,1.09.32,1.09.4,1.1.47,1.16.39.98.34.85.2.5.44.99.35.78.42,1.05,1.52,3.08.48.98.39.87,4.72,8.15,5.52,9.06,9.45,15.15,8.45,13.88,3.97,6.88,1.99,3.61,2.74,5.1,2.7,5.16.36.7.27.55.47.96,2.4,5.03,2.24,4.84,3.08,7.07.52,1.3.42,1.07.21.63.42,1,.2.48.24.62.36.95.92,2.52.41,1.12.38,1.08,1.4,4.41h-.71s-.77-2.51-.77-2.51l-.25-.8-.35-1.02-.42-1.14-.21-.57-.5-1.35-2.18-5.69-.39-.99-.78-1.9-3.12-7.03-2.46-5.32-1.81-3.81-.5-.99c-5.14-10.29-10.69-20-16.78-29.8l-12.58-20.24-4.11-6.72-6.05-10.35-1.4-2.73-.38-.76-.36-.72-.39-.78-.35-.73-.42-.96-.23-.63-.34-.73-.35-.75-.54-1.38-.37-.96-.33-.94-.46-1.31-.18-.63-.18-.51-.31-.87-.29-1.24-.27-.91-.42-1.49-.36-1.48-.34-1.47-.2-.88-.16-1.37c-.02-.15-.19-.71-.25-.87l-.14-2.74-.32-.46v-11.98s.29-.84.29-.84l.14-2.75c.08-.15.25-.44.26-.51l.16-1.83.3-1.48.18-.88.31-1.63.26-1.24.17-.85.34-1.27.24-.88.47-1.72.22-.9,1.5-4.82,2.46-7.62.51-1.34.4-1.07,1.36-3.91.49-1.36.41-1.12.27-.74.4-1.1.31-.85,1.41-3.9.27-.73.32-.87.27-.76.31-.89.47-1.33.3-.85.93-2.56.47-1.3.37-.85,4.29-13.03.97-3.24.43-1.48.36-1.28.38-1.52.38-1.49.38-1.49.37-1.49.37-1.49.38-1.5.36-1.51.33-1.65.37-1.82.32-1.99.15-.86.28-1.62.31-2.35.22-1.63.22-1.63.19-3.12.26-1.06.09-4.98.34-.85v-9.02c0-.1-.29-.64-.34-.72l-.06-4.6c-.08-.14-.29-.52-.3-.58l-.2-3.11-.29-2.03-.13-.85-.32-2-.33-1.65-.3-1.48-.19-.87-.43-1.71-.37-1.49-.38-1.5-.4-1.48-.27-.93-.43-1.51-.41-1.3-.31-.94-.48-1.32c-3.97-10.9-11.18-23.4-19.39-31.68l-3.37-3.4-4.5-4.1c-8.39-7.65-20.8-14.57-31.42-18.51-7.57-2.81-15.18-4.79-23.14-6.29-7.07-1.33-13.88-2.38-21.16-2.67l-5.82-.23c-.15,0-.67.65-.52.72s.59.3.76.29l1.84-.07.98.25,5.28.09,1.05.26,3.74.13c.2.12.48.31.57.31l1.83.03c.16,0,.72.18.88.24l2.71.26,1.62.25,1.47.23,2.03.33,1.97.32,1.65.34,1.47.3.86.18,1.62.3,1.49.38.88.22.86.22,1.25.31,1.26.32,1.5.38,1.12.32,1.66.46,7.02,2.34c3.62,1.21,7.03,2.77,10.45,4.46l.74.37.98.49,4.16,2.21c6.9,3.66,12.83,8.45,18.62,13.81,11.76,10.89,20.26,24.17,25.02,38.84l.44,1.34.27.89.41,1.49.47,1.72.25.93.35,1.44.2.86.29,1.28.18.85.3,1.47.34,1.65.32,2.35.27,2,.21.89.13,3.12c0,.07.24.43.33.57v17.42c-.05.19-.28.75-.28.91l-.12,3.5c0,.18-.16.81-.22.97l-.27,2.69-.28,1.63-.15.88-.31,2.17-.27,1.42-.18.88-.3,2-.27,1.24-.19.86-.29,1.64-.22.85-.39,1.51-.22.85-.29,1.26-.23.86-.23.86-.3,1.25-.27.9-.32,1.09-.25.85-.25.89-.36,1.25-.39,1.33-.27.93-.33,1.08-.98,3.17-.43,1.31-2.78,8.11-.39,1.08-.32.9-.47,1.32-.31.89-.24.53-.27.77-.46,1.31-.32.91-.46,1.31-.41,1.15-.49,1.34-.33.89-.48,1.33-.29.77-.33.87-.26.76-.3.89-.45,1.32-.4,1.14-1.59,4.5-.46,1.32-.31.91-.46,1.33-.28.8-.4,1.24-.42,1.32-1.17,3.64-.31,1.23-.24.87-.3,1.1-.26.94-.46,1.69-.41,1.48-.25.89-.36,1.27-.15.84-.26,1.45-.32,1.8-.15.87-.29,1.62-.18,2.07c-.01.16-.25.79-.33.95l.02,13.79.4,2.02.16.9.31,1.79.26,1.52.19.83.43,1.7.38,1.5.41,1.47.3.92.43,1.33.21.64.17.5.31.92.49,1.3.55,1.31.68,1.61.34.82.22.52.33.74.25.53.36.77.35.73,2.35,4.36,1.62,2.87,6.86,11.41,6.86,11.01,6.55,10.62,5.44,9.07,4.25,7.34,1.72,3.12,3.87,7.33,2.16,4.18,1.8,3.78,2.61,5.57,1.39,3.08,2.37,5.48.25.57.29.77,3.21,8.35.2.59.66,1.92.16.48.21.63.2.61c.04.11-.37.27-.45.18s-.36-.44-.4-.56l-1.03-2.96-.33-.94-.47-1.32-.25-.69-.21-.57-.25-.64-.63-1.61-.53-1.35-.3-.75-.35-.87-.19-.49-.21-.53-.31-.8-2.27-5.24-1.85-4.1-2.84-6.04-2.62-5.25-3.73-7.09-2.23-4.1-1.22-2.16-4.39-7.55-8.46-13.89-7.17-11.47-1.87-2.98-5.5-9.1-7.3-13.56-.17-.83-.44-.81-.33-.73-.47-1.4-.28-.82-.3-.54-.29-.84-.18-.52-.44-1.33-.29-.89-.24-1.02-.39-1.33-.25-.88-.24-.87-.15-.64-.21-.85-.22-1.38-.14-.85-.3-1.82-.19-1.41-.1-1.14c-.01-.16-.25-.78-.3-.94l-.02-12.67c.09-.17.36-.83.36-.99l.05-2.05c.08-.17.25-.51.26-.57l.28-1.93.29-2.01.23-.86.17-.65.18-.85.31-1.46.22-1.04.24-.86.25-.9.47-1.69.24-.89.32-1.24.27-.91.32-1.08.46-1.54.41-1.29.31-.92.37-1.12.44-1.32.3-.91.44-1.33.3-.92.37-1.07,1.86-5.26.46-1.31.33-.93.39-.98.85-2.48.3-.87.33-.87.38-1.03.17-.46.39-1.12.32-.9.47-1.33.31-.87.36-1.01.4-1.12.41-1.13.32-.9.5-1.3,4.14-12.34.43-1.5.4-1.34.27-.93.32-1.08.33-1.1.27-.9.3-1.25.23-.86.23-.86.3-1.25.32-1.27.28-1.09.22-.89.37-1.48.3-1.62.18-.86.3-1.47.34-1.65.31-1.97.3-1.62.16-.87.26-2.37c.05-.16.22-.7.23-.86l.06-1.5.25-.92.12-3.19.34-.78v-5.42s.33-1.15.33-1.15l.05-6.62c-.15-.24-.39-.6-.39-.67v-4.29c0-.16-.22-.83-.28-.98l-.14-2.42-.22-.95-.23-2.71-.17-.88-.31-1.62-.3-1.61-.33-1.63-.38-1.89-.35-1.46-.4-1.53-.36-1.32-.25-.9-.25-.85-.44-1.34-1.24-3.76-.98-2.63-1.61-3.69c-8.03-18.39-23.61-34.22-41.37-43.98-2.76-1.51-5.35-2.92-8.22-4.06l-5.61-2.23-8.13-2.74-.91-.22-1.34-.37-1.49-.41-1.13-.31-1.46-.4-1.41-.26-1.28-.29-1.46-.33-.86-.19-1.62-.31-1.86-.35-.88-.16-1.62-.28-1.97-.32-1.62-.28-.86-.15-2.74-.32-1.62-.21-1.67-.22-3.47-.19-1.26-.29-4.32-.06c-.07,0-.46-.24-.58-.32l-3.77-.06-.61.55.16,1.69c18.72.37,45.45,5.36,61.37,14.58l4.96,2.87c3.32,1.92,6.16,4.03,9.29,6.43,17.31,13.28,29.02,31.27,33.56,52.59,2.17,10.2,2.82,20.16,1.93,30.58s-2.58,20.15-5.6,29.91l-3,9.7-3.36,9.69-3.93,11.01-3.95,11.32c-3.94,11.31-7.95,24.96-7.97,36.87v1.55c-.03,16.6,6.95,30.53,15.38,44.34l8.2,13.42,4.85,7.85,7.44,12.3,4.55,7.78,2.12,3.84,2.24,4.11,2.74,5.1,3.22,6.42,2.98,6.34,1.62,3.66,2.53,6.02,1.59,4.04,2.84,7.61-.1.78-.56-.54-8.49-21.26-.37-.78-3.18-6.58-5.43-10.59-1.99-3.61-2.12-3.85-1.48-2.61-4.46-7.48-4.49-7.43-2.71-4.42-11.88-19.36-4.84-8.24-2.58-4.84-2.37-5.2c-3.8-8.34-5.97-17.23-5.95-26.45v-2.29s.46-7.09.46-7.09c.97-7.59,2.73-14.77,5.11-21.99l3.72-11.29,9.72-27.48,1.89-6.03c7.78-24.76,10.77-51.14,1.83-75.96-2.7-7.5-6.17-14.38-10.8-20.88-2.84-3.99-5.7-7.55-9.15-11.02-6.97-7.01-14.6-12.85-23.29-17.69-13.27-7.39-27.07-10.82-41.96-13.32-6.38-.95-12.62-1.5-19.14-1.81l-.91.09c-.17.02-.1.43-.07.78l7.74.34c13.16,1.17,25.97,3.55,38.43,7.81,13.56,4.62,25.59,12.24,36.04,22.05,6.33,5.94,13.08,14.5,16.87,21.98l2.02,4c5.68,11.23,8.58,26.02,8.74,38.93.2,16.9-3.25,31.58-8.22,47.32l-.82,2.61-5.02,14.28-5.4,15.56c-3.87,11.15-8.9,27.39-8.81,38.79l.02,2.29c.08,10.63,2.82,20.82,7.65,30.18l3.08,5.97,3.02,5.21,8.42,13.93,10.95,17.75,4.62,7.74,7.63,13.58,3.23,6.11,3.94,8.03,6.87,15.88,3.18,8.47-.81.41-.24-.54-.31-.82-.4-1.09-9.84-23.38-3.23-6.46-4.13-7.85c-5.94-11.28-12.73-21.79-19.42-32.7l-7.1-11.59-6.4-10.75-2.11-3.86-1.85-3.69-1.88-4.12-.23-.59-.39-.98c-3.17-7.96-4.99-16.2-5.06-24.84-.03-4.22-.1-8.24.82-12.33l2.84-12.69,1.87-6.4,2.84-8.75,3.13-9.15,3.7-10.46,4.32-12.57c6.01-17.48,9.96-37.23,8.29-55.84-1.1-12.28-4.39-24.01-10.18-34.84l-3.17-5.47c-3.48-6-9.83-13.17-15.19-18.02-9.49-8.59-21-15.74-32.91-20.01-7.37-2.64-14.78-4.57-22.51-5.85l-7.98-1.32c-5.38-.89-10.56-1.11-16.07-1.36l-.59.62.28,30.24.81,78.95,4.01,3.11c6.97,6.05,12.68,13.12,17.18,21.15l3.5,7.02c5.22,10.46,7.74,26.75,6.94,38.93s-4.21,24.17-10.26,34.83c-2.46,4.33-5.04,8.39-8.43,12.08l-4.49,4.89c-5.75,5.63-12.05,10.35-19.35,13.77-.15.13-.53.57-.51.74l.14,1.6v77.04s.37.56.37.56v21.88s-.17.8-.17.8c-.04.16-.51-.29-.57-.42v-30.97s-.37-1.16-.37-1.16v-68.12s-.04-18.71-.04-18.71l.07-20.13-.39-.88v-71.39s-.03-4.56-.03-4.56l-.02-5.58-.02-5.6v-2.61s0-9.32,0-9.32l.09-9.72c-.11-.19-.44-.98-.44-1.24l.12-8.37v-8.27s-.04-8.94-.04-8.94v-7.83s-.03-10.46-.03-10.46l-.03-26.81-.04-13.07v-7.1s-.04-13.68-.04-13.68l-.2-8.33-.05-14.89-.03-3.74h.75s.06.75.06.75l5.41-.02.5-.73h2.61s.23,19.37.23,19.37l.07,10.1.07,15.66.21,21.59.04,2.67.13,17.51.2,21.59.03,1.94.25,33.68,1.17-.09-.17-18.35-.19-15.27v-1.94s-.36-39.03-.36-39.03l-.05-2.7-.12-20.48-.25-16.78-.07-10.07v-7.49s-.18-11.06-.18-11.06l.12-.83h1.47ZM218.68,376.32l3.58-.09,3.66-.09-.19-19.52-3.83.06-3.27.05-.09,1.91v15.68s.15,2.01.15,2.01ZM237.46,379.63c-1.34-5.23-3.7-10.07-7.78-14.09l.03,13.74,7.75.35ZM218.61,376.95l.02,1.96,6-.07-.02-1.96-6,.07ZM218.86,395.46l-.15,2.25h4.28s3.16-.12,3.16-.12l-.16-18.02h-3.35s-3.97.03-3.97.03l-.09,2.17-.06,8.45s.42.78.42.86l-.08,4.38ZM220.77,400.38h2.59s1.52-.21,1.52-.21l-.04-1.68-2.95-.02-3.08-.02-.17,1.75,2.14.17ZM218.84,418.15l7.48-.11-.15-17.01-3.91.03-3.44.03.04,2.31v12.08s-.02,2.66-.02,2.66ZM225.62,420.74h.75s0-2.05,0-2.05h-.75s0,2.05,0,2.05ZM221.17,420.64h1.43s2.31.05,2.31.05v-1.89s-1.56,0-1.56,0h-1.08s-3.46.07-3.46.07l-.03,1.87,2.39-.09ZM218.89,437.25l4.52.02,3.09-.29-.13-15.56-3.37-.06-2.19.02-1.91.08v15.79ZM226.56,439.62l-.4-2.07-.81,1.77,1,.93c.19-.59.22-.69.2-.63ZM218.83,437.97v2s6.37-.04,6.37-.04v-2s-6.37.04-6.37.04ZM218.86,440.55l.05,14.92,7.78-.02-.05-14.92-7.78.02ZM225.81,457.89c.01.21.68.39.91.41l-.08-2.36c-.1-.1-.91.51-.9.78l.07,1.17ZM218.93,456.14v2.09s6.32-.03,6.32-.03v-2.09s-6.32.03-6.32.03ZM218.93,472.49l2.61-.02,5.32-.06-.07-12.69c0-.27-.56-.97-.81-.96l-2.91.1-1.9.02-2.25-.04v13.65ZM225.99,475.37h.75s0-2.24,0-2.24h-.75s0,2.24,0,2.24ZM218.98,473.14v2.04s6.36-.02,6.36-.02v-2.04s-6.36.02-6.36.02ZM218.85,475.91l.05,12.98,8.15-.03-.05-12.98-8.15.03ZM227,491.71l-.02-2.15c0-.24-.94.29-.97.58-.09.78.38,1.54.99,1.58ZM218.9,489.52v1.95s6.54-.02,6.54-.02v-1.95s-6.54.02-6.54.02ZM218.88,492.15l.03,7.37,8.2-.04-.03-7.37-8.2.04ZM219.62,632.97c-.16.07.02.64.13.9,14.15-7.23,25.08-17.99,32.66-32.11,3.2-5.97,5.58-12,7.15-18.59l.26-1.11.37-1.89.33-1.64.32-1.98.19-1.26.25-1.65.18-3.46c0-.07.21-.43.35-.65l-.02-11.1c0-.19-.31-.94-.32-1.1l-.18-3.12-.2-1.25-.25-1.64-.29-1.99-.24-1.26-1.86-7.79-.31-.78-2.02-5.87-.3-.78-.92-2.16-1.04-2.26c-2.01-4.37-4.19-8.62-7.29-12.44l-6.36-7.86-8.74-8.06-.8-.21c-.17-.04-.32.52-.17.61l.56.37,6.75,5.95,5.64,6.33c4.49,5.03,7.73,10.94,10.42,17.07l1.3,2.98.42,1.01,1.91,5.8,1.74,6.59.45,2.26.29,1.48.17.87.2,2.08.2.96.22,3.37.28,1.11-.04,11.03-.3,1.17-.18,2.76-.2,1.25-.26,1.63-.31,1.97-.34,1.65-.31,1.49-.27,1.12c-2.78,11.64-8.92,23.71-16.85,32.79l-7.47,7.44c-4.14,4.12-9.09,6.99-14.22,9.63l-.7.32ZM246.34,607.21l5.18-9.03c2.06-3.59,3.44-7.44,4.54-11.46l.41-1.49.36-1.34.36-1.44.42-1.91.32-1.49.36-1.64.31-2.35.22-1.65.22-1.64.22-4.15c.04-.09.29-.62.29-.68v-6.49s-.34-.8-.34-.8l-.11-3.91-.25-.99-.18-2.05-.24-1.26-.23-1.24-.28-2-.19-.86-.33-1.47-.35-1.48-1.19-4.16-.53-1.73-.28-.86-1.74-4.57-.45-1.04-.56-1.3-2.73-5.48c-2.41-4.83-5.59-9.16-9.16-13.19l-2.82-3.18-8.71-7.7-1.18.04,5.74,4.8c5.39,4.51,9.88,9.91,13.37,15.98l2.75,4.79,2.11,4.12.35.86c1.68,4.13,3.2,8.17,4.26,12.59l.37,1.52.31,1.47.22,1.1.34,1.66.32,1.98.21,1.63.22,1.67.17,4.17c0,.07.25.47.34.61v7.59c-.09.14-.33.53-.33.6l-.18,3.81-.22,1.66-.21,1.63-.32,1.98-.33,1.65-.3,1.48-.23,1.04-.4,1.53-.39,1.48-.31,1.16-.41,1.46-2.25,6.09-.89,2.12c-2.68,6.38-6.41,12.04-10.84,17.46-5.97,7.07-12.88,12.79-21.01,17.02l-.91,1.08h.79c11.01-6.04,19.23-13.45,26.26-23.77ZM219.62,626.96v2.47c14.92-8.09,25.73-20.31,32.26-35.73,7.71-18.22,7.96-38.71,1.1-57.3-4.5-12.19-12.16-23.7-22.51-31.94l-4.42-3.52-3.95.06,2.38,1.63,3.02,2.19c4.72,3.42,8.61,7.46,12.23,12.01,4.36,5.49,7.78,11.34,10.44,17.84l2.94,8.66c2.06,6.08,2.58,12.38,2.71,18.92.17,8.52-.98,16.7-3.59,24.71-5.43,16.72-16.78,31.41-32.61,39.98ZM221.54,624.2l-1.71,1.04-.1.76,1.8-1.05c4.51-2.63,8.54-5.7,12.23-9.41,3.12-3.14,5.95-6.26,8.36-9.94l1.02-1.55.75-1.15.73-1.12.42-.79.71-1.08,3.2-6.45.57-1.4.5-1.09,2.29-6.9.43-1.66.36-1.52.34-1.48.36-1.65.32-1.62.18-1.25.24-1.64.19-3.1.3-1.13.04-10.3c-.16-.27-.38-.63-.38-.69l-.02-3.46c-.12-.22-.3-.55-.31-.62l-.17-2.4-.34-1.63-.4-1.92-.34-1.46-.37-1.51-.44-1.68-.8-2.59-.81-2.41-1.29-3.63-.33-.89-3.98-7.84-3.08-4.82-1.39-1.94-3.83-4.79c-3.84-4.81-8.67-8.51-13.76-11.95l-1.61-.93-1.16-.57c-.6.12-.69.27-.12.37l1.74,1.16,1.12.76,3.45,2.52,5.27,4.42,4.94,5.12,3.51,4.35,1.12,1.47.78,1.16,5.81,10.51.42.99.46,1.15.52,1.33.39.9,2.07,6.3.29,1.12.34,1.51.33,1.48.4,1.9.34,1.62.3,2.35.21,1.69.34,1.58.04,13.52c-.11.16-.33.5-.33.56l-.19,2.76-.3,1.61-.16.88-.29,1.99-.36,1.66-.34,1.48-.43,1.65-.96,3.19-.84,2.5-1.13,3-.41,1.04-1.17,2.57-1.21,2.41-1.51,2.75-.54.91-1,1.56-.76,1.18-.75,1.11c-5.16,7.6-12.28,14.27-20.11,19.04ZM219.7,623.41c5.01-2.96,9.62-6.35,13.5-10.67l3.9-4.33c4.86-5.4,10.07-15.52,12.27-22.68,5.41-17.58,4.31-35.55-3.15-52.21-5.65-12.62-14.76-23.22-26.78-30.43l-.47.54c3.26,2.22,6.4,4.1,9.3,6.79,4.86,4.52,8.92,9.59,12.33,15.23l3.21,6.09c3.97,7.52,6.01,15.59,6.96,24.08,1.48,13.23-.56,26.44-6.25,38.39-4.06,8.51-11.56,18.79-19.1,24.17l-5.28,3.77c-.34.24-.55,1.01-.44,1.27ZM222.26,512.91l7.54.1-2.99-2.69-5.76-4.25-1.91-1.3.02,3.07v1.45s-.04,2.03-.04,2.03c.64.38,2.28,1.59,3.14,1.6ZM232.28,609.94l4.54-5.55c3.55-4.33,5.83-9.27,7.95-14.44,5.66-13.79,6.57-29.78,2.63-44.23-1.21-4.46-2.64-8.71-4.69-12.86l-1.22-2.48c-2.05-4.16-4.36-8.13-7.51-11.54l-3.95-4.26-7.95-.29c-.8-.03-1.89-.68-2.92-1.22l.05,2.94v4.51c0,.94.18,1.91.59,2.75.19-.1-.46.25-.57.3l.04,2.22v84.87c.07.21.35.9.35,1.06l-.03,6.02.16,2.89c4.69-3.02,8.67-6.56,12.52-10.7Z"/>
    </g>
  </g>
  <g id="guitar-image-right">
    <g id="leather1" data-name="leather">
      <path class="st0" d="M254.18,550.06c-1.11-4.99-2.5-9.66-4.66-14.3l-2.27-4.88c-1.94-4.16-4.83-8.14-7.55-11.7-.32-.41-1.36-.88-1.85-.88h-1.77c-.49-.18-1.01-.3-1.56-.3-.64,0-1.24.14-1.79.39-1.86-.16-3.17-1.06-4.58-2.09-1.92-1.56-3.83-2.95-5.73-4.19l-1.76-1.29v.17c-.28-.17-.56-.34-.83-.5v-.14c-4.19-2.48-8.23-4.16-12.95-5.55v.09c-.34-.1-.68-.19-1.02-.28v-.18c-4.09-1.05-7.77-1.52-12.18-1.69l.02.3c-.7,0-1.39.01-2.07.04v-.27c-4.02.33-7.62.96-11.64,1.97v.16c-.86.24-1.69.5-2.5.77v-.16c-4.21,1.53-7.9,3.26-11.61,5.55v.04c-.76.48-1.37.89-1.84,1.21-.59.26-1.06.58-1.41.95-.9.49-1.82.98-2.52,1l-7.95.29-3.95,4.26c-3.15,3.41-5.47,7.38-7.51,11.54l-1.22,2.48c-2.05,4.15-3.48,8.4-4.69,12.86-3.93,14.45-3.03,30.44,2.63,44.23,2.12,5.17,4.4,10.1,7.95,14.44l4.54,5.55c1.74,1.95,3.71,3.9,5.95,5.77,3.13,2.62,6.39,4.75,9.67,6.5v.32c4.16,2.15,8.14,3.74,12.42,4.97v-.29c.83.24,1.66.46,2.48.66v.16s2.22.63,2.22.63l4.98.59c1.24.17,2.44.32,3.57.43l1.61.19v-.06c.05,0,.1,0,.16.01.51.08,1.04.12,1.59.12.09,0,.17,0,.26,0,.05,0,.1,0,.15,0h-.03s.02-.01.03-.01h0s.17,0,.17,0c.4-.02.79-.07,1.17-.13l8.88-.99,2.64-.63v-.52s.08-.02.12-.03c-.04.18-.08.37-.12.55,3.69-1.31,7.37-2.62,11.06-3.92l3.41-1.62v-.54s.04-.03.06-.04c-.02.19-.04.38-.06.57,1.59-.98,3.19-1.96,4.78-2.93l8.91-7.2v-.74s.07-.06.11-.08c-.04.28-.07.55-.11.83,4.59-4.54,12-13.15,16.38-26.08,5.73-16.94,2.93-31.36,1.81-36.37Z"/>
      <path class="st0" d="M222.07,613.15s-.07,0-.11,0h0c.05,0,.08,0,.11,0Z"/>
    </g>
    <g id="kokuin1" data-name="kokuin">
      <path d="M214.23,622.5l-.65.24-1.23-1.51-1.95.71.05,1.95-.62.23-.1-6.03.71-.26,3.8,4.67ZM212.06,620.8l-1.13-1.38c-.25-.32-.47-.62-.66-.91h-.02c.04.36.06.73.08,1.11l.03,1.81,1.7-.62Z"/>
      <path d="M219.19,620.22l-.62.29-1.36-1.4-1.88.88.21,1.94-.6.28-.62-6,.68-.32,4.19,4.33ZM216.87,618.72l-1.25-1.28c-.28-.3-.52-.58-.73-.85h-.02c.07.35.13.73.18,1.1l.18,1.8,1.64-.76Z"/>
      <path d="M223.91,617.52l-.59.35-1.48-1.28-1.79,1.04.39,1.91-.57.33-1.16-5.92.65-.38,4.56,3.94ZM221.47,616.23l-1.36-1.17c-.3-.27-.57-.53-.81-.79h-.02c.11.35.19.71.28,1.08l.35,1.78,1.56-.91Z"/>
      <path d="M228.36,614.37l-.56.4-1.61-1.12-1.68,1.22.58,1.86-.54.39-1.75-5.77.61-.44,4.94,3.46ZM225.8,613.33l-1.47-1.02c-.33-.24-.62-.47-.88-.7h-.02c.14.34.26.69.38,1.05l.52,1.74,1.46-1.06Z"/>
      <path d="M232.54,610.86l-.52.45-1.69-.98-1.57,1.35.73,1.81-.5.43-2.21-5.61.57-.49,5.21,3.04ZM229.9,610.04l-1.54-.9c-.35-.21-.66-.42-.94-.62l-.02.02c.17.31.32.66.47,1l.66,1.69,1.37-1.18Z"/>
      <path d="M236.36,606.95l-.48.5-1.78-.82-1.44,1.49.9,1.73-.46.48-2.74-5.37.52-.54,5.47,2.54ZM233.66,606.38l-1.62-.75c-.37-.18-.7-.36-.99-.53l-.02.02c.19.29.38.62.56.95l.82,1.62,1.25-1.3Z"/>
      <path d="M239.79,602.71l-.43.54-1.84-.65-1.29,1.62,1.05,1.64-.42.52-3.21-5.1.47-.59,5.67,2.02ZM237.05,602.39l-1.68-.6c-.38-.15-.72-.29-1.04-.44v.02c.21.28.42.59.63.9l.96,1.53,1.13-1.41Z"/>
      <path d="M242.83,598.18l-.38.57-1.89-.49-1.14,1.73,1.19,1.54-.37.55-3.66-4.79.42-.63,5.83,1.51ZM240.07,598.11l-1.73-.45c-.39-.11-.75-.22-1.07-.34v.02c.23.25.47.54.71.83l1.1,1.44,1-1.5Z"/>
      <path d="M245.48,593.4l-.33.6-1.93-.32-1,1.82,1.32,1.43-.32.58-4.05-4.46.36-.66,5.95,1ZM242.72,593.57l-1.76-.3c-.4-.08-.76-.16-1.1-.25v.02c.25.23.52.5.78.77l1.22,1.34.87-1.59Z"/>
      <path d="M247.71,588.48l-.28.63-1.95-.17-.84,1.89,1.43,1.32-.27.61-4.41-4.11.31-.69,6.01.51ZM244.97,588.87l-1.78-.15c-.41-.04-.78-.1-1.12-.16v.02c.27.21.56.46.84.7l1.32,1.24.74-1.65Z"/>
      <path d="M249.53,583.39l-.23.65h-1.96s-.69,1.94-.69,1.94l1.53,1.21-.22.63-4.71-3.76.25-.71,6.03.05ZM246.84,583.99h-1.79c-.41-.03-.78-.05-1.12-.09v.02c.29.19.59.41.89.64l1.42,1.13.6-1.7Z"/>
      <path d="M250.97,578.16l-.18.67-1.95.14-.54,2,1.62,1.08-.17.64-4.99-3.38.2-.73,6.01-.43ZM248.33,578.96l-1.78.13c-.41.02-.78.03-1.12.01v.02c.3.17.62.36.94.56l1.5,1.02.47-1.74Z"/>
    </g>
    <g id="guitar-image1" data-name="guitar-image">
      <rect class="st4" x="197.59" y="509.57" width=".92" height="3.09" transform="translate(-324.67 676.11) rotate(-86.34)"/>
      <rect class="st4" x="201.66" y="510.27" width=".91" height="3.03" transform="translate(-337.45 619.65) rotate(-79.76)"/>
      <rect class="st4" x="199.7" y="615.3" width="2.96" height=".82" transform="translate(-117.53 51.8) rotate(-11.38)"/>
      <path class="st4" d="M196.42,616.73c-.16.02-.78-.58-.63-.61l.79-.16,2.1-.3-.02.85-2.23.22Z"/>
      <rect class="st4" x="203.7" y="614.49" width="2.74" height=".84" transform="translate(-156.12 76.66) rotate(-15.42)"/>
      <rect class="st4" x="209.62" y="512.3" width=".95" height="3.26" transform="translate(-344.82 495.6) rotate(-65.87)"/>
      <rect class="st4" x="217.9" y="608.18" width="3.05" height=".85" transform="translate(-312.72 240.68) rotate(-35.51)"/>
      <rect class="st4" x="214.6" y="610.14" width="2.96" height=".88" transform="translate(-262.09 173.71) rotate(-28.1)"/>
      <rect class="st4" x="211.05" y="611.87" width="3.09" height=".87" transform="translate(-241.92 150.21) rotate(-25.38)"/>
      <path class="st4" d="M218.92,517.97l-1.27.36-2.01-1.63c.5-.05,1.04-.09,1.22.02l2.07,1.25Z"/>
      <rect class="st4" x="213.39" y="514.18" width=".94" height="2.89" transform="translate(-342.9 475.44) rotate(-63.34)"/>
      <path class="st4" d="M239.83,582.88l-1.33,2.43.59.51c.09.08.3-.4.35-.51l1.08-2.1c-.3-.03-.53-.15-.69-.33Z"/>
      <path class="st4" d="M241.65,576.84c.12,0,.22.02.32.05.02-.16.05-.32.1-.49l.41-1.44c.04-.15,0-.55-.02-.72-.02-.16-.92.08-.95.24-.18.92-.27,1.72-.31,2.45.13-.06.29-.09.46-.09Z"/>
      <path class="st4" d="M241.27,579.08c-.21,0-.38-.05-.53-.13-.03.78-.08,1.44-.31,2.05.25.03.45.14.59.29.33-.9.45-1.61.49-2.23-.08.01-.16.02-.24.02Z"/>
      <rect class="st4" x="241.86" y="554.79" width=".84" height="2.95" transform="translate(-77.87 40.87) rotate(-8.31)"/>
      <rect class="st4" x="237.37" y="539.57" width=".88" height="3.12" transform="translate(-209.67 154.94) rotate(-25.48)"/>
      <rect class="st4" x="235.65" y="536.11" width=".86" height="2.84" transform="translate(-242.6 197.63) rotate(-30.91)"/>
      <rect class="st4" x="240.13" y="546.99" width=".85" height="2.89" transform="translate(-144.26 89.56) rotate(-16.3)"/>
      <rect class="st4" x="241.15" y="550.77" width=".84" height="3" transform="translate(-106.6 60.2) rotate(-11.66)"/>
      <rect class="st4" x="242.28" y="558.58" width=".79" height="3.02" transform="translate(-41.69 19.97) rotate(-4.34)"/>
      <rect class="st4" x="240.86" y="571.55" width="2.92" height=".8" transform="translate(-356.95 735.46) rotate(-82.3)"/>
      <rect class="st4" x="238.9" y="543.21" width=".87" height="2.95" transform="translate(-176.48 119.17) rotate(-20.62)"/>
      <rect class="st4" x="241.22" y="567.59" width="3" height=".76" transform="translate(-340.09 772.51) rotate(-86.2)"/>
      <rect class="st4" x="242.46" y="562.63" width=".75" height="2.98"/>
      <rect class="st4" x="236.25" y="587.49" width="2.87" height=".84" transform="translate(-394.29 535.59) rotate(-63.25)"/>
      <rect class="st4" x="224.46" y="603.12" width="2.95" height=".81" transform="translate(-335.64 287.42) rotate(-40.1)"/>
      <rect class="st4" x="229.12" y="526.36" width=".82" height="2.99" transform="translate(-284.1 268.05) rotate(-39.67)"/>
      <rect class="st4" x="231.57" y="529.41" width=".87" height="3.02" transform="translate(-273.82 248.35) rotate(-37.21)"/>
      <rect class="st4" x="227.32" y="600.35" width="2.99" height=".85" transform="translate(-372.52 373.44) rotate(-48.44)"/>
      <rect class="st4" x="229.88" y="597.37" width="2.9" height=".86" transform="translate(-379.37 403.08) rotate(-51.16)"/>
      <rect class="st4" x="223.39" y="520.73" width=".88" height="2.82" transform="translate(-317.74 350.57) rotate(-49.22)"/>
      <rect class="st4" x="226.39" y="523.42" width=".82" height="3.01" transform="translate(-304.24 312.83) rotate(-44.86)"/>
      <rect class="st4" x="232.24" y="594.24" width="2.99" height=".8" transform="translate(-391.09 461.16) rotate(-56.48)"/>
      <rect class="st4" x="157.86" y="599.12" width=".86" height="2.94" transform="translate(-368.73 271.93) rotate(-43.29)"/>
      <rect class="st4" x="158.62" y="524.91" width="3.23" height=".86" transform="translate(-318.43 256) rotate(-43.67)"/>
      <rect class="st4" x="147.13" y="542.42" width="3.04" height=".87" transform="translate(-408.91 465.89) rotate(-66.83)"/>
      <rect class="st4" x="153.19" y="531.32" width="3.24" height=".87" transform="translate(-369.74 354.04) rotate(-55.05)"/>
      <path class="st4" d="M156.89,529.75l-.92-.31,2.3-2.51c.08.44.02,1.06-.14,1.27l-1.24,1.55Z"/>
      <rect class="st4" x="143.62" y="554.61" width="3.2" height=".85" transform="translate(-426.22 606.08) rotate(-80.44)"/>
      <rect class="st4" x="150.91" y="534.87" width="3.15" height=".9" transform="translate(-388.72 405.29) rotate(-60.59)"/>
      <path class="st4" d="M149.87,540.67c-.12-.12-.29-.87-.17-1.11l1.07-2.04.69.49-1.6,2.65Z"/>
      <rect class="st4" x="145.63" y="546.36" width="3.2" height=".87" transform="translate(-418.14 514.89) rotate(-71.7)"/>
      <rect class="st4" x="160.57" y="601.73" width=".87" height="3.23" transform="translate(-401.08 331.31) rotate(-49.23)"/>
      <path class="st4" d="M154.04,595.77l-1.4-1.89c-.07-.09-.33-.49-.34-.47s.25-.33.32-.42c.21-.29,2.11,1.61,1.42,2.78Z"/>
      <rect class="st4" x="146.33" y="578.31" width=".88" height="3.07" transform="translate(-187.88 84.09) rotate(-19.82)"/>
      <rect class="st4" x="144.46" y="550.45" width="3.22" height=".81" transform="translate(-423.59 567.08) rotate(-76.78)"/>
      <rect class="st4" x="144.19" y="566.02" width=".77" height="3.3" transform="translate(-45.85 13.69) rotate(-4.68)"/>
      <rect class="st4" x="150.91" y="589.36" width=".88" height="3.03" transform="translate(-269.24 149.13) rotate(-29.23)"/>
      <rect class="st4" x="144.65" y="570.17" width=".78" height="3.14" transform="translate(-85.59 28.85) rotate(-8.78)"/>
      <rect class="st4" x="145.37" y="574.31" width=".82" height="3.12" transform="translate(-120.57 44.89) rotate(-12.43)"/>
      <rect class="st4" x="147.6" y="582.07" width=".87" height="3.14" transform="translate(-204.37 95.41) rotate(-21.59)"/>
      <rect class="st4" x="144.01" y="561.89" width=".75" height="2.98"/>
      <rect class="st4" x="149.15" y="585.92" width=".89" height="2.98" transform="translate(-234.87 118.78) rotate(-25.08)"/>
      <rect class="st4" x="144.39" y="557.78" width=".75" height="2.8"/>
      <rect class="st4" x="155.35" y="596.05" width=".82" height="2.96" transform="translate(-319.52 203.31) rotate(-35.72)"/>
      <rect class="st4" x="172.09" y="515.16" width="3.22" height=".91" transform="translate(-212.55 132.42) rotate(-26.61)"/>
      <rect class="st4" x="170.24" y="609" width=".88" height="3.02" transform="translate(-448.6 475.03) rotate(-62.04)"/>
      <rect class="st4" x="173.69" y="610.81" width=".9" height="2.86" transform="translate(-458.24 539.73) rotate(-67.58)"/>
      <rect class="st4" x="168.42" y="517.23" width="3.12" height=".85" transform="translate(-249.6 170.08) rotate(-32.18)"/>
      <rect class="st4" x="166.83" y="606.9" width=".84" height="2.98" transform="translate(-429.17 402.48) rotate(-55.58)"/>
      <rect class="st4" x="180.21" y="512.21" width="2.88" height=".83" transform="translate(-132.9 68.96) rotate(-15.82)"/>
      <path class="st4" d="M190.76,616.68l-2.02-.04c-.2,0-.59-.42-.94-.86l3.02.11c0-.06-.05.66-.06.79Z"/>
      <path class="st4" d="M381.6,728.58l-1.77-6.1c-2.59-8.89-5.65-17.46-9.52-25.91l-2.24-4.88-5.47-10.92-14.23-24.5-4.91-7.81-8.13-13.11c-5.55-8.95-10.76-19.35-11.99-29.83-.77-6.58-.54-12.94.7-19.43,1.42-7.4,3.37-14.42,5.57-21.61l3.98-13.02c3.18-10.42,6.06-20.6,8.4-31.31l3.02-18.67c.95-5.88.99-11.55.79-17.56-.42-12.52-2.84-24.55-7.56-36.09l-6.34-13.02c-2.16-4.43-5.06-8.08-8.15-12.04-13.25-16.98-31.29-28.74-51.71-34.78-9.98-2.95-20.04-4.92-30.4-6.04l-8.64-.93-.68-21.24-.29-4.49h-14.95s.09.37.09.37h11.12s.12,1.95.12,1.95l-9.43-.15-2.28-.12.08-2.05h-.77s.07,1.97.07,1.97l-2.32-.04-7.45-.13-2.02-.03-.22-1.76h-.75s-.09,1.61-.09,1.61l-2.53-.05-6.71-.14-2.04-.04-.2-1.38h-.37s0,31.67,0,31.67l.37.89v37.42s.38.51.38.51v35.01s.36.9.36.9v38.16s.38.52.38.52v40.22s.37.52.37.52v32.68s.37.89.37.89v37.88s.33.92.33.92l-.08,2.38c0,.19.05.67.09.97l.06,23.71v3.75s-.02,4.36-.02,4.36l.37.52v39.84s.36.9.36.9v38.16c.08.09.36.62.36.72l.06,8.29c.13-.12.67-.73.67-.89l.04-4.83-.39-.57v-37.98s-.36-.9-.36-.9v-37.42s-.39-.46-.39-.46l.03-10.1.08-1.9c4.35-.29,8.58-.75,12.93-1.6l.25,15.45.34,22.5.41,26.85.53,31.85h1.01s-.48-31.72-.48-31.72l-.24-15.58-.58-34.26-.23-14.21c0-.25,0-1.11.24-1.17l1.11-.28-.9,10.06c-.05,15.21,5.16,29.07,14.36,40.91l.09,4.09.14.86v15.92s.38.47.38.47v17.06c.09.12.37.53.37.6v4.27s0,.83,0,.83v.78s.01.67.01.67l.14.84c.03.16.6-.34.6-.51l-.02-3.84-.37-.54v-16.07s-.36-.46-.36-.46v-16.68c-.04-.13-.33-.77-.33-.94v-4.21s0-2.2,0-2.2l.34.24c2.59,2.85,5.07,5.61,8.19,7.86l4.94,3.55c.15.11.65.47.65.6l.02,2.59-.02,4.35c0,.16.27.83.35.96l.06,13.16.36,1.23-.04,10.54c.02.07.6.53.62.37l.13-.85.02-7.98c0-.23-.28-.91-.36-1.03l-.02-13.7-.34-.47-.08-8.96,6.12,3.01c5.99,2.94,12.53,4.06,19.29,4.34,16.21.67,31.68-5.9,43.12-17.06,12.66-12.34,18.57-28.65,16.78-46.49-.81-8.01-2.37-15.65-4.41-23.47l.33-.18,2.18,4.13,6.87,11.71,5.61,8.62,15.96,25.76,10.45,19.73,7.74,19.21,6.19,20.27.87,3.26.87-.04-.57-2.2-5.17-17.54-6.94-18.48-1-2.33-7.57-15.16-1.62-2.88-4.01-6.81-2.92-4.92-4.66-7.64-8.77-13.61-10.03-16.42c-2.37-3.87-3.93-7.96-5.29-12.29-4.43-14.16-2.97-29.89,1.07-44.04l3.18-11.13,2.99-10.02,5.4-18.38c4.54-15.43,7.17-29.17,7.2-45.46.03-14.38-3.07-30.78-9.66-43.27l-2.98-5.64-2.39-3.97-6.25-8.65-6.49-6.99c-7.36-7.04-15.69-12.67-24.76-17.29l-5.35-2.49c-5.89-2.75-12.01-4.52-18.34-5.87l-7.39-1.58c-6.95-1.28-13.73-2.24-20.83-2.77l-.76-.34.69-.53,12.62,1.47c5.5.64,10.76,1.79,16.19,3.05,18.15,4.2,34.69,12.75,48.25,25.67,6.48,6.17,11.71,13.08,16.04,20.86,2.59,4.66,4.74,9.32,6.55,14.39l.22.61.34,1.01c3.22,9.71,5.03,19.74,5.06,30.04l.02,4.56c.04,10.66-1.55,20.95-4.05,31.32l-8,28.64-4.29,14.25-4.61,17.85c-1.46,5.67-1.6,11.31-1.59,17.16.03,14.25,4.75,25.14,12.09,36.85l3.03,4.83,4.69,7.24,5.7,8.86,5.54,8.97,4.17,7.02,4.13,7.1.39.69,2.59,4.88,1.99,3.94,3.09,6.6,1.31,2.96.23.57.26.63.33.81.23.58.51,1.3c4.14,10.54,7.62,21.14,10.4,32.13l.19,1.04c.05.29.5.79.9.9-3.62-15.29-8.65-29.91-15.11-44.22l-4.11-8.21-2.86-5.34-7.58-12.91-3.96-6.49-5.66-8.88-4.84-7.48-9.71-15.99-2.15-4.54c-7.61-16.04-5.84-35.01-.93-51.83l3.99-13.65,2.75-9.09,1.81-6.06,3.57-12.53,1.67-6.41.85-3.69.21-.91c2.8-12.4,4.06-24.86,3.34-37.64-.88-15.7-5.34-30.67-13.27-44.15-2.96-5.03-6.15-9.51-10.04-13.88l-7.45-7.45-7.86-6.32c-5.45-4.38-11.5-7.58-17.87-10.4l-2.91-1.29c-12.57-5.57-32.06-8.92-46.28-10l-.71-.15-.04-1.01c0-.26.09-1.03.32-1l2.23.25,2.59.11c.17,0,.8.19.97.25l3.05.13c.17.11.45.3.51.3h.77s1.11.03,1.11.03c.16,0,.7.2.86.27l2.73.15.51.22.73.11,1.45.22,1.82.28.86.15,1.18.21,1.04.2,1.48.29.77.15.84.17.66.15.89.2,1.89.43,1.48.35,1.5.38,1.47.39,1.32.38.76.17,4.97,1.66,3.54,1.18.6.31.58.2.49.17.53.25.5.21.62.17.49.27.49.27.51.21.85.31.51.19.74.37,1.04.52,1.17.58.54.27,1.21.6,1.03.52c6.88,3.45,13.04,7.8,18.89,12.76l6.74,6.37c6.11,6.36,11.19,13.49,15.13,21.38l.39.78.5,1.02,1.89,3.83.24.8.21.43.46.97.26.55.51,1.31.3.77.2.63.35.9.38.97.96,2.77.34,1.08.33,1.22.48,1.77.28,1.07.21.82.28,1.09.23.91.39,1.7.15.74.22,1.09.16.8.21,1.11.29,2.1.18,1.26.33,2.26.11,1.82.3,1.2.06,5.04.32,1.12.06,7.77-.33,1.14-.09,5.33-.31,1.53-.06,2.22-.26,1.14-.16,2.09c-.09.17-.27.46-.27.52l-.03.75-.03.75-.25,1.11-.18,2.09-.21.54-.14.74-.15.83-.28,1.41-.38,1.9-.22,1.08-.16.78-.22,1.09-.15.72-.1.51-.15.62-.15.63-.21.85-.16.64-.21.86-.21.85-.16.64-.53,2.1-.22.88-.23.89-.43,1.71-.25.67-.2.82-.15.63-.24.86-.48,1.76-.17.49-.37,1.05-.25,1.04-.58,2-.31,1.09-.32,1.12-.43,1.49-.33,1.12-.34,1.13-.45,1.49-.33,1.11-.35,1.16-.22.78-.31,1.13-.3.67-.29,1.13-.33,1.27-.22.63-.17.51-.45,1.33-.3.88-.27,1.24-.3.9-.37,1.1-.17.5-.17.61-.29,1.07-.31,1.13-.28,1.04-.26.87-.28.74-.29.86-.28,1.25-.33,1.27-.34,1.13-.32,1.07-.16.63-.36,1.48-.22.87-.22.87-.31,1.25-.22.85-.16.64-.33,1.65-.22,1.09-.25,1.23-.3,1.8-.18,1.07-.12.72-.18,1.11-.1.77-.05,1.87-.24,1.11-.13.76.05,11.07c.08.18.26.73.28.91l.27,2.31.29,2.02.19.86.33,1.46.29,1.27.18.66.25.86.37,1.12.38,1.15.33,1.02.83,2.56.2.61.43.99,1.15,2.62.47,1,9.38,15.63,9.81,15.18,1.93,2.95.55.84,3.83,6.39c5.36,8.96,10.39,17.86,14.69,27.32l.47,1.03.26.57.46,1.03c5.88,13.29,10.36,26.95,13.63,41l.62-.35-.32-1.24-1.07-4.19-.94-3.56-6.44-19.95-.52-1.4-.42-1.11c-3.09-8.16-6.68-15.74-10.8-23.49l-15.72-26.76-11.11-17.25-8.5-14.94-.57-1.35-.33-.84-1.36-3.45-.91-2.87-.4-1.45-.4-1.45-.2-.82-.14-.83-.25-1.47-.24-1.45-.29-2.12-.21-1.03v-7.69s0-4.41,0-4.41c0-.17.19-.84.25-1l.29-2.66.36-2.26.15-.88.23-1.36.33-1.64.29-1.47.17-.85.13-.65.16-.77.3-1.42.2-.55.34-1.46.16-.69.26-.44.13-.63.18-.84.17-.64.17-.62.26-.9.31-1.09.25-.88.38-1.34.22-.77.38-1.34.19-.52.32-.87.21-1.01.39-1.31.44-1.5.26-.85.18-.56.39-1.33.44-1.51.28-.89.45-1.33.3-.89.19-.66.31-1.08.44-1.52.25-.73.3-.87.21-1.01.43-1.31.44-1.45.45-1.67.2-.74.41-1.37.28-.92.33-1.09.26-.86.2-1.03.43-1.31.44-1.46.45-1.67.4-1.47.21-.65.37-1.48.22-.88.16-.64.22-.86.22-.86.3-1.25.36-1.49.18-.82.12-.79.22-.51.15-1.61.25-.51.22-.98.16-.87.27-1.47.38-2.05.45-2.45.12-.73.1-.64.19-.85v-.75s.03-.75.03-.75l.24-.86.15-1.76.22-1.48.14-2.64c.02-.31.22-1.07.34-1.43v-18.92c-.14-.17-.36-.4-.36-.47v-.76s-.03-2.49-.03-2.49c-.13-.18-.31-.43-.31-.5l-.04-.76-.04-.73-.05-.98-.2-.86-.14-.77-.17-1.07-.26-1.61-.2-1.06-.15-.74-.4-1.91-.22-1.07-.13-.61-.15-.52-.42-1.45-.2-.67-.22-.85-.22-.85-.23-.67-.37-1.09-.18-.52-.44-1.33-.29-.88-.21-.64-.16-.49-.22-.59-.19-.51-.39-.99-.25-.63-.3-.75-.21-.51-.44-1.08-.97-2.39-.48-.99-2.14-4.26-.5-1.01-.5-.94-1.39-2.39c-7.99-13.69-19.17-24.71-32.71-32.91l-.9-.54-5.53-3.06-3.74-1.89-.49-.25-.52-.25-.95-.45-.68-.19-.48-.22-.96-.48-.54-.27-.58-.18-.52-.16-.76-.42-.84-.21-1.06-.41-1.92-.74-.51-.17-1.1-.36-.66-.22-.5-.16-3.72-1.23-.63-.11-.86-.22-.84-.21-.93-.34-.83-.19-1.1-.25-.77-.17-.91-.2-1.7-.39-.76-.15-.84-.17-.65-.13-.78-.16-1.1-.22-.75-.15-1.5-.29-.74-.11-1.47-.22-.71-.11-.52-.17-.63-.06-.73-.07-.99-.1-.91-.2-1.97-.25-2.72-.31-.85-.17-1.5-.12-1.63-.14-2.88-.24-1.06-.09c-.32-.03-1.04-.35-1.33-.53-.14-.09.85-.47.93-.46,8.24.76,16.13,1.8,24.2,3.39l10.48,2.54,12.56,4.31,1.2.53,2.34,1.07,5.8,2.86,1.15.66c8.79,5.05,16.8,10.83,23.93,18.2,6.23,6.44,11.41,13.29,15.36,21.19l2.48,4.96.8,1.83.35.81c4.82,11.15,7.61,22.75,8.2,34.98.38,8,.18,15.58-.86,23.4l-3.1,16.94-6.33,23.12-6.81,22.69-1.76,6.4-1.46,6.06-1.97,12.58c-1.02,11.45,1.06,22.71,6.39,32.72l.49.92.8,1.48.26.48.29.53.51.9,13.14,20.74,4.99,7.77,5.51,9.01,1.55,2.64c5.75,9.78,10.85,19.69,15.38,30.04l.38.86,3.53,9,.22.6,1.39,3.83.18.5,1.92,5.95.21.61,2.41,8.35.16.65.15.59.13.53.16.63.13.51.17.69.38,1.55.13.57.11.53.16.73c.03.13.18.52.28.38v-7.46l-.34-.75ZM222.58,615.23c-.08-.22-.1-.46-.06-.68-.16-.27-.19-.61-.11-.92l-.15-6.32,1.58-1.37c.13-.11.14-.64.13-.98l-1.66.98.02-8.45c0-.24-.28-.91-.37-1.03l-.02-17.79-.36-.48v-17.31s-.38-.47-.38-.47v-16.69s-.37-.47-.37-.47l-.02-16.31c-.08-.12-.38-.8-.38-1.01l.06-5.78,1.19.6.3-.56c-.45-.4-1.35-1.21-1.58-1.61v-4.72s0-3.05,0-3.05l7.14,5.22c1.73,1.27,3.23,2.42,5.66,2.38l-.07,4.55.35,1.18.05,8.49-.24.73.23.62.33,2.91.06,14.46.35.46.02,12.21.37.84-.03,12.74.35.45.1,9.95.04,3.75v.98s.24,1.33.24,1.33l.05,11.32c.07.13.35.63.35.72v6.42s-8.92,7.2-8.92,7.2l-4.15,2.46-.07-4.61c-.03-.11-.04-.23-.04-.34-.17-.34-.17-.77,0-1.11-.09-.28-.09-.59.02-.87ZM208.84,636.05l2.68-.74,1.39-.4,5.2-1.92,3.2-1.24,1.04-.4c.02.08-.29.84-.49.92l-1.01.43-2.18.9-5.4,1.99-1.52.39-3.03.93.11-.87ZM208.62,633.14c4.65-1.27,8.86-2.83,13.53-4.9l.14,2.21-13.52,4.85-.15-2.16ZM221.31,627.68l-2.73,1.29-1.09.43-1.14.42-1.31.49-1.31.49-1.07.36-1.51.43-.88.33-1.79.03c.52-.3.95-.56,1.17-.61l1.46-.35,1.46-.4,1.15-.43,3.3-1.24,1.09-.42,3.15-1.54c.17-.08.67-.07,1.17-.07-.34.27-.84.67-1.12.8ZM208.51,629.62l5.69-1.98,1.02-.4,1.18-.47,1.33-.53,4.09-2.02.43.35-4.16,2.05-1.33.52-1.35.54-.84.33-4.23,1.47c-.44.15-1.41.2-1.82.13ZM205.41,437.89l-.08-15.84,12.5-.07.08,15.84-12.5.07ZM205.52,499.19l-12.2.12-.06-7.14h12.11s.15,7.02.15,7.02ZM217.35,401.64l.23,17.27-12.37.17-.23-17.27,12.37-.17ZM204.92,401.13l.02-1.96,12.18.15-.02,1.96-12.18-.15ZM229.39,385.46l.05,11.21.17,2.19-2.8-.06-5.99-.13-3.21-.07-.09-1.92-.08-13.77-.18-2.15,6.56.17,5.29.08-.06,2.96c0,.36.21,1.18.33,1.48ZM230.23,421.77l-12.04-.12.02-1.96,12.04.12-.02,1.96ZM230.47,421.96l.25,16.08-12.35.19-.25-16.08,12.35-.19ZM217.91,419.21l-.15-17.29,12.31-.11.15,17.29-12.31.11ZM229.64,401.6l-11.97-.36.06-2.03,11.97.36-.06,2.03ZM223.46,380.18l-6.17-.17-.02-1.8,4.7.12,7.07.14.05,1.81-5.62-.09ZM209.66,419.52l2.94.12,4.81.04.2,1.77-2.36-.1-9.9-.03-.11-1.87,4.41.07ZM205.59,438.37l12.39.1-.02,1.98-12.39-.1.02-1.98ZM216.02,441.09l2.01.11.15,2.45.1,10.09.02,2.08-1.92.12-2.25-.05-8.29-.17-.18-10.92-.05-3.74,10.42.03ZM205.9,456.52l8.6.09h1.49s2.35.02,2.35.02l.03,1.83-9.11-.12-3.42-.04.06-1.77ZM207.8,459.05l1.84.02,8.77.13.13,1.98.12,9.33.03,2.26-12.6-.06-.09-2.22-.05-4.45-.02-6.98,1.87-.02ZM206.13,473.47l12.7.03v1.89s-12.7-.03-12.7-.03v-1.89ZM218.78,476.11l.15,1.85.08,8.6.02,2.27h-12.69s-.16-12.73-.16-12.73l12.6.02ZM206.35,489.52l12.81.02v1.96s-12.82-.02-12.82-.02v-1.96ZM219.19,492.18l.09,2.2.08,4.77-12.81.07-.12-7.04h12.76ZM216.05,500.69c.9,0,2.45,1.03,3.35,1.49l.16,6.4-2.11-1.08c-3.5-1.8-6.95-3.06-10.79-4.31l-.06-2.55,9.45.05ZM219.4,475.39v-1.92s12.44.04,12.44.04v1.92s-12.44-.04-12.44-.04ZM219.48,476.09l12.39.06.1,1.82.13,8.6.18,2.28-2.12-.02h-8.19s-2.2,0-2.2,0l-.11-10.75-.17-1.99ZM232.81,505.5l-6.49-4.78,3.42-.07,3.06,2.42v2.43ZM233.19,507.07c-.52-.18-1.2-.48-1.48-.69l-1.55-1.18-1.49-1.13-1.17-.79-2.41-1.63-1.28-.86c.16-.05,1.14.04,1.45.25l1.13.78,1.15.78,1.5,1.08,1.1.79,1.59,1.13,1.46,1.47ZM220,499.14v-4.34s-.12-2.62-.12-2.62h12.46s.11,4.83.11,4.83l.05,2.07-12.5.06ZM232.33,491.54l-12.55-.05v-1.99s12.55.05,12.55.05v1.99ZM220.75,500.98l1.98,1.23,4.84,3.13,4.78,3.63c.33.25.71,1.07.75,1.49-3.81-3.14-7.54-5.84-11.8-8.34l-1.57-1.12,1.03-.02ZM222.04,503.64c4,2.29,7.5,5.02,10.99,8.1l.08,5.13c-1.31.02-2.6-.36-3.72-1.2l-7.9-5.91-1.35-.88-.03-6.35,1.92,1.1ZM246.94,604.4l.74-1.1.73-1.13.46-.76.97-1.61.54-.89,1.67-3.15.28-.94,1.17-2.49.53-1.34.43-1.14.49-1.31.42-1.1.42-1.28.43-1.5.32-1.11.38-1.5.35-1.46.35-1.67.31-1.62.19-1.25.25-1.59.22-3.14.31-.47-.04-12.58c-.08-.17-.3-.75-.31-.92l-.16-2.78-.31-1.61-.17-.88-.26-2.01-.2-.86-.34-1.47-.36-1.48-.38-1.5-.39-1.52-.25-.89-.85-2.44-1.31-3.67-.41-1.03-.59-1.33-.54-1.32-2.46-4.97-.71-1.09-.42-.78-.73-1.11-.39-.77-.74-1.1-.75-1.12-.79-1.18-1.07-1.42-2.53-3.09c-2.44-2.98-5.02-5.49-7.98-8.13l.39-.59,7.55,7.68,3.77,4.8,1.01,1.52.76,1.16.74,1.12.73,1.11.45.77.93,1.61.59,1.02.91,1.58.48.99.55,1.29,1.31,2.87.45,1.05,2.59,7.84.69,2.59.33,1.5.33,1.51.36,1.64.31,1.98.2,1.28.23,1.61.27,3.76.26.92-.02,9.23c-.09.13-.32.51-.33.58l-.18,3.46-.25,1.65-.19,1.26-.3,1.98-.36,1.65-.32,1.47-.29,1.1-1.12,3.76-1.22,3.61-.42,1.07-.31.79-.35.84-1.3,2.83-.59,1.2-2.08,3.92-.55.91-.98,1.58-.75,1.18-7.1,8.91-4,3.86c.04-.38.22-1.02.37-1.18l5.44-5.63,4.52-6ZM244.63,604.33l.8-1.38.74-1.28.9-.63-1.15,2.22c-.14.28-.71.68-1.29,1.07ZM233.82,510.21l7.19,7.65,1.09,1.48,1.48,1.89.75,1.12.75,1.12.76,1.17,1,1.53.61.98,3.45,6.87.51,1.35.55,1.37.44,1.1.53,1.34.47,1.29.44,1.49.94,3.17.29,1.06.36,1.51.34,1.49.36,1.65.3,1.98.19,1.25.25,1.61.22,2.75.33.47-.11,11.87-.39,3.23-.23.18-.09-3.25.36-1.14.05-8.51-.28-1.09-.25-4.1-.23-1.63-.27-1.48-.32-1.66-.3-1.61-.33-1.29-.28-1.11-.74-2.61-2.06-6.35-.46-1.07-.47-1.16-.51-1.35-3.83-7.62-.63-.98-.92-1.53-.47-.79-.73-1.12-.73-1.13-1.49-1.86-1.52-1.85-3.73-4.07-3.1-3.06.45-.53ZM238.09,516.76l-4.39.06-.09-4.63,4.48,4.57ZM234.26,616.15l-2.24,2.24-.37-.37,2.24-2.24.37.37ZM230.2,619.28c-.38.45-.82.95-1.1,1.13l-1.16.76-1.14.75-1.13.74-.97.66-.97-.09,1.05-.66,1.63-.97.77-.46,1.53-1.13,1.47-.73ZM223.74,625.67l.82-.41,1.12-.72.76-.4,1.11-.73,1.12-.74,1.15-.76,1.09-.74,2.03-1.68,3.05-2.57c-.04.34-.21,1.11-.37,1.24l-2.8,2.23-1.91,1.52-1.12.74-1.13.75-1.19.78-1.51.97-.92.49-2.39,1.24c.4-.58.77-1.08,1.07-1.22ZM236,618.94l.06,2.54c-4.1,3.33-8.17,6-13.1,8.56l-.12-2.22,3.9-2.25c3.28-1.9,6.15-4.09,9.26-6.63ZM223.22,630.83c4.58-2.43,8.46-4.95,12.5-7.97l-.18,1.08c-3.96,2.93-7.81,5.39-12.37,7.69-.58.09-.51-.84.05-.8ZM223.27,633.42l3.97-2.12,2.85-1.64,1.52-1,4.45-3.19c-.01.28-.16,1.04-.29,1.13l-4.02,2.76-1.19.81-1.17.71-2.93,1.66-3.3,1.67.11-.78ZM236.04,595.64l-.28-2.09c-.11-.84.29-1.66.78-2.89.36-.24-.1-.5-.81-.54l.02-7.95c0-.21-.28-.89-.36-1l-.03-12.58-.33-1.05-.05-12.51-.35-.58-.02-12.95c-.08-.13-.37-.8-.37-1l.05-5.31.7.08-.67-1.82c-.19-.53-.19-1.87-.16-2.45l.1-2.18-.38-.46-.03-10.07h3.73c.49,0,1.53.46,1.85.88,2.72,3.56,5.61,7.54,7.55,11.7l2.27,4.88c2.16,4.64,3.55,9.31,4.66,14.3,5.02,22.51-1.3,45.09-17.35,61.49l-.37-2.49-.15-13.42ZM240.41,609.62l.37.37-3.92,3.92-.37-.37,3.92-3.92ZM244.31,610.32c8.23-10.16,13.43-21.96,15.28-35.04,3.5-24.79-5.62-51.3-24.3-67.69l-1.91-1.68.17-2.37c5.81,4.6,10.61,9.85,14.82,15.89l4.49,7.46,2.95,6c3.28,6.68,4.87,13.84,5.9,21.3,1.94,14.07-.15,28.22-5.84,41.19l-2.13,4.26c-3.07,6.12-6.93,11.68-11.86,16.42l-5.13,4.93-.17-2.4,7.76-8.27ZM236.77,622.05l7.62-7.54c4.04-4,6.97-8.79,9.68-13.8l1.17-2.17,2.96-6.82.37-1.11.46-1.3.43-1.12.42-1.27.39-1.51.37-1.48,1.26-5.63.19-.86.28-2.37.24-1.65.31-1.64v-14.56s-.31-1.65-.31-1.65l-.23-1.65-.32-2.35-.35-2.03-.32-1.45-.42-1.88-.34-1.52-.42-1.68-2.74-8.05-1.31-3.19-.46-1.18-3.49-6.43c-4.72-8.69-11.24-15.89-19.03-21.95l.36-.66c7.97,5.96,15.83,15.19,20.18,23.71l2.86,5.61.36.92,1.1,2.55.79,2.17,1.9,5.92.3,1.16.35,1.48.36,1.5.35,1.48.36,1.65.3,1.62.19,1.25.25,1.63.19,2.41c.01.15.24.83.33.99l-.02,13.79-.3.99-.2,2.41-.22,1.65-.23,1.43-1.22,5.68-.28,1.07-.44,1.49-2.2,6.46-4.26,9.16-5.12,7.93c-2.74,4.24-6.31,7.79-10.09,11.12l-2.38,2.1.03-.84ZM255.21,603.35l3.97-7.84.46-1.17,1.21-3.29,1.41-4.19.27-1.08.36-1.5.36-1.5.35-1.48.36-1.65.29-1.98.28-1.6.22-.9.12-2.77c0-.07.24-.42.33-.56l.02-14.07-.27-.86-.26-3.07-.19-1.27-.26-1.64-.31-1.97-.33-1.63-.38-1.87-.37-1.47-.37-1.35-.42-1.49-1.94-5.83-.43-1.03-1.31-2.94-1.97-4.34-.82-1.61-2.26-3.87c-4.66-7.99-10.7-14.8-18.15-20.89l.6-.39,6.36,5.63,6.62,7.56c3.6,4.11,6.06,8.81,8.38,13.65l2.05,4.26,1.58,4.04.49,1.33.41,1.1.42,1.29.43,1.49.31,1.11.38,1.49.38,1.49.38,1.5.35,1.46.35,1.66.29,2.35.21,1.29.25,1.64.19,4.13.31.5v10.87s-.36.5-.36.5l-.03,2.76c0,.16-.21.8-.26.96l-.23,2.71-.28,1.22-.2.88-.28,1.99-.32,1.27-.37,1.5-.38,1.53-.25,1.08-1.99,5.83-.91,2.47-.45,1.02-.56,1.34-3.12,6.18c-2.09,4.13-4.63,7.9-7.74,11.26l-5.74,6.18-5.33,4.73-.31-.63c7.49-6.13,13.59-13.24,18.35-21.56ZM233.12,499.13l-.16-6.91,2.14-.05.16,6.91-2.14.05ZM235.04,491.53h-2.2v-1.89h2.2v1.89ZM232.81,488.87l-.08-8.9c-.11-.22-.33-1.01-.33-1.26l.08-2.57h2.05s.44,12.71.44,12.71l-2.16.03ZM234.51,475.49l-2.13-.03.03-1.93,2.13.03-.03,1.93ZM232.34,472.72l.07-5.06c0-.18-.27-.87-.34-.98l-.09-7.37h2.05s.39,13.48.39,13.48l-2.08-.08ZM234.02,458.64h-2.14s0-1.97,0-1.97h2.14s0,1.97,0,1.97ZM231.93,455.99l-.25-1.9-.05-10.4-.2-2.34,2.07.02.41,14.57-1.97.05ZM233.45,440.67h-2.09s0-1.96,0-1.96h2.09s0,1.96,0,1.96ZM231.6,462.73l.1,7.79.03,2.26h-12.29s-.17-11.07-.17-11.07l-.16-2.42h2.11s10.15.04,10.15.04v2.26s.24,1.14.24,1.14ZM231.33,458.63l-12.3-.05v-1.97s12.31.05,12.31.05v1.97ZM231.23,455.96h-10.41s-1.86-.1-1.86-.1v-8.81s-.4-.75-.4-.75l.16-5.12,5.85.17,4.08.07,2.22-.04.04,7.52s.37.9.37,1.06l-.06,6ZM230.81,440.68l-6.61-.07-5.56-.15-.06-1.89,7.1.15,2.61.06,2.54-.04v1.94ZM230.75,421.65l.04-1.85,2.13.05-.04,1.85-2.13-.05ZM232.76,419.07l-1.91.09-.28-2.46-.08-12.15-.27-2.29h2.01s.52,16.81.52,16.81ZM232.25,401.55h-2.02v-1.94h2.02v1.94ZM232.1,398.85h-1.92s-.05-8.39-.05-8.39c-.08-.13-.32-.78-.33-1.02l-.06-8.38h1.82s.54,17.79.54,17.79ZM231.53,380.36l-1.92-.06.06-1.83,1.92.06-.06,1.83ZM229.62,377.86l-.18-2.08-.05-10.68c-.08-.13-.34-.8-.35-1v-5.69s1.76.05,1.76.05l.63,19.19-1.81.21ZM228.95,355.74l1.85.04-.04,2-1.85-.04.04-2ZM216.75,358.14l2.59.07,8.97.14.33,1.82.04,12.54c.09.14.37.8.37.97l-.1,4.02-7.36-.11-4.44-.16-.08-10.9c-.02-.14-.29-.65-.35-.78l.03-7.61ZM216.89,380.34l.29,18.26-12.27.19-.29-18.26,12.27-.19ZM216.59,380l-12-.12.02-1.94,12,.12-.02,1.94ZM206.66,357.83l7.46.13,1.94.03v2.24c.02.36.13,1.09.25,1.54l.11,13.27.08,2.33-4.99-.07-6.91-.1-.05-2.91-.29-16.59,2.41.12ZM192.1,377.27l-.18-19.85,11.61-.1.18,19.85-11.61.1ZM203.63,377.95l-.05,1.76-4.02-.1-7.38-.11-.03-1.86,4.8.12,6.67.19ZM192.15,392.98l.03-1.91,1.42.79c1.68.93,3.71.17,4.38-1.6.62-1.65-.09-3.62-1.78-4.31-1.54-.63-3.02-.15-4.03,1.08l-.05-6.76,7.82.1,3.73.16.24,17.84-5.45-.1-6.11-.08-.13-1.87-.08-3.32ZM192.38,388.97c0-1.41,1.14-2.55,2.55-2.55s2.55,1.14,2.55,2.55-1.14,2.55-2.55,2.55-2.55-1.14-2.55-2.55ZM192.3,398.84l11.72.16-.03,1.97-11.72-.16.03-1.97ZM192.48,418.8l-.12-17.25,11.79-.08.12,17.25-11.79.08ZM204.33,419.43l-.02,1.93-11.76-.1.02-1.93,11.76.1ZM192.65,431.73c1.52,1.41,3.46,1.55,4.87.39,1.25-1.03,1.74-3,.66-4.63-.52-.78-1.71-1.55-2.6-1.58-1.08-.03-2.16.58-3,1.31v-2.58s-.03-2.66-.03-2.66l11.83.06.18,15.66-9.83-.03-1.92-.03-.07-2.89-.08-3.03ZM192.64,429.43c0-1.5,1.21-2.71,2.71-2.71s2.71,1.21,2.71,2.71-1.21,2.71-2.71,2.71-2.71-1.21-2.71-2.71ZM192.78,438.36l11.88.06v1.94s-11.89-.06-11.89-.06v-1.94ZM192.78,440.96l12.02-.02.02,14.8-12.02.02-.02-14.8ZM204.9,456.36v1.97s-11.99-.06-11.99-.06v-1.97s11.99.06,11.99.06ZM192.84,465.92l.08-5.01.03-1.94,10,.02,1.92.06.23,7.01.05,4.45-.03,2.24-11.95-.02.02-2.25.03-3.49-.36-1.07ZM193.1,473.43l12.08.02v1.93s-12.08-.02-12.08-.02v-1.93ZM205.24,475.93l.1,12.96-12.12.1-.1-12.96,12.12-.1ZM193.21,489.52l12.19.03v1.95s-12.19-.03-12.19-.03v-1.95ZM193.24,500.73l12.27-.03-.05,2.2c-3.99-.93-7.72-1.43-11.76-1.49l-.47-.68ZM194.72,616.04l-.36-1.99v-35.36s-.37-.51-.37-.51v-33.8s-.36-.89-.36-.89l-.02-29.67-.16-2.29,1.25-.16.7-.09c.21-.03-.14-.68-.34-.7l-1.59-.12.09-2.3-.02-3.29-.11-2.13c4.41.17,8.09.63,12.18,1.69l.12,7.4c-.61.29-1.05.51-.84.41.57.64.93,1.07.94,1.48l.03,2.66.08,6,.23,16.38.02,1.19.74,42.77.05,3.46.49,34.11h0c.03.21.01.43-.06.62,0,.11,0,.23-.04.34.06.21.06.44,0,.66.06.23.05.48-.02.7.07.21.08.44.03.65.04.21.03.43-.03.63.05-.02.11-.03.16-.05l.06,4.35-2.64.63-10.22,1.14v-2.43s-.01-8.56-.01-8.56l-.12-2.12c.18-.29.31-.94.15-.8ZM194.76,637.12l-.04-2.08,12.88-1.63.03,2.16-12.87,1.55ZM207.41,637.16l-1.84.31-2.04.34-2.03.19-1.25.29h-5.51s.72-.33.72-.33c.15-.07.79-.28.96-.29l4.45-.21,1.29-.21,1.65-.26,1.98-.32,1.6-.27c.3-.03.32.92.01.75ZM206.72,632.74l-1.52.29-1.66.31-1.72.22-.95.2-3.73.23-1.64.3c-.16.03-.68-.16-.83-.2-.16-.05.31-.58.47-.58h2.9c.16,0,.79-.22.95-.28l3.04-.21,1.65-.32.86-.17,1.67-.34,1.62-.07c-.49.35-.89.6-1.1.64ZM194.74,631.31l3.26-.09c.19,0,.83-.18.99-.23l3.05-.26,2-.36,1.93-.35,1.48-.14c-.35.29-1.05.62-1.44.69l-1.19.2-2.05.35-2.54.33-5.32.2-.19-.33ZM207.8,639.3c-.14.09-.48.28-.66.32l-1.63.31-1.46.25-1.67.27-2.38.16-.97.26-3.49.1-.9-.17c-.16-.03.37-.59.54-.59l4.19-.02c.24-.14.57-.33.64-.33l2.72-.13,1.31-.26,1.24-.25,1.63-.26.68-.26c.15-.06.34.51.2.6ZM208.32,614.5l1.82-.86c.2.24-.22-.48-.31-.56-.51.16-1.43.11-1.44-.24l-.48-26.57-.06-3.53-.3-20.48-.04-1.51-.34-20.86-.02-1.17-.36-22.33-.03-3.03,1.11-.37-1.15-.79-.09-7.44c4.73,1.39,8.76,3.07,12.95,5.55l.21,7.75-.28.8.21.91.05,2.55-.05,2.55.34,1.05.05,15.98.37.54-.02,16.81.37.85v15.55s.37.58.37.58v16.6c.1.2.38,1.04.38,1.06l.04,12.34-.11.78.11,2.51.09,3.57c.05,0,.08,0,.11,0-.03,0-.1,0-.19-.02.13.27.16.58.08.87.07.28.05.59-.07.85l.05.1.27,3.58.08,4.1-3.41,1.62-10.01,3.74v-4.51s-.04-.54-.04-.54l-.27-8.44ZM209.85,638.98h-1.4c.52-.38.92-.68,1.15-.74l1.54-.37,1.69-.43,4.72-1.57,1.02-.45,1.13-.44,1.32-.51,1.45-.55c-.4.69-.83.98-1.4,1.22l-2.16.92-1.07.44-4.48,1.49-1.06.3-1.15.32-1.31.37ZM223.42,688.6c-10.12-13.58-15.31-31.48-12.13-48.14l11.09-3.89-.06,5.72c0,.19.28.92.37,1.08l.03,17.19.36.72v16.48s.4.44.4.44l-.06,10.41ZM238.21,702.29c-5.38-3.35-9.87-7.59-14.01-12.55l-.04-4.82.02-3.6c0-.16-.28-.92-.36-1.1l-.02-15.6-.36-.55v-17.42s-.37-.82-.37-.82l-.04-9.53,3.59-1.88,9.54-5.92.11,3.08c0,.19.14.72.2.9l.03,12.22.37.45v13.71s.37.46.37.46v12.83s.39.45.39.45l-.03,12.37.36.84.06,12.79c.12.26.32,1.01.31,1.27l-.13,2.41ZM316.19,614.93l.76,2.61,2.59,10.08c1.61,6.27,2.74,12.38,3.54,18.94,1.47,12.12-.59,24.22-6.71,34.73-6.46,11.09-16.26,19.56-27.97,24.64-13.92,6.03-29.19,6.06-43.07.07l-6.38-3.28-.17-2.87-.05-11.57-.36-.46v-12.83s-.39-.45-.39-.45l.02-12s-.35-.87-.35-1.05l-.05-12.87-.37-.57v-12.36s-.33-1-.33-1l-.03-6.79c14.98-11.5,25-27.54,28.89-45.74l1.63-10.63c1.19-13.98-.71-27.94-6.65-40.57l-2.69-5.72c25.11,17.3,41.65,43.78,52.17,71.43l5.97,18.26ZM233.6,390.04c12.11.99,23.79,2.97,35.44,6.11l6.5,2.21c9.1,3.09,17.23,7.92,25.09,13.61,5.2,3.76,9.63,7.86,13.9,12.61,14,15.56,22.99,39.42,22.97,60.47v5.27c-.01,9.47-1.07,18.7-3.42,27.82l-3.89,15.09-9.71,32.76-3.93,15.57c-2.03,8.05-2.08,16.33-1.21,24.77l.15,1.48-.56-1.15-1.35-4.04-7.05-17.93-1.88-4.12-2.21-4.43-2.87-5.37c-4.38-8.19-9.64-15.68-15.47-22.88l-7.22-8.13c-5.78-6.51-12.56-11.81-19.87-16.64-.54-.17-1.09-.55-1.32-.94-4.89-8.49-11.01-15.98-18.97-22.31l-1.73-53.17-.58-18.83-.75-25.19-.35-11.87.29-.76ZM233.38,437.93l-2.11.04v-6.79s-.32-1.23-.32-1.23l-.08-7.49,2.03-.04.47,15.52ZM321.2,604.71l-.08-2.49c0-.07-.2-.37-.36-.64l.05-7.36.29-1.1.19-3.11.24-1.64.19-1.26.31-2.35.34-1.67.22-1.09.31-1.45.34-1.51.43-1.9.37-1.44.32-1.11.4-1.52.39-1.49.4-1.47.33-1.14.43-1.49.32-1.12.43-1.48.33-1.13.33-1.13.44-1.49,2.44-8.08.34-1.12.44-1.47,1.75-5.74.23-.78,2.52-8.73.43-1.49.37-1.3.41-1.49.4-1.48.31-1.14.38-1.45.35-1.53.43-1.87.35-1.47.31-1.28.3-1.62.19-.86.32-1.46.33-1.5.36-1.64.3-1.97.29-1.62.15-.86.31-2.38.2-1.26.25-1.59.23-3.13c.05-.09.28-.49.28-.56v-3.23c0-.16.26-.75.36-.92l.03-14.8c-.06-.18-.28-.77-.28-.93l-.2-4.1-.16-.92-.7-4.96-.28-1.99-.35-1.65-.31-1.47-.18-.86-.27-1.63-.34-1.26-.4-1.5-.36-1.33-.41-1.5-1.45-4.13-1.5-4.11-.4-1.04-.33-.79-.46-1.08-.95-2.1-.52-1.29-1.94-3.93-.45-.72-3.49-5.87-1.44-2.28-.73-1.14-.75-1.17-.63-.8-6.12-7.37c-12.62-14-30.2-24.49-47.83-29.69l-1.32-.39-1.5-.38-1.5-.38-1.49-.37-1.5-.38-1.45-.34-1.67-.35-1.6-.3-1.64-.34-1.47-.3-.86-.18-2-.29-1.24-.28-.86-.19-2.37-.29-1.25-.19-1.63-.26-2.07-.2c-.16-.02-.76-.17-.93-.22l-3.04-.2c-.16-.05-.79-.23-.96-.23l-2.93-.13-1.49-.3c-.28.1-.28-.82,0-.79l1.28.31,3.39.22.97.19,2.05.23,1.64.21,1.62.21,2.74.31.86.15,1.62.29,1.97.32,1.62.28.86.15,1.99.31,1.67.34,1.09.22,1.43.31,1.51.37,1.49.37,1.49.37,1.49.37,1.49.38,1.49.38,1.49.39,1.16.33c4.85,1.4,9.24,3.14,13.85,5.25,15.62,7.15,29.49,18.29,39.5,32.48l1.1,1.56,6.37,10.81,3.15,6.42.55,1.36.55,1.39.36.82,3.21,9.71.28,1.14.35,1.49.36,1.51.35,1.48.37,1.65.3,1.61.22,1.25.25,1.46.57,4.14.18,1.47.13,3.29c0,.18.23.77.32.93l.04,12.57c-.05.14-.31.77-.31.93l-.12,4.11c-.11.19-.32.53-.32.6v2.87c0,.07-.22.46-.28.55l-.26,2.73-.27,2.02-.19.84-.27,2.37-.23,1.23-.28,1.47-.31,1.66-.31,1.97-.36,1.64-.33,1.49-.41,1.89-.35,1.45-.43,1.73-.22.89-.22.86-.29,1.64-.24.85-.25.89-.36,1.31-.39,1.51-.39,1.49-.39,1.47-.43,1.53-1.64,5.88-.5,1.56-1.36,4.37-.27.88-.51,1.7-2.93,9.72-.36,1.13-.27.86-1.15,3.75-.25.87-.38,1.34-.43,1.49-.31,1.1-.38,1.51-.38,1.5-.38,1.49-.38,1.49-.38,1.5-.35,1.5-.28,1.38-.23.86-.23.84-.26,2.02-.21.89-.29,1.23-.15,2.49-.33.71-.02,4.74c-.11.15-.37.51-.37.58v3.57s.31,1.03.31,1.03l.11,4.05-.33.23-.03-.81ZM324.33,618.37l-1.32-4.3-.28-1.05-.37-1.53-.33-1.48-.36-2.01-.19-2.29.25-.19.18,1.12.25,1.45.31,1.66.29,1.6.42,1.45.58,2,1.18,4.05-.62-.49Z"/>
      <rect class="st4" x="185.05" y="614.28" width=".82" height="2.92" transform="translate(-453.33 689.72) rotate(-79.84)"/>
      <path class="st4" d="M186.79,511.83l-2.09.45c-.35.08-.35-.82,0-.78l1.81-.37c.16-.03.68.18.84.23s-.38.43-.56.47Z"/>
      <g>
        <path class="st4" d="M166.01,355.29l.05.71,5.9.1,4.52.26.34-1.07h.75v25.33s0,1.52,0,1.52v15.29s.04,19,.04,19v7.14s.02,10.97.02,10.97l.32,2.08v37.23s.04,20.15.04,20.15v3.37s.02,10.06.02,10.06v4.48s-.03,4.49-.03,4.49l-.04,21.61.38.51.02,72.88v4.56s.05,9.69.05,9.69l.22,20.22.1,91.16h-.75s-.02-91.52-.02-91.52l-.23-5.26-11.98-3.84-.46-.15v3.23s-.02,40.17-.02,40.17l-.33,4.59-.02,52.57-.73.17v-8.45s-.01-.72-.01-.72v-.74s0-.79,0-.79l.04-41.67.33-5.31v-40.98s.03-31.33.03-31.33l-.53-1.32.53-.1v-2.34s.03-32.73.03-32.73l.31-5.72.04-63.63.02-4.17.02-2.61v-7.82s0-8.21,0-8.21v-8.2s.04-8.44.04-8.44l.09-1.59.11-6.39.02-11.17v-7.09s.03-11.94.03-11.94l.02-20.11v-7.85s.04-13.41.04-13.41v-8.22s.02-14.53.02-14.53l.09-3.28c0-.17-.12-.84-.15-.8l.74-.02ZM176.83,356.78h-10.81v19.81h10.81v-19.81ZM166.08,377.11l-.03,2.01,10.71.16.03-2.01-10.71-.16ZM166.02,379.73l-.03,18.16,10.88.02.03-18.16-10.88-.02ZM166,398.42l-.03,1.95,10.91.16.03-1.95-10.91-.16ZM166,401.12l-.05,17.19,11.01.03.05-17.19-11.01-.03ZM165.93,418.93l-.02,1.98,11.06.1.02-1.98-11.06-.1ZM177.22,430.93c-.15-.33-.42-1-.42-1.18l.09-5.75.03-2.28-8.68-.1-2.27-.03v2.32s.03,11.16.03,11.16l-.13,2.23,11.21.06.04-1.91.09-4.53ZM165.89,437.99l-.02,1.95,11.25.11.02-1.95-11.25-.11ZM165.89,455.57l11.28.02v-1.85s.04-11.17.04-11.17l-.12-1.83-11.2-.09.1,2.4.06,7.52c0,.06-.3.58-.37.7v2.46s.23,1.84.23,1.84ZM165.79,456.23v1.97s11.39.06,11.39.06v-1.97s-11.39-.06-11.39-.06ZM177.2,472.59v-13.66s-2.24,0-2.24,0l-6.69-.05-2.45-.05-.16,1.59v10.1s.16,2.02.16,2.02l11.37.04ZM175.32,475.31l1.94-.07-.11-1.86-11.33-.08-.04,1.88,3.27.12h6.27ZM177.2,476.03l-2.24.03h-4.69c-.47-.12-1.18-.22-1.57-.21l-3,.09v12.9s11.53,0,11.53,0l-.03-12.8ZM165.7,489.52v1.93s11.57.02,11.57.02v-1.93s-11.57-.02-11.57-.02ZM177.32,492.15h-11.67v7.27h11.67v-7.27ZM165.67,509.25l6.94-3.43,4.73-1.86-.06-3.17-6.9.26c-.68.03-4.69,2.01-4.69,2.48l-.03,5.72ZM177.6,616.16v-1.84s-1.29-1.13-1.29-1.13h1.43s-.16-2.16-.16-2.16v-82.63s-.39-.56-.39-.56l.06-11.07.06-2.11h-1.59s1.6-1.26,1.6-1.26l-.03-1.85-.03-3.36v-2.65c-4.23,1.53-7.92,3.26-11.63,5.55l.03,8.74,1.68-.94.64.45-2.34,1.67v2.14s-.04,41.29-.04,41.29l-.3,5.7-.02,33.48v4.51s-.02,14.4-.02,14.4c4.16,2.15,8.14,3.74,12.42,4.97l-.05-2.61-.04-8.74ZM176.5,629.47c.35.11,1.31.22,1.45.19l-.99-.78-11.66-4.61c-.11.11.12,1.07.38,1.17l8.07,3.14,2.75.88ZM175.29,630.87l-4.11-1.32-.86-.36-1.32-.55-1.31-.55-1.78-.76c-.14-.06-.52-.05-.68-.05s.25.58.4.65l1.32.56,1.31.56,1.09.5,6.8,2.3c.44.15,1.42.07,1.87-.06l-2.72-.92ZM177.67,633.06l-12.44-4.45v2.26c4.17,1.84,7.89,3.17,12.52,4.31l-.08-2.12ZM177.71,636.85c-.06-.52-.15-.8-.27-.9l-11.89-4.03c.03-.13-.44.53-.29.61l.66.33,3.79,1.47,8.01,2.53ZM176.89,638.3l-10.95-3.58-.72.05c-1.01.07,7.91,3.83,12.34,4.45.2-.38-.34-1.01-.67-.92Z"/>
        <path class="st4" d="M179.07,355.29l.09,1.07,6.61.1,4.08.22.03-1.39h.75v22.78s.38,1.12.38,1.12v36.03s.37.51.37.51v36.87s.37.79.37.79v36.77s.38.9.38.9v39.84s.36.52.36.52v31.83s.38.9.38.9v36.77s.37.9.37.9v38.33s.36,4.21.36,4.21v33.86s.39.79.39.79v39.11s.37.5.37.5v18.56c-.37-.08-.7-.4-.75-.74v-19.59c-.1-.15-.3-.77-.37-.97v-42.44s-.36-.52-.36-.52l-.02-28.95-.07-1.91-12.6-1.31v57.58s.38.84.38.84v37.7s-.75-.02-.75-.02v-51.4c-.09-.12-.38-.52-.38-.58v-3.3s.04-38.72.04-38.72l-.02-16.5v-59.19s-.38-.84-.38-.84v-59.55s-.07-9.39-.07-9.39v-3.35s.02-7.08.02-7.08v-9.33s-.3-3.79-.3-3.79l-.04-50.22v-7.15s-.04-13.03-.04-13.03v-7.13s.02-13.64.02-13.64l-.33-2.02v-25.32s.74,0,.74,0ZM190.26,357.08h-11.19v19.84h11.19v-19.84ZM179.22,377.35l-.05,1.98,10.95.27.05-1.98-10.95-.27ZM190.24,379.96l-11.2.06.09,18.2,11.2-.06-.09-18.2ZM179.31,398.75l-.03,2.01,11.07.15.03-2.01-11.07-.15ZM190.6,401.33l-11.27.03.04,17.21,11.27-.03-.04-17.21ZM179.38,419l-.02,2,11.21.13.02-2-11.21-.13ZM190.67,435.46l-.07-11.56-.07-2.01-4.03-.15h-7.08s.04,15.65.04,15.65l3.31.05,7.9.13v-2.12ZM190.75,440.19l-.1-1.86-7.48-.14-1.84-.08-1.88.13v1.83s2.25-.11,2.25-.11l2.22.1,6.83.13ZM190.78,449.24l-.16-5.93.13-2.34-6.49-.2-2.94-.03-1.88.03v1.78s0,11.19,0,11.19l.08,1.85,11.26.05.24-1.92-.25-4.48ZM179.52,456.31v1.9s11.4.05,11.4.05v-1.9s-11.4-.05-11.4-.05ZM191.07,458.88h-11.63v13.88h11.63v-13.88ZM191.13,473.41h-11.56v1.96h11.56v-1.96ZM191.3,485.81l-.32-1.29.08-6.08.03-2.42-2.33.04h-6.69s-2.45-.05-2.45-.05l-.16,2.01c-.03.34.16,1.2.32,1.6l-.03,6.91-.06,2.3h2.35s9.34-.07,9.34-.07l-.09-2.96ZM179.66,489.54v1.93h11.64v-1.93h-11.64ZM191.37,492.15h-11.69v7.18h11.69v-7.18ZM191.06,501.38c0,.09.53-.52.36-.53l-.82-.06h-10.86s-.02,2.48-.02,2.48c3.99-.98,7.32-1.56,11.33-1.89ZM191.74,616.44l.75-.62v-21.86s-.36-.5-.36-.5v-36.3s-.38-.9-.38-.9v-33.42s-.39-.81-.39-.81l.03-10.65-.49.13-2.96-.04c.27-.28.91-.76,1.18-.76h2.26s-.01-7.92-.01-7.92c-4.02.33-7.62.96-11.64,1.97l.08,2.37v65.79s.39.92.39.92l-.02,40.54.57-.13c.11-.03.29.05.61.14l1.51.43c.16.05.09.75-.05.77l-2.61-.7-.04,13.12,2.22.63,10.17,1.21-.02-2.36-.04-9.7c0-.25.03-.74-.1-.84l-.65-.53ZM191.73,631.31l-2.18-.11c-.06,0-.41-.2-.54-.27l-2.73-.17-.88-.21-1.61-.28-2-.3-1.21-.28c-.33-.04-.36.92,0,.72l1.82.35,1.65.32,2.68.27c.16.04.8.21.99.22l3.84.11c.16,0,.59.23.74.29s.35-.64.19-.65l-.78-.03ZM192.88,633.56l-4.36-.1c-.07,0-.55-.22-.63-.26l-2.74-.22-1.6-.3-.85-.16-2.31-.3c.23-.26.12-.14-.4.46l2.84.58,1.45.24,1.63.21,3.97.28,1.58.3c.38.07,1.16-.38,1.4-.73ZM192.68,637.13v-2.14s-12.5-1.41-12.5-1.41v2.15s12.5,1.4,12.5,1.4ZM189.85,637.75l-3.92-.29-1.64-.26-1.24-.2-2.02-.28-.66-.25c-.15-.06-.34.52-.2.6s.5.26.66.29l1.57.31.9.18,2.7.22c.16.05.8.23.98.24l3.5.1c.87.5,1.92.34,2.46-.29l-3.07-.38ZM192.11,640.17l-4.36.03c-.07,0-.53-.25-.6-.3l-3.13-.21-1.58-.26-1.87-.31c-.29-.14-.32.79,0,.68l1.23.28,2.35.23c.16.06.74.25.91.25h2.19c.07.01.34.24.5.38l5.18-.03-.82-.74Z"/>
      </g>
      <path class="st4" d="M153.71,355.3l.12.83-.18,11.06v7.49s-.06,10.07-.06,10.07l-.25,16.78-.12,20.48-.05,2.7-.37,39.03v1.94s-.19,15.27-.19,15.27l-.17,18.35,1.17.09.25-33.68.03-1.94.2-21.59.13-17.51.04-2.67.21-21.59.07-15.66.07-10.1.23-19.37h2.61l.5.73,5.41.02.06-.75h.75s-.03,3.75-.03,3.75l-.05,14.89-.2,8.33-.04,13.68v7.1s-.03,13.07-.03,13.07l-.03,26.81-.03,10.46v7.83s-.03,8.94-.03,8.94v8.27s.12,8.37.12,8.37c0,.25-.33,1.05-.44,1.24l.09,9.72v9.32s0,2.61,0,2.61l-.02,5.6-.02,5.58-.02,4.56v71.39s-.41.88-.41.88l.07,20.13-.03,18.71v68.12s-.38,1.16-.38,1.16v30.97c-.07.13-.54.58-.58.42l-.18-.8v-21.88s.38-.56.38-.56v-77.04s.14-1.6.14-1.6c.01-.17-.37-.61-.51-.74-7.3-3.43-13.61-8.15-19.35-13.77l-4.49-4.89c-3.39-3.69-5.97-7.75-8.43-12.08-6.06-10.67-9.45-22.45-10.26-34.83s1.73-28.47,6.94-38.93l3.5-7.02c4.5-8.02,10.21-15.1,17.18-21.15l4.01-3.11.81-78.95.28-30.24-.59-.62c-5.5.25-10.69.47-16.07,1.36l-7.98,1.32c-7.73,1.28-15.14,3.21-22.51,5.85-11.91,4.27-23.43,11.42-32.91,20.01-5.36,4.86-11.71,12.03-15.19,18.02l-3.17,5.47c-5.79,10.82-9.08,22.56-10.18,34.84-1.67,18.61,2.29,38.36,8.29,55.84l4.32,12.57,3.7,10.46,3.13,9.15,2.84,8.75,1.87,6.4,2.84,12.69c.91,4.09.85,8.12.82,12.33-.07,8.64-1.89,16.88-5.06,24.84l-.39.98-.23.59-1.88,4.12-1.85,3.69-2.11,3.86-6.4,10.75-7.1,11.59c-6.69,10.91-13.48,21.42-19.42,32.7l-4.13,7.85-3.23,6.46-9.84,23.38-.4,1.09-.31.82-.24.54-.81-.41,3.18-8.47,6.87-15.88,3.94-8.03,3.23-6.11,7.63-13.58,4.62-7.74,10.95-17.75,8.42-13.93,3.02-5.21,3.08-5.97c4.83-9.36,7.57-19.56,7.65-30.18l.02-2.29c.08-11.4-4.94-27.64-8.81-38.79l-5.4-15.56-5.02-14.28-.82-2.61c-4.97-15.74-8.42-30.42-8.22-47.32.15-12.92,3.06-27.71,8.74-38.93l2.02-4c3.78-7.48,10.54-16.05,16.87-21.98,10.45-9.81,22.49-17.43,36.04-22.05,12.47-4.25,25.27-6.63,38.43-7.81l7.74-.34c.04-.35.11-.76-.07-.78l-.91-.09c-6.52.31-12.77.86-19.14,1.81-14.89,2.5-28.69,5.93-41.96,13.32-8.69,4.84-16.32,10.68-23.29,17.69-3.45,3.47-6.31,7.04-9.15,11.02-4.62,6.5-8.1,13.38-10.8,20.88-8.93,24.81-5.94,51.2,1.83,75.96l1.89,6.03,9.72,27.48,3.72,11.29c2.38,7.22,4.14,14.4,5.11,21.99l.45,7.09v2.29c.02,9.22-2.14,18.11-5.95,26.45l-2.37,5.2-2.58,4.84-4.84,8.24-11.88,19.36-2.71,4.42-4.49,7.43-4.46,7.48-1.48,2.61-2.12,3.85-1.99,3.61-5.43,10.59-3.18,6.58-.37.78-8.49,21.26-.56.54-.1-.78,2.84-7.61,1.59-4.04,2.53-6.02,1.62-3.66,2.98-6.34,3.22-6.42,2.74-5.1,2.24-4.11,2.12-3.84,4.55-7.78,7.44-12.3,4.85-7.85,8.2-13.42c8.43-13.81,15.41-27.74,15.38-44.34v-1.55c-.02-11.91-4.03-25.56-7.97-36.87l-3.95-11.32-3.93-11.01-3.36-9.69-3-9.7c-3.02-9.75-4.72-19.61-5.6-29.91-.89-10.42-.24-20.38,1.93-30.58,4.54-21.32,16.25-39.31,33.56-52.59,3.13-2.4,5.97-4.51,9.29-6.43l4.96-2.87c15.92-9.22,42.65-14.22,61.37-14.58l.16-1.69-.61-.55-3.77.06c-.12.07-.51.32-.58.32l-4.32.06-1.26.29-3.47.19-1.67.22-1.62.21-2.74.32-.86.15-1.62.28-1.97.32-1.62.28-.88.16-1.86.35-1.62.31-.86.19-1.46.33-1.28.29-1.41.26-1.46.4-1.13.31-1.49.41-1.34.37-.91.22-8.13,2.74-5.61,2.23c-2.88,1.15-5.47,2.55-8.22,4.06-17.75,9.75-33.34,25.59-41.37,43.98l-1.61,3.69-.98,2.63-1.24,3.76-.44,1.34-.25.85-.25.9-.36,1.32-.4,1.53-.35,1.46-.38,1.89-.33,1.63-.3,1.61-.31,1.62-.17.88-.23,2.71-.22.95-.14,2.42c-.06.15-.29.82-.29.98v4.29c0,.07-.23.43-.38.67l.05,6.62.33,1.15v5.42s.34.78.34.78l.12,3.19.25.92.06,1.5c0,.16.17.7.23.86l.26,2.37.16.87.3,1.62.31,1.97.34,1.65.3,1.47.18.86.3,1.62.37,1.48.22.89.28,1.09.32,1.27.3,1.25.23.86.23.86.3,1.25.27.9.33,1.1.32,1.08.27.93.4,1.34.43,1.5,4.14,12.34.5,1.3.32.9.41,1.13.4,1.12.36,1.01.31.87.47,1.33.32.9.39,1.12.17.46.38,1.03.33.87.3.87.85,2.48.39.98.33.93.46,1.31,1.86,5.26.37,1.07.3.92.44,1.33.3.91.44,1.32.37,1.12.31.92.41,1.29.46,1.54.32,1.08.27.91.32,1.24.24.89.47,1.69.25.9.24.86.22,1.04.31,1.46.18.85.17.65.23.86.29,2.01.28,1.93c0,.07.17.4.26.57l.05,2.05c0,.15.27.82.36.99l-.02,12.67c-.05.16-.28.78-.3.94l-.1,1.14-.19,1.41-.3,1.82-.14.85-.22,1.38-.21.85-.15.64-.24.87-.25.88-.39,1.33-.24,1.02-.29.89-.44,1.33-.18.52-.29.84-.3.54-.28.82-.47,1.4-.33.73-.44.81-.17.83-7.3,13.56-5.5,9.1-1.87,2.98-7.17,11.47-8.46,13.89-4.39,7.55-1.22,2.16-2.23,4.1-3.73,7.09-2.62,5.25-2.84,6.04-1.85,4.1-2.27,5.24-.31.8-.21.53-.19.49-.35.87-.3.75-.53,1.35-.63,1.61-.25.64-.21.57-.25.69-.47,1.32-.33.94-1.03,2.96c-.04.11-.31.47-.4.56s-.49-.06-.45-.18l.2-.61.21-.63.16-.48.66-1.92.2-.59,3.21-8.35.29-.77.25-.57,2.37-5.48,1.39-3.08,2.61-5.57,1.8-3.78,2.16-4.18,3.87-7.33,1.72-3.12,4.25-7.34,5.44-9.07,6.55-10.62,6.86-11.01,6.86-11.41,1.62-2.87,2.35-4.36.35-.73.36-.77.25-.53.33-.74.22-.52.34-.82.68-1.61.55-1.31.49-1.3.31-.92.17-.5.21-.64.43-1.33.3-.92.41-1.47.38-1.5.43-1.7.19-.83.26-1.52.31-1.79.16-.9.4-2.02.02-13.79c-.08-.16-.31-.79-.33-.95l-.18-2.07-.29-1.62-.15-.87-.32-1.8-.26-1.45-.15-.84-.36-1.27-.25-.89-.41-1.48-.46-1.69-.26-.94-.3-1.1-.24-.87-.31-1.23-1.17-3.64-.42-1.32-.4-1.24-.28-.8-.46-1.33-.31-.91-.46-1.32-1.59-4.5-.4-1.14-.45-1.32-.3-.89-.26-.76-.33-.87-.29-.77-.48-1.33-.33-.89-.49-1.34-.41-1.15-.46-1.31-.32-.91-.46-1.31-.27-.77-.24-.53-.31-.89-.47-1.32-.32-.9-.39-1.08-2.78-8.11-.43-1.31-.98-3.17-.33-1.08-.27-.93-.39-1.33-.36-1.25-.25-.89-.25-.85-.32-1.09-.27-.9-.3-1.25-.23-.86-.23-.86-.29-1.26-.22-.85-.39-1.51-.22-.85-.29-1.64-.19-.86-.27-1.24-.3-2-.18-.88-.27-1.42-.31-2.17-.15-.88-.28-1.63-.27-2.69c-.05-.16-.21-.79-.22-.97l-.12-3.5c0-.16-.23-.72-.29-.91v-17.42c.1-.14.34-.5.34-.57l.13-3.12.21-.89.27-2,.32-2.35.34-1.65.3-1.47.18-.85.29-1.28.2-.86.35-1.44.25-.93.47-1.72.41-1.49.27-.89.44-1.34c4.77-14.66,13.27-27.95,25.02-38.84,5.79-5.36,11.72-10.15,18.62-13.81l4.16-2.21.98-.49.74-.37c3.42-1.69,6.83-3.26,10.45-4.46l7.02-2.34,1.66-.46,1.12-.32,1.5-.38,1.26-.32,1.25-.31.86-.22.88-.22,1.49-.38,1.62-.3.86-.18,1.47-.3,1.65-.34,1.97-.32,2.03-.33,1.47-.23,1.62-.25,2.71-.26c.16-.05.72-.23.88-.24l1.83-.03c.08,0,.37-.19.57-.31l3.74-.13,1.05-.26,5.28-.09.98-.25,1.84.07c.17,0,.61-.22.76-.29s-.37-.72-.52-.72l-5.82.23c-7.27.28-14.09,1.33-21.16,2.67-7.96,1.5-15.57,3.48-23.14,6.29-10.62,3.94-23.03,10.86-31.42,18.51l-4.5,4.1-3.37,3.4c-8.21,8.29-15.42,20.78-19.39,31.68l-.48,1.32-.31.94-.41,1.3-.43,1.51-.27.93-.4,1.48-.38,1.5-.37,1.49-.43,1.71-.19.87-.3,1.48-.33,1.65-.32,2-.13.85-.29,2.03-.2,3.11c0,.07-.21.44-.3.58l-.06,4.6c-.06.08-.34.62-.34.72v9.02s.34.85.34.85l.09,4.98.26,1.06.19,3.12.22,1.63.22,1.63.31,2.35.28,1.62.15.86.32,1.99.37,1.82.33,1.65.36,1.51.38,1.5.37,1.49.37,1.49.38,1.49.38,1.49.38,1.52.36,1.28.43,1.48.97,3.24,4.29,13.03.37.85.47,1.3.93,2.56.3.85.47,1.33.31.89.27.76.32.87.27.73,1.41,3.9.31.85.4,1.1.27.74.41,1.12.49,1.36,1.36,3.91.4,1.07.51,1.34,2.46,7.62,1.5,4.82.22.9.47,1.72.24.88.34,1.27.17.85.26,1.24.31,1.63.18.88.3,1.48.16,1.83c0,.06.17.36.26.51l.14,2.75.3.84v11.98s-.33.46-.33.46l-.14,2.74c-.06.16-.23.72-.25.87l-.16,1.37-.2.88-.34,1.47-.36,1.48-.42,1.49-.27.91-.29,1.24-.31.87-.18.51-.18.63-.46,1.31-.33.94-.37.96-.54,1.38-.35.75-.34.73-.23.63-.42.96-.35.73-.39.78-.36.72-.38.76-1.4,2.73-6.05,10.35-4.11,6.72-12.58,20.24c-6.09,9.8-11.65,19.51-16.78,29.8l-.5.99-1.81,3.81-2.46,5.32-3.12,7.03-.78,1.9-.39.99-2.18,5.69-.5,1.35-.21.57-.42,1.14-.35,1.02-.25.8-.77,2.52h-.71s1.4-4.42,1.4-4.42l.38-1.08.41-1.12.92-2.52.36-.95.24-.62.2-.48.42-1,.21-.63.42-1.07.52-1.3,3.08-7.07,2.24-4.84,2.4-5.03.47-.96.27-.55.36-.7,2.7-5.16,2.74-5.1,1.99-3.61,3.97-6.88,8.45-13.88,9.45-15.15,5.52-9.06,4.72-8.15.39-.87.48-.98,1.52-3.08.42-1.05.35-.78.44-.99.2-.5.34-.85.39-.98.47-1.16.4-1.1.32-1.09.32-1.09.33-1.14.23-.8.32-1.14.39-1.48.34-1.45.2-.87.17-1.37.23-1.15.21-2.46.28-.87-.05-12.92c-.12-.3-.3-.96-.32-1.23l-.16-2.11-.37-2.09-.21-1.05-.25-1.25-.31-1.61-.32-1.27-.38-1.51-.27-1.08-.23-.88-.46-1.71-.24-.9-.34-1.26-4.2-12.46-2.45-6.92-1.29-3.56-.37-1.01-.33-.9-.49-1.32-.41-1.13-.49-1.34-.9-2.5-1.87-5.22-3.48-10.33-.3-1.08-.29-.92-.42-1.35-.33-1.06-.43-1.53-.31-1.1-.42-1.51-.41-1.49-.3-1.08-.39-1.54-.38-1.49-.38-1.49-.32-1.27-.3-1.61-.31-1.65-.27-1.46-.27-1.47-.31-1.66-.32-2.35c-.07-.39-.19-1.17-.29-1.59l-.21-.92-.12-2.76c0-.07-.22-.43-.31-.57l-.07-3.48c-.05-.09-.34-.61-.34-.68v-6.32c-.13-.21-.4-.67-.4-.73l.08-5.61.32-1.06v-4.66s.32-1.24.32-1.24l.09-2.93.28-.73.2-2.13.29-1.62.16-.87.31-1.99.34-1.46.38-1.67.35-1.52.36-1.46.39-1.52.36-1.32.25-.86.82-2.68.48-1.38,2.23-5.54c5.96-14.82,17.33-28.7,30.42-38.52,2.71-2.03,5.3-3.91,8.17-5.65l1.17-.71c19.56-11.83,44.45-16.81,67.54-17.53l1-.67-.9-.78-7.52.5c-19.22,1.28-39.77,5.91-56.84,14.69-13.05,6.71-24.44,15.93-33.46,27.64-9.7,12.6-16.2,26.84-18.85,42.41-1.14,6.72-1.9,13.35-1.71,20.25.46,16.86,3.99,34.99,9.66,50.74l10.36,28.77,2.11,6.16,2.95,9.41c5.52,17.6,3.61,35.68-4.93,51.84l-1.81,3.43-3.5,6.22-1.37,2.32-5.72,9.24-9.22,14.98-6.17,10.27-5.86,10.17-2.25,4.1-2.98,5.6-3.39,6.76-8.57,20.04-2.07,5.75-.32.65-.1-1.47-.03-.72-.03-.76L0,728.9l6.82-17.05,2.28-4.87,4.32-8.66,3.13-5.84,1.99-3.61,4.48-7.83,6.81-11.44,5.24-8.58,8.69-14.04,4.87-8.2,1.86-3.35,2.88-5.72c7.06-14.02,8.35-30.18,4.23-45.49-1.92-7.15-4.19-13.91-6.71-20.86l-3.2-8.83-5.07-13.94c-6.41-17.63-10.41-35.82-10.85-54.72l.21-7.66c1.24-19.68,7.09-36.77,18.49-52.73,6.67-9.34,14.04-16.34,23.26-23.24-1.76.57-3.26,1.32-4.76,2.19-10.68,6.22-19.8,12.34-28.54,21.44-10.29,10.72-17.5,25.19-20.4,39.69-3.18,15.92-3.46,32.11-.49,48.2,1.94,10.51,4.91,20.23,8.55,30.19l8.59,23.48,2.42,7.17c5.72,16.99,7.13,35.25-1.44,51.36l-3.23,6.07-3.84,6.6-1.41,2.34-11.11,17.93-4.13,6.72-6.41,10.72-2.34,4.03-1.46,2.62-3.39,6.38-.17.32-.14-1.52c-.08-.88.33-2.32.8-3.17l1.49-2.68,3.78-6.64,3.34-5.65,8.35-13.63,9.84-15.85,3.77-6.35,6.28-11.95c3.85-8.75,5.5-19.47,4.23-29.07-.83-6.29-2.24-12.26-4.25-18.23l-2.05-6.1-1.48-4.11-4.12-11.17-3-8.14-2.62-7.47c-3.44-9.8-6.61-22.71-7.69-33.03-.8-7.58-.84-15-.39-22.62.77-13.17,3.53-26.19,9.41-37.93l.52-1.03c6.34-12.67,16.03-22.68,27.52-31.02,4.94-3.58,9.8-6.73,15.1-9.51l4.92-2.58,7.99-3.84,5.23-2.28c8.46-3.69,16.66-7.03,25.67-9.4,10.07-2.64,20.06-4.18,30.25-5.01,1.63-6.49,4.46-12.05,9.36-16.14l.06-7.88-.12-.4h1.47ZM163.39,374.32v-15.68s-.08-1.91-.08-1.91l-3.27-.05-3.83-.06-.19,19.52,3.66.09,3.58.09.13-2.01ZM152.23,379.29l.03-13.74c-4.08,4.02-6.44,8.86-7.78,14.09l7.75-.35ZM157.34,376.87l-.02,1.96,6,.07.02-1.96-6-.07ZM163,391.08c0-.08.39-.82.42-.86l-.06-8.45-.09-2.17-3.97-.03h-3.35s-.16,18.01-.16,18.01l3.16.11h4.28s-.15-2.24-.15-2.24l-.08-4.38ZM163.3,400.21l-.17-1.75-3.08.02-2.95.02-.04,1.68,1.52.2h2.59s2.14-.16,2.14-.16ZM163.07,415.49v-12.08s.05-2.31.05-2.31l-3.44-.03-3.91-.03-.15,17.01,7.48.11-.02-2.66ZM156.32,418.69h-.75v2.05h.75v-2.05ZM163.16,420.73l-.03-1.87-3.46-.06h-1.08s-1.56,0-1.56,0v1.89s2.31-.05,2.31-.05h1.43s2.39.1,2.39.1ZM163.05,421.46l-1.91-.08-2.19-.02-3.37.06-.13,15.56,3.09.29,4.52-.02v-15.79ZM155.58,440.25l1-.93-.81-1.77-.4,2.07c-.02-.06.01.05.2.63ZM156.75,437.92v2s6.35.04,6.35.04v-2s-6.35-.04-6.35-.04ZM155.3,440.52l-.05,14.92,7.78.02.05-14.92-7.78-.02ZM156.2,456.72c.02-.27-.8-.88-.9-.78l-.08,2.36c.22-.02.9-.2.91-.41l.07-1.17ZM156.7,456.11v2.09s6.3.03,6.3.03v-2.09s-6.3-.03-6.3-.03ZM163.02,458.84l-2.25.04-1.9-.02-2.91-.1c-.25,0-.81.69-.81.96l-.07,12.69,5.32.06,2.61.02v-13.65ZM155.95,473.13h-.75v2.24h.75v-2.24ZM156.61,473.12v2.04s6.35.02,6.35.02v-2.04s-6.35-.02-6.35-.02ZM154.94,475.87l-.05,12.98,8.15.03.05-12.98-8.15-.03ZM155.93,490.13c-.03-.29-.97-.82-.97-.58l-.02,2.15c.61-.04,1.08-.8.99-1.58ZM156.5,489.51v1.95s6.53.02,6.53.02v-1.95s-6.53-.02-6.53-.02ZM154.86,492.11l-.03,7.37,8.2.04.03-7.37-8.2-.04ZM161.62,632.65c-5.14-2.64-10.09-5.51-14.22-9.63l-7.47-7.44c-7.93-9.08-14.07-21.15-16.85-32.79l-.27-1.12-.31-1.49-.34-1.65-.31-1.97-.26-1.63-.2-1.25-.18-2.76-.3-1.17-.04-11.03.28-1.11.22-3.37.2-.96.2-2.08.17-.87.29-1.48.45-2.26,1.74-6.59,1.91-5.8.42-1.01,1.3-2.98c2.69-6.13,5.93-12.04,10.42-17.07l5.64-6.33,6.75-5.95.56-.37c.14-.1,0-.66-.17-.61l-.8.21-8.74,8.06-6.36,7.86c-3.09,3.82-5.27,8.08-7.29,12.44l-1.04,2.26-.92,2.16-.3.78-2.02,5.87-.31.78-1.86,7.79-.24,1.26-.29,1.99-.25,1.64-.2,1.25-.18,3.12c0,.16-.32.91-.32,1.1l-.02,11.1c.13.23.34.59.35.65l.18,3.46.25,1.65.19,1.26.32,1.98.33,1.64.37,1.89.26,1.11c1.57,6.59,3.94,12.62,7.15,18.59,7.57,14.12,18.51,24.88,32.66,32.11.11-.26.28-.83.13-.9l-.7-.32ZM161.86,630.97h.79s-.91-1.07-.91-1.07c-8.13-4.23-15.04-9.95-21.01-17.02-4.43-5.42-8.15-11.07-10.84-17.46l-.89-2.12-2.25-6.09-.41-1.46-.31-1.16-.39-1.48-.4-1.53-.23-1.04-.3-1.48-.33-1.65-.32-1.98-.21-1.63-.22-1.66-.18-3.81c0-.07-.24-.46-.33-.6v-7.59c.09-.14.33-.54.34-.61l.17-4.17.22-1.67.21-1.63.32-1.98.34-1.66.22-1.1.31-1.47.37-1.52c1.07-4.42,2.58-8.46,4.26-12.59l.35-.86,2.11-4.12,2.75-4.79c3.49-6.08,7.98-11.48,13.37-15.98l5.74-4.8-1.18-.04-8.71,7.7-2.82,3.18c-3.57,4.03-6.75,8.36-9.16,13.19l-2.73,5.48-.56,1.3-.45,1.04-1.74,4.57-.28.86-.53,1.73-1.19,4.16-.35,1.48-.33,1.47-.19.86-.28,2-.23,1.24-.24,1.26-.18,2.05-.25.99-.11,3.91-.34.8v6.49c0,.06.25.59.29.68l.22,4.15.22,1.64.22,1.65.31,2.35.36,1.64.32,1.49.42,1.91.36,1.44.36,1.34.41,1.49c1.1,4.03,2.48,7.87,4.54,11.46l5.18,9.03c7.03,10.32,15.25,17.74,26.26,23.76ZM129.71,586.98c-2.6-8.02-3.76-16.19-3.59-24.71.13-6.54.64-12.85,2.71-18.92l2.94-8.66c2.66-6.51,6.08-12.35,10.44-17.84,3.62-4.55,7.5-8.59,12.23-12.01l3.02-2.19,2.38-1.63-3.95-.06-4.42,3.52c-10.35,8.24-18.01,19.75-22.51,31.94-6.86,18.59-6.61,39.08,1.1,57.3,6.53,15.43,17.34,27.65,32.25,35.73v-2.47c-15.82-8.57-27.16-23.26-32.6-39.98ZM140.29,605.17l-.75-1.11-.76-1.18-1-1.56-.54-.91-1.51-2.75-1.21-2.41-1.17-2.57-.41-1.04-1.13-3-.84-2.5-.96-3.19-.43-1.65-.34-1.48-.36-1.66-.29-1.99-.16-.88-.3-1.61-.19-2.76c0-.07-.22-.4-.33-.56l.04-13.52.34-1.58.21-1.69.3-2.35.34-1.62.4-1.9.33-1.48.34-1.51.29-1.12,2.07-6.3.39-.9.52-1.33.46-1.15.42-.99,5.81-10.51.78-1.16,1.12-1.47,3.51-4.35,4.94-5.12,5.27-4.42,3.45-2.52,1.12-.76,1.74-1.16c.57-.1.48-.25-.12-.37l-1.16.57-1.61.93c-5.09,3.44-9.92,7.14-13.76,11.95l-3.83,4.79-1.39,1.94-3.08,4.82-3.98,7.84-.33.89-1.29,3.63-.81,2.41-.8,2.59-.44,1.68-.37,1.51-.34,1.46-.4,1.92-.34,1.63-.17,2.4c0,.07-.19.4-.31.62l-.02,3.46c0,.07-.22.42-.38.69l.04,10.3.3,1.13.19,3.1.24,1.64.18,1.25.32,1.62.36,1.65.34,1.48.36,1.52.43,1.66,2.29,6.9.5,1.09.57,1.4,3.2,6.45.71,1.08.42.79.73,1.12.75,1.15,1.02,1.55c2.41,3.67,5.24,6.8,8.36,9.94,3.69,3.71,7.71,6.78,12.23,9.41l1.8,1.05-.1-.76-1.71-1.04c-7.83-4.77-14.95-11.44-20.11-19.04ZM161.8,622.14l-5.28-3.77c-7.54-5.38-15.04-15.65-19.1-24.17-5.69-11.95-7.73-25.16-6.25-38.39.95-8.5,2.99-16.56,6.96-24.08l3.21-6.09c3.41-5.64,7.47-10.71,12.33-15.23,2.9-2.69,6.04-4.57,9.3-6.79l-.47-.54c-12.01,7.21-21.13,17.81-26.78,30.43-7.46,16.66-8.56,34.63-3.15,52.21,2.2,7.16,7.42,17.29,12.27,22.68l3.9,4.33c3.88,4.32,8.49,7.71,13.5,10.67.11-.27-.1-1.03-.44-1.27ZM162.81,511.3l-.04-2.03v-1.45s.02-3.07.02-3.07l-1.91,1.3-5.76,4.25-2.99,2.69,7.54-.1c.85-.01,2.49-1.22,3.14-1.6ZM162.18,620.64l.16-2.89-.03-6.02c0-.16.28-.85.35-1.06v-84.87s.05-2.22.05-2.22c-.1-.05-.76-.4-.57-.3.41-.84.59-1.81.59-2.75v-4.51s.05-2.94.05-2.94c-1.03.54-2.12,1.19-2.92,1.22l-7.95.29-3.95,4.26c-3.15,3.41-5.47,7.38-7.51,11.54l-1.22,2.48c-2.05,4.15-3.48,8.4-4.69,12.86-3.93,14.45-3.03,30.44,2.63,44.23,2.12,5.17,4.4,10.1,7.95,14.44l4.54,5.55c3.85,4.14,7.83,7.68,12.52,10.7Z"/>
    </g>
  </g>
  <g id="discription">
    <g>
      <line class="st0" x1="282.32" y1="132.01" x2="282.32" y2="132.01"/>
      <polyline class="st0" points="282.32 132.01 282.32 132.01 282.32 132.01"/>
      <path class="st0" d="M253.02,64.01h-13.3c-14.2-10.7-31.9-17-51-17s-36.8,6.3-51,17h-13c-18.1,17.1-29.3,41.2-29.3,68h-.2l.1.1c0,51.6,41.8,93.5,93.5,93.5v-.1c51.6,0,93.5-41.8,93.5-93.5h0c0-26.8-11.2-50.9-29.3-68Z"/>
    </g>
    <g id="right">
      <g class="st1">
        <path d="M166.05,258.92c.13.14.2.31.2.51s-.07.37-.2.5c-.14.13-.3.2-.5.2h-10.55c-.1,0-.17.05-.21.15-.58,1.49-1.24,2.84-1.96,4.05-.01.04-.01.08.01.11.02.03.05.04.07.04h10.49c.34,0,.64.12.88.36s.37.54.37.9v7.91c0,.21-.07.39-.22.54s-.33.22-.53.22-.38-.07-.53-.22c-.15-.15-.22-.33-.22-.54v-.26c0-.09-.04-.13-.13-.13h-9.68c-.1,0-.15.05-.15.15v.38c0,.2-.07.37-.21.51s-.31.21-.51.21-.37-.07-.5-.21c-.14-.14-.2-.31-.2-.51v-7.63s-.01-.05-.04-.05c-.03,0-.05,0-.06.03-1.02,1.38-2.18,2.58-3.47,3.6-.16.13-.34.17-.54.14-.21-.04-.37-.13-.5-.29-.11-.13-.17-.28-.17-.45,0-.23.08-.41.26-.55,2.54-1.93,4.55-4.7,6.01-8.31.01-.03.01-.06-.01-.1-.02-.04-.05-.05-.07-.05h-5.12c-.2,0-.37-.07-.5-.2-.13-.14-.2-.3-.2-.5s.07-.37.2-.51c.14-.14.3-.21.5-.21h5.61c.11,0,.18-.05.21-.15.37-1.07.67-2.14.92-3.22.06-.2.17-.36.34-.49.13-.09.27-.13.43-.13.04,0,.09,0,.15.02.21.04.38.15.49.33.11.18.14.37.09.56-.27,1.08-.55,2.05-.85,2.92-.01.04-.01.08.01.11.02.03.05.04.1.04h10.04c.2,0,.37.07.5.21ZM163.14,266.04c0-.11-.05-.17-.15-.17h-9.63c-.11,0-.17.06-.17.17v5.67c0,.11.06.17.17.17h9.63c.1,0,.15-.06.15-.17v-5.67Z"/>
        <path d="M175.02,256.96c-.1.03-.15.09-.15.19v3.86c0,.1.05.15.15.15h3.45c.18,0,.34.07.48.2.13.14.2.3.2.48s-.07.34-.2.48-.3.2-.48.2h-3.45c-.1,0-.15.05-.15.15v1.3c0,.1.04.19.13.26.58.47,1.75,1.46,3.5,2.98.16.14.25.32.28.53.03.21-.02.4-.15.58-.11.14-.27.22-.46.23-.19.01-.35-.05-.48-.19-.68-.7-1.58-1.56-2.71-2.6-.01-.01-.04-.02-.06-.01-.03,0-.04.03-.04.07v7.91c0,.2-.07.37-.2.5s-.3.2-.49.2-.36-.07-.5-.2-.21-.3-.21-.5v-8.89s0-.04-.02-.04-.03,0-.04.02c-1.12,2.47-2.36,4.48-3.71,6.03-.13.13-.28.18-.47.15-.19-.03-.33-.12-.43-.29-.1-.16-.15-.34-.15-.52v-.11c.03-.23.12-.42.28-.58.78-.85,1.55-1.9,2.3-3.13.75-1.24,1.37-2.47,1.85-3.71.01-.04.01-.08-.01-.11-.02-.03-.05-.04-.07-.04h-3.47c-.19,0-.34-.07-.48-.2-.14-.13-.2-.29-.2-.48s.07-.34.2-.48.29-.2.48-.2h3.79c.1,0,.15-.05.15-.15v-3.56c0-.1-.05-.14-.15-.13-1.25.23-2.43.42-3.54.58-.17.01-.33-.02-.48-.12-.15-.09-.26-.22-.33-.39-.06-.14-.05-.28.02-.42.07-.14.18-.22.32-.25,3.4-.51,5.98-1.08,7.74-1.71.17-.06.33-.08.47-.08.3,0,.57.12.81.36.13.13.17.28.14.46-.04.18-.14.3-.31.35-.82.28-1.87.57-3.13.85ZM181.88,268.89c-.14.14-.31.21-.5.21s-.36-.07-.5-.21-.21-.31-.21-.49v-10.53c0-.2.07-.37.21-.5.14-.13.31-.2.5-.2s.36.07.5.2c.14.14.21.3.21.5v10.53c0,.19-.07.35-.21.49ZM186.04,255.74c0-.2.07-.37.21-.51s.31-.21.51-.21.37.07.51.21c.14.14.21.31.21.51v16.77c0,.5-.07.88-.22,1.14-.15.26-.39.46-.71.59-.53.17-1.55.26-3.07.26h-.02c-.23,0-.43-.07-.62-.2-.19-.14-.31-.32-.38-.54-.03-.06-.04-.12-.04-.19,0-.1.03-.19.08-.28.1-.14.23-.21.41-.21h2.58c.2-.01.34-.06.43-.14.08-.08.13-.22.13-.42v-16.77Z"/>
        <path d="M207.16,261.43c.18-.07.36-.06.53.03.17.09.27.23.3.42.01.07.02.14.02.19,0,.13-.04.26-.11.38-.1.18-.25.31-.45.36-.85.26-1.81.48-2.88.68-.11.03-.15.09-.11.19.5,1.08,1.04,2.2,1.64,3.35.07.16.11.31.11.45,0,.2-.07.38-.21.55-.21.27-.48.4-.79.4-.07,0-.14,0-.19-.02-.71-.1-1.68-.23-2.92-.41-.17-.01-.31-.09-.42-.22-.11-.13-.15-.29-.13-.46.02-.17.1-.31.22-.4.13-.1.28-.14.45-.13.67.09,1.36.16,2.07.23.04,0,.07-.01.09-.04s.01-.06,0-.09c-.27-.57-.72-1.56-1.36-2.98-.04-.1-.12-.14-.23-.13-1.59.21-3.41.32-5.46.32-1.05,0-2.17-.03-3.35-.09-.2-.01-.37-.09-.51-.23-.16-.16-.23-.34-.23-.55,0-.17.07-.32.21-.45.13-.13.29-.18.49-.17,1.29.1,2.54.15,3.75.15,1.58,0,3.09-.08,4.54-.26.1-.01.13-.07.09-.17-.44-.99-.7-1.6-.79-1.81-.04-.1-.11-.25-.2-.46-.09-.21-.16-.36-.2-.46-.03-.1-.1-.14-.21-.13-1.11.1-2.23.15-3.37.15s-2.24-.05-3.39-.15c-.2-.01-.37-.1-.52-.25s-.23-.33-.25-.54c-.01-.18.05-.34.18-.47.13-.13.29-.18.48-.17,1.36.13,2.64.19,3.84.19.85,0,1.67-.03,2.45-.09.1-.01.13-.07.08-.17-.1-.26-.18-.45-.26-.6-.13-.28-.24-.52-.34-.7-.1-.2-.1-.4-.01-.6s.25-.32.46-.36c.07-.01.14-.02.21-.02.17,0,.33.04.49.13.21.13.36.32.45.58.14.41.31.88.51,1.41.04.1.11.14.21.13,1.29-.2,2.46-.46,3.5-.79.18-.06.36-.04.53.06.17.1.27.24.3.43.04.2.01.39-.1.56-.11.18-.26.3-.46.35-.99.27-2.07.5-3.22.68-.11.01-.15.07-.11.17l.32.75c.1.23.38.88.85,1.96.04.08.11.12.21.11,1.18-.23,2.24-.5,3.18-.81ZM193.97,267.76c.06-.21.18-.38.36-.5.18-.12.38-.17.6-.16.2.03.35.12.45.28.1.16.12.33.06.51-.18.61-.28,1.11-.28,1.49,0,.9.37,1.58,1.12,2.07.75.48,1.88.73,3.4.73,1.61,0,3.1-.11,4.48-.32.2-.04.37,0,.52.14.15.14.22.3.22.5-.01.23-.1.43-.25.6-.15.17-.33.27-.54.3-1.41.18-2.86.28-4.37.28-1.95,0-3.44-.33-4.49-1-1.04-.67-1.57-1.65-1.57-2.94,0-.6.09-1.25.28-1.96Z"/>
        <path d="M229.31,255.68c.34,0,.63.12.88.37.25.25.37.54.37.88v15.01c0,.5-.08.87-.22,1.13s-.39.44-.73.55c-.47.17-1.56.26-3.26.26h-.02c-.2,0-.38-.07-.55-.2s-.3-.31-.38-.52c-.06-.16-.04-.31.05-.45.09-.14.22-.21.37-.21.54.01,1.03.02,1.47.02.47,0,.89,0,1.28-.02s.58-.2.58-.55v-4.52c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v5.67c0,.2-.07.37-.21.51-.14.14-.31.21-.51.21s-.37-.07-.51-.21-.21-.31-.21-.51v-5.67c0-.1-.06-.15-.17-.15h-5.29c-.11,0-.18.05-.19.15-.36,2.56-1.11,4.6-2.26,6.14-.13.14-.28.21-.47.21s-.35-.06-.49-.19-.23-.29-.26-.49c-.01-.03-.02-.06-.02-.11,0-.14.05-.28.15-.41.53-.71.95-1.55,1.28-2.52.41-1.21.66-2.28.76-3.23.09-.94.14-2.05.14-3.31v-6.59c0-.34.12-.64.37-.88.25-.25.54-.37.88-.37h13.28ZM216.11,265.74c-.01.11.04.17.15.17h5.16c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.07c-.11,0-.17.06-.17.17v1.26c0,.8-.02,1.53-.06,2.22ZM221.59,257.19c0-.1-.06-.15-.17-.15h-5.07c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.07c.11,0,.17-.06.17-.17v-3.37ZM228.97,260.73c.11,0,.17-.06.17-.17v-3.37c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.75ZM223.04,265.76c0,.1.06.15.17.15h5.75c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.75c-.11,0-.17.06-.17.17v3.5Z"/>
      </g>
      <g>
        <path class="st2" d="M126.97,191.19c-11.25-4.25-19.66-11.26-23.91-20.97s-3.69-20.57.77-31.67l.05-.13c-2.34-34.78,17.01-68.9,50.72-83.65,33.71-14.75,71.9-5.81,95.86,19.51l.09-.04c11.25,4.25,19.66,11.26,23.91,20.97,4.25,9.71,3.69,20.65-.82,31.8v-.03s-.03.05-.03.05h.03c2.34,34.77-17.01,68.88-50.72,83.63-33.3,14.57-70.96,6.02-94.97-18.58l-.98-.89Z"/>
        <path class="st3" d="M188.65,62.31h.17c.99,0,1.98.02,2.96.06.28.01.51-.2.52-.48s-.2-.51-.48-.52c-1-.04-2-.06-3-.06h-.17c-.28,0-.5.23-.5.5s.23.5.5.5h0ZM180.77,62.77c.98-.11,1.96-.2,2.95-.27.28-.02.48-.26.46-.53s-.26-.48-.53-.46c-1,.07-2,.16-2.99.28-.27.03-.47.28-.44.55s.28.47.55.44h0ZM172.99,64.1c.96-.22,1.93-.42,2.9-.6.27-.05.45-.31.4-.58s-.31-.45-.58-.4c-.99.18-1.97.39-2.94.61-.27.06-.44.33-.38.6s.33.44.6.38ZM165.41,66.3c.93-.33,1.87-.64,2.81-.92.26-.08.41-.36.33-.62s-.36-.41-.62-.33c-.96.29-1.91.61-2.85.94-.26.09-.4.38-.31.64s.38.4.64.31h0ZM158.14,69.33c.88-.43,1.78-.84,2.68-1.23.25-.11.37-.4.26-.66s-.4-.37-.66-.26c-.92.4-1.83.82-2.72,1.25-.25.12-.35.42-.23.67.12.25.42.35.67.23h0ZM151.25,73.17c.83-.53,1.68-1.04,2.53-1.53.24-.14.32-.44.18-.68s-.44-.32-.68-.18c-.87.5-1.72,1.02-2.57,1.55-.23.15-.3.46-.16.69s.46.3.69.16h0ZM144.82,77.75c.77-.62,1.55-1.22,2.35-1.8.22-.16.27-.48.11-.7s-.48-.27-.7-.11c-.81.59-1.6,1.2-2.38,1.83-.22.17-.25.49-.08.7s.49.25.7.08h0ZM138.95,83.02c.7-.7,1.41-1.38,2.13-2.05.2-.19.22-.5.03-.71s-.5-.22-.71-.03c-.74.68-1.46,1.37-2.16,2.08-.19.2-.19.51,0,.71s.51.19.71,0h0ZM133.7,88.91c.62-.77,1.25-1.53,1.89-2.28.18-.21.16-.52-.05-.71s-.52-.16-.71.05c-.66.76-1.3,1.53-1.92,2.31-.17.22-.14.53.08.7s.53.14.7-.08h0ZM129.13,95.36c.53-.84,1.07-1.66,1.63-2.48.16-.23.1-.54-.13-.7s-.54-.1-.7.13c-.57.83-1.12,1.66-1.65,2.51-.15.23-.08.54.16.69s.54.08.69-.16h0ZM125.32,102.28c.43-.89.88-1.77,1.34-2.65.13-.24.04-.55-.21-.68s-.55-.04-.68.21c-.47.88-.92,1.78-1.36,2.68-.12.25-.01.55.23.67s.55.01.67-.23h0ZM122.3,109.59c.33-.94.67-1.86,1.03-2.78.1-.26-.02-.55-.28-.65s-.55.02-.65.28c-.37.93-.72,1.87-1.05,2.82-.09.26.05.55.31.64s.55-.05.64-.31h0ZM120.14,117.18c.22-.97.45-1.92.71-2.87.07-.27-.09-.54-.35-.61s-.54.09-.61.35c-.26.96-.5,1.94-.72,2.92-.06.27.11.54.38.6s.54-.11.6-.38h0ZM118.84,124.96c.11-.98.24-1.96.38-2.94.04-.27-.15-.53-.42-.57s-.53.15-.57.42c-.15.99-.28,1.98-.39,2.98-.03.27.17.52.44.55s.52-.17.55-.44h0ZM118.42,132.84v-.13s0,0,0,0c0-.95.02-1.89.06-2.83.01-.28-.2-.51-.48-.52s-.51.2-.52.48c-.04.95-.06,1.91-.06,2.87h0s0,.13,0,.13c0,.28.22.5.5.5s.5-.22.5-.5h0ZM118.87,140.72c-.11-.98-.2-1.96-.27-2.95-.02-.28-.26-.48-.53-.46s-.48.26-.46.53c.07,1,.16,2,.28,2.99.03.27.28.47.55.44s.47-.28.44-.55h0ZM120.19,148.5c-.22-.96-.42-1.93-.6-2.9-.05-.27-.31-.45-.58-.4s-.45.31-.4.58c.18.99.39,1.97.61,2.94.06.27.33.44.6.38s.44-.33.38-.6h0ZM122.39,156.08c-.33-.93-.63-1.87-.92-2.81-.08-.26-.36-.41-.62-.33s-.41.36-.33.62c.29.96.6,1.91.94,2.85.09.26.38.4.64.31s.4-.38.31-.64h0ZM125.42,163.36c-.43-.89-.84-1.78-1.23-2.69-.11-.25-.4-.37-.66-.26s-.37.4-.26.66c.4.92.81,1.83,1.25,2.72.12.25.42.35.67.23s.35-.42.23-.67h0ZM129.25,170.25c-.53-.83-1.03-1.68-1.53-2.53-.14-.24-.44-.32-.68-.18s-.32.44-.18.68c.5.87,1.01,1.72,1.55,2.57.15.23.46.3.69.16s.3-.46.16-.69h0ZM133.82,176.67c-.62-.77-1.22-1.55-1.8-2.35-.16-.22-.48-.27-.7-.11s-.27.48-.11.7c.59.81,1.2,1.6,1.83,2.38.17.22.49.25.7.08s.25-.49.08-.7h0ZM139.09,182.55c-.7-.7-1.38-1.41-2.05-2.13-.19-.2-.5-.22-.71-.03s-.22.5-.03.71c.68.74,1.37,1.46,2.08,2.16.2.2.51.19.71,0s.19-.51,0-.71h0ZM144.98,187.81c-.77-.62-1.53-1.25-2.28-1.89-.21-.18-.52-.16-.71.05s-.16.52.05.71c.76.66,1.53,1.3,2.31,1.92.22.17.53.14.7-.08s.14-.53-.08-.7h0ZM151.43,192.37c-.84-.53-1.66-1.07-2.48-1.63-.23-.16-.54-.1-.7.13s-.1.54.13.7c.82.57,1.66,1.12,2.51,1.65.23.15.54.08.69-.16s.08-.54-.16-.69h0ZM158.34,196.19c-.89-.43-1.77-.88-2.65-1.34-.24-.13-.55-.04-.68.21s-.04.55.21.68c.88.47,1.78.93,2.68,1.36.25.12.55.01.67-.23s.01-.55-.23-.67h0ZM165.65,199.21c-.94-.33-1.86-.67-2.78-1.04-.26-.1-.55.02-.65.28-.1.26.02.55.28.65.93.37,1.87.72,2.82,1.05.26.09.55-.05.64-.31s-.05-.55-.31-.64h0ZM173.24,201.38c-.97-.22-1.92-.46-2.87-.71-.27-.07-.54.09-.61.35s.09.54.35.61c.96.26,1.94.5,2.91.72.27.06.54-.11.6-.38s-.11-.54-.38-.6h0ZM181.02,202.69c-.98-.11-1.96-.24-2.94-.39-.27-.04-.53.15-.57.42s.15.53.42.57c.99.15,1.98.28,2.98.39.27.03.52-.17.55-.44s-.17-.52-.44-.55h0ZM188.9,203.11h-.09c-.96,0-1.92-.02-2.88-.06-.28-.01-.51.2-.52.48s.2.51.48.52c.97.04,1.94.06,2.92.06h.09c.28,0,.5-.22.5-.5s-.22-.5-.5-.5ZM196.78,202.67c-.98.11-1.96.2-2.95.27-.28.02-.48.26-.46.53s.26.48.53.46c1-.07,2-.16,2.99-.27.27-.03.47-.28.44-.55s-.28-.47-.55-.44h0ZM204.56,201.34c-.96.22-1.93.42-2.9.6-.27.05-.45.31-.4.58s.31.45.58.4c.99-.18,1.97-.38,2.94-.61.27-.06.44-.33.38-.6s-.33-.44-.6-.38h0ZM212.15,199.16c-.93.33-1.87.63-2.81.92-.26.08-.41.36-.33.62s.36.41.62.33c.96-.29,1.91-.6,2.85-.93.26-.09.4-.38.31-.64s-.38-.4-.64-.31ZM219.42,196.13c-.89.43-1.78.84-2.69,1.23-.25.11-.37.4-.26.66.11.25.4.37.66.26.92-.4,1.83-.81,2.72-1.25.25-.12.35-.42.23-.67s-.42-.35-.67-.23ZM226.31,192.31c-.83.53-1.68,1.03-2.53,1.52-.24.14-.32.44-.19.68s.44.32.68.19c.87-.5,1.72-1.01,2.57-1.55.23-.15.3-.46.16-.69s-.46-.3-.69-.16h0ZM232.74,187.73c-.77.62-1.55,1.22-2.35,1.8-.22.16-.27.48-.11.7s.48.27.7.11c.81-.59,1.6-1.2,2.38-1.82.22-.17.25-.49.08-.7-.17-.22-.49-.25-.7-.08h0ZM238.62,182.47c-.7.7-1.41,1.38-2.14,2.05-.2.19-.22.5-.03.71s.5.22.71.03c.74-.68,1.46-1.37,2.17-2.08.2-.2.2-.51,0-.71-.2-.2-.51-.19-.71,0h0ZM243.88,176.58c-.62.77-1.25,1.53-1.9,2.28-.18.21-.16.52.05.71s.52.16.71-.05c.66-.76,1.3-1.53,1.92-2.31.17-.22.14-.53-.08-.7s-.53-.14-.7.08h0ZM248.45,170.14c-.53.84-1.07,1.66-1.63,2.48-.16.23-.1.54.13.7s.54.1.7-.13c.57-.82,1.12-1.66,1.65-2.51.15-.23.08-.54-.16-.69s-.54-.08-.69.16h0ZM252.28,163.22c-.43.89-.88,1.77-1.34,2.64-.13.24-.04.55.21.68.24.13.55.04.68-.21.47-.88.93-1.78,1.36-2.68.12-.25.02-.55-.23-.67-.25-.12-.55-.02-.67.23h0ZM255.3,155.92c-.33.94-.67,1.86-1.04,2.78-.1.26.02.55.28.65.26.1.55-.02.65-.28.37-.93.72-1.87,1.05-2.82.09-.26-.05-.55-.31-.64s-.55.05-.64.31h0ZM257.48,148.33c-.22.97-.46,1.92-.72,2.87-.07.27.09.54.35.61s.54-.09.61-.35c.26-.96.5-1.94.73-2.91.06-.27-.11-.54-.38-.6-.27-.06-.54.11-.6.38h0ZM258.78,140.55c-.11.98-.24,1.96-.39,2.94-.04.27.15.53.42.57s.53-.15.57-.42c.15-.99.28-1.98.39-2.98.03-.27-.17-.52-.44-.55-.27-.03-.52.17-.55.44h0ZM259.22,132.67v.04s0,0,0,0c0,.98-.02,1.95-.06,2.92-.01.28.2.51.48.52.28.01.51-.2.52-.48h0c.04-.98.06-1.97.06-2.96h0s0-.04,0-.04c0-.28-.22-.5-.5-.5-.28,0-.5.22-.5.5h0ZM258.78,124.79c.11.98.2,1.96.27,2.95.02.28.26.48.53.46s.48-.26.46-.53c-.07-1-.16-2-.27-2.99-.03-.27-.28-.47-.55-.44-.27.03-.47.28-.44.55h0ZM257.46,117.01c.22.96.42,1.93.6,2.9.05.27.31.45.58.4.27-.05.45-.31.4-.58-.18-.99-.38-1.97-.61-2.94-.06-.27-.33-.44-.6-.38-.27.06-.44.33-.38.6h0ZM255.27,109.42c.33.93.63,1.87.92,2.81.08.26.36.41.62.33.26-.08.41-.36.33-.62-.29-.96-.6-1.91-.93-2.85-.09-.26-.38-.4-.64-.31-.26.09-.4.38-.31.64h0ZM252.25,102.15c.43.89.84,1.78,1.23,2.69.11.25.4.37.66.26s.37-.4.26-.66c-.4-.92-.81-1.83-1.25-2.73-.12-.25-.42-.35-.67-.23s-.35.42-.23.67ZM248.43,95.25c.52.83,1.03,1.68,1.52,2.53.14.24.44.32.68.19s.32-.44.19-.68c-.5-.87-1.01-1.73-1.54-2.57-.15-.23-.46-.3-.69-.16s-.3.46-.16.69h0ZM243.86,88.82c.62.77,1.21,1.55,1.8,2.35.16.22.48.27.7.11s.27-.48.11-.7c-.59-.81-1.2-1.6-1.82-2.38-.17-.22-.49-.25-.7-.08-.22.17-.25.49-.08.7h0ZM238.6,82.94c.7.7,1.38,1.41,2.05,2.14.19.2.5.22.71.03s.22-.5.03-.71c-.68-.74-1.37-1.46-2.08-2.17-.2-.2-.51-.2-.71,0-.2.2-.2.51,0,.71h0ZM232.72,77.67c.77.62,1.53,1.25,2.28,1.9.21.18.52.16.71-.05s.16-.52-.05-.71c-.76-.66-1.52-1.3-2.31-1.92-.22-.17-.53-.14-.7.08-.17.22-.14.53.08.7h0ZM226.28,73.1c.84.53,1.66,1.07,2.47,1.63.23.16.54.1.7-.13.16-.23.1-.54-.13-.7-.82-.57-1.66-1.12-2.51-1.66-.23-.15-.54-.08-.69.16-.15.23-.08.54.16.69ZM219.37,69.27c.89.43,1.77.88,2.64,1.34.24.13.55.04.68-.2.13-.24.04-.55-.2-.68-.88-.47-1.78-.93-2.68-1.36-.25-.12-.55-.02-.67.23s-.02.55.23.67h0ZM212.06,66.24c.94.33,1.86.67,2.78,1.04.26.1.55-.02.65-.28s-.02-.55-.28-.65c-.93-.37-1.87-.72-2.82-1.05-.26-.09-.55.05-.64.31s.05.55.31.64ZM204.48,64.06c.97.22,1.92.46,2.87.72.27.07.54-.08.61-.35s-.08-.54-.35-.61c-.96-.26-1.93-.5-2.91-.73-.27-.06-.54.11-.6.38s.11.54.38.6h0ZM196.7,62.75c.98.11,1.96.24,2.94.39.27.04.53-.15.57-.42s-.15-.53-.42-.57c-.99-.15-1.98-.28-2.98-.4-.27-.03-.52.17-.55.44s.17.52.44.55h0Z"/>
        <path id="logo1" class="st3" d="M197.82,127.49c2.75-2.8,7.39-7.49,13.94-14.08-.28-.05-.56-.12-.83-.23-.04-.01-.08-.02-.11-.04-.16-.07-.31-.15-.46-.23-.09-.05-.17-.11-.25-.16-.05-.04-.11-.07-.16-.11-.1-.08-.2-.16-.29-.25-.02-.02-.05-.04-.08-.06-.09-.09-.19-.19-.27-.29-.51-.58-.85-1.28-1-2.03-1.18,1.31-2.83,3.11-4.94,5.39-1.12,1.21-1.81,1.95-2.06,2.23l.24.2c1.59-1.68,2.57-2.67,2.94-2.97s.66-.36.87-.18l1.75,1.47-4.73,4.41c-2.33,2.17-4.46,4.16-6.41,5.99,0,0-.01,0-.02,0-3.07-1.3-6-1.59-8.78-.88-2.78.71-4.64,2.17-5.58,4.37-.92,2.18-.68,4.77.72,7.81-4.71.27-7.78.58-9.21.94-1.85.45-3.34,1.09-4.46,1.91-1.13.82-1.91,1.77-2.37,2.83-.67,1.59-.5,3.39.52,5.41,1.02,2.01,3.06,3.67,6.13,4.97,3.75,1.58,7.35,1.94,10.8,1.04,3.45-.89,5.7-2.58,6.75-5.06,1.09-2.57.44-6.07-1.94-10.51,3.77.02,6.88-.46,9.3-1.45,1.85-.75,3.06-1.81,3.63-3.16.58-1.35.36-2.83-.64-4.41-.69-1.11-1.7-2.06-3.01-2.86h0ZM185.54,135.88c.32-.76.84-1.49,1.54-2.18.7-.69,1.32-1.11,1.87-1.25.32-.08.61-.11.88-.08-1.77,1.7-3.27,3.16-4.51,4.39.02-.26.09-.55.22-.87h0ZM195.4,128.44c-1.52,1.51-2.92,2.9-4.19,4.16-.15-.08-.29-.16-.46-.22,1.28-1.27,2.71-2.66,4.27-4.17.13.08.25.16.38.24h0ZM185.58,137.7s-.02-.05-.04-.08c1.32-1.38,2.99-3.06,5-5.04.15.08.28.18.39.29-2.04,2.04-3.74,3.75-5.09,5.13-.1-.09-.19-.18-.27-.29h0ZM186.13,138.7s-.05,0-.08,0c0-.02-.01-.03-.02-.05.04.01.07.03.11.04h0ZM189.43,137.22c-.75.67-1.43,1.05-2.05,1.15-.04,0-.07,0-.11.01,1.12-1.19,2.47-2.59,4.03-4.21-.04.24-.1.5-.22.78-.35.85-.91,1.61-1.66,2.28h0ZM186.76,138.38c-.18-.02-.34-.06-.5-.13,0,0-.01,0-.01,0,1.31-1.37,2.95-3.06,4.93-5.07.02.03.04.06.05.09.06.14.09.28.1.44-1.8,1.83-3.32,3.39-4.56,4.68h0ZM191.54,132.8c1.25-1.27,2.63-2.66,4.13-4.17.13.09.25.19.37.29-1.5,1.51-2.87,2.9-4.11,4.16-.12-.1-.25-.19-.39-.28h0ZM203.49,121.42c-2.13,2.14-4.1,4.11-5.9,5.93-.14-.08-.28-.15-.42-.23,2.24-2.24,5.77-5.73,10.6-10.5l.26.24-4.54,4.56h0ZM207.48,116.4l.08.08-4.59,4.51c-2.2,2.16-4.23,4.15-6.08,5.99-.13-.06-.26-.13-.39-.19,2.29-2.2,5.95-5.66,10.98-10.38h0ZM184.78,130.21c.65-1.51,1.87-2.52,3.66-3.02,1.8-.5,3.64-.34,5.54.47.18.08.35.16.51.24-1.62,1.54-3.11,2.94-4.44,4.22-.51-.13-1.05-.18-1.63-.15-.83.05-1.69.36-2.58.94-.57.37-1.02.81-1.37,1.29-.28-1.54-.18-2.88.31-4h0ZM186.56,150.09c-.37,1.18-1.15,2.23-2.34,3.15-1.19.91-2.56,1.48-4.11,1.69s-3.06.09-4.5-.36c-1.99-.63-3.49-1.7-4.5-3.2s-1.27-3.04-.77-4.6c.52-1.64,1.67-3.04,3.46-4.2,1.71-1.1,4.63-2.11,8.77-3.01-1.57,1.64-2.94,3.16-4.11,4.54-.65.78-1.16,1.45-1.54,2.05-.37.59-.51.92-.42,1.01.11.09.45-.13,1.01-.66.57-.54,1.77-1.85,3.6-3.96.87-.99,1.65-1.87,2.34-2.64.08.12.15.25.22.37-1.59,1.67-2.99,3.18-4.2,4.55-.67.75-1.21,1.41-1.64,1.96-.42.55-.61.85-.55.89.06.05.36-.19.91-.74s1.76-1.85,3.64-3.92c.77-.85,1.47-1.61,2.11-2.3.08.14.15.26.22.39-1.48,1.58-2.81,3.02-3.96,4.32-.67.76-1.22,1.41-1.64,1.95-.43.54-.62.84-.57.88.05.05.35-.21.89-.76.54-.55,1.75-1.86,3.63-3.93.68-.75,1.31-1.45,1.89-2.08,1.11,1.98,1.81,3.54,2.11,4.69.39,1.52.42,2.83.07,3.91h0ZM197.76,134.38c-.44,1.01-1.43,1.88-2.97,2.59-.86.39-2.14.75-3.84,1.06.8-.53,1.38-1.19,1.72-2.01.34-.8.32-1.52-.06-2.15-.12-.21-.28-.39-.47-.57,1.24-1.28,2.6-2.67,4.08-4.19.49.46.91.98,1.22,1.56.71,1.31.81,2.55.31,3.72h0Z"/>
      </g>
    </g>
    <g id="left">
      <g class="st1">
        <path d="M165.88,258.77c.13.14.2.31.2.5s-.07.36-.2.5c-.14.14-.3.21-.5.21h-10.79c-.11,0-.18.05-.19.15-1.42,5.53-3.52,9.68-6.29,12.47-.14.14-.31.21-.51.19-.2-.01-.36-.1-.49-.26-.13-.14-.19-.31-.19-.51,0-.21.08-.4.23-.55,2.54-2.53,4.47-6.31,5.78-11.34.01-.04,0-.08-.02-.11-.03-.03-.06-.04-.11-.04h-4.65c-.2,0-.37-.07-.5-.21-.14-.14-.2-.31-.2-.5s.07-.36.2-.5c.13-.14.3-.21.5-.21h5.01c.1,0,.16-.05.19-.15.18-.91.38-1.93.58-3.07.04-.2.14-.36.3-.49.14-.1.29-.15.45-.15.04,0,.08,0,.11.02.2.01.36.1.48.27.12.16.17.34.14.54-.18,1.02-.38,1.98-.58,2.88-.03.1,0,.15.11.15h10.44c.2,0,.37.07.5.21ZM159.61,272.26c0,.11.06.17.17.17h6.03c.18,0,.35.07.49.2.14.14.21.3.21.49s-.07.35-.21.49-.31.2-.49.2h-14.17c-.19,0-.34-.07-.48-.2s-.2-.3-.2-.49.07-.35.2-.49c.14-.13.29-.2.48-.2h6.33c.1,0,.15-.06.15-.17v-6.42c0-.11-.05-.17-.15-.17h-4.09c-.2,0-.37-.07-.5-.2-.14-.14-.2-.3-.2-.49s.07-.36.2-.49c.14-.13.3-.2.5-.2h10.91c.18,0,.35.07.49.2.14.14.21.3.21.49s-.07.35-.21.49c-.14.13-.31.2-.49.2h-5.01c-.11,0-.17.06-.17.17v6.42Z"/>
        <path d="M175.06,256.96c-.1.03-.15.09-.15.19v3.86c0,.1.05.15.15.15h3.45c.18,0,.34.07.48.2.13.14.2.3.2.48s-.07.34-.2.48-.3.2-.48.2h-3.45c-.1,0-.15.05-.15.15v1.3c0,.1.04.19.13.26.58.47,1.75,1.46,3.5,2.98.16.14.25.32.28.53.03.21-.02.4-.15.58-.11.14-.27.22-.46.23-.19.01-.35-.05-.48-.19-.68-.7-1.58-1.56-2.71-2.6-.01-.01-.04-.02-.06-.01-.03,0-.04.03-.04.07v7.91c0,.2-.07.37-.2.5s-.3.2-.49.2-.36-.07-.5-.2-.21-.3-.21-.5v-8.89s0-.04-.02-.04-.03,0-.04.02c-1.12,2.47-2.36,4.48-3.71,6.03-.13.13-.28.18-.47.15-.19-.03-.33-.12-.43-.29-.1-.16-.15-.34-.15-.52v-.11c.03-.23.12-.42.28-.58.78-.85,1.55-1.9,2.3-3.13.75-1.24,1.37-2.47,1.85-3.71.01-.04.01-.08-.01-.11-.02-.03-.05-.04-.07-.04h-3.47c-.19,0-.34-.07-.48-.2-.14-.13-.2-.29-.2-.48s.07-.34.2-.48.29-.2.48-.2h3.79c.1,0,.15-.05.15-.15v-3.56c0-.1-.05-.14-.15-.13-1.25.23-2.43.42-3.54.58-.17.01-.33-.02-.48-.12-.15-.09-.26-.22-.33-.39-.06-.14-.05-.28.02-.42.07-.14.18-.22.32-.25,3.4-.51,5.98-1.08,7.74-1.71.17-.06.33-.08.47-.08.3,0,.57.12.81.36.13.13.17.28.14.46-.04.18-.14.3-.31.35-.82.28-1.87.57-3.13.85ZM181.92,268.89c-.14.14-.31.21-.5.21s-.36-.07-.5-.21-.21-.31-.21-.49v-10.53c0-.2.07-.37.21-.5.14-.13.31-.2.5-.2s.36.07.5.2c.14.14.21.3.21.5v10.53c0,.19-.07.35-.21.49ZM186.08,255.74c0-.2.07-.37.21-.51s.31-.21.51-.21.37.07.51.21c.14.14.21.31.21.51v16.77c0,.5-.07.88-.22,1.14-.15.26-.39.46-.71.59-.53.17-1.55.26-3.07.26h-.02c-.23,0-.43-.07-.62-.2-.19-.14-.31-.32-.38-.54-.03-.06-.04-.12-.04-.19,0-.1.03-.19.08-.28.1-.14.23-.21.41-.21h2.58c.2-.01.34-.06.43-.14.08-.08.13-.22.13-.42v-16.77Z"/>
        <path d="M207.2,261.43c.18-.07.36-.06.53.03.17.09.27.23.3.42.01.07.02.14.02.19,0,.13-.04.26-.11.38-.1.18-.25.31-.45.36-.85.26-1.81.48-2.88.68-.11.03-.15.09-.11.19.5,1.08,1.04,2.2,1.64,3.35.07.16.11.31.11.45,0,.2-.07.38-.21.55-.21.27-.48.4-.79.4-.07,0-.14,0-.19-.02-.71-.1-1.68-.23-2.92-.41-.17-.01-.31-.09-.42-.22-.11-.13-.15-.29-.13-.46.02-.17.1-.31.22-.4.13-.1.28-.14.45-.13.67.09,1.36.16,2.07.23.04,0,.07-.01.09-.04s.01-.06,0-.09c-.27-.57-.72-1.56-1.36-2.98-.04-.1-.12-.14-.23-.13-1.59.21-3.41.32-5.46.32-1.05,0-2.17-.03-3.35-.09-.2-.01-.37-.09-.51-.23-.16-.16-.23-.34-.23-.55,0-.17.07-.32.21-.45.13-.13.29-.18.49-.17,1.29.1,2.54.15,3.75.15,1.58,0,3.09-.08,4.54-.26.1-.01.13-.07.09-.17-.44-.99-.7-1.6-.79-1.81-.04-.1-.11-.25-.2-.46-.09-.21-.16-.36-.2-.46-.03-.1-.1-.14-.21-.13-1.11.1-2.23.15-3.37.15s-2.24-.05-3.39-.15c-.2-.01-.37-.1-.52-.25s-.23-.33-.25-.54c-.01-.18.05-.34.18-.47.13-.13.29-.18.48-.17,1.36.13,2.64.19,3.84.19.85,0,1.67-.03,2.45-.09.1-.01.13-.07.08-.17-.1-.26-.18-.45-.26-.6-.13-.28-.24-.52-.34-.7-.1-.2-.1-.4-.01-.6s.25-.32.46-.36c.07-.01.14-.02.21-.02.17,0,.33.04.49.13.21.13.36.32.45.58.14.41.31.88.51,1.41.04.1.11.14.21.13,1.29-.2,2.46-.46,3.5-.79.18-.06.36-.04.53.06.17.1.27.24.3.43.04.2.01.39-.1.56-.11.18-.26.3-.46.35-.99.27-2.07.5-3.22.68-.11.01-.15.07-.11.17l.32.75c.1.23.38.88.85,1.96.04.08.11.12.21.11,1.18-.23,2.24-.5,3.18-.81ZM194.01,267.76c.06-.21.18-.38.36-.5.18-.12.38-.17.6-.16.2.03.35.12.45.28.1.16.12.33.06.51-.18.61-.28,1.11-.28,1.49,0,.9.37,1.58,1.12,2.07.75.48,1.88.73,3.4.73,1.61,0,3.1-.11,4.48-.32.2-.04.37,0,.52.14.15.14.22.3.22.5-.01.23-.1.43-.25.6-.15.17-.33.27-.54.3-1.41.18-2.86.28-4.37.28-1.95,0-3.44-.33-4.49-1-1.04-.67-1.57-1.65-1.57-2.94,0-.6.09-1.25.28-1.96Z"/>
        <path d="M229.35,255.68c.34,0,.63.12.88.37.25.25.37.54.37.88v15.01c0,.5-.08.87-.22,1.13s-.39.44-.73.55c-.47.17-1.56.26-3.26.26h-.02c-.2,0-.38-.07-.55-.2-.17-.14-.3-.31-.38-.52-.06-.16-.04-.31.05-.45.09-.14.22-.21.37-.21.54.01,1.03.02,1.47.02.47,0,.9,0,1.28-.02.38-.01.58-.2.58-.55v-4.52c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v5.67c0,.2-.07.37-.21.51-.14.14-.31.21-.51.21s-.37-.07-.51-.21-.21-.31-.21-.51v-5.67c0-.1-.06-.15-.17-.15h-5.29c-.11,0-.18.05-.19.15-.36,2.56-1.11,4.6-2.26,6.14-.13.14-.28.21-.47.21s-.35-.06-.49-.19-.23-.29-.26-.49c-.01-.03-.02-.06-.02-.11,0-.14.05-.28.15-.41.53-.71.95-1.55,1.28-2.52.41-1.21.66-2.28.76-3.23.09-.94.14-2.05.14-3.31v-6.59c0-.34.12-.64.37-.88.25-.25.54-.37.88-.37h13.28ZM216.16,265.74c-.01.11.04.17.15.17h5.16c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.07c-.11,0-.17.06-.17.17v1.26c0,.8-.02,1.53-.06,2.22ZM221.63,257.19c0-.1-.06-.15-.17-.15h-5.07c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.07c.11,0,.17-.06.17-.17v-3.37ZM229.01,260.73c.11,0,.17-.06.17-.17v-3.37c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.75ZM223.08,265.76c0,.1.06.15.17.15h5.75c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.75c-.11,0-.17.06-.17.17v3.5Z"/>
      </g>
      <g id="right1" data-name="right">
        <g>
          <path class="st2" d="M250.56,191.19c11.25-4.25,19.66-11.26,23.91-20.97,4.23-9.67,3.69-20.57-.77-31.67l-.05-.13c2.34-34.78-17.01-68.9-50.72-83.65-33.71-14.75-71.9-5.81-95.86,19.51l-.09-.04c-11.25,4.25-19.66,11.26-23.91,20.97-4.25,9.71-3.69,20.65.82,31.8v-.03s.03.05.03.05h-.03c-2.34,34.77,17.01,68.88,50.72,83.63,33.3,14.57,70.96,6.02,94.97-18.58l.98-.89Z"/>
          <path class="st3" d="M188.65,62.31h.17c.99,0,1.98.02,2.96.06.28.01.51-.2.52-.48s-.2-.51-.48-.52c-1-.04-2-.06-3-.06h-.17c-.28,0-.5.23-.5.5s.23.5.5.5h0ZM180.77,62.77c.98-.11,1.96-.2,2.95-.27.28-.02.48-.26.46-.53s-.26-.48-.53-.46c-1,.07-2,.16-2.99.28-.27.03-.47.28-.44.55s.28.47.55.44h0ZM172.99,64.1c.96-.22,1.93-.42,2.9-.6.27-.05.45-.31.4-.58s-.31-.45-.58-.4c-.99.18-1.97.39-2.94.61-.27.06-.44.33-.38.6s.33.44.6.38ZM165.41,66.3c.93-.33,1.87-.64,2.81-.92.26-.08.41-.36.33-.62s-.36-.41-.62-.33c-.96.29-1.91.61-2.85.94-.26.09-.4.38-.31.64s.38.4.64.31h0ZM158.14,69.33c.88-.43,1.78-.84,2.68-1.23.25-.11.37-.4.26-.66s-.4-.37-.66-.26c-.92.4-1.83.82-2.72,1.25-.25.12-.35.42-.23.67.12.25.42.35.67.23h0ZM151.25,73.17c.83-.53,1.68-1.04,2.53-1.53.24-.14.32-.44.18-.68s-.44-.32-.68-.18c-.87.5-1.72,1.02-2.57,1.55-.23.15-.3.46-.16.69s.46.3.69.16h0ZM144.82,77.75c.77-.62,1.55-1.22,2.35-1.8.22-.16.27-.48.11-.7s-.48-.27-.7-.11c-.81.59-1.6,1.2-2.38,1.83-.22.17-.25.49-.08.7s.49.25.7.08h0ZM138.95,83.02c.7-.7,1.41-1.38,2.13-2.05.2-.19.22-.5.03-.71s-.5-.22-.71-.03c-.74.68-1.46,1.37-2.16,2.08-.19.2-.19.51,0,.71s.51.19.71,0h0ZM133.7,88.91c.62-.77,1.25-1.53,1.89-2.28.18-.21.16-.52-.05-.71s-.52-.16-.71.05c-.66.76-1.3,1.53-1.92,2.31-.17.22-.14.53.08.7s.53.14.7-.08h0ZM129.13,95.36c.53-.84,1.07-1.66,1.63-2.48.16-.23.1-.54-.13-.7s-.54-.1-.7.13c-.57.83-1.12,1.66-1.65,2.51-.15.23-.08.54.16.69s.54.08.69-.16h0ZM125.32,102.28c.43-.89.88-1.77,1.34-2.65.13-.24.04-.55-.21-.68s-.55-.04-.68.21c-.47.88-.92,1.78-1.36,2.68-.12.25-.01.55.23.67s.55.01.67-.23h0ZM122.3,109.59c.33-.94.67-1.86,1.03-2.78.1-.26-.02-.55-.28-.65s-.55.02-.65.28c-.37.93-.72,1.87-1.05,2.82-.09.26.05.55.31.64s.55-.05.64-.31h0ZM120.14,117.18c.22-.97.45-1.92.71-2.87.07-.27-.09-.54-.35-.61s-.54.09-.61.35c-.26.96-.5,1.94-.72,2.92-.06.27.11.54.38.6s.54-.11.6-.38h0ZM118.84,124.96c.11-.98.24-1.96.38-2.94.04-.27-.15-.53-.42-.57s-.53.15-.57.42c-.15.99-.28,1.98-.39,2.98-.03.27.17.52.44.55s.52-.17.55-.44h0ZM118.42,132.84v-.13s0,0,0,0c0-.95.02-1.89.06-2.83.01-.28-.2-.51-.48-.52s-.51.2-.52.48c-.04.95-.06,1.91-.06,2.87h0s0,.13,0,.13c0,.28.22.5.5.5s.5-.22.5-.5h0ZM118.87,140.72c-.11-.98-.2-1.96-.27-2.95-.02-.28-.26-.48-.53-.46s-.48.26-.46.53c.07,1,.16,2,.28,2.99.03.27.28.47.55.44s.47-.28.44-.55h0ZM120.19,148.5c-.22-.96-.42-1.93-.6-2.9-.05-.27-.31-.45-.58-.4s-.45.31-.4.58c.18.99.39,1.97.61,2.94.06.27.33.44.6.38s.44-.33.38-.6h0ZM122.39,156.08c-.33-.93-.63-1.87-.92-2.81-.08-.26-.36-.41-.62-.33s-.41.36-.33.62c.29.96.6,1.91.94,2.85.09.26.38.4.64.31s.4-.38.31-.64h0ZM125.42,163.36c-.43-.89-.84-1.78-1.23-2.69-.11-.25-.4-.37-.66-.26s-.37.4-.26.66c.4.92.81,1.83,1.25,2.72.12.25.42.35.67.23s.35-.42.23-.67h0ZM129.25,170.25c-.53-.83-1.03-1.68-1.53-2.53-.14-.24-.44-.32-.68-.18s-.32.44-.18.68c.5.87,1.01,1.72,1.55,2.57.15.23.46.3.69.16s.3-.46.16-.69h0ZM133.82,176.67c-.62-.77-1.22-1.55-1.8-2.35-.16-.22-.48-.27-.7-.11s-.27.48-.11.7c.59.81,1.2,1.6,1.83,2.38.17.22.49.25.7.08s.25-.49.08-.7h0ZM139.09,182.55c-.7-.7-1.38-1.41-2.05-2.13-.19-.2-.5-.22-.71-.03s-.22.5-.03.71c.68.74,1.37,1.46,2.08,2.16.2.2.51.19.71,0s.19-.51,0-.71h0ZM144.98,187.81c-.77-.62-1.53-1.25-2.28-1.89-.21-.18-.52-.16-.71.05s-.16.52.05.71c.76.66,1.53,1.3,2.31,1.92.22.17.53.14.7-.08s.14-.53-.08-.7h0ZM151.43,192.37c-.84-.53-1.66-1.07-2.48-1.63-.23-.16-.54-.1-.7.13s-.1.54.13.7c.82.57,1.66,1.12,2.51,1.65.23.15.54.08.69-.16s.08-.54-.16-.69h0ZM158.34,196.19c-.89-.43-1.77-.88-2.65-1.34-.24-.13-.55-.04-.68.21s-.04.55.21.68c.88.47,1.78.93,2.68,1.36.25.12.55.01.67-.23s.01-.55-.23-.67h0ZM165.65,199.21c-.94-.33-1.86-.67-2.78-1.04-.26-.1-.55.02-.65.28-.1.26.02.55.28.65.93.37,1.87.72,2.82,1.05.26.09.55-.05.64-.31s-.05-.55-.31-.64h0ZM173.24,201.38c-.97-.22-1.92-.46-2.87-.71-.27-.07-.54.09-.61.35s.09.54.35.61c.96.26,1.94.5,2.91.72.27.06.54-.11.6-.38s-.11-.54-.38-.6h0ZM181.02,202.69c-.98-.11-1.96-.24-2.94-.39-.27-.04-.53.15-.57.42s.15.53.42.57c.99.15,1.98.28,2.98.39.27.03.52-.17.55-.44s-.17-.52-.44-.55h0ZM188.9,203.11h-.09c-.96,0-1.92-.02-2.88-.06-.28-.01-.51.2-.52.48s.2.51.48.52c.97.04,1.94.06,2.92.06h.09c.28,0,.5-.22.5-.5s-.22-.5-.5-.5ZM196.78,202.67c-.98.11-1.96.2-2.95.27-.28.02-.48.26-.46.53s.26.48.53.46c1-.07,2-.16,2.99-.27.27-.03.47-.28.44-.55s-.28-.47-.55-.44h0ZM204.56,201.34c-.96.22-1.93.42-2.9.6-.27.05-.45.31-.4.58s.31.45.58.4c.99-.18,1.97-.38,2.94-.61.27-.06.44-.33.38-.6s-.33-.44-.6-.38h0ZM212.15,199.16c-.93.33-1.87.63-2.81.92-.26.08-.41.36-.33.62s.36.41.62.33c.96-.29,1.91-.6,2.85-.93.26-.09.4-.38.31-.64s-.38-.4-.64-.31ZM219.42,196.13c-.89.43-1.78.84-2.69,1.23-.25.11-.37.4-.26.66.11.25.4.37.66.26.92-.4,1.83-.81,2.72-1.25.25-.12.35-.42.23-.67s-.42-.35-.67-.23ZM226.31,192.31c-.83.53-1.68,1.03-2.53,1.52-.24.14-.32.44-.19.68s.44.32.68.19c.87-.5,1.72-1.01,2.57-1.55.23-.15.3-.46.16-.69s-.46-.3-.69-.16h0ZM232.74,187.73c-.77.62-1.55,1.22-2.35,1.8-.22.16-.27.48-.11.7s.48.27.7.11c.81-.59,1.6-1.2,2.38-1.82.22-.17.25-.49.08-.7-.17-.22-.49-.25-.7-.08h0ZM238.62,182.47c-.7.7-1.41,1.38-2.14,2.05-.2.19-.22.5-.03.71s.5.22.71.03c.74-.68,1.46-1.37,2.17-2.08.2-.2.2-.51,0-.71-.2-.2-.51-.19-.71,0h0ZM243.88,176.58c-.62.77-1.25,1.53-1.9,2.28-.18.21-.16.52.05.71s.52.16.71-.05c.66-.76,1.3-1.53,1.92-2.31.17-.22.14-.53-.08-.7s-.53-.14-.7.08h0ZM248.45,170.14c-.53.84-1.07,1.66-1.63,2.48-.16.23-.1.54.13.7s.54.1.7-.13c.57-.82,1.12-1.66,1.65-2.51.15-.23.08-.54-.16-.69s-.54-.08-.69.16h0ZM252.28,163.22c-.43.89-.88,1.77-1.34,2.64-.13.24-.04.55.21.68.24.13.55.04.68-.21.47-.88.93-1.78,1.36-2.68.12-.25.02-.55-.23-.67-.25-.12-.55-.02-.67.23h0ZM255.3,155.92c-.33.94-.67,1.86-1.04,2.78-.1.26.02.55.28.65.26.1.55-.02.65-.28.37-.93.72-1.87,1.05-2.82.09-.26-.05-.55-.31-.64s-.55.05-.64.31h0ZM257.48,148.33c-.22.97-.46,1.92-.72,2.87-.07.27.09.54.35.61s.54-.09.61-.35c.26-.96.5-1.94.73-2.91.06-.27-.11-.54-.38-.6-.27-.06-.54.11-.6.38h0ZM258.78,140.55c-.11.98-.24,1.96-.39,2.94-.04.27.15.53.42.57s.53-.15.57-.42c.15-.99.28-1.98.39-2.98.03-.27-.17-.52-.44-.55-.27-.03-.52.17-.55.44h0ZM259.22,132.67v.04s0,0,0,0c0,.98-.02,1.95-.06,2.92-.01.28.2.51.48.52.28.01.51-.2.52-.48h0c.04-.98.06-1.97.06-2.96h0s0-.04,0-.04c0-.28-.22-.5-.5-.5-.28,0-.5.22-.5.5h0ZM258.78,124.79c.11.98.2,1.96.27,2.95.02.28.26.48.53.46s.48-.26.46-.53c-.07-1-.16-2-.27-2.99-.03-.27-.28-.47-.55-.44-.27.03-.47.28-.44.55h0ZM257.46,117.01c.22.96.42,1.93.6,2.9.05.27.31.45.58.4.27-.05.45-.31.4-.58-.18-.99-.38-1.97-.61-2.94-.06-.27-.33-.44-.6-.38-.27.06-.44.33-.38.6h0ZM255.27,109.42c.33.93.63,1.87.92,2.81.08.26.36.41.62.33.26-.08.41-.36.33-.62-.29-.96-.6-1.91-.93-2.85-.09-.26-.38-.4-.64-.31-.26.09-.4.38-.31.64h0ZM252.25,102.15c.43.89.84,1.78,1.23,2.69.11.25.4.37.66.26s.37-.4.26-.66c-.4-.92-.81-1.83-1.25-2.73-.12-.25-.42-.35-.67-.23s-.35.42-.23.67ZM248.43,95.25c.52.83,1.03,1.68,1.52,2.53.14.24.44.32.68.19s.32-.44.19-.68c-.5-.87-1.01-1.73-1.54-2.57-.15-.23-.46-.3-.69-.16s-.3.46-.16.69h0ZM243.86,88.82c.62.77,1.21,1.55,1.8,2.35.16.22.48.27.7.11s.27-.48.11-.7c-.59-.81-1.2-1.6-1.82-2.38-.17-.22-.49-.25-.7-.08-.22.17-.25.49-.08.7h0ZM238.6,82.94c.7.7,1.38,1.41,2.05,2.14.19.2.5.22.71.03s.22-.5.03-.71c-.68-.74-1.37-1.46-2.08-2.17-.2-.2-.51-.2-.71,0-.2.2-.2.51,0,.71h0ZM232.72,77.67c.77.62,1.53,1.25,2.28,1.9.21.18.52.16.71-.05s.16-.52-.05-.71c-.76-.66-1.52-1.3-2.31-1.92-.22-.17-.53-.14-.7.08-.17.22-.14.53.08.7h0ZM226.28,73.1c.84.53,1.66,1.07,2.47,1.63.23.16.54.1.7-.13.16-.23.1-.54-.13-.7-.82-.57-1.66-1.12-2.51-1.66-.23-.15-.54-.08-.69.16-.15.23-.08.54.16.69ZM219.37,69.27c.89.43,1.77.88,2.64,1.34.24.13.55.04.68-.2.13-.24.04-.55-.2-.68-.88-.47-1.78-.93-2.68-1.36-.25-.12-.55-.02-.67.23s-.02.55.23.67h0ZM212.06,66.24c.94.33,1.86.67,2.78,1.04.26.1.55-.02.65-.28s-.02-.55-.28-.65c-.93-.37-1.87-.72-2.82-1.05-.26-.09-.55.05-.64.31s.05.55.31.64ZM204.48,64.06c.97.22,1.92.46,2.87.72.27.07.54-.08.61-.35s-.08-.54-.35-.61c-.96-.26-1.93-.5-2.91-.73-.27-.06-.54.11-.6.38s.11.54.38.6h0ZM196.7,62.75c.98.11,1.96.24,2.94.39.27.04.53-.15.57-.42s-.15-.53-.42-.57c-.99-.15-1.98-.28-2.98-.4-.27-.03-.52.17-.55.44s.17.52.44.55h0Z"/>
          <path id="logo11" data-name="logo1" class="st3" d="M197.82,127.49c2.75-2.8,7.39-7.49,13.94-14.08-.28-.05-.56-.12-.83-.23-.04-.01-.08-.02-.11-.04-.16-.07-.31-.15-.46-.23-.09-.05-.17-.11-.25-.16-.05-.04-.11-.07-.16-.11-.1-.08-.2-.16-.29-.25-.02-.02-.05-.04-.08-.06-.09-.09-.19-.19-.27-.29-.51-.58-.85-1.28-1-2.03-1.18,1.31-2.83,3.11-4.94,5.39-1.12,1.21-1.81,1.95-2.06,2.23l.24.2c1.59-1.68,2.57-2.67,2.94-2.97s.66-.36.87-.18l1.75,1.47-4.73,4.41c-2.33,2.17-4.46,4.16-6.41,5.99,0,0-.01,0-.02,0-3.07-1.3-6-1.59-8.78-.88-2.78.71-4.64,2.17-5.58,4.37-.92,2.18-.68,4.77.72,7.81-4.71.27-7.78.58-9.21.94-1.85.45-3.34,1.09-4.46,1.91-1.13.82-1.91,1.77-2.37,2.83-.67,1.59-.5,3.39.52,5.41,1.02,2.01,3.06,3.67,6.13,4.97,3.75,1.58,7.35,1.94,10.8,1.04,3.45-.89,5.7-2.58,6.75-5.06,1.09-2.57.44-6.07-1.94-10.51,3.77.02,6.88-.46,9.3-1.45,1.85-.75,3.06-1.81,3.63-3.16.58-1.35.36-2.83-.64-4.41-.69-1.11-1.7-2.06-3.01-2.86h0ZM185.54,135.88c.32-.76.84-1.49,1.54-2.18.7-.69,1.32-1.11,1.87-1.25.32-.08.61-.11.88-.08-1.77,1.7-3.27,3.16-4.51,4.39.02-.26.09-.55.22-.87h0ZM195.4,128.44c-1.52,1.51-2.92,2.9-4.19,4.16-.15-.08-.29-.16-.46-.22,1.28-1.27,2.71-2.66,4.27-4.17.13.08.25.16.38.24h0ZM185.58,137.7s-.02-.05-.04-.08c1.32-1.38,2.99-3.06,5-5.04.15.08.28.18.39.29-2.04,2.04-3.74,3.75-5.09,5.13-.1-.09-.19-.18-.27-.29h0ZM186.13,138.7s-.05,0-.08,0c0-.02-.01-.03-.02-.05.04.01.07.03.11.04h0ZM189.43,137.22c-.75.67-1.43,1.05-2.05,1.15-.04,0-.07,0-.11.01,1.12-1.19,2.47-2.59,4.03-4.21-.04.24-.1.5-.22.78-.35.85-.91,1.61-1.66,2.28h0ZM186.76,138.38c-.18-.02-.34-.06-.5-.13,0,0-.01,0-.01,0,1.31-1.37,2.95-3.06,4.93-5.07.02.03.04.06.05.09.06.14.09.28.1.44-1.8,1.83-3.32,3.39-4.56,4.68h0ZM191.54,132.8c1.25-1.27,2.63-2.66,4.13-4.17.13.09.25.19.37.29-1.5,1.51-2.87,2.9-4.11,4.16-.12-.1-.25-.19-.39-.28h0ZM203.49,121.42c-2.13,2.14-4.1,4.11-5.9,5.93-.14-.08-.28-.15-.42-.23,2.24-2.24,5.77-5.73,10.6-10.5l.26.24-4.54,4.56h0ZM207.48,116.4l.08.08-4.59,4.51c-2.2,2.16-4.23,4.15-6.08,5.99-.13-.06-.26-.13-.39-.19,2.29-2.2,5.95-5.66,10.98-10.38h0ZM184.78,130.21c.65-1.51,1.87-2.52,3.66-3.02,1.8-.5,3.64-.34,5.54.47.18.08.35.16.51.24-1.62,1.54-3.11,2.94-4.44,4.22-.51-.13-1.05-.18-1.63-.15-.83.05-1.69.36-2.58.94-.57.37-1.02.81-1.37,1.29-.28-1.54-.18-2.88.31-4h0ZM186.56,150.09c-.37,1.18-1.15,2.23-2.34,3.15-1.19.91-2.56,1.48-4.11,1.69s-3.06.09-4.5-.36c-1.99-.63-3.49-1.7-4.5-3.2s-1.27-3.04-.77-4.6c.52-1.64,1.67-3.04,3.46-4.2,1.71-1.1,4.63-2.11,8.77-3.01-1.57,1.64-2.94,3.16-4.11,4.54-.65.78-1.16,1.45-1.54,2.05-.37.59-.51.92-.42,1.01.11.09.45-.13,1.01-.66.57-.54,1.77-1.85,3.6-3.96.87-.99,1.65-1.87,2.34-2.64.08.12.15.25.22.37-1.59,1.67-2.99,3.18-4.2,4.55-.67.75-1.21,1.41-1.64,1.96-.42.55-.61.85-.55.89.06.05.36-.19.91-.74s1.76-1.85,3.64-3.92c.77-.85,1.47-1.61,2.11-2.3.08.14.15.26.22.39-1.48,1.58-2.81,3.02-3.96,4.32-.67.76-1.22,1.41-1.64,1.95-.43.54-.62.84-.57.88.05.05.35-.21.89-.76.54-.55,1.75-1.86,3.63-3.93.68-.75,1.31-1.45,1.89-2.08,1.11,1.98,1.81,3.54,2.11,4.69.39,1.52.42,2.83.07,3.91h0ZM197.76,134.38c-.44,1.01-1.43,1.88-2.97,2.59-.86.39-2.14.75-3.84,1.06.8-.53,1.38-1.19,1.72-2.01.34-.8.32-1.52-.06-2.15-.12-.21-.28-.39-.47-.57,1.24-1.28,2.6-2.67,4.08-4.19.49.46.91.98,1.22,1.56.71,1.31.81,2.55.31,3.72h0Z"/>
        </g>
      </g>
    </g>
    <g id="size" class="st1">
      <path d="M148.22,33.18l7.66-10.32-6.75-9.48h3.12l3.59,5.08c.75,1.05,1.28,1.86,1.59,2.43.44-.72.96-1.47,1.57-2.26l3.98-5.25h2.85l-6.96,9.33,7.5,10.47h-3.24l-4.98-7.06c-.28-.41-.57-.85-.86-1.32-.44.72-.76,1.22-.95,1.49l-4.97,6.9h-3.15Z"/>
      <path d="M166.67,33.18l7.66-10.32-6.75-9.48h3.12l3.59,5.08c.75,1.05,1.28,1.86,1.59,2.43.44-.72.96-1.47,1.57-2.26l3.98-5.25h2.85l-6.96,9.33,7.5,10.47h-3.24l-4.98-7.06c-.28-.41-.57-.85-.86-1.32-.44.72-.76,1.22-.95,1.49l-4.97,6.9h-3.15Z"/>
      <path d="M186.83,33.18v-14.35h2.17v2.01c.45-.7,1.05-1.27,1.8-1.7s1.6-.64,2.55-.64c1.06,0,1.93.22,2.61.66s1.16,1.06,1.44,1.85c1.13-1.67,2.61-2.51,4.43-2.51,1.42,0,2.52.39,3.28,1.18s1.15,2,1.15,3.64v9.85h-2.42v-9.04c0-.97-.08-1.67-.24-2.1s-.44-.77-.86-1.03-.9-.39-1.46-.39c-1.01,0-1.85.34-2.51,1.01s-1,1.74-1,3.22v8.33h-2.43v-9.32c0-1.08-.2-1.89-.59-2.43s-1.04-.81-1.95-.81c-.68,0-1.32.18-1.9.54s-1,.89-1.26,1.58-.39,1.69-.39,3v7.44h-2.43Z"/>
      <path d="M209.87,33.18v-14.35h2.17v2.01c.45-.7,1.05-1.27,1.8-1.7s1.6-.64,2.55-.64c1.06,0,1.93.22,2.61.66s1.16,1.06,1.44,1.85c1.13-1.67,2.61-2.51,4.43-2.51,1.42,0,2.52.39,3.28,1.18s1.15,2,1.15,3.64v9.85h-2.42v-9.04c0-.97-.08-1.67-.24-2.1s-.44-.77-.86-1.03-.9-.39-1.46-.39c-1.01,0-1.85.34-2.51,1.01s-1,1.74-1,3.22v8.33h-2.43v-9.32c0-1.08-.2-1.89-.59-2.43s-1.04-.81-1.95-.81c-.68,0-1.32.18-1.9.54s-1,.89-1.26,1.58-.39,1.69-.39,3v7.44h-2.43Z"/>
    </g>
    <g id="caption">
      <g class="st1">
        <path d="M141.16,2.38s.02.06.07.06h.98c.16,0,.31,0,.46,0,.09,0,.17.02.24.08.07.06.1.14.1.22,0,.09-.03.17-.1.24s-.15.09-.24.09c-.15,0-.3,0-.45,0h-.98s-.07.02-.07.07v.25c0,.6-.03,1.11-.1,1.53-.06.43-.18.82-.35,1.18-.17.36-.39.67-.68.94s-.65.51-1.08.74c-.08.04-.16.05-.24.05-.03,0-.06,0-.09,0-.11-.02-.2-.06-.28-.14-.04-.04-.07-.09-.07-.14s0-.1.03-.15.07-.08.12-.1c.37-.16.68-.34.92-.53s.46-.43.65-.72.32-.65.4-1.07.13-.93.13-1.52v-.31s-.02-.07-.06-.07h-2.5s-.07.02-.07.07v1.42c0,.12,0,.26.02.44,0,.09-.03.18-.1.25s-.15.11-.25.11c-.09,0-.17-.04-.24-.11s-.09-.15-.09-.25c.01-.16.02-.31.02-.44v-1.42s-.02-.07-.07-.07h-.94c-.15,0-.33,0-.54.02-.09,0-.17-.03-.24-.1s-.1-.14-.1-.24.03-.17.1-.23c.07-.06.15-.09.24-.08.21.01.39.02.54.02h.94s.07-.02.07-.06v-1.13c0-.09,0-.18,0-.27s.02-.18.09-.25.14-.11.24-.11.17.03.24.1c.06.07.09.15.09.25,0,.09,0,.18,0,.26v1.14s.02.06.07.06h2.5s.06-.02.06-.06v-1.1c0-.11,0-.23,0-.35,0-.1.02-.19.09-.26.06-.07.15-.11.24-.11s.18.04.25.11c.07.07.1.16.08.26,0,.12,0,.24,0,.35v1.1Z"/>
        <path d="M150.93,1.85s.09,0,.12,0c.14,0,.25.03.34.1.11.06.17.16.17.27,0,.04,0,.07-.02.11,0,.04-.02.12-.05.26-.18,1.11-.47,2.02-.9,2.72-.31.54-.73,1.01-1.27,1.43-.54.41-1.16.74-1.89.98-.06.02-.12.03-.18.03-.05,0-.11,0-.16-.03-.12-.03-.22-.09-.3-.18-.06-.06-.07-.14-.04-.22s.09-.13.18-.16c.16-.05.32-.1.47-.15.49-.16.96-.4,1.42-.74s.83-.71,1.1-1.13c.22-.35.41-.77.55-1.25s.25-.93.3-1.36c0-.05-.01-.07-.06-.07h-4.99s-.07.02-.07.07v1.76c0,.1-.02.18-.09.25-.06.07-.14.1-.24.1-.09,0-.16-.04-.23-.11-.06-.06-.09-.14-.09-.23v-1.96c0-.13.05-.25.14-.34s.21-.14.33-.14h0c.09,0,.2,0,.32,0h1.93s.07-.02.07-.07V.71c0-.09.02-.17.09-.24.06-.08.15-.11.25-.11s.19.04.25.11c.06.07.1.15.1.24v.3s0,.79,0,.79c0,.05.02.07.06.07h2.03c.14,0,.25,0,.34-.02Z"/>
        <path d="M154.83,7.61s-.08,0-.12,0c-.07,0-.14-.01-.21-.04-.11-.05-.19-.12-.25-.22-.03-.04-.04-.08-.04-.13,0-.04,0-.07.03-.11.04-.08.11-.13.19-.15,1.18-.22,2.26-.65,3.23-1.27.59-.37,1.12-.82,1.61-1.34.49-.52.88-1.06,1.18-1.59.04-.07.1-.11.18-.11h0c.08,0,.13.04.18.11.06.12.1.23.1.34,0,.12-.03.23-.1.34-.33.53-.74,1.05-1.21,1.54s-.99.92-1.57,1.29c-1.01.65-2.08,1.1-3.2,1.35ZM154.56,1.67c-.07-.05-.11-.12-.12-.21s.02-.16.07-.23c.07-.07.15-.11.25-.12h.04c.08,0,.15.02.22.07.62.45,1.2.93,1.74,1.42.08.06.11.14.11.24s-.03.18-.1.25-.15.11-.25.11-.18-.03-.25-.1c-.57-.54-1.15-1.02-1.71-1.43Z"/>
        <path d="M165.17,1.63v1.44s.02.07.06.08c1.22.38,2.38.81,3.47,1.31.09.05.16.12.19.21.02.05.03.09.03.14,0,.05,0,.1-.03.15-.04.09-.11.16-.2.19s-.18.03-.28-.01c-.96-.48-2.02-.91-3.19-1.28-.01,0-.02,0-.04.01-.01,0-.02.02-.02.04v2.97s.03.67.03.67c0,.1-.03.18-.1.25-.07.08-.16.11-.26.11s-.19-.04-.26-.11c-.06-.07-.09-.15-.09-.25v-.68s0-5.25,0-5.25l-.02-.54c0-.09.03-.18.1-.25.06-.08.15-.11.25-.11s.19.04.26.11c.06.07.1.15.1.25l-.03.54ZM168.29,2.24c.04.06.04.12.02.18s-.07.11-.13.14-.13.03-.2,0-.12-.07-.15-.13c-.18-.35-.37-.66-.55-.94-.04-.05-.04-.11-.03-.17.02-.06.06-.1.11-.13.06-.03.13-.03.2-.01s.12.06.16.12c.22.33.41.64.56.93ZM168.36,1.07s-.04-.08-.04-.12c0-.02,0-.04,0-.05.02-.06.05-.1.11-.13.04-.02.08-.04.13-.04.02,0,.05,0,.07.02.07.01.13.05.17.11.22.32.41.62.58.92.02.04.03.07.03.11,0,.02,0,.05,0,.07-.02.07-.06.12-.12.15-.04.02-.08.03-.11.03-.03,0-.06,0-.09-.02-.06-.02-.11-.06-.15-.12-.18-.33-.36-.64-.56-.92Z"/>
        <path d="M173.08,4.1c.04-.08.1-.13.18-.15.08-.03.16-.02.24.02s.13.1.16.18c.03.08.02.16-.02.23-.36.64-.82,1.29-1.36,1.93-.06.08-.15.12-.24.13s-.18,0-.26-.07-.12-.13-.12-.23c0-.08.03-.14.09-.2.23-.24.47-.53.72-.87s.45-.66.62-.97ZM178.13,2.7h-2.38s-.07.02-.07.07v4.32c0,.23-.06.41-.17.52s-.3.17-.57.17c-.32,0-.63-.01-.92-.04-.09,0-.17-.04-.24-.11s-.1-.15-.11-.24c0-.08.02-.15.08-.2s.13-.08.21-.07c.29.04.53.06.74.06.23,0,.35-.12.35-.35V2.77s-.02-.07-.07-.07h-2.47c-.15,0-.28,0-.4,0-.09,0-.17-.02-.24-.09s-.1-.14-.1-.24c0-.09.03-.16.1-.22.07-.06.15-.09.23-.08.13,0,.27,0,.4,0h2.48s.07-.02.07-.06v-.9l-.02-.27c0-.09.03-.16.09-.23.06-.08.14-.11.24-.11.1,0,.18.04.25.11.06.06.09.14.09.23l-.02.27v.9s.02.06.07.06h2.37c.13,0,.25,0,.36,0,.09,0,.17.02.24.08.07.06.1.14.1.22s-.03.16-.1.23-.15.09-.24.09h-.35ZM177.17,4.37s-.06-.1-.06-.15c0-.02,0-.04,0-.06.02-.08.06-.13.13-.17.05-.04.11-.05.18-.05.02,0,.05,0,.08,0,.09.02.16.06.21.14.38.49.78,1.1,1.2,1.81.03.05.04.11.04.17,0,.03,0,.06,0,.09-.02.09-.08.16-.16.2-.05.03-.11.04-.16.04-.04,0-.07,0-.11,0-.09-.03-.15-.08-.19-.17-.4-.74-.79-1.36-1.16-1.85Z"/>
        <path d="M181.05,4.46h-.02c-.1,0-.18-.04-.25-.11-.08-.08-.12-.17-.12-.27s.04-.19.12-.26c.07-.06.16-.1.25-.1h.02c.25.01.52.02.83.02h4.95c.19,0,.38,0,.56-.02h.03c.09,0,.18.03.25.1.08.07.11.16.11.26s-.04.2-.11.27c-.07.06-.16.1-.25.1h-.02c-.2,0-.38,0-.55,0h-4.96c-.28,0-.56,0-.83.02Z"/>
        <path d="M190.23,7.49c-.08.08-.17.12-.27.12h-.04c-.09,0-.18-.03-.26-.09-.08-.05-.11-.12-.11-.21,0-.09.03-.16.1-.21.62-.53,1.04-1.2,1.28-2,.18-.56.27-1.77.27-3.63,0-.09,0-.18,0-.25,0-.1.02-.19.08-.26.06-.07.14-.11.23-.11.1,0,.18.04.25.11.07.07.1.16.08.26,0,.09,0,.18,0,.25,0,1.88-.09,3.15-.27,3.81-.23.84-.68,1.57-1.33,2.21ZM194.13,7.55c-.08.04-.15.06-.22.06-.08,0-.15-.03-.22-.09-.12-.09-.18-.22-.18-.37,0-.02,0-.05,0-.07,0-.08,0-.15,0-.21V1.46c0-.09,0-.19,0-.28,0-.1.02-.19.09-.26.06-.07.15-.11.24-.11s.18.04.25.11c.06.07.09.15.09.25v5.51s0,.03.02.04c.01,0,.02,0,.04,0,.42-.2.85-.47,1.29-.82.45-.35.83-.73,1.16-1.16.05-.06.11-.1.19-.1s.14.04.19.11c.06.08.09.16.09.25,0,.11-.03.2-.1.27-.38.45-.82.87-1.33,1.27s-1.02.72-1.53.98l-.07.04Z"/>
        <path d="M199.39,3.55c.14,0,.26.05.36.15s.15.22.15.36v2.32s.01.08.04.11c.43.62,1.2.95,2.3.98.44.02.91.03,1.42.03.71,0,1.5-.02,2.36-.05.07,0,.13.02.17.08.02.04.04.07.04.11,0,.02,0,.05,0,.07-.03.09-.08.16-.15.22s-.15.09-.24.09c-.77.02-1.46.04-2.09.04-.54,0-1.04,0-1.49-.03-.59-.02-1.09-.11-1.51-.28-.41-.17-.76-.42-1.04-.75-.03-.03-.06-.03-.09,0-.33.32-.65.62-.97.91-.06.06-.14.08-.22.07s-.15-.06-.19-.14c-.05-.08-.06-.17-.04-.26.02-.09.07-.17.14-.22.38-.3.69-.57.96-.82.03-.03.04-.06.04-.11v-2.26s-.02-.06-.06-.06h-.83c-.08,0-.14-.03-.2-.08s-.08-.12-.08-.2.03-.15.08-.2.12-.08.2-.08h.94ZM200.01,1.47c.05.07.07.15.06.23s-.05.15-.12.2c-.06.05-.14.07-.22.06-.08-.01-.15-.05-.19-.12-.26-.36-.61-.72-1.05-1.08-.05-.05-.08-.11-.07-.18s.03-.13.09-.18c.06-.05.14-.07.22-.07h0c.08,0,.16.03.22.08.42.35.77.7,1.05,1.05ZM201.74,1.65c-.04-.07-.04-.14-.01-.21s.08-.12.15-.14h0s-1.2,0-1.2,0c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.13.07-.18.11-.08.17-.08h2.23s.06-.02.06-.06v-.43c0-.08.03-.15.08-.21s.12-.08.2-.08.15.03.21.08.09.12.09.21v.43s.02.06.06.06h2.34c.07,0,.13.03.18.08s.07.11.07.18-.02.12-.07.17-.11.07-.18.07h-1.13c.05.03.09.06.11.11s.02.1,0,.14c-.15.29-.28.51-.37.67,0,.01,0,.02,0,.04s.02.02.04.02h.76c.14,0,.26.05.36.15s.15.22.15.37v3.47c0,.16-.02.28-.06.36s-.12.15-.23.19c-.13.06-.41.09-.83.09-.08,0-.16-.02-.22-.08-.06-.05-.11-.11-.14-.19-.02-.06-.02-.12.02-.17s.08-.08.15-.08c.2,0,.4,0,.62,0,.06,0,.1-.02.11-.03s.03-.05.03-.1v-3.44s-.02-.07-.06-.07h-1.66s-.07.02-.07.07v.49s.02.07.07.07h1.12c.06,0,.11.02.15.06s.06.09.06.15-.02.11-.06.15-.09.06-.15.06h-1.12s-.07.02-.07.07v.54s.02.07.07.07h.4c.15,0,.27.05.37.15s.15.22.15.37v.57c0,.15-.05.27-.15.37s-.22.15-.37.15h-1.4s-.04.01-.04.04v.08c0,.06-.02.12-.07.16-.04.04-.1.07-.16.07s-.11-.02-.16-.07c-.04-.04-.07-.1-.07-.16v-1.21c0-.15.05-.27.15-.37s.22-.15.37-.15h.36s.06-.02.06-.07v-.54s-.02-.07-.06-.07h-1.11c-.06,0-.11-.02-.15-.06s-.06-.09-.06-.15.02-.11.06-.15.09-.06.15-.06h1.11s.06-.02.06-.07v-.49s-.02-.07-.06-.07h-1.59s-.06.02-.06.07v3.83c0,.08-.03.14-.08.19s-.12.08-.2.08-.14-.03-.19-.08-.08-.12-.08-.19v-3.87c0-.15.05-.27.15-.37s.22-.15.36-.15h.62s.03,0,.04-.02.01-.03,0-.04c-.05-.18-.13-.37-.22-.55ZM204.09,2.27h0s-.05-.03-.06-.06c-.01-.03,0-.05,0-.08.13-.25.25-.51.37-.78,0-.01,0-.02,0-.04s-.02-.02-.04-.02h-2.2s-.02,0-.03.02,0,.03,0,.04c.15.23.26.47.33.69.01.05,0,.09-.02.13s-.06.07-.1.08c0,0,0,0,0,0h1.72ZM203.99,5.7s.07-.02.07-.06v-.69s-.02-.06-.07-.06h-1.37s-.06.02-.06.06v.69s.02.06.06.06h1.37Z"/>
        <path d="M215.16,1.29c.06.06.08.12.08.2s-.03.15-.08.2c-.06.06-.12.08-.21.08h-6.46s-.06.02-.06.06v1.7c0,1.92-.25,3.4-.74,4.42-.03.07-.08.11-.17.13h-.06c-.06,0-.11-.01-.16-.04-.07-.05-.12-.11-.14-.19-.01-.04-.02-.07-.02-.1,0-.05.01-.09.04-.14.44-.92.66-2.28.66-4.08v-1.81c0-.14.05-.26.15-.37.1-.1.22-.15.36-.15h2.73s.07-.02.07-.06V.33c0-.09.03-.16.09-.22s.13-.09.22-.09.16.03.22.09.09.13.09.22v.81s.02.06.07.06h3.11c.08,0,.15.03.21.08ZM209.15,7.1c-.04.07-.1.12-.18.14s-.16.02-.23-.02c-.06-.03-.11-.08-.13-.15-.01-.03-.02-.06-.02-.09,0-.04.01-.08.04-.12.29-.54.5-1.28.64-2.21,0-.08.04-.13.1-.18s.13-.06.21-.04c.08.02.14.06.18.12s.06.13.05.21c-.16,1.04-.38,1.82-.65,2.34ZM211.53,7.5h1.27c.18,0,.3-.08.36-.24s.09-.5.11-1.03c0-.07.04-.12.1-.15s.12-.03.18,0c.08.04.15.09.2.17s.07.16.07.24c-.04.62-.12,1.04-.25,1.25s-.36.32-.71.32h-1.37c-.38,0-.63-.06-.76-.19-.13-.13-.2-.37-.2-.73v-3.24c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v3.25c0,.15.03.24.08.29s.17.07.35.07ZM212.92,3.25c.06.05.1.11.11.2,0,.09-.02.16-.08.22-.06.06-.13.09-.22.1-.08,0-.16-.02-.23-.07-.43-.36-.96-.71-1.57-1.05-.06-.04-.1-.09-.11-.15s.01-.12.07-.17c.08-.08.17-.12.25-.12.06,0,.13.02.19.05.62.32,1.15.66,1.6,1ZM213.69,4.65s-.04-.08-.04-.13c0-.02,0-.05.02-.08.02-.07.07-.12.13-.15.05-.02.09-.03.13-.03.04,0,.07,0,.11.02.08.03.14.08.18.15.53.86.9,1.65,1.11,2.37,0,.04,0,.07,0,.1,0,.05-.01.11-.04.16-.04.08-.11.14-.19.18-.03.01-.06.02-.1.02-.04,0-.08,0-.12-.03-.07-.04-.12-.1-.14-.18-.21-.75-.56-1.55-1.06-2.4Z"/>
        <path d="M222.16,2.38s.02.06.07.06h.98c.16,0,.31,0,.46,0,.09,0,.17.02.24.08.07.06.1.14.1.22,0,.09-.03.17-.1.24s-.15.09-.24.09c-.15,0-.3,0-.45,0h-.98s-.07.02-.07.07v.25c0,.6-.03,1.11-.1,1.53-.06.43-.18.82-.35,1.18-.17.36-.39.67-.68.94s-.65.51-1.08.74c-.08.04-.16.05-.24.05-.03,0-.06,0-.09,0-.11-.02-.2-.06-.28-.14-.04-.04-.07-.09-.08-.14s0-.1.03-.15.07-.08.12-.1c.37-.16.68-.34.92-.53s.46-.43.65-.72.32-.65.4-1.07.13-.93.13-1.52v-.31s-.02-.07-.06-.07h-2.5s-.07.02-.07.07v1.42c0,.12,0,.26.02.44,0,.09-.03.18-.1.25s-.15.11-.25.11c-.09,0-.17-.04-.24-.11s-.09-.15-.09-.25c.01-.16.02-.31.02-.44v-1.42s-.02-.07-.07-.07h-.94c-.15,0-.33,0-.54.02-.09,0-.17-.03-.24-.1s-.1-.14-.1-.24.03-.17.1-.23c.07-.06.15-.09.24-.08.21.01.39.02.54.02h.94s.07-.02.07-.06v-1.13c0-.09,0-.18,0-.27s.02-.18.09-.25.14-.11.24-.11.17.03.24.1c.06.07.09.15.09.25,0,.09,0,.18,0,.26v1.14s.02.06.07.06h2.5s.06-.02.06-.06v-1.1c0-.11,0-.23,0-.35,0-.1.02-.19.09-.26.06-.07.14-.11.24-.11s.18.04.25.11c.07.07.1.16.08.26,0,.12,0,.24,0,.35v1.1Z"/>
        <path d="M231.66.83c.07-.07.16-.11.25-.12h.03c.08,0,.16.03.23.1.08.06.11.15.11.25,0,.09-.04.18-.11.25-.68.64-1.38,1.19-2.1,1.65-.04.02-.06.06-.06.1v3.82l.02.55c0,.09-.03.18-.1.25-.07.08-.16.12-.26.12s-.19-.04-.26-.12c-.06-.07-.1-.15-.1-.25l.02-.55v-3.42s0-.02-.02-.03c-.01,0-.02,0-.04,0-.97.52-1.98.95-3.04,1.29-.04.01-.08.02-.13.02-.05,0-.11,0-.17-.03-.1-.04-.18-.11-.23-.2-.02-.04-.04-.08-.04-.13,0-.04,0-.07.02-.11.04-.08.1-.13.18-.16.66-.18,1.32-.41,1.97-.69s1.22-.57,1.7-.87c.85-.53,1.56-1.1,2.12-1.72Z"/>
        <path d="M240.03,1.42h.11c.13,0,.25.04.35.11.05.05.08.11.1.18s0,.14-.04.2l-.07.14c-.16.41-.37.86-.64,1.34s-.55.91-.84,1.29c-.03.03-.03.06,0,.09.79.69,1.57,1.48,2.36,2.39.06.06.09.14.09.23,0,.12-.04.21-.13.29-.06.05-.14.08-.22.08h-.04c-.1-.01-.18-.06-.24-.13-.69-.86-1.44-1.64-2.24-2.36-.03-.03-.06-.03-.09,0-.47.5-.97.97-1.5,1.38-.53.42-1.08.78-1.66,1.07-.07.04-.14.05-.22.05-.04,0-.07,0-.1,0-.11-.02-.21-.08-.28-.16-.05-.05-.07-.1-.07-.17,0-.02,0-.04,0-.06.02-.09.07-.15.15-.18.63-.28,1.23-.65,1.81-1.09.58-.45,1.1-.93,1.57-1.46.3-.35.6-.75.89-1.23.29-.47.49-.89.62-1.26,0-.02,0-.03,0-.05s-.03-.02-.04-.02h-3.52c-.13,0-.31,0-.52.03-.09,0-.18-.03-.25-.1s-.11-.15-.11-.25.04-.18.11-.25.16-.09.25-.09c.23.02.4.03.52.03h3.53c.14,0,.27,0,.38-.03ZM241.14,1.26c.03.06.03.12.01.18s-.06.11-.12.14c-.06.03-.12.03-.19,0-.06-.02-.11-.06-.15-.13-.14-.27-.3-.54-.48-.83-.04-.05-.04-.11-.03-.17.02-.06.06-.1.11-.13.06-.02.13-.03.2,0s.12.06.15.11c.19.29.35.57.49.82ZM241.22.31s-.04-.07-.04-.11c0-.02,0-.04,0-.05.02-.06.05-.1.11-.13.04-.01.08-.02.11-.02.03,0,.06,0,.08,0,.06.02.12.06.16.11.19.29.36.56.51.82.02.04.03.07.03.11,0,.02,0,.05,0,.07-.02.06-.06.11-.12.14-.04.02-.07.03-.11.03-.03,0-.06,0-.09-.02-.06-.02-.11-.06-.14-.12-.16-.3-.33-.58-.5-.83Z"/>
      </g>
      <g class="st1">
        <path d="M159.23,240.93s.06-.02.08-.02c.04,0,.07,0,.1.03.06.03.1.07.11.13.01.08,0,.15-.03.22s-.08.12-.15.14c-.12.06-.33.16-.62.29s-.51.24-.65.3c-.07.04-.14.04-.21.01-.07-.03-.12-.08-.15-.15-.01-.04-.02-.07-.02-.11s0-.07.02-.11c.03-.07.08-.12.15-.15.3-.13.75-.33,1.36-.61ZM164.57,244.06c.07-.05.14-.07.22-.07s.15.03.22.08c.05.04.08.09.08.16s-.03.11-.09.15c-.45.28-.91.53-1.4.76-.02,0-.03.02-.03.03,0,.02,0,.03.02.03.56.42,1.22.73,1.98.92.07.02.12.06.14.12s.01.12-.03.18c-.05.08-.12.13-.2.17-.05.02-.09.03-.14.03-.04,0-.07,0-.11,0-.81-.25-1.52-.61-2.12-1.09-.6-.48-1.07-1.08-1.42-1.78,0,0,0,0,0,0s-.01,0-.02,0c-.36.31-.79.59-1.29.85-.04.02-.06.05-.06.1v1.11s.02.07.07.06c.66-.09,1.26-.18,1.79-.25.07-.01.13,0,.18.05.05.04.08.1.08.17,0,.07-.02.13-.07.19-.04.06-.1.09-.17.09-.52.08-1.58.22-3.16.44-.08.01-.15,0-.21-.04s-.1-.1-.12-.18c-.01-.07,0-.13.04-.19s.1-.09.17-.1c.25-.03.5-.06.76-.1.05,0,.07-.03.07-.08v-.91s0-.03-.02-.04c-.01,0-.03-.01-.04,0-.51.21-.99.37-1.44.48-.04.01-.07.02-.11.02-.12,0-.23-.06-.33-.18-.04-.05-.05-.1-.04-.16s.06-.09.11-.11c.54-.12,1.07-.29,1.6-.5s.98-.45,1.36-.7c0,0,0-.01,0-.02,0,0-.01-.01-.02-.01h-2.85c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.12.07-.17.11-.07.17-.07h3.38s.06-.02.06-.07v-.37c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v.37s.02.07.06.07h3.42c.06,0,.12.02.17.07s.07.1.07.17-.02.12-.07.17-.11.07-.17.07h-3.17s-.03,0-.04.02,0,.03,0,.04c.22.38.5.73.83,1.04.04.03.07.04.11.02.46-.23.9-.49,1.33-.77ZM159.2,239.68c.05.05.08.12.08.19s-.03.14-.09.2c-.05.05-.11.07-.18.07s-.13-.03-.18-.08c-.19-.2-.43-.4-.71-.61-.05-.04-.08-.09-.08-.16s.02-.12.07-.16c.05-.05.12-.08.19-.09h.03c.06,0,.12.02.18.05.29.2.52.39.7.58ZM159.8,238.52c.05-.05.12-.08.19-.08s.14.03.19.08.08.12.08.19v3.65c0,.08-.03.14-.08.19s-.12.08-.19.08-.14-.03-.19-.08-.08-.12-.08-.19v-3.65c0-.08.03-.14.08-.19ZM162.86,241.74s.06-.02.06-.07v-1.36s-.02-.06-.06-.06h-1.85c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h1.85s.06-.02.06-.06v-.91c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v.91s.02.06.06.06h1.92c.07,0,.13.03.18.08s.08.12.08.19-.03.14-.08.19-.11.08-.18.08h-1.92s-.06.02-.06.06v1.36s.02.07.06.07h1.64c.07,0,.13.03.18.08s.08.11.08.18-.03.14-.08.19-.11.08-.18.08h-3.93c-.07,0-.13-.03-.18-.08s-.08-.12-.08-.19.03-.13.08-.18.11-.08.18-.08h1.56Z"/>
        <path d="M174.53,241.81s.07.11.07.18-.02.13-.07.18-.11.07-.18.07h-4.86s-.07.02-.09.06c-.06.15-.12.3-.19.45,0,.01,0,.03,0,.04s.02.02.03.02h4c.15,0,.27.05.37.15s.15.22.15.37v2.97c0,.08-.03.15-.09.22-.06.06-.13.09-.22.09h-.04c-.07,0-.13-.03-.19-.08s-.08-.12-.08-.19c0-.02,0-.04-.03-.04h-3.82s-.04.01-.04.04c0,.08-.03.15-.08.21s-.12.09-.21.09-.15-.03-.21-.09-.08-.13-.08-.21v-2.57s0,0-.02-.01-.02,0-.03,0c-.4.62-.85,1.14-1.35,1.56-.07.06-.15.08-.23.07-.08,0-.16-.04-.22-.11-.05-.05-.08-.12-.08-.19,0-.08.03-.15.1-.2.83-.65,1.46-1.51,1.92-2.59,0-.02,0-.03,0-.04s-.02-.02-.04-.02h-1.6c-.07,0-.13-.02-.18-.07s-.07-.11-.07-.18.02-.13.07-.18.11-.07.18-.07h3.25s.06-.02.06-.07v-.54s-.02-.06-.06-.06h-2.45c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.12.07-.17.1-.07.17-.07h2.45s.06-.02.06-.07v-.53s-.02-.06-.06-.06h-2.83c-.07,0-.13-.02-.18-.08-.05-.05-.07-.11-.07-.18s.02-.12.07-.17.11-.07.18-.07h1.38s.02,0,.03-.02c0-.01.01-.03,0-.04-.1-.16-.22-.34-.37-.53-.04-.05-.05-.11-.04-.18s.06-.11.11-.13.11-.04.17-.04c.11,0,.21.05.28.14.19.22.33.43.44.62.01.03.01.06,0,.09,0,.03-.03.05-.07.07h0s2.42,0,2.42,0h0s-.04-.03-.04-.05,0-.04,0-.06c.15-.2.29-.4.42-.62.05-.08.12-.14.21-.18.05-.02.09-.03.14-.03.04,0,.08,0,.12.02.08.02.13.07.15.15s.01.15-.04.21c-.14.19-.28.35-.4.5,0,.01,0,.02,0,.04s.01.02.03.02h1.45c.07,0,.13.02.18.07s.07.1.07.17-.02.13-.07.18c-.05.05-.11.08-.18.08h-2.86s-.06.02-.06.06v.53s.02.07.06.07h2.47c.06,0,.12.02.17.07s.07.1.07.17-.02.12-.07.17-.1.07-.17.07h-2.47s-.06.02-.06.06v.54s.02.07.06.07h3.25c.07,0,.13.02.18.07ZM173.15,243.33s-.02-.06-.06-.06h-3.75s-.07.02-.07.06v.46s.02.06.07.06h3.75s.06-.02.06-.06v-.46ZM173.09,244.82s.06-.02.06-.07v-.44s-.02-.07-.06-.07h-3.75s-.07.02-.07.07v.44s.02.07.07.07h3.75ZM169.27,245.75s.02.07.07.07h3.75s.06-.02.06-.07v-.46s-.02-.07-.06-.07h-3.75s-.07.02-.07.07v.46Z"/>
        <path d="M183.21,241.77c.07-.02.14-.02.2,0l.13.07c.06.03.11.08.12.14,0,.02,0,.04,0,.06,0,.05-.01.09-.04.12-.5.77-.93,1.35-1.3,1.74-.05.06-.12.09-.21.1-.08,0-.16,0-.23-.05-.06-.04-.1-.1-.11-.17s.01-.14.07-.19c.32-.35.62-.75.91-1.2,0-.01,0-.02,0-.04,0-.01-.01-.02-.03-.02h-2.57s-.06.02-.06.07v3.45c0,.2-.03.35-.09.44-.06.1-.16.17-.32.21-.22.07-.66.11-1.3.11-.09,0-.17-.03-.24-.08s-.12-.13-.15-.21c-.03-.06-.02-.13.01-.18s.09-.09.16-.09h.52c.24,0,.43,0,.58,0,.08,0,.14-.02.17-.04s.04-.07.04-.14v-3.44s-.02-.07-.06-.07h-3.39c-.08,0-.15-.03-.21-.08-.06-.05-.08-.12-.08-.2s.03-.14.08-.2.12-.08.21-.08h4.42s.01,0,.01-.01c0,0,0-.02-.01-.02-.72-.36-1.52-.74-2.39-1.13-.06-.03-.11-.08-.12-.15-.02-.07,0-.13.04-.18.05-.06.11-.11.18-.13s.15-.02.22.01c.25.11.7.31,1.35.59.04.02.08.02.12,0,.64-.36,1.21-.77,1.71-1.23.01-.01.01-.02,0-.03,0,0-.01-.01-.02-.01h-4.69c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.2.03-.14.08-.2c.05-.05.12-.08.19-.08h5.34s.05,0,.07,0c.05,0,.1.02.15.05l.11.09c.06.05.09.11.1.18s-.02.13-.07.18c-.62.58-1.34,1.12-2.14,1.62-.01,0-.02.02-.02.03,0,.02,0,.03.02.03.28.13.53.25.76.36.05.03.09.07.11.13s0,.11-.03.17c-.01.02,0,.03,0,.03h1.91s.01,0,.03,0Z"/>
        <path d="M189.1,243.88s-.06.02-.06.07v1.78s.02.07.06.08c.39.07.88.11,1.48.11.89,0,1.54,0,1.94,0,.07,0,.13.03.17.1.02.04.03.07.03.11,0,.02,0,.05,0,.08-.04.09-.1.17-.17.22s-.16.08-.25.08h-1.73c-.5,0-.94-.03-1.32-.07-.38-.05-.74-.14-1.09-.27s-.67-.32-.94-.57c-.27-.25-.51-.56-.71-.94,0-.01-.01-.02-.03-.02s-.02,0-.03.02c-.28.73-.64,1.33-1.11,1.8-.06.06-.14.1-.23.1s-.17-.03-.24-.09c-.06-.05-.1-.12-.1-.21,0-.08.03-.14.08-.19.73-.68,1.2-1.74,1.42-3.19.01-.08.05-.15.12-.2s.14-.07.22-.07c.08,0,.15.05.2.11s.07.14.06.22c-.04.3-.1.58-.17.83,0,.04,0,.08,0,.12.33.85.89,1.42,1.66,1.72.02,0,.03,0,.04,0s.02-.02.02-.04v-3.76s-.02-.06-.06-.06h-1.94c-.08,0-.14-.03-.2-.08s-.08-.12-.08-.2.03-.14.08-.2c.06-.05.12-.08.2-.08h4.7c.08,0,.15.03.2.08.05.06.08.12.08.2s-.03.14-.08.2-.12.08-.2.08h-2.03s-.06.02-.06.06v1.43s.02.07.06.07h2.37c.08,0,.14.03.2.08.06.06.08.12.08.2s-.03.14-.08.2-.12.08-.2.08h-2.37ZM185.68,240.06s-.06.02-.06.07v.98c0,.08-.03.14-.09.2s-.13.09-.21.09-.15-.03-.21-.09-.09-.13-.09-.2v-1.08c0-.15.05-.27.15-.37s.22-.15.36-.15h2.81s.06-.02.06-.07v-.68c0-.09.03-.16.09-.22s.13-.09.22-.09.15.03.22.09.09.13.09.22v.68s.02.07.06.07h2.85c.14,0,.26.05.36.15s.15.22.15.37v1.07c0,.08-.03.15-.09.21s-.13.09-.22.09-.16-.03-.22-.09-.09-.13-.09-.21v-.97s-.02-.07-.06-.07h-6.12Z"/>
        <path d="M198.36,246.11s-.06,0-.09,0c-.07,0-.14-.01-.21-.04-.1-.05-.18-.12-.23-.21-.04-.07-.04-.14,0-.21s.09-.11.18-.12c.13-.02.27-.05.4-.07.3-.06.58-.17.84-.31s.51-.32.73-.53.4-.48.53-.8c.13-.32.2-.67.2-1.04,0-.7-.21-1.29-.64-1.78s-1.01-.77-1.76-.84c-.05,0-.07.01-.08.06-.12.92-.29,1.76-.51,2.52-.55,1.84-1.24,2.76-2.06,2.76-.4,0-.76-.22-1.07-.65s-.47-1.01-.47-1.71c0-.47.1-.92.3-1.36.2-.44.47-.82.82-1.14.34-.32.75-.58,1.23-.78s.98-.29,1.51-.29.97.08,1.4.25.79.4,1.07.69.51.64.67,1.03c.16.39.24.82.24,1.26,0,.87-.26,1.6-.79,2.17-.52.58-1.26.95-2.21,1.13ZM195.69,244.77c.21,0,.44-.18.69-.53s.48-.9.69-1.63c.22-.71.39-1.5.5-2.37,0-.02,0-.03-.02-.04s-.03-.01-.04,0c-.41.05-.79.18-1.15.38s-.65.44-.88.71-.41.57-.54.89-.2.63-.2.94c0,.53.1.95.3,1.23.2.29.42.44.65.44Z"/>
        <path d="M204.85,241.44c.03.08.03.15,0,.22s-.07.13-.14.17l-1.54.91c-.07.04-.15.05-.23.03-.08-.02-.14-.06-.18-.13-.03-.05-.04-.09-.04-.14,0-.02,0-.05,0-.08.02-.08.07-.13.14-.17.44-.23,1-.54,1.67-.93.06-.04.12-.04.18-.02s.11.07.12.13ZM210.64,243.6c.05.05.08.12.08.19s-.03.14-.08.19-.12.08-.19.08h-2.78s-.02,0-.03.02,0,.02,0,.03c.36.36.8.7,1.31,1,.52.3,1.06.54,1.61.72.07.02.11.07.13.14s0,.13-.04.19c-.06.08-.13.13-.22.16s-.18.03-.26,0c-.59-.22-1.16-.51-1.71-.87s-1.01-.75-1.39-1.18c-.01,0-.02,0-.03,0,0,0-.01.01-.01.02v2.04c0,.08-.03.15-.09.21s-.13.09-.21.09-.15-.03-.21-.09-.09-.13-.09-.21v-2.07s0-.02-.01-.02c0,0-.02,0-.03,0-.37.43-.83.84-1.38,1.22-.55.38-1.11.68-1.69.92-.09.04-.18.04-.26,0s-.16-.08-.22-.16c-.04-.04-.05-.08-.05-.13,0-.02,0-.04,0-.06.02-.07.06-.12.13-.15.53-.19,1.05-.45,1.56-.76s.94-.65,1.29-1.01c.01,0,.01-.01,0-.03s-.01-.02-.03-.02h-2.71c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h3.31s.06-.02.06-.06v-.66s-.02-.07-.06-.07h-.74c-.15,0-.27-.05-.37-.15s-.15-.22-.15-.37v-2.34c0-.14.05-.26.15-.36s.22-.15.37-.15h.55s.08-.02.09-.06c.07-.23.12-.41.16-.54.02-.09.07-.16.14-.2.06-.04.12-.06.18-.06.02,0,.04,0,.06,0,.08.01.14.05.18.13.04.07.05.15.02.22-.08.22-.14.37-.17.45,0,.02,0,.03,0,.04s.02.02.04.02h.99c.15,0,.27.05.37.15s.15.22.15.36v2.34c0,.15-.05.27-.15.37s-.22.15-.37.15h-.8s-.06.02-.06.07v.66s.02.06.06.06h3.36c.08,0,.14.03.19.08ZM204.64,240.11c.05.06.07.14.07.21,0,.08-.05.15-.11.21-.06.05-.12.07-.2.07-.07,0-.14-.05-.19-.11-.28-.33-.63-.67-1.06-1-.06-.04-.09-.09-.09-.16,0-.07.02-.12.07-.17.06-.05.13-.08.21-.08s.15.02.22.07c.45.33.81.65,1.09.98ZM205.73,239.85s-.07.02-.07.06v.83s.02.06.07.06h2.03s.07-.02.07-.06v-.83s-.02-.06-.07-.06h-2.03ZM205.73,241.26s-.07.02-.07.07v.85s.02.06.07.06h2.03s.07-.02.07-.06v-.85s-.02-.07-.07-.07h-2.03ZM210.63,242.22c.08.06.11.14.11.24,0,.06-.02.13-.07.18-.05.06-.12.09-.2.1s-.15-.01-.21-.06c-.42-.34-.94-.69-1.56-1.04-.06-.04-.09-.09-.11-.15-.01-.07,0-.12.05-.17.05-.06.11-.09.18-.11.08-.01.15,0,.22.03.61.32,1.13.65,1.57.98ZM209.86,239.13c.06-.06.13-.1.21-.12.08-.01.16,0,.23.04s.11.1.12.17c0,.07-.01.14-.06.19-.39.42-.78.79-1.16,1.1-.06.05-.14.08-.22.08-.08,0-.15-.02-.22-.07-.05-.04-.08-.09-.09-.15s.02-.12.07-.16c.43-.37.8-.73,1.11-1.08Z"/>
        <path d="M219.67,242.09c.05.05.08.12.08.19s-.03.14-.08.19-.12.08-.19.08h-2.23s-.02,0-.02.02,0,.02,0,.03c.3.28.67.53,1.11.75s.88.41,1.35.55c.07.02.11.06.13.12,0,.02,0,.05,0,.07,0,.04-.01.08-.04.11-.05.08-.12.13-.21.16s-.17.03-.25,0c-.08-.02-.16-.05-.25-.09-.02,0-.03,0-.04,0-.01,0-.02.02-.02.04v2.02c0,.08-.03.14-.08.2-.06.05-.12.08-.2.08h0c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19c0-.02-.01-.04-.04-.04h-1.67s-.04.01-.04.04v.04c0,.07-.03.13-.08.18s-.12.08-.19.08-.14-.03-.19-.08-.08-.11-.08-.18v-2.12c0-.14.05-.26.15-.37.1-.1.22-.15.37-.15h1.19s.02,0,.02-.01c0,0,0-.02-.01-.02-.56-.33-1.03-.71-1.41-1.13-.03-.03-.07-.04-.11-.04h-1.24s-.08.01-.11.04c-.41.43-.9.81-1.47,1.13-.01,0-.02.01-.01.02,0,0,0,.01.01.01h1.24c.14,0,.26.05.36.15.1.1.15.22.15.37v2.07c0,.07-.03.13-.08.19-.05.05-.12.08-.19.08h0c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19c0-.02-.01-.04-.04-.04h-1.64s-.04.01-.04.04v.04c0,.07-.03.13-.08.18s-.12.08-.19.08-.14-.03-.19-.08-.08-.11-.08-.18v-2.09s0-.03-.02-.04c-.01,0-.02,0-.04,0-.08.04-.17.07-.26.11-.05.02-.1.03-.15.03-.11,0-.21-.05-.3-.16-.03-.04-.04-.08-.04-.12,0-.02,0-.04,0-.05.01-.06.05-.11.11-.13.97-.35,1.76-.8,2.38-1.34.01,0,.01-.01,0-.03s-.01-.02-.02-.02h-2.17c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h2.67s.08-.01.11-.04c.16-.2.29-.4.4-.62,0-.01,0-.02,0-.04s-.02-.02-.04-.02h-2.27c-.14,0-.26-.05-.36-.15s-.15-.22-.15-.37v-1.42c0-.14.05-.26.15-.36s.22-.15.36-.15h1.84c.14,0,.26.05.36.15s.15.22.15.36v1.87s0,0,0,0c.05-.08.11-.12.18-.12.02,0,.05,0,.08,0l.11.04c.08.02.14.07.17.14.03.07.03.15,0,.22-.08.15-.17.29-.26.42-.01.01-.01.02,0,.04s.02.02.04.02h3.93c.08,0,.14.03.19.08ZM214.61,240.81s.06-.02.06-.06v-1.34s-.02-.07-.06-.07h-1.63s-.07.02-.07.07v1.34s.02.06.07.06h1.63ZM214.69,245.8s.06-.02.06-.07v-1.38s-.02-.06-.06-.06h-1.59s-.06.02-.06.06v1.38s.02.07.06.07h1.59ZM218.64,238.85c.15,0,.27.05.37.15s.15.22.15.36v1.42c0,.14-.05.26-.15.37s-.22.15-.37.15h-1.85c-.14,0-.26-.05-.37-.15s-.15-.22-.15-.37v-1.42c0-.14.05-.26.15-.36s.22-.15.37-.15h1.85ZM216.71,245.73s.02.07.06.07h1.62s.06-.02.06-.07v-1.38s-.02-.06-.06-.06h-1.62s-.06.02-.06.06v1.38ZM218.52,240.81s.07-.02.07-.06v-1.34s-.02-.07-.07-.07h-1.64s-.06.02-.06.07v1.34s.02.06.06.06h1.64Z"/>
      </g>
    </g>
  </g>
`;
