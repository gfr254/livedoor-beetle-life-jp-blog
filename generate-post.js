import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 記事テーマ。タイトルは本文に合わせて毎回具体的に生成する。
    const TOPICS_JA = [
      "空冷ビートルのエンジン構造と基礎知識",
      "空冷VWの年式による外観や装備の違い",
      "空冷ビートルの購入前に確認したいポイント",
      "空冷VWの維持費と部品選びの考え方",
      "空冷エンジンの日常点検と冷却の仕組み"
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
  if (!post.title_ja || !post.summary_ja || !Array.isArray(post.body_ja) || post.body_ja.length !== 5) return false;
  if (post.summary_ja.length < 80 || post.summary_ja.length > 120) return false;
  if (!post.image_url || !/^https:\/\//i.test(post.image_url)) return false;
  if (bodyLength(post) < 700 || bodyLength(post) > 1100) return false;
  return post.body_ja.every(section => section.section_title && !isBroken(section.content));
}

async function generatePost() {
  const topic = pick(TOPICS_JA);

  const image_url = pick(loadImageUrls());
  const prompt = [
        '出力はJSONのみ。コードブロック禁止。',
        '記事テーマ：' + topic,
        '空冷ビートル／空冷VWについて、読者の具体的な疑問に答える日本語の解説記事を作ってください。筆者本人の所有・運転・修理・イベント参加経験を創作しないでください。',
        '画像URLは装飾用であり画像の中身を確認できていません。写真、車両、人物、イベントについて見たと断定しないでください。与えられていない地域、店舗、販売情報も作らないでください。',
        '年式・仕様差がある情報は一律に断定せず、車台番号や車種ごとに異なることを明記してください。確認できない数値、価格、故障原因、整備手順は作らず、該当車両の整備資料で確認するよう案内してください。',
        '検索する人が得られる答えを冒頭で簡潔に示し、主キーワード「空冷ビートル」または「空冷VW」をタイトルと要約に自然に含めてください。キーワードの詰め込みは禁止です。',
        'title_jaは本文に合わせた固有の具体的なタイトル（日本語25〜38文字を目安）にしてください。summary_jaは検索結果用の自然な要約（日本語80〜120文字）にしてください。',
        '本文は700〜1100文字、5つのセクションに分け、各セクションを十分に説明してください。体験談や確認できない事実で水増しせず、用語の説明、仕組み、確認ポイント、注意点を読者向けに具体化してください。',
        '本文はプレーンテキストでHTMLを使わず、同じ説明の繰り返しを避けてください。',
        '',
        '{',
        '  "title_ja": "空冷ビートルの購入前に確認したい基本ポイント",',
        '  "summary_ja": "空冷ビートルの購入を検討する人向けに、年式や車両状態で確認項目が変わる理由と、整備記録や専門家への確認が大切な点を解説します。",',
        '  "body_ja": [',
        '    {"section_title":"基礎知識","content":""},',
        '    {"section_title":"確認ポイント","content":""},',
        '    {"section_title":"仕組みと違い","content":""},',
        '    {"section_title":"注意点","content":""},',
        '    {"section_title":"まとめ","content":""}',
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
