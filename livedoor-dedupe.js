function decodeXmlText(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

export function normalizeTitle(value) {
  return decodeXmlText(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja");
}

export function normalizeBody(value) {
  return decodeXmlText(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ").trim().normalize("NFKC").toLocaleLowerCase("ja");
}

export function parseLivedoorArticles(feedXml) {
  return [...String(feedXml ?? "").matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)]
    .map(([, entry]) => {
      const title = entry.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "";
      const body = entry.match(/<blogcms:body\b[^>]*>([\s\S]*?)<\/blogcms:body\s*>/i)?.[1]
        ?? entry.match(/<content\b[^>]*>([\s\S]*?)<\/content\s*>/i)?.[1]
        ?? "";
      return { title: decodeXmlText(title), body: decodeXmlText(body) };
    })
    .filter((article) => article.title || article.body);
}

export function findDuplicateArticle(existingArticles, candidate) {
  const candidateTitle = normalizeTitle(candidate.title);
  if (!candidateTitle) throw new Error("Candidate article title is required");
  const titleMatch = existingArticles.find((article) => normalizeTitle(article.title) === candidateTitle);
  if (titleMatch) return { reason: "duplicate_title", title: titleMatch.title };
  const candidateBody = normalizeBody(candidate.body);
  if (candidateBody.length < 100) return null;
  const bodyMatch = existingArticles.find((article) => {
    const body = normalizeBody(article.body);
    return body.length >= 100 && body === candidateBody;
  });
  return bodyMatch ? { reason: "duplicate_body", title: bodyMatch.title } : null;
}
