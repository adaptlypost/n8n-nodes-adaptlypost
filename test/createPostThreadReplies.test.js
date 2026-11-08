const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'x-1', platform: 'TWITTER', displayName: 'Brand on X', status: 'active' },
	{ id: 'bs-1', platform: 'BLUESKY', displayName: 'Brand on Bluesky', status: 'active' },
];

const SOURCE_TYPES = {
	'https://example.com/chart.png': 'image/png',
	'https://example.com/loop.gif': 'image/gif',
	'https://example.com/clip.mp4': 'video/mp4',
};

function createContext({ operation = 'create', additionalFields }) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds: ['x-1', 'bs-1'],
		contentType: 'TEXT',
		text: 'A thread about spring',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
	};
	const bodies = {};
	const uploads = [];
	return {
		body: (request) => bodies[request],
		uploads,
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
			httpRequest: async (options) => {
				if (options.method === 'PUT') return {};
				return {
					headers: { 'content-type': SOURCE_TYPES[options.url] },
					body: new ArrayBuffer(4),
				};
			},
			httpRequestWithAuthentication: async (_credential, options) => {
				const request = `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`;
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				if (request === 'POST /upload-urls') {
					const [file] = options.body.files;
					uploads.push(file);
					return {
						urls: [
							{
								uploadUrl: `https://upload.example.com/${file.fileName}`,
								publicUrl: `https://cdn.adaptlypost.com/${file.fileName}`,
							},
						],
					};
				}
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

describe('Post > Create with Thread Replies', () => {
	it('sends one entry per platform with the texts in order and no mediaUrls without images', async () => {
		const context = createContext({
			additionalFields: {
				threadReplies: {
					thread: [
						{
							platform: 'TWITTER',
							replies: { reply: [{ text: 'Part two' }, { text: 'Part three', imageUrls: '' }] },
						},
						{ platform: 'BLUESKY', replies: { reply: [{ text: 'More, with commas, kept whole' }] } },
					],
				},
			},
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts').threadReplies, [
			{ platform: 'TWITTER', texts: ['Part two', 'Part three'] },
			{ platform: 'BLUESKY', texts: ['More, with commas, kept whole'] },
		]);
		assert.equal(context.uploads.length, 0);
	});

	it('uploads reply images one URL per line and sends mediaUrls parallel to texts', async () => {
		const context = createContext({
			operation: 'validate',
			additionalFields: {
				threadReplies: {
					thread: [
						{
							platform: 'TWITTER',
							replies: {
								reply: [
									{ text: 'No image here' },
									{
										text: '',
										imageUrls: ' https://example.com/chart.png \n\nhttps://example.com/loop.gif\n',
									},
								],
							},
						},
					],
				},
			},
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts/validate').threadReplies, [
			{
				platform: 'TWITTER',
				texts: ['No image here', ''],
				mediaUrls: [
					[],
					['https://cdn.adaptlypost.com/chart.png', 'https://cdn.adaptlypost.com/loop.gif'],
				],
			},
		]);
		assert.deepEqual(context.uploads, [
			{ fileName: 'chart.png', mimeType: 'image/png' },
			{ fileName: 'loop.gif', mimeType: 'image/gif' },
		]);
	});

	it('refuses a video on a reply before creating the post', async () => {
		const context = createContext({
			additionalFields: {
				threadReplies: {
					thread: [
						{
							platform: 'BLUESKY',
							replies: { reply: [{ text: 'Watch', imageUrls: 'https://example.com/clip.mp4' }] },
						},
					],
				},
			},
		});

		await assert.rejects(execute(context), /A thread reply takes JPEG, PNG, GIF or WebP images/);
		assert.equal(context.body('POST /social-posts'), undefined);
	});

	it('leaves threadReplies out when no thread is added', async () => {
		const context = createContext({ additionalFields: {} });

		await execute(context);

		assert.equal('threadReplies' in context.body('POST /social-posts'), false);
	});
});
