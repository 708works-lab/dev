/* Engrave Simulator (prototype) — テキスト + フォント選択でレーザー刻印の仕上がりイメージをプレビュー */
(function () {
  const FONTS = [
    { id: 'A', family: 'Cabin Sketch', weight: '700', google: true },
    { id: 'B', family: 'Special Elite', weight: '400', google: true },
    { id: 'C', family: 'Lobster', weight: '400', google: true },
    { id: 'D', family: 'Playball', weight: '400', google: true },
    { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true }
  ];
  const MAX_LEN = 20;
  const DEFAULT_TEXT = 'Sample 0123';

  let state = { text: DEFAULT_TEXT, fontId: 'A' };

  function currentFont() {
    return FONTS.find(f => f.id === state.fontId);
  }

  async function loadFonts() {
    const localFont = new FontFace('AG Stencil', 'url(./fonts/AG-Stencil.ttf)');
    document.fonts.add(localFont);
    const specs = FONTS.map(f => `${f.weight} 40px "${f.family}"`);
    await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => {})));
    await localFont.load().catch(() => {});
  }

  function buildFontGrid() {
    const grid = document.getElementById('eg-font-grid');
    grid.innerHTML = '';
    FONTS.forEach(f => {
      const el = document.createElement('div');
      el.className = 'font-opt' + (f.id === state.fontId ? ' active' : '');
      el.dataset.id = f.id;
      el.innerHTML = `
        <div class="fo-label">フォント${f.id}${f.noUppercase ? '（大文字非対応）' : ''}</div>
        <div class="fo-sample" style="font-family:'${f.family}';font-weight:${f.weight};">${f.family}</div>
      `;
      el.addEventListener('click', () => {
        state.fontId = f.id;
        buildFontGrid();
        validateAndDraw();
      });
      grid.appendChild(el);
    });
  }

  function validateAndDraw() {
    const input = document.getElementById('eg-text');
    const countEl = document.getElementById('eg-char-count');
    const warnEl = document.getElementById('eg-warn');
    let text = input.value;

    const overLen = text.length > MAX_LEN;
    countEl.textContent = `${text.length} / ${MAX_LEN}`;
    countEl.classList.toggle('over', overLen);

    const font = currentFont();
    const warnings = [];
    if (/[^\x00-\x7F]/.test(text)) {
      warnings.push('半角英数字・記号のみご入力ください（日本語・全角文字は正しく表示されません）。');
    }
    if (font.noUppercase && /[A-Z]/.test(text)) {
      warnings.push(`フォント${font.id}は大文字に対応していません。小文字でご入力ください。`);
    }
    if (overLen) {
      warnings.push(`文字数の上限は${MAX_LEN}文字です（試作版の暫定値。商品ごとに刻印可能エリアが決まり次第調整します）。`);
    }
    warnEl.innerHTML = warnings.join('<br>');
    warnEl.classList.toggle('show', warnings.length > 0);

    state.text = text;
    draw();
  }

  function draw() {
    const canvas = document.getElementById('eg-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // プレースホルダー背景（実際の刻印箇所画像に差し替え予定）
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#d9c9a8');
    grad.addColorStop(1, '#c2ae86');
    ctx.fillStyle = grad;
    roundRect(ctx, 20, 20, W - 40, H - 40, 16);
    ctx.fill();

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();
    const maxWidth = W - 100;
    let fontSize = 64;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    do {
      ctx.font = `${font.weight} ${fontSize}px "${font.family}"`;
      const w = ctx.measureText(text).width;
      if (w <= maxWidth || fontSize <= 14) break;
      fontSize -= 2;
    } while (true);

    const cx = W / 2, cy = H / 2;

    // 刻印風の凹み表現：ハイライト（左上寄り）+ ベース陰影（右下寄り）
    ctx.font = `${font.weight} ${fontSize}px "${font.family}"`;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(text, cx - 1, cy - 1);
    ctx.fillStyle = 'rgba(60,45,25,.85)';
    ctx.fillText(text, cx + 1, cy + 1);
    ctx.fillStyle = '#3a2d1a';
    ctx.fillText(text, cx, cy);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function saveImage() {
    const canvas = document.getElementById('eg-canvas');
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `engrave-preview-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  async function init() {
    const input = document.getElementById('eg-text');
    input.value = DEFAULT_TEXT;
    input.addEventListener('input', validateAndDraw);
    document.getElementById('eg-save-btn').addEventListener('click', saveImage);

    buildFontGrid();
    await loadFonts();
    validateAndDraw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
