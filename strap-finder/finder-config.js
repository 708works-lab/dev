// ============================================================================
// ストラップ診断 設定ファイル（質問・結果ルール・文言・配色はすべてここ）
//  - 設問や文言の変更は、このファイルだけを編集すれば反映される（finder.js は触らない）
//  - 元資料: Googleドライブ「ストラップ診断_適合表」「ストラップ診断_質問フロー設計」
//  - 適合の根拠: 各モデルの商品説明と店主の実績回答（2026-11-02）
// ============================================================================
window.STRAP_FINDER_CONFIG = {

  // ---- 画面まわり ----
  prototypeBanner: false,   // true: 画面上部に「試作版」を表示。公開時は false
  intro: {
    kicker: 'STRAP FINDER',
    title: 'あなたにぴったりの\nストラップ診断',
    lead: 'いくつかの質問に答えるだけで、楽器に合うモデルと配色をご提案します。',
    time: '所要時間 約1分',
    start: '診断をはじめる'
  },
  buttons: {
    back: '戻る',
    open: '商品ページを見る',
    simulator: 'この配色でシミュレーターを開く',
    restart: '最初からやり直す',
    consult: 'ご相談はこちら'
  },
  consultUrl: 'https://708works.jp/pages/contact',

  // ---- レザー20色（既存シミュレーターと同じ） ----
  palette: {
    white:   { name: 'White',      hex: '#f2f0ec' },
    yellow:  { name: 'Yellow',     hex: '#e8c84a' },
    lgrn:    { name: 'Light GRN',  hex: '#a8c43a' },
    lbl:     { name: 'Light BL',   hex: '#7baed0' },
    orange:  { name: 'Orange',     hex: '#e04e1a' },
    sakura:  { name: 'Sakura',     hex: '#f0a0a8' },
    pink:    { name: 'Pink',       hex: '#d96090' },
    red:     { name: 'Red',        hex: '#b82828' },
    winered: { name: 'Wine Red',   hex: '#7a2035' },
    navy:    { name: 'Navy',       hex: '#1e2540' },
    natural: { name: 'Natural',    hex: '#e8c4a0' },
    tan:     { name: 'Tan',        hex: '#d4742a' },
    camel:   { name: 'Camel',      hex: '#c46030' },
    brown:   { name: 'Brown',      hex: '#9e3820' },
    choco:   { name: 'Choco',      hex: '#4a2018' },
    grey:    { name: 'Grey',       hex: '#9090a0' },
    olive:   { name: 'Olive',      hex: '#7a7848' },
    green:   { name: 'Green',      hex: '#3a5030' },
    greenbl: { name: 'Green Blue', hex: '#2a5060' },
    black:   { name: 'Black',      hex: '#1a1a1a' }
  },

  // ---- 質問（上から順に出す。show が false の質問は飛ばす） ----
  // a = これまでの答え。a.inst = 楽器、a.pin = ピン、a.weight = 重さ、a.focus = 重視、a.color = 楽器の色、a.mood = 雰囲気
  steps: [
    {
      id: 'inst', title: 'どの楽器に使いますか？', note: '',
      layout: 'grid',
      options: [
        { value: 'elec_guitar', label: 'エレキギター' },
        { value: 'acoustic',    label: 'アコースティック\nギター' },
        { value: 'bass',        label: 'エレキベース' },
        { value: 'mini',        label: 'ミニギター・\nギタレレ' },
        { value: 'uke_s',       label: 'ウクレレ', sub: 'ソプラノ' },
        { value: 'uke_c',       label: 'ウクレレ', sub: 'コンサート' },
        { value: 'uke_t',       label: 'ウクレレ', sub: 'テナー' },
        { value: 'banjo',       label: 'バンジョー' },
        { value: 'other',       label: 'その他・\nわからない' }
      ]
    },
    {
      id: 'pin', title: 'ストラップピンは付いていますか？',
      note: 'ストラップを引っかける金属のピンです。ウクレレには付いていないことも多いです。',
      show: function (a) { return ['acoustic', 'mini', 'uke_s', 'uke_c', 'uke_t', 'banjo'].indexOf(a.inst) >= 0; },
      options: [
        { value: 'pin2', label: '2つ付いている', sub: '楽器の下側と、ネック側に1つずつ' },
        { value: 'pin1', label: '1つだけ付いている', sub: '楽器の下側だけ' },
        { value: 'pin0', label: '付いていない・わからない' }
      ]
    },
    {
      id: 'weight', title: '楽器の重さはどれくらいですか？',
      note: '長い時間かけると肩が疲れる楽器は「重め」を選んでください。',
      show: function (a) { return a.inst === 'elec_guitar'; },
      options: [
        { value: 'heavy',  label: '重め', sub: '長時間だと肩がつらい' },
        { value: 'normal', label: 'ふつう・軽め' },
        { value: 'normal', label: 'わからない' }
      ]
    },
    {
      id: 'focus', title: 'ストラップに一番求めるものは？', note: '一番近いものを1つ選んでください。',
      options: [
        { value: 'length', label: '長さをすばやく変えたい' },
        { value: 'gentle', label: '楽器に優しい・傷をつけたくない' },
        { value: 'unique', label: '見た目の個性・目を引くデザイン' },
        { value: 'simple', label: 'シンプルで上品' },
        { value: 'any',    label: 'おまかせ' }
      ]
    },
    {
      id: 'color', title: 'お手持ちの楽器の色は？', note: '楽器と引き立て合う配色をご提案します。',
      layout: 'grid',
      options: [
        { value: 'wood_light', label: '明るい木目', sub: 'ナチュラル', dot: '#e3c391' },
        { value: 'wood_dark',  label: '茶色・サンバースト', dot: '#8a4a22' },
        { value: 'black',      label: '黒・\nダークカラー', dot: '#2a2a2a' },
        { value: 'white',      label: '白・パステル', dot: '#f3efe6' },
        { value: 'color',      label: '赤・青など\n個性的な色', dot: '#4f86c6' },
        { value: 'unknown',    label: 'わからない' }
      ]
    },
    {
      id: 'mood', title: 'どんな雰囲気がお好みですか？',
      note: '1つ選ぶだけで、おすすめの配色をご提案します。選んだあとも自由に変更できます。',
      options: [
        { value: 'soft', label: 'やさしい・ナチュラル', sub: '革の風合いを活かした、やわらかな雰囲気', dots: ['natural', 'camel', 'sakura'] },
        { value: 'bold', label: 'はっきり・カラフル',   sub: 'ステージでも映える、元気な配色',         dots: ['red', 'lbl', 'yellow'] },
        { value: 'chic', label: '落ち着き・シック',     sub: 'どんな楽器にも合わせやすい、大人の配色', dots: ['black', 'navy', 'choco'] }
      ]
    }
  ],

  // ---- 答えから「楽器グループ」を決める ----
  groupOf: function (a) {
    if (a.inst === 'bass') return 'bass';
    if (a.inst === 'elec_guitar') return a.weight === 'heavy' ? 'elec_heavy' : 'guitar';
    if (a.inst === 'acoustic') return 'guitar';
    return a.inst; // mini / uke_s / uke_c / uke_t / banjo
  },

  // ---- 結果ルール: グループ × 重視 → [1位, 2位, 3位]（3位は省略可） ----
  // モデルIDは下の models のキー
  rules: {
    guitar: {
      length: ['courier', 'duet', 'triad'],
      gentle: ['folklore', 'folklore_clear', 'kolmio_thick'],
      unique: ['folklore', 'duet', 'kolmio_thick'],
      simple: ['triad', 'courier', 'folklore_clear'],
      any:    ['courier', 'folklore', 'kolmio_thick']
    },
    elec_heavy: {
      length: ['courier', 'triad'],
      gentle: ['triad', 'courier'],
      unique: ['triad', 'courier'],
      simple: ['triad', 'courier'],
      any:    ['courier', 'triad']
    },
    bass: {
      length: ['courier', 'triad'],
      gentle: ['triad', 'courier'],
      unique: ['triad', 'courier', 'folklore'],
      simple: ['triad', 'courier'],
      any:    ['courier', 'triad']
    },
    mini: {
      length: ['duet', 'courier', 'wellington'],
      gentle: ['wellington', 'folklore_clear', 'triad_uke'],
      unique: ['wellington', 'folklore', 'kolmio_thick'],
      simple: ['triad_uke', 'wellington', 'triad'],
      any:    ['wellington', 'triad_uke', 'folklore_clear']
    },
    uke_t: {
      length: ['duet', 'courier', 'wellington'],
      gentle: ['wellington', 'folklore_clear', 'kolmio'],
      unique: ['wellington', 'folklore_clear', 'kolmio'],
      simple: ['triad_uke', 'wellington', 'kolmio'],
      any:    ['wellington', 'triad_uke', 'folklore_clear']
    },
    uke_c: {
      length: ['triad_uke', 'wellington', 'duet'],
      gentle: ['wellington', 'kolmio', 'triad_uke'],
      unique: ['wellington', 'kolmio', 'triad_uke'],
      simple: ['triad_uke', 'wellington', 'kolmio'],
      any:    ['wellington', 'triad_uke', 'kolmio']
    },
    uke_s: {
      length: ['triad_uke', 'wellington', 'kolmio'],
      gentle: ['wellington', 'kolmio', 'triad_uke'],
      unique: ['wellington', 'kolmio', 'triad_uke'],
      simple: ['triad_uke', 'wellington', 'kolmio'],
      any:    ['wellington', 'kolmio', 'triad_uke']
    },
    banjo: {
      length: ['triad_uke', 'wellington', 'folklore'],
      gentle: ['wellington', 'folklore', 'kolmio'],
      unique: ['folklore', 'wellington', 'kolmio'],
      simple: ['triad_uke', 'wellington', 'kolmio'],
      any:    ['triad_uke', 'wellington', 'folklore']
    }
  },

  // ---- Duetの2タイプ(診断のたびにランダムで片方を提案)。url は同じ商品ページ、?diag_style= でタイプを伝える ----
  variants: {
    duet: [
      { id: 'duet_cw73',  model: { name: 'duet CW73',  ja: 'デュエット（ウロコ正位置）',  line: 'ウロコ状の見た目はそのままに、無段階で長さを合わせられます。片手でも調整できます。ウロコの向きが正位置の「CW73」です。', extraQuery: '' } },
      { id: 'duet_cw73r', model: { name: 'duet CW73R', ja: 'デュエット（ウロコ逆向き）', line: 'ウロコ状の見た目はそのままに、無段階で長さを合わせられます。片手でも調整できます。ウロコの向きを上下逆にした「CW73R」です。', extraQuery: 'duetstyle=reverse' } }
    ]
  },

  // ---- モデル情報 ----
  // scaly: true のモデルは、長期使用で少し伸びる注記の対象（ウロコ状パーツ構造）
  models: {
    courier: {
      handoff: { param: 'courier', n: 2, belt: true },
      wornNote: 'ギターに着けた例です。ベルトの色もあわせてご提案しています。',
      patterns: ['mono', 'duo'],
      name: 'Courier', ja: 'クーリエ', price: '¥9,130〜', url: 'https://708works.jp/products/courier',
      line: '背面の引き手を片手で引くだけで、演奏中でも長さを変えられます。曲ごとに構えを変えたい方に。'
    },
    duet: {
      handoff: { param: 'duet', n: 5, belt: true },
      wornNote: 'ギターに着けた例です。ベルトの色もあわせてご提案しています。',
      patterns: ['mono', 'duo', 'trio'],
      name: 'duet', ja: 'デュエット', price: '¥13,860〜', url: 'https://708works.jp/products/duet-cw73r', scaly: true,
      line: 'ウロコ状の見た目はそのままに、無段階で長さを合わせられます。片手でも調整できます。'
    },
    folklore: {
      handoff: { param: 'folklore', n: 20, reverse: true },
      wornNote: 'ギターに着けた例です。',
      patterns: ['mono', 'duo', 'trio', 'quad', 'accent', 'ladder'],
      name: 'folklore', ja: 'フォークロア', price: '¥13,640〜', url: 'https://708works.jp/products/folklore', scaly: true,
      line: '金具を使わないので楽器を傷つけにくく、ウロコパーツの付け外しで長さを調整できます。'
    },
    folklore_clear: {
      wornNote: 'ギターに着けた例です。',
      handoff: { kind: 'clear', param: 'clear' },
      patterns: ['mono', 'duo', 'trio'],
      name: 'folklore Clear', ja: 'フォークロア クリア', price: '¥6,688〜', url: 'https://708works.jp/products/folklole-clear', scaly: true,
      line: '透け感のあるPVCと革の組み合わせ。金具を使わず、楽器に優しい作りです。'
    },
    triad: {
      handoff: { kind: 'triad', param: 'triad' },
      patterns: ['mono', 'duo', 'trio'],
      name: 'Triad', ja: 'トライアド', price: '¥27,170〜', url: 'https://708works.jp/products/triad',
      line: '3本の革ベルトを三つ編みにした定番。真鍮のバックルで長さを細かく合わせられ、使うほど味が出ます。'
    },
    triad_uke: {
      handoff: { kind: 'triad', param: 'triad' },
      patterns: ['mono', 'duo', 'trio'],
      name: 'Triad for ukulele', ja: 'トライアド ウクレレ用', price: '¥23,870〜', url: 'https://708works.jp/products/triad-ukulele',
      line: '小型の弦楽器向けの細身の三つ編み。真鍮のバックルで長さを細かく合わせられます。'
    },
    wellington: {
      handoff: { param: 'wellington', n: 20, reverse: true },
      wornNote: 'ウクレレに着けた例です。',
      patterns: ['mono', 'duo', 'trio', 'quad', 'accent', 'ladder'],
      name: 'Wellington', ja: 'ウェリントン', price: '¥17,248〜', url: 'https://708works.jp/products/wellington-ukulele', scaly: true,
      line: '細身のウロコ状で、テナー・コンサートのウクレレやミニギターにちょうどよいサイズです。'
    },
    kolmio: {
      handoff: { param: 'kolmio', n: 14, reverse: true },
      wornNote: 'ウクレレに着けた例です。',
      patterns: ['mono', 'duo', 'trio', 'quad', 'accent', 'ladder'],
      name: 'kolmio', ja: 'コルミオ', price: '¥15,400〜', url: 'https://708works.jp/products/kolmio-ukulele', scaly: true,
      line: '三角のパーツが鎖のようにつながる形。ウロコの数で長さを選べます。'
    },
    kolmio_thick: {
      handoff: { param: 'kolmio', n: 14, reverse: true },
      wornNote: 'ウクレレに着けた例です。',
      patterns: ['mono', 'duo', 'trio', 'quad', 'accent', 'ladder'],
      name: 'kolmio（厚革）', ja: 'コルミオ ギター仕様', price: '¥15,400〜', url: 'https://708works.jp/products/kolmio-ukulele', scaly: true, extraQuery: 'kthick=1',
      line: '革を厚くしたギターストラップ仕様。アコースティックギターでの実績が多く、エレキでもお使いいただいています。',
      how: '商品ページの「仕様」で「ギターストラップ仕様（厚革）」を選んでください。'
    },
    onstage: {
      name: 'Onstage', ja: 'オンステージ', price: '¥2,200', url: 'https://708works.jp/products/onstage',
      line: 'ストラップピンが1つしか無い楽器に取り付けるアタッチメントです。'
    }
  },

  // ---- 「こんな使い方もできます」（モデル × グループで出す一言） ----
  surprises: [
    { model: 'kolmio_thick',   groups: ['guitar', 'mini'],            text: '名前はウクレレ用ですが、革を厚くしたギター仕様もお作りできます。' },
    { model: 'folklore_clear', groups: ['uke_t', 'mini'],             text: 'ギターストラップとして作っていますが、テナーウクレレ（ギタレレ）にもよく合います。' },
    { model: 'triad_uke',      groups: ['mini', 'banjo'],             text: 'ウクレレ用の名前ですが、ミニギターやバンジョーにも使えます。' },
    { model: 'wellington',     groups: ['mini'],                      text: 'ウクレレ用の名前ですが、ミニギターにもちょうどよいサイズです。' },
    { model: 'folklore',       groups: ['bass'],                      text: 'ベースにもお使いいただけます。長く使うと少し伸びることがあります。' }
  ],

  // ---- 注記 ----
  notes: {
    heavy: 'ベースなど重い楽器には、ウロコ状のパーツを連ねるタイプ（長く使うと少し伸びることがあります）よりも、CourierかTriadをおすすめしています。',
    scaly: 'ウロコ状のパーツを連ねる構造は、長く使うと少し伸びることがあります。味わいの変化としてお楽しみいただけます。',
    pinTag: 'ストラップピンが1つ・無い楽器に'
  },


  // ---- 着用イラスト（結果画面でおすすめ配色を塗る）。素材は ../*-worn-svg.js（各シミュレーターと共通） ----
  // 前=先端から1〜、後ろ=〜末端。パーツ番号は先端が1番。配色は3色を番号順にくり返す
  wornMap: { folklore: 'folklore', wellington: 'wellington', kolmio: 'kolmio', kolmio_thick: 'kolmio', duet_cw73: 'duet_cw73', duet_cw73r: 'duet_cw73r', folklore_clear: 'folklore_clear', courier: 'courier', triad: 'triad', triad_uke: 'triad_uke' },  // ここに無いモデルは着用イラストなし
  worn: {
    // 商品イメージのSVGファイルを塗るタイプ(Triad系。着用の絵はなく、前後の切り替えもなし)。cls=部位→SVG内のCSSクラス
    triad: {
      file: '../triad_color_order.svg', single: true, cls: { leather1: 'st1', leather2: 'st4', leather3: 'st2', parts: 'st5', hardware: 'st6' }
    },
    triad_uke: {
      file: '../triad_ukulele_color_order.svg', single: true, cls: { leather1: 'st2', leather2: 'st3', leather3: 'st4', parts: 'st6', hardware: 'st5' }
    },
    // パーツ区分タイプ: zones=部位名→先端からの番号。belt=ベルトの色(診断では選ばないので固定)、logoOn=刻印の色を決めるパーツ番号
    duet_cw73: {
      zones: { front1: 1, front2: 2, front3: 3, front4: 4, rear: 5 }, belt: '#b8a07a', logoOn: 3, global: 'DUET_WORN',
      front: { src: '../duet-worn-cw73.js?v=1', key: 'cw73' }, back: { src: '../duet-worn-back.js?v=1', key: 'back' }
    },
    duet_cw73r: {
      zones: { front1: 1, front2: 2, front3: 3, front4: 4, rear: 5 }, belt: '#b8a07a', logoOn: 3, global: 'DUET_WORN',
      front: { src: '../duet-worn-cw73r.js?v=1', key: 'cw73r' }, back: { src: '../duet-worn-back.js?v=1', key: 'back' }
    },
    courier: {
      zones: { front: 1, rear: 2 }, belt: '#b8a07a', logoOn: 1, global: 'COURIER_WORN',
      front: { src: '../courier-worn-front.js?v=1', key: 'front' }, back: { src: '../courier-worn-back.js?v=1', key: 'back' }
    },
    folklore: {
      src: '../folklore-worn-svg.js?v=1', global: 'FOLKLORE_WORN_INNER', fill: '.st1', logo: '#logo', greyClass: '.st0',
      front: { pieces: '#front g[id^="_x3"]', hide: '#back',  vb: '27 180 427 551' },
      back:  { pieces: '#back g[id^="_x3"]',  hide: '#front', vb: '22 888 436 505' }
    },
    folklore_clear: {  // folkloreの着用SVGを使い、PVC部分は透け感のグラデーションで塗る
      clear: true,
      src: '../folklore-worn-svg.js?v=1', global: 'FOLKLORE_WORN_INNER', fill: '.st1', logo: '#logo', greyClass: '.st0',
      front: { pieces: '#front g[id^="_x3"]', hide: '#back',  vb: '27 180 427 551' },
      back:  { pieces: '#back g[id^="_x3"]',  hide: '#front', vb: '22 888 436 505' }
    },
    wellington: {
      src: '../wellington-worn-svg.js?v=1', global: 'WELLINGTON_WORN_INNER', fill: '.ws', logo: '.wlg',
      frontAlias: { '_x37_1': 7, '_x38_1': 8 },
      front: { pieces: '#strap1 > g', hide: '#back',  vb: '44 226 391 478' },
      back:  { pieces: '#strap > g',  hide: '#front', vb: '11 850 459 516' }
    },
    kolmio: {
      src: '../kolmio-worn-svg.js?v=2', global: 'KOLMIO_WORN_INNER', fill: '.ws', logo: null,
      frontAlias: { '_x36_1': 6 },
      front: { pieces: '#strap1 > g', hide: '#back',  vb: '23 284 433 511' },
      back:  { pieces: '#strap > g',  hide: '#front', vb: '54 970 373 537' }
    }
  },
  wornTexts: { front: '前', back: '後ろ', note: '着用イメージは配色の目安です。実際の色味はシミュレーターでご確認ください。', loading: '読み込み中…' },


  // ---- 色の入れ方（パターン）。f は配色の系統（c=3色, d=4色目, ladder=グラデーション用6色）。先端が1番、番号順にくり返す ----
  patterns: [
    { id: 'mono',   name: '単色',           seq: function (f) { return [f.c[0]]; } },
    { id: 'duo',    name: '2色',            seq: function (f) { return [f.c[0], f.c[1]]; } },
    { id: 'trio',   name: '3色',            seq: function (f) { return [f.c[0], f.c[1], f.c[2]]; } },
    { id: 'quad',   name: '4色',            seq: function (f) { return [f.c[0], f.c[1], f.c[2], f.d]; } },
    { id: 'accent', name: 'ワンポイント',   seq: function (f) { var a = [], i; for (i = 0; i < 24; i++) a.push(f.c[0]); a[2] = f.c[2]; return a; }  /* 先端から数えて3番目だけ差し色(以降は元の色) */ },
    { id: 'ladder', name: 'グラデーション', seq: function (f) { return f.ladder; } }
  ],
  patternDefault: 'trio',

  // ---- 配色レシピ（楽器の色 × 雰囲気）。色は palette のID ----
  // ベルト色・PVC色・金具・取付け革は、配色の系統ごとに候補を持ち、診断のたびにランダムで1つ選ぶ(遊び心のある提案。厳密なルールではない)
  // ベルトの色(DuetとCourierで選べる6色)
  belts: { black: '#1a1a1a', brown: '#b07840', ivory: '#f0ece0', mossgreen: '#5c6b3a', cobalt: '#2a5a8c', cream: '#e8dfc8' },
  // Triadのベルト12色(診断の色は、いちばん近い色に置き換える)
  triadBelts: { natural: '#e1c5ba', camel: '#e4ad90', brown: '#b96358', red: '#da5050', navy: '#3f506b', black: '#2b3240', lightgrn: '#a3be81', green: '#52ae98', sora: '#4d9bb6', deepred: '#b94d5d', grey: '#6c90ac', darkbrown: '#483940' },

  // Clear版で選べるPVCの色(シミュレーターと同じ)
  pvcColors: { cwhite: '#f0f1f3', cbrown: '#924e3a', cblack: '#4a5363', cred: '#f66b80', cgreen: '#4cbf94', cblue: '#59b2be', cyellow: '#fbd173' },
  triadParts: { brown: '#49020d', black: '#1c1614' },
  triadMetals: { gold: '#e5b415', silver: '#c7c9cd' },

  recipes: [
    { color: 'wood_light', mood: 'soft', name: 'ミルクティー', belt: ['cream', 'ivory', 'brown'], pvc: ['cwhite', 'cyellow'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'white', ladder: ['white', 'natural', 'tan', 'camel', 'tan', 'natural'], c: ['natural', 'camel', 'sakura'],  text: '木目に馴染む、やわらかい配色' },
    { color: 'wood_light', mood: 'bold', name: '木もれ日', belt: ['mossgreen', 'cream', 'brown'], pvc: ['cgreen', 'cyellow'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'yellow', ladder: ['yellow', 'lgrn', 'olive', 'green', 'olive', 'lgrn'], c: ['olive', 'orange', 'lbl'],      text: '木の色に映える、自然な色合い' },
    { color: 'wood_light', mood: 'chic', name: '深煎りコーヒー', belt: ['brown', 'black', 'cream'], pvc: ['cbrown', 'cblack'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'camel', ladder: ['natural', 'camel', 'brown', 'choco', 'brown', 'camel'], c: ['choco', 'navy', 'natural'],    text: '落ち着いた大人の配色' },
    { color: 'wood_dark',  mood: 'soft', name: '麦わら', belt: ['ivory', 'cream', 'brown'], pvc: ['cyellow', 'cwhite'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'yellow', ladder: ['natural', 'yellow', 'tan', 'camel', 'tan', 'yellow'], c: ['camel', 'natural', 'lgrn'],    text: '楽器の茶色と近い色でなじませる' },
    { color: 'wood_dark',  mood: 'bold', name: 'ヴィンテージ', belt: ['cobalt', 'black', 'brown'], pvc: ['cblue', 'cbrown'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'natural', ladder: ['navy', 'greenbl', 'lbl', 'greenbl', 'navy', 'yellow'], c: ['navy', 'yellow', 'red'],       text: '茶色に映える差し色' },
    { color: 'wood_dark',  mood: 'chic', name: 'ワインセラー', belt: ['black', 'brown'], pvc: ['cbrown', 'cblack'], metal: ['gold', 'silver'], parts: ['black', 'brown'], d: 'camel', ladder: ['black', 'choco', 'brown', 'winered', 'brown', 'choco'], c: ['black', 'choco', 'winered'],   text: '深みのある重厚な配色' },
    { color: 'black',      mood: 'soft', name: '朝もや', belt: ['ivory', 'cream', 'black'], pvc: ['cwhite', 'cblue'], metal: ['silver', 'gold'], parts: ['brown', 'black'], d: 'white', ladder: ['white', 'sakura', 'natural', 'grey', 'natural', 'sakura'], c: ['natural', 'grey', 'sakura'],   text: '黒の楽器をやわらかく見せる' },
    { color: 'black',      mood: 'bold', name: 'ステージライト', belt: ['black', 'cobalt', 'ivory'], pvc: ['cred', 'cyellow'], metal: ['gold', 'silver'], parts: ['black', 'brown'], d: 'orange', ladder: ['yellow', 'orange', 'red', 'pink', 'red', 'orange'], c: ['red', 'yellow', 'lbl'],        text: '黒に映える、元気な配色' },
    { color: 'black',      mood: 'chic', name: 'ミッドナイト', belt: ['brown', 'black', 'cobalt'], pvc: ['cblack', 'cblue'], metal: ['silver', 'gold'], parts: ['black', 'brown'], d: 'navy', ladder: ['black', 'navy', 'greenbl', 'navy', 'black', 'winered'], c: ['winered', 'black', 'camel'],   text: '黒の楽器にまとまりのある配色' },
    { color: 'white',      mood: 'soft', name: 'わたあめ', belt: ['cream', 'ivory', 'cobalt'], pvc: ['cred', 'cwhite'], metal: ['silver', 'gold'], parts: ['brown', 'black'], d: 'yellow', ladder: ['white', 'sakura', 'pink', 'sakura', 'white', 'lbl'], c: ['sakura', 'lbl', 'natural'],    text: '白の楽器に合う、やさしい色' },
    { color: 'white',      mood: 'bold', name: 'ソーダ', belt: ['ivory', 'cobalt', 'cream'], pvc: ['cblue', 'cgreen'], metal: ['silver', 'gold'], parts: ['brown', 'black'], d: 'lgrn', ladder: ['lgrn', 'lbl', 'pink', 'sakura', 'pink', 'lbl'], c: ['pink', 'lbl', 'yellow'],       text: '軽やかで明るい配色' },
    { color: 'white',      mood: 'chic', name: 'グレージュ', belt: ['black', 'ivory', 'brown'], pvc: ['cblack', 'cwhite'], metal: ['silver', 'gold'], parts: ['brown', 'black'], d: 'camel', ladder: ['white', 'natural', 'grey', 'navy', 'grey', 'natural'], c: ['navy', 'grey', 'natural'],     text: '白を引き締める大人の配色' },
    { color: 'color',      mood: 'soft', name: '引き算', belt: ['ivory', 'cream', 'black'], pvc: ['cwhite', 'cblack'], metal: ['silver', 'gold'], parts: ['brown', 'black'], d: 'sakura', ladder: ['white', 'natural', 'tan', 'natural', 'grey', 'white'], c: ['natural', 'white', 'grey'],    text: '楽器の色を主役にする控えめな配色' },
    { color: 'color',      mood: 'bold', name: 'コントラスト', belt: ['black', 'ivory'], pvc: ['cblack', 'cred'], metal: ['silver', 'gold'], parts: ['black', 'brown'], d: 'yellow', ladder: ['black', 'grey', 'white', 'red', 'white', 'grey'], c: ['black', 'white', 'red'],       text: '強い楽器の色にも負けない配色' },
    { color: 'color',      mood: 'chic', name: 'ブラックベース', belt: ['black', 'ivory', 'brown'], pvc: ['cblack', 'cwhite'], metal: ['silver', 'gold'], parts: ['black', 'brown'], d: 'navy', ladder: ['black', 'navy', 'grey', 'natural', 'grey', 'navy'], c: ['black', 'grey', 'natural'],    text: '楽器の色を引き立てる配色' },
    { color: 'unknown',    mood: 'soft', name: 'ミルクティー', belt: ['cream', 'ivory', 'brown'], pvc: ['cwhite', 'cyellow'], metal: ['gold', 'silver'], parts: ['brown', 'black'], d: 'white', ladder: ['white', 'natural', 'tan', 'camel', 'tan', 'natural'], c: ['natural', 'camel', 'sakura'],  text: 'やさしい雰囲気の定番配色' },
    { color: 'unknown',    mood: 'bold', name: 'ステージライト', belt: ['black', 'cobalt', 'ivory'], pvc: ['cred', 'cyellow'], metal: ['gold', 'silver'], parts: ['black', 'brown'], d: 'orange', ladder: ['yellow', 'orange', 'red', 'pink', 'red', 'orange'], c: ['red', 'yellow', 'lbl'],        text: '元気で映える定番配色' },
    { color: 'unknown',    mood: 'chic', name: 'ミッドナイト', belt: ['brown', 'black', 'cobalt'], pvc: ['cblack', 'cblue'], metal: ['silver', 'gold'], parts: ['black', 'brown'], d: 'navy', ladder: ['black', 'navy', 'greenbl', 'navy', 'black', 'winered'], c: ['winered', 'black', 'camel'],   text: '落ち着いた定番配色' }
  ]
};
