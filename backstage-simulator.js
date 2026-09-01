// ============================================================================
// 設定
// ============================================================================

const BACKSTAGE_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const BACKSTAGE_SHOPIFY_DOMAIN = '708works.jp';

// 価格（名入れ刻印の有無のみでバリアントが変わる。長さ等の構造的な選択肢は無し）
const BACKSTAGE_PRICE = 4400;
const BACKSTAGE_VARIANT_IDS = { noeng: '50208138625274', eng: '50208138658042' };

// レザーカラー（Folklore/Kolmioと共通の20色パレット）
const BACKSTAGE_LEATHER_COLORS = [
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

// 金具（カシメ・ナスカン）カラー
const BACKSTAGE_HARDWARE_COLORS = [
  {id:'gold',   name:'Gold',   hex:'#e5b415'},
  {id:'silver', name:'Silver', hex:'#c7c9cd'},
];

// SVG内のCSSクラス ⇔ ゾーンID の対応（backstage_color_order.svg / backstage_kokuin_base.svg 共通）
const BACKSTAGE_ZONE_CLASS = { leather: 'st2', hardware: 'st4' };
const BACKSTAGE_ZONES = ['leather', 'hardware'];
const BACKSTAGE_ZONE_LABEL = { leather: 'レザー', hardware: '金具（カシメ・ナスカン）' };

const BACKSTAGE_DEFAULT_COLORS = { leather: '#9e3820', hardware: '#e5b415' };

// ============================================================================
// 状態
// ============================================================================

let backstageColors      = { ...BACKSTAGE_DEFAULT_COLORS };
let backstageImageSaved  = false;
let backstageHistory     = [];
let backstageLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initBackstageSimulator() {
  if (window.backstageSimulatorInitialized) return;
  const wrap = document.getElementById('backstage-svg-wrap');
  const leatherPalette = document.getElementById('backstage-leather-palette');
  if (!wrap || !leatherPalette) { setTimeout(initBackstageSimulator, 100); return; }
  window.backstageSimulatorInitialized = true;

  buildBackstagePalettes();
  updateBackstageSummary();
  updateBackstagePriceDisplay();
  updateBackstageCartButtonState();
  loadBackstageSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackstageSimulator);
} else {
  initBackstageSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadBackstageSVG() {
  const wrap = document.getElementById('backstage-svg-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/backstage_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // SVG内にはサンプル文字「ABCDEFGHIJK」が直書きされているが、これは名入れ刻印
        // ウィジェットのプレースホルダー用の見本であり、通常時は表示しない（名入れ刻印を
        // 有効にした場合のみ backstage-kokuin-addon.js が実際の入力文字を描画する）。
        const kokuinGroup = svg.querySelector('#kokuin');
        if (kokuinGroup) kokuinGroup.innerHTML = '';
      }
      applyBackstageColors();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// カラー適用
// ============================================================================

// SVG内の <style> に定義された .st2(レザー) / .st4(金具) の fill をゾーンカラーで書き換える。
// 各ゾーンは対応するクラスを共有する全パーツ（商品イメージ・使用イメージの両方、複数パスにまたがる）に
// 一括で反映される。ロゴアイコン（.st0）はレザー色から自動計算した陰影色を使う。
function applyBackstageColors() {
  const svg = document.querySelector('#backstage-svg-wrap svg');
  if (!svg) return;
  const styleEl = svg.querySelector('defs style');
  if (styleEl) {
    let css = styleEl.textContent;
    BACKSTAGE_ZONES.forEach(zone => {
      const cls = BACKSTAGE_ZONE_CLASS[zone];
      const hex = backstageColors[zone];
      const re  = new RegExp(`(\\.${cls}\\s*{[^}]*fill:\\s*)#[0-9a-fA-F]{3,6}`);
      css = css.replace(re, `$1${hex}`);
    });
    styleEl.textContent = css;
  }

  const logo = svg.querySelector('#logo');
  if (logo) logo.style.fill = engravingColor(backstageColors.leather);

  if (typeof applyBackstageKokuinColors === 'function') applyBackstageKokuinColors();
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildBackstagePalettes() {
  buildBackstagePalette('leather', 'backstage-leather-palette', BACKSTAGE_LEATHER_COLORS);
  buildBackstagePalette('hardware', 'backstage-hardware-palette', BACKSTAGE_HARDWARE_COLORS);
}

function buildBackstagePalette(zone, elId, colors) {
  const palette = document.getElementById(elId);
  if (!palette) return;
  palette.innerHTML = '';
  const current = backstageColors[zone];

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'backstage-swatch' + (c.hex === current ? ' selected' : '');
    // テーマのbase.cssに `div:empty{display:none}` があるため、
    // 子要素を持たない空divのままだと非表示になってしまう。display指定を明示して回避する。
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setBackstageColor(zone, c.hex);
    palette.appendChild(sw);
  });
}

function setBackstageColor(zone, hex) {
  saveBackstageHistory();
  backstageColors[zone] = hex;
  backstageImageSaved = false;
  buildBackstagePalettes();
  updateBackstageSummary();
  updateBackstageCartButtonState();
  applyBackstageColors();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateBackstageSummary() {
  const el = document.getElementById('backstage-summary');
  if (!el) return;
  el.innerHTML = BACKSTAGE_ZONES.map(zone => `
    <div class="summary-row">
      <span class="summary-label">${BACKSTAGE_ZONE_LABEL[zone]}</span>
      <span class="summary-dot" style="background:${backstageColors[zone]}"></span>
      <span class="summary-name">${colorName(backstageColors[zone], zone)}</span>
    </div>`).join('');
}

function updateBackstagePriceDisplay() {
  const el = document.getElementById('backstage-price-display');
  if (!el) return;
  const kokuinAdd = (window.BACKSTAGE_KOKUIN_STATE?.enabled && window.BACKSTAGE_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(BACKSTAGE_PRICE + kokuinAdd).toLocaleString()}（税込）`;
}

function paletteForZone(zone) {
  return zone === 'hardware' ? BACKSTAGE_HARDWARE_COLORS : BACKSTAGE_LEATHER_COLORS;
}

function colorName(hex, zone) {
  return paletteForZone(zone).find(c => c.hex === hex)?.name || hex;
}

// ============================================================================
// カラーユーティリティ
// ============================================================================

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

function saveBackstageHistory() {
  backstageHistory.push({...backstageColors});
  if (backstageHistory.length > 20) backstageHistory.shift();
  const btn = document.getElementById('backstage-btn-undo');
  if (btn) btn.disabled = false;
}

function backstageUndo() {
  if (!backstageHistory.length) return;
  backstageColors = backstageHistory.pop();
  backstageImageSaved = false;
  buildBackstagePalettes();
  updateBackstageSummary();
  updateBackstageCartButtonState();
  applyBackstageColors();
  const btn = document.getElementById('backstage-btn-undo');
  if (btn) btn.disabled = backstageHistory.length === 0;
}

function backstageReset() {
  saveBackstageHistory();
  backstageColors = { ...BACKSTAGE_DEFAULT_COLORS };
  backstageImageSaved = false;
  buildBackstagePalettes();
  updateBackstageSummary();
  updateBackstageCartButtonState();
  applyBackstageColors();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function backstageSaveImage() {
  const svg = document.querySelector('#backstage-svg-wrap svg');
  if (!svg) { showBackstageToast('SVGが見つかりません'); return; }
  const canvas = await buildBackstageSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `backstage-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  backstageImageSaved = true;
  updateBackstageCartButtonState();
  showBackstageToast('画像を保存しました ✓　カートに進めます');
}

// 保存・注文アップロード用のキャンバスを生成する。
// ヘッダー・配色サマリーを合成し、他シリーズのカラーシミュレーターと同じ見せ方にする。
async function buildBackstageSaveCanvas() {
  const SVG_VW = 416.36, SVG_VH = 908.1;
  const svgSaveW = 300;
  const scale = svgSaveW / SVG_VW;
  const svgSaveH = Math.round(SVG_VH * scale);

  const measureCtx = document.createElement('canvas').getContext('2d');
  let labelColW = 60;
  BACKSTAGE_ZONES.forEach(zone => {
    const hex = backstageColors[zone];
    measureCtx.font = '13px sans-serif';
    const nameW = measureCtx.measureText(colorName(hex, zone)).width;
    measureCtx.font = '10px sans-serif';
    const smallW = measureCtx.measureText(BACKSTAGE_ZONE_LABEL[zone]).width;
    labelColW = Math.max(labelColW, 20 + Math.max(nameW, smallW));
  });

  const margin = 46;
  const gap    = 24;
  const cw = margin * 2 + svgSaveW + gap + labelColW;

  const kokuin = window.BACKSTAGE_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const kokuinH = kokuinEnabled ? 78 : 0;

  const headerH = 64;
  const svgY0 = headerH + 16;
  const footerH = 34;
  const ch = svgY0 + svgSaveH + kokuinH + footerH + 16;

  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, cw, ch);

  // ヘッダー
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BACKSTAGE', cw / 2, 38);
  ctx.fillStyle = '#666';
  ctx.font = '13px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 56);

  // SVGをシリアライズしてCanvasに描画（iOS Safari互換のためdata URIを使用）
  const svgEl = document.querySelector('#backstage-svg-wrap svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
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
  const rowGap = svgSaveH / (BACKSTAGE_ZONES.length + 1);
  BACKSTAGE_ZONES.forEach((zone, i) => {
    const hex = backstageColors[zone];
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
    ctx.fillText(BACKSTAGE_ZONE_LABEL[zone], labelX + 20, y - 3);

    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.fillText(colorName(hex, zone), labelX + 20, y + 14);
  });

  // 名入れ刻印プレビュー（実際に選んだフォントで描画。あとから見返せるよう保存画像に含める）
  if (kokuinEnabled) {
    const boxX = margin, boxY = svgY0 + svgSaveH + 6;
    const boxW = cw - margin * 2, boxH = kokuinH - 12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boxX + 8, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, 8);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, 8);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, 8);
    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('名入れ刻印', boxX + 14, boxY + 18);

    await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
    ctx.textAlign = 'left';
    ctx.fillText(kokuin.text, boxX + 14, boxY + boxH - 16);
  }

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

function updateBackstageCartButtonState() {
  const cartLabel = document.getElementById('backstage-cart-label');
  if (cartLabel) cartLabel.textContent = '画像を保存してカートに入れる →';
}

async function backstageGoOrder() {
  if (window.BACKSTAGE_KOKUIN_STATE?.enabled && !window.BACKSTAGE_KOKUIN_STATE.valid) {
    showBackstageToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!backstageImageSaved) {
    await backstageSaveImage();
  }
  const loadEl = document.getElementById('backstage-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg = document.querySelector('#backstage-svg-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildBackstageSaveCanvas();
    const result = await backstageUploadImage(canvas);
    if (!result) throw new Error('画像アップロードに失敗しました');
    backstageLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showBackstageConfirmModal(result);
  } catch(e) {
    console.error(e);
    showBackstageToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function backstageUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'BST-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `backstage-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(BACKSTAGE_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showBackstageConfirmModal(result) {
  const modal = document.getElementById('backstage-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('backstage-modal-image');
  if (img) img.src = result.imageUrl;

  const kokuin = window.BACKSTAGE_KOKUIN_STATE;
  const kokuinRow = kokuin?.enabled
    ? `<div class="modal-color-row"><span class="modal-zone-label">名入れ刻印</span><span>「${kokuin.text}」（${kokuin.fontLabel}）</span></div>`
    : '';

  const info = document.getElementById('backstage-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      ${BACKSTAGE_ZONES.map(zone => `
        <div class="modal-color-row">
          <span class="modal-zone-label">${BACKSTAGE_ZONE_LABEL[zone]}</span>
          <span class="modal-color-dot" style="background:${backstageColors[zone]}"></span>
          <span>${colorName(backstageColors[zone], zone)}</span>
        </div>`).join('')}
      ${kokuinRow}
    </div>`;
  modal.classList.add('show');
}

function closeBackstageModal() {
  const modal = document.getElementById('backstage-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function backstageProceedToCart() {
  if (!backstageLastUploadedImage) { showBackstageToast('画像情報が見つかりません'); return; }
  closeBackstageModal();

  const colorDataEN = BACKSTAGE_ZONES
    .map(zone => `${BACKSTAGE_ZONE_LABEL[zone]}:${colorName(backstageColors[zone], zone)}`)
    .join(', ');

  const kokuin = window.BACKSTAGE_KOKUIN_STATE;
  const kokuinEnabled = !!kokuin?.enabled;
  const variantId = BACKSTAGE_VARIANT_IDS[kokuinEnabled ? 'eng' : 'noeng'];

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${BACKSTAGE_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  const properties = {
    'Order ID': backstageLastUploadedImage.orderId,
    'Colors': colorDataEN,
    'Image URL': backstageLastUploadedImage.imageUrl
  };
  if (kokuinEnabled) {
    properties['刻印文字'] = kokuin.text;
    properties['刻印フォント'] = kokuin.fontLabel;
  }
  Object.entries(properties)
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

function showBackstageToast(msg) {
  const el = document.getElementById('backstage-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
