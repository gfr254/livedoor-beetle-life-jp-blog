import fs from "fs";
import { pathToFileURL } from "url";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 1 });

const MODEL = "gpt-4o-mini";
const MAX_GENERATION_ATTEMPTS = 5;
const SYSTEM_PROMPT = "JSONオブジェクトのみ出力。コードブロック禁止。";

// ---- 文字数ルール（検証とプロンプトを同じ定数から作る）----
const SUMMARY_MIN = 80;
const SUMMARY_MAX = 120;
const SUMMARY_TARGET = [95, 110];
const BODY_MIN = 500;
const BODY_MAX = 1100;
const BODY_TARGET = [900, 1000];      // モデルは指示より短く書きやすいので、範囲の中央よりやや上を狙わせる
const SECTION_TARGET = [180, 200];
const SECTION_COUNT = 5;

const TOPICS_JA = [
  "空冷ビートルのエンジン構造と基礎知識",
  "空冷VWの年式による外観や装備の違い",
  "空冷ビートルの購入前に確認したいポイント",
  "空冷VWの維持費と部品選びの考え方",
  "空冷エンジンの日常点検と冷却の仕組み"
];

const CATEGORIES = [
  "イベント・写真",
  "販売車両の観察",
  "パーツと装備",
  "空冷ビートル豆知識",
  "オーナーの声",
  "旧車記録"
];
const DEFAULT_CATEGORY = "空冷ビートル豆知識";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadImageUrls() {
  const urls = fs.readFileSync("images.txt", "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(url => /^https:\/\//i.test(url));
  if (!urls.length) throw new Error("images.txtに有効な画像URLがありません");
  return urls;
}

// ---- 文字数計測 ----
const countChars = text => [...String(text ?? "").replace(/\s/g, "")].length;

export function bodyLength(post) {
  if (!Array.isArray(post?.body_ja)) return 0;
  return post.body_ja
    .map(section => typeof section?.content === "string" ? section.content : "")
    .reduce((sum, content) => sum + countChars(content), 0);
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
  } else {
    const n = countChars(post.summary_ja);
    if (n < SUMMARY_MIN || n > SUMMARY_MAX) errors.push(`要約は${SUMMARY_MIN}〜${SUMMARY_MAX}文字の範囲外です（現在${n}文字）`);
  }
  if (!Array.isArray(post.body_ja)) {
    errors.push("本文のセクションが配列ではありません");
  } else {
    if (post.body_ja.length !== SECTION_COUNT) errors.push(`本文は${SECTION_COUNT}セクション必要です（現在${post.body_ja.length}）`);
    const n = bodyLength(post);
    if (n < BODY_MIN || n > BODY_MAX) errors.push(`本文は${BODY_MIN}〜${BODY_MAX}文字の範囲外です（現在${n}文字）`);
    post.body_ja.forEach((section, index) => {
      if (typeof section?.section_title !== "string" || !section.section_title.trim()) errors.push(`第${index + 1}セクションの見出しがありません`);
      if (isBroken(section?.content)) errors.push(`第${index + 1}セクションの本文が空または未完成です`);
    });
  }
  if (typeof post.image_url !== "string" || !/^https:\/\//i.test(post.image_url)) errors.push("画像URLがHTTPSではありません");
  return errors;
}

// ---- プロンプト ----
function buildPrompt(topic) {
  return [
    "出力はJSONのみ。コードブロック禁止。",
    "記事テーマ：" + topic,
    "空冷ビートル／空冷VWについて、読者の具体的な疑問に答える日本語の解説記事を作ってください。筆者本人の所有・運転・修理・イベント参加経験を創作しないでください。",
    "画像URLは装飾用であり画像の中身を確認できていません。写真、車両、人物、イベントについて見たと断定しないでください。与えられていない地域、店舗、販売情報も作らないでください。",
    "年式・仕様差がある情報は一律に断定せず、車台番号や車種ごとに異なることを明記してください。確認できない数値、価格、故障原因、整備手順は作らず、該当車両の整備資料で確認するよう案内してください。",
    "検索する人が得られる答えを冒頭で簡潔に示し、主キーワード「空冷ビートル」または「空冷VW」をタイトルと要約に自然に含めてください。キーワードの詰め込みは禁止です。",
    "記事ごとに1つの具体的な検索意図へ絞り、タイトルだけ変えた類似記事を作らないでください。",
    "見出しは読者が確認したい項目を具体的に示し、導入で記事の答えを先に伝えてください。一般論の繰り返しや、実体験のように見せる表現で水増ししないでください。",
    "title_jaは本文に合わせた固有の具体的なタイトル（日本語25〜38文字を目安）にしてください。",
    `summary_jaは検索結果用の自然な要約です。${SUMMARY_TARGET[0]}〜${SUMMARY_TARGET[1]}文字で書いてください（検証範囲は${SUMMARY_MIN}〜${SUMMARY_MAX}文字）。短くなりやすいので、2文構成にして、結論＋読者が得られる確認ポイントまで含めてください。`,
    `本文は全${SECTION_COUNT}セクション、各セクション本文を${SECTION_TARGET[0]}〜${SECTION_TARGET[1]}文字、合計${BODY_TARGET[0]}〜${BODY_TARGET[1]}文字で書いてください（検証範囲は${BODY_MIN}〜${BODY_MAX}文字、見出しは含みません）。各セクションは3〜4文で、用語の説明・仕組み・具体的な確認ポイント・注意点を入れてください。体験談や確認できない事実で水増ししないでください。`,
    "本文はプレーンテキストでHTMLを使わず、同じ説明の繰り返しを避けてください。",
    "",
    "出力形式（値は記事内容で埋める）:",
    "{",
    '  "title_ja": "",',
    '  "summary_ja": "",',
    '  "body_ja": [',
    '    {"section_title":"基礎知識","content":""},',
    '    {"section_title":"確認ポイント","content":""},',
    '    {"section_title":"仕組みと違い","content":""},',
    '    {"section_title":"注意点","content":""},',
    '    {"section_title":"まとめ","content":""}',
    "  ]",
    "}"
  ].join("\n");
}

function describeLengths(draft) {
  const sections = Array.isArray(draft?.body_ja)
    ? draft.body_ja.map((s, i) => `第${i + 1}:${countChars(s?.content)}文字`).join("、")
    : "セクションなし";
  return `要約${countChars(draft?.summary_ja)}文字 / 本文合計${bodyLength(draft)}文字（${sections}）`;
}

// 前回の出力を渡して「問題の箇所だけ」直させる
function buildRepairPrompt(draft, errors) {
  return [
    "前回のJSONは検証に失敗しました。",
    "検証エラー: " + errors.join(" / "),
    "実測値: " + describeLengths(draft),
    `目標: 要約${SUMMARY_TARGET[0]}〜${SUMMARY_TARGET[1]}文字、各セクション${SECTION_TARGET[0]}〜${SECTION_TARGET[1]}文字、本文合計${BODY_TARGET[0]}〜${BODY_TARGET[1]}文字。`,
    "エラーのある項目だけを直し、問題のない項目は変更しないでください。",
    "短い場合は同じ説明の反復ではなく、仕組み・具体的な確認項目・注意点を追加してください。長い場合は重複部分を削ってください。",
    "完全なJSONオブジェクトのみを再出力してください。"
  ].join("\n");
}

// ---- OpenAI 呼び出し ----
async function requestJson(messages) {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.4,
    response_format: { type: "json_object" }
  });
  const text = (res.choices[0].message.content ?? "").replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

async function generatePost() {
  const image_url = pick(loadImageUrls());
  const topic = pick(TOPICS_JA);
  const basePrompt = buildPrompt(topic);

  let draft = null;     // 直近でJSONとして有効だった出力
  let errors = [];
  let post = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: basePrompt }
    ];
    if (draft && errors.length) {
      messages.push({ role: "assistant", content: JSON.stringify(draft) });
      messages.push({ role: "user", content: buildRepairPrompt(draft, errors) });
    }

    let parsed;
    try {
      parsed = await requestJson(messages);
    } catch (error) {
      errors = ["応答をJSONとして読み取れませんでした"];
      console.log(`記事生成の再試行 ${attempt}/${MAX_GENERATION_ATTEMPTS}: ${errors[0]} (${error.message})`);
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors = ["記事データがJSONオブジェクトではありません"];
      console.log(`記事生成の再試行 ${attempt}/${MAX_GENERATION_ATTEMPTS}: ${errors[0]}`);
      continue;
    }

    draft = parsed;
    const candidate = { ...draft, image_url, image_alt: draft.title_ja };
    errors = validate(candidate);
    if (errors.length > 0) {
      console.log(`記事生成の再試行 ${attempt}/${MAX_GENERATION_ATTEMPTS}: ${errors.join(" / ")} [${describeLengths(draft)}]`);
      continue;
    }
    post = candidate;
    break;
  }

  if (!post) {
    throw new Error(`有効な記事を${MAX_GENERATION_ATTEMPTS}回以内に生成できませんでした。最終理由: ${errors.join(" / ")}`);
  }

  const bodyText = post.body_ja.map(s => s.content).join("\n");

  // タグ生成（失敗しても記事全体は落とさない）
  try {
    const tagResult = await requestJson([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `以下の記事内容から、ブログタグとして適切な単語を5〜10個生成してください。\n{"tags": ["タグ1", "タグ2"]} の形式のJSONオブジェクトのみで返してください。\n\n記事内容：\n${bodyText}`
      }
    ]);
    const tags = Array.isArray(tagResult?.tags)
      ? tagResult.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim())
      : [];
    post.tags = [...new Set(tags)].slice(0, 10);
  } catch (error) {
    console.log("タグ生成に失敗したため空のタグで続行します:", error.message);
    post.tags = [];
  }

  // カテゴリ判定（選択肢に無い値は既定カテゴリへ）
  try {
    const catRes = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [{
        role: "user",
        content: `以下の記事内容を読み、最適なカテゴリー名を1つだけ、選択肢の文字列そのままで返してください。説明やコードブロックは禁止です。\n\n選択肢：\n${CATEGORIES.map(c => "- " + c).join("\n")}\n\n記事内容：\n${bodyText}`
      }]
    });
    const raw = (catRes.choices[0].message.content ?? "").replace(/```/g, "").trim();
    post.category_name = CATEGORIES.find(c => raw.includes(c)) ?? DEFAULT_CATEGORY;
  } catch (error) {
    console.log("カテゴリ判定に失敗したため既定カテゴリを使用します:", error.message);
    post.category_name = DEFAULT_CATEGORY;
  }

  fs.writeFileSync("post.yml", JSON.stringify(post, null, 2));
  console.log("post.ymlを生成しました:", post.title_ja, "本文:", bodyLength(post), "文字", "画像:", post.image_url);
}

// import されただけでは実行しない（テストから validate / bodyLength を読み込めるように）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generatePost().catch(error => {
    console.error("記事生成に失敗しました:", error.message);
    process.exitCode = 1;
  });
}
