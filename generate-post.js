import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ランダム画像選択
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
あなたは「空冷かずひろ」という旧車ブログの自動投稿AIです。

⚠️重要：
絶対にコードブロック（\`\`\`json や \`\`\`yaml）を使わず、
純粋な JSON のみを出力してください。
先頭や末尾に余計な文字を入れないでください。
出力は { で始まり } で終わる必要があります。

===========================
【内部リンク自動生成ルール（強化版）】
本文内容から以下の要素を抽出し、関連リンクタイトルを3つ生成する：

1. 整備系キーワード（例：キャブ調整、点火系、オイル交換）
2. トラブル系キーワード（例：エンスト、アイドリング不調、振動）
3. 旅・走行系キーワード（例：藤岡市の山道、群馬の農道、峠道）

藤岡市ローカル要素を必ず含める。

内部リンクは以下の形式で生成：
タイトルA
タイトルB
タイトルC

===========================
【本文構造（各言語共通）】
1. 結論
2. 今日の状況（実体験）
3. 原因と理由
4. 対処法・手順
5. 費用・時間・難易度
6. 群馬・藤岡のローカル情報
7. 関連記事（内部リンク）
8. まとめ

===========================
出力テンプレート（必ずこの JSON 形式で出力）:

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

  // 余計なバッククォートを除去（念のため）
  let output = res.choices[0].message.content
    .replace(/```json/g, "")
    .replace(/```yaml/g, "")
    .replace(/```/g, "")
    .trim();

  fs.writeFileSync("post.yml", output);

  console.log("post.yml を生成しました（YAML破損防止版）");
}

main();
