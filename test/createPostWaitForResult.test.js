const assert = require('node:assert/strict');
const { afterEach, beforeEach, describe, it, mock } = require('node:test');
const { NodeOperationError } = require('n8n-workflow');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');
const {
	DEFAULT_WAIT_TIMEOUT_SECONDS,
	POLL_INTERVAL_MS,
} = require('../dist/nodes/AdaptlyPost/postResults.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'acc-tiktok', platform: 'TIKTOK', displayName: 'radiogyan', status: 'active' },
	{ id: 'acc-linkedin', platform: 'LINKEDIN', displayName: 'Radio Gyan', status: 'active' },
];

const CREATED = {
	postId: 'post-1',
	queuedPlatforms: ['TIKTOK', 'LINKEDIN'],
	skippedPlatforms: [],
	isScheduled: false,
};

const FRAME_RATE_ERROR = 'TikTok needs a video between 23 and 60 frames per second';

const tiktok = (status, errorMessage) => ({
	platformId: 'platform-tiktok',
	platform: 'TIKTOK',
	accountName: 'radiogyan',
	status,
	errorMessage,
});

const linkedin = (status) => ({
	platformId: 'platform-linkedin',
	platform: 'LINKEDIN',
	accountName: 'Radio Gyan',
	status,
	platformPostId: status === 'PUBLISHED' ? 'urn:li:share:1' : undefined,
});

const outcome = (status, results) => ({ postId: 'post-1', status, results });

const PUBLISHING = outcome('PUBLISHING', [tiktok('PUBLISHING'), linkedin('PUBLISHING')]);
const COMPLETED = outcome('COMPLETED', [tiktok('PUBLISHED'), linkedin('PUBLISHED')]);
const FAILED = outcome('FAILED', [tiktok('FAILED', FRAME_RATE_ERROR), linkedin('FAILED')]);
const PARTIAL_FAILURE = outcome('PARTIAL_FAILURE', [
	tiktok('FAILED', FRAME_RATE_ERROR),
	linkedin('PUBLISHED'),
]);

function createContext({
	additionalFields = {},
	created = CREATED,
	outcomes = [],
	continueOnFail = false,
}) {
	const parameters = {
		resource: 'post',
		operation: 'create',
		accountIds: ACCOUNTS.map((account) => account.id),
		contentType: 'TEXT',
		text: 'Hello',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	const remaining = [...outcomes];
	const requests = [];
	const respond = (request) => {
		if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
		if (request === 'POST /social-posts') return created;
		if (request === 'GET /social-posts/post-1/results') {
			return remaining.length > 1 ? remaining.shift() : remaining[0];
		}
		throw new Error(`Unexpected request ${request}`);
	};
	return {
		requests,
		polls: () => requests.filter((request) => request.endsWith('/results')).length,
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
				return respond(request);
			},
		},
	};
}

async function execute(context) {
	let settled = false;
	const run = AdaptlyPost.prototype.execute.call(context).finally(() => {
		settled = true;
	});
	run.catch(() => {});
	while (true) {
		await new Promise((resolve) => setImmediate(resolve));
		if (settled) return run;
		mock.timers.tick(POLL_INTERVAL_MS);
	}
}

const firstItem = async (context) => (await execute(context))[0][0];

describe('Post > Create with Wait for Result', () => {
	beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'] }));
	afterEach(() => mock.timers.reset());

	it('returns the create response without polling when the option is off', async () => {
		const context = createContext({ outcomes: [FAILED] });

		const item = await firstItem(context);

		assert.deepEqual(item.json, CREATED);
		assert.deepEqual(context.requests, ['GET /social-accounts', 'POST /social-posts']);
	});

	it('adds the status and results to the create response once the post completes', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [outcome('PENDING', []), PUBLISHING, COMPLETED],
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, {
			...CREATED,
			status: 'COMPLETED',
			results: COMPLETED.results,
		});
		assert.equal(item.error, undefined);
		assert.equal(context.polls(), 3);
	});

	it('fails with every failed account and its platform error', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [PUBLISHING, FAILED],
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(
				error.message,
				`Publishing failed on TikTok (radiogyan): ${FRAME_RATE_ERROR}; LinkedIn (Radio Gyan)`,
			);
			assert.match(error.description, /Post post-1 ended as FAILED\./);
			assert.deepEqual(error.output.results, FAILED.results);
			return true;
		});
	});

	it('fails on a partial failure and names only the failed account', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [PARTIAL_FAILURE],
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(error.message, `Publishing failed on TikTok (radiogyan): ${FRAME_RATE_ERROR}`);
			assert.match(error.description, /Post post-1 ended as PARTIAL_FAILURE\./);
			assert.match(error.description, /TikTok \(radiogyan\): FAILED\./);
			assert.match(error.description, /LinkedIn \(Radio Gyan\): PUBLISHED\./);
			return true;
		});
	});

	it('fails with the post ID when the post is still publishing at the timeout', async () => {
		const waitTimeout = 20;
		const context = createContext({
			additionalFields: { waitForResult: true, waitTimeout },
			outcomes: [PUBLISHING],
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(error.message, 'Post post-1 is still publishing after 20 seconds');
			assert.match(error.description, /Get Results/);
			return true;
		});
		assert.equal(context.polls(), (waitTimeout * 1000) / POLL_INTERVAL_MS);
	});

	it('fails without polling when the create response has no post ID', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			created: { ...CREATED, postId: undefined },
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.match(error.message, /no post ID/);
			return true;
		});
		assert.ok(!context.requests.some((request) => request.includes('/results')));
	});

	it('waits for the default timeout when none is set', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [PUBLISHING],
		});

		await assert.rejects(execute(context), {
			message: `Post post-1 is still publishing after ${DEFAULT_WAIT_TIMEOUT_SECONDS} seconds`,
		});
		assert.equal(context.polls(), (DEFAULT_WAIT_TIMEOUT_SECONDS * 1000) / POLL_INTERVAL_MS);
	});

	it('returns a draft right away', async () => {
		const created = { ...CREATED, queuedPlatforms: [] };
		const context = createContext({
			additionalFields: { waitForResult: true, saveAsDraft: true },
			created,
			outcomes: [outcome('DRAFT', [])],
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, created);
		assert.equal(context.polls(), 0);
	});

	it('returns a scheduled post right away', async () => {
		const created = { ...CREATED, isScheduled: true, scheduledAt: '2030-01-01T10:00:00.000Z' };
		const context = createContext({
			additionalFields: { waitForResult: true, scheduledAt: '2030-01-01T10:00:00.000Z' },
			created,
			outcomes: [outcome('SCHEDULED', [])],
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, created);
		assert.equal(context.polls(), 0);
	});

	it('adds the reported status when the results report a post that is not publishing', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [outcome('SCHEDULED', [])],
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, { ...CREATED, status: 'SCHEDULED', results: [] });
		assert.equal(context.polls(), 1);
	});

	it('fails on a status it does not know instead of reporting success', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [outcome('ARCHIVED', [tiktok('PUBLISHED')])],
		});

		await assert.rejects(execute(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(error.message, 'Post post-1 reported an unknown status: ARCHIVED');
			return true;
		});
	});

	it('returns the results with the error when the node continues on fail', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true },
			outcomes: [PARTIAL_FAILURE],
			continueOnFail: true,
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, {
			error: `Publishing failed on TikTok (radiogyan): ${FRAME_RATE_ERROR}`,
			...CREATED,
			status: 'PARTIAL_FAILURE',
			results: PARTIAL_FAILURE.results,
		});
		assert.ok(item.error instanceof NodeOperationError);
		assert.deepEqual(item.pairedItem, { item: 0 });
	});

	it('returns the last results with the timeout error when the node continues on fail', async () => {
		const context = createContext({
			additionalFields: { waitForResult: true, waitTimeout: 10 },
			outcomes: [PUBLISHING],
			continueOnFail: true,
		});

		const item = await firstItem(context);

		assert.deepEqual(item.json, {
			error: 'Post post-1 is still publishing after 10 seconds',
			...CREATED,
			status: 'PUBLISHING',
			results: PUBLISHING.results,
		});
		assert.ok(item.error instanceof NodeOperationError);
	});
});
