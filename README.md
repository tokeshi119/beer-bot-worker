# LINE Beer Bot

LINE Messaging API を使用したビール推薦 Bot です。ユーザーの気分に応じて、適切なビールと商品 URL を推薦します。

## 機能

- ユーザーの気分（「リラックスしたい」「疲れた」「スッキリしたい」など）に応じたビール推薦
- ビールの名前、説明、商品 URL を提供

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成し、LINE Messaging API の認証情報を設定してください。

```bash
cp .env.example .env
```

`.env`ファイルに以下の情報を設定します：

- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Developers Console で取得した Channel Access Token
- `LINE_CHANNEL_SECRET`: LINE Developers Console で取得した Channel Secret
- `PORT`: サーバーのポート番号（オプション、デフォルト: 3000）

### 3. LINE Developers Console での設定

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. プロバイダーを作成（初回のみ）
3. チャネルを作成し、Messaging API を有効化
4. Channel Access Token と Channel Secret を取得
5. Webhook URL を設定（例: `https://your-domain.com/webhook`）
6. Webhook の利用を有効化

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

サーバーは`http://localhost:3000`で起動します。

### ビルド

```bash
npm run build
```

### 本番環境での起動

```bash
npm start
```

## 使用方法

1. LINE アプリで Bot を友だち追加
2. Bot にメッセージを送信（例: 「こんにちは」）
3. Bot が「今の気分は？」と質問
4. 気分を送信（例: 「リラックスしたい」「疲れた」「スッキリしたい」）
5. Bot がおすすめのビールを返信

## プロジェクト構成

```
beer-bot-worker/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts              # メインサーバー
    ├── handlers/
    │   └── messageHandler.ts # メッセージ処理ロジック
    ├── services/
    │   └── beerService.ts    # ビール推薦ロジック
    └── data/
        └── beers.json        # ビールデータ
```

## ビールデータの編集

`src/data/beers.json`を編集することで、推薦するビールを追加・変更できます。

## デプロイ

### Cloudflare Workers へのデプロイ

**注意**: 現在の実装は Express サーバーです。Cloudflare Workers で直接動作させるには、`@cloudflare/workers-express`などのアダプターが必要です。

通常の Node.js サーバーとしてデプロイする場合は、以下のプラットフォームを推奨します：

- Railway
- Render
- Heroku

Cloudflare Workers で動作させる場合は、Express の代わりに Hono などのフレームワークを使用することを検討してください。

### その他のプラットフォーム

Express サーバーとして動作するため、以下のようなプラットフォームにデプロイ可能です：

- Heroku
- Railway
- Render
- Vercel（Serverless Functions）
- AWS Lambda（Serverless Express）

## ライセンス

MIT
