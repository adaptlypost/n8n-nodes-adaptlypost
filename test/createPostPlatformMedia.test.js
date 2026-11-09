const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'tt-1', platform: 'TIKTOK', displayName: 'Brand on TikTok', status: 'active' },
	{ id: 'x-1', platform: 'TWITTER', displayName: 'Brand on X', status: 'active' },
	{ id: 'yt-1', platform: 'YOUTUBE', displayName: 'Brand on YouTube', status: 'active' },
];

const SOURCE_TYPES = {
	'https://example.com/long.mp4': 'video/mp4',
	'https://example.com/short.mp4': 'video/mp4',
	'https://example.com/one.png': 'image/png',
	'https://example.com/two,final.png': 'image/png',
};

function createContext({ operation = 'create', contentType = 'VIDEO', additionalFields }) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds: ['tt-1', 'x-1', 'yt-1'],
		contentType,
		text: 'Spring launch',
		mediaUrls: 'https://example.com/long.mp4',
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

describe('Post > Create with Platform Media', () => {
	it('uploads each entry one URL per line and sends it as platformMedia', async () => {
		const context = createContext({
			additionalFields: {
				platformMedia: {
					media: [
						{ platform: 'TIKTOK', mediaUrls: ' https://example.com/short.mp4 \n\n' },
					],
				},
			},
		});

		await execute(context);

		const body = context.body('POST /social-posts');
		assert.deepEqual(body.mediaUrls, ['https://cdn.adaptlypost.com/long.mp4']);
		assert.deepEqual(body.platformMedia, [
			{ platform: 'TIKTOK', mediaUrls: ['https://cdn.adaptlypost.com/short.mp4'] },
		]);
	});

	it('keeps commas inside URLs and alt texts and keeps empty alt text lines in place', async () => {
		const context = createContext({
			operation: 'validate',
			contentType: 'CAROUSEL',
			additionalFields: {
				platformMedia: {
					media: [
						{
							platform: 'TWITTER',
							mediaUrls: 'https://example.com/one.png\nhttps://example.com/two,final.png',
							mediaAltTexts: '\nA red bicycle, leaning on a wall\n',
						},
					],
				},
			},
		});

		await execute(context);

		assert.deepEqual(context.body('POST /social-posts/validate').platformMedia, [
			{
				platform: 'TWITTER',
				mediaUrls: [
					'https://cdn.adaptlypost.com/one.png',
					'https://cdn.adaptlypost.com/two,final.png',
				],
				mediaAltTexts: ['', 'A red bicycle, leaning on a wall'],
			},
		]);
	});

	it('refuses an entry without Media URLs before creating the post', async () => {
		const context = createContext({
			additionalFields: {
				platformMedia: { media: [{ platform: 'YOUTUBE', mediaUrls: '\n  \n' }] },
			},
		});

		await assert.rejects(execute(context), /Add Media URLs to the YOUTUBE platform media/);
		assert.equal(context.body('POST /social-posts'), undefined);
	});

	it('leaves platformMedia out when no entry is added', async () => {
		const context = createContext({ additionalFields: {} });

		await execute(context);

		assert.equal('platformMedia' in context.body('POST /social-posts'), false);
	});
});
