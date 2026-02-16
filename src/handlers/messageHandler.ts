import { BeerService } from '../services/beerService';
import { replyMessage } from '../lib/line';

interface WebhookEvent {
	type: string;
	replyToken: string;
	message: {
		type: string;
		text: string;
	};
}

export class MessageHandler {
	private channelAccessToken: string;
	private beerService: BeerService;

	constructor(channelAccessToken: string) {
		this.channelAccessToken = channelAccessToken;
		this.beerService = new BeerService();
	}

	/**
	 * Webhookイベントを処理する
	 */
	async handleEvent(event: WebhookEvent): Promise<void> {
		if (event.type !== 'message' || event.message.type !== 'text') {
			return;
		}

		const replyToken = event.replyToken;
		const userMessage = event.message.text;

		const replyText = this.processMessage(userMessage);

		await replyMessage(
			replyToken,
			[{ type: 'text', text: replyText }],
			this.channelAccessToken,
		);
	}

	/**
	 * ユーザーのメッセージを処理して返信メッセージを生成する
	 */
	private processMessage(message: string): string {
		const trimmedMessage = message.trim();

		if (
			!trimmedMessage ||
			trimmedMessage === 'こんにちは' ||
			trimmedMessage === 'はじめまして' ||
			trimmedMessage === 'hello' ||
			trimmedMessage === 'hi'
		) {
			return this.beerService.getInitialMessage();
		}

		const recommendation = this.beerService.recommendBeer(trimmedMessage);

		if (recommendation) {
			return this.formatBeerRecommendation(recommendation);
		}

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
