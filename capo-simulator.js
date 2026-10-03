// ============================================================================
// 設定
// ============================================================================

const CAPO_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const CAPO_SHOPIFY_DOMAIN = '708works.jp';

// 価格（名入れ刻印の有無のみでバリアントが変わる。革色・金具色・向きは価格に影響しない）
const CAPO_PRICE = 4400;
const CAPO_VARIANT_IDS = { noeng: '50583279698170', eng: '67577694912762' };

// レザーカラー（Backstage/Folklore/Kolmio/Nametagと共通の20色パレット）
const CAPO_LEATHER_COLORS = [
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

// バネホック（スナップ）の色×向き。guitarpick-case01と同じ4種展開
// （色名のみ＝通常、「・反転」付き＝向きを反転）
const CAPO_HARDWARE_OPTIONS = [
  {id:'silver',   label:'Silver',      hex:'#c7c9cd', reversed:false},
  {id:'silver-r', label:'Silver・反転', hex:'#c7c9cd', reversed:true},
  {id:'gold',     label:'Gold',        hex:'#e5b415', reversed:false},
  {id:'gold-r',   label:'Gold・反転',   hex:'#e5b415', reversed:true},
];

// SVG内のCSSクラス ⇔ ゾーンID の対応（capo_color_order.svg 共通）
const CAPO_ZONE_CLASS = { leather: 'st1', hardware: 'st3' };
const CAPO_ZONES = ['leather', 'hardware'];
const CAPO_ZONE_LABEL = { leather: '革', hardware: 'バネホック' };

const CAPO_DEFAULT_COLORS = { leather: '#9e3820', hardware: '#c7c9cd' };

// ============================================================================
// 状態
// ============================================================================

let capoColors     = { ...CAPO_DEFAULT_COLORS };
let capoReversed   = false; // バネホックの向き（false=通常, true=反転）
let capoImageSaved = false;
let capoHistory    = [];
let capoLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initCapoSimulator() {
  if (window.capoSimulatorInitialized) return;
  const wrap = document.getElementById('capo-svg-wrap');
  const leatherPalette = document.getElementById('capo-leather-palette');
  if (!wrap || !leatherPalette) { setTimeout(initCapoSimulator, 100); return; }
  window.capoSimulatorInitialized = true;

  buildCapoPalettes();
  updateCapoSummary();
  updateCapoPriceDisplay();
  updateCapoCartButtonState();
  loadCapoSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCapoSimulator);
} else {
  initCapoSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadCapoSVG() {
  const wrap = document.getElementById('capo-svg-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/capo_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // kokuin/kokuin1 グループには元データのサンプル刻印が入っている場合があるため、
        // 名入れ刻印を有効にしていない通常時は空にしておく（実際の描画は
        // capo-kokuin-addon.js が担当する）。
        ['kokuin', 'kokuin1'].forEach(id => {
          const el = svg.querySelector('#' + id);
          if (el) el.innerHTML = '';
        });
      }
      applyCapoState();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// 状態の反映（革色・金具色・金具の向き・名入れ刻印）
// ============================================================================

// SVG内の <style> に定義された .st1(レザー) / .st3(バネホック) の fill をゾーンカラーで
// 書き換える。各ゾーンは対応するクラスを共有する全パーツ（装着イメージ・商品イメージの
// 両方、複数パスにまたがる）に一括で反映される。
function applyCapoState() {
  const svg = document.querySelector('#capo-svg-wrap svg');
  if (!svg) return;

  const styleEl = svg.querySelector('defs style') || svg.querySelector('style');
  if (styleEl) {
    let css = styleEl.textContent;
    CAPO_ZONES.forEach(zone => {
      const cls = CAPO_ZONE_CLASS[zone];
      const hex = capoColors[zone];
      const re  = new RegExp(`(\\.${cls}\\s*{[^}]*fill:\\s*)#[0-9a-fA-F]{3,6}`);
      css = css.replace(re, `$1${hex}`);
    });
    styleEl.textContent = css;
  }

  // バネホックの向き：装着イメージ(#hardware)・商品イメージ(#hardware1)それぞれの中に
  // normal/reverse（と normal1/reverse1）が同じ座標に重ねて描画されているため、
  // 選択中の向きだけを表示する。
  const pairs = [['normal', 'reverse'], ['normal1', 'reverse1']];
  pairs.forEach(([normalId, reverseId]) => {
    const normalEl  = svg.querySelector('#' + normalId);
    const reverseEl = svg.querySelector('#' + reverseId);
    if (normalEl)  normalEl.style.display  = capoReversed ? 'none' : 'block';
    if (reverseEl) reverseEl.style.display = capoReversed ? 'block' : 'none';
  });

  if (typeof applyCapoKokuinColors === 'function') applyCapoKokuinColors();
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildCapoPalettes() {
  buildCapoLeatherPalette();
  buildCapoHardwarePalette();
}

function buildCapoLeatherPalette() {
  const palette = document.getElementById('capo-leather-palette');
  if (!palette) return;
  palette.innerHTML = '';
  const current = capoColors.leather;

  CAPO_LEATHER_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'capo-swatch' + (c.hex === current ? ' selected' : '');
    // テーマのbase.cssに `div:empty{display:none}` があるため、
    // 子要素を持たない空divのままだと非表示になってしまう。display指定を明示して回避する。
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setCapoLeather(c.hex);
    palette.appendChild(sw);
  });
}

function setCapoLeather(hex) {
  saveCapoHistory();
  capoColors.leather = hex;
  capoImageSaved = false;
  buildCapoPalettes();
  updateCapoSummary();
  updateCapoCartButtonState();
  applyCapoState();
}

// バネホックは色×向きの4択を1つのチップ群として表示する（guitarpick-case01と同じ
// 「Silver / Silver・反転 / Gold / Gold・反転」という粒度に合わせるため、色スウォッチ
// だけでは向きの違いを表現できず、チップ＋ラベルの組み合わせにしている）。
function buildCapoHardwarePalette() {
  const palette = document.getElementById('capo-hardware-palette');
  if (!palette) return;
  palette.innerHTML = '';

  CAPO_HARDWARE_OPTIONS.forEach(opt => {
    const selected = opt.hex === capoColors.hardware && opt.reversed === capoReversed;
    const chip = document.createElement('div');
    chip.className = 'hw-chip' + (selected ? ' selected' : '');
    chip.onclick = () => setCapoHardware(opt.id);

    const sw = document.createElement('div');
    sw.className = 'hw-chip-swatch' + (opt.reversed ? ' reversed' : '');
    sw.style.cssText = `display:block;background:${opt.hex};`;

    const label = document.createElement('div');
    label.className = 'hw-chip-label';
    label.textContent = opt.label;

    chip.appendChild(sw);
    chip.appendChild(label);
    palette.appendChild(chip);
  });
}

function setCapoHardware(optionId) {
  const opt = CAPO_HARDWARE_OPTIONS.find(o => o.id === optionId);
  if (!opt) return;
  saveCapoHistory();
  capoColors.hardware = opt.hex;
  capoReversed = opt.reversed;
  capoImageSaved = false;
  buildCapoPalettes();
  updateCapoSummary();
  updateCapoCartButtonState();
  applyCapoState();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateCapoSummary() {
  const el = document.getElementById('capo-summary');
  if (!el) return;
  el.innerHTML = CAPO_ZONES.map(zone => `
    <div class="summary-row">
      <span class="summary-label">${CAPO_ZONE_LABEL[zone]}</span>
      <span class="summary-dot" style="background:${capoColors[zone]}"></span>
      <span class="summary-name">${zone === 'hardware' ? hardwareLabel() : colorName(capoColors[zone], zone)}</span>
    </div>`).join('');
}

function hardwareLabel() {
  const opt = CAPO_HARDWARE_OPTIONS.find(o => o.hex === capoColors.hardware && o.reversed === capoReversed);
  return opt ? opt.label : capoColors.hardware;
}

function updateCapoPriceDisplay() {
  const el = document.getElementById('capo-price-display');
  if (!el) return;
  const kokuinAdd = (window.CAPO_KOKUIN_STATE?.enabled && window.CAPO_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(CAPO_PRICE + kokuinAdd).toLocaleString()}（税込）`;
}

function colorName(hex, zone) {
  if (zone === 'hardware') return hardwareLabel();
  return CAPO_LEATHER_COLORS.find(c => c.hex === hex)?.name || hex;
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

function saveCapoHistory() {
  capoHistory.push({ colors: {...capoColors}, reversed: capoReversed });
  if (capoHistory.length > 20) capoHistory.shift();
  const btn = document.getElementById('capo-btn-undo');
  if (btn) btn.disabled = false;
}

function capoUndo() {
  if (!capoHistory.length) return;
  const prev = capoHistory.pop();
  capoColors = prev.colors;
  capoReversed = prev.reversed;
  capoImageSaved = false;
  buildCapoPalettes();
  updateCapoSummary();
  updateCapoCartButtonState();
  applyCapoState();
  const btn = document.getElementById('capo-btn-undo');
  if (btn) btn.disabled = capoHistory.length === 0;
}

function capoReset() {
  saveCapoHistory();
  capoColors = { ...CAPO_DEFAULT_COLORS };
  capoReversed = false;
  capoImageSaved = false;
  buildCapoPalettes();
  updateCapoSummary();
  updateCapoCartButtonState();
  applyCapoState();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

// ---- 名入れ刻印フォント埋め込み ----
// SVGをdata URIのImageとして再描画すると、ページ側で読み込んだWebフォント（Googleフォント／
// カスタムフォント）は継承されず既定フォントにフォールバックする。保存画像・注文用画像で
// 刻印文字のフォントが選択と異なって見える不具合の原因のため、選択中フォントを@font-faceとして
// SVG自身に埋め込んでから書き出す（Backstage/Nametagと同じ対策）。
const CAPO_KOKUIN_FONT_SOURCES = {
  'Cabin Sketch': { google: true, param: 'Cabin+Sketch:wght@700' },
  'Special Elite': { google: true, param: 'Special+Elite' },
  'AG Stencil': { google: false, url: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf' },
  'Lobster': { google: true, param: 'Lobster' },
  'Playball': { google: true, param: 'Playball' },
  'Great Vibes': { google: true, param: 'Great+Vibes' },
  'Bebas Neue': { google: true, param: 'Bebas+Neue' },
  'UnifrakturMaguntia': { google: true, param: 'UnifrakturMaguntia' }
};
const capoKokuinFontDataUriCache = {};
function capoKokuinBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
async function capoKokuinFontDataUri(family) {
  if (capoKokuinFontDataUriCache[family]) return capoKokuinFontDataUriCache[family];
  const src = CAPO_KOKUIN_FONT_SOURCES[family];
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
      return `data:${mime};base64,${capoKokuinBufferToBase64(buf)}`;
    } catch (e) {
      return null;
    }
  })();
  capoKokuinFontDataUriCache[family] = promise;
  return promise;
}
async function embedCapoKokuinFontIntoSvg(svgRoot, family, weight) {
  const dataUri = await capoKokuinFontDataUri(family);
  if (!dataUri) return;
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = `@font-face{font-family:'${family}';font-weight:${weight || 400};src:url(${dataUri});}`;
  svgRoot.insertBefore(style, svgRoot.firstChild);
}

async function capoSaveImage() {
  const svg = document.querySelector('#capo-svg-wrap svg');
  if (!svg) { showCapoToast('SVGが見つかりません'); return; }
  const canvas = await buildCapoSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `capo-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  capoImageSaved = true;
  updateCapoCartButtonState();
  showCapoToast('画像を保存しました ✓');
}

// 保存・注文アップロード用のキャンバスを生成する（共通ヘルパー build708SaveCanvas に委譲）。
async function buildCapoSaveCanvas() {
  const kokuin = window.CAPO_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);

  const chips = CAPO_ZONES.map(zone => ({
    hex: capoColors[zone],
    label: zone === 'hardware' ? hardwareLabel() : colorName(capoColors[zone], zone),
  }));
  if (kokuinEnabled) {
    chips.push({ hex: engravingColor(capoColors.leather), label: `刻印「${kokuin.text}」` });
  }

  return build708SaveCanvas({
    title: 'Capo',
    svgSelector: '#capo-svg-wrap svg',
    svgW: 451.37, svgH: 979.37,
    chips,
    prepareSvg: async (cloned) => {
      if (kokuinEnabled && kokuin?.fontFamily) {
        await embedCapoKokuinFontIntoSvg(cloned, kokuin.fontFamily, kokuin.fontWeight);
      }
    },
  });
}


// ============================================================================
// カート注文
// ============================================================================

function updateCapoCartButtonState() {
  const cartLabel = document.getElementById('capo-cart-label');
  if (cartLabel) cartLabel.textContent = 'カートに入れる →';
}

async function capoGoOrder() {
  if (window.CAPO_KOKUIN_STATE?.enabled && !window.CAPO_KOKUIN_STATE.valid) {
    showCapoToast('刻印する文字を正しく入力してください');
    return;
  }
  // 保存は任意（「配色画像だけ保存」ボタンへ分離）。カート投入の前提にしない
  const loadEl = document.getElementById('capo-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg = document.querySelector('#capo-svg-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildCapoSaveCanvas();
    let result = null;
    try { result = await capoUploadImage(canvas); } catch (e) { console.error(e); }
    if (!result) {
      if (window.sim708Track) sim708Track('upload_fail', 'capo');
      result = window.sim708FallbackUpload ? sim708FallbackUpload('CAP') : { orderId: 'CAP-' + Date.now(), imageUrl: '' };
    }
    capoLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showCapoConfirmModal(result);
  } catch(e) {
    console.error(e);
    showCapoToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function capoUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'CPO-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `capo-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(CAPO_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showCapoConfirmModal(result) {
  const modal = document.getElementById('capo-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('capo-modal-image');
  if (img) img.src = result.imageUrl;

  const kokuin = window.CAPO_KOKUIN_STATE;
  const kokuinRow = kokuin?.enabled
    ? `<div class="modal-color-row"><span class="modal-zone-label">名入れ刻印（革）</span><span>「${kokuin.text}」（${kokuin.fontLabel}）</span></div>`
    : '';

  const info = document.getElementById('capo-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      ${CAPO_ZONES.map(zone => `
        <div class="modal-color-row">
          <span class="modal-zone-label">${CAPO_ZONE_LABEL[zone]}</span>
          <span class="modal-color-dot" style="background:${capoColors[zone]}"></span>
          <span>${zone === 'hardware' ? hardwareLabel() : colorName(capoColors[zone], zone)}</span>
        </div>`).join('')}
      ${kokuinRow}
    </div>`;
  modal.classList.add('show');
}

function closeCapoModal() {
  const modal = document.getElementById('capo-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function capoProceedToCart() {
  if (!capoLastUploadedImage) { showCapoToast('画像情報が見つかりません'); return; }
  closeCapoModal();

  const colorDataEN = CAPO_ZONES
    .map(zone => `${CAPO_ZONE_LABEL[zone]}:${zone === 'hardware' ? hardwareLabel() : colorName(capoColors[zone], zone)}`)
    .join(', ');

  const kokuin = window.CAPO_KOKUIN_STATE;
  const kokuinEnabled = !!kokuin?.enabled;
  const variantId = CAPO_VARIANT_IDS[kokuinEnabled ? 'eng' : 'noeng'];

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${CAPO_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  const properties = {
    'Order ID': capoLastUploadedImage.orderId,
    'Colors': colorDataEN,
    'Image URL': capoLastUploadedImage.imageUrl
  };
  if (kokuinEnabled) {
    properties['刻印文字（革）'] = kokuin.text;
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

function showCapoToast(msg) {
  const el = document.getElementById('capo-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// 注文導線の共通処理（保存とカート投入の分離・計測）。定義は save-canvas-common.js
if (typeof sim708SetupOrderUI === 'function') {
  sim708SetupOrderUI({
    product: 'capo',
    orderBtnSelector: '[onclick^="capoGoOrder("]',
    goOrder: 'capoGoOrder', proceed: 'capoProceedToCart', saveOnly: 'capoSaveImage', buildCanvas: 'buildCapoSaveCanvas',
  });
}
