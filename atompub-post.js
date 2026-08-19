async function uploadImage(imagePath, username, password) {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/image";
  const imageData = fs.readFileSync(imagePath);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
    },
    body: imageData
  });

  const xml = await res.text();

  console.log("=== Livedoor Image Upload XML ===");
  console.log(xml);
  console.log("=================================");

  // 公開URL（ブログで表示されるURL）
  const alt = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
  if (alt) return alt[1];

  const edit = xml.match(/<link[^>]*rel="edit-media"[^>]*href="([^"]+)"/);
  if (edit) return edit[1];

  const internal = xml.match(/<content[^>]*>(.*?)<\/content>/);
  if (internal) return internal[1];

  return null;
}
