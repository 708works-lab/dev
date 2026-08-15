// ============================================================================
// 設定
// ============================================================================

const DUET_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const DUET_SHOPIFY_DOMAIN = '708works.jp';

// 先端パーツ（ウロコ柄の向き）バリアント
// CW73 = 通常（Wellingtonと同じ向き） / CW73R = R（上下逆さま）
const DUET_FRONT_STYLES = [
  { id:'standard', label:'通常',      desc:'ウロコ柄が正位置（Wellingtonと同じ向き）', price: 13860, svgGroup:'part-front-CW73',  variantId:'50074942308602' },
  { id:'reverse',  label:'R（リバース）', desc:'ウロコ柄を上下逆さまにした仕様',           price: 13860, svgGroup:'part-front-CW73R', variantId:'50074942341370' },
];

// 革パーツ用カラー（20色）
const DUET_LEATHER_COLORS = [
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
const DUET_BELT_COLORS = [
  {id:'black',     name:'Black',      hex:'#1a1a1a'},
  {id:'brown',     name:'Brown',      hex:'#b07840'},
  {id:'ivory',     name:'Ivory',      hex:'#f0ece0'},
  {id:'mossgreen', name:'Moss Green', hex:'#5c6b3a'},
  {id:'cobalt',    name:'Cobalt',     hex:'#2a5a8c'},
  {id:'cream',     name:'Cream',      hex:'#e8dfc8'},
];

// ゾーン定義（通常モード：2ゾーン、分離モード：3ゾーン）
const DUET_ZONE_LABEL = {
  leather: '革パーツ（前後共通）',
  front:   '先端（革・R切替対象）',
  belt:    'ベルト（ナイロン）',
  rear:    '後端（革）',
};

// ============================================================================
// 状態
// ============================================================================

let duetColors = { front:'#1a1a1a', belt:'#1a1a1a', rear:'#1a1a1a' };
let duetLinked      = true;
let duetActiveZone  = 'leather';
let duetSelectedStyle = 'standard';
let duetImageSaved  = false;
let duetHistory     = [];
let duetLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initDuetSimulator() {
  if (window.duetSimulatorInitialized) return;
  const palette = document.getElementById('duet-palette');
  const wrap    = document.getElementById('duet-strap-wrap');
  if (!palette || !wrap) { setTimeout(initDuetSimulator, 100); return; }
  window.duetSimulatorInitialized = true;

  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetSummary();
  buildFrontStyleSelector();
  updateDuetPriceDisplay();
  updateDuetCartButtonState();
  loadDuetSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDuetSimulator);
} else {
  initDuetSimulator();
}

// ============================================================================
// SVG 読み込み・テクスチャ注入
// ============================================================================

function loadDuetSVG() {
  const wrap = document.getElementById('duet-strap-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/duet_color_order.svg')
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
      applyDuetFrontStyle();
      applyDuetColors();
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
    <pattern id="d-twill" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="none"/>
      <line x1="0" y1="6" x2="6" y2="0" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="-3" y1="3" x2="3" y2="-3" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="3" y1="9" x2="9" y2="3" stroke="rgba(0,0,0,0.13)" stroke-width="2.5"/>
      <line x1="0" y1="6" x2="6" y2="0" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
    </pattern>
    <linearGradient id="d-sheen" x1="0" y1="0" x2="1" y2="0"
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
    ['d-twill','d-sheen'].forEach(patId => {
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
// 先端パーツ（通常／R）の切り替え
// ============================================================================

function applyDuetFrontStyle() {
  const wrap = document.getElementById('duet-strap-wrap');
  if (!wrap) return;
  const style = DUET_FRONT_STYLES.find(s => s.id === duetSelectedStyle);
  if (!style) return;

  DUET_FRONT_STYLES.forEach(s => {
    const g = wrap.querySelector(`#${s.svgGroup}`);
    if (g) g.style.display = (s.id === duetSelectedStyle) ? '' : 'none';
  });
}

// ============================================================================
// カラー適用
// ============================================================================

function applyDuetColors() {
  const wrap = document.getElementById('duet-strap-wrap');
  if (!wrap) return;

  wrap.querySelectorAll('[data-zone="belt"]').forEach(el => {
    el.setAttribute('fill', duetColors.belt);
    el.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  wrap.querySelectorAll('[data-zone="front"]').forEach(el => {
    el.setAttribute('fill', duetColors.front);
    el.setAttribute('stroke', leatherStroke(duetColors.front));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });
  wrap.querySelectorAll('[data-zone="rear"]').forEach(el => {
    el.setAttribute('fill', duetColors.rear);
    el.setAttribute('stroke', leatherStroke(duetColors.rear));
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('stroke-opacity', '1');
  });

  wrap.querySelectorAll('[data-role="logo"]').forEach(logo => {
    logo.setAttribute('fill', engravingColor(duetColors.front));
  });

  highlightActiveZone();
}

function highlightActiveZone() {
  const wrap = document.getElementById('duet-strap-wrap');
  if (!wrap) return;

  const highlightZones = duetActiveZone === 'leather'
    ? ['front','rear']
    : [duetActiveZone];

  ['front','belt','rear'].forEach(zone => {
    const isActive = highlightZones.includes(zone);
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
      if (isActive) {
        el.setAttribute('stroke', activeStroke(zone));
        el.setAttribute('stroke-width', '6');
        el.setAttribute('stroke-opacity', '0.65');
      } else {
        const s = zone === 'belt' ? 'rgba(0,0,0,0.2)'
                : zone === 'front' ? leatherStroke(duetColors.front)
                : leatherStroke(duetColors.rear);
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

function buildDuetZoneButtons() {
  const container = document.getElementById('duet-zones');
  if (!container) return;
  container.innerHTML = '';

  const zones = duetLinked
    ? ['leather', 'belt']
    : ['rear', 'belt', 'front'];

  zones.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'duet-zone-btn' + (zone === duetActiveZone ? ' active' : '');
    btn.onclick = () => selectDuetZone(zone);

    const dot = document.createElement('span');
    dot.className = 'zone-dot';
    const hex = zone === 'leather' ? duetColors.front
              : zone === 'belt'    ? duetColors.belt
              : duetColors[zone];
    dot.style.background = hex;
    if (zone === 'belt') {
      dot.style.borderRadius = '3px';
      dot.style.width  = '20px';
      dot.style.height = '10px';
    }
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' ' + DUET_ZONE_LABEL[zone]));
    container.appendChild(btn);
  });

  // 前後分離トグル
  const toggle = document.createElement('button');
  toggle.className = 'duet-split-toggle' + (duetLinked ? '' : ' active');
  toggle.onclick = toggleDuetLeatherSplit;
  toggle.innerHTML = duetLinked
    ? '<span class="toggle-icon">⊕</span> 前後を別の色にする'
    : '<span class="toggle-icon">⊖</span> 前後を同じ色に戻す';
  container.appendChild(toggle);
}

function toggleDuetLeatherSplit() {
  duetLinked = !duetLinked;
  if (duetLinked) {
    // リンク復帰時は前端に合わせる
    duetColors.rear = duetColors.front;
    duetActiveZone  = 'leather';
  } else {
    duetActiveZone  = 'front';
  }
  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetPaletteLabel();
  updateDuetSummary();
  applyDuetColors();
}

function selectDuetZone(zone) {
  duetActiveZone = zone;
  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetPaletteLabel();
  highlightActiveZone();
}

function updateDuetPaletteLabel() {
  const label = document.getElementById('duet-palette-label');
  if (label) label.textContent = 'カラー（' + DUET_ZONE_LABEL[duetActiveZone] + '）';
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildDuetPalette() {
  const palette = document.getElementById('duet-palette');
  if (!palette) return;
  palette.innerHTML = '';
  palette.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';

  const colors  = duetActiveZone === 'belt' ? DUET_BELT_COLORS : DUET_LEATHER_COLORS;
  const current = duetActiveZone === 'leather' ? duetColors.front
                : duetActiveZone === 'belt'    ? duetColors.belt
                : duetColors[duetActiveZone];

  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'duet-swatch' + (c.hex === current ? ' selected' : '');
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
    sw.onclick = () => setDuetColor(c.hex);
    palette.appendChild(sw);
  });
}

function setDuetColor(hex) {
  saveDuetHistory();
  if (duetActiveZone === 'leather') {
    duetColors.front = hex;
    duetColors.rear  = hex;
  } else if (duetActiveZone === 'belt') {
    duetColors.belt = hex;
  } else {
    duetColors[duetActiveZone] = hex;
  }
  duetImageSaved = false;
  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetSummary();
  updateDuetCartButtonState();
  applyDuetColors();
}

// ============================================================================
// 先端パーツセレクター（通常／R）
// ============================================================================

function buildFrontStyleSelector() {
  const container = document.getElementById('duet-front-styles');
  if (!container) return;
  container.innerHTML = '';

  DUET_FRONT_STYLES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'style-btn' + (s.id === duetSelectedStyle ? ' active' : '');
    btn.onclick   = () => selectDuetFrontStyle(s.id);
    btn.innerHTML = `
      <span class="style-label">${s.label}</span>
      <span class="style-desc">${s.desc}</span>`;
    container.appendChild(btn);
  });
}

function selectDuetFrontStyle(id) {
  duetSelectedStyle = id;
  buildFrontStyleSelector();
  updateDuetPriceDisplay();
  applyDuetFrontStyle();
  applyDuetColors();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateDuetSummary() {
  const el = document.getElementById('duet-summary');
  if (!el) return;

  const rows = duetLinked
    ? [
        { label: DUET_ZONE_LABEL.leather,  zone:'front', hex: duetColors.front },
        { label: DUET_ZONE_LABEL.belt,     zone:'belt',  hex: duetColors.belt  },
      ]
    : [
        { label: DUET_ZONE_LABEL.front,    zone:'front', hex: duetColors.front },
        { label: DUET_ZONE_LABEL.belt,     zone:'belt',  hex: duetColors.belt  },
        { label: DUET_ZONE_LABEL.rear,     zone:'rear',  hex: duetColors.rear  },
      ];

  el.innerHTML = rows.map(r => `
    <div class="summary-row">
      <span class="summary-label">${r.label}</span>
      <span class="summary-dot" style="background:${r.hex}"></span>
      <span class="summary-name">${colorName(r.hex, r.zone)}</span>
    </div>`).join('');
}

function updateDuetPriceDisplay() {
  const el    = document.getElementById('duet-price-display');
  const style = DUET_FRONT_STYLES.find(s => s.id === duetSelectedStyle);
  if (el && style) el.textContent = `¥${style.price.toLocaleString()}（税込）`;
}

function colorName(hex, zone) {
  const list = zone === 'belt' ? DUET_BELT_COLORS : DUET_LEATHER_COLORS;
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
  const color = zone === 'front' ? duetColors.front
               : zone === 'rear' ? duetColors.rear
               : duetColors.belt;
  const h = color.replace('#','');
  const lum = (parseInt(h.slice(0,2),16)*0.299 + parseInt(h.slice(2,4),16)*0.587 + parseInt(h.slice(4,6),16)*0.114) / 255;
  if (zone === 'belt') return '#888888';
  return lum > 0.55 ? '#555555' : '#d8d8d8';
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

function saveDuetHistory() {
  duetHistory.push({...duetColors, _linked: duetLinked});
  if (duetHistory.length > 20) duetHistory.shift();
  const btn = document.getElementById('duet-btn-undo');
  if (btn) btn.disabled = false;
}

function duetUndo() {
  if (!duetHistory.length) return;
  const prev = duetHistory.pop();
  duetColors = {front: prev.front, belt: prev.belt, rear: prev.rear};
  duetLinked = prev._linked;
  if (duetLinked && duetActiveZone !== 'belt') duetActiveZone = 'leather';
  duetImageSaved = false;
  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetPaletteLabel();
  updateDuetSummary();
  updateDuetCartButtonState();
  applyDuetColors();
  const btn = document.getElementById('duet-btn-undo');
  if (btn) btn.disabled = duetHistory.length === 0;
}

function duetReset() {
  saveDuetHistory();
  duetColors  = {front:'#1a1a1a', belt:'#9e3820', rear:'#1a1a1a'};
  duetLinked  = true;
  duetActiveZone = 'leather';
  duetImageSaved = false;
  buildDuetZoneButtons();
  buildDuetPalette();
  updateDuetPaletteLabel();
  updateDuetSummary();
  updateDuetCartButtonState();
  applyDuetColors();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function duetSaveImage() {
  const svg = document.querySelector('#duet-strap-wrap svg');
  if (!svg) { showDuetToast('SVGが見つかりません'); return; }
  const canvas = await svgToCanvas(svg, 2);
  const link   = document.createElement('a');
  link.download = `duet-color-${Date.now()}.png`;
  link.href     = canvas.toDataURL('image/png');
  link.click();
  duetImageSaved = true;
  updateDuetCartButtonState();
  showDuetToast('画像を保存しました ✓　カートに進めます');
}

async function svgToCanvas(svgEl, scale = 1) {
  const VW = 192, VH = 1407;
  const canvas = document.createElement('canvas');
  canvas.width  = VW * scale;
  canvas.height = VH * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const svgStr  = new XMLSerializer().serializeToString(svgEl);
  const blob    = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
  const url     = URL.createObjectURL(blob);
  await new Promise((res, rej) => {
    const img  = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); res(); };
    img.onerror = rej;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return canvas;
}

// ============================================================================
// カート注文
// ============================================================================

function updateDuetCartButtonState() {
  const cartBtn  = document.querySelector('.duet-simulator .btn-order');
  const cartLabel= document.getElementById('duet-cart-label');
  const saveBtn  = document.querySelector('.duet-simulator .sbtn');
  const svgDl = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const svgOk = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

  if (cartLabel) {
    cartLabel.textContent = duetImageSaved
      ? 'この配色で注文する →'
      : '先に画像を保存してください →';
  }
  if (cartBtn) {
    Object.assign(cartBtn.style, duetImageSaved
      ? { opacity:'1', cursor:'pointer', background:'#111', color:'#fff' }
      : { opacity:'1', cursor:'not-allowed', background:'#bbb', color:'#fff' });
  }
  if (saveBtn) {
    saveBtn.innerHTML = duetImageSaved
      ? `${svgOk} 保存済み`
      : `${svgDl} 画像を保存する`;
    Object.assign(saveBtn.style, duetImageSaved
      ? { background:'#edf7ee', borderColor:'#5cb86a', color:'#2e7d32' }
      : { background:'', borderColor:'', color:'' });
  }
}

async function duetGoOrder() {
  if (!duetImageSaved) {
    showDuetToast('先に「画像を保存する」を押してください');
    const saveBtn = document.querySelector('.duet-simulator .sbtn');
    if (saveBtn) { saveBtn.classList.add('d-shake'); setTimeout(() => saveBtn.classList.remove('d-shake'), 500); }
    return;
  }
  const loadEl = document.getElementById('duet-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg    = document.querySelector('#duet-strap-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await svgToCanvas(svg, 1);
    const result = await duetUploadImage(canvas);
    if (!result) throw new Error('画像アップロードに失敗しました');
    duetLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showDuetConfirmModal(result);
  } catch(e) {
    console.error(e);
    showDuetToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function duetUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'DUE-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `duet-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(DUET_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showDuetConfirmModal(result) {
  const modal = document.getElementById('duet-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('duet-modal-image');
  if (img) img.src = result.imageUrl;

  const style = DUET_FRONT_STYLES.find(s => s.id === duetSelectedStyle);
  const rows = duetLinked
    ? [{label: DUET_ZONE_LABEL.leather, zone:'front', hex: duetColors.front},
       {label: DUET_ZONE_LABEL.belt,    zone:'belt',  hex: duetColors.belt }]
    : [{label: DUET_ZONE_LABEL.front,   zone:'front', hex: duetColors.front},
       {label: DUET_ZONE_LABEL.belt,    zone:'belt',  hex: duetColors.belt },
       {label: DUET_ZONE_LABEL.rear,    zone:'rear',  hex: duetColors.rear }];

  const info = document.getElementById('duet-modal-info');
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
        <span class="modal-zone-label">先端パーツ</span>
        <span></span>
        <span>${style?.label}（${style?.desc}）</span>
      </div>
    </div>`;
  modal.classList.add('show');
}

function closeDuetModal() {
  const modal = document.getElementById('duet-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function duetProceedToCart() {
  if (!duetLastUploadedImage) { showDuetToast('画像情報が見つかりません'); return; }
  closeDuetModal();

  const style = DUET_FRONT_STYLES.find(s => s.id === duetSelectedStyle);
  const colorDataEN = duetLinked
    ? `Leather(Front+Rear):${colorName(duetColors.front,'front')}, Belt[Nylon]:${colorName(duetColors.belt,'belt')}`
    : `Front[Leather]:${colorName(duetColors.front,'front')}, Belt[Nylon]:${colorName(duetColors.belt,'belt')}, Rear[Leather]:${colorName(duetColors.rear,'rear')}`;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${DUET_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', style.variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  Object.entries({'Order ID': duetLastUploadedImage.orderId, 'Colors': colorDataEN, 'Front Part': style.label, 'Image URL': duetLastUploadedImage.imageUrl})
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

function showDuetToast(msg) {
  const el = document.getElementById('duet-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
