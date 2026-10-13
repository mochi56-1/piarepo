# ぴあれぽ

やわらかな色合いのジャーナリング共有アプリのフロントエンド。

## 開発

Node.js 24 / npm 11 で検証。

```sh
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

`npm run build` で本番ビルド。

投稿、気分、いいね、コメントはブラウザの localStorage に保存。友だちのフィードはサンプルデータです。アカウント認証や利用者間の共有にはバックエンドの追加が必要です。

サンプル画像: Cruip Open React Template（人物）、Bedimcode Responsive Coffee Website（コーヒー）、ianare/exif-samples（街並み）。ノートのイラストは本アプリ用に作成。
