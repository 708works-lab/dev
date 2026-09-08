// ============================================================================
// サウンドホールカバー｜ウクレレ用（soundhole-cover-uk）カラーシミュレーター
// SVGは708works提供の soundholecover_ukulele_color_order.svg をそのまま流用。
// 構造：viewBox全体(0 0 319.75 832.24)に「上部：直径/装着楽器キャプション＋クローズアップ」
// 「下部：ウクレレ本体に装着したイメージ」が縦に並んでいる、単一の連続イラスト。
// 装着楽器（右利き用／左利き用）ごとに、本体側は ukulele-image-left/ukulele-image-right、
// 上部キャプション側は discription内の left/right という別々のトグルペアで管理されている
// （2025-09-08 実機ユーザー確認：ukulele-image-left = 左利き用、ukulele-image-right = 右利き用）。
// 革の色（leather/leather1/クローズアップ土台円）はすべて class="st0" を共有しているため、
// CSSルールを書き換えるだけで一括着色できる（Triadと同じ手法）。
// 直径「XXmm」はsizeグループ内の"X""X""m""m"4パスのアウトラインで、先頭2パス（"X""X"）を
// 実際の2桁の数字に差し替える。刻印（kokuin/kokuin1）は円弧に沿って並んだ"A"のプレースホルダーで、
// 円の中心・半径・開始角度をあらかじめ実測してハードコードしてあるため、
// 実行時のgetBBox計測（モバイルSafariでdisplay:noneの祖先を持つ要素を測ると壊れる既知のバグ）が不要。
// ============================================================================

const SHC_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const SHC_SHOPIFY_DOMAIN = '708works.jp';
const SHC_PRICE_BASE = 4510;
const SHC_PRICE_KOKUIN_ADD = 1100;
const SHC_VARIANT_MAP = {
  noeng: '46634551116026',
  eng: '50255254782202',
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

const SHC_DIAMETER_MIN = 40;
const SHC_DIAMETER_MAX = 69;
const SHC_DIAMETER_DEFAULT = 60; // Globoの default_value を踏襲

// 刻印の円弧ジオメトリ（2026-09-08、実SVGの"A"プレースホルダー12個からKasa法で円をフィットして実測）。
// 実行時に測定し直さない（display:noneの祖先を持つ要素のgetBBoxはSafariで壊れるため、事前計算値を使う）。
const SHC_ARC = {
  left: { cx: 138.53642, cy: 535.86962, r: 44.96682, startAngle: 115.04, endAngle: 176.45 },
  right: { cx: 181.2351, cy: 535.88971, r: 44.94269, startAngle: 64.97, endAngle: 3.54 },
};

// 直径「XXmm」の"X""X"プレースホルダーのbbox（size グループ内、常時表示・懐柔非依存の固定値）
const SHC_SIZE_DIGIT_BOXES = [
  { x: 119.33, y: 13.38, w: 18.15, h: 19.81 },
  { x: 137.78, y: 13.38, w: 18.15, h: 19.81 },
];

const SHC_VIEWBOX = '0 0 319.75 832.24';

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
  const bodyLeft = svg.getElementById('ukulele-image-left');
  const bodyRight = svg.getElementById('ukulele-image-right');
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
  const digits = String(shcDiameter).padStart(2, '0').split('');
  const paths = Array.from(sizeGroup.children);
  // 先頭2パス（"X" "X"）を隠し、代わりに実際の数字をtextで重ねる
  paths[0].style.display = 'none';
  paths[1].style.display = 'none';
  let overlay = sizeGroup.querySelector('#shc-size-digits');
  if (!overlay) {
    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('id', 'shc-size-digits');
    sizeGroup.appendChild(overlay);
  }
  overlay.innerHTML = '';
  digits.forEach((d, i) => {
    const box = SHC_SIZE_DIGIT_BOXES[i];
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', box.x + box.w / 2);
    t.setAttribute('y', box.y + box.h / 2);
    t.setAttribute('font-size', box.h * 0.98);
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
  const step = n > 1 ? (arc.endAngle - arc.startAngle) / 11 : 0; // プレースホルダーと同じ間隔(12文字分/11ギャップ)を維持
  const baseHex = shcColor.hex;
  const fillColor = shcContrastColor(baseHex);

  for (let i = 0; i < n; i++) {
    const angleDeg = arc.startAngle + i * step;
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
  el.textContent = `¥${price.toLocaleString()}（税込）`;
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
  svg.setAttribute('height', Math.round(340 * (832.24 / 319.75)));
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
  const vbW = 319.75, vbH = 832.24;
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
  ctx.fillText('SOUNDHOLE COVER UKULELE', cw / 2, 28);
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
    a.href = url; a.download = `soundhole-cover-uk-${Date.now()}.png`;
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
  const orderId = `SHCUK-${Date.now()}`;
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

// Auto-generated from soundhole_cover_uk_color_order.svg
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
  <g id="ukulele-image-left">
    <g id="leather">
      <path class="st0" d="M96.59,560.96c-.45-.21-.7-.63-.77-1.08-.17-.19-.28-.43-.34-.68h-.02s-.64-1.29-.64-1.29l-.51-1.05-.45-.98-.6-1.5-.42-1.05-.59-1.47-.58-1.44-.5-1.48-.45-1.65-.42-1.53-.5-1.84-.34-1.36-.35-2.2-.56-3.58-.26-2.75v-11.11s.46-1.43.46-1.43l.05-1.98.3-.73.37-2.17.28-1.17.32-1.15.38-1.24.36-1.14.87-2.68.54-1.39.63-1.56.42-.92.54-1.06.51-1.01.51-1.01.69-1.38.54-.95,1-1.5.81-1.18.84-1.19c.09-.35.29-.67.61-.87.18-.29.46-.52.86-.61l1.56-1.11,1.69-.35,1.09-.24,1.95-.68,1.02-.55,1.5-1.01,2.37-1.69.92-.57,1.26-.78,1.48-.56c.24-.32.62-.54,1.14-.54.09,0,.17.01.25.02l.55-.49,1.14-.4,1.48-.58,2.39-.66,3.05-.49,2.68-.29,2.79.15c.14-.04.29-.07.45-.07.26,0,.48.06.67.15.1-.01.2-.03.27-.04,0,0,.01,0,.02,0,.02,0,.03,0,.05,0,0,0,0,0,.01,0,.06,0,.34.04.4.05,0,0,0,0,0,0,0,0,.02,0,.02,0,0,0,.01,0,.02,0,.03.01.09.04.14.06.1-.08.19-.14.25-.12l2.74.56,1.22.3,1.62.46,1.38.48,1.9.75,1.01.45,1.01.51,1.01.52.95.49c.19.1.71.49.95.8.2.02.38.08.53.16.48.09.81.38.99.75.07.03.14.06.21.09v-.07s.98.77.98.77l3.07,2.41c.17.13.88.54,1.05.59l1.06.33,1.63.38c.23.05,1.14.23,1.3.4l2.3,2.51,1.36,1.86.96,1.44,1.37,2.23.52.95.69,1.39.5,1.01.52,1.05.44.96.6,1.51.55,1.41.58,1.57.46,1.45.67,2.34.35,1.24.33,1.12.36,1.2.34,2.68c.07.24.26.9.28,1.12l.12,1.54.15,1.89.21,2.75.02,4.97-.22,2.69-.55,4.59-.49,2.98-.31,1.32-.75,2.73-.54,1.97-.38,1.08-.69,1.88-.57,1.55-.59,1.41-1.27,2.69-.75,1.35-.96,1.56-.99,1.61-.97,1.39-1.58,2.08-1.8,2.19-3.66,3.63-2.64,2.24-1.72,1.26-.92.58-1.29.79-1,.62c-.11,0-.32,0-.41,0v-.03c-.13.12-.29.21-.47.27-.12.13-.28.24-.46.32-.18.53-.63.95-1.36.95-.14,0-.26-.02-.37-.05l-1.02.3-1.51.58-1.09.27-1.37.39-2.48.51-7.03.46v-.07c-.1.02-.21.03-.33.03-.46,0-.81-.17-1.05-.43v.09s-1.36,0-1.36,0l-1.44-.25-1.96-.46-1.4-.35-1.58-.47-1.11-.39-1.7-.75-1.32-.65-1.36-.76-.93-.52c-.1-.06-.36-.26-.56-.46-.64-.03-1.06-.4-1.24-.87v.14s-1.34-.78-1.34-.78l-1.74-1.36-2.68-2.29-5.82-6.37-.97-1.39-.85-1.33-.99-1.55c-.11-.17-.57-.77-.56-.95v-.17Z"/>
    </g>
    <g id="kokuin">
      <path d="M120.98,573.64l.59.23-.23,5.31-.53-.2.08-1.72-1.64-.62-1.09,1.34-.54-.21,3.35-4.13ZM120.95,576.81l.07-1.6c.03-.33.05-.66.1-.97h-.02c-.17.25-.36.52-.58.8l-1,1.22,1.43.54Z"/>
      <path d="M116.98,571.77l.59.24-.37,5.31-.52-.21.13-1.72-1.63-.67-1.13,1.31-.54-.22,3.46-4.04ZM116.87,574.94l.11-1.6c.03-.33.07-.66.12-.97h-.02c-.17.24-.38.5-.6.78l-1.03,1.2,1.42.58Z"/>
      <path d="M113.48,569.51l.57.29-.8,5.26-.5-.26.27-1.7-1.56-.8-1.23,1.21-.52-.26,3.78-3.74ZM113.11,572.66l.24-1.58c.06-.33.12-.65.2-.95h-.02c-.19.23-.42.47-.67.73l-1.12,1.11,1.36.69Z"/>
      <path d="M110.65,567l.46.44-2.25,4.82-.41-.39.74-1.56-1.28-1.2-1.52.82-.42-.4,4.68-2.53ZM109.41,569.92l.67-1.45c.15-.29.3-.59.46-.86h-.01c-.25.16-.53.33-.85.51l-1.39.75,1.11,1.05Z"/>
      <path d="M107.77,563.92l.43.47-2.61,4.64-.38-.42.85-1.5-1.18-1.3-1.58.7-.39-.43,4.86-2.17ZM106.31,566.74l.78-1.4c.17-.28.35-.57.53-.82h-.01c-.27.14-.56.29-.88.44l-1.44.64,1.03,1.13Z"/>
      <path d="M105.07,560.72l.39.5-2.98,4.4-.34-.45.97-1.42-1.07-1.39-1.63.57-.36-.46,5.02-1.76ZM103.39,563.41l.89-1.32c.2-.27.39-.54.59-.77v-.02c-.29.13-.59.26-.93.38l-1.49.52.93,1.21Z"/>
      <path d="M102.66,557.12l.37.52-3.13,4.3-.33-.46,1.02-1.38-1.02-1.43-1.65.51-.34-.47,5.08-1.58ZM100.88,559.75l.94-1.29c.2-.26.41-.52.62-.75v-.02c-.29.12-.6.24-.94.35l-1.51.47.89,1.24Z"/>
      <path d="M100.78,553.51l.31.56-3.63,3.89-.27-.49,1.18-1.25-.85-1.54-1.7.31-.28-.51,5.23-.97ZM98.7,555.91l1.09-1.17c.23-.24.47-.47.7-.67v-.02c-.3.08-.62.16-.98.24l-1.55.29.74,1.34Z"/>
      <path d="M99.24,549.75l.23.59-4.09,3.4-.21-.52,1.33-1.09-.64-1.63-1.72.09-.21-.54,5.31-.29ZM96.87,551.86l1.23-1.02c.26-.2.52-.41.78-.58v-.02c-.31.05-.64.08-1,.11l-1.58.09.56,1.42Z"/>
      <path d="M97.81,545.75l.19.61-4.31,3.13-.17-.54,1.4-1-.53-1.67-1.73-.02-.18-.56,5.32.06ZM95.31,547.7l1.29-.94c.28-.18.55-.37.82-.53v-.02c-.31.03-.64.04-1,.05l-1.58-.02.46,1.46Z"/>
      <path d="M96.74,541.73l.14.62-4.55,2.74-.12-.55,1.48-.88-.39-1.71-1.71-.17-.13-.57,5.29.51ZM94.08,543.46l1.37-.83c.29-.16.58-.32.86-.45v-.02c-.31,0-.64-.01-1-.04l-1.57-.15.34,1.49Z"/>
      <path d="M96.01,537.61l.09.63-4.74,2.39-.08-.56,1.54-.76-.26-1.73-1.7-.3-.09-.58,5.23.91ZM93.23,539.14l1.42-.72c.3-.14.6-.28.89-.39v-.02c-.31-.02-.63-.06-.99-.11l-1.55-.27.23,1.51Z"/>
    </g>
    <g id="ukulele-image">
      <path class="st4" d="M171.17,375.84c.03.12.41.22.55.25l-.37-1.53-.42-1.72-.24-1.12-.13-1.08c-.01-.08-.23-.35-.4-.56l.02,2.1.34,1.02.33,1.34.32,1.3Z"/>
      <path class="st4" d="M171.89,377.24q0,.61,0,0c0-.61,0-.61,0,0Z"/>
      <rect class="st4" x="39.23" y="600.11" width=".51" height="13.64"/>
      <rect class="st4" x="103.41" y="749.7" width=".51" height="12.89"/>
      <rect class="st4" x="103.92" y="731.5" width=".51" height="11.88"/>
      <rect class="st4" x="6.38" y="682.99" width=".51" height="11.62"/>
      <rect class="st4" x="54.9" y="595.56" width=".51" height="10.87"/>
      <rect class="st4" x="66.52" y="420.2" width=".51" height="10.61"/>
      <rect class="st4" x="54.39" y="612.24" width=".51" height="9.6"/>
      <rect class="st4" x="22.55" y="638.52" width=".51" height="9.6"/>
      <rect class="st4" x="198.93" y="631.95" width=".51" height="8.84"/>
      <rect class="st4" x="176.69" y="567.76" width=".51" height="8.84"/>
      <rect class="st4" x="55.4" y="579.39" width=".51" height="8.84"/>
      <rect class="st4" x="257.04" y="713.31" width=".51" height="8.84"/>
      <rect class="st4" x="87.24" y="737.57" width=".51" height="8.59"/>
      <rect class="st4" x="30.14" y="653.68" width=".51" height="7.83"/>
      <rect class="st4" x="215.1" y="486.4" width=".51" height="7.83"/>
      <rect class="st4" x="256.54" y="727.46" width=".51" height="7.83"/>
      <rect class="st4" x="55.91" y="563.22" width=".51" height="7.83"/>
      <rect class="st4" x="79.66" y="708.76" width=".51" height="7.58"/>
      <rect class="st4" x="176.19" y="581.92" width=".51" height="7.58"/>
      <rect class="st4" x="257.55" y="700.17" width=".51" height="7.58"/>
      <rect class="st4" x="73.6" y="497.01" width=".51" height="6.82"/>
      <rect class="st4" x="79.16" y="724.43" width=".51" height="6.82"/>
      <rect class="st4" x="204.99" y="453.05" width=".51" height="6.82"/>
      <rect class="st4" x="166.58" y="785.58" width=".51" height="6.57"/>
      <rect class="st4" x="53.89" y="629.42" width=".51" height="6.57"/>
      <rect class="st4" x="175.68" y="595.56" width=".51" height="5.81"/>
      <rect class="st4" x="197.92" y="669.34" width=".51" height="5.81"/>
      <rect class="st4" x="69.55" y="750.71" width=".51" height="5.81"/>
      <rect class="st4" x="86.74" y="753.23" width=".51" height="5.81"/>
      <rect class="st4" x="130.7" y="731" width=".51" height="5.81"/>
      <rect class="st4" x="188.82" y="656.2" width=".51" height="5.81"/>
      <rect class="st4" x="130.2" y="748.69" width=".51" height="5.81"/>
      <rect class="st4" x="200.44" y="583.94" width=".51" height="5.81"/>
      <rect class="st4" x="30.64" y="640.54" width=".51" height="5.81"/>
      <rect class="st4" x="177.2" y="553.61" width=".51" height="5.81"/>
      <rect class="st4" x="245.42" y="727.46" width=".51" height="5.81"/>
      <rect class="st4" x="199.43" y="613.25" width=".51" height="5.56"/>
      <rect class="st4" x="186.8" y="712.81" width=".51" height="5.56"/>
      <rect class="st4" x="166.08" y="802.25" width=".51" height="5.56"/>
      <rect class="st4" x="187.81" y="685.01" width=".51" height="5.56"/>
      <rect class="st4" x="175.18" y="608.19" width=".51" height="5.56"/>
      <rect class="st4" x="73.09" y="513.19" width=".51" height="5.56"/>
      <rect class="st4" x="200.95" y="571.3" width=".51" height="4.8"/>
      <rect class="st4" x="198.42" y="652.67" width=".51" height="4.8"/>
      <rect class="st4" x="216.11" y="462.65" width=".51" height="4.8"/>
      <rect class="st4" x="162.54" y="600.61" width=".51" height="4.8"/>
      <rect class="st4" x="72.59" y="531.38" width=".51" height="4.55"/>
      <rect class="st4" x="215.6" y="475.28" width=".51" height="4.55"/>
      <rect class="st4" x="204.99" y="738.58" width=".51" height="4.55"/>
      <rect class="st4" x="214.59" y="502.07" width=".51" height="4.55"/>
      <path class="st4" d="M191.81,529.13h.63s-.22-3.93-.22-3.93c-.08.16-.35.93-.36,1.17l-.05,2.76Z"/>
      <polygon class="st4" points="37.12 736.16 37.6 737.18 37.81 733.92 37.33 732.9 37.12 736.16"/>
      <polygon class="st4" points="206.04 435.99 206.56 435.03 206.56 432.65 206.04 431.7 206.04 435.99"/>
      <path class="st4" d="M104.38,722.18h.63s-.22-3.93-.22-3.93c-.08.16-.35.92-.36,1.16l-.06,2.77Z"/>
      <polygon class="st4" points="68.55 785.27 69.07 785.61 68.97 781.42 68.48 782.4 68.55 785.27"/>
      <polygon class="st4" points="36.61 754.35 37.09 755.38 37.3 752.11 36.82 751.09 36.61 754.35"/>
      <polygon class="st4" points="205.41 445.58 205.89 446.6 206.09 443.34 205.61 442.31 205.41 445.58"/>
      <path class="st4" d="M61.48,713.78c0,.23.28,1.01.36,1.16l.22-3.93h-.63s.05,2.77.05,2.77Z"/>
      <polygon class="st4" points="208.5 657.75 209.03 657.42 209.09 654.54 208.6 653.56 208.5 657.75"/>
      <polygon class="st4" points="199.84 598.7 200.31 599.73 200.54 596.97 200.07 595.94 199.84 598.7"/>
      <path class="st4" d="M102.92,776.44c0,.1.32.5.43.64l.11-3.42-.58.04.04,2.75Z"/>
      <polygon class="st4" points="246.37 707.44 246.89 708.39 246.89 704.59 246.37 705.54 246.37 707.44"/>
      <path class="st4" d="M244.43,756.27c0,.23.25.93.33,1.13l.25-3.44-.66-.02.08,2.33Z"/>
      <polygon class="st4" points="216.55 452.19 217.04 453.17 217.15 449.47 216.62 449.8 216.55 452.19"/>
      <path class="st4" d="M188.33,675.86c0,.27.25.99.33,1.18l.25-3.44-.66-.02.07,2.28Z"/>
      <path class="st4" d="M247.51,683.59c.11-.14.43-.55.43-.67l.04-2.72-.58-.03.11,3.42Z"/>
      <path class="st4" d="M40.31,650.74c.11-.14.43-.56.43-.65l.04-2.74-.58-.04.11,3.42Z"/>
      <path class="st4" d="M192.32,816.21s.47.01.56.02v-2.65s-.51-.02-.51-.02l-.04,2.65Z"/>
      <polygon class="st4" points="192.47 808.57 193.31 809.99 193.31 807.16 192.47 808.57"/>
      <polygon class="st4" points="197.01 687.28 197.86 688.7 197.86 685.87 197.01 687.28"/>
      <polygon class="st4" points="137.89 778.25 138.73 779.66 138.73 776.84 137.89 778.25"/>
      <polygon class="st4" points="167.21 723.61 167.4 724.54 167.72 722.1 166.93 722.08 167.21 723.61"/>
      <polygon class="st4" points="245.53 718.11 246.37 719.53 246.37 716.7 245.53 718.11"/>
      <polygon class="st4" points="257.82 688.55 258.49 689.72 258.49 687.38 257.82 688.55"/>
      <polygon class="st4" points="213.85 516.22 214.52 517.39 214.52 515.05 213.85 516.22"/>
      <path class="st4" d="M60.26,749.93c.37,1.43.46,1.93.5,1.71l.28-1.77-.78.06Z"/>
      <polygon class="st4" points="138.38 769.54 139.19 771.07 139.3 768.8 138.38 769.54"/>
      <polygon class="st4" points="66.28 602.64 66.96 603.81 66.96 601.46 66.28 602.64"/>
      <path class="st4" d="M214.01,517.95c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.67.04Z"/>
      <path class="st4" d="M71.71,585.77c.58.98.72,1.27.73,1.18l.17-1.37-.9.19Z"/>
      <polygon class="st4" points="207.8 662.34 208.55 662.87 208.39 661.1 207.8 662.34"/>
      <polygon class="st4" points="61.2 736.44 60.93 738.17 61.64 737.66 61.2 736.44"/>
      <path class="st4" d="M208.95,646.81c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M65.44,598.42l.66-.04c-.22-.82-.39-1.45-.33-1.24.03.12-.11.5-.32,1.28Z"/>
      <path class="st4" d="M65.94,600.95l.66-.04c-.22-.82-.39-1.46-.33-1.24.03.12-.11.51-.33,1.28Z"/>
      <path class="st4" d="M199.56,600.44c.58.96.73,1.26.74,1.17l.17-1.37-.91.2Z"/>
      <polygon class="st4" points="219.89 730.88 219.62 732.61 220.33 732.1 219.89 730.88"/>
      <polygon class="st4" points="192.89 802 193.83 802.88 193.83 801.13 192.89 802"/>
      <path class="st4" d="M47.95,471.42l.9.2-.16-1.37c-.01-.09-.16.21-.74,1.17Z"/>
      <path class="st4" d="M41.02,652.67v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M71.94,588.4l-.11-.86.11.86Z"/>
      <path class="st4" d="M62.85,516.81l-.11.86.11-.86Z"/>
      <path class="st4" d="M21.91,689.97l-.11-.86.11.86Z"/>
      <path class="st4" d="M216.48,461.55l-.11-.86.11.86Z"/>
      <path class="st4" d="M166.95,726.87l-.11-.86.11.86Z"/>
      <path class="st4" d="M166.38,728.47l.06-1.03-.44.74-.17.29-.3.74-.33.38s.24.26.29.32l.32-.43.28-.75c.23-.13.29-.17.29-.25Z"/>
      <path class="st4" d="M62.34,519.34l-.11.86.11-.86Z"/>
      <path class="st4" d="M245.16,745.17l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M69.42,768.48l-.11.86.11-.86Z"/>
      <path class="st4" d="M61.84,524.39l-.11.86.11-.86Z"/>
      <rect class="st4" x="63.06" y="515.79" width=".36" height=".36" transform="translate(-346.32 195.84) rotate(-45)"/>
      <rect class="st4" x="71.14" y="589.06" width=".36" height=".36" transform="translate(-395.77 223.02) rotate(-45)"/>
      <rect class="st4" x="70.64" y="590.08" width=".36" height=".36" transform="translate(-396.63 222.96) rotate(-45)"/>
      <rect class="st4" x="65.58" y="592.1" width=".36" height=".36" transform="translate(-399.54 219.98) rotate(-45)"/>
      <rect class="st4" x="41.33" y="653.75" width=".36" height=".36" transform="translate(-450.24 220.88) rotate(-45)"/>
      <rect class="st4" x="41.83" y="655.27" width=".36" height=".36" transform="translate(-451.17 221.68) rotate(-45)"/>
      <rect class="st4" x="42.34" y="656.28" width=".36" height=".36" transform="translate(-451.73 222.34) rotate(-45)"/>
      <rect class="st4" x="74.68" y="464.74" width=".36" height=".36" transform="translate(-306.82 189.11) rotate(-45)"/>
      <rect class="st4" x="163.63" y="729.56" width=".36" height=".36" transform="translate(-468.02 329.56) rotate(-45)"/>
      <rect class="st4" x="139.37" y="762.91" width=".36" height=".36" transform="translate(-498.71 322.18) rotate(-45)"/>
      <rect class="st4" x="308.59" y="707.75" width=".51" height="16.68"/>
      <rect class="st4" x="275.74" y="720.39" width=".51" height="13.64"/>
      <rect class="st4" x="243.4" y="470.73" width=".51" height="13.64"/>
      <rect class="st4" x="249.46" y="559.17" width=".51" height="11.88"/>
      <rect class="st4" x="261.59" y="559.17" width=".51" height="9.6"/>
      <rect class="st4" x="297.47" y="708.76" width=".51" height="6.57"/>
      <rect class="st4" x="265.64" y="476.29" width=".51" height="5.81"/>
      <rect class="st4" x="226.22" y="558.67" width=".51" height="5.81"/>
      <rect class="st4" x="297.98" y="717.86" width=".51" height="5.81"/>
      <rect class="st4" x="297.47" y="726.45" width=".51" height="5.81"/>
      <polygon class="st4" points="235.26 567.44 235.78 568.39 235.78 564.1 235.26 565.06 235.26 567.44"/>
      <polygon class="st4" points="226.26 574.96 226.78 574.01 226.78 571.63 226.26 570.67 226.26 574.96"/>
      <polygon class="st4" points="235.86 561.32 236.38 560.37 236.38 557.98 235.86 557.03 235.86 561.32"/>
      <polygon class="st4" points="308.02 704.4 308.55 705.36 308.55 701.56 308.02 702.51 308.02 704.4"/>
      <polygon class="st4" points="308.06 730.02 308.59 729.7 308.66 727.31 308.17 726.33 308.06 730.02"/>
      <polygon class="st4" points="297.01 736.6 297.52 736.2 297.44 732.97 296.93 733.38 297.01 736.6"/>
      <path class="st4" d="M265.19,489.52c.12-.14.43-.54.43-.63l.04-2.76-.58-.04.11,3.42Z"/>
      <polygon class="st4" points="235.86 575.9 236.37 575.49 236.29 572.27 235.78 572.67 235.86 575.9"/>
      <polygon class="st4" points="275.16 740.73 275.68 741.16 275.82 738.46 275.35 737.44 275.16 740.73"/>
      <polygon class="st4" points="296.6 740.65 297.05 740.22 296.85 737.43 296.35 738.46 296.6 740.65"/>
      <path class="st4" d="M274.74,744.88c0,.1.35.83.39.89l.18-2.94h-.63s.05,2.04.05,2.04Z"/>
      <path class="st4" d="M262.11,556.9c0,.09.35.81.39.87l.19-2.94h-.63s.06,2.06.06,2.06Z"/>
      <polygon class="st4" points="242.81 467.89 243.35 468.85 243.35 465.54 242.81 466.5 242.81 467.89"/>
      <path class="st4" d="M262.17,573.43c.12-.16.41-.54.42-.64l.05-2.29h-.6s.13,2.92.13,2.92Z"/>
      <path class="st4" d="M275.25,715.53c0,.09.36.89.39.92l.19-2.93h-.63s.05,2.01.05,2.01Z"/>
      <polygon class="st4" points="296.94 707.79 297.47 707.48 297.55 705.57 297.06 704.59 296.94 707.79"/>
      <polygon class="st4" points="249.57 556.39 250.42 557.81 250.42 554.98 249.57 556.39"/>
      <polygon class="st4" points="307.29 737.7 307.54 736.57 307.73 735.2 306.93 735.26 307.29 737.7"/>
      <polygon class="st4" points="226.33 577.62 227.17 579.03 227.17 576.21 226.33 577.62"/>
      <polygon class="st4" points="274.38 706.48 274.52 707.37 274.86 704.92 274.05 704.9 274.38 706.48"/>
      <polygon class="st4" points="273.32 702.45 274.17 703.86 274.17 701.03 273.32 702.45"/>
      <polygon class="st4" points="296.07 701.94 296.91 703.35 296.91 700.53 296.07 701.94"/>
      <polygon class="st4" points="295.56 698.4 296.41 699.82 296.41 696.99 295.56 698.4"/>
      <polygon class="st4" points="235.93 554.37 236.77 555.79 236.77 552.96 235.93 554.37"/>
      <polygon class="st4" points="264.73 469.47 265.58 470.89 265.58 468.06 264.73 469.47"/>
      <polygon class="st4" points="263.72 499.83 263.95 500.69 264.24 498.23 263.48 498.2 263.72 499.83"/>
      <polygon class="st4" points="295.56 742.37 296.41 743.78 296.41 740.95 295.56 742.37"/>
      <polygon class="st4" points="226.33 555.89 227.17 557.3 227.17 554.47 226.33 555.89"/>
      <polygon class="st4" points="264.69 492.78 264.98 493.61 265.24 491.15 264.52 491.12 264.69 492.78"/>
      <polygon class="st4" points="274.7 711.34 275.24 711.02 275.34 709.63 274.84 708.62 274.7 711.34"/>
      <polygon class="st4" points="263.72 496.26 264.57 497.67 264.57 494.84 263.72 496.26"/>
      <polygon class="st4" points="307.76 734.17 308.21 733.1 307.91 731.36 307.46 732.44 307.76 734.17"/>
      <polygon class="st4" points="236.42 550.71 237.23 552.25 237.35 549.98 236.42 550.71"/>
      <path class="st4" d="M227.03,551.32c.38,1.43.46,1.92.5,1.7l.28-1.76-.78.06Z"/>
      <polygon class="st4" points="249.56 573.45 250.37 574.99 250.49 572.72 249.56 573.45"/>
      <polygon class="st4" points="306.16 691.2 306.97 692.74 307.09 690.47 306.16 691.2"/>
      <polygon class="st4" points="226.82 580.53 227.62 582.07 227.74 579.79 226.82 580.53"/>
      <polygon class="st4" points="252.79 544.53 253.17 543.44 252.62 542.35 252.47 544.26 252.21 544.51 251.82 545.6 252.37 546.68 252.52 544.77 252.79 544.53"/>
      <polygon class="st4" points="272.47 755.76 273.15 756.93 273.15 754.59 272.47 755.76"/>
      <polygon class="st4" points="273.31 750.33 274.12 751.87 274.24 749.6 273.31 750.33"/>
      <polygon class="st4" points="250.06 575.98 250.87 577.52 250.99 575.24 250.06 575.98"/>
      <polygon class="st4" points="271.97 694.61 272.64 695.78 272.64 693.44 271.97 694.61"/>
      <polygon class="st4" points="261.69 506.75 262.49 508.28 262.61 506.01 261.69 506.75"/>
      <polygon class="st4" points="306.66 694.74 307.47 696.28 307.59 694.01 306.66 694.74"/>
      <polygon class="st4" points="236.08 577.87 236.76 579.04 236.76 576.7 236.08 577.87"/>
      <polygon class="st4" points="295.21 745.15 295.89 746.32 295.89 743.98 295.21 745.15"/>
      <polygon class="st4" points="272.3 696.76 273.11 698.3 273.23 696.03 272.3 696.76"/>
      <polygon class="st4" points="250.23 553.11 250.91 554.28 250.91 551.94 250.23 553.11"/>
      <polygon class="st4" points="307.17 698.28 307.98 699.82 308.1 697.54 307.17 698.28"/>
      <polygon class="st4" points="262.7 577.5 263.51 579.03 263.63 576.76 262.7 577.5"/>
      <polygon class="st4" points="227.49 583.43 228.17 584.6 228.17 582.26 227.49 583.43"/>
      <polygon class="st4" points="272.98 699.67 273.65 700.84 273.65 698.49 272.98 699.67"/>
      <polygon class="st4" points="273.99 747.68 274.66 748.85 274.66 746.5 273.99 747.68"/>
      <polygon class="st4" points="262.7 549.2 263.51 550.73 263.63 548.46 262.7 549.2"/>
      <polygon class="st4" points="227.32 549.2 228.13 550.73 228.25 548.46 227.32 549.2"/>
      <path class="st4" d="M262.41,551.82c.38,1.42.46,1.93.5,1.71l.28-1.77-.78.06Z"/>
      <polygon class="st4" points="306.33 739.08 307.01 740.26 307.01 737.91 306.33 739.08"/>
      <polygon class="st4" points="295.19 746.55 294.91 748.27 295.63 747.77 295.19 746.55"/>
      <polygon class="st4" points="304.79 747.56 304.52 749.28 305.23 748.78 304.79 747.56"/>
      <polygon class="st4" points="270.22 763.59 271.15 764.47 271.15 762.72 270.22 763.59"/>
      <polygon class="st4" points="250.75 550.65 251.51 551.18 251.35 549.41 250.75 550.65"/>
      <path class="st4" d="M268.59,679.66c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <polygon class="st4" points="305.51 743.53 305.72 745.29 306.29 744.04 305.51 743.53"/>
      <polygon class="st4" points="237.58 582.31 237.3 584.03 238.02 583.52 237.58 582.31"/>
      <path class="st4" d="M237.76,585.79l.66-.04c-.22-.82-.39-1.45-.33-1.24.03.12-.11.51-.33,1.28Z"/>
      <polygon class="st4" points="237.58 547.44 237.3 549.16 238.02 548.65 237.58 547.44"/>
      <polygon class="st4" points="251.26 548.13 252.02 548.65 251.85 546.89 251.26 548.13"/>
      <polygon class="st4" points="227.76 585.71 228.7 586.58 228.7 584.83 227.76 585.71"/>
      <polygon class="st4" points="271.94 759.18 271.67 760.91 272.38 760.4 271.94 759.18"/>
      <path class="st4" d="M269.3,683.31c.58.98.72,1.27.73,1.18l.17-1.37-.9.19Z"/>
      <path class="st4" d="M253.13,586.6l.73,1.4c0-.13-.1-.89-.17-1.14l-.4-1.37c-.07-.24-.26.9-.16,1.1Z"/>
      <polygon class="st4" points="258.3 522.67 258.02 524.4 258.74 523.89 258.3 522.67"/>
      <polygon class="st4" points="252.3 584.16 252.96 585.07 252.71 583.82 252.35 582.37 251.81 582.88 252.3 584.16"/>
      <polygon class="st4" points="272.05 757.25 272.44 758.91 272.91 757.58 272.05 757.25"/>
      <path class="st4" d="M238.72,588.44c.07.23.51,1.23.49,1.01l-.09-1.3-.29-1.34c-.03-.13-.38-.15-.68-.17l.56,1.8Z"/>
      <polygon class="st4" points="270.13 684.91 270.35 686.67 270.91 685.41 270.13 684.91"/>
      <path class="st4" d="M228.16,546.75c.22.82.39,1.45.33,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M242.31,462.36c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M242.52,489.11l.9.2-.17-1.37c-.01-.09-.15.2-.74,1.17Z"/>
      <path class="st4" d="M242.81,527.55c.22.82.39,1.45.33,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M263.53,546.75c.22.82.39,1.45.33,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M237.77,546.37l.66-.04c-.22-.82-.39-1.45-.34-1.24.03.12-.11.51-.33,1.28Z"/>
      <path class="st4" d="M250.6,579.57l.9.2-.17-1.37c-.01-.09-.15.2-.74,1.17Z"/>
      <polygon class="st4" points="263.39 580.47 264.14 581 263.98 579.23 263.39 580.47"/>
      <path class="st4" d="M302.83,755.76l.06-1.03-.43.74-.17.31-.21.47-.18.75-.16.28-.09,1.02.43-.74.21-.31c.05-.08.2-.37.2-.44v-.81c.27-.13.34-.16.34-.24Z"/>
      <polygon class="st4" points="264.36 543.9 264.09 545.62 264.8 545.12 264.36 543.9"/>
      <polygon class="st4" points="238.19 542.97 238.58 544.63 239.05 543.31 238.19 542.97"/>
      <polygon class="st4" points="293.17 754.64 292.89 756.36 293.61 755.85 293.17 754.64"/>
      <polygon class="st4" points="228.77 542.38 229.62 543.64 229.8 542.11 228.77 542.38"/>
      <polygon class="st4" points="242.12 459 241.85 460.72 242.56 460.21 242.12 459"/>
      <path class="st4" d="M257.93,598.09l-.13-1.11-.58-1.11-.46-.99-.49-1.15-.48-1.13c-.09-.21-.12.58-.06.79l.35,1.17.43.99.55,1,.87,1.55Z"/>
      <path class="st4" d="M238.77,541.19c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M265.05,540.14c.22.77.36,1.16.33,1.28-.06.21.11-.42.33-1.24l-.66-.04Z"/>
      <polygon class="st4" points="270.22 687.79 271.15 688.67 271.15 686.91 270.22 687.79"/>
      <polygon class="st4" points="306.01 741.01 306.23 742.77 306.79 741.51 306.01 741.01"/>
      <path class="st4" d="M260,515.42c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M198.17,403.68c.24.11,1.28.24,1.28.21l-1.18-.71-1.01-.5-1.21-.34-1.08-.21c-.22-.04.61.41.82.51l1.1.48,1.29.56Z"/>
      <path class="st4" d="M239.27,539.17c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.67.04Z"/>
      <polygon class="st4" points="261.83 508.52 261.56 510.25 262.27 509.74 261.83 508.52"/>
      <polygon class="st4" points="253.02 539.34 253.88 540.6 254.06 539.07 253.02 539.34"/>
      <path class="st4" d="M265.55,538.16c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M262.52,574.55c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M305.98,688.25c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <polygon class="st4" points="305 745.55 305.22 747.31 305.78 746.06 305 745.55"/>
      <polygon class="st4" points="273.46 752.61 273.18 754.34 273.9 753.83 273.46 752.61"/>
      <path class="st4" d="M271.12,689.22c.22.77.36,1.16.33,1.28-.05.22.11-.42.34-1.24l-.66-.04Z"/>
      <polygon class="st4" points="266.38 535.81 266.11 537.54 266.82 537.03 266.38 535.81"/>
      <path class="st4" d="M293.36,752.95c.21.82.3,1.43.35,1.24l.28-1.3-.63.06Z"/>
      <path class="st4" d="M264.04,581.58c.22.77.36,1.16.33,1.28-.05.22.11-.42.33-1.24l-.66-.04Z"/>
      <path class="st4" d="M251.4,580.61c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <polygon class="st4" points="255.77 531.77 255.5 533.49 256.21 532.99 255.77 531.77"/>
      <path class="st4" d="M271.62,691.75c.22.77.36,1.16.33,1.28l.34-1.24-.67-.04Z"/>
      <polygon class="st4" points="257.28 526.21 257.01 527.93 257.72 527.43 257.28 526.21"/>
      <path class="st4" d="M236.75,580.11c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.67.04Z"/>
      <polygon class="st4" points="191.77 401.39 193.27 401.69 194.4 401.88 193.51 401.38 192.38 400.73 191.77 401.39"/>
      <path class="st4" d="M295.37,694.82c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M260.5,513.4c.22.82.39,1.45.34,1.24-.03-.12.11-.51.33-1.28l-.66.04Z"/>
      <path class="st4" d="M294.07,749.88l.91.19-.17-1.37c-.01-.09-.15.2-.73,1.18Z"/>
      <polygon class="st4" points="255.88 529.83 256.26 531.49 256.74 530.17 255.88 529.83"/>
      <polygon class="st4" points="263.05 501.46 263.27 503.22 263.84 501.97 263.05 501.46"/>
      <polygon class="st4" points="262.55 503.99 262.77 505.75 263.33 504.49 262.55 503.99"/>
      <path class="st4" d="M266,669.94l-.11.86.11-.86Z"/>
      <rect class="st4" x="244.13" y="617.26" width="14.01" height=".68" transform="translate(691.22 116.78) rotate(63.43)"/>
      <rect class="st4" x="261.85" y="613.41" width="6.55" height=".68" transform="translate(695.52 102.13) rotate(63.43)"/>
      <path class="st4" d="M261.3,512.1l.06-.98-.06.98Z"/>
      <rect class="st4" x="244.28" y="607.35" width="4.29" height=".68" transform="translate(679.76 115.51) rotate(63.43)"/>
      <rect class="st4" x="259.45" y="605.83" width="4.29" height=".68" transform="translate(686.78 101.11) rotate(63.43)"/>
      <polygon class="st4" points="244.88 604.13 244.67 603.03 244.13 602.04 243.9 602.91 244.88 604.13"/>
      <rect class="st4" x="269.15" y="600.93" width="5.76" height=".68" transform="translate(688.17 89.06) rotate(63.43)"/>
      <polygon class="st4" points="254.68 625.59 255.24 625.62 254.69 624.33 254.68 625.59"/>
      <path class="st4" d="M255.85,627.5c.15.09.86.43.59.3l-.74-1.43c-.06.09-.08,1,.15,1.13Z"/>
      <rect class="st4" x="256.92" y="600.27" width="4.29" height=".68" transform="translate(680.41 100.3) rotate(63.43)"/>
      <path class="st4" d="M248.19,511.19l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M243.93,601.7l-.35-1.22c-.03-.12-.24-.42-.55-.91-.03.15,0,.96.14,1.14l.75.98Z"/>
      <rect class="st4" x="261.75" y="643.58" width="5.09" height=".68" transform="translate(722.04 119.56) rotate(63.43)"/>
      <path class="st4" d="M247.23,515.13l-.06-.98.06.98Z"/>
      <polygon class="st4" points="242.86 599.08 242.63 597.93 242.04 596.93 241.9 597.86 242.86 599.08"/>
      <path class="st4" d="M268.02,651.24l-.11.86.11-.86Z"/>
      <path class="st4" d="M188.87,400.03l1,.26-1-.26Z"/>
      <polygon class="st4" points="241.84 596.55 241.64 595.45 241.1 594.46 240.87 595.33 241.84 596.55"/>
      <path class="st4" d="M268.81,594.02c-.4.43.09,1.22.87,2.22-.1-.72-.11-.94-.18-1.05l-.69-1.17Z"/>
      <path class="st4" d="M262.34,661.28l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M248.66,509.07l.06-.98-.06.98Z"/>
      <path class="st4" d="M231.83,595.06c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M263.67,663.28c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <path class="st4" d="M240.66,593.97l-.06-.98.06.98Z"/>
      <path class="st4" d="M240.42,592.02c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <polygon class="st4" points="268.12 592.51 267.92 591.41 267.38 590.42 267.14 591.29 268.12 592.51"/>
      <polygon class="st4" points="255.49 592 255.29 590.91 254.75 589.91 254.51 590.79 255.49 592"/>
      <path class="st4" d="M230.02,591.54l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M239.59,591.02v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M229.81,589.5c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <path class="st4" d="M267.01,589.08l-.11.86.11-.86Z"/>
      <path class="st4" d="M246.67,517.25l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M254.57,588.99c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M257.1,528.85c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <polygon class="st4" points="266.68 588.48 266.38 587.29 265.71 586.33 265.82 587.63 266.68 588.48"/>
      <path class="st4" d="M229.04,587.9l-.06-.98.06.98Z"/>
      <path class="st4" d="M249.22,507.15l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M266.35,672.3l.06-.98-.06.98Z"/>
      <path class="st4" d="M267.01,672.97l-.11.86.11-.86Z"/>
      <path class="st4" d="M267.52,674.49l-.11.86.11-.86Z"/>
      <path class="st4" d="M265.34,585.88l.06-.98-.06.98Z"/>
      <path class="st4" d="M267.93,676.93v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M259.83,518.26l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M268.53,678.02l-.11.86.11-.86Z"/>
      <path class="st4" d="M264.99,583.52l-.11.86.11-.86Z"/>
      <path class="st4" d="M304.76,681.9l.06-.98-.06.98Z"/>
      <path class="st4" d="M269.54,681.56l-.11.86.11-.86Z"/>
      <path class="st4" d="M246.17,518.77l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M305.42,683.58l-.11.86.11-.86Z"/>
      <path class="st4" d="M305.93,686.44l-.11-.86.11.86Z"/>
      <rect class="st4" x="200.89" y="404.93" width="3.05" height=".68" transform="translate(202.61 -47.74) rotate(26.57)"/>
      <path class="st4" d="M294.68,690.57v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M190.84,401.05c-.74-.38-.43-.22,0,0,.47-.45.7-.67,0,0Z"/>
      <path class="st4" d="M295.51,692.59c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <polygon class="st4" points="224.19 409.88 225.46 411.09 225.72 410.84 224.31 409.53 223.13 409.11 221.68 408.07 220.2 407.05 219.13 406.57 218.14 406.03 217.06 405.56 216.35 405.05 216.1 405.3 217.03 406.08 218.15 406.53 219.13 407.07 220.2 407.55 221.68 408.57 222.89 409.48 224.19 409.88"/>
      <path class="st4" d="M241.75,457.18l-.11.86.11-.86Z"/>
      <path class="st4" d="M241.24,455.48l-.11-.86.11.86Z"/>
      <path class="st4" d="M259.43,520.17l-.11-.86.11.86Z"/>
      <path class="st4" d="M274.48,447.99c0,.61,0,.61,0,0q0-.61,0,0Z"/>
      <polygon class="st4" points="269.17 437.88 269.9 438.92 270.15 438.66 269.68 437.86 268.67 436.37 267.94 435.34 267.69 435.59 268.16 436.4 269.17 437.88"/>
      <path class="st4" d="M245.68,520.79l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M210.1,402.55l.99.32-.99-.32Z"/>
      <rect class="st4" x="239.23" y="410.51" width="4.29" height=".68" transform="translate(209.22 -64.57) rotate(26.57)"/>
      <path class="st4" d="M304.25,750.63l.06-.98-.06.98Z"/>
      <path class="st4" d="M303.91,751.3l-.11.86.11-.86Z"/>
      <path class="st4" d="M294.5,751.72c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M303.4,754.16l-.11-.86.11.86Z"/>
      <path class="st4" d="M292.79,756.86l-.11.86.11-.86Z"/>
      <path class="st4" d="M258.77,522.21l.06-.98-.06.98Z"/>
      <path class="st4" d="M245.12,522.21l.06-.98-.06.98Z"/>
      <path class="st4" d="M292.28,758.38l-.11.86.11-.86Z"/>
      <path class="st4" d="M301.57,759.3c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M291.97,760.31c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M300.87,761.23l-.11-.86.11.86Z"/>
      <path class="st4" d="M291.12,761.83c.06.57.07.65,0,0,.07-.65.06-.57,0,0Z"/>
      <path class="st4" d="M271.76,761.83c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <path class="st4" d="M299.71,763.34c.06.57.07.65,0,0,.07-.65.06-.57,0,0Z"/>
      <path class="st4" d="M290.62,763.85l.22-.94c.02-.09-.33.34-.39.44l-.31.49-.48.77.76.11.21-.87Z"/>
      <path class="st4" d="M270.45,765.89l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M298.79,766.38l.06-1.03-.44.74-.17.3-.34.73c-.15.14-.22.19-.22.27l-.06,1.03.44-.75c.1-.14.16-.2.19-.28l.24-.78c.24-.12.3-.16.31-.24Z"/>
      <path class="st4" d="M289.69,766.3l-.06-.98.06.98Z"/>
      <path class="st4" d="M270.24,766.88c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M288.6,768.9l.22-.95c.02-.09-.33.35-.38.43l-.32.51-.48.77.75.11.21-.87Z"/>
      <path class="st4" d="M244.78,522.88l-.11.86.11-.86Z"/>
      <path class="st4" d="M269.47,768.83l-.06-.98.06.98Z"/>
      <path class="st4" d="M269.04,770.33l-.11-.86.11.86Z"/>
      <path class="st4" d="M228.99,545.55l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M268.72,771.43c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <polygon class="st4" points="251.54 417.65 253.78 419.66 254.04 419.41 251.55 417.14 249.48 415.66 247.95 414.64 246.43 413.63 244.95 412.62 244.14 412.14 243.88 412.39 244.91 413.13 246.44 414.13 247.95 415.15 249.48 416.16 251.54 417.65"/>
      <path class="st4" d="M267.92,773.46l.48-.76-.76-.12-.21.87-.22.95c-.02.09.32-.34.38-.43l.32-.5Z"/>
      <polygon class="st4" points="232.76 416.5 238.11 421.68 238.37 421.43 232.88 416.13 229.77 413.64 227.75 412.13 226.44 411.14 226.19 411.39 227.73 412.63 229.77 414.15 232.76 416.5"/>
      <path class="st4" d="M264.9,543.01v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M266.44,777l.13-1.16-.51.86c-.13.14-.2.19-.21.28l-.13,1.15.51-.87c.13-.14.2-.19.21-.27Z"/>
      <path class="st4" d="M253.27,542v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M230.12,540.56l-.11.86.11-.86Z"/>
      <rect class="st4" x="211.5" y="403.41" width="3.05" height=".68" transform="translate(203.05 -52.64) rotate(26.57)"/>
      <path class="st4" d="M244.14,525.32v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M264.42,781.54l.06-1.03-.44.74-.17.3-.34.71-.16.3-.34.73c-.11.12-.16.16-.17.25l-.1.97c-.02.22.46-.82.38-.69.12-.12.2-.17.23-.26l.25-.77c.18-.1.24-.16.26-.23l.24-.78c.24-.12.3-.16.31-.24Z"/>
      <path class="st4" d="M230.63,538.54l-.11.86.11-.86Z"/>
      <path class="st4" d="M240.42,537.95c-.67.7-.45.47,0,0-.22-.43-.38-.74,0,0Z"/>
      <path class="st4" d="M254.22,538.38l.06-.98-.06.98Z"/>
      <path class="st4" d="M257.82,525.82v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M231.13,537.03l-.11.86.11-.86Z"/>
      <path class="st4" d="M231.83,535.93c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M240.93,535.93c-.38.74-.22.43,0,0-.45-.47-.67-.7,0,0Z"/>
      <path class="st4" d="M254.76,536.46l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M267.01,534.5l-.11.86.11-.86Z"/>
      <path class="st4" d="M232.14,533.99l-.11.86.11-.86Z"/>
      <path class="st4" d="M241.24,533.99l-.11.86.11-.86Z"/>
      <path class="st4" d="M255.39,533.99l-.11.86.11-.86Z"/>
      <path class="st4" d="M243.77,525.91l-.11.86.11-.86Z"/>
      <path class="st4" d="M241.75,532.48l-.11.86.11-.86Z"/>
      <path class="st4" d="M267.42,533.43l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M242.15,531.91l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M267.92,531.91l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M268.9,527.85v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M242.76,529.45l-.11.86.11-.86Z"/>
      <path class="st4" d="M268.43,529.89l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M242.65,493l-.02-1.06.02,1.06Z"/>
      <rect class="st4" x="232.86" y="530.95" width=".36" height=".36" transform="translate(-307.31 320.35) rotate(-45)"/>
      <rect class="st4" x="232.36" y="532.46" width=".36" height=".36" transform="translate(-308.53 320.43) rotate(-45)"/>
      <rect class="st4" x="269.25" y="525.39" width=".36" height=".36" transform="translate(-292.72 344.45) rotate(-45)"/>
      <rect class="st4" x="269.75" y="523.37" width=".36" height=".36" transform="translate(-291.14 344.21) rotate(-45)"/>
      <rect class="st4" x="270.26" y="521.35" width=".36" height=".36" transform="translate(-289.56 343.98) rotate(-45)"/>
      <rect class="st4" x="230.33" y="592.1" width=".36" height=".36" transform="translate(-351.29 336.47) rotate(-45)"/>
      <rect class="st4" x="268.24" y="593.11" width=".36" height=".36" transform="translate(-340.9 363.57) rotate(-45)"/>
      <rect class="st4" x="230.84" y="593.61" width=".36" height=".36" transform="translate(-352.21 337.27) rotate(-45)"/>
      <rect class="st4" x="231.85" y="596.14" width=".36" height=".36" transform="translate(-353.7 338.73) rotate(-45)"/>
      <rect class="st4" x="269.75" y="596.64" width=".36" height=".36" transform="translate(-342.96 365.68) rotate(-45)"/>
      <rect class="st4" x="270.26" y="597.66" width=".36" height=".36" transform="translate(-343.52 366.33) rotate(-45)"/>
      <rect class="st4" x="260.15" y="603.21" width=".36" height=".36" transform="translate(-350.41 360.81) rotate(-45)"/>
      <rect class="st4" x="273.8" y="604.73" width=".36" height=".36" transform="translate(-347.49 370.9) rotate(-45)"/>
      <rect class="st4" x="244.99" y="604.73" width=".36" height=".36" transform="translate(-355.93 350.53) rotate(-45)"/>
      <rect class="st4" x="274.3" y="605.74" width=".36" height=".36" transform="translate(-348.06 371.56) rotate(-45)"/>
      <rect class="st4" x="274.81" y="606.75" width=".36" height=".36" transform="translate(-348.62 372.21) rotate(-45)"/>
      <rect class="st4" x="247.52" y="512.75" width=".36" height=".36" transform="translate(-290.15 325.38) rotate(-45)"/>
      <rect class="st4" x="275.31" y="607.76" width=".36" height=".36" transform="translate(-349.19 372.86) rotate(-45)"/>
      <rect class="st4" x="275.82" y="608.77" width=".36" height=".36" transform="translate(-349.76 373.52) rotate(-45)"/>
      <rect class="st4" x="262.68" y="608.77" width=".36" height=".36" transform="translate(-353.61 364.23) rotate(-45)"/>
      <rect class="st4" x="276.32" y="609.78" width=".36" height=".36" transform="translate(-350.32 374.17) rotate(-45)"/>
      <rect class="st4" x="263.18" y="609.78" width=".36" height=".36" transform="translate(-354.17 364.88) rotate(-45)"/>
      <rect class="st4" x="247.52" y="610.29" width=".36" height=".36" transform="translate(-359.12 353.95) rotate(-45)"/>
      <rect class="st4" x="276.83" y="610.8" width=".36" height=".36" transform="translate(-350.89 374.82) rotate(-45)"/>
      <rect class="st4" x="277.33" y="611.81" width=".36" height=".36" transform="translate(-351.46 375.48) rotate(-45)"/>
      <rect class="st4" x="277.84" y="612.82" width=".36" height=".36" transform="translate(-352.02 376.13) rotate(-45)"/>
      <rect class="st4" x="200.01" y="404.1" width=".36" height=".36" transform="translate(-227.23 259.97) rotate(-45)"/>
      <rect class="st4" x="266.72" y="617.36" width=".36" height=".36" transform="translate(-358.5 369.6) rotate(-45)"/>
      <rect class="st4" x="267.23" y="618.38" width=".36" height=".36" transform="translate(-359.06 370.25) rotate(-45)"/>
      <rect class="st4" x="267.73" y="619.39" width=".36" height=".36" transform="translate(-359.63 370.91) rotate(-45)"/>
      <rect class="st4" x="268.24" y="620.4" width=".36" height=".36" transform="translate(-360.2 371.56) rotate(-45)"/>
      <rect class="st4" x="268.74" y="621.41" width=".36" height=".36" transform="translate(-360.76 372.21) rotate(-45)"/>
      <rect class="st4" x="269.25" y="622.42" width=".36" height=".36" transform="translate(-361.33 372.87) rotate(-45)"/>
      <rect class="st4" x="256.61" y="628.48" width=".36" height=".36" transform="translate(-369.32 365.71) rotate(-45)"/>
      <rect class="st4" x="257.12" y="629.49" width=".36" height=".36" transform="translate(-369.88 366.36) rotate(-45)"/>
      <rect class="st4" x="257.62" y="630.5" width=".36" height=".36" transform="translate(-370.45 367.02) rotate(-45)"/>
      <rect class="st4" x="258.13" y="631.52" width=".36" height=".36" transform="translate(-371.02 367.67) rotate(-45)"/>
      <rect class="st4" x="258.63" y="632.53" width=".36" height=".36" transform="translate(-371.58 368.32) rotate(-45)"/>
      <rect class="st4" x="259.14" y="633.54" width=".36" height=".36" transform="translate(-372.15 368.98) rotate(-45)"/>
      <rect class="st4" x="259.65" y="634.55" width=".36" height=".36" transform="translate(-372.72 369.63) rotate(-45)"/>
      <rect class="st4" x="260.15" y="635.56" width=".36" height=".36" transform="translate(-373.29 370.28) rotate(-45)"/>
      <rect class="st4" x="260.66" y="636.57" width=".36" height=".36" transform="translate(-373.85 370.94) rotate(-45)"/>
      <rect class="st4" x="261.16" y="637.58" width=".36" height=".36" transform="translate(-374.42 371.59) rotate(-45)"/>
      <rect class="st4" x="261.67" y="638.59" width=".36" height=".36" transform="translate(-374.99 372.24) rotate(-45)"/>
      <rect class="st4" x="262.17" y="639.6" width=".36" height=".36" transform="translate(-375.55 372.9) rotate(-45)"/>
      <rect class="st4" x="262.68" y="640.61" width=".36" height=".36" transform="translate(-376.12 373.55) rotate(-45)"/>
      <rect class="st4" x="265.71" y="647.18" width=".36" height=".36" transform="translate(-379.88 377.62) rotate(-45)"/>
      <rect class="st4" x="266.22" y="648.19" width=".36" height=".36" transform="translate(-380.44 378.27) rotate(-45)"/>
      <rect class="st4" x="266.72" y="649.2" width=".36" height=".36" transform="translate(-381.01 378.93) rotate(-45)"/>
      <rect class="st4" x="267.23" y="650.21" width=".36" height=".36" transform="translate(-381.58 379.58) rotate(-45)"/>
      <rect class="st4" x="268.24" y="652.74" width=".36" height=".36" transform="translate(-383.07 381.03) rotate(-45)"/>
      <rect class="st4" x="259.14" y="653.25" width=".36" height=".36" transform="translate(-386.09 374.75) rotate(-45)"/>
      <rect class="st4" x="268.74" y="653.75" width=".36" height=".36" transform="translate(-383.63 381.69) rotate(-45)"/>
      <rect class="st4" x="269.75" y="656.28" width=".36" height=".36" transform="translate(-385.12 383.14) rotate(-45)"/>
      <rect class="st4" x="260.66" y="656.78" width=".36" height=".36" transform="translate(-388.15 376.86) rotate(-45)"/>
      <rect class="st4" x="270.26" y="657.29" width=".36" height=".36" transform="translate(-385.69 383.8) rotate(-45)"/>
      <rect class="st4" x="261.16" y="657.79" width=".36" height=".36" transform="translate(-388.71 377.51) rotate(-45)"/>
      <rect class="st4" x="261.67" y="659.31" width=".36" height=".36" transform="translate(-389.64 378.31) rotate(-45)"/>
      <rect class="st4" x="271.27" y="659.82" width=".36" height=".36" transform="translate(-387.18 385.25) rotate(-45)"/>
      <rect class="st4" x="262.68" y="661.84" width=".36" height=".36" transform="translate(-391.13 379.77) rotate(-45)"/>
      <rect class="st4" x="263.69" y="664.36" width=".36" height=".36" transform="translate(-392.62 381.22) rotate(-45)"/>
      <rect class="st4" x="264.19" y="665.88" width=".36" height=".36" transform="translate(-393.54 382.02) rotate(-45)"/>
      <rect class="st4" x="264.7" y="667.4" width=".36" height=".36" transform="translate(-394.47 382.82) rotate(-45)"/>
      <rect class="st4" x="265.2" y="668.41" width=".36" height=".36" transform="translate(-395.03 383.48) rotate(-45)"/>
      <rect class="st4" x="215.17" y="404.61" width=".36" height=".36" transform="translate(-223.15 270.84) rotate(-45)"/>
      <rect class="st4" x="294.01" y="687.61" width=".36" height=".36" transform="translate(-400.17 409.47) rotate(-45)"/>
      <rect class="st4" x="204.56" y="406.12" width=".36" height=".36" transform="translate(-227.33 263.78) rotate(-45)"/>
      <rect class="st4" x="277.84" y="459.19" width=".36" height=".36" transform="translate(-243.39 331.13) rotate(-45)"/>
      <polygon class="st4" points="235.57 407.52 235.31 407.82 235.57 408.07 235.82 407.82 235.57 407.52"/>
      <rect class="st4" x="277.33" y="457.16" width=".36" height=".36" transform="translate(-242.11 330.18) rotate(-45)"/>
      <rect class="st4" x="236.4" y="408.14" width=".36" height=".36" transform="translate(-219.44 286.88) rotate(-45)"/>
      <rect class="st4" x="276.83" y="455.14" width=".36" height=".36" transform="translate(-240.83 329.23) rotate(-45)"/>
      <rect class="st4" x="276.32" y="453.63" width=".36" height=".36" transform="translate(-239.9 328.43) rotate(-45)"/>
      <rect class="st4" x="240.44" y="453.12" width=".36" height=".36" transform="translate(-250.06 302.91) rotate(-45)"/>
      <rect class="st4" x="275.82" y="452.11" width=".36" height=".36" transform="translate(-238.98 327.63) rotate(-45)"/>
      <rect class="st4" x="275.31" y="450.59" width=".36" height=".36" transform="translate(-238.06 326.83) rotate(-45)"/>
      <rect class="st4" x="274.81" y="449.08" width=".36" height=".36" transform="translate(-237.13 326.03) rotate(-45)"/>
      <rect class="st4" x="273.8" y="446.55" width=".36" height=".36" transform="translate(-235.64 324.57) rotate(-45)"/>
      <rect class="st4" x="273.29" y="445.54" width=".36" height=".36" transform="translate(-235.07 323.92) rotate(-45)"/>
      <rect class="st4" x="237.41" y="408.65" width=".36" height=".36" transform="translate(-219.5 287.74) rotate(-45)"/>
      <rect class="st4" x="272.78" y="444.53" width=".36" height=".36" transform="translate(-234.51 323.27) rotate(-45)"/>
      <rect class="st4" x="238.42" y="409.15" width=".36" height=".36" transform="translate(-219.56 288.61) rotate(-45)"/>
      <rect class="st4" x="272.28" y="443.52" width=".36" height=".36" transform="translate(-233.94 322.61) rotate(-45)"/>
      <rect class="st4" x="271.77" y="442.51" width=".36" height=".36" transform="translate(-233.37 321.96) rotate(-45)"/>
      <rect class="st4" x="271.27" y="441.5" width=".36" height=".36" transform="translate(-232.81 321.31) rotate(-45)"/>
      <rect class="st4" x="270.76" y="440.49" width=".36" height=".36" transform="translate(-232.24 320.65) rotate(-45)"/>
      <rect class="st4" x="250.04" y="439.98" width=".36" height=".36" transform="translate(-237.95 305.85) rotate(-45)"/>
      <rect class="st4" x="270.26" y="439.48" width=".36" height=".36" transform="translate(-231.67 320) rotate(-45)"/>
      <rect class="st4" x="249.54" y="438.97" width=".36" height=".36" transform="translate(-237.39 305.2) rotate(-45)"/>
      <rect class="st4" x="249.03" y="437.96" width=".36" height=".36" transform="translate(-236.82 304.55) rotate(-45)"/>
      <rect class="st4" x="248.53" y="436.95" width=".36" height=".36" transform="translate(-236.25 303.89) rotate(-45)"/>
      <rect class="st4" x="248.02" y="435.94" width=".36" height=".36" transform="translate(-235.69 303.24) rotate(-45)"/>
      <rect class="st4" x="247.52" y="434.93" width=".36" height=".36" transform="translate(-235.12 302.59) rotate(-45)"/>
      <path class="st4" d="M266.37,433.78l1.03,1.08.27-.27-1.31-1.24c-.03.2-.06.35.02.43Z"/>
      <rect class="st4" x="246.51" y="433.41" width=".36" height=".36" transform="translate(-234.34 301.43) rotate(-45)"/>
      <rect class="st4" x="246" y="432.4" width=".36" height=".36" transform="translate(-233.78 300.77) rotate(-45)"/>
      <path class="st4" d="M264.85,431.76l1.03,1.08.27-.27-1.31-1.24c-.03.2-.06.35.02.43Z"/>
      <path class="st4" d="M245.42,431.32q.5.5,0,0t0,0Z"/>
      <path class="st4" d="M263.34,429.74l1.03,1.08.27-.27-1.31-1.24c-.03.2-.06.35.02.43Z"/>
      <path class="st4" d="M244.25,429.59c.61.66.73.79.22.24-.43-.46-.6-.65-.22-.24Z"/>
      <path class="st4" d="M242.62,427.72l1.03,1.08.27-.27-1.31-1.24c-.03.2-.06.35.02.43Z"/>
      <path class="st4" d="M261.33,427.24l1.51,1.55.27-.26-1.82-1.75c-.02.19-.05.38.03.47Z"/>
      <path class="st4" d="M241.1,425.7l1.03,1.08.27-.27-1.31-1.24c-.03.2-.06.35.02.43Z"/>
      <path class="st4" d="M254.89,420.32l5.89,5.89.31-.2-6.36-6.33c-.04-.08.07.55.16.64Z"/>
      <rect class="st4" x="239.43" y="421.87" width=".36" height="3.22" transform="translate(-229.25 293.38) rotate(-44.99)"/>
      <rect class="st4" x="300.07" y="761.9" width=".36" height=".36" transform="translate(-450.93 435.52) rotate(-45)"/>
      <rect class="st4" x="299.06" y="764.43" width=".36" height=".36" transform="translate(-453.01 435.54) rotate(-45)"/>
      <rect class="st4" x="288.96" y="766.95" width=".36" height=".36" transform="translate(-457.76 429.14) rotate(-45)"/>
      <rect class="st4" x="297.04" y="768.97" width=".36" height=".36" transform="translate(-456.82 435.45) rotate(-45)"/>
      <rect class="st4" x="296.54" y="769.99" width=".36" height=".36" transform="translate(-457.68 435.39) rotate(-45)"/>
      <rect class="st4" x="287.44" y="770.49" width=".36" height=".36" transform="translate(-460.7 429.1) rotate(-45)"/>
      <rect class="st4" x="296.03" y="771" width=".36" height=".36" transform="translate(-458.54 435.32) rotate(-45)"/>
      <rect class="st4" x="286.94" y="771.5" width=".36" height=".36" transform="translate(-461.57 429.04) rotate(-45)"/>
      <rect class="st4" x="295.53" y="772.01" width=".36" height=".36" transform="translate(-459.41 435.26) rotate(-45)"/>
      <rect class="st4" x="286.43" y="772.51" width=".36" height=".36" transform="translate(-462.43 428.98) rotate(-45)"/>
      <rect class="st4" x="295.02" y="773.02" width=".36" height=".36" transform="translate(-460.27 435.2) rotate(-45)"/>
      <rect class="st4" x="285.92" y="773.52" width=".36" height=".36" transform="translate(-463.29 428.92) rotate(-45)"/>
      <rect class="st4" x="294.52" y="774.03" width=".36" height=".36" transform="translate(-461.13 435.14) rotate(-45)"/>
      <rect class="st4" x="285.42" y="774.53" width=".36" height=".36" transform="translate(-464.15 428.86) rotate(-45)"/>
      <rect class="st4" x="294.01" y="775.04" width=".36" height=".36" transform="translate(-462 435.08) rotate(-45)"/>
      <rect class="st4" x="266.72" y="775.04" width=".36" height=".36" transform="translate(-469.99 415.78) rotate(-45)"/>
      <rect class="st4" x="284.91" y="775.54" width=".36" height=".36" transform="translate(-465.02 428.79) rotate(-45)"/>
      <rect class="st4" x="293" y="776.56" width=".36" height=".36" transform="translate(-463.36 434.81) rotate(-45)"/>
      <rect class="st4" x="284.41" y="776.56" width=".36" height=".36" transform="translate(-465.88 428.73) rotate(-45)"/>
      <rect class="st4" x="292.49" y="777.57" width=".36" height=".36" transform="translate(-464.23 434.75) rotate(-45)"/>
      <rect class="st4" x="283.9" y="777.57" width=".36" height=".36" transform="translate(-466.74 428.67) rotate(-45)"/>
      <rect class="st4" x="265.2" y="778.58" width=".36" height=".36" transform="translate(-472.93 415.75) rotate(-45)"/>
      <rect class="st4" x="282.89" y="779.08" width=".36" height=".36" transform="translate(-468.11 428.4) rotate(-45)"/>
      <rect class="st4" x="264.7" y="779.59" width=".36" height=".36" transform="translate(-473.8 415.68) rotate(-45)"/>
      <rect class="st4" x="282.39" y="780.09" width=".36" height=".36" transform="translate(-468.97 428.34) rotate(-45)"/>
      <rect class="st4" x="281.88" y="781.1" width=".36" height=".36" transform="translate(-469.84 428.28) rotate(-45)"/>
      <rect class="st4" x="280.87" y="782.62" width=".36" height=".36" transform="translate(-471.2 428.01) rotate(-45)"/>
      <path class="st4" d="M262.32,785.53c.08-.13.21-.45.18-.4l-.78.54s.23.27.3.35l.3-.49Z"/>
      <rect class="st4" x="261.16" y="786.66" width=".36" height=".36" transform="translate(-479.84 415.26) rotate(-45)"/>
      <rect class="st4" x="260.66" y="787.67" width=".36" height=".36" transform="translate(-480.7 415.19) rotate(-45)"/>
      <polygon class="st4" points="260.48 789 260.19 788.74 259.67 789.23 259.96 789.49 260.48 789"/>
      <rect class="st4" x="259.14" y="790.2" width=".36" height=".36" transform="translate(-482.93 414.86) rotate(-45)"/>
      <g>
        <path class="st4" d="M0,690.71v6.8s.13,2.68.13,2.68l.1,1.51.3,3.87.4,4.22.14,1.04.45,2.86.35,2.2.21,1.13.37,1.84.22,1.09.3,1.42.57,2.41,1.45,5.71.29,1,.39,1.2.39,1.21.36,1.11.51,1.55.36,1.02.42,1.15.39,1.06.56,1.52.28.74.44,1.11.41.99.64,1.5.29.66.46,1.05.34.77.28.64.5,1.05.49,1.03.32.65.54,1.04.53,1,.54,1.03.34.62.33.59.55,1,.75,1.35.34.6.75,1.28.55.91,1.01,1.56,1,1.54.61.94.8,1.18,1.52,2.07.86,1.17.63.84,1.32,1.7,1.57,2.02.71.88,3.81,4.18,6.55,6.59,2.41,2.12,3.85,3.28,1.09.86,1.18.88,2.33,1.74.85.59,1.23.84,1.23.83.9.61.6.41,1.2.82.57.38.66.41.62.38.97.61.88.52,1.02.56.98.54,1.63.9.97.53,1.01.55.64.33.66.33.7.35,1.3.66,1.01.5,1.4.69,1.34.63,1.42.64,1.07.48,1.03.46,1.04.47,1,.44,1.5.62,1.05.43,1.13.47.63.25,1.08.41,1.87.71,1.09.42,1.07.4,1.49.55,1.49.55,1.19.44,1.08.39.65.23,1.54.52,1.53.52,1.11.36,1.9.59,1.59.49,1.54.48,1.23.38,1.15.35,2.01.59,1.06.31,1.54.44,1.61.46,1.25.36,1.14.31,1.55.4,1.63.41,4.04,1.02,2.04.51,2.39.56,2.15.48,2.04.45,2.49.53,2.59.51,2.54.5c1.25.25.65,1.88,1.18,2.36l2.06,1.86c.13.11.93.45,1.1.51l1.57.53c2.08.7,4.76.83,6.99.39l1.99-.4,1.55-.43c.18-.05.98-.47,1.09-.59l1.13-1.22.85.09,4.18.42,5.23.53,1.16.08,5.13.23,1.94.09,2.24.1,2.34.1,13.13-.51,1.07-.15,3.34-.5,3.03-.48,2.18-.37,1.04-.21,1.83-.45,2.05-.49,1.6-.42,1.54-.43,1.56-.43,1.11-.33,1.93-.66,1.53-.52,1.45-.53,1.52-.59,1.43-.57,2.14-.86,1.47-.59,1.06-.43,1.47-.58,1.44-.56,1.48-.57,1.1-.43,1.06-.41,1.51-.58,1.02-.41,1.48-.61,1.05-.43,1.44-.59,2.12-.87,1.47-.6,1.05-.43,1.48-.6,1.04-.43,1.45-.6,1.04-.43,1.45-.6,2.13-.88,1.47-.61,1.04-.43,1.84-.76,1.02-.44,1.05-.46,1.4-.61,1.77-.77,1.03-.45,1.81-.79,1.04-.46,1.04-.47,1.04-.47,1.68-.76,1.11-.5.99-.47,1.06-.52,1.29-.67,2.62-1.48.92-.54,1.6-1,1.47-.96,3.6-2.55,1.97-1.51,3.56-3.04,7.58-7.57,3.06-3.56,1.28-1.65,1.74-2.4,1.01-1.47,1-1.55.95-1.53.77-1.28.57-.95.52-.95.53-1.02.52-1.01.49-.98.67-1.39.5-1.02.52-1.06.42-.94.61-1.51.87-2.14.57-1.43.6-1.53.5-1.42.5-1.57.48-1.52.48-1.55.35-1.14.53-1.87.55-2.13.47-1.92.43-1.84.24-1.15.32-1.67.49-2.55.51-3.01.49-3.57.72-10.42v-10.67s-.69-10.44-.69-10.44l-.43-3.16-.63-3.9-.49-3.07-.47-2.52-.55-2.51-.47-2.05-.48-2.11-.47-2.07-.39-1.49-.33-1.18-.35-1.24-.77-2.7-.34-1.12-.41-1.23-.5-1.52-.5-1.52-.5-1.53-.51-1.53-.38-1.06-.56-1.52-.54-1.45-.55-1.5-.41-1.09-.55-1.46-.68-1.81-.72-1.79-.61-1.45-.9-2.13-.61-1.41-.93-2.11-.45-1.02-.63-1.41-.78-1.75-.62-1.38-.65-1.41-.47-1.03-.97-2.11-.47-.98-.51-1.02-.51-1.02-.32-.65-.51-1.02-.5-1.01-.5-1.01-.5-1.02-.5-1.01-.67-1.37-.49-1.02-.49-1.02-.49-1.01-.67-1.4-.49-1.02-.99-2.08-.48-1-.5-1.02-.5-1.02-.67-1.37-.5-1.01-.5-1.02-.51-1.04-.3-.63-.65-1.41-.8-1.73-.64-1.39-.47-1.03-.47-1.03-.64-1.41-.95-2.1-.47-1.04-.6-1.39-.89-2.16-.56-1.43-.72-1.9-.39-1.05-.55-1.56-.48-1.47-.48-1.62-.58-1.96-.4-1.6-.23-1.04-.38-1.89-.52-2.98-.49-4.18-.26-3.1-.02-4.99,1.55-12.17.21-1.1.59-2.46.51-2.1.48-1.94.52-2.11.51-2.01.51-1.94.43-1.63.53-2.01.54-2.01.33-1.22.33-1.17.43-1.54.32-1.16.66-2.39.43-1.61.52-2.01.51-2.01.5-2.03.5-2.03.5-2.04.47-2.02.48-2.2.27-1.21.31-1.51.49-2.68.49-3.01,1.01-7.26.13-1.22.08-4,.05-6.13-.26-5.36-.29-2.14-.74-4.46-.42-2.01-.5-2.06-.51-2.12-.51-1.87-.72-2.31-.37-1.07-.54-1.52-.55-1.55-.71-1.74-.67-1.46-.61-1.33-.49-1.06-.81-1.76-.48-1.04-.48-.93-.95-1.63-.75-1.26-2.42-3.75-1.42-2-2.94-3.69c-1.99-2.49-4.2-4.87-6.65-6.97l-3.58-3.06-2.53-1.96-1.48-1.01-1.56-.97-2.54-1.57-.59-.34-1.39-.71-1.33-.68-1.34-.67-1-.48-1.4-.66-1.4-.66-1.06-.42-2.2-.79-1.51-.54-1.49-.54-1.44-.48-1.62-.46-1.97-.54-1.61-.42-1.74-.44-1.13-.26-1.67-.35-2.05-.43-2.91-.59-1.95-.39-1.03-.18-2.67-.41-6.6-.97-4.52-.54-4.57-.45-3.9-.38-.19-4.75-.46-5.03-.41-2.66-.22-1.05-.34-1.39-.41-1.61-.48-1.48-.61-1.48-.88-2.11-.5-1-.79-1.32c-1.6-2.67-3.89-4.88-6.9-5.63l-2.04-.51-1.77-.44-1.12-.32-1.86-.58-1.06-.46-.66-.34-.65-.33c-.17-.09-.88-.49-1.01-.64l-3.41-3.91c-.11-.13-.36-1.1-.4-1.28l-.27-1.31-.13-.71-.89-11.37-.41-6.28v-1.05s.04-2.52.04-2.52c0-.19-.63-.41-1.1-.56-.19-.06-.43.86-.42,1.14l.33,6.74,1.39,15.87.64,3.15.41,3.09.25,1.44.27,1.5c.04.22.35-.75.33-.98l-.16-1.55-.15-1.47-.22-2.15.72,1.03,3.37,2.96,1.1.54,1.06.51.98.42,1.69.49,1.17.32,1.56.42,1.19.32,1.94.52c1.43.38,3.48,2.2,4.35,3.61l1.26,2.04.78,1.55.61,1.52.59,1.45.48,1.54.44,1.62.28,1.12.33,1.75.51,2.69.14,1.23.24,7.12c0,.09-.44.53-.35.42l-1.18-.1-5.7-.43-12.48-.72-7.05-.21-2.49-.03v-2.26s.04-10.12.04-10.12l.24-2.65.13-8.46.14-19.68.24-3.71.17-13.42c-.11-.02-1.18.01-1.18.14l-.11,4.48-.16,8.96-.12,18.18-.24,2.71-.15,8.93-.05,4.54-.09,10.1-.07,6.57-.05,2.52-.12,2.68-.12,7.45-.14,15.17-.24,2.68-.12,7.92-.16,12.64-.2,2.67-.18,10.47-.09,5.08-.03,2.01c0,.17-.57.69-.74.7l-1.74.12c-.16.01-.47-.62-.47-.76v-2.07s.11-10.63.11-10.63l.21-3.18.19-11.98.05-6.57.08-5.04.19-5.89.03-1.19.17-9.11.03-7.07.08-7.56.17-3.72.21-12.47.08-9.09.07-5.04.18-2.69.16-8.45.15-10.1.02-2.03v-8.1s-.11-2.99-.11-2.99c0-.18.35-.79.46-1l-1.49-.02-.04,4.04-.02,1.71c-.08.14-.53.95-.36.65l-1.77-.17-.93.28-2.91-.03-1.61-.02c-.21,0-1.08-.26-1.08-.47l.05-4.39.02-1.49c0-.25-1.24-.12-1.47-.08l-.16,6.5-7.71.03-1.42.35-2.27.02-1.92-.11c-.07,0-.51-.31-.51-.39l.04-.91.04-1,.04-.94.03-.73.04-.9.08-1.55c0-.18-.86-.66-.99-.54-.15.15-.49.98-.5,1.25l-.15,5.81-2.34.05-8.11.17-1.32.07-1.83.1.11-3.35.09-3.05c0-.28-.64-.92-.98-1.11l-.12,4.29-.07,2.51c0,.24-.62.83-.86.83l-1.55.05-8.1.11-3.1.04.26-7.4c0-.09-.75.22-.75.31l-.16,4.36-.04.94-.08,1.25c-.01.17-.43.75-.6.81-.15.06-.86-.16-.85-.32l.04-.69.39-6.88h-1.44s-.25,5.01-.25,5.01l-.29,5.71-.49,9.88-.05,1.11-.44,9.23-.34,7.91-.06,1.51-.37,7.59-.26,5.22-.14,2.86-.16,3.54-.08,1.75-2.72.47-2.63.46-3.43.59-2,.42-2.06.51-2.03.51-1.68.42-1,.28-1.32.39-1.17.34-.7.23-1.83.7-1.53.59-.98.41-1.43.62-1.46.63-.98.46-1,.54-.95.52-1.32.72-1.25.72-2.26,1.42-2.01,1.41-2.5,1.99-4.1,3.6-1.96,1.99-3.58,4.11-1.97,2.47-1.11,1.51-.63.86-.39.65-.93,1.55-1.31,2.22-.52.95-.52,1.03-.7,1.37-.53,1.04-.45.92-.65,1.55-.43,1.03-.45,1.06-.73,1.8-.59,1.53-.37,1.04-.72,2.3-.43,1.51-.53,2.04-.53,2.03-.5,2.03c-1.37,5.55-2.31,11.2-2.11,17.02l.39,11.11.75,6.43.37,2.71.19,1.14.48,2.56.34,1.83.2,1.06.97,4.84.58,2.87.3,1.3.57,2.42.59,2.51.37,1.57.49,2.09.57,2.41.5,2.13.37,1.55.28,1.18.31,1.32.36,1.55.28,1.19.42,1.81.36,1.54.28,1.2.38,1.71.5,2.53.49,2.63.29,1.55.31,1.72.47,3.14.53,6.11-.02,5.31-.39,4.35-.17,1.09-.49,2.68-.27,1.3-.36,1.58-.39,1.65-.47,1.99-.27.86-.37,1.07-.53,1.54-.38,1.07-.42,1.09-.72,1.87-.56,1.47-.28.66-.48,1.04-.65,1.42-.66,1.43-.47.97-1.86,3.72-.7,1.31-.71,1.27-.74,1.32-.74,1.32-.53.95-.73,1.28-.74,1.31-1.08,1.9-.75,1.32-.35.62-.54.97-.54.96-.75,1.34-.35.63-.57.99-.53.94-.56.97-.56.97-.37.65-.9,1.57-2.04,3.57-.33.61-.52,1.01-.71,1.36-.86,1.65-.51.96-.89,1.65-.54,1-.35.66-.52,1.01-.51,1-.51,1.01-.51,1.01-.67,1.33-.51,1.03-.63,1.34-.94,2.12-.63,1.42-.63,1.41-.26.63-.6,1.5-.74,1.84-.42,1.06-.41,1.1-.67,1.88-.65,1.83-.27.82-.35,1.08-.49,1.53-.36,1.11-.49,1.52-.36,1.29-.26,1.11-.39,1.66-.48,2.03-.57,2.4-.5,2.12-.18.87-.18.96-.2,1.08-.83,4.49-.18,1.03-.41,3.21-.5,4.57-.2,2.84-.13,2.55-.08,1.52L0,690.71ZM102.6,415.63l-.53,10.8-1.52-.07.53-10.8,1.52.07ZM99.4,505.2v-4.14s.22-4.52.22-4.52l.02-1.27,2.08-1.49,1.69-.35,1.09-.24,1.95-.68,1.02-.55,1.5-1.01,2.37-1.69.92-.57,1.26-.78,1.63-.62-.19,6.2-.08,3.05-1.9,1.4-2.38,1.75-3.78,3.92-1.64,2.2-1.06,1.5-.76,1.31-.59.97-.49,1.03-.78,1.66-.63,1.43-.51,1.49-.58,1.49-.45,1.57-.26,1.11-.5,1.5-.12-1.27.14-2.88.17-1.03.06-3.51.1-5.89.47-1.09ZM94.32,610.99v-9.64c0-.09.34-.75.49-1.01l.02-8.61.44-1.56.08-9.54c0-.1.32-.77.44-1.01l.12-10,.31-1.46.26-4.53,1.04,1.45,1.07,1.49,1.28,1.71c2.17,2.91,4.64,5.45,7.54,7.64l2.05,1.55c.42.32,1.81,1.02,1.84,1.55l.15,3.35.09,2.08c0,.22-.32.84-.51,1.15l-.06,13.32c-.07.1-.48.86-.48.95v11.63c.01.27-.36,1.23-.47,1.38l-.04,13.02-.43,1.38-.12,12.33-.45,1.37.02,12.71c-.07.1-.44.55-.44.64v1.83s0,2.88,0,2.88l-1.21-.16-2.42-.33-1.13-.16-2.74-.41-1.16-.19-1-.16-1.16-.19-2.82-.46-1.59-.26-1.3-.21v-2.28s.25-1.23.25-1.23l.12-9.6.43-1.56.02-9.64c.14-.27.49-.94.49-1.02v-9.65s.43-1.56.43-1.56l.12-8c.12-.23.46-.9.46-.99ZM77.77,657.09l3.24.26c.25.08.96.31,1.17.33l1.85.2,1.18.23,1.86.37,1.37.4-1.02.53-.54.99-.19,3.41c-.11,1.96-2.11,2.63-1.22,4.43.08.17.67.81.94,1.1l.05,1.16-.05.75c0,.71.07,2.31.35,2.97l.48,1.13.58,1.53.19,1.01-.1,1.21-2.22,1.79c-.15.12-.76.79-.77,1.02l-.15,3.02-.15,6.46-.28,1.15-.13,1.99-2.18-.29-2.23-.34-1.15-.27-2.17-.39-2.94-.53-2.6-.56-1.8-.16-.67-.92.05-2.59c0-.21.3-.87.46-1.17l.08-12.8.48-1.14v-9.99s.55-1.04.55-1.04l-.06-3.68.06-2.79,1.1.08,3.52.55,3.03.53ZM76.12,655.94l-1.17-.68h2.34s-1.17.68-1.17.68ZM85.32,692.54l-.02-1.48.29-1.26.22-5.23.08-1.95c0-.15.42-.46.57-.43l.77.15,1.85.38,1.29.26c.19.04.71.24.69.39l-.16,1.12-.21,1.53-.29,1.26-.26,5.55-.37,1.29.17,2.1.12,1.51-4.75-.79v-4.41ZM92.26,694.17l.06-2.55.43-1.15.16-4.87c.01-.4.46-1.59.61-1.96.09-.23.98-.03,1.22,0l1.6.24,5.09.77,1.13.17,2.37.37,1.55.29,1.68.33c.2.04.26,1.01.22,1.22l-.37,2.02-.38,1.24-.31,4.58c.01-.18-.28,1.02-.46,3.28l-.19,2.31c-.02.18-1.23-.13-1.41-.17l-2.46-.44-3.04-.54-2.58-.46-2.96-.53c-.35-.06-1.67-.11-1.7-.47l-.25-3.69ZM92.52,699.05l1.46.4,1.33.27,1.21.23,2.16.41.72.25,1.48.14.72.28,2.66.37,1.17.22,1.65.31c-.15.07-.89.33-1.09.31l-2.02-.25-1.57-.2-2.35-.29-1.18-.23-1.33-.29-1.2-.29-1.19-.29-1.68-.41-1.02-.33.07-.6ZM108.47,698.17l.06,2.34.41.7c.09.16-.13,1.14-.23.95l-.68-1.24-.09-5.56c.19-.31.48-.76.48-.85l.15-4.23c0-.22.39-.93.47-1.14l.29-.74.26-2.36.23-2.14c.02-.22.42-.99.56-1.27.08-.14.9.45.49.29l-.51,1.97.88-.86.35.28-.53.8-.59.91c-.1.15-.39.89-.4,1.07l-.07,1.5-.16,3.31-.36,1.18-.3,1.22-.42,2.65-.29,1.23ZM142.86,707.48l.37,1.31-.87-1.07-.54-.66.02-4.73.36-.85.24-2.36.17-1.15.33-2.29.24-.77.37-2.64.26-1.19-.49-1.05.36-1.13c.07-.21.54-1.03.52-.8l-.09,1.32-.09,1.19,1.35-1.46c.09-.09.08-.73.1-1.24l.63.54c.18.16.21,1.06.03,1.25l-1.04,1.1c-.15.16-.5.71-.55.93l-.27,1.36-.23,1.19-.28,3.28-.31,1.11-.14,1.5-.39,1.29-.05,6.02ZM150.45,705.06l.05,3.47-3.28-.58-2.88-.51-.74-1.02.04-1.37.22-1.37-.1-1.65.54-1.05.06-2.4.45-.94.37-2.72.34-2.33c.04-.24.34-.85.58-.81l.79.15,2.34.46,1.29.13.76.54-.21,1.18-.07,3.39-.14,6.39-.4,1.02ZM151.64,706.71l-.32-1.65.55-1.02.12-6.88.35-4.3,1.16-.76c.83-.55,1.38-1.39,1.41-2.06l.05-1.5c0-.21-.19-1.03-.28-1.22l-.63-1.34-.93-.85-.1-5,1.19-.55c1.04-.48,2.03-2.49,1.23-3.54-.19-.25-1.11-.98-1.1-.95l-1.28-.16.18-2.39v-1.41s.92-1,.92-1l1.31-.33,1.01-.27c.21-.06.22.76.16.88l-.18,3.48-.24,4.59.03,1.24-.26,2.76-.12,6.05-.23,4.37-.16,1.71-.04,8.95-.44.45.11,2.97-1.48.96-2.03.42.03-1.66ZM180.68,699.8l-.42,1.55-.11,7.33-.06,2.53c0,.25-1.09.12-1.35.08l-4.07-.64-1.12-.18-1.4-.24-1.16-.2-2.75-.47-1.15-.21-2.14-.4-2.94-.55-2.61-.49-1.41-.26-1.23-.22c-.17-.03-.69-.44-.7-.63l-.04-2.06-.03-1.51.36-1.35.26-7.67.18-3.3.12-2.46.16-8.7.29-1.43.19-4.85.06-1.63.07-1.85c0-.15.4-.46.55-.43l.75.13,1.56.27,1.18.2,3.67.41,1.18.17,2.37.35,1.17.19,1.95.31,1.06.18,3.2.46,3.54.51,1.7.24-.24,2.55-.14,11.87c-.05.08-.43.81-.43.93l-.07,11.48ZM182.32,672.48l1.79.07-1.61,38.75-1.79-.07,1.61-38.75ZM174.97,670.97l-2.45-.26.9-.31,1.59-.14-.04.71ZM144.58,577.87l.08,1.86-1.01,1.26-1.3.39-1.51.58-1.09.27-1.37.39-2.48.51-7.03.46.14-4.62.25-7.06,4.84-.24,2.21-.51,1.41-.4,1.59-.53.97-.43,1.06-.51,1.02-.5.97-.61,1.46-.52-.15,8.71-.06,1.47ZM144.95,563.75v1.07c.01,1.13-.87,1.76-1.5,1.86-.55.55-1.25.97-2.09,1.21l-.58.29-1.5.76c-.3.15-.94.11-1.39-.04-.26.18-.55.33-.86.45-.03.17-.09.32-.16.33l-1.38.33c-.07.02-.16.02-.25.02-.37.18-.81.28-1.31.28-.25,0-.48-.03-.69-.07-.23.12-.46.21-.58.21l-3.33-.04.02-3.61s.02-.06.05-.11c-.1-.56-.06-1.15.12-1.69l-.03-1.43.08-1.67c-.14-.58-.13-1.2.05-1.78,0-.01-.01-.03-.01-.04l.17-3.86v-.27c-.04-.73.03-1.47.22-2.17-.07-.14-.13-.28-.13-.34l.12-4.94.03-1.12.02-.96.07-2.9c0-.23.32-.95.39-1.16.14-.4-.32-.62-.27-1.96l.11-2.93.06-1.55.09-2.39.03-.79.33-10.47.06-1.5.1-2.17v-1s.04-1.11.04-1.11l.13-3.77c0-.26.3-.94.37-1.16.08-.26-.28-.46-.25-1.94l.06-3.38c-.09-.04,0-.03.16.02-.01-.38,0-.75.06-1.12-.18-.39-.13-1.38-.1-1.71l.17-1.91c.02-.22.27-.78.35-.99.05-.13-.22-.48-.22-.63l-.07-2.37-.05-1.49c0-.25.02-1.6.27-1.56l1.9.33,2.12.5c.59.14,1.81.7,2.29,1.01,0,0,.57-.08.52.2l1.23.32.99.53.89.54,1.3.83,1.19.85,2.2,1.71c.1.08.08.75.07.92l-.17,2s0,0,0,0c0,.36-.07.71-.19,1.04l.04.04c.18.18.17,1.56.14,1.81l-.22,1.49h0c.01.21.01.42,0,.64l.04.04.02.94c.23,1.02.19,2.1-.1,3.1.11.37.1.77-.05,1.13.05.17.09.32.09.38l-.21,4.8-.04,1.64v2.96c0,.07-.14.25-.28.38-.02.21-.04.43-.08.64l.09.19c.11.23.24,1.08.24,1.33l-.04,1.54-.1,3.55-.12,4.05-.04,1.33-.06,1.86-.12,3.89-.05,1.48-.12,3c.07.56.06,1.13-.03,1.68,0,.02.01.04.01.05l-.08,5.78c0,.07-.09.22-.21.36.01.45-.02.9-.11,1.34.09.35.17.79.16.99l-.06,3.81c.13.74.13,1.51,0,2.25ZM159.17,415.99l-.07,11.32-9.33-.06.07-11.32,9.33.06ZM158.62,415.01c-.02.19-.9.22-1.14.22h-2.13s-4.88-.05-4.88-.05c-.2,0-.48-.92-.59-1.46-.03-.16.81-.58.98-.58h1.53s3.08.03,3.08.03h1.58c.41,0,1.71.21,1.68.57l-.12,1.27ZM158.48,427.85l-.05,2.25-8.79-.21.05-2.25,8.79.21ZM158.99,433.34l-.03,5.04-.23,2.62-2.74-.12h-4.04s-2.45-.17-2.45-.17l.1-5.64.02-1.7.04-2.06.61-.59,2.18.09h3.54s2.91.02,2.91.02l.1,2.5ZM149.49,441.66l2.46-.16,3.34-.04,1.11.41,1.89-.03.14,1.71-2.43.43-4.04-.1-2.59-.29.12-1.92ZM158.63,444.6l-.13,9.9-2.05-.17-1.59.38-1.13-.59h-1.27s-3.25-.02-3.25-.02l.15-6.13.08-3.45,2.5-.08,4.03.08,2.66.07ZM158.16,455.13l-.05,2.12-9.02-.22.05-2.12,9.02.22ZM158.5,460.11l-.05,10.65-.24,2.66c-.01.12-.68.04-.99.03l-8-.39c-.26-.01-.47-1.04-.46-1.37l.17-6.6.18-6.84c0-.33,1.5-.53,1.83-.55l1.5-.07c.23-.01.96.28,1.18.29l1.79.14,2.53-.13c.18,0,.52-.03.52.08l.04,2.1ZM148.69,412.32l-2.6.21c-.07-.03-.56-.25-.9-.4h-7.91s-2.88.08-2.88.08l-.14-2.9.07-3.74.26-2.7.07-2.6,3.14.2,8.06-.02,3.13-.12-.3,11.99ZM134.67,399.48v-2.02h14.35v2.02h-14.35ZM120.58,369.16l-.03-2.71,2.6-.29,8.57-.05h2.63s-.18,3.56-.18,3.56l.03,4.04-.04,3.51-.26,2.72-2.71.29-8.56.04-2.46-.1v-2.65s-.15-3.92-.15-3.92l.53-1.1.03-3.33ZM105.65,368.63l-.02-.81.3-1.25,3.05.05h7.57s1.86-.24,1.86-.24l1.21.04-.04,2.24-.02,5.88-.61,1.02.22,1.68-.14,2.95-2.48.06-8.59.03-2.79.15.07-1.64.12-2.06.11-3.03.18-5.08ZM115.99,503.95l-.18-.57c-.06-.23-.25-1.16-.24-1.39l.19-3.81c.02-.35.94-1.06,1.26-1.2l1.1-.5,1.42-.56,1.9-.57,2.06-.59,2.09-.31,2.06-.06,2.73-.07-.12,3.72-.05,1.49-.1,3.05-.13,1.24-.02.82-.09,4.61-.14,6.83c0,.06-.09.23-.2.38-.03.2-.07.4-.13.6.08.17.14.34.14.41l.02,3.29-.03,1.5-.12,2.73-.19,5.39-.24,6.59-.06,1.5-.05,1.36-.04,1.15-.18,5.58-.06,1.49-.15,3.62-.27.97c.16.04.19.31.24.77l-.16,4.18c0,.12-.11.4-.24.64.06.4.04.8-.04,1.19l.22,1.75-.03,1.6c0,.22-.21.8-.35,1.24,0-.05.18,1.04.17,1.32l-.02,2.97c.1.52-.04,1.08-.42,1.45-.02.29-.13.67-.29.64l-2.25-.41-1.27-.34-2.2-.77-1.51-.53-1.11-.42-1.38-.77-1.5-.95-2.32-1.62c-.24-.17-.66-1.03-.65-1.33l.04-2.31s.03,0,.1,0c-.07-.38-.08-.78-.02-1.17-.1-.24-.19-.48-.18-.57l.13-2,.2-1.17.16-1.01c0-.3.03-.59.11-.87-.04-.26-.05-.53-.03-.79-.1-.28-.17-.55-.15-.72l.25-2.6.11.11c-.05-.28-.06-.56-.05-.85-.18-.38-.19-1.37-.16-1.7l.15-1.54.09-.98.05-1.01.15-4.66.27.16c-.03-.35-.04-.71,0-1.06-.05-.09-.09-.17-.09-.22l-.09-1.86-.07-1.54.11-.66c-.08-.46-.06-.93.05-1.39l-.08-.08.2-1.02.13-1.32.13-2.74c-.13-.64-.07-1.32.17-1.92l-.17-2.95.1-1.94.34-2.11.16-1,.06.05c.03-.25.07-.49.12-.73-.16-.2-.29-.39-.28-.49l.09-4.41.32.31c.01-.24.04-.48.08-.71l-.25-.26c-.24-.25-.15-1.5-.17-1.86l-.08-1.53.22-1.22.25-2.3c.01-.11.43-.52.44-.67ZM98.83,527.83l.36-2.63.19-1.38.31-2.17.3-1.31.3-1.07.47-1.66.51-1.48.6-1.52.43-1.08.41-.94.54-1.08.51-1.04.68-1.24,1.03-1.65.8-1.13,1.13-1.47,1.17-1.32,2.69-2.71s.08-.06.14-.09c.12-.17.28-.32.49-.42.19-.26.47-.45.85-.52.1-.17.21-.32.29-.38l1.53-1.06.09,2.55c0,.06-.03.16-.08.28.08.43-.02.89-.27,1.24.04.12.08.23.08.28l.08,3.77-.05,2.47-.17,1.44-.17-.15c.1.48.09.98-.02,1.46.27.98.25,2.17-.19,3.8l-.18-.17c.06.41.07.84.04,1.25.26.81.21,1.75.19,3.5l-.02,2.47-.16,1.29-.14,1.07s-.04.03-.07.03c.03.34.01.69-.06,1.02l.13.13-.07,2.12-.12,3.68-.03-.03c0,.2-.02.39-.05.58l.14.14c.26.27-.1,1.75-.15,2.13l-.16,1.08-.16,2.04-.07,4.5c0,.07-.09.16-.2.24.01.36-.03.73-.13,1.08,0,.06,0,.11,0,.17.13.36.25.85.25,1.04v1.61s-.02,1.38-.02,1.38l-.21-.17c-.01.33-.06.66-.17.97.09.17.16.32.16.37l-.19,3.23-.08-.08c-.02.08-.05.16-.08.23.02.23.01.46-.06.67.11.2.2.4.2.48l-.04,2.94.11,1.6c0,.06-.11.16-.27.25.2.47.18,1.04-.08,1.48l.2.38c.03.05-.02.34-.05.46l-.49,2.2-4.32-4.81-1.03-1.5-.99-1.55-.78-1.23-.7-1.26-.68-1.42-.48-1-.28-.67-.59-1.49-.58-1.48-.36-1.01-.38-1.26-.33-1.29-.45-2.08-.36-1.94-.52-3.63-.18-3.91c-.01-.22.31-.97.39-1.19.13-.38-.54-.76-.31-2.43ZM97.55,537.95v-1.07s.63,1.37.63,1.37l.09,1.21.24,1.39.42,2.14.44,1.52.35,1.06.38,1.16.5,1.53.76,1.82.66,1.38,1.18,2.33.71,1.34,1,1.56.97,1.43,2.09,2.64,1.4,1.53,2.71,2.74-.17,3.76v3.43s-.37,1.51-.37,1.51l-.04,3.72-1.34-.78-1.74-1.36-2.68-2.29-5.82-6.37-.97-1.39-.85-1.33-.99-1.55c-.11-.17-.57-.77-.56-.95l.09-3.37.09-3.43.16-6.39.41-.99v-1.73s.03-1.47.03-1.47l.18-6.08ZM110.5,635.27l-.02-10.69c0-.29.37-1.23.46-1.39l.1-13.32c.11-.17.45-1.08.45-1.4l.03-10.62.5-1.24v-13.04c.09-.19.34-.67.34-.76l.11-3.14,1.56.69,1,.55,1,.54,2.14.85,1.07.45,1.3.36,1.08.3,1.53.43,2.12.41,2.12.24-.4,14.09-.07,1.51-.07,2.22-.39,12.45.09,1.48-.25,2.75-.28,11.45.05,2.5-.28,2.73-.27,11.45.04,3.01-.26,2.72-.14,4.38-.14,4.41-2.22-.22-1.72-.17c-.22-.02-.85-.23-1.22-.36l-2.75-.16c-.09,0-.54-.25-.74-.35l-2.22-.28-1.14-.22-2.19-.42-1.41-.27.02-1.96.08-8.41.46-1.14.03-11c.11-.16.48-1.1.48-1.38ZM88.46,675.58l.95.03.23.11,1.25.17c.27.04,1.05.56,1.1.82l.51,2.58c.02.12-.06.65-.11.75l-.92,1.65c-.14.26-1,.08-1.31.04l-1.96-.26c-.22-.03-.89-.28-.72-.39,2.59-1.66,1.18-5.49.96-5.5ZM92.32,683.75l-.15,1.91-.55-1.08.38-1.09.32.27ZM92.28,683.24l.13-1.06.56-1.2.78.15-.58,1.16-.38.66-.22.56-.29-.26ZM91.58,670.65l2.26.35,1.13.17,2.75.42,1.16.18,1.84.3.7.12,1.92.36,2.12.4,1.17.22c.36.07,1.51.09,1.59.43l.39,1.66.49,2.05.23.95-1-.15-1.9-.29-1.18-.19-3.14-.34-.73-.35h-1.02c-.22.01-1.16.23-.95.27l1.46.27,1.18.22,2.73.46,1.17.2,1.53.25,1.14.19c.24.04.99.39,1.04.63.11.51.29,1.71.14,2.03l-1.22,2.65c-.09.2-.86.44-1.08.41l-2.14-.32-2.5-.37-1.45-.24-2.19-.37-3.04-.51-1.79-.3.1-1.91c.01-.27-.94-.93-1.01-1.2l-.33-1.2-.32-1.77,2.03.26,1.14.15,1.86.24c.22.03,1.04-.27,1.1-.31l-2.43-.45-1.16-.21-2.12-.21c-.37-.04-.9-.89-.97-1.28l-.23-1.3-.46-2.55ZM110.38,678.39l-.57-2.35-.48-2.21c-.03-.13.67-.14.79-.12l3.03.49,3.22.52,1.19.2,2.07.35,2.63.45,1.93.29c.38.06.98.91,1.05,1.3l.21,1.14.41,2.25c.34-.03-.16.02-.74.07l-1.02.23c-.13-.06.38.37.52.4l1.34.28c.23.05.48.88.45,1.11l-.18,1.21-.74,1.04-.57,2.28-1.47-.14-2.32-.22-.73-.27-1.85-.25-1.13-.18-2.33-.44-1.66-.31c-2.08-.39.08-2.11-.81-3.1l-1.42-1.58c-.64-.72-.88-1.74-.03-1.85.56-.44-.74-.35-.8-.59ZM111.92,682.78l-.11,1.25-.42-.33.52-.91ZM128.6,685.22l-.42-.47.25-.25.99,1.01-.99,1.01-.34-.29.51-1.02ZM128.17,686.77l-.25.77c-.21-.13-.28-.16-.25-.24l.24-.77c.22.13.28.16.26.24ZM127.61,682.01l2.22.2.29.1,1.11.15,1,.14,1.14.17,2.75.43,1.14.17,2.4.35,1.19.17,1.97.29c.18.03.74.49.76.68l.18,2.12c0,.08-1.92,2.97-1.56,3.02l-2.04-.26-2.7-.34-1.21-.31-2.19-.34-3.43-.53c-.25-.04-1.42-.03-1.34-.26l.5-1.46c1.01-2.94-1.58-2.96-2.18-4.48ZM143.57,677.4l-.02-2.53,1.29.19,1.56.23,3.2.47,4.39.55c.25.03.97.77.83.97l-.62.9c-.25.37-1.77.96-2.57.9l-2.25-.18-1.33-.16-1.22-.2-2.6-.43c-.16-.03-.65-.57-.65-.71ZM144.67,679.19l1.2.35,1.58-.14.83.52,3.43.29.27,1.21-.02,3.7-2.13-.3-1.38-.36-1.57-.07-1.17-.28s-.91-.35-.96-.58l-.56-2.35-.4-1.96.88-.02ZM152.13,673.54l-.21,1.44-2.89-.42-2.84-.49-2.2-.38c-.22-.04-.46-.8-.4-.81l.19-3.69,2.92.42,1.18.17,2.69.38,1.69.25-.13,3.12ZM127.15,680.07l-.3-1.64-.37-2.03,2.35.37,3.04.48,3.03.48,3.1.49,3.48.52c.27.04.97.87,1.02,1.16l.54,2.94c.04.19.06.73-.06.72l-1.61-.21-1.23-.16-3.19-.41-1.17-.2-1.01-.17-1.16-.2-1.87-.32-1.14-.19-.49-.07-1.97-.24c-.38-.05-.9-.93-.97-1.31ZM126.27,664.84l.09-1.47c0-.15.39-.39.54-.37l.78.13,1.5.24,1.15.19,1.88.31,1.15.19,3.24.46,1.16.17,1.97.29,1.68.24c.27.04.93.71.96.97.03.29-.12,1.55-.37,1.51l-1.76-.27-2.63-.4-2.41-.37-1.15-.17-2.31-.3-.75-.23-2.29-.33-1.58-.23c-.2-.03-.89-.4-.88-.57ZM128.35,666.66l2.32.25,1.09.28,2.32.37,1.17.19,2.21.36,3.45.56c.26.04,1.29.19,1.29.42v4.31s-2.53-.38-2.53-.38l-6.26-.94-1.18-.2-2.14-.35-3.1-.5c-.29-.05-.92-.86-.92-1.14l.11-3.46,2.16.23ZM126.14,675.11l-.11-3.13,1.66.27,5.7.93,2.7.44,1.68.31,2.18.28,2.2.38v2.58c.01.16-.89.62-.86.47l-9.24-1.55-3.01-.5-2.9-.49ZM109.1,669.38l2.54.3,2.34.27.76.23,2.67.39,1.17.19,1.9.31,1.19.2,2.21.37c.3.05.91.85.91,1.14l-.06,2.16-2.24-.36-3.05-.49-1.86-.3-1.54-.25-2.66-.43-3.2-.52c-.21-.03-.96-.18-.96-.38l-.09-2.82ZM109.11,668.21l.1-4.55,2.93.44,2.74.41,1.17.19,1.89.32,1.14.19,2.19.37,1.84.3,1.78.29-.06,1.33-.12,2.86c0,.14-.68.23-.87.2l-2.24-.34-1.19-.18-2.65-.38-.72-.18-2.35-.38-1.18-.19-2.15-.35-2.26-.36ZM109.18,661.79l.22-1.17c.07-.36,1.22-.06,1.58,0l2.04.3,1.16.17,2.73.4,1.16.19,1.88.31,1.15.18,1.49.24,2.41.38.07,1.59c0,.2-.74.54-.92.52l-2.84-.41-2.26-.32-1.17-.16-2.3-.33-.73-.19-2.26-.38-1.17-.19-1.84-.31c-.18-.03-.43-.63-.4-.8ZM126.13,583.23l-1.44-.25-1.96-.46-1.4-.35-1.58-.47-1.11-.39-1.7-.75-1.32-.65-1.36-.76-.93-.52c-.17-.1-.8-.61-.8-.8l.03-2.98.04-4.31.26-1.31.18-3.59,1.29.84,2.73,1.79.99.54,1.04.46,2.12.93,1.09.41,1.96.5,2.62.51c.29.06.96.88.95,1.25l-.33,10.37h-1.36ZM146.55,555.67c-.03-1.15.05-2.46.1-3.3l.08-1.49s.04-.05.09-.05c-.07-.36-.09-.72-.05-1.09l-.08-.08.22-3.75.15.15c-.11-.47-.16-.95-.16-1.43-.06-.22-.1-.42-.1-.55l.08-1.54.17-3.1.21.21c-.02-.3-.02-.59,0-.89-.11-.22-.21-.45-.2-.53l.07-3.58.02-1.1.04-1.35.23-4.59c0-.19.25-.89.22-1.07l-.25-1.24.15-2.56.13.13c-.03-.3-.03-.61.01-.91-.08-.18-.14-.33-.14-.4l.04-5.21c0-.06.07-.16.17-.26-.04-.23-.04-.47.01-.69-.01-.19,0-.38.06-.57-.03-.06-.05-.11-.05-.14v-3.53s0,0,0-.01c-.03-.45.03-.9.18-1.32l-.07-.07c-.29-.31-.1-1.59.08-2.34-.13-.31-.16-.67-.09-1-.01-.23.02-.47.1-.68l.02-3.03.73.57,1,1.11,2.16,2.78,1,1.42.83,1.34.71,1.24.56,1.04.5,1.02.38,1.08.43,1.1.69,1.39.57,1.41.44,1.57.44,1.57.3,1.13.4,1.77.31,1.34c.3.7.34,1.52.13,2.25l.1.42.28,2.66.02,1.51-.12,1.9-.04.76-.14,2.41-.18,1.51-.33,2.17-.57,2.87-.3.86-.21,1.26-.36,1.08-.45,1.21-.56,1.51-.4,1.13-.44.98-.73,1.38-.85,1.6-.52.94-.63,1.01-.96,1.41-1.37,1.69-.73.91-.59.85-2.62,2.42c-.19.17-.47-.75-.46-1.11l.1-4.65c-.39-.88-.38-1.96.05-2.82ZM148.02,441.45l-.02,2.11-14.66-.15.02-2.11,14.66.15ZM148.01,440.62l-3.18.18-.96-.38h-10.46s.13-3.7.13-3.7l.14-6.13,2.55-.19,4.16-.15.56.57,4.4-.05,2.83-.03.05,3.18-.12,1.44-.04,1.68-.07,3.59ZM117.93,439.98l.2-7.17.14-2.53,11.41.05,2.67.25-.15,4.78-.15,4.96-2.36.09-9.57-.03-2.19-.4ZM120.11,440.95l6.37-.02,1.03.64,1.66-.3,1.53.08,1.37.04-.11,1.87-1.83-.09-2,.45-.61-.67h-6.93s-2.79,0-2.79,0l.03-1.93,2.27-.07ZM147.66,456.8l-3.01.2-.97-.37-7.92-.07-1.54-.04-1.27-.19.07-1.77h3.25s8.52.03,8.52.03l1.13.3,1.72.08.03,1.84ZM145.35,454.08l-9.08-.09-3.19-.47.26-9.35,2.43-.17,3.82-.03,1.1.55,4.16-.12h3.06s-.09,3.08-.09,3.08l-.1,6.54-2.38.05ZM147.65,457.83l-.08,1.95-.32,13.06-3.4-.11-6.05-.19-1.61-.14-2.96-.11c-.23,0-.68-.86-.67-1.14l.14-4.89.26-8.96,3.32.25,8.58.09,1.52.11,1.27.09ZM147.19,474.3l-.1,4.79-.17,8.13c0,.21-.49.51-.62.45l-1.08-.57-1.36-.72-1-.48-2.15-.9-1.25-.43-1.81-.59-1.2-.32-2.84-.6-1.44-.3.3-9.14,14.72.69ZM118.72,427.42l2.47-.07,7.19-.02,1.35.28,2.71.02.04,1.94-2.87.11-4.34.16-.84-.52-2.86.03-3.01.03c-.33,0-.49-1.94.16-1.96ZM118.5,426.5l.05-1.74.06-6.57.22-2.35,2.78-.16,8.55.02,2.65.32-.2,6.21.02,2.01-.24,2.51-2.21.03-9.08-.02-2.61-.25ZM118.72,414.02c.19-.37.92-1.1,1.22-1.08l2.19.16h7.53s3.24.01,3.24.01l-.14,1.96-2.58.04-8.58-.04-2.36-.09c-.13,0-.61-.8-.54-.95ZM119.04,412.07v-3.49s.1-5.54.1-5.54l.28-2.76,3.21.19h7.56s3.14-.16,3.14-.16l-.1,5.26-.07,4.01-.24,2.6-3.21-.03-10.66-.09ZM119.45,397.46h13.9v2.02h-13.9v-2.02ZM146.65,495.99l-.09,2.21-.18,1.35-2.2-1.72-.99-.65-1-.52-1.01-.53-.98-.5-1.4-.7-1.46-.56-1.56-.39-1.56-.38-1.46-.34c-.17-.04-.93-.26-.92-.44l.03-2.38.05-1.6.17-3.95c.01-.24.5-.84.7-.8l2.74.56,1.22.3,1.62.46,1.38.48,1.9.75,1.01.45,1.01.51,1.01.52.95.49c.25.13,1.1.77,1.09,1.05l-.04,4.75-.03,1.58ZM131.65,453.57h-2.55s-8.26-.06-8.26-.06l-1.34-.27-2.01-.14.13-6.64.03-1.55c0-.22.19-1.05.39-1.05l2.53.04,8.65.13,2.42.05c.17,0,.31.72.31.89l-.04,1.03-.26,7.59ZM131.62,456.38l-2.5.09-2.25-.04-1.47-.32-5.8-.08-1.97-.03c-.38,0-.39-1.88,0-1.88l2.55-.03,7.67.02,1.38.31,2.36.12.04,1.85ZM131.54,457.28l-.13,4.02-.35,10.89-5.39-.29-8.15-.44c-.22-.01-.75-.62-.73-.79l.21-2.46.16-8.63.19-2.67c0-.11.78.02.91.03l2.34.06,8.6.2,2.35.08ZM130.98,473.56l-.07,3.41-.21,5.76-1.52.06-1.59-.12-4.91.7-1.58.43-1.24.33-1.35.36-1.34.56-.93.18.09-1.53.18-1.36.06-7.07.19-2.5,4.99.27,9.22.5ZM130.62,484.07l-.03,4.88v1.48s-.17,2.64-.17,2.64l-3.28-.15-3.98.65-1.91.49-1.58.53-2.13.86-1.74.76.18-3.76.12-2.5.14-2.99.71-.63,1.14-.4,1.48-.58,2.39-.66,3.05-.49,2.68-.29,2.94.16ZM115.75,471.35l-8.45-.43-6.41-.33.27-7.59.12-1.36.16-4.07c0-.24.2-1.1.41-1.09l2.56.08,9.6.08,2.31.3v1.99s-.23,1.2-.23,1.2l-.06,8.57-.27,2.65ZM101.52,455.58l.04-1.93,2.36-.07h6.38s1.03.59,1.03.59l2.18-.18,2.89.09-.03,1.9-2.34.05-5.15.11-1.12-.52-3.33-.02-2.91-.02ZM101.56,452.07l.09-1.5.06-1.06.35-6.03h2.37s10.04.04,10.04.04l2.32.31-.09,1.8-.09,1.81-.19,5.66-3.52-.03-8.78-.08-1.81-.23c-.17-.02-.78-.53-.77-.7ZM102.12,442.47l.03-1.86,3.3.26,9.07.07,2.4.06-.11,1.88-2.3.07-8.9-.09-3.5-.4ZM102.27,439.19l.4-9,2.99-.32s.53.23.95.42h7.91s2.78,0,2.78,0v1.7s-.21,1.36-.21,1.36l-.03,3.53-.05,3.1-2.97-.02-9.11-.07-1.5-.02c-.23,0-1.16-.46-1.15-.67ZM102.75,429.27l.02-2.1,14.72.12-.02,2.1-14.72-.12ZM102.89,426.37l.21-6.24.05-1.52.3-2.92h2.5s9.59-.02,9.59-.02l2.33.14-.26,2.89-.08,5.55-.07,2.26-2.43.18-5.64.15-1.15-.53-2.55.03-2.81.03ZM103.47,413.66c-.02-.17.47-1.01.34-.73l2.14-.25,6.63-.11.6.56,1.83-.1,2.87-.12v1.9s-2.39.26-2.39.26l-4.31.05-1.09-.57-3.65.16-2.84.11-.14-1.17ZM103.58,412.06l.16-2.46.1-1.54.08-1.5.26-6.14,2.78.02,8.51.04,1.63-.1c.26-.02,1.32-.05,1.3.22l-.11,1.89-.08,1.18-.17,5.91-.08,2.55-12.01-.05h-2.36ZM104.16,397.46h14.29v2.02h-14.29v-2.02ZM104.45,395.46l.28-6.26.28-5.13,2.47-.22,9.07-.03,2.38.13-.07,1.92.37,1.62-.62,1.06-.05,4.87-.03,2.61-.39.6-2.13.3-9.27.02-2.13-.35-.17-1.12ZM105,383.28l.13-1.97,2.83-.02,8.13-.06,2.53-.08c.45-.01.69,1.9-.02,1.96l-2.06.16h-9.05s-2.49,0-2.49,0ZM105.88,363.62l13.82-.1.02,2.07-13.82.1-.02-2.07ZM119.98,385.91l.03-2,2.61-.06,8.08-.07,3.04-.03-.11,7.65.02,2.48-.26,2.78-1.34.02-1.86-.23h-7.56s-2.07.25-2.07.25l-1.04-.12.11-9.59.35-1.09ZM119.91,381.73c.02-.17.5-.71.67-.72l2.06-.17,8.58-.04,2.42.14c.38.02.21,1.48.13,1.86h-3.1s-7.46.03-7.46.03l-1.3.14-1.39.05c-.24,0-.63-1.05-.61-1.29ZM148.66,413.13v2.05s-14.51-.04-14.51-.04v-2.05s14.51.04,14.51.04ZM148.57,416.14l-.21,9.65c0,.22-.11,1.16-.32,1.15l-2.3-.09-8.98-.08h-2.96s.03-2.56.03-2.56l.06-1.97.12-2.7.16-3.63,2.15.09,1.14.09,7.88.04h3.24ZM148.34,427.81l-.02,2.12-14.65-.15.02-2.12,14.65.15ZM149.29,491.11l3.07,2.41c.17.13.88.54,1.05.59l1.06.33,1.63.38c.23.05,1.14.23,1.3.4l2.3,2.51,1.36,1.86.96,1.44,1.37,2.23.52.95.69,1.39.5,1.01.52,1.05.44.96.6,1.51.55,1.41.58,1.57.46,1.45.67,2.34.35,1.24.33,1.12.36,1.2.34,2.68c.07.24.26.9.28,1.12l.12,1.54.15,1.89.21,2.75.02,4.97-.22,2.69-.55,4.59-.49,2.98-.31,1.32-.75,2.73-.54,1.97-.38,1.08-.69,1.88-.57,1.55-.59,1.41-1.27,2.69-.75,1.35-.96,1.56-.99,1.61-.97,1.39-1.58,2.08-1.8,2.19-3.66,3.63-2.64,2.24-1.72,1.26-.92.58-1.29.79-1,.62c-.11,0-.32,0-.41,0l.12-6.01.12-6.33c0-.49.64-1.32.99-1.69l5.22-5.39,1.26-1.74.78-1.23.95-1.61.51-.94.53-1.05.52-1.04.47-.99.7-1.84.56-1.54.35-1.1.75-2.73.37-1.34.23-1.11.38-3.14.23-2.83.14-3.61-.04-1.47-.28-3.55-.35-3.02-.27-1.18-.63-2.4-.53-2-.38-1.16-.73-1.86-.57-1.46-.45-1.02-.52-1.11-.48-.91-.94-1.58-.81-1.36-.79-1.22-1.44-1.93-3.95-4.23.05-5.41v-1.49s.11-1.67.11-1.67l.11-1.96.97.77ZM144.5,582.02l-.25,6.97-.09,6.09-.11,1.48-.03,1.68-.19,9.44-.13,6.56.07,2.5-.27,2.73-.35,15.02-.05,1.97-.27,9.63-.2,8.57.02,1.5-.1,2.71-.2,5.51-2.68-.49-2.47-.18c-.11-.05-.8-.37-.98-.38l-2.78-.19c-.34-.12-1-.34-1.23-.35l-2.33-.14-1.2-.34-2.26-.37.04-1.35.16-5.65.13-4.79-.05-3.01.28-2.73.26-11.45v-2.52s.21-2.67.21-2.67l.19-6.43.15-5.05.03-1.49.13-2.72.17-4.36.2-8.1.06-1.48.08-2.22.16-4.38.2-5.57.04-1.23,2.85-.1,1.52-.1,2.89-.24,2.05-.4,1.6-.43,1.57-.42,1.49-.65,1.64-.35ZM145.9,665.97l1.11.15,2.73.43,1.18.2,2.14.36,5.47.91,1.12.16,2.32.26.76.26,2.64.35,1.22.26,1.98.1.73.36,2.64.15c0-.09-.03.4-.04.5l-2.2-.07-1.04-.39-2.55-.15-.72-.35-2.79-.17-1.25-.24-2.34-.35-1.51-.23c-.2-.03-1.07.02-1.27.06l-2.15.53c-.33.08-1.28.36-1.64.3l-2.15-.34-3.07-.48-3.5-.55.1-2.29,2.07.27ZM148.51,691.17l-1.59-.28.12-1.14.19-1.8-1.51-1.06-.58-1.2-.14-1.21,1.07.43,1.86.11,1.13.28,2.32.4,1.09.22,1.09,1.09.37,2.21c.17.99-1.33,2.64-2.33,2.46l-3.1-.54ZM141.71,697.15l-.17,1.16-.47,3.24-.2,1.21-.12,1.44-.07,2.14c-.01.36-.97.07-1.31.01l-2.73-.44-2.72-.44-1.16-.24-1.68-.32-2.57-.5-1.72-.33c-.19-.04-.43-.76-.43-.97l.09-2.72.59-3.35.45-2.11.53-3.49.17-1.42c.02-.2.28-.99.46-.96l2.18.33,5.47.82,1.13.17,2.39.34,1.16.16c.33.05,1.53.39,1.49.72l-.45,3.6-.28,1.94ZM126.04,705.35l-.96-.56c-.76-.45-1.02-2.75-.61-4.73l.53-2.51.33-2.94c.04-.35.09-.95.16-1.15l.52-1.49c.08-.24.16-1.05.16-1.42l.03-4.3c0-.09.38-.77.44-.83l.94-.93c-.01.12-.17.89-.26,1.13l-.42,1.1-.31,1.41.85-.57.26.23-.33.93-.37,2.21-.19,1.15-.25,1.51-.28,1.63-.48,2.63-.47,5.3c-.05.52.79,1.79,1.22,2.44.43.21-.33-.14-.51-.25ZM124.09,695.61l-.36,2.59-.39,1.64-.17,3.38c-.01.25-.76.15-.99.11l-2.25-.41-3.42-.62-2.61-.48-1.75-.32-1.19-.22c-.22-.04-1.18-.23-1.2-.45l-.23-2.18-.03-1.52.25-1.19.47-2.19.28-1.17.28-1.16c.32-1.33-.3-1.24-.06-2.52l.37-1.91c.05-.24.4-.75.64-.71l.8.14,2.65.43,2.7.38.7.17,2.38.38,1.21.19,2.33.37c.27.04.72.84.68,1.13l-.23,1.91-.51,1.25-.34,2.98ZM92.24,689.35l-.57,1.07.2,1.75-.33.42-.25-.26-.02-5.34.21-1.01.78,1.25-.02,2.11ZM91.95,697.56l-.37,1.13-.75-1.22-.08-4.42.28-.47.26.26v4.16s.67.56.67.56ZM86.38,668.07l.09-1.55,1.13-.73,1.81.36,1.17.21-.06,3-1.96-.3-2.19-.99ZM77.63,655.66l3.33.19,1.24.32,1.99.09.7.33,2.38.21,1.15.2,2.19.38c.07-.27-.06.22-.12.44l-2.2-.16-1.1-.36-2.8-.18-.73-.35-2.31-.15-.71-.39h-2.5c-.09-.01-.34-.34-.52-.56ZM90.78,659.49l-.25.25-.25-.25.25-.25.25.25ZM90.94,660.5l-.26,4.61-2.91-.16.26-4.61,2.91.16ZM90.96,672.22l.48,2.05.17,1.19-1.47-.3-.47-.17-1.38-.15-.82-1.26-.12-1.65.15-2.03,1.4.25,1.73.31.32,1.76ZM91.39,666.47l1.54.18,2.94.53,2.65.47,2.93.34.96.22,2.35.38,1.15.2,2.19.32.05,2.13.03,1.01-1.77-.24-2.91-.55-1.75-.04-1.05-.46-2.67-.21-1.07-.44-2.02-.05-1.14-.28-1.47-.36-.94-.23v-2.92ZM91.5,665.13l.11-2.02.1-1.93c0-.14.57-.14.71-.12l3.06.48,2.4.37,1.13.17,2.81.28.77.21,2.25.38,1.6.27,1.82.31-.13,2.74-.08,1.65-2.78-.41-2.9-.43-1.01-.16-8.86-1.43c-.24-.04-1.01-.16-1-.38ZM91.71,658.88c.08-.21.6-1.12.77-1.1l1.78.2,1.02.13,2.05.31,1.02.16,1.53.24,1.16.18,2.75.44,1.13.22,2.19.44,1.18.24c.35.07.17,1.89-.19,1.88l-1.67-.08-3.91-.47-.81-.26-2.66-.32-1.25-.33-2.14-.33-3.04-.47c-.29-.04-1-.81-.9-1.08ZM95.78,559.39l-.32.09-.64-1.3-.51-1.05-.45-.98-.6-1.5-.42-1.05-.59-1.47-.58-1.44-.5-1.48-.45-1.65-.42-1.53-.5-1.84-.34-1.36-.35-2.2-.56-3.58-.26-2.75v-11.11s.46-1.43.46-1.43l.05-1.98.3-.73.37-2.17.28-1.17.32-1.15.38-1.24.36-1.14.87-2.68.54-1.39.63-1.56.42-.92.54-1.06.51-1.01.51-1.01.69-1.38.54-.95,1-1.5.81-1.18.86-1.22.04,4.25.05,1.5c0,.09-.23.42-.42.72l-.1,9.19-.26,1.45-.16,3.26-.35,7.27-.5,9.6-.49,9.1-.13,3.42-.16,7.85-.29,1.78-.18,3.68ZM99.81,493.41l.04-2.45.09-5.4c.1-.18.42-1.08.42-1.33l.04-9.19.31-1.25.15-1.84,2.18.13,12.67.62-.02.69-.06,2.38-.19,7.12-.19,2.63c-.02.28-.96.7-1.21.83l-1.09.56-.99.54-1.16.74-1.82,1.27-2.24,1.56c-.2.14-1.04.54-1.22.59l-1.58.43-1.88.55-2.24.81ZM98.56,470.46l.66-14.15,1.57.07-.66,14.15-1.57-.07ZM99.31,453.49l1.51-.05.07,2.1-1.51.05-.07-2.1ZM99.45,452.68l.39-9.3,1.45.06-.39,9.3-1.45-.06ZM99.96,442.54l.06-2.03,1.38.04-.06,2.03-1.38-.04ZM99.97,439.76l.56-9.9,1.48.08-.56,9.9-1.48-.08ZM101.91,429.34l-1.34-.05.08-2.11,1.34.05-.08,2.11ZM102.81,412.77l-.04,2.07-1.48-.03.04-2.07,1.48.03ZM101.89,400.69c0-.16.92-.8.99-.65.14.27.46,1.19.44,1.68l-.48,9.35c-.01.26-.22.95-.38.98-.19.04-1.08-.24-1.07-.43l.11-2.71.08-1.82.11-2.28.21-4.13ZM102.04,397.48l1.45.05-.06,2.05-1.45-.05.06-2.05ZM102.7,383.98l1.54.08-.64,12.66-1.54-.08.64-12.66ZM102.86,381.22l1.46.07-.1,2.03-1.46-.07.1-2.03ZM103.53,366.63l1.49.02-.35,7.55-.07,1.05-.14,1.47v2.64s-.58,1.48-.58,1.48l-.87-.65-.04-2.97.05-1.47.2-2.71.24-3.88.07-2.53ZM105.24,363.84v1.56s-1.56.52-1.56.52l-.04-2.07h1.6ZM104.38,348.83l.68-.9.8.59-.14,3.95-.1,1.03-.42,9.53c-.43-.07-1.4-.43-1.39-.65l.4-9.42.18-4.13ZM106.03,345.43l-.07,2.08-1.48-.05.07-2.08,1.48.05ZM106.58,348.94l.32-.69,2.61-.28,8.05-.07,2.74-.03-.18,3.09-.07,9.06-.29,1.31-.09,1.32-3.14-.06h-5.87s-1.04.64-1.04.64l-1.86-.41-1.77.09.17-5.88.1-1.04.31-7.06ZM120.5,345.05l-.18,2-3.19-.04-1.37.35-6.21.04h-2.13c-.14.01-.92-.48-.94-.63-.03-.17.53-1.36.7-1.36l6.7-.02,1.37-.38,2.77-.02,2.48.06ZM121.55,363.43l2.08.1,2.01.1c.09,0,.42-.32.68-.57l5.42.1,2.4.05c.37,0,.38,1.9,0,1.91l-2.42.05-1.49.02-1.31.37h-5.73s-2.15-.02-2.15-.02c-.14,0-.44-.9-.52-1.31-.03-.18.84-.81,1.03-.8ZM121.2,348.4c0-.16.69-.59.88-.58l2.03.03,1.34-.36,6.71-.02,2.5.04c.24,0,.21,1.17.2,1.45l-.28,9.07-.04,1.47-.08,2.88-2.74.12-8.59.1h-2.35s0-2.48,0-2.48l.24-1.36.15-8.19.04-2.16ZM134.99,344.6l-.02,1.93-1.53.14-1.37.19-10.21.12c-.77,0-.94-1.99.27-2l1.98-.03,7.56-.1,1.26-.1,2.07-.16ZM137.8,383.63l1.66.34,1.03-.65,6.36.04,2.45.21.08,4.29-.03,5.02-.28,2.34-.04,1.4-3.17-.16h-8.05s-2.79.25-2.79.25l-.14-1.26-.11-1.82.1-2.23.21-2.69.1-5,2.63-.09ZM135.23,380.81l14.24-.14.02,2.1-14.24.14-.02-2.1ZM135.59,371.03l.13-4.99,3.08.05h3.33s1.11-.55,1.11-.55l4.15.17,2.34.1.08,2.86-.04,1.48-.19,2.7-.14,6.93h-3.08s-8.08,0-8.08,0l-1.97.29-.94-.24-.12-2.86.07-3.24.25-2.7ZM149.87,362.9l.04,2.16-14.17.23-.04-2.16,14.17-.23ZM136.31,347.41h2.53s1.49-.01,1.49-.01c.22,0,.83-.27,1.17-.43l6.38-.04,2.33.09-.11,5.12-.21,9.88-11.08.11-2.83.28-.1-1.84.04-1.47.18-2.92.21-8.76ZM150.05,346.11l-2.16.24-8.59.11-2.95.04.07-1.97,2.36-.04,8.62-.16,1.82-.12.72-.06c.41-.03.33,1.95.11,1.97ZM150.35,400.26l2.63-.15,3.46-.04,3.01.06v2.4s0,7.57,0,7.57l-.13,2.1c0,.14-.55.26-.76.26l-2.64.08-3.68-.05-2.12-.13.08-4.45.14-7.64ZM159.16,397.4v2.08s-8.8.02-8.8.02v-2.08s8.8-.02,8.8-.02ZM153.96,362.65l3.51-.05,1.99.15.48.9-.74,1.13-2.26-.16-1.81.11-1.19.34-2.76-.28v-1.92s2.78-.23,2.78-.23ZM160.14,344.96c-.14.23-.85.88-1.12.89l-1.98.07-2.14.08-2.52.1c-.19,0-.91-.72-.84-.89.13-.34.66-1.22.87-1.22l2.02-.02,3.1-.04h1.97c.18-.01.74.86.64,1.02ZM160.07,362h-2.59s-3.53,0-3.53,0l-2.6-.02.09-4.45.21-10.54,1.79-.05,3.55-.09,1.34-.12,1.29-.19c.15-.02.79.17.79.29v2.07s-.05,2.04-.05,2.04l-.12,2.71-.17,8.34ZM156.48,379.76h-4.06s-1.5-.02-1.5-.02l.04-2.76.1-6.81-.04-1.46.2-2.76c-.22.03.89-.21,1.19-.22l1.49-.06,5.58-.22c-.17-.14.59.18.59.31l-.1,6.33v5.16s-.14,2.52-.14,2.52h-3.36ZM153.98,380.72l1.95-.04,3.53-.09-.56,1.95-2.45.18-2.97.02-2.6-.17-.02-2,3.13.15ZM155.95,396.49h-2.52s-1.51.02-1.51.02h-1.37s-.12-3.88-.12-3.88l.05-4.74.27-2.72.13-1.71,2.58-.11,2.5.02,3.77-.11-.05,1.23-.14,10.46-.02,1.7-3.57-.15ZM227.08,818.82l1.48-1.07,1.48-1.05,2.97-2.08,1.21-.84,5.67-4.91,3.5-3.54,3.06-3.58,1.55-1.97,1.48-2.03,1.88-2.69.81-1.21.57-.9.76-1.29,1.33-2.25.52-.94.53-.99.74-1.37.5-.95.67-1.4.49-1.02.5-1.04.3-.65.49-1.07.43-.98.61-1.5.75-1.83.44-1.07.25-.63.54-1.56.38-1.1.52-1.51.52-1.52.49-1.5.49-1.55.47-1.53.59-1.94.42-1.56.55-2.46.46-2.12.54-2.51.4-1.85.21-1.02.37-2.7.98-7.39.13-1.17.1-4.93v-10.13s-.01-2.53-.01-2.53l-.18-3.36-.49-5.09-.54-4.52-.49-3.58-.33-2.14-.36-2.09-.33-1.81-.49-2.56-.49-2.56-.45-2.07-.61-2.45-.4-1.53-.55-2.01-.31-1.15-.32-1.15-.37-1.24-.46-1.54-.59-1.98-.35-1.11-.5-1.54-.5-1.53-.5-1.49-.54-1.53-.38-1.06-.54-1.51-.54-1.49-.56-1.51-.56-1.47-.42-1.03-.61-1.46-.9-2.13-.61-1.41-.92-2.12-.45-1.02-.63-1.42-.94-2.11-.46-1.01-.48-1.03-.66-1.41-1.13-2.38-.83-1.75-.48-.99-.51-1.02-.5-1.01-.51-1.01-.5-1.01-.5-1.01-.51-1.01-.51-1.01-.5-1.01-.51-1.01-.5-1.01-.51-1.01-.51-1.01-.51-1.01-.51-1.01-.51-1-.52-1-.82-1.59-1.24-2.4-.83-1.62-.52-1.01-.51-1.01-.7-1.38-.51-1.01-.51-1.02-.65-1.32-.5-1.01-.49-1.01-.65-1.35-.49-1.02-.49-1.02-.52-1.09-.48-1.02-.48-1.03-.5-1.05-.44-.99-.78-1.84-.44-1.04-.63-1.48-.4-1-.57-1.51-.71-1.88-.38-1.04-.54-1.53-.55-1.56-.46-1.5-1.02-4.5-.54-2.55-.48-2.99-.54-5.08-.22-2.71v-4.95s.21-2.74.21-2.74l.51-6.09.54-3.98.49-3.07.38-2.36.2-1.01.49-2.16.46-2.04.4-1.74.29-1.14.42-1.56.43-1.63.33-1.22.65-2.32.56-2,.54-1.92.45-1.61.35-1.23.33-1.17.44-1.54.43-1.52.46-1.62.54-1.92.45-1.62.56-2,.54-1.93.45-1.62.52-1.93.42-1.63.34-1.33.4-1.57.27-1.12.52-2.56.52-2.52.52-2.53.49-2.55.5-3.5.51-5.1.23-3.37.03-2.5-.03-4.08-.13-5.51-.11-1.09-.53-4.35-.48-3.54-.47-2.51-.56-2.55-.47-2.01-.51-2.02-.35-1.16-.55-1.5-.53-1.44-.68-1.83-.72-1.78-.45-1.06-.63-1.48-.44-.98-.51-1.08-.48-.98-.52-1.02-.53-1.04-.5-.93-.94-1.64-.55-.91-1.01-1.58-.79-1.19-1.26-1.82-1.46-2.01-2.02-2.56-3.09-3.48-6.56-6.13-1.98-1.47-1.81-1.26-1.5-1.04-1.23-.79-1.28-.78-.93-.51-1.01-.54-1.39-.74-.95-.5-2.72-1.34-1.36-.6-1.05-.42-1.51-.58-1.51-.58-1-.37-1.57-.53-1.49-.49-1.57-.51-1.43-.42-1.71-.42-2.03-.5-2.49-.52-2.19-.4-1.17-.49c-.2-.09.76-.31.97-.26l1.18.25,1.31.11,2.07.1,4.17.31,4.23.44,1.51.16,1.22-.27,1.63.16,7.98.76,6.63.77,1.75.42,1.48.44.91.27-.55-.8,1.38.22,3.18.5,3.04.48,3.54.56,2.5.46,2.56.55,1.99.49,2,.54,1.08.41,1.86.75c.3.12,1.13.34,1.42.31l1.05-.1-.21.17-.73.63c.86-.17,1.1-.21,1.06-.21-.02,0,.18-.25.27-.37l1.72.48,1.59.44,1.06.4,1.48.61,1.06.44,1.44.6,1.44.61.63.28,1.05.54,1.01.52,1,.51,1.03.53.93.51,1.62.93,1.38.8,1.41.93,1.82,1.3,1.74,1.3,2.52,2.03,4.41,4.11,3.17,3.42,2.48,3.02,2.39,3.26,1.16,1.77.99,1.59.76,1.26,1.12,1.95.5.94.71,1.39.46.95.66,1.46.96,2.12.58,1.35.55,1.54.4,1.11.55,1.53.35,1,.49,1.59.33,1.1.45,1.74.43,1.66.55,2.35.5,2.58.42,2.18.19,1.16.67,7.43v5.98s-.7,7.81-.7,7.81l-.51,3.49-.55,3.04-1.03,5.56-.43,2.02-.58,2.52-.47,2.06-.32,1.29-.62,2.41-.3,1.16-.41,1.56-.34,1.3-.31,1.18-.41,1.54-.41,1.54-.44,1.64-.54,2-.54,1.99-.43,1.56-.46,1.69-.33,1.18-.41,1.54-.41,1.55-.34,1.31-.3,1.19-.38,1.54-.32,1.32-.29,1.19-.36,1.5-.46,2.17-.53,2.53-.5,2.54-.76,8.9v5.15s.22,4.96.22,4.96l.75,5.08.29,1.37.4,1.68.26,1.09.33,1.28.5,1.66.45,1.5.49,1.59.49,1.41.57,1.49.82,2.17.58,1.44.62,1.46.9,2.13.61,1.4.95,2.12.46,1,.48,1.03.65,1.39.79,1.69.51,1.08.47,1,.49,1.02.49,1.02.49,1.02.49,1.02.65,1.36.66,1.4.62,1.33.84,1.8.48.98.51,1.03.63,1.28.87,1.78.32.65.5,1.02.5,1.01.5,1.01.5,1.01.67,1.37.67,1.37.49,1.02.49,1.02.49,1.03.49,1.03,1.12,2.38.82,1.75.46,1.01.64,1.42.64,1.43.46,1.03.47,1.05.45,1.03.74,1.78.43,1.04.77,1.83.58,1.41.83,2.17.57,1.5.56,1.47.72,1.88.39,1.05.53,1.52.39,1.11.52,1.51.65,1.89.54,1.55.34,1.09.45,1.57.3,1.06.38,1.33.43,1.54.45,1.6.44,1.56.29,1.12.41,1.74.49,2.02.39,1.66.24,1.07.34,1.84.4,2.17.19,1.16.92,5.87.16,1.06.37,3.35.58,6.08.21,2.65v10.65s-.21,2.66-.21,2.66l-.57,6.09-.49,4.02-.3,1.87-.27,1.53-.49,2.64-.49,2.54-.44,2.18-.3,1.17-.44,1.57-.42,1.53-.45,1.62-.44,1.53-.58,1.92-.49,1.6-.48,1.55-.5,1.43-.59,1.49-.59,1.44-.9,2.14-.63,1.5-.45.94-.7,1.39-.5,1-.68,1.33-.51.99-.52,1.01-.71,1.31-1.28,2.28-.77,1.23-1.46,2.13-1.03,1.44-1.57,2.06-2.01,2.5-3.31,3.74-3.54,3.55-6.73,5.89-1.74,1.31-1.16.82-3.69,2.47-1.19.73-1.3.76-1.27.74-1.27.73-.96.51-1.06.51-1.4.68-.98.46-1.41.62-1.76.77-1.04.45-1.46.64-1.04.45-1.03.45-1.45.63-2.45,1.08-1.04.44-2.13.89-1.03.43-1.48.61-1.44.59-1.78.73-1.03.42-1.83.75-1.04.42-1.1.45-1.41.59-1.46.61-1.05.44-1.83.77-1.05.44-1.05.43-2.16.87-1.12.45-1.01.43-.76.33-1.24.24ZM138.78,826.82l3.15.5,6.27.98,1.2.19,2.67.42,1.35.21c.22.03-.74.54-.95.61l-1.57.56c-1.93.69-5.35.45-7.73.03-3.63-.63-5.56-3.69-4.39-3.51ZM1.28,692.57l.15-6,.7-8.31.24-1.82.32-2.18.28-1.91.25-1.49.49-2.64.51-2.77.31-1.6.24-1.06.92-3.68.51-2.04.35-1.28.32-1.1.34-1.15.56-1.91.48-1.65.25-.77.39-1.1.4-1.12.39-1.05.73-1.88.57-1.47.59-1.52.4-.98.46-1.06.44-1.04.64-1.5.28-.61.5-1.04.66-1.37.84-1.74.65-1.34.7-1.4.82-1.61.52-1.01.34-.65.52-1.01.52-1,.52-1,.53-1.02.52-.96.54-.97.36-.65.54-.99.54-.98.54-.99.74-1.32.91-1.59.74-1.28.73-1.27.56-.99.36-.63.55-.96.38-.67.54-.95.74-1.31,1.46-2.58.36-.63.55-.98.54-.95.36-.64.55-.98.74-1.32,1.27-2.26.7-1.3.53-1.01.71-1.34.52-.99.53-1.01.32-.64.81-1.69.67-1.4.5-1.04.44-.97.78-1.86.45-1.07.25-.62.56-1.54.55-1.51.5-1.46.51-1.57.24-.75.33-1.22.65-2.41.3-1.16.34-1.51.45-2.67.48-3.58c.5-3.71.42-7.56.03-11.26l-.35-3.26-.16-1.13-.54-3.23-.45-2.53-.51-2.52-.72-3.22-.3-1.32-.26-1.16-.28-1.2-.51-2.19-.47-2.02-.48-2.03-.27-1.13-.28-1.21-.51-2.18-.48-2.03-.39-1.65-.24-1.06-.41-1.82-.46-2.05-.56-2.5-.37-1.66-.24-1.08-.3-1.4-.58-2.94-.43-2.14-.31-1.55-.27-1.39-.5-2.99-1.04-8.11-.29-3.69c-.68-8.71.09-17.24,2.12-25.71l.38-1.59.29-1.12.59-2.03.57-1.96.35-1.09.67-1.9.54-1.54.55-1.43.89-2.15.61-1.48.45-.97.51-1.05.51-1.05.48-.91.77-1.36.73-1.29.56-1,.35-.56.84-1.27.59-.87,1.73-2.38,1.08-1.42,4.74-5.37,3.39-3.17,3.02-2.52,1.73-1.34.88-.59,3.46-2.18.93-.56,1-.59.56-.29,1.05-.51,1.39-.69,1.06-.52,1-.4,1.49-.55,1.49-.55,1.13-.42.62-.23,1.28-.41,1.1-.33,2.37-.67,1.15-.32,1.08-.3,1.47-.33,2.08-.47,1.02-.21,2.33-.44,1.68-.31,1.19-.22,1.86-.35,1.06-.2c.22-.04.79.31.76.53l-.13.9-.31,6.4-.05,1.04-.33,7.09-.14,3.04-.04.97-.13,2.72-.47,9.45-.06,1.18-1.17,23.56-.47,9.68-.1,4.88c-.02.91,2.65.6,2.65,1.09l-.02,2.13-.06,5.86-.42,1.81-.13,8.85-.18,1.3-.15,1.37c-.03.24-.25,1-.4,1.19l-.88,1.12-1.11,1.42-.8,1.19-.78,1.27-.51.95-.51,1.05-.5,1.01-.67,1.37-.53,1.06-.42.93-.62,1.53-.38.97-.58,1.64-.42,1.39-.34,1.39-.36,1.16-.21.68-.2.87-.27,1.17-.31,1.36-.25,1.17-.24,2.8c0,.1-.28.49-.43.71v12.01s.18,2.3.18,2.3l.5,3.2.32,2.07.24,1.15.35,1.33.54,2.07.42,1.45.5,1.6.48,1.39.61,1.52.86,2.15.43,1.07.44,1.02.7,1.43.32.64.52,1.02.51,1,.37.73c.05.1.02.56.01.77l-.15,5.5-.16,5.72-.4,1.48v8.7c0,.09-.33.73-.47,1l-.1,10.45-.44,1.51v3.89s-.02,5.95-.02,5.95c-.09.15-.46.82-.46.91l-.09,9.05-.41,1.33v1.12s-.09,8.14-.09,8.14l-.45,1.37v2.58s0,6.31,0,6.31c0,.09-.38.68-.49.84l-.04,10.29c-.16.21-.47.63-.47.73l-.03,2.98-.03,3.03c0,.18-.74.58-.94.55l-2.31-.33-1.24-.18-1.54-.22-1.16-.16-1.35-.15-1-.1-.86-.09-.7-.27-2.41-.2-1.18-.33-3.1-.39c-2.48-.31-4.43.78-4.42,2.3v2.16s.04,5.82.04,5.82c0,.09-.33.64-.51.93v10.13c-.01.31-.36,1.23-.47,1.39l-.07,12.32c-.18.18-.57.58-.55.66l.28,1.37.17.65.24.95,1.42.46.92.26,2.59.59.99.19,2.67.4,1.93.29,1.12.18,1.87.35,1.58.3c.26.05.89.29.9.5l.06,1.13c0,.17.49.75.66.78l.89.17.96.18.7.13,1.83.35c.21.04.65.12.72.16l.97.56.96.55,1.34.77c.07.04.67.22.76.24l2.48.44,1.95.34,1.44.23,2.57.34,1.5.19,2.58.31,1.41.23,1.82.37c2.49.5,4.29-.51,5.34-.34l2.1.36,2.63.46,2.97.51c1.61.28,1.7,1.8,2.37,1.87l2.37.26,1.17-.31,1.2-.34c.29-.08,1.2-.04,1.52.02l2.18.42,1.19.23,2.13.41,2.61.5c.35.07,1.27.26,1.51.52l1.46,1.55c.41.43,2.42.55,2.8.21l.67-.6c.15-.13.85-.22,1.09-.18l2.28.43,1.15.22c.33.06,1.32-.08,1.64-.18l1.53-.51,1.22-.41c.4-.13,1.48-.15,1.89-.07l1.29.25,1.28.24,5.88,1.09,1.88.29,1.17.18,1.37.2,1.01.15,1.03.22,1.52.28,1.5.27,2.21.39,2.65.48c1.77.32,3.66-.75,3.68-1.68l.05-2.1.04-5.42c.09-.14.47-.81.47-.9v-9.19s.44-1.57.44-1.57l.09-10.97c.14-.28.45-.91.45-1l.09-7.31c0-.72-.72-1.31-1.61-1.49l-2.16-.44-3.01-.5-3.14-.52-1.27-.15-1.5-.14-1.03-.26-2-.16-.74-.28-2.65-.38-1.21-.17-1.45-.21-.72-.25-1.82-.28-4.4-.67-.73-.1-1.98-.26-1.05-.29-2.81-.21-.7-.28-1.93-.28-1.64-.23c-.31-.04-1.45-.43-1.45-.75l.12-7.77.04-1.62.12-2.04.05-1.09.35-15.15.05-1.97.27-10.14.1-7.57.06-2.5.13-2.71.42-16.02.04-1.51.04-1.68.26-9.97c0-.33,0-1.12.2-1.25l1.23-.76,1.27-.78,1.3-.8.85-.57,1.44-1.06,2.51-2.1,2.79-2.72,3.54-4.05,1.03-1.45,1.05-1.6.91-1.47.92-1.69.69-1.34.85-1.71.61-1.32.91-2.2.54-1.4.57-1.57.35-1.04.56-2,.49-1.95.49-2.18.44-2.48.51-4.13.19-3.28-.06-6.18-.14-1.78-.28-2.72-.1-.97-.33-.72-.26-2.65-.21-.67-.34-1.39-.4-1.65-.4-1.62-.34-1.09-.4-1.07-.57-1.5-.7-1.84-.59-1.53-.59-1.31-.52-1.05-.68-1.37-.67-1.24-.97-1.63-.77-1.26-1.03-1.61-1.25-1.66-2.07-2.4c-.19-.22-1.22-.66-1.5-.73l-2.37-.59-1.07-.41-.96-.58-1.12-.87-2.57-2c-.06-.05-.57-.57-.57-.63l.1-4.46.21-9.14c0-.13.36-.74.46-.73l2.96.13,5.47.23,3.59.12c.7.02,2.44-.85,2.46-1.52l.06-2.61.09-2.56.13-2.69.17-10.47.03-2.51.09-8.64.24-2.71.13-9.4.21-15.61.3-9.23.09-7.37c0-.25.93-.38,1.2-.33l3.41.55,2.77.46,1.17.23.96.2.66.14,2.07.49,2.43.57,1.24.32,1.21.37,1.06.32,1.61.48,1.53.48,1.48.5,1.57.55,1,.4,1.48.61,1.1.45.98.44,1.85.89.9.46,1.01.53,1.01.52.65.33.62.33,1.02.58.99.57.58.36,1.24.8.93.6.91.58.84.62,1.74,1.37,2.76,2.3,5.51,5.54,2.55,3.05,1.31,1.71,1.1,1.49.58.83,1.03,1.55.81,1.22.55.92.56.99.91,1.6.57,1.01.49.95.51,1.03.5,1,.5,1.02.68,1.39.45,1,.58,1.46.74,1.89.38,1.01.51,1.58.35,1.1.48,1.55.37,1.17.22.82.26,1.04.34,1.46.37,1.58.25,1.15.39,2.71.46,3.2.14,1.14.48,6.26.21,2.75.02,4.01-1.59,15.49-.25,1.15-.48,2.14-.93,4.24-.27,1.21-.26,1.14-.59,2.42-.32,1.33-.29,1.16-.4,1.56-.43,1.61-.57,2.02-.54,1.92-.46,1.62-.55,1.92-.46,1.61-.44,1.55-.57,1.99-.45,1.55-.37,1.3-.31,1.07-.44,1.53-.46,1.6-.46,1.57-.53,1.97-.43,1.73-.28,1.19-.36,1.55-.48,2.03-.5,2.12-.44,2.02-.95,4.88-.18,1.01-.4,3.22-.51,4.57-.18,2.85-.04,3.03v5.1s.24,4.86.24,4.86l.32,2.7.18,1.19.53,3.22.41,2.07,1.01,4.01.33,1.11.48,1.58.36,1.11.68,1.93.53,1.45.59,1.55.41.99.63,1.44.92,2.11.61,1.41.63,1.46.45.99.5,1.04.49,1.03.31.65.66,1.4.67,1.39.83,1.66.67,1.34.49.97.68,1.34.51,1.01.7,1.38.51,1,.84,1.67.5,1,.69,1.37.84,1.67.69,1.37.66,1.31.51,1,.51,1,.69,1.35.52,1.01.33.65.51,1.01.68,1.36.5,1.01.68,1.36.5,1.01.5,1.02.32.65.67,1.38.5,1.03.65,1.33.49,1.01.5,1.02.48,1,.63,1.36.68,1.46.48,1.02.48,1.03.45.99.64,1.49.44,1.03.61,1.43.9,2.13.42,1.02.59,1.49.42,1.06.58,1.47.74,1.86.39,1.03.54,1.54.39,1.11.54,1.53.5,1.49.5,1.53.49,1.51.63,1.92.48,1.53.46,1.58.56,1.94.55,1.99.42,1.63.4,1.57.28,1.14.39,1.74.56,2.52.42,2.03.5,2.65.21,1.1.39,2.28.95,7.12.48,3.69.13,1.15.27,3.4.38,5.57.03,10.07-.2,2.67-.57,5.58-.49,4.02-.39,2.89-.18,1.01-.43,2.18-.51,2.55-.29,1.28-.4,1.59-.4,1.52-.44,1.64-.54,2.01-.34,1.22-.34,1.19-.45,1.57-.46,1.45-.54,1.55-.53,1.46-.41,1.07-.58,1.51-.57,1.45-.87,2.19-.44.99-.49,1.05-.48,1.03-.48,1.02-.84,1.8-.63,1.35-.49,1.04-.5.95-.55.94-.56.97-.77,1.3-.95,1.59-.94,1.49-1.63,2.5-.58.86-.89,1.19-1.53,2.01-2.51,3.05-7.55,7.55-2.51,2.02-2.61,2-1.43,1-1.57,1.03-1.23.8-1.25.76-2.21,1.32-.95.51-1.4.69-1.04.51-.98.46-1.44.64-2.12.94-1.39.58-1.82.66-1.86.68-1.54.56-1.08.35-1.23.34-2.05.54-1.99.48-2.9.63-2.63.43-3.59.44-3.71.46-1.29.12-3.27.18-1.95.05h-9.66s-1.92-.07-1.92-.07l-2.24-.19-6.07-.51-5.56-.51-3.32-.38-1.08-.15-3.18-.47-1.34-.2-2.17-.33-1.38-.21-1.68-.25-1.88-.29-1.6-.27-2.57-.49-2.54-.49-2.52-.5-2.52-.52-2.22-.45-1.15-.26-1.56-.38-1.66-.41-1.7-.42-1.17-.29-1.54-.39-1.32-.33-1.18-.3-1.55-.39-1.32-.34-1.18-.31-1.54-.41-1.59-.44-1.56-.45-1.22-.36-1.17-.34-1.53-.45-1.52-.45-1.62-.48-1.48-.47-1.53-.53-1.51-.52-1.09-.38-1.87-.66-1.51-.53-1.52-.54-1.52-.54-1.47-.54-1.86-.7-1.15-.43-1.01-.39-2.15-.85-1.47-.58-1.07-.44-1.42-.63-1.02-.47-1.75-.8-1.38-.63-1.41-.65-1.01-.47-1.04-.49-1-.49-1.37-.7-1-.51-1-.51-1.34-.68-1.3-.68-2.6-1.53-1.53-.93-1.24-.78-2.78-1.81-1.51-1-1.53-1.03-1.73-1.23-2.03-1.54-.81-.64-1.97-1.65-3.58-2.99-.83-.72-6.06-5.98-3.15-3.43-3.02-3.55-4.44-5.7-.61-.88-3.04-4.57-.78-1.25-.77-1.28-.54-.94-.73-1.31-.7-1.28-.71-1.34-1.21-2.34-.66-1.33-.68-1.39-.84-1.72-.43-.96-.63-1.49-.46-1.07-.56-1.41-.71-1.91-.39-1.06-.55-1.52-.51-1.48-.5-1.53-.5-1.52-.51-1.56-.45-1.53-.52-1.97-.54-2.03-.49-1.98-.49-2.16-.32-1.52-.26-1.35-.54-3.04-.44-2.56-.53-3.99-.49-5.08-.26-2.73-.06-1.43-.07-6.62Z"/>
        <path class="st4" d="M110.46,702.43l1.06.02-1.06-.02Z"/>
        <path class="st4" d="M121.09,680.46l.14.48,2.35.07h.53s-.37-.54-.5-.54h-2.52Z"/>
        <path class="st4" d="M118.09,679.68l.15.76h2.85c.06-.32-.75-.44-.97-.44l-2.03-.32Z"/>
        <path class="st4" d="M111.17,678.98c.34-.13.58.48.73.48l1.62.03,1.23.32,3.34-.13-1.04-.17-1.83-.29-1.19-.23-1.96-.14-.9.12Z"/>
        <circle class="st4" cx="162.25" cy="406.68" r="1.17"/>
        <rect class="st4" x="161.53" y="629.42" width=".51" height="6.57"/>
        <rect class="st4" x="162.04" y="613.25" width=".51" height="4.8"/>
        <polygon class="st4" points="80.94 631.95 81.61 633.12 81.61 630.78 80.94 631.95"/>
        <polygon class="st4" points="81.44 605.16 82.12 606.33 82.12 603.99 81.44 605.16"/>
        <path class="st4" d="M81.6,608.53l.66-.04c-.22-.82-.39-1.45-.34-1.24.03.12-.11.51-.33,1.28Z"/>
        <path class="st4" d="M130.86,356.74c-.18,0-1.14-.72-1.13-.9l.07-1.68c.01-.28,1.58-1.69,2.02-1.25l1.48,1.5c.15.15-.34,1.06-.37,1.28l-.11.9c.28-.23.96-.78.94-1.04l-.17-1.91c-.04-.5-1.16-1.45-2.93-1.15-.44.07-1.44,1.01-1.44,1.46v2.41c0,.09.55.49.63.53l.97.47c.11.06.86.26.96.18l1.06-.88-.99.06h-1Z"/>
        <path class="st4" d="M128.22,407.92l-.1-2.5,1.22-1.38h1.72s1.22,1.38,1.22,1.38l-.1,2.5-.61.64h-2.73s-.61-.64-.61-.64ZM130.8,408.13l.91-.71-.02-1.72-1.52-1.4-1.59,1.61.16,1.5.59.6,1.47.11Z"/>
        <path class="st4" d="M126.06,435.95l.2-1.41.53-1.01.51-.72,2.19.11,1.19.56.03,3.29-1.03.62-1.05.65-1.18-.49-1.39-1.59ZM127.75,436.88l1.81-.02.71-.9-.12-1.46-1.4-1.32-1.31.42-.36,1.08-.38.4.61.84.44.95Z"/>
        <g>
          <path class="st4" d="M96.78,692.77l-.08-1.69.08-1.7,2.51-1.87,1.65.48,1.71,1.47.41,3.26-2.06,1.96-1.13.45-1.16-.46-1.93-1.89ZM99.88,694.14l1.12-.53.98-.85-.07-2.36-1.36-1.52c-.2-.23-1.19-.23-1.5-.24l-1.3,1.33-.13,1.4.24,1.42.89.81,1.14.53Z"/>
          <path class="st4" d="M131.47,699.07c-.76-2.6.34-5.05,1.82-5.35l1.94-.39,2.44,2.27-.08,3.97-1.43,1.47h-3.4s-1.29-1.96-1.29-1.96ZM136.63,699.01l.02-2.83-1.95-1.68c-.4-.34-1.77.55-2.27.93l-.06,3.31,2.07,1.85,2.19-1.58Z"/>
        </g>
      </g>
    </g>
  </g>
  <g id="ukulele-image-right">
    <g id="leather1" data-name="leather">
      <path class="st0" d="M223.17,561.13c0,.19-.45.78-.56.95l-.99,1.55-.85,1.33-.97,1.39-5.82,6.37-2.68,2.29-1.74,1.36-1.34.78v-.14c-.19.47-.6.84-1.25.87-.2.2-.46.4-.56.46l-.93.52-1.36.76-1.32.65-1.7.75-1.11.39-1.58.47-1.4.35-1.96.46-1.44.25h-1.36s0-.09,0-.09c-.24.26-.59.43-1.05.43-.12,0-.23-.01-.33-.03v.07s-7.03-.46-7.03-.46l-2.48-.51-1.37-.39-1.09-.27-1.51-.58-1.02-.3c-.12.03-.24.05-.37.05-.73,0-1.18-.42-1.36-.95-.18-.08-.34-.19-.46-.32-.18-.06-.34-.15-.47-.27v.03c-.09,0-.3,0-.41,0l-1-.62-1.29-.79-.92-.58-1.72-1.26-2.64-2.24-3.66-3.63-1.8-2.19-1.58-2.08-.97-1.39-.99-1.61-.96-1.56-.75-1.35-1.27-2.69-.59-1.41-.57-1.55-.69-1.88-.38-1.08-.54-1.97-.75-2.73-.31-1.32-.49-2.98-.55-4.59-.22-2.69.02-4.97.21-2.75.15-1.89.12-1.54c.02-.22.2-.88.28-1.12l.34-2.68.36-1.2.33-1.12.35-1.24.67-2.34.46-1.45.58-1.57.55-1.41.6-1.51.44-.96.52-1.05.5-1.01.69-1.39.52-.95,1.37-2.23.96-1.44,1.36-1.86,2.3-2.51c.16-.17,1.07-.34,1.3-.4l1.63-.38,1.06-.33c.17-.05.88-.46,1.05-.59l3.07-2.41.97-.77v.07c.07-.04.14-.07.21-.09.18-.37.51-.66.99-.75.15-.08.33-.14.53-.16.24-.31.76-.7.95-.8l.95-.49,1.01-.52,1.01-.51,1.01-.45,1.9-.75,1.38-.48,1.62-.46,1.22-.3,2.74-.56c.06-.01.16.04.25.12.04-.02.1-.04.14-.06,0,0,.01,0,.02,0,0,0,.02,0,.02,0,0,0,0,0,0,0,.06,0,.34-.05.4-.05,0,0,0,0,.01,0,.02,0,.03,0,.05,0,0,0,.01,0,.02,0,.06,0,.17.02.27.04.19-.09.41-.15.67-.15.17,0,.31.03.45.07l2.79-.15,2.68.29,3.05.49,2.39.66,1.48.58,1.14.4.55.49c.08-.01.16-.02.25-.02.52,0,.9.22,1.14.54l1.48.56,1.26.78.92.57,2.37,1.69,1.5,1.01,1.02.55,1.95.68,1.09.24,1.69.35,1.56,1.11c.39.09.68.31.86.61.32.2.52.52.61.87l.84,1.19.81,1.18,1,1.5.54.95.69,1.38.51,1.01.51,1.01.54,1.06.42.92.63,1.56.54,1.39.87,2.68.36,1.14.38,1.24.32,1.15.28,1.17.37,2.17.3.73.05,1.98.46,1.43v11.11s-.26,2.75-.26,2.75l-.56,3.58-.35,2.2-.34,1.36-.5,1.84-.42,1.53-.45,1.65-.5,1.48-.58,1.44-.59,1.47-.42,1.05-.6,1.5-.45.98-.51,1.05-.64,1.3h-.02c-.06.24-.17.48-.34.67-.08.46-.33.88-.77,1.08v.17Z"/>
    </g>
    <g id="kokuin1" data-name="kokuin">
      <path d="M202.13,577.77l-.54.21-1.09-1.34-1.64.62.08,1.72-.53.2-.23-5.31.59-.23,3.35,4.13ZM200.23,576.27l-1-1.22c-.22-.28-.41-.55-.58-.81h-.02c.05.32.07.65.1.98l.07,1.6,1.43-.54Z"/>
      <path d="M206.23,575.81l-.54.22-1.12-1.31-1.63.67.13,1.72-.52.21-.37-5.31.59-.24,3.46,4.04ZM204.3,574.36l-1.03-1.2c-.23-.28-.43-.54-.6-.79h-.02c.05.32.09.64.12.97l.11,1.6,1.42-.58Z"/>
      <path d="M210.05,573.26l-.52.26-1.23-1.21-1.56.8.27,1.7-.5.26-.8-5.26.57-.29,3.78,3.74ZM208,571.97l-1.12-1.11c-.25-.26-.47-.5-.67-.74h-.02c.08.31.14.64.2.96l.24,1.58,1.36-.69Z"/>
      <path d="M213.78,569.53l-.42.4-1.52-.82-1.28,1.2.74,1.56-.41.39-2.25-4.82.46-.44,4.68,2.53ZM211.46,568.87l-1.39-.75c-.31-.18-.59-.35-.85-.52h-.01c.16.28.31.58.46.87l.67,1.45,1.11-1.05Z"/>
      <path d="M216.84,566.1l-.39.43-1.58-.7-1.18,1.3.85,1.5-.38.42-2.61-4.64.43-.47,4.86,2.17ZM214.47,565.61l-1.44-.64c-.33-.15-.62-.31-.88-.46h-.01c.18.27.35.55.53.84l.78,1.4,1.03-1.13Z"/>
      <path d="M219.7,562.48l-.36.46-1.63-.57-1.07,1.39.97,1.42-.34.45-2.98-4.4.39-.5,5.02,1.76ZM217.3,562.2l-1.49-.52c-.34-.13-.64-.25-.92-.38v.02c.19.24.38.51.58.77l.89,1.32.93-1.21Z"/>
      <path d="M222.17,558.71l-.34.47-1.65-.51-1.02,1.43,1.02,1.38-.33.46-3.13-4.3.37-.52,5.08,1.58ZM219.76,558.51l-1.51-.47c-.34-.12-.65-.23-.93-.35v.02c.2.23.4.49.61.75l.94,1.29.89-1.24Z"/>
      <path d="M224.21,554.48l-.28.51-1.7-.31-.85,1.54,1.18,1.25-.27.49-3.63-3.89.31-.56,5.23.97ZM221.79,554.57l-1.55-.29c-.35-.07-.67-.15-.97-.24v.02c.23.2.46.44.7.67l1.09,1.17.74-1.34Z"/>
      <path d="M225.82,550.04l-.21.54-1.72-.09-.64,1.63,1.33,1.09-.21.52-4.09-3.4.23-.59,5.31.29ZM223.44,550.44l-1.58-.09c-.36-.03-.69-.06-.99-.11v.02c.25.17.51.38.78.58l1.23,1.02.56-1.42Z"/>
      <path d="M227.26,545.69l-.18.56-1.73.02-.53,1.67,1.4,1-.17.54-4.31-3.13.19-.61,5.32-.06ZM224.91,546.24l-1.58.02c-.36,0-.69-.02-.99-.05v.02c.26.16.54.34.81.53l1.29.94.46-1.46Z"/>
      <path d="M228.3,541.22l-.13.57-1.71.17-.39,1.71,1.48.88-.12.55-4.55-2.74.14-.62,5.29-.51ZM226.01,541.97l-1.57.15c-.36.03-.69.04-.99.04v.02c.28.13.57.29.86.45l1.37.83.34-1.49Z"/>
      <path d="M228.98,536.71l-.09.58-1.7.3-.26,1.73,1.54.76-.08.56-4.74-2.39.09-.63,5.23-.91ZM226.75,537.63l-1.55.27c-.36.05-.68.09-.99.11v.02c.29.11.59.25.89.39l1.42.72.23-1.51Z"/>
    </g>
    <g id="ukulele-image1" data-name="ukulele-image">
      <path class="st4" d="M148.59,375.84c-.03.12-.41.22-.55.25l.37-1.53.42-1.72.24-1.12.13-1.08c.01-.08.23-.35.4-.56l-.02,2.1-.34,1.02-.33,1.34-.32,1.3Z"/>
      <path class="st4" d="M147.86,377.24q0,.61,0,0c0-.61,0-.61,0,0Z"/>
      <rect class="st4" x="280.02" y="600.11" width=".51" height="13.64"/>
      <rect class="st4" x="215.83" y="749.7" width=".51" height="12.89"/>
      <rect class="st4" x="215.33" y="731.5" width=".51" height="11.88"/>
      <rect class="st4" x="312.86" y="682.99" width=".51" height="11.62"/>
      <rect class="st4" x="264.35" y="595.56" width=".51" height="10.87"/>
      <rect class="st4" x="252.73" y="420.2" width=".51" height="10.61"/>
      <rect class="st4" x="264.85" y="612.24" width=".51" height="9.6"/>
      <rect class="st4" x="296.69" y="638.52" width=".51" height="9.6"/>
      <rect class="st4" x="120.32" y="631.95" width=".51" height="8.84"/>
      <rect class="st4" x="142.56" y="567.76" width=".51" height="8.84"/>
      <rect class="st4" x="263.84" y="579.39" width=".51" height="8.84"/>
      <rect class="st4" x="62.2" y="713.31" width=".51" height="8.84"/>
      <rect class="st4" x="232.01" y="737.57" width=".51" height="8.59"/>
      <rect class="st4" x="289.11" y="653.68" width=".51" height="7.83"/>
      <rect class="st4" x="104.15" y="486.4" width=".51" height="7.83"/>
      <rect class="st4" x="62.71" y="727.46" width=".51" height="7.83"/>
      <rect class="st4" x="263.34" y="563.22" width=".51" height="7.83"/>
      <rect class="st4" x="239.59" y="708.76" width=".51" height="7.58"/>
      <rect class="st4" x="143.06" y="581.92" width=".51" height="7.58"/>
      <rect class="st4" x="61.7" y="700.17" width=".51" height="7.58"/>
      <rect class="st4" x="245.65" y="497.01" width=".51" height="6.82"/>
      <rect class="st4" x="240.09" y="724.43" width=".51" height="6.82"/>
      <rect class="st4" x="114.26" y="453.05" width=".51" height="6.82"/>
      <rect class="st4" x="152.66" y="785.58" width=".51" height="6.57"/>
      <rect class="st4" x="265.36" y="629.42" width=".51" height="6.57"/>
      <rect class="st4" x="143.57" y="595.56" width=".51" height="5.81"/>
      <rect class="st4" x="121.33" y="669.34" width=".51" height="5.81"/>
      <rect class="st4" x="249.69" y="750.71" width=".51" height="5.81"/>
      <rect class="st4" x="232.51" y="753.23" width=".51" height="5.81"/>
      <rect class="st4" x="188.54" y="731" width=".51" height="5.81"/>
      <rect class="st4" x="130.43" y="656.2" width=".51" height="5.81"/>
      <rect class="st4" x="189.05" y="748.69" width=".51" height="5.81"/>
      <rect class="st4" x="118.8" y="583.94" width=".51" height="5.81"/>
      <rect class="st4" x="288.61" y="640.54" width=".51" height="5.81"/>
      <rect class="st4" x="142.05" y="553.61" width=".51" height="5.81"/>
      <rect class="st4" x="73.83" y="727.46" width=".51" height="5.81"/>
      <rect class="st4" x="119.81" y="613.25" width=".51" height="5.56"/>
      <rect class="st4" x="132.45" y="712.81" width=".51" height="5.56"/>
      <rect class="st4" x="153.17" y="802.25" width=".51" height="5.56"/>
      <rect class="st4" x="131.44" y="685.01" width=".51" height="5.56"/>
      <rect class="st4" x="144.07" y="608.19" width=".51" height="5.56"/>
      <rect class="st4" x="246.16" y="513.19" width=".51" height="5.56"/>
      <rect class="st4" x="118.3" y="571.3" width=".51" height="4.8"/>
      <rect class="st4" x="120.82" y="652.67" width=".51" height="4.8"/>
      <rect class="st4" x="103.14" y="462.65" width=".51" height="4.8"/>
      <rect class="st4" x="156.71" y="600.61" width=".51" height="4.8"/>
      <rect class="st4" x="246.66" y="531.38" width=".51" height="4.55"/>
      <rect class="st4" x="103.64" y="475.28" width=".51" height="4.55"/>
      <rect class="st4" x="114.26" y="738.58" width=".51" height="4.55"/>
      <rect class="st4" x="104.65" y="502.07" width=".51" height="4.55"/>
      <path class="st4" d="M127.94,529.13h-.63s.22-3.93.22-3.93c.08.16.35.93.36,1.17l.05,2.76Z"/>
      <polygon class="st4" points="282.63 736.16 282.15 737.18 281.95 733.92 282.42 732.9 282.63 736.16"/>
      <polygon class="st4" points="113.71 435.99 113.19 435.03 113.19 432.65 113.71 431.7 113.71 435.99"/>
      <path class="st4" d="M215.37,722.18h-.63s.22-3.93.22-3.93c.08.16.35.92.36,1.16l.06,2.77Z"/>
      <polygon class="st4" points="251.21 785.27 250.68 785.61 250.78 781.42 251.27 782.4 251.21 785.27"/>
      <polygon class="st4" points="283.14 754.35 282.66 755.38 282.45 752.11 282.93 751.09 283.14 754.35"/>
      <polygon class="st4" points="114.35 445.58 113.87 446.6 113.66 443.34 114.14 442.31 114.35 445.58"/>
      <path class="st4" d="M258.27,713.78c0,.23-.28,1.01-.36,1.16l-.22-3.93h.63s-.05,2.77-.05,2.77Z"/>
      <polygon class="st4" points="111.25 657.75 110.72 657.42 110.66 654.54 111.15 653.56 111.25 657.75"/>
      <polygon class="st4" points="119.91 598.7 119.44 599.73 119.21 596.97 119.68 595.94 119.91 598.7"/>
      <path class="st4" d="M216.83,776.44c0,.1-.32.5-.43.64l-.11-3.42.58.04-.04,2.75Z"/>
      <polygon class="st4" points="73.39 707.44 72.86 708.39 72.86 704.59 73.39 705.54 73.39 707.44"/>
      <path class="st4" d="M75.32,756.27c0,.23-.25.93-.33,1.13l-.25-3.44.66-.02-.08,2.33Z"/>
      <polygon class="st4" points="103.21 452.19 102.71 453.17 102.6 449.47 103.13 449.8 103.21 452.19"/>
      <path class="st4" d="M131.42,675.86c0,.27-.25.99-.33,1.18l-.25-3.44.66-.02-.07,2.28Z"/>
      <path class="st4" d="M72.25,683.59c-.11-.14-.43-.55-.43-.67l-.04-2.72.58-.03-.11,3.42Z"/>
      <path class="st4" d="M279.45,650.74c-.11-.14-.43-.56-.43-.65l-.04-2.74.58-.04-.11,3.42Z"/>
      <path class="st4" d="M127.43,816.21s-.47.01-.56.02v-2.65s.51-.02.51-.02l.04,2.65Z"/>
      <polygon class="st4" points="127.29 808.57 126.44 809.99 126.44 807.16 127.29 808.57"/>
      <polygon class="st4" points="122.74 687.28 121.89 688.7 121.89 685.87 122.74 687.28"/>
      <polygon class="st4" points="181.87 778.25 181.02 779.66 181.02 776.84 181.87 778.25"/>
      <polygon class="st4" points="152.54 723.61 152.35 724.54 152.03 722.1 152.82 722.08 152.54 723.61"/>
      <polygon class="st4" points="74.22 718.11 73.38 719.53 73.38 716.7 74.22 718.11"/>
      <polygon class="st4" points="61.94 688.55 61.26 689.72 61.26 687.38 61.94 688.55"/>
      <polygon class="st4" points="105.9 516.22 105.23 517.39 105.23 515.05 105.9 516.22"/>
      <path class="st4" d="M259.49,749.93c-.37,1.43-.46,1.93-.5,1.71l-.28-1.77.78.06Z"/>
      <polygon class="st4" points="181.38 769.54 180.57 771.07 180.45 768.8 181.38 769.54"/>
      <polygon class="st4" points="253.47 602.64 252.79 603.81 252.79 601.46 253.47 602.64"/>
      <path class="st4" d="M105.75,517.95c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.67.04Z"/>
      <path class="st4" d="M248.04,585.77c-.58.98-.72,1.27-.73,1.18l-.17-1.37.9.19Z"/>
      <polygon class="st4" points="111.96 662.34 111.2 662.87 111.36 661.1 111.96 662.34"/>
      <polygon class="st4" points="258.55 736.44 258.82 738.17 258.11 737.66 258.55 736.44"/>
      <path class="st4" d="M110.8,646.81c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M254.32,598.42l-.66-.04c.22-.82.39-1.45.33-1.24-.03.12.11.5.32,1.28Z"/>
      <path class="st4" d="M253.81,600.95l-.66-.04c.22-.82.39-1.46.33-1.24-.03.12.11.51.33,1.28Z"/>
      <path class="st4" d="M120.2,600.44c-.58.96-.73,1.26-.74,1.17l-.17-1.37.91.2Z"/>
      <polygon class="st4" points="99.86 730.88 100.14 732.61 99.42 732.1 99.86 730.88"/>
      <polygon class="st4" points="126.86 802 125.92 802.88 125.92 801.13 126.86 802"/>
      <path class="st4" d="M271.8,471.42l-.9.2.16-1.37c.01-.09.16.21.74,1.17Z"/>
      <path class="st4" d="M278.73,652.67v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M247.81,588.4l.11-.86-.11.86Z"/>
      <path class="st4" d="M256.91,516.81l.11.86-.11-.86Z"/>
      <path class="st4" d="M297.84,689.97l.11-.86-.11.86Z"/>
      <path class="st4" d="M103.27,461.55l.11-.86-.11.86Z"/>
      <path class="st4" d="M152.8,726.87l.11-.86-.11.86Z"/>
      <path class="st4" d="M153.37,728.47l-.06-1.03.44.74.17.29.3.74.33.38s-.24.26-.29.32l-.32-.43-.28-.75c-.23-.13-.29-.17-.29-.25Z"/>
      <path class="st4" d="M257.41,519.34l.11.86-.11-.86Z"/>
      <path class="st4" d="M74.59,745.17l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M250.34,768.48l.11.86-.11-.86Z"/>
      <path class="st4" d="M257.92,524.39l.11.86-.11-.86Z"/>
      <rect class="st4" x="256.34" y="515.79" width=".36" height=".36" transform="translate(-289.71 332.51) rotate(-45)"/>
      <rect class="st4" x="248.25" y="589.06" width=".36" height=".36" transform="translate(-343.89 348.25) rotate(-45)"/>
      <rect class="st4" x="248.76" y="590.08" width=".36" height=".36" transform="translate(-344.46 348.91) rotate(-45)"/>
      <rect class="st4" x="253.81" y="592.1" width=".36" height=".36" transform="translate(-344.41 353.07) rotate(-45)"/>
      <rect class="st4" x="278.07" y="653.75" width=".36" height=".36" transform="translate(-380.9 388.28) rotate(-45)"/>
      <rect class="st4" x="277.56" y="655.27" width=".36" height=".36" transform="translate(-382.12 388.37) rotate(-45)"/>
      <rect class="st4" x="277.06" y="656.28" width=".36" height=".36" transform="translate(-382.98 388.31) rotate(-45)"/>
      <rect class="st4" x="244.71" y="464.74" width=".36" height=".36" transform="translate(-257.02 309.34) rotate(-45)"/>
      <rect class="st4" x="155.77" y="729.56" width=".36" height=".36" transform="translate(-470.32 324.01) rotate(-45)"/>
      <rect class="st4" x="180.03" y="762.91" width=".36" height=".36" transform="translate(-486.8 350.93) rotate(-45)"/>
      <rect class="st4" x="10.66" y="707.75" width=".51" height="16.68"/>
      <rect class="st4" x="43.5" y="720.39" width=".51" height="13.64"/>
      <rect class="st4" x="75.85" y="470.73" width=".51" height="13.64"/>
      <rect class="st4" x="69.78" y="559.17" width=".51" height="11.88"/>
      <rect class="st4" x="57.65" y="559.17" width=".51" height="9.6"/>
      <rect class="st4" x="21.77" y="708.76" width=".51" height="6.57"/>
      <rect class="st4" x="53.61" y="476.29" width=".51" height="5.81"/>
      <rect class="st4" x="93.03" y="558.67" width=".51" height="5.81"/>
      <rect class="st4" x="21.27" y="717.86" width=".51" height="5.81"/>
      <rect class="st4" x="21.77" y="726.45" width=".51" height="5.81"/>
      <polygon class="st4" points="84.49 567.44 83.97 568.39 83.97 564.1 84.49 565.06 84.49 567.44"/>
      <polygon class="st4" points="93.49 574.96 92.98 574.01 92.98 571.63 93.49 570.67 93.49 574.96"/>
      <polygon class="st4" points="83.89 561.32 83.37 560.37 83.37 557.98 83.89 557.03 83.89 561.32"/>
      <polygon class="st4" points="11.73 704.4 11.21 705.36 11.21 701.56 11.73 702.51 11.73 704.4"/>
      <polygon class="st4" points="11.69 730.02 11.17 729.7 11.09 727.31 11.58 726.33 11.69 730.02"/>
      <polygon class="st4" points="22.75 736.6 22.24 736.2 22.32 732.97 22.83 733.38 22.75 736.6"/>
      <path class="st4" d="M54.56,489.52c-.12-.14-.43-.54-.43-.63l-.04-2.76.58-.04-.11,3.42Z"/>
      <polygon class="st4" points="83.9 575.9 83.39 575.49 83.47 572.27 83.97 572.67 83.9 575.9"/>
      <polygon class="st4" points="44.59 740.73 44.07 741.16 43.93 738.46 44.4 737.44 44.59 740.73"/>
      <polygon class="st4" points="23.15 740.65 22.7 740.22 22.91 737.43 23.4 738.46 23.15 740.65"/>
      <path class="st4" d="M45.01,744.88c0,.1-.35.83-.39.89l-.18-2.94h.63s-.05,2.04-.05,2.04Z"/>
      <path class="st4" d="M57.64,556.9c0,.09-.35.81-.39.87l-.19-2.94h.63s-.06,2.06-.06,2.06Z"/>
      <polygon class="st4" points="76.95 467.89 76.4 468.85 76.4 465.54 76.95 466.5 76.95 467.89"/>
      <path class="st4" d="M57.58,573.43c-.12-.16-.41-.54-.42-.64l-.05-2.29h.6s-.13,2.92-.13,2.92Z"/>
      <path class="st4" d="M44.51,715.53c0,.09-.36.89-.39.92l-.19-2.93h.63s-.05,2.01-.05,2.01Z"/>
      <polygon class="st4" points="22.82 707.79 22.28 707.48 22.2 705.57 22.69 704.59 22.82 707.79"/>
      <polygon class="st4" points="70.18 556.39 69.34 557.81 69.34 554.98 70.18 556.39"/>
      <polygon class="st4" points="12.46 737.7 12.21 736.57 12.02 735.2 12.82 735.26 12.46 737.7"/>
      <polygon class="st4" points="93.43 577.62 92.58 579.03 92.58 576.21 93.43 577.62"/>
      <polygon class="st4" points="45.37 706.48 45.23 707.37 44.89 704.92 45.7 704.9 45.37 706.48"/>
      <polygon class="st4" points="46.43 702.45 45.58 703.86 45.58 701.03 46.43 702.45"/>
      <polygon class="st4" points="23.69 701.94 22.84 703.35 22.84 700.53 23.69 701.94"/>
      <polygon class="st4" points="24.19 698.4 23.35 699.82 23.35 696.99 24.19 698.4"/>
      <polygon class="st4" points="83.83 554.37 82.98 555.79 82.98 552.96 83.83 554.37"/>
      <polygon class="st4" points="55.02 469.47 54.17 470.89 54.17 468.06 55.02 469.47"/>
      <polygon class="st4" points="56.04 499.83 55.81 500.69 55.52 498.23 56.27 498.2 56.04 499.83"/>
      <polygon class="st4" points="24.19 742.37 23.35 743.78 23.35 740.95 24.19 742.37"/>
      <polygon class="st4" points="93.43 555.89 92.58 557.3 92.58 554.47 93.43 555.89"/>
      <polygon class="st4" points="55.07 492.78 54.77 493.61 54.52 491.15 55.24 491.12 55.07 492.78"/>
      <polygon class="st4" points="45.06 711.34 44.51 711.02 44.42 709.63 44.92 708.62 45.06 711.34"/>
      <polygon class="st4" points="56.03 496.26 55.19 497.67 55.19 494.84 56.03 496.26"/>
      <polygon class="st4" points="11.99 734.17 11.54 733.1 11.84 731.36 12.29 732.44 11.99 734.17"/>
      <polygon class="st4" points="83.33 550.71 82.53 552.25 82.41 549.98 83.33 550.71"/>
      <path class="st4" d="M92.72,551.32c-.38,1.43-.46,1.92-.5,1.7l-.28-1.76.78.06Z"/>
      <polygon class="st4" points="70.19 573.45 69.39 574.99 69.27 572.72 70.19 573.45"/>
      <polygon class="st4" points="13.59 691.2 12.79 692.74 12.67 690.47 13.59 691.2"/>
      <polygon class="st4" points="92.94 580.53 92.13 582.07 92.01 579.79 92.94 580.53"/>
      <polygon class="st4" points="66.97 544.53 66.58 543.44 67.13 542.35 67.28 544.26 67.55 544.51 67.93 545.6 67.38 546.68 67.23 544.77 66.97 544.53"/>
      <polygon class="st4" points="47.28 755.76 46.61 756.93 46.61 754.59 47.28 755.76"/>
      <polygon class="st4" points="46.44 750.33 45.63 751.87 45.51 749.6 46.44 750.33"/>
      <polygon class="st4" points="69.69 575.98 68.88 577.52 68.76 575.24 69.69 575.98"/>
      <polygon class="st4" points="47.79 694.61 47.11 695.78 47.11 693.44 47.79 694.61"/>
      <polygon class="st4" points="58.07 506.75 57.26 508.28 57.14 506.01 58.07 506.75"/>
      <polygon class="st4" points="13.09 694.74 12.28 696.28 12.16 694.01 13.09 694.74"/>
      <polygon class="st4" points="83.67 577.87 82.99 579.04 82.99 576.7 83.67 577.87"/>
      <polygon class="st4" points="24.54 745.15 23.86 746.32 23.86 743.98 24.54 745.15"/>
      <polygon class="st4" points="47.45 696.76 46.65 698.3 46.53 696.03 47.45 696.76"/>
      <polygon class="st4" points="69.52 553.11 68.84 554.28 68.84 551.94 69.52 553.11"/>
      <polygon class="st4" points="12.58 698.28 11.77 699.82 11.65 697.54 12.58 698.28"/>
      <polygon class="st4" points="57.05 577.5 56.25 579.03 56.13 576.76 57.05 577.5"/>
      <polygon class="st4" points="92.26 583.43 91.58 584.6 91.58 582.26 92.26 583.43"/>
      <polygon class="st4" points="46.78 699.67 46.1 700.84 46.1 698.49 46.78 699.67"/>
      <polygon class="st4" points="45.77 747.68 45.09 748.85 45.09 746.5 45.77 747.68"/>
      <polygon class="st4" points="57.05 549.2 56.25 550.73 56.13 548.46 57.05 549.2"/>
      <polygon class="st4" points="92.43 549.2 91.62 550.73 91.5 548.46 92.43 549.2"/>
      <path class="st4" d="M57.35,551.82c-.38,1.42-.46,1.93-.5,1.71l-.28-1.77.78.06Z"/>
      <polygon class="st4" points="13.42 739.08 12.75 740.26 12.75 737.91 13.42 739.08"/>
      <polygon class="st4" points="24.56 746.55 24.84 748.27 24.13 747.77 24.56 746.55"/>
      <polygon class="st4" points="14.96 747.56 15.24 749.28 14.52 748.78 14.96 747.56"/>
      <polygon class="st4" points="49.54 763.59 48.6 764.47 48.6 762.72 49.54 763.59"/>
      <polygon class="st4" points="69 550.65 68.24 551.18 68.41 549.41 69 550.65"/>
      <path class="st4" d="M51.17,679.66c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <polygon class="st4" points="14.25 743.53 14.03 745.29 13.46 744.04 14.25 743.53"/>
      <polygon class="st4" points="82.18 582.31 82.45 584.03 81.74 583.52 82.18 582.31"/>
      <path class="st4" d="M81.99,585.79l-.66-.04c.22-.82.39-1.45.33-1.24-.03.12.11.51.33,1.28Z"/>
      <polygon class="st4" points="82.18 547.44 82.45 549.16 81.74 548.65 82.18 547.44"/>
      <polygon class="st4" points="68.49 548.13 67.74 548.65 67.9 546.89 68.49 548.13"/>
      <polygon class="st4" points="91.99 585.71 91.05 586.58 91.05 584.83 91.99 585.71"/>
      <polygon class="st4" points="47.81 759.18 48.08 760.91 47.37 760.4 47.81 759.18"/>
      <path class="st4" d="M50.45,683.31c-.58.98-.72,1.27-.73,1.18l-.17-1.37.9.19Z"/>
      <path class="st4" d="M66.62,586.6l-.73,1.4c0-.13.1-.89.17-1.14l.4-1.37c.07-.24.26.9.16,1.1Z"/>
      <polygon class="st4" points="61.46 522.67 61.73 524.4 61.02 523.89 61.46 522.67"/>
      <polygon class="st4" points="67.45 584.16 66.8 585.07 67.04 583.82 67.4 582.37 67.94 582.88 67.45 584.16"/>
      <polygon class="st4" points="47.7 757.25 47.32 758.91 46.84 757.58 47.7 757.25"/>
      <path class="st4" d="M81.03,588.44c-.07.23-.51,1.23-.49,1.01l.09-1.3.29-1.34c.03-.13.38-.15.68-.17l-.56,1.8Z"/>
      <polygon class="st4" points="49.62 684.91 49.4 686.67 48.84 685.41 49.62 684.91"/>
      <path class="st4" d="M91.59,546.75c-.22.82-.39,1.45-.33,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M77.44,462.36c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M77.24,489.11l-.9.2.17-1.37c.01-.09.15.2.74,1.17Z"/>
      <path class="st4" d="M76.94,527.55c-.22.82-.39,1.45-.33,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M56.22,546.75c-.22.82-.39,1.45-.33,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M81.99,546.37l-.66-.04c.22-.82.39-1.45.34-1.24-.03.12.11.51.33,1.28Z"/>
      <path class="st4" d="M69.15,579.57l-.9.2.17-1.37c.01-.09.15.2.74,1.17Z"/>
      <polygon class="st4" points="56.37 580.47 55.61 581 55.77 579.23 56.37 580.47"/>
      <path class="st4" d="M16.92,755.76l-.06-1.03.43.74.17.31.21.47.18.75.16.28.09,1.02-.43-.74-.21-.31c-.05-.08-.2-.37-.2-.44v-.81c-.27-.13-.34-.16-.34-.24Z"/>
      <polygon class="st4" points="55.39 543.9 55.66 545.62 54.95 545.12 55.39 543.9"/>
      <polygon class="st4" points="81.56 542.97 81.18 544.63 80.7 543.31 81.56 542.97"/>
      <polygon class="st4" points="26.59 754.64 26.86 756.36 26.15 755.85 26.59 754.64"/>
      <polygon class="st4" points="90.98 542.38 90.13 543.64 89.95 542.11 90.98 542.38"/>
      <polygon class="st4" points="77.63 459 77.9 460.72 77.19 460.21 77.63 459"/>
      <path class="st4" d="M61.82,598.09l.13-1.11.58-1.11.46-.99.49-1.15.48-1.13c.09-.21.12.58.06.79l-.35,1.17-.43.99-.55,1-.87,1.55Z"/>
      <path class="st4" d="M80.98,541.19c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M54.7,540.14c-.22.77-.36,1.16-.33,1.28.06.21-.11-.42-.33-1.24l.66-.04Z"/>
      <polygon class="st4" points="49.54 687.79 48.6 688.67 48.6 686.91 49.54 687.79"/>
      <polygon class="st4" points="13.74 741.01 13.52 742.77 12.96 741.51 13.74 741.01"/>
      <path class="st4" d="M59.76,515.42c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M121.58,403.68c-.24.11-1.28.24-1.28.21l1.18-.71,1.01-.5,1.21-.34,1.08-.21c.22-.04-.61.41-.82.51l-1.1.48-1.29.56Z"/>
      <path class="st4" d="M80.48,539.17c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.67.04Z"/>
      <polygon class="st4" points="57.92 508.52 58.19 510.25 57.48 509.74 57.92 508.52"/>
      <polygon class="st4" points="66.73 539.34 65.88 540.6 65.69 539.07 66.73 539.34"/>
      <path class="st4" d="M54.2,538.16c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M57.23,574.55c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M13.77,688.25c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <polygon class="st4" points="14.75 745.55 14.53 747.31 13.97 746.06 14.75 745.55"/>
      <polygon class="st4" points="46.3 752.61 46.57 754.34 45.86 753.83 46.3 752.61"/>
      <path class="st4" d="M48.64,689.22c-.22.77-.36,1.16-.33,1.28.05.22-.11-.42-.34-1.24l.66-.04Z"/>
      <polygon class="st4" points="53.37 535.81 53.64 537.54 52.93 537.03 53.37 535.81"/>
      <path class="st4" d="M26.4,752.95c-.21.82-.3,1.43-.35,1.24l-.28-1.3.63.06Z"/>
      <path class="st4" d="M55.71,581.58c-.22.77-.36,1.16-.33,1.28.05.22-.11-.42-.33-1.24l.66-.04Z"/>
      <path class="st4" d="M68.35,580.61c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <polygon class="st4" points="63.98 531.77 64.26 533.49 63.54 532.99 63.98 531.77"/>
      <path class="st4" d="M48.13,691.75c-.22.77-.36,1.16-.33,1.28l-.34-1.24.67-.04Z"/>
      <polygon class="st4" points="62.47 526.21 62.74 527.93 62.03 527.43 62.47 526.21"/>
      <path class="st4" d="M83,580.11c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.67.04Z"/>
      <polygon class="st4" points="127.98 401.39 126.48 401.69 125.35 401.88 126.24 401.38 127.37 400.73 127.98 401.39"/>
      <path class="st4" d="M24.38,694.82c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M59.25,513.4c-.22.82-.39,1.45-.34,1.24.03-.12-.11-.51-.33-1.28l.66.04Z"/>
      <path class="st4" d="M25.69,749.88l-.91.19.17-1.37c.01-.09.15.2.73,1.18Z"/>
      <polygon class="st4" points="63.87 529.83 63.49 531.49 63.02 530.17 63.87 529.83"/>
      <polygon class="st4" points="56.7 501.46 56.48 503.22 55.92 501.97 56.7 501.46"/>
      <polygon class="st4" points="57.2 503.99 56.98 505.75 56.42 504.49 57.2 503.99"/>
      <path class="st4" d="M53.75,669.94l.11.86-.11-.86Z"/>
      <rect class="st4" x="61.61" y="617.26" width="14.01" height=".68" transform="translate(-514.46 402.77) rotate(-63.43)"/>
      <rect class="st4" x="51.34" y="613.41" width="6.55" height=".68" transform="translate(-518.76 388.13) rotate(-63.43)"/>
      <path class="st4" d="M58.46,512.1l-.06-.98.06.98Z"/>
      <rect class="st4" x="71.17" y="607.35" width="4.29" height=".68" transform="translate(-503 401.5) rotate(-63.43)"/>
      <rect class="st4" x="56.01" y="605.83" width="4.29" height=".68" transform="translate(-510.03 387.1) rotate(-63.43)"/>
      <polygon class="st4" points="74.88 604.13 75.08 603.03 75.62 602.04 75.85 602.91 74.88 604.13"/>
      <rect class="st4" x="44.84" y="600.93" width="5.76" height=".68" transform="translate(-511.41 375.06) rotate(-63.43)"/>
      <polygon class="st4" points="65.07 625.59 64.52 625.62 65.06 624.33 65.07 625.59"/>
      <path class="st4" d="M63.91,627.5c-.15.09-.86.43-.59.3l.74-1.43c.06.09.08,1-.15,1.13Z"/>
      <rect class="st4" x="58.54" y="600.27" width="4.29" height=".68" transform="translate(-503.66 386.29) rotate(-63.43)"/>
      <path class="st4" d="M71.56,511.19l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M75.82,601.7l.35-1.22c.03-.12.24-.42.55-.91.03.15,0,.96-.14,1.14l-.75.98Z"/>
      <rect class="st4" x="52.91" y="643.58" width="5.09" height=".68" transform="translate(-545.29 405.55) rotate(-63.43)"/>
      <path class="st4" d="M72.52,515.13l.06-.98-.06.98Z"/>
      <polygon class="st4" points="76.89 599.08 77.12 597.93 77.71 596.93 77.86 597.86 76.89 599.08"/>
      <path class="st4" d="M51.73,651.24l.11.86-.11-.86Z"/>
      <path class="st4" d="M130.89,400.03l-1,.26,1-.26Z"/>
      <polygon class="st4" points="77.91 596.55 78.11 595.45 78.65 594.46 78.89 595.33 77.91 596.55"/>
      <path class="st4" d="M50.94,594.02c.4.43-.09,1.22-.87,2.22.1-.72.11-.94.18-1.05l.69-1.17Z"/>
      <path class="st4" d="M57.41,661.28l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M71.09,509.07l-.06-.98.06.98Z"/>
      <path class="st4" d="M87.92,595.06c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M56.08,663.28c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <path class="st4" d="M79.09,593.97l.06-.98-.06.98Z"/>
      <path class="st4" d="M79.33,592.02c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <polygon class="st4" points="51.63 592.51 51.83 591.41 52.37 590.42 52.61 591.29 51.63 592.51"/>
      <polygon class="st4" points="64.26 592 64.47 590.91 65.01 589.91 65.24 590.79 64.26 592"/>
      <path class="st4" d="M89.73,591.54l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M80.16,591.02v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M89.94,589.5c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <path class="st4" d="M52.74,589.08l.11.86-.11-.86Z"/>
      <path class="st4" d="M73.08,517.25l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M65.18,588.99c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M62.65,528.85c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <polygon class="st4" points="53.08 588.48 53.38 587.29 54.04 586.33 53.93 587.63 53.08 588.48"/>
      <path class="st4" d="M90.71,587.9l.06-.98-.06.98Z"/>
      <path class="st4" d="M70.53,507.15l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M53.4,672.3l-.06-.98.06.98Z"/>
      <path class="st4" d="M52.74,672.97l.11.86-.11-.86Z"/>
      <path class="st4" d="M52.23,674.49l.11.86-.11-.86Z"/>
      <path class="st4" d="M54.41,585.88l-.06-.98.06.98Z"/>
      <path class="st4" d="M51.82,676.93v-1.02,1.02Z"/>
      <path class="st4" d="M59.92,518.26l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M51.22,678.02l.11.86-.11-.86Z"/>
      <path class="st4" d="M54.76,583.52l.11.86-.11-.86Z"/>
      <path class="st4" d="M15,681.9l-.06-.98.06.98Z"/>
      <path class="st4" d="M50.21,681.56l.11.86-.11-.86Z"/>
      <path class="st4" d="M73.58,518.77l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M14.33,683.58l.11.86-.11-.86Z"/>
      <path class="st4" d="M13.83,686.44l.11-.86-.11.86Z"/>
      <rect class="st4" x="115.81" y="404.93" width="3.05" height=".68" transform="translate(-168.85 95.26) rotate(-26.57)"/>
      <path class="st4" d="M25.08,690.57v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M128.91,401.05c.74-.38.43-.22,0,0-.47-.45-.7-.67,0,0Z"/>
      <path class="st4" d="M24.24,692.59c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <polygon class="st4" points="95.57 409.88 94.29 411.09 94.03 410.84 95.44 409.53 96.62 409.11 98.08 408.07 99.55 407.05 100.62 406.57 101.61 406.03 102.69 405.56 103.4 405.05 103.65 405.3 102.73 406.08 101.6 406.53 100.63 407.07 99.55 407.55 98.07 408.57 96.86 409.48 95.57 409.88"/>
      <path class="st4" d="M78.01,457.18l.11.86-.11-.86Z"/>
      <path class="st4" d="M78.51,455.48l.11-.86-.11.86Z"/>
      <path class="st4" d="M60.32,520.17l.11-.86-.11.86Z"/>
      <path class="st4" d="M45.27,447.99c0,.61,0,.61,0,0q0-.61,0,0Z"/>
      <polygon class="st4" points="50.59 437.88 49.85 438.92 49.6 438.66 50.07 437.86 51.08 436.37 51.81 435.34 52.07 435.59 51.59 436.4 50.59 437.88"/>
      <path class="st4" d="M74.07,520.79l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M109.65,402.55l-.99.32.99-.32Z"/>
      <rect class="st4" x="76.23" y="410.51" width="4.29" height=".68" transform="translate(-175.46 78.42) rotate(-26.57)"/>
      <path class="st4" d="M15.5,750.63l-.06-.98.06.98Z"/>
      <path class="st4" d="M15.85,751.3l.11.86-.11-.86Z"/>
      <path class="st4" d="M25.25,751.72c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M16.35,754.16l.11-.86-.11.86Z"/>
      <path class="st4" d="M26.96,756.86l.11.86-.11-.86Z"/>
      <path class="st4" d="M60.98,522.21l-.06-.98.06.98Z"/>
      <path class="st4" d="M74.63,522.21l-.06-.98.06.98Z"/>
      <path class="st4" d="M27.47,758.38l.11.86-.11-.86Z"/>
      <path class="st4" d="M18.18,759.3c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M27.78,760.31c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M18.88,761.23l.11-.86-.11.86Z"/>
      <path class="st4" d="M28.63,761.83c-.06.57-.07.65,0,0-.07-.65-.06-.57,0,0Z"/>
      <path class="st4" d="M48,761.83c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <path class="st4" d="M20.04,763.34c-.06.57-.07.65,0,0-.07-.65-.06-.57,0,0Z"/>
      <path class="st4" d="M29.13,763.85l-.22-.94c-.02-.09.33.34.39.44l.31.49.48.77-.76.11-.21-.87Z"/>
      <path class="st4" d="M49.3,765.89l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M20.96,766.38l-.06-1.03.44.74.17.3.34.73c.15.14.22.19.22.27l.06,1.03-.44-.75c-.1-.14-.16-.2-.19-.28l-.24-.78c-.24-.12-.3-.16-.31-.24Z"/>
      <path class="st4" d="M30.07,766.3l.06-.98-.06.98Z"/>
      <path class="st4" d="M49.51,766.88c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M31.15,768.9l-.22-.95c-.02-.09.33.35.38.43l.32.51.48.77-.75.11-.21-.87Z"/>
      <path class="st4" d="M74.97,522.88l.11.86-.11-.86Z"/>
      <path class="st4" d="M50.28,768.83l.06-.98-.06.98Z"/>
      <path class="st4" d="M50.72,770.33l.11-.86-.11.86Z"/>
      <path class="st4" d="M90.77,545.55l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M51.03,771.43c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <polygon class="st4" points="68.21 417.65 65.97 419.66 65.72 419.41 68.2 417.14 70.27 415.66 71.8 414.64 73.33 413.63 74.8 412.62 75.61 412.14 75.87 412.39 74.84 413.13 73.32 414.13 71.81 415.15 70.27 416.16 68.21 417.65"/>
      <path class="st4" d="M51.83,773.46l-.48-.76.76-.12.21.87.22.95c.02.09-.32-.34-.38-.43l-.32-.5Z"/>
      <polygon class="st4" points="87 416.5 81.64 421.68 81.38 421.43 86.88 416.13 89.98 413.64 92 412.13 93.31 411.14 93.56 411.39 92.02 412.63 89.98 414.15 87 416.5"/>
      <path class="st4" d="M54.86,543.01v-1.02,1.02Z"/>
      <path class="st4" d="M53.31,777l-.13-1.16.51.86c.13.14.2.19.21.28l.13,1.15-.51-.87c-.13-.14-.2-.19-.21-.27Z"/>
      <path class="st4" d="M66.48,542v-1.02,1.02Z"/>
      <path class="st4" d="M89.63,540.56l.11.86-.11-.86Z"/>
      <rect class="st4" x="105.2" y="403.41" width="3.05" height=".68" transform="translate(-169.29 90.35) rotate(-26.57)"/>
      <path class="st4" d="M75.61,525.32v-1.02s0,1.02,0,1.02Z"/>
      <path class="st4" d="M55.33,781.54l-.06-1.03.44.74.17.3.34.71.16.3.34.73c.11.12.16.16.17.25l.1.97c.02.22-.46-.82-.38-.69-.12-.12-.2-.17-.23-.26l-.25-.77c-.18-.1-.24-.16-.26-.23l-.24-.78c-.24-.12-.3-.16-.31-.24Z"/>
      <path class="st4" d="M89.12,538.54l.11.86-.11-.86Z"/>
      <path class="st4" d="M79.33,537.95c.67.7.45.47,0,0,.22-.43.38-.74,0,0Z"/>
      <path class="st4" d="M65.53,538.38l-.06-.98.06.98Z"/>
      <path class="st4" d="M61.93,525.82v-1.02,1.02Z"/>
      <path class="st4" d="M88.62,537.03l.11.86-.11-.86Z"/>
      <path class="st4" d="M87.92,535.93c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M78.82,535.93c.38.74.22.43,0,0,.45-.47.67-.7,0,0Z"/>
      <path class="st4" d="M64.99,536.46l-.02-1.06.02,1.06Z"/>
      <path class="st4" d="M52.74,534.5l.11.86-.11-.86Z"/>
      <path class="st4" d="M87.61,533.99l.11.86-.11-.86Z"/>
      <path class="st4" d="M78.51,533.99l.11.86-.11-.86Z"/>
      <path class="st4" d="M64.36,533.99l.11.86-.11-.86Z"/>
      <path class="st4" d="M75.99,525.91l.11.86-.11-.86Z"/>
      <path class="st4" d="M78.01,532.48l.11.86-.11-.86Z"/>
      <path class="st4" d="M52.34,533.43l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M77.61,531.91l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M51.83,531.91l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M50.85,527.85v-1.02,1.02Z"/>
      <path class="st4" d="M77,529.45l.11.86-.11-.86Z"/>
      <path class="st4" d="M51.33,529.89l.02-1.06-.02,1.06Z"/>
      <path class="st4" d="M77.1,493l.02-1.06-.02,1.06Z"/>
      <rect class="st4" x="86.53" y="530.95" width=".36" height=".36" transform="translate(-350.17 216.88) rotate(-45)"/>
      <rect class="st4" x="87.04" y="532.46" width=".36" height=".36" transform="translate(-351.09 217.68) rotate(-45)"/>
      <rect class="st4" x="50.15" y="525.39" width=".36" height=".36" transform="translate(-356.89 189.52) rotate(-45)"/>
      <rect class="st4" x="49.64" y="523.37" width=".36" height=".36" transform="translate(-355.61 188.57) rotate(-45)"/>
      <rect class="st4" x="49.14" y="521.35" width=".36" height=".36" transform="translate(-354.33 187.62) rotate(-45)"/>
      <rect class="st4" x="89.06" y="592.1" width=".36" height=".36" transform="translate(-392.66 236.58) rotate(-45)"/>
      <rect class="st4" x="51.16" y="593.11" width=".36" height=".36" transform="translate(-404.48 210.07) rotate(-45)"/>
      <rect class="st4" x="88.56" y="593.61" width=".36" height=".36" transform="translate(-393.88 236.66) rotate(-45)"/>
      <rect class="st4" x="87.54" y="596.14" width=".36" height=".36" transform="translate(-395.97 236.69) rotate(-45)"/>
      <rect class="st4" x="49.64" y="596.64" width=".36" height=".36" transform="translate(-407.43 210.03) rotate(-45)"/>
      <rect class="st4" x="49.14" y="597.66" width=".36" height=".36" transform="translate(-408.29 209.97) rotate(-45)"/>
      <rect class="st4" x="59.24" y="603.21" width=".36" height=".36" transform="translate(-409.26 218.75) rotate(-45)"/>
      <rect class="st4" x="45.6" y="604.73" width=".36" height=".36" transform="translate(-414.33 209.54) rotate(-45)"/>
      <rect class="st4" x="74.41" y="604.73" width=".36" height=".36" transform="translate(-405.89 229.91) rotate(-45)"/>
      <rect class="st4" x="45.09" y="605.74" width=".36" height=".36" transform="translate(-415.19 209.48) rotate(-45)"/>
      <rect class="st4" x="44.59" y="606.75" width=".36" height=".36" transform="translate(-416.05 209.42) rotate(-45)"/>
      <rect class="st4" x="71.88" y="512.75" width=".36" height=".36" transform="translate(-341.59 201.19) rotate(-45)"/>
      <rect class="st4" x="44.08" y="607.76" width=".36" height=".36" transform="translate(-416.92 209.36) rotate(-45)"/>
      <rect class="st4" x="43.58" y="608.77" width=".36" height=".36" transform="translate(-417.78 209.3) rotate(-45)"/>
      <rect class="st4" x="56.72" y="608.77" width=".36" height=".36" transform="translate(-413.93 218.59) rotate(-45)"/>
      <rect class="st4" x="43.07" y="609.78" width=".36" height=".36" transform="translate(-418.64 209.24) rotate(-45)"/>
      <rect class="st4" x="56.21" y="609.78" width=".36" height=".36" transform="translate(-414.79 218.53) rotate(-45)"/>
      <rect class="st4" x="71.88" y="610.29" width=".36" height=".36" transform="translate(-410.56 229.75) rotate(-45)"/>
      <rect class="st4" x="42.57" y="610.8" width=".36" height=".36" transform="translate(-419.5 209.18) rotate(-45)"/>
      <rect class="st4" x="42.06" y="611.81" width=".36" height=".36" transform="translate(-420.37 209.11) rotate(-45)"/>
      <rect class="st4" x="41.56" y="612.82" width=".36" height=".36" transform="translate(-421.23 209.05) rotate(-45)"/>
      <rect class="st4" x="119.38" y="404.1" width=".36" height=".36" transform="translate(-250.85 202.95) rotate(-45)"/>
      <rect class="st4" x="52.67" y="617.36" width=".36" height=".36" transform="translate(-421.19 218.25) rotate(-45)"/>
      <rect class="st4" x="52.17" y="618.38" width=".36" height=".36" transform="translate(-422.05 218.19) rotate(-45)"/>
      <rect class="st4" x="51.66" y="619.39" width=".36" height=".36" transform="translate(-422.91 218.12) rotate(-45)"/>
      <rect class="st4" x="51.16" y="620.4" width=".36" height=".36" transform="translate(-423.78 218.06) rotate(-45)"/>
      <rect class="st4" x="50.65" y="621.41" width=".36" height=".36" transform="translate(-424.64 218) rotate(-45)"/>
      <rect class="st4" x="50.15" y="622.42" width=".36" height=".36" transform="translate(-425.5 217.94) rotate(-45)"/>
      <rect class="st4" x="62.78" y="628.48" width=".36" height=".36" transform="translate(-426.09 228.65) rotate(-45)"/>
      <rect class="st4" x="62.28" y="629.49" width=".36" height=".36" transform="translate(-426.95 228.59) rotate(-45)"/>
      <rect class="st4" x="61.77" y="630.5" width=".36" height=".36" transform="translate(-427.82 228.53) rotate(-45)"/>
      <rect class="st4" x="61.27" y="631.52" width=".36" height=".36" transform="translate(-428.68 228.47) rotate(-45)"/>
      <rect class="st4" x="60.76" y="632.53" width=".36" height=".36" transform="translate(-429.54 228.41) rotate(-45)"/>
      <rect class="st4" x="60.25" y="633.54" width=".36" height=".36" transform="translate(-430.4 228.34) rotate(-45)"/>
      <rect class="st4" x="59.75" y="634.55" width=".36" height=".36" transform="translate(-431.27 228.28) rotate(-45)"/>
      <rect class="st4" x="59.24" y="635.56" width=".36" height=".36" transform="translate(-432.13 228.22) rotate(-45)"/>
      <rect class="st4" x="58.74" y="636.57" width=".36" height=".36" transform="translate(-432.99 228.16) rotate(-45)"/>
      <rect class="st4" x="58.23" y="637.58" width=".36" height=".36" transform="translate(-433.85 228.1) rotate(-45)"/>
      <rect class="st4" x="57.73" y="638.59" width=".36" height=".36" transform="translate(-434.72 228.04) rotate(-45)"/>
      <rect class="st4" x="57.22" y="639.6" width=".36" height=".36" transform="translate(-435.58 227.98) rotate(-45)"/>
      <rect class="st4" x="56.72" y="640.61" width=".36" height=".36" transform="translate(-436.44 227.91) rotate(-45)"/>
      <rect class="st4" x="53.69" y="647.18" width=".36" height=".36" transform="translate(-441.98 227.69) rotate(-45)"/>
      <rect class="st4" x="53.18" y="648.19" width=".36" height=".36" transform="translate(-442.84 227.63) rotate(-45)"/>
      <rect class="st4" x="52.67" y="649.2" width=".36" height=".36" transform="translate(-443.7 227.57) rotate(-45)"/>
      <rect class="st4" x="52.17" y="650.21" width=".36" height=".36" transform="translate(-444.56 227.51) rotate(-45)"/>
      <rect class="st4" x="51.16" y="652.74" width=".36" height=".36" transform="translate(-446.65 227.54) rotate(-45)"/>
      <rect class="st4" x="60.25" y="653.25" width=".36" height=".36" transform="translate(-444.34 234.12) rotate(-45)"/>
      <rect class="st4" x="50.65" y="653.75" width=".36" height=".36" transform="translate(-447.51 227.48) rotate(-45)"/>
      <rect class="st4" x="49.64" y="656.28" width=".36" height=".36" transform="translate(-449.59 227.5) rotate(-45)"/>
      <rect class="st4" x="58.74" y="656.78" width=".36" height=".36" transform="translate(-447.29 234.08) rotate(-45)"/>
      <rect class="st4" x="49.14" y="657.29" width=".36" height=".36" transform="translate(-450.46 227.44) rotate(-45)"/>
      <rect class="st4" x="58.23" y="657.79" width=".36" height=".36" transform="translate(-448.15 234.02) rotate(-45)"/>
      <rect class="st4" x="57.73" y="659.31" width=".36" height=".36" transform="translate(-449.37 234.11) rotate(-45)"/>
      <rect class="st4" x="48.13" y="659.82" width=".36" height=".36" transform="translate(-452.54 227.46) rotate(-45)"/>
      <rect class="st4" x="56.72" y="661.84" width=".36" height=".36" transform="translate(-451.45 234.13) rotate(-45)"/>
      <rect class="st4" x="55.71" y="664.36" width=".36" height=".36" transform="translate(-453.53 234.16) rotate(-45)"/>
      <rect class="st4" x="55.2" y="665.88" width=".36" height=".36" transform="translate(-454.75 234.24) rotate(-45)"/>
      <rect class="st4" x="54.7" y="667.4" width=".36" height=".36" transform="translate(-455.97 234.33) rotate(-45)"/>
      <rect class="st4" x="54.19" y="668.41" width=".36" height=".36" transform="translate(-456.84 234.27) rotate(-45)"/>
      <rect class="st4" x="104.22" y="404.61" width=".36" height=".36" transform="translate(-255.65 192.38) rotate(-45)"/>
      <rect class="st4" x="25.38" y="687.61" width=".36" height=".36" transform="translate(-478.85 219.52) rotate(-45)"/>
      <rect class="st4" x="114.83" y="406.12" width=".36" height=".36" transform="translate(-253.61 200.33) rotate(-45)"/>
      <rect class="st4" x="41.56" y="459.19" width=".36" height=".36" transform="translate(-312.6 164.06) rotate(-45)"/>
      <polygon class="st4" points="84.19 407.52 84.44 407.82 84.19 408.07 83.93 407.82 84.19 407.52"/>
      <rect class="st4" x="42.06" y="457.16" width=".36" height=".36" transform="translate(-311.02 163.82) rotate(-45)"/>
      <rect class="st4" x="83" y="408.14" width=".36" height=".36" transform="translate(-264.37 178.41) rotate(-45)"/>
      <rect class="st4" x="42.57" y="455.14" width=".36" height=".36" transform="translate(-309.44 163.59) rotate(-45)"/>
      <rect class="st4" x="43.07" y="453.63" width=".36" height=".36" transform="translate(-308.22 163.5) rotate(-45)"/>
      <rect class="st4" x="78.95" y="453.12" width=".36" height=".36" transform="translate(-297.35 188.72) rotate(-45)"/>
      <rect class="st4" x="43.58" y="452.11" width=".36" height=".36" transform="translate(-307 163.41) rotate(-45)"/>
      <rect class="st4" x="44.08" y="450.59" width=".36" height=".36" transform="translate(-305.78 163.33) rotate(-45)"/>
      <rect class="st4" x="44.59" y="449.08" width=".36" height=".36" transform="translate(-304.56 163.24) rotate(-45)"/>
      <rect class="st4" x="45.6" y="446.55" width=".36" height=".36" transform="translate(-302.48 163.21) rotate(-45)"/>
      <rect class="st4" x="46.1" y="445.54" width=".36" height=".36" transform="translate(-301.61 163.28) rotate(-45)"/>
      <rect class="st4" x="81.99" y="408.65" width=".36" height=".36" transform="translate(-265.02 177.84) rotate(-45)"/>
      <rect class="st4" x="46.61" y="444.53" width=".36" height=".36" transform="translate(-300.75 163.34) rotate(-45)"/>
      <rect class="st4" x="80.97" y="409.15" width=".36" height=".36" transform="translate(-265.67 177.28) rotate(-45)"/>
      <rect class="st4" x="47.12" y="443.52" width=".36" height=".36" transform="translate(-299.89 163.4) rotate(-45)"/>
      <rect class="st4" x="47.62" y="442.51" width=".36" height=".36" transform="translate(-299.03 163.46) rotate(-45)"/>
      <rect class="st4" x="48.13" y="441.5" width=".36" height=".36" transform="translate(-298.16 163.52) rotate(-45)"/>
      <rect class="st4" x="48.63" y="440.49" width=".36" height=".36" transform="translate(-297.3 163.58) rotate(-45)"/>
      <rect class="st4" x="69.35" y="439.98" width=".36" height=".36" transform="translate(-290.88 178.09) rotate(-45)"/>
      <rect class="st4" x="49.14" y="439.48" width=".36" height=".36" transform="translate(-296.44 163.64) rotate(-45)"/>
      <rect class="st4" x="69.86" y="438.97" width=".36" height=".36" transform="translate(-290.01 178.15) rotate(-45)"/>
      <rect class="st4" x="70.36" y="437.96" width=".36" height=".36" transform="translate(-289.15 178.21) rotate(-45)"/>
      <rect class="st4" x="70.87" y="436.95" width=".36" height=".36" transform="translate(-288.29 178.27) rotate(-45)"/>
      <rect class="st4" x="71.37" y="435.94" width=".36" height=".36" transform="translate(-287.42 178.33) rotate(-45)"/>
      <rect class="st4" x="71.88" y="434.93" width=".36" height=".36" transform="translate(-286.56 178.39) rotate(-45)"/>
      <path class="st4" d="M53.38,433.78l-1.03,1.08-.27-.27,1.31-1.24c.03.2.06.35-.02.43Z"/>
      <rect class="st4" x="72.89" y="433.41" width=".36" height=".36" transform="translate(-285.19 178.66) rotate(-45)"/>
      <rect class="st4" x="73.39" y="432.4" width=".36" height=".36" transform="translate(-284.33 178.72) rotate(-45)"/>
      <path class="st4" d="M54.9,431.76l-1.03,1.08-.27-.27,1.31-1.24c.03.2.06.35-.02.43Z"/>
      <path class="st4" d="M74.33,431.32q-.5.5,0,0t0,0Z"/>
      <path class="st4" d="M56.42,429.74l-1.03,1.08-.27-.27,1.31-1.24c.03.2.06.35-.02.43Z"/>
      <path class="st4" d="M75.5,429.59c-.61.66-.73.79-.22.24.43-.46.6-.65.22-.24Z"/>
      <path class="st4" d="M77.14,427.72l-1.03,1.08-.27-.27,1.31-1.24c.03.2.06.35-.02.43Z"/>
      <path class="st4" d="M58.42,427.24l-1.51,1.55-.27-.26,1.82-1.75c.02.19.05.38-.03.47Z"/>
      <path class="st4" d="M78.65,425.7l-1.03,1.08-.27-.27,1.31-1.24c.03.2.06.35-.02.43Z"/>
      <path class="st4" d="M64.86,420.32l-5.89,5.89-.31-.2,6.36-6.33c.04-.08-.07.55-.16.64Z"/>
      <rect class="st4" x="78.53" y="423.3" width="3.22" height=".36" transform="translate(-276.02 180.77) rotate(-45.01)"/>
      <rect class="st4" x="19.32" y="761.9" width=".36" height=".36" transform="translate(-533.16 237) rotate(-45)"/>
      <rect class="st4" x="20.33" y="764.43" width=".36" height=".36" transform="translate(-534.65 238.45) rotate(-45)"/>
      <rect class="st4" x="30.44" y="766.95" width=".36" height=".36" transform="translate(-533.48 246.34) rotate(-45)"/>
      <rect class="st4" x="22.35" y="768.97" width=".36" height=".36" transform="translate(-537.27 241.21) rotate(-45)"/>
      <rect class="st4" x="22.86" y="769.99" width=".36" height=".36" transform="translate(-537.84 241.87) rotate(-45)"/>
      <rect class="st4" x="31.95" y="770.49" width=".36" height=".36" transform="translate(-535.53 248.45) rotate(-45)"/>
      <rect class="st4" x="23.36" y="771" width=".36" height=".36" transform="translate(-538.41 242.52) rotate(-45)"/>
      <rect class="st4" x="32.46" y="771.5" width=".36" height=".36" transform="translate(-536.1 249.1) rotate(-45)"/>
      <rect class="st4" x="23.87" y="772.01" width=".36" height=".36" transform="translate(-538.97 243.17) rotate(-45)"/>
      <rect class="st4" x="32.97" y="772.51" width=".36" height=".36" transform="translate(-536.67 249.75) rotate(-45)"/>
      <rect class="st4" x="24.37" y="773.02" width=".36" height=".36" transform="translate(-539.54 243.83) rotate(-45)"/>
      <rect class="st4" x="33.47" y="773.52" width=".36" height=".36" transform="translate(-537.23 250.41) rotate(-45)"/>
      <rect class="st4" x="24.88" y="774.03" width=".36" height=".36" transform="translate(-540.11 244.48) rotate(-45)"/>
      <rect class="st4" x="33.98" y="774.53" width=".36" height=".36" transform="translate(-537.8 251.06) rotate(-45)"/>
      <rect class="st4" x="25.38" y="775.04" width=".36" height=".36" transform="translate(-540.67 245.13) rotate(-45)"/>
      <rect class="st4" x="52.67" y="775.04" width=".36" height=".36" transform="translate(-532.68 264.43) rotate(-45)"/>
      <rect class="st4" x="34.48" y="775.54" width=".36" height=".36" transform="translate(-538.37 251.71) rotate(-45)"/>
      <rect class="st4" x="26.4" y="776.56" width=".36" height=".36" transform="translate(-541.45 246.29) rotate(-45)"/>
      <rect class="st4" x="34.99" y="776.56" width=".36" height=".36" transform="translate(-538.93 252.37) rotate(-45)"/>
      <rect class="st4" x="26.9" y="777.57" width=".36" height=".36" transform="translate(-542.02 246.94) rotate(-45)"/>
      <rect class="st4" x="35.49" y="777.57" width=".36" height=".36" transform="translate(-539.5 253.02) rotate(-45)"/>
      <rect class="st4" x="54.19" y="778.58" width=".36" height=".36" transform="translate(-534.74 266.54) rotate(-45)"/>
      <rect class="st4" x="36.5" y="779.08" width=".36" height=".36" transform="translate(-540.28 254.18) rotate(-45)"/>
      <rect class="st4" x="54.7" y="779.59" width=".36" height=".36" transform="translate(-535.31 267.19) rotate(-45)"/>
      <rect class="st4" x="37.01" y="780.09" width=".36" height=".36" transform="translate(-540.84 254.83) rotate(-45)"/>
      <rect class="st4" x="37.51" y="781.1" width=".36" height=".36" transform="translate(-541.41 255.48) rotate(-45)"/>
      <rect class="st4" x="38.52" y="782.62" width=".36" height=".36" transform="translate(-542.19 256.64) rotate(-45)"/>
      <path class="st4" d="M57.43,785.53c-.08-.13-.21-.45-.18-.4l.78.54s-.23.27-.3.35l-.3-.49Z"/>
      <rect class="st4" x="58.23" y="786.66" width=".36" height=".36" transform="translate(-539.27 271.76) rotate(-45)"/>
      <rect class="st4" x="58.74" y="787.67" width=".36" height=".36" transform="translate(-539.84 272.42) rotate(-45)"/>
      <polygon class="st4" points="59.27 789 59.56 788.74 60.08 789.23 59.79 789.49 59.27 789"/>
      <rect class="st4" x="60.25" y="790.2" width=".36" height=".36" transform="translate(-541.18 274.23) rotate(-45)"/>
      <g>
        <path class="st4" d="M319.64,688.05l-.08-1.52-.13-2.55-.2-2.84-.5-4.57-.41-3.21-.18-1.03-.83-4.49-.2-1.08-.18-.96-.18-.87-.5-2.12-.57-2.4-.48-2.03-.39-1.66-.26-1.11-.36-1.29-.49-1.52-.36-1.11-.49-1.53-.35-1.08-.27-.82-.65-1.83-.67-1.88-.41-1.1-.42-1.06-.74-1.84-.6-1.5-.26-.63-.63-1.41-.63-1.42-.94-2.12-.63-1.34-.51-1.03-.67-1.33-.51-1.01-.51-1.01-.51-1-.52-1.01-.35-.66-.54-1-.89-1.65-.51-.96-.86-1.65-.71-1.36-.52-1.01-.33-.61-2.04-3.57-.9-1.57-.37-.65-.56-.97-.56-.97-.53-.94-.57-.99-.35-.63-.75-1.34-.54-.96-.54-.97-.35-.62-.75-1.32-1.08-1.9-.74-1.31-.73-1.28-.53-.95-.74-1.32-.74-1.32-.71-1.27-.7-1.31-1.86-3.72-.47-.97-.66-1.43-.65-1.42-.48-1.04-.28-.66-.56-1.47-.72-1.87-.42-1.09-.38-1.07-.53-1.54-.37-1.07-.27-.86-.47-1.99-.39-1.65-.36-1.58-.27-1.3-.49-2.68-.17-1.09-.39-4.35-.02-5.31.53-6.11.47-3.14.31-1.72.29-1.55.49-2.63.5-2.53.38-1.71.28-1.2.36-1.54.42-1.81.28-1.19.36-1.55.31-1.32.28-1.18.37-1.55.5-2.13.57-2.41.49-2.09.37-1.57.59-2.51.57-2.42.3-1.3.58-2.87.97-4.84.2-1.06.34-1.83.48-2.56.19-1.14.37-2.71.75-6.43.39-11.11c.21-5.83-.74-11.47-2.11-17.02l-.5-2.03-.53-2.03-.53-2.04-.43-1.51-.72-2.3-.37-1.04-.59-1.53-.73-1.8-.45-1.06-.43-1.03-.65-1.55-.45-.92-.53-1.04-.7-1.37-.52-1.03-.52-.95-1.31-2.22-.93-1.55-.39-.65-.63-.86-1.11-1.51-1.97-2.47-3.58-4.11-1.96-1.99-4.1-3.6-2.5-1.99-2.01-1.41-2.26-1.42-1.25-.72-1.32-.72-.95-.52-1-.54-.98-.46-1.46-.63-1.43-.62-.98-.41-1.53-.59-1.83-.7-.7-.23-1.17-.34-1.32-.39-1-.28-1.68-.42-2.03-.51-2.06-.51-2-.42-3.43-.59-2.63-.46-2.72-.47-.08-1.75-.16-3.54-.14-2.86-.26-5.22-.37-7.59-.06-1.51-.34-7.91-.44-9.23-.05-1.11-.49-9.88-.29-5.71-.25-5.02h-1.44s.39,6.9.39,6.9l.04.69c0,.16-.71.38-.85.32-.17-.07-.59-.64-.6-.81l-.08-1.25-.04-.94-.16-4.36c0-.09-.76-.4-.75-.31l.26,7.4-3.1-.04-8.1-.11-1.55-.05c-.24,0-.85-.6-.86-.83l-.07-2.51-.12-4.29c-.34.19-.99.82-.98,1.11l.09,3.05.11,3.35-1.83-.1-1.32-.07-8.11-.17-2.34-.05-.15-5.81c0-.27-.34-1.1-.5-1.25-.13-.12-1,.36-.99.54l.08,1.55.04.9.03.73.04.94.04,1,.04.91c0,.07-.44.38-.51.39l-1.92.11-2.27-.02-1.42-.35-7.71-.03-.16-6.5c-.23-.05-1.47-.18-1.47.08l.02,1.49.05,4.39c0,.21-.87.47-1.08.47l-1.61.02-2.91.03-.93-.28-1.77.17c.17.31-.29-.51-.36-.65l-.02-1.71-.04-4.04-1.49.02c.11.21.46.82.46,1l-.09,2.99v8.1s0,2.03,0,2.03l.15,10.1.16,8.45.18,2.69.07,5.04.08,9.09.21,12.47.17,3.72.08,7.56.03,7.07.17,9.11.03,1.19.19,5.89.08,5.04.05,6.57.19,11.98.21,3.18.11,10.63v2.07c0,.14-.31.78-.47.76l-1.74-.12c-.18-.01-.74-.53-.74-.7l-.03-2.01-.09-5.08-.18-10.47-.2-2.67-.16-12.64-.12-7.92-.24-2.68-.14-15.17-.12-7.45-.12-2.68-.05-2.52-.07-6.57-.09-10.1-.05-4.54-.15-8.93-.24-2.71-.12-18.18-.16-8.96-.11-4.48c0-.13-1.07-.15-1.18-.14l.17,13.42.24,3.71.14,19.68.13,8.46.24,2.65.05,10.12v2.26s-2.51.03-2.51.03l-7.05.21-12.48.72-5.7.43-1.18.1c.09.11-.35-.33-.35-.42l.24-7.12.14-1.23.51-2.69.33-1.75.28-1.12.44-1.62.48-1.54.59-1.45.61-1.52.78-1.55,1.26-2.04c.87-1.41,2.92-3.23,4.35-3.61l1.94-.52,1.19-.32,1.56-.42,1.17-.32,1.69-.49.98-.42,1.06-.51,1.1-.54,3.37-2.96.72-1.03-.22,2.15-.15,1.47-.16,1.55c-.02.22.29,1.2.33.98l.27-1.5.25-1.44.41-3.09.64-3.15,1.39-15.87.33-6.74c.01-.27-.23-1.2-.42-1.14-.47.15-1.1.37-1.1.56l.03,2.52v1.05s-.4,6.28-.4,6.28l-.89,11.37-.13.71-.27,1.31c-.04.18-.28,1.15-.4,1.28l-3.41,3.91c-.13.15-.84.56-1.01.64l-.65.33-.66.34-1.06.46-1.86.58-1.12.32-1.77.44-2.04.51c-3.01.75-5.3,2.96-6.9,5.63l-.79,1.32-.5,1-.88,2.11-.61,1.48-.48,1.48-.41,1.61-.34,1.39-.22,1.05-.41,2.66-.46,5.03-.19,4.75-3.9.38-4.57.45-4.52.54-6.6.97-2.67.41-1.03.18-1.95.39-2.91.59-2.05.43-1.67.35-1.13.26-1.74.44-1.61.42-1.97.54-1.62.46-1.44.48-1.49.54-1.51.54-2.2.79-1.06.42-1.4.66-1.4.66-1,.48-1.34.67-1.33.68-1.39.71-.59.34-2.54,1.57-1.56.97-1.48,1.01-2.53,1.96-3.58,3.06c-2.45,2.1-4.66,4.47-6.65,6.97l-2.94,3.69-1.42,2-2.42,3.75-.75,1.26-.95,1.63-.48.93-.48,1.04-.81,1.76-.49,1.06-.61,1.33-.67,1.46-.71,1.74-.55,1.55-.54,1.52-.37,1.07-.72,2.31-.51,1.87-.51,2.12-.5,2.06-.42,2.01-.74,4.46-.29,2.14-.26,5.36.05,6.13.08,4,.13,1.22,1.01,7.26.49,3.01.49,2.68.31,1.51.27,1.21.48,2.2.47,2.02.5,2.04.5,2.03.5,2.03.51,2.01.52,2.01.43,1.61.66,2.39.32,1.16.43,1.54.33,1.17.33,1.22.54,2.01.53,2.01.43,1.63.51,1.94.51,2.01.52,2.11.48,1.94.51,2.1.59,2.46.21,1.1,1.55,12.17-.02,4.99-.26,3.1-.49,4.18-.52,2.98-.38,1.89-.23,1.04-.4,1.6-.58,1.96-.48,1.62-.48,1.47-.55,1.56-.39,1.05-.72,1.9-.56,1.43-.89,2.16-.6,1.39-.47,1.04-.95,2.1-.64,1.41-.47,1.03-.47,1.03-.64,1.39-.8,1.73-.65,1.41-.3.63-.51,1.04-.5,1.02-.5,1.01-.67,1.37-.5,1.02-.5,1.02-.48,1-.99,2.08-.49,1.02-.67,1.4-.49,1.01-.49,1.02-.49,1.02-.67,1.37-.5,1.01-.5,1.02-.5,1.01-.5,1.01-.51,1.02-.32.65-.51,1.02-.51,1.02-.47.98-.97,2.11-.47,1.03-.65,1.41-.62,1.38-.78,1.75-.63,1.41-.45,1.02-.93,2.11-.61,1.41-.9,2.13-.61,1.45-.72,1.79-.68,1.81-.55,1.46-.41,1.09-.55,1.5-.54,1.45-.56,1.52-.38,1.06-.51,1.53-.5,1.53-.5,1.52-.5,1.52-.41,1.23-.34,1.12-.77,2.7-.35,1.24-.33,1.18-.39,1.49-.47,2.07-.48,2.11-.47,2.05-.55,2.51-.47,2.52-.49,3.07-.63,3.9-.43,3.16-.69,10.44v10.67s.72,10.42.72,10.42l.49,3.57.51,3.01.49,2.55.32,1.67.24,1.15.43,1.84.47,1.92.55,2.13.53,1.87.35,1.14.48,1.55.48,1.52.5,1.57.5,1.42.6,1.53.57,1.43.87,2.14.61,1.51.42.94.52,1.06.5,1.02.67,1.39.49.98.52,1.01.53,1.02.52.95.57.95.77,1.28.95,1.53,1,1.55,1.01,1.47,1.74,2.4,1.28,1.65,3.06,3.56,7.58,7.57,3.56,3.04,1.97,1.51,3.6,2.55,1.47.96,1.6,1,.92.54,2.62,1.48,1.29.67,1.06.52.99.47,1.11.5,1.68.76,1.04.47,1.04.47,1.04.46,1.81.79,1.03.45,1.77.77,1.4.61,1.05.46,1.02.44,1.84.76,1.04.43,1.47.61,2.13.88,1.45.6,1.04.43,1.45.6,1.04.43,1.48.6,1.05.43,1.47.6,2.12.87,1.44.59,1.05.43,1.48.61,1.02.41,1.51.58,1.06.41,1.1.43,1.48.57,1.44.56,1.47.58,1.06.43,1.47.59,2.14.86,1.43.57,1.52.59,1.45.53,1.53.52,1.93.66,1.11.33,1.56.43,1.54.43,1.6.42,2.05.49,1.83.45,1.04.21,2.18.37,3.03.48,3.34.5,1.07.15,13.13.51,2.34-.1,2.24-.1,1.94-.09,5.13-.23,1.16-.08,5.23-.53,4.18-.42.85-.09,1.13,1.22c.11.12.91.54,1.09.59l1.55.43,1.99.4c2.23.45,4.91.32,6.99-.39l1.57-.53c.17-.06.98-.39,1.1-.51l2.06-1.86c.54-.48-.06-2.11,1.18-2.36l2.54-.5,2.59-.51,2.49-.53,2.04-.45,2.15-.48,2.39-.56,2.04-.51,4.04-1.02,1.63-.41,1.55-.4,1.14-.31,1.25-.36,1.61-.46,1.54-.44,1.06-.31,2.01-.59,1.15-.35,1.23-.38,1.54-.48,1.59-.49,1.9-.59,1.11-.36,1.53-.52,1.54-.52.65-.23,1.08-.39,1.19-.44,1.49-.55,1.49-.55,1.07-.4,1.09-.42,1.87-.71,1.08-.41.63-.25,1.13-.47,1.05-.43,1.5-.62,1-.44,1.04-.47,1.03-.46,1.07-.48,1.42-.64,1.34-.63,1.4-.69,1.01-.5,1.3-.66.7-.35.66-.33.64-.33,1.01-.55.97-.53,1.63-.9.98-.54,1.02-.56.88-.52.97-.61.62-.38.66-.41.57-.38,1.2-.82.6-.41.9-.61,1.23-.83,1.23-.84.85-.59,2.33-1.74,1.18-.88,1.09-.86,3.85-3.28,2.41-2.12,6.55-6.59,3.81-4.18.71-.88,1.57-2.02,1.32-1.7.63-.84.86-1.17,1.52-2.07.8-1.18.61-.94,1-1.54,1.01-1.56.55-.91.75-1.28.34-.6.75-1.35.55-1,.33-.59.34-.62.54-1.03.53-1,.54-1.04.32-.65.49-1.03.5-1.05.28-.64.34-.77.46-1.05.29-.66.64-1.5.41-.99.44-1.11.28-.74.56-1.52.39-1.06.42-1.15.36-1.02.51-1.55.36-1.11.39-1.21.39-1.2.29-1,1.45-5.71.57-2.41.3-1.42.22-1.09.37-1.84.21-1.13.35-2.2.45-2.86.14-1.04.4-4.22.3-3.87.1-1.51.13-2.68v-6.8s-.11-2.66-.11-2.66ZM218.67,415.56l.53,10.8-1.52.07-.53-10.8,1.52-.07ZM220.82,506.29l.1,5.89.06,3.51.17,1.03.14,2.88-.12,1.27-.5-1.5-.26-1.11-.45-1.57-.58-1.49-.51-1.49-.63-1.43-.78-1.66-.49-1.03-.59-.97-.76-1.31-1.06-1.5-1.64-2.2-3.78-3.92-2.38-1.75-1.9-1.4-.08-3.05-.19-6.2,1.63.62,1.26.78.92.57,2.37,1.69,1.5,1.01,1.02.55,1.95.68,1.09.24,1.69.35,2.08,1.49.02,1.27.23,4.52v4.14s.47,1.09.47,1.09ZM225.89,611.99l.12,8,.43,1.56v9.65c0,.09.35.76.49,1.02l.02,9.64.43,1.56.12,9.6.24,1.23v2.28s-1.29.21-1.29.21l-1.59.26-2.82.46-1.16.19-1,.16-1.16.19-2.74.41-1.13.16-2.42.33-1.21.16v-2.88s0-1.83,0-1.83c0-.09-.37-.55-.44-.64l.02-12.71-.45-1.37-.12-12.33-.43-1.38-.04-13.02c-.11-.14-.48-1.11-.48-1.38v-11.63c.01-.09-.41-.84-.47-.95l-.06-13.32c-.19-.31-.52-.94-.51-1.15l.09-2.08.15-3.35c.02-.53,1.42-1.24,1.84-1.55l2.05-1.55c2.9-2.19,5.38-4.73,7.54-7.64l1.28-1.71,1.07-1.49,1.04-1.45.26,4.53.31,1.46.12,10c.12.25.44.91.44,1.01l.08,9.54.44,1.56.02,8.61c.14.26.49.92.49,1.01v9.64c0,.09.34.77.45.99ZM245.02,656.56l3.52-.55,1.1-.08.06,2.79-.06,3.68.55,1.04v9.99s.48,1.14.48,1.14l.08,12.8c.16.29.46.95.46,1.17l.05,2.59-.67.92-1.8.16-2.6.56-2.94.53-2.17.39-1.15.27-2.23.34-2.18.29-.13-1.99-.28-1.15-.15-6.46-.15-3.02c-.01-.23-.61-.9-.77-1.02l-2.22-1.79-.1-1.21.19-1.01.58-1.53.48-1.13c.28-.66.35-2.26.35-2.97l-.05-.75.05-1.16c.27-.29.86-.94.94-1.1.88-1.8-1.11-2.47-1.22-4.43l-.19-3.41-.54-.99-1.02-.53,1.37-.4,1.86-.37,1.18-.23,1.85-.2c.22-.02.93-.24,1.17-.33l3.24-.26,3.03-.53ZM242.46,655.26h2.34l-1.17.68-1.17-.68ZM234.44,696.95l-4.75.79.12-1.51.17-2.1-.37-1.29-.26-5.55-.29-1.26-.21-1.53-.16-1.12c-.02-.15.49-.35.69-.39l1.29-.26,1.85-.38.77-.15c.15-.03.56.28.57.43l.08,1.95.22,5.23.29,1.26-.02,1.48v4.41ZM227.25,697.86c-.02.35-1.35.41-1.7.47l-2.96.53-2.58.46-3.04.54-2.46.44c-.18.03-1.4.35-1.41.17l-.19-2.31c-.19-2.26-.47-3.46-.46-3.28l-.31-4.58-.38-1.24-.37-2.02c-.04-.21.02-1.18.22-1.22l1.68-.33,1.55-.29,2.37-.37,1.13-.17,5.09-.77,1.6-.24c.25-.04,1.13-.24,1.22,0,.15.38.6,1.56.61,1.96l.16,4.87.43,1.15.06,2.55-.25,3.69ZM227.3,699.64l-1.02.33-1.68.41-1.19.29-1.2.29-1.33.29-1.18.23-2.35.29-1.57.2-2.02.25c-.2.02-.94-.24-1.09-.31l1.65-.31,1.17-.22,2.66-.37.72-.28,1.48-.14.72-.25,2.16-.41,1.21-.23,1.33-.27,1.46-.4.07.6ZM210.99,696.93l-.42-2.65-.3-1.22-.36-1.18-.16-3.31-.07-1.5c0-.18-.3-.91-.4-1.07l-.59-.91-.53-.8.35-.28.88.86-.51-1.97c-.41.16.41-.44.49-.29.14.27.54,1.05.56,1.27l.23,2.14.26,2.36.29.74c.08.21.46.92.47,1.14l.15,4.23c0,.09.29.54.48.85l-.09,5.56-.68,1.24c-.1.19-.33-.79-.23-.95l.41-.7.06-2.34-.29-1.23ZM176.85,701.46l-.39-1.29-.14-1.5-.31-1.11-.28-3.28-.23-1.19-.27-1.36c-.04-.22-.4-.77-.55-.93l-1.04-1.1c-.18-.19-.15-1.09.03-1.25l.63-.54c.02.51,0,1.15.1,1.24l1.35,1.46-.09-1.19-.09-1.32c-.02-.22.45.59.52.8l.36,1.13-.49,1.05.26,1.19.37,2.64.24.77.33,2.29.17,1.15.24,2.36.36.85.02,4.73-.54.66-.87,1.07.37-1.31-.05-6.02ZM168.91,704.04l-.14-6.39-.07-3.39-.21-1.18.76-.54,1.29-.13,2.34-.46.79-.15c.23-.05.54.56.58.81l.34,2.33.37,2.72.45.94.06,2.4.54,1.05-.1,1.65.22,1.37.04,1.37-.74,1.02-2.88.51-3.28.58.05-3.47-.4-1.02ZM168.14,708.37l-2.03-.42-1.48-.96.11-2.97-.44-.45-.04-8.95-.16-1.71-.23-4.37-.12-6.05-.26-2.76.03-1.24-.24-4.59-.18-3.48c-.06-.13-.05-.94.16-.88l1.01.27,1.31.33.93,1v1.41s.18,2.39.18,2.39l-1.28.16s-.91.7-1.1.95c-.8,1.05.19,3.06,1.23,3.54l1.19.55-.1,5-.93.85-.63,1.34c-.09.19-.28,1.01-.28,1.22l.05,1.5c.02.67.57,1.52,1.41,2.06l1.16.76.35,4.3.12,6.88.55,1.02-.32,1.65.03,1.66ZM139,688.32c0-.11-.37-.85-.43-.93l-.14-11.87-.24-2.55,1.7-.24,3.54-.51,3.2-.46,1.06-.18,1.95-.31,1.17-.19,2.37-.35,1.18-.17,3.67-.41,1.18-.2,1.56-.27.75-.13c.16-.03.55.29.55.43l.07,1.85.06,1.63.19,4.85.29,1.43.16,8.7.12,2.46.18,3.3.26,7.67.36,1.35-.03,1.51-.04,2.06c0,.19-.52.6-.7.63l-1.23.22-1.41.26-2.61.49-2.94.55-2.14.4-1.15.21-2.75.47-1.16.2-1.4.24-1.12.18-4.07.64c-.27.04-1.35.17-1.35-.08l-.06-2.53-.11-7.33-.42-1.55-.07-11.48ZM139.05,711.24l-1.79.07-1.61-38.75,1.79-.07,1.61,38.75ZM144.75,670.26l1.59.14.9.31-2.45.26-.04-.71ZM175.11,576.4l-.15-8.71,1.46.52.97.61,1.02.5,1.06.51.97.43,1.59.53,1.41.4,2.21.51,4.84.24.25,7.06.14,4.62-7.03-.46-2.48-.51-1.37-.39-1.09-.27-1.51-.58-1.3-.39-1.01-1.26.08-1.86-.06-1.47ZM174.79,561.5l-.06-3.81c0-.19.07-.64.16-.99-.08-.44-.12-.89-.11-1.34-.12-.14-.21-.28-.21-.36l-.08-5.78s0-.03.01-.05c-.08-.56-.09-1.12-.03-1.68l-.12-3-.05-1.48-.12-3.89-.06-1.86-.04-1.33-.12-4.05-.1-3.55-.04-1.54c0-.24.13-1.1.24-1.33l.09-.19c-.04-.21-.07-.42-.08-.64-.14-.13-.27-.32-.27-.38v-2.96s-.05-1.64-.05-1.64l-.21-4.8c0-.06.04-.21.09-.38-.14-.35-.16-.76-.05-1.13-.29-1-.33-2.08-.1-3.1l.02-.94.04-.04c0-.22,0-.43,0-.65h0s-.22-1.48-.22-1.48c-.04-.25-.04-1.63.14-1.81l.04-.04c-.12-.33-.18-.68-.19-1.04,0,0,0,0,0,0l-.17-2c-.01-.17-.03-.84.07-.92l2.2-1.71,1.19-.85,1.3-.83.89-.54.99-.53,1.23-.32c-.06-.28.52-.2.52-.2.47-.32,1.7-.88,2.29-1.01l2.12-.5,1.9-.33c.25-.04.28,1.3.27,1.56l-.05,1.49-.07,2.37c0,.14-.27.5-.22.63.08.21.33.77.35.99l.17,1.91c.03.34.08,1.32-.1,1.71.05.37.07.75.06,1.12.16-.05.26-.06.16-.02l.06,3.38c.03,1.48-.33,1.69-.25,1.94.07.22.36.9.37,1.16l.13,3.77.03,1.11v1s.12,2.17.12,2.17l.06,1.5.33,10.47.03.79.09,2.39.06,1.55.11,2.93c.05,1.34-.41,1.56-.27,1.96.07.21.38.94.39,1.16l.07,2.9.02.96.03,1.12.12,4.94c0,.06-.06.19-.13.34.19.7.27,1.44.21,2.17v.27s.18,3.86.18,3.86c0,0,0,.03-.01.04.17.57.19,1.19.05,1.78l.08,1.67-.03,1.43c.18.54.22,1.13.12,1.69.03.04.05.08.05.11l.02,3.61-3.33.04c-.12,0-.36-.09-.58-.21-.22.05-.45.07-.69.07-.5,0-.94-.11-1.31-.28-.09,0-.19,0-.25-.02l-1.38-.33c-.07-.02-.13-.17-.16-.33-.31-.13-.59-.28-.86-.45-.45.15-1.1.2-1.39.04l-1.5-.76-.58-.29c-.84-.24-1.53-.66-2.09-1.21-.63-.1-1.51-.73-1.5-1.86v-1.07c-.13-.74-.13-1.51,0-2.25ZM169.92,415.93l.07,11.32-9.33.06-.07-11.32,9.33-.06ZM161.01,413.74c-.03-.35,1.27-.56,1.68-.56h1.58s3.08-.03,3.08-.03h1.53c.18,0,1.02.42.98.57-.11.54-.39,1.46-.59,1.46l-4.88.04h-2.13c-.23.02-1.12-.01-1.14-.2l-.12-1.27ZM170.06,427.63l.05,2.25-8.79.21-.05-2.25,8.79-.21ZM160.87,430.84h2.91s3.54-.02,3.54-.02l2.18-.09.61.59.04,2.06.02,1.7.1,5.64-2.45.17h-4.04s-2.74.11-2.74.11l-.23-2.62-.03-5.04.1-2.5ZM170.39,443.58l-2.59.29-4.04.1-2.43-.43.14-1.71,1.89.03,1.11-.41,3.34.04,2.46.16.12,1.92ZM163.79,444.53l4.03-.08,2.5.08.08,3.45.15,6.13-3.25.03h-1.27s-1.13.57-1.13.57l-1.59-.38-2.05.17-.13-9.9,2.66-.07ZM170.61,454.91l.05,2.12-9.02.22-.05-2.12,9.02-.22ZM161.3,458.01c0-.1.34-.09.52-.08l2.53.13,1.79-.14c.22-.02.95-.31,1.18-.29l1.5.07c.33.02,1.82.21,1.83.55l.18,6.84.17,6.6c0,.32-.2,1.35-.46,1.37l-8,.39c-.32.02-.98.1-.99-.03l-.24-2.66-.05-10.65.04-2.1ZM170.77,400.33l3.13.12,8.06.02,3.14-.2.07,2.6.26,2.7.07,3.74-.14,2.9-2.88-.08h-7.91c-.34.15-.83.36-.9.4l-2.6-.21-.3-11.99ZM170.73,399.48v-2.02h14.35v2.02h-14.35ZM199.21,372.5l.53,1.1-.14,3.92v2.65s-2.46.1-2.46.1l-8.56-.04-2.71-.29-.26-2.72-.04-3.51.03-4.04-.18-3.56h2.63s8.57.05,8.57.05l2.6.29-.03,2.71.03,3.33ZM214.28,373.71l.11,3.03.12,2.06.07,1.64-2.79-.15-8.59-.03-2.48-.06-.14-2.95.22-1.68-.61-1.02-.02-5.88-.04-2.24,1.21-.04,1.86.23h7.57s3.05-.03,3.05-.03l.3,1.25-.02.81.18,5.08ZM204.2,504.63l.25,2.3.22,1.22-.08,1.53c-.02.36.07,1.61-.17,1.86l-.25.26c.04.23.07.47.08.71l.32-.31.09,4.41c0,.1-.12.29-.28.49.05.24.09.48.12.73l.06-.05.16,1,.34,2.11.1,1.94-.17,2.95c.24.6.3,1.28.17,1.92l.13,2.74.13,1.32.2,1.02-.08.08c.11.45.13.93.05,1.39l.11.66-.07,1.54-.09,1.86c0,.05-.04.13-.09.22.03.35.02.71,0,1.06l.27-.16.15,4.66.05,1.01.09.98.15,1.54c.03.32.03,1.32-.16,1.7.02.28,0,.57-.05.85l.11-.11.25,2.6c.02.17-.05.44-.15.72.02.27.01.53-.03.79.07.29.11.58.11.87l.16,1.01.2,1.17.13,2c0,.09-.08.33-.18.57.06.39.05.79-.02,1.17.07,0,.13-.01.1,0l.04,2.31c0,.3-.41,1.16-.65,1.33l-2.32,1.62-1.5.95-1.38.77-1.11.42-1.51.53-2.2.77-1.27.34-2.25.41c-.15.03-.27-.35-.29-.64-.38-.37-.52-.93-.42-1.45l-.02-2.97c0-.28.18-1.37.17-1.32-.14-.43-.35-1.02-.35-1.24l-.03-1.6.22-1.75c-.08-.39-.1-.8-.04-1.19-.14-.24-.24-.51-.24-.64l-.16-4.18c.05-.46.08-.73.24-.77l-.27-.97-.15-3.62-.06-1.49-.18-5.58-.04-1.15-.05-1.36-.06-1.5-.24-6.59-.19-5.39-.12-2.73-.03-1.5.02-3.29c0-.07.06-.24.14-.41-.06-.19-.1-.4-.13-.6-.11-.14-.2-.31-.2-.38l-.14-6.83-.09-4.61-.02-.82-.13-1.24-.1-3.05-.05-1.49-.12-3.72,2.73.07,2.06.06,2.09.31,2.06.59,1.9.57,1.42.56,1.1.5c.32.15,1.24.85,1.26,1.2l.19,3.81c.01.24-.18,1.16-.24,1.39l-.18.57c0,.16.42.56.44.67ZM220.61,530.26c.08.22.4.96.39,1.19l-.18,3.91-.52,3.63-.36,1.94-.45,2.08-.33,1.29-.38,1.26-.36,1.01-.58,1.48-.59,1.49-.28.67-.48,1-.68,1.42-.7,1.26-.78,1.23-.99,1.55-1.03,1.5-4.32,4.81-.49-2.2c-.03-.13-.08-.41-.05-.46l.2-.38c-.25-.44-.28-1.01-.08-1.48-.16-.09-.27-.19-.27-.25l.11-1.6-.04-2.94c0-.08.09-.28.2-.48-.07-.22-.08-.45-.06-.67-.03-.08-.06-.15-.08-.23l-.08.08-.19-3.23c0-.05.07-.2.16-.37-.1-.31-.15-.64-.17-.97l-.21.17-.02-1.38v-1.61c0-.19.11-.69.24-1.04,0-.06,0-.11,0-.17-.1-.35-.15-.71-.13-1.08-.12-.08-.2-.17-.2-.24l-.07-4.5-.16-2.04-.16-1.08c-.05-.37-.42-1.86-.15-2.13l.14-.14c-.03-.19-.05-.39-.05-.58l-.03.03-.12-3.68-.07-2.12.13-.13c-.07-.34-.09-.68-.06-1.02-.03,0-.07,0-.07-.03l-.14-1.07-.16-1.29-.02-2.47c-.01-1.75-.07-2.69.19-3.5-.03-.42-.01-.84.04-1.25l-.18.17c-.44-1.63-.46-2.82-.19-3.8-.11-.48-.12-.98-.02-1.46l-.17.15-.17-1.44-.05-2.47.08-3.77c0-.06.04-.17.08-.28-.25-.35-.35-.81-.27-1.24-.05-.12-.09-.22-.08-.28l.09-2.55,1.53,1.06c.09.06.2.21.29.38.38.07.66.26.85.52.2.1.37.25.49.42.06.03.11.06.14.09l2.69,2.71,1.17,1.32,1.13,1.47.8,1.13,1.03,1.65.68,1.24.51,1.04.54,1.08.41.94.43,1.08.6,1.52.51,1.48.47,1.66.3,1.07.3,1.31.31,2.17.19,1.38.36,2.63c.23,1.67-.44,2.05-.31,2.43ZM222.39,544.03l.03,1.47v1.73s.41.99.41.99l.16,6.39.09,3.43.09,3.37c0,.19-.45.78-.56.95l-.99,1.55-.85,1.33-.97,1.39-5.82,6.37-2.68,2.29-1.74,1.36-1.34.78-.04-3.72-.37-1.51v-3.43s-.17-3.76-.17-3.76l2.71-2.74,1.4-1.53,2.09-2.64.97-1.43,1-1.56.71-1.34,1.18-2.33.66-1.38.76-1.82.5-1.53.38-1.16.35-1.06.44-1.52.42-2.14.24-1.39.09-1.21.64-1.37v1.07s.16,6.08.16,6.08ZM209.74,636.65l.03,11,.46,1.14.08,8.41.02,1.96-1.41.27-2.19.42-1.14.22-2.22.28c-.19.1-.64.35-.74.35l-2.75.16c-.38.13-1,.34-1.22.36l-1.72.17-2.22.22-.14-4.41-.14-4.38-.26-2.72.04-3.01-.27-11.45-.28-2.73.05-2.5-.28-11.45-.25-2.75.09-1.48-.39-12.45-.07-2.22-.07-1.51-.4-14.09,2.12-.24,2.12-.41,1.53-.43,1.08-.3,1.3-.36,1.07-.45,2.14-.85,1-.54,1-.55,1.56-.69.11,3.14c0,.09.25.57.35.76v13.04s.48,1.24.48,1.24l.03,10.62c0,.32.34,1.24.45,1.4l.1,13.32c.1.16.46,1.11.46,1.39l-.02,10.69c0,.28.37,1.22.48,1.38ZM232.26,681.08c.18.11-.5.36-.72.39l-1.96.26c-.31.04-1.16.22-1.31-.04l-.92-1.65c-.06-.1-.14-.63-.11-.75l.51-2.58c.05-.26.83-.78,1.1-.82l1.25-.17.23-.11.95-.03c-.22,0-1.62,3.84.96,5.5ZM227.75,683.48l.38,1.09-.55,1.08-.15-1.91.32-.27ZM227.18,683.5l-.22-.56-.38-.66-.58-1.16.78-.15.56,1.2.13,1.06-.29.26ZM227.72,673.2l-.23,1.3c-.07.39-.6,1.24-.97,1.28l-2.12.21-1.16.21-2.43.45c.06.04.89.34,1.1.31l1.86-.24,1.14-.15,2.03-.26-.32,1.77-.33,1.2c-.07.27-1.02.92-1.01,1.2l.1,1.91-1.79.3-3.04.51-2.19.37-1.45.24-2.5.37-2.14.32c-.22.03-.99-.21-1.08-.41l-1.22-2.65c-.15-.32.03-1.52.14-2.03.05-.24.8-.59,1.04-.63l1.14-.19,1.53-.25,1.17-.2,2.73-.46,1.18-.22,1.46-.27c.21-.04-.73-.26-.95-.26h-1.02s-.73.34-.73.34l-3.14.34-1.18.19-1.9.29-1,.15.23-.95.49-2.05.39-1.66c.08-.35,1.23-.36,1.59-.43l1.17-.22,2.12-.4,1.92-.36.7-.12,1.84-.3,1.16-.18,2.75-.42,1.13-.17,2.26-.35-.46,2.55ZM208.58,678.98c.84.11.61,1.13-.03,1.85l-1.42,1.58c-.89.99,1.27,2.71-.81,3.1l-1.66.31-2.33.44-1.13.18-1.85.25-.73.27-2.32.22-1.47.14-.57-2.28-.74-1.04-.18-1.21c-.03-.23.22-1.06.45-1.11l1.34-.28c.14-.03.65-.47.52-.4l-1.02-.23c-.58-.06-1.09-.1-.74-.07l.41-2.25.21-1.14c.07-.39.67-1.24,1.05-1.3l1.93-.29,2.63-.45,2.07-.35,1.19-.2,3.22-.52,3.03-.49c.13-.02.82-.01.79.12l-.48,2.21-.57,2.35c-.06.24-1.35.14-.8.59ZM208.36,683.69l-.42.33-.11-1.25.52.91ZM191.66,686.24l-.34.29-.99-1.01.99-1.01.25.25-.42.47.51,1.02ZM191.84,686.52l.24.77c.03.08-.04.11-.25.24l-.25-.77c-.03-.08.04-.11.26-.24ZM189.97,686.49l.5,1.46c.08.24-1.09.22-1.34.26l-3.43.53-2.19.34-1.21.31-2.7.34-2.04.26c.36-.05-1.57-2.94-1.56-3.02l.18-2.12c.02-.19.58-.66.76-.68l1.97-.29,1.19-.17,2.4-.35,1.14-.17,2.75-.43,1.14-.17,1-.14,1.11-.15.29-.1,2.22-.2c-.6,1.52-3.2,1.54-2.18,4.48ZM175.54,678.1l-2.6.43-1.22.2-1.33.16-2.25.18c-.8.06-2.32-.53-2.57-.9l-.62-.9c-.14-.2.58-.94.83-.97l4.39-.55,3.2-.47,1.56-.23,1.29-.19-.02,2.53c0,.14-.49.68-.65.71ZM175.96,679.2l-.4,1.96-.56,2.35c-.05.23-.91.6-.96.58l-1.17.28-1.57.07-1.38.36-2.13.3-.02-3.7.27-1.21,3.43-.29.83-.52,1.58.14,1.2-.35.88.02ZM167.49,670.42l1.69-.25,2.69-.38,1.18-.17,2.92-.42.19,3.69c.06.01-.18.78-.4.81l-2.2.38-2.84.49-2.89.42-.21-1.44-.13-3.12ZM191.63,681.38l-1.97.24-.49.07-1.14.19-1.87.32-1.16.2-1.01.17-1.17.2-3.19.41-1.23.16-1.61.21c-.12.02-.1-.52-.06-.72l.54-2.94c.05-.29.75-1.12,1.02-1.16l3.48-.52,3.1-.49,3.03-.48,3.04-.48,2.35-.37-.37,2.03-.3,1.64c-.07.37-.59,1.26-.97,1.31ZM192.6,665.41l-1.58.23-2.29.33-.75.23-2.31.3-1.15.17-2.41.37-2.63.4-1.76.27c-.26.04-.41-1.22-.37-1.51.03-.26.69-.93.96-.97l1.68-.24,1.97-.29,1.16-.17,3.24-.46,1.15-.19,1.88-.31,1.15-.19,1.5-.24.78-.13c.15-.02.53.21.54.37l.09,1.47c.01.17-.68.54-.88.57ZM193.56,666.43l.11,3.46c0,.28-.63,1.09-.92,1.14l-3.1.5-2.14.35-1.18.2-6.26.94-2.53.38v-4.31c0-.24,1.02-.38,1.29-.42l3.45-.56,2.21-.36,1.17-.19,2.32-.37,1.09-.28,2.32-.25,2.16-.23ZM190.71,675.6l-3.01.5-9.24,1.55c.03.14-.87-.31-.87-.47v-2.58s2.21-.38,2.21-.38l2.18-.28,1.68-.31,2.7-.44,5.7-.93,1.66-.27-.11,3.13-2.9.49ZM210.56,672.2c0,.2-.75.35-.96.38l-3.2.52-2.66.43-1.54.25-1.86.3-3.05.49-2.24.36-.06-2.16c0-.29.61-1.09.91-1.14l2.21-.37,1.19-.2,1.9-.31,1.17-.19,2.67-.39.76-.23,2.34-.27,2.54-.3-.09,2.82ZM208.39,668.57l-2.15.35-1.18.19-2.35.38-.72.18-2.65.38-1.19.18-2.24.34c-.2.03-.87-.06-.87-.2l-.12-2.86-.06-1.33,1.78-.29,1.84-.3,2.19-.37,1.14-.19,1.89-.32,1.17-.19,2.74-.41,2.93-.44.1,4.55-2.26.36ZM210.17,662.59l-1.84.31-1.17.19-2.26.38-.73.19-2.3.33-1.17.16-2.26.32-2.84.41c-.18.03-.93-.31-.92-.52l.07-1.59,2.41-.38,1.49-.24,1.15-.18,1.88-.31,1.16-.19,2.73-.4,1.16-.17,2.04-.3c.36-.05,1.51-.35,1.58,0l.22,1.17c.03.17-.22.77-.4.8ZM192.27,583.23l-.33-10.37c-.01-.37.65-1.2.95-1.25l2.62-.51,1.96-.5,1.09-.41,2.12-.93,1.04-.46.99-.54,2.73-1.79,1.29-.84.18,3.59.26,1.31.04,4.31.03,2.98c0,.19-.63.7-.8.8l-.93.52-1.36.76-1.32.65-1.7.75-1.11.39-1.58.47-1.4.35-1.96.46-1.44.25h-1.36ZM173.25,558.49l.1,4.65c0,.36-.27,1.29-.46,1.11l-2.62-2.42-.59-.85-.73-.91-1.37-1.69-.96-1.41-.63-1.01-.52-.94-.85-1.6-.73-1.38-.44-.98-.4-1.13-.56-1.51-.45-1.21-.36-1.08-.21-1.26-.3-.86-.57-2.87-.33-2.17-.18-1.51-.14-2.41-.04-.76-.12-1.9.02-1.51.28-2.66.1-.42c-.21-.74-.17-1.55.13-2.25l.31-1.34.4-1.77.3-1.13.44-1.57.44-1.57.57-1.41.69-1.39.43-1.1.38-1.08.5-1.02.56-1.04.71-1.24.83-1.34,1-1.42,2.16-2.78,1-1.11.73-.57.02,3.03c.08.22.12.45.1.68.07.33.04.69-.09,1,.18.75.37,2.04.08,2.34l-.07.07c.15.42.2.88.18,1.32,0,0,.01,0,.01.01v3.53s-.03.08-.07.14c.05.18.07.38.06.57.05.23.06.46.01.69.09.11.17.21.17.26l.04,5.21c0,.07-.06.23-.14.4.05.3.05.61.01.91l.13-.13.15,2.56-.25,1.24c-.04.18.21.88.22,1.07l.23,4.59.04,1.35.02,1.1.07,3.58c0,.09-.09.31-.2.53.02.3.02.59,0,.89l.21-.21.17,3.1.08,1.54c0,.14-.03.33-.1.55,0,.48-.05.97-.16,1.43l.15-.15.22,3.75-.08.08c.04.36.02.73-.05,1.09.05,0,.09.02.09.05l.08,1.49c.05.84.13,2.14.1,3.3.43.87.44,1.94.05,2.82ZM186.39,441.3l.02,2.11-14.66.15-.02-2.11,14.66-.15ZM171.67,437.03l-.04-1.68-.12-1.44.05-3.18,2.83.03,4.4.05.56-.57,4.16.15,2.55.19.14,6.13.13,3.69h-10.46s-.96.4-.96.4l-3.18-.18-.07-3.59ZM199.64,440.38l-9.57.03-2.36-.09-.15-4.96-.15-4.78,2.67-.25,11.41-.05.14,2.53.2,7.17-2.19.4ZM201.92,441.02l.03,1.93h-2.79s-6.93,0-6.93,0l-.61.67-2-.45-1.83.09-.11-1.87,1.37-.04,1.53-.08,1.66.3,1.03-.64,6.37.02,2.27.07ZM172.12,454.97l1.72-.08,1.13-.3,8.52-.02h3.25s.07,1.76.07,1.76l-1.27.19-1.54.04-7.92.07-.97.37-3.01-.2.03-1.84ZM172.02,454.03l-.1-6.54-.09-3.07h3.06s4.16.11,4.16.11l1.1-.55,3.82.03,2.43.17.26,9.35-3.19.47-9.08.09-2.38-.05ZM173.38,457.74l1.52-.11,8.58-.09,3.32-.25.26,8.96.14,4.89c0,.28-.44,1.13-.67,1.14l-2.96.11-1.61.14-6.05.19-3.4.11-.32-13.06-.08-1.95,1.27-.09ZM187.29,473.61l.3,9.14-1.44.3-2.84.6-1.2.32-1.81.59-1.25.43-2.15.9-1,.48-1.36.72-1.08.57c-.13.07-.61-.24-.62-.45l-.17-8.13-.1-4.79,14.72-.69ZM201.19,429.39l-3.01-.03-2.86-.03-.84.52-4.34-.16-2.87-.11.04-1.94,2.71-.02,1.35-.28,7.19.02,2.47.07c.65.02.49,1.97.16,1.96ZM198.64,426.75l-9.08.02-2.21-.03-.24-2.51.02-2.01-.2-6.21,2.65-.32,8.55-.02,2.78.16.22,2.35.06,6.57.05,1.74-2.61.25ZM200.5,414.97l-2.36.09-8.58.04-2.58-.04-.14-1.96h3.24s7.53-.01,7.53-.01l2.19-.16c.3-.02,1.03.71,1.22,1.08.08.15-.4.95-.54.95ZM190.05,412.15l-3.21.03-.24-2.6-.07-4.01-.1-5.26,3.14.16h7.56s3.21-.19,3.21-.19l.28,2.76.1,5.54v3.49s-10.66.09-10.66.09ZM200.3,399.48h-13.9v-2.02h13.9v2.02ZM173.07,494.41l-.04-4.75c0-.28.84-.92,1.09-1.05l.95-.49,1.01-.52,1.01-.51,1.01-.45,1.9-.75,1.38-.48,1.62-.46,1.22-.3,2.74-.56c.2-.04.69.56.7.8l.17,3.95.05,1.6.03,2.38c0,.18-.75.4-.92.44l-1.46.34-1.56.38-1.56.39-1.46.56-1.4.7-.98.5-1.01.53-1,.52-.99.65-2.2,1.72-.18-1.35-.09-2.21-.03-1.58ZM187.84,445.98l-.04-1.03c0-.17.14-.89.31-.89l2.42-.05,8.65-.13,2.53-.04c.2,0,.39.84.39,1.05l.03,1.55.13,6.64-2.01.14-1.34.27-8.26.05h-2.55s-.26-7.57-.26-7.57ZM188.17,454.54l2.36-.12,1.38-.31,7.67-.02,2.55.03c.38,0,.37,1.88,0,1.88l-1.97.03-5.8.08-1.47.32-2.25.04-2.5-.09.04-1.85ZM190.57,457.2l8.6-.2,2.34-.06c.13,0,.9-.14.91-.03l.19,2.67.16,8.63.21,2.46c.01.17-.51.78-.73.79l-8.15.44-5.39.29-.35-10.89-.13-4.02,2.35-.08ZM197.99,473.06l4.99-.27.19,2.5.06,7.07.18,1.36.09,1.53-.93-.18-1.34-.56-1.35-.36-1.24-.33-1.58-.43-4.91-.7-1.59.12-1.52-.06-.21-5.76-.07-3.41,9.22-.5ZM192.07,483.91l2.68.29,3.05.49,2.39.66,1.48.58,1.14.4.71.63.14,2.99.12,2.5.18,3.76-1.74-.76-2.13-.86-1.58-.53-1.91-.49-3.98-.65-3.28.15-.16-2.64v-1.48s-.04-4.88-.04-4.88l2.94-.16ZM203.74,468.7l-.06-8.57-.24-1.2v-1.99s2.31-.3,2.31-.3l9.6-.08,2.56-.08c.21,0,.4.85.41,1.09l.16,4.07.12,1.36.27,7.59-6.41.33-8.45.43-.27-2.65ZM215.32,455.6l-3.33.02-1.12.52-5.15-.11-2.34-.05-.03-1.9,2.89-.09,2.18.18,1.03-.59h6.38s2.36.08,2.36.08l.04,1.93-2.91.02ZM217.42,452.76l-1.81.23-8.78.08-3.52.03-.19-5.66-.09-1.81-.09-1.8,2.32-.31,10.04-.05h2.37s.35,6.04.35,6.04l.06,1.06.09,1.5c0,.17-.59.67-.77.7ZM214.13,442.87l-8.9.09-2.3-.07-.11-1.88,2.4-.06,9.07-.07,3.3-.26.03,1.86-3.5.4ZM216.34,439.86l-1.5.02-9.11.07-2.97.02-.05-3.1-.03-3.53-.2-1.36v-1.7s2.76,0,2.76,0h7.91c.42-.18.99-.43.95-.42l2.99.32.4,9c0,.21-.92.67-1.15.67ZM202.29,429.39l-.02-2.1,14.72-.12.02,2.1-14.72.12ZM214.06,426.34l-2.55-.03-1.15.53-5.64-.15-2.43-.18-.07-2.26-.08-5.55-.26-2.89,2.33-.14,9.59.02h2.5s.3,2.93.3,2.93l.05,1.52.21,6.24-2.81-.03ZM216.14,414.83l-2.84-.11-3.65-.16-1.09.57-4.31-.05-2.37-.26v-1.9s2.86.12,2.86.12l1.83.1.6-.56,6.63.11,2.14.25c-.13-.29.36.56.34.73l-.14,1.17ZM213.81,412.07l-12.01.05-.08-2.55-.17-5.91-.08-1.18-.11-1.89c-.02-.27,1.03-.23,1.3-.22l1.63.1,8.51-.04,2.78-.02.26,6.14.08,1.5.1,1.54.16,2.46h-2.36ZM215.59,399.48h-14.29v-2.02h14.29v2.02ZM215.14,396.59l-2.13.35-9.27-.02-2.13-.3-.39-.6-.03-2.61-.05-4.87-.62-1.06.37-1.62-.07-1.92,2.38-.13,9.07.03,2.47.22.28,5.13.28,6.26-.17,1.12ZM212.27,383.27h-9.05s-2.06-.17-2.06-.17c-.71-.05-.47-1.97-.02-1.96l2.53.08,8.13.06,2.83.02.13,1.97h-2.49ZM213.86,365.7l-13.82-.1.02-2.07,13.82.1-.02,2.07ZM200.12,387l.11,9.59-1.04.12-2.07-.25h-7.56s-1.86.23-1.86.23l-1.34-.02-.26-2.78.02-2.48-.11-7.65,3.04.03,8.08.07,2.61.06.03,2,.35,1.09ZM199.23,383.02l-1.39-.05-1.3-.14-7.46-.02h-3.1c-.08-.39-.25-1.85.13-1.87l2.42-.14,8.58.04,2.06.17c.17.01.65.56.67.72.03.24-.37,1.3-.61,1.29ZM185.6,413.09v2.05s-14.5.04-14.5.04v-2.05s14.5-.04,14.5-.04ZM174.42,416.13l7.88-.04,1.14-.09,2.15-.09.16,3.63.12,2.7.06,1.97.03,2.56h-2.96s-8.98.08-8.98.08l-2.3.09c-.21,0-.32-.93-.32-1.15l-.21-9.65h3.24ZM186.06,427.65l.02,2.12-14.65.15-.02-2.12,14.65-.15ZM171.44,490.34l.11,1.96.09,1.67v1.49s.07,5.41.07,5.41l-3.95,4.23-1.44,1.93-.79,1.22-.81,1.36-.94,1.58-.48.91-.52,1.11-.45,1.02-.57,1.46-.73,1.86-.38,1.16-.53,2-.63,2.4-.27,1.18-.35,3.02-.28,3.55-.04,1.47.14,3.61.23,2.83.38,3.14.23,1.11.37,1.34.75,2.73.35,1.1.56,1.54.7,1.84.47.99.52,1.04.53,1.05.51.94.95,1.61.78,1.23,1.26,1.74,5.22,5.39c.36.37.98,1.2.99,1.69l.12,6.33.12,6.01c-.09,0-.3,0-.41,0l-1-.62-1.29-.79-.92-.58-1.72-1.26-2.64-2.24-3.66-3.63-1.8-2.19-1.58-2.08-.97-1.39-.99-1.61-.96-1.56-.75-1.35-1.27-2.69-.59-1.41-.57-1.55-.69-1.88-.38-1.08-.54-1.97-.75-2.73-.31-1.32-.49-2.98-.55-4.59-.22-2.69.02-4.97.21-2.75.15-1.89.12-1.54c.02-.22.2-.88.28-1.12l.34-2.68.36-1.2.33-1.12.35-1.24.67-2.34.46-1.45.58-1.57.55-1.41.6-1.51.44-.96.52-1.05.5-1.01.69-1.39.52-.95,1.37-2.23.96-1.44,1.36-1.86,2.3-2.51c.16-.17,1.07-.34,1.3-.4l1.63-.38,1.06-.33c.17-.05.88-.46,1.05-.59l3.07-2.41.97-.77ZM176.89,582.38l1.49.65,1.57.42,1.6.43,2.05.4,2.89.24,1.52.1,2.85.1.04,1.23.2,5.57.16,4.38.08,2.22.06,1.48.2,8.1.17,4.36.13,2.72.03,1.49.15,5.05.19,6.43.2,2.67v2.52s.27,11.45.27,11.45l.28,2.73-.05,3.01.13,4.79.16,5.65.04,1.35-2.26.37-1.2.34-2.33.14c-.23.01-.89.23-1.23.35l-2.78.19c-.18.01-.87.34-.98.38l-2.47.18-2.68.49-.2-5.51-.1-2.71.02-1.5-.2-8.57-.27-9.63-.05-1.97-.35-15.02-.27-2.73.07-2.5-.13-6.56-.19-9.44-.03-1.68-.11-1.48-.09-6.09-.25-6.97,1.64.35ZM175.93,665.7l.1,2.29-3.5.55-3.07.48-2.15.34c-.36.06-1.31-.22-1.64-.3l-2.15-.53c-.2-.05-1.07-.09-1.27-.06l-1.51.23-2.34.35-1.25.24-2.79.17-.72.35-2.55.15-1.04.39-2.2.07c0-.11-.04-.59-.04-.5l2.64-.15.73-.36,1.98-.1,1.22-.26,2.64-.35.76-.26,2.32-.26,1.12-.16,5.47-.91,2.14-.36,1.18-.2,2.73-.43,1.11-.15,2.07-.27ZM168.14,691.71c-1,.17-2.5-1.47-2.33-2.46l.37-2.21,1.09-1.09,1.09-.22,2.32-.4,1.13-.28,1.86-.11,1.07-.43-.14,1.21-.58,1.2-1.51,1.06.19,1.8.12,1.14-1.59.28-3.1.54ZM177.76,695.2l-.45-3.6c-.04-.33,1.16-.67,1.49-.72l1.16-.16,2.39-.34,1.13-.17,5.47-.82,2.18-.33c.19-.03.44.76.46.96l.17,1.42.53,3.49.45,2.11.59,3.35.09,2.72c0,.21-.24.93-.43.97l-1.72.33-2.57.5-1.68.32-1.16.24-2.72.44-2.73.44c-.34.06-1.3.35-1.31-.01l-.07-2.14-.12-1.44-.2-1.21-.47-3.24-.17-1.16-.28-1.94ZM193.21,705.6c.42-.65,1.26-1.92,1.22-2.44l-.47-5.3-.48-2.63-.28-1.63-.25-1.51-.19-1.15-.37-2.21-.33-.93.26-.23.85.57-.31-1.41-.42-1.1c-.09-.24-.25-1.01-.26-1.13l.94.93c.06.06.44.74.44.83l.03,4.3c0,.37.08,1.17.16,1.42l.52,1.49c.07.2.12.8.16,1.15l.33,2.94.53,2.51c.41,1.97.15,4.28-.61,4.73l-.96.56c-.18.11-.94.46-.51.25ZM195.32,692.64l-.51-1.25-.23-1.91c-.03-.29.41-1.09.68-1.13l2.33-.37,1.21-.19,2.38-.38.7-.17,2.7-.38,2.65-.43.8-.14c.23-.04.59.47.64.71l.37,1.91c.25,1.28-.38,1.19-.06,2.52l.28,1.16.28,1.17.47,2.19.25,1.19-.03,1.52-.23,2.18c-.02.22-.97.41-1.2.45l-1.19.22-1.75.32-2.61.48-3.42.62-2.25.41c-.23.04-.97.14-.99-.11l-.17-3.38-.39-1.64-.36-2.59-.34-2.98ZM227.49,687.24l.78-1.25.21,1.01-.02,5.34-.25.26-.33-.42.2-1.75-.57-1.07-.02-2.11ZM228.46,697v-4.16s.27-.26.27-.26l.28.47-.08,4.42-.75,1.22-.37-1.13.66-.56ZM231.19,669.06l-1.96.3-.06-3,1.17-.21,1.81-.36,1.13.73.09,1.55-2.19.99ZM241.61,656.21h-2.5s-.71.4-.71.4l-2.31.15-.73.35-2.8.18-1.1.36-2.2.16c-.06-.22-.19-.71-.12-.44l2.19-.38,1.15-.2,2.38-.21.7-.33,1.99-.09,1.24-.32,3.33-.19c-.18.22-.43.55-.52.55ZM229.23,659.24l.25.25-.25.25-.25-.25.25-.25ZM231.72,660.34l.26,4.61-2.91.16-.26-4.61,2.91-.16ZM229.11,670.46l1.73-.31,1.4-.25.15,2.03-.12,1.65-.82,1.26-1.38.15-.47.17-1.47.3.17-1.19.48-2.05.32-1.76ZM228.36,669.39l-.94.23-1.47.36-1.14.28-2.02.05-1.07.44-2.67.21-1.05.46-1.75.04-2.91.55-1.77.24.03-1.01.05-2.13,2.19-.32,1.15-.2,2.35-.38.96-.22,2.93-.34,2.65-.47,2.94-.53,1.54-.18v2.92ZM227.25,665.51l-8.86,1.43-1.01.16-2.9.43-2.78.41-.08-1.65-.13-2.74,1.82-.31,1.6-.27,2.25-.38.77-.21,2.81-.28,1.13-.17,2.4-.37,3.06-.48c.14-.02.7-.02.71.12l.1,1.93.11,2.02c.01.22-.75.34-1,.38ZM227.15,659.96l-3.04.47-2.14.33-1.25.33-2.66.32-.81.26-3.91.47-1.67.08c-.36.02-.55-1.81-.19-1.88l1.18-.24,2.19-.44,1.13-.22,2.75-.44,1.16-.18,1.53-.24,1.02-.16,2.05-.31,1.02-.13,1.78-.2c.17-.02.69.9.77,1.1.1.27-.61,1.03-.9,1.08ZM223.8,555.72l-.29-1.78-.16-7.85-.13-3.42-.49-9.1-.5-9.6-.35-7.27-.16-3.26-.26-1.45-.1-9.19c-.19-.3-.42-.63-.42-.72l.05-1.5.04-4.25.86,1.22.81,1.18,1,1.5.54.95.69,1.38.51,1.01.51,1.01.54,1.06.42.92.63,1.56.54,1.39.87,2.68.36,1.14.38,1.24.32,1.15.28,1.17.37,2.17.3.73.05,1.98.46,1.43v11.11s-.26,2.75-.26,2.75l-.56,3.58-.35,2.2-.34,1.36-.5,1.84-.42,1.53-.45,1.65-.5,1.48-.58,1.44-.59,1.47-.42,1.05-.6,1.5-.45.98-.51,1.05-.64,1.3-.32-.09-.18-3.68ZM217.7,492.6l-1.88-.55-1.58-.43c-.18-.05-1.02-.45-1.22-.59l-2.24-1.56-1.82-1.27-1.16-.74-.99-.54-1.09-.56c-.24-.12-1.19-.55-1.21-.83l-.19-2.63-.19-7.12-.06-2.38-.02-.69,12.67-.62,2.18-.13.15,1.84.31,1.25.04,9.19c0,.25.33,1.15.42,1.33l.09,5.4.04,2.45-2.24-.81ZM219.62,470.54l-.66-14.15,1.57-.07.66,14.15-1.57.07ZM220.38,455.6l-1.51-.05.07-2.1,1.51.05-.07,2.1ZM218.85,452.74l-.39-9.3,1.45-.06.39,9.3-1.45.06ZM218.41,442.59l-.06-2.03,1.38-.04.06,2.03-1.38.04ZM218.31,439.85l-.56-9.9,1.48-.08.56,9.9-1.48.08ZM217.76,427.23l1.34-.05.08,2.11-1.34.05-.08-2.11ZM218.43,412.74l.04,2.07-1.48.03-.04-2.07,1.48-.03ZM218.07,404.82l.11,2.28.08,1.82.11,2.71c0,.18-.88.46-1.07.43-.17-.03-.37-.72-.38-.98l-.48-9.35c-.03-.49.3-1.41.44-1.68.07-.14.98.49.99.65l.21,4.13ZM217.78,399.53l-1.45.05-.06-2.05,1.45-.05.06,2.05ZM217.69,396.64l-1.54.08-.64-12.66,1.54-.08.64,12.66ZM216.98,383.25l-1.46.07-.1-2.03,1.46-.07.1,2.03ZM216.3,369.16l.24,3.88.2,2.71.05,1.47-.04,2.97-.87.65-.59-1.48v-2.64s-.13-1.47-.13-1.47l-.07-1.05-.35-7.55,1.49-.02.07,2.53ZM216.11,363.84l-.04,2.07-1.56-.52v-1.56s1.6,0,1.6,0ZM215.55,352.95l.4,9.42c0,.22-.96.58-1.39.65l-.42-9.53-.1-1.03-.14-3.95.8-.59.68.9.18,4.13ZM215.2,345.38l.07,2.08-1.48.05-.07-2.08,1.48-.05ZM213.48,356l.1,1.04.17,5.88-1.77-.09-1.86.41-1.04-.64h-5.87s-3.14.06-3.14.06l-.09-1.32-.29-1.31-.07-9.06-.18-3.09,2.74.03,8.05.07,2.61.28.32.69.31,7.06ZM201.74,344.99l2.77.02,1.37.38,6.7.02c.18,0,.74,1.18.7,1.36-.03.15-.8.65-.94.65h-2.13s-6.21-.05-6.21-.05l-1.37-.35-3.19.04-.18-2,2.48-.06ZM199.23,364.22c-.08.41-.38,1.31-.52,1.31l-2.15.02h-5.73s-1.31-.37-1.31-.37l-1.49-.02-2.42-.05c-.38,0-.37-1.9,0-1.91l2.4-.05,5.42-.1c.26.25.59.57.68.57l2.01-.1,2.08-.1c.19,0,1.06.62,1.03.8ZM198.59,350.55l.15,8.19.24,1.36v2.49s-2.35,0-2.35,0l-8.59-.1-2.74-.12-.08-2.88-.04-1.47-.28-9.07c0-.28-.04-1.45.2-1.45l2.5-.04,6.71.02,1.34.36,2.03-.03c.19,0,.88.42.88.58l.04,2.16ZM186.83,344.75l1.26.1,7.56.1,1.98.03c1.21.02,1.04,2.01.27,2l-10.21-.12-1.37-.19-1.53-.14-.02-1.93,2.07.16ZM184.58,383.71l.1,5,.21,2.69.1,2.23-.11,1.82-.14,1.26-2.79-.26h-8.05s-3.17.16-3.17.16l-.04-1.4-.28-2.34-.03-5.02.08-4.29,2.45-.21,6.36-.04,1.03.65,1.66-.34,2.63.09ZM184.5,382.91l-14.24-.14.02-2.1,14.24.14-.02,2.1ZM184.42,373.72l.07,3.24-.12,2.86-.94.24-1.97-.29h-8.08s-3.08,0-3.08,0l-.14-6.93-.19-2.7-.04-1.48.08-2.86,2.34-.1,4.15-.17,1.11.55h3.33s3.08-.05,3.08-.05l.13,4.99.25,2.7ZM184.06,363.14l-.04,2.16-14.17-.23.04-2.16,14.17.23ZM183.66,356.17l.18,2.92.04,1.47-.1,1.84-2.83-.28-11.08-.11-.21-9.88-.11-5.12,2.33-.09,6.38.04c.34.17.95.43,1.17.43h1.49s2.53.01,2.53.01l.21,8.76ZM169.8,344.13l.72.06,1.82.12,8.62.16,2.36.04.07,1.97-2.95-.04-8.59-.11-2.16-.24c-.22-.02-.3-2.01.11-1.97ZM169.54,407.91l.08,4.45-2.12.13-3.68.05-2.64-.08c-.21,0-.75-.12-.76-.26l-.13-2.1v-7.57s0-2.4,0-2.4l3.01-.06,3.46.04,2.63.15.14,7.64ZM169.4,397.41v2.08s-8.81-.02-8.81-.02v-2.08s8.81.02,8.81.02ZM168.55,362.88v1.92s-2.75.28-2.75.28l-1.19-.34-1.81-.11-2.26.16-.74-1.13.48-.9,1.99-.15,3.51.05,2.77.23ZM160.26,343.93h1.97s3.1.05,3.1.05l2.02.02c.21,0,.74.88.87,1.22.07.17-.65.89-.84.89l-2.52-.1-2.14-.08-1.98-.07c-.27,0-.99-.66-1.12-.89-.09-.16.46-1.03.64-1.03ZM159.52,353.65l-.12-2.71-.05-2.04v-2.07c0-.13.63-.32.79-.29l1.29.19,1.34.12,3.55.09,1.79.05.21,10.54.09,4.45-2.6.02h-3.53s-2.59,0-2.59,0l-.17-8.34ZM159.91,379.77l-.14-2.52v-5.16s-.1-6.33-.1-6.33c0-.13.75-.45.59-.31l5.58.22,1.49.06c.3.01,1.41.25,1.19.22l.2,2.76-.04,1.46.1,6.81.04,2.76h-1.5s-4.06.02-4.06.02h-3.36ZM168.9,380.57l-.02,2-2.6.17-2.97-.02-2.45-.18-.56-1.95,3.53.09,1.95.04,3.13-.15ZM160.23,396.64l-.02-1.7-.14-10.46-.05-1.23,3.77.11,2.5-.02,2.58.11.13,1.71.27,2.72.05,4.74-.12,3.89h-1.37s-1.51-.02-1.51-.02h-2.52s-3.57.14-3.57.14ZM91.43,818.57l-.76-.33-1.01-.43-1.12-.45-2.16-.87-1.05-.43-1.05-.44-1.83-.77-1.05-.44-1.46-.61-1.41-.59-1.1-.45-1.04-.42-1.83-.75-1.03-.42-1.78-.73-1.44-.59-1.48-.61-1.03-.43-2.13-.89-1.04-.44-2.45-1.08-1.45-.63-1.03-.45-1.04-.45-1.46-.64-1.04-.45-1.76-.77-1.41-.62-.98-.46-1.4-.68-1.06-.51-.96-.51-1.27-.73-1.27-.74-1.3-.76-1.19-.73-3.69-2.47-1.16-.82-1.74-1.31-6.73-5.89-3.54-3.55-3.31-3.74-2.01-2.5-1.57-2.06-1.03-1.44-1.46-2.13-.77-1.23-1.28-2.28-.71-1.31-.52-1.01-.51-.99-.68-1.33-.5-1-.7-1.39-.45-.94-.63-1.5-.9-2.14-.59-1.44-.59-1.49-.5-1.43-.48-1.55-.49-1.6-.58-1.92-.44-1.53-.45-1.62-.42-1.53-.44-1.57-.3-1.17-.44-2.18-.49-2.54-.49-2.64-.27-1.53-.3-1.87-.49-4.02-.57-6.09-.2-2.66v-10.65s.21-2.65.21-2.65l.58-6.08.38-3.35.16-1.06.92-5.87.19-1.16.4-2.17.34-1.84.24-1.07.39-1.66.49-2.02.41-1.74.29-1.12.44-1.56.45-1.6.43-1.54.38-1.33.3-1.06.45-1.57.34-1.09.54-1.55.65-1.89.52-1.51.39-1.11.53-1.52.39-1.05.72-1.88.56-1.47.57-1.5.83-2.17.58-1.41.77-1.83.43-1.04.74-1.78.45-1.03.47-1.05.46-1.03.64-1.43.64-1.42.46-1.01.82-1.75,1.12-2.38.49-1.03.49-1.03.49-1.02.49-1.02.67-1.37.67-1.37.5-1.01.5-1.01.5-1.01.5-1.02.32-.65.87-1.78.63-1.28.51-1.03.48-.98.84-1.8.62-1.33.66-1.4.65-1.36.49-1.02.49-1.02.49-1.02.49-1.02.47-1,.51-1.08.79-1.69.65-1.39.48-1.03.46-1,.95-2.12.61-1.4.9-2.13.62-1.46.58-1.44.82-2.17.57-1.49.49-1.41.49-1.59.45-1.5.5-1.66.33-1.28.26-1.09.4-1.68.29-1.37.75-5.08.23-4.96v-5.15s-.77-8.9-.77-8.9l-.5-2.54-.53-2.53-.46-2.17-.36-1.5-.29-1.19-.32-1.32-.38-1.54-.3-1.19-.34-1.31-.41-1.55-.41-1.54-.33-1.18-.46-1.69-.43-1.56-.54-1.99-.54-2-.44-1.64-.41-1.54-.41-1.54-.31-1.18-.34-1.3-.41-1.56-.3-1.16-.62-2.41-.32-1.29-.47-2.06-.58-2.52-.43-2.02-1.03-5.56-.55-3.04-.51-3.49-.72-7.81v-5.98s.68-7.43.68-7.43l.19-1.16.42-2.18.5-2.58.55-2.35.43-1.66.45-1.74.33-1.1.49-1.59.35-1,.55-1.53.4-1.11.55-1.54.58-1.35.96-2.12.66-1.46.46-.95.71-1.39.5-.94,1.12-1.95.76-1.26.99-1.59,1.16-1.77,2.39-3.26,2.48-3.02,3.17-3.42,4.41-4.11,2.52-2.03,1.74-1.3,1.82-1.3,1.41-.93,1.38-.8,1.62-.93.93-.51,1.03-.53,1-.51,1.01-.52,1.05-.54.63-.28,1.44-.61,1.44-.6,1.06-.44,1.48-.61,1.06-.4,1.59-.44,1.72-.48c.09.12.29.37.27.37-.04,0,.2.03,1.06.21l-.73-.63-.21-.17,1.05.1c.29.03,1.12-.19,1.42-.31l1.86-.75,1.08-.41,2-.54,1.99-.49,2.56-.55,2.5-.46,3.54-.56,3.04-.48,3.18-.5,1.38-.22-.55.8.91-.27,1.48-.44,1.75-.42,6.63-.77,7.98-.76,1.63-.16,1.22.27,1.51-.16,4.23-.44,4.17-.31,2.07-.1,1.31-.11,1.18-.25c.21-.05,1.18.18.97.26l-1.17.49-2.19.4-2.49.52-2.03.5-1.71.42-1.43.42-1.57.51-1.49.49-1.57.53-1,.37-1.51.58-1.51.58-1.05.42-1.36.6-2.72,1.34-.95.5-1.39.74-1.01.54-.93.51-1.28.78-1.23.79-1.5,1.04-1.81,1.26-1.98,1.47-6.56,6.13-3.09,3.48-2.02,2.56-1.46,2.01-1.26,1.82-.79,1.19-1.01,1.58-.55.91-.94,1.64-.5.93-.53,1.04-.52,1.02-.48.98-.51,1.08-.44.98-.63,1.48-.45,1.06-.72,1.78-.68,1.83-.53,1.44-.55,1.5-.35,1.16-.51,2.02-.47,2.01-.56,2.55-.47,2.51-.48,3.54-.53,4.35-.11,1.09-.13,5.51-.03,4.08.03,2.5.23,3.37.51,5.1.5,3.5.49,2.55.52,2.53.52,2.52.52,2.56.27,1.12.4,1.57.34,1.33.42,1.63.52,1.93.45,1.62.54,1.93.56,2,.45,1.62.54,1.92.46,1.62.43,1.52.44,1.54.33,1.17.35,1.23.45,1.61.54,1.92.56,2,.65,2.32.33,1.22.43,1.63.42,1.56.29,1.14.4,1.74.46,2.04.49,2.16.2,1.01.38,2.36.49,3.07.54,3.98.51,6.09.21,2.74v4.95s-.22,2.71-.22,2.71l-.54,5.08-.48,2.99-.54,2.55-1.02,4.5-.46,1.5-.55,1.56-.54,1.53-.38,1.04-.71,1.88-.57,1.51-.4,1-.63,1.48-.44,1.04-.78,1.84-.44.99-.5,1.05-.48,1.03-.48,1.02-.52,1.09-.49,1.02-.49,1.02-.65,1.35-.49,1.01-.5,1.01-.65,1.32-.51,1.02-.51,1.01-.7,1.38-.51,1.01-.52,1.01-.83,1.62-1.24,2.4-.82,1.59-.52,1-.51,1-.51,1.01-.51,1.01-.51,1.01-.51,1.01-.5,1.01-.51,1.01-.5,1.01-.51,1.01-.51,1.01-.5,1.01-.5,1.01-.51,1.01-.5,1.01-.51,1.02-.48.99-.83,1.75-1.13,2.38-.66,1.41-.48,1.03-.46,1.01-.94,2.11-.63,1.42-.45,1.02-.92,2.12-.61,1.41-.9,2.13-.61,1.46-.42,1.03-.56,1.47-.56,1.51-.54,1.49-.54,1.51-.38,1.06-.54,1.53-.5,1.49-.5,1.53-.5,1.54-.35,1.11-.59,1.98-.46,1.54-.37,1.24-.32,1.15-.31,1.15-.55,2.01-.4,1.53-.61,2.45-.45,2.07-.49,2.56-.49,2.56-.33,1.81-.36,2.09-.33,2.14-.49,3.58-.54,4.52-.49,5.09-.18,3.36-.02,2.53v10.13s.1,4.93.1,4.93l.13,1.17.98,7.39.37,2.7.21,1.02.4,1.85.54,2.51.46,2.12.55,2.46.42,1.56.59,1.94.47,1.53.49,1.55.49,1.5.52,1.52.52,1.51.38,1.1.54,1.56.25.63.44,1.07.75,1.83.61,1.5.43.98.49,1.07.3.65.5,1.04.49,1.02.67,1.4.5.95.74,1.37.53.99.52.94,1.33,2.25.76,1.29.57.9.81,1.21,1.88,2.69,1.48,2.03,1.55,1.97,3.06,3.58,3.5,3.54,5.67,4.91,1.21.84,2.97,2.08,1.48,1.05,1.48,1.07-1.24-.24ZM176.59,830.33c-2.38.41-5.8.66-7.73-.03l-1.57-.56c-.21-.07-1.17-.58-.95-.61l1.35-.21,2.67-.42,1.2-.19,6.27-.98,3.15-.5c1.17-.19-.76,2.88-4.39,3.51ZM318.4,699.19l-.06,1.43-.26,2.73-.49,5.08-.53,3.99-.44,2.56-.54,3.04-.26,1.35-.32,1.52-.49,2.16-.49,1.98-.54,2.03-.52,1.97-.45,1.53-.51,1.56-.5,1.52-.5,1.53-.51,1.48-.55,1.52-.39,1.06-.71,1.91-.56,1.41-.46,1.07-.63,1.49-.43.96-.84,1.72-.68,1.39-.66,1.33-1.21,2.34-.71,1.34-.7,1.28-.73,1.31-.54.94-.77,1.28-.78,1.25-3.04,4.57-.61.88-4.44,5.7-3.02,3.55-3.15,3.43-6.06,5.98-.83.72-3.58,2.99-1.97,1.65-.81.64-2.03,1.54-1.73,1.23-1.53,1.03-1.51,1-2.78,1.81-1.24.78-1.53.93-2.6,1.53-1.3.68-1.34.68-1,.51-1,.51-1.37.7-1,.49-1.04.49-1.01.47-1.41.65-1.38.63-1.75.8-1.02.47-1.42.63-1.07.44-1.47.58-2.15.85-1.01.39-1.15.43-1.86.7-1.47.54-1.52.54-1.52.54-1.51.53-1.87.66-1.09.38-1.51.52-1.53.53-1.48.47-1.62.48-1.52.45-1.53.45-1.17.34-1.22.36-1.56.45-1.59.44-1.54.41-1.18.31-1.32.34-1.55.39-1.18.3-1.32.33-1.54.39-1.17.29-1.7.42-1.66.41-1.56.38-1.15.26-2.22.45-2.52.52-2.52.5-2.54.49-2.57.49-1.6.27-1.88.29-1.68.25-1.38.21-2.17.33-1.34.2-3.18.47-1.08.15-3.32.38-5.56.51-6.07.51-2.24.19-1.92.07h-9.66s-1.95-.05-1.95-.05l-3.27-.18-1.29-.12-3.71-.46-3.59-.44-2.63-.43-2.9-.63-1.99-.48-2.05-.54-1.23-.34-1.08-.35-1.54-.56-1.86-.68-1.82-.66-1.39-.58-2.12-.94-1.44-.64-.98-.46-1.04-.51-1.4-.69-.95-.51-2.21-1.32-1.25-.76-1.23-.8-1.57-1.03-1.43-1-2.61-2-2.51-2.02-7.55-7.55-2.51-3.05-1.53-2.01-.89-1.19-.58-.86-1.63-2.5-.94-1.49-.95-1.59-.77-1.3-.56-.97-.55-.94-.5-.95-.49-1.04-.63-1.35-.84-1.8-.48-1.02-.48-1.03-.49-1.05-.44-.99-.87-2.19-.57-1.45-.58-1.51-.41-1.07-.53-1.46-.54-1.55-.46-1.45-.45-1.57-.34-1.19-.34-1.22-.54-2.01-.44-1.64-.4-1.52-.4-1.59-.29-1.28-.51-2.55-.43-2.18-.18-1.01-.39-2.89-.49-4.02-.57-5.58-.2-2.67.03-10.07.38-5.57.27-3.4.13-1.15.48-3.69.95-7.12.39-2.28.21-1.1.5-2.65.42-2.03.56-2.52.39-1.74.28-1.14.4-1.57.42-1.63.55-1.99.56-1.94.46-1.58.48-1.53.63-1.92.49-1.51.5-1.53.5-1.49.54-1.53.39-1.11.54-1.54.39-1.03.74-1.86.58-1.47.42-1.06.59-1.49.42-1.02.9-2.13.61-1.43.44-1.03.64-1.49.45-.99.48-1.03.48-1.02.68-1.46.63-1.36.48-1,.5-1.02.49-1.01.65-1.33.5-1.03.67-1.38.32-.65.5-1.02.5-1.01.68-1.36.5-1.01.68-1.36.51-1.01.33-.65.52-1.01.69-1.35.51-1,.51-1,.66-1.31.69-1.37.84-1.67.69-1.37.5-1,.84-1.67.51-1,.7-1.38.51-1.01.68-1.34.49-.97.67-1.34.83-1.66.67-1.39.66-1.4.31-.65.49-1.03.5-1.04.45-.99.63-1.46.61-1.41.92-2.11.63-1.44.41-.99.59-1.55.53-1.45.68-1.93.36-1.11.48-1.58.33-1.11,1.01-4.01.41-2.07.53-3.22.18-1.19.32-2.7.23-4.86v-5.1s-.02-3.03-.02-3.03l-.18-2.85-.51-4.57-.4-3.22-.18-1.01-.95-4.88-.44-2.02-.5-2.12-.48-2.03-.36-1.55-.28-1.19-.43-1.73-.53-1.97-.46-1.57-.46-1.6-.44-1.53-.31-1.07-.37-1.3-.45-1.55-.57-1.99-.44-1.55-.46-1.61-.55-1.92-.46-1.62-.54-1.92-.57-2.02-.43-1.61-.4-1.56-.29-1.16-.32-1.33-.59-2.42-.26-1.14-.27-1.21-.93-4.24-.48-2.14-.25-1.15-1.59-15.49.02-4.01.21-2.75.48-6.26.14-1.14.46-3.2.39-2.71.25-1.15.37-1.58.34-1.46.26-1.04.22-.82.37-1.17.48-1.55.35-1.1.51-1.58.38-1.01.74-1.89.58-1.46.45-1,.68-1.39.5-1.02.5-1,.51-1.03.49-.95.57-1.01.91-1.6.56-.99.55-.92.81-1.22,1.03-1.55.58-.83,1.1-1.49,1.31-1.71,2.55-3.05,5.51-5.54,2.76-2.3,1.74-1.37.84-.62.91-.58.93-.6,1.24-.8.58-.36.99-.57,1.02-.58.62-.33.65-.33,1.01-.52,1.01-.53.9-.46,1.85-.89.98-.44,1.1-.45,1.48-.61,1-.4,1.57-.55,1.48-.5,1.53-.48,1.61-.48,1.06-.32,1.21-.37,1.24-.32,2.43-.57,2.07-.49.66-.14.96-.2,1.17-.23,2.77-.46,3.41-.55c.27-.04,1.2.08,1.2.33l.09,7.37.3,9.23.21,15.61.13,9.4.24,2.71.09,8.64.03,2.51.17,10.47.13,2.69.09,2.56.06,2.61c.01.67,1.75,1.55,2.46,1.52l3.59-.12,5.47-.23,2.96-.13c.09,0,.45.61.46.73l.21,9.14.1,4.46c0,.07-.51.59-.57.63l-2.57,2-1.12.87-.96.58-1.07.41-2.37.59c-.28.07-1.32.52-1.5.73l-2.07,2.4-1.25,1.66-1.03,1.61-.77,1.26-.97,1.63-.67,1.24-.68,1.37-.52,1.05-.59,1.31-.59,1.53-.7,1.84-.57,1.5-.4,1.07-.34,1.09-.4,1.62-.4,1.65-.34,1.39-.21.67-.26,2.65-.33.72-.1.97-.28,2.72-.14,1.78-.06,6.18.19,3.28.51,4.13.44,2.48.49,2.18.49,1.95.56,2,.35,1.04.57,1.57.54,1.4.91,2.2.61,1.32.85,1.71.69,1.34.92,1.69.91,1.47,1.05,1.6,1.03,1.45,3.54,4.05,2.79,2.72,2.51,2.1,1.44,1.06.85.57,1.3.8,1.27.78,1.23.76c.2.13.19.92.2,1.25l.26,9.97.04,1.68.04,1.51.42,16.02.13,2.71.06,2.5.1,7.57.27,10.14.05,1.97.35,15.15.05,1.09.12,2.04.04,1.62.12,7.77c0,.32-1.13.7-1.45.75l-1.64.23-1.93.28-.7.28-2.81.21-1.05.29-1.98.26-.73.1-4.4.67-1.82.28-.72.25-1.45.21-1.21.17-2.65.38-.74.28-2,.16-1.03.26-1.5.14-1.27.15-3.14.52-3.01.5-2.16.44c-.89.18-1.62.77-1.61,1.49l.09,7.31c0,.09.31.72.45,1l.09,10.97.45,1.57v9.19c0,.09.38.75.47.9l.04,5.42.05,2.1c.02.93,1.91,1.99,3.68,1.68l2.65-.48,2.21-.39,1.5-.27,1.52-.28,1.03-.22,1.01-.15,1.37-.2,1.17-.18,1.88-.29,5.88-1.09,1.28-.24,1.29-.25c.41-.08,1.49-.06,1.89.07l1.22.41,1.53.51c.32.11,1.31.25,1.64.18l1.15-.22,2.28-.43c.24-.04.94.05,1.09.18l.67.6c.39.35,2.39.23,2.8-.21l1.46-1.55c.24-.25,1.16-.45,1.51-.52l2.61-.5,2.13-.41,1.19-.23,2.18-.42c.32-.06,1.23-.11,1.52-.02l1.2.34,1.17.31,2.37-.26c.67-.07.76-1.59,2.37-1.87l2.97-.51,2.63-.46,2.1-.36c1.05-.18,2.85.84,5.34.34l1.82-.37,1.41-.23,2.58-.31,1.5-.19,2.57-.34,1.44-.23,1.95-.34,2.48-.44c.09-.02.69-.2.76-.24l1.34-.77.96-.55.97-.56c.07-.04.51-.12.72-.16l1.83-.35.7-.13.96-.18.89-.17c.17-.03.65-.61.66-.78l.06-1.13c.01-.21.64-.45.9-.5l1.58-.3,1.87-.35,1.12-.18,1.93-.29,2.67-.4.99-.19,2.59-.59.92-.26,1.42-.46.24-.95.17-.65.28-1.37c.02-.08-.37-.48-.55-.66l-.07-12.32c-.11-.17-.46-1.09-.46-1.39v-10.13c-.18-.29-.52-.84-.52-.93l.03-5.82v-2.16c.02-1.52-1.93-2.61-4.41-2.3l-3.1.39-1.18.33-2.41.2-.7.27-.86.09-1,.1-1.35.15-1.16.16-1.54.22-1.24.18-2.31.33c-.2.03-.93-.36-.94-.55l-.03-3.03-.03-2.98c0-.1-.32-.52-.47-.73l-.04-10.29c-.11-.16-.49-.75-.49-.84v-6.31s0-2.58,0-2.58l-.45-1.37-.08-8.14v-1.12s-.43-1.33-.43-1.33l-.09-9.05c0-.09-.37-.76-.46-.91v-5.95s-.02-3.89-.02-3.89l-.44-1.51-.1-10.45c-.14-.27-.47-.91-.47-1v-8.7s-.4-1.48-.4-1.48l-.16-5.72-.15-5.5c0-.2-.04-.66.01-.77l.37-.73.51-1,.52-1.02.32-.64.7-1.43.44-1.02.43-1.07.86-2.15.61-1.52.48-1.39.5-1.6.42-1.45.54-2.07.35-1.33.24-1.15.32-2.07.5-3.2.18-2.3v-12.01c-.15-.22-.42-.62-.43-.71l-.24-2.8-.25-1.17-.31-1.36-.27-1.17-.2-.87-.21-.68-.36-1.16-.34-1.39-.42-1.39-.58-1.64-.38-.97-.62-1.53-.42-.93-.53-1.06-.67-1.37-.5-1.01-.51-1.05-.51-.95-.78-1.27-.8-1.19-1.11-1.42-.88-1.12c-.15-.19-.37-.95-.4-1.19l-.15-1.37-.18-1.3-.13-8.85-.42-1.81-.06-5.86-.02-2.13c0-.49,2.67-.19,2.65-1.09l-.1-4.88-.47-9.68-1.17-23.56-.06-1.18-.47-9.45-.13-2.72-.04-.97-.14-3.04-.33-7.09-.05-1.04-.31-6.4-.13-.9c-.03-.22.54-.57.76-.53l1.06.2,1.86.35,1.19.22,1.68.31,2.33.44,1.02.21,2.08.47,1.47.33,1.08.3,1.15.32,2.37.67,1.1.33,1.28.41.62.23,1.13.42,1.49.55,1.49.55,1,.4,1.06.52,1.39.69,1.05.51.56.29,1,.59.93.56,3.46,2.18.88.59,1.73,1.34,3.02,2.52,3.39,3.17,4.74,5.37,1.08,1.42,1.73,2.38.59.87.84,1.27.35.56.56,1,.73,1.29.77,1.36.48.91.51,1.05.51,1.05.45.97.61,1.48.89,2.15.55,1.43.54,1.54.67,1.9.35,1.09.57,1.96.59,2.03.29,1.12.38,1.59c2.03,8.47,2.81,16.99,2.12,25.71l-.29,3.69-1.04,8.11-.5,2.99-.27,1.39-.31,1.55-.43,2.14-.58,2.94-.3,1.4-.24,1.08-.37,1.66-.56,2.5-.46,2.05-.41,1.82-.24,1.06-.39,1.65-.48,2.03-.51,2.18-.28,1.21-.27,1.13-.48,2.03-.47,2.02-.51,2.19-.28,1.2-.26,1.16-.3,1.32-.72,3.22-.51,2.52-.45,2.53-.54,3.23-.16,1.13-.35,3.26c-.39,3.7-.47,7.55.03,11.26l.48,3.58.45,2.67.34,1.51.3,1.16.65,2.41.33,1.22.24.75.51,1.57.5,1.46.55,1.51.56,1.54.25.62.45,1.07.78,1.86.44.97.5,1.04.67,1.4.81,1.69.32.64.53,1.01.52.99.71,1.34.53,1.01.7,1.3,1.27,2.26.74,1.32.55.98.36.64.54.95.55.98.36.63,1.46,2.58.74,1.31.54.95.38.67.55.96.36.63.56.99.73,1.27.74,1.28.91,1.59.74,1.32.54.99.54.98.54.99.36.65.54.97.52.96.53,1.02.52,1,.52,1,.52,1.01.34.65.52,1.01.82,1.61.7,1.4.65,1.34.84,1.74.66,1.37.5,1.04.28.61.64,1.5.44,1.04.46,1.06.4.98.59,1.52.57,1.47.73,1.88.39,1.05.4,1.12.39,1.1.25.77.48,1.65.56,1.91.34,1.15.32,1.1.35,1.28.51,2.04.92,3.68.24,1.06.31,1.6.51,2.77.49,2.64.25,1.49.28,1.91.32,2.18.24,1.82.7,8.31.15,6-.07,6.62Z"/>
        <path class="st4" d="M208.23,702.46l1.06-.02-1.06.02Z"/>
        <path class="st4" d="M198.66,680.46l-.14.48-2.35.07h-.53s.37-.54.5-.54h2.52Z"/>
        <path class="st4" d="M201.66,679.68l-.15.76h-2.85c-.06-.32.75-.44.97-.44l2.03-.32Z"/>
        <path class="st4" d="M208.58,678.98c-.34-.13-.58.48-.73.48l-1.62.03-1.23.32-3.34-.13,1.04-.17,1.83-.29,1.19-.23,1.96-.14.9.12Z"/>
        <circle class="st4" cx="157.5" cy="406.68" r="1.17"/>
        <rect class="st4" x="157.72" y="629.42" width=".51" height="6.57"/>
        <rect class="st4" x="157.21" y="613.25" width=".51" height="4.8"/>
        <polygon class="st4" points="238.82 631.95 238.14 633.12 238.14 630.78 238.82 631.95"/>
        <polygon class="st4" points="238.31 605.16 237.63 606.33 237.63 603.99 238.31 605.16"/>
        <path class="st4" d="M238.15,608.53l-.66-.04c.22-.82.39-1.45.34-1.24-.03.12.11.51.33,1.28Z"/>
        <path class="st4" d="M188.89,356.74c.18,0,1.14-.72,1.13-.9l-.07-1.68c-.01-.28-1.58-1.69-2.02-1.25l-1.48,1.5c-.15.15.34,1.06.37,1.28l.11.9c-.28-.23-.96-.78-.94-1.04l.17-1.91c.04-.5,1.16-1.45,2.93-1.15.44.07,1.44,1.01,1.44,1.46v2.41c0,.09-.55.49-.63.53l-.97.47c-.11.06-.86.26-.96.18l-1.06-.88.99.06h1Z"/>
        <path class="st4" d="M190.92,408.56h-2.73s-.61-.64-.61-.64l-.1-2.5,1.22-1.38h1.72s1.22,1.38,1.22,1.38l-.1,2.5-.61.64ZM190.42,408.02l.59-.6.16-1.5-1.59-1.61-1.52,1.4-.02,1.72.91.71,1.47-.11Z"/>
        <path class="st4" d="M192.3,437.54l-1.18.49-1.05-.65-1.03-.62.03-3.29,1.19-.56,2.19-.11.51.72.53,1.01.2,1.41-1.39,1.59ZM192.44,435.92l.61-.84-.38-.4-.36-1.08-1.31-.42-1.4,1.32-.12,1.46.71.9,1.81.02.44-.95Z"/>
        <g>
          <path class="st4" d="M221.04,694.66l-1.16.46-1.13-.45-2.06-1.96.41-3.26,1.71-1.47,1.65-.48,2.51,1.87.08,1.7-.08,1.69-1.93,1.89ZM221.01,693.61l.89-.81.24-1.42-.13-1.4-1.3-1.33c-.31,0-1.3.01-1.5.24l-1.36,1.52-.07,2.36.98.85,1.12.53,1.14-.53Z"/>
          <path class="st4" d="M186.99,701.04h-3.4s-1.43-1.47-1.43-1.47l-.08-3.97,2.44-2.27,1.94.39c1.48.3,2.58,2.75,1.82,5.35l-1.29,1.96ZM185.31,700.59l2.07-1.85-.06-3.31c-.5-.38-1.88-1.27-2.27-.93l-1.95,1.68.02,2.83,2.19,1.58Z"/>
        </g>
      </g>
    </g>
  </g>
  <g id="discription">
    <g>
      <line class="st0" x1="253.43" y1="132.01" x2="253.43" y2="132.01"/>
      <polyline class="st0" points="253.43 132.01 253.43 132.01 253.43 132.01"/>
      <path class="st0" d="M224.13,64.01h-13.3c-14.2-10.7-31.9-17-51-17s-36.8,6.3-51,17h-13c-18.1,17.1-29.3,41.2-29.3,68h-.2l.1.1c0,51.6,41.8,93.5,93.5,93.5v-.1c51.6,0,93.5-41.8,93.5-93.5h0c0-26.8-11.2-50.9-29.3-68Z"/>
    </g>
    <g id="right">
      <g class="st1">
        <path d="M137.16,258.92c.13.14.2.31.2.51s-.07.37-.2.5c-.14.13-.3.2-.5.2h-10.55c-.1,0-.17.05-.21.15-.58,1.49-1.24,2.84-1.96,4.05-.01.04-.01.08.01.11.02.03.05.04.07.04h10.49c.34,0,.64.12.88.36s.37.54.37.9v7.91c0,.21-.07.39-.22.54s-.33.22-.53.22-.38-.07-.53-.22c-.15-.15-.22-.33-.22-.54v-.26c0-.09-.04-.13-.13-.13h-9.68c-.1,0-.15.05-.15.15v.38c0,.2-.07.37-.21.51s-.31.21-.51.21-.37-.07-.5-.21c-.14-.14-.2-.31-.2-.51v-7.63s-.01-.05-.04-.05c-.03,0-.05,0-.06.03-1.02,1.38-2.18,2.58-3.47,3.6-.16.13-.34.17-.54.14-.21-.04-.37-.13-.5-.29-.11-.13-.17-.28-.17-.45,0-.23.08-.41.26-.55,2.54-1.93,4.55-4.7,6.01-8.31.01-.03.01-.06-.01-.1-.02-.04-.05-.05-.07-.05h-5.12c-.2,0-.37-.07-.5-.2-.13-.14-.2-.3-.2-.5s.07-.37.2-.51c.14-.14.3-.21.5-.21h5.61c.11,0,.18-.05.21-.15.37-1.07.67-2.14.92-3.22.06-.2.17-.36.34-.49.13-.09.27-.13.43-.13.04,0,.09,0,.15.02.21.04.38.15.49.33.11.18.14.37.09.56-.27,1.08-.55,2.05-.85,2.92-.01.04-.01.08.01.11.02.03.05.04.1.04h10.04c.2,0,.37.07.5.21ZM134.25,266.04c0-.11-.05-.17-.15-.17h-9.63c-.11,0-.17.06-.17.17v5.67c0,.11.06.17.17.17h9.63c.1,0,.15-.06.15-.17v-5.67Z"/>
        <path d="M146.13,256.96c-.1.03-.15.09-.15.19v3.86c0,.1.05.15.15.15h3.45c.18,0,.34.07.48.2.13.14.2.3.2.48s-.07.34-.2.48-.3.2-.48.2h-3.45c-.1,0-.15.05-.15.15v1.3c0,.1.04.19.13.26.58.47,1.75,1.46,3.5,2.98.16.14.25.32.28.53.03.21-.02.4-.15.58-.11.14-.27.22-.46.23-.19.01-.35-.05-.48-.19-.68-.7-1.58-1.56-2.71-2.6-.01-.01-.04-.02-.06-.01-.03,0-.04.03-.04.07v7.91c0,.2-.07.37-.2.5s-.3.2-.49.2-.36-.07-.5-.2-.21-.3-.21-.5v-8.89s0-.04-.02-.04-.03,0-.04.02c-1.12,2.47-2.36,4.48-3.71,6.03-.13.13-.28.18-.47.15-.19-.03-.33-.12-.43-.29-.1-.16-.15-.34-.15-.52v-.11c.03-.23.12-.42.28-.58.78-.85,1.55-1.9,2.3-3.13.75-1.24,1.37-2.47,1.85-3.71.01-.04.01-.08-.01-.11-.02-.03-.05-.04-.07-.04h-3.47c-.19,0-.34-.07-.48-.2-.14-.13-.2-.29-.2-.48s.07-.34.2-.48.29-.2.48-.2h3.79c.1,0,.15-.05.15-.15v-3.56c0-.1-.05-.14-.15-.13-1.25.23-2.43.42-3.54.58-.17.01-.33-.02-.48-.12-.15-.09-.26-.22-.33-.39-.06-.14-.05-.28.02-.42.07-.14.18-.22.32-.25,3.4-.51,5.98-1.08,7.74-1.71.17-.06.33-.08.47-.08.3,0,.57.12.81.36.13.13.17.28.14.46-.04.18-.14.3-.31.35-.82.28-1.87.57-3.13.85ZM152.99,268.89c-.14.14-.31.21-.5.21s-.36-.07-.5-.21-.21-.31-.21-.49v-10.53c0-.2.07-.37.21-.5.14-.13.31-.2.5-.2s.36.07.5.2c.14.14.21.3.21.5v10.53c0,.19-.07.35-.21.49ZM157.15,255.74c0-.2.07-.37.21-.51s.31-.21.51-.21.37.07.51.21c.14.14.21.31.21.51v16.77c0,.5-.07.88-.22,1.14-.15.26-.39.46-.71.59-.53.17-1.55.26-3.07.26h-.02c-.23,0-.43-.07-.62-.2-.19-.14-.31-.32-.38-.54-.03-.06-.04-.12-.04-.19,0-.1.03-.19.08-.28.1-.14.23-.21.41-.21h2.58c.2-.01.34-.06.43-.14.08-.08.13-.22.13-.42v-16.77Z"/>
        <path d="M178.27,261.43c.18-.07.36-.06.53.03.17.09.27.23.3.42.01.07.02.14.02.19,0,.13-.04.26-.11.38-.1.18-.25.31-.45.36-.85.26-1.81.48-2.88.68-.11.03-.15.09-.11.19.5,1.08,1.04,2.2,1.64,3.35.07.16.11.31.11.45,0,.2-.07.38-.21.55-.21.27-.48.4-.79.4-.07,0-.14,0-.19-.02-.71-.1-1.68-.23-2.92-.41-.17-.01-.31-.09-.42-.22-.11-.13-.15-.29-.13-.46.02-.17.1-.31.22-.4.13-.1.28-.14.45-.13.67.09,1.36.16,2.07.23.04,0,.07-.01.09-.04s.01-.06,0-.09c-.27-.57-.72-1.56-1.36-2.98-.04-.1-.12-.14-.23-.13-1.59.21-3.41.32-5.46.32-1.05,0-2.17-.03-3.35-.09-.2-.01-.37-.09-.51-.23-.16-.16-.23-.34-.23-.55,0-.17.07-.32.21-.45.13-.13.29-.18.49-.17,1.29.1,2.54.15,3.75.15,1.58,0,3.09-.08,4.54-.26.1-.01.13-.07.09-.17-.44-.99-.7-1.6-.79-1.81-.04-.1-.11-.25-.2-.46-.09-.21-.16-.36-.2-.46-.03-.1-.1-.14-.21-.13-1.11.1-2.23.15-3.37.15s-2.24-.05-3.39-.15c-.2-.01-.37-.1-.52-.25s-.23-.33-.25-.54c-.01-.18.05-.34.18-.47.13-.13.29-.18.48-.17,1.36.13,2.64.19,3.84.19.85,0,1.67-.03,2.45-.09.1-.01.13-.07.08-.17-.1-.26-.18-.45-.26-.6-.13-.28-.24-.52-.34-.7-.1-.2-.1-.4-.01-.6s.25-.32.46-.36c.07-.01.14-.02.21-.02.17,0,.33.04.49.13.21.13.36.32.45.58.14.41.31.88.51,1.41.04.1.11.14.21.13,1.29-.2,2.46-.46,3.5-.79.18-.06.36-.04.53.06.17.1.27.24.3.43.04.2.01.39-.1.56-.11.18-.26.3-.46.35-.99.27-2.07.5-3.22.68-.11.01-.15.07-.11.17l.32.75c.1.23.38.88.85,1.96.04.08.11.12.21.11,1.18-.23,2.24-.5,3.18-.81ZM165.08,267.76c.06-.21.18-.38.36-.5.18-.12.38-.17.6-.16.2.03.35.12.45.28.1.16.12.33.06.51-.18.61-.28,1.11-.28,1.49,0,.9.37,1.58,1.12,2.07.75.48,1.88.73,3.4.73,1.61,0,3.1-.11,4.48-.32.2-.04.37,0,.52.14.15.14.22.3.22.5-.01.23-.1.43-.25.6-.15.17-.33.27-.54.3-1.41.18-2.86.28-4.37.28-1.95,0-3.44-.33-4.49-1-1.04-.67-1.57-1.65-1.57-2.94,0-.6.09-1.25.28-1.96Z"/>
        <path d="M200.42,255.68c.34,0,.63.12.88.37.25.25.37.54.37.88v15.01c0,.5-.08.87-.22,1.13s-.39.44-.73.55c-.47.17-1.56.26-3.26.26h-.02c-.2,0-.38-.07-.55-.2s-.3-.31-.38-.52c-.06-.16-.04-.31.05-.45.09-.14.22-.21.37-.21.54.01,1.03.02,1.47.02.47,0,.89,0,1.28-.02s.58-.2.58-.55v-4.52c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v5.67c0,.2-.07.37-.21.51-.14.14-.31.21-.51.21s-.37-.07-.51-.21-.21-.31-.21-.51v-5.67c0-.1-.06-.15-.17-.15h-5.29c-.11,0-.18.05-.19.15-.36,2.56-1.11,4.6-2.26,6.14-.13.14-.28.21-.47.21s-.35-.06-.49-.19-.23-.29-.26-.49c-.01-.03-.02-.06-.02-.11,0-.14.05-.28.15-.41.53-.71.95-1.55,1.28-2.52.41-1.21.66-2.28.76-3.23.09-.94.14-2.05.14-3.31v-6.59c0-.34.12-.64.37-.88.25-.25.54-.37.88-.37h13.28ZM187.22,265.74c-.01.11.04.17.15.17h5.16c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.07c-.11,0-.17.06-.17.17v1.26c0,.8-.02,1.53-.06,2.22ZM192.7,257.19c0-.1-.06-.15-.17-.15h-5.07c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.07c.11,0,.17-.06.17-.17v-3.37ZM200.08,260.73c.11,0,.17-.06.17-.17v-3.37c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.75ZM194.15,265.76c0,.1.06.15.17.15h5.75c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.75c-.11,0-.17.06-.17.17v3.5Z"/>
      </g>
      <g>
        <path class="st2" d="M98.08,191.19c-11.25-4.25-19.66-11.26-23.91-20.97s-3.69-20.57.77-31.67l.05-.13c-2.34-34.78,17.01-68.9,50.72-83.65,33.71-14.75,71.9-5.81,95.86,19.51l.09-.04c11.25,4.25,19.66,11.26,23.91,20.97,4.25,9.71,3.69,20.65-.82,31.8v-.03s-.03.05-.03.05h.03c2.34,34.77-17.01,68.88-50.72,83.63-33.3,14.57-70.96,6.02-94.97-18.58l-.98-.89Z"/>
        <path class="st3" d="M159.76,62.31h.17c.99,0,1.98.02,2.96.06.28.01.51-.2.52-.48s-.2-.51-.48-.52c-1-.04-2-.06-3-.06h-.17c-.28,0-.5.23-.5.5s.23.5.5.5h0ZM151.88,62.77c.98-.11,1.96-.2,2.95-.27.28-.02.48-.26.46-.53s-.26-.48-.53-.46c-1,.07-2,.16-2.99.28-.27.03-.47.28-.44.55s.28.47.55.44h0ZM144.1,64.1c.96-.22,1.93-.42,2.9-.6.27-.05.45-.31.4-.58s-.31-.45-.58-.4c-.99.18-1.97.39-2.94.61-.27.06-.44.33-.38.6s.33.44.6.38ZM136.52,66.3c.93-.33,1.87-.64,2.81-.92.26-.08.41-.36.33-.62s-.36-.41-.62-.33c-.96.29-1.91.61-2.85.94-.26.09-.4.38-.31.64s.38.4.64.31h0ZM129.25,69.33c.88-.43,1.78-.84,2.68-1.23.25-.11.37-.4.26-.66s-.4-.37-.66-.26c-.92.4-1.83.82-2.72,1.25-.25.12-.35.42-.23.67.12.25.42.35.67.23h0ZM122.36,73.17c.83-.53,1.68-1.04,2.53-1.53.24-.14.32-.44.18-.68s-.44-.32-.68-.18c-.87.5-1.72,1.02-2.57,1.55-.23.15-.3.46-.16.69s.46.3.69.16h0ZM115.93,77.75c.77-.62,1.55-1.22,2.35-1.8.22-.16.27-.48.11-.7s-.48-.27-.7-.11c-.81.59-1.6,1.2-2.38,1.83-.22.17-.25.49-.08.7s.49.25.7.08h0ZM110.06,83.02c.7-.7,1.41-1.38,2.13-2.05.2-.19.22-.5.03-.71s-.5-.22-.71-.03c-.74.68-1.46,1.37-2.16,2.08-.19.2-.19.51,0,.71s.51.19.71,0h0ZM104.81,88.91c.62-.77,1.25-1.53,1.89-2.28.18-.21.16-.52-.05-.71s-.52-.16-.71.05c-.66.76-1.3,1.53-1.92,2.31-.17.22-.14.53.08.7s.53.14.7-.08h0ZM100.24,95.36c.53-.84,1.07-1.66,1.63-2.48.16-.23.1-.54-.13-.7s-.54-.1-.7.13c-.57.83-1.12,1.66-1.65,2.51-.15.23-.08.54.16.69s.54.08.69-.16h0ZM96.43,102.28c.43-.89.88-1.77,1.34-2.65.13-.24.04-.55-.21-.68s-.55-.04-.68.21c-.47.88-.92,1.78-1.36,2.68-.12.25-.01.55.23.67s.55.01.67-.23h0ZM93.41,109.59c.33-.94.67-1.86,1.03-2.78.1-.26-.02-.55-.28-.65s-.55.02-.65.28c-.37.93-.72,1.87-1.05,2.82-.09.26.05.55.31.64s.55-.05.64-.31h0ZM91.25,117.18c.22-.97.45-1.92.71-2.87.07-.27-.09-.54-.35-.61s-.54.09-.61.35c-.26.96-.5,1.94-.72,2.92-.06.27.11.54.38.6s.54-.11.6-.38h0ZM89.95,124.96c.11-.98.24-1.96.38-2.94.04-.27-.15-.53-.42-.57s-.53.15-.57.42c-.15.99-.28,1.98-.39,2.98-.03.27.17.52.44.55s.52-.17.55-.44h0ZM89.53,132.84v-.13s0,0,0,0c0-.95.02-1.89.06-2.83.01-.28-.2-.51-.48-.52s-.51.2-.52.48c-.04.95-.06,1.91-.06,2.87h0s0,.13,0,.13c0,.28.22.5.5.5s.5-.22.5-.5h0ZM89.98,140.72c-.11-.98-.2-1.96-.27-2.95-.02-.28-.26-.48-.53-.46s-.48.26-.46.53c.07,1,.16,2,.28,2.99.03.27.28.47.55.44s.47-.28.44-.55h0ZM91.3,148.5c-.22-.96-.42-1.93-.6-2.9-.05-.27-.31-.45-.58-.4s-.45.31-.4.58c.18.99.39,1.97.61,2.94.06.27.33.44.6.38s.44-.33.38-.6h0ZM93.5,156.08c-.33-.93-.63-1.87-.92-2.81-.08-.26-.36-.41-.62-.33s-.41.36-.33.62c.29.96.6,1.91.94,2.85.09.26.38.4.64.31s.4-.38.31-.64h0ZM96.53,163.36c-.43-.89-.84-1.78-1.23-2.69-.11-.25-.4-.37-.66-.26s-.37.4-.26.66c.4.92.81,1.83,1.25,2.72.12.25.42.35.67.23s.35-.42.23-.67h0ZM100.36,170.25c-.53-.83-1.03-1.68-1.53-2.53-.14-.24-.44-.32-.68-.18s-.32.44-.18.68c.5.87,1.01,1.72,1.55,2.57.15.23.46.3.69.16s.3-.46.16-.69h0ZM104.93,176.67c-.62-.77-1.22-1.55-1.8-2.35-.16-.22-.48-.27-.7-.11s-.27.48-.11.7c.59.81,1.2,1.6,1.83,2.38.17.22.49.25.7.08s.25-.49.08-.7h0ZM110.2,182.55c-.7-.7-1.38-1.41-2.05-2.13-.19-.2-.5-.22-.71-.03s-.22.5-.03.71c.68.74,1.37,1.46,2.08,2.16.2.2.51.19.71,0s.19-.51,0-.71h0ZM116.09,187.81c-.77-.62-1.53-1.25-2.28-1.89-.21-.18-.52-.16-.71.05s-.16.52.05.71c.76.66,1.53,1.3,2.31,1.92.22.17.53.14.7-.08s.14-.53-.08-.7h0ZM122.54,192.37c-.84-.53-1.66-1.07-2.48-1.63-.23-.16-.54-.1-.7.13s-.1.54.13.7c.82.57,1.66,1.12,2.51,1.65.23.15.54.08.69-.16s.08-.54-.16-.69h0ZM129.45,196.19c-.89-.43-1.77-.88-2.65-1.34-.24-.13-.55-.04-.68.21s-.04.55.21.68c.88.47,1.78.93,2.68,1.36.25.12.55.01.67-.23s.01-.55-.23-.67h0ZM136.76,199.21c-.94-.33-1.86-.67-2.78-1.04-.26-.1-.55.02-.65.28-.1.26.02.55.28.65.93.37,1.87.72,2.82,1.05.26.09.55-.05.64-.31s-.05-.55-.31-.64h0ZM144.35,201.38c-.97-.22-1.92-.46-2.87-.71-.27-.07-.54.09-.61.35s.09.54.35.61c.96.26,1.94.5,2.91.72.27.06.54-.11.6-.38s-.11-.54-.38-.6h0ZM152.13,202.69c-.98-.11-1.96-.24-2.94-.39-.27-.04-.53.15-.57.42s.15.53.42.57c.99.15,1.98.28,2.98.39.27.03.52-.17.55-.44s-.17-.52-.44-.55h0ZM160.01,203.11h-.09c-.96,0-1.92-.02-2.88-.06-.28-.01-.51.2-.52.48s.2.51.48.52c.97.04,1.94.06,2.92.06h.09c.28,0,.5-.22.5-.5s-.22-.5-.5-.5ZM167.89,202.67c-.98.11-1.96.2-2.95.27-.28.02-.48.26-.46.53s.26.48.53.46c1-.07,2-.16,2.99-.27.27-.03.47-.28.44-.55s-.28-.47-.55-.44h0ZM175.67,201.34c-.96.22-1.93.42-2.9.6-.27.05-.45.31-.4.58s.31.45.58.4c.99-.18,1.97-.38,2.94-.61.27-.06.44-.33.38-.6s-.33-.44-.6-.38h0ZM183.26,199.16c-.93.33-1.87.63-2.81.92-.26.08-.41.36-.33.62s.36.41.62.33c.96-.29,1.91-.6,2.85-.93.26-.09.4-.38.31-.64s-.38-.4-.64-.31ZM190.53,196.13c-.89.43-1.78.84-2.69,1.23-.25.11-.37.4-.26.66.11.25.4.37.66.26.92-.4,1.83-.81,2.72-1.25.25-.12.35-.42.23-.67s-.42-.35-.67-.23ZM197.42,192.31c-.83.53-1.68,1.03-2.53,1.52-.24.14-.32.44-.19.68s.44.32.68.19c.87-.5,1.72-1.01,2.57-1.55.23-.15.3-.46.16-.69s-.46-.3-.69-.16h0ZM203.85,187.73c-.77.62-1.55,1.22-2.35,1.8-.22.16-.27.48-.11.7s.48.27.7.11c.81-.59,1.6-1.2,2.38-1.82.22-.17.25-.49.08-.7-.17-.22-.49-.25-.7-.08h0ZM209.73,182.47c-.7.7-1.41,1.38-2.14,2.05-.2.19-.22.5-.03.71s.5.22.71.03c.74-.68,1.46-1.37,2.17-2.08.2-.2.2-.51,0-.71-.2-.2-.51-.19-.71,0h0ZM214.99,176.58c-.62.77-1.25,1.53-1.9,2.28-.18.21-.16.52.05.71s.52.16.71-.05c.66-.76,1.3-1.53,1.92-2.31.17-.22.14-.53-.08-.7s-.53-.14-.7.08h0ZM219.56,170.14c-.53.84-1.07,1.66-1.63,2.48-.16.23-.1.54.13.7s.54.1.7-.13c.57-.82,1.12-1.66,1.65-2.51.15-.23.08-.54-.16-.69s-.54-.08-.69.16h0ZM223.39,163.22c-.43.89-.88,1.77-1.34,2.64-.13.24-.04.55.21.68.24.13.55.04.68-.21.47-.88.93-1.78,1.36-2.68.12-.25.02-.55-.23-.67-.25-.12-.55-.02-.67.23h0ZM226.41,155.92c-.33.94-.67,1.86-1.04,2.78-.1.26.02.55.28.65.26.1.55-.02.65-.28.37-.93.72-1.87,1.05-2.82.09-.26-.05-.55-.31-.64s-.55.05-.64.31h0ZM228.59,148.33c-.22.97-.46,1.92-.72,2.87-.07.27.09.54.35.61s.54-.09.61-.35c.26-.96.5-1.94.73-2.91.06-.27-.11-.54-.38-.6-.27-.06-.54.11-.6.38h0ZM229.89,140.55c-.11.98-.24,1.96-.39,2.94-.04.27.15.53.42.57s.53-.15.57-.42c.15-.99.28-1.98.39-2.98.03-.27-.17-.52-.44-.55-.27-.03-.52.17-.55.44h0ZM230.33,132.67v.04s0,0,0,0c0,.98-.02,1.95-.06,2.92-.01.28.2.51.48.52.28.01.51-.2.52-.48h0c.04-.98.06-1.97.06-2.96h0s0-.04,0-.04c0-.28-.22-.5-.5-.5-.28,0-.5.22-.5.5h0ZM229.89,124.79c.11.98.2,1.96.27,2.95.02.28.26.48.53.46s.48-.26.46-.53c-.07-1-.16-2-.27-2.99-.03-.27-.28-.47-.55-.44-.27.03-.47.28-.44.55h0ZM228.57,117.01c.22.96.42,1.93.6,2.9.05.27.31.45.58.4.27-.05.45-.31.4-.58-.18-.99-.38-1.97-.61-2.94-.06-.27-.33-.44-.6-.38-.27.06-.44.33-.38.6h0ZM226.38,109.42c.33.93.63,1.87.92,2.81.08.26.36.41.62.33.26-.08.41-.36.33-.62-.29-.96-.6-1.91-.93-2.85-.09-.26-.38-.4-.64-.31-.26.09-.4.38-.31.64h0ZM223.36,102.15c.43.89.84,1.78,1.23,2.69.11.25.4.37.66.26s.37-.4.26-.66c-.4-.92-.81-1.83-1.25-2.73-.12-.25-.42-.35-.67-.23s-.35.42-.23.67ZM219.54,95.25c.52.83,1.03,1.68,1.52,2.53.14.24.44.32.68.19s.32-.44.19-.68c-.5-.87-1.01-1.73-1.54-2.57-.15-.23-.46-.3-.69-.16s-.3.46-.16.69h0ZM214.97,88.82c.62.77,1.21,1.55,1.8,2.35.16.22.48.27.7.11s.27-.48.11-.7c-.59-.81-1.2-1.6-1.82-2.38-.17-.22-.49-.25-.7-.08-.22.17-.25.49-.08.7h0ZM209.71,82.94c.7.7,1.38,1.41,2.05,2.14.19.2.5.22.71.03s.22-.5.03-.71c-.68-.74-1.37-1.46-2.08-2.17-.2-.2-.51-.2-.71,0-.2.2-.2.51,0,.71h0ZM203.83,77.67c.77.62,1.53,1.25,2.28,1.9.21.18.52.16.71-.05s.16-.52-.05-.71c-.76-.66-1.52-1.3-2.31-1.92-.22-.17-.53-.14-.7.08-.17.22-.14.53.08.7h0ZM197.39,73.1c.84.53,1.66,1.07,2.47,1.63.23.16.54.1.7-.13.16-.23.1-.54-.13-.7-.82-.57-1.66-1.12-2.51-1.66-.23-.15-.54-.08-.69.16-.15.23-.08.54.16.69ZM190.48,69.27c.89.43,1.77.88,2.64,1.34.24.13.55.04.68-.2.13-.24.04-.55-.2-.68-.88-.47-1.78-.93-2.68-1.36-.25-.12-.55-.02-.67.23s-.02.55.23.67h0ZM183.17,66.24c.94.33,1.86.67,2.78,1.04.26.1.55-.02.65-.28s-.02-.55-.28-.65c-.93-.37-1.87-.72-2.82-1.05-.26-.09-.55.05-.64.31s.05.55.31.64ZM175.59,64.06c.97.22,1.92.46,2.87.72.27.07.54-.08.61-.35s-.08-.54-.35-.61c-.96-.26-1.93-.5-2.91-.73-.27-.06-.54.11-.6.38s.11.54.38.6h0ZM167.81,62.75c.98.11,1.96.24,2.94.39.27.04.53-.15.57-.42s-.15-.53-.42-.57c-.99-.15-1.98-.28-2.98-.4-.27-.03-.52.17-.55.44s.17.52.44.55h0Z"/>
        <path id="logo1" class="st3" d="M168.93,127.49c2.75-2.8,7.39-7.49,13.94-14.08-.28-.05-.56-.12-.83-.23-.04-.01-.08-.02-.11-.04-.16-.07-.31-.15-.46-.23-.09-.05-.17-.11-.25-.16-.05-.04-.11-.07-.16-.11-.1-.08-.2-.16-.29-.25-.02-.02-.05-.04-.08-.06-.09-.09-.19-.19-.27-.29-.51-.58-.85-1.28-1-2.03-1.18,1.31-2.83,3.11-4.94,5.39-1.12,1.21-1.81,1.95-2.06,2.23l.24.2c1.59-1.68,2.57-2.67,2.94-2.97s.66-.36.87-.18l1.75,1.47-4.73,4.41c-2.33,2.17-4.46,4.16-6.41,5.99,0,0-.01,0-.02,0-3.07-1.3-6-1.59-8.78-.88-2.78.71-4.64,2.17-5.58,4.37-.92,2.18-.68,4.77.72,7.81-4.71.27-7.78.58-9.21.94-1.85.45-3.34,1.09-4.46,1.91-1.13.82-1.91,1.77-2.37,2.83-.67,1.59-.5,3.39.52,5.41,1.02,2.01,3.06,3.67,6.13,4.97,3.75,1.58,7.35,1.94,10.8,1.04,3.45-.89,5.7-2.58,6.75-5.06,1.09-2.57.44-6.07-1.94-10.51,3.77.02,6.88-.46,9.3-1.45,1.85-.75,3.06-1.81,3.63-3.16.58-1.35.36-2.83-.64-4.41-.69-1.11-1.7-2.06-3.01-2.86h0ZM156.65,135.88c.32-.76.84-1.49,1.54-2.18.7-.69,1.32-1.11,1.87-1.25.32-.08.61-.11.88-.08-1.77,1.7-3.27,3.16-4.51,4.39.02-.26.09-.55.22-.87h0ZM166.51,128.44c-1.52,1.51-2.92,2.9-4.19,4.16-.15-.08-.29-.16-.46-.22,1.28-1.27,2.71-2.66,4.27-4.17.13.08.25.16.38.24h0ZM156.69,137.7s-.02-.05-.04-.08c1.32-1.38,2.99-3.06,5-5.04.15.08.28.18.39.29-2.04,2.04-3.74,3.75-5.09,5.13-.1-.09-.19-.18-.27-.29h0ZM157.24,138.7s-.05,0-.08,0c0-.02-.01-.03-.02-.05.04.01.07.03.11.04h0ZM160.54,137.22c-.75.67-1.43,1.05-2.05,1.15-.04,0-.07,0-.11.01,1.12-1.19,2.47-2.59,4.03-4.21-.04.24-.1.5-.22.78-.35.85-.91,1.61-1.66,2.28h0ZM157.87,138.38c-.18-.02-.34-.06-.5-.13,0,0-.01,0-.01,0,1.31-1.37,2.95-3.06,4.93-5.07.02.03.04.06.05.09.06.14.09.28.1.44-1.8,1.83-3.32,3.39-4.56,4.68h0ZM162.65,132.8c1.25-1.27,2.63-2.66,4.13-4.17.13.09.25.19.37.29-1.5,1.51-2.87,2.9-4.11,4.16-.12-.1-.25-.19-.39-.28h0ZM174.6,121.42c-2.13,2.14-4.1,4.11-5.9,5.93-.14-.08-.28-.15-.42-.23,2.24-2.24,5.77-5.73,10.6-10.5l.26.24-4.54,4.56h0ZM178.59,116.4l.08.08-4.59,4.51c-2.2,2.16-4.23,4.15-6.08,5.99-.13-.06-.26-.13-.39-.19,2.29-2.2,5.95-5.66,10.98-10.38h0ZM155.89,130.21c.65-1.51,1.87-2.52,3.66-3.02,1.8-.5,3.64-.34,5.54.47.18.08.35.16.51.24-1.62,1.54-3.11,2.94-4.44,4.22-.51-.13-1.05-.18-1.63-.15-.83.05-1.69.36-2.58.94-.57.37-1.02.81-1.37,1.29-.28-1.54-.18-2.88.31-4h0ZM157.67,150.09c-.37,1.18-1.15,2.23-2.34,3.15-1.19.91-2.56,1.48-4.11,1.69s-3.06.09-4.5-.36c-1.99-.63-3.49-1.7-4.5-3.2s-1.27-3.04-.77-4.6c.52-1.64,1.67-3.04,3.46-4.2,1.71-1.1,4.63-2.11,8.77-3.01-1.57,1.64-2.94,3.16-4.11,4.54-.65.78-1.16,1.45-1.54,2.05-.37.59-.51.92-.42,1.01.11.09.45-.13,1.01-.66.57-.54,1.77-1.85,3.6-3.96.87-.99,1.65-1.87,2.34-2.64.08.12.15.25.22.37-1.59,1.67-2.99,3.18-4.2,4.55-.67.75-1.21,1.41-1.64,1.96-.42.55-.61.85-.55.89.06.05.36-.19.91-.74s1.76-1.85,3.64-3.92c.77-.85,1.47-1.61,2.11-2.3.08.14.15.26.22.39-1.48,1.58-2.81,3.02-3.96,4.32-.67.76-1.22,1.41-1.64,1.95-.43.54-.62.84-.57.88.05.05.35-.21.89-.76.54-.55,1.75-1.86,3.63-3.93.68-.75,1.31-1.45,1.89-2.08,1.11,1.98,1.81,3.54,2.11,4.69.39,1.52.42,2.83.07,3.91h0ZM168.87,134.38c-.44,1.01-1.43,1.88-2.97,2.59-.86.39-2.14.75-3.84,1.06.8-.53,1.38-1.19,1.72-2.01.34-.8.32-1.52-.06-2.15-.12-.21-.28-.39-.47-.57,1.24-1.28,2.6-2.67,4.08-4.19.49.46.91.98,1.22,1.56.71,1.31.81,2.55.31,3.72h0Z"/>
      </g>
    </g>
    <g id="left">
      <g class="st1">
        <path d="M136.99,258.77c.13.14.2.31.2.5s-.07.36-.2.5c-.14.14-.3.21-.5.21h-10.79c-.11,0-.18.05-.19.15-1.42,5.53-3.52,9.68-6.29,12.47-.14.14-.31.21-.51.19-.2-.01-.36-.1-.49-.26-.13-.14-.19-.31-.19-.51,0-.21.08-.4.23-.55,2.54-2.53,4.47-6.31,5.78-11.34.01-.04,0-.08-.02-.11-.03-.03-.06-.04-.11-.04h-4.65c-.2,0-.37-.07-.5-.21-.14-.14-.2-.31-.2-.5s.07-.36.2-.5c.13-.14.3-.21.5-.21h5.01c.1,0,.16-.05.19-.15.18-.91.38-1.93.58-3.07.04-.2.14-.36.3-.49.14-.1.29-.15.45-.15.04,0,.08,0,.11.02.2.01.36.1.48.27.12.16.17.34.14.54-.18,1.02-.38,1.98-.58,2.88-.03.1,0,.15.11.15h10.44c.2,0,.37.07.5.21ZM130.72,272.26c0,.11.06.17.17.17h6.03c.18,0,.35.07.49.2.14.14.21.3.21.49s-.07.35-.21.49-.31.2-.49.2h-14.17c-.19,0-.34-.07-.48-.2s-.2-.3-.2-.49.07-.35.2-.49c.14-.13.29-.2.48-.2h6.33c.1,0,.15-.06.15-.17v-6.42c0-.11-.05-.17-.15-.17h-4.09c-.2,0-.37-.07-.5-.2-.14-.14-.2-.3-.2-.49s.07-.36.2-.49c.14-.13.3-.2.5-.2h10.91c.18,0,.35.07.49.2.14.14.21.3.21.49s-.07.35-.21.49c-.14.13-.31.2-.49.2h-5.01c-.11,0-.17.06-.17.17v6.42Z"/>
        <path d="M146.17,256.96c-.1.03-.15.09-.15.19v3.86c0,.1.05.15.15.15h3.45c.18,0,.34.07.48.2.13.14.2.3.2.48s-.07.34-.2.48-.3.2-.48.2h-3.45c-.1,0-.15.05-.15.15v1.3c0,.1.04.19.13.26.58.47,1.75,1.46,3.5,2.98.16.14.25.32.28.53.03.21-.02.4-.15.58-.11.14-.27.22-.46.23-.19.01-.35-.05-.48-.19-.68-.7-1.58-1.56-2.71-2.6-.01-.01-.04-.02-.06-.01-.03,0-.04.03-.04.07v7.91c0,.2-.07.37-.2.5s-.3.2-.49.2-.36-.07-.5-.2-.21-.3-.21-.5v-8.89s0-.04-.02-.04-.03,0-.04.02c-1.12,2.47-2.36,4.48-3.71,6.03-.13.13-.28.18-.47.15-.19-.03-.33-.12-.43-.29-.1-.16-.15-.34-.15-.52v-.11c.03-.23.12-.42.28-.58.78-.85,1.55-1.9,2.3-3.13.75-1.24,1.37-2.47,1.85-3.71.01-.04.01-.08-.01-.11-.02-.03-.05-.04-.07-.04h-3.47c-.19,0-.34-.07-.48-.2-.14-.13-.2-.29-.2-.48s.07-.34.2-.48.29-.2.48-.2h3.79c.1,0,.15-.05.15-.15v-3.56c0-.1-.05-.14-.15-.13-1.25.23-2.43.42-3.54.58-.17.01-.33-.02-.48-.12-.15-.09-.26-.22-.33-.39-.06-.14-.05-.28.02-.42.07-.14.18-.22.32-.25,3.4-.51,5.98-1.08,7.74-1.71.17-.06.33-.08.47-.08.3,0,.57.12.81.36.13.13.17.28.14.46-.04.18-.14.3-.31.35-.82.28-1.87.57-3.13.85ZM153.03,268.89c-.14.14-.31.21-.5.21s-.36-.07-.5-.21-.21-.31-.21-.49v-10.53c0-.2.07-.37.21-.5.14-.13.31-.2.5-.2s.36.07.5.2c.14.14.21.3.21.5v10.53c0,.19-.07.35-.21.49ZM157.19,255.74c0-.2.07-.37.21-.51s.31-.21.51-.21.37.07.51.21c.14.14.21.31.21.51v16.77c0,.5-.07.88-.22,1.14-.15.26-.39.46-.71.59-.53.17-1.55.26-3.07.26h-.02c-.23,0-.43-.07-.62-.2-.19-.14-.31-.32-.38-.54-.03-.06-.04-.12-.04-.19,0-.1.03-.19.08-.28.1-.14.23-.21.41-.21h2.58c.2-.01.34-.06.43-.14.08-.08.13-.22.13-.42v-16.77Z"/>
        <path d="M178.31,261.43c.18-.07.36-.06.53.03.17.09.27.23.3.42.01.07.02.14.02.19,0,.13-.04.26-.11.38-.1.18-.25.31-.45.36-.85.26-1.81.48-2.88.68-.11.03-.15.09-.11.19.5,1.08,1.04,2.2,1.64,3.35.07.16.11.31.11.45,0,.2-.07.38-.21.55-.21.27-.48.4-.79.4-.07,0-.14,0-.19-.02-.71-.1-1.68-.23-2.92-.41-.17-.01-.31-.09-.42-.22-.11-.13-.15-.29-.13-.46.02-.17.1-.31.22-.4.13-.1.28-.14.45-.13.67.09,1.36.16,2.07.23.04,0,.07-.01.09-.04s.01-.06,0-.09c-.27-.57-.72-1.56-1.36-2.98-.04-.1-.12-.14-.23-.13-1.59.21-3.41.32-5.46.32-1.05,0-2.17-.03-3.35-.09-.2-.01-.37-.09-.51-.23-.16-.16-.23-.34-.23-.55,0-.17.07-.32.21-.45.13-.13.29-.18.49-.17,1.29.1,2.54.15,3.75.15,1.58,0,3.09-.08,4.54-.26.1-.01.13-.07.09-.17-.44-.99-.7-1.6-.79-1.81-.04-.1-.11-.25-.2-.46-.09-.21-.16-.36-.2-.46-.03-.1-.1-.14-.21-.13-1.11.1-2.23.15-3.37.15s-2.24-.05-3.39-.15c-.2-.01-.37-.1-.52-.25s-.23-.33-.25-.54c-.01-.18.05-.34.18-.47.13-.13.29-.18.48-.17,1.36.13,2.64.19,3.84.19.85,0,1.67-.03,2.45-.09.1-.01.13-.07.08-.17-.1-.26-.18-.45-.26-.6-.13-.28-.24-.52-.34-.7-.1-.2-.1-.4-.01-.6s.25-.32.46-.36c.07-.01.14-.02.21-.02.17,0,.33.04.49.13.21.13.36.32.45.58.14.41.31.88.51,1.41.04.1.11.14.21.13,1.29-.2,2.46-.46,3.5-.79.18-.06.36-.04.53.06.17.1.27.24.3.43.04.2.01.39-.1.56-.11.18-.26.3-.46.35-.99.27-2.07.5-3.22.68-.11.01-.15.07-.11.17l.32.75c.1.23.38.88.85,1.96.04.08.11.12.21.11,1.18-.23,2.24-.5,3.18-.81ZM165.12,267.76c.06-.21.18-.38.36-.5.18-.12.38-.17.6-.16.2.03.35.12.45.28.1.16.12.33.06.51-.18.61-.28,1.11-.28,1.49,0,.9.37,1.58,1.12,2.07.75.48,1.88.73,3.4.73,1.61,0,3.1-.11,4.48-.32.2-.04.37,0,.52.14.15.14.22.3.22.5-.01.23-.1.43-.25.6-.15.17-.33.27-.54.3-1.41.18-2.86.28-4.37.28-1.95,0-3.44-.33-4.49-1-1.04-.67-1.57-1.65-1.57-2.94,0-.6.09-1.25.28-1.96Z"/>
        <path d="M200.46,255.68c.34,0,.63.12.88.37.25.25.37.54.37.88v15.01c0,.5-.08.87-.22,1.13s-.39.44-.73.55c-.47.17-1.56.26-3.26.26h-.02c-.2,0-.38-.07-.55-.2-.17-.14-.3-.31-.38-.52-.06-.16-.04-.31.05-.45.09-.14.22-.21.37-.21.54.01,1.03.02,1.47.02.47,0,.9,0,1.28-.02.38-.01.58-.2.58-.55v-4.52c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v5.67c0,.2-.07.37-.21.51-.14.14-.31.21-.51.21s-.37-.07-.51-.21-.21-.31-.21-.51v-5.67c0-.1-.06-.15-.17-.15h-5.29c-.11,0-.18.05-.19.15-.36,2.56-1.11,4.6-2.26,6.14-.13.14-.28.21-.47.21s-.35-.06-.49-.19-.23-.29-.26-.49c-.01-.03-.02-.06-.02-.11,0-.14.05-.28.15-.41.53-.71.95-1.55,1.28-2.52.41-1.21.66-2.28.76-3.23.09-.94.14-2.05.14-3.31v-6.59c0-.34.12-.64.37-.88.25-.25.54-.37.88-.37h13.28ZM187.27,265.74c-.01.11.04.17.15.17h5.16c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.07c-.11,0-.17.06-.17.17v1.26c0,.8-.02,1.53-.06,2.22ZM192.74,257.19c0-.1-.06-.15-.17-.15h-5.07c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.07c.11,0,.17-.06.17-.17v-3.37ZM200.12,260.73c.11,0,.17-.06.17-.17v-3.37c0-.1-.06-.15-.17-.15h-5.75c-.11,0-.17.05-.17.15v3.37c0,.11.06.17.17.17h5.75ZM194.19,265.76c0,.1.06.15.17.15h5.75c.11,0,.17-.05.17-.15v-3.5c0-.11-.06-.17-.17-.17h-5.75c-.11,0-.17.06-.17.17v3.5Z"/>
      </g>
      <g id="right1" data-name="right">
        <g>
          <path class="st2" d="M221.67,191.19c11.25-4.25,19.66-11.26,23.91-20.97,4.23-9.67,3.69-20.57-.77-31.67l-.05-.13c2.34-34.78-17.01-68.9-50.72-83.65-33.71-14.75-71.9-5.81-95.86,19.51l-.09-.04c-11.25,4.25-19.66,11.26-23.91,20.97-4.25,9.71-3.69,20.65.82,31.8v-.03s.03.05.03.05h-.03c-2.34,34.77,17.01,68.88,50.72,83.63,33.3,14.57,70.96,6.02,94.97-18.58l.98-.89Z"/>
          <path class="st3" d="M159.76,62.31h.17c.99,0,1.98.02,2.96.06.28.01.51-.2.52-.48s-.2-.51-.48-.52c-1-.04-2-.06-3-.06h-.17c-.28,0-.5.23-.5.5s.23.5.5.5h0ZM151.88,62.77c.98-.11,1.96-.2,2.95-.27.28-.02.48-.26.46-.53s-.26-.48-.53-.46c-1,.07-2,.16-2.99.28-.27.03-.47.28-.44.55s.28.47.55.44h0ZM144.1,64.1c.96-.22,1.93-.42,2.9-.6.27-.05.45-.31.4-.58s-.31-.45-.58-.4c-.99.18-1.97.39-2.94.61-.27.06-.44.33-.38.6s.33.44.6.38ZM136.52,66.3c.93-.33,1.87-.64,2.81-.92.26-.08.41-.36.33-.62s-.36-.41-.62-.33c-.96.29-1.91.61-2.85.94-.26.09-.4.38-.31.64s.38.4.64.31h0ZM129.25,69.33c.88-.43,1.78-.84,2.68-1.23.25-.11.37-.4.26-.66s-.4-.37-.66-.26c-.92.4-1.83.82-2.72,1.25-.25.12-.35.42-.23.67.12.25.42.35.67.23h0ZM122.36,73.17c.83-.53,1.68-1.04,2.53-1.53.24-.14.32-.44.18-.68s-.44-.32-.68-.18c-.87.5-1.72,1.02-2.57,1.55-.23.15-.3.46-.16.69s.46.3.69.16h0ZM115.93,77.75c.77-.62,1.55-1.22,2.35-1.8.22-.16.27-.48.11-.7s-.48-.27-.7-.11c-.81.59-1.6,1.2-2.38,1.83-.22.17-.25.49-.08.7s.49.25.7.08h0ZM110.06,83.02c.7-.7,1.41-1.38,2.13-2.05.2-.19.22-.5.03-.71s-.5-.22-.71-.03c-.74.68-1.46,1.37-2.16,2.08-.19.2-.19.51,0,.71s.51.19.71,0h0ZM104.81,88.91c.62-.77,1.25-1.53,1.89-2.28.18-.21.16-.52-.05-.71s-.52-.16-.71.05c-.66.76-1.3,1.53-1.92,2.31-.17.22-.14.53.08.7s.53.14.7-.08h0ZM100.24,95.36c.53-.84,1.07-1.66,1.63-2.48.16-.23.1-.54-.13-.7s-.54-.1-.7.13c-.57.83-1.12,1.66-1.65,2.51-.15.23-.08.54.16.69s.54.08.69-.16h0ZM96.43,102.28c.43-.89.88-1.77,1.34-2.65.13-.24.04-.55-.21-.68s-.55-.04-.68.21c-.47.88-.92,1.78-1.36,2.68-.12.25-.01.55.23.67s.55.01.67-.23h0ZM93.41,109.59c.33-.94.67-1.86,1.03-2.78.1-.26-.02-.55-.28-.65s-.55.02-.65.28c-.37.93-.72,1.87-1.05,2.82-.09.26.05.55.31.64s.55-.05.64-.31h0ZM91.25,117.18c.22-.97.45-1.92.71-2.87.07-.27-.09-.54-.35-.61s-.54.09-.61.35c-.26.96-.5,1.94-.72,2.92-.06.27.11.54.38.6s.54-.11.6-.38h0ZM89.95,124.96c.11-.98.24-1.96.38-2.94.04-.27-.15-.53-.42-.57s-.53.15-.57.42c-.15.99-.28,1.98-.39,2.98-.03.27.17.52.44.55s.52-.17.55-.44h0ZM89.53,132.84v-.13s0,0,0,0c0-.95.02-1.89.06-2.83.01-.28-.2-.51-.48-.52s-.51.2-.52.48c-.04.95-.06,1.91-.06,2.87h0s0,.13,0,.13c0,.28.22.5.5.5s.5-.22.5-.5h0ZM89.98,140.72c-.11-.98-.2-1.96-.27-2.95-.02-.28-.26-.48-.53-.46s-.48.26-.46.53c.07,1,.16,2,.28,2.99.03.27.28.47.55.44s.47-.28.44-.55h0ZM91.3,148.5c-.22-.96-.42-1.93-.6-2.9-.05-.27-.31-.45-.58-.4s-.45.31-.4.58c.18.99.39,1.97.61,2.94.06.27.33.44.6.38s.44-.33.38-.6h0ZM93.5,156.08c-.33-.93-.63-1.87-.92-2.81-.08-.26-.36-.41-.62-.33s-.41.36-.33.62c.29.96.6,1.91.94,2.85.09.26.38.4.64.31s.4-.38.31-.64h0ZM96.53,163.36c-.43-.89-.84-1.78-1.23-2.69-.11-.25-.4-.37-.66-.26s-.37.4-.26.66c.4.92.81,1.83,1.25,2.72.12.25.42.35.67.23s.35-.42.23-.67h0ZM100.36,170.25c-.53-.83-1.03-1.68-1.53-2.53-.14-.24-.44-.32-.68-.18s-.32.44-.18.68c.5.87,1.01,1.72,1.55,2.57.15.23.46.3.69.16s.3-.46.16-.69h0ZM104.93,176.67c-.62-.77-1.22-1.55-1.8-2.35-.16-.22-.48-.27-.7-.11s-.27.48-.11.7c.59.81,1.2,1.6,1.83,2.38.17.22.49.25.7.08s.25-.49.08-.7h0ZM110.2,182.55c-.7-.7-1.38-1.41-2.05-2.13-.19-.2-.5-.22-.71-.03s-.22.5-.03.71c.68.74,1.37,1.46,2.08,2.16.2.2.51.19.71,0s.19-.51,0-.71h0ZM116.09,187.81c-.77-.62-1.53-1.25-2.28-1.89-.21-.18-.52-.16-.71.05s-.16.52.05.71c.76.66,1.53,1.3,2.31,1.92.22.17.53.14.7-.08s.14-.53-.08-.7h0ZM122.54,192.37c-.84-.53-1.66-1.07-2.48-1.63-.23-.16-.54-.1-.7.13s-.1.54.13.7c.82.57,1.66,1.12,2.51,1.65.23.15.54.08.69-.16s.08-.54-.16-.69h0ZM129.45,196.19c-.89-.43-1.77-.88-2.65-1.34-.24-.13-.55-.04-.68.21s-.04.55.21.68c.88.47,1.78.93,2.68,1.36.25.12.55.01.67-.23s.01-.55-.23-.67h0ZM136.76,199.21c-.94-.33-1.86-.67-2.78-1.04-.26-.1-.55.02-.65.28-.1.26.02.55.28.65.93.37,1.87.72,2.82,1.05.26.09.55-.05.64-.31s-.05-.55-.31-.64h0ZM144.35,201.38c-.97-.22-1.92-.46-2.87-.71-.27-.07-.54.09-.61.35s.09.54.35.61c.96.26,1.94.5,2.91.72.27.06.54-.11.6-.38s-.11-.54-.38-.6h0ZM152.13,202.69c-.98-.11-1.96-.24-2.94-.39-.27-.04-.53.15-.57.42s.15.53.42.57c.99.15,1.98.28,2.98.39.27.03.52-.17.55-.44s-.17-.52-.44-.55h0ZM160.01,203.11h-.09c-.96,0-1.92-.02-2.88-.06-.28-.01-.51.2-.52.48s.2.51.48.52c.97.04,1.94.06,2.92.06h.09c.28,0,.5-.22.5-.5s-.22-.5-.5-.5ZM167.89,202.67c-.98.11-1.96.2-2.95.27-.28.02-.48.26-.46.53s.26.48.53.46c1-.07,2-.16,2.99-.27.27-.03.47-.28.44-.55s-.28-.47-.55-.44h0ZM175.67,201.34c-.96.22-1.93.42-2.9.6-.27.05-.45.31-.4.58s.31.45.58.4c.99-.18,1.97-.38,2.94-.61.27-.06.44-.33.38-.6s-.33-.44-.6-.38h0ZM183.26,199.16c-.93.33-1.87.63-2.81.92-.26.08-.41.36-.33.62s.36.41.62.33c.96-.29,1.91-.6,2.85-.93.26-.09.4-.38.31-.64s-.38-.4-.64-.31ZM190.53,196.13c-.89.43-1.78.84-2.69,1.23-.25.11-.37.4-.26.66.11.25.4.37.66.26.92-.4,1.83-.81,2.72-1.25.25-.12.35-.42.23-.67s-.42-.35-.67-.23ZM197.42,192.31c-.83.53-1.68,1.03-2.53,1.52-.24.14-.32.44-.19.68s.44.32.68.19c.87-.5,1.72-1.01,2.57-1.55.23-.15.3-.46.16-.69s-.46-.3-.69-.16h0ZM203.85,187.73c-.77.62-1.55,1.22-2.35,1.8-.22.16-.27.48-.11.7s.48.27.7.11c.81-.59,1.6-1.2,2.38-1.82.22-.17.25-.49.08-.7-.17-.22-.49-.25-.7-.08h0ZM209.73,182.47c-.7.7-1.41,1.38-2.14,2.05-.2.19-.22.5-.03.71s.5.22.71.03c.74-.68,1.46-1.37,2.17-2.08.2-.2.2-.51,0-.71-.2-.2-.51-.19-.71,0h0ZM214.99,176.58c-.62.77-1.25,1.53-1.9,2.28-.18.21-.16.52.05.71s.52.16.71-.05c.66-.76,1.3-1.53,1.92-2.31.17-.22.14-.53-.08-.7s-.53-.14-.7.08h0ZM219.56,170.14c-.53.84-1.07,1.66-1.63,2.48-.16.23-.1.54.13.7s.54.1.7-.13c.57-.82,1.12-1.66,1.65-2.51.15-.23.08-.54-.16-.69s-.54-.08-.69.16h0ZM223.39,163.22c-.43.89-.88,1.77-1.34,2.64-.13.24-.04.55.21.68.24.13.55.04.68-.21.47-.88.93-1.78,1.36-2.68.12-.25.02-.55-.23-.67-.25-.12-.55-.02-.67.23h0ZM226.41,155.92c-.33.94-.67,1.86-1.04,2.78-.1.26.02.55.28.65.26.1.55-.02.65-.28.37-.93.72-1.87,1.05-2.82.09-.26-.05-.55-.31-.64s-.55.05-.64.31h0ZM228.59,148.33c-.22.97-.46,1.92-.72,2.87-.07.27.09.54.35.61s.54-.09.61-.35c.26-.96.5-1.94.73-2.91.06-.27-.11-.54-.38-.6-.27-.06-.54.11-.6.38h0ZM229.89,140.55c-.11.98-.24,1.96-.39,2.94-.04.27.15.53.42.57s.53-.15.57-.42c.15-.99.28-1.98.39-2.98.03-.27-.17-.52-.44-.55-.27-.03-.52.17-.55.44h0ZM230.33,132.67v.04s0,0,0,0c0,.98-.02,1.95-.06,2.92-.01.28.2.51.48.52.28.01.51-.2.52-.48h0c.04-.98.06-1.97.06-2.96h0s0-.04,0-.04c0-.28-.22-.5-.5-.5-.28,0-.5.22-.5.5h0ZM229.89,124.79c.11.98.2,1.96.27,2.95.02.28.26.48.53.46s.48-.26.46-.53c-.07-1-.16-2-.27-2.99-.03-.27-.28-.47-.55-.44-.27.03-.47.28-.44.55h0ZM228.57,117.01c.22.96.42,1.93.6,2.9.05.27.31.45.58.4.27-.05.45-.31.4-.58-.18-.99-.38-1.97-.61-2.94-.06-.27-.33-.44-.6-.38-.27.06-.44.33-.38.6h0ZM226.38,109.42c.33.93.63,1.87.92,2.81.08.26.36.41.62.33.26-.08.41-.36.33-.62-.29-.96-.6-1.91-.93-2.85-.09-.26-.38-.4-.64-.31-.26.09-.4.38-.31.64h0ZM223.36,102.15c.43.89.84,1.78,1.23,2.69.11.25.4.37.66.26s.37-.4.26-.66c-.4-.92-.81-1.83-1.25-2.73-.12-.25-.42-.35-.67-.23s-.35.42-.23.67ZM219.54,95.25c.52.83,1.03,1.68,1.52,2.53.14.24.44.32.68.19s.32-.44.19-.68c-.5-.87-1.01-1.73-1.54-2.57-.15-.23-.46-.3-.69-.16s-.3.46-.16.69h0ZM214.97,88.82c.62.77,1.21,1.55,1.8,2.35.16.22.48.27.7.11s.27-.48.11-.7c-.59-.81-1.2-1.6-1.82-2.38-.17-.22-.49-.25-.7-.08-.22.17-.25.49-.08.7h0ZM209.71,82.94c.7.7,1.38,1.41,2.05,2.14.19.2.5.22.71.03s.22-.5.03-.71c-.68-.74-1.37-1.46-2.08-2.17-.2-.2-.51-.2-.71,0-.2.2-.2.51,0,.71h0ZM203.83,77.67c.77.62,1.53,1.25,2.28,1.9.21.18.52.16.71-.05s.16-.52-.05-.71c-.76-.66-1.52-1.3-2.31-1.92-.22-.17-.53-.14-.7.08-.17.22-.14.53.08.7h0ZM197.39,73.1c.84.53,1.66,1.07,2.47,1.63.23.16.54.1.7-.13.16-.23.1-.54-.13-.7-.82-.57-1.66-1.12-2.51-1.66-.23-.15-.54-.08-.69.16-.15.23-.08.54.16.69ZM190.48,69.27c.89.43,1.77.88,2.64,1.34.24.13.55.04.68-.2.13-.24.04-.55-.2-.68-.88-.47-1.78-.93-2.68-1.36-.25-.12-.55-.02-.67.23s-.02.55.23.67h0ZM183.17,66.24c.94.33,1.86.67,2.78,1.04.26.1.55-.02.65-.28s-.02-.55-.28-.65c-.93-.37-1.87-.72-2.82-1.05-.26-.09-.55.05-.64.31s.05.55.31.64ZM175.59,64.06c.97.22,1.92.46,2.87.72.27.07.54-.08.61-.35s-.08-.54-.35-.61c-.96-.26-1.93-.5-2.91-.73-.27-.06-.54.11-.6.38s.11.54.38.6h0ZM167.81,62.75c.98.11,1.96.24,2.94.39.27.04.53-.15.57-.42s-.15-.53-.42-.57c-.99-.15-1.98-.28-2.98-.4-.27-.03-.52.17-.55.44s.17.52.44.55h0Z"/>
          <path id="logo11" data-name="logo1" class="st3" d="M168.93,127.49c2.75-2.8,7.39-7.49,13.94-14.08-.28-.05-.56-.12-.83-.23-.04-.01-.08-.02-.11-.04-.16-.07-.31-.15-.46-.23-.09-.05-.17-.11-.25-.16-.05-.04-.11-.07-.16-.11-.1-.08-.2-.16-.29-.25-.02-.02-.05-.04-.08-.06-.09-.09-.19-.19-.27-.29-.51-.58-.85-1.28-1-2.03-1.18,1.31-2.83,3.11-4.94,5.39-1.12,1.21-1.81,1.95-2.06,2.23l.24.2c1.59-1.68,2.57-2.67,2.94-2.97s.66-.36.87-.18l1.75,1.47-4.73,4.41c-2.33,2.17-4.46,4.16-6.41,5.99,0,0-.01,0-.02,0-3.07-1.3-6-1.59-8.78-.88-2.78.71-4.64,2.17-5.58,4.37-.92,2.18-.68,4.77.72,7.81-4.71.27-7.78.58-9.21.94-1.85.45-3.34,1.09-4.46,1.91-1.13.82-1.91,1.77-2.37,2.83-.67,1.59-.5,3.39.52,5.41,1.02,2.01,3.06,3.67,6.13,4.97,3.75,1.58,7.35,1.94,10.8,1.04,3.45-.89,5.7-2.58,6.75-5.06,1.09-2.57.44-6.07-1.94-10.51,3.77.02,6.88-.46,9.3-1.45,1.85-.75,3.06-1.81,3.63-3.16.58-1.35.36-2.83-.64-4.41-.69-1.11-1.7-2.06-3.01-2.86h0ZM156.65,135.88c.32-.76.84-1.49,1.54-2.18.7-.69,1.32-1.11,1.87-1.25.32-.08.61-.11.88-.08-1.77,1.7-3.27,3.16-4.51,4.39.02-.26.09-.55.22-.87h0ZM166.51,128.44c-1.52,1.51-2.92,2.9-4.19,4.16-.15-.08-.29-.16-.46-.22,1.28-1.27,2.71-2.66,4.27-4.17.13.08.25.16.38.24h0ZM156.69,137.7s-.02-.05-.04-.08c1.32-1.38,2.99-3.06,5-5.04.15.08.28.18.39.29-2.04,2.04-3.74,3.75-5.09,5.13-.1-.09-.19-.18-.27-.29h0ZM157.24,138.7s-.05,0-.08,0c0-.02-.01-.03-.02-.05.04.01.07.03.11.04h0ZM160.54,137.22c-.75.67-1.43,1.05-2.05,1.15-.04,0-.07,0-.11.01,1.12-1.19,2.47-2.59,4.03-4.21-.04.24-.1.5-.22.78-.35.85-.91,1.61-1.66,2.28h0ZM157.87,138.38c-.18-.02-.34-.06-.5-.13,0,0-.01,0-.01,0,1.31-1.37,2.95-3.06,4.93-5.07.02.03.04.06.05.09.06.14.09.28.1.44-1.8,1.83-3.32,3.39-4.56,4.68h0ZM162.65,132.8c1.25-1.27,2.63-2.66,4.13-4.17.13.09.25.19.37.29-1.5,1.51-2.87,2.9-4.11,4.16-.12-.1-.25-.19-.39-.28h0ZM174.6,121.42c-2.13,2.14-4.1,4.11-5.9,5.93-.14-.08-.28-.15-.42-.23,2.24-2.24,5.77-5.73,10.6-10.5l.26.24-4.54,4.56h0ZM178.59,116.4l.08.08-4.59,4.51c-2.2,2.16-4.23,4.15-6.08,5.99-.13-.06-.26-.13-.39-.19,2.29-2.2,5.95-5.66,10.98-10.38h0ZM155.89,130.21c.65-1.51,1.87-2.52,3.66-3.02,1.8-.5,3.64-.34,5.54.47.18.08.35.16.51.24-1.62,1.54-3.11,2.94-4.44,4.22-.51-.13-1.05-.18-1.63-.15-.83.05-1.69.36-2.58.94-.57.37-1.02.81-1.37,1.29-.28-1.54-.18-2.88.31-4h0ZM157.67,150.09c-.37,1.18-1.15,2.23-2.34,3.15-1.19.91-2.56,1.48-4.11,1.69s-3.06.09-4.5-.36c-1.99-.63-3.49-1.7-4.5-3.2s-1.27-3.04-.77-4.6c.52-1.64,1.67-3.04,3.46-4.2,1.71-1.1,4.63-2.11,8.77-3.01-1.57,1.64-2.94,3.16-4.11,4.54-.65.78-1.16,1.45-1.54,2.05-.37.59-.51.92-.42,1.01.11.09.45-.13,1.01-.66.57-.54,1.77-1.85,3.6-3.96.87-.99,1.65-1.87,2.34-2.64.08.12.15.25.22.37-1.59,1.67-2.99,3.18-4.2,4.55-.67.75-1.21,1.41-1.64,1.96-.42.55-.61.85-.55.89.06.05.36-.19.91-.74s1.76-1.85,3.64-3.92c.77-.85,1.47-1.61,2.11-2.3.08.14.15.26.22.39-1.48,1.58-2.81,3.02-3.96,4.32-.67.76-1.22,1.41-1.64,1.95-.43.54-.62.84-.57.88.05.05.35-.21.89-.76.54-.55,1.75-1.86,3.63-3.93.68-.75,1.31-1.45,1.89-2.08,1.11,1.98,1.81,3.54,2.11,4.69.39,1.52.42,2.83.07,3.91h0ZM168.87,134.38c-.44,1.01-1.43,1.88-2.97,2.59-.86.39-2.14.75-3.84,1.06.8-.53,1.38-1.19,1.72-2.01.34-.8.32-1.52-.06-2.15-.12-.21-.28-.39-.47-.57,1.24-1.28,2.6-2.67,4.08-4.19.49.46.91.98,1.22,1.56.71,1.31.81,2.55.31,3.72h0Z"/>
        </g>
      </g>
    </g>
    <g id="size" class="st1">
      <path d="M119.33,33.18l7.66-10.32-6.75-9.48h3.12l3.59,5.08c.75,1.05,1.28,1.86,1.59,2.43.44-.72.96-1.47,1.57-2.26l3.98-5.25h2.85l-6.96,9.33,7.5,10.47h-3.24l-4.98-7.06c-.28-.41-.57-.85-.86-1.32-.44.72-.76,1.22-.95,1.49l-4.97,6.9h-3.15Z"/>
      <path d="M137.78,33.18l7.66-10.32-6.75-9.48h3.12l3.59,5.08c.75,1.05,1.28,1.86,1.59,2.43.44-.72.96-1.47,1.57-2.26l3.98-5.25h2.85l-6.96,9.33,7.5,10.47h-3.24l-4.98-7.06c-.28-.41-.57-.85-.86-1.32-.44.72-.76,1.22-.95,1.49l-4.97,6.9h-3.15Z"/>
      <path d="M157.94,33.18v-14.35h2.17v2.01c.45-.7,1.05-1.27,1.8-1.7s1.6-.64,2.55-.64c1.06,0,1.93.22,2.61.66s1.16,1.06,1.44,1.85c1.13-1.67,2.61-2.51,4.43-2.51,1.42,0,2.52.39,3.28,1.18s1.15,2,1.15,3.64v9.85h-2.42v-9.04c0-.97-.08-1.67-.24-2.1s-.44-.77-.86-1.03-.9-.39-1.46-.39c-1.01,0-1.85.34-2.51,1.01s-1,1.74-1,3.22v8.33h-2.43v-9.32c0-1.08-.2-1.89-.59-2.43s-1.04-.81-1.95-.81c-.68,0-1.32.18-1.9.54s-1,.89-1.26,1.58-.39,1.69-.39,3v7.44h-2.43Z"/>
      <path d="M180.98,33.18v-14.35h2.17v2.01c.45-.7,1.05-1.27,1.8-1.7s1.6-.64,2.55-.64c1.06,0,1.93.22,2.61.66s1.16,1.06,1.44,1.85c1.13-1.67,2.61-2.51,4.43-2.51,1.42,0,2.52.39,3.28,1.18s1.15,2,1.15,3.64v9.85h-2.42v-9.04c0-.97-.08-1.67-.24-2.1s-.44-.77-.86-1.03-.9-.39-1.46-.39c-1.01,0-1.85.34-2.51,1.01s-1,1.74-1,3.22v8.33h-2.43v-9.32c0-1.08-.2-1.89-.59-2.43s-1.04-.81-1.95-.81c-.68,0-1.32.18-1.9.54s-1,.89-1.26,1.58-.39,1.69-.39,3v7.44h-2.43Z"/>
    </g>
    <g id="caption">
      <g class="st1">
        <path d="M112.27,2.38s.02.06.07.06h.98c.16,0,.31,0,.46,0,.09,0,.17.02.24.08.07.06.1.14.1.22,0,.09-.03.17-.1.24s-.15.09-.24.09c-.15,0-.3,0-.45,0h-.98s-.07.02-.07.07v.25c0,.6-.03,1.11-.1,1.53-.06.43-.18.82-.35,1.18-.17.36-.39.67-.68.94s-.65.51-1.08.74c-.08.04-.16.05-.24.05-.03,0-.06,0-.09,0-.11-.02-.2-.06-.28-.14-.04-.04-.07-.09-.07-.14s0-.1.03-.15.07-.08.12-.1c.37-.16.68-.34.92-.53s.46-.43.65-.72.32-.65.4-1.07.13-.93.13-1.52v-.31s-.02-.07-.06-.07h-2.5s-.07.02-.07.07v1.42c0,.12,0,.26.02.44,0,.09-.03.18-.1.25s-.15.11-.25.11c-.09,0-.17-.04-.24-.11s-.09-.15-.09-.25c.01-.16.02-.31.02-.44v-1.42s-.02-.07-.07-.07h-.94c-.15,0-.33,0-.54.02-.09,0-.17-.03-.24-.1s-.1-.14-.1-.24.03-.17.1-.23c.07-.06.15-.09.24-.08.21.01.39.02.54.02h.94s.07-.02.07-.06v-1.13c0-.09,0-.18,0-.27s.02-.18.09-.25.14-.11.24-.11.17.03.24.1c.06.07.09.15.09.25,0,.09,0,.18,0,.26v1.14s.02.06.07.06h2.5s.06-.02.06-.06v-1.1c0-.11,0-.23,0-.35,0-.1.02-.19.09-.26.06-.07.15-.11.24-.11s.18.04.25.11c.07.07.1.16.08.26,0,.12,0,.24,0,.35v1.1Z"/>
        <path d="M122.04,1.85s.09,0,.12,0c.14,0,.25.03.34.1.11.06.17.16.17.27,0,.04,0,.07-.02.11,0,.04-.02.12-.05.26-.18,1.11-.47,2.02-.9,2.72-.31.54-.73,1.01-1.27,1.43-.54.41-1.16.74-1.89.98-.06.02-.12.03-.18.03-.05,0-.11,0-.16-.03-.12-.03-.22-.09-.3-.18-.06-.06-.07-.14-.04-.22s.09-.13.18-.16c.16-.05.32-.1.47-.15.49-.16.96-.4,1.42-.74s.83-.71,1.1-1.13c.22-.35.41-.77.55-1.25s.25-.93.3-1.36c0-.05-.01-.07-.06-.07h-4.99s-.07.02-.07.07v1.76c0,.1-.02.18-.09.25-.06.07-.14.1-.24.1-.09,0-.16-.04-.23-.11-.06-.06-.09-.14-.09-.23v-1.96c0-.13.05-.25.14-.34s.21-.14.33-.14h0c.09,0,.2,0,.32,0h1.93s.07-.02.07-.07V.71c0-.09.02-.17.09-.24.06-.08.15-.11.25-.11s.19.04.25.11c.06.07.1.15.1.24v.3s0,.79,0,.79c0,.05.02.07.06.07h2.03c.14,0,.25,0,.34-.02Z"/>
        <path d="M125.94,7.61s-.08,0-.12,0c-.07,0-.14-.01-.21-.04-.11-.05-.19-.12-.25-.22-.03-.04-.04-.08-.04-.13,0-.04,0-.07.03-.11.04-.08.11-.13.19-.15,1.18-.22,2.26-.65,3.23-1.27.59-.37,1.12-.82,1.61-1.34.49-.52.88-1.06,1.18-1.59.04-.07.1-.11.18-.11h0c.08,0,.13.04.18.11.06.12.1.23.1.34,0,.12-.03.23-.1.34-.33.53-.74,1.05-1.21,1.54s-.99.92-1.57,1.29c-1.01.65-2.08,1.1-3.2,1.35ZM125.67,1.67c-.07-.05-.11-.12-.12-.21s.02-.16.07-.23c.07-.07.15-.11.25-.12h.04c.08,0,.15.02.22.07.62.45,1.2.93,1.74,1.42.08.06.11.14.11.24s-.03.18-.1.25-.15.11-.25.11-.18-.03-.25-.1c-.57-.54-1.15-1.02-1.71-1.43Z"/>
        <path d="M136.28,1.63v1.44s.02.07.06.08c1.22.38,2.38.81,3.47,1.31.09.05.16.12.19.21.02.05.03.09.03.14,0,.05,0,.1-.03.15-.04.09-.11.16-.2.19s-.18.03-.28-.01c-.96-.48-2.02-.91-3.19-1.28-.01,0-.02,0-.04.01-.01,0-.02.02-.02.04v2.97s.03.67.03.67c0,.1-.03.18-.1.25-.07.08-.16.11-.26.11s-.19-.04-.26-.11c-.06-.07-.09-.15-.09-.25v-.68s0-5.25,0-5.25l-.02-.54c0-.09.03-.18.1-.25.06-.08.15-.11.25-.11s.19.04.26.11c.06.07.1.15.1.25l-.03.54ZM139.4,2.24c.04.06.04.12.02.18s-.07.11-.13.14-.13.03-.2,0-.12-.07-.15-.13c-.18-.35-.37-.66-.55-.94-.04-.05-.04-.11-.03-.17.02-.06.06-.1.11-.13.06-.03.13-.03.2-.01s.12.06.16.12c.22.33.41.64.56.93ZM139.47,1.07s-.04-.08-.04-.12c0-.02,0-.04,0-.05.02-.06.05-.1.11-.13.04-.02.08-.04.13-.04.02,0,.05,0,.07.02.07.01.13.05.17.11.22.32.41.62.58.92.02.04.03.07.03.11,0,.02,0,.05,0,.07-.02.07-.06.12-.12.15-.04.02-.08.03-.11.03-.03,0-.06,0-.09-.02-.06-.02-.11-.06-.15-.12-.18-.33-.36-.64-.56-.92Z"/>
        <path d="M144.19,4.1c.04-.08.1-.13.18-.15.08-.03.16-.02.24.02s.13.1.16.18c.03.08.02.16-.02.23-.36.64-.82,1.29-1.36,1.93-.06.08-.15.12-.24.13s-.18,0-.26-.07-.12-.13-.12-.23c0-.08.03-.14.09-.2.23-.24.47-.53.72-.87s.45-.66.62-.97ZM149.24,2.7h-2.38s-.07.02-.07.07v4.32c0,.23-.06.41-.17.52s-.3.17-.57.17c-.32,0-.63-.01-.92-.04-.09,0-.17-.04-.24-.11s-.1-.15-.11-.24c0-.08.02-.15.08-.2s.13-.08.21-.07c.29.04.53.06.74.06.23,0,.35-.12.35-.35V2.77s-.02-.07-.07-.07h-2.47c-.15,0-.28,0-.4,0-.09,0-.17-.02-.24-.09s-.1-.14-.1-.24c0-.09.03-.16.1-.22.07-.06.15-.09.23-.08.13,0,.27,0,.4,0h2.48s.07-.02.07-.06v-.9l-.02-.27c0-.09.03-.16.09-.23.06-.08.14-.11.24-.11.1,0,.18.04.25.11.06.06.09.14.09.23l-.02.27v.9s.02.06.07.06h2.37c.13,0,.25,0,.36,0,.09,0,.17.02.24.08.07.06.1.14.1.22s-.03.16-.1.23-.15.09-.24.09h-.35ZM148.28,4.37s-.06-.1-.06-.15c0-.02,0-.04,0-.06.02-.08.06-.13.13-.17.05-.04.11-.05.18-.05.02,0,.05,0,.08,0,.09.02.16.06.21.14.38.49.78,1.1,1.2,1.81.03.05.04.11.04.17,0,.03,0,.06,0,.09-.02.09-.08.16-.16.2-.05.03-.11.04-.16.04-.04,0-.07,0-.11,0-.09-.03-.15-.08-.19-.17-.4-.74-.79-1.36-1.16-1.85Z"/>
        <path d="M152.16,4.46h-.02c-.1,0-.18-.04-.25-.11-.08-.08-.12-.17-.12-.27s.04-.19.12-.26c.07-.06.16-.1.25-.1h.02c.25.01.52.02.83.02h4.95c.19,0,.38,0,.56-.02h.03c.09,0,.18.03.25.1.08.07.11.16.11.26s-.04.2-.11.27c-.07.06-.16.1-.25.1h-.02c-.2,0-.38,0-.55,0h-4.96c-.28,0-.56,0-.83.02Z"/>
        <path d="M161.34,7.49c-.08.08-.17.12-.27.12h-.04c-.09,0-.18-.03-.26-.09-.08-.05-.11-.12-.11-.21,0-.09.03-.16.1-.21.62-.53,1.04-1.2,1.28-2,.18-.56.27-1.77.27-3.63,0-.09,0-.18,0-.25,0-.1.02-.19.08-.26.06-.07.14-.11.23-.11.1,0,.18.04.25.11.07.07.1.16.08.26,0,.09,0,.18,0,.25,0,1.88-.09,3.15-.27,3.81-.23.84-.68,1.57-1.33,2.21ZM165.24,7.55c-.08.04-.15.06-.22.06-.08,0-.15-.03-.22-.09-.12-.09-.18-.22-.18-.37,0-.02,0-.05,0-.07,0-.08,0-.15,0-.21V1.46c0-.09,0-.19,0-.28,0-.1.02-.19.09-.26.06-.07.15-.11.24-.11s.18.04.25.11c.06.07.09.15.09.25v5.51s0,.03.02.04c.01,0,.02,0,.04,0,.42-.2.85-.47,1.29-.82.45-.35.83-.73,1.16-1.16.05-.06.11-.1.19-.1s.14.04.19.11c.06.08.09.16.09.25,0,.11-.03.2-.1.27-.38.45-.82.87-1.33,1.27s-1.02.72-1.53.98l-.07.04Z"/>
        <path d="M170.5,3.55c.14,0,.26.05.36.15s.15.22.15.36v2.32s.01.08.04.11c.43.62,1.2.95,2.3.98.44.02.91.03,1.42.03.71,0,1.5-.02,2.36-.05.07,0,.13.02.17.08.02.04.04.07.04.11,0,.02,0,.05,0,.07-.03.09-.08.16-.15.22s-.15.09-.24.09c-.77.02-1.46.04-2.09.04-.54,0-1.04,0-1.49-.03-.59-.02-1.09-.11-1.51-.28-.41-.17-.76-.42-1.04-.75-.03-.03-.06-.03-.09,0-.33.32-.65.62-.97.91-.06.06-.14.08-.22.07s-.15-.06-.19-.14c-.05-.08-.06-.17-.04-.26.02-.09.07-.17.14-.22.38-.3.69-.57.96-.82.03-.03.04-.06.04-.11v-2.26s-.02-.06-.06-.06h-.83c-.08,0-.14-.03-.2-.08s-.08-.12-.08-.2.03-.15.08-.2.12-.08.2-.08h.94ZM171.12,1.47c.05.07.07.15.06.23s-.05.15-.12.2c-.06.05-.14.07-.22.06-.08-.01-.15-.05-.19-.12-.26-.36-.61-.72-1.05-1.08-.05-.05-.08-.11-.07-.18s.03-.13.09-.18c.06-.05.14-.07.22-.07h0c.08,0,.16.03.22.08.42.35.77.7,1.05,1.05ZM172.85,1.65c-.04-.07-.04-.14-.01-.21s.08-.12.15-.14h0s-1.2,0-1.2,0c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.13.07-.18.11-.08.17-.08h2.23s.06-.02.06-.06v-.43c0-.08.03-.15.08-.21s.12-.08.2-.08.15.03.21.08.09.12.09.21v.43s.02.06.06.06h2.34c.07,0,.13.03.18.08s.07.11.07.18-.02.12-.07.17-.11.07-.18.07h-1.13c.05.03.09.06.11.11s.02.1,0,.14c-.15.29-.28.51-.37.67,0,.01,0,.02,0,.04s.02.02.04.02h.76c.14,0,.26.05.36.15s.15.22.15.37v3.47c0,.16-.02.28-.06.36s-.12.15-.23.19c-.13.06-.41.09-.83.09-.08,0-.16-.02-.22-.08-.06-.05-.11-.11-.14-.19-.02-.06-.02-.12.02-.17s.08-.08.15-.08c.2,0,.4,0,.62,0,.06,0,.1-.02.11-.03s.03-.05.03-.1v-3.44s-.02-.07-.06-.07h-1.66s-.07.02-.07.07v.49s.02.07.07.07h1.12c.06,0,.11.02.15.06s.06.09.06.15-.02.11-.06.15-.09.06-.15.06h-1.12s-.07.02-.07.07v.54s.02.07.07.07h.4c.15,0,.27.05.37.15s.15.22.15.37v.57c0,.15-.05.27-.15.37s-.22.15-.37.15h-1.4s-.04.01-.04.04v.08c0,.06-.02.12-.07.16-.04.04-.1.07-.16.07s-.11-.02-.16-.07c-.04-.04-.07-.1-.07-.16v-1.21c0-.15.05-.27.15-.37s.22-.15.37-.15h.36s.06-.02.06-.07v-.54s-.02-.07-.06-.07h-1.11c-.06,0-.11-.02-.15-.06s-.06-.09-.06-.15.02-.11.06-.15.09-.06.15-.06h1.11s.06-.02.06-.07v-.49s-.02-.07-.06-.07h-1.59s-.06.02-.06.07v3.83c0,.08-.03.14-.08.19s-.12.08-.2.08-.14-.03-.19-.08-.08-.12-.08-.19v-3.87c0-.15.05-.27.15-.37s.22-.15.36-.15h.62s.03,0,.04-.02.01-.03,0-.04c-.05-.18-.13-.37-.22-.55ZM175.2,2.27h0s-.05-.03-.06-.06c-.01-.03,0-.05,0-.08.13-.25.25-.51.37-.78,0-.01,0-.02,0-.04s-.02-.02-.04-.02h-2.2s-.02,0-.03.02,0,.03,0,.04c.15.23.26.47.33.69.01.05,0,.09-.02.13s-.06.07-.1.08c0,0,0,0,0,0h1.72ZM175.1,5.7s.07-.02.07-.06v-.69s-.02-.06-.07-.06h-1.37s-.06.02-.06.06v.69s.02.06.06.06h1.37Z"/>
        <path d="M186.27,1.29c.06.06.08.12.08.2s-.03.15-.08.2c-.06.06-.12.08-.21.08h-6.46s-.06.02-.06.06v1.7c0,1.92-.25,3.4-.74,4.42-.03.07-.08.11-.17.13h-.06c-.06,0-.11-.01-.16-.04-.07-.05-.12-.11-.14-.19-.01-.04-.02-.07-.02-.1,0-.05.01-.09.04-.14.44-.92.66-2.28.66-4.08v-1.81c0-.14.05-.26.15-.37.1-.1.22-.15.36-.15h2.73s.07-.02.07-.06V.33c0-.09.03-.16.09-.22s.13-.09.22-.09.16.03.22.09.09.13.09.22v.81s.02.06.07.06h3.11c.08,0,.15.03.21.08ZM180.26,7.1c-.04.07-.1.12-.18.14s-.16.02-.23-.02c-.06-.03-.11-.08-.13-.15-.01-.03-.02-.06-.02-.09,0-.04.01-.08.04-.12.29-.54.5-1.28.64-2.21,0-.08.04-.13.1-.18s.13-.06.21-.04c.08.02.14.06.18.12s.06.13.05.21c-.16,1.04-.38,1.82-.65,2.34ZM182.64,7.5h1.27c.18,0,.3-.08.36-.24s.09-.5.11-1.03c0-.07.04-.12.1-.15s.12-.03.18,0c.08.04.15.09.2.17s.07.16.07.24c-.04.62-.12,1.04-.25,1.25s-.36.32-.71.32h-1.37c-.38,0-.63-.06-.76-.19-.13-.13-.2-.37-.2-.73v-3.24c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v3.25c0,.15.03.24.08.29s.17.07.35.07ZM184.03,3.25c.06.05.1.11.11.2,0,.09-.02.16-.08.22-.06.06-.13.09-.22.1-.08,0-.16-.02-.23-.07-.43-.36-.96-.71-1.57-1.05-.06-.04-.1-.09-.11-.15s.01-.12.07-.17c.08-.08.17-.12.25-.12.06,0,.13.02.19.05.62.32,1.15.66,1.6,1ZM184.8,4.65s-.04-.08-.04-.13c0-.02,0-.05.02-.08.02-.07.07-.12.13-.15.05-.02.09-.03.13-.03.04,0,.07,0,.11.02.08.03.14.08.18.15.53.86.9,1.65,1.11,2.37,0,.04,0,.07,0,.1,0,.05-.01.11-.04.16-.04.08-.11.14-.19.18-.03.01-.06.02-.1.02-.04,0-.08,0-.12-.03-.07-.04-.12-.1-.14-.18-.21-.75-.56-1.55-1.06-2.4Z"/>
        <path d="M193.27,2.38s.02.06.07.06h.98c.16,0,.31,0,.46,0,.09,0,.17.02.24.08.07.06.1.14.1.22,0,.09-.03.17-.1.24s-.15.09-.24.09c-.15,0-.3,0-.45,0h-.98s-.07.02-.07.07v.25c0,.6-.03,1.11-.1,1.53-.06.43-.18.82-.35,1.18-.17.36-.39.67-.68.94s-.65.51-1.08.74c-.08.04-.16.05-.24.05-.03,0-.06,0-.09,0-.11-.02-.2-.06-.28-.14-.04-.04-.07-.09-.08-.14s0-.1.03-.15.07-.08.12-.1c.37-.16.68-.34.92-.53s.46-.43.65-.72.32-.65.4-1.07.13-.93.13-1.52v-.31s-.02-.07-.06-.07h-2.5s-.07.02-.07.07v1.42c0,.12,0,.26.02.44,0,.09-.03.18-.1.25s-.15.11-.25.11c-.09,0-.17-.04-.24-.11s-.09-.15-.09-.25c.01-.16.02-.31.02-.44v-1.42s-.02-.07-.07-.07h-.94c-.15,0-.33,0-.54.02-.09,0-.17-.03-.24-.1s-.1-.14-.1-.24.03-.17.1-.23c.07-.06.15-.09.24-.08.21.01.39.02.54.02h.94s.07-.02.07-.06v-1.13c0-.09,0-.18,0-.27s.02-.18.09-.25.14-.11.24-.11.17.03.24.1c.06.07.09.15.09.25,0,.09,0,.18,0,.26v1.14s.02.06.07.06h2.5s.06-.02.06-.06v-1.1c0-.11,0-.23,0-.35,0-.1.02-.19.09-.26.06-.07.14-.11.24-.11s.18.04.25.11c.07.07.1.16.08.26,0,.12,0,.24,0,.35v1.1Z"/>
        <path d="M202.77.83c.07-.07.16-.11.25-.12h.03c.08,0,.16.03.23.1.08.06.11.15.11.25,0,.09-.04.18-.11.25-.68.64-1.38,1.19-2.1,1.65-.04.02-.06.06-.06.1v3.82l.02.55c0,.09-.03.18-.1.25-.07.08-.16.12-.26.12s-.19-.04-.26-.12c-.06-.07-.1-.15-.1-.25l.02-.55v-3.42s0-.02-.02-.03c-.01,0-.02,0-.04,0-.97.52-1.98.95-3.04,1.29-.04.01-.08.02-.13.02-.05,0-.11,0-.17-.03-.1-.04-.18-.11-.23-.2-.02-.04-.04-.08-.04-.13,0-.04,0-.07.02-.11.04-.08.1-.13.18-.16.66-.18,1.32-.41,1.97-.69s1.22-.57,1.7-.87c.85-.53,1.56-1.1,2.12-1.72Z"/>
        <path d="M211.14,1.42h.11c.13,0,.25.04.35.11.05.05.08.11.1.18s0,.14-.04.2l-.07.14c-.16.41-.37.86-.64,1.34s-.55.91-.84,1.29c-.03.03-.03.06,0,.09.79.69,1.57,1.48,2.36,2.39.06.06.09.14.09.23,0,.12-.04.21-.13.29-.06.05-.14.08-.22.08h-.04c-.1-.01-.18-.06-.24-.13-.69-.86-1.44-1.64-2.24-2.36-.03-.03-.06-.03-.09,0-.47.5-.97.97-1.5,1.38-.53.42-1.08.78-1.66,1.07-.07.04-.14.05-.22.05-.04,0-.07,0-.1,0-.11-.02-.21-.08-.28-.16-.05-.05-.07-.1-.07-.17,0-.02,0-.04,0-.06.02-.09.07-.15.15-.18.63-.28,1.23-.65,1.81-1.09.58-.45,1.1-.93,1.57-1.46.3-.35.6-.75.89-1.23.29-.47.49-.89.62-1.26,0-.02,0-.03,0-.05s-.03-.02-.04-.02h-3.52c-.13,0-.31,0-.52.03-.09,0-.18-.03-.25-.1s-.11-.15-.11-.25.04-.18.11-.25.16-.09.25-.09c.23.02.4.03.52.03h3.53c.14,0,.27,0,.38-.03ZM212.25,1.26c.03.06.03.12.01.18s-.06.11-.12.14c-.06.03-.12.03-.19,0-.06-.02-.11-.06-.15-.13-.14-.27-.3-.54-.48-.83-.04-.05-.04-.11-.03-.17.02-.06.06-.1.11-.13.06-.02.13-.03.2,0s.12.06.15.11c.19.29.35.57.49.82ZM212.33.31s-.04-.07-.04-.11c0-.02,0-.04,0-.05.02-.06.05-.1.11-.13.04-.01.08-.02.11-.02.03,0,.06,0,.08,0,.06.02.12.06.16.11.19.29.36.56.51.82.02.04.03.07.03.11,0,.02,0,.05,0,.07-.02.06-.06.11-.12.14-.04.02-.07.03-.11.03-.03,0-.06,0-.09-.02-.06-.02-.11-.06-.14-.12-.16-.3-.33-.58-.5-.83Z"/>
      </g>
      <g class="st1">
        <path d="M130.34,240.93s.06-.02.08-.02c.04,0,.07,0,.1.03.06.03.1.07.11.13.01.08,0,.15-.03.22s-.08.12-.15.14c-.12.06-.33.16-.62.29s-.51.24-.65.3c-.07.04-.14.04-.21.01-.07-.03-.12-.08-.15-.15-.01-.04-.02-.07-.02-.11s0-.07.02-.11c.03-.07.08-.12.15-.15.3-.13.75-.33,1.36-.61ZM135.68,244.06c.07-.05.14-.07.22-.07s.15.03.22.08c.05.04.08.09.08.16s-.03.11-.09.15c-.45.28-.91.53-1.4.76-.02,0-.03.02-.03.03,0,.02,0,.03.02.03.56.42,1.22.73,1.98.92.07.02.12.06.14.12s.01.12-.03.18c-.05.08-.12.13-.2.17-.05.02-.09.03-.14.03-.04,0-.07,0-.11,0-.81-.25-1.52-.61-2.12-1.09-.6-.48-1.07-1.08-1.42-1.78,0,0,0,0,0,0s-.01,0-.02,0c-.36.31-.79.59-1.29.85-.04.02-.06.05-.06.1v1.11s.02.07.07.06c.66-.09,1.26-.18,1.79-.25.07-.01.13,0,.18.05.05.04.08.1.08.17,0,.07-.02.13-.07.19-.04.06-.1.09-.17.09-.52.08-1.58.22-3.16.44-.08.01-.15,0-.21-.04s-.1-.1-.12-.18c-.01-.07,0-.13.04-.19s.1-.09.17-.1c.25-.03.5-.06.76-.1.05,0,.07-.03.07-.08v-.91s0-.03-.02-.04c-.01,0-.03-.01-.04,0-.51.21-.99.37-1.44.48-.04.01-.07.02-.11.02-.12,0-.23-.06-.33-.18-.04-.05-.05-.1-.04-.16s.06-.09.11-.11c.54-.12,1.07-.29,1.6-.5s.98-.45,1.36-.7c0,0,0-.01,0-.02,0,0-.01-.01-.02-.01h-2.85c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.12.07-.17.11-.07.17-.07h3.38s.06-.02.06-.07v-.37c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v.37s.02.07.06.07h3.42c.06,0,.12.02.17.07s.07.1.07.17-.02.12-.07.17-.11.07-.17.07h-3.17s-.03,0-.04.02,0,.03,0,.04c.22.38.5.73.83,1.04.04.03.07.04.11.02.46-.23.9-.49,1.33-.77ZM130.31,239.68c.05.05.08.12.08.19s-.03.14-.09.2c-.05.05-.11.07-.18.07s-.13-.03-.18-.08c-.19-.2-.43-.4-.71-.61-.05-.04-.08-.09-.08-.16s.02-.12.07-.16c.05-.05.12-.08.19-.09h.03c.06,0,.12.02.18.05.29.2.52.39.7.58ZM130.91,238.52c.05-.05.12-.08.19-.08s.14.03.19.08.08.12.08.19v3.65c0,.08-.03.14-.08.19s-.12.08-.19.08-.14-.03-.19-.08-.08-.12-.08-.19v-3.65c0-.08.03-.14.08-.19ZM133.97,241.74s.06-.02.06-.07v-1.36s-.02-.06-.06-.06h-1.85c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h1.85s.06-.02.06-.06v-.91c0-.08.03-.15.09-.21s.13-.09.21-.09.15.03.21.09.09.13.09.21v.91s.02.06.06.06h1.92c.07,0,.13.03.18.08s.08.12.08.19-.03.14-.08.19-.11.08-.18.08h-1.92s-.06.02-.06.06v1.36s.02.07.06.07h1.64c.07,0,.13.03.18.08s.08.11.08.18-.03.14-.08.19-.11.08-.18.08h-3.93c-.07,0-.13-.03-.18-.08s-.08-.12-.08-.19.03-.13.08-.18.11-.08.18-.08h1.56Z"/>
        <path d="M145.64,241.81s.07.11.07.18-.02.13-.07.18-.11.07-.18.07h-4.86s-.07.02-.09.06c-.06.15-.12.3-.19.45,0,.01,0,.03,0,.04s.02.02.03.02h4c.15,0,.27.05.37.15s.15.22.15.37v2.97c0,.08-.03.15-.09.22-.06.06-.13.09-.22.09h-.04c-.07,0-.13-.03-.19-.08s-.08-.12-.08-.19c0-.02,0-.04-.03-.04h-3.82s-.04.01-.04.04c0,.08-.03.15-.08.21s-.12.09-.21.09-.15-.03-.21-.09-.08-.13-.08-.21v-2.57s0,0-.02-.01-.02,0-.03,0c-.4.62-.85,1.14-1.35,1.56-.07.06-.15.08-.23.07-.08,0-.16-.04-.22-.11-.05-.05-.08-.12-.08-.19,0-.08.03-.15.1-.2.83-.65,1.46-1.51,1.92-2.59,0-.02,0-.03,0-.04s-.02-.02-.04-.02h-1.6c-.07,0-.13-.02-.18-.07s-.07-.11-.07-.18.02-.13.07-.18.11-.07.18-.07h3.25s.06-.02.06-.07v-.54s-.02-.06-.06-.06h-2.45c-.06,0-.12-.02-.17-.07s-.07-.1-.07-.17.02-.12.07-.17.1-.07.17-.07h2.45s.06-.02.06-.07v-.53s-.02-.06-.06-.06h-2.83c-.07,0-.13-.02-.18-.08-.05-.05-.07-.11-.07-.18s.02-.12.07-.17.11-.07.18-.07h1.38s.02,0,.03-.02c0-.01.01-.03,0-.04-.1-.16-.22-.34-.37-.53-.04-.05-.05-.11-.04-.18s.06-.11.11-.13.11-.04.17-.04c.11,0,.21.05.28.14.19.22.33.43.44.62.01.03.01.06,0,.09,0,.03-.03.05-.07.07h0s2.42,0,2.42,0h0s-.04-.03-.04-.05,0-.04,0-.06c.15-.2.29-.4.42-.62.05-.08.12-.14.21-.18.05-.02.09-.03.14-.03.04,0,.08,0,.12.02.08.02.13.07.15.15s.01.15-.04.21c-.14.19-.28.35-.4.5,0,.01,0,.02,0,.04s.01.02.03.02h1.45c.07,0,.13.02.18.07s.07.1.07.17-.02.13-.07.18c-.05.05-.11.08-.18.08h-2.86s-.06.02-.06.06v.53s.02.07.06.07h2.47c.06,0,.12.02.17.07s.07.1.07.17-.02.12-.07.17-.1.07-.17.07h-2.47s-.06.02-.06.06v.54s.02.07.06.07h3.25c.07,0,.13.02.18.07ZM144.26,243.33s-.02-.06-.06-.06h-3.75s-.07.02-.07.06v.46s.02.06.07.06h3.75s.06-.02.06-.06v-.46ZM144.2,244.82s.06-.02.06-.07v-.44s-.02-.07-.06-.07h-3.75s-.07.02-.07.07v.44s.02.07.07.07h3.75ZM140.38,245.75s.02.07.07.07h3.75s.06-.02.06-.07v-.46s-.02-.07-.06-.07h-3.75s-.07.02-.07.07v.46Z"/>
        <path d="M154.32,241.77c.07-.02.14-.02.2,0l.13.07c.06.03.11.08.12.14,0,.02,0,.04,0,.06,0,.05-.01.09-.04.12-.5.77-.93,1.35-1.3,1.74-.05.06-.12.09-.21.1-.08,0-.16,0-.23-.05-.06-.04-.1-.1-.11-.17s.01-.14.07-.19c.32-.35.62-.75.91-1.2,0-.01,0-.02,0-.04,0-.01-.01-.02-.03-.02h-2.57s-.06.02-.06.07v3.45c0,.2-.03.35-.09.44-.06.1-.16.17-.32.21-.22.07-.66.11-1.3.11-.09,0-.17-.03-.24-.08s-.12-.13-.15-.21c-.03-.06-.02-.13.01-.18s.09-.09.16-.09h.52c.24,0,.43,0,.58,0,.08,0,.14-.02.17-.04s.04-.07.04-.14v-3.44s-.02-.07-.06-.07h-3.39c-.08,0-.15-.03-.21-.08-.06-.05-.08-.12-.08-.2s.03-.14.08-.2.12-.08.21-.08h4.42s.01,0,.01-.01c0,0,0-.02-.01-.02-.72-.36-1.52-.74-2.39-1.13-.06-.03-.11-.08-.12-.15-.02-.07,0-.13.04-.18.05-.06.11-.11.18-.13s.15-.02.22.01c.25.11.7.31,1.35.59.04.02.08.02.12,0,.64-.36,1.21-.77,1.71-1.23.01-.01.01-.02,0-.03,0,0-.01-.01-.02-.01h-4.69c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.2.03-.14.08-.2c.05-.05.12-.08.19-.08h5.34s.05,0,.07,0c.05,0,.1.02.15.05l.11.09c.06.05.09.11.1.18s-.02.13-.07.18c-.62.58-1.34,1.12-2.14,1.62-.01,0-.02.02-.02.03,0,.02,0,.03.02.03.28.13.53.25.76.36.05.03.09.07.11.13s0,.11-.03.17c-.01.02,0,.03,0,.03h1.91s.01,0,.03,0Z"/>
        <path d="M160.21,243.88s-.06.02-.06.07v1.78s.02.07.06.08c.39.07.88.11,1.48.11.89,0,1.54,0,1.94,0,.07,0,.13.03.17.1.02.04.03.07.03.11,0,.02,0,.05,0,.08-.04.09-.1.17-.17.22s-.16.08-.25.08h-1.73c-.5,0-.94-.03-1.32-.07-.38-.05-.74-.14-1.09-.27s-.67-.32-.94-.57c-.27-.25-.51-.56-.71-.94,0-.01-.01-.02-.03-.02s-.02,0-.03.02c-.28.73-.64,1.33-1.11,1.8-.06.06-.14.1-.23.1s-.17-.03-.24-.09c-.06-.05-.1-.12-.1-.21,0-.08.03-.14.08-.19.73-.68,1.2-1.74,1.42-3.19.01-.08.05-.15.12-.2s.14-.07.22-.07c.08,0,.15.05.2.11s.07.14.06.22c-.04.3-.1.58-.17.83,0,.04,0,.08,0,.12.33.85.89,1.42,1.66,1.72.02,0,.03,0,.04,0s.02-.02.02-.04v-3.76s-.02-.06-.06-.06h-1.94c-.08,0-.14-.03-.2-.08s-.08-.12-.08-.2.03-.14.08-.2c.06-.05.12-.08.2-.08h4.7c.08,0,.15.03.2.08.05.06.08.12.08.2s-.03.14-.08.2-.12.08-.2.08h-2.03s-.06.02-.06.06v1.43s.02.07.06.07h2.37c.08,0,.14.03.2.08.06.06.08.12.08.2s-.03.14-.08.2-.12.08-.2.08h-2.37ZM156.79,240.06s-.06.02-.06.07v.98c0,.08-.03.14-.09.2s-.13.09-.21.09-.15-.03-.21-.09-.09-.13-.09-.2v-1.08c0-.15.05-.27.15-.37s.22-.15.36-.15h2.81s.06-.02.06-.07v-.68c0-.09.03-.16.09-.22s.13-.09.22-.09.15.03.22.09.09.13.09.22v.68s.02.07.06.07h2.85c.14,0,.26.05.36.15s.15.22.15.37v1.07c0,.08-.03.15-.09.21s-.13.09-.22.09-.16-.03-.22-.09-.09-.13-.09-.21v-.97s-.02-.07-.06-.07h-6.12Z"/>
        <path d="M169.47,246.11s-.06,0-.09,0c-.07,0-.14-.01-.21-.04-.1-.05-.18-.12-.23-.21-.04-.07-.04-.14,0-.21s.09-.11.18-.12c.13-.02.27-.05.4-.07.3-.06.58-.17.84-.31s.51-.32.73-.53.4-.48.53-.8c.13-.32.2-.67.2-1.04,0-.7-.21-1.29-.64-1.78s-1.01-.77-1.76-.84c-.05,0-.07.01-.08.06-.12.92-.29,1.76-.51,2.52-.55,1.84-1.24,2.76-2.06,2.76-.4,0-.76-.22-1.07-.65s-.47-1.01-.47-1.71c0-.47.1-.92.3-1.36.2-.44.47-.82.82-1.14.34-.32.75-.58,1.23-.78s.98-.29,1.51-.29.97.08,1.4.25.79.4,1.07.69.51.64.67,1.03c.16.39.24.82.24,1.26,0,.87-.26,1.6-.79,2.17-.52.58-1.26.95-2.21,1.13ZM166.8,244.77c.21,0,.44-.18.69-.53s.48-.9.69-1.63c.22-.71.39-1.5.5-2.37,0-.02,0-.03-.02-.04s-.03-.01-.04,0c-.41.05-.79.18-1.15.38s-.65.44-.88.71-.41.57-.54.89-.2.63-.2.94c0,.53.1.95.3,1.23.2.29.42.44.65.44Z"/>
        <path d="M175.96,241.44c.03.08.03.15,0,.22s-.07.13-.14.17l-1.54.91c-.07.04-.15.05-.23.03-.08-.02-.14-.06-.18-.13-.03-.05-.04-.09-.04-.14,0-.02,0-.05,0-.08.02-.08.07-.13.14-.17.44-.23,1-.54,1.67-.93.06-.04.12-.04.18-.02s.11.07.12.13ZM181.75,243.6c.05.05.08.12.08.19s-.03.14-.08.19-.12.08-.19.08h-2.78s-.02,0-.03.02,0,.02,0,.03c.36.36.8.7,1.31,1,.52.3,1.06.54,1.61.72.07.02.11.07.13.14s0,.13-.04.19c-.06.08-.13.13-.22.16s-.18.03-.26,0c-.59-.22-1.16-.51-1.71-.87s-1.01-.75-1.39-1.18c-.01,0-.02,0-.03,0,0,0-.01.01-.01.02v2.04c0,.08-.03.15-.09.21s-.13.09-.21.09-.15-.03-.21-.09-.09-.13-.09-.21v-2.07s0-.02-.01-.02c0,0-.02,0-.03,0-.37.43-.83.84-1.38,1.22-.55.38-1.11.68-1.69.92-.09.04-.18.04-.26,0s-.16-.08-.22-.16c-.04-.04-.05-.08-.05-.13,0-.02,0-.04,0-.06.02-.07.06-.12.13-.15.53-.19,1.05-.45,1.56-.76s.94-.65,1.29-1.01c.01,0,.01-.01,0-.03s-.01-.02-.03-.02h-2.71c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h3.31s.06-.02.06-.06v-.66s-.02-.07-.06-.07h-.74c-.15,0-.27-.05-.37-.15s-.15-.22-.15-.37v-2.34c0-.14.05-.26.15-.36s.22-.15.37-.15h.55s.08-.02.09-.06c.07-.23.12-.41.16-.54.02-.09.07-.16.14-.2.06-.04.12-.06.18-.06.02,0,.04,0,.06,0,.08.01.14.05.18.13.04.07.05.15.02.22-.08.22-.14.37-.17.45,0,.02,0,.03,0,.04s.02.02.04.02h.99c.15,0,.27.05.37.15s.15.22.15.36v2.34c0,.15-.05.27-.15.37s-.22.15-.37.15h-.8s-.06.02-.06.07v.66s.02.06.06.06h3.36c.08,0,.14.03.19.08ZM175.75,240.11c.05.06.07.14.07.21,0,.08-.05.15-.11.21-.06.05-.12.07-.2.07-.07,0-.14-.05-.19-.11-.28-.33-.63-.67-1.06-1-.06-.04-.09-.09-.09-.16,0-.07.02-.12.07-.17.06-.05.13-.08.21-.08s.15.02.22.07c.45.33.81.65,1.09.98ZM176.84,239.85s-.07.02-.07.06v.83s.02.06.07.06h2.03s.07-.02.07-.06v-.83s-.02-.06-.07-.06h-2.03ZM176.84,241.26s-.07.02-.07.07v.85s.02.06.07.06h2.03s.07-.02.07-.06v-.85s-.02-.07-.07-.07h-2.03ZM181.74,242.22c.08.06.11.14.11.24,0,.06-.02.13-.07.18-.05.06-.12.09-.2.1s-.15-.01-.21-.06c-.42-.34-.94-.69-1.56-1.04-.06-.04-.09-.09-.11-.15-.01-.07,0-.12.05-.17.05-.06.11-.09.18-.11.08-.01.15,0,.22.03.61.32,1.13.65,1.57.98ZM180.97,239.13c.06-.06.13-.1.21-.12.08-.01.16,0,.23.04s.11.1.12.17c0,.07-.01.14-.06.19-.39.42-.78.79-1.16,1.1-.06.05-.14.08-.22.08-.08,0-.15-.02-.22-.07-.05-.04-.08-.09-.09-.15s.02-.12.07-.16c.43-.37.8-.73,1.11-1.08Z"/>
        <path d="M190.78,242.09c.05.05.08.12.08.19s-.03.14-.08.19-.12.08-.19.08h-2.23s-.02,0-.02.02,0,.02,0,.03c.3.28.67.53,1.11.75s.88.41,1.35.55c.07.02.11.06.13.12,0,.02,0,.05,0,.07,0,.04-.01.08-.04.11-.05.08-.12.13-.21.16s-.17.03-.25,0c-.08-.02-.16-.05-.25-.09-.02,0-.03,0-.04,0-.01,0-.02.02-.02.04v2.02c0,.08-.03.14-.08.2-.06.05-.12.08-.2.08h0c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19c0-.02-.01-.04-.04-.04h-1.67s-.04.01-.04.04v.04c0,.07-.03.13-.08.18s-.12.08-.19.08-.14-.03-.19-.08-.08-.11-.08-.18v-2.12c0-.14.05-.26.15-.37.1-.1.22-.15.37-.15h1.19s.02,0,.02-.01c0,0,0-.02-.01-.02-.56-.33-1.03-.71-1.41-1.13-.03-.03-.07-.04-.11-.04h-1.24s-.08.01-.11.04c-.41.43-.9.81-1.47,1.13-.01,0-.02.01-.01.02,0,0,0,.01.01.01h1.24c.14,0,.26.05.36.15.1.1.15.22.15.37v2.07c0,.07-.03.13-.08.19-.05.05-.12.08-.19.08h0c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19c0-.02-.01-.04-.04-.04h-1.64s-.04.01-.04.04v.04c0,.07-.03.13-.08.18s-.12.08-.19.08-.14-.03-.19-.08-.08-.11-.08-.18v-2.09s0-.03-.02-.04c-.01,0-.02,0-.04,0-.08.04-.17.07-.26.11-.05.02-.1.03-.15.03-.11,0-.21-.05-.3-.16-.03-.04-.04-.08-.04-.12,0-.02,0-.04,0-.05.01-.06.05-.11.11-.13.97-.35,1.76-.8,2.38-1.34.01,0,.01-.01,0-.03s-.01-.02-.02-.02h-2.17c-.08,0-.14-.03-.19-.08s-.08-.12-.08-.19.03-.14.08-.19.12-.08.19-.08h2.67s.08-.01.11-.04c.16-.2.29-.4.4-.62,0-.01,0-.02,0-.04s-.02-.02-.04-.02h-2.27c-.14,0-.26-.05-.36-.15s-.15-.22-.15-.37v-1.42c0-.14.05-.26.15-.36s.22-.15.36-.15h1.84c.14,0,.26.05.36.15s.15.22.15.36v1.87s0,0,0,0c.05-.08.11-.12.18-.12.02,0,.05,0,.08,0l.11.04c.08.02.14.07.17.14.03.07.03.15,0,.22-.08.15-.17.29-.26.42-.01.01-.01.02,0,.04s.02.02.04.02h3.93c.08,0,.14.03.19.08ZM185.72,240.81s.06-.02.06-.06v-1.34s-.02-.07-.06-.07h-1.63s-.07.02-.07.07v1.34s.02.06.07.06h1.63ZM185.8,245.8s.06-.02.06-.07v-1.38s-.02-.06-.06-.06h-1.59s-.06.02-.06.06v1.38s.02.07.06.07h1.59ZM189.75,238.85c.15,0,.27.05.37.15s.15.22.15.36v1.42c0,.14-.05.26-.15.37s-.22.15-.37.15h-1.85c-.14,0-.26-.05-.37-.15s-.15-.22-.15-.37v-1.42c0-.14.05-.26.15-.36s.22-.15.37-.15h1.85ZM187.82,245.73s.02.07.06.07h1.62s.06-.02.06-.07v-1.38s-.02-.06-.06-.06h-1.62s-.06.02-.06.06v1.38ZM189.63,240.81s.07-.02.07-.06v-1.34s-.02-.07-.07-.07h-1.64s-.06.02-.06.07v1.34s.02.06.06.06h1.64Z"/>
      </g>
    </g>
  </g>
`;
