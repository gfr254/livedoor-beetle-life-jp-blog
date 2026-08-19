import fs from "fs";
import fetch from "node-fetch";
import MarkdownIt from "markdown-it";
import OpenAI from "openai";

const md = new MarkdownIt();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -----------------------------
   今日の日付を取得（YYYY-MM-DD）
----------------------------- */
function getToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* -----------------------------
   AIタイトル生成（毎日変わる）
----------------------------- */
async function generateTitle() {
  const prompt = `
あなたは「空冷ビートルと暮らす毎日の物語」をテーマにしたブログのタイトルを作るAIです。
今日の出来事として自然で魅力的なタイトルを1つだけ生成してください。
30文字以内、日本語。
`;

  const result = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return result.choices[0].message.content.trim();
}

/* -----------------------------
   AI本文生成（毎日変わる）
----------------------------- */
async function generateArticle() {
  const prompt = `
あなたは「空冷ビートルと暮らす毎日の物語」をテーマにしたブログ記事を毎日書くAIです。
今日の出来事として自然な短いストーリーをMarkdownで書いてください。
タイトルは含めず本文のみでOK。
`;

  const result = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return result.choices[0].message.content;
}

/* -----------------------------
   記事投稿（AtomPub）
----------------------------- */
async function postArticle(title, html, username, password) {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/article";

  const entryXml = `
  <entry xmlns="http://www.w3.org/2005/Atom">
    <title>${title}</title>
    <content type="html"><![CDATA[${html}]]></content>
  </entry>`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/atom+xml",
      "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
    },
    body: entryXml
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("投稿失敗: " + err);
  }

  return "投稿成功";
}

/* -----------------------------
   メイン処理
----------------------------- */
async function main() {
  const username = process.env.LD_USER;
  const password = process.env.LD_ATOM_PASS;

  console.log("=== AI記事投稿開始（タイトルに日付入り） ===");

  // 今日の日付
  const today = getToday();

  // タイトル生成
  console.log("タイトル生成中...");
  const aiTitle = await generateTitle();
  const title = `${today} ${aiTitle}`;
  console.log("タイトル:", title);

  // 本文生成
  console.log("本文生成中...");
  const mdText = await generateArticle();
  console.log("本文生成完了");

  // Markdown → HTML
  const html = md.render(mdText);

  // 投稿
  console.log("記事投稿中...");
  const result = await postArticle(title, html, username, password);

  console.log(result);
}

main().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
