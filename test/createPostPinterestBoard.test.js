const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { NodeOperationError } = require('n8n-workflow');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const PIN_MAIN = { id: 'pin-main', platform: 'PINTEREST', displayName: 'Main', status: 'active' };
const PIN_SHOP = { id: 'pin-shop', platform: 'PINTEREST', displayName: 'Shop', status: 'active' };

const BOARDS = {
	'pin-main': [
		{ id: 'board-recipes', name: 'Summer Recipes' },
		{ id: 'board-travel', name: 'Travel' },
	],
	'pin-shop': [{ id: 'board-products', name: 'Products' }],
};

function createContext({ accounts, additionalFields }) {
	const parameters = {
		resource: 'post',
		operation: 'create',
		accountIds: accounts.map((account) => account.id),
		contentType: 'TEXT',
		text: 'Hello',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	const requests = [];
	let postBody;
	const respond = (request, body) => {
		if (request === 'GET /social-accounts') return { accounts };
		const boards = request.match(/^GET \/social-accounts\/([^/]+)\/pinterest-boards$/);
		if (boards) return { boards: BOARDS[boards[1]] };
		if (request === 'POST /social-posts') {
			postBody = body;
			return { postId: 'post-1', isScheduled: false };
		}
		throw new Error(`Unexpected request ${request}`);
	};
	return {
		requests,
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
				const path = new URL(options.url).pathname.slice(API_PREFIX.length);
				const request = `${options.method} ${path}`;
				requests.push(request);
				return respond(request, options.body);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Create with a Pinterest board', () => {
	it('sends the board name for a single Pinterest account without listing its boards', async () => {
		const context = createContext({
			accounts: [PIN_MAIN],
			additionalFields: { pinterestBoardName: '  Summer Recipes ' },
		});

		await execute(context);

		assert.deepEqual(context.postBody().pinterestConfigs, [
			{
				connectionId: 'pin-main',
				boardId: undefined,
				boardName: 'Summer Recipes',
				link: undefined,
			},
		]);
		assert.deepEqual(context.requests, ['GET /social-accounts', 'POST /social-posts']);
	});

	it('sends the board name only to the accounts that have a board with that name', async () => {
		const context = createContext({
			accounts: [PIN_MAIN, PIN_SHOP],
			additionalFields: {
				pinterestBoardName: 'summer recipes',
				pinterestLink: 'https://example.com',
			},
		});

		await execute(context);

		assert.deepEqual(context.postBody().pinterestConfigs, [
			{
				connectionId: 'pin-main',
				boardId: undefined,
				boardName: 'summer recipes',
				link: 'https://example.com',
			},
			{
				connectionId: 'pin-shop',
				boardId: undefined,
				boardName: undefined,
				link: 'https://example.com',
			},
		]);
	});

	it('fails when none of the Pinterest accounts has a board with that name', async () => {
		const context = createContext({
			accounts: [PIN_MAIN, PIN_SHOP],
			additionalFields: { pinterestBoardName: 'Winter' },
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(
				error.message,
				'None of the selected Pinterest accounts has a board named "Winter"',
			);
			return true;
		});
		assert.equal(context.postBody(), undefined);
	});

	it('refuses a board ID and a board name together before calling the API', async () => {
		const context = createContext({
			accounts: [PIN_MAIN],
			additionalFields: { pinterestBoard: 'board-recipes', pinterestBoardName: 'Summer Recipes' },
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(error.message, 'Set Pinterest Board or Pinterest Board Name, not both');
			return true;
		});
		assert.deepEqual(context.requests, []);
	});

	it('keeps sending the board ID to the account that owns it', async () => {
		const context = createContext({
			accounts: [PIN_MAIN, PIN_SHOP],
			additionalFields: { pinterestBoard: 'board-products' },
		});

		await execute(context);

		assert.deepEqual(context.postBody().pinterestConfigs, [
			{ connectionId: 'pin-main', boardId: undefined, boardName: undefined, link: undefined },
			{
				connectionId: 'pin-shop',
				boardId: 'board-products',
				boardName: undefined,
				link: undefined,
			},
		]);
	});
});
