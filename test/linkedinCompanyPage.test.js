const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');
const { describeApiError } = require('../dist/nodes/AdaptlyPost/transport.js');

const API_PREFIX = '/post/api/v1';

const ORGANIZATION = {
	id: '2414183',
	name: 'Devtestco',
	vanityName: 'devtestco',
	urn: 'urn:li:organization:2414183',
	mention: '@[Devtestco](urn:li:organization:2414183)',
};

class ApiError extends Error {
	constructor(statusCode, body) {
		super(`Request failed with status code ${statusCode}`);
		this.response = { status: statusCode, data: body };
	}
}

function createContext(query, respond, { continueOnFail = false } = {}) {
	const parameters = { resource: 'account', operation: 'lookUpLinkedInCompanyPage', query };
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
				const call = {
					request: `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`,
					qs: options.qs,
				};
				calls.push(call);
				return respond(call);
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Account > Look Up LinkedIn Company Page', () => {
	it('sends the page as query and returns the organization as the item', async () => {
		const context = createContext('https://www.linkedin.com/company/devtestco/', () => ({
			organization: ORGANIZATION,
		}));

		const [items] = await execute(context);

		assert.deepEqual(context.calls, [
			{
				request: 'GET /linkedin-organizations/lookup',
				qs: { query: 'https://www.linkedin.com/company/devtestco/' },
			},
		]);
		assert.deepEqual(
			items.map((item) => item.json),
			[ORGANIZATION],
		);
	});

	it('outputs no item when no page has that vanity name', async () => {
		const context = createContext('acm', () => ({ organization: null }));

		const [items] = await execute(context);

		assert.deepEqual(items, []);
	});

	it('returns the code when the lookup is refused and On Error is Continue', async () => {
		const refusal = {
			statusCode: 400,
			error: 'Bad Request',
			code: 'linkedin_organization_query_invalid',
			message: 'Use a company page URL or vanity name',
		};
		const context = createContext(
			'a b',
			() => {
				throw new ApiError(400, refusal);
			},
			{ continueOnFail: true },
		);

		const [[item]] = await execute(context);

		assert.equal(item.json.error, refusal.message);
		assert.equal(item.json.code, 'linkedin_organization_query_invalid');
		assert.match(describeApiError(refusal), /vanity name/);
	});

	it('explains a lookup no LinkedIn account could run', () => {
		assert.match(
			describeApiError({
				statusCode: 400,
				code: 'linkedin_organization_lookup_unavailable',
				message: 'No LinkedIn account could look up this page',
			}),
			/Connect or reconnect one/,
		);
	});
});
