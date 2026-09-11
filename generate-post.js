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

  if (list.length === 0) return null;

  return list[Math.floor(Math.random() * list.length)];
}

async function main() {
  const imageUrl = pickRandomImageUrl() || "";

  const prompt = `
あなたは「空冷かずひろ」という旧車ブログの自動投稿AIです。

以下の多言語SEOテンプレートに沿って、JA/EN/ES/KO の4言語で記事JSONを生成してください。

===========================
【内部リンク自動生成ルール（強化版）】
本文内容から以下の要素を抽出し、関連リンクタイトルを3つ生成する：

1. 整備系キーワード（例：キャブ調整、点火系、オイル交換）
2. トラブル系キーワード（例：エンスト、アイドリング不調、振動）
3. 旅・走行系キーワード（例：藤岡市の山道、群馬の農道、峠道）

さらに藤岡市ローカル要素を必ず1つ含める：
- 藤岡市の山道
- 鬼石方面の農道
- 群馬の峠道
- ららん藤岡周辺の道路

内部リンクは以下の形式で生成：
タイトルA
タイトルB
タイトルC

※ URLは不要。タイトルだけでOK（livedoor仕様）。
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
テンプレート:
{
  "title_ja": "{{TITLE_JA}}",
  "title_en": "{{TITLE_EN}}",
  "title_es": "{{TITLE_ES}}",
  "title_ko": "{{TITLE_KO}}",

  "image": {
    "url": "${imageUrl}",
    "alt_ja": "{{ALT_JA}}",
    "alt_en": "{{ALT_EN}}",
    "alt_es": "{{ALT_ES}}",
    "alt_ko": "{{ALT_KO}}"
  },

  "body_ja": [...],
  "body_en": [...],
  "body_es": [...],
  "body_ko": [...]
}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  fs.writeFileSync("post.yml", res.choices[0].message.content);

  console.log("post.yml を生成しました（内部リンク強化版）");
}

main();
