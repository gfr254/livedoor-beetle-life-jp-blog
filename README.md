# livedoor-beetle-life-jp-blog  
空冷ビートルの生活・整備・旅をテーマにした **livedoorブログ自動投稿システム**です。  
OpenAI と GitHub Actions を使い、毎日自動で記事を生成し、  
images フォルダの画像を 1 枚ランダム選出して livedoor に投稿します。

---

## 🚗 概要

このリポジトリは以下の処理を自動で行います：

1. **OpenAI が記事を自動生成（generate-post.js）**  
2. **post.yml に記事データを書き出し**  
3. **images フォルダから画像を 1 枚ランダム選出**  
4. **livedoor AtomPub API に画像アップロード**  
5. **記事本文＋画像を livedoor に投稿（steemit-to-livedoor.js）**  
6. **GitHub Actions が毎日指定時刻に自動投稿（.github/workflows/post.yml）**

---

## 📦 フォルダ構成

