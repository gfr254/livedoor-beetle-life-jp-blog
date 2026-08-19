const fs = require("fs");
const md = require("markdown-it")();
const OpenAI = require("openai");

// AI画像生成
async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });

  const base64 = img.data[0].b64_json;
  const buffer = Buffer.from(base64, "base64");

  fs.writeFileSync("image.jpg", buffer);
  return "image.jpg";
}

// livedoor画像アップロード
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
  let htmlContent = md.render(mdContent);

  // AI画像生成
  const imagePath = await generateImage("空冷ビートルが走る夏の風景、レトロで味のある写真");
  const imageUrl = await uploadImage(imagePath, username, password);

  // 本文に画像挿入
  htmlContent = `<img src="${imageUrl}" /><br>` + htmlContent;

  // カテゴリID（例：空冷ビートル）
  const categoryId = "3";

  // タグ
  const tags = ["空冷ビートル", "整備記録", "AI生成画像"];

  const xml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <content type="html"><![CDATA[${htmlContent}]]></content>

    <category term="${categoryId}" />

    ${tags.map(t => 
      `<category scheme="http://www.livedoor.com/tag/" term="${t}" />`
    ).join("\n")}
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

postArticle();
