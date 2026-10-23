const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const IG_ACCOUNT = { id: 'ig-1', platform: 'INSTAGRAM', displayName: 'Shop', status: 'active' };

function createContext(additionalFields) {
	const parameters = {
		resource: 'post',
		operation: 'create',
		accountIds: [IG_ACCOUNT.id],
		contentType: 'IMAGE',
		text: 'New mugs',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	let postBody;
	let requests = 0;
	return {
		postBody: () => postBody,
		requests: () => requests,
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
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				const request = `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`;
				if (request === 'GET /social-accounts') return { accounts: [IG_ACCOUNT] };
				if (request === 'POST /social-posts') {
					requests += 1;
					postBody = JSON.parse(JSON.stringify(options.body));
					return { postId: 'post-1', isScheduled: false };
				}
				throw new Error(`Unexpected request ${request}`);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Create with Instagram user tags', () => {
	it('sends one tag per entry with its position, and skips empty usernames', async () => {
		const context = createContext({
			instagramUserTags: {
				tag: [
					{ username: ' @partner ', x: '0.25', y: '0.75' },
					{ username: '', x: '0.1', y: '0.1' },
					{ username: 'friend.co', x: '', y: '' },
				],
			},
		});

		await execute(context);

		assert.deepEqual(context.postBody().instagramConfigs, [
			{
				connectionId: 'ig-1',
				userTags: [{ username: '@partner', x: 0.25, y: 0.75 }, { username: 'friend.co' }],
			},
		]);
	});

	it('stops the item when a position is outside 0 to 1', async () => {
		const context = createContext({
			instagramUserTags: { tag: [{ username: 'partner', x: '1.5', y: '0.5' }] },
		});

		await assert.rejects(execute(context), /X of partner must be a number from 0 to 1/);
		assert.equal(context.requests(), 0);
	});

	it('sends no Instagram config when no tag is set', async () => {
		const context = createContext({ instagramUserTags: {} });

		await execute(context);

		assert.equal(context.postBody().instagramConfigs, undefined);
	});
});
