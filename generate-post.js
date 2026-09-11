import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const prompt = `
あなたは「空冷ビートル生活ブログ」の専属ライターです。

以下の条件で日本語の記事を生成してください：

- テーマ：空冷ビートルの旅・整備・生活
- 文体：旅日記＋整備記録＋写真映えする描写
- 読者：クラシックカー好き、日本の一般読者
- livedoorブログに投稿する前提で自然な日本語
- 画像は生成しない（後でフォルダからランダム選出する）

【重要】
出力は絶対にコードブロック（\`\`\`）を含めないでください。
純粋な YAML のみを返してください。

出力フォーマット：

title_ja: "記事タイトル"
body_ja: |
  本文（複数行）
category: "空冷ビートル"
`;

async function main() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  let yml = response.choices[0].message.content;

  // 念のためコードブロックを除去（保険）
  yml = yml.replace(/```yaml/g, "").replace(/```/g, "");

  fs.writeFileSync("post.yml", yml, "utf-8");
  console.log("post.yml を生成しました");
}

main();
