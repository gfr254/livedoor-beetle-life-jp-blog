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
  if (!cookies) throw new Error("ログイン失敗");
  return cookies;
}

// カテゴリ一覧取得
async function fetchCategories(cookies) {
  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/category`;
  const res = await fetch(url, { headers: { "Cookie": cookies } });
  const xml = await res.text();

  return [...xml.matchAll(/<category\s+term="(\d+)"\s+label="([^"]+)"\s*\/>/g)]
    .map(m => ({ id: m[1], name: m[2] }));
}

// カテゴリ名 → ID
async function resolveCategoryId(cookies, categoryName) {
  const categories = await fetchCategories(cookies);
  const found = categories.find(c => c.name === categoryName);
  return found ? found.id : categories[0].id;
}

// HTML生成
function buildHtml(post) {
  let html = `<h2>${post.title_ja}</h2>`;

  for (const sec of post.body_ja) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }

  // タグ挿入
  if (post.tags && post.tags.length > 0) {
    html += `<h3>Tags</h3><ul>`;
    for (const tag of post.tags) html += `<li>#${tag}</li>`;
    html += `</ul>`;
  }

  return html.trimStart();
}

// 投稿
async function postToLivedoor(cookies, post) {
  const html = buildHtml(post);
  const categoryId = await resolveCategoryId(cookies, post.category_name);

  const payload = new URLSearchParams({
    title: post.title_ja,
    body: html,
    publish_type: "1",
    category_id: categoryId,
    date: new Date().toISOString().slice(0, 19).replace("T", " ")
  });

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
}

// メイン
async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main();
