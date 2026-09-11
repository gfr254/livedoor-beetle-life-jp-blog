import fs from "fs";
import yaml from "js-yaml";
import fetch from "node-fetch";

const BLOG_NAME = "beetle_life_jp_blog";
const BASE = `https://livedoor.blogcms.jp/atompub/${BLOG_NAME}`;
const AUTH = "Basic " + Buffer.from(
  process.env.LD_USER + ":" + process.env.LD_ATOM_PASS
).toString("base64");

// 本文を空冷ビートルブランドのHTMLに整形
function beetleHtml(bodyJa) {
  return `
  <div class="beetle-story">
    <p>${bodyJa.replace(/\n/g, "</p><p>")}</p>
  </div>
  `;
}

// imagesフォルダから1枚だけランダム選出（拡張子複数対応）
function pickOneRandomImage(folder = "images") {
  const allowedExt = /\.(jpg|jpeg|png|webp|gif)$/i;

  const files = fs.readdirSync(folder).filter(f => allowedExt.test(f));

  if (files.length === 0) return null;

  const idx = Math.floor(Math.random() * files.length);
  return `${folder}/${files[idx]}`;
}

// livedoor画像アップロード
async function uploadImage(path) {
  const file = fs.readFileSync(path);

  const res = await fetch(`${BASE}/image`, {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      "Authorization": AUTH
    },
    body: file
  });

  const xml = await res.text();
  const id = xml.match(/<id>.*\/image\/(\d+)<\/id>/)[1];
  return id;
}

// カテゴリID取得
async function getCategoryId(name) {
  const xml = await fetch(`${BASE}/category`, {
    headers: { "Authorization": AUTH }
  }).then(r => r.text());

  const match = xml.match(new RegExp(`<category term="(\\d+)" label="${name}"`));
  return match ? match[1] : null;
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
  const yml = yaml.load(fs.readFileSync("post.yml", "utf-8"));

  let bodyHtml = beetleHtml(yml.body_ja);

  // 画像1枚ランダム選出
  const imgPath = pickOneRandomImage("images");

  if (imgPath) {
    const id = await uploadImage(imgPath);
    bodyHtml += `<p><img src="https://livedoor.blogimg.jp/${BLOG_NAME}/images/${id}.jpg" /></p>`;
  }

  const catId = await getCategoryId(yml.category);

  await postArticle(yml.title_ja, bodyHtml, catId);
}

main();
