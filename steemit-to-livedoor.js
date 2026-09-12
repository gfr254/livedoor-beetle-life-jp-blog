import fs from 'fs';
import crypto from 'crypto';

const DEFAULT_BLOG_ID = 'beetle-life-jp-blog';

function blogApiUrl(blogId) {
  return 'https://livedoor.blogcms.jp/atom/blog/' + encodeURIComponent(blogId) + '/article';
}

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

function createWsseHeader(username, apiKey) {
  const created = new Date().toISOString();
  const nonce = crypto.randomBytes(16);
  const digest = crypto.createHash('sha1')
    .update(Buffer.concat([nonce, Buffer.from(created, 'utf8'), Buffer.from(apiKey, 'utf8')]))
    .digest('base64');

  return 'UsernameToken Username="' + username +
    '", PasswordDigest="' + digest +
    '", Nonce="' + nonce.toString('base64') +
    '", Created="' + created + '"';
}

function buildEntry(post, username, blogId) {
  const now = new Date().toISOString();
  const html = buildHtml(post).replace(/\]\]>/g, ']]]]><![CDATA[>');
  const category = post.category_name
    ? '\n  <category scheme="http://livedoor.blogcms.jp/blog/' + encodeURIComponent(blogId) + '/category" term="' + escapeXml(post.category_name) + '" />'
    : '';

  return '<entry xmlns="http://www.w3.org/2005/Atom" ' +
    'xmlns:app="http://www.w3.org/2007/app" ' +
    'xmlns:blogcms="http://blogcms.jp/-/spec/atompub/1.0/">\n' +
    '  <title>' + escapeXml(post.title_ja) + '</title>\n' +
    '  <updated>' + now + '</updated>\n' +
    '  <published>' + now + '</published>\n' +
    '  <author><name>' + escapeXml(username) + '</name></author>' +
    category + '\n' +
    '  <blogcms:source><blogcms:body><![CDATA[' + html + ']]></blogcms:body></blogcms:source>\n' +
    '  <app:control><app:draft>no</app:draft></app:control>\n' +
    '</entry>';
}

function extractArticleUrl(xml) {
  const match = xml.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i) ||
    xml.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/i);
  return match?.[1];
}

async function main() {
  const post = JSON.parse(fs.readFileSync('post.yml', 'utf8'));
  const user = process.env.LD_USER;
  const apiKey = process.env.LD_API_KEY || process.env.LD_PASSWORD;

  if (!user || !apiKey) {
    throw new Error('LD_USER と AtomPub用パスワード（LD_API_KEY または LD_PASSWORD）をGitHub Secretsに設定してください');
  }
  if (!post.title_ja || !Array.isArray(post.body_ja)) {
    throw new Error('post.yml の記事データが不正です');
  }

  const authHeaders = () => ({
    Authorization: 'WSSE profile="UsernameToken"',
    'X-WSSE': createWsseHeader(user, apiKey),
    Accept: 'application/atom+xml'
  });
  const candidates = [...new Set([process.env.LD_BLOG_ID, DEFAULT_BLOG_ID, user].filter(Boolean))];
  let blogId;
  let apiUrl;

  for (const candidate of candidates) {
    const probe = await fetch(blogApiUrl(candidate), { method: 'GET', headers: authHeaders() });
    const probeText = await probe.text();
    if (probe.status === 401) {
      throw new Error('livedoor API認証に失敗しました。LD_USERとAtomPub用パスワードを確認してください');
    }
    if ([200, 204, 405].includes(probe.status)) {
      blogId = candidate;
      apiUrl = blogApiUrl(candidate);
      console.log('使用するlivedoorブログID:', candidate);
      break;
    }
    if (probe.status !== 404) {
      throw new Error('livedoorブログID確認失敗 (HTTP ' + probe.status + '): ' + probeText.slice(0, 500));
    }
  }

  if (!apiUrl) {
    throw new Error('livedoor APIでブログを見つけられませんでした。LD_BLOG_IDに管理画面のブログIDを設定してください');
  }
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: 'WSSE profile="UsernameToken"',
      'X-WSSE': createWsseHeader(user, apiKey),
      'Content-Type': 'application/atom+xml;type=entry; charset=utf-8',
      Accept: 'application/atom+xml'
    },
    body: buildEntry(post, user, blogId)
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