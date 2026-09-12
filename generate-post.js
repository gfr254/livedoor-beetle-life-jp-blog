import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===============================
// タイトル候補
// ===============================
const TITLES_JA = [
  "藤岡市から神流町へ抜ける山道で空冷ビートルが見せた本当の走り",
  "上野村の林道で気づいた空冷ビートル整備の重要ポイント",
  "藤岡市〜神流町の渓谷ルートで起きたエンジントラブルと対処",
  "藤岡市から高崎市へ向かう渋滞路で感じた空冷ビートルのアイドリング変化",
  "前橋市の市街地を走って分かったキャブ調整の重要性",
  "高崎市の17号バイパスで空冷ビートルの加速が鈍った理由",
  "藤岡市の冬の冷え込みで空冷ビートルの始動が不安定になった日",
  "前橋市の放射冷却でキャブの反応が変わった理由",
  "高崎市の朝の冷え込みでプラグの状態が走りに影響した話",
  "藤岡市から上野村へ向かう林道ドライブで感じた空冷ビートルの魅力",
  "神流町の渓谷沿いを走って分かった空冷ビートルの燃調の癖",
  "藤岡市〜上野村の峠道で起きた小さなトラブルとその対処"
];

const TITLES_EN = [
  "How the Beetle performed on the mountain road from Fujioka to Kanna",
  "What I learned from driving the Beetle on the forest roads of Ueno Village",
  "Engine trouble on the Fujioka–Kanna valley route and how I fixed it",
  "Idle behavior of the Beetle in traffic between Fujioka and Takasaki",
  "Why carburetor tuning mattered while driving through Maebashi city",
  "Why acceleration dropped on Takasaki Route 17",
  "Cold mornings in Fujioka and unstable Beetle engine starts",
  "How radiative cooling in Maebashi affected carburetor response",
  "How Takasaki’s morning cold impacted spark plug performance",
  "Discovering the Beetle’s charm on the forest road to Ueno Village",
  "Fuel mixture quirks noticed while driving along Kanna’s valley",
  "Small troubles on the Fujioka–Ueno mountain pass and how I solved them"
];

// ===============================
// 地域文脈
// ===============================
const AREA_CONTEXT_JA = [
  "藤岡市の山道から神流町方面へ抜けるルートは急勾配が続き、空冷ビートルには負荷がかかります。特に冬場は路面温度が低く、燃調の変化が顕著に現れます。",
  "藤岡市から上野村へ向かう林道は凹凸が多く、振動トラブルが起きやすい道です。サスペンションやマフラーの緩みが出やすく、整備の重要性を感じます。",
  "藤岡市〜高崎市の市街地ルートは信号が多く、アイドリング調整が走りに直結します。渋滞時のエンジン温度管理も欠かせません。",
  "前橋市の放射冷却はキャブの反応に影響し、冬場は燃焼状態が不安定になりやすいです。朝の始動性が大きく変わります。",
  "高崎市の朝の冷え込みはプラグの状態に影響し、加速時の息継ぎが起きやすくなります。",
  "神流町の渓谷沿いは気温差が大きく、キャブの反応が変わりやすい環境です。上り坂では燃調の癖が顕著に出ます。"
];

const AREA_CONTEXT_EN = [
  "The mountain road from Fujioka to Kanna has steep gradients that put heavy load on an air‑cooled Beetle. In winter, low road temperatures make fuel mixture changes more noticeable.",
  "The forest road toward Ueno Village is full of bumps, making vibration‑related issues more likely. Suspension and exhaust looseness often appear on this route.",
  "The urban route between Fujioka and Takasaki has many traffic lights, making idle tuning essential. Engine temperature control becomes important during congestion.",
  "Radiative cooling in Maebashi affects carburetor response, especially in winter. Morning engine starts can vary significantly.",
  "Takasaki’s cold mornings affect spark plug performance, often causing hesitation during acceleration.",
  "The valley route in Kanna has large temperature differences, making carburetor behavior unstable. Fuel mixture quirks become obvious on uphill sections."
];

// ===============================
// ユーティリティ
// ===============================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===============================
// 壊れた本文を検出する
// ===============================
function isBrokenText(text) {
  if (!text) return true;

  return (
    text.includes("Introduct") ||   // 英語タイトルが途中で切れる
    text.endsWith("■") ||           // セクションタイトルが途中で切れる
    text.endsWith("'") ||           // テンプレート変数が壊れる
    text.includes("undefined") ||   // テンプレート展開失敗
    text.length < 80                // 異常に短い本文
  );
}

// ===============================
// JSON構造の検証
// ===============================
function validatePost(post) {
  if (!post.title_ja || !post.title_en) return false;

  for (const sec of post.body_ja) {
    if (isBrokenText(sec.section_title)) return false;
    if (isBrokenText(sec.content)) return false;
  }

  for (const sec of post.body_en) {
    if (isBrokenText(sec.section_title)) return false;
    if (isBrokenText(sec.content)) return false;
  }

  return true;
}

// ===============================
// メイン生成処理
// ===============================
async function generatePost() {
  const title_ja = pick(TITLES_JA);
  const title_en = pick(TITLES_EN);
  const area_ja = pick(AREA_CONTEXT_JA);
  const area_en = pick(AREA_CONTEXT_EN);

  const prompt = `
あなたは「群馬県藤岡市で空冷ビートルと暮らす旧車ブロガー」です。
以下の構造の JSON を生成してください。

必須条件：
- 日本語と英語の本文をどちらも充実させる（各400〜700文字）
- 藤岡市＋周辺地域（高崎市・前橋市・神流町・上野村）を自然に含める
- 整備・トラブル・旅の体験談を毎日ランダム生成
- タイトルに【】を付けない
- JSON は必ずパース可能な形式で出力する

{
  "title_ja": "${title_ja}",
  "title_en": "${title_en}",

  "body_ja": [
    { "section_title": "導入", "content": "藤岡市で空冷ビートルと暮らす日々は、整備とトラブルの連続です。今日のテーマ『${title_ja}』は、まさにその生活の中で起きた出来事です。" },
    { "section_title": "藤岡市と周辺地域の走行環境", "content": "${area_ja}" },
    { "section_title": "具体的な体験談", "content": "今日の走行中、${title_ja}に関連する症状が現れました。エンジンの反応が鈍く、加速時に息継ぎのような感覚がありました。" },
    { "section_title": "学んだこと", "content": "藤岡市や周辺地域の道路環境は、空冷車にとって負荷が大きく、日々の整備が走りに直結します。" },
    { "section_title": "まとめ", "content": "${title_ja}は旧車生活を支える重要なポイントです。" }
  ],

  "body_en": [
    { "section_title": "Introduction", "content": "Living with an air‑cooled Beetle in Fujioka means constant maintenance and occasional troubleshooting. Today's theme, '${title_en}', comes directly from real driving experiences." },
    { "section_title": "Driving Environment", "content": "${area_en}" },
    { "section_title": "Experience", "content": "During today's drive, I noticed symptoms related to '${title_en}'. The engine felt sluggish, and acceleration had slight hesitation." },
    { "section_title": "What I Learned", "content": "Fujioka and its surrounding areas place heavy load on air‑cooled engines." },
    { "section_title": "Summary", "content": "'${title_en}' is a key part of keeping an air‑cooled Beetle healthy." }
  ]
}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a JSON generator. Output only valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });

  const jsonText = completion.choices[0].message.content.trim();

  let post;
  try {
    post = JSON.parse(jsonText);
  } catch (e) {
    console.error("JSON パース失敗 → 再生成します");
    return generatePost();
  }

  if (!validatePost(post)) {
    console.error("本文が壊れています → 再生成します");
    return generatePost();
  }

  fs.writeFileSync("post.yml", JSON.stringify(post, null, 2));
  console.log("post.yml を生成しました:", post.title_ja);
}

generatePost();
