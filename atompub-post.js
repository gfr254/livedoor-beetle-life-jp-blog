const fs = require("fs");
const md = require("markdown-it")();

async function postArticle() {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/article";

  const username = process.env.LD_USER;        // livedoor ID
  const password = process.env.LD_ATOM_PASS;   // AtomPub用パスワード

  const title = process.env.POST_TITLE;
  const mdContent = fs.readFileSync("./post.md", "utf-8");
  const htmlContent = md.render(mdContent);

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
    const text = await res.text();
    throw new Error("投稿失敗: " + text);
  }

  console.log("投稿成功");
}

postArticle();
