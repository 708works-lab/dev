/* 708works カラーシミュレーター共通：保存用キャンバス生成ヘルパー
   【2026-09-27新設】各商品(<model>-simulator.js)がそれぞれ独自に持っていた
   「保存画像を組み立てるcanvas描画コード」を1箇所に集約したもの。
   目的：Instagram投稿・ECページ両方で使い回せるよう、保存画像の比率を
   商品ごとのSVGの縦横比に依存させず、常に1:1スクエアに統一するため。
   旧デザインの「全幅の黒帯ヘッダー」は廃止し、左上に控えめなモデル名ラベルのみ置く。

   使い方（各商品の buildXXXSaveCanvas から呼び出す）：
     return await build708SaveCanvas({
       title: 'SUS4',                        // 左上に出すモデル名
       svgSelector: '#sus4-svg-wrap svg',     // 描画対象のSVG要素
       svgW: 462.79, svgH: 996.72,            // SVGのviewBox幅高さ（元の縦横比を保つため）
       chips: [{hex:'#...', label:'Brown'}, ...], // 下部に並べる配色サマリーの1行分ずつ
       prepareSvg: async (clonedSvgEl) => {...},  // 任意。刻印フォントの埋め込み等、
                                                    // シリアライズ前にcloneしたSVGへ行う処理
       topCaption: '▲ 後ろ（エンドピン側）',        // 任意。アートワーク直上に出す小さな見出し
       bottomCaption: '▼ 前（ボディ上部側）',       // 任意。アートワーク直下に出す小さな見出し
       extra: {                                    // 任意。チップ凡例の下に追加パネルを1枠確保する
         height: 140,                              // （courierの刻印クローズアッププレビュー等）
         draw: async (ctx, box) => {...},           // box = {x, y, width, height}
       },
     });
*/
async function build708SaveCanvas({ title, svgSelector, svgW, svgH, chips, prepareSvg, topCaption, bottomCaption, extra, size = 1080, pad = 56 }) {
  const SIZE = size, PAD = pad;

  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 左上：モデル名ラベル（全幅ヘッダー帯は敷かない）
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, PAD, PAD + 30);
  ctx.fillStyle = '#999';
  ctx.font = '14px sans-serif';
  ctx.fillText('COLOR SIMULATOR｜708works', PAD, PAD + 54);

  // 凡例チップの折り返し行数を先に計算し、逆算してアートワーク領域の高さを確定する
  ctx.font = '15px sans-serif';
  const chipWidths = chips.map(c => 22 + ctx.measureText(c.label).width);
  const chipGap = 28;
  const maxRowW = SIZE - PAD * 2;
  let chipRows = 1, rowW = 0;
  chipWidths.forEach(w => {
    if (rowW > 0 && rowW + chipGap + w > maxRowW) { chipRows++; rowW = 0; }
    rowW += (rowW > 0 ? chipGap : 0) + w;
  });
  const legendH = chips.length ? chipRows * 30 + (chipRows - 1) * 10 : 0;
  const extraH = extra ? extra.height + 16 : 0;
  const footerH = 28;
  const topCaptionH = topCaption ? 24 : 0;
  const bottomCaptionH = bottomCaption ? 24 : 0;
  const artworkTop = PAD + 76 + topCaptionH;
  const artworkBottom = SIZE - PAD - footerH - 16 - legendH - extraH - bottomCaptionH;
  const artworkBoxW = SIZE - PAD * 2;
  const artworkBoxH = artworkBottom - artworkTop;

  if (topCaption) {
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(topCaption, SIZE / 2, artworkTop - 8);
  }
  if (bottomCaption) {
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bottomCaption, SIZE / 2, artworkBottom + 18);
  }

  // SVGをシリアライズしてCanvasに描画（iOS Safari互換のためdata URIを使用）。
  // 元SVGの縦横比を保ったまま、正方形の残り領域にcontainで収める。
  const svgEl = document.querySelector(svgSelector);
  if (svgEl) {
    const cloned = svgEl.cloneNode(true);
    cloned.style.margin = '0';
    if (typeof prepareSvg === 'function') await prepareSvg(cloned);
    const fitScale = Math.min(artworkBoxW / svgW, artworkBoxH / svgH);
    const drawW = svgW * fitScale, drawH = svgH * fitScale;
    cloned.setAttribute('width', drawW);
    cloned.setAttribute('height', drawH);
    const drawX = PAD + (artworkBoxW - drawW) / 2;
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

  // extraパネル（courierの刻印クローズアップ等、チップ凡例より前の専用枠）
  let cursorY = artworkBottom + bottomCaptionH;
  if (extra) {
    const box = { x: PAD, y: cursorY + 16, width: SIZE - PAD * 2, height: extra.height };
    if (typeof extra.draw === 'function') await extra.draw(ctx, box);
    cursorY += extraH;
  }

  // 凡例チップ（中央揃え、複数行になる場合は行ごとに中央揃え）
  if (chips.length) {
    let y = cursorY + 16 + 20, lineStartIdx = 0, lineW = 0;
    const lineStarts = [];
    chipWidths.forEach((w, i) => {
      if (lineW > 0 && lineW + chipGap + w > maxRowW) { lineStarts.push({ from: lineStartIdx, to: i, w: lineW }); lineStartIdx = i; lineW = 0; }
      lineW += (lineW > 0 ? chipGap : 0) + w;
    });
    lineStarts.push({ from: lineStartIdx, to: chips.length, w: lineW });

    lineStarts.forEach(line => {
      let cx = PAD + (maxRowW - line.w) / 2;
      for (let i = line.from; i < line.to; i++) {
        const c = chips[i];
        if (c.hex) {
          ctx.beginPath();
          ctx.arc(cx + 7, y - 5, 7, 0, Math.PI * 2);
          ctx.fillStyle = c.hex;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fillStyle = '#333';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.label, cx + 20, y);

        cx += chipWidths[i] + chipGap;
      }
      y += 40;
    });
  }

  // フッター（控えめな透かし、帯は敷かない）
  ctx.fillStyle = '#aaa';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('708works.jp', SIZE - PAD, SIZE - PAD + footerH - 10);

  return cv;
}
