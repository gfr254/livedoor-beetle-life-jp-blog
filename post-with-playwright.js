import { chromium } from "playwright";
import fs from "fs";

// livedoorログイン情報
const LD_USER = process.env.LD_USER;
const LD_PASSWORD = process.env.LD_PASSWORD;

// 記事データ読み込み
const article = JSON.parse(fs.readFileSync("post.json", "utf8"));

// 本文生成（あなたの既存ロジックを利用）
function buildBody(bodySections) {
  return bodySections
    .map(sec => `<h2>${sec.section_title}</h2><p>${sec.content}</p>`)
    .join("\n\n");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("ログイン開始...");

  // livedoorログインページへ
  await page.goto("https://member.livedoor.com/login/");

  // ログイン情報入力
  await page.fill("#login_id", LD_USER);
  await page.fill("#password", LD_PASSWORD);

  // ログインボタン押下
  await page.click("button[type=submit]");

  await page.waitForTimeout(4000);

  console.log("ログイン成功。投稿画面へ移動...");

  // 投稿画面へ移動
  await page.goto("https://cms.blog.livedoor.com/blog/beetle-life-jp-blog/article/new");

  await page.waitForSelector("#title");

  console.log("記事入力開始...");

  // タイトル入力
  await page.fill("#title", article.title);

  // 本文入力
  await page.fill("#body", buildBody(article.body));

  // カテゴリ選択（post.json の category を使う）
  await page.selectOption("#category", article.category);

  console.log("投稿ボタン押下...");

  // 投稿ボタン押下
  await page.click("#submit");

  await page.waitForTimeout(4000);

  console.log("投稿完了！");

  await browser.close();
})();
