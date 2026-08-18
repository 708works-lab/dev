// ============================================================================
// 設定
// ============================================================================

// Cloudflare Worker URL
const WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';

// Shopify設定
const SHOPIFY_DOMAIN = '708works.jp';

// ウロコ数とVariant IDのマッピング（刻印なし/あり）
const VARIANT_MAP = {
  10: { noeng:'48782492270842', eng:'50128144957690' },
  11: { noeng:'48782492303610', eng:'50128144990458' },
  12: { noeng:'48782492336378', eng:'50128145023226' },
  13: { noeng:'48782492369146', eng:'50128145055994' },
  14: { noeng:'48782492401914', eng:'50128145088762' },
  15: { noeng:'48782492434682', eng:'50128145121530' },
  16: { noeng:'48782492467450', eng:'50128145154298' },
  17: { noeng:'48782492500218', eng:'50128145187066' },
  18: { noeng:'48782492532986', eng:'50128145219834' },
  19: { noeng:'48782492565754', eng:'50128145252602' },
  20: { noeng:'48782492598522', eng:'50128145285370' },
  21: { noeng:'48782492631290', eng:'50128145318138' },
  22: { noeng:'48782492664058', eng:'50128145350906' },
  23: { noeng:'48782492696826', eng:'50128145383674' },
  24: { noeng:'48782492729594', eng:'50128145416442' },
  25: { noeng:'48782492762362', eng:'50128145449210' },
  26: { noeng:'48782492795130', eng:'50128145481978' },
  27: { noeng:'48782492827898', eng:'50128145514746' },
  28: { noeng:'48782492860666', eng:'50128145547514' },
  29: { noeng:'48782492893434', eng:'50128145580282' },
  30: { noeng:'48782492926202', eng:'50128145613050' },
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
let hasDownloadedImage = false; // 画像保存済みフラグ
const PW=40,PH=50,OVL=16,PAD=6,LABEL_W=72;
const PIECE_PITCH=52.593, SVG_VTOP=265, SVG_VLEFT=211, SVG_VW=72;
const SVG_ID_TO_PIECE={
  '_x32_0':20,'_x31_9':19,'_x31_8':18,'_x31_7':17,'_x31_6':16,
  '_x31_5':15,'_x31_4':14,'_x31_3':13,'_x31_2':12,'_x31_1':11,
  '_x31_0':10,'_x39_':9,'_x38_':8,'_x37_':7,'_x36_':6,
  '_x35_':5,'_x34_':4,'_x33_':3,'_x32_':2,'_x31_':1
};

// 表示順序: [20(rear), ...variable..., 9..2(fixed front), 1(front)]
// N>20の場合: [20, extraN-20,...,extra1, 19,...,10, 9..2, 1]
// extra1=rear直下(index1), extra2=その下(index2), ... extraK=piece19直上(indexK)
function getDisplayOrder(n){
  const extra=Math.max(0,n-20);
  const order=[20];
  for(let k=1;k<=extra;k++) order.push('extra'+k);
  const varStart=Math.max(10,30-n);
  for(let p=19;p>=varStart;p--) order.push(p);
  for(let p=9;p>=2;p--) order.push(p);
  order.push(1);
  return order;
}

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
  // カートボタンは常に有効（モーダルで制御）
  
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
  const kokuinAdd = (window.FOLKLORE_KOKUIN_STATE?.enabled && window.FOLKLORE_KOKUIN_PRICE_ADD) || 0;
  el.textContent = `¥${(price + kokuinAdd).toLocaleString()}（税込）`;
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
  saveHistory();
  const N_old=N; N=nx;
  if(d>0){
    // 新ピースを正しい位置に挿入（N>20では最上部variable寄り, N<=20では最下部variable）
    const insertIdx=N_old<20 ? N-10 : N-20;
    partColors.splice(insertIdx,0,'#c46030');
  }else{
    // 削除: N<=20なら最下部variable, N>20なら最上部extra
    const removeIdx=N_old<=20 ? N_old-10 : N_old-20;
    partColors.splice(removeIdx,1);
  }
  selected.clear();
  const selInfo=document.getElementById('sel-info');
  if(selInfo) selInfo.textContent='パーツをタップ';
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
  buildStrapSVG();
}

function buildStrapSVG(){
  const scroll=document.getElementById('strap-scroll');
  const col=document.getElementById('strap-col');
  if(!scroll||!col) return;

  const dispW=PW+10; // 50px
  col.style.width=(dispW+30)+'px'; // 80px (SVGを中央寄せするための余白込み)

  const extraCount=Math.max(0,N-20);
  // フロント固定セクション(1-9)とextra variableセクションのシフト量
  // N<20: 負値(上方向), N=20: 0, N>20: 正値(下方向)
  const shiftFixed=(N-20)*PIECE_PITCH;

  // viewBox: rearピース20の上端から、piece1下端まで
  const vbTop=SVG_VTOP-5;
  const vbBottom=SVG_VTOP+19*PIECE_PITCH+shiftFixed+90;
  const vbH=vbBottom-vbTop;
  const dispH=Math.round(vbH*(dispW/SVG_VW));

  scroll.innerHTML=`<svg id="folklore-strap-svg"
    viewBox="${SVG_VLEFT} ${vbTop.toFixed(1)} ${SVG_VW} ${vbH.toFixed(1)}"
    width="${dispW}" height="${dispH}"
    style="display:block;margin:0 auto;cursor:pointer;touch-action:none;flex-shrink:0;"
    xmlns="http://www.w3.org/2000/svg">${FOLKLORE_SVG_INNER}</svg>`;

  const svg=document.getElementById('folklore-strap-svg');

  // data-piece属性を設定
  Object.entries(SVG_ID_TO_PIECE).forEach(([id,pn])=>{
    const g=svg.querySelector(`#${id}`);
    if(g) g.setAttribute('data-piece',pn);
  });

  // variable SVGピース(10-19)の表示/非表示 + N>20時の下方シフト
  for(let p=10;p<=19;p++){
    const g=svg.querySelector(`[data-piece="${p}"]`);
    if(!g) continue;
    if(N>=30-p){ // このピースを表示する条件
      g.style.display='';
      if(extraCount>0){
        g.setAttribute('transform',`translate(0,${shiftFixed.toFixed(3)})`);
      }else{
        g.removeAttribute('transform');
      }
    }else{
      g.style.display='none';
    }
  }

  // フロント固定セクション(1-9)をshiftFixed分シフト
  for(let p=1;p<=9;p++){
    const g=svg.querySelector(`[data-piece="${p}"]`);
    if(!g) continue;
    g.setAttribute('transform',`translate(0,${shiftFixed.toFixed(3)})`);
  }

  // N>20: extraピースをpiece12をクローンして配置
  // piece12の元のY = SVG_VTOP + (20-12)*PITCH = SVG_VTOP + 8*PITCH
  const PIECE12_ORIG_Y=SVG_VTOP+8*PIECE_PITCH;
  const piece12ref=svg.querySelector('[data-piece="12"]');
  // piece19を基準にinsertBefore（parentNode経由）→ DOM順: piece20→extra1→...→extraK→piece19
  // piece19はsvgの直接の子ではなく<g id="middle">の子なので、parentNodeを使う
  const piece19ref=svg.querySelector('[data-piece="19"]');
  for(let k=1;k<=extraCount;k++){
    if(!piece12ref) continue;
    const targetY=SVG_VTOP+k*PIECE_PITCH;
    const ty=targetY-PIECE12_ORIG_Y;
    const extraG=document.createElementNS('http://www.w3.org/2000/svg','g');
    extraG.setAttribute('data-piece',`extra${k}`);
    extraG.setAttribute('transform',`translate(0,${ty.toFixed(3)})`);
    Array.from(piece12ref.children).forEach(child=>{
      extraG.appendChild(child.cloneNode(true));
    });
    // piece19の親(middleグループ)内でpiece19の直前に挿入
    if(piece19ref && piece19ref.parentNode){
      piece19ref.parentNode.insertBefore(extraG, piece19ref);
    }else{
      (svg.querySelector('#middle')||svg).appendChild(extraG);
    }
  }

  // クリック/タッチイベントをdisplay orderで設定
  const order=getDisplayOrder(N);
  order.forEach((pn,jsIdx)=>{
    const g=svg.querySelector(`[data-piece="${pn}"]`);
    if(!g) return;
    g.addEventListener('click',()=>handleTap(jsIdx));
    g.addEventListener('touchend',e=>{e.preventDefault();handleTap(jsIdx);},{passive:false});
  });

  redrawSVG();
}

function buildStrapCanvas(){
  const scroll=document.getElementById('strap-scroll');
  const col=document.getElementById('strap-col');
  if (!scroll || !col) {
    console.warn('FOLKLORE: strap-scroll or strap-col element not found');
    return;
  }
  col.style.width=(PW+10+LABEL_W)+'px';
  scroll.style.overflow='';
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
  if(document.getElementById('folklore-strap-svg')){ redrawSVG(); } else { redrawCanvas(); }
}

// 革の色から型押しロゴの色を計算（同系色・明度調整）
function _hexToHsl(hex){
  const r=parseInt(hex.slice(1,3),16)/255;
  const g=parseInt(hex.slice(3,5),16)/255;
  const b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0;
  const l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    if(max===r) h=(g-b)/d+(g<b?6:0);
    else if(max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  return [h,s,l];
}
function _hslToHex(h,s,l){
  const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  let r,g,b;
  if(s===0){r=g=b=l;}else{const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}
  const toHex=v=>Math.round(v*255).toString(16).padStart(2,'0');
  return`#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function getLogoColor(hex){
  const [h,s,l]=_hexToHsl(hex);
  // 型押しイメージ: 革色と同じ色相で明度を大きく変化させて視認性を確保
  const newL=l>0.40 ? Math.max(0.05,l-0.30) : Math.min(0.90,l+0.30);
  return _hslToHex(h,s,newL);
}

function redrawSVG(){
  const svg=document.getElementById('folklore-strap-svg');
  if(!svg) return;
  const order=getDisplayOrder(N);
  order.forEach((pn,i)=>{
    const g=svg.querySelector(`[data-piece="${pn}"]`);
    if(!g) return;
    const logoCol=getLogoColor(partColors[i]);
    g.querySelectorAll('path').forEach(p=>{
      if(p.id==='logo'){p.setAttribute('fill',logoCol);return;}
      p.setAttribute('fill',partColors[i]);
      p.setAttribute('stroke',selected.has(i)?'#ffd700':'#000');
      p.setAttribute('stroke-width',selected.has(i)?'3.5':'0.5');
      p.setAttribute('stroke-miterlimit','10');
    });
  });
  if (typeof applyFolkloreKokuinColors === 'function') applyFolkloreKokuinColors();
}

function setSvgPieceColor(svgPn, color, isSel){
  const svg=document.getElementById('folklore-strap-svg');
  if(!svg) return;
  const g=svg.querySelector(`[data-piece="${svgPn}"]`);
  if(!g) return;
  g.querySelectorAll('path').forEach(p=>{
    if(p.id==='logo') return; // 708worksロゴは金色のまま
    p.setAttribute('fill', color);
    p.setAttribute('stroke', isSel ? '#ffd700' : '#000');
    p.setAttribute('stroke-width', isSel ? '3.5' : '0.5');
    p.setAttribute('stroke-miterlimit','10');
  });
}

function redrawCanvas(){
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
  if (typeof applyFolkloreKokuinColors === 'function') applyFolkloreKokuinColors();
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
    partColors[i]=activeColor.hex; 
    updateSummary();
    // 色を変更したので画像保存フラグをリセット
    hasDownloadedImage = false;
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
    const canvas = await buildSaveCanvas();
    const blob = await new Promise(r => canvas.toBlob(r,'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folklore-strap-${N}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideLoading();
    
    // 画像保存済みフラグを立てる
    hasDownloadedImage = true;
    
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
  if (window.FOLKLORE_KOKUIN_STATE?.enabled && !window.FOLKLORE_KOKUIN_STATE.valid) {
    showToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!hasDownloadedImage) {
    await saveImage();
  }
  showLoading('画像をアップロード中...');
  try {
    const canvas = await buildSaveCanvas();
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

async function buildSaveCanvas() {
  const cv = document.createElement('canvas');
  const cw = 600;

  // SVG描画サイズ（プレビューより少し大きく）
  const svgSaveW = 60;
  const scale = svgSaveW / SVG_VW;

  // buildStrapSVGと同じviewBox高さ計算
  const shiftFixed = (N - 20) * PIECE_PITCH;
  const vbTop = SVG_VTOP - 5;
  const vbBottom = SVG_VTOP + 19 * PIECE_PITCH + shiftFixed + 90;
  const vbH = vbBottom - vbTop;
  const svgSaveH = Math.round(vbH * scale);

  const kokuin = window.FOLKLORE_KOKUIN_STATE;
  const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const kokuinH = kokuinEnabled ? 78 : 0;

  const headerH = 50;
  const topLabelH = 25;
  const bottomLabelH = 25;
  const footerH = 28;
  // ウロコ画像をキャンバス中央に、ラベルは右側に配置
  const svgX = Math.round(cw / 2 - svgSaveW / 2); // SVG中心 = cw/2
  const svgY0 = headerH + topLabelH;
  const ch = svgY0 + svgSaveH + bottomLabelH + kokuinH + footerH + 10;

  cv.width = cw;
  cv.height = ch;

  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, cw, ch);

  // ヘッダー
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, headerH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOLKLORE', cw / 2, 28);
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw / 2, 42);

  // 上部ラベル
  ctx.fillStyle = '#444';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ 後ろ（エンドピン側）', cw / 2, svgY0 - 6);

  // SVGをシリアライズしてCanvasに描画
  const svgEl = document.getElementById('folklore-strap-svg');
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('width', svgSaveW);
    cloned.setAttribute('height', svgSaveH);
    cloned.style.margin = '0';
    const svgStr = new XMLSerializer().serializeToString(cloned);
    // iOS Safari互換: data URIを使用
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, svgX, svgY0, svgSaveW, svgSaveH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  // 下部ラベル
  ctx.fillStyle = '#444';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 前（ボディ上部側）', cw / 2, svgY0 + svgSaveH + 14);

  // 各ピースのカラーラベル（SVG右側に配置）
  const labelX = svgX + svgSaveW + 18;
  const order = getDisplayOrder(N);
  order.forEach((pn, i) => {
    // ピース中心のY座標（viewBox内のpiece位置から計算）
    const pieceY = svgY0 + (5 + (i + 0.5) * PIECE_PITCH) * scale;
    const color = partColors[i];
    const frontNum = N - i;
    const cname = COLORS.find(c => c.hex === color)?.name || '';

    // カラースウォッチ
    ctx.beginPath();
    ctx.arc(labelX + 6, pieceY, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // P番号
    ctx.fillStyle = '#aaa';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`P${String(frontNum).padStart(2, '0')}`, labelX + 16, pieceY - 2);

    // カラー名
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.fillText(cname, labelX + 16, pieceY + 10);
  });

  // 名入れ刻印プレビュー（実際に選んだフォントで描画。あとから見返せるよう保存画像に含める）
  if (kokuinEnabled) {
    const boxMargin = 24;
    const boxX = boxMargin, boxY = svgY0 + svgSaveH + bottomLabelH + 6;
    const boxW = cw - boxMargin * 2, boxH = kokuinH - 12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boxX + 8, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, 8);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, 8);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, 8);
    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('名入れ刻印', boxX + 14, boxY + 18);

    await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(() => {});
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
    ctx.textAlign = 'left';
    ctx.fillText(kokuin.text, boxX + 14, boxY + boxH - 16);
  }

  // フッター
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(0, ch - footerH, cw, footerH);
  ctx.fillStyle = '#888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('708works.jp', cw / 2, ch - 10);

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
  
  const kokuinEnabled0 = !!(window.FOLKLORE_KOKUIN_STATE?.enabled && window.FOLKLORE_KOKUIN_STATE.valid && window.FOLKLORE_KOKUIN_STATE.text);
  const price = PRICE_MAP[N] + (kokuinEnabled0 ? (window.FOLKLORE_KOKUIN_PRICE_ADD || 0) : 0);
  const colorSummary = generateColorSummary();
  const kokuin = window.FOLKLORE_KOKUIN_STATE;
  const kokuinLine = kokuinEnabled0
    ? `<p><strong>名入れ刻印:</strong> ${kokuin.text}（${kokuin.fontLabel}）</p>`
    : '';

  modalInfo.innerHTML = `
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>ウロコパーツ数:</strong> ${N}個</p>
    <p><strong>全長:</strong> 約${1150 + (N - 20) * 60}mm</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    ${kokuinLine}
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${colorSummary}</div>
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
    
    const kokuin = window.FOLKLORE_KOKUIN_STATE;
    const kokuinEnabled = !!(kokuin?.enabled && kokuin.valid && kokuin.text);
    const price = PRICE_MAP[N] + (kokuinEnabled ? (window.FOLKLORE_KOKUIN_PRICE_ADD || 0) : 0);
    const variantId = VARIANT_MAP[N]?.[kokuinEnabled ? 'eng' : 'noeng'];

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
    form.action = 'https://708works.jp/cart/add';
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
    
    // Properties - アンダースコアなしで表示されるように
    const props = {
      'Order ID': lastUploadedImage.orderId,
      'Parts': `${N}pcs`,
      'Length': `${1150 + (N - 20) * 60}mm`,
      'Colors': colorDataEN,
      'Image URL': lastUploadedImage.imageUrl
    };
    if (kokuinEnabled) {
      props['刻印文字'] = kokuin.text;
      props['刻印フォント'] = kokuin.fontLabel;
    }

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
// Auto-generated from folklore_color_order.svg
const FOLKLORE_SVG_INNER = `<g id="rear"> <g id="_x32_0"> <path d="M267.774,308.413c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM240.176,279.228c2.113,0,3.826,1.713,3.826,3.825s-1.702,3.815-3.807,3.825v3.015c.273,0,.494.222.494.496s-.219.495-.494.495-.497-.222-.497-.495.222-.496.497-.496v-3.015c-.006,0-.013,0-.019,0-2.112,0-3.825-1.713-3.825-3.826s1.714-3.825,3.825-3.825ZM253.923,318.21s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path d="M239.698,290.389c0,.273.222.495.497.495s.494-.222.494-.495-.22-.496-.494-.496v.243-.243c-.275,0-.497.222-.497.496Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g> <g id="middle"> <g id="_x31_9"> <path d="M267.774,360.001c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,369.797s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_8"> <path d="M267.774,412.593c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,422.39s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_7"> <path d="M267.774,465.186c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,474.983s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_6"> <path d="M267.774,517.779c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,527.576s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_5"> <path d="M267.774,570.371c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,580.168s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_4"> <path d="M267.774,622.964c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,632.761s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_3"> <path d="M267.774,675.557c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,685.354s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_2"> <path d="M267.774,728.15c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,737.946s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_1"> <path d="M267.774,780.742c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,790.539s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_0"> <path d="M267.774,833.335c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,843.132s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x39_"> <path d="M267.774,885.928c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,895.725s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x38_"> <path d="M267.774,938.52c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,948.317s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x37_"> <path d="M267.774,991.113c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1000.91s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x36_"> <path d="M267.774,1043.706c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1053.503s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x35_"> <path d="M267.774,1096.299c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1106.095s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x34_"> <path d="M267.774,1148.891c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1158.688s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x33_"> <path d="M267.169,1201.484c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.318,1211.281s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path id="logo" d="M244.484,1183.828c1.462-1.487,3.931-3.98,7.414-7.487-.148-.025-.297-.064-.442-.121-.02-.008-.039-.013-.058-.021-.085-.036-.166-.078-.245-.122-.047-.027-.091-.058-.134-.088-.028-.019-.058-.037-.084-.057-.055-.041-.106-.086-.156-.131-.013-.012-.027-.023-.04-.035-.05-.048-.099-.1-.145-.153-.27-.308-.455-.681-.533-1.081-.63.699-1.505,1.654-2.626,2.868-.596.643-.963,1.037-1.095,1.184l.127.106c.846-.894,1.368-1.421,1.565-1.58.197-.158.349-.191.46-.097l.932.783-2.517,2.343c-1.238,1.151-2.372,2.21-3.408,3.184-.003-.001-.005-.002-.009-.003-1.631-.69-3.188-.846-4.669-.47-1.482.377-2.47,1.152-2.967,2.326-.488,1.157-.36,2.54.387,4.155-2.504.143-4.137.31-4.899.502-.983.24-1.774.58-2.373,1.018-.599.439-1.019.94-1.257,1.505-.358.844-.266,1.804.276,2.876.542,1.07,1.627,1.95,3.259,2.641,1.994.843,3.907,1.029,5.743.555,1.835-.475,3.033-1.371,3.591-2.69.578-1.365.231-3.227-1.032-5.586,2.006.013,3.655-.245,4.945-.773.982-.399,1.624-.96,1.928-1.677.306-.72.192-1.501-.338-2.348-.369-.59-.905-1.096-1.6-1.521v-.003ZM237.954,1188.286c.173-.405.443-.792.818-1.161.372-.369.702-.591.993-.666.171-.045.326-.057.468-.045-.939.901-1.739,1.679-2.398,2.334.009-.14.048-.293.119-.463h0ZM243.2,1184.333c-.81.801-1.554,1.54-2.225,2.211-.078-.043-.157-.083-.243-.12.684-.675,1.44-1.415,2.269-2.22.069.041.135.085.201.129h-.001ZM237.98,1189.259c-.005-.013-.012-.027-.017-.04.703-.733,1.59-1.628,2.657-2.684.082.045.152.097.21.156-1.086,1.084-1.987,1.993-2.703,2.725-.054-.046-.103-.097-.145-.157ZM238.267,1189.786c-.015.001-.029.003-.044.004-.004-.009-.008-.016-.012-.026.019.008.037.014.056.021h0ZM240.025,1189.003c-.397.355-.76.557-1.09.609-.02.003-.038.003-.057.005.597-.631,1.311-1.376,2.143-2.237-.017.129-.052.265-.115.413-.189.45-.484.854-.881,1.21h-.001ZM238.602,1189.618c-.093-.011-.182-.033-.266-.069-.003-.001-.005-.003-.008-.004.697-.728,1.571-1.629,2.618-2.694.009.016.02.032.026.049.031.072.046.151.055.23-.956.974-1.766,1.804-2.425,2.487ZM241.145,1186.649c.664-.675,1.397-1.414,2.196-2.218.068.05.134.102.197.156-.794.801-1.523,1.541-2.185,2.213-.063-.054-.134-.103-.209-.151h.001ZM247.502,1180.599c-1.133,1.137-2.178,2.187-3.138,3.154-.072-.043-.148-.082-.224-.122,1.191-1.189,3.069-3.05,5.633-5.58l.142.126-2.413,2.422h0ZM249.62,1177.933l.045.039-2.441,2.397c-1.17,1.149-2.246,2.208-3.232,3.183-.068-.035-.139-.068-.21-.1,1.219-1.168,3.165-3.007,5.839-5.518h-.001ZM237.554,1185.275c.343-.804.995-1.339,1.948-1.605.954-.266,1.937-.182,2.946.251.094.04.185.084.273.128-.865.817-1.653,1.565-2.363,2.244-.269-.069-.556-.097-.866-.08-.441.027-.898.192-1.371.5-.304.197-.543.428-.73.685-.146-.821-.094-1.53.163-2.125v.002ZM238.5,1195.847c-.198.63-.613,1.186-1.246,1.675-.632.486-1.362.785-2.188.899-.827.112-1.625.047-2.393-.195-1.059-.334-1.857-.902-2.394-1.702-.537-.803-.675-1.618-.411-2.449.275-.874.888-1.618,1.839-2.232.906-.586,2.461-1.119,4.663-1.601-.836.874-1.566,1.679-2.184,2.415-.347.414-.618.774-.816,1.09-.198.312-.272.49-.222.534.058.049.238-.07.536-.352.3-.284.939-.985,1.916-2.103.461-.527.876-.995,1.247-1.405.039.066.079.132.117.197-.844.884-1.591,1.691-2.236,2.421-.358.401-.645.747-.869,1.042-.223.293-.321.452-.294.477.032.028.194-.103.486-.391.292-.289.936-.983,1.934-2.083.411-.452.782-.858,1.119-1.225.041.071.08.14.119.21-.789.839-1.494,1.606-2.107,2.297-.357.403-.647.748-.875,1.039-.227.289-.329.447-.305.466.027.024.185-.111.474-.403.287-.29.93-.988,1.927-2.09.364-.402.698-.77,1.003-1.104.589,1.054.963,1.886,1.12,2.496.209.809.223,1.501.038,2.08v-.002ZM244.457,1187.492c-.231.538-.76.998-1.582,1.376-.456.211-1.137.399-2.04.565.427-.281.735-.637.918-1.071.18-.427.169-.807-.033-1.144-.066-.109-.151-.21-.247-.305.656-.678,1.379-1.421,2.168-2.227.263.245.482.52.65.83.378.694.432,1.354.165,1.977h0Z" fill="#c6a06a"/> </g> <g id="_x32_"> <path d="M267.774,1254.077c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1263.874s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g> <g id="front"> <g id="_x31_"> <path d="M267.774,1307.675c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM240.177,1320.048c-2.113,0-3.826-1.713-3.826-3.825s1.702-3.815,3.808-3.825v-3.015c-.273,0-.494-.222-.494-.496s.219-.495.494-.495.497.222.497.495-.222.496-.497.496v3.015c.006,0,.012,0,.019,0,2.112,0,3.825,1.713,3.825,3.826s-1.714,3.825-3.825,3.825Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path d="M240.656,1308.887c0-.273-.222-.495-.497-.495s-.494.222-.494.495.22.496.494.496v-.243.243c.274,0,.497-.222.497-.496Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g>`;
