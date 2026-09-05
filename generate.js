import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const template = JSON.parse(fs.readFileSync("template.json", "utf8"));

const prompt = `
あなたは「空冷かずひろ」という旧車ブログの自動投稿AIです。
以下の構造に沿って、livedoorブログ投稿用のJSONを生成してください。

必ずJSON形式で出力し、フィールドは以下を含めること：

title: 空冷ビートルの生活・整備・旅をテーマにしたSEOタイトル
category: "旧車"
tags: ["空冷ビートル","旧車","フォルクスワーゲン","整備","旅","群馬","藤岡"]

images: 2枚分の説明文（車体の全景・整備記録）

body: 5セクション（状況説明 / 整備ログ / 気づき / 地域スポット / 関連記事）

文章は「かずひろ」の一人称で書く。
内容は毎回変化させる。
藤岡市・群馬県のローカル要素を適度に入れる。
関連リンクは livedoorブログ内の記事タイトルを3つ生成する。
`;

async function main() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You generate JSON for livedoor blog auto posting." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const article = response.choices[0].message.content;

  fs.writeFileSync("post.json", article);
  console.log("post.json generated.");
}

main();
