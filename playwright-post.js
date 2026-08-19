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

  // livedoor 新ログインページ
  await page.goto('https://member.livedoor.com/login/');

  await page.fill('input[name="livedoor_id"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // CMS 管理画面へ遷移
  await page.goto('https://livedoor.blogcms.jp/blog/beetle_life_jp_blog/article');

  await page.fill('#article_title', title);
  await page.fill('#article_body', htmlContent);

  await page.click('#article_publish');

  await browser.close();
})();
