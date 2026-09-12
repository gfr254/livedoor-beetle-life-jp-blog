import fs from "fs";
import fetch from "node-fetch";

const BLOG_ID = "beetle-life-jp-blog";

// ログイン
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

// カテゴリ一覧取得
async function fetchCategories(cookies) {
  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/category`;
  const res = await fetch(url, { headers: { "Cookie": cookies } });
  const xml = await res.text();

  const categories = [...xml.matchAll(/<category\s+term="(\d+)"\s+label="([^"]+)"\s*\/>/g)]
    .map(m => ({ id: m[1], name: m[2] }));

  return categories;
}

// カテゴリ名 → ID（完全版）
async function resolveCategoryId(cookies, categoryName) {
  const categories = await fetchCategories(cookies);

  if (!categories || categories.length === 0) {
    console.log("⚠ カテゴリ一覧が取得できませんでした → カテゴリなし投稿に切り替えます");
    return ""; // category_id を送らない
  }

  const found = categories.find(c => c.name === categoryName);

  if (!found) {
    console.log(`⚠ カテゴリ「${categoryName}」は存在しません → カテゴリなし投稿に切り替えます`);
    return ""; // category_id を送らない
  }

  return found.id;
}

// HTML生成
function buildHtml(post) {
  let html = `<h2>${post.title_ja}</h2>`;

  for (const sec of post.body_ja) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  if (post.tags && post.tags.length > 0) {
    html += `<h3>Tags</h3><ul>`;
    for (const tag of post.tags) html += `<li>#${tag}</li>`;
    html += `</ul>`;
  }

  return html.trimStart();
}

// 投稿（完全版）
async function postToLivedoor(cookies, post) {
  const html = buildHtml(post);
  const categoryId = await resolveCategoryId(cookies, post.category_name);

  const payload = new URLSearchParams({
    title: post.title_ja,
    body: html,
    publish_type: "1",
    date: new Date().toISOString().slice(0, 19).replace("T", " ")
  });

  // ★ category_id が空でなければ追加
  if (categoryId) {
    payload.append("category_id", categoryId);
  }

  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: payload.toString()
  });

  console.log("投稿レスポンス:", res.status);

  // ★ livedoor の破棄理由を必ずログ出力
  const resText = await res.text();
  console.log("投稿レスポンス本文:", resText);

  if (!res.ok) {
    throw new Error(`投稿失敗: ${res.status}`);
  }
}

// メイン
async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main();
