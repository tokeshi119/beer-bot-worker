import { Client, MessageEvent, TextMessage, WebhookEvent } from '@line/bot-sdk';
import { BeerService } from '../services/beerService.js';

export class MessageHandler {
	private client: Client;
	private beerService: BeerService;

	constructor(client: Client) {
		this.client = client;
		this.beerService = new BeerService();
	}

	/**
	 * Webhookイベントを処理する
	 */
	async handleEvent(event: WebhookEvent): Promise<void> {
		if (event.type !== 'message' || event.message.type !== 'text') {
			return;
		}

		const messageEvent = event as MessageEvent;
		const textMessage = messageEvent.message as TextMessage;
		const replyToken = messageEvent.replyToken;
		const userMessage = textMessage.text;

		// メッセージを処理して返信を生成
		const replyMessage = this.processMessage(userMessage);

		// LINEに返信を送信
		await this.client.replyMessage(replyToken, {
			type: 'text',
			text: replyMessage,
		});
	}

	/**
	 * ユーザーのメッセージを処理して返信メッセージを生成する
	 */
	private processMessage(message: string): string {
		const trimmedMessage = message.trim();

		// 空メッセージや挨拶の場合は初期メッセージを返す
		if (
			!trimmedMessage ||
			trimmedMessage === 'こんにちは' ||
			trimmedMessage === 'はじめまして' ||
			trimmedMessage === 'hello' ||
			trimmedMessage === 'hi'
		) {
			return this.beerService.getInitialMessage();
		}

		// ビール推薦を試みる
		const recommendation = this.beerService.recommendBeer(trimmedMessage);

		if (recommendation) {
			return this.formatBeerRecommendation(recommendation);
		}

		// 気分が判定できない場合
		return this.beerService.getUnknownMoodMessage();
	}

	/**
	 * ビール推薦メッセージをフォーマットする
	 */
	private formatBeerRecommendation(recommendation: {
		mood: string;
		beer: { name: string; description: string; url: string };
	}): string {
		const { beer } = recommendation;
		return `おすすめのビールはこちらです！🍺\n\n【${beer.name}】\n${beer.description}\n\n商品URL:\n${beer.url}`;
	}
}

