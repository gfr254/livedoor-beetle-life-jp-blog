import fs from 'fs';

const BLOG_ID = 'beetle-life-jp-blog';
const API_URL = 'https://livedoor.blogcms.jp/atompub/' + BLOG_ID + '/article';

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(post) {
  let html = '';
  for (const sec of post.body_ja) {
    html += '<h3>' + escapeHtml(sec.section_title) + '</h3>';
    html += '<p>' + escapeHtml(sec.content).replace(/\n/g, '<br>') + '</p>';
  }
  if (post.tags?.length) {
    html += '<h3>Tags</h3><ul>';
    for (const tag of post.tags) html += '<li>#' + escapeHtml(tag) + '</li>';
    html += '</ul>';
  }
  return html;
}

function buildEntry(post) {
  const html = buildHtml(post).replace(/\]\]>/g, ']]]]><![CDATA[>');
  const category = post.category_name
    ? '\n  <category term="' + escapeXml(post.category_name) + '" />'
    : '';

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<entry xmlns="http://www.w3.org/2005/Atom">\n' +
    '  <title>' + escapeXml(post.title_ja) + '</title>\n' +
    '  <content type="html"><![CDATA[' + html + ']]></content>' +
    category + '\n</entry>';
}

function extractArticleUrl(xml) {
  const match = xml.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i) ||
    xml.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/i);
  return match?.[1];
}

async function main() {
  const raw = fs.readFileSync('post.yml', 'utf8');
  const post = JSON.parse(raw);
  const user = process.env.LD_USER;
  const apiKey = process.env.LD_API_KEY || process.env.LD_PASSWORD;

  if (!user || !apiKey) {
    throw new Error('LD_USER と AtomPub用パスワード（LD_API_KEY または LD_PASSWORD）をGitHub Secretsに設定してください');
  }
  if (!post.title_ja || !Array.isArray(post.body_ja)) {
    throw new Error('post.yml の記事データが不正です');
  }

  const auth = Buffer.from(user + ':' + apiKey).toString('base64');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + auth,
      'Content-Type': 'application/atom+xml;type=entry; charset=utf-8',
      Accept: 'application/atom+xml'
    },
    body: buildEntry(post)
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error('livedoor AtomPub投稿失敗 (HTTP ' + response.status + '): ' + responseText.slice(0, 1000));
  }

  const articleUrl = extractArticleUrl(responseText);
  console.log('✅ livedoorへの投稿に成功しました');
  if (articleUrl) console.log('投稿URL:', articleUrl);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});