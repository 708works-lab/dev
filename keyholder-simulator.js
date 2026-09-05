// ============================================================================
// ギターピック型キーホルダー（keyholder01）カラーシミュレーター
// SVGは708works提供の keyholder_color_order.svg をそのまま流用。
// 構造：ピック2枚が重なった意匠。image01=表面（ロゴ面、ピック1前面+ピック2前面が覗く）、
// image02=裏面（ピック1裏面のテクスチャ+ピック2裏面に刻印エリアArea1〜3）。
// leather011(image01)⇔leather01(image02) = ピック1（ロゴ面）の色。
// leather021(image01)⇔leather02(image02) = ピック2（刻印面）の色。
// 名入れ刻印は無料（Globo設定に addon price なし）、価格は常に固定。
// ============================================================================

const KH_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const KH_SHOPIFY_DOMAIN = '708works.jp';
const KH_PRICE = 1650;
const KH_VARIANT_ID = '46634550722810';

// 本革20色パレット（他ラインと共通）
const KH_COLORS = [
  {id:'white',   name:'White',     hex:'#f2f0ec'},
  {id:'yellow',  name:'Yellow',    hex:'#e8c84a'},
  {id:'lgrn',    name:'Light GRN', hex:'#a8c43a'},
  {id:'lbl',     name:'Light BL',  hex:'#7baed0'},
  {id:'orange',  name:'Orange',    hex:'#e04e1a'},
  {id:'sakura',  name:'Sakura',    hex:'#f0a0a8'},
  {id:'pink',    name:'Pink',      hex:'#d96090'},
  {id:'red',     name:'Red',       hex:'#b82828'},
  {id:'winered', name:'Wine Red',  hex:'#7a2035'},
  {id:'navy',    name:'Navy',      hex:'#1e2540'},
  {id:'natural', name:'Natural',   hex:'#e8c4a0'},
  {id:'tan',     name:'Tan',       hex:'#d4742a'},
  {id:'camel',   name:'Camel',     hex:'#c46030'},
  {id:'brown',   name:'Brown',     hex:'#9e3820'},
  {id:'choco',   name:'Choco',     hex:'#4a2018'},
  {id:'grey',    name:'Grey',      hex:'#9090a0'},
  {id:'olive',   name:'Olive',     hex:'#7a7848'},
  {id:'green',   name:'Green',     hex:'#3a5030'},
  {id:'greenbl', name:'Green Blue',hex:'#2a5060'},
  {id:'black',   name:'Black',     hex:'#1a1a1a'},
];

const KH_ZONE_LABEL = {
  pick1: '表面（ロゴ面）',
  pick2: '刻印面',
};

// フォント（他ラインの名入れ刻印アドオンと共通の5書体）
const KH_FONTS = [
  { id: 'A', family: 'Cabin Sketch', weight: '700', googleParam: 'Cabin+Sketch:wght@700', category: '手書き' },
  { id: 'B', family: 'Special Elite', weight: '400', googleParam: 'Special+Elite', category: 'スタンプ風' },
  { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true, localUrl: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf', category: 'スタンプ風' },
  { id: 'C', family: 'Lobster', weight: '400', googleParam: 'Lobster', category: '筆記体' },
  { id: 'D', family: 'Playball', weight: '400', googleParam: 'Playball', category: '筆記体' },
];
const KH_MAX_LEN = 20;
const KH_ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;

// Area1〜3のプレースホルダーpath（id="area1"|"area2"|"area3"）のbbox実測値。
// 3行とも幅・高さはほぼ共通（x≈99.7, w≈65, h≈15.5）で、yのみ約42ずつ増える等間隔配置。
// SVG読み込み後に実測し直すため、ここではキー名の対応関係のみ定義する。
const KH_AREA_IDS = ['area1', 'area2', 'area3'];

// ============================================================================
// グローバル状態
// ============================================================================

let khPick1Color = KH_COLORS.find(c => c.id === 'camel');
let khPick2Color = KH_COLORS.find(c => c.id === 'natural');
let khActiveZone = 'pick1'; // 'pick1' | 'pick2'
let khActiveView = 'front'; // 'front'(表面/ロゴ面=image01) | 'back'(刻印面=image02)
let khKokuinEnabled = false;
let khAreaText = { area1: '', area2: '', area3: '' };
let khFontId = 'A';
let khHistory = [];
let khLastUploadedImage = null;
let khHasDownloadedImage = false;
let khFontsLoaded = false;

function khCurrentFont() {
  return KH_FONTS.find(f => f.id === khFontId);
}

// ============================================================================
// 初期化
// ============================================================================

function initializeKHSimulator() {
  if (window.khSimulatorInitialized) return;
  const zonesEl = document.getElementById('kh-zones');
  const svgScrollEl = document.getElementById('kh-svg-scroll');
  if (!zonesEl || !svgScrollEl) { setTimeout(initializeKHSimulator, 100); return; }
  window.khSimulatorInitialized = true;
  khBuildZoneButtons();
  khBuildPalette();
  khUpdatePaletteLabel();
  khUpdateSummary();
  khBuildSvg();
  khUpdatePriceDisplay();
  khBuildFontSelect();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeKHSimulator);
} else {
  initializeKHSimulator();
}

window.addEventListener('resize', () => {
  if (window.khSimulatorInitialized) khBuildSvg();
});

function khOnColorChange() {
  khRedrawSvg();
  khUpdateSummary();
  khHasDownloadedImage = false;
}

// ============================================================================
// 価格表示（固定・名入れ無料）
// ============================================================================

function khUpdatePriceDisplay() {
  const el = document.getElementById('kh-price-display');
  if (!el) return;
  el.textContent = `¥${KH_PRICE.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴（元に戻す）
// ============================================================================

function khSaveHistory() {
  khHistory.push({
    pick1: khPick1Color, pick2: khPick2Color, zone: khActiveZone, view: khActiveView,
    kokuinEnabled: khKokuinEnabled, areaText: { ...khAreaText }, fontId: khFontId,
  });
  if (khHistory.length > 30) khHistory.shift();
  const btn = document.getElementById('kh-btn-undo');
  if (btn) btn.disabled = false;
}

function khUndo() {
  if (!khHistory.length) return;
  const prev = khHistory.pop();
  khPick1Color = prev.pick1; khPick2Color = prev.pick2; khActiveZone = prev.zone; khActiveView = prev.view;
  khKokuinEnabled = prev.kokuinEnabled; khAreaText = { ...prev.areaText }; khFontId = prev.fontId;
  khBuildZoneButtons();
  khBuildPalette();
  khUpdatePaletteLabel();
  khUpdateSummary();
  khSyncKokuinUI();
  khBuildSvg();
  const btn = document.getElementById('kh-btn-undo');
  if (!khHistory.length && btn) btn.disabled = true;
}

function khResetAll() {
  khSaveHistory();
  khPick1Color = KH_COLORS.find(c => c.id === 'camel');
  khPick2Color = KH_COLORS.find(c => c.id === 'natural');
  khActiveZone = 'pick1';
  khActiveView = 'front';
  khKokuinEnabled = false;
  khAreaText = { area1: '', area2: '', area3: '' };
  khFontId = 'A';
  khBuildZoneButtons();
  khBuildPalette();
  khUpdatePaletteLabel();
  khUpdateSummary();
  khSyncKokuinUI();
  khBuildSvg();
}

// ============================================================================
// パーツ選択（ゾーンタブ：表面ロゴ面／刻印面）
// ============================================================================

function khBuildZoneButtons() {
  const container = document.getElementById('kh-zones');
  if (!container) return;
  container.innerHTML = '';
  ['pick1', 'pick2'].forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'kh-zone-btn' + (zone === khActiveZone ? ' active' : '');
    btn.onclick = () => khSelectZone(zone);
    const dot = document.createElement('span');
    dot.className = 'kh-zone-dot';
    dot.style.background = zone === 'pick1' ? khPick1Color.hex : khPick2Color.hex;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + KH_ZONE_LABEL[zone]));
    container.appendChild(btn);
  });
}

function khSelectZone(zone) {
  khActiveZone = zone;
  khBuildZoneButtons();
  khBuildPalette();
  khUpdatePaletteLabel();
}

function khUpdatePaletteLabel() {
  const label = document.getElementById('kh-palette-label');
  if (label) label.textContent = 'カラー（' + KH_ZONE_LABEL[khActiveZone] + '）';
}

function khBuildPalette() {
  const p = document.getElementById('kh-palette');
  if (!p) return;
  p.innerHTML = '';
  p.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
  const current = khActiveZone === 'pick1' ? khPick1Color : khPick2Color;
  KH_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'kh-swatch' + (c.id === current.id ? ' selected' : '');
    const isSel = c.id === current.id;
    sw.style.cssText = `display:block;background:${c.hex};width:22px;height:22px;border-radius:50%;cursor:pointer;box-sizing:border-box;border:${isSel ? '2.5px solid #111;box-shadow:0 0 0 2px #fff,0 0 0 4px #111' : '1.5px solid rgba(0,0,0,.12)'};`;
    sw.title = c.name;
    sw.onclick = () => khSetColor(c);
    p.appendChild(sw);
  });
}

function khSetColor(c) {
  khSaveHistory();
  if (khActiveZone === 'pick1') khPick1Color = c;
  else khPick2Color = c;
  khBuildZoneButtons();
  khBuildPalette();
  khOnColorChange();
}

// ============================================================================
// 表面／刻印面 表示切替
// ============================================================================

function khSetView(view) {
  if (view === khActiveView) return;
  khActiveView = view;
  document.querySelectorAll('.keyholder-simulator .kh-view-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  khBuildSvg();
}

// ============================================================================
// サマリー
// ============================================================================

function khUpdateSummary() {
  const el = document.getElementById('kh-summary');
  if (!el) return;
  const rows = [
    { label: KH_ZONE_LABEL.pick1, hex: khPick1Color.hex, name: khPick1Color.name },
    { label: KH_ZONE_LABEL.pick2, hex: khPick2Color.hex, name: khPick2Color.name },
  ];
  el.innerHTML = rows.map(r => `
    <div class="kh-summary-row">
      <span class="kh-summary-label">${r.label}</span>
      <span class="kh-summary-dot" style="background:${r.hex}"></span>
      <span class="kh-summary-name">${r.name}</span>
    </div>`).join('');
}

// ============================================================================
// カラーコントラストヘルパー
// ============================================================================

function _khHexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function _khHslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3); }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function khContrastColor(hex) {
  const [h, s, l] = _khHexToHsl(hex);
  const newL = l > 0.45 ? Math.max(0.05, l - 0.35) : Math.min(0.92, l + 0.35);
  return _khHslToHex(h, s, newL);
}

// ============================================================================
// SVG描画
// ============================================================================

function khBuildSvg() {
  const scroll = document.getElementById('kh-svg-scroll');
  if (!scroll) return;

  scroll.innerHTML = `<svg id="kh-svg" viewBox="0 0 285.68 805.67"
    style="display:block;margin:0 auto;max-width:260px;" xmlns="http://www.w3.org/2000/svg">${KH_SVG_INNER}</svg>`;

  const svg = document.getElementById('kh-svg');
  const image01 = svg.querySelector('#image01'); // 表面（ロゴ面）
  const image02 = svg.querySelector('#image02'); // 刻印面

  image01.style.display = khActiveView === 'front' ? '' : 'none';
  image02.style.display = khActiveView === 'back' ? '' : 'none';

  const activeGroup = khActiveView === 'front' ? image01 : image02;
  const b = activeGroup.getBBox();
  const pad = 6;
  svg.setAttribute('viewBox', `${(b.x - pad).toFixed(1)} ${(b.y - pad).toFixed(1)} ${(b.width + pad * 2).toFixed(1)} ${(b.height + pad * 2).toFixed(1)}`);

  // Area1〜3のプレースホルダーは、この直後の描画処理で非表示にされてしまうため、
  // まだ元のまま見えているこの時点（SVGを丸ごと新規生成した直後）でbboxを実測してキャッシュしておく。
  // 一度非表示にすると getBBox() は0を返すため、以後の再描画（テキスト入力・フォント変更等、
  // SVGを作り直さない呼び出し）はこのキャッシュを使い回す。
  khAreaBoxesCache = khMeasureAreaBoxes(svg);

  khRedrawSvg();
}

function khRedrawSvg() {
  const svg = document.getElementById('kh-svg');
  if (!svg) return;
  // ピック1（ロゴ面）: leather011(表)・leather01(裏) を常に同じ色に同期
  ['leather011', 'leather01'].forEach(id => {
    const el = svg.querySelector('#' + id);
    if (el) el.style.fill = khPick1Color.hex;
  });
  // ピック2（刻印面）: leather021(表)・leather02(裏) を常に同じ色に同期
  ['leather021', 'leather02'].forEach(id => {
    const el = svg.querySelector('#' + id);
    if (el) el.style.fill = khPick2Color.hex;
  });
  khRedrawKokuin();
}

// ============================================================================
// 名入れ刻印（Area1〜3、刻印面のみ表示される）
// ============================================================================

let khAreaBoxesCache = null;

function khMeasureAreaBoxes(svg) {
  const boxes = {};
  KH_AREA_IDS.forEach(id => {
    const el = svg.querySelector('#' + id);
    if (!el) return;
    const b = el.getBBox();
    boxes[id] = { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  return boxes;
}

function khRedrawKokuin() {
  const svg = document.getElementById('kh-svg');
  if (!svg) return;
  const image02 = svg.querySelector('#image02');
  if (!image02) return;

  // プレースホルダーpath（"Area 1"等の文字アウトライン）を非表示にする。bboxは
  // khBuildSvg()でSVGを新規生成した直後（まだ非表示にする前）にキャッシュ済みのものを使う
  // （一度でも非表示にした後だとgetBBox()は0を返すため、ここで再測定してはいけない）。
  KH_AREA_IDS.forEach(id => {
    const el = svg.querySelector('#' + id);
    if (el) el.style.display = 'none';
  });

  let kokuinGroup = image02.querySelector('#kh-kokuin-group');
  if (!kokuinGroup) {
    kokuinGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    kokuinGroup.setAttribute('id', 'kh-kokuin-group');
    image02.appendChild(kokuinGroup);
  }
  kokuinGroup.innerHTML = '';
  if (!khKokuinEnabled) return;

  const boxes = khAreaBoxesCache || khMeasureAreaBoxes(svg);

  const font = khCurrentFont();
  const fillColor = khContrastColor(khPick2Color.hex);

  KH_AREA_IDS.forEach(id => {
    const text = khAreaText[id];
    const box = boxes[id];
    if (!text || !box) return;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('text-anchor', 'start');
    el.setAttribute('dominant-baseline', 'central');
    el.setAttribute('font-family', font.family);
    el.setAttribute('font-weight', font.weight);
    el.setAttribute('fill', fillColor);
    el.setAttribute('fill-opacity', '0.85');
    el.textContent = text;
    kokuinGroup.appendChild(el);

    // box.width（実測エリア幅）に収まる最大フォントサイズを探す
    let size = box.height * 0.8;
    el.setAttribute('font-size', size);
    let w = el.getBBox().width;
    while (w > box.width && size > 6) {
      size -= 0.5;
      el.setAttribute('font-size', size);
      w = el.getBBox().width;
    }
    el.setAttribute('x', box.x);
    el.setAttribute('y', box.y + box.height / 2);
  });
}

function khSyncKokuinUI() {
  const toggle = document.getElementById('kh-kokuin-toggle');
  const section = document.getElementById('kh-kokuin-section');
  if (toggle) toggle.checked = khKokuinEnabled;
  if (section) section.hidden = !khKokuinEnabled;
  ['area1', 'area2', 'area3'].forEach((id, i) => {
    const input = document.getElementById('kh-' + id + '-text');
    if (input) input.value = khAreaText[id] || '';
  });
  const fontSelect = document.getElementById('kh-kokuin-font-select');
  if (fontSelect) fontSelect.value = khFontId;
}

async function khLoadFonts() {
  if (khFontsLoaded) return;
  khFontsLoaded = true;
  const agStencil = KH_FONTS.find(f => f.id === 'E');
  if (agStencil) {
    const localFont = new FontFace('AG Stencil', `url(${agStencil.localUrl})`);
    document.fonts.add(localFont);
    await localFont.load().catch(() => {});
  }
  const specs = KH_FONTS.filter(f => f.googleParam).map(f => `${f.weight} 40px "${f.family}"`);
  await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => {})));
}

function khBuildFontSelect() {
  const select = document.getElementById('kh-kokuin-font-select');
  if (!select) return;
  select.innerHTML = '';
  KH_FONTS.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `フォント${f.id}（${f.category}）${f.noUppercase ? '・大文字非対応' : ''}`;
    if (f.id === khFontId) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    khFontId = select.value;
    khValidateAndRedraw();
  });
}

function khValidateAndRedraw() {
  ['area1', 'area2', 'area3'].forEach(id => {
    const input = document.getElementById('kh-' + id + '-text');
    if (!input) return;
    let text = input.value;
    if (!KH_ALLOWED_PATTERN.test(text)) {
      text = text.replace(/[^A-Za-z0-9\-_.,:;$!\s]/g, '');
      input.value = text;
    }
    if (text.length > KH_MAX_LEN) {
      text = text.slice(0, KH_MAX_LEN);
      input.value = text;
    }
    khAreaText[id] = text;
  });
  khRedrawKokuin();
  khHasDownloadedImage = false;
}

async function khOnKokuinToggleChange() {
  const toggle = document.getElementById('kh-kokuin-toggle');
  const section = document.getElementById('kh-kokuin-section');
  khKokuinEnabled = toggle.checked;
  if (section) section.hidden = !khKokuinEnabled;
  if (khKokuinEnabled) {
    await khLoadFonts();
    if (khActiveView !== 'back') khSetView('back');
  }
  khRedrawKokuin();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showKhToast(msg) {
  const t = document.getElementById('kh-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function showKhLoading(text = '処理中...') {
  const loadingText = document.getElementById('kh-loading-text');
  const loadingOverlay = document.getElementById('kh-loading-overlay');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}
function hideKhLoading() {
  const el = document.getElementById('kh-loading-overlay');
  if (el) el.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

async function khBuildSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;

  const wasView = khActiveView;
  if (khKokuinEnabled) khSetView('back');
  const liveSvg = document.getElementById('kh-svg');
  const liveVb = liveSvg?.getAttribute('viewBox')?.split(' ').map(Number);
  const vbW = liveVb ? liveVb[2] : 260;
  const vbH = liveVb ? liveVb[3] : 260;
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
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('KEYHOLDER', cw / 2, 28);
  ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 42);

  const svgEl = document.getElementById('kh-svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    const svgStr = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, svgX, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  const labelX = svgX + svgSaveW + 18;
  let ly = svgY0 + 16;
  const drawLabel = (hex, label) => {
    ctx.beginPath(); ctx.arc(labelX + 6, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = hex; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, labelX + 16, ly + 3);
    ly += 22;
  };
  drawLabel(khPick1Color.hex, `表面(ロゴ面): ${khPick1Color.name}`);
  drawLabel(khPick2Color.hex, `刻印面: ${khPick2Color.name}`);

  if (khKokuinEnabled) {
    ly += 6;
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('名入れ刻印', labelX, ly + 4);
    ly += 18;
    const font = khCurrentFont();
    await document.fonts.load(`${font.weight} 16px "${font.family}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a'; ctx.font = `${font.weight} 15px "${font.family}"`;
    ['area1', 'area2', 'area3'].forEach(id => {
      if (khAreaText[id]) { ctx.fillText(khAreaText[id], labelX, ly + 3); ly += 18; }
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

  if (wasView !== khActiveView) khSetView(wasView);
  return cv;
}

async function khSaveImage() {
  showKhLoading('画像を生成中...');
  try {
    const canvas = await khBuildSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `keyholder-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideKhLoading();
    khHasDownloadedImage = true;
    showKhToast('画像を保存しました');
  } catch (e) {
    console.error(e);
    hideKhLoading();
    showKhToast('保存に失敗しました');
  }
}

// ============================================================================
// R2アップロード・オーダー処理
// ============================================================================

async function khUploadOrderImage(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = `keyholder-${Date.now()}`;
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  try {
    const res = await fetch(KH_WORKER_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    if (!data.success && !data.url && !data.imageUrl) throw new Error(data.error || 'Upload failed');
    return { imageUrl: data.imageUrl || data.url, orderId };
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

async function khGoOrder() {
  if (!khHasDownloadedImage) await khSaveImage();
  showKhLoading('画像をアップロード中...');
  try {
    const canvas = await khBuildSaveCanvas();
    const uploadResult = await khUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    khLastUploadedImage = uploadResult;
    hideKhLoading();
    showKhConfirmModal(uploadResult);
  } catch (error) {
    console.error(error);
    hideKhLoading();
    showKhToast('エラーが発生しました: ' + error.message);
  }
}

function showKhConfirmModal(uploadResult) {
  const modal = document.getElementById('kh-confirm-modal');
  const modalImage = document.getElementById('kh-modal-image');
  const modalInfo = document.getElementById('kh-modal-info');
  if (!modal || !modalImage || !modalInfo) return;
  modalImage.src = uploadResult.imageUrl;

  const kokuinLines = khKokuinEnabled
    ? ['area1', 'area2', 'area3'].filter(id => khAreaText[id]).map(id => `<p><strong>${id}:</strong> ${khAreaText[id]}</p>`).join('')
    : '';
  const fontLine = khKokuinEnabled ? `<p><strong>フォント:</strong> フォント${khFontId}：${khCurrentFont().family}</p>` : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>価格:</strong> ¥${KH_PRICE.toLocaleString()}（税込）</p>
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">表面(ロゴ面): ${khPick1Color.name}<br>刻印面: ${khPick2Color.name}</div>
    ${fontLine}
    ${kokuinLines}
  `;
  modal.classList.add('show');
}

function closeKhModal() {
  const modal = document.getElementById('kh-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function khProceedToCart() {
  if (!khLastUploadedImage) {
    showKhToast('画像情報が見つかりません');
    return;
  }
  closeKhModal();
  showKhLoading('カートに追加中...');
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${KH_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display = 'none';

    [['id', KH_VARIANT_ID], ['quantity', '1']].forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
    });

    const props = {
      'Order ID': khLastUploadedImage.orderId,
      'Logo Side Color': khPick1Color.name,
      'Engrave Side Color': khPick2Color.name,
      'Image URL': khLastUploadedImage.imageUrl,
    };
    if (khKokuinEnabled) {
      props['フォント'] = `フォント${khFontId}：${khCurrentFont().family}`;
      if (khAreaText.area1) props['Area1'] = khAreaText.area1;
      if (khAreaText.area2) props['Area2'] = khAreaText.area2;
      if (khAreaText.area3) props['Area3'] = khAreaText.area3;
    }
    Object.entries(props).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = `properties[${k}]`; i.value = v; form.appendChild(i);
    });

    document.body.appendChild(form);
    hideKhLoading();
    showKhToast('カートに追加します...');
    setTimeout(() => form.submit(), 500);
  } catch (error) {
    console.error(error);
    hideKhLoading();
    showKhToast('カート追加に失敗しました: ' + error.message);
  }
}

// Auto-generated from keyholder_color_order.svg
const KH_SVG_INNER = `<defs>
    <style>
      .st0 {
        fill: #2b7200;
      }

      .st1 {
        fill: #c3bb00;
      }
    </style>
  </defs><g id="image02">
    <path id="leather02" class="st1" d="M185.62,758.85c14.53-17.26,32.69-50.04,39.69-71.03l3.71-11.12,4.66-19.36c1.78-7.39-.39-19.95-5.37-25.18l-2.67-2.81c-2.97-3.12-6.39-4.76-10.35-6.43l-2.36,9.81c3.03,2.12,3.51,5.02,2.74,7.98-.83,3.18-3.69,5.18-6.4,5.47-3.37.35-6.33-1.12-8.02-4.03-2.3-3.97-.28-8.67,3.46-10.7l2.55-10.73s-.59-.65-.79-.87l-20.14-4.63c-36.63-5.95-69.25-5.45-105.76.58-10.4,1.72-20.21,4.44-29.95,8.3-4.38,1.73-8.33,3.89-12.24,6.58-4.62,3.18-8.74,8.81-9.97,14.09-1.3,5.56-1.51,11.04-.39,16.75,2.16,11.06,5.56,21.47,9.92,31.8l2.63,6.22,4.03,8.61c10.89,23.29,28.49,47.5,46.56,66.21,8.59,8.9,18.03,16.51,29.04,22.09,6.36,3.22,13.23,3.62,19.98,1.89,4.87-1.25,9.62-3.11,13.47-6.39l10.78-9.19,7.45-7.59,13.73-16.31Z"/>
    <path id="leather01" class="st0" d="M212.82,510.08c.41.05.95.22,1.14.23.24.08,1.65.25,1.96.2l-5.34-9.48-2.19-3.31c-.18-.27-1.49-.32-1.76-.47l-1.78-1,1.22.03,1.92.41-4.89-7.46-3.1-4.61-7.09-9.46-6.54-6.9c-5.7-6.01-12.99-10.46-21.44-10.48l-9.82-.02c-5.61.5-10.94,1.55-16.26,3.37l-2.39.82-8.33,3.37-6.97,3.17.45.56.87.66,1.29.27,4.76.36-1.06.82-1.35-.23-2.96-.46-1.59-.43-.36-.78-.3-.47-6.36,3.21-9.72,5.77-2.29,1.45c.2.09.74.31.95.24l.81-.3,1.7-.47,1.57-.44,1.33-.37c.58-.16,2.12-.35,2.71-.2l2.3.58,1.18.39-3.25-.06-1.25-.49-2.9.8-3.21.89c-.61.17-2.05.03-2.7-.02l-3.27,2.12-6.72,4.92,3.99.4.43,1.22,2.45.61,2.2.51,2.23.44,4.6.31.33.32-3.25.33-1.4-.04-2.59-.64-2.46-.61-2.3-.57-1-1.29-3.66-.35-5.09,3.84-3.27,2.47.22.25,4.07-.31c.45-.03,1.78.42,2.51.64.92.08.89.27,0,.42l-2.51-.39c-1.28-.2-2.3.57-4.48.07-.07-.02-.1-.08-.27-.33l-5.25,4.68c-.2.18.15,1.23.39,1.35l1.55.74c.54.26,1.94.26,2.51.11l2.03-.6c1.18-.35,2.82-.01,4.03.76l-2.18.03-1.18-.09-2.62.59c-1.16.26-3.33-.36-4.59-1.01l-1.33-.62-4.32,4.86-3.17,3.76,4.43.56,2.44-.61c.79-.43,1.36-.32.49.56l-2.39.52c-.8.18-2.68.08-3.52-.1l-1.48-.32c-.3-.07-1.02.51-1.22.77l-3.72,5.11c-2.93,4.03-5.16,8.29-5.95,13.03.46.29.28.81-.25,1.11l-.19,4.85,6.02.77-5.79.13.61,2.97,4.28-.39c1.03-.09,2.62-.04,3.66.1l3.44.46.29.49-4.84-.35-2.51-.07-4.25.32.6,1.33,2.58.47,2.48.71c.52.15,1.31,1.22,1.49,1.83l-1.86-1.12c-.41-.24-1.44-.73-1.89-.82l-2.71-.54,2.41,4.7c3.7,5.33,7.86,10.21,12.83,14.3l5.86,4.82,3.34,2.69,8.32,5.66,8.58,5.5-.27-2.2,2.54,2.76,3.44.41,1.19.14.27.29,2.42.24,1.16,2.23-2.17-1.74-1.85-.25c-.07,0-.15-.12-.26-.25l-3.82-.16,5.21,3.4,6.02,3.5,3.25,1.88,19.5,10.07,5.16,2.31,17.77,7.29,4.27,1.6,2.32.73,3.83.85.8-1.07c-1.11-.46-.44-.62.34-.51l.44,1.62,4.44.65.21-.9,1,.93,11.1,1.85,11.36,2.34,8.92,2.4,2.27-4.52c-.72-1.37-1.32-3.26-1.03-4.64.23-1.07,1.56-2.59,2.84-3.2,2.6-1.24,5.62-.39,7.92,1.38,1.95,1.51,3.01,4.31,2.65,6.71s-2.57,3.71-4.76,3.64l-1.68,2.43.36,1.14,6.08,3.62c.76.45,2.51,1.26,3.34,1.09l5.77-1.17c3.09-.63,7.32-3.89,9.48-7.45l-1.18-.28-2.18-.49-.35-.17-1.44-1.88-5.11-.23c-.1,0-.6-.22-.68-.27l-.43-.45-1.61,1.64s-1.21.45-1.57.37l-2.44-.56c-.71-.85-.34-.96.46-.38l3.2.11c.18-.5.61-1.64,1.06-1.57l1.36.22c.11.02.16.14.27.33l5.93.19,1.47,1.98.29.36,3.13.2,1.47-6.18c1.1-4.64.63-9.45.49-14.2l-1.18-.12-1.6.81c-.36.18-.97.65-1.28.55l-1.34-.46-1.14-.39-.29-.22-2.48-.59c-.61-.15-1.73-.52-2.2-.48l-2.61.25.35-.89c1.23-.1,2.93-.1,3.85.19l2.29.73,1.13.36.28.39,2.99-.09c.33-.01,1.29-.38,1.61-.48l1.57-.48-.7-4.96-.53-3.78-3.46-.5,3.42-.32-.46-2.6-1.21-5.9c-.17-.83-.47-2.36-1.14-2.61l-2.12-.8-3.03-2.05.59-.58c1.71,1.48,3.11,2.4,5.01,2.87l-2.22-8.76-.62-2.45c-.11-.45-.94-1.23-1.31-1.46l-2.31-1.43c-.07-.05-.15-.32-.2-.39l-1.36-1.69-3.71-.22-1.25-.99,2.27.39c.95.16,2.83.06,3.31.66l1.19,1.46c.09.18.12.3.2.34l2.59,1.45-3.84-11.8c-.13-.4-.73-1.46-.75-1.46l-1.98.67-1.31-.37,2.34-.51s.7-.92.76-1.01l-3.09-7.72-2.77-6.61-4.12-9.06-3.23-6.7-2.79-5.56c-.3.19-.87.55-1.16.45l-1.41-.49-1.11-.39-.27-.32-1.93-1.18c-.39-.24-1.62-.61-2.1-.77l-4.53-1.49c1.98-.4,6.47,1.2,7.22,1.77l1.76,1.34c.07.05.11.16.21.28Z"/>
    <g id="outline">
      <g>
        <path d="M189.78,496.91c-.28-.12-1.15-.61-1.4-.61l-5.03-.07-2.17.72-3.57.3-.81-.12-3.45-.23-.3-.41,3.39-.11-1.59-3.12.54-.67,1.96,4.05,3.31-.27,3.74-1.17c.67-.21,2.38-.21,3.03.05l4.55,1.81c.72.99.14.98-.53.56l-1.66-.71Z"/>
        <path d="M211.87,589c.44.22,1.14,1.11,1.59,1.73l-1.59-.83-3.88-1.98-2.23-.64-2.21-.55-2.44-.6-4.51-.46-1.79-.64c-.48-.17-1.36-.95-1.82-1.46l1.71.58,2.17.73.79.27,4.6.44,2.42.61,2.22.56,1.97.7,3.02,1.53Z"/>
        <path d="M123.82,573.84c-.48.12-1.76.51-2.21.51h-4.27c-.24,0,.14-1.25.39-1.2l2.12.45c.54.11,1.74.09,2.28-.06l2-.56,2.96.23c.61.05,1.69-.08,2.23-.3s1.58-.04,2.32-.05l2.42-.04,3.44-.25.3.45-3.22.42c-1.25.16-2.88.11-4.37-.11l-1.33.86-2.26-.26c-.34-.04-1.07-.52-1.38-.44l-1.43.36Z"/>
        <path d="M121.17,586.08l-6.76-.18c-.24,0-.95-.65-1.38-1.03l1.94.45,5,.14,1.47-.52,3.07.41c.68.09,1.94.14,2.55.08l4.11-.4c.57-.17,2.26-.44,2.41.12l.55,1.98-1.36-1.31-5.11.07-2.94.4-.95-.64-1.13.17-1.47.25Z"/>
        <path d="M81.84,523.41l-5.26-.19c-.21,0-2.37-.97-2.76-.99l-5.57-.28c-.34.24-.85.6-.95.6l-4.67-.22-1.31-.97,2.12.26c.81.1,2.07-.03,3.2-.02l7.69.08,1.47.44,2.36.5,3.42.34.25.46Z"/>
        <path d="M199.03,545.32l-5.26-.18c-.24,0-1.13-.45-1.35-.54l-1.16-.55-1.3-.62c-.29-.14-1.12.55-1.43.53l-2.64-.21-4.76-2.54-2.12-1.13c.74.06,1.48.1,1.78.23l1.75.75,3.38,1.9c2.07,1.17,2.66-1.08,6.99.98l1.38.66,4.46.23.27.5Z"/>
        <path d="M127.43,488.43l1.46.35c.24.06-.38.91-.27.66l-2.03-.5-2.16-.54-1.69-.42-2.43-.51-5.63-.63-2.55-.31c-.45-.05-1.3-.41-2.42-.89-.53.02.29-.01.93-.04l3.05.15c.25.1,1.26.61,1.58.64l3.4.27c.63-.22.85-.3.8-.28l2.13.69,2.11.49,1.28.3,2.45.58Z"/>
        <path d="M241.76,588.85l-2.13.73-2.39-.39c-3.4-.55-4.08-1.83-5.91-2.09l-2.81-.4c-.24-.03-.91-.35-1.47-.62-.8-.34-.69-.51.16-.4l2.99.64c.49.1,1.86-.33,1.97-.43.92.88,2.96,2.32,4.14,2.43l5.44.52Z"/>
        <path d="M157.74,541.6l-2.11-.47-2.43-.57-2.01-.12c-.76-1.09-2.06-1.92-3.26-2.24l-2.32-.62c-1.24-.33-2.51-.93-3.7-1.79.81.12,1.34.22,1.72.34l2.37.78,1.62.54,2.15.75,3.6,1.76,1.87.42,2.81.77.31.26,1.88.74,1.68.66,1.65,1.02,1.36.84,1.36.84c-.37.01-1.68-.16-2.14-.44l-1.27-.75-2.38-1.29-2.47-1.23-.29-.23Z"/>
        <path d="M187.89,493.33c-.51-.02-1.8-1.22-1.92-1.48l1.25.23,1.24.71,5.53.18,2.74-1.38c.4-.2,1.61-.59,2.07-.59l4.24.02c.24,0,.13,1.23-.09,1.12s-.82-.45-1.07-.46l-2.95-.14-1.7.66-2.75,1.35-6.61-.23Z"/>
        <path d="M218.47,562.03l-.06,1.04-3.69-3.58c-.66-.64-2.89-.16-3.8-.15l-3.66.05-1.36-.46-1.11-.38c-.23-.08.08-.93.3-.84l1,.39,1.93.57,2.21-.07,4.42-.14,1.08.86,2.73,2.69Z"/>
        <path d="M129.51,497.4c-.36-.01-1.44-.67-2-1l2.82.35,2.46-.12,7.31-.18h1.42s-2.25.82-2.25.82c-.25.09-1.3.36-1.55.36l-8.23-.23Z"/>
        <path d="M216.41,530.33c-.4.22-1.47.55-1.92.47l-2.47-.41-2.94-.42c-.63.34-.9.48-.6.32l-2.67-.37-.23-.51,6.86.29,2.44.56c.6.12.69-1.39.04-1.1l-1.57-.7-2.26-1c.49-.05,1.88,0,2.41.24l1.23.54,1.35.6c.31.14.58.81.65,1.06l.22.26,1.02.47,2.01.93.28.31,1.82.72,1.19.47,1.26.57.93.42c.22.1-.33.77-.37.68l-2.73-1.26-2.46-1.14-.28-.29-1.02-.46-2.02-.91-.18-.36Z"/>
        <path d="M185.34,506.39l2.33.15,3.34.46.91.1.62.25c.19.08.86-.33,1.07-.33l4.48-.11,1.54-1.1c.54-.38,1.84-.85,2.59-1.07l2.11-.61,1.41-.41c.69-.48,1.2-.44.49.43l-1.7.71-1.36.34c-1.63.41-3.08.95-4.52,2.24l-3.98.18c-.24.1-1.14.47-1.39.44l-3.07-.32-2.01-.34c-.71-.12-1.22-.28-2.86-1Z"/>
        <path d="M234.66,563.42l-2.07-.4-1.8-.54-3.25-1.19-1.66-.68-2.19-.57-2.58-.4-1.94-.89,2.46.26,2.99.51,1.85.58,1.91.75c.71.28,1.7.73,2.32.89l1.85.47c.32.08,1,.52,2.11,1.2Z"/>
        <path d="M82,545.53l-2.43-.88,2.96.16,2.48.63,1.92.44c.6.14,1.76-.49,2.29-.95l-3.19-.31-.29-.44,5.87.04.3.42-2.12.25c-.02.14-.61,1.48-.94,1.46l-4-.25-2.84-.57Z"/>
        <path d="M74.81,527.17l-2.91-.13-.75-1.18,2.26.56,1.7.42c.09.02.14.1.29.25l.65.37c1.4.81,3.15,1.26,4.82.49l5.58.16c.36.01,1.45.56,1.79.68l2.4.84c-.67.02-2.3.03-3-.23l-2.04-.75-3.33-.31-1.1.71-4.25-.38c-.5-.04-1.5-.9-1.87-1.25l-.23-.28Z"/>
        <path d="M108.92,525.89c-.64.31-1.74.91-2.2.89l-4.63-.11-1.99-.62-1.28-.4-4.3-.21-1.15-1.13,1.99.43,4.62.44,1.29.47c.23.09,1.08.46,1.32.47l3.94.06,2.4-.28Z"/>
        <path d="M153.55,478.03l-4.31-.18-1.17-.09-1.94,1.19-6.31-.11c-.25-.19-.73-.57-.83-.57l-4.09-.15c-.29-.18-.8-.5-.9-.51l-3.77-.24.28-.4,2.35-.18,1.32-.16,1.22.9,4.15.2c.24.01,1.2.39,1.43.48,5.5,1.12,6.44-1.59,8.42-1.24.63.11,1.9.24,2.21.24l1.9.81Z"/>
        <path d="M196.21,524.56l-2.78-.81,4.28-.22,1.56-.8,3.48-.27,2.17-.1,1.86-.17.27-2.86.52,1.24.38.9c.12.28-.41,1.13-.71,1.19l-2.08.46-3.14.32-1.44.15c-1.35.14-3.03.55-4.38.97Z"/>
        <path d="M105.11,523c.68-.24.51,1.27-.08,1.08l-2.94-.94-6.27-3.04-2.28-1.07,1.29.02,1.98.55,5.67,3.04,2.63.36Z"/>
        <path d="M109.14,562.41c-.36-.02-1.55-.24-2.07-.42l-1.39-.49-2.42-.51-1.3-.28-2.34-.5-4-.37-.24-.46,5.79.21c.24,0,1.15.33,1.43.41l2.17.58,2.25.6c.31.08,1.08.58,2.12,1.24Z"/>
        <path d="M165.89,485.08l1.56-.62.97,1.06-3.15.46c-1.3.19-3.64.14-4.98-.13l-3.04-.6c-.47-.09-1.49-.52-2.22-.82.94-.13,2.8-.22,3.64.1l2.12.79,3.67.33,1.43-.57Z"/>
        <path d="M143.03,562.37l2.21.76c.75.9.13.91-.55.45l-2.29-.63c-1.19-.33-2.85-1.14-3.59-1.89l-1.7-1.71c-.55.35.49-.34.71-.49l2.29-.05,1.01.78-2.38.15c.76.81,1.55,1.68,2.03,1.85l2.24.77Z"/>
        <path d="M193.62,600.78h-4.66s-2.49.36-2.49.36l-2.16.36-2.11.44s-.46-.47-.81-.83l3.27-.18,1.29-.4c.23-.07,1.17-.44,1.41-.44l6.64.17c.24,0,1.14.47,1.36.57l1.13.54,2.22,1.06c-.54.07-2.1-.09-2.72-.42l-2.37-1.25Z"/>
        <path d="M107.24,488.2l-3.71-.09c-.78-.02-1.98.12-2.55.06l-1.82-.42-.31-.49,12.83.32c-2.6,1.78-4.03.63-4.43.62Z"/>
        <path d="M206.55,534.58c-.44-.13-1.09-1.38-1.51-1.32l-2.29.35-2.49.43-3.46.36c.23.67-.09-.27-.25-.71l3.72-.09,1.3-.41,1.33-.41h2.56c1.9,1.68,5.56,2.3,5.79,2.26l1.63-.28c.74-.05,1.08.11.06.66-1.15.19-2.94.21-3.81-.06l-2.57-.78Z"/>
        <path d="M90.38,539.27l2.1.41,2.21.05.82.13,3.47.03c.7-.57,2.05-1.51,2.65-1.24l2.73,1.22-1.93-.32c-.76-.13-2.24.36-2.9.88h-7.62s-1.52-1.16-1.52-1.16Z"/>
        <path d="M176.82,554.34l-1.87-.79-3.62-1.36-1.87-.5-1.28-.33-4.01-.28-.27-.47,4.75.29,3.01.54c.47.08,1.63.5,2.04.71l3.44,1.77.35.2,1.83.74,1.29.52.93,1.2,2.15,2.71h-1.06s-2.3-2.9-2.3-2.9l-3.14-1.9-.36-.14Z"/>
        <path d="M195,536.11l-.9.23c-.26-.26-1.69-1.51-2.29-1.56l-6.11-.52c-.62-.05-2.08-1.03-2.72-1.38-.04-.3-.16-1.2-.16-1.19l2.19,1.48c.21.14,1.01.59,1.26.61l6.13.44c.6.04,1.82,1.19,2.6,1.89Z"/>
        <path d="M179.57,490.55l-1.95-.86c-.89-.39-2.45-.54-3.43-.09l-6.03-.06c.86-.49,3.35-.9,3.55-.89l5.69.05,2.49,1.47.3.32,2.34-.24,2.47-.12-2.37.84-1.34.48-1.4-.71-.33-.18Z"/>
        <path d="M187.76,608.61l.69,2.16-1.57-1.8c-.16-1.47-1.35-2.35-2.66-2.56l-2.51-.41-2.46-2.53c-.07-.06.78-.25.94-.09l2.13,2.07,2.49.43c1.51.26,2.53,1.43,2.95,2.74Z"/>
        <path d="M105.8,564.7l3.1.1,1.28.48,1.36.52,3.45.06,1.7-.64,1.66-.71c0-.12.42.61.2.72l-.91.49-2.2.59c-1.21.32-3.78.23-4.97-.14l-1.75-.54-2.93-.94Z"/>
        <path d="M148.8,582.45l-2.3.43-2.01.21-2.33-1.16c-.56-.28-2.04-.3-2.94-.29-.83.67-1.32.53-.52-.58l4.18.2c2.82,2.22,4.91.06,7.55.77l-1.64.42Z"/>
        <path d="M229.64,553.93l-1.38-.49c-.4-.14-1.55-.51-1.91-.54l-5.05-.43-1.29-.53-2.31-.96c.68,0,2.08.12,2.74.32l1.53.47,1.47.11,3.56.54,1.95.42,1,.8.28.23,1.3.59,2.3,1.04c-.49.09-1.71.04-2.2-.23l-1.77-.95c-.08-.04-.12-.12-.23-.38Z"/>
        <path d="M94.76,549.53l-1.98-.56,2.81-.28.15-1.42,1.26-.47,2.47-.37,4.35-1.36,1.08-1.32c.69-.19,1.79-.55,2.21-.45l2.62.61-3.83.31-2.42,1.56c-.92.59-3.17,1.17-4.37,1.4l-2.42.46c-.37.07-.56,1.25-.64,1.62-.13.08-1.05.35-1.29.28Z"/>
        <path d="M162.61,503.94l-.89-.73-2.03-1.61c-.19-.15-.97-.28-1.21-.33s.16-1,.37-.88l.97.53,1.04.56,1.97,1.07-.44.49s.4.45.52.57l.26.28,1.52-.49c.67-.22,2.21.25,2.66.78l.28.33,2.15.33h1.98c.09,0,.13.11.26.33l1,.47,1.54.55c1.17.42,3.17.79,4.33,1.41l2.66,1.43c.7-1.1.77-.33.47.38-2.73.36-3.56-1.58-6.51-2.24-1.22-.27-2.98-.93-3.81-1.5-.07-.05-.12-.15-.25-.49.02-.03-1.11.59-1.42.51l-2.71-.77-.28-.35-1.3-.42-2.85.19c-.09,0-.13-.12-.27-.4Z"/>
        <path d="M70.31,518.4l-1.07.33-2.89-.33,2.54-.64,2.95-.35,2.11-.63c.93-.28,3-.1,4.17,0,.69,1.08.25,1.29-.58.44l-3.03.18-4.2.98Z"/>
        <path d="M219.43,587.91l-2.03-.51-1.29-.32-2.96-.38-1.38-.55-3.76-2.06c1.44-.64,2.71,1.19,5.77,1.86l2.56.56,2.21.48,1.08.25c.07.02-.29.93-.19.66Z"/>
        <path d="M235.18,611.47c-.34.34-1.08,1.05-1.5.93l-1.92-.54c-.27-.08-1.05-.41-1.27-.53l-1.19-.68-5.19-.27.24-.65,5.47.43,1.97.92,3.39.38Z"/>
        <path d="M213.49,577.98c.65.13,1.42.21,1.37.23-.05.02-.28.99-.19.62l-2.05-.34-2.46-.41-4.5-.51c-.5-.06-1.63-1.07-1.87-1.45l1.75.65c.78.29,2.31.32,3.23.19l2.3.52,2.43.5Z"/>
        <path d="M224.04,600.55c-.42,0-1.78.63-2.08.92l-1.71,1.66c-.32.31-1.45.53-1.46.43l.9-1.24,1.18-1.14,4.22-1.58c.23-.09,1.07.09,1.32.1l3.13.17,1.12.1,1.39-.29c.24-.05,1.33.09,1.14.09-.42.25-1.19.76-1.44.76l-7.7.02Z"/>
        <path d="M129.35,545.23c.72.16,1,.36-.14.78l-4.12-1.27-2.39-.6-4.42-.38-.27-.47,5.26.2c.24,0,1.13.3,1.38.37l2.15.62,2.56.75Z"/>
        <path d="M120.51,564.44l-1.87-1.97.63-.49,1.62,1.78.17.64,3.44.32,2.17.63c1.6.46,3.08,1.71,3.91,3.17l.38.59,1.31.48c1.57.76,2.84-1.29,4.44-.8.51.16,1.15.57,1.47.5l1.62-.33c.72-.03,1.08.11.05.78l-3.91-.08c-1.62.65-3.65.93-5.28-.15l-.39-.26c-1.97-2.77-3.36-3.2-6.63-3.83l-2.71-.52-.43-.45Z"/>
        <path d="M156.29,532.1l-1.84-.58-1.67-.53-2.26-.71-1.57-.59-1.21-.48-2.27-1,1.42-.09,3.71,1.39,1.56.56,2.22.76,1.98.68c.74.15.95.35-.08.59Z"/>
        <path d="M185.87,549.5l-2.24-.26-2.51-.87c.71-.04,2.3.02,3.02.21l2.03.54c.09.02.13.09.29.25l2.31.34,2.04.79,3.94.43,3.04,1.47-2.39-.21c-.24-.02-.93-.59-1.16-.76l-4.48-.47-3.6-1.17-.28-.32Z"/>
        <path d="M106.86,539.12l-1.58-1.65c.54.15,1.09.31,1.29.42l1.9,1.01,1.54.04,1.13.21c.32.06,1.03-.26,1.39-.31l3-.37,3.54-.42,2.93-.39,1.69-.43,2.48-.52c.96.35.87.56-.03.53l-5,1.44-5.51.27-1.93.36-1.39.38-3.98-.08-1.46-.5Z"/>
        <path d="M94.53,508.32c-.17.11-.96.5-1.2.54l-1.69.27-4.17.88c-1.8.58-4.79-.01-5.66-.62l-1.89-1.33,1.36.16,1.23.77,6.1.12,2.02-.96,3.9.17Z"/>
        <path d="M224.58,621.55l2.51.06c.24,0,.77-.66.58-.8l-1.16-.81,5.43.1.78.14,4.86-.09-.18.63-4.46-.02c-.24,0-1.2.31-1.47.25l-2.57-.59c-.84.11-.73,1.14.22,1.51.94.87.41.92-.36.42l-3.37-.32-1.11-.1-.27-.36-4.14-.27c-.7-1.07-.2-1.19.59-.52l3.24.23c.09,0,.53.2.61.25l.29.29Z"/>
        <path d="M113.17,559.21c-.48.24-1.62.62-2.31.7l-2.23.24c.69-.4,1.16-.7,1.4-.76l2.16-.62c3.22-.92,3.51-3.56,5.72-1.39.58-.01.06,0-1.01.02l-2.24,1.08-1.47.73Z"/>
        <path d="M127.68,474.5l-3.59,1c-.16-.04-.35-.32-.19-.41l1.26-.67,1.58-.74.99-.07,7.34.07.29.51-6.54-.02-1.14.32Z"/>
        <path d="M165.57,585.65l1.94,1.49-1.38-.21-2.9-.52-3.02-.94-3.9-1.52c.54-.08,1.69,0,2.2.2l1.38.53,1.85.46,1.31.49,1.34.5c.3.11.91-.28,1.19-.48Z"/>
        <path d="M167.35,556.82l-1.87-.5-2.28-.61c1.3-.23,3.37.08,4.4.63.08.04.15.15.34.39-.18-.12.8.55,1.05.55l3.92.06,3.41-.63,1.05-.2c.24-.04.52.8.28.83l-1.15.15-2.45.33-3.53.25c-.08.19-.42,1.03-.38.92l-1.42-1.09-1.1-.85-.28-.24Z"/>
        <path d="M180.17,543.72l-2.11-.48-3.81-.87c-.15.67-.35,1.53-.34,1.49l-1.97-3.67c.06-.29.29-1.43.2-.99.98,1.44,2.11,2.43,3.56,2.74l2.35.5c.32.07,1.06.58,2.12,1.28Z"/>
        <path d="M93.87,497.75l-1.85-.6-1.73-.56c-.32-.1-.97-.24-1.05-.4-.13-.25-.44-.86-.44-.85l2.52.89c.8.28,2.66.19,3.61.1l3.45-.31.3.55-3.78.08-.71.77.29.18,2.68.48,4.31.56,2.28.3c.55.07,1.73.68,2.06,1.07-.68-.03-1.74-.13-2.19-.24l-2.47-.62-4.61-.46-1.26-.37-1.12-.33-.3-.22Z"/>
        <path d="M165.64,515.61l-.83-1.21-1.05-1.02-2.3-2.24c.71.19,1.35.4,1.62.61l1.98,1.53c.43.33.97,1.6,1,1.98l.2.23,1.86.75,1.98.81,1.95.82,4.34.37-.27.37-2.37.18-1.38.11-2.08-.94-1.89-.86-2.52-1.14-.24-.36Z"/>
        <path d="M226.42,603.72l-1.72.68-2.27.96c1.04-1.27,2.39-2.04,3.73-2.35l2.4-.55c.96-.22,2.36-.13,3.98.04l-.76,1.13c-1.1-.65-1.39-.91-1.7-.83l-1.4.35-2.26.56Z"/>
        <path d="M137.39,530.91l-3-.7-2.15-.5-1.72-.4c-.52-.12-1.71-.48-2.09-.72l-1.74-1.11,2.16.5,2.37.78,2.13.48,2.34.46c.41.08,1.27.8,1.71,1.21Z"/>
        <path d="M193.74,547.45c-.14-1.12,0-.07.08.61l-4.58-.31-1.46-.43-3.58-.2-1.3-1,2.24.41c.45.08,1.73-.14,2.22-.26l1.13.46c.23.09,1.06.44,1.32.46l3.93.26Z"/>
        <path d="M195.03,570.18c-.42.02-1.77-.1-2.3-.34l-1.51-.69-2.07-.93-2.07-.94c0-.11-.06-1.12-.04-.72l1.3-.87c.96,2.11,1.75,1.97,2.65,2.43l1.89.96,2.15,1.1Z"/>
        <path d="M177.87,566.41c-.16.08-1.67-.16-2.09-.49l-2.22-1.76-1.49-1.33-.93-1.16c-.86.1-1.45.17-1.39-.06s.25-.96.18-.68l1.75.12.79.93,1.61,1.6,2.2,1.74,1.6,1.09Z"/>
        <path d="M130.6,523.28l.7,1.89-.67-.95-1.76-.67c-.46-.18-1.24-1.06-1.49-1.5l-2.14-3.83.77-.18,1.29,2.37.57,1.06c.1.19.47.96.67,1.03l2.07.78Z"/>
        <path d="M163.8,498.86l-1.54-.38-3.46-.47-4.64-1.76c-.62-1-.18-1.09.57-.48l4.72,1.71c.91.33,2.64.28,4.46.37,0-.05-.03.26-.11,1.02Z"/>
        <path d="M183.47,576.07l-.62-1.7-.53-1.45c-.15.02.72-.48.78-.24l.31,1.19.49,1.89.12.41c.37.56,1.27,1.69,1.82,2.12l2.07,1.62.09,1.19-2.63-2.2-2.04-1.62-2.9-1.42c-.1-.05-.13-.11-.29-.32-1.13-.51-2.09-1.51-1.81-2.46l2.2,2.03.27.25,1.36.72.86.45c.19.1.6-.04.77-.16l-.33-.3Z"/>
        <path d="M176.39,548.5l-3.59,1.01c-.68.19-2.46.09-3.11.02l-1.57-.75-3.06-1.46-1.43-.69c-.8-.23-.67-.44.21-.55l2.1.86,3.08,1.45,1.28.6,2.9-.02c1.02-.93,2.48-1.07,3.54-.73l.38.23,2.52,1.07h-2.21s-.69-.61-.69-.61l-.33-.44Z"/>
        <path d="M160.95,527.2l-2.91-.29c-.49-.13-1.79-.47-2.25-.7l-3.88-2.01c.13-.11.68-.59.62-.54l2.78,1.45,1.97.71,1.89.54,1.82.28-.04.56Z"/>
        <path d="M202.06,517.35l-2.21.7-2.27.34-1.32-.14-2.91-.31-.24-.4,6.33-.07c.24,0,1.21-.44,1.45-.5l2.32-.61c.76-.2,2.37-.11,3.18.01l3.12-.21c.87.26.86.43,0,.4-.75.27-1.36.54-1.6.54h-2.9c-.62-.14-1.31-.3-1.24-.29l-1.7.54Z"/>
        <path d="M86.23,524.65l1.23.29c.24.06-.52.8-.77.8l-4.68.1c-.74.17-1.82.15-2.34-.04l-1.25-.46c-.23-.08.32-.92.3-.79.28.16.91.52,1,.52l5.14.05c.46-.23,1.12-.54,1.36-.48Z"/>
        <path d="M173.47,569.48c-.3.86-.56,1.59-.33.95l-2.47-2.31-1.73-.77-2.52-2.35.11-1.02,2.96,2.78,2.01,1.03,1.97,1.69Z"/>
        <path d="M69.26,532.88c-.58-.25-1.59-.8-2.05-.82l-3.12-.11-1.93.67c-.73.37-1.35.31-.47-.57l2.23-.61c.97-.27,3.2-.05,4.14.18l2.72.64c.77-.07.97.08.05.52l-1.58.11Z"/>
        <path d="M102.38,544.96c-.73.06-2.37.07-3.1-.18l-4.53-1.56c-.42-.14-1.77.2-2.68.4-.09.2.22-.5.46-1.04l3.62.25,1.3.52,2.19.72,2.74.9Z"/>
        <path d="M180.79,503.96l1.4.61c.38.16.78,1.51.55,1.24l-3.47-1.76c-.33-.17-1.45-.27-1.92-.36l-2.27-.42c-.4-.07-1.39-.91-1.61-1.22l1.6.41,1.36.49,2.96.41,1.4.61Z"/>
        <path d="M235.32,580.38c-.63-.32-2.46-.29-3.12-.11l-1.88.53c-.75.42-1.32.35-.47-.54l2.23-.6c2.09-.56,5.28-.04,6.57,2.05l-1.15-.23-2.19-1.1Z"/>
        <path d="M214.32,581.94l2.09.98-5.29-.15c-.51-.01-1.7-1.12-2.14-1.39l-.89-.55c-.21-.13.4-.78.6-.88l2.16,1.88c.2.14.7.49.9.46l1.12-.16,1.44-.17Z"/>
        <path d="M195.81,605.77l-4.18-.18c-.24-.01-1.07-.34-1.39-.44-.17-.08-1.02-.51-1.17-.65l-2.41-2.17.3-.87,2.67,2.53,1.2.53,1.29.53,3.44.23.25.5Z"/>
        <path d="M96.49,570.4l-1.01-.36-3-.36-1.62-.7-2.87-1.47c.13-.1.72-.56.65-.5l3.22,1.63,1.21.57,4.91.29-1.48.9Z"/>
        <path d="M146.16,502.68l1.23.52c.22.1-.1.96-.33.87l-1.07-.43c-.52-.21-1.29-1.16-1.56-1.65l-1.4-2.53-.49-.89c-.11-.19.17-.65.25-.85s.64.53.67.69l.92,1.43.87,1.8c.11.22.7.95.92,1.04Z"/>
        <path d="M111.05,534.03c-.5,0-1.63-.09-2.15-.26l-2.22-.7-1.78-.67-2.19-.83-1.67-.83,2.19.29,2.19.74,1.18.51,1.73.6,2.72,1.15Z"/>
        <path d="M123.78,493.99c-.78-1.17-.3-1.39.53-.53l4.81-.08h1.96s2.41.29,2.41.29l2.37-2.29c.77.38,1.64.8.77.37-.85.81-2.36,2.38-3.2,2.37l-9.65-.14Z"/>
        <path d="M154.57,514.23l-.73-1.04-.47-2.26-.4-1.95c.83.36,1.43,1.37,1.49,2.25l.15,2.36.49.71,2.41,2.21c.28.26,1.37.86,1.72,1.03,1.33.5,2.42,1.23,3.35,2.39l-2.31-1.03-1.76-.78-1.58-1.13-2.21-1.97-.15-.8Z"/>
        <path d="M152.04,558.49l-2.61-.23-2.68-.14-1.34-.3-1.84-.41c-.54-.12-1.57-.7-2.13-1.14l1.69.3,1.96.51,4.51.49,2.44.9Z"/>
        <path d="M181.48,596.6c1.63,1.03,3.09,1.62,5.09,2.17-1.92.44-3.76-.26-5.54-1.6l-1.9-1.04-2.11-1.16,1.81.26c.23.03,1.12.4,1.33.53l1.32.83Z"/>
        <path d="M223.36,548.09c1.08-.16,1.7,1.24.29,1.3l-3.2-1.63c-.5-.25-1.83-.13-2.38-.09l-1.89.16c.21-.39,1.73-1.23,2.34-1.06l4.85,1.31Z"/>
        <path d="M145.11,544.38c.36-.21-.85.65-.87.62l-1.26-.8c-.24-.15-.28-.7-.27-1.06l-.25-1.56-1.74-2.35c-.38-1.05-.02-1.06.51-.5l1.82,2.27.34,2.26,1.71,1.13Z"/>
        <path d="M154.85,598.7c1.88,3.45,6.87,1.9,6.65,2.57l-.29.9c-.08.23-.81-.29-1.03-.46l-3.58-.48c-1.36-.18-2.78-2.25-2.69-3.68l.93,1.15Z"/>
        <polygon points="165.98 469.53 164.98 467.82 164.41 466.85 164.15 465.31 162.93 461.51 163.78 460.53 164.35 463.41 164.89 465.55 165.54 467.38 165.98 469.53"/>
        <path d="M64.91,517.38l-1.05.57c-.18.1-.6-.28-.81-.51l3.21-1.29,1.94-.48,1.74-.43,2.17-.28c-.72.41-1.37.8-1.69.89l-1.71.44-2.23.54-1.57.55Z"/>
        <path d="M212.29,547.87l-5.26-.17-1.24-.73-1.23-.34-1.13-.32c-.23-.07.09-.93.32-.87l1.1.31,2.76,1.29,4.41.36.26.46Z"/>
        <path d="M216.33,572.49l.08-.85,1.54.77,4.32.23,1.72-1.03c.08,1.54-2.68,2.43-4.99,1.71l-2.68-.84Z"/>
        <path d="M226.91,542.55l-3.24.4c-.74.09-2.29.04-3.05-.08l-2.9-.44-.3-.42,4.31.1.78.13,4.11-.11.29.42Z"/>
        <path d="M130.28,511.34l-2.03-1.71c-.39-.33-1.26-1.21-1.54-1.6l-.92-1.25-1.31-.22c-.24-.04.12-1.04.34-.95l1.07.46c1.36.59,1.08,1.51,2.92,3.01l1.75,1.43-.27.83Z"/>
        <path d="M115.26,499.46c-.16.35-.55,1.21-.32.71l-1.58-.76-5.09-.48c-.62-.06-1.98-1.07-2.43-1.4l2.18.3c.1.01.59.5.81.71l5.06.29,1.38.64Z"/>
        <path d="M200.86,561.65c-.47-.08-1.78.26-2.27.24l-3.9-.16,2.55-.66c1.76-.46,4.47-.36,5.84.96l-2.23-.37Z"/>
        <path d="M78.17,549.17c-.58.21-2.21.15-2.6.05l2.36-.82,1.27-.38,2.27-.51c.74-.17,2.35-.05,3.13.07l-2.5.68-2.38.33-1.56.58Z"/>
        <path d="M66.29,528.78l-1.47-1.61c-.14-.09-.87-.54-.79-.54s.41-.44.79-.89l.85,1.18,1.01,1.42.28.31,1.89.34,3.22.57,2.36.34,2.23.28c.11.01.18.15.32.33l5.08.16c.1,0,.62.24.69.3l.3.22,3.64.3-2.32.93-1.62-.89-.28-.33-1.98.09c-.32.01-1.07.49-1.38.39l-1.33-.45-1.14-.38-.28-.29-4.48-.27-1.37-.32-3.81-.88c-.09-.02-.2-.13-.42-.31Z"/>
        <polygon points="158.54 549.77 158.06 550.36 153.5 545.63 153.75 543.5 153.97 544.9 158.54 549.77"/>
        <path d="M159.97,505.62c.28-.12-.64.27-.85.35l-2.47-.72-1.7-.5-2.18-2.06c.36-.88.66-1.62.37-.91.92,1.04,1.79,2.12,2.44,2.34l1.7.58,2.69.92Z"/>
        <path d="M232.88,608.12l3.13.45.24.46-6.33-.16c-.24,0-1.05-.72-1.41-1.04l4.38.29Z"/>
        <path d="M242,593.7c-.24-1.16,0,0,.11.53l-7.53-.2-.74-1.16,3.06.43,5.1.4Z"/>
        <path d="M219.33,576.37l-2.38-.31-2.42-.48-1.68-.65c-.47-.18-1.41-.94-1.85-1.38l1.72.52,2.25.68,2.27.67,2.08.96Z"/>
        <polygon points="222.77 528.17 222.04 528.69 219.34 527.14 215.21 526.77 213.93 525.85 216.15 526.14 219.85 526.64 222.77 528.17"/>
        <polygon points="128.8 486.37 126.71 485.71 124.58 485.13 122.67 484.76 120 484.04 123.58 484.26 127.11 484.76 128.8 486.37"/>
        <path d="M83.2,513.95l-4.8-.25-2.85-.12c-.67-.03-1.32.02-1.21.01,1.52-1.07,3.48-1.05,5.31-.57l3.55.93Z"/>
        <path d="M197.5,556.64l.63,1.52-5.24-.32c-.36-.02-1.52-.57-1.9-.75-.75-.91-.18-.91.5-.46l2.08.48,2.57.6,1.38-1.07Z"/>
        <path d="M166.6,582.68c-1.02-.98-1.5-1.5-1.76-1.59l-2.01-.74-2.5-.91c1.74-.1,3.19.24,5.19.91l1.2,1.28c-.14,1.18-.18,1.51-.12,1.05Z"/>
        <polygon points="159.05 551.86 161.47 557 160.94 557.61 157.89 551.19 159.32 550.87 159.05 551.86"/>
        <path d="M127.15,499.13l-2.88-2.32,2.18.47c.41.09,1.14,1.31,1.14,1.46.06.26.07.43.14.48l3.64,2.7.38.96-3.21-1.16-2.65-.72,2.13-.42-.8-1.1c-.02-.23-.03-.3-.07-.34Z"/>
        <path d="M191.24,594.99c.75-.25.09-.03-.95.31l-1.35-1.89-.74-1.03-2.61-.27c.21-.32.66-1.08.96-1l1.94.5.97,1.27,1.79,2.11Z"/>
        <path d="M200.5,514.56l-2.93.13c.28-.23,1.16-.93,1.45-.93l5.91.08,2.77-2.22c-.34,2.25-2.53,2.95-4.56,2.73l-1.05.44-1.6-.23Z"/>
        <path d="M100.23,554.17l-1.65.74-4-.06-1.29-.97,1.9.28,3.42.14c1.45-.84,3.45-1.23,4.86-.59l1.96.89,1.73,1.04c-.41.02-1.63-.18-2.16-.42l-2.08-.94c-.53-.24-2.17-.34-2.7-.1Z"/>
        <path d="M120.21,498.85c-.32-.02-1.53-.27-2.03-.49l-1.29-.58-2.78-2.62c-.55-.56-.48-.85.57-.47l2.8,2.48,1.15.59,1.58,1.09Z"/>
        <path d="M117.32,493.14l-3.01-.74s-.3.06-.75.16l-3.53-.09-1.28-1.01,2.25.38c.41.07,1.65.02,2.06-.04.52-.15,1.88-.19,2.34.11l1.91,1.23Z"/>
        <path d="M119.8,509.91l1.77,2.38c-1.83-.36-2.6-2.2-2.8-3.81l-2.09-2.3,1.05-.07,1.74,2.07.33,1.72Z"/>
        <path d="M175.42,608.95l-2.5-.35-2.64-2.3c-.85-.19-1.71-.97-1.71-1.57l2.56,1.22,2.32,1.96,1.97,1.04Z"/>
        <path d="M121.47,490.22c-1.72-.61-3.66-1.04-4.98-.62l-2.34.74c-.81-.03-1.03-.24-.14-.59l2.3-.76c2.09-.69,5.61.16,5.16,1.23Z"/>
        <path d="M211.11,595.37l-4.75.38c.23.66-.11-.31-.24-.69l4.17-.14c.43-.08,1.74-.71,2.17-.6l2.6.63-3.95.43Z"/>
        <path d="M157.33,579.67l-2.08-.84-3.94-.43,1.11-1.23,2.42.83,1.66.57,1.15.4c.23.08-.31.8-.32.69Z"/>
        <path d="M183.34,470.5c1.37.36.69.57-.2.42-.79-.64-1.57-1.33-1.79-1.83l-.52-1.21-.47-1.12-.43-1.03c-.09-.22.86-.53.92-.29l.31,1.22c.07.27.43,1.27.59,1.5l1.59,2.34Z"/>
        <path d="M129.66,581.12l-1.5-.47-2.3-.94,2.84.26c.27.02,1.2-.01,1.34-.03.17-1.8.15-1.56.03-.33.32.58.56,1.09.79,1.15.26.07,1.17.36,1.18.33,0-.02-.28.94-.21.7l-2.17-.67Z"/>
        <polygon points="92.2 535.85 89.65 535.55 84.06 535.1 83.76 534.69 91.08 534.74 92.2 535.85"/>
        <path d="M203.45,539.92c-.37-.73-.45-.86-.87-2.08-.03-.04.12.17.74,1.05,1.64.09,3.33-.49,4.88-1.75.73-.57,1.16-.48.58.49-1.67,1.28-2.37,1.52-5.33,2.29Z"/>
        <path d="M123.69,521.13c-.67-.23-1.26-.46-1.57-.66l-2.21-1.35c-.68-.41-1.7-1.64-2.35-2.52,1.7-.19,2.1,2.43,3.98,2.39l2.16,2.14Z"/>
        <polygon points="96.24 534.26 94.74 533.95 91.15 533.6 90.52 532.68 92.76 532.99 98.35 533.48 96.24 534.26"/>
        <path d="M174.34,522.52l-1.43-.63-1.61-.65-2.01-.76c-.48-.18-1.44-.95-1.86-1.37l1.64.46,2.07.81,1.72.66c.48.19,1.48.77,1.83,1.13l.27.27.97.49,2.08.44c.07.02-1.06.52-1.27.44l-2.17-.86-.22-.43Z"/>
        <path d="M161.26,606.8c.2.13-.67.19-.9.08l-2.63-1.29-.9-1.15-.76-2.17,1.68,1.8c.5.54,1.51,1.41,2.03,1.75l1.47.98Z"/>
        <path d="M118.62,583.22l-2.94-.29c-.47-.05-1.65-.48-2.08-.9l-2.13-2.09,1.18.29c1.01.83,2.49,1.74,3.46,2.09l2.51.9Z"/>
        <path d="M219.56,525.2c-.42,0-1.63-.12-2.15-.33l-1.68-.7-1.17-.57-1.89-1.54c-.63.15.35-.08.89-.21l2.29,1.53,1.18.57,2.53,1.26Z"/>
        <path d="M230.2,588.72c-2.09.78-3.29-1.13-6.04-.1l-1.9.71,1.44-1.73,4.01.37,2.5.75Z"/>
        <path d="M155.33,463.42c-.35-1.58-.26-2.05-.5-1.97l-1.03.35-1.94.48-2.45-.04,2.42-.64c1.07-.28,2.46-.65,3.14-1.1l1.92-1.27c.46-.31,1.89-.4,2.2-.3l-1.45.7c-1.35.65-2.17,1.77-2.11,3.57-.3.32-.49.52-.21.22Z"/>
        <path d="M182.99,584.08l1.17.6c.22.11-.26.78-.33.72l-1.97-1.1-2.93-2.65-.03-1.27,2.85,2.89c.19.2,1.01.69,1.24.81Z"/>
        <path d="M235.98,569.14l-3.11-.41c-1.15.1-1.2-.33-.27-.72l2.16-.61c.87-.25,2.65.32,3.42.76l-2.2.98Z"/>
        <path d="M83.14,540.78c-.87.74-2.92,1.3-3.86.89l-2.4-1.04,6.26.15Z"/>
        <path d="M89.18,561.94l-5.25-.22c-.36-.01-1.47-.5-1.77-.7l-1.3-.87,2.21.39c.24.04,1.17.54,1.4.64l4.44.24.27.51Z"/>
        <path d="M84.02,506.3l-2.2-.51-1.26-.83-3.72-1.54c1.18-.18,3.06.25,4.32,1l1.15.68,1.71,1.2Z"/>
        <path d="M208.01,551.79l-1.88-.56-2.18-.67-1.36-.45-1.73-.3-.27-.44c.59-.02,1.98-.02,2.57.18l2.13.72,3.03,1.04.4.26.85,1.05,1.43,1.67.29.34,3.44-.24,4.05-.17.29.52,1.37.6,2.54,1.11c.96-.49.83-.41-.43.24-1.2-.22-3-.89-3.81-1.49-.07-.05-.15-.18-.25-.51l-3.43.24-4.05.16-.4-.41c-.25-.13-1.29-1.01-1.57-1.45l-.77-1.23-.28-.2Z"/>
        <path d="M110.39,529.5l2.48-.11c-3.05,1.39-6.28,1.33-7.85-.73.3,0,1.09.08,1.3.21l1.13.75,2.94-.13Z"/>
        <path d="M186.77,512.27l-.83-.63c-.26-.2-1-.63-1.31-.54l-1.75.52.23-1.15c1.52.09,3.05.47,4.59,1.13l2.49.24.29.43h-3.71Z"/>
        <path d="M200.74,597.61l-2.71-.39-3.62-.35c-.85.81-1.33.61-.55-.52l4.72.24c.36.02,1.3.36,2.16.62.88.03.86.2,0,.39Z"/>
        <path d="M173.43,483.16c.63,1.02.21,1.24-.6.49l-6.46-.3c-.56-.41.54-1.56.9-.6l6.16.41Z"/>
        <path d="M137.65,546.67c-1.15-.56-2.11-1.94-2.65-3.27l-.47-1.16-.42-1.03c-.09-.23.83-.52.89-.29l.34,1.2.63,1.49,1.67,3.07Z"/>
        <path d="M235.52,605.71l-6.22-.1c-.21.18-.89.71-1,.54l-.74-1.11,7.48.1c.14,0,.7.26.78.32l.29.25,2.89.19c.1.09.11,1.08-.13,1.01l-1.1-.32-1.97-.57c-.08-.02-.14-.09-.28-.31Z"/>
        <path d="M181.43,570.09l-1.33-.66-1.62-.73-2.28-1.04c.61-.04,2.09.11,2.73.4l2.14.95c.47.21,1.43.92,1.87,1.28-.36,0-1.27-.08-1.5-.2Z"/>
        <path d="M207.97,616.89c-1.07,0-1.46.01-1.78-.08l-2.35-.67-2.81-1.59c.54.01,1.14.04,1.37.14l1.48.59,1.64.65,2.44.96Z"/>
        <path d="M111.07,569.44l-1.12-.73-4.29-.3c.25-.36.65-.98.93-.93l1.35.27c1.79.35,3.24.79,4.51,1.66-.68.1-1.17.16-1.38.03Z"/>
        <path d="M93.75,514.29l-4.71-.22c-.36-.02-1.51-.58-1.89-.76-.79-.93-.1-.92.56-.45l2.37.61,3.41.34.25.48Z"/>
        <path d="M160.01,572.95c-.51.26-2.49.45-2.73-.17l-.84-2.19-.07-1.44.86-1.1.13,3.28.54,1.13,2.1.5Z"/>
        <path d="M117.28,525.32l-4.61.09-.33-.46,3.72-.24,2.31-.6,1.29.05c-.53.37-1.91,1.15-2.37,1.16Z"/>
        <path d="M241.39,611.8l-.02,1.33c-1.48-1.04-3.19-2.07-4.27-1.71l-1.2.4c-.23.08-.51-.75-.29-.86s1.11-.45,1.34-.38l4.44,1.22Z"/>
        <path d="M82.9,503.64l2.33-.1c.32.18.97.62,1.29.56l1.37-.29,2.48-.52,2-.52,3.19-.2,1.28-.54,2.11-1.03.97-.47c.22-.11.53.8.29.88l-1.14.37-3.06,1.31-3.42.25-2.22.61-2.12.58c-.68.19-2.26.18-2.92-.05l-2.42-.84Z"/>
        <path d="M178.57,598.1l1.28.92c.2.14-.21.79-.18.62l-2.06-.41-2.2-.44c-.31-.06-1.07-.61-1.68-1.08l1.35.05,2.06.9,1.43-.55Z"/>
        <path d="M194.98,484.04c-.06.09-1.44.24-1.62-.18l-.76-1.76v-1.03s-.1-2.58-.1-2.58l.93,1.39.06,3,1.49,1.17Z"/>
        <path d="M143.39,527.2c-.48-.02-1.78-.15-2.38-.31l-2.31-.62c-.53-.14-1.43-1.42-1.4-1.69,1.54.75,2.72,1.26,4.47,1.73l1.61.89Z"/>
        <path d="M138.23,583.43c-.88.04-1.39.03-1.67-.12l-1.19-.62-1.75-.38c-.46-.1-.49-1.48-.37-1.97.32-1.26.38-1.46.03-.11.47,2.37,2.73,1.28,4.95,3.2Z"/>
        <path d="M170.41,597.09l1.25.58c.22.1-.4.68-.36.52l-3.83-1.11-3.12-.79c.79-.07,2.4-.09,3.14.09l2.92.71Z"/>
        <polygon points="228.47 568.8 221.88 568.75 220.68 566.87 222.55 568.06 228.16 568.36 228.47 568.8"/>
        <path d="M129.69,542.2l-2.64-.02-3.2.18-.3-.44,2.63-.37,3.42-.32c.48-.02.8,1.38.09.97Z"/>
        <path d="M108.57,482.87l-1.87.79c-.33.14-1.05.47-1.36.37l-1.64-.53c0-.05-.01-.66,0-.51l3.4-.14,3.75-1.77c.37-.17,1.51-.12,1.91,0l2.46.81-2.62.1-.99-.42-3.03,1.28Z"/>
        <path d="M126.17,559.63l-.59-.92-1.25-1.33,2.89.06-1.19.67.5,1.17.24.19,2.45.62,2.27.58c.31.08,1,.59,1.65,1.09l-1.33-.14-2.08-.63-3.27-.99c-.1-.03-.15-.14-.29-.36Z"/>
        <polygon points="142.22 588.89 138.65 589 136.34 589.07 135.7 588.18 142.12 588.3 142.22 588.89"/>
        <path d="M132.3,532.41l-1.77-.35-2.49-.49c-.55-.11-1.48-.77-2.04-1.29l1.73.33,2.56.49c.44.08,1.04.53,2.01,1.3Z"/>
        <path d="M189.95,520.68l-1.96-.42-2.46-.31-.27-.46,3.64.19c.31.02,1.18.58,1.36.69l.27.32,2.98.09c.26,0,1.12.36,1.36.46l3.4.24.28.5-4.2-.29-1.93-.31-2.19-.35c-.1-.02-.13-.09-.28-.35Z"/>
        <path d="M154.39,585.68l-2.18.5-3.92.14-.32-.46,3.17-.32,3.24-.33c.9.32.87.51,0,.47Z"/>
        <path d="M143.79,576.14c.88-.83,1.24-.54.56.46l-5.08.05-1.13-1.13,2.31.32,3.33.29Z"/>
        <path d="M229.33,618.84l-2.43-.37-3.86-.11-.85-.71,5.25.15c.24,0,1.07.55,1.9,1.04Z"/>
        <polygon points="193.82 499.65 190.93 499.68 189.7 500.51 188.39 500.29 191.72 498.69 193.11 498.75 194.1 499.39 194.4 499.64 196.69 499.88 198.51 500.52 200.85 501.34 198.38 501.22 195.95 500.63 194.09 500.01 193.82 499.65"/>
        <path d="M148.59,552.38l-1.02-.4-1.12-.44-3.21-.06-.29-.98,2.05.48,1.44-.34c.29-.07,1.03.35,1.3.56l1.17.87.29.22,1.86.61,1.12.37c.27.09.4.8.39.98l-2.37-.96-1.36-.55-.25-.36Z"/>
        <path d="M180.07,525.57l1.25-1.09,2.53-.31,2.54-.31,2.73-2.14c-.39,2.25-2.57,2.65-4.29,2.97l-2.29.42-2.48.46Z"/>
        <path d="M151.41,506.6c-.49.08-1.27.21-1.06.18l.11-2.66c-.08-1.22-.1-1.44-.01-.19l2.81,3.01-1.84-.34Z"/>
        <path d="M151.5,591.28c-.21-.18-.81-.64-1.12-.53l-1.44.49-1.07-.53-2.23-1.1,2.47.31,3.6.42.05.76.28.27,1.32,1.24c.28-.02,1.23-.06,1.16.17l-.25.84-1.05-.43c-.51-.21-1.45-1.08-1.61-1.38l-.1-.51Z"/>
        <path d="M138.58,487.73l-1.13-.36-4.11-1.31c.66-.1,2.44-.21,3.13.13l2.41,1.19.29.26,1.89.54,2.23.64c.24.07.84.39,1.46.73.84.27.63.45-.17.48l-2.19-.73-2.19-.73-1.38-.46-.24-.37Z"/>
        <path d="M181.29,484.32c-.65-.1-1.54-.24-1.77-.47l-1.59-1.59-.74-1.78c-.87.1.6-.07.91-.11.24-.03.26.66.28,1.34l1.67,1.5,1.24,1.12Z"/>
        <path d="M189.49,538.7c-.5.92-.82,1.5-.63,1.15-1.28-1.64-1.3-1.82-3.21-2.26l-.15-.66,1.36-.08,2.63,1.85Z"/>
        <polygon points="189.19 590.05 187.31 589.61 185.2 587.75 183.89 586.66 185.77 587.1 187.88 588.96 189.19 590.05"/>
        <polygon points="135.52 466.41 130.6 466.43 130.62 465.21 133.13 465.5 135.52 466.41"/>
        <path d="M163.65,473.87l-1.92-.81-1.95-.83c-.45-.19-1.24-.79-1.63-1.19l3.84,1.14c.43.13,1.11.96,1.66,1.69Z"/>
        <path d="M222.11,578.08c-.09-.1.69-1.09.79-.9l1.76.56.48-1.72c.09-.33,1.09-.54,1.28-.52l-1.31,2.7-3-.13Z"/>
        <path d="M90.76,564.95c-.04.09-.56,1.28-.25.58l-3.46-.43-1.87-.89,2.67.11,1.53.16,1.38.47Z"/>
        <path d="M196.43,591.97l-1.35-.53-1.3-.52-1.85-.32-1.29-.98,2.14.39,2.38.66c.41.11,1.31.65,1.59.95l.27.29,3.79,1.47c.88-.05.94.13-.01.44l-2.49-.59c-.42-.1-1.32-.68-1.63-.96l-.25-.3Z"/>
        <path d="M203.41,554.28c.75.17,1.12.45.1.61l-2.63.63c-.52.13-1.85-.68-2.12-1.09l1.62.18,3.03-.34Z"/>
        <path d="M91.53,552.46l-4.56.04-.33-.49,4.33-.11,1.18-.77,1.24.05c-.34.31-1.52,1.27-1.86,1.27Z"/>
        <path d="M135.47,489.07c.38-.14-.89.3-1.16.41l-3.63.06-.05-1.57,4.84,1.1Z"/>
        <path d="M122.59,528.44l-2.36-.3-2.16-.63c-.27-.08-.71-.41-1.37-.86l2.16.38,1.95.52,1.8.33-.03.56Z"/>
        <path d="M78.01,537.42l2.07.49.27.42-4.76-.07c-.24,0-.17-1.22.05-1.13l1.1.42,1.27-.13Z"/>
        <path d="M218.63,540s-.64,1.1-.33.57l-2.7-.71-2.25-.3-.27-.47,3.66.17,1.89.74Z"/>
        <path d="M126.58,582.61c-.09-.51-.05-.29.15.82l-3.23-.29-1.81-.36-.29-.5,3.24.24,1.93.09Z"/>
        <path d="M171.82,467.47l-.47-2.19.18-1.43-.27-1.84c-.17-.08.58.3,1.01.51l-.09,4.66-.36.29Z"/>
        <path d="M164.4,489.85l-2.13-.22-4.28-.41-.25-.43,5.26.15c.24,0,.99.6,1.4.91Z"/>
        <path d="M88.66,516.82c-.96.06-2.71.09-3.6-.14l-3.07-.79c.82-.1,2.4-.14,3.14.05l3.53.88Z"/>
        <path d="M74.59,555.61l-1.82-.75-1.27-.52c-.2-.02-1.06-.1-.98-.33l.25-.79,1.71.79,2.47,1.14.27.28,2.8.34,3.04.81-3.7-.05-1.29-.38-1.16-.32-.32-.2Z"/>
        <path d="M159.61,588.26c.67,1.13.19,1.3-.6.54l-5.26-.2-.28-.5,6.14.16Z"/>
        <path d="M132.77,534.92l-1.09.64c-.46.27-1.85.14-2.33-.15l-1.77-1.08,1.33.15,3.86.45Z"/>
        <path d="M90.22,559.52c.74.66.57.95-.4.42l-2.28-.65-2.44-.25-.27-.47,3.66.15,1.74.8Z"/>
        <path d="M124.45,576.96l1.68.2c-.83.55-2.04.68-3.04.43l-2.59-.55c.15-.33.6-1.31.25-.54l3.71.45Z"/>
        <path d="M88.9,520.91l-2.36-.3-2.19-.63c-.23-.07-.69-.4-1.34-.85l2.16.37,1.95.53,1.81.33-.03.56Z"/>
        <path d="M192.65,578.6l-1.67-.76-2.7-1.48c-.83-.7-.15-.79.57-.46l2.44,1.17,1.35,1.54Z"/>
        <path d="M191.88,479.65l-1.97-.87-1.21-1.29.06-2.41c.29.71.72,1.93,1.04,2.29l2.08,2.28Z"/>
        <path d="M150.72,482.22c-.36.06-1.65-.05-2.23-.22l-2.53-.71v-.85s2.62.68,2.62.68c.53.14,1.34.56,2.14,1.09Z"/>
        <path d="M181.07,473.98l-1.78-.25-.09-1.52-1.59-.41c-.33-.09-.53-1.1-.51-1.29l2.61,1.31.22,1.13,1.14,1.03Z"/>
        <path d="M210.57,527.39l-1.85-1.05-3.16-.44,1.21-.47.88-.34c.43-.17,2.3.71,2.92,2.3Z"/>
        <path d="M152.39,595.48c.19-.48.07.69-.17.63l-1.07-.24-1.55-.36-1.31-.35c-.34-.09-1.13-.37-1.05-.3s.26-1,.19-.64l2.08.52,2.9.72Z"/>
        <path d="M209.32,570.03l-.18,1.14-3.49-.46-1.98-.28-.27-.45,2.78.04c.32,0,1.11.63,1.42.53l1.72-.53Z"/>
        <path d="M91.02,524.85l-2.35-.3-2.21-.64c-.24-.07-.66-.39-1.32-.85l2.16.38,1.95.52,1.8.33-.03.56Z"/>
        <path d="M201.17,582.68l-2.35-.3-2.21-.64c-.24-.07-.67-.39-1.33-.84l2.16.37,1.95.53,1.8.33-.03.56Z"/>
        <path d="M69.45,513.38l-2.38.8-1.77.6c.39-.5.94-1.18,1.23-1.26l2.35-.59c.53-.13,1.69-.17,2.24-.13l-1.67.58Z"/>
        <path d="M121.5,547.28l-2.56-.24,1.82-1.09,1.04,1,.27.26,3.89.29c.31.02,1.19.57,1.37.68l.25.33,1.46.02c.42-.08.24,1.13-.19,1.34l-1.67-.84-.17-.48-1.91-.53-.85.21-.81-.22-1.66-.46c-.09-.02-.14-.09-.27-.27Z"/>
        <path d="M165.64,591.3c.7,1.06.16,1.11-.58.51l-3.87-.37c-.7-1.06-.16-1.11.58-.51l3.87.37Z"/>
        <path d="M71.79,546.59l-2.18-.51c-1.31-.3-2.26-.64-3.43-1.14l2.19.19,2.27.36,1.16,1.1Z"/>
        <path d="M143.81,485.39l-.17,1.39c-.46-.59-1.19-1.54-1.21-1.95l-.12-3.4.51-.3.04,2.87.95,1.4Z"/>
        <path d="M157.92,464.07c-.18-1.27,2.04-2.74,4.29-2.39l-4.29,2.39Z"/>
        <path d="M122.61,533.03c-.45.02-1.29-.29-2.2-.61l5.37-.2c-.23-.81.06.2.18.64l-3.36.17Z"/>
        <path d="M147.27,462.52l-1.66,4.82c-.65-3.36,1.75-5.71,1.7-5.88l-.4-1.18,2.38-.58c.08.1.19.38.02.48l-1.24.71-.79,1.63Z"/>
        <path d="M101.71,563.37l-4.27-.17,1.22-.56c.22-.1.66-.41.86-.35l1.08.33,1.11-.38c.23-.08.25,1.14,0,1.13Z"/>
        <path d="M194.18,530.53c-.56.17-1.84.02-2.61-.1l-.27-.89,4.98.36-2.09.64Z"/>
        <path d="M201.04,498.24c-.08.16-1.62-1-1.64-1.55l-.11-3.53,1.74,5.07Z"/>
        <path d="M201.39,539.79l-2.27-.33-2.17-2.4c.55.09,1.12.18,1.28.33l1.41,1.28,1.75,1.12Z"/>
        <path d="M97.63,568.31l-1.92-.48-3.59-.3-.28-.47,4.71.18c.31.01,1.25.64,1.39.73l.28.24,1.91.53,3.31.92c.09.02.12.12.28.37.29.01,1.44.05,1.77.29l1.87,1.34c-.37-.03-1.13-.13-1.35-.22l-1.47-.61-1.12-.46-.3-.2-1.63-.45-3.59-.99c-.09-.02-.12-.11-.28-.43Z"/>
        <polygon points="149.03 525.61 144.94 525.74 143.42 523.83 145.42 524.95 148.73 525.21 149.03 525.61"/>
        <path d="M193.6,572.99l-1.87-.4-2.38-.51.6-.67,3.91,1.13c.08.02.14.12.34.35l1.87,1.14,1.47.89-.17,1.24-1.87-1.51-1.64-1.33-.25-.34Z"/>
        <polygon points="124.03 504.37 121.37 504.64 120.43 504.82 118.37 503.52 119.75 503.73 123.73 504.02 124.03 504.37"/>
        <path d="M90.63,549.73l-4.14-.04-.33-.41,3.74-.28,1.96-.25c-.02.06-1.03.99-1.23.99Z"/>
        <path d="M174.44,508.6l-2.8,2.17c-.1-1.44,1.92-2.87,3.94-3.36-.42.49-.89,1.01-1.13,1.2Z"/>
        <path d="M100.02,508.86l.55,1.92-1.15-1.33-1.02-1.18-.67-.78c-.16-.18,1.27-.51,1.39-.3l.9,1.66Z"/>
        <polygon points="235.12 575.41 232.96 576.06 230.98 575.26 234.77 574.93 236.67 574.81 235.12 575.41"/>
        <rect x="119.99" y="511.02" width=".99" height="4.97" transform="translate(-389.38 378.45) rotate(-61.96)"/>
        <path d="M109.37,557.37l-5.36.1c.26.84-.04-.14-.21-.68l5.24.13.32.45Z"/>
        <path d="M154.13,535.69l-2.75-1.36c-1.03.33-.91.07-.16-.35l1.67-.26,1.57,1.73s.05.12.15.35l1.37.67c.29.14.75.67,1.16,1.14-.67-.16-1.47-.35-1.73-.55l-1.16-.88-.13-.48Z"/>
        <polygon points="85.58 551.24 82.63 551.33 81.59 550.15 84.31 550.19 85.58 551.24"/>
        <polygon points="125.93 517.35 124.95 516.62 123.59 514.36 126.35 515.61 125.93 517.35"/>
        <rect x="214.95" y="546.59" width=".79" height="3.93" transform="translate(-318.57 299.1) rotate(-43.52)"/>
        <path d="M157.77,481.14l-3.44-.31-.29-.32,2.75-.43c.51,0,1.38.53,2.32,1.21l-1.34-.16Z"/>
        <path d="M222.71,583.48l-.03-1.42.67,1.17c.12.21.67-.31.77-.53l.53-1.24v3.28s-1.95-1.26-1.95-1.26Z"/>
        <path d="M109.47,552.37l-4.47.1c-.77.61-1.32.5-.56-.56l4.72-.02.3.48Z"/>
        <polygon points="143.82 516.03 141.43 520.58 141.73 517.68 143.82 516.03"/>
        <path d="M112.21,516.66c-2.85-.98-3.44,2.02-6.32,1.2l2.29-1.06c2.52-1.17,4.49-1.48,6.78.8l-2.75-.94Z"/>
        <path d="M168.51,578.29l-2.07-.8-2.17-1.16,2.41.17c.42.03,1.2.88,1.82,1.79Z"/>
        <path d="M169.86,480.27l-1.84-.63-1.22-.59c-.23,0-.25-1.33,0-1.16l2.54,1.55.83.5.31.22,2.91.18,1.25,1.03-2.7-.42-1.76-.42c-.1-.03-.13-.09-.3-.26Z"/>
        <rect x="109.1" y="522.01" width="5.83" height=".56" transform="translate(13.49 -2.71) rotate(1.48)"/>
        <path d="M87.21,498.61l-3.47-.17-1.25-1.06,2.74.45,2.27.42c.11.02.15.12.29.3l3.59.31c.75,1.13.03,1.09-.63.5l-3.27-.35-.27-.39Z"/>
        <path d="M181.03,501.2c0-.32,0,.64,0,.96-1.6-1.06-2.54-1.87-3.16-3.46l3.17,2.51Z"/>
        <path d="M123.99,477.94l-4.65-.13c.25,1.03-.02-.09-.14-.59l4.7.09s.23,1.64.09.64Z"/>
        <polygon points="120.02 568.18 117.27 568.1 119.22 567.32 122.1 567.2 122.39 567.58 120.02 568.18"/>
        <path d="M93.98,527.67l-.45.52-3.92-2.28c1.34-.17,2.97.58,4.37,1.76Z"/>
        <polygon points="95.36 492.09 93.6 491.73 90.18 491.39 89.88 490.98 94.15 490.98 95.36 492.09"/>
        <path d="M165.75,531.34l.16,2.21-2.73-2.93,1.75.4c.55.21,1.39.55.82.32Z"/>
        <path d="M224.87,544.3l-2.16.43c-.78.03-1.07-.16-.11-.67l2.57-.16c.09,0,.17.17.28.37l2.12.49,2.84.34.35.42c-.98.04-2.81.05-3.7-.21l-1.93-.58-.27-.44Z"/>
        <path d="M185.56,486.76l2.29,1.39-1.33-.07-2.65-.56c-.67-.93-.2-1.05.59-.44l1.1-.32Z"/>
        <path d="M180.21,533.15l-1.18,2.77c-.06.71-.07.81,0-.05l-1.17-2.67,1.21.34,1.15-.39Z"/>
        <path d="M213.44,515.15l-5.05-.04c.22.95-.01-.05-.15-.65l4.38.16,1.12.18.28.28,2.15.81c.78.09.95.29-.04.5l-1.51-.45-.97-.43-.22-.36Z"/>
        <rect x="150.31" y="548.42" width=".99" height="4.1" transform="translate(-405.94 424.8) rotate(-61.96)"/>
        <path d="M163.24,558.6l2.67,2.02c-1.58-.14-2.66-.76-3.94-2.07l1.27.05Z"/>
        <rect x="154.66" y="558.36" width=".79" height="3.93" transform="translate(-343.25 260.82) rotate(-43.52)"/>
        <path d="M74.11,543.75l-3.13-.2c-.36-.02-1.11-.46-1.93-.87l2.45.25,2.34.35.27.47Z"/>
        <polygon points="218.59 592.94 216.86 594.29 218.09 591.44 219.54 591.46 218.59 592.94"/>
        <path d="M161.58,587.2c.6.11,1.06.32-.05.53l-1.94-.49c-.4-.1-1.37-.86-1.62-1.16.47.07,1.33.24,1.64.36l1.97.76Z"/>
        <path d="M133.98,553.65l-1.55-.38c-.71-.17-1.76-1.54-1.95-2.43l2.33,1.7,1.16,1.1Z"/>
        <path d="M77.87,560.81c0-.42.01.6.02.91l-2.9-2.19.21-.94,2.67,2.22Z"/>
        <path d="M186.77,514.9l-2.37.98-1.37-.14,2.12-.98,1.62-.28c.94.26.79.42,0,.42Z"/>
        <path d="M188.24,562.7c-.49.22-1.75-.11-2.47-.74l3.78-.39,1.39-.43,2.16-.33-1.33.91-1.87.21-1.67.76Z"/>
        <path d="M171.63,585.78l-.84-1.3c-.3-.47-1.23-.97-2.1-1.46.59-.25,2.35.1,2.69.81.14.28.56,1.18.53,1.12l-.28.83Z"/>
        <path d="M141.9,464.07c-.15.21-.8.37-1.05.39s-.49-.77-.26-.86l.99-.43c.18-.08.45-.53.93-1.3-.27-.02.62.04.93.05l-1.54,2.14Z"/>
        <polygon points="110.81 547.8 108.37 547.91 110.3 547.08 113.18 546.99 113.48 547.4 110.81 547.8"/>
        <rect x="159.54" y="595.42" width=".79" height="3.93" transform="translate(-367.43 274.37) rotate(-43.52)"/>
        <path d="M118.3,532.67l-4.47-.14c-.7-1.14-.17-1.22.57-.54l3.62.19.28.49Z"/>
        <path d="M155.02,565.04c-.8.25-2.67.16-3.2.03l2.54-.74,2.66.09-2.01.63Z"/>
        <path d="M237.89,599.69l-1.88-.67-1.16-.2c-.24-.04.13-1.05.35-.95l1.02.46,2.01.91.23.44,2.12.63,1.52,1.77-2.01-1-1.98-.98-.23-.41Z"/>
        <path d="M148.21,532.05l-3.98-1.12,2.8-.2c.24,0,.68.61,1.19,1.32Z"/>
        <rect x="71.11" y="534.85" width=".87" height="4.57" transform="translate(-468.1 488.04) rotate(-77.21)"/>
        <path d="M177.86,602.7c-.79-.87-1.1-1.22-1.06-1.2s-.66.27-1.07.43c-.84-.07-1.1-.3-.07-.66,1.05-.57,1.81-.36,2.94.82l-.73.61Z"/>
        <path d="M232.9,551.99l-2.72-.46c-.24-.04-.73-.42-1.37-.88l2.96.23,1.13,1.1Z"/>
        <polygon points="116.55 577.77 113.48 578.52 111.49 577.62 116.55 577.77"/>
        <path d="M180.61,519.28l-.14,1.14-3.35-.37c-.93-.6-.63-.76.13-.67l1.62.41c.32.08.68-.13,1.74-.51Z"/>
        <path d="M216.25,569.56l-3.71-.05c-.24,0-.88-.57-1.36-.96l1.87.26,2.32.32.88.43Z"/>
        <path d="M70.15,524.68l-1.81-.24-2.89-.36-.27-.44,3.66.12c.24,0,.9.58,1.32.92Z"/>
        <rect x="240.68" y="602.09" width=".95" height="4.27" transform="translate(-398.14 483.64) rotate(-57.56)"/>
        <rect x="183.44" y="526.87" width="4.08" height="1" transform="translate(-252.58 180.06) rotate(-32.21)"/>
        <path d="M108.82,494.56c-.64-.06-1.12-.1-1.31-.28l-1.72-1.57c-.52-.53-.42-.8.64-.52l2.39,2.37Z"/>
        <path d="M150.6,576.67c-1.29-.22-2.06-.34-2.33-.46l-2.26-.97c1.32-.39,3.45.28,4.6,1.43Z"/>
        <path d="M144.42,569.84l1.23.5c.23.09-.29.84-.29.74l-1.81-.72c-.47-.19-1.45-.94-1.83-1.29.33.02,1.1.12,1.33.21l1.37.56Z"/>
        <path d="M81.92,520.89c.71.99.15,1.01-.55.49l-2.79-.45c-.71-.99-.15-1.01.55-.49l2.79.45Z"/>
        <path d="M168.44,538.76l1.37.51c.23.09-.35.93-.29.73l-1.58-.67c-2.41-1.02-4.2,1.49-6.53-1.46.54.11,1.29.3,1.65.45l1.4.59c.43.18,1.38-1.11,3.97-.14Z"/>
        <path d="M207.65,610.05c.6.11,1.06.31-.05.53l-1.94-.48c-.39-.1-1.42-.89-1.59-1.16.36.05,1.33.24,1.63.35l1.95.76Z"/>
        <path d="M119.59,554.11l-3.32.56c.08.24-.21-.64-.22-.68,0-.03.73-.1,1.09-.15l2.51-.36c.94-.06.79.23-.05.63Z"/>
        <rect x="175.7" y="588.12" width=".79" height="3.53" transform="translate(-357.82 283.44) rotate(-43.52)"/>
        <path d="M238.12,591.35l-4.14-.13c.18-.54.5-1.49.23-.69l3.13.32,1.09.11.27.46,1.62-.44h2.22c-.31.24-.96.76-1.22.77l-2.92.08-.28-.49Z"/>
        <rect x="201.68" y="610.65" width=".98" height="3.7" transform="translate(-439.89 674.11) rotate(-77.21)"/>
        <rect x="232.97" y="615.06" width=".99" height="3.6" transform="translate(-420.74 532.93) rotate(-61.96)"/>
        <polygon points="156.36 499.28 154.74 500.36 152.39 499.3 156.36 499.28"/>
        <path d="M175.27,577.4c.19.17-.58-.26-.67-.54l-.43-1.37-.33-1.06c-.07-.23.87-.52.91-.28l.19,1.16.34,2.09Z"/>
        <path d="M110.75,574.86l-1.93-.74-1.62-1.02c.39-.03,1.65.14,2.2.43l1.69.9.28.27,1.71.26,2.47.82c-.61.07-2.02.11-2.61-.08l-1.87-.61-.31-.23Z"/>
        <path d="M98.82,574.76l-2.83-1.33c-1.28.16-1.15.15.12-.02,1.08-.5,2.75-.03,2.71,1.35Z"/>
        <path d="M152.55,494.69l-2.35-.32-1.77-.33-.28-.47,2.59.14c.24.01.87.44,1.82.98Z"/>
        <path d="M207.27,605.22l-1.99.74-1.48.48c.03.17-.47-.68-.23-.75l1.15-.3,2.42-.64.14.48Z"/>
        <polygon points="117.13 521.93 116.26 522.27 114.33 520.39 114.6 519.58 117.13 521.93"/>
        <rect x="174.13" y="602.66" width=".87" height="4.14" transform="translate(-453.8 641.14) rotate(-77.21)"/>
        <path d="M233.98,571.11l-3.74.03c-.24,0-.13-1.26.09-1.15l1.05.52,1.74.15.87.44Z"/>
        <path d="M79.06,535.34c-.56.16-2.19.1-2.56.02l2.32-.81c.39-.14,1.58.07,2.29.22l-2.04.58Z"/>
        <rect x="214.3" y="518.05" width=".99" height="3.6" transform="translate(-345 465.05) rotate(-61.96)"/>
        <path d="M137.54,468.72c.06.12-.27-.56-.43-.88l3.09-.51c.79-.03.96.15.13.46l-2.79.94Z"/>
        <path d="M177.91,538.72s-.13.31-.33.8l-2.12-2.11.07-1.07,2.38,2.38Z"/>
        <path d="M134.8,517.53l-3.92-.13c-.7-1.14-.16-1.18.56-.54l3.07.19.28.48Z"/>
        <rect x="142.29" y="505.63" width="4.72" height=".56" transform="translate(13.08 -3.56) rotate(1.48)"/>
        <path d="M166.6,600.07l-1.94-.94-.94-.46c-.22-.11.62-1.16.79-.97l2.1,2.37Z"/>
        <path d="M88.94,539.17l-1.68-.3-1.39.06c.6-.58,1.13-1.09,1.42-.95l1.66.81c.81.04.88.2-.02.39Z"/>
        <path d="M190.39,482.41c.5.26-.26,1.38-.8.94l.12-3.81.42.33.27,2.54Z"/>
        <path d="M193.01,490.29l-1.66-1.06-2-.46c1.21-.62,3.15-.76,3.66,1.52Z"/>
        <polygon points="177.32 547.25 176.76 547.77 174.81 545.89 174.75 544.64 177.32 547.25"/>
        <path d="M171.98,475.21c-.43-.6-.8-1.09-.88-1.33l-.75-2.22c.05-.07.66-.3.72-.12l.51,1.54.41,2.13Z"/>
        <path d="M191.22,515.44c.26-.71-.07.73-.34.67l-1.52-.35-1.26-.34c-.24-.06.37-.9.29-.68l2.83.69Z"/>
        <path d="M167.94,510.36l2.55,1.42-2.43-.25c-.33-.03-.94-.69-1.49-1.25l1.37.09Z"/>
        <path d="M220.26,537.45l1.59,2.42c-.85-.08-2.13-1.64-2.5-2.46-.1-.21.78-.17.91.04Z"/>
        <path d="M180.51,552.23l-.81.25c-.16.05-.58-.21-.79-.31l-1.28-.64,3.48.14c.74,1.12.12,1.13-.6.56Z"/>
        <path d="M223.95,537.12l-1.88-.67-1.16-.2c-.24-.04.13-1.05.35-.95l1.02.46,2.02.91.23.42,1.35.49,1.12.41c.23.08-.09,1-.31.9l-.99-.44-1.5-1.01-.25-.33Z"/>
        <path d="M144.38,587.69l1.07-.42c.23-.09.56.88.32.93l-1.36.27c-.52.1-1.49-1.1-1.49-1.72l1.46.95Z"/>
        <path d="M172.31,591.27l-3.12-.33c-.94-.56-.67-.77.16-.77l2.95,1.1Z"/>
        <polygon points="194.93 513.92 193.73 513.97 195.36 512.16 196.57 512.11 194.93 513.92"/>
        <path d="M217.64,536.12l-2.26.91c-.31-.04-.4-1.42-.06-1.33l2.32.42Z"/>
        <path d="M85.48,512.45l-2.15-.47-1.46-.22-.28-.47,2.63.11c.24.01.67.48,1.26,1.04Z"/>
        <path d="M124.61,482.18l-2.84.22c-.73.52-1.28.47-.52-.55l3.06-.13.3.45Z"/>
        <polygon points="114.98 514.03 113.54 514.08 111.45 512.82 112.89 512.77 114.98 514.03"/>
        <path d="M137.55,592.16l-1.89-.53-1.69-.64c1.09-.1,2.91.23,3.84.67.1.05.18.15.36.34l1.66.51c.27-.1.87-.29.88-.14l.06,1.07-2.97-.97c-.1-.03-.12-.1-.25-.31Z"/>
        <polygon points="175.53 479.21 173.34 477.13 174.24 476.8 175.79 478.39 175.53 479.21"/>
        <rect x="150.76" y="483.77" width=".99" height="3.35" transform="translate(-348.31 390.74) rotate(-61.96)"/>
        <path d="M148.89,508.62c.7,1.11.19,1.15-.53.55l-2.54-.2-.29-.47,3.36.12Z"/>
        <path d="M168.4,474.52l.21,1.44c.03.24-.81.52-.88.29l-.31-1.19-.45-1.75,1.43,1.21Z"/>
        <rect x="210.22" y="564.89" width="2.48" height="1.02" transform="translate(-194.25 118.42) rotate(-21.72)"/>
        <path d="M93.82,562.32c.06-.09.66.58.42.63l-1.29.28c-.45.1-1.47-.43-2.14-.96l1.34.14,1.68-.1Z"/>
        <path d="M109.19,509.11l-1.63-.97-.88-.43c-.22-.11.27-.8.33-.73l1.88,1.06c.21.12.7.82.64.79l.23.3.85,1.13.43,1.9c-.46-.49-.95-.98-1.07-1.26l-.61-1.42-.16-.37Z"/>
        <rect x="147.3" y="564.12" width=".79" height="3.14" transform="translate(-348.97 257.23) rotate(-43.52)"/>
        <rect x="171.5" y="530.31" width=".79" height="3.14" transform="translate(-319.03 264.6) rotate(-43.52)"/>
        <polygon points="99.29 537.69 95.09 537.71 94.79 537.21 99 537.19 99.29 537.69"/>
        <polygon points="144.34 471.59 143.41 471.39 144.52 468.5 145.07 469.43 144.34 471.59"/>
        <path d="M165.15,567.82l-2.15-.47-1.46-.22-.28-.46,2.62.11c.25.01.69.48,1.27,1.04Z"/>
        <path d="M163.63,479.17l-1.22.03c1.18-1.33,2.41-1.34,3.42-.5l-2.2.48Z"/>
        <path d="M149.72,469.84l-2.98.06c-.22.34.15-.61.45-.65l1.6-.21c.26-.03,1.16.09,1.09.32s-.31.94-.16.49Z"/>
        <path d="M170.7,554.21l-1.26.45-2-.95c-.87.1-.91-.07.04-.42l3.22.92Z"/>
        <path d="M118.29,536.24l-3.72.37-.3-.45,2.94-.48c.06-.1.7.23,1.08.57Z"/>
        <rect x="124.63" y="522.36" width="2.41" height="1.11" transform="translate(13.51 -3.07) rotate(1.48)"/>
        <path d="M73.69,540.31l-3.7.22c.23.76-.05-.17-.22-.72l3.61.08.31.42Z"/>
        <path d="M132.49,514.62c-.6-.1-1.36-.25-1.33-.42l.23-1.07c-.5-.82-.38-1.37.46-.58l.64,2.06Z"/>
        <path d="M71.77,548.29c.7,1.11.19,1.15-.53.55l-2.54-.2-.29-.47,3.36.12Z"/>
        <path d="M110.06,504.2l-2.08-.54-1.21-.31c-.24-.06.36-.98.28-.75l1.56.46,1.45,1.13Z"/>
        <path d="M108.6,541.36l-3.6-.1-.32-.42,3.66-.19c-.24-.66-.11-.3.25.71Z"/>
        <path d="M165.81,607.31c-.56-.89-.9-1.4-1.01-1.7l-.51-1.48c-.16.02.79-.51.83-.27l.25,1.23.44,2.22Z"/>
        <polygon points="138.18 549.22 138.06 550.7 135.6 548.77 138.18 549.22"/>
        <path d="M206.5,582.82c-.17.94-.42,1.16-.57.26l-1.74-1.17c-.12-.06.82-.31,1.01-.15l1.3,1.06Z"/>
        <rect x="153.8" y="572.24" width=".87" height="3.05" transform="translate(-439.44 597.2) rotate(-77.21)"/>
        <path d="M202.7,610.26l-1.63-.44-1.04-1.15,1.77.54,1.16.36c.23.07-.33.91-.27.7Z"/>
        <polygon points="184.65 611.43 183.17 611.44 182.34 609.21 184.65 611.43"/>
        <polygon points="219.84 580.22 216.18 580.27 215.89 579.77 219.54 579.73 219.84 580.22"/>
        <path d="M195.79,611.49c.22.08.29,1.36.23,1.64l-2.1-2.36,1.87.72Z"/>
        <polygon points="154.26 473.78 153.25 472.89 154.15 470.24 154.26 473.78"/>
        <path d="M167.84,497.17l-1.62-.45-1.04-1.15,1.77.54,1.16.35c.23.07-.33.91-.27.7Z"/>
        <path d="M102.3,504.26l1.29.77h-2.92c0-.38.03-1.14.26-1.08l1.37.31Z"/>
        <path d="M143.22,495.97c-.49.04-1.4.05-1.5-.19l-.83-2.02,2.33,2.2Z"/>
        <polygon points="132.29 538.09 133.81 538.48 130.57 538.71 130.46 537.63 132.29 538.09"/>
        <rect x="147.93" y="516.74" width=".86" height="2.95" transform="translate(-235.87 140.16) rotate(-29.49)"/>
        <path d="M112.76,555.12l-2.34.35c-.7.45-1.27.42-.51-.51l1.97-.25.88.42Z"/>
        <path d="M81.96,554.92l1.25,1.07c.19.16-.27.75-.38.77l-2.27-1.85h1.4Z"/>
        <path d="M118.61,474.75c.1-.08-.74.6-.75.61l-2.04-.68.85-.76,1.94.84Z"/>
        <path d="M202.65,511.26l-1.33-1.74c-.05-.31-.13-.73.01-.8.23-.1,1.02-.45.75-.33l.56,2.87Z"/>
        <polygon points="104.89 516.62 103.42 516.64 102.58 514.4 104.89 516.62"/>
        <polygon points="223.75 597.58 224.84 598.76 222.77 598.28 221.4 597.81 223.75 597.58"/>
        <polygon points="142.68 492.14 139.03 492.19 138.73 491.7 142.38 491.65 142.68 492.14"/>
        <path d="M160.64,509.75c-.49.04-1.41.03-1.5-.19l-.83-2.02,2.33,2.21Z"/>
        <polygon points="153.45 581.83 153.33 583.31 150.87 581.38 153.45 581.83"/>
        <path d="M158.34,492.23c.23.09.26,1.35.21,1.63l-2.1-2.37,1.89.73Z"/>
        <path d="M81.68,565.41l-1.28-2.71c-.09.05.39-.22.96-.53l.33,3.24Z"/>
        <rect x="147.34" y="541.61" width=".99" height="2.73" transform="translate(-400.9 418.2) rotate(-61.96)"/>
        <path d="M100.14,514.05c.63.04,1.03.21-.02.45l-2.28-.59.13-.9,2.18,1.04Z"/>
        <polygon points="139.48 508.72 135.82 508.77 135.53 508.28 139.18 508.23 139.48 508.72"/>
        <rect x="218.55" y="595.33" width="2.38" height="1.05" transform="translate(-401.01 461.69) rotate(-57.56)"/>
        <polygon points="195.04 486.27 191.39 486.32 191.09 485.83 194.74 485.78 195.04 486.27"/>
        <rect x="129.98" y="484.03" width="2.95" height=".86" transform="translate(-221.44 127.47) rotate(-29.49)"/>
        <path d="M146.17,592.35c-.01.19-.71,1.12-.82,1l-2.04-.95,2.86-.04Z"/>
        <polygon points="181.22 590.45 180.36 592.13 178.87 590.46 181.22 590.45"/>
        <path d="M89.61,556.51l1.45.19c-.72.54-1.16.9-1.48.9s-.74-.39-1.43-.97l1.46-.11Z"/>
        <path d="M178.27,588.2c-.7.99-.74.83-.92.53l-1.14-2.43,2.06,1.9Z"/>
        <path d="M228.41,540.78s.38.41.81.87l-2.74-.1c-.24,0,.19-1.21.09-.72l1.84-.06Z"/>
        <polygon points="145.77 548.25 144.36 548.21 142.83 546.87 144.16 546.91 145.77 548.25"/>
        <path d="M141.93,510.49c.98.77,1.02,2.23.45,3.45l-.54-2.2.09-1.25Z"/>
        <rect x="184.95" y="481.04" width=".86" height="2.95" transform="translate(-213.5 153.76) rotate(-29.49)"/>
        <polygon points="182.13 516.59 180.99 517.84 179.17 516.65 182.13 516.59"/>
        <polygon points="191.54 582.76 190.12 582.71 188.6 581.37 189.93 581.41 191.54 582.76"/>
        <path d="M139.09,504.42l-1.98-.94c-.22-.11-.16-1.02-.09-1.5l2.08,2.44Z"/>
      </g>
      <path d="M211.82,625.34l-.82,2.06c-.07-.75.01-2.13.24-2.77l.51-1.44,1.42-3.6.88-2.05c.2-.47.96-1.42,1.38-1.86-.1.5-.33,1.39-.46,1.7l-.86,1.96-.55,1.25-1.73,4.75Z"/>
      <path d="M210.47,640.08c-.4-.46-1.04-1.19-1.03-1.43l.23-6.64c.01-.36.67-1.43.99-1.95l-.27,4.25c-.07,1.13-.27,2.71-.16,3.64l.25,2.15Z"/>
      <path d="M237.71,632.29l1.37-.12c-1.01.9-1.91,1.41-2.75,1.46-1.96.12-3.24-1.37-2.66-2.94.19.34.91,1.68,1.38,1.66l2.67-.07Z"/>
      <path d="M257.52,609.27l1.42.33,2.68-2.31c-.25-.64.06.15.38.98l-2.37,2.01c-.36.3-1.97-.53-2.1-1.01Z"/>
      <path d="M252.94,621.56c-1.81-.34-1.76-1.44-.47-1.43,1.55-.15,2.44-1.35,2.79-2.68-.02-.42.48,1.47.23,1.71l-2.56,2.41Z"/>
      <path d="M243.22,628.76l1.19.72c.21.13,1.24.63,1.41.47l2.01-1.88c-.21-.74,0,.02.26.89-.89,1.36-2.76,1.92-4.17,1.12l-.96-.54c-.21-.12.25-.88.25-.78Z"/>
      <path d="M261.89,598.2c-1.01-.1-1.28-1.44.03-1.1,1.12-.16,2.14-.48,2.43-.96l1.13-1.91-.51,2.4c-.16.76-1.96,1.61-3.07,1.57Z"/>
      <path d="M264.01,557.64l2.02-1.52.91-2.39c.09.31.28,1.91.08,2.43-.24.63-1.11,1.12-2.3,1.94-.26-.17-1.71-1.13-.71-.47Z"/>
      <path d="M265.5,584.95c-1.11-.31-1.18-1.48.25-1.01l1.99-1.89c-.4-1.45.76-1.32,1.02-.2-1.05,1.26-1.95,2.11-3.26,3.09Z"/>
      <path d="M265.81,571.51c-.62.19-1.26-1.31.04-.96l1.64-.66.3-1.06.34-1.17c.07-.23,1,.1.91.32l-.42,1.07c-.17.43-.62,1.4-.87,1.79-.13.2-.94.37-1.94.67Z"/>
      <path d="M265.4,518.9c-1.99-.66-2.24-.74-.81-.27,1.01-.69,1.79-1.27,2.01-1.77l.89-2-.23,2.52c-.05.54-1.59,1.52-1.86,1.52Z"/>
      <path d="M265.59,505.69c-1.09-.42-1.18-.67-.23-.61l1.41-.77c.22-.12.58-.63.72-.84l.92-1.32-.45,2.34c-.07.37-1.21.86-2.38,1.21Z"/>
      <path d="M266.83,541.97l-1.36,2.39c-.34.59-2.16.44-2.5.23,1.83-.55,2.61-1.11,3.17-3.27-.52-.5-.18-.17.68.65Z"/>
      <path d="M265.15,532.24l-2.59-.53,2.15-.21,1.36-1.65,1.07-1.59c.09.16-.09,1.73-.44,2.15l-1.54,1.84Z"/>
      <path d="M274.51,454.23c.22-.34-.15.61-.45.65l-1.62.22c-.24.03-1.14-.09-1.07-.32s.31-.96.16-.49l2.98-.06Z"/>
      <path d="M266.22,492.62c2.66-2.41,3.2-5.4,2.8-2.6-.19,1.47-1.23,2.78-2.8,2.6Z"/>
      <path d="M267.93,479.65l-1.38.24c-.24.04-.52-.9-.28-.92l1.46-.12.77-1.16,1.1-1.66-.29,2.24-1.39,1.38Z"/>
      <path d="M234.95,450.22l-1.79,1.73.42-1.85c.07-.39,1.33-.3,1.37.11Z"/>
      <path d="M267.54,467.34c-1.02-.45-1.03-.69.03-.46.72-.38,1.66-.91,1.93-1.22l1.53-1.83c.49,1.65-1.33,3.45-3.49,3.51Z"/>
      <path d="M240.48,474.86c-.2,1.11-.73,1.97-1.83,2.2l.93-1.44.32-2.57.69.65c.18.17,0,.52-.12,1.16Z"/>
      <path d="M235.75,464.02l-1.34,1.28.61-1.7.5-.99c.1-.19-.08-.51-.32-1.12-.12.03.5-.11.74-.17.27-.06.51,2.03-.19,2.69Z"/>
      <path d="M251.61,498.31l-.53,1.24c-.1.22-.78-.37-.68-.39l.91-2.73c-.92.15.02,0,.73-.11l-.43,1.99Z"/>
      <path d="M246.17,487.21c-.12.42-1.33,1-1.74,1.04l1.08-1.57.19-2.39c.34.23,1.11.67,1.02.98l-.55,1.93Z"/>
      <path d="M245.83,550.89l3.29-1.58c.03-1.18.3-1.05.54.13l-2.35,2.24c-.24.23-1.77-.83-1.48-.79Z"/>
      <polygon points="264.95 422.4 266.53 420.86 267.05 418.07 268.01 420.46 265.8 422.69 264.95 422.4"/>
      <path d="M250.22,524.67c-.22-.11-.41-1.18-.18-1.1l1.53.5,1.91-2.76-.24,2.13c-.08.67-1.86,1.11-3.02,1.24Z"/>
      <path d="M25.45,655.85c-.04-7.53.97-13.7,5.2-19.85,1.1-1.6,2.44-3.2,3.95-4.33l5.71-4.29c3.8-2.85,8.12-4.53,12.52-6.21,18.97-7.2,41.12-9.8,61.78-11.34,14.86-1.11,28.93-.92,44.2-.04l-5.35-2.2-6.45-2.67-6.59-2.9-11.55-5.27-12.65-6.8-5.01-2.88-11.46-6.99-6.48-4.15-7.07-4.69c-9.31-6.18-18.45-14.38-25.5-23.36-5.8-7.39-7.7-18.7-3.35-26.23l4.11-7.11c3.69-6.39,8.06-12.21,13.44-17.2l10.66-9.88c4.24-3.93,8.68-7.23,13.45-10.37l6.33-4.17,7.91-4.8,13.88-7.09c11.25-5.75,28.69-10.18,41.52-8.04,8.52,1.42,15.93,5.35,21.9,11.6l9.59,11.5c7.67,10.58,14.72,21.28,20.44,33.03l5.78,11.88,4.55,10.22,8.35,22.64,2.64-.08,1.18-1.2c-1.4-1.91-2-3.84-1.13-6.1.61-1.57,2.64-2.99,4.67-3.38l.5-2.73c-1.73-1.32-2.8-3.16-2.6-5.09.24-2.21,1.57-3.83,4.1-4.65l.23-3.28c.04-.65-3.96-2.15-3.44-5.96.26-1.91,1.68-3.41,3.74-4.39l.06-2.88c-2.09-.94-3.46-2.66-3.58-4.52-.15-2.26,1.18-4.21,3.18-5.27l-.46-1.95c-1.93-.52-3.56-1.74-4.18-3.4-.71-1.9-.2-4.05,1.05-5.59l-1.13-2.27c-1.95-.14-4.04-1.01-4.98-2.53-1.19-1.93-1-4.25.37-6.31l-1.57-2.41c-2.11.05-3.82-.88-4.83-2.6-1.25-2.13-.73-4.64.88-6.51l-1.15-2.86c-2-.52-3.64-1.49-4.3-2.84-.86-1.75-.69-4.04.44-5.51l1.01-1.31-.15-2.83c-2.3-.95-3.86-3.22-3.62-5.58.26-2.61,2.19-4.56,4.89-5.04-2.59-2-3.39-5.4-1.46-8.16,3.76-5.36,8.32-10.15,13.31-14.35l6.1-5.12c1.14-.96,3.48-1.81,4.86-1.91,2.77-.2,4.08,1.5,4.7,4.14,1.69-.08,1.48-4.57,5.87-4.84s4.87,3.71,6.43,4.69c.81.51,4.25-3.05,7.78.16,1.7,1.55,1.83,4.21,1.7,6.2,1.89.75,4.09,1.92,4.82,3.6,1.98,4.53-2.85,7.13-2.59,7.54l.85,1.41c1.06,1.75,1.57,3.93.65,5.96-.72,1.59-2.87,2.84-4.93,3.17l-1.13-.25-.95,1.94c2.08,2.64,1.61,6.69-1.36,8.38-.74.42-2.44.8-3.26,1.02l-.95,1.9c2.01,1.8,3.13,5.06.99,7.53l-3.2,2.68c-1.45,1.22,3.7,3.23,2.89,7.44-.35,1.8-1.84,3.42-3.6,4.35l-.25,2.16c1.74,1.15,3.18,2.71,3.47,4.66s-.63,4.62-2.46,5.4l-1.42.6.09,2.46c2.14,1.27,3.32,3.32,3.24,5.5-.08,2.29-1.57,4.35-4.21,5.21l.05,2.55c2.28,1.3,3.49,3.31,3.34,5.56s-1.48,4.11-3.83,5.08l-.18,2.25c.88.88,2.21,2.14,2.75,3.1,1.7,3.01-.05,6.56-3.14,7.74l-.15,2.37c2.11,1.12,3.45,3.05,3.49,5.13.04,2.21-1.23,4.33-3.43,5.49l-.06,1.93c2.14.99,3.74,2.91,3.99,4.72.36,2.56-.72,4.54-2.72,6.06l.1,2.55c1.97.73,3.58,2.26,4.14,4.25.82,2.91-.8,5.72-3.6,6.85l-.02,2.59c1.87,1.14,3.22,2.98,3.35,5.04s-1.24,4.48-3.26,5.43l-1.8.85-.43,2.1,1.96,2.57c.92,1.21.7,4.03-.23,5.62-.76,1.3-2.65,2.39-4.3,3.1l-.36,1.53c-.1.43,3.07,3.01,1.29,7.29-1.41,3.39-5.14,2.59-6.57,4.2l.21,1.11c.84,1.93.88,4.03-.2,5.97-1.8,3.24-5.69,2.6-5.95,2.92l-.76.93c.79,2.54.28,5.36-1.51,6.95-2.11,1.87-4.88,2-7.31.67-1.58,2.84-4.06,4.01-6.91,3.48l-1.82-.34-.02.34c5.37,11,2.62,26.79-.68,38.87-3.44,12.57-7.28,24.56-12.58,36.4l-10.24,20.58-3.88,6.78-1.92,3.13c-6.95,11.31-14.66,21.62-23.52,31.63l-17.08,17.35c-3.88,3.94-8.26,6.93-12.99,9.73l-4.89,2.29c-8.59,4.02-18.25,3.26-26.81-1.03-10.99-5.51-21.4-13.87-29.94-22.9l-4.87-5.15-11-12.86c-10.23-11.97-23.43-33.31-30.14-47.66l-2.11-4.51c-5.81-12.41-10.27-25.09-13.47-38.53-1.16-4.88-1.57-9.6-1.6-14.53ZM268.6,420c.05-2.09-1.6-3.83-3.69-3.89s-3.83,1.6-3.89,3.69,1.6,3.83,3.69,3.89,3.83-1.6,3.89-3.69ZM253.68,423.4c1.01-.76,2.42-2.18,3.05-3.13.95-1.45-.09-3.41-1.58-3.68-3.91-.72-8.38,4.08-12.1,7.6,5.29-1.56,9.19.29,10.63-.78ZM277.16,421.66l1,1.51-.39.74c-.09.17,1.09.08,1.13-.1.34-1.62-1.43-4.83-4.13-4.2-2.08.48-4.06,2.13-3.18,5.07.45,1.51,2.87,3.35,4.81,2.11l.66-2.78.1-2.34ZM258.55,426.6l.7-1.97c.08-.23.48-.33,1.42-.67l-.9-2.88-1,1.45-3.03,3.9c-.14.18-.68,1.02-.74,1.22l-.82,5.48,4.79-5.07c-.06-.17-.48-1.29-.42-1.46ZM254.03,611.15c-1.06-1.57-1.84-4.38-.94-6.25.78-1.61,2.48-2.99,4.59-3.4l1.54-1.21c-2.49-2.32-3.58-5.11-2.04-8.05.77-1.48,2.85-2.61,4.37-3.16l.56-2.17c-1.02-1.11-2.27-2.79-2.55-4.23-.59-2.97,1.26-5.45,3.95-6.54l.09-2.08-2.33-2.11c-2.51-3.03-1.18-6.97,2.03-8.65l-.26-2.36c-2.14-.73-3.87-2.33-4.46-4.46-.75-2.69.75-5.39,3.24-6.61l-.28-2.18c-1.68-1.05-3.29-2.84-3.52-4.45-.33-2.25.52-4.39,2.5-5.63,1-.62,1.77-2.43.95-3.07-2.14-1.64-3.31-3.29-3.25-5.73.05-1.98,1.82-4.09,3.79-5.02,2.15-3.04-3.34-3.49-3.09-7.83.26-4.48,4.32-4.71,4.47-6.65s-4.34-3.34-3.51-7.4c.39-1.93,1.71-3.53,3.63-4.55l.56-.97-.39-1.55c-.76-.67-2.17-2.08-2.56-3.02-1.18-2.83.23-6.11,3.3-7.19l.25-2.53c-2.2-1.32-3.38-3.22-3.32-5.41.06-2.19,1.5-4.03,3.73-5l.35-2.29c-2.25-1.53-3.13-3.82-2.41-6.42.51-1.83,2.29-3.53,4.65-3.91l1.2-2.58c-1.49-1.78-2-4.23-.95-6.3s3.45-3.16,5.8-3.32l.94-1.96c-1.34-2.07-1.5-5.68.83-7.21l2.56-1.68c-2.71-1.54-3.63-4.23-2.32-7.3-3.62.19-5.81-2.31-5.88-5.9-2.46,1.21-3.51,3.59-7.52,1.85-.95,1.77-1.86,3.67-3.05,5.03-5.36,6.13-10.83,11.57-17.06,16.8-1.46,1.22-3.77,1.78-5.48,2.14,1.07,5.5-3.49,5.9-2.99,7.79.09.35,1,1.09,1.42,1.25,2.13.82,4.3,3.45,3.43,6.17-.27.84-1.26,2.22-1.9,3.01l.68,2.23c2.09.15,4.18,1.17,5.04,2.9,1.02,2.06.95,4.15-.7,6.22l1.06,2.25c2.69-.23,4.63.88,5.6,2.66,1.07,1.98.8,4.4-.47,6.05l.87,2.42c1.96.18,3.72,1.01,4.82,2.52,1.64,2.28,1.08,5.33-1.18,7.14l.24,2.92c2.87,1.12,4.33,4.15,3.25,7.14-.32.89-1.69,2.04-2.76,2.84v2.99c1.51,1.19,2.68,2.73,2.9,4.51.29,2.32-1.4,4.4-3.24,5.45l-.18,4.14c1.62,1.35,2.83,3.18,2.64,5.25-.32,3.58-4.12,3.99-4.42,5.14l-.61,2.35,1.11,1.66c1.08,1.61,1.3,3.96.3,5.68-.89,1.53-2.63,2.54-4.68,2.81l-.89,2.4c.81,1.73,1,3.5.2,5.23-.49,1.06-2.25,2.13-3.74,2.58,2.25,8.83,3.96,17.55,4.99,26.62,1.33,11.62.57,25.15-8.52,32.32l-1.47,1.16,2.05.74c1.19-2.77,4.14-4.53,7.82-3.47-1.15-2.59-1.35-4.58-.34-6.68,1.89-3.93,6.81-2.01,7-3.9ZM237.42,441.87c2.14-.66,3.42-1.96,4.71-3.39l2.02-2.25,3.78-.02c3.96-1.47,6.16-5.31,5.59-9.44l3.01-2.93-.24-.58c-3.73,3.53-7.46.53-10.69,1.87-2.35.98-4.96,4.15-5.88,6.04-.08.16.27.95.22,1.12l-.22.89c-.28,1.13,2.1,3.63-2.31,8.71ZM279.82,434.14c.51-.45,1.72-.34,2.88-.23s1.97-2.9,1.09-4.17c-.81-1.17-2.05-2.11-3.15-2.23-.98-.11-2.94.76-3.46,1.63-1.09,1.8-.41,4.03.92,5.29l.69.66s.4-.41,1.03-.96ZM235.08,440.76c2.81-.01,4.26-3.5,3.57-6s-.09-4.34.52-6.9c-3.7,3.61-9.27,8.45-9.18,12.89.13.91.42,1.24.67.03l4.42-.02ZM239.45,446.53l3.59-2.46-1.62-.65,3.35-2.7.03,1.78,6.62-6.23-5.77,1.09c-.55.1-1.67.57-1.97,1-2.03,2.91-5.23,5.06-7.48,4.85.1,0,1.26,1.74.86,4,.25,0,1.99-.39,2.39-.67ZM282.01,443.03l-.95.81-2.21.31-1.26.18c-.26.04.42,1.06.73,1.17,1.72.6,4.92-1.18,4.74-3.81-.16-2.26-2.05-4.58-4.84-3.92-1.3.31-2.68,1.63-2.97,2.83-.23.93.31,3.17,1.2,3.37l2.07-.7c.43.12,1.71.46,1.99.02l1.32-1.99.17,1.72ZM234.72,444.72l-1.13-1.24s-.37.29-1.05.92l1.31,1.3.86-.97ZM275.74,445.34l-.93,1.96,1.49.71.93-1.96-1.49-.71ZM233.44,453.85c.6-.4,1.57-1.85,1.77-2.62.49-1.94-.56-3.82-2.23-4.53-1.41-.6-3.57-.12-4.51,1.15s-.94,3.19-.13,4.72c.41.78,1.93,1.53,2.53,1.17l1.23-.73,1.33.84ZM274.67,456.3c.83-.49,1.94-2.07,2.12-2.88.5-2.17-.9-4.18-2.79-4.65-1.71-.43-3.62.24-4.76,1.99-.72,1.11-.4,3.78.87,4.72.93.69,3.61,1.37,4.55.82ZM231.52,457.65c1.71-1.02,1.12-2.6-.14-3.12l.14,3.12ZM243.28,581.91l.71,4.02.38,2.44.37,3.51.26,2.49.34,2.47-.07,11.87.43-.24.26-4.43c.07-.23.51-1.21.51-1.45l-.05-3.59c-.08-.24-.34-1.19-.35-1.45l-.14-5.19-.3-2.46-.22-1.9-.34-3.02-3.61-17.53c-3.14-12.15-6.82-23.89-11.91-35.32l-5.46-12.27c-7.35-16.52-23.54-43.26-36.47-55.7-3.9-3.75-8.53-6.48-13.68-8.1-12.68-3.99-25.43-1.32-37.38,3.01l-2.03.74-2.05.76-5.78,2.68c.43.07,1.32.16,1.58.05l3.74-1.65,1.95-.74,1.75-.66,1.48-.57,4.67-1.33c7.12-2.03,14.29-2.76,21.69-2.27s13.63,2.78,19.28,7.23c5.88,4.63,10.63,9.93,15.08,15.99,6.55,8.93,12.17,18.04,17.57,27.66l1.79,3.2,5.78,11.89,2.67,5.55,3.44,8,1.79,4.44c4.05,10.07,7.43,20.11,9.8,30.65l2.53,11.21ZM270.76,458.33c.09-1.46-1.22-1.49-1.21-.03-.09,1.46,1.22,1.49,1.21.03ZM237.05,462.68c.05-2.1-1.6-3.84-3.7-3.9s-3.84,1.6-3.9,3.7,1.6,3.84,3.7,3.9,3.84-1.6,3.9-3.7ZM212.51,510.07c.41.05.95.22,1.14.23.24.08,1.65.25,1.96.2l-5.34-9.48-2.19-3.31c-.18-.27-1.49-.32-1.76-.47l-1.78-1,1.22.03,1.92.41-4.89-7.46-3.1-4.61-7.09-9.46-6.54-6.9c-5.7-6.01-12.99-10.46-21.44-10.48l-9.82-.02c-5.61.5-10.94,1.55-16.26,3.37l-2.39.82-8.33,3.37-6.97,3.17.45.56.87.66,1.29.27,4.76.36-1.06.82-1.35-.23-2.96-.46-1.59-.43-.36-.78-.3-.47-6.36,3.21-9.72,5.77-2.29,1.45c.2.09.74.31.95.24l.81-.3,1.7-.47,1.57-.44,1.33-.37c.58-.16,2.12-.35,2.71-.2l2.3.58,1.18.39-3.25-.06-1.25-.49-2.9.8-3.21.89c-.61.17-2.05.03-2.7-.02l-3.27,2.12-6.72,4.92,3.99.4.43,1.22,2.45.61,2.2.51,2.23.44,4.6.31.33.32-3.25.33-1.4-.04-2.59-.64-2.46-.61-2.3-.57-1-1.29-3.66-.35-5.09,3.84-3.27,2.47.22.25,4.07-.31c.45-.03,1.78.42,2.51.64.92.08.89.27,0,.42l-2.51-.39c-1.28-.2-2.3.57-4.48.07-.07-.02-.1-.08-.27-.33l-5.25,4.68c-.2.18.15,1.23.39,1.35l1.55.74c.54.26,1.94.26,2.51.11l2.03-.6c1.18-.35,2.82-.01,4.03.76l-2.18.03-1.18-.09-2.62.59c-1.16.26-3.33-.36-4.59-1.01l-1.33-.62-4.32,4.86-3.17,3.76,4.43.56,2.44-.61c.79-.43,1.36-.32.49.56l-2.39.52c-.8.18-2.68.08-3.52-.1l-1.48-.32c-.3-.07-1.02.51-1.22.77l-3.72,5.11c-2.93,4.03-5.16,8.29-5.95,13.03.46.29.28.81-.25,1.11l-.19,4.85,6.02.77-5.79.13.61,2.97,4.28-.39c1.03-.09,2.62-.04,3.66.1l3.44.46.29.49-4.84-.35-2.51-.07-4.25.32.6,1.33,2.58.47,2.48.71c.52.15,1.31,1.22,1.49,1.83l-1.86-1.12c-.41-.24-1.44-.73-1.89-.82l-2.71-.54,2.41,4.7c3.7,5.33,7.86,10.21,12.83,14.3l5.86,4.82,3.34,2.69,8.32,5.66,8.58,5.5-.27-2.2,2.54,2.76,3.44.41,1.19.14.27.29,2.42.24,1.16,2.23-2.17-1.74-1.85-.25c-.07,0-.15-.12-.26-.25l-3.82-.16,5.21,3.4,6.02,3.5,3.25,1.88,19.5,10.07,5.16,2.31,17.77,7.29,4.27,1.6,2.32.73,3.83.85.8-1.07c-1.11-.46-.44-.62.34-.51l.44,1.62,4.44.65.21-.9,1,.93,11.1,1.85,11.36,2.34,8.92,2.4,2.27-4.52c-.72-1.37-1.32-3.26-1.03-4.64.23-1.07,1.56-2.59,2.84-3.2,2.6-1.24,5.62-.39,7.92,1.38,1.95,1.51,3.01,4.31,2.65,6.71s-2.57,3.71-4.76,3.64l-1.68,2.43.36,1.14,6.08,3.62c.76.45,2.51,1.26,3.34,1.09l5.77-1.17c3.09-.63,7.32-3.89,9.48-7.45l-1.18-.28-2.18-.49-.35-.17-1.44-1.88-5.11-.23c-.1,0-.6-.22-.68-.27l-.43-.45-1.61,1.64s-1.21.45-1.57.37l-2.44-.56c-.71-.85-.34-.96.46-.38l3.2.11c.18-.5.61-1.64,1.06-1.57l1.36.22c.11.02.16.14.27.33l5.93.19,1.47,1.98.29.36,3.13.2,1.47-6.18c1.1-4.64.63-9.45.49-14.2l-1.18-.12-1.6.81c-.36.18-.97.65-1.28.55l-1.34-.46-1.14-.39-.29-.22-2.48-.59c-.61-.15-1.73-.52-2.2-.48l-2.61.25.35-.89c1.23-.1,2.93-.1,3.85.19l2.29.73,1.13.36.28.39,2.99-.09c.33-.01,1.29-.38,1.61-.48l1.57-.48-.7-4.96-.53-3.78-3.46-.5,3.42-.32-.46-2.6-1.21-5.9c-.17-.83-.47-2.36-1.14-2.61l-2.12-.8-3.03-2.05.59-.58c1.71,1.48,3.11,2.4,5.01,2.87l-2.22-8.76-.62-2.45c-.11-.45-.94-1.23-1.31-1.46l-2.31-1.43c-.07-.05-.15-.32-.2-.39l-1.36-1.69-3.71-.22-1.25-.99,2.27.39c.95.16,2.83.06,3.31.66l1.19,1.46c.09.18.12.3.2.34l2.59,1.45-3.84-11.8c-.13-.4-.73-1.46-.75-1.46l-1.98.67-1.31-.37,2.34-.51s.7-.92.76-1.01l-3.09-7.72-2.77-6.61-4.12-9.06-3.23-6.7-2.79-5.56c-.3.19-.87.55-1.16.45l-1.41-.49-1.11-.39-.27-.32-1.93-1.18c-.39-.24-1.62-.61-2.1-.77l-4.53-1.49c1.98-.4,6.47,1.2,7.22,1.77l1.76,1.34c.07.05.11.16.21.28ZM272.07,464.66c.06-2.15-1.64-3.93-3.79-3.99s-3.93,1.64-3.99,3.79,1.64,3.93,3.79,3.99,3.93-1.64,3.99-3.79ZM235.2,467.42l-1.08.61,1.08,1.91,1.08-.61-1.08-1.91ZM120.76,465.84l-2.57,1.45.42.75,2.57-1.45-.42-.75ZM241.58,474.68c.05-2.11-1.61-3.87-3.73-3.92s-3.87,1.61-3.92,3.73,1.61,3.87,3.73,3.92,3.87-1.61,3.92-3.73ZM270.69,477.04c.06-2.17-1.66-3.97-3.83-4.03s-3.97,1.66-4.03,3.83,1.66,3.97,3.83,4.03,3.97-1.66,4.03-3.83ZM240.49,478.97l-1.14.67,1.02,1.74,1.14-.67-1.02-1.74ZM267.34,483.24c.09-1.46-1.22-1.49-1.21-.03-.09,1.46,1.22,1.49,1.21.03ZM247.42,485.81c.05-2.09-1.6-3.83-3.69-3.89s-3.83,1.6-3.89,3.69,1.6,3.83,3.69,3.89,3.83-1.6,3.89-3.69ZM270.25,489.88c.06-2.19-1.67-4.01-3.87-4.07s-4.01,1.67-4.07,3.87,1.67,4.01,3.87,4.07,4.01-1.67,4.07-3.87ZM252.89,497.16c.05-2.08-1.59-3.8-3.66-3.86s-3.8,1.59-3.86,3.66,1.59,3.8,3.66,3.86,3.8-1.59,3.86-3.66ZM269.68,502.82c.06-2.27-1.74-4.16-4.01-4.22s-4.16,1.74-4.22,4.01,1.74,4.16,4.01,4.22,4.16-1.74,4.22-4.01ZM254.76,509.31c.05-2.07-1.58-3.78-3.64-3.84s-3.78,1.58-3.84,3.64,1.58,3.78,3.64,3.84,3.78-1.58,3.84-3.64ZM265.38,507.92c-1.6.55-1.25,1.9-.02,2.43l.02-2.43ZM268.78,516.13c.06-2.26-1.73-4.14-3.99-4.2s-4.14,1.73-4.2,3.99,1.73,4.14,3.99,4.2,4.14-1.73,4.2-3.99ZM251.51,515.6c.09-1.46-1.22-1.49-1.21-.03-.09,1.46,1.22,1.49,1.21.03ZM254.52,522.19c.05-2.06-1.57-3.77-3.64-3.83s-3.77,1.57-3.83,3.64,1.57,3.77,3.64,3.83,3.77-1.57,3.83-3.64ZM265.35,522.15c-.1-.48-1.42-.62-1.35-.14l.28,1.83,1.06-1.69ZM268.14,529.3c.06-2.27-1.73-4.16-4.01-4.22s-4.16,1.73-4.22,4.01,1.73,4.16,4.01,4.22,4.16-1.73,4.22-4.01ZM251.16,527.26l-1.11-.03-.09,3.33,1.11.03.09-3.33ZM253.7,535.88c.05-2.07-1.58-3.79-3.66-3.85s-3.79,1.58-3.85,3.66,1.58,3.79,3.66,3.85,3.79-1.58,3.85-3.66ZM267.69,542.34c.06-2.25-1.72-4.12-3.97-4.18s-4.12,1.72-4.18,3.97,1.72,4.12,3.97,4.18,4.12-1.72,4.18-3.97ZM249.16,542.2c.09-1.46-1.22-1.49-1.21-.03-.09,1.46,1.22,1.49,1.21.03ZM250.7,548.7c.05-2.11-1.61-3.86-3.72-3.92s-3.86,1.61-3.92,3.72,1.61,3.86,3.72,3.92,3.86-1.61,3.92-3.72ZM268.35,555.2c.06-2.3-1.75-4.21-4.05-4.27s-4.21,1.75-4.27,4.05,1.75,4.21,4.05,4.27,4.21-1.75,4.27-4.05ZM244.08,558.74c.52,1.24,0,2.58-1.95,2.91l.16,1.19c2.46-.7,3.34-2.78,2.82-4.68-.49-1.77-2.02-2.9-4.12-3.07l-1.13.59,1.74,5.74,2.06-1.37c.24-.75.46-1.4.44-1.32ZM269.91,568.62c.06-2.28-1.74-4.18-4.03-4.24s-4.18,1.74-4.24,4.03,1.74,4.18,4.03,4.24,4.18-1.74,4.24-4.03ZM266.38,574.78c-.35-.26-1.14-.8-1.2-.57l-.3,1.3c-.05.22.54.37,1.42.62l.08-1.35ZM269.48,581.88c.06-2.3-1.75-4.21-4.05-4.26s-4.21,1.75-4.26,4.05,1.75,4.21,4.05,4.26,4.21-1.75,4.26-4.05ZM264.79,588.59c-.16-1.08-1.26-1.23-1.46-.38l-.26,1.41,1.72-1.02ZM266.52,595.2c.06-2.32-1.77-4.25-4.1-4.31s-4.25,1.77-4.31,4.1,1.77,4.25,4.1,4.31,4.25-1.77,4.31-4.1ZM262.95,607.42c.06-2.36-1.81-4.33-4.17-4.39s-4.33,1.81-4.39,4.17,1.81,4.33,4.17,4.39,4.33-1.81,4.39-4.17ZM212.64,610.25l-.58-1.65c-.29-.81-1.8,1.04-.78,3.88.71-.89,1.52-1.77,1.36-2.23ZM217.38,615.45l3.39-4.21-.81-.5-2.44,2.03c-.06.42.07-.43.12-.8l2.42-1.98c-.11-.34-1.95-1.93-2.59-1.55-3.99,2.34-7.62,10.22-9.11,15.22-3.18,10.63-1.84,22.23,1.16,19.88.18-.14.41.2,1.03.86l2.57-2.17c-.45-.46-1.68-1.88-1.76-2.66-.72-7.3,1.77-18.85,6.02-24.11ZM185.79,758.85c14.53-17.26,32.69-50.04,39.69-71.03l3.71-11.12,4.66-19.36c1.78-7.39-.39-19.95-5.37-25.18l-2.67-2.81c-2.97-3.12-6.39-4.76-10.35-6.43l-2.36,9.81c3.03,2.12,3.51,5.02,2.74,7.98-.83,3.18-3.69,5.18-6.4,5.47-3.37.35-6.33-1.12-8.02-4.03-2.3-3.97-.28-8.67,3.46-10.7l2.55-10.73s-.59-.65-.79-.87l-20.14-4.63c-36.63-5.95-69.25-5.45-105.76.58-10.4,1.72-20.21,4.44-29.95,8.3-4.38,1.73-8.33,3.89-12.24,6.58-4.62,3.18-8.74,8.81-9.97,14.09-1.3,5.56-1.51,11.04-.39,16.75,2.16,11.06,5.56,21.47,9.92,31.8l2.63,6.22,4.03,8.61c10.89,23.29,28.49,47.5,46.56,66.21,8.59,8.9,18.03,16.51,29.04,22.09,6.36,3.22,13.23,3.62,19.98,1.89,4.87-1.25,9.62-3.11,13.47-6.39l10.78-9.19,7.45-7.59,13.73-16.31ZM256.61,618.18c.06-2.37-1.81-4.35-4.18-4.41s-4.35,1.81-4.41,4.18,1.81,4.35,4.18,4.41,4.35-1.81,4.41-4.18ZM242.67,631.27c2.69,1.65,5.54.16,6.33-1.7,1.15-2.71-.09-5.17-2.68-6.24-2.03-.83-4.87.35-5.22,2.78l1.58,5.17ZM234.07,634.33c1.86,1.01,4.36.38,5.5-1.21,1.24-1.73,1.2-3.95.14-5.38-.96-1.29-2.98-2.2-4.52-1.73-2.17.67-3.29,2.39-3.06,4.7.11,1.13,1.03,3.13,1.94,3.62ZM230.26,629.61c.05-.79-1.16-.8-1.44.13l1.78,2.16-.34-2.28ZM204.06,636.14c.32-.26.72-1.06,1.17-1.9l-1.29-.5-1.91,4.05,2.03-1.64ZM214.04,635.76c-.52.02-1.37.5-1.18.74l1.51,2.01-.33-2.75ZM205.79,644.14l-.5-2.91-.67-3.46-2.13,2.71c1.02,1.66,1.78,2.53,3.29,3.66ZM218.81,709.53l.76-1.66-.7-.2-.71,1.55-.84,1.86-2.66,5.25-.9,1.9-2.18,3.99-13.77,23.06-3.94,5.57-9.5,12.27-14.18,16.41-9.67,9.19c-4.3,4.09-9.25,7.22-14.69,9.51-10.09,4.26-20.51,3.38-29.92-2.28-7.3-4.4-13.89-9.04-20.16-15.07-17.56-16.89-32.76-35.66-44.29-56.85l-5.68-10.43-.98-1.68-5.31-11.34-.67-.41.44,1.7,5.47,11.75c9.62,20.66,22.66,39.11,37.66,56.15l10.05,10.63c8.09,8.56,25.15,21.48,36.42,22.85,7.37.9,15.15-.77,21.48-4.72,5.66-3.53,10.69-7.61,15.4-12.27l5.62-5.55,11.56-12.92c7.69-8.6,14.26-17.86,20.08-27.81l4.34-7.41,6.62-12.39.69-1.65,2-4.19.83-1.87.72-1.66.59-1.29Z"/>
    </g>
    <path id="area3" d="M111.58,749.01c-.04.07-.09.14-.16.2s-.13.11-.21.15c-.08.04-.15.06-.22.06-.05,0-.1,0-.15-.01-.05,0-.1-.01-.15-.01-.06,0-.1.02-.12.06-.02.04-.04.08-.06.12s-.04.08-.08.12c-.03.04-.1.06-.19.06-.06,0-.11,0-.18-.02-.06-.01-.12-.02-.19-.02-.13,0-.26.03-.38.08-.12.05-.25.08-.39.08-.12,0-.29-.02-.53-.06-.24-.04-.47-.1-.71-.18-.24-.08-.45-.18-.63-.29s-.27-.25-.27-.4c0-.12.07-.24.2-.36.14-.12.29-.26.45-.41s.32-.32.45-.5c.13-.19.2-.41.2-.65,0-.15-.03-.29-.09-.43s-.13-.27-.22-.39c-.09-.12-.19-.23-.31-.34-.11-.1-.22-.2-.33-.29-.03-.01-.09-.02-.16-.02-.19,0-.37.02-.56.06-.19.04-.37.06-.56.06-.1,0-.2-.01-.3-.04-.1-.03-.17-.1-.2-.21-.18.09-.36.18-.54.26-.18.08-.36.15-.55.21-.12.04-.2.07-.25.09-.05.02-.09.04-.11.07-.02.03-.04.07-.05.12-.01.06-.04.14-.08.24-.03.07-.04.13-.04.19v.19c0,.09-.02.16-.05.21-.03.05-.07.1-.11.15-.04.05-.07.09-.11.14s-.05.11-.05.19c0,.06.01.12.03.17v.05c-.01.1.02.19.07.24.06.06.12.1.2.14.08.03.16.06.25.09.09.03.17.06.24.1.07.04.14.11.2.2s.12.19.18.3c.05.11.09.21.13.32s.05.2.05.28v.05h-.14c-.28,0-.55.01-.83.04-.27.03-.55.05-.82.08-.27.03-.54.06-.82.08s-.55.04-.83.04c-.1,0-.24,0-.42-.01s-.37-.03-.55-.06c-.18-.03-.34-.08-.47-.16-.13-.07-.2-.18-.2-.32,0-.15.03-.27.1-.36s.15-.18.26-.24c.11-.07.23-.12.36-.17.14-.04.27-.09.41-.13.13-.04.26-.08.38-.12s.22-.1.31-.17.15-.18.21-.34c.06-.16.1-.32.14-.5.03-.18.07-.36.09-.53.03-.18.05-.32.07-.42,0-.03.01-.08.02-.13s0-.11.01-.16c0-.06,0-.11.01-.16s.01-.08.03-.1c.07-.12.12-.19.16-.21.04-.02.07-.04.08-.05s.03-.05.03-.11,0-.18,0-.37c0-.08.02-.15.05-.19.03-.04.07-.08.11-.12s.07-.07.11-.1c.03-.03.05-.07.05-.13,0-.1-.03-.18-.08-.26-.06-.08-.08-.17-.08-.26,0-.06.01-.1.04-.15.03-.04.06-.08.1-.12.04-.03.07-.07.1-.11.03-.04.04-.09.04-.14,0-.08-.02-.15-.05-.23-.03-.08-.05-.15-.05-.23,0-.06.02-.09.06-.12.04-.02.08-.04.12-.06.04-.01.09-.03.12-.04.04-.01.06-.03.06-.05-.02-.04-.06-.06-.11-.06-.08,0-.12.05-.12.14-.05-.03-.09-.07-.12-.12-.03-.04-.05-.09-.05-.15,0-.07.02-.13.05-.19.03-.06.07-.13.12-.2.04-.08.08-.16.12-.26.03-.1.05-.21.05-.35,0-.15-.02-.29-.06-.42-.04-.13-.06-.27-.06-.41,0-.07.02-.14.05-.21.03-.07.07-.14.11-.2l.13-.2c.04-.07.08-.14.1-.21.04-.13.06-.27.07-.42,0-.15,0-.29.01-.44,0-.15.01-.29.03-.43s.06-.28.13-.4c.06-.11.11-.2.15-.27s.07-.14.09-.2c.03-.07.05-.14.07-.22.02-.08.04-.18.06-.32.03-.2.09-.4.16-.58.07-.19.12-.38.15-.58.01-.15.02-.28.03-.39,0-.11.02-.2.05-.29.03-.08.09-.16.17-.22.08-.06.2-.12.37-.19.18-.06.36-.11.54-.13.18-.02.36-.04.54-.04.21,0,.42,0,.64.03.02.12.07.22.14.32.07.09.14.19.22.28.08.09.16.18.23.28.07.09.12.2.15.32.03.16.06.31.07.45.01.14.07.28.17.42.05.08.07.17.07.27,0,.16-.02.31-.06.46-.04.15-.06.29-.06.45,0,.09.03.24.08.45.06.21.12.43.2.67.08.24.15.47.22.7.07.23.12.4.16.53.06.26.1.53.1.81,0,.28.05.55.13.81.08.28.16.55.22.83s.1.56.12.85c.01.27.05.53.1.79.06.25.11.51.18.76.06.25.12.51.17.76.05.26.08.52.08.8,0,.1,0,.21-.03.32-.02.11-.06.21-.14.29.15.17.31.36.49.56s.37.36.55.48c.07.04.18.07.32.09.15.02.29.05.44.08.15.03.28.08.4.13.11.06.17.14.17.26,0,.08-.02.15-.06.22ZM107.29,743.18c0-.06-.02-.14-.07-.24-.05-.1-.1-.21-.16-.34-.06-.12-.11-.26-.16-.41-.05-.15-.07-.3-.07-.46,0-.19-.03-.37-.08-.56s-.09-.37-.11-.56c-.01-.15-.03-.32-.05-.5-.02-.18-.05-.36-.11-.52-.06-.16-.14-.3-.25-.41-.11-.11-.28-.16-.49-.16-.01.06-.04.1-.07.12-.03.02-.07.04-.12.06-.05.02-.09.03-.14.05-.05.01-.09.04-.11.07,0,.02.01.05.01.09,0,.12-.03.24-.08.35-.05.11-.1.22-.14.33-.05.12-.08.24-.1.37-.02.13-.03.25-.03.38,0,.11,0,.22.01.32,0,.1.01.21.01.31,0,.16-.01.3-.04.41-.03.12-.06.22-.09.32-.03.1-.07.19-.09.28-.03.09-.04.18-.04.28,0,.21,0,.39.02.54.01.15.04.28.09.38s.12.18.21.23c.09.05.21.08.37.08.11,0,.27-.01.48-.04.21-.03.42-.07.63-.14s.4-.15.55-.25c.16-.1.23-.23.23-.37ZM123.68,741.94c0,.14-.03.26-.08.35-.06.1-.12.19-.18.28-.07.09-.13.18-.2.26-.07.09-.11.2-.13.32-.06-.03-.13-.05-.19-.05s-.13-.01-.2-.01c-.17,0-.33.01-.49.04-.16.02-.32.04-.48.04-.19,0-.34-.06-.46-.17-.12-.11-.22-.25-.29-.42-.07-.17-.12-.35-.15-.54-.03-.19-.04-.36-.04-.51,0-.19.03-.39.09-.59-.06-.02-.1-.03-.15-.03-.09,0-.15.03-.19.08-.04.06-.09.08-.16.08-.06,0-.12-.02-.17-.07-.05-.04-.11-.07-.18-.07-.1,0-.23.03-.39.1-.16.07-.31.15-.45.26-.15.1-.27.22-.38.34-.11.12-.16.24-.16.35-.15.01-.28.05-.41.12s-.25.14-.37.21c-.09.06-.17.14-.23.26s-.12.24-.17.38c-.05.14-.1.27-.16.41s-.11.25-.18.34c-.12.15-.22.31-.31.46-.09.16-.13.33-.13.53,0,.24.04.49.11.74s.11.5.11.76c0,.17-.01.33-.04.5-.02.17-.04.33-.04.49,0,.19.03.35.1.47s.16.21.28.27c.12.07.25.11.41.13.15.02.31.03.47.03.17,0,.34,0,.5-.02s.31-.02.45-.02c.05.06.08.11.08.16,0,.05,0,.1,0,.15-.01.05-.02.1-.04.16-.02.05-.03.11-.03.18,0,.03,0,.06.02.1.1,0,.19-.02.27-.07s.13-.12.17-.23c.05.01.09.03.13.06.04.03.06.07.06.12,0,.04-.01.08-.03.12-.02.04-.04.07-.07.11-.03.03-.05.07-.07.11s-.03.08-.03.13c0,.03,0,.06.01.09,0,.03.02.06.03.08-.03.06-.08.09-.15.12-.06.02-.12.03-.19.03-.11,0-.2-.02-.28-.05-.07-.03-.14-.07-.2-.11-.06-.04-.11-.08-.16-.11-.05-.03-.11-.05-.18-.05-.03,0-.07,0-.12.02-.06.01-.11.03-.17.05-.06.02-.1.05-.15.08-.04.03-.06.06-.06.09,0,.06.02.1.06.15.04.04.06.09.06.15,0,.05-.02.09-.05.11-.03.03-.08.05-.12.06-.05.01-.1.02-.15.02-.05,0-.1,0-.13,0-.27,0-.54-.03-.81-.09-.27-.06-.54-.09-.81-.09-.12,0-.25.03-.37.08-.12.06-.26.08-.39.08-.08,0-.13-.02-.17-.05-.04-.03-.07-.07-.1-.11-.03-.04-.06-.08-.09-.11-.03-.03-.09-.05-.16-.05-.13,0-.26.01-.39.04s-.26.06-.38.09c-.13.03-.26.06-.38.08-.13.02-.26.04-.39.04-.07,0-.15,0-.25-.03s-.19-.05-.28-.09c-.09-.04-.17-.09-.23-.16-.06-.06-.09-.14-.09-.23,0-.06.03-.13.1-.22.07-.09.14-.18.22-.26.08-.09.17-.16.25-.22.08-.06.15-.09.19-.09.11,0,.22,0,.33.01s.22.01.34.01c.19,0,.38-.03.57-.09.19-.06.36-.14.52-.25.16-.11.28-.25.38-.42s.15-.35.15-.56c0-.09,0-.18-.02-.26-.01-.09-.02-.18-.02-.27,0-.18.02-.36.06-.54.04-.18.06-.36.06-.54,0-.24-.03-.49-.08-.74-.05-.25-.08-.51-.08-.76,0-.23,0-.46.02-.68.01-.23.02-.45.02-.68,0-.1,0-.26-.01-.46,0-.2-.03-.4-.07-.6-.04-.2-.1-.38-.18-.53-.08-.15-.19-.23-.33-.23-.15,0-.31.02-.46.05-.15.03-.31.05-.47.05-.12,0-.26,0-.42-.03-.16-.02-.31-.05-.46-.1-.15-.05-.27-.13-.37-.22-.1-.1-.16-.23-.16-.38,0-.17.02-.31.07-.42.05-.11.11-.19.19-.24.08-.06.17-.09.28-.11.11-.02.22-.03.35-.03.11,0,.23,0,.34.01.12,0,.23.01.34.01.22,0,.44-.01.66-.04.22-.02.44-.04.66-.04.15,0,.3,0,.46.02.15.01.3.05.45.09.13.04.23.12.29.23s.12.23.17.35c.05.12.11.22.18.32.07.09.18.14.33.14.07,0,.13-.02.19-.06.06-.04.12-.08.17-.13.06-.05.11-.09.17-.13s.12-.07.2-.08c.15-.02.29-.07.42-.15s.25-.15.38-.23.25-.15.38-.21c.13-.06.27-.09.42-.09.09,0,.2-.01.34-.03.14-.02.27-.05.41-.09.13-.04.26-.08.38-.14.12-.06.22-.12.29-.19.19.01.41.06.66.13.25.08.5.18.73.31.23.13.44.28.61.45s.27.37.3.58c.02.13.06.26.11.37.06.12.11.23.17.35.06.11.11.23.16.35.05.12.07.25.07.38ZM134.64,747.35c0,.19-.03.35-.09.48-.06.13-.14.25-.23.35-.09.1-.2.2-.32.29-.12.09-.24.19-.37.29-.1.08-.18.15-.26.19-.08.04-.15.08-.22.1-.07.03-.15.06-.23.08-.08.03-.17.07-.27.12-.14.07-.26.13-.35.19-.09.06-.19.11-.28.16-.09.05-.2.09-.31.12-.11.03-.25.06-.42.08-.28.03-.56.08-.84.12-.28.05-.56.07-.84.07-.06,0-.11-.01-.17-.04s-.13-.05-.2-.07c-.08-.03-.16-.05-.25-.07-.09-.02-.21-.04-.34-.04-.14,0-.25-.02-.33-.06s-.16-.09-.22-.15c-.07-.06-.13-.12-.2-.18s-.16-.12-.27-.17c-.42-.19-.77-.41-1.06-.68-.29-.26-.54-.56-.75-.88s-.38-.68-.52-1.06c-.14-.38-.26-.78-.35-1.2-.08-.29-.11-.58-.11-.87,0-.38.09-.73.27-1.06-.07-.19-.1-.38-.1-.56,0-.13.04-.33.11-.59s.18-.52.3-.78c.12-.26.25-.5.4-.71.14-.21.28-.34.4-.39.1-.03.16-.06.2-.09s.06-.09.06-.2c0-.08.03-.15.1-.21.07-.06.15-.1.24-.14.09-.03.19-.07.28-.09.09-.03.17-.06.23-.08.26-.12.5-.23.73-.32.23-.09.46-.16.7-.22s.47-.1.72-.13c.25-.03.52-.04.8-.04.15,0,.3.02.45.06s.29.1.42.16c.13.07.27.14.4.22.13.08.26.16.38.23h0c.1.01.2.04.3.09.09.04.19.07.3.09.1.12.22.23.38.34.15.11.31.22.46.34.15.12.28.24.38.38.11.14.16.29.16.46,0,.03,0,.06,0,.08,0,.03,0,.06-.02.09l.04-.05s.05.06.08.1c.03.05.05.1.07.16.02.06.04.12.05.18.01.06.03.11.03.14.06.09.13.16.22.22.09.06.17.13.22.23-.07.07-.1.16-.1.27,0,.12.02.23.07.35.05.12.07.23.07.35,0,.14,0,.27-.02.4-.01.13-.02.26-.02.4,0,.1-.04.18-.12.24-.08.06-.17.1-.26.15-.09.04-.18.08-.25.12-.08.04-.12.1-.12.18,0,.06-.03.08-.1.08-.07,0-.12,0-.16,0-.31,0-.61-.04-.91-.11s-.6-.12-.9-.12c-.33,0-.65.02-.97.07-.32.05-.64.07-.97.07-.24,0-.48,0-.72-.02-.24-.01-.48-.02-.72-.02-.06,0-.18.01-.35.04-.17.02-.35.06-.55.09-.19.04-.37.08-.55.14s-.29.1-.36.15c0,.03-.01.08-.01.15,0,.32.1.66.29,1.01.19.35.44.66.75.95.31.28.66.52,1.05.71.39.19.78.28,1.18.28.23,0,.46,0,.68.03.22.02.45.07.66.15.19-.09.36-.19.51-.31s.31-.24.45-.37c.15-.13.29-.27.43-.41.14-.14.28-.28.43-.42.03-.03.09-.05.2-.08.11-.02.22-.04.35-.06.12-.02.24-.03.36-.04.11-.01.19-.02.23-.02.16,0,.31.03.45.07.04.16.06.32.06.47ZM133.08,743.13c0-.1-.02-.2-.05-.3-.03-.1-.06-.2-.08-.3-.03-.19-.05-.38-.05-.57s-.03-.37-.08-.56h-.01s-.01.08-.04.12c-.03.04-.07.06-.11.06-.08,0-.16-.02-.24-.06s-.14-.09-.2-.16c-.26-.12-.5-.23-.71-.33-.21-.1-.42-.2-.63-.28-.21-.08-.44-.14-.68-.19-.24-.04-.51-.07-.83-.07-.03,0-.05,0-.08,0s-.05.02-.07.04l.05.11-.08.02c-.19.03-.34.07-.46.1-.12.03-.23.08-.33.13-.1.06-.19.12-.29.2-.09.08-.21.18-.36.31-.07.06-.14.11-.22.14-.08.03-.16.06-.24.08s-.16.05-.23.08c-.07.03-.13.07-.18.14-.05.17-.12.34-.21.5-.09.16-.14.33-.14.51,0,.1.04.2.13.28.09.08.2.15.33.2.13.06.28.1.45.15s.32.07.48.09c.16.02.31.04.44.05.13,0,.24.02.32.02.26,0,.52-.03.78-.08.26-.05.52-.08.78-.08s.54.01.81.04.54.04.81.04c.07,0,.17,0,.31-.01.14,0,.28-.03.41-.06s.25-.08.35-.14c.1-.06.15-.14.15-.23ZM147.48,747.71c0,.12-.02.23-.06.33-.04.1-.08.21-.12.32-.03.1-.05.18-.06.24,0,.06-.03.12-.05.16-.02.05-.05.09-.1.12-.05.04-.12.08-.21.13-.21.11-.43.22-.66.34-.23.11-.47.17-.7.17-.2,0-.39-.05-.57-.14-.18-.09-.34-.2-.49-.31-.15-.11-.28-.22-.41-.32-.12-.1-.22-.15-.31-.15-.09,0-.17.02-.23.07-.07.05-.13.1-.2.16-.07.06-.14.11-.22.16s-.18.07-.3.07c-.1,0-.2.02-.3.05-.1.03-.21.07-.31.12-.1.05-.21.09-.32.14-.11.05-.21.08-.3.11-.31.08-.62.13-.94.15-.32.01-.63.02-.95.02-.08,0-.21,0-.38,0-.17,0-.35-.02-.53-.05-.18-.03-.33-.08-.47-.15-.14-.07-.2-.17-.2-.29,0-.03,0-.05.01-.07-.05.06-.1.1-.17.14-.06.03-.13.05-.21.05-.11,0-.25-.08-.41-.23-.16-.15-.31-.33-.46-.53-.15-.2-.27-.4-.37-.6-.1-.2-.16-.34-.16-.44,0-.08.02-.15.07-.21.05-.06.07-.13.07-.21,0-.1-.01-.19-.04-.28-.03-.09-.04-.18-.04-.28,0-.12.02-.26.07-.4s.11-.28.18-.43c.07-.14.14-.28.22-.42.08-.13.15-.26.21-.38.07-.14.17-.25.29-.33s.26-.16.39-.22c.14-.06.28-.12.42-.19.14-.06.26-.15.36-.25.1.12.24.18.41.18s.34-.03.51-.08.34-.08.51-.08c.14,0,.27.01.4.04.13.03.26.04.4.04.15,0,.26-.02.34-.06.07-.04.16-.11.28-.2.11-.1.25-.17.42-.22.17-.05.35-.09.53-.12.18-.03.37-.06.55-.1.18-.03.35-.08.49-.15.15-.07.26-.16.35-.27s.14-.27.14-.47c0-.22-.06-.46-.19-.7-.13-.25-.29-.47-.49-.68-.2-.21-.42-.37-.66-.5-.24-.13-.47-.2-.7-.2-.03,0-.06,0-.08.01-.03,0-.05.01-.07.01-.17.03-.35.05-.56.06-.21,0-.4.04-.58.09-.18.05-.33.14-.46.26-.12.12-.19.3-.19.54,0,.14.01.28.04.41.02.14.04.27.04.41,0,.21-.05.38-.15.52-.1.14-.23.25-.38.33s-.33.14-.51.17c-.19.03-.37.05-.54.05-.21,0-.39-.03-.54-.08-.15-.06-.28-.18-.37-.38-.08-.15-.16-.3-.24-.47-.09-.17-.13-.34-.13-.51,0-.19.03-.36.1-.53.07-.16.14-.32.22-.48s.16-.31.24-.47c.08-.16.14-.32.17-.5.05-.03.12-.06.2-.08.09-.03.18-.06.28-.08s.2-.05.29-.08.17-.05.23-.07c.17-.05.33-.11.48-.17.16-.07.32-.13.48-.18s.33-.1.49-.15c.16-.04.33-.07.5-.07h.32c.3-.01.6.02.91.07.31.05.62.13.91.24.3.11.58.25.85.41.27.16.5.36.71.58.15.17.28.36.38.59.1.23.18.46.24.71s.1.5.12.75.04.49.04.7c0,.29,0,.58-.03.86-.02.28-.03.57-.03.86s.02.55.05.83.07.55.11.82.08.55.11.82c.03.27.05.55.05.82.01.17.04.27.07.31s.06.06.1.06c.15,0,.28-.05.37-.14.09-.09.18-.2.25-.31.08-.11.16-.22.25-.32.09-.1.2-.15.34-.15.06,0,.13,0,.19.01.07,0,.13.02.18.05.06.02.1.06.13.1.03.04.05.11.05.18ZM144.07,745.12s0-.11,0-.22c0-.1-.01-.21-.03-.32-.01-.11-.04-.2-.07-.29-.03-.08-.08-.12-.14-.12-.01,0-.03,0-.05.02-.02.01-.04.02-.05.02-.26.15-.49.26-.68.36-.19.09-.37.17-.56.23s-.38.1-.59.12c-.21.02-.47.03-.78.03-.04,0-.16.02-.34.05-.19.03-.39.07-.61.12-.22.05-.43.09-.62.14-.19.04-.32.07-.36.09-.09.03-.15.07-.19.1-.04.03-.07.07-.09.11-.02.04-.04.09-.06.13-.02.05-.06.09-.11.14-.07.06-.14.1-.22.14-.08.03-.15.09-.22.16-.1.1-.2.24-.29.41s-.13.33-.13.48c0,.19.05.35.15.5.1.15.23.27.38.37.16.1.34.19.54.27s.4.14.61.18c.2.04.4.07.59.09.19.02.35.03.49.03.17,0,.36-.01.59-.04.23-.02.46-.06.69-.11.23-.05.44-.12.65-.21.2-.09.36-.21.48-.34.05-.06.08-.11.1-.15.02-.05.04-.09.07-.14.02-.04.05-.09.08-.14.03-.05.08-.1.15-.16.16-.13.28-.28.37-.44.09-.16.15-.32.19-.5.04-.17.07-.35.07-.54,0-.19.01-.38.01-.57ZM164.75,745.32c0,.23,0,.39-.02.48s-.04.16-.09.2c-.05.04-.11.08-.19.11-.08.03-.19.1-.33.2.15.19.22.4.22.62,0,.24-.07.46-.21.66s-.31.37-.5.5c-.18.12-.32.28-.41.46-.09.18-.19.37-.28.57-.28,0-.53.06-.75.17-.23.1-.44.24-.66.4-.11.08-.22.13-.33.16-.11.03-.23.04-.35.04s-.25,0-.38-.02c-.13-.01-.26-.02-.38-.02-.22,0-.44.03-.66.1-.22.07-.44.1-.66.1-.11,0-.25-.02-.43-.05s-.35-.07-.53-.11c-.18-.05-.35-.1-.53-.15-.17-.06-.31-.11-.41-.16-.21-.1-.41-.22-.6-.37-.18-.15-.38-.28-.59-.37-.1-.26-.22-.5-.36-.73-.14-.23-.32-.43-.54-.6.05-.1.08-.21.1-.32s.03-.22.03-.34c0-.2-.02-.4-.06-.61-.04-.21-.06-.41-.06-.61,0-.35.09-.66.28-.95h.09c.12,0,.23-.01.34-.06.11-.04.22-.07.34-.07.17,0,.34.03.5.08.16.06.3.13.43.23.12.1.22.23.29.37.07.15.11.32.11.5,0,.06,0,.15-.02.26-.01.11-.04.23-.08.34-.04.11-.09.21-.15.29-.06.08-.14.12-.23.12-.06,0-.11-.02-.16-.05-.05-.03-.09-.07-.12-.11,0,.08,0,.2.02.35.01.15.04.3.08.45.04.15.09.28.16.39.07.11.16.16.27.16h.26s.07-.01.07-.01c.21,0,.43.02.66.07s.46.07.7.07c.19,0,.38.01.57.04.19.03.38.04.57.04.26,0,.5-.03.72-.1s.43-.16.62-.29c.19-.12.38-.26.56-.41.18-.15.35-.31.53-.48.08-.08.11-.15.11-.22,0-.03,0-.07-.01-.1s0-.07,0-.1c0-.09.04-.19.12-.29.08-.1.17-.22.27-.35s.19-.28.27-.44c.08-.16.12-.34.12-.54,0-.16-.02-.32-.07-.47-.05-.16-.07-.32-.07-.49,0-.14-.03-.26-.1-.37s-.14-.22-.22-.33-.15-.22-.22-.33c-.07-.11-.1-.23-.1-.36v-.08s0-.06.02-.09c-.17-.04-.36-.1-.58-.19s-.44-.17-.65-.25-.42-.16-.62-.22c-.19-.07-.34-.1-.45-.1-.26,0-.52.03-.78.08s-.52.08-.78.08c0-.03.03-.05.08-.08.05-.02.11-.05.18-.08.07-.03.13-.06.19-.1.06-.03.08-.08.08-.12,0-.06-.05-.1-.14-.15s-.16-.06-.2-.06c-.08,0-.15.02-.21.05-.06.03-.12.07-.19.11-.06.04-.13.08-.19.11-.07.03-.13.05-.2.05-.06,0-.11-.02-.16-.05-.05-.03-.09-.07-.12-.12v.1c0,.12.03.21.1.26.07.06.16.08.28.08h.06c-.08.13-.17.24-.27.34-.1.09-.23.14-.4.14-.12,0-.23,0-.34-.02-.11,0-.22-.02-.34-.02.03-.26.11-.53.24-.82.14-.29.3-.56.5-.83.2-.27.41-.52.63-.75s.44-.42.64-.58c.08-.06.14-.11.2-.14s.11-.06.15-.1.09-.08.13-.13c.04-.05.08-.13.12-.22.06-.14.14-.26.23-.37s.19-.21.29-.31.2-.2.3-.31c.1-.1.19-.22.26-.34.09-.04.18-.08.28-.11.1-.03.19-.07.29-.11s.18-.09.26-.15c.08-.06.15-.13.2-.23,0-.25-.1-.42-.28-.5s-.38-.12-.59-.12c-.16,0-.31.03-.45.09-.14.06-.29.09-.45.09-.11,0-.21-.02-.31-.07-.1-.05-.2-.07-.31-.07-.07,0-.13.02-.17.05-.05.03-.1.05-.16.05-.06,0-.1,0-.15-.03-.04-.02-.09-.03-.15-.03l-.06.05s-.03.06-.08.06c-.05,0-.11.01-.18.01-.1,0-.2,0-.3-.02-.1-.01-.17-.02-.21-.02-.24,0-.44.09-.6.26-.16.17-.23.37-.23.61,0,.12,0,.23.03.34.02.11.03.23.03.34,0,.1-.02.2-.06.32-.04.11-.09.22-.16.31-.07.09-.15.17-.24.23-.09.06-.2.09-.31.09-.12,0-.24-.03-.36-.09-.12-.06-.22-.12-.32-.19v-.05c0-.07.02-.13.05-.19s.07-.12.1-.18c.04-.06.07-.12.1-.18s.05-.12.05-.19c0-.08-.03-.14-.08-.2-.05-.06-.08-.12-.08-.2,0-.1.02-.19.06-.28s.06-.18.06-.28c0-.13-.02-.26-.07-.37s-.07-.24-.07-.36c0-.04.02-.11.07-.21.05-.1.11-.2.18-.3.07-.1.14-.19.21-.27.07-.08.12-.11.17-.11.07,0,.13,0,.2.03.06.02.13.03.2.03.19,0,.38-.02.57-.06s.39-.06.59-.06c.16,0,.32,0,.48,0,.16,0,.32.01.48.01.35,0,.68-.03,1.01-.1s.66-.1,1-.1c.11,0,.22,0,.33.02s.22.02.33.02c.25,0,.5-.02.75-.06s.5-.06.75-.06c.12,0,.25.01.37.03.12.02.24.06.35.12h0c-.03.07-.04.15-.04.24,0,.06.01.12.04.17s.05.09.08.13c.03.04.05.08.08.12s.04.09.04.14c0,.06-.05.15-.14.3-.09.14-.2.3-.33.47-.12.17-.24.34-.36.5s-.19.3-.23.39c-.03.08-.09.15-.15.2-.07.05-.14.09-.22.12-.08.03-.16.06-.24.09-.08.03-.16.07-.23.12-.1.07-.21.18-.34.33-.13.15-.26.32-.37.49s-.22.35-.3.53c-.08.18-.12.32-.12.44,0,.07.04.14.11.22.08.08.17.16.27.23.1.08.21.15.31.22.1.07.18.13.24.18.07.07.14.11.21.12.07.01.15.02.22.03.07,0,.14.02.21.04.07.02.14.07.2.15.06.07.12.13.19.19s.14.12.21.18c.07.06.12.13.17.2s.07.16.07.26h.45v.3c.18.12.29.22.33.3.04.08.06.15.06.22v.07c0,.06.02.11.05.15.15.15.26.3.33.44.07.14.11.28.14.42.02.14.04.29.06.44.02.15.06.32.12.51.04.12.07.25.1.37s.04.25.04.37ZM158.79,735.65s-.02-.08-.05-.11-.07-.05-.11-.05c-.07,0-.11.04-.13.12-.02.08-.03.14-.03.19l.02-.04s.01.02.01.03c0,0,0,.01-.02.01.06,0,.12,0,.19-.03.07-.02.11-.06.11-.13Z"/>
    <path id="area2" d="M111.4,706.97c-.04.07-.09.14-.16.2s-.13.11-.21.15c-.08.04-.15.06-.22.06-.05,0-.1,0-.15-.01-.05,0-.1-.01-.15-.01-.06,0-.1.02-.12.06-.02.04-.04.08-.06.12s-.04.08-.08.12c-.03.04-.1.06-.19.06-.06,0-.11,0-.18-.02-.06-.01-.12-.02-.19-.02-.13,0-.26.03-.38.08-.12.05-.25.08-.39.08-.12,0-.29-.02-.53-.06-.24-.04-.47-.1-.71-.18-.24-.08-.45-.18-.63-.29s-.27-.25-.27-.4c0-.12.07-.24.2-.36.14-.12.29-.26.45-.41s.32-.32.45-.5c.13-.19.2-.41.2-.65,0-.15-.03-.29-.09-.43s-.13-.27-.22-.39c-.09-.12-.19-.23-.31-.34-.11-.1-.22-.2-.33-.29-.03-.01-.09-.02-.16-.02-.19,0-.37.02-.56.06-.19.04-.37.06-.56.06-.1,0-.2-.01-.3-.04-.1-.03-.17-.1-.2-.21-.18.09-.36.18-.54.26-.18.08-.36.15-.55.21-.12.04-.2.07-.25.09-.05.02-.09.04-.11.07-.02.03-.04.07-.05.12-.01.06-.04.14-.08.24-.03.07-.04.13-.04.19v.19c0,.09-.02.16-.05.21-.03.05-.07.1-.11.15-.04.05-.07.09-.11.14s-.05.11-.05.19c0,.06.01.12.03.17v.05c-.01.1.02.19.07.24.06.06.12.1.2.14.08.03.16.06.25.09.09.03.17.06.24.1.07.04.14.11.2.2s.12.19.18.3c.05.11.09.21.13.32s.05.2.05.28v.05h-.14c-.28,0-.55.01-.83.04-.27.03-.55.05-.82.08-.27.03-.54.06-.82.08s-.55.04-.83.04c-.1,0-.24,0-.42-.01s-.37-.03-.55-.06c-.18-.03-.34-.08-.47-.16-.13-.07-.2-.18-.2-.32,0-.15.03-.27.1-.36s.15-.18.26-.24c.11-.07.23-.12.36-.17.14-.04.27-.09.41-.13.13-.04.26-.08.38-.12s.22-.1.31-.17.15-.18.21-.34c.06-.16.1-.32.14-.5.03-.18.07-.36.09-.53.03-.18.05-.32.07-.42,0-.03.01-.08.02-.13s0-.11.01-.16c0-.06,0-.11.01-.16s.01-.08.03-.1c.07-.12.12-.19.16-.21.04-.02.07-.04.08-.05s.03-.05.03-.11,0-.18,0-.37c0-.08.02-.15.05-.19.03-.04.07-.08.11-.12s.07-.07.11-.1c.03-.03.05-.07.05-.13,0-.1-.03-.18-.08-.26-.06-.08-.08-.17-.08-.26,0-.06.01-.1.04-.15.03-.04.06-.08.1-.12.04-.03.07-.07.1-.11.03-.04.04-.09.04-.14,0-.08-.02-.15-.05-.23-.03-.08-.05-.15-.05-.23,0-.06.02-.09.06-.12.04-.02.08-.04.12-.06.04-.01.09-.03.12-.04.04-.01.06-.03.06-.05-.02-.04-.06-.06-.11-.06-.08,0-.12.05-.12.14-.05-.03-.09-.07-.12-.12-.03-.04-.05-.09-.05-.15,0-.07.02-.13.05-.19.03-.06.07-.13.12-.2.04-.08.08-.16.12-.26.03-.1.05-.21.05-.35,0-.15-.02-.29-.06-.42-.04-.13-.06-.27-.06-.41,0-.07.02-.14.05-.21.03-.07.07-.14.11-.2l.13-.2c.04-.07.08-.14.1-.21.04-.13.06-.27.07-.42,0-.15,0-.29.01-.44,0-.15.01-.29.03-.43s.06-.28.13-.4c.06-.11.11-.2.15-.27s.07-.14.09-.2c.03-.07.05-.14.07-.22.02-.08.04-.18.06-.32.03-.2.09-.4.16-.58.07-.19.12-.38.15-.58.01-.15.02-.28.03-.39,0-.11.02-.2.05-.29.03-.08.09-.16.17-.22.08-.06.2-.12.37-.19.18-.06.36-.11.54-.13.18-.02.36-.04.54-.04.21,0,.42,0,.64.03.02.12.07.22.14.32.07.09.14.19.22.28.08.09.16.18.23.28.07.09.12.2.15.32.03.16.06.31.07.45.01.14.07.28.17.42.05.08.07.17.07.27,0,.16-.02.31-.06.46-.04.15-.06.29-.06.45,0,.09.03.24.08.45.06.21.12.43.2.67.08.24.15.47.22.7.07.23.12.4.16.53.06.26.1.53.1.81,0,.28.05.55.13.81.08.28.16.55.22.83s.1.56.12.85c.01.27.05.53.1.79.06.25.11.51.18.76.06.25.12.51.17.76.05.26.08.52.08.8,0,.1,0,.21-.03.32-.02.11-.06.21-.14.29.15.17.31.36.49.56s.37.36.55.48c.07.04.18.07.32.09.15.02.29.05.44.08.15.03.28.08.4.13.11.06.17.14.17.26,0,.08-.02.15-.06.22ZM107.11,701.15c0-.06-.02-.14-.07-.24-.05-.1-.1-.21-.16-.34-.06-.12-.11-.26-.16-.41-.05-.15-.07-.3-.07-.46,0-.19-.03-.37-.08-.56s-.09-.37-.11-.56c-.01-.15-.03-.32-.05-.5-.02-.18-.05-.36-.11-.52-.06-.16-.14-.3-.25-.41-.11-.11-.28-.16-.49-.16-.01.06-.04.1-.07.12-.03.02-.07.04-.12.06-.05.02-.09.03-.14.05-.05.01-.09.04-.11.07,0,.02.01.05.01.09,0,.12-.03.24-.08.35-.05.11-.1.22-.14.33-.05.12-.08.24-.1.37-.02.13-.03.25-.03.38,0,.11,0,.22.01.32,0,.1.01.21.01.31,0,.16-.01.3-.04.41-.03.12-.06.22-.09.32-.03.1-.07.19-.09.28-.03.09-.04.18-.04.28,0,.21,0,.39.02.54.01.15.04.28.09.38s.12.18.21.23c.09.05.21.08.37.08.11,0,.27-.01.48-.04.21-.03.42-.07.63-.14s.4-.15.55-.25c.16-.1.23-.23.23-.37ZM123.5,699.9c0,.14-.03.26-.08.35-.06.1-.12.19-.18.28-.07.09-.13.18-.2.26-.07.09-.11.2-.13.32-.06-.03-.13-.05-.19-.05s-.13-.01-.2-.01c-.17,0-.33.01-.49.04-.16.02-.32.04-.48.04-.19,0-.34-.06-.46-.17-.12-.11-.22-.25-.29-.42-.07-.17-.12-.35-.15-.54-.03-.19-.04-.36-.04-.51,0-.19.03-.39.09-.59-.06-.02-.1-.03-.15-.03-.09,0-.15.03-.19.08-.04.06-.09.08-.16.08-.06,0-.12-.02-.17-.07-.05-.04-.11-.07-.18-.07-.1,0-.23.03-.39.1-.16.07-.31.15-.45.26-.15.1-.27.22-.38.34-.11.12-.16.24-.16.35-.15.01-.28.05-.41.12s-.25.14-.37.21c-.09.06-.17.14-.23.26s-.12.24-.17.38c-.05.14-.1.27-.16.41s-.11.25-.18.34c-.12.15-.22.31-.31.46-.09.16-.13.33-.13.53,0,.24.04.49.11.74s.11.5.11.76c0,.17-.01.33-.04.5-.02.17-.04.33-.04.49,0,.19.03.35.1.47s.16.21.28.27c.12.07.25.11.41.13.15.02.31.03.47.03.17,0,.34,0,.5-.02s.31-.02.45-.02c.05.06.08.11.08.16,0,.05,0,.1,0,.15-.01.05-.02.1-.04.16-.02.05-.03.11-.03.18,0,.03,0,.06.02.1.1,0,.19-.02.27-.07s.13-.12.17-.23c.05.01.09.03.13.06.04.03.06.07.06.12,0,.04-.01.08-.03.12-.02.04-.04.07-.07.11-.03.03-.05.07-.07.11s-.03.08-.03.13c0,.03,0,.06.01.09,0,.03.02.06.03.08-.03.06-.08.09-.15.12-.06.02-.12.03-.19.03-.11,0-.2-.02-.28-.05-.07-.03-.14-.07-.2-.11-.06-.04-.11-.08-.16-.11-.05-.03-.11-.05-.18-.05-.03,0-.07,0-.12.02-.06.01-.11.03-.17.05-.06.02-.1.05-.15.08-.04.03-.06.06-.06.09,0,.06.02.1.06.15.04.04.06.09.06.15,0,.05-.02.09-.05.11-.03.03-.08.05-.12.06-.05.01-.1.02-.15.02-.05,0-.1,0-.13,0-.27,0-.54-.03-.81-.09-.27-.06-.54-.09-.81-.09-.12,0-.25.03-.37.08-.12.06-.26.08-.39.08-.08,0-.13-.02-.17-.05-.04-.03-.07-.07-.1-.11-.03-.04-.06-.08-.09-.11-.03-.03-.09-.05-.16-.05-.13,0-.26.01-.39.04s-.26.06-.38.09c-.13.03-.26.06-.38.08-.13.02-.26.04-.39.04-.07,0-.15,0-.25-.03s-.19-.05-.28-.09c-.09-.04-.17-.09-.23-.16-.06-.06-.09-.14-.09-.23,0-.06.03-.13.1-.22.07-.09.14-.18.22-.26.08-.09.17-.16.25-.22.08-.06.15-.09.19-.09.11,0,.22,0,.33.01s.22.01.34.01c.19,0,.38-.03.57-.09.19-.06.36-.14.52-.25.16-.11.28-.25.38-.42s.15-.35.15-.56c0-.09,0-.18-.02-.26-.01-.09-.02-.18-.02-.27,0-.18.02-.36.06-.54.04-.18.06-.36.06-.54,0-.24-.03-.49-.08-.74-.05-.25-.08-.51-.08-.76,0-.23,0-.46.02-.68.01-.23.02-.45.02-.68,0-.1,0-.26-.01-.46,0-.2-.03-.4-.07-.6-.04-.2-.1-.38-.18-.53-.08-.15-.19-.23-.33-.23-.15,0-.31.02-.46.05-.15.03-.31.05-.47.05-.12,0-.26,0-.42-.03-.16-.02-.31-.05-.46-.1-.15-.05-.27-.13-.37-.22-.1-.1-.16-.23-.16-.38,0-.17.02-.31.07-.42.05-.11.11-.19.19-.24.08-.06.17-.09.28-.11.11-.02.22-.03.35-.03.11,0,.23,0,.34.01.12,0,.23.01.34.01.22,0,.44-.01.66-.04.22-.02.44-.04.66-.04.15,0,.3,0,.46.02.15.01.3.05.45.09.13.04.23.12.29.23s.12.23.17.35c.05.12.11.22.18.32.07.09.18.14.33.14.07,0,.13-.02.19-.06.06-.04.12-.08.17-.13.06-.05.11-.09.17-.13s.12-.07.2-.08c.15-.02.29-.07.42-.15s.25-.15.38-.23.25-.15.38-.21c.13-.06.27-.09.42-.09.09,0,.2-.01.34-.03.14-.02.27-.05.41-.09.13-.04.26-.08.38-.14.12-.06.22-.12.29-.19.19.01.41.06.66.13.25.08.5.18.73.31.23.13.44.28.61.45s.27.37.3.58c.02.13.06.26.11.37.06.12.11.23.17.35.06.11.11.23.16.35.05.12.07.25.07.38ZM134.46,705.31c0,.19-.03.35-.09.48-.06.13-.14.25-.23.35-.09.1-.2.2-.32.29-.12.09-.24.19-.37.29-.1.08-.18.15-.26.19-.08.04-.15.08-.22.1-.07.03-.15.06-.23.08-.08.03-.17.07-.27.12-.14.07-.26.13-.35.19-.09.06-.19.11-.28.16-.09.05-.2.09-.31.12-.11.03-.25.06-.42.08-.28.03-.56.08-.84.12-.28.05-.56.07-.84.07-.06,0-.11-.01-.17-.04s-.13-.05-.2-.07c-.08-.03-.16-.05-.25-.07-.09-.02-.21-.04-.34-.04-.14,0-.25-.02-.33-.06s-.16-.09-.22-.15c-.07-.06-.13-.12-.2-.18s-.16-.12-.27-.17c-.42-.19-.77-.41-1.06-.68-.29-.26-.54-.56-.75-.88s-.38-.68-.52-1.06c-.14-.38-.26-.78-.35-1.2-.08-.29-.11-.58-.11-.87,0-.38.09-.73.27-1.06-.07-.19-.1-.38-.1-.56,0-.13.04-.33.11-.59s.18-.52.3-.78c.12-.26.25-.5.4-.71.14-.21.28-.34.4-.39.1-.03.16-.06.2-.09s.06-.09.06-.2c0-.08.03-.15.1-.21.07-.06.15-.1.24-.14.09-.03.19-.07.28-.09.09-.03.17-.06.23-.08.26-.12.5-.23.73-.32.23-.09.46-.16.7-.22s.47-.1.72-.13c.25-.03.52-.04.8-.04.15,0,.3.02.45.06s.29.1.42.16c.13.07.27.14.4.22.13.08.26.16.38.23h0c.1.01.2.04.3.09.09.04.19.07.3.09.1.12.22.23.38.34.15.11.31.22.46.34s.28.24.38.38c.11.14.16.29.16.46,0,.03,0,.06,0,.08,0,.03,0,.06-.02.09l.04-.05s.05.06.08.1c.03.05.05.1.07.16.02.06.04.12.05.18.01.06.03.11.03.14.06.09.13.16.22.22.09.06.17.13.22.23-.07.07-.1.16-.1.27,0,.12.02.23.07.35.05.12.07.23.07.35,0,.14,0,.27-.02.4-.01.13-.02.26-.02.4,0,.1-.04.18-.12.24-.08.06-.17.1-.26.15-.09.04-.18.08-.25.12-.08.04-.12.1-.12.18,0,.06-.03.08-.1.08-.07,0-.12,0-.16,0-.31,0-.61-.04-.91-.11s-.6-.12-.9-.12c-.33,0-.65.02-.97.07-.32.05-.64.07-.97.07-.24,0-.48,0-.72-.02-.24-.01-.48-.02-.72-.02-.06,0-.18.01-.35.04-.17.02-.35.06-.55.09-.19.04-.37.08-.55.14s-.29.1-.36.15c0,.03-.01.08-.01.15,0,.32.1.66.29,1.01.19.35.44.66.75.95.31.28.66.52,1.05.71.39.19.78.28,1.18.28.23,0,.46,0,.68.03.22.02.45.07.66.15.19-.09.36-.19.51-.31s.31-.24.45-.37c.15-.13.29-.27.43-.41.14-.14.28-.28.43-.42.03-.03.09-.05.2-.08.11-.02.22-.04.35-.06.12-.02.24-.03.36-.04.11-.01.19-.02.23-.02.16,0,.31.03.45.07.04.16.06.32.06.47ZM132.9,701.09c0-.1-.02-.2-.05-.3-.03-.1-.06-.2-.08-.3-.03-.19-.05-.38-.05-.57s-.03-.37-.08-.56h-.01s-.01.08-.04.12c-.03.04-.07.06-.11.06-.08,0-.16-.02-.24-.06s-.14-.09-.2-.16c-.26-.12-.5-.23-.71-.33-.21-.1-.42-.2-.63-.28-.21-.08-.44-.14-.68-.19-.24-.04-.51-.07-.83-.07-.03,0-.05,0-.08,0s-.05.02-.07.04l.05.11-.08.02c-.19.03-.34.07-.46.1-.12.03-.23.08-.33.13-.1.06-.19.12-.29.2-.09.08-.21.18-.36.31-.07.06-.14.11-.22.14-.08.03-.16.06-.24.08s-.16.05-.23.08c-.07.03-.13.07-.18.14-.05.17-.12.34-.21.5-.09.16-.14.33-.14.51,0,.1.04.2.13.28.09.08.2.15.33.2.13.06.28.1.45.15s.32.07.48.09c.16.02.31.04.44.05.13,0,.24.02.32.02.26,0,.52-.03.78-.08.26-.05.52-.08.78-.08s.54.01.81.04.54.04.81.04c.07,0,.17,0,.31-.01.14,0,.28-.03.41-.06s.25-.08.35-.14c.1-.06.15-.14.15-.23ZM147.3,705.67c0,.12-.02.23-.06.33-.04.1-.08.21-.12.32-.03.1-.05.18-.06.24,0,.06-.03.12-.05.16-.02.05-.05.09-.1.12-.05.04-.12.08-.21.13-.21.11-.43.22-.66.34-.23.11-.47.17-.7.17-.2,0-.39-.05-.57-.14-.18-.09-.34-.2-.49-.31-.15-.11-.28-.22-.41-.32-.12-.1-.22-.15-.31-.15-.09,0-.17.02-.23.07-.07.05-.13.1-.2.16-.07.06-.14.11-.22.16s-.18.07-.3.07c-.1,0-.2.02-.3.05-.1.03-.21.07-.31.12-.1.05-.21.09-.32.14-.11.05-.21.08-.3.11-.31.08-.62.13-.94.15-.32.01-.63.02-.95.02-.08,0-.21,0-.38,0-.17,0-.35-.02-.53-.05-.18-.03-.33-.08-.47-.15-.14-.07-.2-.17-.2-.29,0-.03,0-.05.01-.07-.05.06-.1.1-.17.14-.06.03-.13.05-.21.05-.11,0-.25-.08-.41-.23-.16-.15-.31-.33-.46-.53-.15-.2-.27-.4-.37-.6-.1-.2-.16-.34-.16-.44,0-.08.02-.15.07-.21.05-.06.07-.13.07-.21,0-.1-.01-.19-.04-.28-.03-.09-.04-.18-.04-.28,0-.12.02-.26.07-.4s.11-.28.18-.43c.07-.14.14-.28.22-.42.08-.13.15-.26.21-.38.07-.14.17-.25.29-.33s.26-.16.39-.22c.14-.06.28-.12.42-.19.14-.06.26-.15.36-.25.1.12.24.18.41.18s.34-.03.51-.08.34-.08.51-.08c.14,0,.27.01.4.04.13.03.26.04.4.04.15,0,.26-.02.34-.06.07-.04.16-.11.28-.2.11-.1.25-.17.42-.22.17-.05.35-.09.53-.12.18-.03.37-.06.55-.1.18-.03.35-.08.49-.15.15-.07.26-.16.35-.27s.14-.27.14-.47c0-.22-.06-.46-.19-.7-.13-.25-.29-.47-.49-.68-.2-.21-.42-.37-.66-.5-.24-.13-.47-.2-.7-.2-.03,0-.06,0-.08.01-.03,0-.05.01-.07.01-.17.03-.35.05-.56.06-.21,0-.4.04-.58.09-.18.05-.33.14-.46.26-.12.12-.19.3-.19.54,0,.14.01.28.04.41.02.14.04.27.04.41,0,.21-.05.38-.15.52-.1.14-.23.25-.38.33s-.33.14-.51.17c-.19.03-.37.05-.54.05-.21,0-.39-.03-.54-.08-.15-.06-.28-.18-.37-.38-.08-.15-.16-.3-.24-.47-.09-.17-.13-.34-.13-.51,0-.19.03-.36.1-.53.07-.16.14-.32.22-.48s.16-.31.24-.47c.08-.16.14-.32.17-.5.05-.03.12-.06.2-.08.09-.03.18-.06.28-.08s.2-.05.29-.08.17-.05.23-.07c.17-.05.33-.11.48-.17.16-.07.32-.13.48-.18s.33-.1.49-.15c.16-.04.33-.07.5-.07h.32c.3-.01.6.02.91.07.31.05.62.13.91.24.3.11.58.25.85.41.27.16.5.36.71.58.15.17.28.36.38.59.1.23.18.46.24.71s.1.5.12.75.04.49.04.7c0,.29,0,.58-.03.86-.02.28-.03.57-.03.86s.02.55.05.83.07.55.11.82.08.55.11.82c.03.27.05.55.05.82.01.17.04.27.07.31s.06.06.1.06c.15,0,.28-.05.37-.14.09-.09.18-.2.25-.31.08-.11.16-.22.25-.32.09-.1.2-.15.34-.15.06,0,.13,0,.19.01.07,0,.13.02.18.05.06.02.1.06.13.1.03.04.05.11.05.18ZM143.89,703.08s0-.11,0-.22c0-.1-.01-.21-.03-.32-.01-.11-.04-.2-.07-.29-.03-.08-.08-.12-.14-.12-.01,0-.03,0-.05.02-.02.01-.04.02-.05.02-.26.15-.49.26-.68.36-.19.09-.37.17-.56.23s-.38.1-.59.12c-.21.02-.47.03-.78.03-.04,0-.16.02-.34.05-.19.03-.39.07-.61.12-.22.05-.43.09-.62.14-.19.04-.32.07-.36.09-.09.03-.15.07-.19.1-.04.03-.07.07-.09.11-.02.04-.04.09-.06.13-.02.05-.06.09-.11.14-.07.06-.14.1-.22.14-.08.03-.15.09-.22.16-.1.1-.2.24-.29.41s-.13.33-.13.48c0,.19.05.35.15.5.1.15.23.27.38.37.16.1.34.19.54.27s.4.14.61.18c.2.04.4.07.59.09.19.02.35.03.49.03.17,0,.36-.01.59-.04.23-.02.46-.06.69-.11.23-.05.44-.12.65-.21.2-.09.36-.21.48-.34.05-.06.08-.11.1-.15.02-.05.04-.09.07-.14.02-.04.05-.09.08-.14.03-.05.08-.1.15-.16.16-.13.28-.28.37-.44.09-.16.15-.32.19-.5.04-.17.07-.35.07-.54,0-.19.01-.38.01-.57ZM165.15,705.34c0,.12-.02.26-.05.41-.03.15-.1.26-.2.34-.03.03-.07.08-.1.15-.03.06-.06.12-.08.19-.02.06-.05.12-.07.17s-.05.07-.07.07c-.03,0-.05,0-.08-.02-.03-.01-.05-.02-.09-.03l-.07.04c-.08.1-.2.21-.35.31-.15.1-.32.19-.49.27-.17.08-.35.14-.52.19-.18.05-.33.07-.46.07-.1,0-.19-.01-.26-.04-.07-.02-.13-.05-.17-.08s-.08-.06-.11-.09c-.03-.03-.07-.04-.11-.04-.08,0-.16.03-.24.08-.08.05-.15.08-.2.08-.03,0-.06-.02-.06-.06s-.05-.07-.12-.1c-.12-.04-.25-.1-.39-.19s-.29-.17-.43-.25c-.15-.09-.28-.16-.42-.23-.13-.07-.24-.1-.33-.1-.03,0-.09-.04-.2-.13-.1-.09-.23-.19-.37-.3-.15-.11-.31-.21-.48-.3s-.35-.14-.52-.14c-.19,0-.35.06-.46.18s-.19.26-.25.43h-.09c-.09,0-.17.03-.24.08s-.13.12-.17.21c-.05.08-.08.17-.1.26-.02.09-.03.18-.03.26,0,.12,0,.24.03.36s.03.24.03.36v.12s0,.08-.01.11c-.08-.02-.17-.03-.26-.03s-.18,0-.26.03c-.08.02-.17.03-.26.03-.14,0-.24-.04-.3-.12-.06-.08-.11-.18-.16-.29-.06-.14-.13-.27-.22-.41s-.18-.26-.27-.39c-.09-.13-.17-.26-.24-.4-.07-.13-.1-.27-.1-.41,0-.17,0-.35.02-.52.01-.17.02-.35.02-.53,0-.15.04-.27.11-.37.07-.1.15-.21.24-.32.09-.11.17-.24.24-.37.07-.14.11-.32.11-.53,0-.06.01-.1.04-.13.03-.03.06-.06.09-.1.08-.06.17-.17.28-.33.11-.16.23-.34.36-.53.13-.19.27-.39.42-.59s.3-.37.46-.52c.04-.04.08-.07.1-.08.03-.01.06-.02.09-.02s.07,0,.1,0c.03,0,.08.01.12.01.07,0,.12-.01.15-.03.03-.02.06-.05.07-.08.02-.03.03-.06.05-.1.01-.03.04-.07.08-.1.07-.06.16-.08.28-.07.12,0,.23,0,.32-.05.07-.03.14-.07.2-.12.06-.04.12-.09.18-.14.06-.04.12-.09.19-.12.07-.04.14-.07.21-.09.26-.07.51-.16.77-.28s.5-.25.73-.41c.23-.16.44-.33.64-.53.19-.2.36-.41.49-.65.02-.04.05-.09.1-.15.05-.06.09-.11.14-.17.04-.06.08-.12.11-.18s.05-.11.05-.15,0-.08-.02-.12c-.01-.04-.02-.08-.02-.12,0-.05.02-.08.05-.1.03-.02.07-.04.11-.06.07-.03.13-.07.17-.14.04-.06.08-.13.1-.2s.04-.15.05-.23.02-.16.02-.23,0-.15-.02-.23-.03-.16-.05-.24-.06-.15-.11-.21c-.05-.07-.11-.11-.18-.14-.02-.01-.05-.03-.09-.04-.04-.01-.06-.04-.06-.07,0-.03,0-.05.02-.08.01-.02.02-.05.02-.08,0-.05-.03-.1-.08-.15-.05-.05-.12-.1-.19-.16-.07-.05-.14-.1-.21-.16-.07-.05-.12-.11-.15-.16-.03-.06-.12-.12-.25-.2-.13-.08-.28-.16-.43-.23s-.31-.14-.45-.19c-.15-.05-.25-.08-.31-.08-.24,0-.47.04-.7.13-.22.09-.45.15-.69.2-.17.03-.39.07-.67.1-.28.03-.55.09-.81.16-.26.08-.48.19-.68.33-.19.15-.29.35-.29.6,0,.12.03.23.1.33.07.1.16.2.26.3.1.1.22.2.34.3.12.1.24.2.34.31.1.11.19.23.26.35.07.12.1.25.1.4,0,.18-.06.33-.17.46-.12.13-.25.23-.42.32-.16.08-.34.14-.52.18-.18.04-.35.06-.49.06-.17,0-.33-.02-.48-.07-.1-.03-.17-.05-.22-.06s-.09-.02-.12-.04-.05-.05-.07-.09c-.01-.04-.03-.12-.05-.22-.02-.12-.06-.22-.1-.32-.05-.09-.1-.19-.14-.28-.05-.09-.09-.19-.12-.29s-.05-.22-.05-.35c0-.16.04-.36.12-.59.08-.24.18-.47.3-.72.12-.24.24-.47.38-.68.13-.21.26-.37.38-.48.05-.05.09-.1.11-.16.03-.06.06-.11.09-.17.03-.05.07-.09.12-.13s.12-.05.22-.05h.19c.1,0,.18-.01.24-.04.06-.03.11-.09.15-.19.02-.06.07-.11.15-.15s.16-.06.25-.07c.09-.01.18-.02.28-.03.09,0,.17,0,.22,0,.14,0,.27-.03.4-.06.13-.03.26-.07.39-.11.13-.04.26-.08.39-.11.13-.03.26-.05.4-.05h.17c.58.04,1.07.09,1.45.16.39.07.73.19,1.02.35s.56.4.8.7c.24.3.52.69.82,1.16.07.12.13.25.18.39s.14.26.26.35c-.08.17-.13.35-.15.53-.02.18-.03.37-.05.56,0,.12-.02.23-.05.33s-.05.18-.09.26-.07.17-.12.25c-.04.08-.09.18-.14.29-.03.08-.06.14-.07.19s-.03.1-.05.15-.04.09-.08.13c-.03.04-.09.08-.18.12-.08.05-.14.1-.18.17-.03.06-.06.13-.08.19-.02.07-.05.13-.08.19s-.09.1-.17.13c-.17.07-.32.16-.47.27-.15.11-.29.23-.44.34s-.29.23-.43.33c-.15.1-.3.18-.48.22-.19.05-.38.12-.55.22-.17.1-.34.2-.51.3-.17.1-.33.2-.5.3-.17.1-.35.17-.55.22-.08.02-.14.05-.19.09-.05.04-.09.08-.12.13-.03.05-.07.11-.1.16-.03.06-.08.11-.12.16-.08.08-.15.12-.21.15-.07.02-.13.04-.2.05-.07.01-.14.04-.21.08-.07.04-.15.12-.23.23-.04.06-.1.11-.17.15-.07.03-.13.07-.2.1-.06.03-.12.07-.16.12s-.07.11-.07.19c0,.06-.02.12-.05.16-.03.05-.06.09-.1.14s-.07.09-.1.14c-.03.04-.05.09-.05.15,0,.03,0,.08.02.12.01.05.04.1.09.15.05.05.11.1.18.13.08.03.18.05.3.05s.25,0,.37-.03c.12-.02.25-.03.37-.03.1,0,.2.02.3.05.09.03.18.06.27.1.09.03.18.07.27.1.09.03.18.05.27.05.17,0,.29-.09.34-.28.03.01.05.05.06.11.01.06.03.13.04.19s.02.13.04.19c.01.06.03.09.05.09.05-.03.08-.07.1-.14.02-.07.07-.1.14-.1.04,0,.08.02.12.06.04.04.08.09.12.14.05.05.1.09.16.13.06.04.13.06.21.06.14,0,.29.05.45.16.16.11.33.22.5.35s.35.25.53.35c.18.11.35.16.51.16.18,0,.33-.04.45-.12.12-.08.23-.18.33-.3s.19-.25.26-.39c.08-.14.16-.27.26-.39.09-.12.19-.22.31-.3.12-.08.26-.12.43-.12.26,0,.43.07.51.2.08.13.12.32.12.55ZM161.97,693.62h-.45s.04.02.04.05-.01.07-.03.09c-.01-.01-.02-.03-.02-.05,0,0,0-.01,0-.01,0,0,0,0,0,0v-.07.15c-.02.1,0,.2.04.29s.13.14.25.16c.02-.08.05-.16.1-.24s.07-.16.07-.25v-.1Z"/>
    <path id="area1" d="M111.4,665.11c-.04.07-.09.14-.16.2s-.13.11-.21.15c-.08.04-.15.06-.22.06-.05,0-.1,0-.15-.01-.05,0-.1-.01-.15-.01-.06,0-.1.02-.12.06-.02.04-.04.08-.06.12s-.04.08-.08.12c-.03.04-.1.06-.19.06-.06,0-.11,0-.18-.02-.06-.01-.12-.02-.19-.02-.13,0-.26.03-.38.08-.12.05-.25.08-.39.08-.12,0-.29-.02-.53-.06-.24-.04-.47-.1-.71-.18-.24-.08-.45-.18-.63-.29s-.27-.25-.27-.4c0-.12.07-.24.2-.36.14-.12.29-.26.45-.41s.32-.32.45-.5c.13-.19.2-.41.2-.65,0-.15-.03-.29-.09-.43s-.13-.27-.22-.39c-.09-.12-.19-.23-.31-.34-.11-.1-.22-.2-.33-.29-.03-.01-.09-.02-.16-.02-.19,0-.37.02-.56.06-.19.04-.37.06-.56.06-.1,0-.2-.01-.3-.04-.1-.03-.17-.1-.2-.21-.18.09-.36.18-.54.26-.18.08-.36.15-.55.21-.12.04-.2.07-.25.09-.05.02-.09.04-.11.07-.02.03-.04.07-.05.12-.01.06-.04.14-.08.24-.03.07-.04.13-.04.19v.19c0,.09-.02.16-.05.21-.03.05-.07.1-.11.15-.04.05-.07.09-.11.14s-.05.11-.05.19c0,.06.01.12.03.17v.05c-.01.1.02.19.07.24.06.06.12.1.2.14.08.03.16.06.25.09.09.03.17.06.24.1.07.04.14.11.2.2s.12.19.18.3c.05.11.09.21.13.32s.05.2.05.28v.05h-.14c-.28,0-.55.01-.83.04-.27.03-.55.05-.82.08-.27.03-.54.06-.82.08s-.55.04-.83.04c-.1,0-.24,0-.42-.01s-.37-.03-.55-.06c-.18-.03-.34-.08-.47-.16-.13-.07-.2-.18-.2-.32,0-.15.03-.27.1-.36s.15-.18.26-.24c.11-.07.23-.12.36-.17.14-.04.27-.09.41-.13.13-.04.26-.08.38-.12s.22-.1.31-.17.15-.18.21-.34c.06-.16.1-.32.14-.5.03-.18.07-.36.09-.53.03-.18.05-.32.07-.42,0-.03.01-.08.02-.13s0-.11.01-.16c0-.06,0-.11.01-.16s.01-.08.03-.1c.07-.12.12-.19.16-.21.04-.02.07-.04.08-.05s.03-.05.03-.11,0-.18,0-.37c0-.08.02-.15.05-.19.03-.04.07-.08.11-.12s.07-.07.11-.1c.03-.03.05-.07.05-.13,0-.1-.03-.18-.08-.26-.06-.08-.08-.17-.08-.26,0-.06.01-.1.04-.15.03-.04.06-.08.1-.12.04-.03.07-.07.1-.11.03-.04.04-.09.04-.14,0-.08-.02-.15-.05-.23-.03-.08-.05-.15-.05-.23,0-.06.02-.09.06-.12.04-.02.08-.04.12-.06.04-.01.09-.03.12-.04.04-.01.06-.03.06-.05-.02-.04-.06-.06-.11-.06-.08,0-.12.05-.12.14-.05-.03-.09-.07-.12-.12-.03-.04-.05-.09-.05-.15,0-.07.02-.13.05-.19.03-.06.07-.13.12-.2.04-.08.08-.16.12-.26.03-.1.05-.21.05-.35,0-.15-.02-.29-.06-.42-.04-.13-.06-.27-.06-.41,0-.07.02-.14.05-.21.03-.07.07-.14.11-.2l.13-.2c.04-.07.08-.14.1-.21.04-.13.06-.27.07-.42,0-.15,0-.29.01-.44,0-.15.01-.29.03-.43s.06-.28.13-.4c.06-.11.11-.2.15-.27s.07-.14.09-.2c.03-.07.05-.14.07-.22.02-.08.04-.18.06-.32.03-.2.09-.4.16-.58.07-.19.12-.38.15-.58.01-.15.02-.28.03-.39,0-.11.02-.2.05-.29.03-.08.09-.16.17-.22.08-.06.2-.12.37-.19.18-.06.36-.11.54-.13.18-.02.36-.04.54-.04.21,0,.42,0,.64.03.02.12.07.22.14.32.07.09.14.19.22.28.08.09.16.18.23.28.07.09.12.2.15.32.03.16.06.31.07.45.01.14.07.28.17.42.05.08.07.17.07.27,0,.16-.02.31-.06.46-.04.15-.06.29-.06.45,0,.09.03.24.08.45.06.21.12.43.2.67.08.24.15.47.22.7.07.23.12.4.16.53.06.26.1.53.1.81,0,.28.05.55.13.81.08.28.16.55.22.83s.1.56.12.85c.01.27.05.53.1.79.06.25.11.51.18.76.06.25.12.51.17.76.05.26.08.52.08.8,0,.1,0,.21-.03.32-.02.11-.06.21-.14.29.15.17.31.36.49.56s.37.36.55.48c.07.04.18.07.32.09.15.02.29.05.44.08.15.03.28.08.4.13.11.06.17.14.17.26,0,.08-.02.15-.06.22ZM107.11,659.29c0-.06-.02-.14-.07-.24-.05-.1-.1-.21-.16-.34-.06-.12-.11-.26-.16-.41-.05-.15-.07-.3-.07-.46,0-.19-.03-.37-.08-.56s-.09-.37-.11-.56c-.01-.15-.03-.32-.05-.5-.02-.18-.05-.36-.11-.52-.06-.16-.14-.3-.25-.41-.11-.11-.28-.16-.49-.16-.01.06-.04.1-.07.12-.03.02-.07.04-.12.06-.05.02-.09.03-.14.05-.05.01-.09.04-.11.07,0,.02.01.05.01.09,0,.12-.03.24-.08.35-.05.11-.1.22-.14.33-.05.12-.08.24-.1.37-.02.13-.03.25-.03.38,0,.11,0,.22.01.32,0,.1.01.21.01.31,0,.16-.01.3-.04.41-.03.12-.06.22-.09.32-.03.1-.07.19-.09.28-.03.09-.04.18-.04.28,0,.21,0,.39.02.54.01.15.04.28.09.38s.12.18.21.23c.09.05.21.08.37.08.11,0,.27-.01.48-.04.21-.03.42-.07.63-.14s.4-.15.55-.25c.16-.1.23-.23.23-.37ZM123.5,658.04c0,.14-.03.26-.08.35-.06.1-.12.19-.18.28-.07.09-.13.18-.2.26-.07.09-.11.2-.13.32-.06-.03-.13-.05-.19-.05s-.13-.01-.2-.01c-.17,0-.33.01-.49.04-.16.02-.32.04-.48.04-.19,0-.34-.06-.46-.17-.12-.11-.22-.25-.29-.42-.07-.17-.12-.35-.15-.54-.03-.19-.04-.36-.04-.51,0-.19.03-.39.09-.59-.06-.02-.1-.03-.15-.03-.09,0-.15.03-.19.08-.04.06-.09.08-.16.08-.06,0-.12-.02-.17-.07-.05-.04-.11-.07-.18-.07-.1,0-.23.03-.39.1-.16.07-.31.15-.45.26-.15.1-.27.22-.38.34-.11.12-.16.24-.16.35-.15.01-.28.05-.41.12s-.25.14-.37.21c-.09.06-.17.14-.23.26s-.12.24-.17.38c-.05.14-.1.27-.16.41s-.11.25-.18.34c-.12.15-.22.31-.31.46-.09.16-.13.33-.13.53,0,.24.04.49.11.74s.11.5.11.76c0,.17-.01.33-.04.5-.02.17-.04.33-.04.49,0,.19.03.35.1.47s.16.21.28.27c.12.07.25.11.41.13.15.02.31.03.47.03.17,0,.34,0,.5-.02s.31-.02.45-.02c.05.06.08.11.08.16,0,.05,0,.1,0,.15-.01.05-.02.1-.04.16-.02.05-.03.11-.03.18,0,.03,0,.06.02.1.1,0,.19-.02.27-.07s.13-.12.17-.23c.05.01.09.03.13.06.04.03.06.07.06.12,0,.04-.01.08-.03.12-.02.04-.04.07-.07.11-.03.03-.05.07-.07.11s-.03.08-.03.13c0,.03,0,.06.01.09,0,.03.02.06.03.08-.03.06-.08.09-.15.12-.06.02-.12.03-.19.03-.11,0-.2-.02-.28-.05-.07-.03-.14-.07-.2-.11-.06-.04-.11-.08-.16-.11-.05-.03-.11-.05-.18-.05-.03,0-.07,0-.12.02-.06.01-.11.03-.17.05-.06.02-.1.05-.15.08-.04.03-.06.06-.06.09,0,.06.02.1.06.15.04.04.06.09.06.15,0,.05-.02.09-.05.11-.03.03-.08.05-.12.06-.05.01-.1.02-.15.02-.05,0-.1,0-.13,0-.27,0-.54-.03-.81-.09-.27-.06-.54-.09-.81-.09-.12,0-.25.03-.37.08-.12.06-.26.08-.39.08-.08,0-.13-.02-.17-.05-.04-.03-.07-.07-.1-.11-.03-.04-.06-.08-.09-.11-.03-.03-.09-.05-.16-.05-.13,0-.26.01-.39.04s-.26.06-.38.09c-.13.03-.26.06-.38.08-.13.02-.26.04-.39.04-.07,0-.15,0-.25-.03s-.19-.05-.28-.09c-.09-.04-.17-.09-.23-.16-.06-.06-.09-.14-.09-.23,0-.06.03-.13.1-.22.07-.09.14-.18.22-.26.08-.09.17-.16.25-.22.08-.06.15-.09.19-.09.11,0,.22,0,.33.01s.22.01.34.01c.19,0,.38-.03.57-.09.19-.06.36-.14.52-.25.16-.11.28-.25.38-.42s.15-.35.15-.56c0-.09,0-.18-.02-.26-.01-.09-.02-.18-.02-.27,0-.18.02-.36.06-.54.04-.18.06-.36.06-.54,0-.24-.03-.49-.08-.74-.05-.25-.08-.51-.08-.76,0-.23,0-.46.02-.68.01-.23.02-.45.02-.68,0-.1,0-.26-.01-.46,0-.2-.03-.4-.07-.6-.04-.2-.1-.38-.18-.53-.08-.15-.19-.23-.33-.23-.15,0-.31.02-.46.05-.15.03-.31.05-.47.05-.12,0-.26,0-.42-.03-.16-.02-.31-.05-.46-.1-.15-.05-.27-.13-.37-.22-.1-.1-.16-.23-.16-.38,0-.17.02-.31.07-.42.05-.11.11-.19.19-.24.08-.06.17-.09.28-.11.11-.02.22-.03.35-.03.11,0,.23,0,.34.01.12,0,.23.01.34.01.22,0,.44-.01.66-.04.22-.02.44-.04.66-.04.15,0,.3,0,.46.02.15.01.3.05.45.09.13.04.23.12.29.23s.12.23.17.35c.05.12.11.22.18.32.07.09.18.14.33.14.07,0,.13-.02.19-.06.06-.04.12-.08.17-.13.06-.05.11-.09.17-.13s.12-.07.2-.08c.15-.02.29-.07.42-.15s.25-.15.38-.23.25-.15.38-.21c.13-.06.27-.09.42-.09.09,0,.2-.01.34-.03.14-.02.27-.05.41-.09.13-.04.26-.08.38-.14.12-.06.22-.12.29-.19.19.01.41.06.66.13.25.08.5.18.73.31.23.13.44.28.61.45s.27.37.3.58c.02.13.06.26.11.37.06.12.11.23.17.35.06.11.11.23.16.35.05.12.07.25.07.38ZM134.46,663.46c0,.19-.03.35-.09.48-.06.13-.14.25-.23.35-.09.1-.2.2-.32.29-.12.09-.24.19-.37.29-.1.08-.18.15-.26.19-.08.04-.15.08-.22.1-.07.03-.15.06-.23.08-.08.03-.17.07-.27.12-.14.07-.26.13-.35.19-.09.06-.19.11-.28.16-.09.05-.2.09-.31.12-.11.03-.25.06-.42.08-.28.03-.56.08-.84.12-.28.05-.56.07-.84.07-.06,0-.11-.01-.17-.04s-.13-.05-.2-.07c-.08-.03-.16-.05-.25-.07-.09-.02-.21-.04-.34-.04-.14,0-.25-.02-.33-.06s-.16-.09-.22-.15c-.07-.06-.13-.12-.2-.18s-.16-.12-.27-.17c-.42-.19-.77-.41-1.06-.68-.29-.26-.54-.56-.75-.88s-.38-.68-.52-1.06c-.14-.38-.26-.78-.35-1.2-.08-.29-.11-.58-.11-.87,0-.38.09-.73.27-1.06-.07-.19-.1-.38-.1-.56,0-.13.04-.33.11-.59s.18-.52.3-.78c.12-.26.25-.5.4-.71.14-.21.28-.34.4-.39.1-.03.16-.06.2-.09s.06-.09.06-.2c0-.08.03-.15.1-.21.07-.06.15-.1.24-.14.09-.03.19-.07.28-.09.09-.03.17-.06.23-.08.26-.12.5-.23.73-.32.23-.09.46-.16.7-.22s.47-.1.72-.13c.25-.03.52-.04.8-.04.15,0,.3.02.45.06s.29.1.42.16c.13.07.27.14.4.22.13.08.26.16.38.23h0c.1.01.2.04.3.09.09.04.19.07.3.09.1.12.22.23.38.34.15.11.31.22.46.34s.28.24.38.38c.11.14.16.29.16.46,0,.03,0,.06,0,.08,0,.03,0,.06-.02.09l.04-.05s.05.06.08.1c.03.05.05.1.07.16.02.06.04.12.05.18.01.06.03.11.03.14.06.09.13.16.22.22.09.06.17.13.22.23-.07.07-.1.16-.1.27,0,.12.02.23.07.35.05.12.07.23.07.35,0,.14,0,.27-.02.4-.01.13-.02.26-.02.4,0,.1-.04.18-.12.24-.08.06-.17.1-.26.15-.09.04-.18.08-.25.12-.08.04-.12.1-.12.18,0,.06-.03.08-.1.08-.07,0-.12,0-.16,0-.31,0-.61-.04-.91-.11s-.6-.12-.9-.12c-.33,0-.65.02-.97.07-.32.05-.64.07-.97.07-.24,0-.48,0-.72-.02-.24-.01-.48-.02-.72-.02-.06,0-.18.01-.35.04-.17.02-.35.06-.55.09-.19.04-.37.08-.55.14s-.29.1-.36.15c0,.03-.01.08-.01.15,0,.32.1.66.29,1.01.19.35.44.66.75.95.31.28.66.52,1.05.71.39.19.78.28,1.18.28.23,0,.46,0,.68.03.22.02.45.07.66.15.19-.09.36-.19.51-.31s.31-.24.45-.37c.15-.13.29-.27.43-.41.14-.14.28-.28.43-.42.03-.03.09-.05.2-.08.11-.02.22-.04.35-.06.12-.02.24-.03.36-.04.11-.01.19-.02.23-.02.16,0,.31.03.45.07.04.16.06.32.06.47ZM132.9,659.24c0-.1-.02-.2-.05-.3-.03-.1-.06-.2-.08-.3-.03-.19-.05-.38-.05-.57s-.03-.37-.08-.56h-.01s-.01.08-.04.12c-.03.04-.07.06-.11.06-.08,0-.16-.02-.24-.06s-.14-.09-.2-.16c-.26-.12-.5-.23-.71-.33-.21-.1-.42-.2-.63-.28-.21-.08-.44-.14-.68-.19-.24-.04-.51-.07-.83-.07-.03,0-.05,0-.08,0s-.05.02-.07.04l.05.11-.08.02c-.19.03-.34.07-.46.1-.12.03-.23.08-.33.13-.1.06-.19.12-.29.2-.09.08-.21.18-.36.31-.07.06-.14.11-.22.14-.08.03-.16.06-.24.08s-.16.05-.23.08c-.07.03-.13.07-.18.14-.05.17-.12.34-.21.5-.09.16-.14.33-.14.51,0,.1.04.2.13.28.09.08.2.15.33.2.13.06.28.1.45.15s.32.07.48.09c.16.02.31.04.44.05.13,0,.24.02.32.02.26,0,.52-.03.78-.08.26-.05.52-.08.78-.08s.54.01.81.04.54.04.81.04c.07,0,.17,0,.31-.01.14,0,.28-.03.41-.06s.25-.08.35-.14c.1-.06.15-.14.15-.23ZM147.3,663.81c0,.12-.02.23-.06.33-.04.1-.08.21-.12.32-.03.1-.05.18-.06.24,0,.06-.03.12-.05.16-.02.05-.05.09-.1.12-.05.04-.12.08-.21.13-.21.11-.43.22-.66.34-.23.11-.47.17-.7.17-.2,0-.39-.05-.57-.14-.18-.09-.34-.2-.49-.31-.15-.11-.28-.22-.41-.32-.12-.1-.22-.15-.31-.15-.09,0-.17.02-.23.07-.07.05-.13.1-.2.16-.07.06-.14.11-.22.16s-.18.07-.3.07c-.1,0-.2.02-.3.05-.1.03-.21.07-.31.12-.1.05-.21.09-.32.14-.11.05-.21.08-.3.11-.31.08-.62.13-.94.15-.32.01-.63.02-.95.02-.08,0-.21,0-.38,0-.17,0-.35-.02-.53-.05-.18-.03-.33-.08-.47-.15-.14-.07-.2-.17-.2-.29,0-.03,0-.05.01-.07-.05.06-.1.1-.17.14-.06.03-.13.05-.21.05-.11,0-.25-.08-.41-.23-.16-.15-.31-.33-.46-.53-.15-.2-.27-.4-.37-.6-.1-.2-.16-.34-.16-.44,0-.08.02-.15.07-.21.05-.06.07-.13.07-.21,0-.1-.01-.19-.04-.28-.03-.09-.04-.18-.04-.28,0-.12.02-.26.07-.4s.11-.28.18-.43c.07-.14.14-.28.22-.42.08-.13.15-.26.21-.38.07-.14.17-.25.29-.33s.26-.16.39-.22c.14-.06.28-.12.42-.19.14-.06.26-.15.36-.25.1.12.24.18.41.18s.34-.03.51-.08.34-.08.51-.08c.14,0,.27.01.4.04.13.03.26.04.4.04.15,0,.26-.02.34-.06.07-.04.16-.11.28-.2.11-.1.25-.17.42-.22.17-.05.35-.09.53-.12.18-.03.37-.06.55-.1.18-.03.35-.08.49-.15.15-.07.26-.16.35-.27s.14-.27.14-.47c0-.22-.06-.46-.19-.7-.13-.25-.29-.47-.49-.68-.2-.21-.42-.37-.66-.5-.24-.13-.47-.2-.7-.2-.03,0-.06,0-.08.01-.03,0-.05.01-.07.01-.17.03-.35.05-.56.06-.21,0-.4.04-.58.09-.18.05-.33.14-.46.26-.12.12-.19.3-.19.54,0,.14.01.28.04.41.02.14.04.27.04.41,0,.21-.05.38-.15.52-.1.14-.23.25-.38.33s-.33.14-.51.17c-.19.03-.37.05-.54.05-.21,0-.39-.03-.54-.08-.15-.06-.28-.18-.37-.38-.08-.15-.16-.3-.24-.47-.09-.17-.13-.34-.13-.51,0-.19.03-.36.1-.53.07-.16.14-.32.22-.48s.16-.31.24-.47c.08-.16.14-.32.17-.5.05-.03.12-.06.2-.08.09-.03.18-.06.28-.08s.2-.05.29-.08.17-.05.23-.07c.17-.05.33-.11.48-.17.16-.07.32-.13.48-.18s.33-.1.49-.15c.16-.04.33-.07.5-.07h.32c.3-.01.6.02.91.07.31.05.62.13.91.24.3.11.58.25.85.41.27.16.5.36.71.58.15.17.28.36.38.59.1.23.18.46.24.71s.1.5.12.75.04.49.04.7c0,.29,0,.58-.03.86-.02.28-.03.57-.03.86s.02.55.05.83.07.55.11.82.08.55.11.82c.03.27.05.55.05.82.01.17.04.27.07.31s.06.06.1.06c.15,0,.28-.05.37-.14.09-.09.18-.2.25-.31.08-.11.16-.22.25-.32.09-.1.2-.15.34-.15.06,0,.13,0,.19.01.07,0,.13.02.18.05.06.02.1.06.13.1.03.04.05.11.05.18ZM143.89,661.22s0-.11,0-.22c0-.1-.01-.21-.03-.32-.01-.11-.04-.2-.07-.29-.03-.08-.08-.12-.14-.12-.01,0-.03,0-.05.02-.02.01-.04.02-.05.02-.26.15-.49.26-.68.36-.19.09-.37.17-.56.23s-.38.1-.59.12c-.21.02-.47.03-.78.03-.04,0-.16.02-.34.05-.19.03-.39.07-.61.12-.22.05-.43.09-.62.14-.19.04-.32.07-.36.09-.09.03-.15.07-.19.1-.04.03-.07.07-.09.11-.02.04-.04.09-.06.13-.02.05-.06.09-.11.14-.07.06-.14.1-.22.14-.08.03-.15.09-.22.16-.1.1-.2.24-.29.41s-.13.33-.13.48c0,.19.05.35.15.5.1.15.23.27.38.37.16.1.34.19.54.27s.4.14.61.18c.2.04.4.07.59.09.19.02.35.03.49.03.17,0,.36-.01.59-.04.23-.02.46-.06.69-.11.23-.05.44-.12.65-.21.2-.09.36-.21.48-.34.05-.06.08-.11.1-.15.02-.05.04-.09.07-.14.02-.04.05-.09.08-.14.03-.05.08-.1.15-.16.16-.13.28-.28.37-.44.09-.16.15-.32.19-.5.04-.17.07-.35.07-.54,0-.19.01-.38.01-.57ZM165.82,664.84c0,.08-.01.15-.04.22-.03.07-.06.14-.09.21-.07.13-.13.24-.19.31s-.12.13-.18.17c-.06.04-.13.06-.2.07s-.16.02-.25.02h-.35c-.06.02-.11.03-.16.03-.06,0-.1-.03-.12-.08-.02-.05-.03-.11-.03-.17,0-.03,0-.07,0-.1,0-.03,0-.06,0-.08,0-.06,0-.1-.03-.15s-.06-.06-.12-.06c-.1,0-.19.03-.24.09s-.11.12-.17.19c-.05.07-.11.13-.17.19-.06.06-.15.09-.27.09-.14,0-.27-.02-.41-.06s-.27-.07-.41-.08c-.28-.02-.57-.03-.85-.04-.28,0-.57-.02-.85-.03-.28-.01-.56-.03-.84-.06-.28-.03-.56-.07-.84-.14-.06-.01-.12-.02-.19-.03-.06,0-.12-.01-.18-.01-.28,0-.56.03-.84.09s-.58.09-.92.09c-.23,0-.46.02-.69.07-.23.05-.46.07-.69.07-.11,0-.24-.02-.38-.07-.15-.04-.29-.11-.42-.18s-.25-.17-.34-.28c-.09-.11-.14-.23-.14-.35,0-.09.04-.18.13-.29.09-.1.19-.2.31-.29.12-.09.24-.18.36-.26.12-.08.22-.14.29-.19.42.06.85.12,1.27.19.42.07.85.1,1.28.1.26,0,.47-.03.63-.1s.27-.16.35-.27c.08-.12.13-.25.16-.41.02-.16.04-.32.04-.5,0-.1,0-.21,0-.31,0-.1,0-.21,0-.33,0-1.08.03-2.16.09-3.23s.09-2.15.09-3.23c0-.53-.01-1.06-.04-1.59-.03-.53-.08-1.05-.15-1.58-.1-.02-.19-.04-.28-.06-.09-.02-.19-.03-.31-.03-.03,0-.05,0-.05.01-.03-.03-.06-.04-.1-.05-.04,0-.07,0-.11,0-.16,0-.31.02-.46.07-.15.04-.29.07-.45.07-.04,0-.07,0-.1-.02-.03-.01-.05-.03-.07-.05-.02-.02-.05-.04-.08-.05-.03-.01-.07-.02-.12-.02-.23,0-.46.02-.69.07-.23.05-.46.07-.7.07-.17,0-.33-.02-.49-.07-.16-.05-.31-.12-.44-.23.05-.1.07-.23.07-.37,0-.11-.01-.22-.03-.33-.02-.11-.03-.22-.04-.33.05.02.1.03.16.03.1,0,.2-.03.3-.08.09-.05.19-.11.28-.18s.18-.12.28-.18c.1-.05.2-.08.3-.08.21,0,.41.03.62.09.2.06.41.09.62.09.12,0,.22-.02.3-.07s.16-.07.22-.07c.07,0,.12.02.16.06.04.04.1.06.17.06.11,0,.22-.02.34-.06s.23-.08.34-.13c.11-.04.23-.09.34-.13s.24-.06.36-.06c.17,0,.35.02.51.06.17.04.34.06.5.06.09,0,.18,0,.26-.03h0s-.02.09-.02.17c0,.1.02.18.05.26s.07.16.1.24c.04.08.07.18.1.3s.05.27.05.45c0,.31,0,.62.02.92s.02.61.02.92c0,.16-.01.31-.04.46s-.07.29-.14.43c.06.06.1.12.12.19s.03.15.03.23v.17c0,.08,0,.16.03.24s.06.15.13.21v.11c0,.09,0,.17-.04.24-.03.07-.06.14-.1.2-.03.06-.07.12-.1.19-.03.06-.05.13-.05.21,0,.16.02.32.07.48s.07.33.07.51c0,.22-.01.44-.04.66-.03.22-.06.44-.09.65s-.07.44-.09.65c-.03.22-.04.44-.04.66,0,.06,0,.1-.03.13-.02.03-.04.05-.08.05,0,0-.03,0-.07-.02,0,.18.01.36.04.54.03.18.06.36.09.53s.06.35.09.54c.03.18.04.36.04.55v.29c-.01.37.11.64.35.81s.54.26.89.26c.24,0,.41-.02.54-.07.12-.05.21-.1.27-.15.06-.06.11-.11.14-.15.03-.05.09-.07.16-.07.2,0,.41.02.62.07.21.05.42.08.62.1.1.01.21.02.31.02s.2,0,.3.03c.1.02.19.05.27.09s.16.11.23.22c.07.1.15.22.23.34s.13.25.13.38Z"/>
  </g>
  <g id="image01">
    <path id="leather021" data-name="leather02" class="st1" d="M195.56,239.08c2.49-7.52,5.87-21.4,5.87-21.4,2.81-17.66,6.14-33.29,1.37-52.27,27.79,34.32,46.79,94.57,45.42,137.8-.33,10.25-2.99,20.27-10.65,26.63-19.53,16.22-71.29,7.42-96.97.99,26.44-22.41,45.03-60.21,54.96-91.76Z"/>
    <path id="leather011" data-name="leather01" class="st0" d="M147.66,317.19c32.96-37.71,53.82-89.01,55.79-138.8.64-16.26-9.2-27.84-23.92-30.49l-.08,11.22c3.18,2.63,3.84,7.09.86,9.86-2.81,2.62-7.19,2.59-9.94-.41-2.51-2.72-2.72-6.97,1.61-9.22.58-4.34.48-8.88-.49-13.73-47.37-6.67-96.4-.5-140.81,16.99-18.94,7.46-33.7,17.14-27.97,38.48,6.4,23.88,18.94,45.48,33.81,65.39,18.02,24.14,40.6,45.59,67.28,58.9,16.05,8.01,31.64,5.78,43.87-8.2Z"/>
    <g id="outline1" data-name="outline">
      <polygon points="137.48 328.88 137.76 329.15 137.48 329.62 137.21 329.15 137.48 328.88"/>
      <path d="M94.55,251.36l.39-1.2-.39,1.2Z"/>
      <polygon points="124.28 218.52 124.2 219.6 121.86 220.4 145.97 193.61 146.73 193.59 124.28 218.52"/>
      <path d="M119.95,222.85l.12,1.16-.53.47-.74.37-16.64,18.28,1.03.38,8.39-8.68-.89,1.89,3.68-4.51.25-.57,1.89-2.81c-.23,4.76-3.27,8.7-7.78,9.32-1.84,2.19-3.77,4.29-5.05,6.41,4.23,6.31,8.25,14.14,3.31,20.46-6.69,8.56-21.11,8.38-29.49,2.22-5.28-3.88-5.41-10.38-1.5-15.34,5.84-7.4,15.43-10.78,25.04-10.69l11.27-12.24-.38-.64-6.94,7.18c-1.01-4.55,4.23-8.81,7.45-8.39l.11,1.34,4.17-4.53-.36-.58-2.93,2.5c-4.92-1.08-8.9,1.37-11.1,5.88-3.55-5.81-1.09-12.72,4.73-15.15,4.92-2.05,10.06-2.18,15.26-.02l-5.68,6.33.42.69,9.87-11.06c-.2.11-.02.01.39-.23l-26.19,29.67.59.71,18.23-19.81ZM113.31,224.38l7.22-7.72c-4.24-.72-7.51-.7-11.08-.05-5.55,1.58-9.21,6.66-7.07,12.46,2.24-3.89,6.4-5.62,10.92-4.69ZM110.93,228.01l-4.78,4.72c1.83-1.44,3.41-3.03,4.78-4.72ZM90.6,252.83l-2.4,4.4,6.34-5.87-4.72,5.9.99.76,11.48-13.71-.51-.66-2.21,1.86,1.36-3.12-5.42,4.55c1.23-1.77,3.4-3.09,3.78-5.38-4.95,4.31-9.34,8.48-12.48,14.05l3.77-2.78ZM103,245.22l-10.81,13.28c-2.1,1.21-6.76-1.2-6.4-3.81,2.56-4.87,7.19-8,10.62-12.27-10.76,1.38-24.12,9.16-21.79,18.75s24.67,12.83,32.17,1.91c3.9-5.68-.22-12.28-3.78-17.86Z"/>
      <path d="M121.71,221.18l.14-.78-.14.78Z"/>
      <path d="M90.6,252.83c.81-1.98,2.9-3.9,4.66-4.92-1.21,1.75-2.94,3.66-4.66,4.92Z"/>
      <path d="M120.46,222.37l.57-.54-.57.54Z"/>
      <path d="M95.26,247.91l.27-.98-.27.98Z"/>
      <path d="M94.95,250.15c.36-1.1,2.32-2.67,3.36-3.56-.58,1.58-2.13,3.38-3.36,3.56Z"/>
      <path d="M98.31,246.6l.66-.56-.66.56Z"/>
      <path d="M118.8,224.85l.74-.37.53-.47c1.46-1.29,2.93-2.84,4.13-4.41l.08-1.08c2.85-1.11,4.45,2.42,5.21,4.08,1.28,2.76,1,5.7-.66,8.03-3.05,4.28-8.66,6.89-14.2,6.3,1.81-2.42,4.57-3.89,4.05-6.7-.13-.69-1.62-1.98-1.28-2.54l1.4-2.85ZM117.83,235.6c5.73-1.21,11.78-4.87,11.57-9.68-.1-2.45-1.33-4.62-3.3-6.42l-7.12,8.07c1.55,3.12.79,5.29-1.16,8.03Z"/>
      <path d="M119.95,222.85l.51-.49-.51.49Z"/>
      <path d="M114.37,232.21c-.29.07-.51.11-.57.16l.82-.73c-.19.44-.28.63-.25.57Z"/>
      <path d="M98.97,246.03l.63-.54-.63.54Z"/>
      <path d="M111.58,234.83l.53-.8c-.1.09-.45.63-.53.8Z"/>
      <path d="M113.25,232.91l.55-.54-.55.54Z"/>
      <path d="M112.11,234.02l.56-.55-.56.55Z"/>
      <path d="M112.67,233.47l.58-.56-.58.56Z"/>
      <path d="M63.35,252.73c1.47-11.82,21.29-15.41,33.66-16.02-2.54-4.1-4.35-8.23-3.32-13.06,2.45-11.42,19.31-15.52,30.85-11.53l18.75-19.63c-1.43-.96-2.51-1.34-2.97-.89l-2.44,2.39-2.22,2.18c-.78.77-1.9.48-3.36-1.03l15.48-17.38c.96,2.59,1.25,5.21,2.45,6.19,1.91,1.57,3.73,1.27,7.21,1.97l-26.93,29.15c6.5,3.18,11.28,10.41,6.9,16.38-5.6,7.65-16.03,8.55-24.88,9.33,4.2,5.89,7.49,12.5,5.61,19.07s-7.23,10.71-14.36,12.55c-17.58,4.53-42.38-3.97-40.43-19.69ZM127.31,212.28l-.39.23-2.16,1.42c-11.52-4.28-27.98-.28-30.13,11.14-.88,4.68,1.94,8.44,4.17,12.98-12.05.77-33.62,4.42-34.39,15.72-.96,14.2,22.86,22.19,40.25,17.32,9.11-2.55,14.95-10.85,11.86-19.82-1.36-3.95-3.81-7.33-5.97-11.5,9.91-.5,19.9-1.63,26.2-9.05,2.89-6.5-2.11-11.82-8.51-15.2l26.48-28.45c-3.79-.32-7.09-1.77-7.69-6.33l-12.41,14.21c2.47-1.39,3.6-2.8,4.9-4.1,1.5-1.5,3.48-.37,5.5,1.89l-17.72,19.55Z"/>
      <path d="M121.04,221.82l.68-.64-.68.64Z"/>
      <path d="M104.23,235.73c-.84,1.95-2.38,3.47-4.22,4.93l4.22-4.93Z"/>
      <path d="M241.39,264.46l.15.86v1.16c.01.16-.64-.02-.6-.18l.45-1.84Z"/>
      <path d="M241.95,268.35l.14.86v1.16c.01.17-.63-.04-.59-.2l.45-1.81Z"/>
      <path d="M167.35,331.92s1.05-.22,1.25-.25c.18-.03.1.63-.08.58-.24-.07-1.18-.32-1.17-.32Z"/>
      <path d="M240.77,261.66l.25.88c.05.17-.34.99-.34.81l.08-1.69Z"/>
      <path d="M240.21,258.89l.25.88c.05.17-.35.99-.34.81l.08-1.69Z"/>
      <path d="M243.55,304.97l.25.88c.05.17-.34.99-.34.81l.08-1.69Z"/>
      <polygon points="179.22 333.59 179.59 333.59 179.95 333.6 179.59 333.6 179.22 333.6 178.86 333.6 179.22 333.59"/>
      <polygon points="175.33 333.04 175.7 333.04 176.06 333.04 175.7 333.04 175.33 333.04 174.97 333.04 175.33 333.04"/>
      <polygon points="171.44 332.48 171.82 332.48 172.18 332.49 171.82 332.49 171.44 332.49 171.08 332.49 171.44 332.48"/>
      <polygon points="164.22 331.37 164.6 331.37 164.96 331.38 164.6 331.38 164.22 331.38 163.86 331.38 164.22 331.37"/>
      <polygon points="242.42 310.56 242.42 310.92 242.42 311.3 242.42 311.66 242.42 311.3 242.42 310.92 242.42 310.56"/>
      <polygon points="242.98 308.34 242.98 308.7 242.98 309.07 242.98 309.44 242.97 309.07 242.97 308.7 242.98 308.34"/>
      <polygon points="239.65 256.15 239.65 256.51 239.65 256.88 239.65 257.24 239.64 256.88 239.64 256.51 239.65 256.15"/>
      <polygon points="239.09 253.37 239.09 253.73 239.09 254.11 239.09 254.47 239.09 254.11 239.09 253.73 239.09 253.37"/>
      <polygon points="238.53 251.15 238.54 251.51 238.54 251.89 238.53 252.25 238.53 251.89 238.53 251.51 238.53 251.15"/>
      <polygon points="237.98 248.93 237.98 249.29 237.98 249.67 237.98 250.03 237.98 249.67 237.98 249.29 237.98 248.93"/>
      <polygon points="184.21 334.15 184.59 334.15 184.95 334.15 184.59 334.15 184.21 334.15 183.85 334.15 184.21 334.15"/>
      <rect x="236.67" y="244.56" width=".39" height=".39" transform="translate(-103.69 239.18) rotate(-45)"/>
      <rect x="237.23" y="246.78" width=".39" height=".39" transform="translate(-105.1 240.22) rotate(-45)"/>
      <rect x="242.23" y="273.43" width=".39" height=".39" transform="translate(-122.48 251.56) rotate(-45)"/>
      <rect x="241.67" y="312.86" width=".39" height=".39" transform="translate(-150.52 262.72) rotate(-45)"/>
      <rect x="241.11" y="314.52" width=".39" height=".39" transform="translate(-151.86 262.81) rotate(-45)"/>
      <rect x="240.56" y="316.19" width=".39" height=".39" transform="translate(-153.2 262.91) rotate(-45)"/>
      <rect x="240" y="317.3" width=".39" height=".39" transform="translate(-154.15 262.84) rotate(-45)"/>
      <rect x="239.45" y="318.41" width=".39" height=".39" transform="translate(-155.1 262.77) rotate(-45)"/>
      <rect x="238.89" y="319.52" width=".39" height=".39" transform="translate(-156.05 262.7) rotate(-45)"/>
      <rect x="238.34" y="320.63" width=".39" height=".39" transform="translate(-156.99 262.64) rotate(-45)"/>
      <circle cx="237.7" cy="322.21" r=".48"/>
      <path d="M236.98,323.5c-1.03,1.32-2.25,2.54-3.69,3.61l3.69-3.61Z"/>
      <circle cx="232.15" cy="327.77" r=".48"/>
      <circle cx="230.48" cy="328.88" r=".48"/>
      <rect x="158.39" y="330.07" width=".39" height=".39" transform="translate(-187.09 208.87) rotate(-45)"/>
      <rect x="161.16" y="330.62" width=".39" height=".39" transform="translate(-186.66 210.99) rotate(-45)"/>
      <path d="M176.92,157.28l.25.88c.05.17-.34.99-.34.8l.08-1.68Z"/>
      <path d="M175.81,142.29l.25.88c.05.17-.34.99-.34.81l.08-1.69Z"/>
      <path d="M174.71,166.21s.28.85.26.81c0-.02-.52.45-.65.57-.12.1-.41.16-.34.02l.73-1.4Z"/>
      <polygon points="175.24 164.54 175.24 164.9 175.24 165.27 175.24 165.63 175.24 165.27 175.24 164.9 175.24 164.54"/>
      <polygon points="175.79 162.87 175.8 163.23 175.8 163.6 175.79 163.96 175.79 163.6 175.79 163.23 175.79 162.87"/>
      <polygon points="176.35 145.1 176.35 145.46 176.35 145.84 176.35 146.2 176.35 145.84 176.35 145.46 176.35 145.1"/>
      <polygon points="175.24 140.66 175.24 141.02 175.24 141.39 175.24 141.76 175.24 141.39 175.24 141.02 175.24 140.66"/>
      <rect x="173.93" y="138.51" width=".39" height=".39" transform="translate(-47.08 163.75) rotate(-45)"/>
      <polygon points="167.86 139.96 168.17 139.7 168.73 140.23 168.43 140.5 167.86 139.96"/>
      <rect x="174.49" y="139.62" width=".39" height=".39" transform="translate(-47.7 164.47) rotate(-45)"/>
      <rect x="176.15" y="161.28" width=".39" height=".39" transform="translate(-62.53 171.99) rotate(-45)"/>
      <polygon points="169.69 31.28 169.69 31.64 169.69 32.01 169.69 32.37 169.68 32.01 169.68 31.64 169.69 31.28"/>
      <polygon points="170.24 32.95 170.24 33.31 170.24 33.68 170.24 34.04 170.24 33.68 170.24 33.31 170.24 32.95"/>
      <circle cx="174.41" cy="41.82" r=".48"/>
      <path d="M176.15,41.38l-.29-.87.29.87Z"/>
      <path d="M260.92,101.51c2.47-1.58,4.29-3.72,3.74-6.88-.47-2.7-3.34-3.95-6.24-5.44,1.08-3.39,2.03-6.08.24-8.61-1.62-2.29-4.58-1.68-7.64-2.72-.29-1.98.17-5.03-.37-6.38-.64-1.62-2.84-3.37-4.62-3.31l-3.31.11c-2.81.09-.07-6-3.04-8.74-1.68-1.55-3.74-1.49-6.01-1.24-4.21.46-.4-6.22-4.06-9.3-3.08-2.59-6.32.63-8.14-2.03-.66-.97.64-7.24-2.72-8.13l-5.97-1.58c.12-3.2,2.06-5.89.07-8.4-1.18-1.49-3.64-2.13-6.66-3.02,1.43-3.4,2.46-5.75,1.14-8.3-1.34-2.56-4.34-2.72-7.63-3.37.46-3.59.97-6.38-1.24-8.36-2.48-2.21-5.26-1.59-7.89-.24-.61-3.19-2.67-5.43-5.35-5.55-2.54-.12-4.84,1.4-6.02,4.17-1.87-1.93-4.36-2.91-6.97-2.07-2.38.77-3.3,3.41-3.95,5.72-1.95.55-4.57,1.58-5.51,3.22-1.03,1.78-1.03,3.93-.34,6.04l7.91,24.3c1.35,4.15,5.58,5.32,9.73,3.98-.25,2.92.19,5.22,2.07,6.73,4.61,3.7,9.39-3.13,10.89.29,1.11,2.53,2.53,3.95,5.14,4.21,2.23.22,4.39-1.03,5.69-3.49.81,2.1,1.7,3.79,3.3,4.6,1.71.87,3.65.54,5.8-.32-.72,2.59-.84,5.12.97,6.86,1.54,1.48,3.84,1.79,6.88,2.11-1.44,2.95-2.54,5.54-.92,8.03,1.37,2.11,4.27,2.37,7.32,3.13-1.02,2.38-1.98,4.92-1.21,6.76.97,2.32,3.07,3.67,5.61,3.84-1.37.58-3.33,1.77-3.79,2.99-.63,1.69-.4,3.34.04,5.13-3.85-.48-6.98,2.27-7.03,6-.62.72-2.46,1.3-3.42,1.14-1.58-2.17-3.79-3.13-6.33-2.41-1.92.54-3.34,2.17-4.03,4.67l-4.11,1.04c-1.2-2.7-3.44-3.62-6.01-3.34-2.17.24-3.93,1.78-4.43,4.41l-4.92,1.06c-1.36-2.46-3.53-3.66-6.14-3.15-2.02.39-3.94,2.17-4.66,4.77l-4.9,1.27c-1.54-2.42-3.85-2.99-6.31-2.38-2.14.53-3.27,2.44-3.94,4.69-1.43,4.85-8.1-1.63-11.68,3.7-.96,1.42-1.04,4.38-1.42,6.55-3.17.54-6.37.55-7.72,3.08-1.41,2.64-.81,5.51,1.6,7.57-3.51.75-4.6,3.65-4.57,6.71-39.17.06-78.25,6.43-113.73,22.35-7.99,3.59-16.32,8.06-20.69,15.53-13.97,23.85,18.62,76.89,36.29,97.82,2.94,10.37,9.63,18.11,18.96,24.45,22.84,13.37,47.54,41.94,75.51,31.89,27.91,7.26,63.64,13.71,91.19,6.76,12.51-3.16,20.79-12.71,22.95-25.53,7.53-44.52-17.2-122.42-49.67-156.75l5.14-4.47c2.37,3.16,4.36,4.47,7.21,3.84,2.66-.59,4.48-2.73,4.47-5.85,2.72,1.47,5.16,1.55,7.08.15,2.11-1.55,2.97-4.06,2.29-6.72,2.2.54,4.1.51,5.89-.62,1.3-.82,2.09-3.05,2.54-4.87,2.11.78,4.62.78,6.38-.6,1.58-1.25,2.18-3.51,2.26-5.7,2.82,1.19,5.73.67,7.4-1.34,1.63-1.96,1.29-4.67.58-7.87,3.57.16,6.24-.24,7.79-2.68,1.35-2.13.4-5.03-.59-7.86,3.14-1.38,6.08-2.09,6.93-4.72.98-3.03-.4-5.54-3.07-7.31ZM263.41,94.59c.6,2.03-.34,4.19-2.23,5.13-1.13-1.37-1.59-1.87-1.81-1.6l-1.44,1.74c-2.02-.34-3.21-2.19-3.21-4.99.72-1.23,1.93-2.12,3.92-3.39,2.2-.22,4.16,1.08,4.77,3.11ZM259.9,101.06c-.24.15-1.29.12-1.18-.14l.81-1.8s.61.79.79,1.01c.18.22-.18.77-.43.92ZM258.56,90.03l-1.11.68-1.58-2.6,1.11-.68,1.58,2.6ZM255.01,80.54l.56.81c.06-.14.18-.42.23-.52l-.24-.64c1.78-.48,2.77,2.09,3.15,3.48.89,3.27-2.56,1.92-3.27,3.38-1.25,2.55-3.24,1.19-4.45-.1-1.06-1.14-1.23-3.25-.91-4.55l.57.62c.07-.19.15-.42.19-.54l-.42-.58,2.48-2.14c.62-.53,2.67.05,2.11.79ZM251.4,79.25l-1.11.8-2.39-3.32,1.11-.8,2.39,3.32ZM245.22,69.69l.84-.21c1.84,0,3.32,1.74,3.94,3.1,1.51,3.29-2.31,2.13-2.67,3.77-.64,2.93-3.45,1.73-4.85.42-1.08-1.01-1.63-3.15-.98-4.66.71-1.64,2.18-2.77,3.72-2.42ZM241.84,70.01c-1.42-.4-2.65-1.71-3.3-3.56,1.53.25,2.83,1.55,3.3,3.56ZM235.65,59.53l.29.38.31.35.32.36.51-.29-.49-.46-.29-.27-.38-.39c2.03-.16,3.86,1.41,4.39,3.68.46,1.98-2.06,2.78-3.96,3.79l-.26-.17-.35-.25-.44-.32c-.11.02-.28.04-.46.07l.6.55.29.27,1.62.64c-3.61.96-4.53.63-5.93-3.29-.17-2.62,1.78-4.67,4.22-4.66ZM232.48,59.24l-.8.79-3.16-3.18.8-.79,3.16,3.18ZM224.52,49.24c2.53-.95,4.73.39,5.76,2.49,1.49,3.03-1.45,2.96-3.03,5.62-1.03,1.74-4.78-.45-5.35-2.24-.74-2.31.24-4.98,2.63-5.87ZM222.44,49.65c-1.84-.02-2.93-1.33-3.7-3.03,1.63.48,2.79,1.09,3.7,3.03ZM214.22,49.07c1.73.05,4.03-.42,5.14.16,1.68.88,1.43,3.04,1.32,6.05l-4.75-.71c-1.44-1.22-2-3.19-1.36-4.96-1.11-.86-.83-.64-.35-.55ZM217.95,39.6c1.51.69,3.55,4.11,1.7,5.33-2.19,1.44-2.64,3.95-4.95,2.97-2.85-1.21-3.78-3.69-2.84-6.17l.59,1.12v-1.04s-.26-.29-.26-.29c.94-2.06,3.41-2.98,5.75-1.91ZM213.09,38.85c-2.3.19-2.95-1.77-2.72-3.47l2.72,3.47ZM212.53,31.31c1.25,3.37-2.17,2.89-3.24,4.14-.73,2.91-3.68.44-4.55-.58-1.17-1.35-1.14-5,.31-4.29.53-2.54,1.76-2.87,3.1-2.84,3.41.07,3.9,2.3,4.37,3.57ZM206.42,27.13c-1.86-.11-3-1.9-2.09-3.98l2.09,3.98ZM203.04,16.35l.83-.11c1.95.24,2.96,2.59,3.13,4.46.3,3.37-2.67,1.02-3.79,2.38-1.14,3.18-3.54.92-4.4-.45-1.03-1.64-.98-3.51.24-5.17.85-1.17,2.62-1.86,3.99-1.11ZM199.37,15.39c-.39.03-1.16-.26-1.27-.57l-.83-2.29,1.42.86c.34.21,1.07,1.97.68,2ZM191.93,6.47c1.24-.94,3.7-1.44,5.13-.42,1.86,1.32,2.66,3.69,1.8,5.61l-1.88-.16c-.47-.04-.88,1.18-.99,1.95-1.08,1.77-3.81.39-4.76-.98-1.23-1.78-1.43-4.39.69-6ZM182.38,1.76c2.5-1.49,5.93-.19,6.82,2.69l-2.01,1.25c-.54.33.56,2.03,1.15,2.57-1.22,2.42-5.09,2.48-6.73.51-1.9-2.27-1.52-5.65.77-7.01ZM190.08,6.22l-.51,1.52-1.7-.58.51-1.52,1.7.58ZM173.09,3.04c2.05-.46,4.26.28,5.23,2.37.86,1.86.58,4.88-2.17,5.72-1.51-1.7-3.36-3.71-6.47-3.21-.05-2.33,1.28-4.4,3.42-4.88ZM172.54,9.54c2.47,1.69,3.62,3.99,4.01,6.89-1.77-2.11-3.02-4.2-4.01-6.89ZM177.98,18.91c-2.7,3.67-3.66,7.88-.76,10.92l-.43.55c-3.04-.83-6.36-2.21-7.24-5.16-1.07-3.6,1.59-5.64,3.89-10.45l4.54,4.14ZM171.13,40.05l-8.42-26.26c.39-2.08,2.8-3.99,4.07-4.29,2.83-1.22,4.43-.2,4.88,2.1,2.89,5.25-5.5,7.48-2.71,14.77,2.27,5.94,10.85,1.91,10.62,12.83l-3.71,1.3,1.83.47c.15.04-.64.22-.79.25l-.75.15-1.54,1.75c-.6.69,1.99-.89,3.51,1.11-3.1,1.66-5.99-1.08-6.99-4.2ZM181.9,35.41l.59-.16c1.09,2.05,2.13,7.75-1.85,7.15-1.81-2.36,1.99-4.43,1.27-6.99ZM180.75,36.23c-1.05-2.27-1.95-4.18-2.78-5.25l.16-.23c.55.21,2.87.88,2.83,1.69l-.21,3.79ZM177.4,42.02c1.46-.3,2.78-.02,2.92.67l.6,2.96-3.52-3.63ZM183.26,51.52c-1.85-1.22-2.54-3.36-1.86-5.23.61-1.68,3.01-3.13,4.83-2.88,1.98.28,3.76,2.67,3.6,4.46l-1.85.71c-.4.15-.09,1.34.25,2.28-.37,1.9-3.64,1.54-4.97.66ZM192.68,50.6l-3.85-.62.05-.95,4.45.7-.64.87ZM200.96,54.91c-2.82,1.28-5.25.23-6.02-1.3-1.42-2.83-.75-5.54,1.89-6.62,2.11-.87,5.58.16,5.52,2.68-.05,2.23.18,4.53-1.39,5.24ZM199.57,45.67c-3.07-.58-4.61,1.44-7.61,3.54-1.4-4.81-3.89-7.65-7.92-6.93,1.08-3.81,0-7.95-1.75-11.15-11.9-3.76-.19-8.83-5.42-18.48l3.08-4.2c.95,1.17,2.87,2.68,4.29,2.7,1.72.02,3.59-.98,4.99-2-.11,2.05.65,4.31,2.39,5.29,1.61.91,3.89.82,6.71,1-.99,2.99-1.89,5.29-.56,7.73,1.05,1.93,3.79,2.5,6.77,3.44-1.03,3.16-2.86,5.4-1.24,8.26,1.31,2.31,4.5,2.59,7.78,3.87-.27,3.04-1.57,6.42.52,8.32l-.31.41c-2.5-.57-5.17-.16-6.94,2.82-1.28-2.3-2.75-4.22-4.79-4.6ZM207.64,56.8c-1.31-.58-2.53-2.39-2.33-3.8l.87.16.21.28.34.39c.09-.03.33-.11.53-.18l-.62-.46-.32-.24-.53-.34c-1.72-2.31,1.59-4.37,3.47-4.31,2.96.09,5.19,2.82,4.45,5.16-.82-.27-2.35-.35-2.35.13,0,.59.23,1.54.54,2.61-.4.95-2.81,1.26-4.27.61ZM212.09,54.82l.85-.77,1.89,2.09-.85.77-1.89-2.09ZM218.9,64.56c-.98,1.34-3.99-.43-4.5-1.5-1.61-2.38-.74-4.3.49-5.65,1.51-1.64,3.98-1.52,5.5-.64,1.77,1.02,2.87,3.75,1.36,5.63-.46.58-2.76-.63-2.85,2.17ZM219.98,64.37l.95-.71,1.84,2.48-.95.71-1.84-2.48ZM220.41,71.24c.17-2.1,1.77-4.36,4.23-4.09l.29.5c.06.1.17.22.26.28l.53.33c.09,0,.2.01.33.02l-.45-.7-.37-.28-.26-.29c2.33-.11,3.91,2,4.28,4.47.4,2.68-2.18,2.75-4.71,4.02-2.06,1.04-4.3-1.85-4.11-4.27ZM227.19,75.96c-.08-.14.82.11.86.27.06.24.09,1.3-.04,1.09l-.82-1.36ZM231.4,85.51c-2.24,3.07-5.06-1.47-4.58-3.74.57-2.69,2.86-4.58,5.25-3.21l.6.13c2.33-.05,2.99,2.37,2.91,4.73-.12,3.77-2.7.2-4.19,2.09ZM233.29,85.98l-.04,1.64c0,.19-.91.49-.92.3l-.11-1.97c0-.19,1.07-.15,1.07.04ZM229.36,90.97c.91-1.45,3.3-2.16,4.76-1.71,2.06.63,3.26,2.69,3.16,4.72-.22,2.18-1.98,3.86-3.81,3.62.26-1.1-.24-1.74-.96-1.98-.83-.27-1.73.05-2.23.79-2.71-1.23-1.96-3.77-.92-5.43ZM232.22,97.13l-.59,1.1c-.09.17-.76.06-.69-.12l.71-1.75c.07-.17.66.6.57.77ZM225.86,97.47c1.54-.25,4.03,1.15,4.72,2.51.98,1.97-.04,4.73-1.52,5.67-1.96,1.24-4.88.95-5.58-.88,1.66-1.8-.29-2.39-1.24-2.72-.88-2.18,1.61-4.27,3.62-4.59ZM222.9,102.91l.43,1-4.74,1.87-.54-.83,4.85-2.03ZM212.9,101.84c2.16.34,4.63,1.97,4.21,4.76-.25,1.66-1.25,3.45-2.65,4.1-1.55.65-3.38.21-4.61-1.27-.81-3.78-.7-2.7-.4-4.63-1.74-1.01,1.9-3.21,3.46-2.96ZM203.62,107.64l2.1-.59,1.72-.49c.42-.12,1.14,1.32.71,1.42l-2.05.46-1.98.32c-.4.07-.88-1.02-.5-1.12ZM197.32,104.53c2.97.34,3.8,1.71,4.89,4.12.06,2.51-1.75,4.46-4.08,4.59-2.33.13-4.35-1.6-4.58-3.93-.23-2.33,1.42-4.41,3.77-4.79ZM188.24,109.73l1.91-.48,1.72-.44c.41-.1,1.04,1.17.65,1.32-.39.15-1.61.42-2.08.45l-2.38.16c-.28.02-.11-.94.18-1.01ZM180.71,107.24c3.66-.85,3.69.57,5.87,2.76.64,2.5-.66,4.83-2.9,5.52-2.24.69-4.62-.5-5.42-2.7-.8-2.2.27-4.64,2.45-5.58ZM176.89,111.45l.37,1.3-4.63,1.3-.37-1.3,4.63-1.3ZM168.47,110.37c2.46.64,3.26,3.34,3.1,5.06-.26,2.88-2.91,4.15-5.21,3.73-2.56-.47-2.92-2.87-2.87-4.88l-.22-.79c.43-2.61,3.2-3.64,5.2-3.12ZM159.65,116.85l2.4-1.07c.26.29.68.99.4,1.14l-2,1.06c-.7.37-1.51-.81-.8-1.13ZM162.02,118.3c2.17.44,4.49,3.54,8.16,1.31,1.17-.71,2.12-2.37,2.81-4.5l4.6-1.1c1.54,2.14,3.51,3.11,5.89,2.73,2.03-.33,3.81-1.74,4.4-4.57l4.95-.76c1.46,2.34,3.29,3.27,5.65,3.05,2.26-.21,4.08-1.73,4.86-4.44,1.25-.38,3.41-.61,4.73-.51,1.66,1.9,3.45,2.92,5.96,2.4,1.91-.4,3.61-2.21,4.27-4.6,1-.78,3.26-1.55,4.44-1.27,2.1,1.73,4.99,1.98,7.09.38,2.09-1.59,2.64-4.25,2.18-7.22,3.59.3,5.87-1.85,6.38-4.87.49-2.88-1.3-4.96-4.42-6.69,2.82-2.44,3.37-5.12,2.13-7.81-1.14-2.47-4.04-3.03-7.31-3.24.92-2.79,2.1-5.54.96-7.59-1.41-2.55-3.62-3.24-7.1-3.48l1.04-6.92c3.56.29,5.84-.57,7.23,2.41-.55,1.82-.62,4.05.33,5.77,3.32,4.07,6.71.97,8.68,3.15,1.16,1.29-1.07,6.84,2.77,8.41,1.77.72,4.38.7,6.93,1.18-.39,2.98-1.38,5.35-.06,7.36,1.41,2.16,3.77,2.58,6.9,3.17-1.71,2.25-3.08,4.03-2.81,6.41.24,2.12,2.13,3.85,4.13,5.05-2.3.61-4.18,1.99-4.63,3.96-.48,2.09.66,4.27,1.98,6.86-2.97.68-5.52,1.03-6.93,2.99-1.47,2.04-.73,4.46.12,7.37-2.65.21-4.94.15-6.43,1.18-1.77,1.22-2.65,3.36-2.62,5.75-1.87-.68-4.09-.94-5.97.12-1.59.9-2.6,3.08-2.88,5.34-2.15-1.08-4.76-1.1-6.81.49-1.62,1.26-2.34,3.66-1.42,6.34-2.27-.62-4.31-.54-6.07.73-1.59,1.14-2.35,3.28-2.48,5.16-1.97-1.16-3.99-1.76-6.03-1-1.59.59-2.79,2.64-4.29,4.77-1.28-2.5-2.74-4.41-4.64-5-2.57-.8-4.31.41-6.66,2.42-.02-2.97-.91-5.02-2.93-6.12-2.29-1.25-4.98-1.08-6.84,1.17-1.06-2.8-2.64-4.56-5.45-5.24-1.42-2.9-4.25-5.16-7.32-3.95-2.71,1.07-4.72,3.94-5.09,8.4l-15.41-1.36c.47-2.67-.59-4.88-2.26-6.08,1.72-.75,3.88-2.17,4.23-3.56.5-1.97-.06-4.16-.4-6.56,2.77.77,4.95,1.16,6.7.26,4.24-2.16,1.79-8.29,4.78-7.68ZM192.79,150.09c0,.34-.28.62-.62.62s-.62-.28-.62-.62.28-.62.62-.62.62.28.62.62ZM190.18,150.07l-7.8-3.18c.01-3.01,2.96-4.22,5.08-3.49,2.65.91,4.02,3.27,2.72,6.68ZM169.99,140.52l-1.18,3.08c-.27.71-2.38.34-3.02-.09-.86-.57,1.18-7.25,5.03-7.5,10.66-.67,9.14,39.5.8,32.22-1.84-1.61,6.49-16.71-1.63-27.71ZM170.17,163.98c-.42-.97.07-1.98,1.31-2.71l-1.31,2.71ZM170.57,143.51c0,.3-.25.55-.55.55s-.55-.25-.55-.55.25-.55.55-.55.55.25.55.55ZM178.48,163.9c.85,1.08,1.74,2.74,1.43,3.48-.37.88-1.96,1.77-3.47,2.1l2.04-5.58ZM179.41,163.82c-.24-.35-.45-1.56-.41-2.64.38.1,1.27.78,1.34,1.12l.44,2.07c.07.34-1.18-.27-1.37-.55ZM177.57,140.15c2.3,1.18,4.49,3.57,1.89,6.49l-1.89-6.49ZM152.73,116.92c1.92-.96,4.09-.29,5.26,1.17,1.36,1.68,1.23,4.31,0,5.8-1.31,1.58-4.23,2.56-5.7.8.11-.83.34-2-.03-2.15l-1.99-.8c-.67-1.68.82-4.01,2.46-4.82ZM150.75,122.92l.94.92-2.26,2.3-.94-.92,2.26-2.3ZM141.89,127.86c.93-1.75,5.4-3.39,3.46-.8,2.01-.78,3.95.02,4.76,1.69.86,1.78.14,3.93-1.56,4.74-1.65,2.71-3.27-.13-4.72-1.41-3.61.63-3.07-2.1-1.94-4.23ZM144.41,133.64l-.29.98c-.07.23-.63-.38-.97-.83.62-.2,1.33-.38,1.26-.15ZM141,137.22c1.73-.67,2.8-1.73,3.85-1.1,3.1,1.26,3.49,3.28,2.92,5.79l-8.14-.64c-1.39-.84-.23-3.43,1.37-4.05ZM61.87,302.38c-7.3-4.79-14.61-10.55-18.13-18.61l.46-.37c4.81,7.17,12.04,12.25,18,18.56l-.33.42ZM78.52,314.09c-31.85-24.8-57.25-58.49-72.04-95.8l.47-.36c17.47,42.04,59.25,94.13,102.19,110.64,12.8,4.92,25.29,2.49,35.35-7.12,11.64-11.57,21.19-25.19,29.46-39.67,12.28-21.65,20.39-44.6,26.52-68.37-7.6,38.7-27.95,84.41-56.16,111.78-20.04,19.44-46.22,4.13-65.78-11.09ZM6.16,216.44l.28-.27.3,1.37-.26.28-.32-1.39ZM136.39,332.81c1.55-2.03,3.63-1.9,6.04-1.33,27.33,6.46,88.07,17.62,102.48-9.82-10.57,32.52-80.21,18.68-108.52,11.15ZM248.22,302.62c-.33,10.25-2.99,20.27-10.65,26.63-19.53,16.22-71.29,7.42-96.97.99,26.44-22.41,45.03-60.21,54.96-91.76.04.01.07.01.11.02.08-.51.19-1.02.38-1.51.06-.68.18-1.37.4-1.98.04-.1.08-.21.11-.31.02-.65.23-1.4.56-2.07.05-.17.12-.33.19-.49.09-.77.38-1.53.79-2.28.03-.15.04-.29.08-.44,0-.03,0-.05.01-.07.12-.31.21-.63.27-.96,0-.18-.02-.36,0-.55.19-1.37.89-2.56,1.26-3.82.23-.79.41-1.56.57-2.32-.01-.45.03-.91.11-1.36.04-1,.28-1.89.71-2.7.06-.8.29-1.58.58-2.32,2.74-16.94,5.7-32.17,1.09-50.51,27.79,34.32,46.79,94.57,45.42,137.8ZM200.71,212.27l.08-1.69.25.88c.05.17-.34.99-.34.81ZM203.33,178.39c-1.97,49.79-22.83,101.09-55.79,138.8-12.23,13.99-27.81,16.21-43.87,8.2-26.68-13.31-49.26-34.76-67.28-58.9-14.87-19.92-27.41-41.52-33.81-65.39-5.72-21.34,9.03-31.03,27.97-38.48,44.41-17.48,93.44-23.65,140.81-16.99.97,4.85,1.07,9.38.49,13.73-4.33,2.25-4.12,6.49-1.61,9.22,2.75,2.99,7.13,3.02,9.94.41,2.98-2.77,2.32-7.23-.86-9.86l.08-11.22c14.72,2.65,24.57,14.23,23.92,30.49ZM199.02,156.39c-.61.55-7.02-3.44-5.07-7.11.71-1.34,2.54-2.29,4.26-1.73,1.22.4,2.38,1.69,2.84,3.18l.08.78c.44,1.36-.71,3.64-2.11,4.89ZM203.61,153.37c-.98.02-1.62-.79.2-1.37.35-.11,1.95.36,1.77.68-.22.39-1.25.68-1.97.7ZM210.98,156.4c-1.66.52-4.57-.11-4.83-2.34l.47.25,1-.06-1.03-.62c.11-1.05.05-2.64-.99-2.87.11-1.79,2.21-3.34,4.53-3.13,1.92.18,3.88,1.66,4.15,4.34.16,1.62-1.02,3.73-3.3,4.44ZM214.77,149.71l1.36-1.16.92,1.08-1.36,1.16-.92-1.08ZM223.68,148.47c-.79,2.76-3.98,4.25-6.68,2.97l.74-2.73c.18-.65-2.11-.91-2.85-.97-.58-2.56,2.05-5.32,4.72-5.13,2.94.21,4.92,2.9,4.07,5.86ZM224.12,143.38c-.42,0-.76-.34-.76-.77s.34-.76.76-.76.77.34.77.76-.34.77-.77.77ZM225.98,144.04l-.53-2.63c-.08-.37-1.47-.38-2.52-.35-.87-2.36,1-5.55,3.87-5.66,2.96-.11,5.1,1.87,5.2,4.7.11,3.17-3.94,5.26-6.01,3.94ZM232.95,137.39c-.07.23-.63-.38-.97-.83.62-.2,1.33-.38,1.26-.15l-.29.98ZM239.43,137.66c-1.41,1.59-4.36,2.11-5.67.46.25-.93.63-2.22.25-2.37l-2.4-.94c-.07-1.65,1.25-3.99,2.81-4.5,1.99-.64,4.63.38,5.52,1.76,1.2,1.84.67,4.25-.51,5.59ZM241.01,132.15l-.18-1.58,1.57-.18.18,1.58-1.57.18ZM249.05,130.09c-.96,2.34-3.55,3.41-5.79,2.46l.28-2.55c.06-.55-1.9-.52-2.93-.43-.42-1.16-.08-2.67,1.12-4.4.91-.68,2.27-1.19,4.05-1.02l-2.57,2.49,3.34-2.13c1.88.34,3.2,3.24,2.5,5.58ZM250.47,122.69l-1.31,1.66c-.24.31-1.05-.9-.77-1.16l2.08-1.96c.24-.1.24,1.16,0,1.47ZM256.62,120.52c-.73,1.43-3.56,3.11-4.95,2.22.21-1.08.4-2.42,0-2.4l-2.49.18c-1.41-1.11-1.1-4.33.88-5.54,1.31-.8,3.23-.54,5.3.08,1.69,1.38,2.18,3.65,1.26,5.46ZM257.47,111.88l-1.38,1.67c-.23.28-.65-1.17-.44-1.41l1.77-2c.13.7.26,1.47.04,1.73ZM259.06,111.29l-1.09-1.91c-.2-.35-1.04-.13-2.17.48-1.97-.41-2.12-3.46-.99-5.17.99-1.5,3.28-2.41,5.19-2.02,1.83.37,3.32,2.65,3.22,4.34-.12,2.22-2.22,4.31-4.17,4.28Z"/>
      <polygon points="177.49 30.1 176.97 30.55 177.42 30.79 177.81 30.42 177.49 30.1"/>
      <path d="M181.78,35.2l.34-1.23-.34,1.23Z"/>
      <path d="M212.15,47.53l-.54.24.54-.24Z"/>
      <path d="M213.86,48.64l-.58.23.58-.23Z"/>
      <rect x="203.36" y="51.34" width=".39" height=".39" transform="translate(23.18 159.03) rotate(-45)"/>
      <rect x="181.15" y="146.29" width=".39" height=".39" transform="translate(-50.46 171.13) rotate(-45)"/>
      <rect x="4.59" y="212.36" width=".39" height=".39" transform="translate(-148.9 65.64) rotate(-45)"/>
      <polygon points="5.34 213.4 5.33 213.76 5.33 214.13 5.34 214.49 5.34 214.13 5.34 213.76 5.34 213.4"/>
      <path d="M5.9,215.23l-.03.85.03-.85Z"/>
      <path d="M43.76,282.71l-.24.71.24-.71Z"/>
      <polygon points="62.52 302.23 62.13 302.55 62.49 302.84 62.82 302.49 62.52 302.23"/>
      <path d="M63.23,302.83l-.29.37.29-.37Z"/>
      <path d="M201.06,150.73c.07.05.18.59.08.78l-1.5-.77c-.26-.13.23-.81.45-.66l.97.66Z"/>
      <polygon points="163.49 114.28 163.27 113.49 164.88 112.39 163.49 114.28"/>
      <polygon points="203.04 16.35 203.87 16.24 203.83 16.56 204.26 16.97 203.96 17.25 203.55 16.85 203.04 16.35"/>
      <path d="M232.07,78.56l.6.13-.6-.13Z"/>
      <path d="M245.22,69.69l.84-.21-.03.37.39.42c.89.13.6.23-.03.28l-.64-.41-.52-.45Z"/>
      <rect x="170.6" y="34.69" width=".39" height=".39" transform="translate(25.36 130.99) rotate(-45)"/>
      <rect x="168.93" y="29.69" width=".39" height=".39" transform="translate(28.41 128.35) rotate(-45)"/>
      <rect x="168.38" y="28.02" width=".39" height=".39" transform="translate(29.42 127.47) rotate(-45)"/>
      <rect x="167.27" y="24.69" width=".39" height=".39" transform="translate(31.45 125.71) rotate(-45)"/>
      <rect x="166.71" y="23.03" width=".39" height=".39" transform="translate(32.47 124.82) rotate(-45)"/>
      <rect x="166.16" y="21.36" width=".39" height=".39" transform="translate(33.48 123.94) rotate(-45)"/>
      <rect x="165.6" y="19.69" width=".39" height=".39" transform="translate(34.5 123.06) rotate(-45)"/>
      <rect x="173.93" y="16.36" width=".39" height=".39" transform="translate(39.29 127.98) rotate(-45)"/>
      <circle cx="182.49" cy="108.17" r=".64"/>
      <path d="M180.06,108.64c.11-.11,1.1-.06.97.02l-.74.41-.67.37c-.2.11.27-.62.44-.8Z"/>
      <polygon points="179.13 112.34 179.4 112.61 179.13 112.89 178.76 112.61 179.13 112.34"/>
      <rect x="182.82" y="114.64" width=".39" height=".39" transform="translate(-27.6 163.04) rotate(-45)"/>
      <rect x="209.47" y="149.62" width=".39" height=".39" transform="translate(-44.53 192.13) rotate(-45)"/>
      <rect x="210.58" y="149.62" width=".39" height=".39" transform="translate(-44.2 192.92) rotate(-45)"/>
      <polygon points="222.88 53.46 222.97 52.56 223.57 53.5 223.65 54.02 222.88 53.46"/>
      <rect x="226.12" y="56.34" width=".39" height=".39" transform="translate(26.31 176.59) rotate(-45)"/>
      <rect x="224.46" y="55.23" width=".39" height=".39" transform="translate(26.61 175.09) rotate(-45)"/>
      <rect x="226.68" y="49.68" width=".39" height=".39" transform="translate(31.18 175.03) rotate(-45)"/>
      <circle cx="198.04" cy="105.95" r=".64"/>
      <polygon points="199.2 112.06 199.58 112.06 199.94 112.06 199.58 112.06 199.2 112.06 198.84 112.06 199.2 112.06"/>
      <rect x="200.03" y="110.2" width=".39" height=".39" transform="translate(-19.42 173.91) rotate(-45)"/>
      <rect x="198.36" y="110.75" width=".39" height=".39" transform="translate(-20.3 172.9) rotate(-45)"/>
      <rect x="195.03" y="110.2" width=".39" height=".39" transform="translate(-20.88 170.38) rotate(-45)"/>
      <polygon points="228.08 136.48 228.45 136.47 228.81 136.48 228.45 136.48 228.08 136.49 227.72 136.49 228.08 136.48"/>
      <path d="M227.04,136.93l-2.06,1.93,2.06-1.93Z"/>
      <circle cx="229.93" cy="140.65" r=".48"/>
      <rect x="227.79" y="141.84" width=".39" height=".39" transform="translate(-33.66 202.81) rotate(-45)"/>
      <path d="M211.25,108.73l1.12-.24c.19-.04,1,.19.83.24l-.86.24c-.18.05-1.27-.2-1.08-.24Z"/>
      <polygon points="211.42 103.73 211.79 103.73 212.15 103.73 211.79 103.73 211.42 103.73 211.06 103.73 211.42 103.73"/>
      <path d="M215.97,107.51s-.21.28-.35.43l-.51.55c-.12.13-.86-.31-.71-.37l1.57-.61Z"/>
      <path d="M166.24,117.04s1.03-.21,1.25-.26c.17-.04.1.63-.08.58-.26-.07-1.18-.32-1.17-.32Z"/>
      <polygon points="165.89 112.06 166.26 112.06 166.62 112.06 166.26 112.06 165.89 112.06 165.53 112.06 165.89 112.06"/>
      <rect x="168.38" y="111.31" width=".39" height=".39" transform="translate(-29.47 151.86) rotate(-45)"/>
      <polygon points="170.8 115.11 171.11 115.39 170.8 115.67 170.52 115.39 170.8 115.11"/>
      <rect x="168.93" y="116.3" width=".39" height=".39" transform="translate(-32.84 153.72) rotate(-45)"/>
      <rect x="221.13" y="72.44" width=".39" height=".39" transform="translate(13.46 177.77) rotate(-45)"/>
      <polygon points="222.84 73.34 223.14 73.06 223.67 73.6 223.4 73.9 222.84 73.34"/>
      <polygon points="224.65 74.58 224.93 74.86 224.65 75.18 224.38 74.86 224.65 74.58"/>
      <polygon points="226.41 98.73 226.78 98.73 227.14 98.73 226.78 98.74 226.41 98.74 226.05 98.73 226.41 98.73"/>
      <path d="M227.62,103.61c-.03.06-.18.31-.3.43l-.54.56c-.12.12-.86-.31-.7-.37l1.54-.62Z"/>
      <rect x="228.9" y="104.09" width=".39" height=".39" transform="translate(-6.64 192.54) rotate(-45)"/>
      <path d="M229.84,101.97l-1.51,1.35,1.51-1.35Z"/>
      <rect x="223.35" y="100.76" width=".39" height=".39" transform="translate(-5.91 187.64) rotate(-45)"/>
      <path d="M220.3,144.12l-2.6,1.36c.5-.38.71-.5,2.6-1.36Z"/>
      <rect x="216.13" y="146.29" width=".39" height=".39" transform="translate(-40.22 195.87) rotate(-45)"/>
      <circle cx="222.73" cy="147.88" r=".48"/>
      <rect x="220.57" y="149.06" width=".39" height=".39" transform="translate(-40.88 199.82) rotate(-45)"/>
      <rect x="206.69" y="34.13" width=".39" height=".39" transform="translate(36.32 156.34) rotate(-45)"/>
      <rect x="205.58" y="32.46" width=".39" height=".39" transform="translate(37.18 155.07) rotate(-45)"/>
      <polygon points="209.66 28.47 209.94 28.77 209.66 29.05 209.39 28.77 209.66 28.47"/>
      <polygon points="235.85 137.04 236.22 137.04 236.58 137.04 236.22 137.05 235.85 137.05 235.49 137.04 235.85 137.04"/>
      <polygon points="236.96 131.49 237.33 131.49 237.69 131.49 237.33 131.5 236.96 131.5 236.6 131.49 236.96 131.49"/>
      <rect x="235.56" y="131.85" width=".39" height=".39" transform="translate(-24.32 205.38) rotate(-45)"/>
      <circle cx="234.37" cy="132.88" r=".48"/>
      <circle cx="237.7" cy="136.21" r=".48"/>
      <rect x="259.99" y="108.53" width=".39" height=".39" transform="translate(-.67 215.83) rotate(-45)"/>
      <rect x="260.55" y="107.42" width=".39" height=".39" transform="translate(.27 215.89) rotate(-45)"/>
      <polygon points="257.41 103.22 257.69 103.73 257.41 104.01 257.14 103.73 257.41 103.22"/>
      <path d="M154.68,117.43l-3.59,2.57c.84-1.09,1.1-1.44,3.59-2.57Z"/>
      <polygon points="150.81 120.66 151.09 120.94 150.81 121.37 150.47 120.94 150.81 120.66"/>
      <path d="M158.21,120.85l-1.51,1.35,1.51-1.35Z"/>
      <circle cx="157.19" cy="123.44" r=".48"/>
      <rect x="155.61" y="124.08" width=".39" height=".39" transform="translate(-42.24 146.57) rotate(-45)"/>
      <rect x="153.94" y="124.63" width=".39" height=".39" transform="translate(-43.12 145.55) rotate(-45)"/>
      <polygon points="213.41 45.03 213.7 44.73 214.11 45.15 214.38 45.43 214.66 45.71 214.93 45.99 215.21 46.27 215.49 46.54 215.91 46.94 215.62 47.25 215.21 46.82 214.94 46.54 214.66 46.26 214.39 45.98 214.11 45.71 213.83 45.43 213.41 45.03"/>
      <rect x="212.8" y="43.57" width=".39" height=".39" transform="translate(31.44 163.43) rotate(-45)"/>
      <polygon points="216.19 40.03 216.47 39.73 217.03 40.29 216.73 40.56 216.19 40.03"/>
      <rect x="228.9" y="82.99" width=".39" height=".39" transform="translate(8.28 186.36) rotate(-45)"/>
      <polygon points="229.49 84.44 229.8 84.17 230.36 84.71 230.06 84.98 229.49 84.44"/>
      <polygon points="216.17 62.23 216.47 61.97 216.88 62.36 217.16 62.64 217.44 62.91 217.73 63.18 218.06 63.49 218.11 64.07 217.44 63.46 217.16 63.2 216.88 62.92 216.6 62.65 216.17 62.23"/>
      <rect x="215.02" y="60.23" width=".39" height=".39" transform="translate(20.31 169.88) rotate(-45)"/>
      <polygon points="219.05 57.37 219.01 56.78 219.82 57.5 219.51 57.77 219.05 57.37"/>
      <rect x="232.23" y="64.67" width=".39" height=".39" transform="translate(22.21 183.35) rotate(-45)"/>
      <rect x="232.79" y="63.56" width=".39" height=".39" transform="translate(23.16 183.42) rotate(-45)"/>
      <polygon points="232.43 62.37 232.7 62.64 232.43 62.92 232.07 62.64 232.43 62.37"/>
      <rect x="194.48" y="12.48" width=".39" height=".39" transform="translate(48.06 141.37) rotate(-45)"/>
      <polygon points="191.75 10.6 192.05 10.32 192.45 10.73 192.73 11.01 193 11.29 193.28 11.56 193.71 11.97 193.41 12.25 193.01 11.84 192.73 11.56 192.45 11.28 192.17 11.01 191.75 10.6"/>
      <rect x="191.14" y="9.14" width=".39" height=".39" transform="translate(49.44 138.03) rotate(-45)"/>
      <rect x="194.48" y="6.37" width=".39" height=".39" transform="translate(52.38 139.58) rotate(-45)"/>
      <polygon points="200.62 22.26 200.93 21.99 201.38 22.39 201.43 22.95 200.62 22.26"/>
      <rect x="200.03" y="20.8" width=".39" height=".39" transform="translate(43.79 147.73) rotate(-45)"/>
      <rect x="247.78" y="127.96" width=".39" height=".39" transform="translate(-17.99 212.88) rotate(-45)"/>
      <rect x="245" y="130.74" width=".39" height=".39" transform="translate(-20.77 211.73) rotate(-45)"/>
      <rect x="241.67" y="127.96" width=".39" height=".39" transform="translate(-19.78 208.56) rotate(-45)"/>
      <rect x="142.84" y="129.63" width=".39" height=".39" transform="translate(-49.91 139.17) rotate(-45)"/>
      <rect x="148.39" y="129.63" width=".39" height=".39" transform="translate(-48.28 143.09) rotate(-45)"/>
      <rect x="142.28" y="130.74" width=".39" height=".39" transform="translate(-50.85 139.1) rotate(-45)"/>
      <circle cx="147.2" cy="131.77" r=".48"/>
      <rect x="250.55" y="116.3" width=".39" height=".39" transform="translate(-8.94 211.43) rotate(-45)"/>
      <rect x="255.55" y="117.41" width=".39" height=".39" transform="translate(-8.26 215.29) rotate(-45)"/>
      <rect x="249.44" y="118.53" width=".39" height=".39" transform="translate(-10.83 211.29) rotate(-45)"/>
      <rect x="255" y="118.53" width=".39" height=".39" transform="translate(-9.2 215.22) rotate(-45)"/>
      <polygon points="181.84 47.91 181.79 47.33 182.45 47.95 182.73 48.21 183.01 48.48 183.29 48.76 183.72 49.17 183.42 49.43 183.01 49.04 182.73 48.77 182.45 48.49 182.17 48.22 181.84 47.91"/>
      <rect x="188.37" y="46.9" width=".39" height=".39" transform="translate(21.93 147.13) rotate(-45)"/>
      <polygon points="186.74 46.13 187.05 45.86 187.61 46.4 187.31 46.67 186.74 46.13"/>
      <rect x="185.59" y="45.23" width=".39" height=".39" transform="translate(22.29 144.68) rotate(-45)"/>
      <rect x="184.48" y="44.68" width=".39" height=".39" transform="translate(22.36 143.73) rotate(-45)"/>
      <path d="M251.2,84.55l.09-.9.63,1.08c.09-.18-.1.2-.17.33l-.56-.51Z"/>
      <polygon points="257.41 84.58 257.42 84.99 257.42 85.41 257.41 85.83 257.41 85.41 257.41 84.99 257.41 84.58"/>
      <path d="M252.79,86.67l.34-.27.51.54c.94.14.63.24-.03.28l-.82-.54Z"/>
      <rect x="256.66" y="82.99" width=".39" height=".39" transform="translate(16.41 205.99) rotate(-45)"/>
      <polygon points="235.2 92.36 235.21 92.72 235.21 93.09 235.2 93.45 235.2 93.09 235.2 92.72 235.2 92.36"/>
      <rect x="234.45" y="95.21" width=".39" height=".39" transform="translate(1.27 193.86) rotate(-45)"/>
      <rect x="235.01" y="90.76" width=".39" height=".39" transform="translate(4.57 192.96) rotate(-45)"/>
      <polygon points="209.2 54.87 209.57 54.87 209.93 54.87 209.57 54.87 209.2 54.87 208.84 54.87 209.2 54.87"/>
      <rect x="207.8" y="54.12" width=".39" height=".39" transform="translate(22.51 162.98) rotate(-45)"/>
      <rect x="210.58" y="50.79" width=".39" height=".39" transform="translate(25.68 163.97) rotate(-45)"/>
      <rect x="209.47" y="50.23" width=".39" height=".39" transform="translate(25.75 163.02) rotate(-45)"/>
      <rect x="208.36" y="49.68" width=".39" height=".39" transform="translate(25.82 162.08) rotate(-45)"/>
      <polygon points="247.27 71.67 247.57 71.4 248.11 71.93 247.83 72.23 247.27 71.67"/>
      <rect x="242.23" y="73" width=".39" height=".39" transform="translate(19.25 192.86) rotate(-45)"/>
      <polygon points="242.84 74.45 243.12 74.16 243.53 74.58 243.81 74.86 244.09 75.14 244.37 75.41 244.65 75.69 244.93 75.96 245.24 76.26 245.28 76.84 244.65 76.23 244.37 75.97 244.09 75.69 243.81 75.41 243.53 75.14 243.25 74.86 242.84 74.45"/>
      <polygon points="242.85 76.12 243.12 75.82 243.68 76.38 243.38 76.66 242.85 76.12"/>
      <polygon points="246.31 76.8 246.68 77.08 246.31 77.4 246.03 77.08 246.31 76.8"/>
      <rect x="198.36" y="149.62" width=".39" height=".39" transform="translate(-47.78 184.28) rotate(-45)"/>
      <rect x="197.25" y="154.62" width=".39" height=".39" transform="translate(-51.64 184.96) rotate(-45)"/>
      <circle cx="176.07" cy="9.06" r=".48"/>
      <circle cx="173.85" cy="4.62" r=".48"/>
      <rect x="145.06" y="137.4" width=".39" height=".39" transform="translate(-54.75 143.01) rotate(-45)"/>
      <path d="M183.99,144.82l1.24-.17c.18-.03.16.36-.04.34-.21-.02-1.4-.14-1.21-.17Z"/>
      <polygon points="186.43 145.37 186.81 145.37 187.17 145.37 186.81 145.38 186.43 145.38 186.07 145.37 186.43 145.37"/>
      <rect x="187.81" y="145.73" width=".39" height=".39" transform="translate(-48.12 175.68) rotate(-45)"/>
    </g>
  </g>`;
