// ============================================================================
// 設定
// ============================================================================

const COURIER_WORKER_URL  = 'https://folklore-image-upload.708works.workers.dev';
const COURIER_SHOPIFY_DOMAIN = '708works.jp';
const COURIER_VARIANT_ID  = '49000891351290';
const COURIER_PRICE       = 9130;

// 革パーツ用カラー（20色）
const COURIER_LEATHER_COLORS = [
  {id:'white',   name:'White',      hex:'#f2f0ec'},
  {id:'yellow',  name:'Yellow',     hex:'#e8c84a'},
  {id:'lgrn',    name:'Light GRN',  hex:'#a8c43a'},
  {id:'lbl',     name:'Light BL',   hex:'#7baed0'},
  {id:'orange',  name:'Orange',     hex:'#e04e1a'},
  {id:'sakura',  name:'Sakura',     hex:'#f0a0a8'},
  {id:'pink',    name:'Pink',       hex:'#d96090'},
  {id:'red',     name:'Red',        hex:'#b82828'},
  {id:'winered', name:'Wine Red',   hex:'#7a2035'},
  {id:'navy',    name:'Navy',       hex:'#1e2540'},
  {id:'natural', name:'Natural',    hex:'#e8c4a0'},
  {id:'tan',     name:'Tan',        hex:'#d4742a'},
  {id:'camel',   name:'Camel',      hex:'#c46030'},
  {id:'brown',   name:'Brown',      hex:'#9e3820'},
  {id:'choco',   name:'Choco',      hex:'#4a2018'},
  {id:'grey',    name:'Grey',       hex:'#9090a0'},
  {id:'olive',   name:'Olive',      hex:'#7a7848'},
  {id:'green',   name:'Green',      hex:'#3a5030'},
  {id:'greenbl', name:'Green BL',   hex:'#2a5060'},
  {id:'black',   name:'Black',      hex:'#1a1a1a'},
];

// ナイロンベルト専用カラー（9色）
const COURIER_BELT_COLORS = [
  {id:'black',   name:'Black',      hex:'#1a1a1a'},
  {id:'choco',   name:'Choco',      hex:'#4a2018'},
  {id:'brown',   name:'Brown',      hex:'#9e3820'},
  {id:'camel',   name:'Camel',      hex:'#c46030'},
  {id:'tan',     name:'Tan',        hex:'#d4742a'},
  {id:'natural', name:'Natural',    hex:'#e8c4a0'},
  {id:'olive',   name:'Olive',      hex:'#7a7848'},
  {id:'navy',    name:'Navy',       hex:'#1e2540'},
  {id:'grey',    name:'Grey',       hex:'#9090a0'},
];

const COURIER_ZONES       = ['front', 'belt', 'rear'];
const COURIER_ZONE_LABELS = {
  front: '前端（革）',
  belt:  'ベルト（ナイロン）',
  rear:  '後端（革）',
};

// ============================================================================
// 状態
// ============================================================================

let courierColors = {
  front: '#1a1a1a',
  belt:  '#9e3820',
  rear:  '#1a1a1a',
};
let courierActiveZone      = 'front';
let courierHistory         = [];
let courierLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initCourierSimulator() {
  if (window.courierSimulatorInitialized) return;

  const palette  = document.getElementById('courier-palette');
  const svgWrap  = document.getElementById('courier-strap-wrap');
  if (!palette || !svgWrap) { setTimeout(initCourierSimulator, 100); return; }

  window.courierSimulatorInitialized = true;

  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  updateCourierPriceDisplay();
  loadCourierSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourierSimulator);
} else {
  initCourierSimulator();
}

// ============================================================================
// SVG 読み込み・適用
// ============================================================================

function loadCourierSVG() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;

  fetch('https://708works-lab.github.io/dev/courier_color_order.svg')
    .then(r => r.text())
    .then(svgText => {
      wrap.innerHTML = svgText;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
      }
      applyCourierColors();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="font-size:11px;color:#aaa;text-align:center;padding:20px;">読み込み中...</p>';
    });
}

function applyCourierColors() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;

  COURIER_ZONES.forEach(zone => {
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
      el.setAttribute('fill', courierColors[zone]);
      if (zone === 'belt') {
        // ベルト輪郭線は色に合わせて暗くする
        el.setAttribute('stroke', darkenHex(courierColors[zone], 0.6));
      }
    });
  });

  // ロゴ：革色に合わせてエングレービング色を自動調整
  const logo = wrap.querySelector('#logo');
  if (logo) logo.setAttribute('fill', engravingColor(courierColors.front));

  // ゾーンハイライト
  highlightActiveZone();
}

// 選択中ゾーンをハイライト
function highlightActiveZone() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;
  COURIER_ZONES.forEach(zone => {
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
      el.style.outline = 'none';
      if (zone === courierActiveZone) {
        el.setAttribute('stroke-width', '4');
        el.setAttribute('stroke', '#f0c040');
        el.setAttribute('stroke-opacity', '0.85');
      } else {
        el.removeAttribute('stroke-width');
        el.removeAttribute('stroke-opacity');
        if (zone === 'belt') {
          el.setAttribute('stroke', darkenHex(courierColors[zone], 0.6));
        } else {
          el.setAttribute('stroke', '#000');
        }
      }
    });
  });
}

// ============================================================================
// カラーユーティリティ
// ============================================================================

function darkenHex(hex, factor) {
  const h = hex.replace('#', '');
  const r = Math.floor(parseInt(h.substring(0,2),16) * factor);
  const g = Math.floor(parseInt(h.substring(2,4),16) * factor);
  const b = Math.floor(parseInt(h.substring(4,6),16) * factor);
  return `rgb(${r},${g},${b})`;
}

function engravingColor(leatherHex) {
  const h   = leatherHex.replace('#','');
  const r   = parseInt(h.substring(0,2),16);
  const g   = parseInt(h.substring(2,4),16);
  const b   = parseInt(h.substring(4,6),16);
  const lum = (r*0.299 + g*0.587 + b*0.114) / 255;
  if (lum > 0.45) {
    // 明るい革 → 暗めのエングレービング
    return `rgb(${Math.floor(r*0.55)},${Math.floor(g*0.55)},${Math.floor(b*0.55)})`;
  } else {
    // 暗い革 → 明るめのエングレービング
    const lr = Math.min(255, r + Math.floor((255-r)*0.45));
    const lg = Math.min(255, g + Math.floor((255-g)*0.45));
    const lb = Math.min(255, b + Math.floor((255-b)*0.45));
    return `rgb(${lr},${lg},${lb})`;
  }
}

function colorName(hex, zone) {
  const list = zone === 'belt' ? COURIER_BELT_COLORS : COURIER_LEATHER_COLORS;
  return list.find(c => c.hex === hex)?.name || hex;
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
      dot.style.width  = '20px';
      dot.style.height = '10px';
    }

    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + COURIER_ZONE_LABELS[zone]));
    container.appendChild(btn);
  });
}

function selectCourierZone(zone) {
  courierActiveZone = zone;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierPaletteLabel();
  highlightActiveZone();
}

function updateCourierPaletteLabel() {
  const label = document.getElementById('courier-palette-label');
  if (label) label.textContent = 'カラー（' + COURIER_ZONE_LABELS[courierActiveZone] + '）';
  const note = document.getElementById('courier-belt-note');
  if (note) note.style.display = courierActiveZone === 'belt' ? 'block' : 'none';
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildCourierPalette() {
  const palette = document.getElementById('courier-palette');
  if (!palette) return;
  palette.innerHTML = '';

  const colors = courierActiveZone === 'belt' ? COURIER_BELT_COLORS : COURIER_LEATHER_COLORS;
  const current = courierColors[courierActiveZone];

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'courier-swatch' + (c.hex === current ? ' selected' : '');
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.onclick = () => setCourierColor(c.hex);
    palette.appendChild(sw);
  });
}

function setCourierColor(hex) {
  saveCourierHistory();
  courierColors[courierActiveZone] = hex;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  applyCourierColors();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateCourierSummary() {
  const el = document.getElementById('courier-summary');
  if (!el) return;
  el.innerHTML = COURIER_ZONES.map(z => `
    <div class="summary-row">
      <span class="summary-label">${COURIER_ZONE_LABELS[z]}</span>
      <span class="summary-dot" style="background:${courierColors[z]}"></span>
      <span class="summary-name">${colorName(courierColors[z], z)}</span>
    </div>`).join('');
}

function updateCourierPriceDisplay() {
  const el = document.getElementById('courier-price-display');
  if (el) el.textContent = `¥${COURIER_PRICE.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveCourierHistory() {
  courierHistory.push({...courierColors});
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
  applyCourierColors();
  const btn = document.getElementById('courier-btn-undo');
  if (btn) btn.disabled = courierHistory.length === 0;
}

function courierReset() {
  saveCourierHistory();
  courierColors = {front:'#1a1a1a', belt:'#9e3820', rear:'#1a1a1a'};
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  applyCourierColors();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function courierSaveImage() {
  const svg  = document.querySelector('#courier-strap-wrap svg');
  if (!svg) { showCourierToast('SVGが見つかりません'); return; }

  const canvas = await svgToCanvas(svg);
  const link = document.createElement('a');
  link.download = `courier-color-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showCourierToast('画像を保存しました');
}

async function svgToCanvas(svgEl) {
  const W = 480, H = 1600, SCALE = 0.5;
  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const svgStr  = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
  const url     = URL.createObjectURL(svgBlob);

  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(); };
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return canvas;
}

// ============================================================================
// カート注文
// ============================================================================

async function courierGoOrder() {
  const loadingEl = document.getElementById('courier-loading-overlay');
  if (loadingEl) loadingEl.classList.add('show');

  try {
    const svg    = document.querySelector('#courier-strap-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await svgToCanvas(svg);
    const result = await courierUploadImage(canvas);
    if (!result) throw new Error('画像アップロードに失敗しました');

    courierLastUploadedImage = result;
    if (loadingEl) loadingEl.classList.remove('show');
    showCourierConfirmModal(result);
  } catch(e) {
    console.error(e);
    showCourierToast(e.message);
    if (loadingEl) loadingEl.classList.remove('show');
  }
}

async function courierUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'COU-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `courier-${orderId}.png`);
  form.append('orderId', orderId);

  const res = await fetch(COURIER_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showCourierConfirmModal(result) {
  const modal = document.getElementById('courier-confirm-modal');
  if (!modal) return;

  const img = document.getElementById('courier-modal-image');
  if (img) img.src = result.imageUrl;

  const info = document.getElementById('courier-modal-info');
  if (info) {
    info.innerHTML = `
      <p><strong>注文ID:</strong> ${result.orderId}</p>
      <div class="modal-color-list">
        ${COURIER_ZONES.map(z => `
          <div class="modal-color-row">
            <span class="modal-zone-label">${COURIER_ZONE_LABELS[z]}</span>
            <span class="modal-color-dot" style="background:${courierColors[z]}"></span>
            <span>${colorName(courierColors[z], z)}</span>
          </div>`).join('')}
      </div>
      <p style="font-size:11px;color:#888;margin-top:8px;">
        ※ ナイロンベルトは革と染料が異なるため、仕上がりの色味が若干異なる場合があります
      </p>`;
  }
  modal.classList.add('show');
}

function closeCourierModal() {
  const modal = document.getElementById('courier-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function courierProceedToCart() {
  if (!courierLastUploadedImage) { showCourierToast('画像情報が見つかりません'); return; }
  closeCourierModal();

  const colorDataEN = [
    `Front[Leather]:${colorName(courierColors.front,'front')}`,
    `Belt[Nylon]:${colorName(courierColors.belt,'belt')}`,
    `Rear[Leather]:${colorName(courierColors.rear,'rear')}`,
  ].join(', ');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${COURIER_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', COURIER_VARIANT_ID], ['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  {
    const props = {
      'Order ID':  courierLastUploadedImage.orderId,
      'Colors':    colorDataEN,
      'Image URL': courierLastUploadedImage.imageUrl,
    };
    Object.entries(props).forEach(([k,v]) => {
      const i = document.createElement('input');
      i.type='hidden'; i.name=`properties[${k}]`; i.value=v; form.appendChild(i);
    });
  }
  document.body.appendChild(form);
  form.submit();
}

// ============================================================================
// Toast
// ============================================================================

function showCourierToast(msg) {
  const el = document.getElementById('courier-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
