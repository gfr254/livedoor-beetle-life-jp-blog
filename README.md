# livedoor-beetle-life-jp-blog  
空冷ビートルの生活・整備・旅をテーマにした **livedoorブログ自動投稿システム**です。  
GitHub Actions と OpenAI を使い、毎朝自動で記事を生成・投稿します。

---

## 🚗 概要  
このリポジトリは、以下の処理を自動で行います：

1. **AIが記事を生成（generate.js）**  
2. **SEO構造に沿った JSON を作成（template.json）**  
3. **livedoorブログへ AtomPub API で投稿（atompub-post.js）**  
4. **GitHub Actions が毎朝7時に自動投稿（post.yml）**

空冷ビートルをまだ所有していないため、画像は AI生成のプレースホルダーを使用しています。  
後から実写に差し替えることができます。

---

## 📦 フォルダ構成

