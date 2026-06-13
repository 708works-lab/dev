// ============================================================================
// 設定
// ============================================================================

const COURIER_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const COURIER_SHOPIFY_DOMAIN = '708works.jp';

// カラーオーダー商品のVariant ID
const COURIER_VARIANT_ID = '49000891351290';
const COURIER_PRICE = 9130;

// 革パーツ用カラー（20色）
const COURIER_LEATHER_COLORS = [
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

// ナイロンベルト専用カラー（9色）
const COURIER_BELT_COLORS = [
  {id:'black',   name:'Black',     hex:'#1a1a1a'},
  {id:'choco',   name:'Choco',     hex:'#4a2018'},
  {id:'brown',   name:'Brown',     hex:'#9e3820'},
  {id:'camel',   name:'Camel',     hex:'#c46030'},
  {id:'tan',     name:'Tan',       hex:'#d4742a'},
  {id:'natural', name:'Natural',   hex:'#e8c4a0'},
  {id:'olive',   name:'Olive',     hex:'#7a7848'},
  {id:'navy',    name:'Navy',      hex:'#1e2540'},
  {id:'grey',    name:'Grey',      hex:'#9090a0'},
];

// ゾーン定義
const COURIER_ZONES = ['front', 'belt', 'rear'];
const COURIER_ZONE_LABELS = { front: '前端（革）', belt: 'ベルト', rear: '後端（革）' };

// ============================================================================
// ユーティリティ
// ============================================================================

function courierRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ============================================================================
// グローバル変数
// ============================================================================

let courierColors = {
  front: '#1a1a1a',
  belt:  '#9e3820',
  rear:  '#1a1a1a',
};
let courierActiveZone = 'front';
let courierHistory = [];
let courierLastUploadedImage = null;

// スケールの寸法（px）
const CSW = 56;  // scale width
const CSH = 72;  // scale height
const CBW = 56;  // belt width
const CBH = 130; // belt height
const CBUCKLE_H = 24; // buckle height

// ============================================================================
// 初期化
// ============================================================================

function initCourierSimulator() {
  if (window.courierSimulatorInitialized) return;

  const palette = document.getElementById('courier-palette');
  const strap = document.getElementById('courier-strap-canvas');
  if (!palette || !strap) {
    setTimeout(initCourierSimulator, 100);
    return;
  }

  window.courierSimulatorInitialized = true;
  buildCourierPalette();
  buildCourierZoneButtons();
  updateCourierSummary();
  drawCourierStrap();
  updateCourierPriceDisplay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourierSimulator);
} else {
  initCourierSimulator();
}

// ============================================================================
// ゾーンボタン
// ============================================================================

function buildCourierZoneButtons() {
  const container = document.getElementById('courier-zones');
  if (!container) return;
  container.innerHTML = '';
  COURIER_ZONES.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'courier-zone-btn' + (zone === courierActiveZone ? ' active' : '');
    btn.dataset.zone = zone;
    btn.onclick = () => selectCourierZone(zone);

    const dot = document.createElement('span');
    dot.className = 'zone-dot';
    dot.style.background = courierColors[zone];
    if (zone === 'belt') {
      dot.style.borderRadius = '3px';
      dot.style.width = '18px';
      dot.style.height = '10px';
      dot.style.display = 'inline-block';
    }

    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + COURIER_ZONE_LABELS[zone]));
    container.appendChild(btn);
  });
}

function selectCourierZone(zone) {
  courierActiveZone = zone;
  buildCourierZoneButtons();
  buildCourierPalette();

  const label = document.getElementById('courier-palette-label');
  if (label) {
    const isBelt = zone === 'belt';
    label.textContent = isBelt ? 'カラー（ベルト）' : `カラー（${COURIER_ZONE_LABELS[zone]}）`;
  }
  const beltNote = document.getElementById('courier-belt-note');
  if (beltNote) beltNote.style.display = zone === 'belt' ? 'block' : 'none';
}

// ============================================================================
// パレット
// ============================================================================

function buildCourierPalette() {
  const palette = document.getElementById('courier-palette');
  if (!palette) return;
  palette.innerHTML = '';

  const colors = courierActiveZone === 'belt' ? COURIER_BELT_COLORS : COURIER_LEATHER_COLORS;
  const currentHex = courierColors[courierActiveZone];

  colors.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = 'courier-swatch' + (c.hex === currentHex ? ' selected' : '');
    swatch.style.background = c.hex;
    swatch.title = c.name;
    swatch.onclick = () => setCourierColor(c.hex);
    palette.appendChild(swatch);
  });
}

function setCourierColor(hex) {
  saveCourierHistory();
  courierColors[courierActiveZone] = hex;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  drawCourierStrap();
}

// ============================================================================
// サマリー
// ============================================================================

function updateCourierSummary() {
  const el = document.getElementById('courier-summary');
  if (!el) return;
  const all = [...COURIER_LEATHER_COLORS, ...COURIER_BELT_COLORS];
  const getName = hex => [...COURIER_LEATHER_COLORS, ...COURIER_BELT_COLORS].find(c => c.hex === hex)?.name || hex;
  el.innerHTML = COURIER_ZONES.map(z => {
    const name = getName(courierColors[z]);
    return `<div class="summary-row"><span class="summary-label">${COURIER_ZONE_LABELS[z]}</span><span class="summary-dot" style="background:${courierColors[z]}"></span><span class="summary-name">${name}</span></div>`;
  }).join('');
}

function updateCourierPriceDisplay() {
  const el = document.getElementById('courier-price-display');
  if (el) el.textContent = `¥${COURIER_PRICE.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveCourierHistory() {
  courierHistory.push({ ...courierColors });
  if (courierHistory.length > 20) courierHistory.shift();
  const btn = document.getElementById('courier-btn-undo');
  if (btn) btn.disabled = false;
}

function courierUndo() {
  if (!courierHistory.length) return;
  courierColors = courierHistory.pop();
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  drawCourierStrap();
  const btn = document.getElementById('courier-btn-undo');
  if (btn) btn.disabled = courierHistory.length === 0;
}

function courierReset() {
  saveCourierHistory();
  courierColors = { front: '#1a1a1a', belt: '#9e3820', rear: '#1a1a1a' };
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  drawCourierStrap();
}

// ============================================================================
// ストラップ描画
// ============================================================================

function drawCourierStrap() {
  const canvas = document.getElementById('courier-strap-canvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const CX = Math.floor((CSW + 20) / 2);
  const totalH = CSH + 10 + CBH + 10 + CSH + 20;
  canvas.width = (CSW + 20) * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width = (CSW + 20) + 'px';
  canvas.style.height = totalH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, CSW + 20, totalH);

  let y = 10;

  // ---- 前端スケール（ボディ上部側） ----
  drawCourierScale(ctx, CX, y, CSW, CSH, courierColors.front, true);
  y += CSH + 10;

  // ---- ナイロンベルト ----
  drawCourierBelt(ctx, CX, y, CBW, CBH, courierColors.belt);
  y += CBH + 10;

  // ---- 後端スケール（エンドピン側） ----
  drawCourierScale(ctx, CX, y, CSW, CSH, courierColors.rear, false);
}

// 革スケール（盾/バッジ形状）
function drawCourierScale(ctx, cx, y, w, h, color, isFront) {
  const hw = w / 2;
  ctx.save();

  // 形状：上部は角丸矩形、下部は丸みのある尖り形状
  ctx.beginPath();
  ctx.moveTo(cx - hw + 8, y);
  ctx.lineTo(cx + hw - 8, y);
  ctx.quadraticCurveTo(cx + hw, y, cx + hw, y + 8);
  ctx.lineTo(cx + hw, y + h - 18);
  ctx.quadraticCurveTo(cx + hw, y + h, cx, y + h);
  ctx.quadraticCurveTo(cx - hw, y + h, cx - hw, y + h - 18);
  ctx.lineTo(cx - hw, y + 8);
  ctx.quadraticCurveTo(cx - hw, y, cx - hw + 8, y);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  // レザーグラデーション
  const grad = ctx.createLinearGradient(cx, y, cx, y + h);
  grad.addColorStop(0, 'rgba(255,255,255,.18)');
  grad.addColorStop(.35, 'rgba(255,255,255,.05)');
  grad.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = grad;
  ctx.fill();

  // 枠線
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // リベット穴（前端: 3穴、後端: 1穴）
  const holeCount = isFront ? 3 : 1;
  const holeY = y + 14;
  const holeSpacing = 10;
  const startX = cx - (holeCount - 1) * holeSpacing / 2;
  for (let i = 0; i < holeCount; i++) {
    const hx = startX + i * holeSpacing;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(hx, holeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(hx, holeY, 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // ロゴ（前端のみ）
  if (isFront) {
    drawCourierLogoMark(ctx, cx, y + h * 0.62, 0.18, color);
  }
}

// ナイロンベルト
function drawCourierBelt(ctx, cx, y, w, h, color) {
  const hw = w / 2;
  ctx.save();

  // ベルト本体
  ctx.fillStyle = color;
  ctx.fillRect(cx - hw, y, w, h);

  // ナイロンテクスチャ（斜め線）
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 5) {
    ctx.beginPath();
    ctx.moveTo(cx - hw + i, y);
    ctx.lineTo(cx - hw + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();

  // グラデーション
  const grad = ctx.createLinearGradient(cx - hw, y, cx + hw, y);
  grad.addColorStop(0, 'rgba(0,0,0,.12)');
  grad.addColorStop(.3, 'rgba(255,255,255,.08)');
  grad.addColorStop(.7, 'rgba(255,255,255,.08)');
  grad.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - hw, y, w, h);

  // 輪郭線
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - hw, y, w, h);
  ctx.restore();

  // バックル（中央）
  const buckleY = y + Math.floor(h / 2) - CBUCKLE_H / 2;
  drawCourierBuckle(ctx, cx, buckleY, w + 8, CBUCKLE_H);
}

// バックル金具
function drawCourierBuckle(ctx, cx, y, w, h) {
  const hw = w / 2;
  ctx.save();

  // 外枠
  ctx.beginPath();
  courierRoundRect(ctx, cx - hw, y, w, h, 3);
  ctx.fillStyle = '#8a8a8a';
  ctx.fill();

  // 金属グラデーション
  const grad = ctx.createLinearGradient(cx - hw, y, cx + hw, y + h);
  grad.addColorStop(0, 'rgba(255,255,255,.4)');
  grad.addColorStop(.4, 'rgba(255,255,255,.1)');
  grad.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = grad;
  ctx.fill();

  // 内側の穴（D-ring風）
  const gap = 8;
  ctx.beginPath();
  courierRoundRect(ctx, cx - hw + gap, y + 5, w - gap * 2, h - 10, 2);
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// ロゴ描画（小型版）
// ============================================================================

function drawCourierLogoMark(ctx, cx, cy, scale, baseColor) {
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const logoColor = lum > 0.45 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.35)';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = logoColor;
  ctx.font = 'bold 55px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('708', 0, -5);
  ctx.font = '14px sans-serif';
  ctx.fillText('works', 0, 20);
  ctx.restore();
}

// ============================================================================
// 画像保存
// ============================================================================

async function courierSaveImage() {
  const canvas = renderCourierFullCanvas();
  const link = document.createElement('a');
  link.download = `courier-color-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showCourierToast('画像を保存しました');
}

function renderCourierFullCanvas() {
  const dpr = 2;
  const CX = Math.floor((CSW + 20) / 2);
  const totalH = CSH + 10 + CBH + 10 + CSH + 20;
  const W = CSW + 20;
  const H = totalH;

  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, W, H);

  let y = 10;
  drawCourierScale(ctx, CX, y, CSW, CSH, courierColors.front, true);
  y += CSH + 10;
  drawCourierBelt(ctx, CX, y, CBW, CBH, courierColors.belt);
  y += CBH + 10;
  drawCourierScale(ctx, CX, y, CSW, CSH, courierColors.rear, false);

  return canvas;
}

// ============================================================================
// カート注文
// ============================================================================

async function courierGoOrder() {
  const loadingEl = document.getElementById('courier-loading-overlay');
  if (loadingEl) loadingEl.classList.add('show');

  try {
    const canvas = renderCourierFullCanvas();
    const uploadResult = await courierUploadImage(canvas);
    if (!uploadResult) {
      showCourierToast('画像アップロードに失敗しました');
      if (loadingEl) loadingEl.classList.remove('show');
      return;
    }

    courierLastUploadedImage = uploadResult;
    if (loadingEl) loadingEl.classList.remove('show');
    showCourierConfirmModal(uploadResult);
  } catch (e) {
    console.error(e);
    showCourierToast('エラーが発生しました: ' + e.message);
    if (loadingEl) loadingEl.classList.remove('show');
  }
}

async function courierUploadImage(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const orderId = 'COU-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const formData = new FormData();
  formData.append('image', blob, `courier-order-${orderId}.png`);
  formData.append('orderId', orderId);

  const resp = await fetch(COURIER_WORKER_URL, { method: 'POST', body: formData });
  if (!resp.ok) return null;
  const data = await resp.json();
  return { orderId, imageUrl: data.url || data.imageUrl };
}

function showCourierConfirmModal(uploadResult) {
  const modal = document.getElementById('courier-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('courier-modal-image');
  if (img) img.src = uploadResult.imageUrl;

  const info = document.getElementById('courier-modal-info');
  const getName = hex => [...COURIER_LEATHER_COLORS, ...COURIER_BELT_COLORS].find(c => c.hex === hex)?.name || hex;
  if (info) {
    info.innerHTML = `
      <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
      <div class="modal-color-list">
        ${COURIER_ZONES.map(z => `
          <div class="modal-color-row">
            <span class="modal-zone-label">${COURIER_ZONE_LABELS[z]}</span>
            <span class="modal-color-dot" style="background:${courierColors[z]}"></span>
            <span>${getName(courierColors[z])}</span>
          </div>
        `).join('')}
      </div>
      <p style="font-size:11px;color:#888;margin-top:8px;">※ ナイロンベルトは革と染料が異なるため、仕上がりの色味が若干異なる場合があります</p>
    `;
  }

  modal.classList.add('show');
}

function closeCourierModal() {
  const modal = document.getElementById('courier-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function courierProceedToCart() {
  if (!courierLastUploadedImage) {
    showCourierToast('画像情報が見つかりません');
    return;
  }

  closeCourierModal();

  const getName = hex => [...COURIER_LEATHER_COLORS, ...COURIER_BELT_COLORS].find(c => c.hex === hex)?.name || hex;
  const colorDataEN = [
    `Front[Leather]:${getName(courierColors.front)}`,
    `Belt[Nylon]:${getName(courierColors.belt)}`,
    `Rear[Leather]:${getName(courierColors.rear)}`,
  ].join(', ');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${COURIER_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  const fields = {
    'id': COURIER_VARIANT_ID,
    'quantity': '1',
  };
  const props = {
    'Order ID': courierLastUploadedImage.orderId,
    'Colors': colorDataEN,
    'Image URL': courierLastUploadedImage.imageUrl,
  };

  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = k; input.value = v;
    form.appendChild(input);
  });
  Object.entries(props).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = `properties[${k}]`; input.value = v;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

// ============================================================================
// Toast
// ============================================================================

function showCourierToast(msg) {
  const toast = document.getElementById('courier-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
