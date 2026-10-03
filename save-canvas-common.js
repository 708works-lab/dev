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


/* ═══════════════════════════════════════════════════════════════════
   【2026-10-03追加】注文導線の共通処理（保存とカート投入の分離）
   背景：「画像を保存してカートに入れる」の1ボタン構成は、Instagram等のアプリ内ブラウザで
   画像保存が機能せず、カート投入の妨げになりうる。配色の記録は注文情報(Colors/Image URL)に
   残るため、保存は「任意」に分離した。
   - sim708Track        : GA4へステップ計測（dataLayerにgtag形式でpush。GTM側の追加設定不要）
   - sim708IsInApp      : アプリ内ブラウザ判定
   - sim708FallbackUpload: 画像アップロード失敗時の代替（カート投入を止めない）
   - sim708SetupOrderUI : ボタン文言の変更・「画像だけ保存」ボタンの追加・各関数の計測ラップ
   各商品JSの末尾で sim708SetupOrderUI({...}) を1回呼ぶ。
═══════════════════════════════════════════════════════════════════ */

function sim708IsInApp() {
  return /Instagram|FBAN|FBAV|FB_IAB|\bLine\/|MicroMessenger|TikTok|musical_ly|Bytedance|Twitter|Pinterest|Snapchat|KAKAOTALK/i
    .test(navigator.userAgent || '');
}

function sim708Track(step, product, extra) {
  try {
    window.dataLayer = window.dataLayer || [];
    const params = Object.assign({ sim_product: product, sim_in_app: sim708IsInApp() ? 'yes' : 'no' }, extra || {});
    // gtag()と同じ形式（Argumentsオブジェクト）でpushすると、ページ上のGoogleタグがそのままGA4イベントとして送信する
    (function () { window.dataLayer.push(arguments); })('event', 'sim_' + step, params);
  } catch (e) { /* 計測失敗で操作を止めない */ }
}

function sim708FallbackUpload(prefix) {
  return { orderId: prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(), imageUrl: '' };
}

function sim708ShowLongPressSave(canvas) {
  const old = document.getElementById('sim708-longpress');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'sim708-longpress';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;';
  wrap.innerHTML =
    '<div style="background:#fff;border-radius:12px;max-width:380px;width:100%;max-height:92vh;overflow:auto;padding:16px;text-align:center;">' +
    '<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#1a1a1a;">画像を長押しして保存してください</p>' +
    '<img alt="配色画像" style="width:100%;border-radius:8px;display:block;-webkit-touch-callout:default;user-select:auto;">' +
    '<p style="margin:10px 0 12px;font-size:11px;color:#777;line-height:1.6;">iPhone：長押し →「“写真”に追加」<br>Android：長押し →「画像をダウンロード」</p>' +
    '<button type="button" style="width:100%;padding:11px;border:1px solid #ccc;border-radius:8px;background:#fff;font-size:13px;cursor:pointer;">閉じる</button></div>';
  wrap.querySelector('img').src = canvas.toDataURL('image/png');
  wrap.querySelector('button').onclick = () => wrap.remove();
  document.body.appendChild(wrap);
}

function sim708SetupOrderUI(cfg, _tries) {
  _tries = _tries || 0;
  const orderBtn = document.querySelector(cfg.orderBtnSelector);
  if (!orderBtn) {
    if (_tries < 40) setTimeout(() => sim708SetupOrderUI(cfg, _tries + 1), 250);
    return;
  }
  if (orderBtn.dataset.sim708Setup) return;
  orderBtn.dataset.sim708Setup = '1';
  const product = cfg.product;

  // 1) ボタン文言：保存の文言を外し、カート投入だと明示する
  const label = orderBtn.querySelector('[id$="-cart-label"]') || orderBtn;
  const setLabel = () => { if (label.textContent.indexOf('画像を保存して') !== -1) label.textContent = 'カートに入れる →'; };
  setLabel();
  new MutationObserver(setLabel).observe(label, { childList: true, characterData: true, subtree: true });

  // 2) 「配色画像だけ保存」ボタン（任意・カートに入れずに保存したい人向け）
  if (!document.getElementById('sim708-style')) {
    const st = document.createElement('style');
    st.id = 'sim708-style';
    st.textContent =
      '.sim708-save-only{display:block;width:100%;box-sizing:border-box;margin:8px auto 0;padding:10px 12px;border:1.5px solid #c8a04a;border-radius:8px;background:#fff;color:#7a5a14;font-size:12px;font-weight:600;cursor:pointer;text-align:center;}' +
      '.sim708-save-note{box-sizing:border-box;margin:4px auto 0;font-size:10.5px;color:#888;text-align:center;line-height:1.5;}' +
      '.modal-image[src=""]{display:none;}';
    document.head.appendChild(st);
  }
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'sim708-save-only';
  saveBtn.textContent = '配色イメージを画像で保存する';
  const note = document.createElement('p');
  note.className = 'sim708-save-note';
  note.textContent = 'SNSへの投稿や、ご家族・お仲間との相談、じっくりご検討したいときに。カートには入りません。';
  const bar = orderBtn.parentElement;
  bar.insertAdjacentElement('afterend', note);
  bar.insertAdjacentElement('afterend', saveBtn);
  // 操作バー（リセット/戻る/カート）と同じ幅・中央揃えにそろえる（商品ごとにバーの最大幅が異なるため実測で合わせる）
  const syncWidth = () => {
    // バー自体の余白(padding)の内側＝リセット/戻る/カートが実際に並ぶ幅に合わせる
    const cs = getComputedStyle(bar);
    const w = bar.getBoundingClientRect().width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (!(w > 0)) return;
    [saveBtn, note].forEach((el) => { el.style.width = w + 'px'; el.style.marginLeft = 'auto'; el.style.marginRight = 'auto'; });
  };
  syncWidth();
  if (window.ResizeObserver) new ResizeObserver(syncWidth).observe(bar);
  window.addEventListener('resize', syncWidth);
  saveBtn.addEventListener('click', async () => {
    sim708Track('save_only_click', product);
    try {
      if (sim708IsInApp() && window[cfg.buildCanvas]) {
        sim708ShowLongPressSave(await window[cfg.buildCanvas]());
        sim708Track('save_only_longpress', product);
      } else {
        await window[cfg.saveOnly]();
        sim708Track('save_only_done', product);
      }
    } catch (e) {
      console.error(e);
      sim708Track('save_only_error', product, { sim_error: String(e && e.message || e).slice(0, 80) });
    }
  });

  // 3) 既存関数を計測ラップ（onclick属性はwindow上の関数名を引くため、差し替えが効く）
  const wrap = (name, before, after) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = async function () {
      if (before) before();
      const r = await orig.apply(this, arguments);
      if (after) after();
      return r;
    };
  };
  const afterOrder = () => {
    const shown = document.querySelector('.modal.show, .kolmio-modal.show, [id$="-confirm-modal"].show');
    sim708Track(shown ? 'modal_shown' : 'order_blocked', product);
  };
  if (cfg.bound) {
    // addEventListenerで関数が直接バインドされている商品：関数の差し替えが効かないため、クリックを直接計測する
    orderBtn.addEventListener('click', () => { sim708Track('order_click', product); setTimeout(afterOrder, 3500); });
  } else {
    wrap(cfg.goOrder, () => sim708Track('order_click', product), afterOrder);
  }
  wrap(cfg.proceed, () => sim708Track('cart_submit', product));

  // 4) 画面内の他のカートボタン（フローティングバー等）の旧文言も差し替える
  document.querySelectorAll('button').forEach((b) => {
    if (b.textContent.indexOf('画像を保存してカートに入れる') !== -1) b.textContent = 'カートに入れる →';
  });
}


/* ═══════════════════════════════════════════════════════════════════
   【2026-10-03追加】オーダー画像URLを独自ドメイン(img.708works.jp)に寄せる暫定処理
   画像アップロード用Worker(folklore-image-upload)が旧URL(pub-…r2.dev。レート制限あり・本番非推奨)を
   返すため、Workerの返答に含まれる旧URLを新ドメインへ書き換える。
   Worker側が最初から新ドメインを返すようになれば、書き換え対象が無くなり自然に何もしなくなる。
═══════════════════════════════════════════════════════════════════ */
(function () {
  if (typeof window === 'undefined' || window.__sim708FetchPatched) return;
  window.__sim708FetchPatched = true;
  const WORKER = /folklore-image-upload\.708works\.workers\.dev/;
  const OLD_BASE = /https:\/\/pub-a69e6e3c6bce4a1f87270114ca884ad8\.r2\.dev\//g;
  const NEW_BASE = 'https://img.708works.jp/';
  const orig = window.fetch;
  window.fetch = function (input) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const p = orig.apply(this, arguments);
    if (!WORKER.test(url)) return p;
    return p.then(async (res) => {
      try {
        const text = await res.clone().text();
        const fixed = text.replace(OLD_BASE, NEW_BASE);
        if (fixed === text) return res;
        return new Response(fixed, { status: res.status, statusText: res.statusText, headers: res.headers });
      } catch (e) {
        return res; // 失敗しても元の応答をそのまま返す（購入を止めない）
      }
    });
  };
})();
