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

  wrap.querySelectorAll('[data-zone="belt"]').forEach(el => {
    el.setAttribute('fill', courierColors.belt);
    el.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  wrap.querySelectorAll('[data-zone="front"]').forEach(el => {
    el.setAttribute('fill', courierColors.front);
    el.setAttribute('stroke', leatherStroke(courierColors.front));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  wrap.querySelectorAll('[data-zone="rear"]').forEach(el => {
    el.setAttribute('fill', courierColors.rear);
    el.setAttribute('stroke', leatherStroke(courierColors.rear));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });

  const logo = wrap.querySelector('#logo');
  if (logo) logo.setAttribute('fill', engravingColor(courierColors.front));

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
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
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
