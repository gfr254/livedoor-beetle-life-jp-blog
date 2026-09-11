# livedoor-beetle-life-jp-blog  
空冷ビートルの生活・整備・旅をテーマにした **livedoorブログ自動投稿システム**です。  
OpenAI と GitHub Actions を使い、毎日自動で記事を生成し、  
画像なしで livedoor に投稿します。

---

## 🚗 概要

このリポジトリは以下の処理を自動で行います：

1. **OpenAI が記事を自動生成（generate-post.js）**  
2. **post.yml に記事データを書き出し**  
3. **画像なしで livedoor に記事投稿（steemit-to-livedoor.js）**  
4. **GitHub Actions が毎日指定時刻に自動投稿（.github/workflows/post.yml）**

画像アップロード処理は完全に削除しており、  
livedoor API の画像エラーが発生しない安定構成です。

---

## 📦 フォルダ構成

