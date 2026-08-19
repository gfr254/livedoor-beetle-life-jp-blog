async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    format: "jpeg"   // livedoor対応
  });

  // 最新仕様：jpeg形式は base64 で返る
  const base64 = img.data[0].b64_json;

  if (!base64) {
    throw new Error("OpenAI が base64 JPEG を返しませんでした");
  }

  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync("image.jpg", buffer);

  return "image.jpg";
}
