import fs from "fs";
import { load } from "js-yaml";
import fetch from "node-fetch";

const BLOG_NAME = "beetle_life_jp_blog";
const BASE = `https://livedoor.blogcms.jp/atompub/${BLOG_NAME}`;
const AUTH = "Basic " + Buffer.from(
  process.env.LD_USER + ":" + process.env.LD_PASSWORD
).toString("base64");

// 本文を空冷ビートルブランドのHTMLに整形
function beetleHtml(bodyJa) {
  return `
  <div class="beetle-story">
    <p>${bodyJa.replace(/\n/g, "</p><p>")}</p>
  </div>
  `;
}

// カテゴリID取得
async function getCategoryId(name) {
  const xml = await fetch(`${BASE}/category`, {
    headers: { "Authorization": AUTH }
  }).then(r => r.text());

  const match = xml.match(new RegExp(`<category term="(\\d+)" label="${name}"`));
  return match ? match[1] : null;
}

// 記事投稿（画像なし）
async function postArticle(title, html, categoryId) {
  const xml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <category term="${categoryId}" />
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
  console.log("投稿完了:", text);
}

async function main() {
  const yml = load(fs.readFileSync("post.yml", "utf-8"));

  const bodyHtml = beetleHtml(yml.body_ja);
  const catId = await getCategoryId(yml.category);

  await postArticle(yml.title_ja, bodyHtml, catId);
}

main();
