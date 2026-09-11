function buildHtmlMulti(post) {
  let html = "";

  // meta などは省略（あなたの最新版をそのまま使ってOK）

  html += `<h1 class="article-title">${post.title_ja}</h1>`;

  html += `
    <div class="lead">
      <p>群馬県藤岡市で空冷ビートルと暮らす私が、実体験をもとに整備・トラブル・旅の記録をまとめています。</p>
    </div>
  `;

  html += `
    <div class="article-image">
      <img src="${post.image.url}"
           alt="${post.image.alt_ja} / ${post.image.alt_en} / ${post.image.alt_es} / ${post.image.alt_ko}"
           loading="lazy">
    </div>
  `;

  // ===============================
  // 日本語本文（安全処理）
  // ===============================
  html += `<h2>🇯🇵 日本語（メイン記事）</h2>`;

  for (const sec of post.body_ja) {
    const s = safeSection(sec);

    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  // ===============================
  // 内部リンク（安全処理）
  // ===============================
  const related = safeSection(post.body_ja[6]).content;

  html += `
    <section class="related-links">
      <h2>🔗 関連記事（藤岡市の実体験）</h2>
      <ul>
        ${related
          .split(",")
          .map(item => `<li>${item.trim()}</li>`)
          .join("")}
      </ul>
    </section>
  `;

  // ===============================
  // 多言語本文（安全処理）
  // ===============================
  html += `<h2>🇺🇸 English</h2>`;
  for (const sec of post.body_en) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  html += `<h2>🇪🇸 Español</h2>`;
  for (const sec of post.body_es) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  html += `<h2>🇰🇷 한국어</h2>`;
  for (const sec of post.body_ko) {
    const s = safeSection(sec);
    html += `
      <section class="article-section">
        <h3>${s.title}</h3>
        <p>${s.content.replace(/\n/g, "<br>")}</p>
      </section>
    `;
  }

  return html;
}
