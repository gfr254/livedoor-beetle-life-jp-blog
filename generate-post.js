import fs from "fs";
import OpenAI from "openai";


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 1 });

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

const MIN_BODY_LENGTH = 700;
const MAX_BODY_LENGTH = 1100;

export function bodyLength(post) {
  if (!Array.isArray(post?.body_ja)) return 0;
  return post.body_ja
    .map(section => typeof section?.content === "string" ? section.content : "")
    .join("")
    .replace(/\s/g, "")
    .length;
}

function isBroken(text) {
  if (typeof text !== "string" || !text.trim()) return true;
  return text.includes("undefined") || text.includes("{") || text.includes("```");
}

export function validate(post) {
  const errors = [];
  if (!post || typeof post !== "object" || Array.isArray(post)) return ["記事データがJSONオブジェクトではありません"];
  if (typeof post.title_ja !== "string" || !post.title_ja.trim()) errors.push("タイトルが空です");
  if (typeof post.summary_ja !== "string") {
    errors.push("要約がありません");
  } else if (post.summary_ja.length < 80 || post.summary_ja.length > 120) {
    errors.push("要約は80〜120文字の範囲外です（現在" + post.summary_ja.length + "文字）");
  }
  if (!Array.isArray(post.body_ja)) {
    errors.push("本文のセクションが配列ではありません");
  } else {
    if (post.body_ja.length !== 5) errors.push("本文は5セクション必要です（現在" + post.body_ja.length + "）");
    const length = bodyLength(post);
    if (length < MIN_BODY_LENGTH || length > MAX_BODY_LENGTH) errors.push("本文は700〜1100文字の範囲外です（現在" + length + "文字）");
    post.body_ja.forEach((section, index) => {
      if (typeof section?.section_title !== "string" || !section.section_title.trim()) errors.push("第" + (index + 1) + "セクションの見出しがありません");
      if (isBroken(section?.content)) errors.push("第" + (index + 1) + "セクションの本文が空または未完成です");
    });
  }
  if (typeof post.image_url !== "string" || !/^https:\/\//i.test(post.image_url)) errors.push("画像URLがHTTPSではありません");
  return errors;
}

const MAX_GENERATION_ATTEMPTS = 5;

async function generatePost() {
  const imageUrls = loadImageUrls();
  let post = null;
  let lastFailure = "記事を生成できませんでした";
  const topic = pick(TOPICS_JA);

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {


  const image_url = pick(imageUrls);
  const prompt = [
        '出力はJSONのみ。コードブロック禁止。',
        '記事テーマ：' + topic,
        '空冷ビートル／空冷VWについて、読者の具体的な疑問に答える日本語の解説記事を作ってください。筆者本人の所有・運転・修理・イベント参加経験を創作しないでください。',
        '画像URLは装飾用であり画像の中身を確認できていません。写真、車両、人物、イベントについて見たと断定しないでください。与えられていない地域、店舗、販売情報も作らないでください。',
        '年式・仕様差がある情報は一律に断定せず、車台番号や車種ごとに異なることを明記してください。確認できない数値、価格、故障原因、整備手順は作らず、該当車両の整備資料で確認するよう案内してください。',
        '検索する人が得られる答えを冒頭で簡潔に示し、主キーワード「空冷ビートル」または「空冷VW」をタイトルと要約に自然に含めてください。キーワードの詰め込みは禁止です。',
        '記事ごとに1つの具体的な検索意図へ絞り、購入チェック・年式確認・維持費など既存記事と同じ意図を繰り返さないでください。タイトルだけ変えた類似記事を作らず、別の疑問に答える場合だけ記事化してください。',
        attempt > 1 ? '前回の生成は検証に失敗しました。今回こそ文字数条件を必ず満たしてください。前回の問題: ' + lastFailure : '',
        '見出しは読者が確認したい項目を具体的に示し、導入で記事の答えを先に伝えてください。一般論の繰り返しや、実体験のように見せる表現で水増ししないでください。',
        'title_jaは本文に合わせた固有の具体的なタイトル（日本語25〜38文字を目安）にしてください。summary_jaは検索結果用の自然な要約です。JavaScriptの文字数で必ず90〜105文字にしてください.',
        '本文は全5セクション、各セクションの本文をおよそ160〜185文字、合計800〜950文字にしてください。見出しは本文の文字数に含まれません。体験談や確認できない事実で水増しせず、用語の説明、仕組み、確認ポイント、注意点を読者向けに具体化してください.',
        '本文はプレーンテキストでHTMLを使わず、同じ説明の繰り返しを避けてください。',
        '',
        '{',
        '  "title_ja": "空冷ビートルの購入前に確認したい基本ポイント",',
        '  "summary_ja": "空冷ビートルの購入前には、年式だけで状態を判断せず、整備記録や車体の腐食、エンジン周辺を確認することが大切です。車両ごとの仕様差があるため、迷う点は専門店や整備士に相談する方法も紹介します。",',
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
    let jsonText = res.choices[0].message.content?.trim() || "";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    let candidate;
    try {
      candidate = JSON.parse(jsonText);
    } catch {
      lastFailure = "応答をJSONとして読み取れませんでした";
      console.log("記事生成の再試行 " + attempt + "/" + MAX_GENERATION_ATTEMPTS + ": " + lastFailure);
      continue;
    }
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      lastFailure = "記事データがJSONオブジェクトではありません";
      console.log("記事生成の再試行 " + attempt + "/" + MAX_GENERATION_ATTEMPTS + ": " + lastFailure);
      continue;
    }
    candidate.image_url = image_url;
    candidate.image_alt = candidate.title_ja;
    const errors = validate(candidate);
    if (errors.length > 0) {
      lastFailure = errors.join(" / ");
      console.log("記事生成の再試行 " + attempt + "/" + MAX_GENERATION_ATTEMPTS + ": " + lastFailure);
      continue;
    }
    post = candidate;
    break;
  }

  if (!post) {
    throw new Error("有効な記事を" + MAX_GENERATION_ATTEMPTS + "回以内に生成できませんでした。最終理由: " + lastFailure);
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

generatePost().catch(error => {
  console.error("記事生成に失敗しました:", error.message);
  process.exitCode = 1;
});
