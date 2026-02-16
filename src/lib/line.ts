/**
 * LINE Messaging API ユーティリティ
 * Web Crypto API を使った署名検証と fetch ベースのメッセージ送信
 */

/**
 * LINE Webhook の署名を検証する (HMAC-SHA256)
 */
export async function verifyLineSignature(
	body: string,
	signature: string | undefined,
	channelSecret: string,
): Promise<boolean> {
	if (!body || !signature) return false;

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(channelSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);

	const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

	const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

	return signature === expected;
}

export type QuickReplyItem = {
	type: 'action';
	action: {
		type: 'postback';
		label: string;
		data: string;
		displayText: string;
	};
};

export type LineMessage = {
	type: 'text';
	text: string;
	quickReply?: {
		items: QuickReplyItem[];
	};
};

/**
 * LINE Reply API でメッセージを返信する
 */
export async function replyMessage(
	replyToken: string,
	messages: LineMessage[],
	channelAccessToken: string,
): Promise<void> {
	const res = await fetch('https://api.line.me/v2/bot/message/reply', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${channelAccessToken}`,
		},
		body: JSON.stringify({ replyToken, messages }),
	});

	if (!res.ok) {
		const errorBody = await res.text();
		console.error(`LINE Reply API error: ${res.status} ${errorBody}`);
	}
}
