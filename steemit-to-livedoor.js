import fs from "fs";
import fetch from "node-fetch";

const BLOG_NAME = "beetle_life_jp_blog";
const BASE = `https://livedoor.blogcms.jp/atompub/${BLOG_NAME}`;
const AUTH = "Basic " + Buffer.from(
  process.env.LD_USER + ":" + process.env.LD_PASSWORD
).toString("base64");

// =====================================
// livedoor 投稿
// =====================================
async function postLivedoor(title, html) {
  const xml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <content type="html"><![CDATA[${html}]]></content>
  </entry>
  `;

  const res = await fetch(`${BASE}/article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/atom+xml;type=entry",
      "Authorization": AUTH
    },
    body: xml
  });

  const text = await res.text();
  console.log("livedoor 投稿完了:", text);
}

// =====================================
// セクション安全処理（文字列でもオブジェクトでもOK）
// =====================================
function safeSection(sec) {
  if (typeof sec === "string") {
    return {
      title: sec.split(":")[0] || "セクション",
      content: sec
    };
  }
  if (typeof sec === "object" && sec !== null) {
    return {
      title: sec.section_title || "セクション",
      content: sec.content || ""
    };
  }
  return { title: "セクション", content: "" };
}

// =====================================
// 本文構造＋meta＋藤岡市SEO＋内部リンク＋多言語
// =====================================
function buildHtmlMulti(post) {
  let html = "";

  // ===============================
  // meta description（藤岡市SEO）
  // ===============================
  const metaDescription = `
空冷ビートルの「${post.title_ja}」について、群馬県藤岡市で実際に起きた整備・トラブル・走行記録を詳しく解説。藤岡市の道路事情や山道の特徴を踏まえ、原因・対処法・手順を分かりやすくまとめています。
  `.trim();

  html += `
    <meta name="description" content="${metaDescription}">
    <meta property="og:title" content="${post.title_ja}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:image" content="${post.image.url}">
    <meta property="og:type" content="article">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${post.title_ja}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${post.image.url}">
  `;

  // ===============================
  // タイトル（H1）
  // ===============================
  html += `<h1 class="article-title">${post.title_ja}</h1>`;

  // ===============================
  // リード文（藤岡市SEO）
  // ===============================
  html += `
    <div class="lead">
      <p>群馬県藤岡市で空冷ビートルと暮らす私が、実体験をもとに整備・トラブル・旅の記録をまとめています。今回のテーマは「${post.title_ja}」です。</p>
      <p>藤岡市は山道・農道・市街地が混在しており、空冷ビートルの走行環境として特徴的です。この地域性を踏まえて解説します。</p>
    </div>
  `;

  // ===============================
  // 画像（ALT多言語）
  // ===============================
  html += `
    <div class="article-image">
      <img src="${post.image.url}"
           alt="${post.image.alt_ja} / ${post.image.alt_en} / ${post.image.alt_es} / ${post.image.alt_ko}"
           loading="lazy">
    </div>
  `;

  // ===============================
  // 日本語本文（安全処理）
  // ===============================
  html += `<h2>🇯🇵 日本語（メイン記事）</h2>`;

  for (const sec of post.body_ja) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // ===============================
  // 藤岡市ローカルSEOセクション
  // ===============================
  html += `
    <section class="local-seo">
      <h2>📍 群馬県藤岡市の道路環境と空冷ビートル</h2>
      <ul>
        <li>山道が多くキャブ車の負荷が高い</li>
        <li>農道・林道の凹凸で振動トラブルが起きやすい</li>
        <li>市街地は信号が多くアイドリング調整が重要</li>
        <li>冬は冷え込みが強くチョーク調整が必要</li>
      </ul>
    </section>
  `;

  // ===============================
  // 内部リンク（安全処理）
  // ===============================
  const related = safeSection(post.body_ja[6]).content;

  html += `
    <section class="related-links">
      <h2>🔗 関連記事（藤岡市の実体験）</h2>
      <ul>
        ${related
          .split(",")
          .map(item => `<li>${item.trim()}</li>`)
          .join("")}
      </ul>
    </section>
  `;

  // ===============================
  // 多言語本文（安全処理）
  // ===============================
  html += `<h2>🇺🇸 English</h2>`;
  for (const sec of post.body_en) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  html += `<h2>🇪🇸 Español</h2>`;
  for (const sec of post.body_es) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  html += `<h2>🇰🇷 한국어</h2>`;
  for (const sec of post.body_ko) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // ===============================
  // 著者情報（E-E-A-T）
  // ===============================
  html += `
    <section class="author-box">
      <h3>👤 著者：かずひろ（群馬県藤岡市）</h3>
      <p>空冷ビートルと暮らす藤岡市の旧車ブロガー。整備・トラブル・旅の記録を毎日自動投稿しています。</p>
    </section>
  `;

  return html;
}

// =====================================
// メイン処理（JSON読み込み）
// =====================================
async function main() {
  const raw = fs.readFileSync("post.yml", "utf-8");
  const post = JSON.parse(raw);   // ← ここが最重要（YAMLではなく JSON として読む）

  const htmlMulti = buildHtmlMulti(post);
  const finalTitle = `【空冷ビートル】${post.title_ja}`;

  await postLivedoor(finalTitle, htmlMulti);
}

main();
