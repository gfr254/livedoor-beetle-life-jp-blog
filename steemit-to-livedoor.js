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
// HTML生成（日本語＋英語）
// ===============================
function buildHtmlMulti(post) {
  let html = "";

  // 画像
  if (post.image?.url) {
    html += `<p><img src="${post.image.url}" alt="${post.image.alt_ja || post.title_ja}"></p>`;
  }

  // 日本語
  if (Array.isArray(post.body_ja)) {
    html += "<h2>🇯🇵 日本語</h2>";
    for (const sec of post.body_ja) {
      html += `<h3>${sec.section_title}</h3>`;
      html += `<p>${(sec.content || "").replace(/\n/g, "<br>")}</p>`;
    }
  }

  // 英語
  if (Array.isArray(post.body_en)) {
    html += "<h2>🇺🇸 English</h2>";
    for (const sec of post.body_en) {
      html += `<h3>${sec.section_title}</h3>`;
      html += `<p>${(sec.content || "").replace(/\n/g, "<br>")}</p>`;
    }
  }

  return html;
}

// ===============================
// Livedoor 投稿処理
// ===============================
async function postToLivedoor(cookies, post) {
  const html = buildHtmlMulti(post);

  const payload = new URLSearchParams({
    title: post.title_ja || "空冷ビートルの藤岡市生活",
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

  let post;
  try {
    post = JSON.parse(raw);   // ← 最重要修正ポイント
  } catch (e) {
    throw new Error("post.yml の JSON パースに失敗: " + e.message);
  }

  if (!post.title_ja || !post.body_ja) {
    throw new Error("post.yml の内容が不正（title_ja / body_ja がありません）");
  }

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main().catch(err => {
  console.error("steemit-to-livedoor.js 実行中にエラー:", err);
  process.exit(1);
});
