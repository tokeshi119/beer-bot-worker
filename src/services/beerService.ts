import beersData from '../data/beers.json';

export interface Beer {
	name: string;
	description: string;
	url: string;
}

export interface BeerRecommendation {
	mood: string;
	beer: Beer;
}

type MoodKey = 'relax' | 'tired' | 'refresh' | 'celebrate' | 'hot' | 'bitter' | 'fruity' | 'food';

/**
 * ユーザーのメッセージから気分を判定し、適切なビールを推薦する
 */
export class BeerService {
	private beers = beersData.moods;

	/**
	 * メッセージから気分を判定する
	 */
	private detectMood(message: string): MoodKey | null {
		const normalizedMessage = message.toLowerCase().trim();

		// 各気分カテゴリのキーワードをチェック
		for (const [moodKey, moodData] of Object.entries(this.beers)) {
			for (const keyword of moodData.keywords) {
				if (normalizedMessage.includes(keyword.toLowerCase())) {
					return moodKey as MoodKey;
				}
			}
		}

		return null;
	}

	/**
	 * 気分に応じたビールをランダムに推薦する（テキスト入力用）
	 */
	recommendBeer(message: string): BeerRecommendation | null {
		const mood = this.detectMood(message);
		if (!mood) return null;
		return this.pickRandomBeer(mood);
	}

	/**
	 * intentキーから直接ビールを推薦する（postback用）
	 */
	recommendBeerByIntent(intent: string): BeerRecommendation | null {
		if (!(intent in this.beers)) return null;
		return this.pickRandomBeer(intent as MoodKey);
	}

	private pickRandomBeer(mood: MoodKey): BeerRecommendation {
		const availableBeers = this.beers[mood].beers;
		const randomIndex = Math.floor(Math.random() * availableBeers.length);
		return { mood, beer: availableBeers[randomIndex] };
	}

	/**
	 * 初期メッセージを取得する
	 */
	getInitialMessage(): string {
		return '今の気分は？🍺\n\n例：\n・リラックスしたい\n・疲れた\n・スッキリしたい\n・お祝いしたい\n・暑い！\n・苦いの飲みたい\n・フルーティーなやつ\n・ごはんに合うやつ';
	}

	/**
	 * 気分が判定できない場合のメッセージを取得する
	 */
	getUnknownMoodMessage(): string {
		return 'すみません、気分がよくわかりませんでした。\n\n以下のような気分を教えてください：\n・リラックスしたい\n・疲れた\n・スッキリしたい\n・お祝いしたい\n・暑い！\n・苦いの飲みたい\n・フルーティーなやつ\n・ごはんに合うやつ';
	}
}

