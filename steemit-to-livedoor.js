import fs from "fs";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";

const BLOG_ID = "beetle-life-jp-blog";

// Cookie 管理付き fetch
const jar = new CookieJar();
const cookieFetch = fetchCookie(fetch, jar);

// OpenID ログイン（最終完全版）
async function loginLivedoor(user, pass) {
  console.log("🔐 OpenID ログイン開始");

  // 1. ログインページ取得（token 抽出）
  const loginPage = await cookieFetch("https://auth.livedoor.com/login/");
  const html = await loginPage.text();

  const token = html.match(/name="_token" value="([^"]+)"/)?.[1];
  if (!token) throw new Error("ログインページから token を取得できません");

  // 2. ログイン POST
  const res = await cookieFetch("https://auth.livedoor.com/login/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      livedoor_id: user,
      password: pass,
      _token: token
    })
  });

  // 3. livedoor.blogcms.jp にログインできているか確認
  const check = await cookieFetch("https://livedoor.blogcms.jp/blog/");
  const checkText = await check.text();

  if (checkText.includes("ログイン")) {
    throw new Error("ログイン失敗（OpenID 認証を通過できませんでした）");
  }

  console.log("🔐 ログイン成功");
  return jar;
}

// カテゴリ一覧取得
async function fetchCategories() {
  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/category`;
  const res = await cookieFetch(url);
  const xml = await res.text();

  const categories = [...xml.matchAll(/<category\s+term="(\d+)"\s+label="([^"]+)"\s*\/>/g)]
    .map(m => ({ id: m[1], name: m[2] }));

  return categories;
}

// カテゴリ名 → ID（完全版）
async function resolveCategoryId(categoryName) {
  const categories = await fetchCategories();

  if (!categories || categories.length === 0) {
    console.log("⚠ カテゴリ一覧が取得できません → カテゴリなし投稿に切り替えます");
    return "";
  }

  const found = categories.find(c => c.name === categoryName);

  if (!found) {
    console.log(`⚠ カテゴリ「${categoryName}」は存在しません → カテゴリなし投稿に切り替えます`);
    return "";
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

// 投稿（最終完全版）
async function postToLivedoor(post) {
  const html = buildHtml(post);
  const categoryId = await resolveCategoryId(post.category_name);

  const payload = new URLSearchParams({
    title: post.title_ja,
    body: html,
    publish_type: "1",
    date: new Date().toISOString().slice(0, 19).replace("T", " ")
  });

  if (categoryId) payload.append("category_id", categoryId);

  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`;

  const res = await cookieFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: payload.toString()
  });

  console.log("投稿レスポンス:", res.status);

  const resText = await res.text();
  console.log("投稿レスポンス本文:", resText);

  // ★ 投稿成功時の URL 抽出
  const match = resText.match(/https:\/\/livedoor\.blogcms\.jp\/blog\/[^"]+/);
  if (match) {
    console.log("✅ 投稿成功 URL:", match[0]);
  } else {
    console.log("⚠ 投稿 URL を抽出できませんでした");
  }

  if (!res.ok) {
    throw new Error(`投稿失敗: ${res.status}`);
  }
}

// メイン
async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(post);
}

main();
