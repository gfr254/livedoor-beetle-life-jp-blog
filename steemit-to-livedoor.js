import fs from "fs";
import fetch from "node-fetch";

// ===============================
// Livedoor ログイン処理
// ===============================
async function loginLivedoor(user, pass) {
  const res = await fetch("https://livedoor.blogcms.jp/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `livedoor_id=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`
  });

  const cookies = res.headers.get("set-cookie");
  if (!cookies) throw new Error("ログイン失敗（Cookieなし）");

  return cookies;
}

// ===============================
// image.txt からランダムに1枚選ぶ
// ===============================
function pickImage() {
  const list = fs.readFileSync("image.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  return list[Math.floor(Math.random() * list.length)];
}

// ===============================
// HTML生成
// ===============================
function buildHtmlMulti(post) {
  let html = "";

  // 画像
  const img = pickImage();
  html += `<p><img src="${img}" alt="${post.title_ja}"></p>`;

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
    title: post.title_ja,
    body: html,
    publish: "1"
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
    const text = await res.text().catch(() => "");
    throw new Error(`投稿失敗: ${res.status} ${res.statusText}\n${text}`);
  }

  console.log("Livedoor 投稿成功:", post.title_ja);
}

// ===============================
// メイン処理
// ===============================
async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main().catch(err => {
  console.error("steemit-to-livedoor.js 実行中にエラー:", err);
  process.exit(1);
});
