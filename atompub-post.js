async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });

  // 最新仕様：画像URLで返ってくる
  const imageUrl = img.data[0].url;

  // URLから画像をダウンロードして保存
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  fs.writeFileSync("image.jpg", buffer);
  return "image.jpg";
}
