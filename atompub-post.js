import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import MarkdownIt from "markdown-it";
import OpenAI from "openai";

const md = new MarkdownIt();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -----------------------------
   画像生成（最新API対応）
----------------------------- */
async function generateImage(prompt) {
  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    size: "1024x1024"
  });

  const imageBase64 = result.data[0].b64_json;
  const buffer = Buffer.from(imageBase64, "base64");

  const filePath = "./generated.jpg";
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/* -----------------------------
   画像アップロード（公開URL取得）
----------------------------- */
async function uploadImage(imagePath, username, password) {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/resource";
  const imageData = fs.readFileSync(imagePath);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
    },
    body: imageData
  });

  const xml = await res.text();

  // 公開URL（ブログで表示されるURL）
  const publicUrlMatch = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
  if (publicUrlMatch) return publicUrlMatch[1];

  // fallback（内部URL）
  const internalUrlMatch = xml.match(/<content[^>]*>(.*?)<\/content>/);
  return internalUrlMatch ? internalUrlMatch[1] : null;
}

/* -----------------------------
   記事投稿（AtomPub）
----------------------------- */
async function postArticle(title, html, username, password) {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/entry";

  const entryXml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <content type="html"><![CDATA[${html}]]></content>
  </entry>`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/atom+xml",
      "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
    },
    body: entryXml
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("投稿失敗: " + err);
  }

  return "投稿成功";
}

/* -----------------------------
   メイン処理
----------------------------- */
async function main() {
  const username = process.env.LD_USER;
  const password = process.env.LD_ATOM_PASS;
  const title = process.env.POST_TITLE || "AI自動投稿";

  console.log("=== AI記事生成開始 ===");

  // Markdown本文読み込み
  const mdText = fs.readFileSync("./post.md", "utf-8");

  // AI画像生成
  console.log("画像生成中...");
  const imagePath = await generateImage("空冷ビートルのある生活のイメージ写真");
  console.log("画像生成完了:", imagePath);

  // 画像アップロード
  console.log("画像アップロード中...");
  const imageUrl = await uploadImage(imagePath, username, password);
  console.log("画像URL:", imageUrl);

  // Markdown → HTML
  let html = md.render(mdText);

  // 画像を本文先頭に挿入
  if (imageUrl) {
    html = `<p><img src="${imageUrl}" /></p>\n` + html;
  }

  // 投稿
  console.log("記事投稿中...");
  const result = await postArticle(title, html, username, password);

  console.log(result);
}

main().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
