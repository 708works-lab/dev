// ============================================================================
// 設定
// ============================================================================

const TRIAD_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const TRIAD_SHOPIFY_DOMAIN = '708works.jp';

// 価格（長さバリエーションなし・単一価格）
const TRIAD_PRICE      = 27170;
const TRIAD_VARIANT_ID = '50079425396986';

// 3つ編みベルト用カラー（Triad専用12色。参照：708works.jp/products/sample02のカラーサンプル実写）
const TRIAD_BELT_COLORS = [
  {id:'natural',   name:'Natural',    hex:'#e1c5ba'},
  {id:'camel',     name:'Camel',      hex:'#e4ad90'},
  {id:'brown',     name:'Brown',      hex:'#b96358'},
  {id:'red',       name:'Red',        hex:'#da5050'},
  {id:'navy',      name:'Navy',       hex:'#3f506b'},
  {id:'black',     name:'Black',      hex:'#2b3240'},
  {id:'lightgrn',  name:'Light GRN',  hex:'#a3be81'},
  {id:'green',     name:'Green',      hex:'#52ae98'},
  {id:'sora',      name:'Sora',       hex:'#4d9bb6'},
  {id:'deepred',   name:'Deep Red',   hex:'#b94d5d'},
  {id:'grey',      name:'Grey',       hex:'#6c90ac'},
  {id:'darkbrown', name:'Dark Brown', hex:'#483940'},
];

// 取付け部分の革（馬ヌメ革・ストラップピン穴側）カラー
const TRIAD_PARTS_COLORS = [
  {id:'brown', name:'Brown', hex:'#49020d'},
  {id:'black', name:'Black', hex:'#1c1614'},
];

// 金具（バックル・カシメ）カラー
const TRIAD_HARDWARE_COLORS = [
  {id:'gold',   name:'Gold',   hex:'#e5b415'},
  {id:'silver', name:'Silver', hex:'#c7c9cd'},
];

// SVG内のCSSクラス ⇔ ゾーンID の対応
const TRIAD_ZONE_CLASS = {
  leather1: 'st1',
  leather2: 'st4',
  leather3: 'st2',
  parts:    'st5',
  hardware: 'st6',
};

const TRIAD_ZONES = ['leather1', 'leather2', 'leather3', 'parts', 'hardware'];

const TRIAD_ZONE_LABEL = {
  leather1: 'ベルト①',
  leather2: 'ベルト②',
  leather3: 'ベルト③',
  parts:    '取付け革（前後共通）',
  hardware: '金具（バックル・カシメ）',
};

// ============================================================================
// 状態
// ============================================================================

let triadColors = {
  leather1: '#e4ad90',
  leather2: '#da5050',
  leather3: '#3f506b',
  parts:    '#49020d',
  hardware: '#e5b415',
};
let triadActiveZone  = 'leather1';
let triadImageSaved  = false;
let triadHistory     = [];
let triadLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initTriadSimulator() {
  if (window.triadSimulatorInitialized) return;
  const palette = document.getElementById('triad-palette');
  const wrap    = document.getElementById('triad-strap-wrap');
  if (!palette || !wrap) { setTimeout(initTriadSimulator, 100); return; }
  window.triadSimulatorInitialized = true;

  buildTriadZoneButtons();
  buildTriadPalette();
  updateTriadSummary();
  updateTriadPriceDisplay();
  updateTriadCartButtonState();
  loadTriadSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTriadSimulator);
} else {
  initTriadSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadTriadSVG() {
  const wrap = document.getElementById('triad-strap-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/triad_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
      }
      applyTriadColors();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// カラー適用
// ============================================================================

// SVG内の <style> に定義された .st1〜.st6 の fill をゾーンカラーで書き換える。
// 各ゾーンは対応するクラスを共有する全パーツ（前面・背面の両方、複数パスにまたがる）に
// 一括で反映される。
function applyTriadColors() {
  const svg = document.querySelector('#triad-strap-wrap svg');
  if (!svg) return;
  const styleEl = svg.querySelector('defs style');
  if (!styleEl) return;

  let css = styleEl.textContent;
  TRIAD_ZONES.forEach(zone => {
    const cls = TRIAD_ZONE_CLASS[zone];
    const hex = triadColors[zone];
    const re  = new RegExp(`(\\.${cls}\\s*{[^}]*fill:\\s*)#[0-9a-fA-F]{3,6}`);
    css = css.replace(re, `$1${hex}`);
  });
  styleEl.textContent = css;

  const logo = svg.querySelector('#logo');
  if (logo) logo.style.fill = engravingColor(triadColors.parts);

  highlightActiveZone();
}

function highlightActiveZone() {
  const svg = document.querySelector('#triad-strap-wrap svg');
  if (!svg) return;

  TRIAD_ZONES.forEach(zone => {
    const cls = TRIAD_ZONE_CLASS[zone];
    const isActive = zone === triadActiveZone;
    svg.querySelectorAll(`.${cls}`).forEach(el => {
      if (isActive) {
        el.style.stroke = '#ffffff';
        el.style.strokeWidth = '1.1';
        el.style.strokeOpacity = '0.9';
      } else {
        el.style.stroke = 'none';
      }
    });
  });
}

// ============================================================================
// ゾーンボタン
// ============================================================================

function buildTriadZoneButtons() {
  const container = document.getElementById('triad-zones');
  if (!container) return;
  container.innerHTML = '';

  TRIAD_ZONES.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'triad-zone-btn' + (zone === triadActiveZone ? ' active' : '');
    btn.onclick = () => selectTriadZone(zone);

    const dot = document.createElement('span');
    dot.className = 'zone-dot';
    dot.style.background = triadColors[zone];
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + TRIAD_ZONE_LABEL[zone]));
    container.appendChild(btn);
  });
}

function selectTriadZone(zone) {
  triadActiveZone = zone;
  buildTriadZoneButtons();
  buildTriadPalette();
  updateTriadPaletteLabel();
  highlightActiveZone();
}

function updateTriadPaletteLabel() {
  const label = document.getElementById('triad-palette-label');
  if (label) label.textContent = 'カラー（' + TRIAD_ZONE_LABEL[triadActiveZone] + '）';
}

// ============================================================================
// カラーパレット
// ============================================================================

function paletteForZone(zone) {
  if (zone === 'parts')    return TRIAD_PARTS_COLORS;
  if (zone === 'hardware') return TRIAD_HARDWARE_COLORS;
  return TRIAD_BELT_COLORS;
}

function buildTriadPalette() {
  const palette = document.getElementById('triad-palette');
  if (!palette) return;
  palette.innerHTML = '';

  const colors  = paletteForZone(triadActiveZone);
  const current = triadColors[triadActiveZone];

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'triad-swatch' + (c.hex === current ? ' selected' : '');
    // テーマのbase.cssに `div:empty{display:none}` があるため、
    // 子要素を持たない空divのままだと非表示になってしまう。display指定を明示して回避する。
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setTriadColor(c.hex);
    palette.appendChild(sw);
  });
}

function setTriadColor(hex) {
  saveTriadHistory();
  triadColors[triadActiveZone] = hex;
  triadImageSaved = false;
  buildTriadZoneButtons();
  buildTriadPalette();
  updateTriadSummary();
  updateTriadCartButtonState();
  applyTriadColors();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateTriadSummary() {
  const el = document.getElementById('triad-summary');
  if (!el) return;

  el.innerHTML = TRIAD_ZONES.map(zone => `
    <div class="summary-row">
      <span class="summary-label">${TRIAD_ZONE_LABEL[zone]}</span>
      <span class="summary-dot" style="background:${triadColors[zone]}"></span>
      <span class="summary-name">${colorName(triadColors[zone], zone)}</span>
    </div>`).join('');
}

function updateTriadPriceDisplay() {
  const el = document.getElementById('triad-price-display');
  if (el) el.textContent = `¥${TRIAD_PRICE.toLocaleString()}（税込）`;
}

function colorName(hex, zone) {
  return paletteForZone(zone).find(c => c.hex === hex)?.name || hex;
}

// ============================================================================
// カラーユーティリティ
// ============================================================================

function darkenHex(hex, factor) {
  const h = hex.replace('#','');
  return `rgb(${Math.floor(parseInt(h.slice(0,2),16)*factor)},${Math.floor(parseInt(h.slice(2,4),16)*factor)},${Math.floor(parseInt(h.slice(4,6),16)*factor)})`;
}

function engravingColor(hex) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lum = (r*0.299 + g*0.587 + b*0.114) / 255;
  if (lum > 0.45) {
    return `rgb(${Math.floor(r*.5)},${Math.floor(g*.5)},${Math.floor(b*.5)})`;
  } else {
    return `rgb(${Math.min(255,r+Math.floor((255-r)*.45))},${Math.min(255,g+Math.floor((255-g)*.45))},${Math.min(255,b+Math.floor((255-b)*.45))})`;
  }
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveTriadHistory() {
  triadHistory.push({...triadColors});
  if (triadHistory.length > 20) triadHistory.shift();
  const btn = document.getElementById('triad-btn-undo');
  if (btn) btn.disabled = false;
}

function triadUndo() {
  if (!triadHistory.length) return;
  triadColors = triadHistory.pop();
  triadImageSaved = false;
  buildTriadZoneButtons();
  buildTriadPalette();
  updateTriadPaletteLabel();
  updateTriadSummary();
  updateTriadCartButtonState();
  applyTriadColors();
  const btn = document.getElementById('triad-btn-undo');
  if (btn) btn.disabled = triadHistory.length === 0;
}

function triadReset() {
  saveTriadHistory();
  triadColors = {
    leather1: '#e4ad90',
    leather2: '#da5050',
    leather3: '#3f506b',
    parts:    '#49020d',
    hardware: '#e5b415',
  };
  triadActiveZone = 'leather1';
  triadImageSaved = false;
  buildTriadZoneButtons();
  buildTriadPalette();
  updateTriadPaletteLabel();
  updateTriadSummary();
  updateTriadCartButtonState();
  applyTriadColors();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function triadSaveImage() {
  const svg = document.querySelector('#triad-strap-wrap svg');
  if (!svg) { showTriadToast('SVGが見つかりません'); return; }
  const canvas = await buildTriadSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `triad-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  triadImageSaved = true;
  updateTriadCartButtonState();
  showTriadToast('画像を保存しました ✓　カートに進めます');
}

// 保存・注文アップロード用のキャンバスを生成する。
// ヘッダー・配色サマリーを合成し、他シリーズのカラーシミュレーターと同じ見せ方にする。
async function buildTriadSaveCanvas() {
  const SVG_VW = 470.31, SVG_VH = 973.91;
  const svgSaveW = 480;
  const scale = svgSaveW / SVG_VW;
  const svgSaveH = Math.round(SVG_VH * scale);

  const measureCtx = document.createElement('canvas').getContext('2d');
  let labelColW = 60;
  TRIAD_ZONES.forEach(zone => {
    const hex = triadColors[zone];
    measureCtx.font = '13px sans-serif';
    const nameW = measureCtx.measureText(colorName(hex, zone)).width;
    measureCtx.font = '10px sans-serif';
    const smallW = measureCtx.measureText(TRIAD_ZONE_LABEL[zone]).width;
    labelColW = Math.max(labelColW, 20 + Math.max(nameW, smallW));
  });

  const margin = 46;
  const gap    = 24;
  const cw = margin * 2 + svgSaveW + gap + labelColW;

  const headerH = 64;
  const svgY0 = headerH + 16;
  const footerH = 34;
  const ch = svgY0 + svgSaveH + footerH + 16;

  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, cw, ch);

  // ヘッダー
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRIAD', cw / 2, 38);
  ctx.fillStyle = '#666';
  ctx.font = '13px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 56);

  // SVGをシリアライズしてCanvasに描画（iOS Safari互換のためdata URIを使用）
  const svgEl = document.querySelector('#triad-strap-wrap svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    // 選択中ゾーンのハイライト枠は保存画像には不要
    cloned.querySelectorAll('[style*="stroke"]').forEach(el => { el.style.stroke = 'none'; });
    const svgStr  = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { ctx.drawImage(img, margin, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  // 右側：配色サマリー（等間隔に配置）
  const labelX = margin + svgSaveW + gap;
  const rowGap = svgSaveH / (TRIAD_ZONES.length + 1);
  TRIAD_ZONES.forEach((zone, i) => {
    const hex = triadColors[zone];
    const y = svgY0 + rowGap * (i + 1);

    ctx.beginPath();
    ctx.arc(labelX + 7, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(TRIAD_ZONE_LABEL[zone], labelX + 20, y - 3);

    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.fillText(colorName(hex, zone), labelX + 20, y + 14);
  });

  // フッター
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 12);

  return cv;
}

// ============================================================================
// カート注文
// ============================================================================

function updateTriadCartButtonState() {
  const cartBtn  = document.querySelector('.triad-simulator .btn-order');
  const cartLabel= document.getElementById('triad-cart-label');
  const saveBtn  = document.querySelector('.triad-simulator .sbtn');
  const svgDl = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const svgOk = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

  if (cartLabel) {
    cartLabel.textContent = triadImageSaved
      ? 'この配色で注文する →'
      : '先に画像を保存してください →';
  }
  if (cartBtn) {
    Object.assign(cartBtn.style, triadImageSaved
      ? { opacity:'1', cursor:'pointer', background:'#111', color:'#fff' }
      : { opacity:'1', cursor:'not-allowed', background:'#bbb', color:'#fff' });
  }
  if (saveBtn) {
    saveBtn.innerHTML = triadImageSaved
      ? `${svgOk} 保存済み`
      : `${svgDl} 画像を保存する`;
    Object.assign(saveBtn.style, triadImageSaved
      ? { background:'#edf7ee', borderColor:'#5cb86a', color:'#2e7d32' }
      : { background:'', borderColor:'', color:'' });
  }
}

async function triadGoOrder() {
  if (!triadImageSaved) {
    showTriadToast('先に「画像を保存する」を押してください');
    const saveBtn = document.querySelector('.triad-simulator .sbtn');
    if (saveBtn) { saveBtn.classList.add('t-shake'); setTimeout(() => saveBtn.classList.remove('t-shake'), 500); }
    return;
  }
  const loadEl = document.getElementById('triad-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg = document.querySelector('#triad-strap-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildTriadSaveCanvas();
    const result = await triadUploadImage(canvas);
    if (!result) throw new Error('画像アップロードに失敗しました');
    triadLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showTriadConfirmModal(result);
  } catch(e) {
    console.error(e);
    showTriadToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function triadUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'TRI-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `triad-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(TRIAD_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showTriadConfirmModal(result) {
  const modal = document.getElementById('triad-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('triad-modal-image');
  if (img) img.src = result.imageUrl;

  const info = document.getElementById('triad-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      ${TRIAD_ZONES.map(zone => `
        <div class="modal-color-row">
          <span class="modal-zone-label">${TRIAD_ZONE_LABEL[zone]}</span>
          <span class="modal-color-dot" style="background:${triadColors[zone]}"></span>
          <span>${colorName(triadColors[zone], zone)}</span>
        </div>`).join('')}
    </div>`;
  modal.classList.add('show');
}

function closeTriadModal() {
  const modal = document.getElementById('triad-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function triadProceedToCart() {
  if (!triadLastUploadedImage) { showTriadToast('画像情報が見つかりません'); return; }
  closeTriadModal();

  const colorDataEN = TRIAD_ZONES
    .map(zone => `${TRIAD_ZONE_LABEL[zone]}:${colorName(triadColors[zone], zone)}`)
    .join(', ');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${TRIAD_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', TRIAD_VARIANT_ID],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  Object.entries({'Order ID': triadLastUploadedImage.orderId, 'Colors': colorDataEN, 'Image URL': triadLastUploadedImage.imageUrl})
    .forEach(([k,v]) => {
      const i = document.createElement('input');
      i.type='hidden'; i.name=`properties[${k}]`; i.value=v; form.appendChild(i);
    });

  document.body.appendChild(form);
  form.submit();
}

// ============================================================================
// Toast
// ============================================================================

function showTriadToast(msg) {
  const el = document.getElementById('triad-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
