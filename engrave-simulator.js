/* Engrave Simulator (prototype) — テキスト + フォント選択でレーザー刻印の仕上がりイメージをプレビュー */
(function () {
  const FONTS = [
    { id: 'A', family: 'Cabin Sketch', weight: '700', google: true, category: '手書き' },
    { id: 'B', family: 'Special Elite', weight: '400', google: true, category: 'スタンプ・タイプ' },
    { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true, category: 'スタンプ・タイプ' },
    { id: 'C', family: 'Lobster', weight: '400', google: true, category: 'スクリプト' },
    { id: 'D', family: 'Playball', weight: '400', google: true, category: 'スクリプト' },
    { id: 'H', family: 'Great Vibes', weight: '400', google: true, category: 'スクリプト' },
    { id: 'F', family: 'Bebas Neue', weight: '400', google: true, category: 'インパクト' },
    { id: 'G', family: 'UnifrakturMaguntia', weight: '400', google: true, category: 'インパクト' }
  ];
  const MAX_LEN = 15;
  const DEFAULT_TEXT = 'Sample 0123';
  // 半角英数字 + 許容記号（- _ . , : ; $ !）+ 半角スペースのみ許可
  const ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;
  const ALLOWED_HINT = '半角英数字と一部の記号（- _ . , : ; $ !）のみご利用いただけます。絵文字・機種依存文字・全角文字はご利用いただけません。';

  let state = { text: DEFAULT_TEXT, fontId: 'A' };

  function currentFont() {
    return FONTS.find(f => f.id === state.fontId);
  }

  function isValid(text, font) {
    if (!text) return false;
    if (text.length > MAX_LEN) return false;
    if (!ALLOWED_PATTERN.test(text)) return false;
    if (font.noUppercase && /[A-Z]/.test(text)) return false;
    return true;
  }

  async function loadFonts() {
    const localFont = new FontFace('AG Stencil', 'url(./fonts/AG-Stencil.ttf)');
    document.fonts.add(localFont);
    const specs = FONTS.map(f => `${f.weight} 40px "${f.family}"`);
    await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => {})));
    await localFont.load().catch(() => {});
  }

  function buildFontSelect() {
    const select = document.getElementById('eg-font-select');
    select.innerHTML = '';
    FONTS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `${f.category} － ${f.family}${f.noUppercase ? '（大文字非対応）' : ''}`;
      if (f.id === state.fontId) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      state.fontId = select.value;
      updateFontPreview();
      validateAndDraw();
    });
    updateFontPreview();
  }

  function updateFontPreview() {
    const font = currentFont();
    const preview = document.getElementById('eg-font-preview');
    preview.textContent = font.family;
    preview.style.fontFamily = `'${font.family}'`;
    preview.style.fontWeight = font.weight;
  }

  function validateAndDraw() {
    const input = document.getElementById('eg-text');
    const countEl = document.getElementById('eg-char-count');
    const warnEl = document.getElementById('eg-warn');
    const saveBtn = document.getElementById('eg-save-btn');
    let text = input.value;

    const overLen = text.length > MAX_LEN;
    countEl.textContent = `${text.length} / ${MAX_LEN}`;
    countEl.classList.toggle('over', overLen);

    const font = currentFont();
    const warnings = [];
    if (!ALLOWED_PATTERN.test(text)) {
      warnings.push(ALLOWED_HINT);
    }
    if (font.noUppercase && /[A-Z]/.test(text)) {
      warnings.push(`フォント${font.id}は大文字に対応していません。小文字でご入力ください。`);
    }
    if (overLen) {
      warnings.push(`文字数の上限は${MAX_LEN}文字です。`);
    }
    if (!text) {
      warnings.push('刻印する文字を入力してください。');
    }
    warnEl.innerHTML = warnings.join('<br>');
    warnEl.classList.toggle('show', warnings.length > 0);

    const valid = isValid(text, font);
    saveBtn.disabled = !valid;
    saveBtn.classList.toggle('btn-disabled', !valid);

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
    const maxWidth = W - 140;
    let fontSize = 52;
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
    if (!isValid(state.text, currentFont())) return;
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

    buildFontSelect();
    await loadFonts();
    validateAndDraw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
