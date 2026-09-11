import fs from "fs";
import { load } from "js-yaml";
import fetch from "node-fetch";
import OpenAI from "openai";

const BLOG_NAME = "beetle_life_jp_blog";
const BASE = `https://livedoor.blogcms.jp/atompub/${BLOG_NAME}`;
const AUTH = "Basic " + Buffer.from(
  process.env.LD_USER + ":" + process.env.LD_PASSWORD
).toString("base64");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 本文整形
function beetleHtml(bodyJa) {
  return `
  <div class="beetle-story">
    <p>${bodyJa.replace(/\n/g, "</p><p>")}</p>
  </div>
  `;
}

// livedoorにアップ済み画像URLをランダム選出
function pickRandomImageUrl() {
  const list = fs.readFileSync("images.txt", "utf-8")
    .split("\n")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  if (list.length === 0) return null;

  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// livedoorカテゴリID取得
async function getCategoryId(name) {
  const xml = await fetch(`${BASE}/category`, {
    headers: { "Authorization": AUTH }
  }).then(r => r.text());

  const match = xml.match(new RegExp(`<category term="(\\d+)" label="${name}"`));
  return match ? match[1] : null;
}

// AI にカテゴリを選ばせる
async function pickCategory(article) {
  const prompt = `
Read the following article and choose ONE best category name in English.
Choose only from this list:

- maintenance
- beetle-life
- travel-drive
- beetle-knowledge
- diy-custom
- gallery

Return ONLY the category name.

Article:
${article}
  `;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content.trim();
}

// 記事投稿
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

  // 本文整形
  let bodyHtml = beetleHtml(yml.body_ja);

  // livedoor画像ランダム挿入
  const imgUrl = pickRandomImageUrl();
  if (imgUrl) {
    bodyHtml += `<p><img src="${imgUrl}" /></p>`;
  }

  // AI にカテゴリを選ばせる
  const categoryName = await pickCategory(yml.body_ja);
  console.log("AI選択カテゴリ:", categoryName);

  // livedoorカテゴリID取得
  const catId = await getCategoryId(categoryName);

 // ★ ここにチェックコードを入れる（最も正しい位置）
  if (!catId) {
   console.log("カテゴリが livedoor に存在しません:", categoryName);
   console.log("livedoor 側のカテゴリ名を英語に変更してください。");
  return; // ここで処理を止める（投稿しない）
  }

  await postArticle(yml.title_ja, bodyHtml, catId);
}

main();
