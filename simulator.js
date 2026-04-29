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
    ctx.fillStyle='rgba(255,255,255,.80)';
    ctx.font=`bold ${Math.max(5,PH*.11)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(badge,cx,top+PH*.58);
  }
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
    dot.style.background=c.hex;
    dot.dataset.id=c.id;
    
    const nm=document.createElement('div');
    nm.className='color-name'+(c.id===activeColor.id?' on':'');
    nm.textContent=c.name;
    
    wrap.appendChild(dot);
    wrap.appendChild(nm);
    
    wrap.onclick=()=>{
      activeColor=c;
      document.querySelectorAll('.cb').forEach(b=>b.classList.toggle('on',b.dataset.id===c.id));
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
  ctx.fillStyle = color;
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('708', 0, 0);
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
