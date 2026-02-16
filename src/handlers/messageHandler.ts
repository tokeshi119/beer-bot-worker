import { BeerService } from '../services/beerService';
import { replyMessage, type LineMessage, type QuickReplyItem } from '../lib/line';

interface MessageEvent {
	type: 'message';
	replyToken: string;
	message: {
		type: string;
		text: string;
	};
}

interface PostbackEvent {
	type: 'postback';
	replyToken: string;
	postback: {
		data: string;
	};
}

interface FollowEvent {
	type: 'follow';
	replyToken: string;
}

type WebhookEvent = MessageEvent | PostbackEvent | FollowEvent | { type: string; replyToken: string };

const GREETING_PATTERNS = [
	'こんにちは', 'こんばんは', 'おはよう', 'はじめまして',
	'やっほ', 'ども', 'おつ', 'ハロー', 'よろしく',
	'hello', 'hi', 'hey',
];

const MOOD_QUICK_REPLIES: QuickReplyItem[] = [
	{ type: 'action', action: { type: 'postback', label: 'リラックス', data: 'intent=relax', displayText: 'リラックスしたい' } },
	{ type: 'action', action: { type: 'postback', label: '疲れた…', data: 'intent=tired', displayText: '疲れた…' } },
	{ type: 'action', action: { type: 'postback', label: 'スッキリ', data: 'intent=refresh', displayText: 'スッキリしたい' } },
	{ type: 'action', action: { type: 'postback', label: 'お祝い！', data: 'intent=celebrate', displayText: 'お祝いしたい！' } },
	{ type: 'action', action: { type: 'postback', label: '暑い！', data: 'intent=hot', displayText: '暑い！' } },
	{ type: 'action', action: { type: 'postback', label: '苦いの', data: 'intent=bitter', displayText: '苦いの飲みたい' } },
	{ type: 'action', action: { type: 'postback', label: 'フルーティー', data: 'intent=fruity', displayText: 'フルーティーなやつ' } },
	{ type: 'action', action: { type: 'postback', label: 'ごはんと', data: 'intent=food', displayText: 'ごはんに合うやつ' } },
];

export class MessageHandler {
	private channelAccessToken: string;
	private beerService: BeerService;

	constructor(channelAccessToken: string) {
		this.channelAccessToken = channelAccessToken;
		this.beerService = new BeerService();
	}

	async handleEvent(event: WebhookEvent): Promise<void> {
		if (event.type === 'follow') {
			return this.replyWithMoodPicker(event.replyToken, 'フォローありがとう！🍺\n今の気分を選んでね👇');
		}

		if (event.type === 'postback') {
			return this.handlePostback(event as PostbackEvent);
		}

		if (event.type === 'message' && (event as MessageEvent).message.type === 'text') {
			return this.handleTextMessage(event as MessageEvent);
		}
	}

	private async handlePostback(event: PostbackEvent): Promise<void> {
		const params = new URLSearchParams(event.postback.data);
		const intent = params.get('intent');

		if (intent) {
			const recommendation = this.beerService.recommendBeerByIntent(intent);
			if (recommendation) {
				const text = this.formatBeerRecommendation(recommendation);
				await replyMessage(
					event.replyToken,
					[{ type: 'text', text, quickReply: { items: MOOD_QUICK_REPLIES } }],
					this.channelAccessToken,
				);
				return;
			}
		}

		await this.replyWithMoodPicker(event.replyToken, '気分を選んでね👇');
	}

	private async handleTextMessage(event: MessageEvent): Promise<void> {
		const userMessage = event.message.text.trim();

		if (this.isGreeting(userMessage)) {
			return this.replyWithMoodPicker(event.replyToken, 'やっほー！🍺\n今の気分を選んでね👇');
		}

		// テキスト入力でも従来のキーワード検索は維持
		const recommendation = this.beerService.recommendBeer(userMessage);
		if (recommendation) {
			const text = this.formatBeerRecommendation(recommendation);
			await replyMessage(
				event.replyToken,
				[{ type: 'text', text, quickReply: { items: MOOD_QUICK_REPLIES } }],
				this.channelAccessToken,
			);
			return;
		}

		// 不明な入力にもQuick Replyを付けてあげる
		await this.replyWithMoodPicker(event.replyToken, 'どんな気分？下から選んでね🍺👇');
	}

	private isGreeting(message: string): boolean {
		const normalized = message.toLowerCase().replace(/[ー！!？?〜~、。.,]/g, '');
		return GREETING_PATTERNS.some((g) => normalized.includes(g));
	}

	private async replyWithMoodPicker(replyToken: string, text: string): Promise<void> {
		const message: LineMessage = {
			type: 'text',
			text,
			quickReply: { items: MOOD_QUICK_REPLIES },
		};
		await replyMessage(replyToken, [message], this.channelAccessToken);
	}

	private formatBeerRecommendation(recommendation: {
		mood: string;
		beer: { name: string; description: string; url: string };
	}): string {
		const { beer } = recommendation;
		return `おすすめはこちら！🍺\n\n【${beer.name}】\n${beer.description}\n\n👉 ${beer.url}`;
	}
}
