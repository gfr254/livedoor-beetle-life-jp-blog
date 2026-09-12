import fs from "fs";
import yaml from "js-yaml";
import fetch from "node-fetch";

// ===============================
// Livedoor ログイン処理
// ===============================
async function loginLivedoor(user, pass) {
  const res = await fetch("https://livedoor.blogcms.jp/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `livedoor_id=${user}&password=${pass}`
  });

  const cookies = res.headers.get("set-cookie");
  if (!cookies) throw new Error("ログイン失敗");

  return cookies;
}

// ===============================
// HTML生成（日本語＋英語）
// ===============================
function buildHtmlMulti(post) {
  let html = "";

  // 日本語
  html += "<h2>🇯🇵 日本語</h2>";
  for (const sec of post.body_ja) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  // 英語
  html += "<h2>🇺🇸 English</h2>";
  for (const sec of post.body_en) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  return html;
}

// ===============================
// Livedoor 投稿処理
// ===============================
async function postToLivedoor(cookies, post) {
  const html = buildHtmlMulti(post);

  const payload = new URLSearchParams({
    "title": post.title_ja,
    "body": html,
    "publish": "1"
  });

  const res = await fetch("https://livedoor.blogcms.jp/blog/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: payload.toString()
  });

  if (!res.ok) {
    throw new Error("投稿失敗: " + res.status);
  }

  console.log("Livedoor 投稿成功:", post.title_ja);
}

// ===============================
// メイン処理
// ===============================
async function main() {
  const post = yaml.load(fs.readFileSync("post.yml", "utf8"));

  const cookies = await loginLivedoor(
    process.env.LD_USER,
    process.env.LD_PASSWORD
  );

  await postToLivedoor(cookies, post);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
