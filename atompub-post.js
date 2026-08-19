async function generateImage(prompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const img = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    format: "jpeg"   // ← livedoor対応のJPEG形式で生成
  });

  const base64 = img.data[0].b64_json;
  const buffer = Buffer.from(base64, "base64");

  fs.writeFileSync("image.jpg", buffer);
  return "image.jpg";
}
