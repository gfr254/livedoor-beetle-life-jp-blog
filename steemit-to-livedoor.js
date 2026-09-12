import fs from "fs";
import fetch from "node-fetch";

const BLOG_ID = "beetle-life-jp-blog";

// Cookie 管理
function extractCookies(res) {
  const raw = res.headers.raw()["set-cookie"] || [];
  return raw.map(c => c.split(";")[0]).join("; ");
}

// Cookie を付けて fetch
async function fetchWithCookies(url, options = {}, cookies = "") {
  const headers = options.headers || {};
  if (cookies) headers["Cookie"] = cookies;
  return fetch(url, { ...options, headers });
}

// OpenID ログイン（依存なし最終版）
async function loginLivedoor(user, pass) {
  console.log("🔐 OpenID ログイン開始");

  // 1. ログインページ取得（token 抽出）
  let res = await fetch("https://auth.livedoor.com/login/");
  let cookies = extractCookies(res);
  let html = await res.text();

  const token = html.match(/name="_token" value="([^"]+)"/)?.[1];
  if (!token) throw new Error("ログインページから token を取得できません");

  // 2. ログイン POST
  res = await fetchWithCookies("https://auth.livedoor.com/login/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      livedoor_id: user,
      password: pass,
      _token: token
    })
  }, cookies);

  cookies = extractCookies(res);

  // 3. リダイレクト先を追跡
  let nextUrl = res.url;

  while (true) {
    const r = await fetchWithCookies(nextUrl, {}, cookies);
    cookies = extractCookies(r);

    if (!r.redirected) {
      const text = await r.text();
      if (text.includes("ログイン")) {
        throw new Error("ログイン失敗（OpenID 認証を通過できませんでした）");
      }
      console.log("🔐 ログイン成功");
      return cookies;
    }

    nextUrl = r.url;
  }
}

// カテゴリ一覧取得
async function fetchCategories(cookies) {
  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/category`;
  const res = await fetchWithCookies(url, {}, cookies);
  const xml = await res.text();

  const categories = [...xml.matchAll(/<category\s+term="(\d+)"\s+label="([^"]+)"\s*\/>/g)]
    .map(m => ({ id: m[1], name: m[2] }));

  return categories;
}

// カテゴリ名 → ID
async function resolveCategoryId(cookies, categoryName) {
  const categories = await fetchCategories(cookies);

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

// 投稿
async function postToLivedoor(cookies, post) {
  const html = buildHtml(post);
  const categoryId = await resolveCategoryId(cookies, post.category_name);

  const payload = new URLSearchParams({
    title: post.title_ja,
    body: html,
    publish_type: "1",
    date: new Date().toISOString().slice(0, 19).replace("T", " ")
  });

  if (categoryId) payload.append("category_id", categoryId);

  const url = `https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`;

  const res = await fetchWithCookies(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString()
  }, cookies);

  console.log("投稿レスポンス:", res.status);

  const resText = await res.text();
  console.log("投稿レスポンス本文:", resText);

  // 投稿成功 URL 抽出
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

  const cookies = await loginLivedoor(process.env.LD_USER, process.env.LD_PASSWORD);
  await postToLivedoor(cookies, post);
}

main();
