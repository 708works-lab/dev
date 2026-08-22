// ============================================================================
// 設定（Folkloreのsimulator.jsを土台に、Kolmio用に移植）
// ============================================================================

const KOLMIO_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const KOLMIO_SHOPIFY_DOMAIN = '708works.jp';

// ウロコの数レンジ：ウクレレの短めサイズ〜ギター用の長いサイズまでを1シミュレーターでカバー
const KOLMIO_SCALE_MIN = 10;
const KOLMIO_SCALE_MAX = 22;
const KOLMIO_SCALE_DEFAULT = 14; // ウクレレ用の標準に合わせる。ここから+/-で調整してもらう想定

// 価格（標準=ウロコ14個・薄革のkolmio for ukuleleをベースに、ウロコ1個あたり既存Shopifyオプションの
// 実績値+¥1,540を適用。厚革仕様(ギター向け)・名入れ刻印は別建てのアップチャージ）
const KOLMIO_BASE_PRICE     = 21560;
const KOLMIO_STANDARD_COUNT = 14;
const KOLMIO_PER_SCALE_ADD  = 1540;
const KOLMIO_THICK_ADD      = 3000; // 暫定額（要確認）

function kolmioPriceForCount(n) {
  return KOLMIO_BASE_PRICE + (n - KOLMIO_STANDARD_COUNT) * KOLMIO_PER_SCALE_ADD;
}

// Shopify商品「kolmio-color-order」の実バリエーションID（ウロコの数 × 革の厚み × 名入れ刻印）
const KOLMIO_VARIANT_MAP = {
  10: { standard: { noeng: "50148708155642", eng: "50148708188410" }, thick: { noeng: "50148708221178", eng: "50148708253946" } },
  11: { standard: { noeng: "50148708286714", eng: "50148708319482" }, thick: { noeng: "50148708352250", eng: "50148708385018" } },
  12: { standard: { noeng: "50148708417786", eng: "50148708450554" }, thick: { noeng: "50148708483322", eng: "50148708516090" } },
  13: { standard: { noeng: "50148708548858", eng: "50148708581626" }, thick: { noeng: "50148708614394", eng: "50148708647162" } },
  14: { standard: { noeng: "50148708679930", eng: "50148708712698" }, thick: { noeng: "50148708745466", eng: "50148708778234" } },
  15: { standard: { noeng: "50148708811002", eng: "50148708843770" }, thick: { noeng: "50148708876538", eng: "50148708909306" } },
  16: { standard: { noeng: "50148708942074", eng: "50148708974842" }, thick: { noeng: "50148709007610", eng: "50148709040378" } },
  17: { standard: { noeng: "50148709073146", eng: "50148709105914" }, thick: { noeng: "50148709138682", eng: "50148709171450" } },
  18: { standard: { noeng: "50148709204218", eng: "50148709236986" }, thick: { noeng: "50148709269754", eng: "50148709302522" } },
  19: { standard: { noeng: "50148709335290", eng: "50148709368058" }, thick: { noeng: "50148709400826", eng: "50148709433594" } },
  20: { standard: { noeng: "50148709466362", eng: "50148709499130" }, thick: { noeng: "50148709531898", eng: "50148709564666" } },
  21: { standard: { noeng: "50148709597434", eng: "50148709630202" }, thick: { noeng: "50148709662970", eng: "50148709695738" } },
  22: { standard: { noeng: "50148709728506", eng: "50148709761274" }, thick: { noeng: "50148709794042", eng: "50148709826810" } },
};

// カラー定義（Folklore/Kolmio(ukulele)と共通の20色パレット）
const KOLMIO_COLORS = [
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

const KOLMIO_GRADS = [
  {name:'オーシャン', fn:i=>['#1e2540','#2a5060','#7baed0','#3a5030','#2a5060','#1e2540'][i%6]},
  {name:'サンセット', fn:i=>['#1a1a1a','#7a2035','#b82828','#d4742a','#e8c84a','#d4742a'][i%6]},
  {name:'フォレスト', fn:i=>['#1a1a1a','#3a5030','#7a7848','#a8c43a','#3a5030','#1a1a1a'][i%6]},
  {name:'ヴィンテージ',fn:i=>['#4a2018','#9e3820','#c46030','#d4742a','#e8c4a0','#c46030'][i%6]},
  {name:'キャンディ', fn:i=>['#d96090','#f0a0a8','#e8c84a','#7baed0','#a8c43a','#d96090'][i%6]},
];

// SVG内 各ウロコパーツ番号 ⇔ 実DOM要素ID（Illustrator書き出しのエンコードIDそのまま）
const KOLMIO_ID_BY_NUM = {
  22: '_x32_2-rear',
  21: '_x32_1', 20: '_x32_0', 19: '_x31_9', 18: '_x31_8', 17: '_x31_7',
  16: '_x31_6', 15: '_x31_5', 14: '_x31_4', 13: '_x31_3', 12: '_x31_2',
  11: '_x31_1', 10: '_x31_0', 9: '_x39_', 8: '_x38_', 7: '_x37_',
  6: '_x36_', 5: '_x35_', 4: '_x34_', 3: '_x33_', 2: '_x32_',
  1: '_x31_-front',
};

// 各パーツの元のY座標（パス内のM開始点基準。等間隔dy≈78.045で配置されている）
const KOLMIO_PIECE_Y = {
  22: 87.84,  21: 165.88, 20: 243.93, 19: 321.97, 18: 400.02,
  17: 478.06, 16: 556.11, 15: 634.15, 14: 712.2,  13: 790.25,
  12: 868.29, 11: 946.34, 10: 1024.38, 9: 1102.43, 8: 1180.47,
  7:  1258.52, 6: 1336.56, 5: 1414.61, 4: 1492.66, 3: 1570.7,
  2:  1648.75, 1: 1726.79,
};
const KOLMIO_SVG_VW = 46; // viewBoxの幅（固定）

// 22個以下なので、Kolmioは実物パーツのみで構成可能（Folkloreのようなクローン合成は不要）。
// 表示順（後ろ=22番→前=1番）: [22, N-1, N-2, ..., 2, 1]（長さN）
function kolmioDisplayOrder(n) {
  const order = [22];
  for (let p = n - 1; p >= 1; p--) order.push(p);
  return order;
}

// ============================================================================
// グローバル状態
// ============================================================================

let kN = KOLMIO_SCALE_DEFAULT;
// ピース番号(1〜22)をキーにした色マップ。常に全22個ぶん保持し、表示中の分だけ使う。
let kPieceColors = {};
for (let p = 1; p <= 22; p++) kPieceColors[p] = '#c46030';
let kSelected = new Set(); // 選択中のピース番号
let kMode = 'single', kRangeStartIdx = null; // range用は表示順インデックスで管理
let kActiveColor = KOLMIO_COLORS[12]; // Camel
let kThick = false; // ギター向け厚革仕様（+¥3,000）
let kHistory = [];
let kLastUploadedImage = null;
let kHasDownloadedImage = false;

// ============================================================================
// 初期化
// ============================================================================

function initKolmioSimulator() {
  if (window.kolmioSimulatorInitialized) return;
  const paletteEl = document.getElementById('kolmio-palette');
  const gradRowEl = document.getElementById('kolmio-grad-row');
  const strapScrollEl = document.getElementById('kolmio-strap-scroll');
  if (!paletteEl || !gradRowEl || !strapScrollEl) { setTimeout(initKolmioSimulator, 100); return; }
  window.kolmioSimulatorInitialized = true;

  buildKolmioPalette();
  buildKolmioGrads();
  updateKolmioSummary();
  buildKolmioStrapSVG();
  updateKolmioPriceDisplay();
  updateKolmioCountDisplay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKolmioSimulator);
} else {
  initKolmioSimulator();
}

window.addEventListener('resize', () => {
  if (window.kolmioSimulatorInitialized) buildKolmioStrapSVG();
});

// ============================================================================
// 価格表示
// ============================================================================

function updateKolmioPriceDisplay() {
  const el = document.getElementById('kolmio-price-display');
  if (!el) return;
  const kokuinAdd = (window.KOLMIO_KOKUIN_STATE?.enabled && window.KOLMIO_KOKUIN_PRICE_ADD) || 0;
  const thickAdd = kThick ? KOLMIO_THICK_ADD : 0;
  el.textContent = `¥${(kolmioPriceForCount(kN) + thickAdd + kokuinAdd).toLocaleString()}（税込）`;
}

function toggleKolmioThick(checked) {
  kThick = checked;
  updateKolmioPriceDisplay();
}

// ============================================================================
// 履歴管理
// ============================================================================

function kolmioSaveHistory() {
  kHistory.push({ colors: { ...kPieceColors }, n: kN });
  if (kHistory.length > 30) kHistory.shift();
  const btn = document.getElementById('kolmio-btn-undo');
  if (btn) btn.disabled = false;
}

function kolmioUndo() {
  if (!kHistory.length) return;
  const prev = kHistory.pop();
  kN = prev.n; kPieceColors = prev.colors;
  kSelected.clear();
  updateKolmioCountDisplay();
  updateKolmioPriceDisplay();
  const selInfo = document.getElementById('kolmio-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  buildKolmioStrapSVG();
  updateKolmioSummary();
  const btn = document.getElementById('kolmio-btn-undo');
  if (!kHistory.length && btn) btn.disabled = true;
}

// ============================================================================
// ウロコの数（±ステッパー）
// ============================================================================

function updateKolmioCountDisplay() {
  const cntDisp = document.getElementById('kolmio-cnt-disp');
  const cntSub  = document.getElementById('kolmio-cnt-sub');
  if (!cntDisp || !cntSub) return;
  cntDisp.textContent = kN + '個';
  const diff = kN - KOLMIO_STANDARD_COUNT;
  const len = 970 + (kN - KOLMIO_STANDARD_COUNT) * 70;
  const txt = diff === 0 ? '標準' : diff > 0 ? `標準より${diff}個多い` : `標準より${Math.abs(diff)}個少ない`;
  cntSub.textContent = `${txt}（全長 約${len}mm）`;
}

function kolmioChangeCount(d) {
  const nx = kN + d;
  if (nx < KOLMIO_SCALE_MIN || nx > KOLMIO_SCALE_MAX) return;
  kolmioSaveHistory();
  kN = nx;
  // ピース番号キーの色マップは常時22個ぶん保持しているため、
  // 表示数が変わってもデータの移動は不要（Folkloreのようなsplice処理は不要）。
  kSelected.clear();
  const selInfo = document.getElementById('kolmio-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  updateKolmioCountDisplay();
  updateKolmioPriceDisplay();
  buildKolmioStrapSVG();
  updateKolmioSummary();
}

// ============================================================================
// ストラップ描画（小さい固定サイズのSVG。Folkloreと同じくstrap-scroll内で完結させ、
// ページ全体が長くならないようにする）
// ============================================================================

function buildKolmioStrapSVG() {
  const scroll = document.getElementById('kolmio-strap-scroll');
  const col = document.getElementById('kolmio-strap-col');
  if (!scroll || !col) return;

  const order = kolmioDisplayOrder(kN); // [22, N-1, ..., 1]
  // 固定表示幅(px)。KolmioのウロコはFolkloreの葉型パーツよりも縦横比が細長いため、
  // 同じ表示幅では全長が入りきらない。.strap-scrollのmax-height(CSS側)による
  // 内部スクロールと組み合わせ、タップしやすい幅を優先して設定する。
  const dispW = 30;

  col.style.width = (dispW + 30) + 'px';

  // 暫定viewBox（後でgetBBoxの実測値に置き換える）でいったん描画する
  scroll.innerHTML = `<svg id="kolmio-strap-svg"
    viewBox="0 0 ${KOLMIO_SVG_VW} 1800"
    style="display:block;margin:0 auto;cursor:pointer;touch-action:none;flex-shrink:0;"
    xmlns="http://www.w3.org/2000/svg">${KOLMIO_SVG_INNER}</svg>`;

  const svg = document.getElementById('kolmio-strap-svg');

  // 1〜21番は元位置のまま表示/非表示を切り替え、22番(末端)だけを現在のNに応じた
  // スロット位置までtranslateして詰める（末端は必ず実物の22番パーツを使う）。
  for (let p = 1; p <= 21; p++) {
    const g = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[p]));
    if (!g) continue;
    if (p <= kN - 1) { g.style.display = ''; g.removeAttribute('transform'); }
    else { g.style.display = 'none'; }
  }
  const rear = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[22]));
  if (rear) {
    const dy = KOLMIO_PIECE_Y[kN] - KOLMIO_PIECE_Y[22];
    rear.setAttribute('transform', `translate(0, ${dy.toFixed(3)})`);
    rear.style.display = '';
  }

  // 表示/非表示・translateを確定させた後、実際の描画範囲をgetBBoxで測ってviewBoxを
  // タイトに合わせる。手計算の余白だと末端パーツ自体の実形状（穴の分の張り出し等）を
  // 見誤って上端が切れることがあるため、必ず実測値を使う。
  const pad = 4;
  const bbox = svg.getBBox();
  const vbX = bbox.x - pad, vbY = bbox.y - pad, vbW = bbox.width + pad * 2, vbH = bbox.height + pad * 2;
  const scale = dispW / vbW;
  const dispH = Math.round(vbH * scale);
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  svg.setAttribute('width', dispW);
  svg.setAttribute('height', dispH);

  // タップ/クリックイベント（表示順インデックスで扱う。範囲選択の連続性を表示順で担保するため）
  order.forEach((pieceNum, idx) => {
    const g = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[pieceNum]));
    if (!g) return;
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => kolmioHandleTap(idx));
    g.addEventListener('touchend', e => { e.preventDefault(); kolmioHandleTap(idx); }, { passive: false });
  });

  kolmioRedrawSVG();
}

function kolmioRedrawSVG() {
  const svg = document.getElementById('kolmio-strap-svg');
  if (!svg) return;
  const order = kolmioDisplayOrder(kN);
  order.forEach((pieceNum, idx) => {
    const g = svg.querySelector('#' + CSS.escape(KOLMIO_ID_BY_NUM[pieceNum]));
    if (!g) return;
    const hex = kPieceColors[pieceNum];
    const isSel = kSelected.has(pieceNum);
    g.style.fill = hex;
    g.style.stroke = isSel ? '#ffd700' : '#000';
    g.style.strokeWidth = isSel ? '3.5' : '0.5';
  });
  // ロゴ刻印は先端(1番)パーツに乗るため、1番の色のコントラストで自動計算
  const logo = svg.querySelector('#logo');
  if (logo) logo.style.fill = kolmioEngravingColor(kPieceColors[1]);

  if (typeof applyKolmioKokuinColors === 'function') applyKolmioKokuinColors();
}

function kolmioEngravingColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum > 0.45) return `rgb(${Math.floor(r * .5)},${Math.floor(g * .5)},${Math.floor(b * .5)})`;
  return `rgb(${Math.min(255, r + Math.floor((255 - r) * .45))},${Math.min(255, g + Math.floor((255 - g) * .45))},${Math.min(255, b + Math.floor((255 - b) * .45))})`;
}

// ============================================================================
// タップ処理（1枚ずつ／範囲／一括）
// ============================================================================

function kolmioHandleTap(displayIdx) {
  const order = kolmioDisplayOrder(kN);
  const pieceNum = order[displayIdx];
  if (kMode === 'single') {
    kolmioSaveHistory();
    kSelected.clear(); kSelected.add(pieceNum);
    kPieceColors[pieceNum] = kActiveColor.hex;
    updateKolmioSummary();
    kHasDownloadedImage = false;
  } else if (kMode === 'range') {
    if (kRangeStartIdx === null) {
      kRangeStartIdx = displayIdx;
      kSelected.clear(); kSelected.add(pieceNum);
    } else {
      kolmioSaveHistory();
      const a = Math.min(kRangeStartIdx, displayIdx), b = Math.max(kRangeStartIdx, displayIdx);
      kSelected.clear();
      for (let j = a; j <= b; j++) kSelected.add(order[j]);
      kRangeStartIdx = null;
    }
  }
  kolmioUpdateSelInfo();
  kolmioRedrawSVG();
}

function kolmioUpdateSelInfo() {
  const el = document.getElementById('kolmio-sel-info');
  if (!el) return;
  if (!kSelected.size) { el.textContent = 'パーツをタップ'; return; }
  const order = kolmioDisplayOrder(kN);
  const idxs = [...kSelected].map(p => order.indexOf(p)).sort((a, b) => a - b);
  const frontNumOf = idx => kN - idx; // idx=0(rear)→N, idx=N-1(front)→1
  if (idxs.length === 1) {
    el.innerHTML = `前から <b>#${frontNumOf(idxs[0])}</b>`;
  } else {
    el.innerHTML = `前から <b>#${frontNumOf(idxs[idxs.length - 1])}〜#${frontNumOf(idxs[0])}</b>（<b>${idxs.length}枚</b>）`;
  }
}

// ============================================================================
// モード切替
// ============================================================================

function setKolmioMode(m) {
  kMode = m; kRangeStartIdx = null;
  document.querySelectorAll('.kolmio-simulator .mbt').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById('kolmio-m-' + m);
  if (btn) btn.classList.add('on');
  if (m === 'all') {
    kSelected.clear();
    kolmioDisplayOrder(kN).forEach(p => kSelected.add(p));
    const el = document.getElementById('kolmio-sel-info');
    if (el) el.innerHTML = `全 <b>${kN}枚</b>`;
  } else {
    kSelected.clear();
    const el = document.getElementById('kolmio-sel-info');
    if (el) el.textContent = 'パーツをタップ';
  }
  kolmioRedrawSVG();
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildKolmioPalette() {
  const p = document.getElementById('kolmio-palette');
  if (!p) return;
  p.innerHTML = '';
  KOLMIO_COLORS.forEach(c => {
    const wrap = document.createElement('div');
    wrap.className = 'cb-wrap';
    wrap.dataset.id = c.id;

    const dot = document.createElement('div');
    dot.className = 'cb' + (c.id === kActiveColor.id ? ' on' : '');
    dot.style.cssText = `background:${c.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${c.id === kActiveColor.id ? '#111' : 'transparent'};`;

    const nm = document.createElement('div');
    nm.className = 'color-name' + (c.id === kActiveColor.id ? ' on' : '');
    nm.textContent = c.name;

    wrap.appendChild(dot); wrap.appendChild(nm);
    wrap.onclick = () => {
      kActiveColor = c;
      document.querySelectorAll('.kolmio-simulator .cb').forEach(b => {
        const isActive = b.parentElement.dataset.id === c.id;
        b.style.cssText = `background:${KOLMIO_COLORS.find(col => col.id === b.parentElement.dataset.id)?.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${isActive ? '#111' : 'transparent'};`;
      });
      document.querySelectorAll('.kolmio-simulator .color-name').forEach(b => b.classList.toggle('on', b.closest('.cb-wrap')?.dataset.id === c.id));
      if (!kSelected.size) return;
      kolmioSaveHistory();
      [...kSelected].forEach(pieceNum => { kPieceColors[pieceNum] = c.hex; });
      kolmioRedrawSVG();
      updateKolmioSummary();
    };
    p.appendChild(wrap);
  });
}

// ============================================================================
// おすすめ配色プリセット
// ============================================================================

function buildKolmioGrads() {
  const row = document.getElementById('kolmio-grad-row');
  if (!row) return;
  row.innerHTML = '';
  KOLMIO_GRADS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'gb';
    btn.textContent = g.name;
    btn.onclick = () => {
      kolmioSaveHistory();
      kolmioDisplayOrder(kN).forEach((pieceNum, i) => { kPieceColors[pieceNum] = g.fn(i); });
      kolmioRedrawSVG();
      updateKolmioSummary();
    };
    row.appendChild(btn);
  });
}

// ============================================================================
// サマリー・リセット
// ============================================================================

function updateKolmioSummary() {
  const el = document.getElementById('kolmio-summary');
  if (!el) return;
  const counts = {};
  kolmioDisplayOrder(kN).forEach(p => { const h = kPieceColors[p]; counts[h] = (counts[h] || 0) + 1; });
  const nameOf = h => KOLMIO_COLORS.find(c => c.hex === h)?.name || h;
  el.innerHTML = Object.entries(counts).map(([h, n]) =>
    `<span class="si"><span class="sw" style="background:${h}"></span>${nameOf(h)} ×${n}</span>`
  ).join('');
}

function kolmioResetAll() {
  kolmioSaveHistory();
  for (let p = 1; p <= 22; p++) kPieceColors[p] = '#c46030';
  kSelected.clear();
  const selInfo = document.getElementById('kolmio-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  kolmioRedrawSVG();
  updateKolmioSummary();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showKolmioToast(msg) {
  const t = document.getElementById('kolmio-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function showKolmioLoading(text = '処理中...') {
  const loadingText = document.getElementById('kolmio-loading-text');
  const loadingOverlay = document.getElementById('kolmio-loading-overlay');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}
function hideKolmioLoading() {
  const el = document.getElementById('kolmio-loading-overlay');
  if (el) el.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

async function kolmioSaveImage() {
  showKolmioLoading('画像を生成中...');
  try {
    const canvas = await buildKolmioSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kolmio-${kN}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideKolmioLoading();
    kHasDownloadedImage = true;
    showKolmioToast('画像を保存しました');
  } catch (e) {
    console.error(e);
    hideKolmioLoading();
    showKolmioToast('保存に失敗しました');
  }
}

async function buildKolmioSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;
  const svgSaveW = 56;
  // ライブのプレビューSVG（buildKolmioStrapSVGでgetBBoxにより実測済みのviewBoxを持つ）から
  // そのままアスペクト比を引き継ぐ。ここで独自に余白を仮定し直すと、末端パーツの実形状に
  // よっては上端が切れるおそれがあるため、必ず実測済みのviewBoxを使うこと。
  const liveSvg = document.getElementById('kolmio-strap-svg');
  const liveVb = liveSvg?.getAttribute('viewBox')?.split(' ').map(Number);
  const vbW = liveVb ? liveVb[2] : KOLMIO_SVG_VW;
  const vbH = liveVb ? liveVb[3] : 1700;
  const scale = svgSaveW / vbW;
  const svgSaveH = Math.round(vbH * scale);

  const kokuin = window.KOLMIO_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const kokuinH = kokuinEnabled ? 78 : 0;

  const headerH = 50, topLabelH = 25, bottomLabelH = 25, specH = 24, footerH = 28;
  const svgX = Math.round(cw / 2 - svgSaveW / 2);
  const svgY0 = headerH + topLabelH;
  const ch = svgY0 + svgSaveH + bottomLabelH + specH + kokuinH + footerH + 10;

  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8'; ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('KOLMIO', cw / 2, 28);
  ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 42);

  ctx.fillStyle = '#444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▲ 後ろ', cw / 2, svgY0 - 6);

  const svgEl = document.getElementById('kolmio-strap-svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    cloned.querySelectorAll('[style*="stroke"]').forEach(el => { el.style.stroke = '#000'; el.style.strokeWidth = '0.5'; });
    const svgStr = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, svgX, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  ctx.fillStyle = '#444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▼ 前', cw / 2, svgY0 + svgSaveH + 14);

  const labelX = svgX + svgSaveW + 18;
  const order = kolmioDisplayOrder(kN);
  order.forEach((pieceNum, i) => {
    const pieceY = svgY0 + (5 + (i + 0.5) * ((svgSaveH) / order.length)) ;
    const color = kPieceColors[pieceNum];
    const cname = KOLMIO_COLORS.find(c => c.hex === color)?.name || '';
    ctx.beginPath(); ctx.arc(labelX + 6, pieceY, 5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`P${String(kN - i).padStart(2, '0')}`, labelX + 16, pieceY - 2);
    ctx.fillStyle = '#333'; ctx.font = '10px sans-serif';
    ctx.fillText(cname, labelX + 16, pieceY + 10);
  });

  const specY = svgY0 + svgSaveH + bottomLabelH + 6;
  ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`仕様：${kThick ? '厚革仕様（ギター向け、+¥' + KOLMIO_THICK_ADD.toLocaleString() + '）' : '標準厚み'}`, 24, specY + 14);

  if (kokuinEnabled) {
    const boxMargin = 24, boxX = boxMargin, boxY = specY + specH, boxW = cw - boxMargin * 2, boxH = kokuinH - 12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boxX + 8, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, 8);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, 8);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, 8);
    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('名入れ刻印', boxX + 14, boxY + 18);
    await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a'; ctx.font = `${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
    ctx.fillText(kokuin.text, boxX + 14, boxY + boxH - 16);
  }

  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

  return cv;
}

// ============================================================================
// オーダー処理
// ============================================================================

async function kolmioGoOrder() {
  if (window.KOLMIO_KOKUIN_STATE?.enabled && !window.KOLMIO_KOKUIN_STATE.valid) {
    showKolmioToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!kHasDownloadedImage) await kolmioSaveImage();
  showKolmioLoading('画像をアップロード中...');
  try {
    const canvas = await buildKolmioSaveCanvas();
    const uploadResult = await kolmioUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    kLastUploadedImage = uploadResult;
    hideKolmioLoading();
    showKolmioConfirmModal(uploadResult);
  } catch (error) {
    console.error(error);
    hideKolmioLoading();
    showKolmioToast('エラーが発生しました: ' + error.message);
  }
}

async function kolmioUploadOrderImage(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = `kolmio-${Date.now()}`;
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  try {
    const res = await fetch(KOLMIO_WORKER_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    if (!data.success && !data.url && !data.imageUrl) throw new Error(data.error || 'Upload failed');
    return { imageUrl: data.imageUrl || data.url, orderId };
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

function kolmioColorSummaryLines() {
  const order = kolmioDisplayOrder(kN);
  return order.map((pieceNum, i) => {
    const name = KOLMIO_COLORS.find(c => c.hex === kPieceColors[pieceNum])?.name || kPieceColors[pieceNum];
    const pos = i === order.length - 1 ? ' [前]' : i === 0 ? ' [後ろ]' : '';
    return `P${String(kN - i).padStart(2, '0')}${pos}: ${name}`;
  });
}

function showKolmioConfirmModal(uploadResult) {
  const modal = document.getElementById('kolmio-confirm-modal');
  const modalImage = document.getElementById('kolmio-modal-image');
  const modalInfo = document.getElementById('kolmio-modal-info');
  if (!modal || !modalImage || !modalInfo) return;
  modalImage.src = uploadResult.imageUrl;

  const kokuinEnabled = !!(window.KOLMIO_KOKUIN_STATE?.enabled && window.KOLMIO_KOKUIN_STATE.valid && window.KOLMIO_KOKUIN_STATE.text);
  const kokuinAdd = kokuinEnabled ? (window.KOLMIO_KOKUIN_PRICE_ADD || 0) : 0;
  const thickAdd = kThick ? KOLMIO_THICK_ADD : 0;
  const price = kolmioPriceForCount(kN) + thickAdd + kokuinAdd;
  const kokuin = window.KOLMIO_KOKUIN_STATE;
  const kokuinLine = kokuinEnabled ? `<p><strong>名入れ刻印:</strong> ${kokuin.text}（${kokuin.fontLabel}）</p>` : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>ウロコの数:</strong> ${kN}個</p>
    <p><strong>全長:</strong> 約${970 + (kN - KOLMIO_STANDARD_COUNT) * 70}mm</p>
    <p><strong>仕様:</strong> ${kThick ? '厚革仕様（ギター向け）' : '標準厚み'}</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    ${kokuinLine}
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${kolmioColorSummaryLines().join('<br>')}</div>
  `;
  modal.classList.add('show');
}

function closeKolmioModal() {
  const modal = document.getElementById('kolmio-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function kolmioProceedToCart() {
  if (!kLastUploadedImage) { showKolmioToast('画像情報が見つかりません'); return; }
  closeKolmioModal();
  showKolmioLoading('カートに追加中...');
  try {
    const order = kolmioDisplayOrder(kN);
    const colorDataEN = order.map((pieceNum, i) => {
      const name = KOLMIO_COLORS.find(c => c.hex === kPieceColors[pieceNum])?.name || kPieceColors[pieceNum];
      let pos = '';
      if (i === order.length - 1) pos = '[Front]';
      else if (i === 0) pos = '[Back]';
      return `P${String(kN - i).padStart(2, '0')}${pos}:${name}`;
    }).join(', ');

    const kokuin = window.KOLMIO_KOKUIN_STATE;
    const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
    const thickKey = kThick ? 'thick' : 'standard';
    const variantId = KOLMIO_VARIANT_MAP[kN]?.[thickKey]?.[kokuinEnabled ? 'eng' : 'noeng'];
    if (!variantId) throw new Error('該当するバリエーションが見つかりません');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${KOLMIO_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display = 'none';

    [['id', variantId], ['quantity', '1']].forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
    });
    const props = {
      'Order ID': kLastUploadedImage.orderId,
      'Parts': `${kN}pcs`,
      'Length': `${970 + (kN - KOLMIO_STANDARD_COUNT) * 70}mm`,
      'Spec': kThick ? 'Thick leather (guitar)' : 'Standard',
      'Colors': colorDataEN,
      'Image URL': kLastUploadedImage.imageUrl,
    };
    if (kokuinEnabled) {
      props['刻印文字'] = kokuin.text;
      props['刻印フォント'] = kokuin.fontLabel;
    }
    Object.entries(props).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = `properties[${k}]`; i.value = v; form.appendChild(i);
    });

    document.body.appendChild(form);
    hideKolmioLoading();
    showKolmioToast('カートに追加します...');
    setTimeout(() => form.submit(), 500);
  } catch (error) {
    console.error(error);
    hideKolmioLoading();
    showKolmioToast('カート追加に失敗しました: ' + error.message);
  }
}

// Auto-generated from kolmio_color_order.svg
const KOLMIO_SVG_INNER = `<path id="_x32_2-rear" class="st1" d="M45.25,87.84L33.19,6.38l-.35-2.31c-.06-.62-.09-1.25-.11-1.88V.5S13.26.5,13.26.5v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,87.84l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM23,13.28c2.54,0,4.6,2.06,4.6,4.6s-2.05,4.59-4.58,4.6c0,0-.01,0-.02,0-2.54,0-4.6-2.06-4.6-4.6s2.06-4.6,4.6-4.6ZM23.62,26.71c0,.33-.26.6-.59.6s-.6-.27-.6-.6.27-.6.6-.6.59.27.59.6ZM12.42,78.67l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x32_1" class="st1" d="M45.25,165.88l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,165.88l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,156.72l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x32_0" class="st1" d="M45.25,243.93l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,243.93l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,234.76l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_9" class="st1" d="M45.25,321.97l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,321.97l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,312.81l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_8" class="st1" d="M45.25,400.02l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,400.02l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,390.85l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_7" class="st1" d="M45.25,478.06l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,478.06l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,468.9l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_6" class="st1" d="M45.25,556.11l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,556.11l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,546.94l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_5" class="st1" d="M45.25,634.15l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,634.15l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,624.99l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_4" class="st1" d="M45.25,712.2l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,712.2l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,703.03l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_3" class="st1" d="M45.25,790.25l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,790.25l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,781.08l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_2" class="st1" d="M45.25,868.29l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,868.29l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,859.12l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_1" class="st1" d="M45.25,946.34l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32L.76,946.34l-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,937.17l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_0" class="st1" d="M45.25,1024.38l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1015.22l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x39_" class="st1" d="M45.25,1102.43l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1093.26l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x38_" class="st1" d="M45.25,1180.47l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1171.31l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x37_" class="st1" d="M45.25,1258.52l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1249.35l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x36_" class="st1" d="M45.25,1336.56l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1327.4l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x35_" class="st1" d="M45.25,1414.61l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1405.44l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x34_" class="st1" d="M45.25,1492.66l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1483.49l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x33_" class="st1" d="M45.25,1570.7l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1561.53l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x32_" class="st1" d="M45.25,1648.75l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM12.42,1639.58l5.94-40.14.05-.31c.47-2.58,2.35-4.5,4.6-4.5s4.12,1.92,4.59,4.49l.05.36,5.94,40.11H12.42Z"/> <path id="_x31_-front" class="st1" d="M45.25,1726.79l-12.05-81.45-.35-2.31c-.06-.62-.09-1.25-.11-1.88v-1.69s-19.48,0-19.48,0v.91s0,.78,0,.78c-.02.64-.05,1.26-.11,1.88l-.34,2.32-12.05,81.45-.26,1.72c.03,1.37.59,2.51,1.37,2.99h42.26c.78-.47,1.34-1.62,1.37-2.99l-.26-1.72ZM22.98,1704.03c.33,0,.6.27.6.6s-.27.6-.6.6-.59-.27-.59-.6.26-.6.59-.6ZM23,1718.06c-2.54,0-4.6-2.06-4.6-4.6s2.05-4.59,4.58-4.6c0,0,.01,0,.02,0,2.54,0,4.6,2.06,4.6,4.6s-2.06,4.6-4.6,4.6Z"/> <path id="logo" class="st0" d="M27.17,1681.87c1.46-1.49,3.93-3.98,7.41-7.49-.15-.03-.3-.06-.44-.12-.02,0-.04-.01-.06-.02-.09-.04-.17-.08-.24-.12-.05-.03-.09-.06-.13-.09-.03-.02-.06-.04-.08-.06-.05-.04-.11-.09-.16-.13-.01-.01-.03-.02-.04-.03-.05-.05-.1-.1-.15-.15-.27-.31-.46-.68-.53-1.08-.63.7-1.5,1.65-2.63,2.87-.6.64-.96,1.04-1.1,1.18l.13.11c.85-.89,1.37-1.42,1.56-1.58.2-.16.35-.19.46-.1l.93.78-2.52,2.34c-1.24,1.15-2.37,2.21-3.41,3.18,0,0,0,0,0,0-1.63-.69-3.19-.85-4.67-.47-1.48.38-2.47,1.15-2.97,2.33-.49,1.16-.36,2.54.39,4.15-2.5.14-4.14.31-4.9.5-.98.24-1.77.58-2.37,1.02-.6.44-1.02.94-1.26,1.5-.36.84-.27,1.8.28,2.88.54,1.07,1.63,1.95,3.26,2.64,1.99.84,3.91,1.03,5.74.55,1.84-.47,3.03-1.37,3.59-2.69.58-1.36.23-3.23-1.03-5.59,2.01.01,3.65-.24,4.95-.77.98-.4,1.62-.96,1.93-1.68.31-.72.19-1.5-.34-2.35-.37-.59-.91-1.1-1.6-1.52h0ZM20.64,1686.33c.17-.41.44-.79.82-1.16.37-.37.7-.59.99-.67.17-.04.33-.06.47-.04-.94.9-1.74,1.68-2.4,2.33,0-.14.05-.29.12-.46h0ZM25.89,1682.37c-.81.8-1.55,1.54-2.23,2.21-.08-.04-.16-.08-.24-.12.68-.67,1.44-1.42,2.27-2.22.07.04.14.09.2.13h0ZM20.67,1687.3s-.01-.03-.02-.04c.7-.73,1.59-1.63,2.66-2.68.08.04.15.1.21.16-1.09,1.08-1.99,1.99-2.7,2.73-.05-.05-.1-.1-.15-.16ZM20.95,1687.83s-.03,0-.04,0c0,0,0-.02-.01-.03.02,0,.04.01.06.02h0ZM22.71,1687.04c-.4.35-.76.56-1.09.61-.02,0-.04,0-.06,0,.6-.63,1.31-1.38,2.14-2.24-.02.13-.05.27-.11.41-.19.45-.48.85-.88,1.21h0ZM21.29,1687.66c-.09-.01-.18-.03-.27-.07,0,0,0,0,0,0,.7-.73,1.57-1.63,2.62-2.69,0,.02.02.03.03.05.03.07.05.15.05.23-.96.97-1.77,1.8-2.43,2.49ZM23.83,1684.69c.66-.67,1.4-1.41,2.2-2.22.07.05.13.1.2.16-.79.8-1.52,1.54-2.18,2.21-.06-.05-.13-.1-.21-.15h0ZM30.19,1678.64c-1.13,1.14-2.18,2.19-3.14,3.15-.07-.04-.15-.08-.22-.12,1.19-1.19,3.07-3.05,5.63-5.58l.14.13-2.41,2.42h0ZM32.31,1675.97l.04.04-2.44,2.4c-1.17,1.15-2.25,2.21-3.23,3.18-.07-.03-.14-.07-.21-.1,1.22-1.17,3.17-3.01,5.84-5.52h0ZM20.24,1683.32c.34-.8.99-1.34,1.95-1.61.95-.27,1.94-.18,2.95.25.09.04.18.08.27.13-.86.82-1.65,1.56-2.36,2.24-.27-.07-.56-.1-.87-.08-.44.03-.9.19-1.37.5-.3.2-.54.43-.73.68-.15-.82-.09-1.53.16-2.12h0ZM21.19,1693.89c-.2.63-.61,1.19-1.25,1.67-.63.49-1.36.79-2.19.9-.83.11-1.62.05-2.39-.2-1.06-.33-1.86-.9-2.39-1.7-.54-.8-.67-1.62-.41-2.45.28-.87.89-1.62,1.84-2.23.91-.59,2.46-1.12,4.66-1.6-.84.87-1.57,1.68-2.18,2.42-.35.41-.62.77-.82,1.09-.2.31-.27.49-.22.53.06.05.24-.07.54-.35.3-.28.94-.98,1.92-2.1.46-.53.88-.99,1.25-1.41.04.07.08.13.12.2-.84.88-1.59,1.69-2.24,2.42-.36.4-.65.75-.87,1.04-.22.29-.32.45-.29.48.03.03.19-.1.49-.39.29-.29.94-.98,1.93-2.08.41-.45.78-.86,1.12-1.23.04.07.08.14.12.21-.79.84-1.49,1.61-2.11,2.3-.36.4-.65.75-.87,1.04-.23.29-.33.45-.3.47.03.02.18-.11.47-.4.29-.29.93-.99,1.93-2.09.36-.4.7-.77,1-1.1.59,1.05.96,1.89,1.12,2.5.21.81.22,1.5.04,2.08h0ZM27.14,1685.53c-.23.54-.76,1-1.58,1.38-.46.21-1.14.4-2.04.56.43-.28.73-.64.92-1.07.18-.43.17-.81-.03-1.14-.07-.11-.15-.21-.25-.3.66-.68,1.38-1.42,2.17-2.23.26.24.48.52.65.83.38.69.43,1.35.16,1.98h0Z"/>`;
