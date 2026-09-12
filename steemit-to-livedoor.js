import fs from "fs";
import puppeteer from "puppeteer";

const BLOG_ID = "beetle-life-jp-blog";

function buildHtml(post) {
  let html = `<h2>${post.title_ja}</h2>`;
  for (const sec of post.body_ja) {
    html += `<h3>${sec.section_title}</h3>`;
    html += `<p>${sec.content.replace(/\n/g, "<br>")}</p>`;
  }
  if (post.tags?.length) {
    html += `<h3>Tags</h3><ul>`;
    for (const tag of post.tags) html += `<li>#${tag}</li>`;
    html += `</ul>`;
  }
  return html.trimStart();
}

async function loginAndPost(post) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Cookie を読み込む
  const cookies = JSON.parse(fs.readFileSync("cookies.json"));
  await page.setCookie(...cookies);

  // 投稿ページへ直接アクセス（ログイン不要）
  await page.goto(`https://livedoor.blogcms.jp/blog/${BLOG_ID}/post`, {
    waitUntil: "networkidle2"
  });

  // iframe がある場合は取得
  const frameHandle = await page.$("iframe#main-iframe");
  const frame = frameHandle ? await frameHandle.contentFrame() : page;

  // タイトル
  await frame.type("#title", post.title_ja);

  // 本文
  const html = buildHtml(post);
  await frame.type("#body", html);

  // カテゴリ
  if (post.category_name) {
    try {
      await frame.select('select[name="category_id"]', post.category_name);
    } catch {
      console.log("⚠ カテゴリが存在しないためスキップ");
    }
  }

  // 投稿
  await Promise.all([
    frame.click('input[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" })
  ]);

  console.log("✅ 投稿完了");

  await browser.close();
}

async function main() {
  const raw = fs.readFileSync("post.yml", "utf8");
  const post = JSON.parse(raw);

  await loginAndPost(post);
}

main();
