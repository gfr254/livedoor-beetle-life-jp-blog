async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    format: "jpeg"   // livedoor対応
  });

  // まず URL を確認（2026年の標準）
  if (img.data[0].url) {
    const res = await fetch(img.data[0].url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("image.jpg", buffer);
    return "image.jpg";
  }

  // URLが無い場合は base64 を使う（旧仕様）
  if (img.data[0].b64_json) {
    const buffer = Buffer.from(img.data[0].b64_json, "base64");
    fs.writeFileSync("image.jpg", buffer);
    return "image.jpg";
  }

  throw new Error("OpenAI が画像データを返しませんでした");
}
