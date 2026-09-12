import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===============================
// テーマを毎日ランダム生成（旧車ブログ向け）
// ===============================
const THEMES = [
  "ブログ自動生成AIの紹介",
  "キャブ調整の記録",
  "農道で発生した振動トラブル",
  "山道走行で感じた負荷の変化",
  "プラグ清掃の効果",
  "藤岡市の冬とチョーク調整",
  "空冷ビートルの旅日記",
  "アイドリング調整のコツ",
  "オイル交換の記録",
  "整備とトラブルの備忘録"
];

function pickTheme() {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

// ===============================
// OpenAI に構造化 JSON を生成させる
// ===============================
async function generatePost() {
  const theme = pickTheme();

  const prompt = `
あなたは「群馬県藤岡市で空冷ビートルと暮らす旧車ブロガー」です。
以下の構造の JSON を生成してください。

必須条件：
- 人間が書いたような自然な文章
- 藤岡市の道路環境（山道・農道・市街地・冬の冷え込み）を必ず含める
- 空冷ビートルの生活感（整備・トラブル・旅）を含める
- 繰り返し表現は禁止
- 多言語は自然な翻訳にする
- 内部リンクは3つだけ生成
- JSON は必ずパース可能な形式で出力する

出力形式：

{
  "title_ja": "${theme}",
  "image": {
    "url": "https://source.unsplash.com/featured/?volkswagen,beetle",
    "alt_ja": "${theme}",
    "alt_en": "Air-cooled Beetle: ${theme}",
    "alt_es": "Volkswagen Escarabajo: ${theme}",
    "alt_ko": "공랭 비틀: ${theme}"
  },
  "body_ja": [
    { "section_title": "導入", "content": "..." },
    { "section_title": "藤岡市での旧車生活", "content": "..." },
    { "section_title": "今回のテーマ：${theme}", "content": "..." },
    { "section_title": "具体的な体験談", "content": "..." },
    { "section_title": "学んだこと", "content": "..." },
    { "section_title": "まとめ", "content": "..." },
    { "section_title": "関連リンク", "content": "空冷ビートルのキャブ調整, 農道での振動対策, 山道走行のポイント" }
  ],
  "body_en": [
    { "section_title": "Introduction", "content": "..." },
    { "section_title": "Driving in Fujioka", "content": "..." },
    { "section_title": "Insights", "content": "..." }
  ],
  "body_es": [
    { "section_title": "Introducción", "content": "..." },
    { "section_title": "Entorno de conducción", "content": "..." },
    { "section_title": "Conclusiones", "content": "..." }
  ],
  "body_ko": [
    { "section_title": "소개", "content": "..." },
    { "section_title": "후지오카 주행 환경", "content": "..." },
    { "section_title": "정리", "content": "..." }
  ]
}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a JSON generator. Output only valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.4
  });

  const jsonText = completion.choices[0].message.content.trim();
  const post = JSON.parse(jsonText);

  fs.writeFileSync("post.yml", JSON.stringify(post, null, 2));
  console.log("post.yml を生成しました:", post.title_ja);
}

generatePost();
