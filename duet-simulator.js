// ============================================================================
// 設定
// ============================================================================

const DUET_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const DUET_SHOPIFY_DOMAIN = '708works.jp';

// 先端パーツ（ウロコ形状の向き）
// CW73 = 通常（Wellingtonと同じ向き） / CW73R = R（上下逆さま）
const DUET_FRONT_STYLES = [
  { id:'standard', label:'通常（CW73）',   desc:'ウロコ形状が正位置（Wellingtonと同じ向き）', svgGroup:'part-front-CW73'  },
  { id:'reverse',  label:'R（CW73R）', desc:'ウロコ形状を上下逆さまにした仕様',           svgGroup:'part-front-CW73R' },
];

// 長さバリアント（Courierと同じ寸法・アップチャージ額）
const DUET_LENGTHS = [
  { id:'short',    label:'短め',  desc:'最短約85cm〜最長約130cm',  price: 13860, priceAdj:    0 },
  { id:'standard', label:'標準',  desc:'最短約95cm〜最長約145cm',  price: 13860, priceAdj:    0 },
  { id:'long',     label:'長め',  desc:'最短約95cm〜最長約160cm',  price: 14410, priceAdj: +550 },
];

// 先端パーツ × 長さ → Shopifyバリアント ID
const DUET_VARIANT_MAP = {
  standard: { short:'50077074718970', standard:'50077074751738', long:'50077074784506' },
  reverse:  { short:'50077074817274', standard:'50077074850042', long:'50077074882810' },
};

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

// 革パーツのゾーン一覧（先端①＝ストラップピン側の1枚目 〜 先端④＝ベルト側の1枚目、後端）
const DUET_LEATHER_ZONES = ['front1','front2','front3','front4','rear'];

// ゾーン定義
const DUET_ZONE_LABEL = {
  leather: '革パーツ（全体）',
  front1:  '先端①（ピン側）',
  front2:  '先端②',
  front3:  '先端③',
  front4:  '先端④（ベルト側）',
  belt:    'ベルト（ナイロン）',
  rear:    '後端',
};

// ============================================================================
// 状態
// ============================================================================

let duetColors = { front1:'#1a1a1a', front2:'#1a1a1a', front3:'#1a1a1a', front4:'#1a1a1a', rear:'#1a1a1a', belt:'#b07840' };
let duetLinked      = true;
let duetActiveZone  = 'leather';
let duetSelectedStyle = 'standard';
let duetSelectedLength = 'standard';
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
  buildLengthSelector();
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

  DUET_LEATHER_ZONES.forEach(zone => {
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
      el.setAttribute('fill', duetColors[zone]);
      el.setAttribute('stroke', leatherStroke(duetColors[zone]));
      el.setAttribute('stroke-width', '1.5');
      el.setAttribute('stroke-opacity', '1');
    });
  });

  // ロゴ刻印は先端③のパーツ上にあるため、先端③の色に合わせて刻印色を決める
  wrap.querySelectorAll('[data-role="logo"]').forEach(logo => {
    logo.setAttribute('fill', engravingColor(duetColors.front3));
  });

  highlightActiveZone();
}

function highlightActiveZone() {
  const wrap = document.getElementById('duet-strap-wrap');
  if (!wrap) return;

  const highlightZones = duetActiveZone === 'leather'
    ? DUET_LEATHER_ZONES
    : [duetActiveZone];

  [...DUET_LEATHER_ZONES, 'belt'].forEach(zone => {
    const isActive = highlightZones.includes(zone);
    wrap.querySelectorAll(`[data-zone="${zone}"]`).forEach(el => {
      if (isActive) {
        el.setAttribute('stroke', activeStroke(zone));
        el.setAttribute('stroke-width', '3.5');
        el.setAttribute('stroke-opacity', '0.7');
        el.setAttribute('stroke-linejoin', 'round');
        el.setAttribute('stroke-linecap', 'round');
      } else {
        const s = zone === 'belt' ? 'rgba(0,0,0,0.2)' : leatherStroke(duetColors[zone]);
        el.setAttribute('stroke', s);
        el.setAttribute('stroke-width', '1.5');
        el.setAttribute('stroke-opacity', '1');
        el.removeAttribute('stroke-linejoin');
        el.removeAttribute('stroke-linecap');
      }
    });
  });
}

// ============================================================================
// ゾーンボタン（革パーツ一括／個別切替）
// ============================================================================

function buildDuetZoneButtons() {
  const container = document.getElementById('duet-zones');
  if (!container) return;
  container.innerHTML = '';

  const zones = duetLinked
    ? ['leather', 'belt']
    : ['rear', 'belt', 'front4', 'front3', 'front2', 'front1'];

  zones.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'duet-zone-btn' + (zone === duetActiveZone ? ' active' : '');
    btn.onclick = () => selectDuetZone(zone);

    const dot = document.createElement('span');
    dot.className = 'zone-dot';
    const hex = zone === 'leather' ? duetColors.front1
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

  // 一括／個別切替トグル
  const toggle = document.createElement('button');
  toggle.className = 'duet-split-toggle' + (duetLinked ? '' : ' active');
  toggle.onclick = toggleDuetLeatherSplit;
  toggle.innerHTML = duetLinked
    ? '<span class="toggle-icon">⊕</span> 先端・後端を1枚ずつ別の色にする'
    : '<span class="toggle-icon">⊖</span> 革パーツをすべて同じ色に戻す';
  container.appendChild(toggle);
}

function toggleDuetLeatherSplit() {
  duetLinked = !duetLinked;
  if (duetLinked) {
    // リンク復帰時は先端①の色に全パーツを揃える
    const base = duetColors.front1;
    DUET_LEATHER_ZONES.forEach(z => { duetColors[z] = base; });
    duetActiveZone = 'leather';
  } else {
    duetActiveZone = 'front1';
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
  const current = duetActiveZone === 'leather' ? duetColors.front1
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
    DUET_LEATHER_ZONES.forEach(z => { duetColors[z] = hex; });
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
// 長さセレクター
// ============================================================================

function buildLengthSelector() {
  const container = document.getElementById('duet-lengths');
  if (!container) return;
  container.innerHTML = '';

  DUET_LENGTHS.forEach(len => {
    const btn = document.createElement('button');
    btn.className = 'style-btn' + (len.id === duetSelectedLength ? ' active' : '');
    btn.onclick   = () => selectDuetLength(len.id);

    const adj = len.priceAdj > 0 ? ` <span class="price-adj">+¥${len.priceAdj.toLocaleString()}</span>` : '';
    btn.innerHTML = `
      <span class="style-label">${len.label}</span>
      <span class="style-desc">${len.desc}${adj}</span>`;
    container.appendChild(btn);
  });
}

function selectDuetLength(id) {
  duetSelectedLength = id;
  buildLengthSelector();
  updateDuetPriceDisplay();
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateDuetSummary() {
  const el = document.getElementById('duet-summary');
  if (!el) return;

  const rows = duetLinked
    ? [
        { label: DUET_ZONE_LABEL.leather, zone:'front1', hex: duetColors.front1 },
        { label: DUET_ZONE_LABEL.belt,    zone:'belt',   hex: duetColors.belt   },
      ]
    : [
        { label: DUET_ZONE_LABEL.rear,   zone:'rear',   hex: duetColors.rear   },
        { label: DUET_ZONE_LABEL.belt,   zone:'belt',   hex: duetColors.belt   },
        { label: DUET_ZONE_LABEL.front4, zone:'front4', hex: duetColors.front4 },
        { label: DUET_ZONE_LABEL.front3, zone:'front3', hex: duetColors.front3 },
        { label: DUET_ZONE_LABEL.front2, zone:'front2', hex: duetColors.front2 },
        { label: DUET_ZONE_LABEL.front1, zone:'front1', hex: duetColors.front1 },
      ];

  el.innerHTML = rows.map(r => `
    <div class="summary-row">
      <span class="summary-label">${r.label}</span>
      <span class="summary-dot" style="background:${r.hex}"></span>
      <span class="summary-name">${colorName(r.hex, r.zone)}</span>
    </div>`).join('');
}

function updateDuetPriceDisplay() {
  const el  = document.getElementById('duet-price-display');
  const len = DUET_LENGTHS.find(l => l.id === duetSelectedLength);
  if (el && len) el.textContent = `¥${len.price.toLocaleString()}（税込）`;
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
  const color = zone === 'belt' ? duetColors.belt : duetColors[zone];
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
  const { _linked, ...colors } = prev;
  duetColors = colors;
  duetLinked = _linked;
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
  duetColors  = { front1:'#1a1a1a', front2:'#1a1a1a', front3:'#1a1a1a', front4:'#1a1a1a', rear:'#1a1a1a', belt:'#b07840' };
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
  const canvas = await buildDuetSaveCanvas();
  // toDataURL + <a download> はモバイルSafari等で保存ダイアログが起動しないことがあるため、
  // Blob URL方式（folkloreと同じ）に統一する
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `duet-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 即座にrevokeするとダウンロード開始前にURLが無効化される端末があるため少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  duetImageSaved = true;
  updateDuetCartButtonState();
  showDuetToast('画像を保存しました ✓　カートに進めます');
}

// 保存・注文アップロード用のキャンバスを生成する。
// ヘッダー・上下の向きラベル・各パーツのカラー名ラベルを合成し、
// folkloreのカラーシミュレーターと同じ見せ方にする。
async function buildDuetSaveCanvas() {
  const SVG_VW = 191.5, SVG_VH = 1406.71;
  const svgSaveW = 140;                     // 解像度アップ（旧80）
  const scale = svgSaveW / SVG_VW;
  const svgSaveH = Math.round(SVG_VH * scale);

  // 画像とラベル列をまとめて中央寄せするため、左右マージンを固定して
  // キャンバス幅をそこから逆算する（画像だけを中央寄せすると右側の
  // 余白がラベル分だけ狭く見えてしまうため）
  const margin    = 46;
  const gap       = 24;
  const labelColW = 170;
  const cw = margin * 2 + svgSaveW + gap + labelColW;

  const headerH = 64, topLabelH = 30, bottomLabelH = 30, footerH = 34;
  const svgX  = margin;
  const svgY0 = headerH + topLabelH;
  const ch    = svgY0 + svgSaveH + bottomLabelH + footerH + 10;

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
  ctx.fillText('DUET', cw / 2, 38);
  ctx.fillStyle = '#666';
  ctx.font = '13px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 56);

  // 上部ラベル
  ctx.fillStyle = '#444';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ 後端（エンドピン側）', cw / 2, svgY0 - 8);

  // SVGをシリアライズしてCanvasに描画（iOS Safari互換のためdata URIを使用）
  const svgEl = document.querySelector('#duet-strap-wrap svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    const svgStr  = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { ctx.drawImage(img, svgX, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  // 下部ラベル
  ctx.fillStyle = '#444';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 先端（ストラップピン側）', cw / 2, svgY0 + svgSaveH + 20);

  // 各パーツのカラーラベル（SVG右側に配置。Y座標はSVG内の各パーツのおおよその中心）
  const labelX = svgX + svgSaveW + gap;
  const zoneLabels = [
    { y: 69,   zone:'rear',   label:'後端'   },
    { y: 615,  zone:'belt',   label:'ベルト' },
    { y: 1175, zone:'front4', label:'先端④' },
    { y: 1230, zone:'front3', label:'先端③' },
    { y: 1290, zone:'front2', label:'先端②' },
    { y: 1360, zone:'front1', label:'先端①' },
  ];
  zoneLabels.forEach(z => {
    const hex    = duetColors[z.zone];
    const pieceY = svgY0 + z.y * scale;

    ctx.beginPath();
    ctx.arc(labelX + 7, pieceY, 6, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(z.label, labelX + 20, pieceY - 3);

    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.fillText(colorName(hex, z.zone), labelX + 20, pieceY + 14);
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
    const canvas = await buildDuetSaveCanvas();
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

function duetOrderRows() {
  return duetLinked
    ? [{label: DUET_ZONE_LABEL.leather, zone:'front1', hex: duetColors.front1},
       {label: DUET_ZONE_LABEL.belt,    zone:'belt',   hex: duetColors.belt  }]
    : [{label: DUET_ZONE_LABEL.rear,   zone:'rear',   hex: duetColors.rear  },
       {label: DUET_ZONE_LABEL.belt,   zone:'belt',   hex: duetColors.belt  },
       {label: DUET_ZONE_LABEL.front4, zone:'front4', hex: duetColors.front4},
       {label: DUET_ZONE_LABEL.front3, zone:'front3', hex: duetColors.front3},
       {label: DUET_ZONE_LABEL.front2, zone:'front2', hex: duetColors.front2},
       {label: DUET_ZONE_LABEL.front1, zone:'front1', hex: duetColors.front1}];
}

function showDuetConfirmModal(result) {
  const modal = document.getElementById('duet-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('duet-modal-image');
  if (img) img.src = result.imageUrl;

  const style = DUET_FRONT_STYLES.find(s => s.id === duetSelectedStyle);
  const len   = DUET_LENGTHS.find(l => l.id === duetSelectedLength);
  const rows = duetOrderRows();

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
      <div class="modal-color-row">
        <span class="modal-zone-label">長さ</span>
        <span></span>
        <span>${len?.label}（${len?.desc}）</span>
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
  const len   = DUET_LENGTHS.find(l => l.id === duetSelectedLength);
  const variantId = DUET_VARIANT_MAP[duetSelectedStyle]?.[duetSelectedLength];
  if (!variantId) { showDuetToast('バリアントが見つかりません'); return; }
  const rows  = duetOrderRows();
  const colorDataEN = duetLinked
    ? `Leather(All):${colorName(duetColors.front1,'front1')}, Belt[Nylon]:${colorName(duetColors.belt,'belt')}`
    : rows.map(r => `${r.label}:${colorName(r.hex, r.zone)}`).join(', ');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${DUET_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  Object.entries({'Order ID': duetLastUploadedImage.orderId, 'Colors': colorDataEN, 'Front Part': style.label, 'Length': len.label, 'Image URL': duetLastUploadedImage.imageUrl})
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
