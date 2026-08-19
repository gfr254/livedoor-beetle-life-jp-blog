import fs from "fs";
import md from "markdown-it";
import OpenAI from "openai";

const markdown = md();

// AI画像生成（URL優先＋JPEG対応）
async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    format: "jpeg"   // livedoor が受け付ける唯一の形式
  });

  // まず URL を使う（2026年の標準）
  if (img.data[0].url) {
    const res = await fetch(img.data[0].url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("image.jpg", buffer);
    return "image.jpg";
  }

  // URL が無い場合は base64（旧仕様）
  if (img.data[0].b64_json) {
    const buffer = Buffer.from(img.data[0].b64_json, "base64");
    fs.writeFileSync("image.jpg", buffer);
    return "image.jpg";
  }

  throw new Error("OpenAI が画像データを返しませんでした");
}

// livedoor 画像アップロード
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
  const urlMatch = xml.match(/<content[^>]*>(.*?)<\/content>/);
  return urlMatch ? urlMatch[1] : null;
}

// 記事投稿
async function postArticle() {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/article";

  const username = process.env.LD_USER;
  const password = process.env.LD_ATOM_PASS;

  const title = process.env.POST_TITLE;
  const mdContent = fs.readFileSync("./post.md", "utf-8");
  let htmlContent = markdown.render(mdContent);

  // AI画像生成
  const imagePath = await generateImage("空冷ビートルの夏の風景");
  const imageUrl = await uploadImage(imagePath, username, password);

  // 本文に画像挿入
  htmlContent = `<img src="${imageUrl}" /><br>` + htmlContent;

  const xml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <content type="html"><![CDATA[${htmlContent}]]></content>
  </entry>
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/atom+xml",
      "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
    },
    body: xml
  });

  if (!res.ok) {
    throw new Error("投稿失敗: " + await res.text());
  }

  console.log("投稿成功");
}

// 例外を確実にログに出す
postArticle().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
