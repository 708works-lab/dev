// ============================================================================
// 設定
// ============================================================================

const SUS4W_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const SUS4W_SHOPIFY_DOMAIN = '708works.jp';

// 価格（名入れ刻印の有無のみでバリアントが変わる。革色は価格に影響しない。
// 金具色は資材調達の都合によりSilver固定のため選択肢自体を提供しない。
// Phase1: ウロコパーツ1枚ずつの色分け・増減は対象外（第2フェーズ以降）
const SUS4W_PRICE = 17358;
const SUS4W_VARIANT_IDS = { noeng: '67583636701434', eng: '67583636734202' };

// レザーカラー（Backstage/Capo/Folklore/Kolmio/Nametag/SUS4と共通の20色パレット）
const SUS4W_LEATHER_COLORS = [
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

// 金具（サスペンダークリップ・連結リング）は資材調達の都合によりSilver固定。
// ユーザーが選択する余地はなく、SVG内の該当クラスを常にこの色で上書きする。
const SUS4W_HARDWARE_FIXED = { label: '金具色', name: 'Silver（現状はSilverのみ）', hex: '#c7c9cd' };

// SVG内のCSSクラス ⇔ ゾーンID の対応（sus4_w_wellington_color_order.svg 共通）
// leather1=革1（本体。ウロコパーツ一式＋両端フラップをPhase1では一括で同一色に。
//   708worksロゴ or 名入れ刻印が入るのもこのゾーン）
// leather2=革2（バッグ開口部のサスペンダークリップに直結する連結ループ側）
const SUS4W_ZONE_CLASS = { leather1: 'st2', leather2: 'st3' };
const SUS4W_ZONES = ['leather1', 'leather2'];
const SUS4W_ZONE_LABEL = { leather1: '本体', leather2: 'バッグ接続部分' };

// 金具はst5固定（このSVGではproduct_image/product_image1とも単一クラスで完結）
const SUS4W_HARDWARE_CLASSES = ['st5'];

const SUS4W_DEFAULT_COLORS = { leather1: '#9e3820', leather2: '#1a1a1a' };

// ============================================================================
// 状態
// ============================================================================

let sus4wColors     = { ...SUS4W_DEFAULT_COLORS };
let sus4wImageSaved = false;
let sus4wHistory    = [];
let sus4wLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initSus4wSimulator() {
  if (window.sus4wSimulatorInitialized) return;
  const wrap = document.getElementById('sus4w-svg-wrap');
  const leather1Palette = document.getElementById('sus4w-leather1-palette');
  if (!wrap || !leather1Palette) { setTimeout(initSus4wSimulator, 100); return; }
  window.sus4wSimulatorInitialized = true;

  buildSus4wPalettes();
  updateSus4wSummary();
  updateSus4wPriceDisplay();
  updateSus4wCartButtonState();
  loadSus4wSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSus4wSimulator);
} else {
  initSus4wSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadSus4wSVG() {
  const wrap = document.getElementById('sus4w-svg-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/sus4_w_wellington_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // kokuin/kokuin1 グループには元データのサンプル刻印「kokuin」が入っているため、
        // 名入れ刻印を有効にしていない通常時は空にしておく（実際の描画は
        // sus4w-kokuin-addon.js が担当する）。
        ['kokuin', 'kokuin1'].forEach(id => {
          const el = svg.querySelector('#' + id);
          if (el) el.innerHTML = '';
        });
      }
      applySus4wState();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// 状態の反映（革1色・革2色・金具は常にSilver固定・名入れ刻印）
// ============================================================================

function applySus4wState() {
  const svg = document.querySelector('#sus4w-svg-wrap svg');
  if (!svg) return;

  const styleEl = svg.querySelector('defs style') || svg.querySelector('style');
  if (styleEl) {
    const colorMap = {
      [SUS4W_ZONE_CLASS.leather1]: sus4wColors.leather1,
      [SUS4W_ZONE_CLASS.leather2]: sus4wColors.leather2,
    };
    SUS4W_HARDWARE_CLASSES.forEach(cls => { colorMap[cls] = SUS4W_HARDWARE_FIXED.hex; });

    styleEl.textContent = styleEl.textContent.replace(/([^{}]+)\{([^}]*)\}/g, (match, selectorPart, body) => {
      const selectors = selectorPart.split(',').map(s => s.trim().replace(/^\./, ''));
      const hit = selectors.find(s => colorMap[s] !== undefined);
      if (!hit) return match;
      const newBody = body.replace(/fill:\s*#[0-9a-fA-F]{3,6}/, `fill: ${colorMap[hit]}`);
      return `${selectorPart}{${newBody}}`;
    });
  }

  if (typeof applySus4wKokuinColors === 'function') applySus4wKokuinColors();
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildSus4wPalettes() {
  buildSus4wLeatherPalette('leather1', 'sus4w-leather1-palette');
  buildSus4wLeatherPalette('leather2', 'sus4w-leather2-palette');
}

function buildSus4wLeatherPalette(zone, elementId) {
  const palette = document.getElementById(elementId);
  if (!palette) return;
  palette.innerHTML = '';
  const current = sus4wColors[zone];

  SUS4W_LEATHER_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'sus4w-swatch' + (c.hex === current ? ' selected' : '');
    // テーマのbase.cssに `div:empty{display:none}` があるため、
    // 子要素を持たない空divのままだと非表示になってしまう。display指定を明示して回避する。
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setSus4wLeather(zone, c.hex);
    palette.appendChild(sw);
  });
}

function setSus4wLeather(zone, hex) {
  saveSus4wHistory();
  sus4wColors[zone] = hex;
  sus4wImageSaved = false;
  buildSus4wPalettes();
  updateSus4wSummary();
  updateSus4wCartButtonState();
  applySus4wState();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateSus4wSummary() {
  const el = document.getElementById('sus4w-summary');
  if (!el) return;
  const rows = SUS4W_ZONES.map(zone => `
    <div class="summary-row">
      <span class="summary-label">${SUS4W_ZONE_LABEL[zone]}</span>
      <span class="summary-dot" style="background:${sus4wColors[zone]}"></span>
      <span class="summary-name">${colorName(sus4wColors[zone])}</span>
    </div>`).join('');
  const hardwareRow = `
    <div class="summary-row">
      <span class="summary-label">${SUS4W_HARDWARE_FIXED.label}</span>
      <span class="summary-dot" style="background:${SUS4W_HARDWARE_FIXED.hex}"></span>
      <span class="summary-name">${SUS4W_HARDWARE_FIXED.name}</span>
    </div>`;
  el.innerHTML = rows + hardwareRow;
}

function updateSus4wPriceDisplay() {
  const el = document.getElementById('sus4w-price-display');
  if (!el) return;
  const kokuinAdd = (window.SUS4W_KOKUIN_STATE?.enabled && window.SUS4W_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(SUS4W_PRICE + kokuinAdd).toLocaleString()}（税込）`;
}

function colorName(hex) {
  return SUS4W_LEATHER_COLORS.find(c => c.hex === hex)?.name || hex;
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

function saveSus4wHistory() {
  sus4wHistory.push({ colors: {...sus4wColors} });
  if (sus4wHistory.length > 20) sus4wHistory.shift();
  const btn = document.getElementById('sus4w-btn-undo');
  if (btn) btn.disabled = false;
}

function sus4wUndo() {
  if (!sus4wHistory.length) return;
  const prev = sus4wHistory.pop();
  sus4wColors = prev.colors;
  sus4wImageSaved = false;
  buildSus4wPalettes();
  updateSus4wSummary();
  updateSus4wCartButtonState();
  applySus4wState();
  const btn = document.getElementById('sus4w-btn-undo');
  if (btn) btn.disabled = sus4wHistory.length === 0;
}

function sus4wReset() {
  saveSus4wHistory();
  sus4wColors = { ...SUS4W_DEFAULT_COLORS };
  sus4wImageSaved = false;
  buildSus4wPalettes();
  updateSus4wSummary();
  updateSus4wCartButtonState();
  applySus4wState();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

const SUS4W_KOKUIN_FONT_SOURCES = {
  'Cabin Sketch': { google: true, param: 'Cabin+Sketch:wght@700' },
  'Special Elite': { google: true, param: 'Special+Elite' },
  'AG Stencil': { google: false, url: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf' },
  'Lobster': { google: true, param: 'Lobster' },
  'Playball': { google: true, param: 'Playball' },
  'Great Vibes': { google: true, param: 'Great+Vibes' },
  'Bebas Neue': { google: true, param: 'Bebas+Neue' },
  'UnifrakturMaguntia': { google: true, param: 'UnifrakturMaguntia' }
};
const sus4wKokuinFontDataUriCache = {};
function sus4wKokuinBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
async function sus4wKokuinFontDataUri(family) {
  if (sus4wKokuinFontDataUriCache[family]) return sus4wKokuinFontDataUriCache[family];
  const src = SUS4W_KOKUIN_FONT_SOURCES[family];
  if (!src) return null;
  const promise = (async () => {
    try {
      let fontUrl, mime;
      if (src.google) {
        const cssText = await (await fetch(`https://fonts.googleapis.com/css2?family=${src.param}&display=swap`)).text();
        const fontBlocks = cssText.split('}').filter(b => b.includes('@font-face'));
        const latinBlock = fontBlocks.find(b => /unicode-range:[^;]*U\+0000-00FF/.test(b)) || fontBlocks[fontBlocks.length - 1] || cssText;
        const m = latinBlock.match(/src:\s*url\(([^)]+)\)\s*format\('(woff2?|truetype)'\)/);
        if (!m) return null;
        fontUrl = m[1];
        mime = m[2] === 'truetype' ? 'font/ttf' : 'font/woff2';
      } else {
        fontUrl = src.url;
        mime = 'font/ttf';
      }
      const buf = await (await fetch(fontUrl)).arrayBuffer();
      return `data:${mime};base64,${sus4wKokuinBufferToBase64(buf)}`;
    } catch (e) {
      return null;
    }
  })();
  sus4wKokuinFontDataUriCache[family] = promise;
  return promise;
}
async function embedSus4wKokuinFontIntoSvg(svgRoot, family, weight) {
  const dataUri = await sus4wKokuinFontDataUri(family);
  if (!dataUri) return;
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = `@font-face{font-family:'${family}';font-weight:${weight || 400};src:url(${dataUri});}`;
  svgRoot.insertBefore(style, svgRoot.firstChild);
}

async function sus4wSaveImage() {
  const svg = document.querySelector('#sus4w-svg-wrap svg');
  if (!svg) { showSus4wToast('SVGが見つかりません'); return; }
  const canvas = await buildSus4wSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `sus4w-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  sus4wImageSaved = true;
  updateSus4wCartButtonState();
  showSus4wToast('画像を保存しました ✓');
}

async function buildSus4wSaveCanvas() {
  const kokuin = window.SUS4W_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);

  const chips = [...SUS4W_ZONES, 'hardware'].map(zone => ({
    hex: zone === 'hardware' ? SUS4W_HARDWARE_FIXED.hex : sus4wColors[zone],
    label: zone === 'hardware' ? SUS4W_HARDWARE_FIXED.name : colorName(sus4wColors[zone]),
  }));
  if (kokuinEnabled) {
    chips.push({ hex: engravingColor(sus4wColors.leather1), label: `刻印「${kokuin.text}」` });
  }

  return build708SaveCanvas({
    title: 'SUS4 with Wellington',
    svgSelector: '#sus4w-svg-wrap svg',
    svgW: 353.62, svgH: 1180.85,
    chips,
    prepareSvg: async (cloned) => {
      if (kokuinEnabled && kokuin?.fontFamily) {
        await embedSus4wKokuinFontIntoSvg(cloned, kokuin.fontFamily, kokuin.fontWeight);
      }
    },
  });
}

// ============================================================================
// カート注文
// ============================================================================

function updateSus4wCartButtonState() {
  const cartLabel = document.getElementById('sus4w-cart-label');
  if (cartLabel) cartLabel.textContent = 'カートに入れる →';
}

async function sus4wGoOrder() {
  if (window.SUS4W_KOKUIN_STATE?.enabled && !window.SUS4W_KOKUIN_STATE.valid) {
    showSus4wToast('刻印する文字を正しく入力してください');
    return;
  }
  // 保存は任意（「配色画像だけ保存」ボタンへ分離）。カート投入の前提にしない
  const loadEl = document.getElementById('sus4w-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg = document.querySelector('#sus4w-svg-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildSus4wSaveCanvas();
    let result = null;
    try { result = await sus4wUploadImage(canvas); } catch (e) { console.error(e); }
    if (!result) {
      if (window.sim708Track) sim708Track('upload_fail', 'sus4w');
      result = window.sim708FallbackUpload ? sim708FallbackUpload('S4W') : { orderId: 'S4W-' + Date.now(), imageUrl: '' };
    }
    sus4wLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showSus4wConfirmModal(result);
  } catch(e) {
    console.error(e);
    showSus4wToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function sus4wUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'SUW-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `sus4w-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(SUS4W_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showSus4wConfirmModal(result) {
  const modal = document.getElementById('sus4w-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('sus4w-modal-image');
  if (img) img.src = result.imageUrl;

  const kokuin = window.SUS4W_KOKUIN_STATE;
  const kokuinRow = kokuin?.enabled
    ? `<div class="modal-color-row"><span class="modal-zone-label">名入れ刻印（本体）</span><span>「${kokuin.text}」（${kokuin.fontLabel}）</span></div>`
    : '';

  const info = document.getElementById('sus4w-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      ${SUS4W_ZONES.map(zone => `
        <div class="modal-color-row">
          <span class="modal-zone-label">${SUS4W_ZONE_LABEL[zone]}</span>
          <span class="modal-color-dot" style="background:${sus4wColors[zone]}"></span>
          <span>${colorName(sus4wColors[zone])}</span>
        </div>`).join('')}
      <div class="modal-color-row">
        <span class="modal-zone-label">${SUS4W_HARDWARE_FIXED.label}</span>
        <span class="modal-color-dot" style="background:${SUS4W_HARDWARE_FIXED.hex}"></span>
        <span>${SUS4W_HARDWARE_FIXED.name}</span>
      </div>
      ${kokuinRow}
    </div>`;
  modal.classList.add('show');
}

function closeSus4wModal() {
  const modal = document.getElementById('sus4w-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function sus4wProceedToCart() {
  if (!sus4wLastUploadedImage) { showSus4wToast('画像情報が見つかりません'); return; }
  closeSus4wModal();

  const colorDataEN = [...SUS4W_ZONES.map(zone => `${SUS4W_ZONE_LABEL[zone]}:${colorName(sus4wColors[zone])}`), `${SUS4W_HARDWARE_FIXED.label}:${SUS4W_HARDWARE_FIXED.name}`]
    .join(', ');

  const kokuin = window.SUS4W_KOKUIN_STATE;
  const kokuinEnabled = !!kokuin?.enabled;
  const variantId = SUS4W_VARIANT_IDS[kokuinEnabled ? 'eng' : 'noeng'];

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${SUS4W_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  const properties = {
    'Order ID': sus4wLastUploadedImage.orderId,
    'Colors': colorDataEN,
    'Image URL': sus4wLastUploadedImage.imageUrl
  };
  if (kokuinEnabled) {
    properties['刻印文字（本体）'] = kokuin.text;
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

function showSus4wToast(msg) {
  const el = document.getElementById('sus4w-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// 注文導線の共通処理（保存とカート投入の分離・計測）。定義は save-canvas-common.js
if (typeof sim708SetupOrderUI === 'function') {
  sim708SetupOrderUI({
    product: 'sus4w',
    orderBtnSelector: '[onclick^="sus4wGoOrder("]',
    goOrder: 'sus4wGoOrder', proceed: 'sus4wProceedToCart', saveOnly: 'sus4wSaveImage', buildCanvas: 'buildSus4wSaveCanvas',
  });
}
