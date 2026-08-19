import fs from "fs";
import fetch from "node-fetch";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

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

  console.log("=== AI記事投稿開始（画像なし） ===");

  // Markdown本文読み込み
  const mdText = fs.readFileSync("./post.md", "utf-8");

  // Markdown → HTML
  const html = md.render(mdText);

  // 投稿
  console.log("記事投稿中...");
  const result = await postArticle(title, html, username, password);

  console.log(result);
}

main().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
