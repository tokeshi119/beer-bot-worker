# AWS Lambda Staging 環境構築ガイド

**最終更新日**: 2025-12-07

このドキュメントでは、LINE Beer Bot を AWS Lambda × API Gateway の staging 環境にデプロイする手順を説明します。

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [セットアップ手順](#セットアップ手順)
4. [デプロイ](#デプロイ)
5. [LINE Developers Console での設定](#line-developers-console-での設定)
6. [動作確認](#動作確認)
7. [トラブルシューティング](#トラブルシューティング)
8. [運用](#運用)

---

## 概要

### staging 環境の特徴

- **固定URL**: ngrok のように URL が変わることはありません
- **24時間起動不要**: リクエスト時のみ実行されるため、コスト効率が良い
- **自動スケール**: トラフィックに応じて自動的にスケールします
- **無料枠**: AWS Lambda の無料枠（月100万リクエスト）でほぼ無料で運用可能

### アーキテクチャ

```
LINE Platform
    ↓ (Webhook)
API Gateway (HTTP API)
    ↓
Lambda Function
    ↓
LINE Messaging API (返信送信)
```

---

## 前提条件

### 必要なツール

1. **AWS CLI** (v2 推奨)
   ```bash
   aws --version
   ```
   - インストール: [AWS CLI 公式サイト](https://aws.amazon.com/cli/)

2. **AWS SAM CLI**
   ```bash
   sam --version
   ```
   - インストール: [AWS SAM CLI 公式サイト](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

3. **Node.js** (v20 以上)
   ```bash
   node --version
   ```

4. **npm**
   ```bash
   npm --version
   ```

### AWS アカウント設定

1. AWS アカウントを作成（まだの場合）
2. AWS CLI の認証情報を設定:
   ```bash
   aws configure
   ```
   - Access Key ID と Secret Access Key を入力
   - デフォルトリージョン: `ap-northeast-1` (東京) を推奨

### LINE Developers Console での準備

- Channel Access Token と Channel Secret を取得済みであること
- `.env` ファイルに設定済みであること

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

TypeScript がコンパイルされ、`dist/` ディレクトリに出力されます。

### 3. SAM ビルド

```bash
npm run sam:build
```

または

```bash
sam build
```

これにより、Lambda 関数用のパッケージが `.aws-sam/` ディレクトリに作成されます。

---

## デプロイ

### 初回デプロイ（ガイド付き）

```bash
npm run sam:deploy
```

または

```bash
sam deploy --guided
```

初回実行時は、以下の質問に答えます:

1. **Stack Name**: `beer-bot-staging` (推奨)
2. **AWS Region**: `ap-northeast-1` (東京) を推奨
3. **Parameter ChannelAccessToken**: LINE Channel Access Token を入力
4. **Parameter ChannelSecret**: LINE Channel Secret を入力
5. **Confirm changes before deploy**: `Y` (推奨)
6. **Allow SAM CLI IAM role creation**: `Y`
7. **Disable rollback**: `N` (エラー時にロールバックを有効化)
8. **Save arguments to configuration file**: `Y` (次回以降のデプロイを簡単に)

### 2回目以降のデプロイ

設定ファイル (`samconfig.toml`) が作成されている場合:

```bash
sam deploy
```

これで、前回の設定をそのまま使用してデプロイされます。

### デプロイ完了後の出力

デプロイが成功すると、以下のような出力が表示されます:

```
Outputs:
  ApiGatewayUrl: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
  WebhookUrl: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/webhook
  HealthCheckUrl: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/health
```

**重要**: `WebhookUrl` をコピーしておいてください。次のステップで使用します。

---

## LINE Developers Console での設定

### Webhook URL の設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーとチャネルを選択
3. 「Messaging API」タブを開く
4. 「Webhook URL」セクションで「編集」をクリック
5. デプロイ時に出力された **WebhookUrl** を入力
   - 例: `https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/webhook`
6. 「保存」をクリック
7. 「Webhook の利用」を「利用する」に設定

### Webhook の検証

「Webhook の検証」ボタンをクリックして、接続が成功することを確認してください。

---

## 動作確認

### 1. ヘルスチェック

```bash
curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/health
```

期待されるレスポンス:

```json
{"status":"ok"}
```

### 2. LINE Bot からのメッセージ送信

1. LINE アプリで Bot を友だち追加
2. Bot にメッセージを送信（例: 「こんにちは」）
3. Bot が返信することを確認

### 3. CloudWatch Logs での確認

1. [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/) にアクセス
2. 「ログ」→「ロググループ」を選択
3. `/aws/lambda/beer-bot-staging-LineBeerBotFunction-xxxxx` を選択
4. ログストリームを確認して、エラーがないか確認

---

## トラブルシューティング

### エラー: Signature validation failed

**原因**: 署名検証が失敗しています。

**確認事項**:
1. `LINE_CHANNEL_SECRET` が正しく設定されているか確認
2. CloudWatch Logs でエラーログを確認
3. API Gateway の設定で、リクエストボディが正しく Lambda に渡されているか確認

**解決方法**:
- 環境変数を再設定して再デプロイ:
  ```bash
  sam deploy --parameter-overrides ChannelSecret=YOUR_CHANNEL_SECRET
  ```

### エラー: 401 Unauthorized

**原因**: Channel Access Token が無効または設定されていません。

**確認事項**:
1. `LINE_CHANNEL_ACCESS_TOKEN` が正しく設定されているか確認
2. LINE Developers Console でトークンを再発行

**解決方法**:
- 環境変数を再設定して再デプロイ:
  ```bash
  sam deploy --parameter-overrides ChannelAccessToken=YOUR_NEW_TOKEN
  ```

### エラー: Lambda function timeout

**原因**: Lambda 関数の実行時間がタイムアウト（デフォルト30秒）を超えています。

**解決方法**:
- `template.yaml` の `Timeout` を増やす（最大15分）:
  ```yaml
  Globals:
    Function:
      Timeout: 60  # 60秒に変更
  ```

### Webhook が受信できない

**確認事項**:
1. LINE Developers Console の Webhook URL が正しいか確認
2. 「Webhook の利用」が「利用する」になっているか確認
3. API Gateway のログを確認（CloudWatch Logs）

**解決方法**:
- API Gateway のログを有効化:
  ```bash
  aws apigatewayv2 update-stage \
    --api-id YOUR_API_ID \
    --stage-name '$default' \
    --access-log-settings file://access-log-settings.json
  ```

### ローカルテスト

SAM CLI を使用してローカルでテストできます:

```bash
npm run sam:local
```

これにより、`http://localhost:3000` でローカル API が起動します。

**注意**: ローカルテストでは、実際の LINE Platform からのリクエストをシミュレートする必要があります。`sam local invoke` を使用して、テストイベントを渡すことができます。

---

## 運用

### 環境変数の更新

環境変数を変更する場合:

```bash
sam deploy --parameter-overrides \
  ChannelAccessToken=NEW_TOKEN \
  ChannelSecret=NEW_SECRET
```

### ログの確認

CloudWatch Logs でログを確認:

```bash
aws logs tail /aws/lambda/beer-bot-staging-LineBeerBotFunction-xxxxx --follow
```

### コスト

- **Lambda**: 無料枠（月100万リクエスト、40万GB秒）
- **API Gateway**: HTTP API は低コスト（月100万リクエストで約 $1）
- **合計**: staging 環境ではほぼ無料で運用可能

### 削除

staging 環境を削除する場合:

```bash
sam delete --stack-name beer-bot-staging
```

---

## 参考資料

- [AWS SAM ドキュメント](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda ドキュメント](https://docs.aws.amazon.com/lambda/)
- [API Gateway HTTP API ドキュメント](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)

---

**次のステップ**: 本番環境へのデプロイを検討する場合は、[外部仕様書](./external-specification.md) を参照してください。

