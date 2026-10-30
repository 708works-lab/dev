// ============================================================================
// 設定
// ============================================================================

const COURIER_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const COURIER_SHOPIFY_DOMAIN = '708works.jp';

// 長さバリアント
const COURIER_LENGTHS = [
  { id:'short',    label:'短め',  desc:'最短約85cm〜最長約130cm',  price: 9130, priceAdj:    0, variantIds:{ noeng:'46634546921722', eng:'50231160209658' } },
  { id:'standard', label:'標準',  desc:'最短約95cm〜最長約145cm',  price: 9130, priceAdj:    0, variantIds:{ noeng:'50231160242426', eng:'50231160275194' } },
  { id:'long',     label:'長め',  desc:'最短約95cm〜最長約160cm',  price: 9680, priceAdj: +550, variantIds:{ noeng:'50231160307962', eng:'50231160340730' } },
];

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
  {id:'greenbl', name:'Green BL',  hex:'#2a5060'},
  {id:'black',   name:'Black',     hex:'#1a1a1a'},
];

// ナイロンベルト専用カラー（6色）
const COURIER_BELT_COLORS = [
  {id:'black',     name:'Black',      hex:'#1a1a1a'},
  {id:'brown',     name:'Brown',      hex:'#b07840'},
  {id:'ivory',     name:'Ivory',      hex:'#f0ece0'},
  {id:'mossgreen', name:'Moss Green', hex:'#5c6b3a'},
  {id:'cobalt',    name:'Cobalt',     hex:'#2a5a8c'},
  {id:'cream',     name:'Cream',      hex:'#e8dfc8'},
];

// ゾーン定義（通常モード：2ゾーン、分離モード：3ゾーン）
const ZONE_LABEL = {
  leather: '革パーツ（前後共通）',
  front:   '前端（革）',
  belt:    'ベルト（ナイロン）',
  rear:    '後端（革）',
};

// ============================================================================
// 状態
// ============================================================================

let courierColors = { front:'#1a1a1a', belt:'#1a1a1a', rear:'#1a1a1a' };
let courierLinked      = true;
let courierActiveZone  = 'leather';
let courierSelectedLen = 'standard';
let courierImageSaved  = false;
let courierHistory     = [];
let courierLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initCourierSimulator() {
  if (window.courierSimulatorInitialized) return;
  const palette = document.getElementById('courier-palette');
  const wrap    = document.getElementById('courier-strap-wrap');
  if (!palette || !wrap) { setTimeout(initCourierSimulator, 100); return; }
  window.courierSimulatorInitialized = true;

  setupCourierPreview();
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  buildLengthSelector();
  updateCourierPriceDisplay();
  updateCartButtonState();
  loadCourierSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourierSimulator);
} else {
  initCourierSimulator();
}

// ============================================================================
// SVG 読み込み・テクスチャ注入
// ============================================================================

function loadCourierSVG() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/courier_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        injectBeltTexture(svg);
        buildCourierArch();
      }
      applyCourierColors();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ベルトのナイロン綾織テクスチャをSVGに注入
function injectBeltTexture(svg) {
  const ns   = 'http://www.w3.org/2000/svg';
  let defs   = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS(ns,'defs'); svg.insertBefore(defs, svg.firstChild); }

  // 綾織（ダイアゴナルツイル）パターン
  defs.insertAdjacentHTML('beforeend', `
    <pattern id="c-twill" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="none"/>
      <line x1="0" y1="6" x2="6" y2="0" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="-3" y1="3" x2="3" y2="-3" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="3" y1="9" x2="9" y2="3" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="0" y1="6" x2="6" y2="0" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
    </pattern>
    <linearGradient id="c-sheen" x1="0" y1="0" x2="1" y2="0"
        gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="rgba(0,0,0,.22)"/>
      <stop offset="28%"  stop-color="rgba(255,255,255,.13)"/>
      <stop offset="50%"  stop-color="rgba(255,255,255,.07)"/>
      <stop offset="72%"  stop-color="rgba(255,255,255,.13)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,.22)"/>
    </linearGradient>
  `);

  // ベルト要素の直後にオーバーレイを挿入（テクスチャ + 光沢）
  const beltEls = [...svg.querySelectorAll('[data-zone="belt"]')];
  beltEls.forEach(el => {
    ['c-twill','c-sheen'].forEach(patId => {
      const ov = el.cloneNode(false);
      ov.removeAttribute('data-zone');
      ov.removeAttribute('id');
      ov.setAttribute('fill', `url(#${patId})`);
      ov.setAttribute('stroke', 'none');
      ov.style.pointerEvents = 'none';
      el.parentNode.insertBefore(ov, el.nextSibling);
    });
  });
}

// ============================================================================
// カラー適用
// ============================================================================

function applyCourierColors() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;

  courierQAll('[data-zone="belt"]').forEach(el => {
    el.setAttribute('fill', courierColors.belt);
    el.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  courierQAll('[data-zone="front"]').forEach(el => {
    el.setAttribute('fill', courierColors.front);
    el.setAttribute('stroke', leatherStroke(courierColors.front));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  courierQAll('[data-zone="rear"]').forEach(el => {
    el.setAttribute('fill', courierColors.rear);
    el.setAttribute('stroke', leatherStroke(courierColors.rear));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });

  courierQAll('[id="logo"]').forEach(logo => logo.setAttribute('fill', engravingColor(courierColors.front)));
  applyCourierWornColors();

  highlightActiveZone();
  if (typeof applyCourierKokuinColors === 'function') applyCourierKokuinColors();
}

function highlightActiveZone() {
  const wrap = document.getElementById('courier-strap-wrap');
  if (!wrap) return;

  const highlightZones = courierActiveZone === 'leather'
    ? ['front','rear']
    : [courierActiveZone];

  ['front','belt','rear'].forEach(zone => {
    const isActive = highlightZones.includes(zone);
    courierQAll(`[data-zone="${zone}"]`).forEach(el => {
      if (isActive) {
        el.setAttribute('stroke', activeStroke(zone));
        el.setAttribute('stroke-width', '6');
        el.setAttribute('stroke-opacity', '0.65');
      } else {
        const s = zone === 'belt' ? 'rgba(0,0,0,0.2)'
                : zone === 'front' ? leatherStroke(courierColors.front)
                : leatherStroke(courierColors.rear);
        el.setAttribute('stroke', s);
        el.setAttribute('stroke-width', '1.5');
        el.setAttribute('stroke-opacity', '1');
      }
    });
  });

  // アーチ表示のベルトは複数パーツの継ぎ合わせなので、太い縁取りだと継ぎ目に段差が出る。
  // 縁取りは通常の細線のままにし、選択中は外側へにじむ影で示す(継ぎ目が見えない)
  const beltActive = courierActiveZone === 'belt';
  document.querySelectorAll('#courier-arch-wrap [data-zone="belt"]').forEach(el => {
    el.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
    el.style.filter = beltActive ? 'drop-shadow(0 0 2.2px rgba(30,30,30,.95))' : '';
  });
}

// ============================================================================
// ゾーンボタン（前後リンクモード切替）
// ============================================================================

function buildCourierZoneButtons() {
  const container = document.getElementById('courier-zones');
  if (!container) return;
  container.innerHTML = '';

  const zones = courierLinked
    ? ['leather', 'belt']
    : ['rear', 'belt', 'front'];

  zones.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'courier-zone-btn' + (zone === courierActiveZone ? ' active' : '');
    btn.onclick = () => selectCourierZone(zone);

    const dot = document.createElement('span');
    dot.className = 'zone-dot';
    const hex = zone === 'leather' ? courierColors.front
              : zone === 'belt'    ? courierColors.belt
              : courierColors[zone];
    dot.style.background = hex;
    if (zone === 'belt') {
      dot.style.borderRadius = '3px';
      dot.style.width  = '20px';
      dot.style.height = '10px';
    }
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + ZONE_LABEL[zone]));
    container.appendChild(btn);
  });

  // 前後分離トグル
  const toggle = document.createElement('button');
  toggle.className = 'courier-split-toggle' + (courierLinked ? '' : ' active');
  toggle.onclick = toggleLeatherSplit;
  toggle.innerHTML = courierLinked
    ? '<span class="toggle-icon">⊕</span> 前後を別の色にする'
    : '<span class="toggle-icon">⊖</span> 前後を同じ色に戻す';
  container.appendChild(toggle);
}

function toggleLeatherSplit() {
  courierLinked = !courierLinked;
  if (courierLinked) {
    // リンク復帰時は前端に合わせる
    courierColors.rear = courierColors.front;
    courierActiveZone  = 'leather';
  } else {
    courierActiveZone  = 'front';
  }
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierPaletteLabel();
  updateCourierSummary();
  applyCourierColors();
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
  if (label) label.textContent = 'カラー（' + ZONE_LABEL[courierActiveZone] + '）';
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildCourierPalette() {
  const palette = document.getElementById('courier-palette');
  if (!palette) return;
  palette.innerHTML = '';
  palette.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';

  const colors  = courierActiveZone === 'belt' ? COURIER_BELT_COLORS : COURIER_LEATHER_COLORS;
  const current = courierActiveZone === 'leather' ? courierColors.front
                : courierActiveZone === 'belt'    ? courierColors.belt
                : courierColors[courierActiveZone];

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'courier-swatch' + (c.hex === current ? ' selected' : '');
    const sel = c.hex === current;
    sw.style.cssText = [
      `background:${c.hex}`,
      'width:22px',
      'height:22px',
      'border-radius:50%',
      'cursor:pointer',
      'display:block',
      'flex-shrink:0',
      'box-sizing:border-box',
      sel ? 'border:2.5px solid #111;box-shadow:0 0 0 2px #fff,0 0 0 4px #111'
          : 'border:1.5px solid rgba(0,0,0,.12)',
    ].join(';');
    sw.title = c.name;
    sw.onclick = () => setCourierColor(c.hex);
    palette.appendChild(sw);
  });
}

function setCourierColor(hex) {
  saveCourierHistory();
  if (courierActiveZone === 'leather') {
    courierColors.front = hex;
    courierColors.rear  = hex;
  } else if (courierActiveZone === 'belt') {
    courierColors.belt = hex;
  } else {
    courierColors[courierActiveZone] = hex;
  }
  courierImageSaved = false;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierSummary();
  updateCartButtonState();
  applyCourierColors();
}

// ============================================================================
// 長さセレクター
// ============================================================================

function buildLengthSelector() {
  const container = document.getElementById('courier-lengths');
  if (!container) return;
  container.innerHTML = '';

  COURIER_LENGTHS.forEach(len => {
    const btn = document.createElement('button');
    btn.className = 'length-btn' + (len.id === courierSelectedLen ? ' active' : '');
    btn.onclick   = () => selectCourierLength(len.id);

    const adj = len.priceAdj > 0 ? ` <span class="price-adj">+¥${len.priceAdj.toLocaleString()}</span>` : '';
    btn.innerHTML = `
      <span class="len-label">${len.label}</span>
      <span class="len-desc">${len.desc}${adj}</span>`;
    container.appendChild(btn);
  });
}

function selectCourierLength(id) {
  courierSelectedLen = id;
  buildLengthSelector();
  updateCourierPriceDisplay();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateCourierSummary() {
  const el = document.getElementById('courier-summary');
  if (!el) return;

  const rows = courierLinked
    ? [
        { label: ZONE_LABEL.leather,  zone:'front', hex: courierColors.front },
        { label: ZONE_LABEL.belt,     zone:'belt',  hex: courierColors.belt  },
      ]
    : [
        { label: ZONE_LABEL.front,    zone:'front', hex: courierColors.front },
        { label: ZONE_LABEL.belt,     zone:'belt',  hex: courierColors.belt  },
        { label: ZONE_LABEL.rear,     zone:'rear',  hex: courierColors.rear  },
      ];

  el.innerHTML = rows.map(r => `
    <div class="summary-row">
      <span class="summary-label">${r.label}</span>
      <span class="summary-dot" style="background:${r.hex}"></span>
      <span class="summary-name">${colorName(r.hex, r.zone)}</span>
    </div>`).join('');
}

function updateCourierPriceDisplay() {
  const el  = document.getElementById('courier-price-display');
  const len = COURIER_LENGTHS.find(l => l.id === courierSelectedLen);
  if (!el || !len) return;
  const kokuinAdd = (window.COURIER_KOKUIN_STATE?.enabled && window.COURIER_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(len.price + kokuinAdd).toLocaleString()}（税込）`;
}

function colorName(hex, zone) {
  const list = zone === 'belt' ? COURIER_BELT_COLORS : COURIER_LEATHER_COLORS;
  return list.find(c => c.hex === hex)?.name || hex;
}

// ============================================================================
// カラーユーティリティ
// ============================================================================

function leatherStroke(hex) {
  const h = hex.replace('#','');
  const lum = (parseInt(h.slice(0,2),16)*0.299 + parseInt(h.slice(2,4),16)*0.587 + parseInt(h.slice(4,6),16)*0.114) / 255;
  return lum > 0.6 ? 'rgba(0,0,0,0.22)' : 'none';
}

function activeStroke(zone) {
  const color = zone === 'front' ? courierColors.front
               : zone === 'rear' ? courierColors.rear
               : courierColors.belt;
  const h = color.replace('#','');
  const lum = (parseInt(h.slice(0,2),16)*0.299 + parseInt(h.slice(2,4),16)*0.587 + parseInt(h.slice(4,6),16)*0.114) / 255;
  if (zone === 'belt') return '#888888';
  return lum > 0.55 ? '#555555' : '#d8d8d8';
}

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

function saveCourierHistory() {
  courierHistory.push({...courierColors, _linked: courierLinked});
  if (courierHistory.length > 20) courierHistory.shift();
  const btn = document.getElementById('courier-btn-undo');
  if (btn) btn.disabled = false;
}

function courierUndo() {
  if (!courierHistory.length) return;
  const prev = courierHistory.pop();
  courierColors = {front: prev.front, belt: prev.belt, rear: prev.rear};
  courierLinked = prev._linked;
  if (courierLinked && courierActiveZone !== 'belt') courierActiveZone = 'leather';
  courierImageSaved = false;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierPaletteLabel();
  updateCourierSummary();
  updateCartButtonState();
  applyCourierColors();
  const btn = document.getElementById('courier-btn-undo');
  if (btn) btn.disabled = courierHistory.length === 0;
}

function courierReset() {
  saveCourierHistory();
  courierColors  = {front:'#1a1a1a', belt:'#9e3820', rear:'#1a1a1a'};
  courierLinked  = true;
  courierActiveZone = 'leather';
  courierImageSaved = false;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierPaletteLabel();
  updateCourierSummary();
  updateCartButtonState();
  applyCourierColors();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function courierSaveImage() {
  const svg = document.querySelector('#courier-strap-wrap svg');
  if (!svg) { showCourierToast('SVGが見つかりません'); return; }
  const canvas = await buildCourierSaveCanvas();
  // toDataURL + <a download> はモバイルSafari等で保存ダイアログが起動しないことがあるため、
  // Blob URL方式（folkloreと同じ）に統一する
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `courier-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 即座にrevokeするとダウンロード開始前にURLが無効化される端末があるため少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  courierImageSaved = true;
  updateCartButtonState();
  showCourierToast('画像を保存しました ✓');
}

// ---- 名入れ刻印フォント埋め込み ----
// SVGをdata URIのImageとして再描画すると、ページ側で読み込んだWebフォント（Googleフォント／
// カスタムフォント）は継承されず既定フォントにフォールバックする。保存画像・注文用画像で
// 刻印文字のフォントが選択と異なって見える不具合の原因のため、選択中フォントを@font-faceとして
// SVG自身に埋め込んでから書き出す。
const KOKUIN_FONT_SOURCES = {
  'Cabin Sketch': { google: true, param: 'Cabin+Sketch:wght@700' },
  'Special Elite': { google: true, param: 'Special+Elite' },
  'AG Stencil': { google: false, url: 'https://708works-lab.github.io/dev/fonts/AG-Stencil.ttf' },
  'Lobster': { google: true, param: 'Lobster' },
  'Playball': { google: true, param: 'Playball' },
  'Great Vibes': { google: true, param: 'Great+Vibes' },
  'Bebas Neue': { google: true, param: 'Bebas+Neue' },
  'UnifrakturMaguntia': { google: true, param: 'UnifrakturMaguntia' }
};
const kokuinFontDataUriCache = {};
function kokuinBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
async function kokuinFontDataUri(family) {
  if (kokuinFontDataUriCache[family]) return kokuinFontDataUriCache[family];
  const src = KOKUIN_FONT_SOURCES[family];
  if (!src) return null;
  const promise = (async () => {
    try {
      let fontUrl, mime;
      if (src.google) {
        const cssText = await (await fetch(`https://fonts.googleapis.com/css2?family=${src.param}&display=swap`)).text();
        // GoogleフォントのCSSはUnicodeサブセットごとに複数の@font-faceブロックを含む。
        // 先頭ブロックはcyrillic-ext等の場合が多く、それを使うと半角英数字のグリフを
        // 持たないフォントファイルを埋め込んでしまい結局既定フォントにフォールバックする
        // ため、必ず基本ラテン文字（U+0000-00FF）を含むブロックを選んで使用する。
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
      return `data:${mime};base64,${kokuinBufferToBase64(buf)}`;
    } catch (e) {
      return null;
    }
  })();
  kokuinFontDataUriCache[family] = promise;
  return promise;
}
async function embedKokuinFontIntoSvg(svgRoot, family, weight) {
  const dataUri = await kokuinFontDataUri(family);
  if (!dataUri) return;
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = `@font-face{font-family:'${family}';font-weight:${weight || 400};src:url(${dataUri});}`;
  svgRoot.insertBefore(style, svgRoot.firstChild);
}

// 保存・注文アップロード用のキャンバスを生成する（共通ヘルパー build708SaveCanvas に委譲）。
async function buildCourierSaveCanvas() {
  const zoneDefs = [
    { zone: 'rear',  label: '後ろ' },
    { zone: 'belt',  label: 'ベルト' },
    { zone: 'front', label: '前' },
  ];
  const chips = zoneDefs.map(z => ({ hex: courierColors[z.zone], label: `${z.label}：${colorName(courierColors[z.zone], z.zone)}` }));
  const selectedLen = COURIER_LENGTHS.find(l => l.id === courierSelectedLen);
  if (selectedLen) chips.unshift({ hex: null, label: `長さ：${selectedLen.label}（${selectedLen.desc}）` });

  const kokuin = window.COURIER_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);

  let extra;
  if (kokuinEnabled) {
    extra = {
      height: 160,
      draw: async (ctx, box) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(box.x + 8, box.y);
        ctx.arcTo(box.x + box.width, box.y, box.x + box.width, box.y + box.height, 8);
        ctx.arcTo(box.x + box.width, box.y + box.height, box.x, box.y + box.height, 8);
        ctx.arcTo(box.x, box.y + box.height, box.x, box.y, 8);
        ctx.arcTo(box.x, box.y, box.x + box.width, box.y, 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('名入れ刻印', box.x + 14, box.y + 20);

        const kokuinPreviewSvg = document.getElementById('courier-kokuin-svg-wrap')?.shadowRoot?.querySelector('svg');
        const contentW = box.width - 28;
        if (kokuinPreviewSvg) {
          const previewClone = kokuinPreviewSvg.cloneNode(true);
          if (kokuin?.fontFamily) await embedKokuinFontIntoSvg(previewClone, kokuin.fontFamily, kokuin.fontWeight);
          const vb = kokuinPreviewSvg.getAttribute('viewBox')?.split(' ').map(Number);
          const aspect = (vb && vb[2]) ? vb[3] / vb[2] : 0.66;
          let previewW = contentW, previewH = Math.round(contentW * aspect);
          const maxH = box.height - 34;
          if (previewH > maxH) { previewH = maxH; previewW = Math.round(maxH / aspect); }
          previewClone.setAttribute('width', previewW);
          previewClone.setAttribute('height', previewH);
          const svgStr = new XMLSerializer().serializeToString(previewClone);
          const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
          const previewX = box.x + 14 + (contentW - previewW) / 2;
          await new Promise(resolve => {
            const img = new Image();
            img.onload  = () => { ctx.drawImage(img, previewX, box.y + 28, previewW, previewH); resolve(); };
            img.onerror = resolve;
            img.src = dataUri;
          });
        } else {
          await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(() => {});
          ctx.fillStyle = '#1a1a1a';
          ctx.font = `${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
          ctx.textAlign = 'left';
          ctx.fillText(kokuin.text, box.x + 14, box.y + box.height - 20);
        }
      },
    };
  }

  return build708SaveCanvas({
    title: 'Courier',
    svgSelector: '#courier-strap-wrap svg',
    svgW: 480, svgH: 1600,
    chips,
    extra,
    topCaption: '▲ 後ろ（エンドピン側）',
    bottomCaption: '▼ 前（ボディ上部側）',
    prepareSvg: async (cloned) => {
      // 選択中ゾーンのハイライト枠（太線）は保存画像には不要。通常の細い枠線に戻す
      ['front','belt','rear'].forEach(zone => {
        const s = zone === 'belt' ? 'rgba(0,0,0,0.2)'
                : zone === 'front' ? leatherStroke(courierColors.front)
                : leatherStroke(courierColors.rear);
        cloned.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
          el.setAttribute('stroke', s);
          el.setAttribute('stroke-width', '1.5');
          el.setAttribute('stroke-opacity', '1');
        });
      });
      if (kokuinEnabled && kokuin?.fontFamily) {
        await embedKokuinFontIntoSvg(cloned, kokuin.fontFamily, kokuin.fontWeight);
      }
    },
  });
}


// ============================================================================
// カート注文
// ============================================================================

function updateCartButtonState() {
  const cartLabel = document.getElementById('courier-cart-label');
  if (cartLabel) cartLabel.textContent = 'カートに入れる →';
}

async function courierGoOrder() {
  if (window.COURIER_KOKUIN_STATE?.enabled && !window.COURIER_KOKUIN_STATE.valid) {
    showCourierToast('刻印する文字を正しく入力してください');
    return;
  }
  // 保存は任意（「配色画像だけ保存」ボタンへ分離）。カート投入の前提にしない
  const loadEl = document.getElementById('courier-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg    = document.querySelector('#courier-strap-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildCourierSaveCanvas();
    let result = null;
    try { result = await courierUploadImage(canvas); } catch (e) { console.error(e); }
    if (!result) {
      if (window.sim708Track) sim708Track('upload_fail', 'courier');
      result = window.sim708FallbackUpload ? sim708FallbackUpload('COU') : { orderId: 'COU-' + Date.now(), imageUrl: '' };
    }
    courierLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showCourierConfirmModal(result);
  } catch(e) {
    console.error(e);
    showCourierToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function courierUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'COU-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `courier-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(COURIER_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showCourierConfirmModal(result) {
  const modal = document.getElementById('courier-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('courier-modal-image');
  if (img) img.src = result.imageUrl;

  const len  = COURIER_LENGTHS.find(l => l.id === courierSelectedLen);
  const rows = courierLinked
    ? [{label: ZONE_LABEL.leather, zone:'front', hex: courierColors.front},
       {label: ZONE_LABEL.belt,    zone:'belt',  hex: courierColors.belt }]
    : [{label: ZONE_LABEL.front,   zone:'front', hex: courierColors.front},
       {label: ZONE_LABEL.belt,    zone:'belt',  hex: courierColors.belt },
       {label: ZONE_LABEL.rear,    zone:'rear',  hex: courierColors.rear }];

  const kokuin = window.COURIER_KOKUIN_STATE;
  const kokuinRow = (kokuin?.enabled && kokuin.valid && kokuin.text)
    ? `<div class="modal-color-row">
        <span class="modal-zone-label">名入れ刻印</span>
        <span></span>
        <span>${kokuin.text}（${kokuin.fontLabel}）</span>
      </div>`
    : '';

  const info = document.getElementById('courier-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      ${rows.map(r => `
        <div class="modal-color-row">
          <span class="modal-zone-label">${r.label}</span>
          <span class="modal-color-dot" style="background:${r.hex}"></span>
          <span>${colorName(r.hex, r.zone)}</span>
        </div>`).join('')}
      <div class="modal-color-row">
        <span class="modal-zone-label">長さ</span>
        <span></span>
        <span>${len?.label}（${len?.desc}）</span>
      </div>
      ${kokuinRow}
    </div>`;
  modal.classList.add('show');
}

function closeCourierModal() {
  const modal = document.getElementById('courier-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function courierProceedToCart() {
  if (!courierLastUploadedImage) { showCourierToast('画像情報が見つかりません'); return; }
  closeCourierModal();

  const len = COURIER_LENGTHS.find(l => l.id === courierSelectedLen);
  const kokuin = window.COURIER_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const variantId = len.variantIds?.[kokuinEnabled ? 'eng' : 'noeng'];
  if (!variantId) { showCourierToast('バリアントが見つかりません'); return; }
  const colorDataEN = courierLinked
    ? `Leather(Front+Rear):${colorName(courierColors.front,'front')}, Belt[Nylon]:${colorName(courierColors.belt,'belt')}`
    : `Front[Leather]:${colorName(courierColors.front,'front')}, Belt[Nylon]:${colorName(courierColors.belt,'belt')}, Rear[Leather]:${colorName(courierColors.rear,'rear')}`;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${COURIER_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  const properties = {'Order ID': courierLastUploadedImage.orderId, 'Colors': colorDataEN, 'Length': `${len.label}：${len.desc}`, 'Image URL': courierLastUploadedImage.imageUrl};
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

function showCourierToast(msg) {
  const el = document.getElementById('courier-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// 注文導線の共通処理（保存とカート投入の分離・計測）。定義は save-canvas-common.js
if (typeof sim708SetupOrderUI === 'function') {
  sim708SetupOrderUI({
    product: 'courier',
    orderBtnSelector: '[onclick^="courierGoOrder("]',
    goOrder: 'courierGoOrder', proceed: 'courierProceedToCart', saveOnly: 'courierSaveImage', buildCanvas: 'buildCourierSaveCanvas',
  });
}

// ============================================================================
// 表示切替(商品イメージ／着用イメージ 前・後ろ)と、商品イメージの逆U字表示(Duetと同じ構成)
// 元の縦長SVG(#courier-strap-wrap)は画像保存・注文画像用に画面外へ残し、表示用は #courier-arch-wrap に別SVGとして組む。
// 着用イメージSVGは未作成のあいだ COURIER_WORN_READY=false(タブを出さない)。作成後は make-courier-worn.py で
// courier-worn-front.js / courier-worn-back.js を生成し、この値を true にしてバージョンを上げる。
// ============================================================================

const COURIER_WORN_READY = false;
const COURIER_WORN_BASE = window.COURIER_WORN_BASE || 'https://708works-lab.github.io/dev/';
const COURIER_VIEWS = [
  { id: 'product', label: '商品イメージ' },
  { id: 'front',   label: '着用イメージ（前）' },
  { id: 'back',    label: '着用イメージ（後ろ）' },
];
let courierView = 'product';   // 'product' / 'front' / 'back'

// trimFrom〜trimLen: 後ろ側のまっすぐなベルトを描画上だけ短縮する区間(元座標y)。trimLenは織り目の周期6の倍数にする
const COURIER_ARCH = { D: 290, cut: 667, trimFrom: 186, trimLen: 96, halfW: 25, cx: 176.25, yTop: 95, yEnd: 1505, padL: 160, clipX: 0, clipW: 480, tex: 'c' };

function courierQAll(sel) {
  const out = [];
  ['courier-strap-wrap', 'courier-arch-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.querySelectorAll(sel).forEach(n => out.push(n));
  });
  return out;
}

function setupCourierPreview() {
  const root = document.querySelector('.courier-simulator');
  const app  = root && root.querySelector('.app');
  const col  = root && root.querySelector('.preview-col');
  if (!root || !app || !col || col.querySelector('#courier-arch-wrap')) return;

  const arch = document.createElement('div');
  arch.id = 'courier-arch-wrap'; arch.className = 'courier-arch-wrap';
  const worn = document.createElement('div');
  worn.id = 'courier-worn-wrap'; worn.className = 'courier-worn-wrap';
  const note = document.createElement('div');
  note.id = 'courier-worn-note'; note.className = 'courier-worn-note';
  col.appendChild(arch); col.appendChild(worn); col.appendChild(note);

  const tapZone = (e, host) => {
    const el = e.target.closest && e.target.closest('[data-zone]');
    if (!el || !host.contains(el)) return;
    const zone = el.getAttribute('data-zone');
    if (zone === 'belt') { selectCourierZone('belt'); return; }
    if (zone === 'front' || zone === 'rear') selectCourierZone(courierLinked ? 'leather' : zone);
  };
  arch.addEventListener('click', e => tapZone(e, arch));
  worn.addEventListener('click', e => tapZone(e, worn));

  if (COURIER_WORN_READY) {
    const tabs = document.createElement('div');
    tabs.className = 'courier-view-tabs';
    tabs.setAttribute('role', 'tablist');
    COURIER_VIEWS.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'courier-view-tab' + (v.id === courierView ? ' active' : '');
      b.dataset.view = v.id;
      b.setAttribute('role', 'tab');
      b.textContent = v.label;
      b.onclick = () => setCourierView(v.id);
      tabs.appendChild(b);
    });
    app.parentNode.insertBefore(tabs, app);
    const idle = window.requestIdleCallback || (f => setTimeout(f, 2500));
    idle(() => { courierLoadWorn('front').catch(() => {}); });
  }
  restructureCourierControls(root);
}

function courierLoadWorn(key) {
  window.COURIER_WORN = window.COURIER_WORN || {};
  if (window.COURIER_WORN[key]) return Promise.resolve(window.COURIER_WORN[key]);
  window.COURIER_WORN_LOADING = window.COURIER_WORN_LOADING || {};
  if (window.COURIER_WORN_LOADING[key]) return window.COURIER_WORN_LOADING[key];
  window.COURIER_WORN_LOADING[key] = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = COURIER_WORN_BASE + 'courier-worn-' + key + '.js?v=1';
    sc.onload  = () => resolve(window.COURIER_WORN[key]);
    sc.onerror = () => { delete window.COURIER_WORN_LOADING[key]; reject(new Error('load')); };
    document.head.appendChild(sc);
  });
  return window.COURIER_WORN_LOADING[key];
}

function setCourierView(view) {
  courierView = view;
  const root = document.querySelector('.courier-simulator');
  if (!root) return;
  root.classList.toggle('courier-worn', view !== 'product');
  root.querySelectorAll('.courier-view-tab').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view !== 'product') renderCourierWorn(); else courierSetNote();
  if (window.sim708Track) { try { sim708Track('view_' + view, 'courier'); } catch (e) {} }
}

async function renderCourierWorn() {
  const wrap = document.getElementById('courier-worn-wrap');
  const note = document.getElementById('courier-worn-note');
  if (!wrap || courierView === 'product') return;
  const view = courierView;
  let data;
  try { data = await courierLoadWorn(view); }
  catch (e) { wrap.innerHTML = '<p class="courier-worn-err">着用イメージを読み込めませんでした。通信状況をご確認ください。</p>'; return; }
  if (courierView !== view) return;   // 読込中に切り替えられた
  wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + data.vb + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="着用イメージ">' + data.inner + '</svg>';
  if (note) note.textContent = '着用イメージは配色の目安です。パーツをタップして色を選べます。';
  applyCourierWornColors();
}

// 着用イメージに現在の配色を反映
function applyCourierWornColors() {
  const wrap = document.getElementById('courier-worn-wrap');
  if (!wrap || !wrap.querySelector('svg')) return;
  const shapes = el => el.tagName.toLowerCase() === 'g' ? el.querySelectorAll('path,polygon,rect,circle') : [el];
  wrap.querySelectorAll('[data-zone]').forEach(el => {
    const zone = el.getAttribute('data-zone');
    const color = zone === 'logo' ? engravingColor(courierColors.front) : courierColors[zone];
    if (!color) return;
    shapes(el).forEach(n => { n.style.fill = color; });
  });
}

function courierSetNote() {
  const note = document.getElementById('courier-worn-note');
  if (note && courierView === 'product') note.textContent = 'パーツをタップして色を選べます。';
}

function buildCourierArch() {
  const wrap = document.getElementById('courier-strap-wrap');
  const host = document.getElementById('courier-arch-wrap');
  const root = document.querySelector('.courier-simulator');
  const svg  = wrap && wrap.querySelector('svg');
  if (!svg || !host || !root || host.querySelector('svg')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k])); return e; };
  const A = COURIER_ARCH, R = A.D / 2;
  // 綾織テクスチャ(6px周期の斜線)の位相を、左脚・アーチ・右脚でそろえて継ぎ目を消す(Duetと同じ計算)。
  const mod6 = v => ((v % 6) + 6) % 6;
  const n = Math.round((A.cut + A.cx - (A.D - Math.PI * R) / 2) / 3);
  const cut = 3 * n - A.cx + (A.D - Math.PI * R) / 2;
  const yb2 = cut + Math.PI * R;
  const xL = A.padL, xR = A.padL + A.D;
  let yA = 10 + R + A.halfW;
  yA += mod6(-(xL + A.cx + yA + cut));
  const g = A.trimLen, c1 = A.trimFrom, c2 = c1 + g;
  const W = xR + 35 + 8, H = yA + cut - g - A.yTop + 34;

  const out = mk('svg', { xmlns: NS, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '商品イメージ' });
  const defs = svg.querySelector('defs');
  const od = mk('defs');
  if (defs) [...defs.childNodes].forEach(nd => od.appendChild(nd.cloneNode(true)));
  const clip = (id, y, h, x0, w) => { const c = mk('clipPath', { id }); c.appendChild(mk('rect', { x: x0, y, width: w, height: h })); od.appendChild(c); };
  clip('courier-arch-clipL',  -20, c1 + 20, A.clipX, A.clipW);
  clip('courier-arch-clipL2', c2, cut - c2, A.clipX, A.clipW);
  clip('courier-arch-clipR',  yb2, A.yEnd - yb2 + 40, A.clipX, A.clipW);
  out.appendChild(od);

  // アーチ部分のベルト。塗りと縁取りを分け、縁取りは円弧の外側・内側だけにして脚との境目に段差が出ないようにする
  const hw = A.halfW, st = 1.5;
  const ringD = `M${xL - hw},${yA + st} L${xL - hw},${yA} A${R + hw},${R + hw} 0 0 1 ${xR + hw},${yA} L${xR + hw},${yA + st} L${xR - hw},${yA + st} L${xR - hw},${yA} A${R - hw},${R - hw} 0 0 0 ${xL + hw},${yA} L${xL + hw},${yA + st} Z`;
  const ring = mk('path', { 'data-zone': 'belt', d: ringD, fill: '#b07840', style: 'stroke:none' });
  const edge = d => mk('path', { 'data-zone': 'belt', d, fill: 'none', style: 'fill:none;stroke-linecap:butt' });
  const edgeOut = edge(`M${xL - hw},${yA} A${R + hw},${R + hw} 0 0 1 ${xR + hw},${yA}`);
  const edgeIn  = edge(`M${xR - hw},${yA} A${R - hw},${R - hw} 0 0 0 ${xL + hw},${yA}`);
  // 光沢: 脚と同じ「縁が暗く中央が明るい」を、アーチでは円弧に沿った放射グラデーションで再現する
  const rOut = R + hw, i0 = (R - hw) / rOut;
  const sheenId = A.tex + '-sheen-arch';
  const rg = mk('radialGradient', { id: sheenId, gradientUnits: 'userSpaceOnUse', cx: (xL + xR) / 2, cy: yA, r: rOut });
  [[0, 'rgba(0,0,0,.22)'], [.28, 'rgba(255,255,255,.13)'], [.5, 'rgba(255,255,255,.07)'], [.72, 'rgba(255,255,255,.13)'], [1, 'rgba(0,0,0,.22)']].forEach(([o, c]) => {
    rg.appendChild(mk('stop', { offset: i0 + (1 - i0) * o, 'stop-color': c }));
  });
  od.appendChild(rg);
  clip('courier-arch-clipRing', 0, yA, 0, 1000);
  const ringOverlays = [A.tex + '-twill', sheenId].map(id => {
    const ov = ring.cloneNode(false);
    ov.removeAttribute('data-zone');
    ov.setAttribute('fill', `url(#${id})`);
    ov.style.pointerEvents = 'none';
    ov.setAttribute('clip-path', 'url(#courier-arch-clipRing)');
    return ov;
  });
  out.appendChild(ring); ringOverlays.forEach(o => out.appendChild(o)); out.appendChild(edgeOut); out.appendChild(edgeIn);

  const body = () => {
    const gg = mk('g');
    [...svg.children].filter(nd => nd.tagName.toLowerCase() !== 'defs').forEach(nd => gg.appendChild(nd.cloneNode(true)));
    return gg;
  };
  // 左の脚: 後ろが下になるよう180°回転(Folkloreと同じく片脚は上下逆)。後ろ寄りのまっすぐなベルトは描画上だけ短縮
  const gl = mk('g', { transform: `translate(${xL},${yA + cut - g}) rotate(180) translate(${-A.cx},0)` });
  const gl2 = body(); gl2.setAttribute('clip-path', 'url(#courier-arch-clipL)'); gl.appendChild(gl2);
  const glb = mk('g', { transform: `translate(0,${-g})` });
  const gl3 = body(); gl3.setAttribute('clip-path', 'url(#courier-arch-clipL2)'); glb.appendChild(gl3); gl.appendChild(glb);
  // 右の脚: 前端の革パーツは正位置のまま
  const gr = mk('g', { transform: `translate(${xR - A.cx},${yA - yb2})` });
  const gr2 = body(); gr2.setAttribute('clip-path', 'url(#courier-arch-clipR)'); gr.appendChild(gr2);
  out.appendChild(gl); out.appendChild(gr);

  const label = (x, y, t) => { const e = mk('text', { x, y, 'text-anchor': 'middle', 'font-size': '14', fill: '#555', 'font-family': 'sans-serif', style: 'pointer-events:none' }); e.textContent = t; return e; };
  out.appendChild(label(xL, yA + cut - g - A.yTop + 22, '後ろ'));
  out.appendChild(label(xR, yA + (A.yEnd - yb2) + 22, '前'));

  host.appendChild(out);
  root.classList.add('courier-tabs-on');
  courierSetNote();
}

// ============================================================================
// 操作の並び替え: プレビュー → パーツ → カラー → おすすめ配色 → 長さ → サマリー
// ============================================================================

function restructureCourierControls(root) {
  const left = root.querySelector('.ctrl-left');
  if (!left || left.dataset.courierOrdered) return;
  left.dataset.courierOrdered = '1';
  const byId = id => document.getElementById(id);
  const palLabel = byId('courier-palette-label');
  const labels = [...left.querySelectorAll(':scope > .box-label')];
  const zonesLabel = labels.find(l => l !== palLabel && /パーツ/.test(l.textContent));
  const lenLabel = labels.find(l => l !== palLabel && l !== zonesLabel);
  const palBox = left.querySelector('.pal-box'), sum = left.querySelector('.sum-box');

  const reco = document.createElement('div');
  reco.className = 'courier-reco';
  reco.innerHTML = '<button type="button" class="courier-reco-btn" id="courier-reco-btn">おすすめ配色を試す</button><span class="courier-reco-msg" id="courier-reco-msg">押すたびに別の配色になります</span>';
  reco.querySelector('button').onclick = courierShuffle;

  [zonesLabel, byId('courier-zones'), palLabel, palBox, reco, lenLabel, byId('courier-lengths'), sum]
    .filter(Boolean).forEach(el => left.appendChild(el));
  if (zonesLabel) zonesLabel.classList.add('courier-lbl-zones');
}

// ============================================================================
// おすすめ配色(押すたびに別パターン)。前端・後ろ・ベルトの3か所を提案する。
// 前後が同じ色になる割合を高め(約6割)にし、直前と同じ組み合わせは出さない
// ============================================================================

const COURIER_RECO_SETS = [   // [革(前端), 革(後ろ), ベルト] ※前後が別色のとき
  ['navy', 'white', 'ivory'], ['choco', 'natural', 'brown'], ['green', 'yellow', 'mossgreen'], ['black', 'orange', 'black'],
  ['sakura', 'lbl', 'cream'], ['winered', 'natural', 'brown'], ['olive', 'tan', 'mossgreen'], ['greenbl', 'lbl', 'cobalt'],
  ['grey', 'pink', 'black'], ['brown', 'natural', 'cream'], ['red', 'navy', 'ivory'],
];
const COURIER_RECO_SAME = [   // [革(前後共通), ベルト]
  ['black', 'brown'], ['brown', 'black'], ['navy', 'ivory'], ['natural', 'brown'], ['tan', 'cream'], ['green', 'mossgreen'],
  ['winered', 'black'], ['camel', 'ivory'], ['choco', 'cream'], ['white', 'cobalt'], ['olive', 'brown'], ['sakura', 'black'],
];
const COURIER_SHUFFLE_SAME_RATE = 0.6;
let courierRecoPrev = '';

function courierShuffle() {
  const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)];
  const L = id => COURIER_LEATHER_COLORS.find(c => c.id === id).hex;
  const B = id => COURIER_BELT_COLORS.find(c => c.id === id).hex;
  const allL = COURIER_LEATHER_COLORS.map(c => c.id), allB = COURIER_BELT_COLORS.map(c => c.id);
  let front, rear, belt, linked, key, guard = 0;
  do {
    linked = Math.random() < COURIER_SHUFFLE_SAME_RATE;
    const r = Math.random();
    if (linked) {
      if (r < 0.6) { const s = pick(COURIER_RECO_SAME); front = rear = s[0]; belt = s[1]; }
      else { front = rear = pick(allL); belt = pick(allB); }
    } else if (r < 0.6) {
      const s = pick(COURIER_RECO_SETS); front = s[0]; rear = s[1]; belt = s[2];
    } else {
      front = pick(allL); do { rear = pick(allL); } while (rear === front); belt = pick(allB);
    }
    key = [front, rear, belt].join('|');
  } while (key === courierRecoPrev && ++guard < 20);
  courierRecoPrev = key;

  saveCourierHistory();
  courierColors.front = L(front); courierColors.rear = L(rear); courierColors.belt = B(belt);
  courierLinked = front === rear;
  courierActiveZone = courierLinked ? 'leather' : 'front';
  courierImageSaved = false;
  buildCourierZoneButtons();
  buildCourierPalette();
  updateCourierPaletteLabel();
  updateCourierSummary();
  updateCartButtonState();
  applyCourierColors();
  const msg = document.getElementById('courier-reco-msg');
  if (msg) msg.textContent = '今回: ' + (courierLinked ? '前後は同じ色' : '前後は別の色');
  if (window.sim708Track) { try { sim708Track('shuffle', 'courier'); } catch (e) {} }
}
