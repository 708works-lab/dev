// ============================================================================
// 設定
// ============================================================================

const NAMETAG_WORKER_URL     = 'https://folklore-image-upload.708works.workers.dev';
const NAMETAG_SHOPIFY_DOMAIN = '708works.jp';

// 価格：形状(AG/TL)は価格に影響しない。ギター柄の刻印の有無のみが価格を左右する
// （あり=標準価格、なし=-¥200 税抜＝税込-¥220 → ¥1,980）。名入れ刻印の有無は
// 価格に一切影響しない（line item propertyとしてのみ注文に記録する）。
const NAMETAG_PRICE_WITH_GUITAR = 2200;
const NAMETAG_PRICE_PLAIN       = 1980;
const NAMETAG_VARIANT_IDS = {
  ag: { guitar: '50213688869114', plain: '50213688901882' },
  tl: { guitar: '50213688934650', plain: '50213688967418' }
};

// レザーカラー（Backstage/Folklore/Kolmioと共通の20色パレット）
const NAMETAG_LEATHER_COLORS = [
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

const NAMETAG_SHAPE_LABEL = { ag: 'アコースティックギター型', tl: 'エレキギター型' };

// 名入れ刻印テキストの配置基準。元SVG内のサンプル文字（Area1/Area2/708works）の
// 実測bbox中心をそのまま基準点として使う（プレートや円の中心ではなく実際の
// サンプル文字位置を使うのが正しい、というBackstageでの教訓を踏襲）。
// AGは横書きでArea1/Area2の2箇所、TLは縦書き（-90度回転）でArea1相当の1箇所のみ。
const NAMETAG_KOKUIN_SPEC = {
  ag: {
    area1: { anchor: { x: 123.89,  y: 679.43 }, angle: 0,   maxWidth: 150 },
    area2: { anchor: { x: 123.905, y: 764.55 }, angle: 0,   maxWidth: 150 }
  },
  tl: {
    area1: { anchor: { x: 52.955,  y: 711.03 }, angle: -90, maxWidth: 150 }
  }
};
const NAMETAG_KOKUIN_BASE_FONT_SIZE = 26;
const NAMETAG_KOKUIN_MAX_LEN = 12;
// Backstageシリーズ等と同じバリデーションルールを踏襲
const NAMETAG_KOKUIN_ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;
const NAMETAG_KOKUIN_ALLOWED_HINT = '半角英数字と一部の記号（- _ . , : ; $ !）のみご利用いただけます。絵文字・機種依存文字・全角文字はご利用いただけません。';
// レーザー刻印はレザー色に関わらず焼け焦げたような一定の濃い色になるため、
// 革色から自動計算せずkokuin-guitarの刻印線色（#352200）と合わせた固定色を使う
const NAMETAG_KOKUIN_COLOR = '#352200';

const NAMETAG_DEFAULT_LEATHER = '#9e3820';

// ============================================================================
// 状態
// ============================================================================

let nametagShape        = 'ag';
let nametagLeatherColor = NAMETAG_DEFAULT_LEATHER;
let nametagGuitarPattern = true;
let nametagKokuinText    = { area1: '', area2: '' };
let nametagImageSaved    = false;
let nametagHistory       = [];
let nametagLastUploadedImage = null;

// ============================================================================
// 初期化
// ============================================================================

function initNametagSimulator() {
  if (window.nametagSimulatorInitialized) return;
  const wrap = document.getElementById('nametag-svg-wrap');
  const leatherPalette = document.getElementById('nametag-leather-palette');
  if (!wrap || !leatherPalette) { setTimeout(initNametagSimulator, 100); return; }
  window.nametagSimulatorInitialized = true;

  buildNametagShapeButtons();
  buildNametagLeatherPalette();
  updateNametagKokuinFieldsVisibility();
  updateNametagSummary();
  updateNametagPriceDisplay();
  updateNametagCartButtonState();
  loadNametagSVG();

  const guitarToggle = document.getElementById('nametag-guitar-pattern-toggle');
  if (guitarToggle) {
    guitarToggle.checked = !nametagGuitarPattern;
    guitarToggle.addEventListener('change', () => {
      nametagGuitarPattern = !guitarToggle.checked;
      nametagImageSaved = false;
      applyNametagState();
      updateNametagSummary();
      updateNametagPriceDisplay();
      updateNametagCartButtonState();
    });
  }

  ['area1', 'area2'].forEach(area => {
    const input = document.getElementById(`nametag-kokuin-${area}`);
    if (!input) return;
    input.addEventListener('input', () => {
      nametagKokuinText[area] = input.value;
      nametagImageSaved = false;
      drawNametagKokuinText();
      validateNametagKokuinField(area);
      updateNametagSummary();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNametagSimulator);
} else {
  initNametagSimulator();
}

// ============================================================================
// SVG 読み込み
// ============================================================================

function loadNametagSVG() {
  const wrap = document.getElementById('nametag-svg-wrap');
  if (!wrap) return;
  fetch('https://708works-lab.github.io/dev/nametag_color_order.svg')
    .then(r => r.text())
    .then(text => {
      wrap.innerHTML = text;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.width  = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // SVG内にはサンプル文字（Area1/Area2/708works相当）が直書きされているが、
        // これはプレースホルダーの見本であり通常時は表示しない。名入れ刻印を
        // 入力した場合のみ、その場所へ実際の入力文字を描画する。
        ['kokuin-area1', 'kokuin-area11', 'kokuin-area2'].forEach(id => {
          const el = svg.querySelector(`#${id}`);
          if (el) el.style.display = 'none';
        });
      }
      applyNametagState();
    })
    .catch(() => {
      wrap.innerHTML = '<p style="padding:20px;font-size:11px;color:#aaa;text-align:center">読み込み中...</p>';
    });
}

// ============================================================================
// 状態の反映（革色・形状の表示切替・ギター柄の刻印表示切替・名入れ刻印）
// ============================================================================

function applyNametagState() {
  const svg = document.querySelector('#nametag-svg-wrap svg');
  if (!svg) return;

  // 革色：.st2 は nametag-tl / nametag-ag 両方の leather グループで共有されている
  // ため、一括置換すれば両形状に同時に反映される（非表示側にも適用しておいて
  // 損はない）
  const styleEl = svg.querySelector('defs style');
  if (styleEl) {
    let css = styleEl.textContent;
    const re = /(\.st2\s*{[^}]*fill:\s*)#[0-9a-fA-F]{3,6}/;
    css = css.replace(re, `$1${nametagLeatherColor}`);
    styleEl.textContent = css;
  }

  // 形状の表示切替：nametag-tl と nametag-ag は同じ座標系に重なって描画されて
  // いるため、選択中の形状だけを表示する
  const tlGroup = svg.querySelector('#nametag-tl');
  const agGroup = svg.querySelector('#nametag-ag');
  if (tlGroup) tlGroup.style.display = nametagShape === 'tl' ? 'block' : 'none';
  if (agGroup) agGroup.style.display = nametagShape === 'ag' ? 'block' : 'none';

  // ギター柄の刻印の表示切替（TL=詳細なギターイラスト、AG=木目・ブリッジ調の刻印線）
  const guitarGroupTl = svg.querySelector('#nametag-tl #kokuin-guitar');
  const guitarGroupAg = svg.querySelector('#nametag-ag #kokuin-guitar1');
  [guitarGroupTl, guitarGroupAg].forEach(g => {
    if (g) g.style.display = nametagGuitarPattern ? 'block' : 'none';
  });

  drawNametagKokuinText();
}

// ============================================================================
// 名入れ刻印テキストの描画
// ============================================================================

function drawNametagKokuinText() {
  const svg = document.querySelector('#nametag-svg-wrap svg');
  if (!svg) return;
  const spec = NAMETAG_KOKUIN_SPEC[nametagShape];

  // 前回描画分をクリア（動的に追加した<text>のみ削除、元のサンプルグループは
  // 常にdisplay:noneのまま）
  svg.querySelectorAll('.nametag-kokuin-text').forEach(el => el.remove());

  Object.entries(spec).forEach(([area, cfg]) => {
    const text = (nametagKokuinText[area] || '').trim();
    if (!text) return;

    const ns = 'http://www.w3.org/2000/svg';
    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('class', 'nametag-kokuin-text');
    textEl.setAttribute('x', cfg.anchor.x);
    textEl.setAttribute('y', cfg.anchor.y);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    if (cfg.angle) textEl.setAttribute('transform', `rotate(${cfg.angle} ${cfg.anchor.x} ${cfg.anchor.y})`);
    textEl.setAttribute('font-family', '-apple-system, "Helvetica Neue", Arial, sans-serif');
    textEl.setAttribute('font-weight', '600');
    textEl.setAttribute('font-size', NAMETAG_KOKUIN_BASE_FONT_SIZE);
    textEl.setAttribute('fill', NAMETAG_KOKUIN_COLOR);
    textEl.setAttribute('fill-opacity', '0.85');
    textEl.textContent = text;
    svg.appendChild(textEl);

    let fontSize = NAMETAG_KOKUIN_BASE_FONT_SIZE;
    let measuredWidth = textEl.getBBox().width;
    while (measuredWidth > cfg.maxWidth && fontSize > 4) {
      fontSize -= 0.5;
      textEl.setAttribute('font-size', fontSize);
      measuredWidth = textEl.getBBox().width;
    }
  });
}

// Backstageシリーズと同じバリデーション（許可文字パターン・文字数上限）を行い、
// 文字数カウンターと注意メッセージを更新する
function validateNametagKokuinField(area) {
  const text = nametagKokuinText[area] || '';
  const countEl = document.getElementById(`nametag-kokuin-${area}-count`);
  const warnEl  = document.getElementById(`nametag-kokuin-${area}-warn`);

  const overLen = text.length > NAMETAG_KOKUIN_MAX_LEN;
  if (countEl) {
    countEl.textContent = `${text.length} / ${NAMETAG_KOKUIN_MAX_LEN}`;
    countEl.classList.toggle('over', overLen);
  }

  const warnings = [];
  if (!NAMETAG_KOKUIN_ALLOWED_PATTERN.test(text)) warnings.push(NAMETAG_KOKUIN_ALLOWED_HINT);
  if (overLen) warnings.push(`文字数の上限は${NAMETAG_KOKUIN_MAX_LEN}文字です。`);
  if (warnEl) {
    warnEl.innerHTML = warnings.join('<br>');
    warnEl.classList.toggle('show', warnings.length > 0);
  }
}

function nametagKokuinHasError() {
  return ['area1', 'area2'].some(area => {
    const text = nametagKokuinText[area] || '';
    return text.length > NAMETAG_KOKUIN_MAX_LEN || !NAMETAG_KOKUIN_ALLOWED_PATTERN.test(text);
  });
}

// ============================================================================
// 形状ボタン
// ============================================================================

function buildNametagShapeButtons() {
  const container = document.getElementById('nametag-shapes');
  if (!container) return;
  container.innerHTML = '';

  ['ag', 'tl'].forEach(shape => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nametag-shape-btn' + (shape === nametagShape ? ' active' : '');
    btn.textContent = NAMETAG_SHAPE_LABEL[shape];
    btn.onclick = () => setNametagShape(shape);
    container.appendChild(btn);
  });
}

function setNametagShape(shape) {
  if (shape === nametagShape) return;
  saveNametagHistory();
  nametagShape = shape;
  nametagImageSaved = false;
  buildNametagShapeButtons();
  updateNametagKokuinFieldsVisibility();
  updateNametagSummary();
  updateNametagCartButtonState();
  applyNametagState();
}

function updateNametagKokuinFieldsVisibility() {
  const area2Row = document.getElementById('nametag-kokuin-area2-row');
  if (area2Row) area2Row.hidden = nametagShape !== 'ag';
  const area1Label = document.getElementById('nametag-kokuin-area1-label');
  if (area1Label) {
    area1Label.textContent = nametagShape === 'ag'
      ? '刻印する文字（Area1・サウンドホール下）'
      : '刻印する文字（ボディ部分）';
  }
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildNametagLeatherPalette() {
  const palette = document.getElementById('nametag-leather-palette');
  if (!palette) return;
  palette.innerHTML = '';

  NAMETAG_LEATHER_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'nametag-swatch' + (c.hex === nametagLeatherColor ? ' selected' : '');
    // テーマのbase.cssに `div:empty{display:none}` があるため、
    // 子要素を持たない空divのままだと非表示になってしまう。display指定を明示して回避する。
    sw.style.cssText = `display:block;background:${c.hex};`;
    sw.title = c.name;
    sw.onclick = () => setNametagLeatherColor(c.hex);
    palette.appendChild(sw);
  });
}

function setNametagLeatherColor(hex) {
  saveNametagHistory();
  nametagLeatherColor = hex;
  nametagImageSaved = false;
  buildNametagLeatherPalette();
  updateNametagSummary();
  applyNametagState();
}

function nametagLeatherColorName(hex) {
  return NAMETAG_LEATHER_COLORS.find(c => c.hex === hex)?.name || hex;
}

// ============================================================================
// サマリー・価格
// ============================================================================

function updateNametagSummary() {
  const el = document.getElementById('nametag-summary');
  if (!el) return;
  const rows = [
    `<div class="summary-row"><span class="summary-label">形状</span><span class="summary-name">${NAMETAG_SHAPE_LABEL[nametagShape]}</span></div>`,
    `<div class="summary-row"><span class="summary-label">革</span><span class="summary-dot" style="background:${nametagLeatherColor}"></span><span class="summary-name">${nametagLeatherColorName(nametagLeatherColor)}</span></div>`,
    `<div class="summary-row"><span class="summary-label">ギター柄の刻印</span><span class="summary-name">${nametagGuitarPattern ? 'あり' : 'なし'}</span></div>`
  ];
  el.innerHTML = rows.join('');
}

function updateNametagPriceDisplay() {
  const el = document.getElementById('nametag-price-display');
  if (!el) return;
  const price = nametagGuitarPattern ? NAMETAG_PRICE_WITH_GUITAR : NAMETAG_PRICE_PLAIN;
  el.textContent = `¥${price.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveNametagHistory() {
  nametagHistory.push({ shape: nametagShape, leather: nametagLeatherColor, guitarPattern: nametagGuitarPattern });
  if (nametagHistory.length > 20) nametagHistory.shift();
  const btn = document.getElementById('nametag-btn-undo');
  if (btn) btn.disabled = false;
}

function nametagUndo() {
  if (!nametagHistory.length) return;
  const prev = nametagHistory.pop();
  nametagShape = prev.shape;
  nametagLeatherColor = prev.leather;
  nametagGuitarPattern = prev.guitarPattern;
  nametagImageSaved = false;
  buildNametagShapeButtons();
  buildNametagLeatherPalette();
  updateNametagKokuinFieldsVisibility();
  const guitarToggle = document.getElementById('nametag-guitar-pattern-toggle');
  if (guitarToggle) guitarToggle.checked = !nametagGuitarPattern;
  updateNametagSummary();
  updateNametagPriceDisplay();
  updateNametagCartButtonState();
  applyNametagState();
  const btn = document.getElementById('nametag-btn-undo');
  if (btn) btn.disabled = nametagHistory.length === 0;
}

function nametagReset() {
  saveNametagHistory();
  nametagShape = 'ag';
  nametagLeatherColor = NAMETAG_DEFAULT_LEATHER;
  nametagGuitarPattern = true;
  nametagImageSaved = false;
  buildNametagShapeButtons();
  buildNametagLeatherPalette();
  updateNametagKokuinFieldsVisibility();
  const guitarToggle = document.getElementById('nametag-guitar-pattern-toggle');
  if (guitarToggle) guitarToggle.checked = false;
  updateNametagSummary();
  updateNametagPriceDisplay();
  updateNametagCartButtonState();
  applyNametagState();
}

// ============================================================================
// 画像保存・アップロード
// ============================================================================

async function nametagSaveImage() {
  const svg = document.querySelector('#nametag-svg-wrap svg');
  if (!svg) { showNametagToast('SVGが見つかりません'); return; }
  const canvas = await buildNametagSaveCanvas();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `nametag-color-${Date.now()}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  nametagImageSaved = true;
  updateNametagCartButtonState();
  showNametagToast('画像を保存しました ✓　カートに進めます');
}

async function buildNametagSaveCanvas() {
  const SVG_VW = 247.78, SVG_VH = 811.14;
  const svgSaveW = 220;
  const scale = svgSaveW / SVG_VW;
  const svgSaveH = Math.round(SVG_VH * scale);

  const margin = 32;
  const headerH = 60;
  const svgY0 = headerH + 14;
  const footerH = 30;
  const ch = svgY0 + svgSaveH + footerH + 40;
  const cw = svgSaveW + margin * 2;

  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GUITAR NAMETAG', cw / 2, 32);
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 48);

  const svgEl = document.querySelector('#nametag-svg-wrap svg');
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

  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

  return cv;
}

// ============================================================================
// カート注文
// ============================================================================

function updateNametagCartButtonState() {
  const cartLabel = document.getElementById('nametag-cart-label');
  if (cartLabel) cartLabel.textContent = '画像を保存してカートに入れる →';
}

async function nametagGoOrder() {
  if (nametagKokuinHasError()) {
    showNametagToast('刻印する文字をご確認ください');
    return;
  }
  if (!nametagImageSaved) {
    await nametagSaveImage();
  }
  const loadEl = document.getElementById('nametag-loading-overlay');
  if (loadEl) loadEl.classList.add('show');
  try {
    const svg = document.querySelector('#nametag-svg-wrap svg');
    if (!svg) throw new Error('SVGが見つかりません');
    const canvas = await buildNametagSaveCanvas();
    const result = await nametagUploadImage(canvas);
    if (!result) throw new Error('画像アップロードに失敗しました');
    nametagLastUploadedImage = result;
    if (loadEl) loadEl.classList.remove('show');
    showNametagConfirmModal(result);
  } catch(e) {
    console.error(e);
    showNametagToast(e.message);
    if (loadEl) loadEl.classList.remove('show');
  }
}

async function nametagUploadImage(canvas) {
  const blob    = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = 'NTG-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const form    = new FormData();
  form.append('image', blob, `nametag-${orderId}.png`);
  form.append('orderId', orderId);
  const res  = await fetch(NAMETAG_WORKER_URL, {method:'POST', body:form});
  if (!res.ok) return null;
  const data = await res.json();
  return {orderId, imageUrl: data.url || data.imageUrl};
}

function showNametagConfirmModal(result) {
  const modal = document.getElementById('nametag-confirm-modal');
  if (!modal) return;
  const img = document.getElementById('nametag-modal-image');
  if (img) img.src = result.imageUrl;

  const kokuinRows = [];
  if (nametagKokuinText.area1) kokuinRows.push(`<div class="modal-color-row"><span class="modal-zone-label">刻印文字${nametagShape === 'ag' ? '（Area1）' : ''}</span><span>「${nametagKokuinText.area1}」</span></div>`);
  if (nametagShape === 'ag' && nametagKokuinText.area2) kokuinRows.push(`<div class="modal-color-row"><span class="modal-zone-label">刻印文字（Area2）</span><span>「${nametagKokuinText.area2}」</span></div>`);

  const info = document.getElementById('nametag-modal-info');
  if (info) info.innerHTML = `
    <p><strong>注文ID:</strong> ${result.orderId}</p>
    <div class="modal-color-list">
      <div class="modal-color-row"><span class="modal-zone-label">形状</span><span>${NAMETAG_SHAPE_LABEL[nametagShape]}</span></div>
      <div class="modal-color-row"><span class="modal-zone-label">革</span><span class="modal-color-dot" style="background:${nametagLeatherColor}"></span><span>${nametagLeatherColorName(nametagLeatherColor)}</span></div>
      <div class="modal-color-row"><span class="modal-zone-label">ギター柄の刻印</span><span>${nametagGuitarPattern ? 'あり' : 'なし'}</span></div>
      ${kokuinRows.join('')}
    </div>`;
  modal.classList.add('show');
}

function closeNametagModal() {
  const modal = document.getElementById('nametag-confirm-modal');
  if (modal) modal.classList.remove('show');
}

async function nametagProceedToCart() {
  if (!nametagLastUploadedImage) { showNametagToast('画像情報が見つかりません'); return; }
  closeNametagModal();

  const variantId = NAMETAG_VARIANT_IDS[nametagShape][nametagGuitarPattern ? 'guitar' : 'plain'];

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${NAMETAG_SHOPIFY_DOMAIN}/cart/add`;
  form.style.display = 'none';

  [['id', variantId],['quantity','1']].forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  const properties = {
    'Order ID': nametagLastUploadedImage.orderId,
    '形状': NAMETAG_SHAPE_LABEL[nametagShape],
    '革色': nametagLeatherColorName(nametagLeatherColor),
    'ギター柄の刻印': nametagGuitarPattern ? 'あり' : 'なし',
    'Image URL': nametagLastUploadedImage.imageUrl
  };
  if (nametagKokuinText.area1) {
    properties[nametagShape === 'ag' ? '刻印文字(Area1)' : '刻印文字'] = nametagKokuinText.area1;
  }
  if (nametagShape === 'ag' && nametagKokuinText.area2) {
    properties['刻印文字(Area2)'] = nametagKokuinText.area2;
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

function showNametagToast(msg) {
  const el = document.getElementById('nametag-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
