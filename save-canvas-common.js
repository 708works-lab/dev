/* 708works カラーシミュレーター共通：保存用キャンバス生成ヘルパー
   【2026-09-27新設、同日2カラム化改訂】各商品(<model>-simulator.js)がそれぞれ独自に持っていた
   「保存画像を組み立てるcanvas描画コード」を1箇所に集約したもの。
   目的：Instagram投稿・ECページ両方で使い回せるよう、保存画像の比率を
   商品ごとのSVGの縦横比に依存させず、常に1:1スクエアに統一するため。

   レイアウトは左右2カラム: 左＝モデル名・配色サマリー・（あれば）刻印クローズアップ、
   右＝アートワークのみ（余白を有効活用してメインコンテンツを大きく見せる）。
   旧デザインの「全幅の黒帯ヘッダー」「アートワーク下の横並びチップ」は廃止。

   使い方（各商品の buildXXXSaveCanvas から呼び出す）：
     return await build708SaveCanvas({
       title: 'SUS4',                        // 左上に出すモデル名（EC実際の表記の大文字/小文字に合わせること。
                                                // 全部大文字に強制したりしない＝実際の商品名通りに渡す）
       svgSelector: '#sus4-svg-wrap svg',     // 描画対象のSVG要素
       svgW: 462.79, svgH: 996.72,            // SVGのviewBox幅高さ（元の縦横比を保つため）
       chips: [{hex:'#...', label:'Brown'}, ...], // 左カラムに縦並びで出す配色サマリーの1行分ずつ
       prepareSvg: async (clonedSvgEl) => {...},  // 任意。刻印フォントの埋め込み等、
                                                    // シリアライズ前にcloneしたSVGへ行う処理
       topCaption: '▲ 後ろ（エンドピン側）',        // 任意。アートワーク直上に出す小さな見出し
       bottomCaption: '▼ 前（ボディ上部側）',       // 任意。アートワーク直下に出す小さな見出し
       extra: {                                    // 任意。左カラムのチップ凡例の下に追加パネルを1枠確保する
         height: 130,                              // （courierの刻印クローズアッププレビュー等）
         draw: async (ctx, box) => {...},           // box = {x, y, width, height}
       },
     });
*/

// 日本語混じりの文字列を、指定幅に収まるよう1文字ずつ折り返す（スペース区切りに頼れないため）
function _wrapTextByChar(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function build708SaveCanvas({ title, svgSelector, svgW, svgH, chips, prepareSvg, topCaption, bottomCaption, extra, size = 1080, pad = 48 }) {
  const SIZE = size, PAD = pad;
  const leftW = 380;
  const colGap = 36;
  const rightX = PAD + leftW + colGap;
  const rightW = SIZE - PAD - rightX;

  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 左カラム：モデル名ラベル（全幅ヘッダー帯は敷かない。実際のEC表記の大文字/小文字をそのまま使う）
  let titleSize = 32;
  ctx.textAlign = 'left';
  ctx.font = `bold ${titleSize}px sans-serif`;
  while (titleSize > 16 && ctx.measureText(title).width > leftW) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px sans-serif`;
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(title, PAD, PAD + titleSize);
  ctx.fillStyle = '#999';
  ctx.font = '13px sans-serif';
  ctx.fillText('COLOR SIMULATOR｜708works', PAD, PAD + titleSize + 22);

  // 左カラム：配色サマリー（縦並び。ラベルが長い場合は折り返す）
  let cursorY = PAD + titleSize + 46;
  const chipTextMaxW = leftW - 28;
  if (chips.length) {
    ctx.font = '14px sans-serif';
    chips.forEach(c => {
      const lines = _wrapTextByChar(ctx, c.label, chipTextMaxW);
      if (c.hex) {
        ctx.beginPath();
        ctx.arc(PAD + 6, cursorY - 5, 6, 0, Math.PI * 2);
        ctx.fillStyle = c.hex;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        ctx.fillText(line, PAD + 20, cursorY + i * 19);
      });
      cursorY += Math.max(1, lines.length) * 19 + 9;
    });
  }

  // 左カラム：extraパネル（courierの刻印クローズアップ等、チップ凡例だけでは表現できない内容）
  if (extra) {
    cursorY += 8;
    const box = { x: PAD, y: cursorY, width: leftW, height: extra.height };
    if (typeof extra.draw === 'function') await extra.draw(ctx, box);
    cursorY += extra.height;
  }

  // 右カラム：アートワーク（元SVGの縦横比を保ったまま、右カラムの残り領域にcontainで収める）
  const topCaptionH = topCaption ? 24 : 0;
  const bottomCaptionH = bottomCaption ? 24 : 0;
  const artworkTop = PAD + topCaptionH;
  const artworkBottom = SIZE - PAD - bottomCaptionH;
  const artworkBoxH = artworkBottom - artworkTop;

  if (topCaption) {
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(topCaption, rightX + rightW / 2, artworkTop - 8);
  }
  if (bottomCaption) {
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bottomCaption, rightX + rightW / 2, artworkBottom + 18);
  }

  const svgEl = document.querySelector(svgSelector);
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.style.margin = '0';
    if (typeof prepareSvg === 'function') await prepareSvg(cloned);
    const fitScale = Math.min(rightW / svgW, artworkBoxH / svgH);
    const drawW = svgW * fitScale, drawH = svgH * fitScale;
    cloned.setAttribute('width', drawW);
    cloned.setAttribute('height', drawH);
    const drawX = rightX + (rightW - drawW) / 2;
    const drawY = artworkTop + (artworkBoxH - drawH) / 2;
    const svgStr  = new XMLSerializer().serializeToString(cloned);
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    await new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { ctx.drawImage(img, drawX, drawY, drawW, drawH); resolve(); };
      img.onerror = resolve;
      img.src = dataUri;
    });
  }

  // フッター（控えめな透かし、帯は敷かない）
  ctx.fillStyle = '#aaa';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('708works.jp', SIZE - PAD, SIZE - PAD + 20);

  return cv;
}
