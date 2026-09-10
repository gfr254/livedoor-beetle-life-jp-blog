import fs from "fs";
import axios from "axios";

// livedoor認証（Basic）
const LD_USER = process.env.LD_USER;
const LD_ATOM_PASS = process.env.LD_ATOM_PASS;

// Basic認証ヘッダー
const auth = Buffer.from(`${LD_USER}:${LD_ATOM_PASS}`).toString("base64");

// post.json 読み込み
const article = JSON.parse(fs.readFileSync("post.json", "utf8"));

// GitHub Pages の画像URL
const mainUrl = "https://kazuhiro.github.io/livedoor-beetle-life-jp-blog/images/main.jpg";
const maintenanceUrl = "https://kazuhiro.github.io/livedoor-beetle-life-jp-blog/images/maintenance.jpg";

// 本文生成
function buildBody(bodySections) {
  const mainImg = `<p><img src="${mainUrl}" alt="main"></p>`;
  const maintenanceImg = `<p><img src="${maintenanceUrl}" alt="maintenance"></p>`;

  const sectionsHtml = bodySections
    .map(sec => `<h2>${sec.section_title}</h2>\n<p>${sec.content}</p>`)
    .join("\n\n");

  return `${mainImg}\n${sectionsHtml}\n${maintenanceImg}`;
}

// livedoor投稿
async function postArticle() {
  const xml = `
<entry xmlns="http://www.w3.org/2005/Atom">
  <title>${article.title}</title>
  <content type="html">
    <![CDATA[
      ${buildBody(article.body)}
    ]]>
  </content>
  <category term="${article.category}" />
</entry>
`;

  const url = `https://livedoor.blogcms.jp/atom/beetle_life_jp_blog/article`;

  try {
    const res = await axios.post(url, xml, {
      headers: {
        "Content-Type": "application/atom+xml",
        "Authorization": `Basic ${auth}`
      }
    });

    console.log("投稿成功:", res.status);
  } catch (err) {
    console.error("投稿失敗:", err.response?.status, err.response?.data);
  }
}

postArticle();
