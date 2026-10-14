import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateArticle, makeUniqueTitle, parseLivedoorArticles } from "../livedoor-dedupe.js";

const feed = "<?xml version=\"1.0\"?><feed xmlns:blogcms=\"http://blogcms.jp/-/spec/atompub/1.0/\"><entry><title>空冷VWのエンジンルーム</title><blogcms:source><blogcms:body><![CDATA[<h3>点検</h3><p>定期的な点検で空冷ビートルの調子を保ちます。フィルター、配線、ホースの状態を確認し、必要な整備を行うことが大切です。長く安全に乗るための基本を紹介します。</p>]]></blogcms:body></blogcms:source></entry></feed>";

test("parses Atom title and Livedoor body", () => {
  const articles = parseLivedoorArticles(feed);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "空冷VWのエンジンルーム");
  assert.match(articles[0].body, /定期的な点検/);
});

test("blocks normalized title duplicates", () => {
  const articles = parseLivedoorArticles(feed);
  const duplicate = findDuplicateArticle(articles, { title: "空冷ＶＷのエンジンルーム", body: "別内容" });
  assert.equal(duplicate.reason, "duplicate_title");
});

test("blocks identical body text despite formatting and image differences", () => {
  const articles = parseLivedoorArticles(feed);
  const body = "<img src='different.jpg'><h3>点検</h3><p>定期的な点検で空冷ビートルの調子を保ちます。フィルター、配線、ホースの状態を確認し、必要な整備を行うことが大切です。長く安全に乗るための基本を紹介します。</p>";
  const duplicate = findDuplicateArticle(articles, { title: "別の題名", body });
  assert.equal(duplicate.reason, "duplicate_body");
});

test("allows a genuinely different article", () => {
  const articles = parseLivedoorArticles(feed);
  assert.equal(findDuplicateArticle(articles, { title: "旅の記録", body: "short" }), null);
});


test("keeps distinct content and generates a unique title when only the title collides", () => {
      const articles = parseLivedoorArticles(feed);
      const candidate = {
        title: "空冷VWのエンジンルーム",
        body: "この記事は既存記事と異なる内容で、別の車両写真から確認できる装備の見どころを紹介します。",
      };
      assert.equal(findDuplicateArticle(articles, candidate).reason, "duplicate_title");
      assert.equal(makeUniqueTitle(articles, candidate.title), "空冷VWのエンジンルーム（新しい記事）");
    });

    test("increments the title suffix when the first unique title is already used", () => {
      const articles = [
        ...parseLivedoorArticles(feed),
        { title: "空冷VWのエンジンルーム（新しい記事）", body: "別の記事本文です" },
      ];
      assert.equal(makeUniqueTitle(articles, "空冷VWのエンジンルーム"), "空冷VWのエンジンルーム（新しい記事 2）");
    });

    test("identical content is treated as duplicate even when its title also matches", () => {
      const article = parseLivedoorArticles(feed)[0];
      assert.equal(findDuplicateArticle([article], article).reason, "duplicate_body");
    });
    