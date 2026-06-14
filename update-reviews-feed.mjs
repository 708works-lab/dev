/**
 * Judge.me → Google Product Reviews Feed 2.3 XML 生成
 * GitHub Actions から毎日実行される。env vars は GitHub Secrets から取得。
 */

const JUDGEME_TOKEN = process.env.JUDGEME_API_TOKEN;
const SHOP_DOMAIN   = process.env.SHOPIFY_STORE;
const STORE_URL     = 'https://708works.jp';
const BRAND         = '708works';
const OUTPUT_FILE   = 'reviews-feed.xml';

if (!JUDGEME_TOKEN) throw new Error('JUDGEME_API_TOKEN が未設定です');
if (!SHOP_DOMAIN)   throw new Error('SHOPIFY_STORE が未設定です');

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchAllReviews() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://judge.me/api/v1/reviews?api_token=${JUDGEME_TOKEN}&shop_domain=${SHOP_DOMAIN}&per_page=100&page=${page}`
    );
    if (!res.ok) throw new Error(`Judge.me API エラー: ${res.status}`);
    const { reviews } = await res.json();
    if (!reviews?.length) break;
    all.push(...reviews);
    if (reviews.length < 100) break;
    page++;
  }
  return all.filter(r => r.published && !r.hidden);
}

function buildXml(reviews) {
  const eligible = reviews.filter(r =>
    r.rating >= 1 && (r.body || r.title)
  );
  console.log(`  公開済みレビュー: ${eligible.length}件 / 取得: ${reviews.length}件`);

  const reviewsXml = eligible.map(r => {
    const isAnon = !r.reviewer?.name || /anonymous/i.test(r.reviewer.name);
    const rawName = r.reviewer?.name?.trim() ?? '';
    // プライバシー保護: 最初の1文字のみ表示し残りをマスク ("田中 太郎" → "田***")
    const name = isAnon ? 'Anonymous' : esc([...rawName][0] + '***');
    const ts     = new Date(r.created_at).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const handle = r.product_handle || '';
    const prodUrl = `${STORE_URL}/products/${handle}`;

    return `    <review>
      <review_id>${r.id}</review_id>
      <reviewer>
        <name>${name}</name>
        <is_anonymous>${isAnon}</is_anonymous>
      </reviewer>
      <review_timestamp>${ts}</review_timestamp>
      ${r.title ? `<title>${esc(r.title)}</title>` : ''}
      <content>${esc(r.body ?? r.title ?? '')}</content>
      <review_url type="singleton">${esc(prodUrl)}</review_url>
      <ratings>
        <overall min="1" max="5">${r.rating}</overall>
      </ratings>
      <products>
        <product>
          <product_ids>
            <skus><sku>${esc(handle)}</sku></skus>
            <brands><brand>${BRAND}</brand></brands>
          </product_ids>
          <product_name>${esc(r.product_title ?? handle)}</product_name>
          <product_url>${esc(prodUrl)}</product_url>
        </product>
      </products>
    </review>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:vc="http://www.w3.org/2007/XMLSchema-versioning"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.3/product_reviews.xsd">
  <version>2.3</version>
  <aggregator>
    <name>Judge.me</name>
  </aggregator>
  <publisher>
    <name>${BRAND}</name>
    <favicon>${STORE_URL}/favicon.ico</favicon>
  </publisher>
  <reviews>
${reviewsXml}
  </reviews>
</feed>`;
}

import { writeFileSync } from 'fs';

console.log('Judge.me からレビューを取得中...');
const reviews = await fetchAllReviews();
console.log(`  取得完了: ${reviews.length}件`);

const xml = buildXml(reviews);
writeFileSync(OUTPUT_FILE, xml, 'utf-8');
console.log(`XML 生成: ${OUTPUT_FILE}`);
