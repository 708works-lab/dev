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

window.addEventListener('load',()=>{
  buildPalette();
  buildGrads();
  updateSummary();
  buildStrapRows();
  updatePriceDisplay();
});

window.addEventListener('resize',()=>buildStrapRows());

// ============================================================================
// 価格表示
// ============================================================================

function updatePriceDisplay(){
  const price = PRICE_MAP[N];
  document.getElementById('price-display').textContent = `¥${price.toLocaleString()}（税込）`;
}

// ============================================================================
// 履歴管理
// ============================================================================

function saveHistory(){
  history.push({colors:[...partColors],n:N});
  if(history.length>30) history.shift();
  document.getElementById('btn-undo').disabled=false;
}

function undo(){
  if(!history.length)return;
  const prev=history.pop();
  N=prev.n; partColors=prev.colors;
  selected.clear();
  updateCountDisplay();
  updatePriceDisplay();
  document.getElementById('sel-info').textContent='パーツをタップ';
  buildStrapRows(); updateSummary();
  if(!history.length) document.getElementById('btn-undo').disabled=true;
}

// ============================================================================
// カウント表示
// ============================================================================

function updateCountDisplay(){
  document.getElementById('cnt-disp').textContent=N+'個';
  const diff=N-20, len=1150+diff*60;
  const txt=diff===0?'標準':diff>0?`標準より${diff}個多い`:`標準より${Math.abs(diff)}個少ない`;
  document.getElementById('cnt-sub').textContent=`${txt}（全長 約${len}mm）`;
}

function changeCount(d){
  const nx=N+d; if(nx<10||nx>30)return;
  saveHistory(); N=nx;
  if(d>0) for(let k=0;k<d;k++) partColors.push('#c46030');
  else partColors=partColors.slice(0,N);
  selected.clear();
  document.getElementById('sel-info').textContent='パーツをタップ';
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
  document.getElementById('m-'+m).classList.add('on');
  if(m==='all'){
    selected.clear(); for(let i=0;i<N;i++) selected.add(i);
    document.getElementById('sel-info').innerHTML=`全 <b>${N}枚</b>`;
  }else{
    selected.clear();
    document.getElementById('sel-info').textContent='パーツをタップ';
  }
  redrawAll();
}

function updateSelInfo(){
  const el=document.getElementById('sel-info');
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
  COLORS.forEach(c=>{
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
    wrap.appendChild(dot); wrap.appendChild(nm);
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
}

// ============================================================================
// グラデーション
// ============================================================================

function buildGrads(){
  const row=document.getElementById('grad-row');
  GRADS.forEach(g=>{
    const btn=document.createElement('button');
    btn.className='gb'; btn.textContent=g.name;
    btn.onclick=()=>{saveHistory();for(let i=0;i<N;i++)partColors[i]=g.fn(i);redrawAll();updateSummary();};
    row.appendChild(btn);
  });
}

// ============================================================================
// サマリー
// ============================================================================

function updateSummary(){
  const el=document.getElementById('summary');
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
  document.getElementById('sel-info').textContent='パーツをタップ';
  buildStrapRows(); updateSummary();
}

// ============================================================================
// トースト
// ============================================================================

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ============================================================================
// ローディング
// ============================================================================

function showLoading(text='処理中...'){
  document.getElementById('loading-text').textContent=text;
  document.getElementById('loading-overlay').classList.add('show');
}

function hideLoading(){
  document.getElementById('loading-overlay').classList.remove('show');
}

// ============================================================================
// 画像保存（ダウンロード）
// ============================================================================

async function saveImage(){
  const cv=document.getElementById('save-canvas');
  const dpr=2, cw=320;
  const sPW=44,sPH=54,sOVL=18,sPAD=6;
  const strapH=sPAD+N*sPH-(N-1)*sOVL+sPAD;
  const ch=56+14+strapH+20+40;
  cv.width=cw*dpr; cv.height=ch*dpr;
  const ctx=cv.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.fillStyle='#f0ede8'; ctx.fillRect(0,0,cw,ch);
  ctx.fillStyle='#111'; ctx.fillRect(0,0,cw,48);
  ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  ctx.fillText('708works — FOLKLORE',cw/2,22);
  ctx.font='9px sans-serif'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.fillText('COLOR ORDER SIMULATOR',cw/2,38);
  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▲ 後ろ（エンドピン側）',cw/2,62);
  const scx=cw/2-22, sy0=70;
  for(let i=0;i<N;i++){
    const y=sy0+sPAD+i*(sPH-sOVL);
    const frontNum=N-i;
    drawDropSave(ctx,scx,y,partColors[i],sPW,sPH,i===0,i===N-1);
    if(frontNum===3){
      const logoColor = isLightColor(partColors[i])
        ? 'rgba(0,0,0,0.25)'
        : 'rgba(255,255,255,0.35)';
      drawLogoMark(ctx, scx, y+sPH*0.55, 0.12, logoColor);
    }
    ctx.fillStyle='#bbb'; ctx.font='7px sans-serif'; ctx.textAlign='right';
    ctx.fillText(`P${frontNum}`,scx+sPW/2+16,y+sPH*.52+3);
    const cname=COLORS.find(c=>c.hex===partColors[i])?.name||'';
    ctx.fillStyle='#333'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText(cname,scx+sPW/2+20,y+sPH*.52+3);
  }
  const endY=sy0+sPAD+N*sPH-(N-1)*sOVL+sPAD+10;
  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▼ 前（ボディ上部側）',cw/2,endY);
  ctx.fillStyle='rgba(0,0,0,.1)'; ctx.fillRect(0,ch-28,cw,28);
  ctx.fillStyle='#888'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('shop.708works.jp',cw/2,ch-10);

  const blob = await new Promise(r=>cv.toBlob(r,'image/png'));
  const file = new File([blob],'folklore-color-order.png',{type:'image/png'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file], title:'FOLKLORE カラーオーダー'});
      return;
    }catch(e){
      if(e.name==='AbortError') return;
    }
  }
  const a=document.createElement('a');
  a.download='folklore-color-order.png';
  a.href=cv.toDataURL('image/png');
  a.click();
  showToast('画像を保存しました');
}

function isLightColor(hex){
  const r=parseInt(hex.slice(1,3),16);
  const g=parseInt(hex.slice(3,5),16);
  const b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 128;
}

function drawLogoMark(ctx, cx, cy, scale, color){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-200, -200);
  ctx.fillStyle = color;
  const path = new Path2D("M243.84,150.57c13.39-13.62,36-36.45,67.9-68.57-1.36-.23-2.72-.59-4.05-1.11-.18-.07-.36-.12-.53-.19-.78-.33-1.52-.71-2.24-1.12-.43-.25-.83-.53-1.23-.81-.26-.17-.53-.34-.77-.52-.5-.38-.97-.79-1.43-1.2-.12-.11-.25-.21-.37-.32-.46-.44-.91-.92-1.33-1.4-2.47-2.82-4.17-6.24-4.88-9.9-5.77,6.4-13.78,15.15-24.05,26.27-5.46,5.89-8.82,9.5-10.03,10.84l1.16.97c7.75-8.19,12.53-13.01,14.33-14.47,1.8-1.45,3.2-1.75,4.21-.89l8.54,7.17-23.05,21.46c-11.34,10.54-21.72,20.24-31.21,29.16-.03,0-.05-.02-.08-.03-14.94-6.32-29.2-7.75-42.76-4.3-13.57,3.45-22.62,10.55-27.17,21.3-4.47,10.6-3.3,23.26,3.54,38.05-22.93,1.31-37.89,2.84-44.87,4.6-9,2.2-16.25,5.31-21.73,9.32-5.49,4.02-9.33,8.61-11.51,13.78-3.28,7.73-2.44,16.52,2.53,26.34,4.96,9.8,14.9,17.86,29.85,24.19,18.26,7.72,35.78,9.42,52.6,5.08,16.81-4.35,27.78-12.56,32.89-24.64,5.29-12.5,2.12-29.55-9.45-51.16,18.37.12,33.47-2.24,45.29-7.08,8.99-3.65,14.87-8.79,17.66-15.36,2.8-6.59,1.76-13.75-3.1-21.5-3.38-5.4-8.29-10.04-14.65-13.93v-.03ZM184.04,191.4c1.58-3.71,4.06-7.25,7.49-10.63,3.41-3.38,6.43-5.41,9.09-6.1,1.57-.41,2.99-.52,4.29-.41-8.6,8.25-15.93,15.38-21.96,21.38.08-1.28.44-2.68,1.09-4.24h0ZM232.08,155.2c-7.42,7.34-14.23,14.1-20.38,20.25-.71-.39-1.44-.76-2.23-1.1,6.26-6.18,13.19-12.96,20.78-20.33.63.38,1.24.78,1.84,1.18h0ZM184.27,200.31c-.05-.12-.11-.25-.16-.37,6.44-6.71,14.56-14.91,24.33-24.58.75.41,1.39.89,1.92,1.43-9.95,9.93-18.2,18.25-24.76,24.96-.49-.42-.94-.89-1.33-1.44ZM186.9,205.14c-.14,0-.27.03-.4.04-.04-.08-.07-.15-.11-.24.17.07.34.13.51.19h0ZM203,197.97c-3.64,3.25-6.96,5.1-9.98,5.58-.18.03-.35.03-.52.05,5.47-5.78,12.01-12.6,19.63-20.49-.16,1.18-.48,2.43-1.05,3.78-1.73,4.12-4.43,7.82-8.07,11.08h-.01ZM189.97,203.6c-.85-.1-1.67-.3-2.44-.63-.03,0-.05-.03-.07-.04,6.38-6.67,14.39-14.92,23.98-24.67.08.15.18.29.24.45.28.66.42,1.38.5,2.11-8.76,8.92-16.17,16.52-22.21,22.78ZM213.26,176.41c6.08-6.18,12.79-12.95,20.11-20.31.62.46,1.23.93,1.8,1.43-7.27,7.34-13.95,14.11-20.01,20.27-.58-.49-1.23-.94-1.91-1.38h0ZM271.48,121c-10.38,10.41-19.95,20.03-28.74,28.89-.66-.39-1.36-.75-2.05-1.12,10.91-10.89,28.11-27.93,51.59-51.1l1.3,1.15-22.1,22.18h0ZM290.88,96.58l.41.36-22.36,21.95c-10.72,10.52-20.57,20.22-29.6,29.15-.62-.32-1.27-.62-1.92-.92,11.16-10.7,28.99-27.54,53.48-50.54h0ZM180.37,163.83c3.14-7.36,9.11-12.26,17.84-14.7,8.74-2.44,17.74-1.67,26.98,2.3.86.37,1.69.77,2.5,1.17-7.92,7.48-15.14,14.33-21.64,20.55-2.46-.63-5.09-.89-7.93-.73-4.04.25-8.22,1.76-12.56,4.58-2.78,1.8-4.97,3.92-6.69,6.27-1.34-7.52-.86-14.01,1.49-19.46v.02ZM189.04,260.65c-1.81,5.77-5.61,10.86-11.41,15.34-5.79,4.45-12.47,7.19-20.04,8.23-7.57,1.03-14.88.43-21.92-1.79-9.7-3.06-17.01-8.26-21.93-15.59-4.92-7.35-6.18-14.82-3.76-22.43,2.52-8,8.13-14.82,16.84-20.44,8.3-5.37,22.54-10.25,42.71-14.66-7.66,8-14.34,15.38-20,22.12-3.18,3.79-5.66,7.09-7.47,9.98-1.81,2.86-2.49,4.49-2.03,4.89.53.45,2.18-.64,4.91-3.22,2.75-2.6,8.6-9.02,17.55-19.26,4.22-4.83,8.02-9.11,11.42-12.87.36.6.72,1.21,1.07,1.8-7.73,8.1-14.57,15.49-20.48,22.17-3.28,3.67-5.91,6.84-7.96,9.54-2.04,2.68-2.94,4.14-2.69,4.37.29.26,1.78-.94,4.45-3.58,2.67-2.65,8.57-9,17.71-19.08,3.76-4.14,7.16-7.86,10.25-11.22.38.65.73,1.28,1.09,1.92-7.23,7.68-13.68,14.71-19.3,21.04-3.27,3.69-5.93,6.85-8.01,9.52-2.08,2.65-3.01,4.09-2.79,4.27.25.22,1.69-1.02,4.34-3.69,2.63-2.66,8.52-9.05,17.65-19.14,3.33-3.68,6.39-7.05,9.19-10.11,5.39,9.65,8.82,17.27,10.26,22.86,1.91,7.41,2.04,13.75.35,19.05v-.02ZM243.59,184.13c-2.12,4.93-6.96,9.14-14.49,12.6-4.18,1.93-10.41,3.65-18.68,5.17,3.91-2.57,6.73-5.83,8.41-9.81,1.65-3.91,1.55-7.39-.3-10.48-.6-1-1.38-1.92-2.26-2.79,6.01-6.21,12.63-13.01,19.86-20.4,2.41,2.24,4.41,4.76,5.95,7.6,3.46,6.36,3.96,12.4,1.51,18.11h0Z");
  ctx.fill(path);
  ctx.restore();
}

function drawDropSave(ctx,cx,y,color,pw,ph,isEndPin,isBodyPin){
  const hw=pw/2,top=y,bot=y+ph;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx,top+1);
  ctx.bezierCurveTo(cx+hw*.55,top+ph*.12,cx+hw,top+ph*.45,cx+hw,bot-hw*.85);
  ctx.bezierCurveTo(cx+hw,bot,cx-hw,bot,cx-hw,bot-hw*.85);
  ctx.bezierCurveTo(cx-hw,top+ph*.45,cx-hw*.55,top+ph*.12,cx,top+1);
  ctx.closePath();
  ctx.fillStyle=color; ctx.fill();
  const g=ctx.createLinearGradient(cx,top,cx,bot);
  g.addColorStop(0,'rgba(255,255,255,.22)'); g.addColorStop(1,'rgba(0,0,0,.15)');
  ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=.8; ctx.stroke();
  if(isEndPin){
    ctx.beginPath(); ctx.arc(cx,top+hw*.52,hw*.30,0,Math.PI*2);
    ctx.fillStyle='#f0ede8'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  if(isBodyPin){
    ctx.beginPath(); ctx.arc(cx,bot-hw*.52,hw*.30,0,Math.PI*2);
    ctx.fillStyle='#f0ede8'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// カート追加（メイン処理）
// ============================================================================

async function goOrder(){
  const orderBtn = document.getElementById('btn-order');
  orderBtn.disabled = true;
  
  try {
    showLoading('画像を生成中...');
    
    // 画像生成
    const canvas = await generateOrderCanvas();
    
    showLoading('画像をアップロード中...');
    
    // R2にアップロード
    const uploadResult = await uploadOrderImage(canvas);
    
    if (!uploadResult) {
      throw new Error('画像のアップロードに失敗しました');
    }
    
    lastUploadedImage = uploadResult;
    
    hideLoading();
    
    // 確認モーダル表示
    showConfirmModal(uploadResult);
    
  } catch (error) {
    console.error('Error:', error);
    hideLoading();
    showToast('エラーが発生しました: ' + error.message);
  } finally {
    orderBtn.disabled = false;
  }
}

// ============================================================================
// 画像生成
// ============================================================================

async function generateOrderCanvas(){
  const cv=document.getElementById('save-canvas');
  const dpr=2, cw=320;
  const sPW=44,sPH=54,sOVL=18,sPAD=6;
  const strapH=sPAD+N*sPH-(N-1)*sOVL+sPAD;
  const ch=56+14+strapH+20+40;
  cv.width=cw*dpr; cv.height=ch*dpr;
  const ctx=cv.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.fillStyle='#f0ede8'; ctx.fillRect(0,0,cw,ch);
  ctx.fillStyle='#111'; ctx.fillRect(0,0,cw,48);
  ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  ctx.fillText('708works — FOLKLORE',cw/2,22);
  ctx.font='9px sans-serif'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.fillText('COLOR ORDER SIMULATOR',cw/2,38);
  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▲ 後ろ（エンドピン側）',cw/2,62);
  const scx=cw/2-22, sy0=70;
  for(let i=0;i<N;i++){
    const y=sy0+sPAD+i*(sPH-sOVL);
    const frontNum=N-i;
    drawDropSave(ctx,scx,y,partColors[i],sPW,sPH,i===0,i===N-1);
    if(frontNum===3){
      const logoColor = isLightColor(partColors[i])
        ? 'rgba(0,0,0,0.25)'
        : 'rgba(255,255,255,0.35)';
      drawLogoMark(ctx, scx, y+sPH*0.55, 0.12, logoColor);
    }
    ctx.fillStyle='#bbb'; ctx.font='7px sans-serif'; ctx.textAlign='right';
    ctx.fillText(`P${frontNum}`,scx+sPW/2+16,y+sPH*.52+3);
    const cname=COLORS.find(c=>c.hex===partColors[i])?.name||'';
    ctx.fillStyle='#333'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText(cname,scx+sPW/2+20,y+sPH*.52+3);
  }
  const endY=sy0+sPAD+N*sPH-(N-1)*sOVL+sPAD+10;
  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▼ 前（ボディ上部側）',cw/2,endY);
  ctx.fillStyle='rgba(0,0,0,.1)'; ctx.fillRect(0,ch-28,cw,28);
  ctx.fillStyle='#888'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('shop.708works.jp',cw/2,ch-10);
  
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
  document.getElementById('confirm-modal').classList.remove('show');
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

