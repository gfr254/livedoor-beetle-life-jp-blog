const { chromium } = require('playwright');
const fs = require('fs');
const md = require('markdown-it')();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const email = process.env.LD_EMAIL;
  const password = process.env.LD_PASSWORD;

  const title = process.env.POST_TITLE;
  const mdContent = fs.readFileSync('./post.md', 'utf-8');
  const htmlContent = md.render(mdContent);

  // livedoor Blog CMS ログイン
  await page.goto('https://livedoor.blogcms.jp/login');
  await page.fill('#login_id', email);
  await page.fill('#login_password', password);
  await page.click('button[type="submit"]');

  // 新規記事作成ページへ移動
  await page.goto('https://livedoor.blogcms.jp/blog/beetle_life_jp_blog/article');

  // タイトル入力
  await page.fill('#article_title', title);

  // 本文（HTML）入力
  await page.fill('#article_body', htmlContent);

  // 公開ボタン
  await page.click('#article_publish');

  await browser.close();
})();
