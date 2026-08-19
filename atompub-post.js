import fs from "fs";
import md from "markdown-it";
import OpenAI from "openai";
import sharp from "sharp";

const markdown = md();

// AI画像生成（PNG → JPEG 変換）
async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });

  // PNG の base64 を取得
  const base64 = img.data[0].b64_json;
  if (!base64) throw new Error("OpenAI が画像データを返しませんでした");

  const pngBuffer = Buffer.from(base64, "base64");

  // livedoor が受け付ける JPEG に変換
  const jpegBuffer = await sharp(pngBuffer).jpeg().toBuffer();

  fs.writeFileSync("image.jpg", jpegBuffer);
  return "image.jpg";
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

  // AI画像生成（PNG→JPEG変換済み）
  const imagePath = await generateImage("空冷ビートルの夏の風景");
  const imageUrl = await uploadImage(imagePath, username, password);

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

// エラーを確実にログに出す
postArticle().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
