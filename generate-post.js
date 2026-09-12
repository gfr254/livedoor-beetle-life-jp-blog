import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// タイトル候補
const TITLES_JA = [
  "藤岡市の山道で空冷ビートルが見せた本当の走り",
  "高崎市の渋滞で気づいたキャブ調整の重要性",
  "前橋市の冷え込みで始動が不安定になった理由",
  "神流町の渓谷ルートで起きた小さなトラブル",
  "上野村の林道で感じた空冷ビートルの魅力"
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isBroken(text) {
  if (!text) return true;
  return text.includes("undefined") || text.includes("{");
}

function validate(post) {
  if (!post.title_ja) return false;
  for (const sec of post.body_ja) {
    if (isBroken(sec.content)) return false;
  }
  return true;
}

async function generatePost() {
  const title_ja = pick(TITLES_JA);

  const prompt = `
出力は JSON のみ。コードブロック禁止。

{
  "title_ja": "${title_ja}",
  "body_ja": [
    { "section_title": "導入", "content": "藤岡市で空冷ビートルと暮らす日々は整備と発見の連続です。" },
    { "section_title": "状況", "content": "今日は${title_ja}に関連する出来事がありました。" },
    { "section_title": "原因", "content": "走行環境や気温の変化が空冷エンジンに影響した可能性があります。" },
    { "section_title": "対処", "content": "簡単な点検と調整で症状は改善しました。" },
    { "section_title": "まとめ", "content": "旧車生活は手間もありますが、それ以上に魅力があります。" }
  ]
}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "JSONのみ出力。コードブロック禁止。" },
      { role: "user", content: prompt }
    ],
    temperature: 0.4
  });

  let jsonText = res.choices[0].message.content.trim();

  // ★ コードブロック除去（必須）
  jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

  let post;
  try {
    post = JSON.parse(jsonText);
  } catch {
    console.log("JSON壊れ → 再生成");
    return generatePost();
  }

  if (!validate(post)) {
    console.log("本文壊れ → 再生成");
    return generatePost();
  }

  // タグ生成
  const tagPrompt = `
以下の記事内容から、ブログタグとして適切な単語を5〜10個生成してください。
形式は JSON 配列のみで返してください。
コードブロック禁止。

記事内容：
${post.body_ja.map(s => s.content).join("\n")}
`;

  const tagRes = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: tagPrompt }]
  });

  let tagText = tagRes.choices[0].message.content.trim();
  tagText = tagText.replace(/```json/g, "").replace(/```/g, "").trim();
  post.tags = JSON.parse(tagText);

  // カテゴリ判定
  const categoryPrompt = `
以下の記事内容を読み、最適なカテゴリー名を1つだけ返してください。
コードブロック禁止。

選択肢：

- 整備・メンテナンス
- ビートルのある生活
- 旅・ドライブ記録
- 空冷ビートル豆知識
- DIY・カスタム
- 写真ギャラリー

記事内容：
${post.body_ja.map(s => s.content).join("\n")}
`;

  const catRes = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: categoryPrompt }]
  });

  let catText = catRes.choices[0].message.content.trim();
  catText = catText.replace(/```/g, "").trim();
  post.category_name = catText;

  fs.writeFileSync("post.yml", JSON.stringify(post, null, 2));
  console.log("post.yml を生成しました:", post.title_ja);
}

generatePost();
