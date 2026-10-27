const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'tb-art', platform: 'TUMBLR', displayName: 'Art blog', username: 'art', status: 'active' },
	{ id: 'tb-news', platform: 'TUMBLR', displayName: 'News blog', username: 'news', status: 'active' },
	{ id: 'li-1', platform: 'LINKEDIN', displayName: 'Company', status: 'active' },
];

function createContext({ operation = 'create', accountIds, additionalFields = {} }) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds,
		contentType: 'TEXT',
		text: 'Spring is here',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	const bodies = {};
	return {
		body: (request) => bodies[request],
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
				if (request === 'POST /social-posts' || request === 'POST /social-posts/validate') {
					bodies[request] = JSON.parse(JSON.stringify(options.body));
					return request === 'POST /social-posts'
						? { postId: 'post-1', isScheduled: false }
						: { valid: true, outcome: 'PUBLISH_NOW', issues: [], accounts: [], notChecked: [] };
				}
				throw new Error(`Unexpected request ${request}`);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

const TUMBLR_FIELDS = {
	tumblrTags: '#spring\n\n  new collection  \nphotography\n',
	tumblrTitle: ' Our spring collection ',
	tumblrSourceUrl: 'https://example.com/spring',
};

const TUMBLR_CONFIG = {
	tags: ['#spring', 'new collection', 'photography'],
	title: 'Our spring collection',
	sourceUrl: 'https://example.com/spring',
};

describe('Post > Create on Tumblr', () => {
	it('sends the selected Tumblr blogs as tumblrConnectionIds', async () => {
		const context = createContext({ accountIds: ['tb-art', 'li-1', 'tb-news'] });

		await execute(context);

		const body = context.body('POST /social-posts');
		assert.deepEqual(body.platforms, ['TUMBLR', 'LINKEDIN']);
		assert.deepEqual(body.tumblrConnectionIds, ['tb-art', 'tb-news']);
		assert.deepEqual(body.linkedinConnectionIds, ['li-1']);
		assert.equal(body.tumblrConfigs, undefined);
	});

	it('sends tags, title and source URL for every selected Tumblr blog', async () => {
		const context = createContext({
			accountIds: ['tb-art', 'tb-news'],
			additionalFields: TUMBLR_FIELDS,
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts').tumblrConfigs, [
			{ connectionId: 'tb-art', ...TUMBLR_CONFIG },
			{ connectionId: 'tb-news', ...TUMBLR_CONFIG },
		]);
	});

	it('sends only the Tumblr fields that are set', async () => {
		const context = createContext({
			accountIds: ['tb-art'],
			additionalFields: { tumblrTags: 'art' },
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts').tumblrConfigs, [
			{ connectionId: 'tb-art', tags: ['art'] },
		]);
	});

	it('stops the item when a tag line holds a comma', async () => {
		const context = createContext({
			accountIds: ['tb-art'],
			additionalFields: { tumblrTags: 'spring, summer' },
		});

		await assert.rejects(execute(context), /one tag per line, without commas: "spring, summer"/);
		assert.equal(context.body('POST /social-posts'), undefined);
	});

	it('ignores the Tumblr fields when no Tumblr blog is selected', async () => {
		const context = createContext({ accountIds: ['li-1'], additionalFields: TUMBLR_FIELDS });

		await execute(context);

		assert.equal(context.body('POST /social-posts').tumblrConfigs, undefined);
	});
});

describe('Post > Validate on Tumblr', () => {
	it('sends the same Tumblr fields as Create', async () => {
		const context = createContext({
			operation: 'validate',
			accountIds: ['tb-art'],
			additionalFields: TUMBLR_FIELDS,
		});

		await execute(context);

		const body = context.body('POST /social-posts/validate');
		assert.deepEqual(body.tumblrConnectionIds, ['tb-art']);
		assert.deepEqual(body.tumblrConfigs, [{ connectionId: 'tb-art', ...TUMBLR_CONFIG }]);
	});
});
