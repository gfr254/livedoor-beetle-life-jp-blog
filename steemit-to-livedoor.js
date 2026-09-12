import fs from "fs";
import fetch from "node-fetch";

const BLOG_ID = "beetle-life-jp-blog";

// ===============================
// Livedoor ログイン処理
// ===============================
async function loginLivedoor(user, pass) {
  console.log("ログイン開始…");

  const res = await fetch("https://livedoor.blogcms.jp/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `livedoor_id=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`
  });

  const cookies = res.headers.get("set-cookie");

  if (!cookies) {
    console.error("ログイン失敗（Cookieなし）");
    throw new Error("ログイン失敗");
  }

  console.log("ログイン成功");
  return cookies;
}

// ===============================
// images.txt からランダムに1枚選ぶ
// ===============================
function pickImage() {
  console.log("画像選択開始…");

  const list = fs.readFileSync("images.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  console.log("画像枚数:", list.length);

  if (list.length === 0) {
    throw new Error("images.txt が空です");
  }

  const selected = list[Math.floor(Math.random() * list.length)];
  console.log("選択された画像:", selected);

  return selected;
}

// ===============================
// HTML生成（★完全版）
// ===============================
function buildHtmlMulti(post) {
  console.log("HTML生成開始…");

  let html = "";

  // ★ 抜粋生成用テキスト（必ず先頭）
  html += `<p>${post.title_ja}</p>`;

  // ★ default_2012 の抜粋バグ回避：画像は <div> にする
  const img = pickImage();
  html += `<div><img src="${img}" alt="${post.title_ja}"></div>`;

  // 日本語本文
  html += "<h2>🇯🇵 日本語</h2>";
  for (const sec of post.body_ja) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  // 英語本文
  html += "<h2>🇺🇸 English</h2>";
  for (const sec of post.body_en) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  console.log("HTML生成完了");
  return html;
}

// ===============================
// Livedoor 投稿処理
// ===============================
async function postToLivedoor(cookies, post) {
  console.log("投稿処理開始…");

  const html = buildHtmlMulti(post);

  const payload = new URLSearchParams({
    title: post.title_ja,
    body: html,
    publish: "1",
    category: "1"   // 空冷ビートル
  });

  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`;

  console.log("投稿URL:", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: payload.toString()
  });

  console.log("投稿レスポンス:", res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("投稿失敗詳細:", text);
    throw new Error(`投稿失敗: ${res.status}`);
  }

  console.log("Livedoor 投稿成功:", post.title_ja);
}

// ===============================
// メイン処理
// ===============================
async function main() {
  console.log("post.yml 読み込み開始…");

  const raw = fs.readFileSync("post.yml", "utf8");

  let post;
  try {
    post = JSON.parse(raw);
  } catch (e) {
    console.error("post.yml JSONパース失敗:", e.message);
    throw e;
  }

  console.log("post.yml 読み込み成功:", post.title_ja);

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main().catch(err => {
  console.error("steemit-to-livedoor.js 実行中にエラー:", err);
  process.exit(1);
});
