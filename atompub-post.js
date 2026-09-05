import fs from "fs";
import axios from "axios";

const LIVEDOOR_ID = process.env.LIVEDOOR_ID;
const API_KEY = process.env.LIVEDOOR_API_KEY;

const article = JSON.parse(fs.readFileSync("post.json", "utf8"));

function buildBody(bodySections) {
  return bodySections
    .map(sec => `<h2>${sec.section_title}</h2>\n<p>${sec.content}</p>`)
    .join("\n\n");
}

async function postArticle() {
  const xml = `
<entry xmlns="http://www.w3.org/2005/Atom">
  <title>${article.title}</title>
  <content type="html">
    <![CDATA[
      ${buildBody(article.body)}
    ]]>
  </content>
  <category term="${article.category}" />
</entry>
`;

  const url = `https://livedoor.blogcms.jp/atom/${LIVEDOOR_ID}/article`;

  const res = await axios.post(url, xml, {
    headers: {
      "Content-Type": "application/atom+xml",
      "X-WSSE": API_KEY
    }
  });

  console.log("Posted:", res.status);
}

postArticle();
