// ============================================================================
// 設定
// ============================================================================

// Cloudflare Worker URL
const WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';

// Shopify設定
const SHOPIFY_DOMAIN = 'shop.708works.jp';

// ウロコ数とVariant IDのマッピング
const VARIANT_MAP = {
  10: '48782492270842',
  11: '48782492303610',
  12: '48782492336378',
  13: '48782492369146',
  14: '48782492401914',
  15: '48782492434682',
  16: '48782492467450',
  17: '48782492500218',
  18: '48782492532986',
  19: '48782492565754',
  20: '48782492598522',
  21: '48782492631290',
  22: '48782492664058',
  23: '48782492696826',
  24: '48782492729594',
  25: '48782492762362',
  26: '48782492795130',
  27: '48782492827898',
  28: '48782492860666',
  29: '48782492893434',
  30: '48782492926202',
};

// 価格マップ
const PRICE_MAP = {
  10: 13640, 11: 15004, 12: 16368, 13: 17732, 14: 19096,
  15: 20460, 16: 21824, 17: 23188, 18: 24552, 19: 25916,
  20: 27280, 21: 28644, 22: 30008, 23: 31372, 24: 32736,
  25: 34100, 26: 35464, 27: 36828, 28: 38192, 29: 39556,
  30: 40920,
};

// カラー定義
const COLORS=[
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

const GRADS=[
  {name:'オーシャン', fn:i=>['#1e2540','#2a5060','#7baed0','#3a5030','#2a5060','#1e2540'][i%6]},
  {name:'サンセット', fn:i=>['#1a1a1a','#7a2035','#b82828','#d4742a','#e8c84a','#d4742a'][i%6]},
  {name:'フォレスト', fn:i=>['#1a1a1a','#3a5030','#7a7848','#a8c43a','#3a5030','#1a1a1a'][i%6]},
  {name:'ヴィンテージ',fn:i=>['#4a2018','#9e3820','#c46030','#d4742a','#e8c4a0','#c46030'][i%6]},
  {name:'キャンディ', fn:i=>['#d96090','#f0a0a8','#e8c84a','#7baed0','#a8c43a','#d96090'][i%6]},
];

// ============================================================================
// グローバル変数
// ============================================================================

let N=20, partColors=Array(N).fill('#c46030');
let selected=new Set(), mode='single', rangeStart=null;
let activeColor=COLORS[12];
let history=[];
let lastUploadedImage = null;
const PW=40,PH=50,OVL=16,PAD=6,LABEL_W=72;

// ============================================================================
// 初期化
// ============================================================================

function initializeSimulator() {
  // 既に初期化済みの場合はスキップ（windowオブジェクトで管理）
  if (window.folkloreSimulatorInitialized) {
    console.log('FOLKLORE: Already initialized, skipping...');
    return;
  }
  
  // DOM要素の存在を確認
  const paletteEl = document.getElementById('palette');
  const gradRowEl = document.getElementById('grad-row');
  const strapScrollEl = document.getElementById('strap-scroll');
  
  if (!paletteEl || !gradRowEl || !strapScrollEl) {
    console.warn('FOLKLORE: Required elements not found, retrying in 100ms...');
    setTimeout(initializeSimulator, 100);
    return;
  }
  
  console.log('FOLKLORE: Starting initialization...');
  
  // 初期化フラグを立てる
  window.folkloreSimulatorInitialized = true;
  
  // 各要素を初期化
  buildPalette();
  buildGrads();
  updateSummary();
  buildStrapRows();
  updatePriceDisplay();
  updateCountDisplay();
  
  console.log('FOLKLORE: Initialization complete');
}

// DOM読み込み完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSimulator);
} else {
  // 既にDOMが読み込まれている場合は即実行
  initializeSimulator();
}

// リサイズ時の再描画
window.addEventListener('resize', () => {
  if (window.folkloreSimulatorInitialized) {
    buildStrapRows();
  }
});

// ============================================================================
// 価格表示
// ============================================================================

function updatePriceDisplay(){
  const el = document.getElementById('price-display');
  if (!el) return;
  const price = PRICE_MAP[N];
  el.textContent = `¥${price.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveHistory(){
  history.push({colors:[...partColors],n:N});
  if(history.length>30) history.shift();
  const btn = document.getElementById('btn-undo');
  if (btn) btn.disabled=false;
}

function undo(){
  if(!history.length)return;
  const prev=history.pop();
  N=prev.n; partColors=prev.colors;
  selected.clear();
  updateCountDisplay();
  updatePriceDisplay();
  const selInfo = document.getElementById('sel-info');
  if (selInfo) selInfo.textContent='パーツをタップ';
  buildStrapRows(); updateSummary();
  const btn = document.getElementById('btn-undo');
  if(!history.length && btn) btn.disabled=true;
}

// ============================================================================
// カウント表示
// ============================================================================

function updateCountDisplay(){
  const cntDisp = document.getElementById('cnt-disp');
  const cntSub = document.getElementById('cnt-sub');
  if (!cntDisp || !cntSub) return;
  
  cntDisp.textContent=N+'個';
  const diff=N-20, len=1150+diff*60;
  const txt=diff===0?'標準':diff>0?`標準より${diff}個多い`:`標準より${Math.abs(diff)}個少ない`;
  cntSub.textContent=`${txt}（全長 約${len}mm）`;
}

function changeCount(d){
  const nx=N+d; if(nx<10||nx>30)return;
  saveHistory(); N=nx;
  if(d>0) for(let k=0;k<d;k++) partColors.push('#c46030');
  else partColors=partColors.slice(0,N);
  selected.clear();
  const selInfo = document.getElementById('sel-info');
  if (selInfo) selInfo.textContent='パーツをタップ';
  updateCountDisplay();
  updatePriceDisplay();
  buildStrapRows();
  updateSummary();
}

// ============================================================================
// ストラップ描画
// ============================================================================

// 色が明るいかどうかを判定
function isLightColor(hex) {
  const r = parseInt(hex.substr(1,2), 16);
  const g = parseInt(hex.substr(3,2), 16);
  const b = parseInt(hex.substr(5,2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function buildStrapRows(){
  const scroll=document.getElementById('strap-scroll');
  const col=document.getElementById('strap-col');
  if (!scroll || !col) {
    console.warn('FOLKLORE: strap-scroll or strap-col element not found');
    return;
  }
  
  col.style.width=(PW+10+LABEL_W)+'px';
  scroll.innerHTML='';
  const totalH=PAD+N*PH-(N-1)*OVL+PAD;
  const wrap=document.createElement('div');
  wrap.style.cssText=`position:relative;width:${PW+10+LABEL_W}px;height:${totalH}px;`;
  const dpr=window.devicePixelRatio||1;
  for(let i=0;i<N;i++){
    const y=PAD+i*(PH-OVL);
    const frontNum=N-i;
    const cv=document.createElement('canvas');
    cv.width=(PW+10)*dpr; cv.height=PH*dpr;
    cv.style.cssText=`position:absolute;left:0;top:${y}px;width:${PW+10}px;height:${PH}px;cursor:pointer;background:transparent;`;
    cv.dataset.idx=i;
    cv.addEventListener('click',()=>handleTap(i));
    cv.addEventListener('touchend',e=>{e.preventDefault();handleTap(i);},{passive:false});
    const ctx=cv.getContext('2d');
    ctx.scale(dpr,dpr);
    drawDrop(ctx,(PW+10)/2,0,partColors[i],selected.has(i),frontNum===3?'ロゴ刻印':null,i===0,i===N-1);
    const lbl=document.createElement('div');
    lbl.id=`lbl-${i}`;
    lbl.style.cssText=`position:absolute;left:${PW+14}px;top:${y+PH*0.46}px;transform:translateY(-50%);font-size:9px;white-space:nowrap;pointer-events:none;line-height:1.3;`;
    const cname=COLORS.find(c=>c.hex===partColors[i])?.name||'';
    lbl.innerHTML=`<span style="font-size:8px;color:#bbb;">P${frontNum}</span><br><span style="color:${selected.has(i)?'#111':'#666'};font-weight:${selected.has(i)?600:400};">${cname}</span>`;
    wrap.appendChild(cv); wrap.appendChild(lbl);
  }
  scroll.appendChild(wrap);
}

function redrawAll(){
  const dpr=window.devicePixelRatio||1;
  for(let i=0;i<N;i++){
    const cv=document.querySelector(`canvas[data-idx="${i}"]`);
    if(!cv)continue;
    const ctx=cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,PW+10,PH);
    const frontNum=N-i;
    drawDrop(ctx,(PW+10)/2,0,partColors[i],selected.has(i),frontNum===3?'ロゴ刻印':null,i===0,i===N-1);
    const lbl=document.getElementById(`lbl-${i}`);
    if(lbl){
      const cname=COLORS.find(c=>c.hex===partColors[i])?.name||'';
      lbl.innerHTML=`<span style="font-size:8px;color:#bbb;">P${frontNum}</span><br><span style="color:${selected.has(i)?'#111':'#666'};font-weight:${selected.has(i)?600:400};">${cname}</span>`;
    }
  }
}

function drawDrop(ctx,cx,y,color,isSel,badge,isEndPin,isBodyPin){
  const hw=PW/2,top=y,bot=y+PH;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx,top+1);
  ctx.bezierCurveTo(cx+hw*.55,top+PH*.12,cx+hw,top+PH*.45,cx+hw,bot-hw*.85);
  ctx.bezierCurveTo(cx+hw,bot,cx-hw,bot,cx-hw,bot-hw*.85);
  ctx.bezierCurveTo(cx-hw,top+PH*.45,cx-hw*.55,top+PH*.12,cx,top+1);
  ctx.closePath();
  ctx.fillStyle=color; ctx.fill();
  const g=ctx.createLinearGradient(cx,top,cx,bot);
  g.addColorStop(0,'rgba(255,255,255,.22)');
  g.addColorStop(.4,'rgba(255,255,255,.06)');
  g.addColorStop(1,'rgba(0,0,0,.15)');
  ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle=isSel?'rgba(255,215,0,.95)':'rgba(0,0,0,.4)';
  ctx.lineWidth=isSel?2.2:.7; ctx.stroke();
  if(isEndPin){
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(cx,top+hw*.52,hw*.20,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,1)'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx,top+hw*.52,hw*.20,0,Math.PI*2);
    ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=.7; ctx.stroke();
  }
  if(isBodyPin){
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(cx,bot-hw*.52,hw*.20,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,1)'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx,bot-hw*.52,hw*.20,0,Math.PI*2);
    ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=.7; ctx.stroke();
  }
  if(badge){
    // ロゴマークを描画（保存画像と同じスタイル）
    const logoColor = isLightColor(color) ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)';
    drawLogoMarkSmall(ctx, cx, top+PH*.55, 0.08, logoColor);
  }
  ctx.restore();
}

// 通常表示用の小さいロゴマーク
function drawLogoMarkSmall(ctx, cx, cy, scale, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  
  ctx.fillStyle = color;
  ctx.font = 'bold 55px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('708', 0, -5);
  
  ctx.font = '14px sans-serif';
  ctx.fillText('works', 0, 20);
  
  ctx.restore();
}

// ============================================================================
// タップ処理
// ============================================================================

function handleTap(i){
  if(mode==='single'){
    saveHistory();
    selected.clear(); selected.add(i);
    partColors[i]=activeColor.hex; updateSummary();
  }else if(mode==='range'){
    if(rangeStart===null){rangeStart=i;selected.clear();selected.add(i);}
    else{
      saveHistory();
      const a=Math.min(rangeStart,i),b=Math.max(rangeStart,i);
      selected.clear(); for(let j=a;j<=b;j++) selected.add(j);
      rangeStart=null;
    }
  }
  updateSelInfo(); redrawAll();
}

// ============================================================================
// モード切替
// ============================================================================

function setMode(m){
  mode=m; rangeStart=null;
  document.querySelectorAll('.mbt').forEach(b=>b.classList.remove('on'));
  const modeBtn = document.getElementById('m-'+m);
  if (modeBtn) modeBtn.classList.add('on');
  if(m==='all'){
    selected.clear(); for(let i=0;i<N;i++) selected.add(i);
    const selInfo = document.getElementById('sel-info');
    if (selInfo) selInfo.innerHTML=`全 <b>${N}枚</b>`;
  }else{
    selected.clear();
    const selInfo = document.getElementById('sel-info');
    if (selInfo) selInfo.textContent='パーツをタップ';
  }
  redrawAll();
}

function updateSelInfo(){
  const el=document.getElementById('sel-info');
  if (!el) return;
  if(!selected.size){el.textContent='パーツをタップ';return;}
  const arr=[...selected].sort((a,b)=>a-b);
  const front=i=>N-i;
  if(arr.length===1) el.innerHTML=`前から <b>#${front(arr[0])}</b>`;
  else el.innerHTML=`前から <b>#${front(arr[arr.length-1])}〜#${front(arr[0])}</b>（<b>${arr.length}枚</b>）`;
}

// ============================================================================
// カラーパレット
// ============================================================================

function buildPalette(){
  const p=document.getElementById('palette');
  if (!p) {
    console.warn('FOLKLORE: palette element not found');
    return;
  }
  
  console.log('FOLKLORE: Building palette...');
  console.log('FOLKLORE: Current palette children count:', p.children.length);
  
  // 既存の内容を完全にクリア
  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }
  
  console.log('FOLKLORE: Palette cleared, building with', COLORS.length, 'colors');
  
  COLORS.forEach((c, index) => {
    const wrap=document.createElement('div');
    wrap.className='cb-wrap';
    wrap.dataset.id=c.id;
    
    const dot=document.createElement('div');
    dot.className='cb'+(c.id===activeColor.id?' on':'');
    // 背景色を確実に設定（インラインスタイルで）
    dot.style.cssText = `background: ${c.hex} !important; width: 32px; height: 32px; border-radius: 50%; display: block; flex-shrink: 0; border: 3px solid ${c.id===activeColor.id?'#111':'transparent'};`;
    dot.dataset.id=c.id;
    
    const nm=document.createElement('div');
    nm.className='color-name'+(c.id===activeColor.id?' on':'');
    nm.textContent=c.name;
    
    wrap.appendChild(dot);
    wrap.appendChild(nm);
    
    wrap.onclick=()=>{
      activeColor=c;
      document.querySelectorAll('.cb').forEach(b=>{
        const isActive = b.dataset.id===c.id;
        b.classList.toggle('on', isActive);
        // スタイルを直接更新
        const bgColor = COLORS.find(col => col.id === b.dataset.id)?.hex || '#ccc';
        b.style.cssText = `background: ${bgColor} !important; width: 32px; height: 32px; border-radius: 50%; display: block; flex-shrink: 0; border: 3px solid ${isActive?'#111':'transparent'};`;
      });
      document.querySelectorAll('.color-name').forEach(b=>b.classList.toggle('on',b.closest('.cb-wrap')?.dataset.id===c.id));
      if(!selected.size)return;
      saveHistory();
      [...selected].forEach(i=>partColors[i]=c.hex);
      redrawAll(); updateSummary();
    };
    
    p.appendChild(wrap);
  });
  
  console.log('FOLKLORE: Palette built successfully, final children count:', p.children.length);
}

// ============================================================================
// グラデーション
// ============================================================================

function buildGrads(){
  const row=document.getElementById('grad-row');
  if (!row) {
    console.warn('FOLKLORE: grad-row element not found');
    return;
  }
  
  console.log('FOLKLORE: Building gradients...');
  console.log('FOLKLORE: Current gradient children count:', row.children.length);
  
  // 既存の内容を完全にクリア
  while (row.firstChild) {
    row.removeChild(row.firstChild);
  }
  
  console.log('FOLKLORE: Gradients cleared, building with', GRADS.length, 'presets');
  
  GRADS.forEach(g=>{
    const btn=document.createElement('button');
    btn.className='gb';
    btn.textContent=g.name;
    btn.onclick=()=>{
      saveHistory();
      for(let i=0;i<N;i++) partColors[i]=g.fn(i);
      redrawAll();
      updateSummary();
    };
    row.appendChild(btn);
  });
  
  console.log('FOLKLORE: Gradients built successfully, final children count:', row.children.length);
}

// ============================================================================
// サマリー
// ============================================================================

function updateSummary(){
  const el=document.getElementById('summary');
  if (!el) return;
  const counts={};
  partColors.forEach(h=>{counts[h]=(counts[h]||0)+1;});
  const nameOf=h=>COLORS.find(c=>c.hex===h)?.name||h;
  el.innerHTML=Object.entries(counts).map(([h,n])=>
    `<span class="si"><span class="sw" style="background:${h}"></span>${nameOf(h)} ×${n}</span>`
  ).join('');
}

// ============================================================================
// リセット
// ============================================================================

function resetAll(){
  saveHistory();
  partColors=Array(N).fill('#c46030'); selected.clear();
  const selInfo = document.getElementById('sel-info');
  if (selInfo) selInfo.textContent='パーツをタップ';
  buildStrapRows(); updateSummary();
}

// ============================================================================
// トースト
// ============================================================================

function showToast(msg){
  const t=document.getElementById('toast');
  if (!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ============================================================================
// ローディング
// ============================================================================

function showLoading(text='処理中...'){
  const loadingText = document.getElementById('loading-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingText) loadingText.textContent=text;
  if (loadingOverlay) loadingOverlay.classList.add('show');
}

function hideLoading(){
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.remove('show');
}

// ============================================================================
// 画像保存（ダウンロード）
// ============================================================================

async function saveImage(){
  const cv=document.getElementById('save-canvas');
  if (!cv) return;
  showLoading('画像を生成中...');
  try{
    const canvas = buildSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r,'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folklore-strap-${N}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideLoading();
    showToast('画像を保存しました');
  }catch(e){
    console.error(e);
    hideLoading();
    showToast('保存に失敗しました');
  }
}

// ============================================================================
// オーダー処理
// ============================================================================

async function goOrder(){
  showLoading('画像をアップロード中...');
  try {
    const canvas = buildSaveCanvas();
    
    // 画像を自動ダウンロード
    try {
      const blob = await new Promise(r => canvas.toBlob(r,'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folklore-order-${N}parts-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('注文画像を自動ダウンロードしました');
    } catch(e) {
      console.warn('自動ダウンロードに失敗:', e);
    }
    
    const uploadResult = await uploadOrderImage(canvas);
    
    if (!uploadResult) {
      throw new Error('画像のアップロードに失敗しました');
    }
    
    lastUploadedImage = uploadResult;
    hideLoading();
    showConfirmModal(uploadResult);
    
  } catch (error) {
    console.error('Order error:', error);
    hideLoading();
    showToast('エラーが発生しました: ' + error.message);
  }
}

function drawLogoMark(ctx, cx, cy, scale, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  
  // SVGのviewBox "0 0 400 400" を基準に、中心を(200,200)として描画
  ctx.translate(-200, -200);
  
  ctx.fillStyle = color;
  ctx.beginPath();
  
  // 708works ロゴのSVGパス
  ctx.moveTo(243.84,150.57);
  ctx.bezierCurveTo(257.23,136.95,279.84,114.12,311.74,82);
  ctx.bezierCurveTo(310.38,81.77,309.02,81.41,307.69,80.89);
  ctx.bezierCurveTo(307.51,80.82,307.33,80.77,307.16,80.7);
  ctx.bezierCurveTo(306.38,80.37,305.64,79.99,304.92,79.58);
  ctx.bezierCurveTo(304.49,79.33,304.09,79.05,303.69,78.77);
  ctx.bezierCurveTo(303.43,78.6,303.16,78.43,302.92,78.25);
  ctx.bezierCurveTo(302.42,77.87,301.95,77.46,301.49,77.05);
  ctx.bezierCurveTo(301.37,76.94,301.24,76.84,301.12,76.73);
  ctx.bezierCurveTo(300.66,76.29,300.21,75.81,299.79,75.33);
  ctx.bezierCurveTo(297.32,72.51,295.62,69.09,294.91,65.43);
  ctx.bezierCurveTo(289.14,71.83,281.13,80.58,270.86,91.7);
  ctx.bezierCurveTo(265.4,97.59,262.04,101.2,260.83,102.54);
  ctx.lineTo(261.99,103.51);
  ctx.bezierCurveTo(269.74,95.32,274.52,90.5,276.32,89.04);
  ctx.bezierCurveTo(278.12,87.59,279.52,87.29,280.53,88.15);
  ctx.lineTo(289.07,95.32);
  ctx.lineTo(266.02,116.78);
  ctx.bezierCurveTo(254.68,127.32,244.3,137.02,234.81,145.94);
  ctx.bezierCurveTo(234.78,145.94,234.76,145.92,234.73,145.91);
  ctx.bezierCurveTo(219.79,139.59,205.53,138.16,191.97,141.61);
  ctx.bezierCurveTo(178.4,145.06,169.35,152.16,164.8,162.91);
  ctx.bezierCurveTo(160.33,173.51,161.5,186.17,168.34,200.96);
  ctx.bezierCurveTo(145.41,202.27,130.45,203.8,123.47,205.56);
  ctx.bezierCurveTo(114.47,207.76,107.22,210.87,101.74,214.88);
  ctx.bezierCurveTo(96.25,218.9,92.41,223.49,90.23,228.66);
  ctx.bezierCurveTo(86.95,236.39,87.79,245.18,92.76,254.99);
  ctx.bezierCurveTo(97.72,264.79,107.66,272.85,122.61,279.18);
  ctx.bezierCurveTo(140.87,286.9,158.39,288.6,175.21,284.26);
  ctx.bezierCurveTo(192.02,279.91,202.99,271.7,208.1,259.62);
  ctx.bezierCurveTo(213.39,247.12,210.22,230.07,198.65,208.46);
  ctx.bezierCurveTo(217.02,208.58,232.12,206.22,243.94,201.38);
  ctx.bezierCurveTo(252.93,197.73,258.81,192.59,261.6,186.02);
  ctx.bezierCurveTo(264.4,179.43,263.36,172.27,258.5,164.52);
  ctx.bezierCurveTo(255.12,159.12,250.21,154.48,243.85,150.55);
  ctx.lineTo(243.85,150.52);
  ctx.lineTo(243.84,150.52);
  ctx.closePath();
  
  ctx.moveTo(184.04,191.4);
  ctx.bezierCurveTo(185.62,187.69,188.1,184.15,191.53,180.77);
  ctx.bezierCurveTo(194.94,177.39,197.96,175.36,200.62,174.67);
  ctx.bezierCurveTo(202.19,174.26,203.61,174.15,204.91,174.26);
  ctx.bezierCurveTo(196.31,182.51,189.98,189.64,183.95,195.64);
  ctx.bezierCurveTo(184.03,194.36,184.39,192.96,185.04,191.4);
  ctx.closePath();
  
  ctx.moveTo(232.08,155.2);
  ctx.bezierCurveTo(224.66,162.54,217.85,169.3,211.7,175.45);
  ctx.bezierCurveTo(210.99,175.06,210.26,174.69,209.47,174.35);
  ctx.bezierCurveTo(215.73,168.17,222.66,161.39,230.25,154.02);
  ctx.bezierCurveTo(230.88,154.4,231.49,154.8,232.09,155.2);
  ctx.closePath();
  
  ctx.moveTo(184.27,200.31);
  ctx.bezierCurveTo(184.22,200.19,184.16,200.06,184.11,199.94);
  ctx.bezierCurveTo(190.55,193.23,198.67,185.03,208.44,175.36);
  ctx.bezierCurveTo(209.19,175.77,209.83,176.25,210.36,176.79);
  ctx.bezierCurveTo(200.41,186.72,192.16,195.04,185.6,201.75);
  ctx.bezierCurveTo(185.11,201.33,184.66,200.86,184.27,200.31);
  ctx.closePath();
  
  ctx.moveTo(186.9,205.14);
  ctx.bezierCurveTo(186.76,205.14,186.63,205.17,186.5,205.18);
  ctx.bezierCurveTo(186.46,205.1,186.43,205.03,186.39,204.94);
  ctx.bezierCurveTo(186.56,205.01,186.73,205.07,186.9,205.13);
  ctx.closePath();
  
  ctx.moveTo(203,197.97);
  ctx.bezierCurveTo(199.36,201.22,196.04,203.07,193.02,203.55);
  ctx.bezierCurveTo(192.84,203.58,192.67,203.58,192.5,203.6);
  ctx.bezierCurveTo(197.97,197.82,204.51,191,212.13,183.11);
  ctx.bezierCurveTo(211.97,184.29,211.65,185.54,211.08,186.89);
  ctx.bezierCurveTo(209.35,191.01,206.65,194.71,203.01,197.97);
  ctx.closePath();
  
  ctx.moveTo(189.97,203.6);
  ctx.bezierCurveTo(189.12,203.5,188.3,203.3,187.53,202.97);
  ctx.bezierCurveTo(187.5,202.97,187.48,202.94,187.46,202.93);
  ctx.bezierCurveTo(193.84,196.26,201.85,188.01,211.44,178.26);
  ctx.bezierCurveTo(211.52,178.41,211.62,178.55,211.68,178.71);
  ctx.bezierCurveTo(211.96,179.37,212.1,180.09,212.18,180.82);
  ctx.bezierCurveTo(203.42,189.74,196.01,197.34,189.97,203.6);
  ctx.closePath();
  
  ctx.moveTo(213.26,176.41);
  ctx.bezierCurveTo(219.34,170.23,226.05,163.46,233.37,156.1);
  ctx.bezierCurveTo(233.99,156.56,234.6,157.03,235.17,157.53);
  ctx.bezierCurveTo(227.9,164.87,221.22,171.64,215.16,177.8);
  ctx.bezierCurveTo(214.58,177.31,213.93,176.86,213.25,176.42);
  ctx.closePath();
  
  ctx.moveTo(271.48,121);
  ctx.bezierCurveTo(261.1,131.41,251.53,141.03,242.74,149.89);
  ctx.bezierCurveTo(242.08,149.5,241.38,149.14,240.69,148.77);
  ctx.bezierCurveTo(251.6,137.88,268.8,120.84,292.28,97.67);
  ctx.lineTo(293.58,98.82);
  ctx.lineTo(271.48,121);
  ctx.closePath();
  
  ctx.moveTo(290.88,96.58);
  ctx.lineTo(291.29,96.94);
  ctx.lineTo(268.93,118.89);
  ctx.bezierCurveTo(258.21,129.41,248.36,139.11,239.33,148.04);
  ctx.bezierCurveTo(238.71,147.72,238.06,147.42,237.41,147.12);
  ctx.bezierCurveTo(248.57,136.42,266.4,119.58,290.89,96.58);
  ctx.closePath();
  
  ctx.moveTo(180.37,163.83);
  ctx.bezierCurveTo(183.51,156.47,189.48,151.57,198.21,149.13);
  ctx.bezierCurveTo(206.95,146.69,215.95,147.46,225.19,151.43);
  ctx.bezierCurveTo(226.05,151.8,226.88,152.2,227.69,152.6);
  ctx.bezierCurveTo(219.77,160.08,212.55,166.93,206.05,173.15);
  ctx.bezierCurveTo(203.59,172.52,200.96,172.26,198.12,172.42);
  ctx.bezierCurveTo(194.08,172.67,189.9,174.18,185.56,177);
  ctx.bezierCurveTo(182.78,178.8,180.59,180.92,178.87,183.27);
  ctx.bezierCurveTo(177.53,175.75,178.01,169.26,180.36,163.85);
  ctx.closePath();
  
  ctx.moveTo(189.04,260.65);
  ctx.bezierCurveTo(187.23,266.42,183.43,271.51,177.63,275.99);
  ctx.bezierCurveTo(171.84,280.44,165.16,283.18,157.59,284.22);
  ctx.bezierCurveTo(150.02,285.25,142.71,284.65,135.67,282.43);
  ctx.bezierCurveTo(125.97,279.37,118.66,274.17,113.74,266.84);
  ctx.bezierCurveTo(108.82,259.49,107.56,252.02,109.98,244.41);
  ctx.bezierCurveTo(112.5,236.41,118.11,229.59,126.82,223.97);
  ctx.bezierCurveTo(135.12,218.6,149.36,213.72,169.53,209.31);
  ctx.bezierCurveTo(161.87,217.31,155.19,224.69,149.53,231.43);
  ctx.bezierCurveTo(146.35,235.22,143.87,238.52,142.06,241.41);
  ctx.bezierCurveTo(140.25,244.27,139.57,245.9,140.03,246.3);
  ctx.bezierCurveTo(140.56,246.75,142.21,245.66,144.94,243.08);
  ctx.bezierCurveTo(147.69,240.48,153.54,234.06,162.49,223.82);
  ctx.bezierCurveTo(166.71,218.99,170.51,214.71,173.91,210.95);
  ctx.bezierCurveTo(174.27,211.55,174.63,212.16,174.98,212.75);
  ctx.bezierCurveTo(167.25,220.85,160.41,228.24,154.5,234.92);
  ctx.bezierCurveTo(151.22,238.59,148.59,241.76,146.54,244.46);
  ctx.bezierCurveTo(144.5,247.14,143.6,248.6,143.85,248.83);
  ctx.bezierCurveTo(144.14,249.09,145.63,247.89,148.3,245.25);
  ctx.bezierCurveTo(150.97,242.6,156.87,236.25,166.01,226.17);
  ctx.bezierCurveTo(169.77,222.03,173.17,218.31,176.26,214.95);
  ctx.bezierCurveTo(176.64,215.6,176.99,216.23,177.35,216.87);
  ctx.bezierCurveTo(170.12,224.55,163.67,231.58,158.05,237.91);
  ctx.bezierCurveTo(154.78,241.6,152.12,244.76,150.04,247.43);
  ctx.bezierCurveTo(147.96,250.08,147.03,251.52,147.25,251.7);
  ctx.bezierCurveTo(147.5,251.92,148.94,250.68,151.59,248.01);
  ctx.bezierCurveTo(154.22,245.35,160.11,238.96,169.24,228.87);
  ctx.bezierCurveTo(172.57,225.19,175.63,221.82,178.43,218.76);
  ctx.bezierCurveTo(183.82,228.41,187.25,236.03,188.69,241.62);
  ctx.bezierCurveTo(190.6,249.03,190.73,255.37,189.04,260.67);
  ctx.closePath();
  
  ctx.moveTo(243.59,184.13);
  ctx.bezierCurveTo(241.47,189.06,236.63,193.27,229.10,196.73);
  ctx.bezierCurveTo(224.92,198.66,218.69,200.38,210.42,201.9);
  ctx.bezierCurveTo(214.33,199.33,217.15,196.07,218.83,192.09);
  ctx.bezierCurveTo(220.48,188.18,220.38,184.7,218.53,181.61);
  ctx.bezierCurveTo(217.93,180.61,217.15,179.69,216.27,178.82);
  ctx.bezierCurveTo(222.28,172.61,228.9,165.81,236.13,158.42);
  ctx.bezierCurveTo(238.54,160.66,240.54,163.18,242.08,166.02);
  ctx.bezierCurveTo(245.54,172.38,246.04,178.42,243.59,184.13);
  ctx.closePath();
  
  ctx.fill();
  ctx.restore();
}

function isLightColor(hex) {
  const r = parseInt(hex.substr(1,2), 16);
  const g = parseInt(hex.substr(3,2), 16);
  const b = parseInt(hex.substr(5,2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function drawDropSave(ctx, cx, y, color, w, h, isEndPin, isBodyPin) {
  const hw = w / 2;
  const top = y;
  const bot = y + h;
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, top + 1);
  ctx.bezierCurveTo(cx + hw * .55, top + h * .12, cx + hw, top + h * .45, cx + hw, bot - hw * .85);
  ctx.bezierCurveTo(cx + hw, bot, cx - hw, bot, cx - hw, bot - hw * .85);
  ctx.bezierCurveTo(cx - hw, top + h * .45, cx - hw * .55, top + h * .12, cx, top + 1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  
  const g = ctx.createLinearGradient(cx, top, cx, bot);
  g.addColorStop(0, 'rgba(255,255,255,.22)');
  g.addColorStop(.4, 'rgba(255,255,255,.06)');
  g.addColorStop(1, 'rgba(0,0,0,.15)');
  ctx.fillStyle = g;
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  
  if (isEndPin) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, top + hw * .52, hw * .20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, top + hw * .52, hw * .20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  
  if (isBodyPin) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, bot - hw * .52, hw * .20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, bot - hw * .52, hw * .20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  
  ctx.restore();
}

function buildSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;
  const sPW = 50, sPH = 62, sOVL = 20, sPAD = 8;
  const totalH = sPAD + N * sPH - (N - 1) * sOVL + sPAD;
  const ch = totalH + 150;
  
  cv.width = cw;
  cv.height = ch;
  
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, cw, ch);
  
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOLKLORE', cw / 2, 22);
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 38);
  
  ctx.fillStyle = '#444';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ 後ろ（エンドピン側）', cw / 2, 62);
  
  const scx = cw / 2 - 22;
  const sy0 = 70;
  
  for (let i = 0; i < N; i++) {
    const y = sy0 + sPAD + i * (sPH - sOVL);
    const frontNum = N - i;
    drawDropSave(ctx, scx, y, partColors[i], sPW, sPH, i === 0, i === N - 1);
    
    if (frontNum === 3) {
      const logoColor = isLightColor(partColors[i])
        ? 'rgba(0,0,0,0.25)'
        : 'rgba(255,255,255,0.35)';
      drawLogoMark(ctx, scx, y + sPH * 0.55, 0.12, logoColor);
    }
    
    ctx.fillStyle = '#bbb';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`P${frontNum}`, scx + sPW / 2 + 16, y + sPH * .52 + 3);
    
    const cname = COLORS.find(c => c.hex === partColors[i])?.name || '';
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cname, scx + sPW / 2 + 20, y + sPH * .52 + 3);
  }
  
  const endY = sy0 + sPAD + N * sPH - (N - 1) * sOVL + sPAD + 10;
  ctx.fillStyle = '#444';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 前（ボディ上部側）', cw / 2, endY);
  
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(0, ch - 28, cw, 28);
  ctx.fillStyle = '#888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('shop.708works.jp', cw / 2, ch - 10);
  
  return cv;
}

// ============================================================================
// R2アップロード
// ============================================================================

async function uploadOrderImage(canvas){
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const orderId = `folklore-${Date.now()}`;
  
  const formData = new FormData();
  formData.append('image', blob, `${orderId}.png`);
  formData.append('orderId', orderId);
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    
    return {
      imageUrl: data.imageUrl,
      orderId: orderId
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

// ============================================================================
// 確認モーダル
// ============================================================================

function showConfirmModal(uploadResult){
  const modal = document.getElementById('confirm-modal');
  const modalImage = document.getElementById('modal-image');
  const modalInfo = document.getElementById('modal-info');
  
  if (!modal || !modalImage || !modalInfo) return;
  
  modalImage.src = uploadResult.imageUrl;
  
  const price = PRICE_MAP[N];
  const colorSummary = generateColorSummary();
  
  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>ウロコパーツ数:</strong> ${N}個</p>
    <p><strong>全長:</strong> 約${1150 + (N - 20) * 60}mm</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${colorSummary}</div>
    <p style="margin-top:12px;font-size:11px;color:#999;">
      ※ この内容で注文を確定する場合は「カートへ進む」をクリックしてください
    </p>
  `;
  
  modal.classList.add('show');
}

function closeModal(){
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.remove('show');
}

function generateColorSummary(){
  const lines = partColors.slice().reverse().map((hex, i) => {
    const name = COLORS.find(c => c.hex === hex)?.name || hex;
    const pos = i === 0 ? ' [前/ボディ上部側]' : i === N - 1 ? ' [後ろ/エンドピン側]' : '';
    return `P${String(i + 1).padStart(2, '0')}${pos}: ${name}`;
  });
  return lines.join('<br>');
}

// ============================================================================
// Shopifyカート追加
// ============================================================================

async function proceedToCart(){
  if (!lastUploadedImage) {
    showToast('画像情報が見つかりません');
    return;
  }
  
  closeModal();
  showLoading('カートに追加中...');
  
  try {
    // カラーデータ作成（英語版）
    const colorDataJP = partColors.slice().reverse().map((hex, i) => {
      const name = COLORS.find(c => c.hex === hex)?.name || hex;
      const pos = i === 0 ? ' [前/ボディ上部側]' : i === N - 1 ? ' [後ろ/エンドピン側]' : '';
      return `P${String(i + 1).padStart(2, '0')}${pos}: ${name}`;
    }).join('\n');
    
    // Shopify用：完全英語版（改行なし、カンマ区切り）
    const colorDataEN = partColors.slice().reverse().map((hex, i) => {
      const name = COLORS.find(c => c.hex === hex)?.name || hex;
      let pos = '';
      if (i === 0) pos = '[Front]';
      else if (i === N - 1) pos = '[Back]';
      return `P${String(i + 1).padStart(2, '0')}${pos}:${name}`;
    }).join(', '); // カンマ区切り1行に
    
    const price = PRICE_MAP[N];
    const variantId = VARIANT_MAP[N];
    
    console.log('=== カート追加デバッグ情報 ===');
    console.log('ウロコ数:', N);
    console.log('Variant ID:', variantId);
    console.log('価格:', price);
    
    if (!variantId) {
      throw new Error('該当するバリエーションが見つかりません');
    }
    
    // 最終手段：FormDataでPOST送信（非表示iframe経由）
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://shop.708works.jp/cart/add';
    form.style.display = 'none';
    
    // ID
    const inputId = document.createElement('input');
    inputId.type = 'hidden';
    inputId.name = 'id';
    inputId.value = variantId;
    form.appendChild(inputId);
    
    // Quantity
    const inputQty = document.createElement('input');
    inputQty.type = 'hidden';
    inputQty.name = 'quantity';
    inputQty.value = '1';
    form.appendChild(inputQty);
    
    // Properties - シンプルに最小限のみ
    const props = {
      '_Order': lastUploadedImage.orderId,
      '_Parts': `${N}pcs`,
      '_Length': `${1150 + (N - 20) * 60}mm`,
      '_Colors': colorDataEN,
      '_Image': lastUploadedImage.imageUrl
    };
    
    Object.entries(props).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `properties[${key}]`;
      input.value = value;
      form.appendChild(input);
    });
    
    console.log('送信データ:', {
      id: variantId,
      quantity: 1,
      properties: props
    });
    
    document.body.appendChild(form);
    
    hideLoading();
    showToast('カートに追加します...');
    
    // フォーム送信
    setTimeout(() => {
      form.submit();
    }, 500);
    
  } catch (error) {
    console.error('=== カート追加エラー ===');
    console.error('エラー詳細:', error);
    console.error('スタックトレース:', error.stack);
    hideLoading();
    showToast('カート追加に失敗しました: ' + error.message);
  }
}
