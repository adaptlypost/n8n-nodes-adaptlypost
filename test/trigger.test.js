const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPostTrigger } = require('../dist/nodes/AdaptlyPost/AdaptlyPostTrigger.node.js');

const API_PREFIX = '/post/api/v1';
const WEBHOOK_URL = 'https://n8n.example.com/webhook/abc/webhook';

function createHookContext({ events, webhooks = [], staticData = {} }) {
	const calls = [];
	return {
		calls,
		staticData,
		getNodeWebhookUrl: () => WEBHOOK_URL,
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name) => (name === 'events' ? events : undefined),
		logger: { warn: () => {} },
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				const request = `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`;
				calls.push({ request, body: options.body });
				if (request === 'GET /webhooks') return { webhooks };
				if (request === 'POST /webhooks') {
					return { id: 'wh-1', url: WEBHOOK_URL, active: true, events: options.body.events, secret: 'whsec_1' };
				}
				return {};
			},
		},
	};
}

const hooks = new AdaptlyPostTrigger().webhookMethods.default;

describe('AdaptlyPost Trigger', () => {
	it('offers the inbox events', () => {
		const events = new AdaptlyPostTrigger().description.properties
			.find((property) => property.name === 'events')
			.options.map((option) => option.value);
		for (const event of [
			'comment.created',
			'comment.replied',
			'mention.created',
			'message.received',
			'review.created',
		]) {
			assert.ok(events.includes(event), event);
		}
	});

	it('registers the webhook with the selected events', async () => {
		const context = createHookContext({ events: ['comment.created', 'post.published'] });

		await hooks.create.call(context);

		assert.deepEqual(context.calls, [
			{ request: 'POST /webhooks', body: { url: WEBHOOK_URL, events: ['comment.created', 'post.published'] } },
		]);
		assert.deepEqual(context.staticData.webhookEvents, ['comment.created', 'post.published']);
	});

	it('updates the events of the existing webhook when the selection changed', async () => {
		const context = createHookContext({
			events: ['review.created'],
			webhooks: [{ id: 'wh-1', url: WEBHOOK_URL, active: true, events: [] }],
			staticData: { webhookId: 'wh-1', webhookSecret: 'whsec_1' },
		});

		assert.equal(await hooks.checkExists.call(context), true);

		assert.deepEqual(context.calls.map((call) => call.request), ['GET /webhooks', 'PATCH /webhooks/wh-1']);
		assert.deepEqual(context.calls[1].body, { events: ['review.created'] });
	});

	it('leaves the webhook alone when the events match in any order', async () => {
		const context = createHookContext({
			events: ['post.failed', 'mention.created'],
			webhooks: [{ id: 'wh-1', url: WEBHOOK_URL, active: true, events: ['mention.created', 'post.failed'] }],
			staticData: { webhookId: 'wh-1', webhookSecret: 'whsec_1' },
		});

		assert.equal(await hooks.checkExists.call(context), true);

		assert.deepEqual(context.calls.map((call) => call.request), ['GET /webhooks']);
	});
});
