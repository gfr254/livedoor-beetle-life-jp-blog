import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// タイトル候補
const TITLES_JA = [
  "旧車イベントで見つけた空冷VWの見どころ",
  "写真で見る空冷ビートルの年式と装備",
  "空冷VWのエンジンルームを写真で観察する",
  "空冷VWイベントで聞いたオーナーの工夫",
  "販売車両の写真から読み取れる空冷VW用語"
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function loadImageUrls() {
  const urls = fs.readFileSync('images.txt', 'utf8').split(String.fromCharCode(10)).map(line => line.trim()).filter(url => /^https:\/\//i.test(url));
  if (!urls.length) throw new Error('images.txtに有効な画像URLがありません');
  return urls;
}

function bodyLength(post) {
  return post.body_ja.map(section => section.content || '').join('').replace(/\s/g, '').length;
}

function isBroken(text) {
  if (!text) return true;
  return text.includes('undefined') || text.includes('{') || text.includes('```');
}

function validate(post) {
  if (!post.title_ja || !Array.isArray(post.body_ja) || post.body_ja.length < 4) return false;
  if (!post.image_url || !/^https:\/\//i.test(post.image_url)) return false;
  if (bodyLength(post) < 260 || bodyLength(post) > 380) return false;
  return post.body_ja.every(section => section.section_title && !isBroken(section.content));
}

async function generatePost() {
  const title_ja = pick(TITLES_JA);

  const image_url = pick(loadImageUrls());
  const prompt = [
    '出力はJSONのみ。コードブロック禁止。',
    '旧車イベント、公開されている販売車両、部品、写真などを観察して紹介する記録記事を作ってください。筆者は現時点で空冷ビートルを所有していません。',
    '本文全体は日本語で260〜380文字、目安は約300文字。5つのセクションを作り、各セクションは45〜80文字程度にしてください。',
    '筆者自身の所有、運転、修理、整備の体験談を書かず、写真や公開情報から確認できる特徴、イベントで得た話、部品の見どころを中心にしてください。確認できない価格、年式、走行距離、修理費、故障原因、店舗名、地域情報は創作しないでください。',
    '実在しない部品名、費用、正確な数値、危険な整備手順を断定しないでください。本文はプレーンテキストで、HTMLは使わないでください。',
    '',
    '{',
    '  \"title_ja\": \"' + title_ja + '\",',
    '  \"body_ja\": [',
    '    {\"section_title\":\"導入\",\"content\":\"\"},',
    '    {\"section_title\":\"走行中の変化\",\"content\":\"\"},',
    '    {\"section_title\":\"気づいた原因\",\"content\":\"\"},',
    '    {\"section_title\":\"点検と対処\",\"content\":\"\"},',
    '    {\"section_title\":\"まとめ\",\"content\":\"\"}',
    '  ]',
    '}'
  ].join(String.fromCharCode(10));
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
    post.image_url = image_url;
    post.image_alt = post.title_ja;
  } catch {
    console.log("JSON壊れ → 再生成");
    return generatePost();
  }

  if (!validate(post)) {
    console.log('本文が約300文字の条件を満たさないため再生成します（文字数:', bodyLength(post), '）');
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

- イベント・写真
- 販売車両の観察
- パーツと装備
- 空冷ビートル豆知識
- オーナーの声
- 旧車記録

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
  console.log('post.ymlを生成しました:', post.title_ja, '本文:', bodyLength(post), '文字', '画像:', post.image_url);
}

generatePost();
