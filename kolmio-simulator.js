// ============================================================================
// 設定
// ============================================================================

const KOLMIO_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const KOLMIO_SHOPIFY_DOMAIN = '708works.jp';

// 価格（暫定値。Shopify側の実商品作成時に要確認・要調整）
// ベースは現行「kolmio for ukulele」標準(鱗14個・薄革)の価格を流用。
// 鱗1個あたりの価格は、現行Shopify「ウロコ追加」オプションの実績値(+7cm/+¥1,540)をそのまま採用。
const KOLMIO_BASE_PRICE      = 21560;
const KOLMIO_STANDARD_COUNT  = 14;
const KOLMIO_PER_SCALE_ADD   = 1540;
const KOLMIO_THICK_LEATHER_ADD = 3000; // 暫定額（要確認）

// 鱗の総数レンジ：ウクレレの短めサイズ〜ギター用の長いサイズまでを1シミュレーターでカバー
const KOLMIO_SCALE_MIN = 10;
const KOLMIO_SCALE_MAX = 22;
const KOLMIO_SCALE_DEFAULT = 22;

// SVG内 各鱗パーツ番号 ⇔ 実DOM要素ID（Illustrator書き出しのエンコードIDそのまま）
const KOLMIO_ID_BY_NUM = {
  22: '_x32_2-rear',
  21: '_x32_1',
  20: '_x32_0',
  19: '_x31_9',
  18: '_x31_8',
  17: '_x31_7',
  16: '_x31_6',
  15: '_x31_5',
  14: '_x31_4',
  13: '_x31_3',
  12: '_x31_2',
  11: '_x31_1',
  10: '_x31_0',
  9:  '_x39_',
  8:  '_x38_',
  7:  '_x37_',
  6:  '_x36_',
  5:  '_x35_',
  4:  '_x34_',
  3:  '_x33_',
  2:  '_x32_',
  1:  '_x31_-front',
};

// 各パーツの元のY座標（パス内のM開始点基準。等間隔dy≈78.045で配置されている）
// 末端(22番)を任意のスロット位置へtranslateで移動させる際の基準値として使用。
const KOLMIO_PIECE_Y = {
  22: 87.84,  21: 165.88, 20: 243.93, 19: 321.97, 18: 400.02,
  17: 478.06, 16: 556.11, 15: 634.15, 14: 712.2,  13: 790.25,
  12: 868.29, 11: 946.34, 10: 1024.38, 9: 1102.43, 8: 1180.47,
  7:  1258.52, 6: 1336.56, 5: 1414.61, 4: 1492.66, 3: 1570.7,
  2:  1648.75, 1: 1726.79,
};

// ベルト用カラー（Triad/Duet/Courierと共通の12色パレット。708works.jp/products/sample02より抽出）
const KOLMIO_BELT_COLORS = [
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

// ============================================================================
// 状態
// ============================================================================

let kolmioScaleCount    = KOLMIO_SCALE_DEFAULT;
let kolmioThickLeather  = true; // 今回のギター用途を想定しデフォルトON
let kolmioBlockCount    = 1;    // 1〜3色
let kolmioBlocks        = [{ through: KOLMIO_SCALE_DEFAULT, hex: '#e4ad90' }];
let kolmioActiveBlock   = 0;
let kolmioImageSaved    = false;
let kolmioHistory       = [];
let kolmioLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initKolmioSimulator() {
  if (window.kolmioSimulatorInitialized) return;
  const palette = document.getElementById('kolmio-palette');
  const wrap    = document.getElementById('kolmio-strap-wrap');
  if (!palette || !wrap) { setTimeout(initKolmioSimulator, 100); return; }
  window.kolmioSimulatorInitialized = true;

  buildKolmioBlockButtons();
  buildKolmioPalette();
  buildKolmioBoundaryInputs();
  updateKolmioSummary();
  updateKolmioLengthUI();
  updateKolmioPriceDisplay();
  loadKolmioSVG();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKolmioSimulator);
} else {
  initKolmioSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadKolmioSVG() {
  const wrap = document.getElementById('kolmio-strap-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/kolmio_color_order.svg')
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
      applyKolmioLength(kolmioScaleCount);
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// 長さ（鱗の数）制御
// ============================================================================

// 表示順（先端=1 → 末端）に並んだ、可視パーツの番号列を返す。
// 22番より短くする場合は、必ず末端が22番の実物パーツになるよう、
// 途中の番号(N〜21)を間引いて22番を詰める。
function kolmioVisibleSequence(n) {
  const seq = [];
  for (let i = 1; i <= n - 1; i++) seq.push(i);
  seq.push(22);
  return seq;
}

function applyKolmioLength(n) {
  kolmioScaleCount = Math.max(KOLMIO_SCALE_MIN, Math.min(KOLMIO_SCALE_MAX, n));
  const N = kolmioScaleCount;
  const svg = document.querySelector('#kolmio-strap-wrap svg');
  if (!svg) return;

  for (let i = 1; i <= 21; i++) {
    const el = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[i]));
    if (!el) continue;
    if (i <= N - 1) {
      el.style.display = '';
      el.removeAttribute('transform');
    } else {
      el.style.display = 'none';
    }
  }

  const rear = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[22]));
  if (rear) {
    const dy = KOLMIO_PIECE_Y[N] - KOLMIO_PIECE_Y[22];
    rear.setAttribute('transform', `translate(0, ${dy.toFixed(3)})`);
    rear.style.display = '';
  }

  clampKolmioBlockThroughs();
  updateKolmioViewBox(svg);
  applyKolmioColors();
  updateKolmioPriceDisplay();
  updateKolmioLengthUI();
}

// 非表示要素を除いた実際の可視範囲にviewBoxを合わせ、隙間なく詰まって見えるようにする。
function updateKolmioViewBox(svg) {
  try {
    const bbox = svg.getBBox();
    const pad = 4;
    svg.setAttribute('viewBox', `${(bbox.x - pad).toFixed(2)} ${(bbox.y - pad).toFixed(2)} ${(bbox.width + pad * 2).toFixed(2)} ${(bbox.height + pad * 2).toFixed(2)}`);
  } catch (e) { /* getBBox未対応環境ではフォールバック（元のviewBoxのまま） */ }
}

// ============================================================================
// カラーブロック（先端から1〜3色の区間指定）
// ============================================================================

function buildKolmioBlockButtons() {
  const container = document.getElementById('kolmio-block-count');
  if (!container) return;
  container.innerHTML = '';
  [1, 2, 3].forEach(count => {
    const btn = document.createElement('button');
    btn.className = 'kolmio-block-btn' + (count === kolmioBlockCount ? ' active' : '');
    btn.textContent = count + '色';
    btn.onclick = () => setKolmioBlockCount(count);
    container.appendChild(btn);
  });
}

function setKolmioBlockCount(count) {
  saveKolmioHistory();
  kolmioBlockCount = count;
  const N = kolmioScaleCount;
  const prevBlocks = kolmioBlocks;
  const blocks = [];
  for (let i = 0; i < count; i++) {
    const through = i === count - 1 ? N : Math.round(N * (i + 1) / count);
    const hex = (prevBlocks[i] && prevBlocks[i].hex) || KOLMIO_BELT_COLORS[i % KOLMIO_BELT_COLORS.length].hex;
    blocks.push({ through, hex });
  }
  kolmioBlocks = blocks;
  kolmioActiveBlock = 0;
  clampKolmioBlockThroughs();
  buildKolmioBlockButtons();
  buildKolmioPalette();
  buildKolmioBoundaryInputs();
  updateKolmioSummary();
  applyKolmioColors();
}

// ブロックのthrough値が、鱗総数の変更後も「昇順・範囲内・各ブロック最低1個」を満たすよう補正する
function clampKolmioBlockThroughs() {
  const N = kolmioScaleCount;
  const count = kolmioBlocks.length;
  kolmioBlocks[count - 1].through = N;
  for (let i = 0; i < count - 1; i++) {
    const min = i + 1;
    const max = N - (count - 1 - i);
    kolmioBlocks[i].through = Math.max(min, Math.min(max, kolmioBlocks[i].through));
  }
  for (let i = 1; i < count - 1; i++) {
    if (kolmioBlocks[i].through <= kolmioBlocks[i - 1].through) {
      kolmioBlocks[i].through = kolmioBlocks[i - 1].through + 1;
    }
  }
}

function buildKolmioBoundaryInputs() {
  const container = document.getElementById('kolmio-boundaries');
  if (!container) return;
  container.innerHTML = '';
  const N = kolmioScaleCount;
  if (kolmioBlocks.length < 2) return;

  kolmioBlocks.forEach((block, i) => {
    if (i === kolmioBlocks.length - 1) return; // 最後のブロックは自動で末端まで
    const row = document.createElement('div');
    row.className = 'kolmio-boundary-row';
    const min = i + 1;
    const max = N - (kolmioBlocks.length - 1 - i);
    row.innerHTML = `<span>色${i + 1} → 色${i + 2} の切り替え位置：先端から<strong>${block.through}</strong>個目まで</span>`;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(block.through);
    input.oninput = () => {
      kolmioBlocks[i].through = Number(input.value);
      clampKolmioBlockThroughs();
      buildKolmioBoundaryInputs();
      updateKolmioSummary();
      applyKolmioColors();
    };
    row.appendChild(input);
    container.appendChild(row);
  });
}

function buildKolmioPalette() {
  const palette = document.getElementById('kolmio-palette');
  const label   = document.getElementById('kolmio-palette-label');
  if (!palette) return;
  if (label) label.textContent = `カラー（色${kolmioActiveBlock + 1}）`;
  palette.innerHTML = '';
  const current = kolmioBlocks[kolmioActiveBlock].hex;

  KOLMIO_BELT_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'kolmio-swatch' + (c.hex === current ? ' selected' : '');
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setKolmioColor(c.hex);
    palette.appendChild(sw);
  });

  buildKolmioBlockTabs();
}

// 色ブロックが複数ある場合、どのブロックを編集中か切り替えるタブ
function buildKolmioBlockTabs() {
  const container = document.getElementById('kolmio-block-tabs');
  if (!container) return;
  container.innerHTML = '';
  if (kolmioBlocks.length < 2) return;
  kolmioBlocks.forEach((block, i) => {
    const btn = document.createElement('button');
    btn.className = 'kolmio-tab-btn' + (i === kolmioActiveBlock ? ' active' : '');
    btn.innerHTML = `<span class="zone-dot" style="background:${block.hex}"></span>色${i + 1}`;
    btn.onclick = () => { kolmioActiveBlock = i; buildKolmioPalette(); };
    container.appendChild(btn);
  });
}

function setKolmioColor(hex) {
  saveKolmioHistory();
  kolmioBlocks[kolmioActiveBlock].hex = hex;
  kolmioImageSaved = false;
  buildKolmioPalette();
  updateKolmioSummary();
  applyKolmioColors();
}

function applyKolmioColors() {
  const svg = document.querySelector('#kolmio-strap-wrap svg');
  if (!svg) return;
  const N = kolmioScaleCount;
  const seq = kolmioVisibleSequence(N);

  let blockIdx = 0;
  seq.forEach((pieceNum, idx) => {
    const pos = idx + 1;
    while (blockIdx < kolmioBlocks.length - 1 && pos > kolmioBlocks[blockIdx].through) blockIdx++;
    const hex = kolmioBlocks[blockIdx].hex;
    const el = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[pieceNum]));
    if (el) el.style.fill = hex;
  });

  // ロゴ刻印は先端(1番)パーツに乗るため、1番＝色1のコントラストで自動計算
  const logo = svg.querySelector('#logo');
  if (logo) logo.style.fill = engravingColorKolmio(kolmioBlocks[0].hex);

  if (typeof applyKolmioKokuinColors === 'function') applyKolmioKokuinColors();
}

function engravingColorKolmio(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum > 0.45) {
    return `rgb(${Math.floor(r * .5)},${Math.floor(g * .5)},${Math.floor(b * .5)})`;
  } else {
    return `rgb(${Math.min(255, r + Math.floor((255 - r) * .45))},${Math.min(255, g + Math.floor((255 - g) * .45))},${Math.min(255, b + Math.floor((255 - b) * .45))})`;
  }
}

// ============================================================================
// 長さUI・サマリー・価格
// ============================================================================

function updateKolmioLengthUI() {
  const slider = document.getElementById('kolmio-length-slider');
  const label  = document.getElementById('kolmio-length-label');
  if (slider) {
    slider.min = String(KOLMIO_SCALE_MIN);
    slider.max = String(KOLMIO_SCALE_MAX);
    slider.value = String(kolmioScaleCount);
    if (!slider.dataset.bound) {
      slider.dataset.bound = '1';
      slider.addEventListener('input', () => applyKolmioLength(Number(slider.value)));
    }
  }
  if (label) {
    const mmTotal = kolmioTotalLengthMm(kolmioScaleCount);
    label.textContent = `鱗 ${kolmioScaleCount}個（全長 約${Math.round(mmTotal)}mm）`;
  }
}

// 全長の概算。標準14個=970mmを基点に、1個あたり約70mm(実績値)で換算。
function kolmioTotalLengthMm(n) {
  return 970 + (n - KOLMIO_STANDARD_COUNT) * 70;
}

function updateKolmioSummary() {
  const el = document.getElementById('kolmio-summary');
  if (!el) return;
  el.innerHTML = kolmioBlocks.map((b, i) => {
    const from = i === 0 ? 1 : kolmioBlocks[i - 1].through + 1;
    const rangeLabel = kolmioBlocks.length === 1 ? '全体' : `${from}〜${b.through}個目`;
    return `
    <div class="summary-row">
      <span class="summary-label">色${i + 1}（${rangeLabel}）</span>
      <span class="summary-dot" style="background:${b.hex}"></span>
      <span class="summary-name">${kolmioColorName(b.hex)}</span>
    </div>`;
  }).join('');
}

function kolmioColorName(hex) {
  return KOLMIO_BELT_COLORS.find(c => c.hex === hex)?.name || hex;
}

function updateKolmioPriceDisplay() {
  const el = document.getElementById('kolmio-price-display');
  if (!el) return;
  el.textContent = `¥${kolmioPrice().toLocaleString()}（税込）`;
}

function kolmioPrice() {
  const scaleAdd = (kolmioScaleCount - KOLMIO_STANDARD_COUNT) * KOLMIO_PER_SCALE_ADD;
  const thickAdd = kolmioThickLeather ? KOLMIO_THICK_LEATHER_ADD : 0;
  const kokuinAdd = (window.KOLMIO_KOKUIN_STATE?.enabled && window.KOLMIO_KOKUIN_PRICE_ADD) || 0;
  return KOLMIO_BASE_PRICE + scaleAdd + thickAdd + kokuinAdd;
}

function toggleKolmioThickLeather(checked) {
  kolmioThickLeather = checked;
  updateKolmioPriceDisplay();
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveKolmioHistory() {
  kolmioHistory.push(JSON.parse(JSON.stringify(kolmioBlocks)));
  if (kolmioHistory.length > 20) kolmioHistory.shift();
  const btn = document.getElementById('kolmio-btn-undo');
  if (btn) btn.disabled = false;
}

function kolmioUndo() {
  if (!kolmioHistory.length) return;
  kolmioBlocks = kolmioHistory.pop();
  kolmioImageSaved = false;
  buildKolmioPalette();
  buildKolmioBoundaryInputs();
  updateKolmioSummary();
  applyKolmioColors();
  const btn = document.getElementById('kolmio-btn-undo');
  if (btn) btn.disabled = kolmioHistory.length === 0;
}

function kolmioReset() {
  saveKolmioHistory();
  kolmioBlockCount = 1;
  kolmioBlocks = [{ through: kolmioScaleCount, hex: '#e4ad90' }];
  kolmioActiveBlock = 0;
  kolmioImageSaved = false;
  buildKolmioBlockButtons();
  buildKolmioPalette();
  buildKolmioBoundaryInputs();
  updateKolmioSummary();
  applyKolmioColors();
}

// ============================================================================
// 画像保存
// ============================================================================

async function kolmioSaveImage() {
  const svg = document.querySelector('#kolmio-strap-wrap svg');
  if (!svg) { showKolmioToast('SVGが見つかりません'); return; }
  const canvas = await buildKolmioSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `kolmio-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  kolmioImageSaved = true;
  showKolmioToast('画像を保存しました ✓');
}

async function buildKolmioSaveCanvas() {
  const svgEl = document.querySelector('#kolmio-strap-wrap svg');
  const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
  const SVG_VW = vb[2], SVG_VH = vb[3];
  const svgSaveW = 220;
  const scale = svgSaveW / SVG_VW;
  const svgSaveH = Math.round(SVG_VH * scale);

  const margin = 46;
  const gap    = 24;
  const labelColW = 160;
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

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KOLMIO', cw / 2, 38);
  ctx.fillStyle = '#666';
  ctx.font = '13px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 56);

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

  const labelX = margin + svgSaveW + gap;
  const rows = [
    ...kolmioBlocks.map((b, i) => {
      const from = i === 0 ? 1 : kolmioBlocks[i - 1].through + 1;
      const rangeLabel = kolmioBlocks.length === 1 ? '全体' : `${from}〜${b.through}個目`;
      return { label: `色${i + 1}（${rangeLabel}）`, hex: b.hex, name: kolmioColorName(b.hex) };
    }),
    { label: '長さ', hex: null, name: `鱗${kolmioScaleCount}個（全長約${Math.round(kolmioTotalLengthMm(kolmioScaleCount))}mm）` },
    { label: '革の厚み', hex: null, name: kolmioThickLeather ? '厚革仕様' : '標準' },
  ];
  const rowGap = svgSaveH / (rows.length + 1);
  rows.forEach((row, i) => {
    const y = svgY0 + rowGap * (i + 1);
    if (row.hex) {
      ctx.beginPath();
      ctx.arc(labelX + 7, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = row.hex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, labelX + 20, y - 3);
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.fillText(row.name, labelX + 20, y + 14);
  });

  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 12);

  return cv;
}

// ============================================================================
// Toast
// ============================================================================

function showKolmioToast(msg) {
  const el = document.getElementById('kolmio-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
