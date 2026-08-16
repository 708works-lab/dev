/* Triad Kokuin (engrave) Simulator — Phase 2 prototype
   実際の刻印箇所SVG（triad_kokuin_base.svg）上に、選択フォント・入力文字で
   SVG <text> を動的配置してプレビューする。位置・角度は、708worksが用意した
   サンプル刻印（ABCDEFG）のパス座標から算出した固定値。 */
(function () {
  const FONTS = [
    { id: 'A', family: 'Cabin Sketch', weight: '700', google: true, googleParam: 'Cabin+Sketch:wght@700', category: '手書き' },
    { id: 'B', family: 'Special Elite', weight: '400', google: true, googleParam: 'Special+Elite', category: 'スタンプ・タイプ' },
    { id: 'E', family: 'AG Stencil', weight: '400', google: false, noUppercase: true, localUrl: './fonts/AG-Stencil.ttf', category: 'スタンプ・タイプ' },
    { id: 'C', family: 'Lobster', weight: '400', google: true, googleParam: 'Lobster', category: 'スクリプト' },
    { id: 'D', family: 'Playball', weight: '400', google: true, googleParam: 'Playball', category: 'スクリプト' },
    { id: 'H', family: 'Great Vibes', weight: '400', google: true, googleParam: 'Great+Vibes', category: 'スクリプト' },
    { id: 'F', family: 'Bebas Neue', weight: '400', google: true, googleParam: 'Bebas+Neue', category: 'インパクト' },
    { id: 'G', family: 'UnifrakturMaguntia', weight: '400', google: true, googleParam: 'UnifrakturMaguntia', category: 'インパクト' }
  ];
  const MAX_LEN = 15;
  // 半角英数字 + 許容記号（- _ . , : ; $ !）+ 半角スペースのみ許可
  const ALLOWED_PATTERN = /^[A-Za-z0-9\-_.,:;$!\s]*$/;
  const ALLOWED_HINT = '半角英数字と一部の記号（- _ . , : ; $ !）のみご利用いただけます。絵文字・機種依存文字・全角文字はご利用いただけません。';

  // ── サンプル刻印パス（ABCDEFG）から算出した配置基準（2026-08-16差し替え版SVGで再計測） ──
  // 中心アンカー：先頭文字と末尾文字のbbox中心の中点
  // 角度：先頭→末尾の中心を結んだ直線の傾き
  const VIEWBOX = { w: 713.65, h: 639.56 };
  const ANCHOR = { x: 270.86, y: 327.15 };
  const ANGLE_DEG = 32.44;
  const BASE_FONT_SIZE = 26;   // 文字数が少ないときも詰まって見えないよう、控えめな初期値に設定
  const MAX_TEXT_WIDTH = 190;  // ベルト幅に収まる目安の最大横幅（SVGローカル座標）。余白を残すため実測より狭めに設定
  const MIN_FONT_SIZE = 11;

  let state = { text: 'Sample', fontId: 'A' };

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
    const localFont = new FontFace('AG Stencil', `url(${FONTS.find(f => f.id === 'E').localUrl})`);
    document.fonts.add(localFont);
    const specs = FONTS.map(f => `${f.weight} 40px "${f.family}"`);
    await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => {})));
    await localFont.load().catch(() => {});
  }

  async function loadBaseSvg() {
    const res = await fetch('./triad_kokuin_base.svg');
    const svgText = await res.text();
    document.getElementById('tk-svg-wrap').innerHTML = svgText;
  }

  function buildFontGrid() {
    const grid = document.getElementById('tk-font-grid');
    grid.innerHTML = '';
    let lastCategory = null;
    FONTS.forEach(f => {
      if (f.category !== lastCategory) {
        const heading = document.createElement('div');
        heading.className = 'font-category';
        heading.textContent = f.category;
        grid.appendChild(heading);
        lastCategory = f.category;
      }
      const row = grid.lastElementChild.classList.contains('font-row') ? grid.lastElementChild : (() => {
        const r = document.createElement('div');
        r.className = 'font-row';
        grid.appendChild(r);
        return r;
      })();
      const el = document.createElement('div');
      el.className = 'font-opt' + (f.id === state.fontId ? ' active' : '');
      el.innerHTML = `
        <div class="fo-label">フォント${f.id}${f.noUppercase ? '（大文字非対応）' : ''}</div>
        <div class="fo-sample" style="font-family:'${f.family}';font-weight:${f.weight};">${f.family}</div>
      `;
      el.addEventListener('click', () => {
        state.fontId = f.id;
        buildFontGrid();
        validateAndDraw();
      });
      row.appendChild(el);
    });
  }

  function validateAndDraw() {
    const input = document.getElementById('tk-text');
    const countEl = document.getElementById('tk-char-count');
    const warnEl = document.getElementById('tk-warn');
    const saveBtn = document.getElementById('tk-save-btn');
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
    drawKokuinText();
  }

  function drawKokuinText() {
    const group = document.getElementById('kokuin');
    if (!group) return;
    group.innerHTML = '';

    const text = state.text || '';
    if (!text) return;

    const font = currentFont();
    const ns = 'http://www.w3.org/2000/svg';
    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('x', ANCHOR.x);
    textEl.setAttribute('y', ANCHOR.y);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('transform', `rotate(${ANGLE_DEG} ${ANCHOR.x} ${ANCHOR.y})`);
    textEl.setAttribute('font-family', font.family);
    textEl.setAttribute('font-weight', font.weight);
    textEl.setAttribute('font-size', BASE_FONT_SIZE);
    textEl.setAttribute('fill', '#2a1710');
    textEl.setAttribute('fill-opacity', '0.82');
    textEl.textContent = text;
    group.appendChild(textEl);

    // 横幅を測定してベルト幅に収まるようフォントサイズを自動縮小
    const measuredWidth = textEl.getBBox().width;
    if (measuredWidth > MAX_TEXT_WIDTH) {
      const fitted = Math.max(MIN_FONT_SIZE, BASE_FONT_SIZE * (MAX_TEXT_WIDTH / measuredWidth));
      textEl.setAttribute('font-size', fitted);
    }
  }

  async function fetchAsDataUri(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function buildFontFaceCss(font) {
    if (!font.google) {
      const dataUri = await fetchAsDataUri(font.localUrl);
      return `@font-face { font-family: '${font.family}'; src: url('${dataUri}') format('truetype'); }`;
    }
    const cssRes = await fetch(`https://fonts.googleapis.com/css2?family=${font.googleParam}&display=swap`);
    const cssText = await cssRes.text();
    const match = cssText.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)\s*format\('(\w+)'\)/);
    if (!match) return '';
    const [, fontUrl, format] = match;
    const dataUri = await fetchAsDataUri(fontUrl);
    return `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; src: url('${dataUri}') format('${format}'); }`;
  }

  async function saveImage() {
    const font = currentFont();
    if (!isValid(state.text, font)) return;

    const saveBtn = document.getElementById('tk-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '画像を生成中…';
    try {
      const liveSvg = document.querySelector('#tk-svg-wrap svg');
      const clone = liveSvg.cloneNode(true);
      clone.setAttribute('width', String(VIEWBOX.w));
      clone.setAttribute('height', String(VIEWBOX.h));

      const fontFaceCss = await buildFontFaceCss(font);
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = fontFaceCss;
      clone.querySelector('defs').appendChild(styleEl);

      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080 * (VIEWBOX.h / VIEWBOX.w);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = `triad-kokuin-preview-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(dlUrl);
      }, 'image/png');
    } catch (e) {
      console.error('[triad-kokuin] save failed', e);
      alert('画像の生成に失敗しました。もう一度お試しください。');
    } finally {
      saveBtn.disabled = !isValid(state.text, currentFont());
      saveBtn.textContent = '画像を保存する';
    }
  }

  async function init() {
    const input = document.getElementById('tk-text');
    input.addEventListener('input', validateAndDraw);
    document.getElementById('tk-save-btn').addEventListener('click', saveImage);

    buildFontGrid();
    await Promise.all([loadFonts(), loadBaseSvg()]);
    validateAndDraw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
