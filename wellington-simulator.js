// ============================================================================
// 設定（Kolmio(kolmio-simulator.js)を土台に、Wellington用に移植。
// Wellingtonは「ギター用」「ウクレレ用」で物理サイズが異なる2種のSVGパーツ
// （wellington-guitar / wellington-ukulele グループ）を持つため、ブランチ切り替え
// の概念が新たに必要。詳細はメモリ project_kolmio_color_simulator.md 参照。）
// ============================================================================

const WL_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const WL_SHOPIFY_DOMAIN = '708works.jp';

// ウロコの実物パーツはギター/ウクレレとも18枚（front=1〜rear=18、間にfixedのlogoパーツ）
// しかSVG内に存在しない。レンジがそれを超える分（ギター最大22・ウクレレ最大24）は
// クローン合成（Folkloreのsimulator.jsのextraピース挿入と同じ考え方）で補う。
const WL_BRANCHES = {
  guitar: {
    label: 'ギターストラップ',
    shortLabel: 'ギター用',
    groupId: 'wellington-guitar',
    frontDomId: 'front',
    rearDomId: 'rear',
    logoDomId: 'logo',
    // 物理パーツ（2〜17番）のSVG内ID。1番=front, 18番=rearは上記で別管理
    middleDomIds: {
      2:'_x32_', 3:'_x33_', 4:'_x34_', 5:'_x35_', 6:'_x36_', 7:'_x37_', 8:'_x38_', 9:'_x39_',
      10:'_x31_0', 11:'_x31_1', 12:'_x31_2', 13:'_x31_3', 14:'_x31_4', 15:'_x31_5', 16:'_x31_6', 17:'_x31_7'
    },
    frontY: 1194.81,     // front(1番)の実測Y（常に固定・不動）
    nativeRearY: 68.53,  // rear(18番)の実測Y（N=18のときの本来位置。translateの基準点）
    pitch: 66.5,         // 隣接パーツ間の実測ピッチ（2〜17番で一貫）
    min: 14, max: 22, standard: 18,
    // ギター用は未商品化のため価格・全長情報はすべてTBD（ユーザーから提供され次第埋める）
    purchasable: false,
    basePrice: null, perPiecePrice: null, perPieceCm: null, baseLengthCm: null,
  },
  ukulele: {
    label: 'ウクレレストラップ',
    shortLabel: 'ウクレレ用',
    groupId: 'wellington-ukulele',
    frontDomId: 'front1',
    rearDomId: 'rear1',
    logoDomId: 'logo1',
    middleDomIds: {
      2:'_x32_1', 3:'_x33_1', 4:'_x34_1', 5:'_x35_1', 6:'_x36_1', 7:'_x37_1', 8:'_x38_1', 9:'_x39_1',
      10:'_x31_01', 11:'_x31_11', 12:'_x31_21', 13:'_x31_31', 14:'_x31_41', 15:'_x31_51', 16:'_x31_61', 17:'_x31_71'
    },
    frontY: 1063.52,
    nativeRearY: 189.68,
    pitch: 51.6,
    min: 16, max: 24, standard: 20,
    // 確定値：現行Wellington for ukulele商品ページ（¥21,560・標準20枚）と
    // 既存の長さ調整オプション（ウロコ1つ追加=+約4cm/+¥1,078）の実績値をそのまま採用
    purchasable: true,
    basePrice: 21560, perPiecePrice: 1078, perPieceCm: 4, baseLengthCm: 97,
  },
};

function wlPriceForCount(branchKey, n) {
  const b = WL_BRANCHES[branchKey];
  if (!b.purchasable || b.basePrice == null) return null;
  return b.basePrice + (n - b.standard) * b.perPiecePrice;
}

function wlLengthCmForCount(branchKey, n) {
  const b = WL_BRANCHES[branchKey];
  if (b.baseLengthCm == null) return null;
  return b.baseLengthCm + (n - b.standard) * b.perPieceCm;
}

// Shopify商品「wellington-color-order」の実バリエーションID（ウロコの数 × 名入れ刻印）。
// ウクレレ用のみ購入可能。ギター用は価格未定のため現時点でバリエーションを持たない。
// create-wellington-color-order-template.mjs 実行後、実際のIDに置き換えること（現在は仮のnull）。
const WL_VARIANT_MAP = {
  16: { noeng: 50199763583226, eng: 50199763615994 },
  17: { noeng: 50199763648762, eng: 50199763681530 },
  18: { noeng: 50199763714298, eng: 50199763747066 },
  19: { noeng: 50199763779834, eng: 50199763812602 },
  20: { noeng: 50199763845370, eng: 50199763878138 },
  21: { noeng: 50199763910906, eng: 50199763943674 },
  22: { noeng: 50199763976442, eng: 50199764009210 },
  23: { noeng: 50199764041978, eng: 50199764074746 },
  24: { noeng: 50199764107514, eng: 50199764140282 },
};

const WL_KOKUIN_PRICE_ADD = 1100; // 他ライン（Folklore/Kolmio/Triad/Duet/Courier）と同額を仮採用（要確認）

// カラー定義（Folklore/Kolmio(ukulele)と共通の20色パレット）
const WL_COLORS = [
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

const WL_GRADS = [
  {name:'オーシャン', fn:i=>['#1e2540','#2a5060','#7baed0','#3a5030','#2a5060','#1e2540'][i%6]},
  {name:'サンセット', fn:i=>['#1a1a1a','#7a2035','#b82828','#d4742a','#e8c84a','#d4742a'][i%6]},
  {name:'フォレスト', fn:i=>['#1a1a1a','#3a5030','#7a7848','#a8c43a','#3a5030','#1a1a1a'][i%6]},
  {name:'ヴィンテージ',fn:i=>['#4a2018','#9e3820','#c46030','#d4742a','#e8c4a0','#c46030'][i%6]},
  {name:'キャンディ', fn:i=>['#d96090','#f0a0a8','#e8c84a','#7baed0','#a8c43a','#d96090'][i%6]},
];

// 論理ピース番号：0=rear(末端・可変位置), 1=front(先端・常に固定), 2〜17=物理パーツ,
// 18以降=クローン合成パーツ（物理17番より後ろ側に必要な分だけ挿入）
function wlDisplayOrder(branchKey, n) {
  const middlesNeeded = n - 2; // front/rearを除いた中間パーツの必要数
  const order = [0];
  for (let id = middlesNeeded + 1; id >= 2; id--) order.push(id);
  order.push(1);
  return order;
}

function wlPieceY(branch, logicalId, n) {
  if (logicalId === 1) return branch.frontY;
  if (logicalId === 0) return branch.frontY - (n - 1) * branch.pitch;
  return branch.frontY - (logicalId - 1) * branch.pitch;
}

// ============================================================================
// グローバル状態（ブランチごとに独立して保持。切り替えても編集内容は消えない）
// ============================================================================

let wlActiveBranch = 'ukulele'; // デフォルトは販売可能なウクレレ用

function wlMakeDefaultState(branchKey) {
  const b = WL_BRANCHES[branchKey];
  const colors = {};
  // 0=rear,1=front,2..maxクローンまでを常時保持（Kolmio同様、鱗数を変えても色データの移動が不要）
  for (let p = 0; p <= b.max; p++) colors[p] = '#c46030';
  return { n: b.standard, colors, selected: new Set(), mode: 'single', rangeStartIdx: null, history: [] };
}

let wlState = {
  guitar: wlMakeDefaultState('guitar'),
  ukulele: wlMakeDefaultState('ukulele'),
};

let wlActiveColor = WL_COLORS[12]; // Camel
let wlKokuinEnabled = false; // 名入れ刻印トグル状態（ブランチ共通）
let wlLastUploadedImage = null;
let wlHasDownloadedImage = false;

function wlBranch() { return WL_BRANCHES[wlActiveBranch]; }
function wlCurState() { return wlState[wlActiveBranch]; }

// ============================================================================
// 初期化
// ============================================================================

function initWellingtonSimulator() {
  if (window.wellingtonSimulatorInitialized) return;
  const paletteEl = document.getElementById('wl-palette');
  const gradRowEl = document.getElementById('wl-grad-row');
  const strapScrollEl = document.getElementById('wl-strap-scroll');
  if (!paletteEl || !gradRowEl || !strapScrollEl) { setTimeout(initWellingtonSimulator, 100); return; }
  window.wellingtonSimulatorInitialized = true;

  buildWlPalette();
  buildWlGrads();
  updateWlBranchUI();
  updateWlSummary();
  buildWlStrapSVG();
  updateWlPriceDisplay();
  updateWlCountDisplay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWellingtonSimulator);
} else {
  initWellingtonSimulator();
}

window.addEventListener('resize', () => {
  if (window.wellingtonSimulatorInitialized) buildWlStrapSVG();
});

// ============================================================================
// ブランチ切り替え（ギター/ウクレレ）
// ============================================================================

function setWlBranch(branchKey) {
  if (branchKey === wlActiveBranch) return;
  wlActiveBranch = branchKey;
  const st = wlCurState();
  st.selected.clear();
  const selInfo = document.getElementById('wl-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  updateWlBranchUI();
  updateWlCountDisplay();
  updateWlPriceDisplay();
  buildWlStrapSVG();
  updateWlSummary();
}

function updateWlBranchUI() {
  const branch = wlBranch();
  document.querySelectorAll('.wellington-simulator .branch-bt').forEach(b => {
    b.classList.toggle('on', b.dataset.branch === wlActiveBranch);
  });

  const orderArea = document.getElementById('wl-order-area');
  const comingSoon = document.getElementById('wl-coming-soon');
  const priceBar = document.getElementById('wl-price-bar');
  if (orderArea) orderArea.hidden = !branch.purchasable;
  if (comingSoon) comingSoon.hidden = branch.purchasable;
  if (priceBar) priceBar.hidden = !branch.purchasable;
}

// ============================================================================
// 価格表示
// ============================================================================

function updateWlPriceDisplay() {
  const el = document.getElementById('wl-price-display');
  const branch = wlBranch();
  if (!el || !branch.purchasable) return;
  const n = wlCurState().n;
  const kokuinAdd = wlKokuinEnabled ? WL_KOKUIN_PRICE_ADD : 0;
  const price = wlPriceForCount(wlActiveBranch, n);
  el.textContent = `¥${(price + kokuinAdd).toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理（ブランチ内のみ。ブランチ切り替えは履歴に積まない）
// ============================================================================

function wlSaveHistory() {
  const st = wlCurState();
  st.history.push({ colors: { ...st.colors }, n: st.n });
  if (st.history.length > 30) st.history.shift();
  const btn = document.getElementById('wl-btn-undo');
  if (btn) btn.disabled = false;
}

function wlUndo() {
  const st = wlCurState();
  if (!st.history.length) return;
  const prev = st.history.pop();
  st.n = prev.n; st.colors = prev.colors;
  st.selected.clear();
  updateWlCountDisplay();
  updateWlPriceDisplay();
  const selInfo = document.getElementById('wl-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  buildWlStrapSVG();
  updateWlSummary();
  const btn = document.getElementById('wl-btn-undo');
  if (!st.history.length && btn) btn.disabled = true;
}

// ============================================================================
// ウロコの数（±ステッパー）
// ============================================================================

function updateWlCountDisplay() {
  const branch = wlBranch();
  const st = wlCurState();
  const cntDisp = document.getElementById('wl-cnt-disp');
  const cntSub  = document.getElementById('wl-cnt-sub');
  if (!cntDisp || !cntSub) return;
  cntDisp.textContent = st.n + '個';
  const diff = st.n - branch.standard;
  const lenCm = wlLengthCmForCount(wlActiveBranch, st.n);
  const diffTxt = diff === 0 ? '標準' : diff > 0 ? `標準より${diff}個多い` : `標準より${Math.abs(diff)}個少ない`;
  const lenTxt = lenCm != null ? `（全長 約${lenCm}cm）` : '（全長は近日公開）';
  cntSub.textContent = `${diffTxt}${lenTxt}`;
}

function wlChangeCount(d) {
  const branch = wlBranch();
  const st = wlCurState();
  const nx = st.n + d;
  if (nx < branch.min || nx > branch.max) return;
  wlSaveHistory();
  st.n = nx;
  st.selected.clear();
  const selInfo = document.getElementById('wl-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  updateWlCountDisplay();
  updateWlPriceDisplay();
  buildWlStrapSVG();
  updateWlSummary();
}

// ============================================================================
// ストラップ描画
// ============================================================================

function buildWlStrapSVG() {
  const scroll = document.getElementById('wl-strap-scroll');
  const col = document.getElementById('wl-strap-col');
  if (!scroll || !col) return;

  const branch = wlBranch();
  const st = wlCurState();
  const n = st.n;
  const order = wlDisplayOrder(wlActiveBranch, n);

  const dispW = 30;
  col.style.width = (dispW + 30) + 'px';

  // 暫定viewBox（getBBoxの実測値で後から置き換える）
  scroll.innerHTML = `<svg id="wl-strap-svg"
    viewBox="0 0 158.42 1218.16"
    style="display:block;margin:0 auto;cursor:pointer;touch-action:none;flex-shrink:0;"
    xmlns="http://www.w3.org/2000/svg">${WL_SVG_INNER}</svg>`;

  const svg = document.getElementById('wl-strap-svg');

  // アクティブでないブランチのグループごと非表示にする（getBBoxからも除外される）
  Object.entries(WL_BRANCHES).forEach(([key, b]) => {
    const g = svg.querySelector('#' + CSS.escape(b.groupId));
    if (g) g.style.display = (key === wlActiveBranch) ? '' : 'none';
  });

  const activeGroup = svg.querySelector('#' + CSS.escape(branch.groupId));
  const middlesNeeded = n - 2;

  // 物理パーツ(2〜17番)の表示/非表示。表示するものは元位置のまま（transformなし）
  for (let id = 2; id <= 17; id++) {
    const domId = branch.middleDomIds[id];
    const el = svg.querySelector('#' + CSS.escape(domId));
    if (!el) continue;
    if (id <= middlesNeeded + 1) { el.style.display = ''; el.removeAttribute('transform'); }
    else { el.style.display = 'none'; }
  }

  // 物理17番を超える分はクローン合成（2番パーツの形状を複製してtranslateで配置）
  const cloneSource = svg.querySelector('#' + CSS.escape(branch.middleDomIds[2]));
  const rearEl = svg.querySelector('#' + CSS.escape(branch.rearDomId));
  if (cloneSource && activeGroup) {
    for (let id = 18; id <= middlesNeeded + 1; id++) {
      const targetY = wlPieceY(branch, id, n);
      const nativeY2 = wlPieceY(branch, 2, n); // = branch.frontY - branch.pitch（native位置と一致）
      const ty = targetY - nativeY2;
      const clone = cloneSource.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('data-wl-clone', id);
      clone.setAttribute('transform', `translate(0, ${ty.toFixed(3)})`);
      if (rearEl && rearEl.parentNode === activeGroup) activeGroup.insertBefore(clone, rearEl);
      else activeGroup.appendChild(clone);
    }
  }

  // rear(末端)は常にtranslateで現在のNに応じたスロット位置まで移動
  if (rearEl) {
    const targetY = wlPieceY(branch, 0, n);
    const ty = targetY - branch.nativeRearY;
    rearEl.setAttribute('transform', `translate(0, ${ty.toFixed(3)})`);
    rearEl.style.display = '';
  }

  // 表示/非表示・translate確定後、getBBoxの実測値でviewBoxをタイトに合わせる
  // （手計算の余白だと末端パーツの実形状を見誤って見切れることがあるため必ず実測する）
  const pad = 4;
  const bbox = svg.getBBox();
  const vbX = bbox.x - pad, vbY = bbox.y - pad, vbW = bbox.width + pad * 2, vbH = bbox.height + pad * 2;
  const scale = dispW / vbW;
  const dispH = Math.round(vbH * scale);
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  svg.setAttribute('width', dispW);
  svg.setAttribute('height', dispH);

  // タップ/クリックイベント（表示順インデックスで扱う）
  order.forEach((logicalId, idx) => {
    const g = wlFindPieceEl(svg, branch, logicalId);
    if (!g) return;
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => wlHandleTap(idx));
    g.addEventListener('touchend', e => { e.preventDefault(); wlHandleTap(idx); }, { passive: false });
  });

  wlRedrawSVG();
}

function wlFindPieceEl(svg, branch, logicalId) {
  if (logicalId === 0) return svg.querySelector('#' + CSS.escape(branch.rearDomId));
  if (logicalId === 1) return svg.querySelector('#' + CSS.escape(branch.frontDomId));
  if (logicalId <= 17) return svg.querySelector('#' + CSS.escape(branch.middleDomIds[logicalId]));
  return svg.querySelector(`[data-wl-clone="${logicalId}"]`);
}

function wlRedrawSVG() {
  const svg = document.getElementById('wl-strap-svg');
  if (!svg) return;
  const branch = wlBranch();
  const st = wlCurState();
  const order = wlDisplayOrder(wlActiveBranch, st.n);
  order.forEach((logicalId, idx) => {
    const g = wlFindPieceEl(svg, branch, logicalId);
    if (!g) return;
    const hex = st.colors[logicalId];
    const isSel = st.selected.has(logicalId);
    g.style.fill = hex;
    g.style.stroke = isSel ? '#ffd700' : '#000';
    g.style.strokeWidth = isSel ? '3.5' : '0.5';
  });
  // ロゴ刻印は先端(1番=front)パーツに乗るため、frontの色のコントラストで自動計算
  const logo = svg.querySelector('#' + CSS.escape(branch.logoDomId));
  if (logo) logo.style.fill = wlEngravingColor(st.colors[1]);

  if (typeof applyWlKokuinColors === 'function') applyWlKokuinColors();
}

function wlEngravingColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum > 0.45) return `rgb(${Math.floor(r * .5)},${Math.floor(g * .5)},${Math.floor(b * .5)})`;
  return `rgb(${Math.min(255, r + Math.floor((255 - r) * .45))},${Math.min(255, g + Math.floor((255 - g) * .45))},${Math.min(255, b + Math.floor((255 - b) * .45))})`;
}

// ============================================================================
// タップ処理（1枚ずつ／範囲／一括）
// ============================================================================

function wlHandleTap(displayIdx) {
  const st = wlCurState();
  const order = wlDisplayOrder(wlActiveBranch, st.n);
  const logicalId = order[displayIdx];
  if (st.mode === 'single') {
    wlSaveHistory();
    st.selected.clear(); st.selected.add(logicalId);
    st.colors[logicalId] = wlActiveColor.hex;
    updateWlSummary();
    wlHasDownloadedImage = false;
  } else if (st.mode === 'range') {
    if (st.rangeStartIdx === null) {
      st.rangeStartIdx = displayIdx;
      st.selected.clear(); st.selected.add(logicalId);
    } else {
      wlSaveHistory();
      const a = Math.min(st.rangeStartIdx, displayIdx), b = Math.max(st.rangeStartIdx, displayIdx);
      st.selected.clear();
      for (let j = a; j <= b; j++) st.selected.add(order[j]);
      st.rangeStartIdx = null;
    }
  }
  wlUpdateSelInfo();
  wlRedrawSVG();
}

function wlUpdateSelInfo() {
  const el = document.getElementById('wl-sel-info');
  if (!el) return;
  const st = wlCurState();
  if (!st.selected.size) { el.textContent = 'パーツをタップ'; return; }
  const order = wlDisplayOrder(wlActiveBranch, st.n);
  const idxs = [...st.selected].map(p => order.indexOf(p)).sort((a, b) => a - b);
  const frontNumOf = idx => st.n - idx; // idx=0(rear)→N, idx=N-1(front)→1
  if (idxs.length === 1) {
    el.innerHTML = `前から <b>#${frontNumOf(idxs[0])}</b>`;
  } else {
    el.innerHTML = `前から <b>#${frontNumOf(idxs[idxs.length - 1])}〜#${frontNumOf(idxs[0])}</b>（<b>${idxs.length}枚</b>）`;
  }
}

// ============================================================================
// モード切替
// ============================================================================

function setWlMode(m) {
  const st = wlCurState();
  st.mode = m; st.rangeStartIdx = null;
  document.querySelectorAll('.wellington-simulator .mbt').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById('wl-m-' + m);
  if (btn) btn.classList.add('on');
  if (m === 'all') {
    st.selected.clear();
    wlDisplayOrder(wlActiveBranch, st.n).forEach(p => st.selected.add(p));
    const el = document.getElementById('wl-sel-info');
    if (el) el.innerHTML = `全 <b>${st.n}枚</b>`;
  } else {
    st.selected.clear();
    const el = document.getElementById('wl-sel-info');
    if (el) el.textContent = 'パーツをタップ';
  }
  wlRedrawSVG();
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildWlPalette() {
  const p = document.getElementById('wl-palette');
  if (!p) return;
  p.innerHTML = '';
  WL_COLORS.forEach(c => {
    const wrap = document.createElement('div');
    wrap.className = 'cb-wrap';
    wrap.dataset.id = c.id;

    const dot = document.createElement('div');
    dot.className = 'cb' + (c.id === wlActiveColor.id ? ' on' : '');
    dot.style.cssText = `background:${c.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${c.id === wlActiveColor.id ? '#111' : 'transparent'};`;

    const nm = document.createElement('div');
    nm.className = 'color-name' + (c.id === wlActiveColor.id ? ' on' : '');
    nm.textContent = c.name;

    wrap.appendChild(dot); wrap.appendChild(nm);
    wrap.onclick = () => {
      wlActiveColor = c;
      document.querySelectorAll('.wellington-simulator .cb').forEach(b => {
        const isActive = b.parentElement.dataset.id === c.id;
        b.style.cssText = `background:${WL_COLORS.find(col => col.id === b.parentElement.dataset.id)?.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${isActive ? '#111' : 'transparent'};`;
      });
      document.querySelectorAll('.wellington-simulator .color-name').forEach(b => b.classList.toggle('on', b.closest('.cb-wrap')?.dataset.id === c.id));
      const st = wlCurState();
      if (!st.selected.size) return;
      wlSaveHistory();
      [...st.selected].forEach(logicalId => { st.colors[logicalId] = c.hex; });
      wlRedrawSVG();
      updateWlSummary();
    };
    p.appendChild(wrap);
  });
}

// ============================================================================
// おすすめ配色プリセット
// ============================================================================

function buildWlGrads() {
  const row = document.getElementById('wl-grad-row');
  if (!row) return;
  row.innerHTML = '';
  WL_GRADS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'gb';
    btn.textContent = g.name;
    btn.onclick = () => {
      wlSaveHistory();
      const st = wlCurState();
      wlDisplayOrder(wlActiveBranch, st.n).forEach((logicalId, i) => { st.colors[logicalId] = g.fn(i); });
      wlRedrawSVG();
      updateWlSummary();
    };
    row.appendChild(btn);
  });
}

// ============================================================================
// サマリー・リセット
// ============================================================================

function updateWlSummary() {
  const el = document.getElementById('wl-summary');
  if (!el) return;
  const st = wlCurState();
  const counts = {};
  wlDisplayOrder(wlActiveBranch, st.n).forEach(p => { const h = st.colors[p]; counts[h] = (counts[h] || 0) + 1; });
  const nameOf = h => WL_COLORS.find(c => c.hex === h)?.name || h;
  el.innerHTML = Object.entries(counts).map(([h, n]) =>
    `<span class="si"><span class="sw" style="background:${h}"></span>${nameOf(h)} ×${n}</span>`
  ).join('');
}

function wlResetAll() {
  wlSaveHistory();
  const branch = wlBranch();
  const st = wlCurState();
  for (let p = 0; p <= branch.max; p++) st.colors[p] = '#c46030';
  st.selected.clear();
  const selInfo = document.getElementById('wl-sel-info');
  if (selInfo) selInfo.textContent = 'パーツをタップ';
  wlRedrawSVG();
  updateWlSummary();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showWlToast(msg) {
  const t = document.getElementById('wl-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function showWlLoading(text = '処理中...') {
  const loadingText = document.getElementById('wl-loading-text');
  const loadingOverlay = document.getElementById('wl-loading-overlay');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}
function hideWlLoading() {
  const el = document.getElementById('wl-loading-overlay');
  if (el) el.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

async function wlSaveImage() {
  showWlLoading('画像を生成中...');
  try {
    const canvas = await buildWlSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const st = wlCurState();
    a.href = url; a.download = `wellington-${wlActiveBranch}-${st.n}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideWlLoading();
    wlHasDownloadedImage = true;
    showWlToast('画像を保存しました');
  } catch (e) {
    console.error(e);
    hideWlLoading();
    showWlToast('保存に失敗しました');
  }
}

async function buildWlSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;
  const svgSaveW = 56;
  const liveSvg = document.getElementById('wl-strap-svg');
  const liveVb = liveSvg?.getAttribute('viewBox')?.split(' ').map(Number);
  const vbW = liveVb ? liveVb[2] : 46;
  const vbH = liveVb ? liveVb[3] : 1700;
  const scale = svgSaveW / vbW;
  const svgSaveH = Math.round(vbH * scale);

  const branch = wlBranch();
  const st = wlCurState();
  const kokuin = window.WL_KOKUIN_STATE;
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
  ctx.fillText('WELLINGTON', cw / 2, 28);
  ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
  ctx.fillText(`COLOR SIMULATOR (${branch.shortLabel})  |  708works`, cw / 2, 42);

  ctx.fillStyle = '#444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▲ 後ろ', cw / 2, svgY0 - 6);

  const svgEl = document.getElementById('wl-strap-svg');
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
  const order = wlDisplayOrder(wlActiveBranch, st.n);
  order.forEach((logicalId, i) => {
    const pieceY = svgY0 + (5 + (i + 0.5) * ((svgSaveH) / order.length));
    const color = st.colors[logicalId];
    const cname = WL_COLORS.find(c => c.hex === color)?.name || '';
    ctx.beginPath(); ctx.arc(labelX + 6, pieceY, 5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`P${String(st.n - i).padStart(2, '0')}`, labelX + 16, pieceY - 2);
    ctx.fillStyle = '#333'; ctx.font = '10px sans-serif';
    ctx.fillText(cname, labelX + 16, pieceY + 10);
  });

  const specY = svgY0 + svgSaveH + bottomLabelH + 6;
  ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
  const lenCm = wlLengthCmForCount(wlActiveBranch, st.n);
  ctx.fillText(`仕様：${branch.shortLabel}${lenCm != null ? '・全長約' + lenCm + 'cm' : ''}`, 24, specY + 14);

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
// オーダー処理（購入可能なブランチのみ）
// ============================================================================

async function wlGoOrder() {
  const branch = wlBranch();
  if (!branch.purchasable) {
    showWlToast('ギター用は近日公開予定です。現在ご注文いただけません。');
    return;
  }
  if (window.WL_KOKUIN_STATE?.enabled && !window.WL_KOKUIN_STATE.valid) {
    showWlToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!wlHasDownloadedImage) await wlSaveImage();
  showWlLoading('画像をアップロード中...');
  try {
    const canvas = await buildWlSaveCanvas();
    const uploadResult = await wlUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    wlLastUploadedImage = uploadResult;
    hideWlLoading();
    showWlConfirmModal(uploadResult);
  } catch (error) {
    console.error(error);
    hideWlLoading();
    showWlToast('エラーが発生しました: ' + error.message);
  }
}

async function wlUploadOrderImage(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = `wellington-${Date.now()}`;
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  try {
    const res = await fetch(WL_WORKER_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    if (!data.success && !data.url && !data.imageUrl) throw new Error(data.error || 'Upload failed');
    return { imageUrl: data.imageUrl || data.url, orderId };
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

function wlColorSummaryLines() {
  const st = wlCurState();
  const order = wlDisplayOrder(wlActiveBranch, st.n);
  return order.map((logicalId, i) => {
    const name = WL_COLORS.find(c => c.hex === st.colors[logicalId])?.name || st.colors[logicalId];
    const pos = i === order.length - 1 ? ' [前]' : i === 0 ? ' [後ろ]' : '';
    return `P${String(st.n - i).padStart(2, '0')}${pos}: ${name}`;
  });
}

function showWlConfirmModal(uploadResult) {
  const modal = document.getElementById('wl-confirm-modal');
  const modalImage = document.getElementById('wl-modal-image');
  const modalInfo = document.getElementById('wl-modal-info');
  if (!modal || !modalImage || !modalInfo) return;
  modalImage.src = uploadResult.imageUrl;

  const branch = wlBranch();
  const st = wlCurState();
  const kokuinEnabled = !!(window.WL_KOKUIN_STATE?.enabled && window.WL_KOKUIN_STATE.valid && window.WL_KOKUIN_STATE.text);
  const kokuinAdd = kokuinEnabled ? WL_KOKUIN_PRICE_ADD : 0;
  const price = wlPriceForCount(wlActiveBranch, st.n) + kokuinAdd;
  const lenCm = wlLengthCmForCount(wlActiveBranch, st.n);
  const kokuin = window.WL_KOKUIN_STATE;
  const kokuinLine = kokuinEnabled ? `<p><strong>名入れ刻印:</strong> ${kokuin.text}（${kokuin.fontLabel}）</p>` : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>仕様:</strong> ${branch.label}</p>
    <p><strong>ウロコの数:</strong> ${st.n}個</p>
    <p><strong>全長:</strong> ${lenCm != null ? '約' + lenCm + 'cm' : '未定'}</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    ${kokuinLine}
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${wlColorSummaryLines().join('<br>')}</div>
  `;
  modal.classList.add('show');
}

function closeWlModal() {
  const modal = document.getElementById('wl-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function wlProceedToCart() {
  const branch = wlBranch();
  if (!branch.purchasable) { showWlToast('ギター用はまだご注文いただけません。'); return; }
  if (!wlLastUploadedImage) { showWlToast('画像情報が見つかりません'); return; }
  closeWlModal();
  showWlLoading('カートに追加中...');
  try {
    const st = wlCurState();
    const order = wlDisplayOrder(wlActiveBranch, st.n);
    const colorDataEN = order.map((logicalId, i) => {
      const name = WL_COLORS.find(c => c.hex === st.colors[logicalId])?.name || st.colors[logicalId];
      let pos = '';
      if (i === order.length - 1) pos = '[Front]';
      else if (i === 0) pos = '[Back]';
      return `P${String(st.n - i).padStart(2, '0')}${pos}:${name}`;
    }).join(', ');

    const kokuin = window.WL_KOKUIN_STATE;
    const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
    const variantId = WL_VARIANT_MAP[st.n]?.[kokuinEnabled ? 'eng' : 'noeng'];
    if (!variantId) throw new Error('該当するバリエーションが見つかりません（商品未作成の可能性があります）');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${WL_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display = 'none';

    [['id', variantId], ['quantity', '1']].forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
    });
    const lenCm = wlLengthCmForCount(wlActiveBranch, st.n);
    const props = {
      'Order ID': wlLastUploadedImage.orderId,
      'Type': branch.shortLabel,
      'Parts': `${st.n}pcs`,
      'Length': lenCm != null ? `${lenCm}cm` : 'TBD',
      'Colors': colorDataEN,
      'Image URL': wlLastUploadedImage.imageUrl,
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
    hideWlLoading();
    showWlToast('カートに追加します...');
    setTimeout(() => form.submit(), 500);
  } catch (error) {
    console.error(error);
    hideWlLoading();
    showWlToast('カート追加に失敗しました: ' + error.message);
  }
}

// Auto-generated from wellington_color_order.svg
const WL_SVG_INNER = `<defs><style>.st0 {fill: #c6a06a;}.st1 {fill: #995200;stroke: #000;stroke-miterlimit: 10;}</style></defs><g id="wellington-guitar"><path id="rear" class="st1" d="M.7,68.53h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72,0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0C6.66,20.27,3.02,39.95,1.74,48.93c-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3ZM29.5,12.6c2.49,0,4.5,2.02,4.5,4.5s-2.01,4.5-4.5,4.5-4.5-2.01-4.5-4.5,2.02-4.5,4.5-4.5ZM14.33,65.29c1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56Z"/><path id="_x31_7" class="st1" d="M58.5,130.65c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0C6.66,86.77,3.02,106.45,1.74,115.43c-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,133.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_6" class="st1" d="M58.5,197.15c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,199.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_5" class="st1" d="M58.5,263.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,266.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_4" class="st1" d="M58.5,330.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,332.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_3" class="st1" d="M58.5,396.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,399.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_2" class="st1" d="M58.5,463.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,465.94c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_1" class="st1" d="M58.5,529.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,532.44c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x31_0" class="st1" d="M58.5,596.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,598.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x39_" class="st1" d="M58.5,662.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,665.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x38_" class="st1" d="M58.5,729.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,731.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x37_" class="st1" d="M58.5,795.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,798.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x36_" class="st1" d="M58.5,862.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,864.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x35_" class="st1" d="M58.5,928.64c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,931.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x34_" class="st1" d="M58.5,995.14c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,997.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="_x33_" class="st1" d="M58.5,1061.63c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,1064.43c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="logo" class="st0" d="M34.29,1032.83c1.46-1.49,3.93-3.98,7.41-7.49-.15-.03-.3-.06-.44-.12-.02,0-.04-.01-.06-.02-.09-.04-.17-.08-.24-.12-.05-.03-.09-.06-.13-.09-.03-.02-.06-.04-.08-.06-.05-.04-.11-.09-.16-.13-.01-.01-.03-.02-.04-.03-.05-.05-.1-.1-.15-.15-.27-.31-.46-.68-.53-1.08-.63.7-1.5,1.65-2.63,2.87-.6.64-.96,1.04-1.1,1.18l.13.11c.85-.89,1.37-1.42,1.56-1.58.2-.16.35-.19.46-.1l.93.78-2.52,2.34c-1.24,1.15-2.37,2.21-3.41,3.18,0,0,0,0,0,0-1.63-.69-3.19-.85-4.67-.47-1.48.38-2.47,1.15-2.97,2.33-.49,1.16-.36,2.54.39,4.15-2.5.14-4.14.31-4.9.5-.98.24-1.77.58-2.37,1.02-.6.44-1.02.94-1.26,1.5-.36.84-.27,1.8.28,2.88.54,1.07,1.63,1.95,3.26,2.64,1.99.84,3.91,1.03,5.74.55,1.84-.47,3.03-1.37,3.59-2.69.58-1.36.23-3.23-1.03-5.59,2.01.01,3.65-.24,4.95-.77.98-.4,1.62-.96,1.93-1.68.31-.72.19-1.5-.34-2.35-.37-.59-.91-1.1-1.6-1.52h0ZM27.76,1037.28c.17-.41.44-.79.82-1.16.37-.37.7-.59.99-.67.17-.04.33-.06.47-.04-.94.9-1.74,1.68-2.4,2.33,0-.14.05-.29.12-.46h0ZM33,1033.33c-.81.8-1.55,1.54-2.23,2.21-.08-.04-.16-.08-.24-.12.68-.67,1.44-1.42,2.27-2.22.07.04.14.09.2.13h0ZM27.78,1038.26s-.01-.03-.02-.04c.7-.73,1.59-1.63,2.66-2.68.08.04.15.1.21.16-1.09,1.08-1.99,1.99-2.7,2.73-.05-.05-.1-.1-.15-.16ZM28.07,1038.79s-.03,0-.04,0c0,0,0-.02-.01-.03.02,0,.04.01.06.02h0ZM29.83,1038c-.4.35-.76.56-1.09.61-.02,0-.04,0-.06,0,.6-.63,1.31-1.38,2.14-2.24-.02.13-.05.27-.11.41-.19.45-.48.85-.88,1.21h0ZM28.4,1038.62c-.09-.01-.18-.03-.27-.07,0,0,0,0,0,0,.7-.73,1.57-1.63,2.62-2.69,0,.02.02.03.03.05.03.07.05.15.05.23-.96.97-1.77,1.8-2.43,2.49ZM30.95,1035.65c.66-.67,1.4-1.41,2.2-2.22.07.05.13.1.2.16-.79.8-1.52,1.54-2.18,2.21-.06-.05-.13-.1-.21-.15h0ZM37.3,1029.6c-1.13,1.14-2.18,2.19-3.14,3.15-.07-.04-.15-.08-.22-.12,1.19-1.19,3.07-3.05,5.63-5.58l.14.13-2.41,2.42h0ZM39.42,1026.93l.04.04-2.44,2.4c-1.17,1.15-2.25,2.21-3.23,3.18-.07-.03-.14-.07-.21-.1,1.22-1.17,3.17-3.01,5.84-5.52h0ZM27.36,1034.27c.34-.8.99-1.34,1.95-1.61.95-.27,1.94-.18,2.95.25.09.04.18.08.27.13-.86.82-1.65,1.56-2.36,2.24-.27-.07-.56-.1-.87-.08-.44.03-.9.19-1.37.5-.3.2-.54.43-.73.68-.15-.82-.09-1.53.16-2.12h0ZM28.3,1044.85c-.2.63-.61,1.19-1.25,1.67-.63.49-1.36.79-2.19.9-.83.11-1.62.05-2.39-.2-1.06-.33-1.86-.9-2.39-1.7-.54-.8-.67-1.62-.41-2.45.28-.87.89-1.62,1.84-2.23.91-.59,2.46-1.12,4.66-1.6-.84.87-1.57,1.68-2.18,2.42-.35.41-.62.77-.82,1.09-.2.31-.27.49-.22.53.06.05.24-.07.54-.35.3-.28.94-.98,1.92-2.1.46-.53.88-.99,1.25-1.41.04.07.08.13.12.2-.84.88-1.59,1.69-2.24,2.42-.36.4-.65.75-.87,1.04-.22.29-.32.45-.29.48.03.03.19-.1.49-.39.29-.29.94-.98,1.93-2.08.41-.45.78-.86,1.12-1.23.04.07.08.14.12.21-.79.84-1.49,1.61-2.11,2.3-.36.4-.65.75-.87,1.04-.23.29-.33.45-.3.47.03.02.18-.11.47-.4.29-.29.93-.99,1.93-2.09.36-.4.7-.77,1-1.1.59,1.05.96,1.89,1.12,2.5.21.81.22,1.5.04,2.08h0ZM34.26,1036.49c-.23.54-.76,1-1.58,1.38-.46.21-1.14.4-2.04.56.43-.28.73-.64.92-1.07.18-.43.17-.81-.03-1.14-.07-.11-.15-.21-.25-.3.66-.68,1.38-1.42,2.17-2.23.26.24.48.52.65.83.38.69.43,1.35.16,1.98h0Z"/><path id="_x32_" class="st1" d="M58.5,1128.13c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93H14.05l.07.17h0c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.35,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM44.87,1130.93c-.37.91-1.33,1.85-2.59,2.46-.75.36-1.71.67-2.64.86-3.19.68-6.92.89-10.32.88-2.4,0-4.77-.23-7.14-.43-3.62-.3-7.56-1.72-8.13-3.87.05-.52.15-1.04.29-1.56,1.41-5.72,6.98-12.14,14.6-12.32.17,0,.34,0,.51,0h.09c.17,0,.34,0,.51,0,7.63.14,13.22,6.53,14.66,12.25.13.46.22.92.28,1.38-.03.12-.06.23-.11.35Z"/><path id="front" class="st1" d="M58.5,1194.81c0-1.54-.06-2.99-.12-4.3-.03-.72-.08-1.46-.14-2.22h0c-.08-1.04-.18-2.1-.31-3.19h.04s-2.86-27.2-13.02-53.93c-.02-.06-.04-.12-.07-.17l-30.77.35c-7.45,19.6-11.1,39.28-12.38,48.26-.57,3.51-.93,6.71-1.1,9.68-.02.44-.05.88-.06,1.31-.05,1.32-.08,2.77-.08,4.3,0,1.37.07,2.81.2,4.3h0c.11.88.26,1.71.45,2.47l.21.73c1.12,3.92,3.25,7.19,6.36,9.72h.01s.06.09.06.09c0,0,.63.58,2.03,1.35,0,0,.76.39.76.39,2.01.99,7.86,3.33,18.79,3.7.01,0,.21.01.21.01h.14s.2-.01.2-.01c10.92-.56,16.75-3.01,18.75-4.04,0,0,.75-.4.75-.4,1.4-.79,2.01-1.38,2.02-1.39h0s.06-.09.06-.09c3.07-2.59,5.17-5.9,6.24-9.84,0,0,.2-.75.2-.75.25-1.07.43-2.29.53-3.6h0c.03-.93.04-1.84.04-2.72ZM29.5,1199.67c-2.49,0-4.5-2.02-4.5-4.5s2-4.49,4.48-4.5c0,0,.01,0,.02,0,2.48,0,4.5,2.01,4.5,4.5s-2.02,4.5-4.5,4.5Z"/></g><g id="wellington-ukulele"><path id="rear1" data-name="rear" class="st1" d="M113.08,189.68h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11,0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34ZM135.42,145.28c2.49,0,4.5,2.02,4.5,4.5s-2.01,4.5-4.5,4.5-4.5-2.01-4.5-4.5,2.02-4.5,4.5-4.5ZM123.65,187.17c1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21Z"/><path id="_x31_71" data-name="_x31_7" class="st1" d="M157.92,237.88c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,240.05c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_61" data-name="_x31_6" class="st1" d="M157.92,289.48c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,291.64c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_51" data-name="_x31_5" class="st1" d="M157.92,341.07c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,343.24c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_41" data-name="_x31_4" class="st1" d="M157.92,392.66c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,394.83c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_31" data-name="_x31_3" class="st1" d="M157.92,444.26c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,446.43c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_21" data-name="_x31_2" class="st1" d="M157.92,495.85c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,498.02c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_11" data-name="_x31_1" class="st1" d="M157.92,547.45c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,549.61c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x31_01" data-name="_x31_0" class="st1" d="M157.92,599.04c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,601.21c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x39_1" data-name="_x39_" class="st1" d="M157.92,650.63c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,652.8c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x38_1" data-name="_x38_" class="st1" d="M157.92,702.23c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,704.4c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x37_1" data-name="_x37_" class="st1" d="M157.92,753.82c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,755.99c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x36_1" data-name="_x36_" class="st1" d="M157.92,805.42c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,807.58c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x35_1" data-name="_x35_" class="st1" d="M157.92,857.01c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,859.18c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x34_1" data-name="_x34_" class="st1" d="M157.92,908.61c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,910.77c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="_x33_1" data-name="_x33_" class="st1" d="M157.92,960.2c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,962.37c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="logo1" data-name="logo" class="st0" d="M139.13,937.85c1.13-1.15,3.05-3.09,5.75-5.81-.12-.02-.23-.05-.34-.09-.02,0-.03-.01-.04-.02-.07-.03-.13-.06-.19-.09-.04-.02-.07-.04-.1-.07-.02-.01-.04-.03-.07-.04-.04-.03-.08-.07-.12-.1-.01,0-.02-.02-.03-.03-.04-.04-.08-.08-.11-.12-.21-.24-.35-.53-.41-.84-.49.54-1.17,1.28-2.04,2.23-.46.5-.75.8-.85.92l.1.08c.66-.69,1.06-1.1,1.21-1.23.15-.12.27-.15.36-.08l.72.61-1.95,1.82c-.96.89-1.84,1.71-2.64,2.47,0,0,0,0,0,0-1.27-.54-2.47-.66-3.62-.36-1.15.29-1.92.89-2.3,1.8-.38.9-.28,1.97.3,3.22-1.94.11-3.21.24-3.8.39-.76.19-1.38.45-1.84.79-.47.34-.79.73-.98,1.17-.28.65-.21,1.4.21,2.23.42.83,1.26,1.51,2.53,2.05,1.55.65,3.03.8,4.46.43,1.42-.37,2.35-1.06,2.79-2.09.45-1.06.18-2.5-.8-4.33,1.56.01,2.84-.19,3.84-.6.76-.31,1.26-.74,1.5-1.3.24-.56.15-1.16-.26-1.82-.29-.46-.7-.85-1.24-1.18h0ZM134.07,941.31c.13-.31.34-.61.63-.9.29-.29.54-.46.77-.52.13-.03.25-.04.36-.03-.73.7-1.35,1.3-1.86,1.81,0-.11.04-.23.09-.36h0ZM138.14,938.24c-.63.62-1.21,1.19-1.73,1.72-.06-.03-.12-.06-.19-.09.53-.52,1.12-1.1,1.76-1.72.05.03.11.07.16.1h0ZM134.09,942.06s0-.02-.01-.03c.55-.57,1.23-1.26,2.06-2.08.06.03.12.08.16.12-.84.84-1.54,1.55-2.1,2.11-.04-.04-.08-.08-.11-.12ZM134.31,942.47s-.02,0-.03,0c0,0,0-.01,0-.02.01,0,.03.01.04.02h0ZM135.67,941.86c-.31.28-.59.43-.85.47-.02,0-.03,0-.04,0,.46-.49,1.02-1.07,1.66-1.74-.01.1-.04.21-.09.32-.15.35-.38.66-.68.94h0ZM134.57,942.34c-.07,0-.14-.03-.21-.05,0,0,0,0,0,0,.54-.57,1.22-1.26,2.03-2.09,0,.01.02.02.02.04.02.06.04.12.04.18-.74.76-1.37,1.4-1.88,1.93ZM136.54,940.04c.52-.52,1.08-1.1,1.7-1.72.05.04.1.08.15.12-.62.62-1.18,1.2-1.7,1.72-.05-.04-.1-.08-.16-.12h0ZM141.47,935.34c-.88.88-1.69,1.7-2.43,2.45-.06-.03-.12-.06-.17-.09.92-.92,2.38-2.37,4.37-4.33l.11.1-1.87,1.88h0ZM143.12,933.28l.03.03-1.89,1.86c-.91.89-1.74,1.71-2.51,2.47-.05-.03-.11-.05-.16-.08.95-.91,2.46-2.33,4.53-4.28h0ZM133.76,938.97c.27-.62.77-1.04,1.51-1.25.74-.21,1.5-.14,2.29.19.07.03.14.07.21.1-.67.63-1.28,1.21-1.83,1.74-.21-.05-.43-.08-.67-.06-.34.02-.7.15-1.06.39-.24.15-.42.33-.57.53-.11-.64-.07-1.19.13-1.65h0ZM134.49,947.17c-.15.49-.48.92-.97,1.3-.49.38-1.06.61-1.7.7-.64.09-1.26.04-1.86-.15-.82-.26-1.44-.7-1.86-1.32-.42-.62-.52-1.26-.32-1.9.21-.68.69-1.26,1.43-1.73.7-.45,1.91-.87,3.62-1.24-.65.68-1.21,1.3-1.69,1.87-.27.32-.48.6-.63.85-.15.24-.21.38-.17.41.04.04.18-.05.42-.27.23-.22.73-.76,1.49-1.63.36-.41.68-.77.97-1.09.03.05.06.1.09.15-.65.69-1.23,1.31-1.73,1.88-.28.31-.5.58-.67.81-.17.23-.25.35-.23.37.02.02.15-.08.38-.3.23-.22.73-.76,1.5-1.62.32-.35.61-.67.87-.95.03.06.06.11.09.16-.61.65-1.16,1.25-1.63,1.78-.28.31-.5.58-.68.81-.18.22-.25.35-.24.36.02.02.14-.09.37-.31.22-.23.72-.77,1.5-1.62.28-.31.54-.6.78-.86.46.82.75,1.46.87,1.94.16.63.17,1.16.03,1.61h0ZM139.11,940.69c-.18.42-.59.77-1.23,1.07-.35.16-.88.31-1.58.44.33-.22.57-.49.71-.83.14-.33.13-.63-.03-.89-.05-.08-.12-.16-.19-.24.51-.53,1.07-1.1,1.68-1.73.2.19.37.4.5.64.29.54.34,1.05.13,1.53h0Z"/><path id="_x32_1" data-name="_x32_" class="st1" d="M157.92,1011.79c0-1.2-.04-2.32-.09-3.34-.02-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84h-23.98l.05.13h0c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.52,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM147.34,1013.96c-.28.7-1.03,1.43-2.01,1.91-.58.28-1.33.52-2.05.67-2.48.52-5.37.69-8.01.68-1.86,0-3.7-.18-5.54-.33-2.81-.24-5.87-1.33-6.31-3,.04-.4.11-.81.22-1.21,1.09-4.44,5.42-9.42,11.33-9.56.13,0,.26,0,.39,0h.07c.13,0,.26,0,.39,0,5.92.11,10.26,5.07,11.37,9.5.1.36.17.71.22,1.07-.02.09-.05.18-.09.27Z"/><path id="front1" data-name="front" class="st1" d="M157.92,1063.52c0-1.2-.04-2.32-.09-3.34-.03-.56-.06-1.14-.11-1.72h0c-.06-.8-.14-1.63-.24-2.48h.03s-2.22-21.11-10.1-41.84c-.02-.04-.03-.09-.05-.13l-23.88.27c-5.78,15.2-8.61,30.47-9.6,37.44-.44,2.72-.72,5.2-.85,7.51-.02.34-.04.68-.05,1.02-.04,1.02-.06,2.15-.06,3.34,0,1.06.05,2.18.16,3.34h0c.09.68.2,1.33.35,1.92l.16.57c.87,3.04,2.53,5.58,4.93,7.54h0s.04.07.04.07c0,0,.49.45,1.58,1.05,0,0,.59.3.59.3,1.56.77,6.1,2.59,14.57,2.87,0,0,.16,0,.16,0h.11s.15-.01.15-.01c8.47-.44,13-2.34,14.55-3.13,0,0,.58-.31.58-.31,1.09-.62,1.56-1.07,1.57-1.08h0s.04-.07.04-.07c2.38-2.01,4.01-4.58,4.84-7.64,0,0,.15-.58.15-.58.2-.83.33-1.78.41-2.8h0c.02-.72.03-1.43.03-2.11ZM135.42,1068.31c-2.49,0-4.5-2.02-4.5-4.5s2-4.49,4.48-4.5c0,0,.01,0,.02,0,2.48,0,4.5,2.01,4.5,4.5s-2.02,4.5-4.5,4.5Z"/></g>`;
