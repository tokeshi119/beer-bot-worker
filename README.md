# LINE Beer Bot

LINE Messaging API を使用したビール推薦 Bot です。ユーザーの気分に応じて、適切なビールと商品 URL を推薦します。

📖 **詳細な仕様書**: [外部仕様書](./docs/external-specification.md) を参照してください。

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
4. **Channel Access Token を発行**
   - Messaging API 設定ページで「チャネルアクセストークン」セクションを探す
   - 「発行」または「再発行」ボタンをクリック
   - 表示されたトークンをコピー（**重要**: これは `Channel ID` とは別物です）
5. **Channel Secret を確認**
   - 同じページの「Channel secret」をコピー
6. Webhook URL を設定（開発時は ngrok を使用、本番環境では実際のドメイン）
7. Webhook の利用を有効化

**注意**:

- `Channel ID` と `Channel Access Token` は**別物**です
- `Channel Access Token` は長い文字列（通常 100 文字以上）です
- `Channel ID` は短い数字（例: `2008645552`）です

## 開発

### ngrok を使用したローカル開発

ローカル環境で開発する場合、LINE Platform から Webhook を受信するために ngrok を使用してローカルサーバーを公開する必要があります。

#### ngrok のインストール

**macOS (Homebrew):**

```bash
brew install ngrok/ngrok/ngrok
```

**その他のプラットフォーム:**
[ngrok 公式サイト](https://ngrok.com/download)からダウンロードしてインストールしてください。

#### ngrok のセットアップ

1. [ngrok 公式サイト](https://ngrok.com/)でアカウントを作成（無料プランで利用可能）
2. 認証トークンを取得（ダッシュボードから）
3. 認証トークンを設定：

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### 開発時の起動手順

1. **ターミナル 1: 開発サーバーを起動**

```bash
npm run dev
```

サーバーは`http://localhost:3000`で起動します。

2. **ターミナル 2: ngrok を起動**

```bash
ngrok http 3000
```

ngrok が起動すると、以下のような出力が表示されます：

```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
```

3. **LINE Developers Console で Webhook URL を設定**

ngrok が表示した HTTPS URL を使用して、LINE Developers Console で Webhook URL を設定します：

- Webhook URL: `https://xxxx-xxxx-xxxx.ngrok-free.app/webhook`
- Webhook の利用を有効化

**注意**: ngrok の無料プランでは、セッションごとに異なる URL が生成されます。開発を再開するたびに、新しい URL を LINE Developers Console で更新する必要があります。

#### ngrok の便利な機能

- **Web UI**: `http://localhost:4040` にアクセスすると、ngrok の Web インターフェースが表示され、リクエスト/レスポンスを確認できます
- **リクエストのリプレイ**: Web UI から過去のリクエストを再送信できます

### 開発サーバーの起動

開発サーバーを起動する前に、上記の「ngrok を使用したローカル開発」セクションを参照してください。

```bash
npm run dev
```

サーバーは`http://localhost:3000`で起動します。ngrok と併用する場合は、別のターミナルで `npm run ngrok` または `ngrok http 3000` を実行してください。

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
├── docs/
│   └── external-specification.md  # 外部仕様書
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
