const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'acc-x', platform: 'TWITTER', displayName: 'acme', status: 'active' },
	{ id: 'acc-tiktok', platform: 'TIKTOK', displayName: 'acme.tt', status: 'active' },
];

const TOO_LONG = {
	code: 'TEXT_TOO_LONG',
	severity: 'ERROR',
	message: 'Text exceeds maximum length for X. Maximum is 280 characters',
	platform: 'TWITTER',
	connectionId: 'acc-x',
};

const REPORT = {
	valid: false,
	outcome: 'PUBLISH_NOW',
	requiredPermissions: ['posts.publish'],
	issues: [],
	accounts: [
		{ platform: 'TWITTER', connectionId: 'acc-x', status: 'BLOCKED', issues: [TOO_LONG] },
		{ platform: 'TIKTOK', connectionId: 'acc-tiktok', status: 'READY', issues: [] },
	],
	notChecked: [],
};

class ApiError extends Error {
	constructor(statusCode, body) {
		super(`Request failed with status code ${statusCode}`);
		this.response = { status: statusCode, data: body };
	}
}

function createContext({ operation, refusal, continueOnFail = false }) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds: ACCOUNTS.map((account) => account.id),
		contentType: 'TEXT',
		text: 'Hello',
		mediaUrls: '',
		additionalFields: {},
		recurrence: {},
	};
	const requests = [];
	const bodies = {};
	const respond = (request, body) => {
		if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
		if (request === 'POST /social-posts/validate') {
			bodies.validate = body;
			return REPORT;
		}
		if (request === 'POST /social-posts') {
			bodies.create = body;
			if (refusal) throw new ApiError(400, refusal);
			return { postId: 'post-1', isScheduled: false };
		}
		throw new Error(`Unexpected request ${request}`);
	};
	return {
		requests,
		bodies,
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
				const request = `${options.method} ${path}`;
				requests.push(request);
				return respond(request, options.body);
			},
		},
	};
}

const run = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Validate', () => {
	it('sends the body Create would send to the validate endpoint and returns the report', async () => {
		const validate = createContext({ operation: 'validate' });
		const create = createContext({ operation: 'create' });

		const [[item]] = await run(validate);
		await run(create);

		assert.deepEqual(item.json, REPORT);
		assert.deepEqual(validate.requests, ['GET /social-accounts', 'POST /social-posts/validate']);
		assert.deepEqual(validate.bodies.validate, create.bodies.create);
	});
});

describe('Post > Create refused for its content', () => {
	const refusal = {
		statusCode: 400,
		error: 'Bad Request',
		code: 'post_validation_failed',
		message: TOO_LONG.message,
		issues: [TOO_LONG],
	};

	it('keeps the message and lists every issue in the description', async () => {
		await assert.rejects(run(createContext({ operation: 'create', refusal })), (error) => {
			assert.equal(error.message, TOO_LONG.message);
			assert.match(error.description, /ERROR TEXT_TOO_LONG \(TWITTER acc-x\): Text exceeds/);
			assert.match(error.description, /Post > Validate/);
			return true;
		});
	});

	it('returns the issues when On Error is Continue', async () => {
		const [[item]] = await run(createContext({ operation: 'create', refusal, continueOnFail: true }));

		assert.equal(item.json.error, TOO_LONG.message);
		assert.equal(item.json.code, 'post_validation_failed');
		assert.deepEqual(item.json.issues, [TOO_LONG]);
	});
});
