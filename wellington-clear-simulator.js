// ============================================================================
// Wellington Clear ver.（PVC×本革ハイブリッド）カラーシミュレーター
// 本革版 wellington-simulator.js（ウクレレ用ブランチ）のSVGアセット・ピース配置ロジックを
// そのまま流用しつつ、配色モデルを folklore-clear-simulator.js 方式（前後本革・中間PVC単色、
// クーリエ式ゾーンタブUI）に置換。ギター用ブランチは未商品化のため実装しない（ukulele固定）。
// ============================================================================

const WC_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const WC_SHOPIFY_DOMAIN = '708works.jp';

// 本革版wellington-simulator.jsのukuleleブランチ設定をそのまま踏襲
const WC_BRANCH = {
  groupId: 'wellington-ukulele',
  frontDomId: 'front1',
  rearDomId: 'rear1',
  logoDomId: 'logo1',
  middleDomIds: {
    2:'_x32_1', 3:'_x33_1', 4:'_x34_1', 5:'_x35_1', 6:'_x36_1', 7:'_x37_1', 8:'_x38_1', 9:'_x39_1',
    10:'_x31_01', 11:'_x31_11', 12:'_x31_21', 13:'_x31_31', 14:'_x31_41', 15:'_x31_51', 16:'_x31_61', 17:'_x31_71'
  },
  frontY: 1063.52,
  nativeRearY: 189.68,
  pitch: 51.6,
  nativeWidth: 45.03,
  min: 16, max: 24, standard: 20,
};
const WC_PX_PER_UNIT = 30 / WC_BRANCH.nativeWidth;

// 価格：現行wellington-ukulele-clear（Default Title・¥10,274・標準20枚相当）を基準に、
// 延長パーツGlobo設定の実績値（ウロコ1つ+¥451）を±両方向へ線形外挿
function wcPriceForCount(n) {
  return 10274 + (n - WC_BRANCH.standard) * 451;
}
function wcLengthCmForCount(n) {
  return 97 + (n - WC_BRANCH.standard) * 4;
}

// ウロコ数とVariant IDのマッピング（刻印なし/あり）。商品のネイティブバリアント作成後に実IDへ差し替える。
const WC_VARIANT_MAP = {
  16: { noeng: '46634549739770', eng: '50232052809978' },
  17: { noeng: '50232052842746', eng: '50232052875514' },
  18: { noeng: '50232052908282', eng: '50232052941050' },
  19: { noeng: '50232052973818', eng: '50232053006586' },
  20: { noeng: '50232053039354', eng: '50232053072122' },
  21: { noeng: '50232053104890', eng: '50232053137658' },
  22: { noeng: '50232053170426', eng: '50232053203194' },
  23: { noeng: '50232053235962', eng: '50232053268730' },
  24: { noeng: '50232053301498', eng: '50232053334266' },
};

const WC_KOKUIN_PRICE_ADD = 1100;

// 前後（先端・末端）用の本革カラー（wellington本革版と共通の20色パレット）
const WC_LEATHER_COLORS = [
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

// 本体(PVC)の色7色（folklore Clear ver.と共通のGlobo運用時スウォッチ色）
const WC_PVC_COLORS = [
  {id:'cwhite',  name:'Clear White',  hex:'#f0f1f3'},
  {id:'cbrown',  name:'Clear Brown',  hex:'#924e3a'},
  {id:'cblack',  name:'Clear Black',  hex:'#4a5363'},
  {id:'cred',    name:'Clear Red',    hex:'#f66b80'},
  {id:'cgreen',  name:'Clear Green',  hex:'#4cbf94'},
  {id:'cblue',   name:'Clear Blue',   hex:'#59b2be'},
  {id:'cyellow', name:'Clear Yellow', hex:'#fbd173'},
];

// ============================================================================
// グローバル状態
// ============================================================================

let wcN = WC_BRANCH.standard;
let wcPvcColor = WC_PVC_COLORS[0];
let wcFrontColor = WC_LEATHER_COLORS.find(c => c.id === 'camel');
let wcRearColor = WC_LEATHER_COLORS.find(c => c.id === 'camel');
let wcLinked = true; // true=前後（先端・末端）を同じ色にする（デフォルト）／false=別々の色にする
let wcActiveZone = 'pvc'; // 'pvc' | 'leather' | 'front' | 'rear'
let wcHistory = [];
let wcLastUploadedImage = null;
let wcHasDownloadedImage = false;

// courier-simulator.js／folklore-clear-simulator.jsと同じ「パーツを選択」ゾーンタブ＋前後分離トグル
const WC_ZONE_LABEL = {
  pvc:     '本体（PVC）',
  leather: '本革（前後共通）',
  front:   '前端（革）',
  rear:    '後端（革）',
};

// ============================================================================
// 初期化
// ============================================================================

function initializeWCSimulator() {
  if (window.wcSimulatorInitialized) return;
  const zonesEl = document.getElementById('wc-zones');
  const strapScrollEl = document.getElementById('wc-strap-scroll');
  if (!zonesEl || !strapScrollEl) { setTimeout(initializeWCSimulator, 100); return; }
  window.wcSimulatorInitialized = true;
  wcBuildZoneButtons();
  wcBuildPalette();
  wcUpdatePaletteLabel();
  wcUpdateSummary();
  wcBuildStrapSVG();
  wcUpdatePriceDisplay();
  wcUpdateCountDisplay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWCSimulator);
} else {
  initializeWCSimulator();
}

window.addEventListener('resize', () => {
  if (window.wcSimulatorInitialized) wcBuildStrapSVG();
});

function wcOnColorChange() {
  wcRedrawSVG();
  wcUpdateSummary();
  wcHasDownloadedImage = false;
}

// ============================================================================
// 価格・カウント表示
// ============================================================================

function wcUpdatePriceDisplay() {
  const el = document.getElementById('wc-price-display');
  if (!el) return;
  const price = wcPriceForCount(wcN);
  const kokuinAdd = (window.WC_KOKUIN_STATE?.enabled && WC_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(price + kokuinAdd).toLocaleString()}（税込）`;
}

function wcUpdateCountDisplay() {
  const cntDisp = document.getElementById('wc-cnt-disp');
  const cntSub  = document.getElementById('wc-cnt-sub');
  if (!cntDisp || !cntSub) return;
  cntDisp.textContent = wcN + '個';
  const diff = wcN - WC_BRANCH.standard;
  const lenCm = wcLengthCmForCount(wcN);
  const diffTxt = diff === 0 ? '標準' : diff > 0 ? `標準より${diff}個多い` : `標準より${Math.abs(diff)}個少ない`;
  cntSub.textContent = `${diffTxt}（全長 約${lenCm}cm）`;
}

function wcChangeCount(d) {
  const nx = wcN + d;
  if (nx < WC_BRANCH.min || nx > WC_BRANCH.max) return;
  wcSaveHistory();
  wcN = nx;
  wcUpdateCountDisplay();
  wcUpdatePriceDisplay();
  wcBuildStrapSVG();
  wcUpdateSummary();
  wcHasDownloadedImage = false;
}

// ============================================================================
// 履歴（元に戻す）
// ============================================================================

function wcSaveHistory() {
  wcHistory.push({ n: wcN, pvc: wcPvcColor, front: wcFrontColor, rear: wcRearColor, linked: wcLinked, zone: wcActiveZone });
  if (wcHistory.length > 30) wcHistory.shift();
  const btn = document.getElementById('wc-btn-undo');
  if (btn) btn.disabled = false;
}

function wcUndo() {
  if (!wcHistory.length) return;
  const prev = wcHistory.pop();
  wcN = prev.n; wcPvcColor = prev.pvc; wcFrontColor = prev.front; wcRearColor = prev.rear;
  wcLinked = prev.linked; wcActiveZone = prev.zone;
  wcUpdateCountDisplay();
  wcUpdatePriceDisplay();
  wcBuildStrapSVG();
  wcBuildZoneButtons();
  wcBuildPalette();
  wcUpdatePaletteLabel();
  wcUpdateSummary();
  const btn = document.getElementById('wc-btn-undo');
  if (!wcHistory.length && btn) btn.disabled = true;
}

function wcResetAll() {
  wcSaveHistory();
  wcPvcColor = WC_PVC_COLORS[0];
  wcFrontColor = WC_LEATHER_COLORS.find(c => c.id === 'camel');
  wcRearColor = WC_LEATHER_COLORS.find(c => c.id === 'camel');
  wcLinked = true;
  wcActiveZone = 'pvc';
  wcBuildStrapSVG();
  wcBuildZoneButtons();
  wcBuildPalette();
  wcUpdatePaletteLabel();
  wcUpdateSummary();
}

// ============================================================================
// パーツ選択（ゾーンタブ）＋前後分離トグル
// ============================================================================

function wcBuildZoneButtons() {
  const container = document.getElementById('wc-zones');
  if (!container) return;
  container.innerHTML = '';

  // イラスト（strap-scroll）は後ろ（末端側）が上、前（先端側）が下の並びなので、
  // タブの並びもそれに合わせて「後端」を上、「前端」を下にする
  const zones = wcLinked ? ['pvc', 'leather'] : ['pvc', 'rear', 'front'];
  zones.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'wc-zone-btn' + (zone === wcActiveZone ? ' active' : '');
    btn.onclick = () => wcSelectZone(zone);

    const dot = document.createElement('span');
    dot.className = 'wc-zone-dot';
    const hex = zone === 'pvc' ? wcPvcColor.hex
              : zone === 'rear' ? wcRearColor.hex
              : wcFrontColor.hex; // 'leather'・'front'はどちらも前端色を表示
    dot.style.background = hex;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + WC_ZONE_LABEL[zone]));
    container.appendChild(btn);
  });

  const toggle = document.createElement('button');
  toggle.className = 'wc-split-toggle' + (wcLinked ? '' : ' active');
  toggle.onclick = wcToggleLeatherSplit;
  toggle.innerHTML = wcLinked
    ? '<span class="wc-toggle-icon">⊕</span> 前後を別の色にする'
    : '<span class="wc-toggle-icon">⊖</span> 前後を同じ色に戻す';
  container.appendChild(toggle);
}

function wcToggleLeatherSplit() {
  wcLinked = !wcLinked;
  if (wcLinked) {
    wcRearColor = wcFrontColor;
    wcActiveZone = 'leather';
  } else {
    wcActiveZone = 'rear'; // タブ表示順の一番上（イラストの後ろ側）に合わせる
  }
  wcBuildZoneButtons();
  wcBuildPalette();
  wcUpdatePaletteLabel();
  wcUpdateSummary();
  wcOnColorChange();
}

function wcSelectZone(zone) {
  wcActiveZone = zone;
  wcBuildZoneButtons();
  wcBuildPalette();
  wcUpdatePaletteLabel();
}

function wcUpdatePaletteLabel() {
  const label = document.getElementById('wc-palette-label');
  if (label) label.textContent = 'カラー（' + WC_ZONE_LABEL[wcActiveZone] + '）';
}

// ============================================================================
// カラーパレット（ゾーン連動・単一パレット）
// ============================================================================

function wcCurrentZoneColor() {
  if (wcActiveZone === 'pvc') return wcPvcColor;
  if (wcActiveZone === 'rear') return wcRearColor;
  return wcFrontColor; // 'leather'・'front'
}

function wcBuildPalette() {
  const p = document.getElementById('wc-palette');
  if (!p) return;
  p.innerHTML = '';
  // Shopifyテーマのdiv:empty{display:none}対策：中身を持たない色スウォッチdivは
  // display:blockを明示しないと本番でだけ非表示になる（Triad/Kolmio/folklore-clear等で既知の罠）
  p.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';

  const colors = wcActiveZone === 'pvc' ? WC_PVC_COLORS : WC_LEATHER_COLORS;
  const current = wcCurrentZoneColor();

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'wc-swatch' + (c.id === current.id ? ' selected' : '');
    const isSel = c.id === current.id;
    sw.style.cssText = `display:block;background:${c.hex};width:22px;height:22px;border-radius:50%;cursor:pointer;box-sizing:border-box;border:${isSel ? '2.5px solid #111;box-shadow:0 0 0 2px #fff,0 0 0 4px #111' : '1.5px solid rgba(0,0,0,.12)'};`;
    sw.title = c.name;
    sw.onclick = () => wcSetColor(c);
    p.appendChild(sw);
  });
}

function wcSetColor(c) {
  wcSaveHistory();
  if (wcActiveZone === 'pvc') {
    wcPvcColor = c;
  } else if (wcActiveZone === 'leather') {
    wcFrontColor = c; wcRearColor = c;
  } else if (wcActiveZone === 'front') {
    wcFrontColor = c;
  } else {
    wcRearColor = c;
  }
  wcBuildZoneButtons();
  wcBuildPalette();
  wcOnColorChange();
}

// ============================================================================
// サマリー
// ============================================================================

function wcUpdateSummary() {
  const el = document.getElementById('wc-summary');
  if (!el) return;
  const rows = wcLinked
    ? [
        { label: WC_ZONE_LABEL.pvc,     hex: wcPvcColor.hex,   name: wcPvcColor.name },
        { label: WC_ZONE_LABEL.leather, hex: wcFrontColor.hex, name: wcFrontColor.name },
      ]
    : [
        { label: WC_ZONE_LABEL.pvc,  hex: wcPvcColor.hex,  name: wcPvcColor.name },
        { label: WC_ZONE_LABEL.rear,  hex: wcRearColor.hex,  name: wcRearColor.name },
        { label: WC_ZONE_LABEL.front, hex: wcFrontColor.hex, name: wcFrontColor.name },
      ];
  el.innerHTML = rows.map(r => `
    <div class="wc-summary-row">
      <span class="wc-summary-label">${r.label}</span>
      <span class="wc-summary-dot" style="background:${r.hex}"></span>
      <span class="wc-summary-name">${r.name}</span>
    </div>`).join('');
}

// ============================================================================
// ストラップ描画（SVG）
// WL_SVG_INNER・ピース配置ロジックは本革版wellington-simulator.jsと共通のものを流用
// ============================================================================

function _wcHexToHsl(hex) {
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
function _wcHslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3); }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function wcGetLogoColor(hex) {
  const [h, s, l] = _wcHexToHsl(hex);
  const newL = l > 0.40 ? Math.max(0.05, l - 0.30) : Math.min(0.90, l + 0.30);
  return _wcHslToHex(h, s, newL);
}
function wcLighten(hex, amt) {
  const [h, s, l] = _wcHexToHsl(hex);
  return _wcHslToHex(h, s, Math.min(0.96, l + amt));
}
function wcDarken(hex, amt) {
  const [h, s, l] = _wcHexToHsl(hex);
  return _wcHslToHex(h, s, Math.max(0.04, l - amt));
}

// PVC特有の透け感・艶感を出すため、7色それぞれにグラデーションを用意する
function wcEnsurePvcDefs(svg) {
  const NS = 'http://www.w3.org/2000/svg';
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  WC_PVC_COLORS.forEach(c => {
    const grad = document.createElementNS(NS, 'linearGradient');
    grad.setAttribute('id', 'wc-pvc-grad-' + c.id);
    grad.setAttribute('x1', '15%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '85%'); grad.setAttribute('y2', '100%');
    [[0, wcLighten(c.hex, 0.32)], [38, wcLighten(c.hex, 0.10)], [60, c.hex], [100, wcDarken(c.hex, 0.10)]].forEach(([off, color]) => {
      const stop = document.createElementNS(NS, 'stop');
      stop.setAttribute('offset', off + '%');
      stop.setAttribute('stop-color', color);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
  });
}

function wcDisplayOrder(n) {
  const middlesNeeded = n - 2; // front/rearを除いた中間パーツの必要数
  const order = [0];
  for (let id = middlesNeeded + 1; id >= 2; id--) order.push(id);
  order.push(1);
  return order;
}

function wcPieceY(logicalId, n) {
  if (logicalId === 1) return WC_BRANCH.frontY;
  if (logicalId === 0) return WC_BRANCH.frontY - (n - 1) * WC_BRANCH.pitch;
  return WC_BRANCH.frontY - (logicalId - 1) * WC_BRANCH.pitch;
}

function wcBuildStrapSVG() {
  const scroll = document.getElementById('wc-strap-scroll');
  const col = document.getElementById('wc-strap-col');
  if (!scroll || !col) return;

  const branch = WC_BRANCH;
  const n = wcN;
  const order = wcDisplayOrder(n);

  const dispW = branch.nativeWidth * WC_PX_PER_UNIT;
  col.style.width = (dispW + 30) + 'px';

  scroll.innerHTML = `<svg id="wc-strap-svg"
    viewBox="0 0 158.42 1218.16"
    style="display:block;margin:0 auto;flex-shrink:0;"
    xmlns="http://www.w3.org/2000/svg">${WL_SVG_INNER}</svg>`;

  const svg = document.getElementById('wc-strap-svg');
  wcEnsurePvcDefs(svg);

  // Clear ver.はウクレレ用のみ商品化のため、未使用のguitarブランチ一式は常に非表示
  // （getBBoxの実測からも除外される）
  const guitarGroup = svg.querySelector('#wellington-guitar');
  if (guitarGroup) guitarGroup.style.display = 'none';

  const activeGroup = svg.querySelector('#' + CSS.escape(branch.groupId));
  const middlesNeeded = n - 2;

  // 物理パーツ(2〜17番)の表示/非表示。表示するものは元位置のまま（transformなし）
  for (let id = 2; id <= 17; id++) {
    const domId = branch.middleDomIds[id];
    const el = svg.querySelector('#' + CSS.escape(domId));
    if (!el) continue;
    if (id <= middlesNeeded + 1) { el.style.display = ''; el.removeAttribute('transform'); }
    else { el.style.display = 'none'; }
  }

  // 物理17番を超える分はクローン合成（2番パーツの形状を複製してtranslateで配置）
  const cloneSource = svg.querySelector('#' + CSS.escape(branch.middleDomIds[2]));
  const rearEl = svg.querySelector('#' + CSS.escape(branch.rearDomId));
  const clonesById = {};
  if (cloneSource && activeGroup) {
    for (let id = 18; id <= middlesNeeded + 1; id++) {
      const targetY = wcPieceY(id, n);
      const nativeY2 = wcPieceY(2, n);
      const ty = targetY - nativeY2;
      const clone = cloneSource.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('data-wc-clone', id);
      clone.setAttribute('transform', `translate(0, ${ty.toFixed(3)})`);
      clonesById[id] = clone;
    }
  }

  // rear(末端)は常にtranslateで現在のNに応じたスロット位置まで移動
  if (rearEl) {
    const targetY = wcPieceY(0, n);
    const ty = targetY - branch.nativeRearY;
    rearEl.setAttribute('transform', `translate(0, ${ty.toFixed(3)})`);
    rearEl.style.display = '';
  }

  if (activeGroup) {
    order.forEach(logicalId => {
      let el;
      if (logicalId === 0) el = rearEl;
      else if (logicalId === 1) el = svg.querySelector('#' + CSS.escape(branch.frontDomId));
      else if (logicalId <= 17) el = svg.querySelector('#' + CSS.escape(branch.middleDomIds[logicalId]));
      else el = clonesById[logicalId];
      if (el) activeGroup.appendChild(el);
    });

    // 708worksロゴ装飾（logo1）は本革版だと3番目パーツ付近に浮いているだけの兄弟要素で、
    // 名入れ刻印と同じく3番目（PVC範囲）に乗ってしまう。前(1番・本革)の位置までbboxの
    // 中心差分でtranslateしてから最後にappendChildし、最前面（frontより手前）に表示する。
    const logoEl = svg.querySelector('#' + CSS.escape(branch.logoDomId));
    const frontElForBBox = svg.querySelector('#' + CSS.escape(branch.frontDomId));
    const piece3El = svg.querySelector('#' + CSS.escape(branch.middleDomIds[3]));
    if (logoEl && frontElForBBox && piece3El) {
      const bFront = frontElForBBox.getBBox();
      const bP3 = piece3El.getBBox();
      const dx = (bFront.x + bFront.width / 2) - (bP3.x + bP3.width / 2);
      const dy = (bFront.y + bFront.height / 2) - (bP3.y + bP3.height / 2);
      logoEl.setAttribute('transform', `translate(${dx.toFixed(3)},${dy.toFixed(3)})`);
      activeGroup.appendChild(logoEl);
    }
  }

  // 表示/非表示・translate確定後、getBBoxの実測値でviewBoxをタイトに合わせる
  const pad = 4;
  const bbox = svg.getBBox();
  const vbX = bbox.x - pad, vbY = bbox.y - pad, vbW = bbox.width + pad * 2, vbH = bbox.height + pad * 2;
  const scale = WC_PX_PER_UNIT;
  const dispWpx = Math.round(vbW * scale);
  const dispH = Math.round(vbH * scale);
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  svg.setAttribute('width', dispWpx);
  svg.setAttribute('height', dispH);
  col.style.width = (dispWpx + 30) + 'px';

  wcRedrawSVG();
}

function wcRedrawSVG() {
  const svg = document.getElementById('wc-strap-svg');
  if (!svg) return;
  const branch = WC_BRANCH;
  const n = wcN;
  const order = wcDisplayOrder(n);
  order.forEach(logicalId => {
    let g;
    if (logicalId === 0) g = svg.querySelector('#' + CSS.escape(branch.rearDomId));
    else if (logicalId === 1) g = svg.querySelector('#' + CSS.escape(branch.frontDomId));
    else if (logicalId <= 17) g = svg.querySelector('#' + CSS.escape(branch.middleDomIds[logicalId]));
    else g = svg.querySelector(`[data-wc-clone="${logicalId}"]`);
    if (!g) return;

    const isEnd = (logicalId === 0 || logicalId === 1); // 末端・先端＝本革
    if (isEnd) {
      const hex = logicalId === 1 ? wcFrontColor.hex : wcRearColor.hex;
      g.setAttribute('fill', hex);
      g.removeAttribute('fill-opacity');
    } else {
      g.setAttribute('fill', `url(#wc-pvc-grad-${wcPvcColor.id})`);
      g.setAttribute('fill-opacity', '0.9');
    }
    g.setAttribute('stroke', '#000');
    g.setAttribute('stroke-width', '0.5');
    g.setAttribute('stroke-miterlimit', '10');
  });

  const logo = svg.querySelector('#' + CSS.escape(branch.logoDomId));
  if (logo) logo.setAttribute('fill', wcGetLogoColor(wcFrontColor.hex));

  if (typeof applyWcKokuinColors === 'function') applyWcKokuinColors();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showWcToast(msg) {
  const t = document.getElementById('wc-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function showWcLoading(text = '処理中...') {
  const loadingText = document.getElementById('wc-loading-text');
  const loadingOverlay = document.getElementById('wc-loading-overlay');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}
function hideWcLoading() {
  const el = document.getElementById('wc-loading-overlay');
  if (el) el.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

async function wcBuildSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;
  const n = wcN;

  const liveSvg = document.getElementById('wc-strap-svg');
  const liveVb = liveSvg?.getAttribute('viewBox')?.split(' ').map(Number);
  const vbW = liveVb ? liveVb[2] : WC_BRANCH.nativeWidth;
  const vbH = liveVb ? liveVb[3] : 1700;
  const saveScale = 56 / WC_BRANCH.nativeWidth;
  const svgSaveW = Math.round(vbW * saveScale);
  const svgSaveH = Math.round(vbH * saveScale);

  const kokuin = window.WC_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const kokuinH = kokuinEnabled ? 78 : 0;

  const headerH = 50, topLabelH = 25, bottomLabelH = 25, footerH = 28;
  const svgX = Math.round(cw / 2 - svgSaveW / 2);
  const svgY0 = headerH + topLabelH;
  const ch = svgY0 + svgSaveH + bottomLabelH + kokuinH + footerH + 10;

  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8'; ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('WELLINGTON CLEAR', cw / 2, 28);
  ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 42);

  ctx.fillStyle = '#444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▲ 後ろ（末端側）', cw / 2, svgY0 - 6);

  const svgEl = document.getElementById('wc-strap-svg');
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

  ctx.fillStyle = '#444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▼ 前（先端側）', cw / 2, svgY0 + svgSaveH + 14);

  // 配色ラベル（本体PVC／前後の本革のみ、簡潔に）
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
  drawLabel(wcPvcColor.hex, `本体(PVC): ${wcPvcColor.name}`);
  if (wcLinked) {
    drawLabel(wcFrontColor.hex, `本革(前後共通): ${wcFrontColor.name}`);
  } else {
    drawLabel(wcRearColor.hex, `本革(後端): ${wcRearColor.name}`);
    drawLabel(wcFrontColor.hex, `本革(前端): ${wcFrontColor.name}`);
  }

  if (kokuinEnabled) {
    const boxMargin = 24;
    const boxX = boxMargin, boxY = svgY0 + svgSaveH + bottomLabelH + 6;
    const boxW = cw - boxMargin * 2, boxH = kokuinH - 12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boxX + 8, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, 8);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, 8);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, 8);
    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, 8);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('名入れ刻印', boxX + 14, boxY + 18);

    await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
    ctx.textAlign = 'left';
    ctx.fillText(kokuin.text, boxX + 14, boxY + boxH - 16);
  }

  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

  return cv;
}

async function wcSaveImage() {
  showWcLoading('画像を生成中...');
  try {
    const canvas = await wcBuildSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wellington-clear-${wcN}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideWcLoading();
    wcHasDownloadedImage = true;
    showWcToast('画像を保存しました');
  } catch (e) {
    console.error(e);
    hideWcLoading();
    showWcToast('保存に失敗しました');
  }
}

// ============================================================================
// R2アップロード・オーダー処理
// ============================================================================

async function wcUploadOrderImage(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = `wellington-clear-${Date.now()}`;
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  try {
    const res = await fetch(WC_WORKER_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    if (!data.success && !data.url && !data.imageUrl) throw new Error(data.error || 'Upload failed');
    return { imageUrl: data.imageUrl || data.url, orderId };
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

async function wcGoOrder() {
  if (window.WC_KOKUIN_STATE?.enabled && !window.WC_KOKUIN_STATE.valid) {
    showWcToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!wcHasDownloadedImage) await wcSaveImage();
  showWcLoading('画像をアップロード中...');
  try {
    const canvas = await wcBuildSaveCanvas();
    const uploadResult = await wcUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    wcLastUploadedImage = uploadResult;
    hideWcLoading();
    showWcConfirmModal(uploadResult);
  } catch (error) {
    console.error(error);
    hideWcLoading();
    showWcToast('エラーが発生しました: ' + error.message);
  }
}

function wcColorSummaryLine() {
  if (wcLinked) {
    return `本体(PVC): ${wcPvcColor.name}<br>本革(前後共通): ${wcFrontColor.name}`;
  }
  return `本体(PVC): ${wcPvcColor.name}<br>本革(後端): ${wcRearColor.name}<br>本革(前端): ${wcFrontColor.name}`;
}

function showWcConfirmModal(uploadResult) {
  const modal = document.getElementById('wc-confirm-modal');
  const modalImage = document.getElementById('wc-modal-image');
  const modalInfo = document.getElementById('wc-modal-info');
  if (!modal || !modalImage || !modalInfo) return;
  modalImage.src = uploadResult.imageUrl;

  const kokuinEnabled0 = !!(window.WC_KOKUIN_STATE?.enabled && window.WC_KOKUIN_STATE.valid && window.WC_KOKUIN_STATE.text);
  const price = wcPriceForCount(wcN) + (kokuinEnabled0 ? WC_KOKUIN_PRICE_ADD : 0);
  const kokuin = window.WC_KOKUIN_STATE;
  const kokuinLine = kokuinEnabled0
    ? `<p><strong>名入れ刻印:</strong> ${kokuin.text}（${kokuin.fontLabel}）</p>`
    : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>ウロコの数:</strong> ${wcN}個</p>
    <p><strong>全長:</strong> 約${wcLengthCmForCount(wcN)}cm</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    ${kokuinLine}
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${wcColorSummaryLine()}</div>
  `;
  modal.classList.add('show');
}

function closeWcModal() {
  const modal = document.getElementById('wc-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function wcProceedToCart() {
  if (!wcLastUploadedImage) {
    showWcToast('画像情報が見つかりません');
    return;
  }
  closeWcModal();
  showWcLoading('カートに追加中...');
  try {
    const kokuin = window.WC_KOKUIN_STATE;
    const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
    const variantId = WC_VARIANT_MAP[wcN]?.[kokuinEnabled ? 'eng' : 'noeng'];
    if (!variantId) throw new Error('該当するバリエーションが見つかりません（商品未作成の可能性があります）');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${WC_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display = 'none';

    [['id', variantId], ['quantity', '1']].forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
    });

    const props = {
      'Order ID': wcLastUploadedImage.orderId,
      'Parts': `${wcN}pcs`,
      'Length': `${wcLengthCmForCount(wcN)}cm`,
      'PVC Color': wcPvcColor.name,
      'Front Leather': wcFrontColor.name,
      'Rear Leather': wcRearColor.name,
      'Image URL': wcLastUploadedImage.imageUrl,
    };
    if (kokuinEnabled) {
      props['刻印文字'] = kokuin.text;
      props['刻印フォント'] = kokuin.fontLabel;
    }
    Object.entries(props).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = `properties[${k}]`; i.value = v; form.appendChild(i);
    });

    document.body.appendChild(form);
    hideWcLoading();
    showWcToast('カートに追加します...');
    setTimeout(() => form.submit(), 500);
  } catch (error) {
    console.error(error);
    hideWcLoading();
    showWcToast('カート追加に失敗しました: ' + error.message);
  }
}

// Auto-generated from wellington_color_order.svg（wellington本革版と共通のSVGアセットをそのまま流用）
const WL_SVG_INNER = `<defs><style>.st0 {fill: #c6a06a;}.st1 {fill: #995200;stroke: #000;stroke-miterlimit: 10;}</style></defs><g id="wellington-guitar"><path id="rear" class="st1" d="M.7,68.53h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72,0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0C6.66,20.27,3.02,39.95,1.74,48.93c-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3ZM29.5,12.6c2.49,0,4.5,2.02,4.5,4.5s-2.01,4.5-4.5,4.5-4.5-2.01-4.5-4.5,2.02-4.5,4.5-4.5ZM14.33,65.29c1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56Z"/><path id="_x31_7" class="st1" d="M58.5,130.65c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0C6.66,86.77,3.02,106.45,1.74,115.43c-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,133.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_6" class="st1" d="M58.5,197.15c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,199.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_5" class="st1" d="M58.5,263.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,266.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_4" class="st1" d="M58.5,330.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,332.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_3" class="st1" d="M58.5,396.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,399.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_2" class="st1" d="M58.5,463.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,465.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_1" class="st1" d="M58.5,529.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,532.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_0" class="st1" d="M58.5,596.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,598.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x39_" class="st1" d="M58.5,662.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,665.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x38_" class="st1" d="M58.5,729.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,731.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x37_" class="st1" d="M58.5,795.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,798.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x36_" class="st1" d="M58.5,862.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,864.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x35_" class="st1" d="M58.5,928.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,931.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x34_" class="st1" d="M58.5,995.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,997.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x33_" class="st1" d="M58.5,1061.63c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,1064.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="logo" class="st0" d="M34.29,1032.83c1.46-1.49,3.93-3.98,7.41-7.49-.15-.03-.3-.06-.44-.12-.02,0-.04-.01-.06-.02-.09-.04-.17-.08-.24-.12-.05-.03-.09-.06-.13-.09-.03-.02-.06-.04-.08-.06-.05-.04-.11-.09-.16-.13-.01-.01-.03-.02-.04-.03-.05-.05-.1-.1-.15-.15-.27-.31-.46-.68-.53-1.08-.63.7-1.5,1.65-2.63,2.87-.6.64-.96,1.04-1.1,1.18l.13.11c.85-.89,1.37-1.42,1.56-1.58.2-.16.35-.19.46-.1l.93.78-2.52,2.34c-1.24,1.15-2.37,2.21-3.41,3.18,0,0,0,0,0,0-1.63-.69-3.19-.85-4.67-.47-1.48.38-2.47,1.15-2.97,2.33-.49,1.16-.36,2.54.39,4.15-2.5.14-4.14.31-4.9.5-.98.24-1.77.58-2.37,1.02-.6.44-1.02.94-1.26,1.5-.36.84-.27,1.8.28,2.88.54,1.07,1.63,1.95,3.26,2.64,1.99.84,3.91,1.03,5.74.55,1.84-.47,3.03-1.37,3.59-2.69.58-1.36.23-3.23-1.03-5.59,2.01.01,3.65-.24,4.95-.77.98-.4,1.62-.96,1.93-1.68.31-.72.19-1.5-.34-2.35-.37-.59-.91-1.1-1.6-1.52h0ZM27.76,1037.28c.17-.41.44-.79.82-1.16.37-.37.7-.59.99-.67.17-.04.33-.06.47-.04-.94.9-1.74,1.68-2.4,2.33,0-.14.05-.29.12-.46h0ZM33,1033.33c-.81.8-1.55,1.54-2.23,2.21-.08-.04-.16-.08-.24-.12.68-.67,1.44-1.42,2.27-2.22.07.04.14.09.2.13h0ZM27.78,1038.26s-.01-.03-.02-.04c.7-.73,1.59-1.63,2.66-2.68.08.04.15.1.21.16-1.09,1.08-1.99,1.99-2.7,2.73-.05-.05-.1-.1-.15-.16ZM28.07,1038.79s-.03,0-.04,0c0,0,0-.02-.01-.03.02,0,.04.01.06.02h0ZM29.83,1038c-.4.35-.76.56-1.09.61-.02,0-.04,0-.06,0,.6-.63,1.31-1.38,2.14-2.24-.02.13-.05.27-.11.41-.19.45-.48.85-.88,1.21h0ZM28.4,1038.62c-.09-.01-.18-.03-.27-.07,0,0,0,0,0,0,.7-.73,1.57-1.63,2.62-2.69,0,.02.02.03.03.05.03.07.05.15.05.23-.96.97-1.77,1.8-2.43,2.49ZM30.95,1035.65c.66-.67,1.4-1.41,2.2-2.22.07.05.13.1.2.16-.79.8-1.52,1.54-2.18,2.21-.06-.05-.13-.1-.21-.15h0ZM37.3,1029.6c-1.13,1.14-2.18,2.19-3.14,3.15-.07-.04-.15-.08-.22-.12,1.19-1.19,3.07-3.05,5.63-5.58l.14.13-2.41,2.42h0ZM39.42,1026.93l.04.04-2.44,2.4c-1.17,1.15-2.25,2.21-3.23,3.18-.07-.03-.14-.07-.21-.1,1.22-1.17,3.17-3.01,5.84-5.52h0ZM27.36,1034.27c.34-.8.99-1.34,1.95-1.61.95-.27,1.94-.18,2.95.25.09.04.18.08.27.13-.86.82-1.65,1.56-2.36,2.24-.27-.07-.56-.1-.87-.08-.44.03-.9.19-1.37.5-.3.2-.54.43-.73.68-.15-.82-.09-1.53.16-2.12h0ZM28.3,1044.85c-.2.63-.61,1.19-1.25,1.67-.63.49-1.36.79-2.19.9-.83.11-1.62.05-2.39-.2-1.06-.33-1.86-.9-2.39-1.7-.54-.8-.67-1.62-.41-2.45.28-.87.89-1.62,1.84-2.23.91-.59,2.46-1.12,4.66-1.6-.84.87-1.57,1.68-2.18,2.42-.35.41-.62.77-.82,1.09-.2.31-.27.49-.22.53.06.05.24-.07.54-.35.3-.28.94-.98,1.92-2.1.46-.53.88-.99,1.25-1.41.04.07.08.13.12.2-.84.88-1.59,1.69-2.24,2.42-.36.4-.65.75-.87,1.04-.22.29-.32.45-.29.48.03.03.19-.1.49-.39.29-.29.94-.98,1.93-2.08.41-.45.78-.86,1.12-1.23.04.07.08.14.12.21-.79.84-1.49,1.61-2.11,2.3-.36.4-.65.75-.87,1.04-.23.29-.33.45-.3.47.03.02.18-.11.47-.4.29-.29.93-.99,1.93-2.09.36-.4.7-.77,1-1.1.59,1.05.96,1.89,1.12,2.5.21.81.22,1.5.04,2.08h0ZM34.26,1036.49c-.23.54-.76,1-1.58,1.38-.46.21-1.14.4-2.04.56.43-.28.73-.64.92-1.07.18-.43.17-.81-.03-1.14-.07-.11-.15-.21-.25-.3.66-.68,1.38-1.42,2.17-2.23.26.24.48.52.65.83.38.69.43,1.35.16,1.98h0Z"/><path id="_x32_" class="st1" d="M58.5,1128.13c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,1130.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="front" class="st1" d="M58.5,1194.81c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93c-.02-.06-.04-.12-.07-.17l-30.77.35c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.36,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM29.5,1199.67c-2.49,0-4.5-2.02-4.5-4.5s2-4.49,4.48-4.5c0,0,.01,0,.02,0,2.48,0,4.5,2.01,4.5,4.5s-2.02,4.5-4.5,4.5Z"/></g><g id="wellington-ukulele"><path id="rear1" data-name="rear" class="st1" d="M113.08,189.68h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11,0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34ZM135.42,145.28c2.49,0,4.5,2.02,4.5,4.5s-2.01,4.5-4.5,4.5-4.5-2.01-4.5-4.5,2.02-4.5,4.5-4.5ZM123.65,187.17c1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21Z"/><path id="_x31_71" data-name="_x31_7" class="st1" d="M157.92,237.88c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,240.05c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_61" data-name="_x31_6" class="st1" d="M157.92,289.48c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,291.64c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_51" data-name="_x31_5" class="st1" d="M157.92,341.07c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,343.24c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_41" data-name="_x31_4" class="st1" d="M157.92,392.66c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,394.83c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_31" data-name="_x31_3" class="st1" d="M157.92,444.26c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,446.43c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_21" data-name="_x31_2" class="st1" d="M157.92,495.85c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,498.02c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_11" data-name="_x31_1" class="st1" d="M157.92,547.45c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,549.61c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_01" data-name="_x31_0" class="st1" d="M157.92,599.04c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,601.21c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x39_1" data-name="_x39_" class="st1" d="M157.92,650.63c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,652.8c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x38_1" data-name="_x38_" class="st1" d="M157.92,702.23c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,704.4c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x37_1" data-name="_x37_" class="st1" d="M157.92,753.82c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,755.99c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x36_1" data-name="_x36_" class="st1" d="M157.92,805.42c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,807.58c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x35_1" data-name="_x35_" class="st1" d="M157.92,857.01c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,859.18c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x34_1" data-name="_x34_" class="st1" d="M157.92,908.61c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,910.77c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x33_1" data-name="_x33_" class="st1" d="M157.92,960.2c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,962.37c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="logo1" data-name="logo" class="st0" d="M139.13,937.85c1.13-1.15,3.05-3.09,5.75-5.81-.12-.02-.23-.05-.34-.09-.02,0-.03-.01-.04-.02-.07-.03-.13-.06-.19-.09-.04-.02-.07-.04-.1-.07-.02-.01-.04-.03-.07-.04-.04-.03-.08-.07-.12-.1-.01,0-.02-.02-.03-.03-.04-.04-.08-.08-.11-.12-.21-.24-.35-.53-.41-.84-.49.54-1.17,1.28-2.04,2.23-.46.5-.75.8-.85.92l.1.08c.66-.69,1.06-1.1,1.21-1.23.15-.12.27-.15.36-.08l.72.61-1.95,1.82c-.96.89-1.84,1.71-2.64,2.47,0,0,0,0,0,0-1.27-.54-2.47-.66-3.62-.36-1.15.29-1.92.89-2.3,1.8-.38.9-.28,1.97.3,3.22-1.94.11-3.21.24-3.8.39-.76.19-1.38.45-1.84.79-.47.34-.79.73-.98,1.17-.28.65-.21,1.4.21,2.23.42.83,1.26,1.51,2.53,2.05,1.55.65,3.03.8,4.46.43,1.42-.37,2.35-1.06,2.79-2.09.45-1.06.18-2.5-.8-4.33,1.56.01,2.84-.19,3.84-.6.76-.31,1.26-.74,1.5-1.3.24-.56.15-1.16-.26-1.82-.29-.46-.7-.85-1.24-1.18h0ZM134.07,941.31c.13-.31.34-.61.63-.9.29-.29.54-.46.77-.52.13-.03.25-.04.36-.03-.73.7-1.35,1.3-1.86,1.81,0-.11.04-.23.09-.36h0ZM138.14,938.24c-.63.62-1.21,1.19-1.73,1.72-.06-.03-.12-.06-.19-.09.53-.52,1.12-1.1,1.76-1.72.05.03.11.07.16.1h0ZM134.09,942.06s0-.02-.01-.03c.55-.57,1.23-1.26,2.06-2.08.06.03.12.08.16.12-.84.84-1.54,1.55-2.1,2.11-.04-.04-.08-.08-.11-.12ZM134.31,942.47s-.02,0-.03,0c0,0,0-.01,0-.02.01,0,.03.01.04.02h0ZM135.67,941.86c-.31.28-.59.43-.85.47-.02,0-.03,0-.04,0,.46-.49,1.02-1.07,1.66-1.74-.01.1-.04.21-.09.32-.15.35-.38.66-.68.94h0ZM134.57,942.34c-.07,0-.14-.03-.21-.05,0,0,0,0,0,0,.54-.57,1.22-1.26,2.03-2.09,0,.01.02.02.02.04.02.06.04.12.04.18-.74.76-1.37,1.4-1.88,1.93ZM136.54,940.04c.52-.52,1.08-1.1,1.7-1.72.05.04.1.08.15.12-.62.62-1.18,1.2-1.7,1.72-.05-.04-.1-.08-.16-.12h0ZM141.47,935.34c-.88.88-1.69,1.7-2.43,2.45-.06-.03-.12-.06-.17-.09.92-.92,2.38-2.37,4.37-4.33l.11.1-1.87,1.88h0ZM143.12,933.28l.03.03-1.89,1.86c-.91.89-1.74,1.71-2.51,2.47-.05-.03-.11-.05-.16-.08.95-.91,2.46-2.33,4.53-4.28h0ZM133.76,938.97c.27-.62.77-1.04,1.51-1.25.74-.21,1.5-.14,2.29.19.07.03.14.07.21.1-.67.63-1.28,1.21-1.83,1.74-.21-.05-.43-.08-.67-.06-.34.02-.7.15-1.06.39-.24.15-.42.33-.57.53-.11-.64-.07-1.19.13-1.65h0ZM134.49,947.17c-.15.49-.48.92-.97,1.3-.49.38-1.06.61-1.7.7-.64.09-1.26.04-1.86-.15-.82-.26-1.44-.7-1.86-1.32-.42-.62-.52-1.26-.32-1.9.21-.68.69-1.26,1.43-1.73.7-.45,1.91-.87,3.62-1.24-.65.68-1.21,1.3-1.69,1.87-.27.32-.48.6-.63.85-.15.24-.21.38-.17.41.04.04.18-.05.42-.27.23-.22.73-.76,1.49-1.63.36-.41.68-.77.97-1.09.03.05.06.1.09.15-.65.69-1.23,1.31-1.73,1.88-.28.31-.5.58-.67.81-.17.23-.25.35-.23.37.02.02.15-.08.38-.3.23-.22.73-.76,1.5-1.62.32-.35.61-.67.87-.95.03.06.06.11.09.16-.61.65-1.16,1.25-1.63,1.78-.28.31-.5.58-.68.81-.18.22-.25.35-.24.36.02.02.14-.09.37-.31.22-.23.72-.77,1.5-1.62.28-.31.54-.6.78-.86.46.82.75,1.46.87,1.94.16.63.17,1.16.03,1.61h0ZM139.11,940.69c-.18.42-.59.77-1.23,1.07-.35.16-.88.31-1.58.44.33-.22.57-.49.71-.83.14-.33.13-.63-.03-.89-.05-.08-.12-.16-.19-.24.51-.53,1.07-1.1,1.68-1.73.2.19.37.4.5.64.29.54.34,1.05.13,1.53h0Z"/><path id="_x32_1" data-name="_x32_" class="st1" d="M157.92,1011.79c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,1013.96c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="front1" data-name="front" class="st1" d="M157.92,1063.52c0-1.2-.04-2.32-.09-3.34-.03-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84c-.02-.04-.03-.09-.05-.13l-23.88.27c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.53,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM135.42,1068.31c-2.49,0-4.5-2.02-4.5-4.5s2-4.49,4.48-4.5c0,0,.01,0,.02,0,2.48,0,4.5,2.01,4.5,4.5s-2.02,4.5-4.5,4.5Z"/></g>`;
