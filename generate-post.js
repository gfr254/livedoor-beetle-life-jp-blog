import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===============================
// 日替わりタイトル（藤岡市＋周辺地域）
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

const TITLES_ES = [
  "El rendimiento del Escarabajo en la ruta montañosa de Fujioka a Kanna",
  "Lo que aprendí conduciendo por los caminos forestales de Ueno",
  "Problemas de motor en la ruta del valle Fujioka–Kanna y cómo los resolví",
  "Cambios en el ralentí del Escarabajo en el tráfico hacia Takasaki",
  "Por qué el ajuste del carburador fue clave al conducir por Maebashi",
  "Por qué disminuyó la aceleración en la Ruta 17 de Takasaki",
  "Arranques inestables del Escarabajo en las frías mañanas de Fujioka",
  "Cómo el enfriamiento por radiación en Maebashi afectó el carburador",
  "El impacto del frío matutino de Takasaki en las bujías",
  "Descubriendo el encanto del Escarabajo en los caminos forestales de Ueno",
  "Particularidades de la mezcla de combustible en el valle de Kanna",
  "Pequeños problemas en el paso montañoso Fujioka–Ueno y cómo los solucioné"
];

const TITLES_KO = [
  "후지오카에서 칸나로 이어지는 산길에서 비틀이 보여준 진짜 주행력",
  "우에노 마을 임도에서 깨달은 공랭 비틀 정비 포인트",
  "후지오카–칸나 계곡 루트에서 발생한 엔진 문제와 해결 방법",
  "후지오카에서 다카사키로 가는 정체 구간에서 느낀 아이들링 변화",
  "마에바시 시가지를 달리며 깨달은 카브 조정의 중요성",
  "다카사키 17번 도로에서 가속이 둔해진 이유",
  "후지오카의 겨울 아침 추위로 비틀 시동이 불안정해진 날",
  "마에바시의 복사 냉각이 카브 반응에 미친 영향",
  "다카사키 아침 추위가 플러그 성능에 미친 영향",
  "우에노 마을 임도 드라이브에서 느낀 비틀의 매력",
  "칸나 계곡을 달리며 발견한 연료 혼합의 특징",
  "후지오카–우에노 고갯길에서 발생한 작은 문제와 해결"
];

// ===============================
// 藤岡市＋周辺地域の道路環境（日替わり）
// ===============================
const AREA_CONTEXT = [
  "藤岡市の山道から神流町方面へ抜けるルートは急勾配が続き、空冷ビートルには負荷がかかります。",
  "藤岡市から上野村へ向かう林道は凹凸が多く、振動トラブルが起きやすい道です。",
  "藤岡市〜高崎市の市街地ルートは信号が多く、アイドリング調整が重要になります。",
  "前橋市の放射冷却はキャブの反応に影響し、冬場は燃調が不安定になりやすいです。",
  "高崎市の朝の冷え込みはプラグの状態に影響し、始動性が変わります。",
  "神流町の渓谷沿いは気温差が大きく、キャブの反応が変わりやすい環境です。"
];

// ===============================
// ランダム選択
// ===============================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===============================
// メイン生成処理
// ===============================
async function generatePost() {
  const title_ja = pick(TITLES_JA);
  const title_en = pick(TITLES_EN);
  const title_es = pick(TITLES_ES);
  const title_ko = pick(TITLES_KO);
  const areaContext = pick(AREA_CONTEXT);

  const prompt = `
あなたは「群馬県藤岡市で空冷ビートルと暮らす旧車ブロガー」です。
以下の構造の JSON を生成してください。

必須条件：
- 日本語・英語・スペイン語・韓国語の本文をすべて日替わりで変化させる
- 藤岡市＋周辺地域（高崎市・前橋市・神流町・上野村）を自然に含める
- 整備・トラブル・旅の体験談を毎日ランダム生成
- 繰り返し表現は禁止
- JSON は必ずパース可能な形式で出力する

出力形式：

{
  "title_ja": "${title_ja}",
  "title_en": "${title_en}",
  "title_es": "${title_es}",
  "title_ko": "${title_ko}",

  "image": {
    "url": "https://source.unsplash.com/featured/?volkswagen,beetle",
    "alt_ja": "${title_ja}",
    "alt_en": "${title_en}",
    "alt_es": "${title_es}",
    "alt_ko": "${title_ko}"
  },

  "body_ja": [
    { "section_title": "導入", "content": "藤岡市で空冷ビートルと暮らす中で、${title_ja}という出来事がありました。" },
    { "section_title": "藤岡市と周辺地域の走行環境", "content": "${areaContext}" },
    { "section_title": "今回のテーマ", "content": "${title_ja}について詳しく解説します。" },
    { "section_title": "具体的な体験談", "content": "今日の走行中、${title_ja}に関連するトラブルが発生し、整備を行ったところ改善しました。" },
    { "section_title": "学んだこと", "content": "藤岡市や周辺地域の道路環境では、日々の整備が走りに直結することを改めて実感しました。" },
    { "section_title": "まとめ", "content": "${title_ja}は旧車生活を支える重要なポイントです。" },
    { "section_title": "関連リンク", "content": "空冷ビートルのキャブ調整, 農道での振動対策, 山道走行のポイント" }
  ],

  "body_en": [
    { "section_title": "Introduction", "content": "While driving in Fujioka today, I experienced something related to '${title_en}'." },
    { "section_title": "Driving Environment", "content": "Fujioka and nearby areas such as Takasaki, Maebashi, Kanna, and Ueno offer diverse conditions that affect engine behavior." },
    { "section_title": "Insights", "content": "Today's issue related to '${title_en}' improved after maintenance." }
  ],

  "body_es": [
    { "section_title": "Introducción", "content": "Durante la conducción de hoy en Fujioka, ocurrió algo relacionado con '${title_es}'." },
    { "section_title": "Entorno de conducción", "content": "Fujioka y zonas cercanas como Takasaki, Maebashi, Kanna y Ueno presentan condiciones diversas que afectan el motor." },
    { "section_title": "Conclusiones", "content": "El problema relacionado con '${title_es}' mejoró tras realizar mantenimiento." }
  ],

  "body_ko": [
    { "section_title": "소개", "content": "오늘 후지오카 주행 중 '${title_ko}'와 관련된 일이 있었습니다." },
    { "section_title": "주행 환경", "content": "후지오카와 다카사키, 마에바시, 칸나, 우에노 등 주변 지역은 엔진 상태에 영향을 주는 다양한 환경을 가지고 있습니다." },
    { "section_title": "정리", "content": "오늘 '${title_ko}' 관련 문제는 정비 후 개선되었습니다." }
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
  const post = JSON.parse(jsonText);

  fs.writeFileSync("post.yml", JSON.stringify(post, null, 2));
  console.log("post.yml を生成しました:", post.title_ja);
}

generatePost();
