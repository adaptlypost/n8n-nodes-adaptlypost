const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const FB_PAGE = { id: 'fb-page', platform: 'FACEBOOK', displayName: 'Shop', status: 'active' };

const CARDS = {
	card: [
		{ link: 'https://shop.example.com/a', title: 'Red mug', description: '' },
		{ link: 'https://shop.example.com/b', title: '', description: 'Blue mug, 350 ml' },
	],
};

function createContext(additionalFields) {
	const parameters = {
		resource: 'post',
		operation: 'create',
		accountIds: [FB_PAGE.id],
		contentType: 'CAROUSEL',
		text: 'New mugs',
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
				if (request === 'GET /social-accounts') return { accounts: [FB_PAGE] };
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

describe('Post > Create with a Facebook carousel', () => {
	it('sends the carousel layout and one card per entry, in order', async () => {
		const context = createContext({
			facebookImageLayout: 'CAROUSEL',
			facebookCarouselCards: CARDS,
		});

		await execute(context);

		assert.deepEqual(context.postBody().facebookConfigs, [
			{
				pageId: 'fb-page',
				imageLayout: 'CAROUSEL',
				carouselCards: [
					{ link: 'https://shop.example.com/a', title: 'Red mug' },
					{ link: 'https://shop.example.com/b', description: 'Blue mug, 350 ml' },
				],
			},
		]);
	});

	it('leaves the cards out when the layout is Grid', async () => {
		const context = createContext({
			facebookImageLayout: 'GRID',
			facebookCarouselCards: CARDS,
		});

		await execute(context);

		assert.deepEqual(context.postBody().facebookConfigs, [{ pageId: 'fb-page', imageLayout: 'GRID' }]);
	});

	it('sends no Facebook config when no Facebook field is set', async () => {
		const context = createContext({});

		await execute(context);

		assert.equal(context.postBody().facebookConfigs, undefined);
	});
});
