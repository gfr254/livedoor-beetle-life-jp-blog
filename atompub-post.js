async function uploadImage(imagePath, username, password) {
  const endpoint = "https://livedoor.blogcms.jp/atompub/beetle_life_jp_blog/resource";
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

  // ★★★ ここで XML を全部ログ出力する ★★★
  console.log("=== Livedoor Image Upload XML ===");
  console.log(xml);
  console.log("=================================");

  // 公開URL（ブログで表示されるURL）
  const publicUrlMatch = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
  if (publicUrlMatch) return publicUrlMatch[1];

  // fallback（edit-media）
  const editUrlMatch = xml.match(/<link[^>]*rel="edit-media"[^>]*href="([^"]+)"/);
  if (editUrlMatch) return editUrlMatch[1];

  // fallback（内部URL）
  const internalUrlMatch = xml.match(/<content[^>]*>(.*?)<\/content>/);
  return internalUrlMatch ? internalUrlMatch[1] : null;
}
