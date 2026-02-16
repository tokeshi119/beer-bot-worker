import { Hono } from 'hono';
import { verifyLineSignature } from './lib/line';
import { MessageHandler } from './handlers/messageHandler';

type Bindings = {
	LINE_CHANNEL_ACCESS_TOKEN: string;
	LINE_CHANNEL_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/webhook', async (c) => {
	const signature = c.req.header('x-line-signature');
	const body = await c.req.text();

	const isValid = await verifyLineSignature(
		body,
		signature,
		c.env.LINE_CHANNEL_SECRET,
	);

	if (!isValid) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const webhookBody = JSON.parse(body);
	const events = webhookBody.events || [];

	const messageHandler = new MessageHandler(c.env.LINE_CHANNEL_ACCESS_TOKEN);

	await Promise.all(
		events.map(async (event: Parameters<typeof messageHandler.handleEvent>[0]) => {
			try {
				await messageHandler.handleEvent(event);
			} catch (err) {
				console.error('Error handling event:', err);
			}
		}),
	);

	return c.json({ success: true });
});

export default app;
