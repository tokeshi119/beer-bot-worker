import { describe, expect, it, vi } from "vitest";
import { MessageHandler } from "./messageHandler.js";

vi.mock("../lib/line", () => ({
	replyMessage: vi.fn().mockResolvedValue(undefined),
}));

import { replyMessage } from "../lib/line";

describe("MessageHandler", () => {
	it("挨拶メッセージにはQuick Reply付きで返信する", async () => {
		const handler = new MessageHandler("dummy-token");

		const event = {
			type: "message" as const,
			message: { type: "text", text: "こんにちは" },
			replyToken: "replyToken",
		};

		await handler.handleEvent(event);

		expect(replyMessage).toHaveBeenCalledTimes(1);
		const [token, messages] = vi.mocked(replyMessage).mock.calls[0];
		expect(token).toBe("replyToken");
		expect(messages[0].type).toBe("text");
		expect(messages[0].quickReply).toBeDefined();
		expect(messages[0].quickReply!.items.length).toBe(8);
	});

	it("「こんばんはー」も挨拶として認識する", async () => {
		vi.mocked(replyMessage).mockClear();
		const handler = new MessageHandler("dummy-token");

		const event = {
			type: "message" as const,
			message: { type: "text", text: "こんばんはー" },
			replyToken: "replyToken",
		};

		await handler.handleEvent(event);

		expect(replyMessage).toHaveBeenCalledTimes(1);
		const [, messages] = vi.mocked(replyMessage).mock.calls[0];
		expect(messages[0].quickReply).toBeDefined();
	});

	it("postbackイベントでビールを推薦する", async () => {
		vi.mocked(replyMessage).mockClear();
		const handler = new MessageHandler("dummy-token");

		const event = {
			type: "postback" as const,
			replyToken: "replyToken",
			postback: { data: "intent=relax" },
		};

		await handler.handleEvent(event);

		expect(replyMessage).toHaveBeenCalledTimes(1);
		const [, messages] = vi.mocked(replyMessage).mock.calls[0];
		expect(messages[0].text).toContain("おすすめはこちら");
	});
});
