# CLAUDE.md - Beer Bot Migration Guide

## プロジェクト概要

「Beerな気分？」- LINE Messaging API を使ったビール推薦ボット。
ユーザーの気分に応じて適切なビールと商品URLを推薦する。

## 現在の構成（AWS Lambda）

```
LINE → API Gateway → Lambda → Express（@line/bot-sdk）
```

- **Webhook URL**: https://ov579kl0jb.execute-api.ap-northeast-1.amazonaws.com/webhook
- **リージョン**: ap-northeast-1（東京）
- **デプロイ方法**: AWS SAM (`template.yaml`)
- **チャネルID**: 2008645552
- **プロバイダー**: シーテラス湘南

## 移行先の構成（Cloudflare Workers）

```
LINE → Cloudflare Workers → Hono（fetch直叩き）
```

## 移行プラン

### Step 1: プロジェクト作成
- `npm create hono@latest beer-bot-cf` でHono + Cloudflare Workersテンプレート生成

### Step 2: コード移行（メインの作業）

3つのレイヤーを移行する：

#### 2-1. ルーティング層（Express → Hono）
- `app.post('/webhook', ...)` → Honoの `app.post('/webhook', ...)` に書き換え
- ほぼ1対1で置き換わる

#### 2-2. LINE連携層（@line/bot-sdk → fetch直叩き）★一番重い
- **署名検証**: @line/bot-sdk の検証 → Web Crypto API (`crypto.subtle.importKey` + `HMAC-SHA256`)
- **メッセージ送信**: SDK → `fetch('https://api.line.me/v2/bot/message/reply', ...)` で直接叩く
- **理由**: @line/bot-sdk はNode.jsの`http`モジュールに依存しており、Cloudflare Workersでは動かない

#### 2-3. ビジネスロジック層（ほぼそのまま流用）
- `src/handlers/messageHandler.ts` → メッセージ処理ロジック
- `src/services/beerService.ts` → ビール推薦ロジック
- `src/data/beers.json` → ビールデータ（そのままコピー）

### Step 3: 環境変数の設定
```bash
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET
```

### Step 4: デプロイ＆Webhook URL差し替え
```bash
npx wrangler deploy
```
- 発行された `https://beer-bot-cf.xxxxx.workers.dev/webhook` を LINE Developers コンソールに設定

### Step 5: 動作確認
- LINEで話しかけて、今と同じ動きをするか確認

## 既存プロジェクト構成

```
beer-bot-worker/
├── src/
│   ├── index.ts              # Express サーバー（ローカル開発用）
│   ├── lambda/
│   │   ├── handler.ts        # Lambda ハンドラ（staging用）
│   │   └── lineSignature.ts  # LINE署名検証ユーティリティ
│   ├── handlers/
│   │   └── messageHandler.ts # メッセージ処理ロジック
│   └── services/
│       └── beerService.ts    # ビール推薦ロジック
├── src/data/
│   └── beers.json            # ビールデータ
├── template.yaml             # AWS SAM テンプレート
├── wrangler.toml             # ← 既にある！Cloudflare Workers設定
└── package.json
```

## 技術的な注意点

- **@line/bot-sdk は使わない**: Workers非対応。fetch直叩きで代替
- **Hono を使う**: Cloudflare Workers ネイティブ対応のフレームワーク
- **署名検証は Web Crypto API**: `crypto.subtle` を使って HMAC-SHA256 で検証
- **beers.json はそのまま流用可能**
- **ロールバック**: Webhook URLをAWS側に戻せば即座に元通り

## LINE Messaging API 仕様メモ

- Webhook: POST リクエストでイベントが飛んでくる
- 署名検証: `x-line-signature` ヘッダーを HMAC-SHA256 (Channel Secret) で検証
- Reply API: `POST https://api.line.me/v2/bot/message/reply`
  - Header: `Authorization: Bearer {CHANNEL_ACCESS_TOKEN}`
  - Body: `{ replyToken, messages: [{ type: 'text', text: '...' }] }`

## AWS側のクリーンアップ（移行完了後）

移行完了後、AWSコンソールにログインして以下を削除：
- SAMスタック（CloudFormation経由で一括削除可能）
- サーバーレスなので放置しても課金はほぼゼロだが、いずれ削除推奨