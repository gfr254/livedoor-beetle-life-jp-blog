import fs from "fs";
import puppeteer from "puppeteer";

const BLOG_ID = "beetle-life-jp-blog";

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

// livedoor ログイン & 投稿（完全版）
  // 1. ログインページへ
  await page.goto("https://livedoor.blogcms.jp/login", { waitUntil: "networkidle2" });

  // 2. livedoor ID ログイン
  await page.type("#livedoor_id", user);
  await page.type("#password", pass);

  await Promise.all([
    page.click("#submit"),
    page.waitForNavigation({ waitUntil: "networkidle2" })
  ]);

  console.log("🔐 ログイン成功");


  // 3. 投稿ページへ
  await page.goto(`https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`, {
    waitUntil: "networkidle2"
  });

  // 4. 投稿フォーム入力
  await page.type('input[name="title"]', post.title_ja);

  const html = buildHtml(post);
  await page.type('textarea[name="body"]', html);

  // カテゴリ選択（存在しない場合はスキップ）
  if (post.category_name) {
    try {
      await page.select('select[name="category_id"]', post.category_name);
    } catch {
      console.log("⚠ カテゴリが存在しないためスキップ");
    }
  }

  // 5. 投稿ボタン押下
  await Promise.all([
    page.click('input[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" })
  ]);

  // 6. 投稿成功 URL 抽出
  const finalHtml = await page.content();
  const match = finalHtml.match(/https:\/\/livedoor\.blogcms\.jp\/blog\/[^"]+/);

  if (match) {
    console.log("✅ 投稿成功 URL:", match[0]);
  } else {
    console.log("⚠ 投稿 URL を抽出できませんでした");
  }

  await browser.close();
}

// メイン
async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  const user = process.env.LD_USER;
  const pass = process.env.LD_PASSWORD;

  await loginAndPost(user, pass, post);
}

main();
