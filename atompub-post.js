const fs = require("fs");
const md = require("markdown-it")();

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

  if (!res.ok) {
    throw new Error("画像アップロード失敗: " + await res.text());
  }

  const xml = await res.text();
  const urlMatch = xml.match(/<content[^>]*>(.*?)<\/content>/);
  return urlMatch ? urlMatch[1] : null;
}

async function postArticle() {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/article";

  const username = process.env.LD_USER;
  const password = process.env.LD_ATOM_PASS;

  const title = process.env.POST_TITLE;
  const mdContent = fs.readFileSync("./post.md", "utf-8");
  let htmlContent = md.render(mdContent);

  // 画像アップロード（任意）
  if (fs.existsSync("./image.jpg")) {
    const imageUrl = await uploadImage("./image.jpg", username, password);
    htmlContent = `<img src="${imageUrl}" /><br>` + htmlContent;
  }

  const categoryId = "3"; // 例：空冷ビートル
  const tags = ["空冷ビートル", "整備記録"];

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
