const { chromium } = require('playwright');
const fs = require('fs');
const md = require('markdown-it')();

async function tryLogin(page, email, password) {
  const loginPages = [
    'https://member.livedoor.com/login/',
    'https://www.livedoor.com/login/',
    'https://livedoor.blogcms.jp/login'
  ];

  for (const url of loginPages) {
    await page.goto(url, { waitUntil: 'networkidle' });

    // livedoor ID ログイン
    if (await page.$('input[name="livedoor_id"]')) {
      await page.fill('input[name="livedoor_id"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      return true;
    }

    // livedoor.com ログイン
    if (await page.$('#login_id')) {
      await page.fill('#login_id', email);
      await page.fill('#login_password', password);
      await page.click('button[type="submit"]');
      return true;
    }

    // blogcms.jp ログイン
    if (await page.$('input[name="email"]')) {
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      return true;
    }
  }

  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const email = process.env.LD_EMAIL;
  const password = process.env.LD_PASSWORD;

  const title = process.env.POST_TITLE;
  const mdContent = fs.readFileSync('./post.md', 'utf-8');
  const htmlContent = md.render(mdContent);

  // ログイン試行
  const loggedIn = await tryLogin(page, email, password);

  if (!loggedIn) {
    throw new Error('ログインフォームが見つかりませんでした（livedoor 側のリダイレクトが原因）');
  }

  // CMS マイページへ遷移
  await page.waitForTimeout(5000); // セッション確立待ち
  await page.goto('https://livedoor.blogcms.jp/blog/beetle_life_jp_blog/article');

  await page.fill('#article_title', title);
  await page.fill('#article_body', htmlContent);

  await page.click('#article_publish');

  await browser.close();
})();
