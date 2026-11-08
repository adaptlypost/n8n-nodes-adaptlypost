const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');
const { describeApiError } = require('../dist/nodes/AdaptlyPost/transport.js');

const API_PREFIX = '/post/api/v1';

class ApiError extends Error {
	constructor(statusCode, body) {
		super(`Request failed with status code ${statusCode}`);
		this.response = { status: statusCode, data: body };
	}
}

function createContext(parameters, respond, { continueOnFail = false } = {}) {
	const calls = [];
	return {
		calls,
		getInputData: () => [{ json: {} }],
		getNode: () => ({
			id: 'node-1',
			name: 'AdaptlyPost',
			type: 'n8n-nodes-adaptlypost.adaptlyPost',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getNodeParameter: (name, _itemIndex, fallback) =>
			name in parameters ? parameters[name] : fallback,
		getExecutionCancelSignal: () => undefined,
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				const path = new URL(options.url).pathname.slice(API_PREFIX.length);
				const call = {
					request: `${options.method} ${path}`,
					qs: options.qs,
					body: options.body === undefined ? undefined : JSON.parse(JSON.stringify(options.body)),
				};
				calls.push(call);
				return respond(call);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);
const inbox = (operation, extra = {}) => ({ resource: 'inbox', operation, ...extra });

describe('Inbox > Get Many', () => {
	it('follows nextCursor until it is null when Return All is on', async () => {
		const pages = {
			'': { comments: [{ id: 'c1' }, { id: 'c2' }], nextCursor: 'p2', hasMore: true },
			p2: { comments: [{ id: 'c3' }], nextCursor: null, hasMore: false },
		};
		const context = createContext(
			inbox('getComments', {
				returnAll: true,
				inboxFilters: {
					accountIds: ['acc-1', 'acc-2'],
					platforms: ['FACEBOOK'],
					statuses: ['UNREAD'],
					since: '2026-11-01T00:00:00Z',
					postId: 'post-1',
					search: '',
				},
			}),
			({ qs }) => pages[qs.cursor ?? ''],
		);

		const [items] = await execute(context);

		assert.deepEqual(
			items.map((item) => item.json.id),
			['c1', 'c2', 'c3'],
		);
		assert.deepEqual(
			context.calls.map((call) => call.request),
			['GET /inbox/comments', 'GET /inbox/comments'],
		);
		assert.deepEqual(context.calls[0].qs, {
			accountIds: ['acc-1', 'acc-2'],
			platforms: ['FACEBOOK'],
			statuses: ['UNREAD'],
			since: '2026-11-01T00:00:00Z',
			postId: 'post-1',
			cursor: undefined,
			limit: 100,
		});
		assert.equal(context.calls[1].qs.cursor, 'p2');
	});

	it('stops at Limit and asks only for what is left', async () => {
		const context = createContext(
			inbox('getReviews', { returnAll: false, limit: 3, inboxFilters: { ratings: [1, 2], replied: 'false' } }),
			({ qs }) =>
				qs.cursor
					? { reviews: [{ id: 'r3' }, { id: 'r4' }], nextCursor: 'p3' }
					: { reviews: [{ id: 'r1' }, { id: 'r2' }], nextCursor: 'p2' },
		);

		const [items] = await execute(context);

		assert.deepEqual(
			items.map((item) => item.json.id),
			['r1', 'r2', 'r3'],
		);
		assert.equal(context.calls[0].qs.limit, 3);
		assert.deepEqual(context.calls[0].qs.ratings, [1, 2]);
		assert.equal(context.calls[0].qs.replied, 'false');
		assert.equal(context.calls[1].qs.limit, 1);
	});

	it('returns one page with nextCursor when Return Page is on', async () => {
		const page = { mentions: [{ id: 'm1' }], total: 9, hasMore: true, nextCursor: 'next' };
		const context = createContext(
			inbox('getMentions', { returnAll: false, limit: 500, returnPage: true, inboxFilters: { cursor: 'abc' } }),
			() => page,
		);

		const [[item]] = await execute(context);

		assert.deepEqual(item.json, page);
		assert.deepEqual(context.calls[0].qs, { cursor: 'abc', limit: 100 });
	});
});

describe('Inbox writes', () => {
	const cases = [
		[inbox('replyToComment', { commentId: 'c1', replyText: 'Thanks' }), 'POST /inbox/comments/c1/reply', { text: 'Thanks' }],
		[inbox('hideComment', { commentId: 'c1' }), 'POST /inbox/comments/c1/hide', {}],
		[inbox('unhideComment', { commentId: 'c1' }), 'POST /inbox/comments/c1/unhide', {}],
		[inbox('likeComment', { commentId: 'c1' }), 'POST /inbox/comments/c1/like', {}],
		[inbox('unlikeComment', { commentId: 'c1' }), 'DELETE /inbox/comments/c1/like', undefined],
		[inbox('deleteComment', { commentId: 'c1' }), 'DELETE /inbox/comments/c1', undefined],
		[inbox('replyToMention', { mentionId: 'm1', replyText: 'Hi' }), 'POST /inbox/mentions/m1/reply', { text: 'Hi' }],
		[inbox('sendMessage', { conversationId: 'v1', messageText: 'Hello' }), 'POST /inbox/conversations/v1/messages', { text: 'Hello' }],
		[inbox('replyToReview', { reviewId: 'r1', reviewReplyText: 'Thank you' }), 'PUT /inbox/reviews/r1/reply', { text: 'Thank you' }],
		[inbox('deleteReviewReply', { reviewId: 'r1' }), 'DELETE /inbox/reviews/r1/reply', undefined],
		[inbox('getComment', { commentId: 'c1' }), 'GET /inbox/comments/c1', undefined],
		[inbox('getConversation', { conversationId: 'v1' }), 'GET /inbox/conversations/v1', undefined],
		[inbox('getSummary'), 'GET /inbox/summary', undefined],
		[inbox('refresh'), 'POST /inbox/refresh', {}],
		[
			inbox('setStatus', { channel: 'conversations', itemIds: 'v1\n\n v2 \n', status: 'DONE' }),
			'POST /inbox/conversations/status',
			{ ids: ['v1', 'v2'], status: 'DONE' },
		],
	];

	for (const [parameters, request, body] of cases) {
		it(`${parameters.operation} calls ${request}`, async () => {
			const context = createContext(parameters, () => ({ ok: true }));
			await execute(context);
			assert.equal(context.calls.length, 1);
			assert.equal(context.calls[0].request, request);
			assert.deepEqual(context.calls[0].body, body);
		});
	}

	it('refuses Set Status with more than 100 IDs before calling the API', async () => {
		const itemIds = Array.from({ length: 101 }, (_, index) => `c${index}`).join('\n');
		const context = createContext(inbox('setStatus', { channel: 'comments', itemIds, status: 'READ' }), () => ({}));
		await assert.rejects(execute(context), /from 1 to 100 IDs/);
		assert.equal(context.calls.length, 0);
	});

	it('returns the refusal code with On Error set to Continue, and explains it', async () => {
		const refusal = {
			statusCode: 403,
			error: 'Forbidden',
			code: 'inbox_reconnect_required',
			message: 'Reconnect this Instagram account to answer its messages',
		};
		const context = createContext(
			inbox('sendMessage', { conversationId: 'v1', messageText: 'Hi' }),
			() => {
				throw new ApiError(403, refusal);
			},
			{ continueOnFail: true },
		);

		const [[item]] = await execute(context);

		assert.equal(item.json.error, refusal.message);
		assert.equal(item.json.code, 'inbox_reconnect_required');
		assert.match(describeApiError(refusal), /reconnected in AdaptlyPost/);
	});
});
