import express, { Request, Response } from 'express';
import { Client, Config, middleware, WebhookEvent } from '@line/bot-sdk';
import { MessageHandler } from './handlers/messageHandler.js';
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot設定
const config: Config = {
	channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
	channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);
const messageHandler = new MessageHandler(client);

// JSONパーサーミドルウェア
app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/health', (_req: Request, res: Response) => {
	res.status(200).json({ status: 'ok' });
});

// LINE Webhookエンドポイント
app.post(
	'/webhook',
	middleware(config),
	async (req: Request, res: Response): Promise<void> => {
		const events: WebhookEvent[] = req.body.events;

		// 各イベントを処理
		const promises = events.map(async (event: WebhookEvent) => {
			try {
				await messageHandler.handleEvent(event);
			} catch (err) {
				console.error('Error handling event:', err);
			}
		});

		await Promise.all(promises);

		// LINE Platformに200を返す
		res.status(200).end();
	}
);

// エラーハンドリング
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
	console.error('Error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

// サーバー起動
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});

