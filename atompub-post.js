import fs from "fs";
import axios from "axios";

// Secrets
const LIVEDOOR_ID = process.env.LIVEDOOR_ID;
const API_KEY = process.env.LIVEDOOR_API_KEY;

// post.json 読み込み
const article = JSON.parse(fs.readFileSync("post.json", "utf8"));

// 内部リンク HTML 生成
function buildInternalLinks(text) {
  if (!text) return "";
  const titles = text.split("\n").filter(t => t.trim() !== "");
  return `
    <h2>🔗 関連記事</h2>
    <ul>
      ${titles.map(t => `<li>${t}</li>`).join("\n")}
    </ul>
  `;
}

// 本文生成（画像＋本文＋内部リンク）
function buildBody(bodySections, imageUrls) {
  if (!Array.isArray(bodySections)) {
    console.error("bodySections is not an array:", bodySections);
    return "<p>本文生成エラー：body が配列ではありません。</p>";
  }

  const mainImg = imageUrls.main ? `<p><img src="${imageUrls.main}" alt="main"></p>` : "";
  const maintenanceImg = imageUrls.maintenance ? `<p><img src="${imageUrls.maintenance}" alt="maintenance"></p>` : "";

  const sectionsHtml = bodySections
    .slice(0, 4) // 最初の4セクション（本文）
    .map(sec => `<h2>${sec.section_title}</h2>\n<p>${sec.content}</p>`)
    .join("\n\n");

  const internalLinksHtml = buildInternalLinks(bodySections[4]?.content);

  return `
    ${mainImg}
    ${sectionsHtml}
    ${internalLinksHtml}
    ${maintenanceImg}
  `;
}

// livedoor画像アップロード
async function uploadImage(path) {
  try {
    const imgBuffer = fs.readFileSync(path);
    const url = `https://livedoor.blogcms.jp/atom/${LIVEDOOR_ID}/image`;

    const res = await axios.post(url, imgBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-WSSE": API_KEY
      }
    });

    const match = res.data.match(/<url>(.*?)<\/url>/);
    return match ? match[1] : null;

  } catch (err) {
    console.error("画像アップロード失敗:", err.response?.status, err.response?.data);
    return null;
  }
}

// livedoor AtomPub 投稿
async function postArticle() {
  console.log("画像アップロード開始...");

  const mainUrl = await uploadImage("images/main.jpg");
  const maintenanceUrl = await uploadImage("images/maintenance.jpg");

  console.log("画像URL:", { mainUrl, maintenanceUrl });

  const xml = `
<entry xmlns="http://www.w3.org/2005/Atom">
  <title>${article.title}</title>
  <content type="html">
    <![CDATA[
      ${buildBody(article.body, { main: mainUrl, maintenance: maintenanceUrl })}
    ]]>
  </content>
  <category term="${article.category}" />
</entry>
`;

  const url = `https://livedoor.blogcms.jp/atom/${LIVEDOOR_ID}/article`;

  try {
    const res = await axios.post(url, xml, {
      headers: {
        "Content-Type": "application/atom+xml",
        "X-WSSE": API_KEY
      }
    });

    console.log("投稿成功:", res.status);
  } catch (err) {
    console.error("投稿失敗:", err.response?.status, err.response?.data);
  }
}

postArticle();
