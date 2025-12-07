# LINE Beer Bot 外部仕様書

**バージョン**: 1.0.0  
**最終更新日**: 2025-12-07  
**プロジェクト名**: beer-bot-worker

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [機能仕様](#機能仕様)
4. [API 仕様](#api仕様)
5. [データ構造](#データ構造)
6. [エラーハンドリング](#エラーハンドリング)
7. [セキュリティ](#セキュリティ)
8. [環境変数](#環境変数)
9. [デプロイメント](#デプロイメント)

---

## プロジェクト概要

### 目的

LINE Messaging API を使用したビール推薦 Bot です。ユーザーの気分に応じて、適切なビールと商品 URL を推薦します。

### 主な機能

- ユーザーの気分（「リラックスしたい」「疲れた」「スッキリしたい」など）に応じたビール推薦
- ビールの名前、説明、商品 URL を提供
- LINE Messaging API との Webhook 連携

### 技術スタック

- **ランタイム**: Node.js
- **言語**: TypeScript
- **フレームワーク**: Express.js
- **SDK**: @line/bot-sdk (v9.3.0)
- **パッケージマネージャー**: npm

---

## システムアーキテクチャ

### 全体構成

```
┌─────────────┐
│ LINE Platform│
└──────┬──────┘
       │ Webhook (HTTPS)
       │
┌──────▼──────────────────┐
│  Express Server         │
│  (beer-bot-worker)      │
│                         │
│  ┌──────────────────┐   │
│  │  Webhook Handler │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼──────────┐   │
│  │ MessageHandler    │   │
│  └────────┬──────────┘   │
│           │               │
│  ┌────────▼──────────┐   │
│  │ BeerService        │   │
│  └────────┬──────────┘   │
│           │               │
│  ┌────────▼──────────┐   │
│  │ beers.json         │   │
│  └───────────────────┘   │
└───────────────────────────┘
```

### ディレクトリ構造

```
beer-bot-worker/
├── src/
│   ├── index.ts              # メインサーバー（Express設定、ルーティング）
│   ├── handlers/
│   │   └── messageHandler.ts # メッセージ処理ロジック
│   ├── services/
│   │   └── beerService.ts    # ビール推薦ロジック
│   └── data/
│       └── beers.json        # ビールデータ（気分別キーワード・ビール情報）
├── docs/
│   └── external-specification.md  # 本ドキュメント
├── dist/                     # ビルド出力
├── .env                      # 環境変数（gitignore）
├── .env.example             # 環境変数テンプレート
├── package.json
├── tsconfig.json
└── README.md
```

---

## 機能仕様

### 1. メッセージ受信と処理フロー

#### 1.1 基本的なフロー

1. LINE Platform から Webhook イベントを受信
2. 署名検証（LINE SDK ミドルウェア）
3. イベントタイプの判定
4. テキストメッセージの場合のみ処理
5. メッセージ内容から気分を判定
6. 適切なビールを推薦
7. LINE Platform に返信を送信

#### 1.2 メッセージ処理ロジック

| 入力メッセージ                                | 処理内容                   | 出力メッセージ             |
| --------------------------------------------- | -------------------------- | -------------------------- |
| 空文字列、挨拶（「こんにちは」「hello」など） | 初期メッセージを返信       | 「今の気分は？」+ 例示     |
| 気分キーワードを含む                          | 気分を判定し、ビールを推薦 | ビール名、説明、URL        |
| 気分が判定できない                            | エラーメッセージを返信     | 気分の例示を促すメッセージ |

### 2. 気分判定機能

#### 2.1 対応気分

| 気分キー  | キーワード例                                 | 説明                 |
| --------- | -------------------------------------------- | -------------------- |
| `relax`   | リラックス、ゆっくり、のんびり、落ち着きたい | リラックスしたい気分 |
| `tired`   | 疲れた、疲労、つかれた、だるい               | 疲労回復を求めている |
| `refresh` | スッキリ、さっぱり、爽快、リフレッシュ       | スッキリしたい気分   |

#### 2.2 判定アルゴリズム

1. メッセージを小文字に変換・トリム
2. 各気分カテゴリのキーワードリストと照合
3. 最初にマッチした気分を返す
4. マッチしない場合は `null` を返す

**注意**: 部分一致で判定します（例：「疲れた」→ `tired` にマッチ）

### 3. ビール推薦機能

#### 3.1 推薦ロジック

1. 気分が判定できた場合、該当気分のビールリストからランダムに 1 つ選択
2. ビール情報（名前、説明、URL）をフォーマットして返信

#### 3.2 返信メッセージフォーマット

```
おすすめのビールはこちらです！🍺

【ビール名】
説明文

商品URL:
https://...
```

---

## API 仕様

### エンドポイント一覧

| メソッド | パス       | 説明              | 認証          |
| -------- | ---------- | ----------------- | ------------- |
| POST     | `/webhook` | LINE Webhook 受信 | LINE 署名検証 |
| GET      | `/health`  | ヘルスチェック    | なし          |

### POST /webhook

LINE Platform からの Webhook イベントを受信するエンドポイントです。

#### リクエスト

**Headers:**

```
Content-Type: application/json
X-Line-Signature: <signature>
```

**Body:**

```json
{
  "destination": "U<32文字の16進数>",
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "id": "1234567890",
        "text": "疲れた"
      },
      "timestamp": 1234567890123,
      "source": {
        "type": "user",
        "userId": "U<32文字の16進数>"
      },
      "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA"
    }
  ]
}
```

#### 処理フロー

1. **署名検証**: LINE SDK ミドルウェアが `X-Line-Signature` ヘッダーを検証
2. **イベント処理**: 各イベントを非同期で処理
3. **レスポンス**: 200 OK を返す（LINE Platform への応答）

#### レスポンス

**成功時:**

- **Status Code**: `200 OK`
- **Body**: なし

**エラー時:**

- **Status Code**: `500 Internal Server Error`
- **Body**: `{ "error": "Internal server error" }`

**注意**: エラーが発生しても、LINE Platform には 200 OK を返します（エラーはログに記録）

### GET /health

サーバーの稼働状況を確認するエンドポイントです。

#### リクエスト

```
GET /health
```

#### レスポンス

**成功時:**

- **Status Code**: `200 OK`
- **Body**:

```json
{
  "status": "ok"
}
```

---

## データ構造

### 1. ビールデータ構造 (`beers.json`)

```json
{
  "moods": {
    "relax": {
      "keywords": ["リラックス", "リラックスしたい", "ゆっくり", ...],
      "beers": [
        {
          "name": "ビール名",
          "description": "説明文",
          "url": "https://..."
        }
      ]
    },
    "tired": { ... },
    "refresh": { ... }
  }
}
```

#### フィールド説明

| フィールド                  | 型       | 説明                         |
| --------------------------- | -------- | ---------------------------- |
| `moods`                     | Object   | 気分別のデータ               |
| `moods[<moodKey>].keywords` | string[] | 気分を判定するキーワード配列 |
| `moods[<moodKey>].beers`    | Beer[]   | 該当気分のビールリスト       |
| `beers[].name`              | string   | ビール名                     |
| `beers[].description`       | string   | ビールの説明                 |
| `beers[].url`               | string   | 商品 URL                     |

### 2. TypeScript インターフェース

#### Beer

```typescript
interface Beer {
  name: string;
  description: string;
  url: string;
}
```

#### BeerRecommendation

```typescript
interface BeerRecommendation {
  mood: string; // 'relax' | 'tired' | 'refresh'
  beer: Beer;
}
```

### 3. Webhook イベント構造

LINE Messaging API の標準的な Webhook イベント構造を使用します。

詳細は [LINE Developers ドキュメント](https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects) を参照してください。

---

## エラーハンドリング

### エラー処理の階層

1. **署名検証エラー** (`SignatureValidationFailed`)

   - LINE SDK ミドルウェアが検出
   - 401 Unauthorized を返す

2. **JSON パースエラー** (`JSONParseError`)

   - LINE SDK ミドルウェアが検出
   - 400 Bad Request を返す

3. **LINE API 呼び出しエラー** (`HTTPError`)

   - `MessageHandler.handleEvent()` 内で発生
   - ログに記録、LINE Platform には 200 OK を返す

4. **その他のエラー**
   - エラーハンドラミドルウェアで捕捉
   - 500 Internal Server Error を返す

### エラーログ

すべてのエラーは `console.error()` でログに記録されます。

**ログフォーマット例:**

```
Error handling event: HTTPError: Request failed with status code 401
    at HTTPClient.wrapError (...)
    ...
```

### 起動時エラー

環境変数が設定されていない場合、起動時にエラーメッセージを表示して終了します。

```
❌ エラー: 環境変数が設定されていません
以下の環境変数を設定してください:
  - LINE_CHANNEL_ACCESS_TOKEN

.env ファイルを確認してください。
```

---

## セキュリティ

### 1. Webhook 署名検証

LINE Platform からのリクエストは、`X-Line-Signature` ヘッダーによる署名検証が行われます。

- **検証方法**: HMAC-SHA256
- **検証キー**: `LINE_CHANNEL_SECRET`
- **実装**: LINE SDK ミドルウェアが自動的に検証

### 2. 環境変数

機密情報は環境変数で管理します。

- `.env` ファイルは Git にコミットしない（`.gitignore` に含まれる）
- `.env.example` にテンプレートを提供

### 3. エラーメッセージ

本番環境では、詳細なエラーメッセージをクライアントに返さないようにします。

現在の実装では、エラーハンドラで汎用的なエラーメッセージを返しています。

---

## 環境変数

### 必須環境変数

| 変数名                      | 説明                                                  | 例                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token（長い文字列、100 文字以上） | `2FfxM607fv59zPXsP9p3Slpt3gDHi8VjN/YU/YcoMFsptxoTQN+gYDdkrVvatsVrQuava8h3ewbY2nEnXAi7pVH5nCCFKZYVM7Wpwf6AX2x6bEPI+kxb/Cj+74V28SnOnRzKKj+hBjOddiPDvpsD8wdB04t89/10/w1cDnyilFU=` |
| `LINE_CHANNEL_SECRET`       | LINE Channel Secret（32 文字の 16 進数）              | `c3825f9920a9a02ab17922c8112a7c90`                                                                                                                                             |

### オプション環境変数

| 変数名 | 説明                 | デフォルト値 |
| ------ | -------------------- | ------------ |
| `PORT` | サーバーのポート番号 | `3000`       |

### 環境変数の検証

起動時に以下の検証が行われます：

1. 必須環境変数が設定されているか確認
2. `LINE_CHANNEL_ACCESS_TOKEN` の長さが 50 文字以上か確認（警告のみ）

---

## デプロイメント

### 開発環境

#### 前提条件

- Node.js (推奨: v20 以上)
- npm
- ngrok（ローカル開発用）

#### セットアップ手順

1. **リポジトリのクローン**

```bash
git clone <repository-url>
cd beer-bot-worker
```

2. **依存関係のインストール**

```bash
npm install
```

3. **環境変数の設定**

```bash
cp .env.example .env
# .env ファイルを編集して、LINE認証情報を設定
```

4. **開発サーバーの起動**

```bash
# ターミナル1: 開発サーバー
npm run dev

# ターミナル2: ngrok
npm run ngrok
```

5. **LINE Developers Console で Webhook URL を設定**
   - ngrok が表示した HTTPS URL を使用
   - 例: `https://xxxx-xxxx-xxxx.ngrok-free.app/webhook`

### 本番環境

#### ビルド

```bash
npm run build
```

#### 起動

```bash
npm start
```

#### 推奨プラットフォーム

- Railway
- Render
- Heroku
- Vercel (Serverless Functions)
- AWS Lambda (Serverless Express)

### 環境変数の設定（本番）

本番環境でも、以下の環境変数を設定してください：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `PORT` (オプション)

各プラットフォームの環境変数設定方法は、プラットフォームのドキュメントを参照してください。

---

## 付録

### A. メッセージ例

#### ユーザー入力例

- 「こんにちは」
- 「疲れた」
- 「リラックスしたい」
- 「スッキリしたい」

#### Bot 返信例

**初期メッセージ:**

```
今の気分は？

例：
・リラックスしたい
・疲れた
・スッキリしたい
```

**ビール推薦:**

```
おすすめのビールはこちらです！🍺

【キリン一番搾り】
すっきりとした味わいで、疲れた体をリフレッシュしてくれます。

商品URL:
https://www.kirin.co.jp/products/beer/ichibanshibori/
```

**エラーメッセージ:**

```
すみません、気分がよくわかりませんでした。

以下のような気分を教えてください：
・リラックスしたい
・疲れた
・スッキリしたい
```

### B. トラブルシューティング

#### 401 Unauthorized エラー

- `LINE_CHANNEL_ACCESS_TOKEN` が正しく設定されているか確認
- `Channel ID` と `Channel Access Token` を混同していないか確認
- LINE Developers Console でトークンを再発行

#### Webhook が受信できない

- ngrok が起動しているか確認
- LINE Developers Console の Webhook URL が正しいか確認
- Webhook の利用が有効化されているか確認

#### 環境変数が読み込まれない

- `.env` ファイルがプロジェクトルートにあるか確認
- 環境変数の名前が正しいか確認（大文字小文字を区別）
- サーバーを再起動

---

## 変更履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2025-12-07 | 初版作成 |

---

## 参考資料

- [LINE Developers ドキュメント](https://developers.line.biz/ja/docs/)
- [LINE Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [@line/bot-sdk ドキュメント](https://github.com/line/line-bot-sdk-nodejs)

---

**文書管理**: このドキュメントは `docs/external-specification.md` に保存されています。
