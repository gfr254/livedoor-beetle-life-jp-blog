import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function pickRandomImageUrl() {
  const list = fs.readFileSync("images.txt", "utf-8")
    .split("\n")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  return list[Math.floor(Math.random() * list.length)];
}

async function main() {
  const imageUrl = pickRandomImageUrl() || "";

  const prompt = `
あなたはブログ自動生成AIです。

⚠️絶対条件：
- 出力は純粋な JSON のみ
- 先頭に余計な文字を入れない
- 末尾に余計な文字を入れない
- 絶対にコードブロック（\`\`\`json など）を使わない
- 出力は { で始まり } で終わること

出力テンプレート：

{
  "title_ja": "",
  "title_en": "",
  "title_es": "",
  "title_ko": "",
  "image": {
    "url": "${imageUrl}",
    "alt_ja": "",
    "alt_en": "",
    "alt_es": "",
    "alt_ko": ""
  },
  "body_ja": [],
  "body_en": [],
  "body_es": [],
  "body_ko": []
}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  let output = res.choices[0].message.content.trim();

  // 余計なバッククォートを完全除去
  output = output.replace(/```/g, "").trim();

  // JSONとして正しいか検証（壊れていたらログに出す）
  try {
    JSON.parse(output);
  } catch (e) {
    console.error("❌ 生成された JSON が壊れています");
    console.error(output);
    throw e;
  }

  fs.writeFileSync("post.yml", output);
  console.log("post.yml を生成しました（完全安定版）");
}

main();
