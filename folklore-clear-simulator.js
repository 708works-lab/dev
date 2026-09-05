// ============================================================================
// folklore Clear ver.（PVC×本革ハイブリッド）カラーシミュレーター
// 本革版 folklore（simulator.js）のSVGアセットとピース配置ロジックを流用しつつ、
// 配色モデルを「PVC本体（2〜19枚目、単色のみ）＋前後の本革（1枚目・20枚目、個別指定可）」に変更。
// 名入れ刻印は本革にしか入れられないため、前側の本革ピース（1枚目）に固定する。
// ============================================================================

const FC_WORKER_URL = 'https://folklore-image-upload.708works.workers.dev';
const FC_SHOPIFY_DOMAIN = '708works.jp';

// ウロコ数とVariant IDのマッピング（刻印なし/あり）
const FC_VARIANT_MAP = {
  10: { noeng:'46634547806458', eng:'50231643930874' },
  11: { noeng:'50231643963642', eng:'50231643996410' },
  12: { noeng:'50231644029178', eng:'50231644061946' },
  13: { noeng:'50231644094714', eng:'50231644127482' },
  14: { noeng:'50231644160250', eng:'50231644193018' },
  15: { noeng:'50231644225786', eng:'50231644258554' },
  16: { noeng:'50231644291322', eng:'50231644324090' },
  17: { noeng:'50231644356858', eng:'50231644389626' },
  18: { noeng:'50231644422394', eng:'50231644455162' },
  19: { noeng:'50231644487930', eng:'50231644520698' },
  20: { noeng:'50231644553466', eng:'50231644586234' },
  21: { noeng:'50231644619002', eng:'50231644651770' },
  22: { noeng:'50231644684538', eng:'50231644717306' },
  23: { noeng:'50231644750074', eng:'50231644782842' },
  24: { noeng:'50231644815610', eng:'50231644848378' },
  25: { noeng:'50231644881146', eng:'50231645110522' },
  26: { noeng:'50231645143290', eng:'50231645176058' },
  27: { noeng:'50231645208826', eng:'50231645241594' },
  28: { noeng:'50231645274362', eng:'50231645307130' },
  29: { noeng:'50231645339898', eng:'50231645372666' },
  30: { noeng:'50231645405434', eng:'50231645438202' },
};

// 価格マップ（標準20個=¥11,638を基準に±¥495/個。名入れ刻印は別建て+¥1,100）
const FC_PRICE_MAP = {
  10: 6688,  11: 7183,  12: 7678,  13: 8173,  14: 8668,
  15: 9163,  16: 9658,  17: 10153, 18: 10648, 19: 11143,
  20: 11638, 21: 12133, 22: 12628, 23: 13123, 24: 13618,
  25: 14113, 26: 14608, 27: 15103, 28: 15598, 29: 16093,
  30: 16588,
};
const FC_KOKUIN_PRICE_ADD = 1100;

// 前後（1枚目・20枚目）用の本革カラー（folklore本革版と共通の20色パレット）
const FC_LEATHER_COLORS=[
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

// 本体(PVC)の色7色（実際のGlobo運用時のスウォッチ色をそのまま採用）
const FC_PVC_COLORS=[
  {id:'cwhite',  name:'Clear White',  hex:'#f0f1f3'},
  {id:'cbrown',  name:'Clear Brown',  hex:'#924e3a'},
  {id:'cblack',  name:'Clear Black',  hex:'#4a5363'},
  {id:'cred',    name:'Clear Red',    hex:'#f66b80'},
  {id:'cgreen',  name:'Clear Green',  hex:'#4cbf94'},
  {id:'cblue',   name:'Clear Blue',   hex:'#59b2be'},
  {id:'cyellow', name:'Clear Yellow', hex:'#fbd173'},
];

// ============================================================================
// グローバル状態
// ============================================================================

let fcN=20;
let fcPvcColor=FC_PVC_COLORS[0];
let fcFrontColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
let fcRearColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
let fcSyncEnds=true;
let fcPartColors=[]; // 表示順(index0=後ろ/20枚目 … indexN-1=前/1枚目)に対応する実際のhex配列
let fcHistory=[];
let fcLastUploadedImage=null;
let fcHasDownloadedImage=false;

const FC_PIECE_PITCH=52.593, FC_SVG_VTOP=265, FC_SVG_VLEFT=211, FC_SVG_VW=72;
const FC_SVG_ID_TO_PIECE={
  '_x32_0':20,'_x31_9':19,'_x31_8':18,'_x31_7':17,'_x31_6':16,
  '_x31_5':15,'_x31_4':14,'_x31_3':13,'_x31_2':12,'_x31_1':11,
  '_x31_0':10,'_x39_':9,'_x38_':8,'_x37_':7,'_x36_':6,
  '_x35_':5,'_x34_':4,'_x33_':3,'_x32_':2,'_x31_':1
};

function fcGetDisplayOrder(n){
  const extra=Math.max(0,n-20);
  const order=[20];
  for(let k=1;k<=extra;k++) order.push('extra'+k);
  const varStart=Math.max(10,30-n);
  for(let p=19;p>=varStart;p--) order.push(p);
  for(let p=9;p>=2;p--) order.push(p);
  order.push(1);
  return order;
}

function fcRebuildPartColors(){
  fcPartColors=Array(fcN).fill(fcPvcColor.hex);
  fcPartColors[0]=fcRearColor.hex;      // 後ろ（エンドピン側）＝20枚目
  fcPartColors[fcN-1]=fcFrontColor.hex; // 前（ボディ上部側）＝1枚目
}

// ============================================================================
// 初期化
// ============================================================================

function initializeFCSimulator(){
  if (window.fcSimulatorInitialized) return;
  const paletteEl=document.getElementById('fc-pvc-palette');
  const strapScrollEl=document.getElementById('strap-scroll');
  if(!paletteEl||!strapScrollEl){
    setTimeout(initializeFCSimulator,100);
    return;
  }
  window.fcSimulatorInitialized=true;
  fcRebuildPartColors();
  fcBuildPvcPalette();
  fcBuildLeatherPalette('fc-leather-palette-front', fcFrontColor, c=>{
    fcFrontColor=c;
    if(fcSyncEnds) fcRearColor=c;
    fcOnColorChange();
  });
  fcBuildLeatherPalette('fc-leather-palette-rear', fcRearColor, c=>{
    fcRearColor=c;
    fcOnColorChange();
  });
  const syncToggle=document.getElementById('fc-sync-toggle');
  if(syncToggle){
    syncToggle.checked=fcSyncEnds;
    syncToggle.addEventListener('change',()=>{
      fcSyncEnds=syncToggle.checked;
      const rearBox=document.getElementById('fc-leather-rear-box');
      if(rearBox) rearBox.hidden=fcSyncEnds;
      fcUpdateFrontLabel();
      if(fcSyncEnds){
        fcRearColor=fcFrontColor;
        fcOnColorChange();
      }
    });
    const rearBox=document.getElementById('fc-leather-rear-box');
    if(rearBox) rearBox.hidden=fcSyncEnds;
  }
  fcUpdateFrontLabel();
  fcUpdateSummary();
  fcBuildStrapSVG();
  fcUpdatePriceDisplay();
  fcUpdateCountDisplay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFCSimulator);
} else {
  initializeFCSimulator();
}

window.addEventListener('resize', () => {
  if (window.fcSimulatorInitialized) fcBuildStrapSVG();
});

function fcUpdateFrontLabel(){
  const label=document.getElementById('fc-leather-front-label');
  if(!label) return;
  label.textContent = fcSyncEnds ? '本革の色（前後共通）' : '本革の色（前／ボディ上部側・1枚目）';
}

function fcOnColorChange(){
  fcSaveHistory();
  fcRebuildPartColors();
  fcRedrawSVG();
  fcUpdateSummary();
  fcHasDownloadedImage=false;
}

// ============================================================================
// 価格・カウント表示
// ============================================================================

function fcUpdatePriceDisplay(){
  const el=document.getElementById('price-display');
  if(!el) return;
  const price=FC_PRICE_MAP[fcN];
  const kokuinAdd=(window.FOLKLORE_KOKUIN_STATE?.enabled && FC_KOKUIN_PRICE_ADD) || 0;
  el.textContent=`¥${(price+kokuinAdd).toLocaleString()}（税込）`;
}

function fcUpdateCountDisplay(){
  const cntDisp=document.getElementById('cnt-disp');
  const cntSub=document.getElementById('cnt-sub');
  if(!cntDisp||!cntSub) return;
  cntDisp.textContent=fcN+'個';
  const diff=fcN-20, len=1150+diff*60;
  const txt=diff===0?'標準':diff>0?`標準より${diff}個多い`:`標準より${Math.abs(diff)}個少ない`;
  cntSub.textContent=`${txt}（全長 約${len}mm）`;
}

function changeCount(d){
  const nx=fcN+d; if(nx<10||nx>30) return;
  fcSaveHistory();
  const N_old=fcN; fcN=nx;
  // 新しいピースは中間(PVC)部分に挿入/削除されるだけなので色配列は毎回作り直せば十分
  fcRebuildPartColors();
  fcUpdateCountDisplay();
  fcUpdatePriceDisplay();
  fcBuildStrapSVG();
  fcUpdateSummary();
  fcHasDownloadedImage=false;
}

// ============================================================================
// 履歴（元に戻す）
// ============================================================================

function fcSaveHistory(){
  fcHistory.push({n:fcN, pvc:fcPvcColor, front:fcFrontColor, rear:fcRearColor, sync:fcSyncEnds});
  if(fcHistory.length>30) fcHistory.shift();
  const btn=document.getElementById('btn-undo');
  if(btn) btn.disabled=false;
}

function undo(){
  if(!fcHistory.length) return;
  const prev=fcHistory.pop();
  fcN=prev.n; fcPvcColor=prev.pvc; fcFrontColor=prev.front; fcRearColor=prev.rear; fcSyncEnds=prev.sync;
  fcRebuildPartColors();
  fcUpdateCountDisplay();
  fcUpdatePriceDisplay();
  fcBuildStrapSVG();
  fcSyncPaletteSelection();
  fcUpdateSummary();
  const rearBox=document.getElementById('fc-leather-rear-box');
  if(rearBox) rearBox.hidden=fcSyncEnds;
  const syncToggle=document.getElementById('fc-sync-toggle');
  if(syncToggle) syncToggle.checked=fcSyncEnds;
  fcUpdateFrontLabel();
  const btn=document.getElementById('btn-undo');
  if(!fcHistory.length && btn) btn.disabled=true;
}

function resetAll(){
  fcSaveHistory();
  fcPvcColor=FC_PVC_COLORS[0];
  fcFrontColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
  fcRearColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
  fcSyncEnds=true;
  fcRebuildPartColors();
  fcBuildStrapSVG();
  fcSyncPaletteSelection();
  fcUpdateSummary();
  const rearBox=document.getElementById('fc-leather-rear-box');
  if(rearBox) rearBox.hidden=true;
  const syncToggle=document.getElementById('fc-sync-toggle');
  if(syncToggle) syncToggle.checked=true;
  fcUpdateFrontLabel();
}

// ============================================================================
// カラーピッカー（PVC本体／前後の本革）
// ============================================================================

function fcBuildPvcPalette(){
  const p=document.getElementById('fc-pvc-palette');
  if(!p) return;
  p.innerHTML='';
  FC_PVC_COLORS.forEach(c=>{
    const wrap=document.createElement('div');
    wrap.className='cb-wrap';
    wrap.dataset.id=c.id;
    const dot=document.createElement('div');
    dot.className='cb'+(c.id===fcPvcColor.id?' on':'');
    dot.style.cssText=`background:${c.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${c.id===fcPvcColor.id?'#111':'transparent'};`;
    const nm=document.createElement('div');
    nm.className='color-name'+(c.id===fcPvcColor.id?' on':'');
    nm.textContent=c.name;
    wrap.appendChild(dot); wrap.appendChild(nm);
    wrap.onclick=()=>{
      fcPvcColor=c;
      fcSaveHistory();
      fcRebuildPartColors();
      p.querySelectorAll('.cb-wrap').forEach(w=>{
        const isOn=w.dataset.id===c.id;
        w.querySelector('.cb').classList.toggle('on',isOn);
        w.querySelector('.cb').style.border=`3px solid ${isOn?'#111':'transparent'}`;
        w.querySelector('.color-name').classList.toggle('on',isOn);
      });
      fcRedrawSVG();
      fcUpdateSummary();
      fcHasDownloadedImage=false;
    };
    p.appendChild(wrap);
  });
}

function fcBuildLeatherPalette(elId, currentColor, onPick){
  const p=document.getElementById(elId);
  if(!p) return;
  p.innerHTML='';
  FC_LEATHER_COLORS.forEach(c=>{
    const wrap=document.createElement('div');
    wrap.className='cb-wrap';
    wrap.dataset.id=c.id;
    const dot=document.createElement('div');
    dot.className='cb'+(c.id===currentColor.id?' on':'');
    dot.style.cssText=`background:${c.hex} !important;width:32px;height:32px;border-radius:50%;display:block;flex-shrink:0;border:3px solid ${c.id===currentColor.id?'#111':'transparent'};`;
    const nm=document.createElement('div');
    nm.className='color-name'+(c.id===currentColor.id?' on':'');
    nm.textContent=c.name;
    wrap.appendChild(dot); wrap.appendChild(nm);
    wrap.onclick=()=>{
      p.querySelectorAll('.cb-wrap').forEach(w=>{
        const isOn=w.dataset.id===c.id;
        w.querySelector('.cb').classList.toggle('on',isOn);
        w.querySelector('.cb').style.border=`3px solid ${isOn?'#111':'transparent'}`;
        w.querySelector('.color-name').classList.toggle('on',isOn);
      });
      onPick(c);
    };
    p.appendChild(wrap);
  });
}

// 元に戻す/リセット後にパレットのハイライトを再同期
function fcSyncPaletteSelection(){
  fcBuildPvcPalette();
  fcBuildLeatherPalette('fc-leather-palette-front', fcFrontColor, c=>{
    fcFrontColor=c;
    if(fcSyncEnds) fcRearColor=c;
    fcOnColorChange();
  });
  fcBuildLeatherPalette('fc-leather-palette-rear', fcRearColor, c=>{
    fcRearColor=c;
    fcOnColorChange();
  });
}

// ============================================================================
// サマリー
// ============================================================================

function fcUpdateSummary(){
  const el=document.getElementById('summary');
  if(!el) return;
  const rows=[
    `<span class="si"><span class="sw" style="background:${fcPvcColor.hex}"></span>本体(PVC)：${fcPvcColor.name}</span>`
  ];
  if(fcSyncEnds){
    rows.push(`<span class="si"><span class="sw" style="background:${fcFrontColor.hex}"></span>本革（前後共通）：${fcFrontColor.name}</span>`);
  }else{
    rows.push(`<span class="si"><span class="sw" style="background:${fcFrontColor.hex}"></span>本革（前／ボディ上部側）：${fcFrontColor.name}</span>`);
    rows.push(`<span class="si"><span class="sw" style="background:${fcRearColor.hex}"></span>本革（後ろ／エンドピン側）：${fcRearColor.name}</span>`);
  }
  el.innerHTML=rows.join('');
}

// ============================================================================
// ストラップ描画（SVG）
// FOLKLORE_SVG_INNER・ピース配置ロジックは本革版simulator.jsと共通のものを流用
// ============================================================================

function _fcHexToHsl(hex){
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
function _fcHslToHex(h,s,l){
  const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  let r,g,b;
  if(s===0){r=g=b=l;}else{const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}
  const toHex=v=>Math.round(v*255).toString(16).padStart(2,'0');
  return`#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function fcGetLogoColor(hex){
  const [h,s,l]=_fcHexToHsl(hex);
  const newL=l>0.40 ? Math.max(0.05,l-0.30) : Math.min(0.90,l+0.30);
  return _fcHslToHex(h,s,newL);
}
function fcLighten(hex, amt){
  const [h,s,l]=_fcHexToHsl(hex);
  return _fcHslToHex(h,s,Math.min(0.96,l+amt));
}
function fcDarken(hex, amt){
  const [h,s,l]=_fcHexToHsl(hex);
  return _fcHslToHex(h,s,Math.max(0.04,l-amt));
}

// PVC特有の透け感・艶感を出すため、7色それぞれにグラデーションを用意する
function fcEnsurePvcDefs(svg){
  const NS='http://www.w3.org/2000/svg';
  let defs=svg.querySelector('defs');
  if(!defs){
    defs=document.createElementNS(NS,'defs');
    svg.insertBefore(defs,svg.firstChild);
  }
  defs.innerHTML='';
  FC_PVC_COLORS.forEach(c=>{
    const grad=document.createElementNS(NS,'linearGradient');
    grad.setAttribute('id','fc-pvc-grad-'+c.id);
    grad.setAttribute('x1','15%'); grad.setAttribute('y1','0%');
    grad.setAttribute('x2','85%'); grad.setAttribute('y2','100%');
    [[0,fcLighten(c.hex,0.32)],[38,fcLighten(c.hex,0.10)],[60,c.hex],[100,fcDarken(c.hex,0.10)]].forEach(([off,color])=>{
      const stop=document.createElementNS(NS,'stop');
      stop.setAttribute('offset',off+'%');
      stop.setAttribute('stop-color',color);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
  });
}

function fcBuildStrapSVG(){
  const scroll=document.getElementById('strap-scroll');
  const col=document.getElementById('strap-col');
  if(!scroll||!col) return;

  const PW=40;
  const dispW=PW+10;
  col.style.width=(dispW+30)+'px';

  const N=fcN;
  const extraCount=Math.max(0,N-20);
  const shiftFixed=(N-20)*FC_PIECE_PITCH;

  const vbTop=FC_SVG_VTOP-5;
  const vbBottom=FC_SVG_VTOP+19*FC_PIECE_PITCH+shiftFixed+90;
  const vbH=vbBottom-vbTop;
  const dispH=Math.round(vbH*(dispW/FC_SVG_VW));

  scroll.innerHTML=`<svg id="folklore-strap-svg"
    viewBox="${FC_SVG_VLEFT} ${vbTop.toFixed(1)} ${FC_SVG_VW} ${vbH.toFixed(1)}"
    width="${dispW}" height="${dispH}"
    style="display:block;margin:0 auto;flex-shrink:0;"
    xmlns="http://www.w3.org/2000/svg">${FOLKLORE_SVG_INNER}</svg>`;

  const svg=document.getElementById('folklore-strap-svg');
  fcEnsurePvcDefs(svg);

  Object.entries(FC_SVG_ID_TO_PIECE).forEach(([id,pn])=>{
    const g=svg.querySelector(`#${id}`);
    if(g) g.setAttribute('data-piece',pn);
  });

  for(let p=10;p<=19;p++){
    const g=svg.querySelector(`[data-piece="${p}"]`);
    if(!g) continue;
    if(N>=30-p){
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

  for(let p=1;p<=9;p++){
    const g=svg.querySelector(`[data-piece="${p}"]`);
    if(!g) continue;
    g.setAttribute('transform',`translate(0,${shiftFixed.toFixed(3)})`);
  }

  const PIECE12_ORIG_Y=FC_SVG_VTOP+8*FC_PIECE_PITCH;
  const piece12ref=svg.querySelector('[data-piece="12"]');
  const piece19ref=svg.querySelector('[data-piece="19"]');
  for(let k=1;k<=extraCount;k++){
    if(!piece12ref) continue;
    const targetY=FC_SVG_VTOP+k*FC_PIECE_PITCH;
    const ty=targetY-PIECE12_ORIG_Y;
    const extraG=document.createElementNS('http://www.w3.org/2000/svg','g');
    extraG.setAttribute('data-piece',`extra${k}`);
    extraG.setAttribute('transform',`translate(0,${ty.toFixed(3)})`);
    Array.from(piece12ref.children).forEach(child=>{
      extraG.appendChild(child.cloneNode(true));
    });
    if(piece19ref && piece19ref.parentNode){
      piece19ref.parentNode.insertBefore(extraG, piece19ref);
    }else{
      (svg.querySelector('#middle')||svg).appendChild(extraG);
    }
  }

  fcRedrawSVG();
}

function fcRedrawSVG(){
  const svg=document.getElementById('folklore-strap-svg');
  if(!svg) return;
  const N=fcN;
  const order=fcGetDisplayOrder(N);
  order.forEach((pn,i)=>{
    const g=svg.querySelector(`[data-piece="${pn}"]`);
    if(!g) return;
    const isEnd = (i===0 || i===N-1); // 0=後ろ(20枚目) / N-1=前(1枚目) は本革
    const hex=fcPartColors[i];
    const logoCol=fcGetLogoColor(hex);
    g.querySelectorAll('path').forEach(p=>{
      if(p.id==='logo'){ p.setAttribute('fill',logoCol); p.removeAttribute('fill-opacity'); return; }
      if(isEnd){
        p.setAttribute('fill',hex);
        p.removeAttribute('fill-opacity');
      }else{
        p.setAttribute('fill',`url(#fc-pvc-grad-${fcPvcColor.id})`);
        p.setAttribute('fill-opacity','0.9');
      }
      p.setAttribute('stroke','#000');
      p.setAttribute('stroke-width','0.5');
      p.setAttribute('stroke-miterlimit','10');
    });
  });
  if (typeof applyFolkloreKokuinColors === 'function') applyFolkloreKokuinColors();
}

// ============================================================================
// トースト・ローディング
// ============================================================================

function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

function showLoading(text='処理中...'){
  const loadingText=document.getElementById('loading-text');
  const loadingOverlay=document.getElementById('loading-overlay');
  if(loadingText) loadingText.textContent=text;
  if(loadingOverlay) loadingOverlay.classList.add('show');
}

function hideLoading(){
  const loadingOverlay=document.getElementById('loading-overlay');
  if(loadingOverlay) loadingOverlay.classList.remove('show');
}

// ============================================================================
// 画像保存
// ============================================================================

async function fcBuildSaveCanvas(){
  const cv=document.createElement('canvas');
  const cw=600;
  const N=fcN;

  const svgSaveW=60;
  const scale=svgSaveW/FC_SVG_VW;
  const shiftFixed=(N-20)*FC_PIECE_PITCH;
  const vbTop=FC_SVG_VTOP-5;
  const vbBottom=FC_SVG_VTOP+19*FC_PIECE_PITCH+shiftFixed+90;
  const vbH=vbBottom-vbTop;
  const svgSaveH=Math.round(vbH*scale);

  const kokuin=window.FOLKLORE_KOKUIN_STATE;
  const kokuinEnabled=!!(kokuin?.enabled && kokuin.valid && kokuin.text);
  const kokuinH=kokuinEnabled?78:0;

  const headerH=50, topLabelH=25, bottomLabelH=25, footerH=28;
  const svgX=Math.round(cw/2-svgSaveW/2);
  const svgY0=headerH+topLabelH;
  const ch=svgY0+svgSaveH+bottomLabelH+kokuinH+footerH+10;

  cv.width=cw; cv.height=ch;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#f0ede8'; ctx.fillRect(0,0,cw,ch);

  ctx.fillStyle='#111'; ctx.fillRect(0,0,cw,headerH);
  ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center';
  ctx.fillText('FOLKLORE CLEAR', cw/2, 28);
  ctx.fillStyle='#666'; ctx.font='11px sans-serif';
  ctx.fillText('COLOR SIMULATOR  |  708works', cw/2, 42);

  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▲ 後ろ（エンドピン側）', cw/2, svgY0-6);

  const svgEl=document.getElementById('folklore-strap-svg');
  if(svgEl){
    const cloned=svgEl.cloneNode(true);
    cloned.setAttribute('width',svgSaveW);
    cloned.setAttribute('height',svgSaveH);
    cloned.style.margin='0';
    const svgStr=new XMLSerializer().serializeToString(cloned);
    const dataUri='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{ ctx.drawImage(img,svgX,svgY0,svgSaveW,svgSaveH); resolve(); };
      img.onerror=resolve;
      img.src=dataUri;
    });
  }

  ctx.fillStyle='#444'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('▼ 前（ボディ上部側）', cw/2, svgY0+svgSaveH+14);

  // 配色ラベル（本体PVC／前後の本革のみ、簡潔に）
  const labelX=svgX+svgSaveW+18;
  let ly=svgY0+16;
  const drawLabel=(hex,label)=>{
    ctx.beginPath(); ctx.arc(labelX+6,ly,5,0,Math.PI*2);
    ctx.fillStyle=hex; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=0.7; ctx.stroke();
    ctx.fillStyle='#333'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText(label, labelX+16, ly+3);
    ly+=22;
  };
  drawLabel(fcPvcColor.hex, `本体(PVC): ${fcPvcColor.name}`);
  if(fcSyncEnds){
    drawLabel(fcFrontColor.hex, `本革(前後共通): ${fcFrontColor.name}`);
  }else{
    drawLabel(fcFrontColor.hex, `本革(前): ${fcFrontColor.name}`);
    drawLabel(fcRearColor.hex, `本革(後ろ): ${fcRearColor.name}`);
  }

  if(kokuinEnabled){
    const boxMargin=24;
    const boxX=boxMargin, boxY=svgY0+svgSaveH+bottomLabelH+6;
    const boxW=cw-boxMargin*2, boxH=kokuinH-12;
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.moveTo(boxX+8,boxY);
    ctx.arcTo(boxX+boxW,boxY,boxX+boxW,boxY+boxH,8);
    ctx.arcTo(boxX+boxW,boxY+boxH,boxX,boxY+boxH,8);
    ctx.arcTo(boxX,boxY+boxH,boxX,boxY,8);
    ctx.arcTo(boxX,boxY,boxX+boxW,boxY,8);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle='#999'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText('名入れ刻印', boxX+14, boxY+18);

    await document.fonts.load(`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`).catch(()=>{});
    ctx.fillStyle='#1a1a1a';
    ctx.font=`${kokuin.fontWeight} 26px "${kokuin.fontFamily}"`;
    ctx.textAlign='left';
    ctx.fillText(kokuin.text, boxX+14, boxY+boxH-16);
  }

  ctx.fillStyle='rgba(0,0,0,.1)'; ctx.fillRect(0,ch-footerH,cw,footerH);
  ctx.fillStyle='#888'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('708works.jp', cw/2, ch-10);

  return cv;
}

async function saveImage(){
  const cv=document.getElementById('save-canvas');
  if(!cv) return;
  showLoading('画像を生成中...');
  try{
    const canvas=await fcBuildSaveCanvas();
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`folklore-clear-${fcN}parts-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    hideLoading();
    fcHasDownloadedImage=true;
    showToast('画像を保存しました');
  }catch(e){
    console.error(e);
    hideLoading();
    showToast('保存に失敗しました');
  }
}

// ============================================================================
// R2アップロード・オーダー処理
// ============================================================================

async function fcUploadOrderImage(canvas){
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
  const orderId=`folklore-clear-${Date.now()}`;
  const formData=new FormData();
  formData.append('image',blob,`${orderId}.png`);
  formData.append('orderId',orderId);
  try{
    const response=await fetch(FC_WORKER_URL,{ method:'POST', body:formData });
    if(!response.ok) throw new Error(`Upload failed: ${response.status}`);
    const data=await response.json();
    if(!data.success) throw new Error(data.error || 'Upload failed');
    return { imageUrl:data.imageUrl, orderId };
  }catch(error){
    console.error('Upload error:', error);
    return null;
  }
}

async function goOrder(){
  if (window.FOLKLORE_KOKUIN_STATE?.enabled && !window.FOLKLORE_KOKUIN_STATE.valid) {
    showToast('刻印する文字を正しく入力してください');
    return;
  }
  if (!fcHasDownloadedImage) {
    await saveImage();
  }
  showLoading('画像をアップロード中...');
  try {
    const canvas = await fcBuildSaveCanvas();
    const uploadResult = await fcUploadOrderImage(canvas);
    if (!uploadResult) throw new Error('画像のアップロードに失敗しました');
    fcLastUploadedImage = uploadResult;
    hideLoading();
    showConfirmModal(uploadResult);
  } catch (error) {
    console.error('Order error:', error);
    hideLoading();
    showToast('エラーが発生しました: ' + error.message);
  }
}

function fcColorSummaryLine(){
  if(fcSyncEnds){
    return `本体(PVC): ${fcPvcColor.name}<br>本革(前後共通): ${fcFrontColor.name}`;
  }
  return `本体(PVC): ${fcPvcColor.name}<br>本革(前/ボディ上部側): ${fcFrontColor.name}<br>本革(後ろ/エンドピン側): ${fcRearColor.name}`;
}

function showConfirmModal(uploadResult){
  const modal=document.getElementById('confirm-modal');
  const modalImage=document.getElementById('modal-image');
  const modalInfo=document.getElementById('modal-info');
  if(!modal||!modalImage||!modalInfo) return;

  modalImage.src=uploadResult.imageUrl;

  const kokuinEnabled0=!!(window.FOLKLORE_KOKUIN_STATE?.enabled && window.FOLKLORE_KOKUIN_STATE.valid && window.FOLKLORE_KOKUIN_STATE.text);
  const price=FC_PRICE_MAP[fcN]+(kokuinEnabled0?FC_KOKUIN_PRICE_ADD:0);
  const kokuin=window.FOLKLORE_KOKUIN_STATE;
  const kokuinLine=kokuinEnabled0
    ? `<p><strong>名入れ刻印:</strong> ${kokuin.text}（${kokuin.fontLabel}）</p>`
    : '';

  modalInfo.innerHTML=`
    <p><strong>注文ID:</strong> ${uploadResult.orderId}</p>
    <p><strong>ウロコパーツ数:</strong> ${fcN}個</p>
    <p><strong>全長:</strong> 約${1150+(fcN-20)*60}mm</p>
    <p><strong>価格:</strong> ¥${price.toLocaleString()}（税込）</p>
    ${kokuinLine}
    <p style="margin-top:12px;"><strong>カラー構成:</strong></p>
    <div style="font-size:12px;line-height:1.6;color:#888;margin-top:4px;">${fcColorSummaryLine()}</div>
  `;
  modal.classList.add('show');
}

function closeModal(){
  const modal=document.getElementById('confirm-modal');
  if(modal) modal.classList.remove('show');
}

async function proceedToCart(){
  if(!fcLastUploadedImage){
    showToast('画像情報が見つかりません');
    return;
  }
  closeModal();
  showLoading('カートに追加中...');
  try{
    const kokuin=window.FOLKLORE_KOKUIN_STATE;
    const kokuinEnabled=!!(kokuin?.enabled && kokuin.valid && kokuin.text);
    const price=FC_PRICE_MAP[fcN]+(kokuinEnabled?FC_KOKUIN_PRICE_ADD:0);
    const variantId=FC_VARIANT_MAP[fcN]?.[kokuinEnabled?'eng':'noeng'];
    if(!variantId) throw new Error('該当するバリエーションが見つかりません');

    const form=document.createElement('form');
    form.method='POST';
    form.action=`https://${FC_SHOPIFY_DOMAIN}/cart/add`;
    form.style.display='none';

    [['id',variantId],['quantity','1']].forEach(([k,v])=>{
      const i=document.createElement('input');
      i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
    });

    const props={
      'Order ID': fcLastUploadedImage.orderId,
      'Parts': `${fcN}pcs`,
      'Length': `${1150+(fcN-20)*60}mm`,
      'PVC Color': fcPvcColor.name,
      'Front Leather': fcFrontColor.name,
      'Rear Leather': fcRearColor.name,
      'Image URL': fcLastUploadedImage.imageUrl
    };
    if(kokuinEnabled){
      props['刻印文字']=kokuin.text;
      props['刻印フォント']=kokuin.fontLabel;
    }

    Object.entries(props).forEach(([key,value])=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=`properties[${key}]`;
      input.value=value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    hideLoading();
    showToast('カートに追加します...');
    setTimeout(()=>{ form.submit(); },500);
  }catch(error){
    console.error('カート追加エラー:', error);
    hideLoading();
    showToast('カート追加に失敗しました: ' + error.message);
  }
}
// Auto-generated from folklore_color_order.svg（folklore本革版と共通のSVGアセットをそのまま流用）

