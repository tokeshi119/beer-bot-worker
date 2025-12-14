import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Client, ClientConfig, WebhookEvent } from '@line/bot-sdk';
import { MessageHandler } from '../handlers/messageHandler.js';
import { verifyLineSignature } from './lineSignature.js';

// 環境変数から設定を取得
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_CHANNEL_SECRET;

// 環境変数の検証
if (!channelAccessToken || !channelSecret) {
	throw new Error(
		'Environment variables are not set: LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET are required'
	);
}

// LINE Bot Client設定
const clientConfig: ClientConfig = {
	channelAccessToken,
	channelSecret,
};

const client = new Client(clientConfig);
const messageHandler = new MessageHandler(client);

/**
 * Lambdaハンドラ - API Gateway HTTP API v2 イベントを処理
 */
export async function handler(
	event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
	const { routeKey, body, isBase64Encoded, headers } = event;

	// ヘルスチェックエンドポイント
	if (routeKey === 'GET /health') {
		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ status: 'ok' }),
		};
	}

	// Webhookエンドポイント
	if (routeKey === 'POST /webhook') {
		try {
			// 署名を取得
			const signature =
				headers['x-line-signature'] ||
				headers['X-Line-Signature'] ||
				headers['X-LINE-Signature'] ||
				null;

			// 署名検証（環境変数検証済みなので、channelSecretはstringであることが保証されている）
			const isValid = verifyLineSignature(
				body || null,
				isBase64Encoded,
				signature || null,
				channelSecret!,
			);

			if (!isValid) {
				console.error('Signature validation failed');
				return {
					statusCode: 401,
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ error: 'Unauthorized' }),
				};
			}

			// bodyをパース（base64エンコードされている場合はデコード済み）
			let rawBody: string;
			if (isBase64Encoded && body) {
				rawBody = Buffer.from(body, 'base64').toString('utf-8');
			} else {
				rawBody = body || '{}';
			}

			const webhookBody = JSON.parse(rawBody);
			const events: WebhookEvent[] = webhookBody.events || [];

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
			return {
				statusCode: 200,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ success: true }),
			};
		} catch (err) {
			console.error('Error processing webhook:', err);
			return {
				statusCode: 500,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Internal server error' }),
			};
		}
	}

	// 未対応のルート
	return {
		statusCode: 404,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ error: 'Not Found' }),
	};
}

