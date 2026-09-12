---

# 🏆 Auto Livedoor Beetle Blog  
藤岡市で暮らす空冷ビートルの整備・トラブル・旅の記録を、  
**GitHub Actions＋OpenAI＋Node.js** で毎日自動投稿するシステム。

---

## 🚗 概要  
このリポジトリは、以下の処理を自動で行います：

1. **毎日9時に GitHub Actions が起動**  
2. **OpenAI が日替わりのブログ記事（多言語）を生成**  
3. **藤岡市＋周辺地域（高崎市・前橋市・神流町・上野村）を自動で織り込む**  
4. **post.yml を生成（構造化データ）**  
5. **steemit-to-livedoor.js が Livedoor Blog に投稿**  
6. **日本語・英語・スペイン語・韓国語の4言語記事を自動レンダリング**

藤岡市の道路環境（山道・農道・市街地・冬の冷え込み）と、  
周辺地域の走行体験を毎日ランダム生成するため、  
**人間が書いたような自然な旧車ブログが自動で更新されます。**

---

## 📅 自動投稿の仕組み  
GitHub Actions のスケジュール機能を使用。

```yaml
on:
  schedule:
    - cron: "0 9 * * *"   # 毎日9時に投稿
  workflow_dispatch:
```

---

## 🧠 AI生成（generate-post.js）  
OpenAI API を使い、以下を毎日ランダム生成：

- 日替わりタイトル（藤岡市＋周辺地域）  
- 日替わり体験談  
- 日替わり整備ポイント  
- 日替わり道路環境  
- 多言語本文（JA/EN/ES/KO）  
- 画像（Unsplashランダム）  

生成された内容は **post.yml** に保存され、  
steemit-to-livedoor.js が HTML に変換して投稿します。

---

## 🗂 ファイル構成

```
.
├── generate-post.js        # AIで記事を生成（多言語・日替わり）
├── steemit-to-livedoor.js  # Livedoor投稿処理（HTML生成）
├── post.yml                # AI生成された記事データ
├── .github/workflows/post.yml  # 自動投稿ワークフロー
└── README.md               # このファイル
```

---

## 🔧 必要な環境変数（GitHub Secrets）

| Key | 内容 |
|-----|------|
| `OPENAI_API_KEY` | OpenAI APIキー |
| `LD_USER` | Livedoor Blog ログインID |
| `LD_PASSWORD` | Livedoor Blog パスワード |

---

## 🚀 GitHub Actions（自動投稿ワークフロー）

```yaml
name: Auto Livedoor Beetle Blog

on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch:

jobs:
  post:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: npm install node-fetch js-yaml openai

      - name: Generate post.yml (OpenAI)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node generate-post.js

      - name: Post to Livedoor
        env:
          LD_USER: ${{ secrets.LD_USER }}
          LD_PASSWORD: ${{ secrets.LD_PASSWORD }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node steemit-to-livedoor.js
```

---

## 🌏 多言語対応（JA/EN/ES/KO）  
AIが生成する post.yml は以下の構造：

```yaml
title_ja: "藤岡市から神流町へ抜ける山道で空冷ビートルが見せた本当の走り"
title_en: "How the Beetle performed on the mountain road from Fujioka to Kanna"
title_es: "El rendimiento del Escarabajo en la ruta montañosa de Fujioka a Kanna"
title_ko: "후지오카에서 칸나로 이어지는 산길에서 비틀이 보여준 진짜 주행력"

body_ja: [...]
body_en: [...]
body_es: [...]
body_ko: [...]
```

steemit-to-livedoor.js がこれを HTML に変換し、  
Livedoor Blog に多言語記事として投稿します。

---

## 🏔 藤岡市＋周辺地域SEO  
記事には毎日ランダムで以下の地域が登場：

- 藤岡市  
- 高崎市  
- 前橋市  
- 神流町  
- 上野村  

これにより、  
**群馬県ローカルSEO（旧車・整備・旅）で非常に強いブログ**になります。

---

## 📸 画像生成  
Unsplash のランダム画像を使用：

```
https://source.unsplash.com/featured/?volkswagen,beetle
```

毎日違う画像が自動で選ばれます。

---

## 👤 著者  
**かずひろ（群馬県藤岡市）**  
空冷ビートルと暮らす旧車ブロガー。  
整備・トラブル・旅の記録を毎日自動投稿しています。

---
