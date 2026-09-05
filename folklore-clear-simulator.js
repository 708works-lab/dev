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
let fcLinked=true; // true=前後（前端・後端）を同じ色にする（デフォルト）／false=別々の色にする
let fcActiveZone='pvc'; // 'pvc' | 'leather' | 'front' | 'rear'
let fcPartColors=[]; // 表示順(index0=後ろ/20枚目 … indexN-1=前/1枚目)に対応する実際のhex配列
let fcHistory=[];
let fcLastUploadedImage=null;
let fcHasDownloadedImage=false;

// courier-simulator.jsの「パーツを選択」ゾーンタブ＋前後分離トグルと同じUIパターンを採用
const FC_ZONE_LABEL = {
  pvc:     '本体（PVC）',
  leather: '本革（前後共通）',
  front:   '前端（革）',
  rear:    '後端（革）',
};

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
  const zonesEl=document.getElementById('fc-zones');
  const strapScrollEl=document.getElementById('strap-scroll');
  if(!zonesEl||!strapScrollEl){
    setTimeout(initializeFCSimulator,100);
    return;
  }
  window.fcSimulatorInitialized=true;
  fcRebuildPartColors();
  fcBuildZoneButtons();
  fcBuildPalette();
  fcUpdatePaletteLabel();
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

function fcOnColorChange(){
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
  fcHistory.push({n:fcN, pvc:fcPvcColor, front:fcFrontColor, rear:fcRearColor, linked:fcLinked, zone:fcActiveZone});
  if(fcHistory.length>30) fcHistory.shift();
  const btn=document.getElementById('btn-undo');
  if(btn) btn.disabled=false;
}

function undo(){
  if(!fcHistory.length) return;
  const prev=fcHistory.pop();
  fcN=prev.n; fcPvcColor=prev.pvc; fcFrontColor=prev.front; fcRearColor=prev.rear; fcLinked=prev.linked; fcActiveZone=prev.zone;
  fcRebuildPartColors();
  fcUpdateCountDisplay();
  fcUpdatePriceDisplay();
  fcBuildStrapSVG();
  fcBuildZoneButtons();
  fcBuildPalette();
  fcUpdatePaletteLabel();
  fcUpdateSummary();
  const btn=document.getElementById('btn-undo');
  if(!fcHistory.length && btn) btn.disabled=true;
}

function resetAll(){
  fcSaveHistory();
  fcPvcColor=FC_PVC_COLORS[0];
  fcFrontColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
  fcRearColor=FC_LEATHER_COLORS.find(c=>c.id==='camel');
  fcLinked=true;
  fcActiveZone='pvc';
  fcRebuildPartColors();
  fcBuildStrapSVG();
  fcBuildZoneButtons();
  fcBuildPalette();
  fcUpdatePaletteLabel();
  fcUpdateSummary();
}

// ============================================================================
// パーツ選択（ゾーンタブ）＋前後分離トグル
// courier-simulator.js（Courierページ）と同じUI・挙動パターン：
// デフォルトは前端・後端の本革が同じ色（リンク状態）。トグルで分離すると
// 「前端（革）」「後端（革）」の2ゾーンに分かれて個別に色を選べるようになる。
// ============================================================================

function fcBuildZoneButtons(){
  const container=document.getElementById('fc-zones');
  if(!container) return;
  container.innerHTML='';

  const zones = fcLinked ? ['pvc','leather'] : ['pvc','front','rear'];
  zones.forEach(zone=>{
    const btn=document.createElement('button');
    btn.className='fc-zone-btn'+(zone===fcActiveZone?' active':'');
    btn.onclick=()=>fcSelectZone(zone);

    const dot=document.createElement('span');
    dot.className='fc-zone-dot';
    const hex = zone==='pvc' ? fcPvcColor.hex
              : zone==='rear' ? fcRearColor.hex
              : fcFrontColor.hex; // 'leather'・'front'はどちらも前端色を表示
    dot.style.background=hex;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(' '+FC_ZONE_LABEL[zone]));
    container.appendChild(btn);
  });

  const toggle=document.createElement('button');
  toggle.className='fc-split-toggle'+(fcLinked?'':' active');
  toggle.onclick=fcToggleLeatherSplit;
  toggle.innerHTML = fcLinked
    ? '<span class="fc-toggle-icon">⊕</span> 前後を別の色にする'
    : '<span class="fc-toggle-icon">⊖</span> 前後を同じ色に戻す';
  container.appendChild(toggle);
}

function fcToggleLeatherSplit(){
  fcLinked=!fcLinked;
  if(fcLinked){
    fcRearColor=fcFrontColor;
    fcActiveZone='leather';
  }else{
    fcActiveZone='front';
  }
  fcBuildZoneButtons();
  fcBuildPalette();
  fcUpdatePaletteLabel();
  fcUpdateSummary();
  fcOnColorChange();
}

function fcSelectZone(zone){
  fcActiveZone=zone;
  fcBuildZoneButtons();
  fcBuildPalette();
  fcUpdatePaletteLabel();
}

function fcUpdatePaletteLabel(){
  const label=document.getElementById('fc-palette-label');
  if(label) label.textContent='カラー（'+FC_ZONE_LABEL[fcActiveZone]+'）';
}

// ============================================================================
// カラーパレット（ゾーン連動・単一パレット）
// ============================================================================

function fcCurrentZoneColor(){
  if(fcActiveZone==='pvc') return fcPvcColor;
  if(fcActiveZone==='rear') return fcRearColor;
  return fcFrontColor; // 'leather'・'front'
}

function fcBuildPalette(){
  const p=document.getElementById('fc-palette');
  if(!p) return;
  p.innerHTML='';
  // Shopifyテーマのdiv:empty{display:none}対策：中身を持たない色スウォッチdivは
  // display:blockを明示しないと本番でだけ非表示になる（Triad/Kolmio等で既知の罠）
  p.style.cssText='display:flex;flex-wrap:wrap;gap:5px;';

  const colors = fcActiveZone==='pvc' ? FC_PVC_COLORS : FC_LEATHER_COLORS;
  const current = fcCurrentZoneColor();

  colors.forEach(c=>{
    const sw=document.createElement('div');
    sw.className='fc-swatch'+(c.id===current.id?' selected':'');
    const isSel=c.id===current.id;
    sw.style.cssText=`display:block;background:${c.hex};width:22px;height:22px;border-radius:50%;cursor:pointer;box-sizing:border-box;border:${isSel?'2.5px solid #111;box-shadow:0 0 0 2px #fff,0 0 0 4px #111':'1.5px solid rgba(0,0,0,.12)'};`;
    sw.title=c.name;
    sw.onclick=()=>fcSetColor(c);
    p.appendChild(sw);
  });
}

function fcSetColor(c){
  fcSaveHistory();
  if(fcActiveZone==='pvc'){
    fcPvcColor=c;
  }else if(fcActiveZone==='leather'){
    fcFrontColor=c; fcRearColor=c;
  }else if(fcActiveZone==='front'){
    fcFrontColor=c;
  }else{
    fcRearColor=c;
  }
  fcBuildZoneButtons();
  fcBuildPalette();
  fcOnColorChange();
}

// ============================================================================
// サマリー
// ============================================================================

function fcUpdateSummary(){
  const el=document.getElementById('summary');
  if(!el) return;
  const rows = fcLinked
    ? [
        {label:FC_ZONE_LABEL.pvc,     hex:fcPvcColor.hex,   name:fcPvcColor.name},
        {label:FC_ZONE_LABEL.leather, hex:fcFrontColor.hex, name:fcFrontColor.name},
      ]
    : [
        {label:FC_ZONE_LABEL.pvc,   hex:fcPvcColor.hex,   name:fcPvcColor.name},
        {label:FC_ZONE_LABEL.front, hex:fcFrontColor.hex, name:fcFrontColor.name},
        {label:FC_ZONE_LABEL.rear,  hex:fcRearColor.hex,  name:fcRearColor.name},
      ];
  el.innerHTML = rows.map(r=>`
    <div class="fc-summary-row">
      <span class="fc-summary-label">${r.label}</span>
      <span class="fc-summary-dot" style="background:${r.hex}"></span>
      <span class="fc-summary-name">${r.name}</span>
    </div>`).join('');
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

  // 708worksロゴ（id="logo"のpath）はSVGアセット内に3枚目のパーツ1箇所にしか存在しない。
  // 本革版では刻印もロゴも3枚目に固定だったが、PVC版では前(1枚目・本革)に移す必要があるため、
  // 描画のたびにDOM上でpiece3の子からpiece1の子へ付け替える
  const logoPath=svg.querySelector('[data-piece="3"] #logo, [data-piece="3"] [id="logo"]');
  const piece1Group=svg.querySelector('[data-piece="1"]');
  if(logoPath && piece1Group) piece1Group.appendChild(logoPath);

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
    const isFront = (i===N-1); // 708worksロゴ／名入れ刻印は前(1枚目・本革)にのみ入る
    const hex=fcPartColors[i];
    const logoCol=fcGetLogoColor(hex);
    g.querySelectorAll('path').forEach(p=>{
      if(p.id==='logo'){
        if(isFront){ p.setAttribute('fill',logoCol); p.setAttribute('fill-opacity','1'); }
        else{ p.setAttribute('fill-opacity','0'); }
        return;
      }
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
  if(fcLinked){
    drawLabel(fcFrontColor.hex, `本革(前後共通): ${fcFrontColor.name}`);
  }else{
    drawLabel(fcFrontColor.hex, `本革(前端): ${fcFrontColor.name}`);
    drawLabel(fcRearColor.hex, `本革(後端): ${fcRearColor.name}`);
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
  if(fcLinked){
    return `本体(PVC): ${fcPvcColor.name}<br>本革(前後共通): ${fcFrontColor.name}`;
  }
  return `本体(PVC): ${fcPvcColor.name}<br>本革(前端): ${fcFrontColor.name}<br>本革(後端): ${fcRearColor.name}`;
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

// Auto-generated from folklore_color_order.svg
const FOLKLORE_SVG_INNER = `<g id="rear"> <g id="_x32_0"> <path d="M267.774,308.413c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM240.176,279.228c2.113,0,3.826,1.713,3.826,3.825s-1.702,3.815-3.807,3.825v3.015c.273,0,.494.222.494.496s-.219.495-.494.495-.497-.222-.497-.495.222-.496.497-.496v-3.015c-.006,0-.013,0-.019,0-2.112,0-3.825-1.713-3.825-3.826s1.714-3.825,3.825-3.825ZM253.923,318.21s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path d="M239.698,290.389c0,.273.222.495.497.495s.494-.222.494-.495-.22-.496-.494-.496v.243-.243c-.275,0-.497.222-.497.496Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g> <g id="middle"> <g id="_x31_9"> <path d="M267.774,360.001c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,369.797s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_8"> <path d="M267.774,412.593c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,422.39s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_7"> <path d="M267.774,465.186c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,474.983s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_6"> <path d="M267.774,517.779c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,527.576s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_5"> <path d="M267.774,570.371c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,580.168s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_4"> <path d="M267.774,622.964c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,632.761s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_3"> <path d="M267.774,675.557c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,685.354s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_2"> <path d="M267.774,728.15c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,737.946s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_1"> <path d="M267.774,780.742c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,790.539s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x31_0"> <path d="M267.774,833.335c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,843.132s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x39_"> <path d="M267.774,885.928c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,895.725s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x38_"> <path d="M267.774,938.52c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,948.317s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x37_"> <path d="M267.774,991.113c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1000.91s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x36_"> <path d="M267.774,1043.706c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1053.503s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x35_"> <path d="M267.774,1096.299c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1106.095s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x34_"> <path d="M267.774,1148.891c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1158.688s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> <g id="_x33_"> <path d="M267.169,1201.484c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.318,1211.281s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path id="logo" d="M244.484,1183.828c1.462-1.487,3.931-3.98,7.414-7.487-.148-.025-.297-.064-.442-.121-.02-.008-.039-.013-.058-.021-.085-.036-.166-.078-.245-.122-.047-.027-.091-.058-.134-.088-.028-.019-.058-.037-.084-.057-.055-.041-.106-.086-.156-.131-.013-.012-.027-.023-.04-.035-.05-.048-.099-.1-.145-.153-.27-.308-.455-.681-.533-1.081-.63.699-1.505,1.654-2.626,2.868-.596.643-.963,1.037-1.095,1.184l.127.106c.846-.894,1.368-1.421,1.565-1.58.197-.158.349-.191.46-.097l.932.783-2.517,2.343c-1.238,1.151-2.372,2.21-3.408,3.184-.003-.001-.005-.002-.009-.003-1.631-.69-3.188-.846-4.669-.47-1.482.377-2.47,1.152-2.967,2.326-.488,1.157-.36,2.54.387,4.155-2.504.143-4.137.31-4.899.502-.983.24-1.774.58-2.373,1.018-.599.439-1.019.94-1.257,1.505-.358.844-.266,1.804.276,2.876.542,1.07,1.627,1.95,3.259,2.641,1.994.843,3.907,1.029,5.743.555,1.835-.475,3.033-1.371,3.591-2.69.578-1.365.231-3.227-1.032-5.586,2.006.013,3.655-.245,4.945-.773.982-.399,1.624-.96,1.928-1.677.306-.72.192-1.501-.338-2.348-.369-.59-.905-1.096-1.6-1.521v-.003ZM237.954,1188.286c.173-.405.443-.792.818-1.161.372-.369.702-.591.993-.666.171-.045.326-.057.468-.045-.939.901-1.739,1.679-2.398,2.334.009-.14.048-.293.119-.463h0ZM243.2,1184.333c-.81.801-1.554,1.54-2.225,2.211-.078-.043-.157-.083-.243-.12.684-.675,1.44-1.415,2.269-2.22.069.041.135.085.201.129h-.001ZM237.98,1189.259c-.005-.013-.012-.027-.017-.04.703-.733,1.59-1.628,2.657-2.684.082.045.152.097.21.156-1.086,1.084-1.987,1.993-2.703,2.725-.054-.046-.103-.097-.145-.157ZM238.267,1189.786c-.015.001-.029.003-.044.004-.004-.009-.008-.016-.012-.026.019.008.037.014.056.021h0ZM240.025,1189.003c-.397.355-.76.557-1.09.609-.02.003-.038.003-.057.005.597-.631,1.311-1.376,2.143-2.237-.017.129-.052.265-.115.413-.189.45-.484.854-.881,1.21h-.001ZM238.602,1189.618c-.093-.011-.182-.033-.266-.069-.003-.001-.005-.003-.008-.004.697-.728,1.571-1.629,2.618-2.694.009.016.02.032.026.049.031.072.046.151.055.23-.956.974-1.766,1.804-2.425,2.487ZM241.145,1186.649c.664-.675,1.397-1.414,2.196-2.218.068.05.134.102.197.156-.794.801-1.523,1.541-2.185,2.213-.063-.054-.134-.103-.209-.151h.001ZM247.502,1180.599c-1.133,1.137-2.178,2.187-3.138,3.154-.072-.043-.148-.082-.224-.122,1.191-1.189,3.069-3.05,5.633-5.58l.142.126-2.413,2.422h0ZM249.62,1177.933l.045.039-2.441,2.397c-1.17,1.149-2.246,2.208-3.232,3.183-.068-.035-.139-.068-.21-.1,1.219-1.168,3.165-3.007,5.839-5.518h-.001ZM237.554,1185.275c.343-.804.995-1.339,1.948-1.605.954-.266,1.937-.182,2.946.251.094.04.185.084.273.128-.865.817-1.653,1.565-2.363,2.244-.269-.069-.556-.097-.866-.08-.441.027-.898.192-1.371.5-.304.197-.543.428-.73.685-.146-.821-.094-1.53.163-2.125v.002ZM238.5,1195.847c-.198.63-.613,1.186-1.246,1.675-.632.486-1.362.785-2.188.899-.827.112-1.625.047-2.393-.195-1.059-.334-1.857-.902-2.394-1.702-.537-.803-.675-1.618-.411-2.449.275-.874.888-1.618,1.839-2.232.906-.586,2.461-1.119,4.663-1.601-.836.874-1.566,1.679-2.184,2.415-.347.414-.618.774-.816,1.09-.198.312-.272.49-.222.534.058.049.238-.07.536-.352.3-.284.939-.985,1.916-2.103.461-.527.876-.995,1.247-1.405.039.066.079.132.117.197-.844.884-1.591,1.691-2.236,2.421-.358.401-.645.747-.869,1.042-.223.293-.321.452-.294.477.032.028.194-.103.486-.391.292-.289.936-.983,1.934-2.083.411-.452.782-.858,1.119-1.225.041.071.08.14.119.21-.789.839-1.494,1.606-2.107,2.297-.357.403-.647.748-.875,1.039-.227.289-.329.447-.305.466.027.024.185-.111.474-.403.287-.29.93-.988,1.927-2.09.364-.402.698-.77,1.003-1.104.589,1.054.963,1.886,1.12,2.496.209.809.223,1.501.038,2.08v-.002ZM244.457,1187.492c-.231.538-.76.998-1.582,1.376-.456.211-1.137.399-2.04.565.427-.281.735-.637.918-1.071.18-.427.169-.807-.033-1.144-.066-.109-.151-.21-.247-.305.656-.678,1.379-1.421,2.168-2.227.263.245.482.52.65.83.378.694.432,1.354.165,1.977h0Z" fill="#c6a06a"/> </g> <g id="_x32_"> <path d="M267.774,1254.077c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM253.923,1263.874s-.039.263-.04.264c-.039.184-.128.355-.268.503l-.094.09c-.505.474-1.496.869-2.948,1.18l-.026.008h-.006s-.295.076-.956.17l-.356.049c-.944.122-3.696.414-8.859.483h-.16s-.095-.002-.1-.002c-5.16-.045-7.926-.325-8.876-.444,0,0-.356-.047-.358-.048-.665-.092-.958-.16-.959-.161l-.028-.009-.006-.002c-1.464-.303-2.476-.695-3.002-1.165l-.095-.088c-.151-.149-.246-.318-.296-.505l-.051-.262-.013-.123s.001-.266.004-.268c.177-.64.396-.82,1.604-1.82l.681-.562c4.099-2.9,9.183-4.483,9.252-4.505,1.132-.435,1.824-.448,2.01-.441h.026s.027,0,.027,0c.184-.008.878.002,2.046.438.051.015,5.21,1.573,9.44,4.453l.709.563c1.26.993,1.485,1.172,1.692,1.816l.014.264-.006.124Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g> <g id="front"> <g id="_x31_"> <path d="M267.774,1307.675c-.411-5.171-.867-6.614-3.381-14.613l-1.423-4.541c-3.28-8.99-6.838-16.383-9.973-22.072.02-.038.041-.077.061-.115h-25.765c-3.119,5.8-6.673,13.381-9.919,22.628,0,.006-1.357,4.534-1.357,4.534-2.428,8.046-2.864,9.5-3.208,14.663-.002.019-.008,2.151-.008,2.151l.028.995.096,2.117c.097,1.499.299,2.865.588,4.067l.197.704c1.056,3.781,3.074,6.941,6.004,9.384l.012.005.053.086c.006.003.593.556,1.921,1.3.002.002.718.378.718.378,1.899.957,7.429,3.219,17.75,3.577.006,0,.195.006.195.006h.132s.19-.015.19-.015c10.321-.54,15.825-2.902,17.715-3.89.002,0,.709-.395.709-.395,1.325-.766,1.905-1.333,1.912-1.339l.01-.013.055-.076c2.896-2.496,4.883-5.691,5.896-9.498,0,.006.187-.723.187-.723.277-1.185.458-2.555.535-4.041.001-.019.08-2.13.08-2.13l.015-1.006-.029-2.127ZM240.177,1320.048c-2.113,0-3.826-1.713-3.826-3.825s1.702-3.815,3.808-3.825v-3.015c-.273,0-.494-.222-.494-.496s.219-.495.494-.495.497.222.497.495-.222.496-.497.496v3.015c.006,0,.012,0,.019,0,2.112,0,3.825,1.713,3.825,3.826s-1.714,3.825-3.825,3.825Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> <path d="M240.656,1308.887c0-.273-.222-.495-.497-.495s-.494.222-.494.495.22.496.494.496v-.243.243c.274,0,.497-.222.497-.496Z" fill="#995200" stroke="#000" stroke-miterlimit="10"/> </g> </g>`;
