const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'wp-blog', platform: 'WORDPRESS', displayName: 'Company blog', status: 'active' },
	{ id: 'wp-docs', platform: 'WORDPRESS', displayName: 'Docs site', status: 'active' },
	{ id: 'yt-1', platform: 'YOUTUBE', displayName: 'Channel', status: 'active' },
	{ id: 'li-1', platform: 'LINKEDIN', displayName: 'Company', status: 'active' },
];

const CATEGORIES = {
	'wp-blog': [
		{ id: 12, name: 'News', parentId: null },
		{ id: 3, name: 'Releases', parentId: 12 },
	],
	'wp-docs': [{ id: 7, name: 'Guides', parentId: null }],
};

function createContext({
	resource = 'post',
	operation = 'create',
	accountIds,
	contentType = 'TEXT',
	mediaUrls = '',
	additionalFields = {},
	wordpressAccountId,
}) {
	const parameters = {
		resource,
		operation,
		accountIds,
		contentType,
		text: 'We shipped it',
		mediaUrls,
		additionalFields,
		recurrence: {},
		wordpressAccountId,
	};
	const bodies = {};
	const requests = [];
	return {
		body: (request) => bodies[request],
		requests,
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
			name in parameters && parameters[name] !== undefined ? parameters[name] : fallback,
		getCurrentNodeParameter: (name) => parameters[name],
		getExecutionCancelSignal: () => undefined,
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				const request = `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`;
				requests.push(request);
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				const categories = /^GET \/social-accounts\/([^/]+)\/wordpress-categories$/.exec(request);
				if (categories) return { categories: CATEGORIES[decodeURIComponent(categories[1])] ?? [] };
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
const loadCategories = (context) => new AdaptlyPost().methods.loadOptions.getWordPressCategories.call(context);

describe('Post > Create on WordPress', () => {
	it('sends the selected WordPress sites as wordpressConnectionIds', async () => {
		const context = createContext({ accountIds: ['wp-blog', 'li-1', 'wp-docs'] });

		await execute(context);

		const body = context.body('POST /social-posts');
		assert.deepEqual(body.platforms, ['WORDPRESS', 'LINKEDIN']);
		assert.deepEqual(body.wordpressConnectionIds, ['wp-blog', 'wp-docs']);
		assert.equal(body.wordpressConfigs, undefined);
	});

	it('sends the title, excerpt and tags to every site and each picked category only to its own site', async () => {
		const context = createContext({
			accountIds: ['wp-blog', 'wp-docs'],
			additionalFields: {
				wordpressTitle: ' Launch notes ',
				wordpressExcerpt: 'What shipped this week',
				wordpressTags: 'release\n\n  product updates  \n',
				wordpressCategories: ['wp-blog:12', 'wp-blog:3', 'wp-docs:7'],
			},
		});

		await execute(context);

		const shared = { title: 'Launch notes', excerpt: 'What shipped this week', tags: ['release', 'product updates'] };
		assert.deepEqual(context.body('POST /social-posts').wordpressConfigs, [
			{ connectionId: 'wp-blog', ...shared, categoryIds: [12, 3] },
			{ connectionId: 'wp-docs', ...shared, categoryIds: [7] },
		]);
	});

	it('sends a plain category ID from an expression to every selected site', async () => {
		const context = createContext({
			accountIds: ['wp-blog', 'wp-docs'],
			additionalFields: { wordpressCategories: '1, 4' },
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts').wordpressConfigs, [
			{ connectionId: 'wp-blog', categoryIds: [1, 4] },
			{ connectionId: 'wp-docs', categoryIds: [1, 4] },
		]);
	});

	it('sends WordPress Status to every selected site', async () => {
		const context = createContext({
			accountIds: ['wp-blog', 'wp-docs'],
			additionalFields: { wordpressStatus: 'DRAFT' },
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts').wordpressConfigs, [
			{ connectionId: 'wp-blog', status: 'DRAFT' },
			{ connectionId: 'wp-docs', status: 'DRAFT' },
		]);
	});

	it('stops the item when a category is not an ID', async () => {
		const context = createContext({
			accountIds: ['wp-blog'],
			additionalFields: { wordpressCategories: 'News' },
		});

		await assert.rejects(execute(context), /WordPress Categories take category IDs, got "News"/);
		assert.equal(context.body('POST /social-posts'), undefined);
	});

	it('ignores the WordPress fields when no WordPress site is selected', async () => {
		const context = createContext({
			accountIds: ['li-1'],
			additionalFields: { wordpressTitle: 'Launch notes', wordpressCategories: ['wp-blog:12'] },
		});

		await execute(context);

		assert.equal(context.body('POST /social-posts').wordpressConfigs, undefined);
	});
});

describe('Post > Validate on WordPress', () => {
	it('sends the same WordPress fields as Create', async () => {
		const context = createContext({
			operation: 'validate',
			accountIds: ['wp-blog'],
			additionalFields: { wordpressTitle: 'Launch notes' },
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts/validate').wordpressConfigs, [
			{ connectionId: 'wp-blog', title: 'Launch notes' },
		]);
	});
});

describe('WordPress categories', () => {
	it('lists the categories of the selected sites, named after the site when there are several', async () => {
		const context = createContext({ accountIds: ['wp-blog', 'wp-docs'] });

		assert.deepEqual(await loadCategories(context), [
			{ name: 'News (Company blog)', value: 'wp-blog:12' },
			{ name: 'Releases (Company blog)', value: 'wp-blog:3' },
			{ name: 'Guides (Docs site)', value: 'wp-docs:7' },
		]);
	});

	it('lists one site by category name only', async () => {
		const context = createContext({ accountIds: ['wp-docs', 'li-1'] });

		assert.deepEqual(await loadCategories(context), [{ name: 'Guides', value: 'wp-docs:7' }]);
	});

	it('returns the categories of one site from Account > Get WordPress Categories', async () => {
		const context = createContext({
			resource: 'account',
			operation: 'getWordPressCategories',
			wordpressAccountId: 'wp-blog',
		});

		const [items] = await execute(context);

		assert.deepEqual(
			items.map((item) => item.json),
			CATEGORIES['wp-blog'],
		);
		assert.ok(context.requests.includes('GET /social-accounts/wp-blog/wordpress-categories'));
	});
});

describe('Post > Create on YouTube', () => {
	it('sends the audio language as defaultAudioLanguage', async () => {
		const context = createContext({
			accountIds: ['yt-1'],
			contentType: 'VIDEO',
			additionalFields: { youtubeAudioLanguage: ' pt-BR ' },
		});

		await execute(context);

		assert.equal(context.body('POST /social-posts').youtubeConfigs[0].defaultAudioLanguage, 'pt-BR');
	});
});
