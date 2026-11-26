const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [{ id: 'x-1', platform: 'TWITTER', displayName: 'acme', status: 'active' }];

const LABELS = [
	{ id: 'label-acme', name: 'Acme', color: '#3B82F6' },
	{ id: 'label-shop', name: 'Acme Shop', color: '#10B981' },
];

function createContext({ operation = 'create', additionalFields = {} } = {}) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds: ['x-1'],
		contentType: 'TEXT',
		text: 'Launch day',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	const calls = [];
	return {
		calls,
		bodyOf: (request) => calls.find((call) => call.request === request)?.body,
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
				calls.push({ request, body: options.body });
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				if (request === 'GET /labels') return { labels: LABELS };
				if (request === 'POST /social-posts/validate') return { valid: true, accounts: [], issues: [] };
				return { postId: 'post-1', isScheduled: false };
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Create labels', () => {
	it('lists the workspace labels by name for the dropdown', async () => {
		const context = createContext();

		const options = await new AdaptlyPost().methods.loadOptions.getLabels.call(context);

		assert.deepEqual(options, [
			{ name: 'Acme', value: 'label-acme' },
			{ name: 'Acme Shop', value: 'label-shop' },
		]);
	});

	it('sends the picked labels as labelIds on Create and Validate', async () => {
		for (const [operation, request] of [
			['create', 'POST /social-posts'],
			['validate', 'POST /social-posts/validate'],
		]) {
			const context = createContext({
				operation,
				additionalFields: { labelIds: ['label-acme', 'label-shop'] },
			});

			await execute(context);

			assert.deepEqual(context.bodyOf(request).labelIds, ['label-acme', 'label-shop']);
		}
	});

	it('takes label IDs from an expression, one per line', async () => {
		const context = createContext({ additionalFields: { labelIds: 'label-acme\nlabel-shop\n' } });

		await execute(context);

		assert.deepEqual(context.bodyOf('POST /social-posts').labelIds, ['label-acme', 'label-shop']);
	});

	it('leaves labelIds out when no label is picked', async () => {
		for (const additionalFields of [{}, { labelIds: [] }]) {
			const context = createContext({ additionalFields });

			await execute(context);

			assert.ok(!('labelIds' in context.bodyOf('POST /social-posts')));
		}
	});
});
