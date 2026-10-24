const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'tg-channel', platform: 'TELEGRAM', displayName: 'Release notes', username: 'releases', status: 'active' },
	{ id: 'tg-group', platform: 'TELEGRAM', displayName: 'Team chat', username: '', status: 'active' },
	{ id: 'li-1', platform: 'LINKEDIN', displayName: 'Company', status: 'active' },
];

const COVER = 'data:image/png;base64,iVBORw0KGgo=';

function createContext({ accountIds, contentType = 'TEXT', additionalFields = {} }) {
	const parameters = {
		resource: 'post',
		operation: 'create',
		accountIds,
		contentType,
		text: 'Version 2 is out',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	let postBody;
	return {
		postBody: () => postBody,
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
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				if (request === 'POST /social-posts') {
					postBody = JSON.parse(JSON.stringify(options.body));
					return { postId: 'post-1', isScheduled: false };
				}
				throw new Error(`Unexpected request ${request}`);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Create on Telegram', () => {
	it('sends the selected Telegram chats as telegramConnectionIds', async () => {
		const context = createContext({ accountIds: ['tg-channel', 'li-1', 'tg-group'] });

		await execute(context);

		assert.deepEqual(context.postBody().platforms, ['TELEGRAM', 'LINKEDIN']);
		assert.deepEqual(context.postBody().telegramConnectionIds, ['tg-channel', 'tg-group']);
		assert.deepEqual(context.postBody().linkedinConnectionIds, ['li-1']);
	});

	it('sends a Telegram video thumbnail image', async () => {
		const context = createContext({
			accountIds: ['tg-channel'],
			contentType: 'VIDEO',
			additionalFields: {
				platformThumbnails: {
					thumbnail: [{ platform: 'TELEGRAM', source: 'image', thumbnailUrl: COVER }],
				},
			},
		});

		await execute(context);

		assert.deepEqual(context.postBody().platformThumbnails, [
			{ platform: 'TELEGRAM', thumbnailUrl: COVER },
		]);
	});
});
