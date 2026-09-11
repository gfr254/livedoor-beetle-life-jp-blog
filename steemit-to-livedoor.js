import fs from "fs";
import { load } from "js-yaml";
import fetch from "node-fetch";

const BLOG_NAME = "beetle_life_jp_blog";
const BASE = `https://livedoor.blogcms.jp/atompub/${BLOG_NAME}`;
const AUTH = "Basic " + Buffer.from(
  process.env.LD_USER + ":" + process.env.LD_PASSWORD
).toString("base64");

// livedoor 投稿（多言語対応）
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

// ===============================
// ★ livedoor 本文構造 最強版（完全強化）
// ===============================
function buildHtmlMulti(post) {
  let html = "";

  // ★タイトル（H1）
  html += `<h1 class="article-title">${post.title_ja}</h1>`;

  // ★リード文（検索意図に直撃）
  html += `
    <div class="lead">
      <p>空冷ビートルの整備・トラブル・旅の記録を藤岡市（群馬県）から発信しています。今回のテーマは「${post.title_ja}」です。</p>
    </div>
  `;

  // ★画像（ALT多言語）
  html += `
    <div class="article-image">
      <img src="${post.image.url}"
           alt="${post.image.alt_ja} / ${post.image.alt_en} / ${post.image.alt_es} / ${post.image.alt_ko}"
           loading="lazy">
    </div>
  `;

  // ============================
  // 🇯🇵 日本語（SEOメイン）
  // ============================
  html += `<h2>🇯🇵 日本語（メイン記事）</h2>`;

  for (const sec of post.body_ja) {
    html += `
      <section class="article-section">
        <h3>${sec.section_title}</h3>
        <p>${sec.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // ============================
  // 内部リンク（構造化）
  // ============================
  html += `
    <section class="related-links">
      <h2>🔗 関連記事</h2>
      <ul>
        ${post.body_ja[6].content
          .split("\n")
          .map(item => `<li>${item}</li>`)
          .join("")}
      </ul>
    </section>
  `;

  // ============================
  // 多言語本文（補助的SEO）
  // ============================

  // 英語
  html += `<h2>🇺🇸 English</h2>`;
  for (const sec of post.body_en) {
    html += `
      <section class="article-section">
        <h3>${sec.section_title}</h3>
        <p>${sec.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // スペイン語
  html += `<h2>🇪🇸 Español</h2>`;
  for (const sec of post.body_es) {
    html += `
      <section class="article-section">
        <h3>${sec.section_title}</h3>
        <p>${sec.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // 韓国語
  html += `<h2>🇰🇷 한국어</h2>`;
  for (const sec of post.body_ko) {
    html += `
      <section class="article-section">
        <h3>${sec.section_title}</h3>
        <p>${sec.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // ============================
  // 著者情報（E-E-A-T最強化）
  // ============================
  html += `
    <section class="author-box">
      <h3>👤 著者：かずひろ（藤岡市）</h3>
      <p>空冷ビートルと暮らす群馬県藤岡市の旧車ブロガー。整備・トラブル・旅の記録を毎日自動投稿しています。</p>
    </section>
  `;

  return html;
}

// ===============================
// ★ メイン処理
// ===============================
async function main() {
  const post = load(fs.readFileSync("post.yml", "utf-8"));

  const htmlMulti = buildHtmlMulti(post);

  // livedoor 投稿（タイトルは日本語）
  const finalTitle = `【空冷ビートル】${post.title_ja}`;
  await postLivedoor(finalTitle, htmlMulti);
}

main();
