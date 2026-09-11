import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ランダム画像選択（images.txt）
function pickRandomImageUrl() {
  const list = fs.readFileSync("images.txt", "utf-8")
    .split("\n")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  if (list.length === 0) return null;

  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

async function main() {
  const imageUrl = pickRandomImageUrl() || "";

  const prompt = `
あなたは「空冷かずひろ」という旧車ブログの自動投稿AIです。
以下の多言語SEOテンプレートに沿って、JA/EN/ES/KO の4言語で記事JSONを生成してください。

必ずJSON形式で出力し、フィールドは以下を含めること：

title_ja / title_en / title_es / title_ko
image: 1枚の写真URLと ALT テキスト（4言語）
body_ja / body_en / body_es / body_ko（各8セクション）

文章はあなた（かずひろ）の一人称で書く。
内容は毎回変化させる。
藤岡市・群馬県のローカル要素を適度に入れる。

===========================
【タイトル生成ルール（日本語）】
- 必ず「空冷ビートル」を含める
- 症状・トラブル・旅など検索される具体語を入れる
- 「原因」「対処法」「手順」「走行記録」など答えを入れる
- 群馬県・藤岡市など地域性を入れる（E-E-A-T強化）
- 40〜55文字以内に収める

【英語タイトル】
Air-cooled Beetle + symptom + cause/fix + Fujioka/Gunma

【スペイン語タイトル】
Beetle enfriado por aire + problema + solución + ubicación

【韓国語タイトル】
공랭 비틀 + 증상 + 원인/해결 + 후지오카/군마

===========================
【画像 ALT 最適化ルール（日本語）】
- 空冷ビートルを必ず含める
- 写真の状況（整備・旅・トラブル・走行）を具体的に説明
- 群馬県・藤岡市の地域性を含める
例：空冷ビートルが群馬県藤岡市の山道を走る様子

【英語 ALT】
Air-cooled Beetle + situation + Fujioka/Gunma

【スペイン語 ALT】
Beetle enfriado por aire + situación + Fujioka

【韓国語 ALT】
공랭 비틀 + 상황 + 군마 후지오카

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

  console.log("post.yml を生成しました（多言語SEO＋画像ALT最適化対応）");
}

main();
