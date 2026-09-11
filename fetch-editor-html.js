import { chromium } from "playwright";
import fs from "fs";

const LD_USER = process.env.LD_USER;
const LD_PASSWORD = process.env.LD_PASSWORD;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://member.livedoor.com/login/");
  await page.fill("#login_id", LD_USER);
  await page.fill("#password", LD_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForTimeout(4000);

  await page.goto("https://cms.blog.livedoor.com/blog/beetle-life-jp-blog/article/new");
  await page.waitForTimeout(4000);

  const html = await page.content();
  fs.writeFileSync("editor.html", html);

  console.log("投稿画面のHTMLを editor.html に保存しました");

  await browser.close();
})();
