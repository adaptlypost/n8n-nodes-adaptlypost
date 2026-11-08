const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'th-1', platform: 'THREADS', displayName: 'acme', status: 'active' },
	{ id: 'tt-1', platform: 'TIKTOK', displayName: 'acme.tt', status: 'active' },
	{ id: 'yt-1', platform: 'YOUTUBE', displayName: 'Acme TV', status: 'active' },
	{ id: 'x-1', platform: 'TWITTER', displayName: 'acme', status: 'active' },
	{ id: 'li-1', platform: 'LINKEDIN', displayName: 'Acme Inc', status: 'active' },
	{ id: 'fb-1', platform: 'FACEBOOK', displayName: 'Acme', pageId: 'page-1', status: 'active' },
];

const COVER = 'data:image/png;base64,iVBORw0KGgo=';

function createContext({ accountIds, contentType = 'TEXT', additionalFields = {}, operation = 'create' }) {
	const parameters = {
		resource: 'post',
		operation,
		accountIds,
		contentType,
		text: 'Launch day',
		mediaUrls: '',
		additionalFields,
		recurrence: {},
		postId: 'post-1',
	};
	const calls = [];
	return {
		calls,
		postBody: () => calls.find((call) => call.request === 'POST /social-posts')?.body,
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
				calls.push({ request, body: options.body === undefined ? undefined : JSON.parse(JSON.stringify(options.body)) });
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				return { postId: 'post-1', isScheduled: false };
			},
		},
	};
}

const execute = (context) => AdaptlyPost.prototype.execute.call(context);

describe('Post > Create platform options', () => {
	it('sends a Threads first comment and platform texts', async () => {
		const context = createContext({
			accountIds: ['th-1', 'x-1'],
			additionalFields: {
				firstComments: { comment: [{ platform: 'THREADS', text: 'Link in the replies' }] },
				platformTexts: { text: [{ platform: 'TWITTER', text: 'Short version' }] },
			},
		});

		await execute(context);

		assert.deepEqual(context.postBody().firstComments, [{ platform: 'THREADS', text: 'Link in the replies' }]);
		assert.deepEqual(context.postBody().platformTexts, [{ platform: 'TWITTER', text: 'Short version' }]);
	});

	it('sends every TikTok option that was added, false included', async () => {
		const context = createContext({
			accountIds: ['tt-1'],
			contentType: 'VIDEO',
			additionalFields: {
				tiktokPrivacyLevel: 'SELF_ONLY',
				tiktokTitle: 'Behind the scenes',
				tiktokCaption: 'How we built it',
				tiktokAllowComments: false,
				tiktokAllowDuet: true,
				tiktokSendAsDraft: true,
				tiktokAiGenerated: true,
				tiktokBrandedContent: true,
				tiktokBrandedContentOwnBrand: true,
			},
		});

		await execute(context);

		assert.deepEqual(context.postBody().tiktokConfigs, [
			{
				connectionId: 'tt-1',
				privacyLevel: 'SELF_ONLY',
				title: 'Behind the scenes',
				caption: 'How we built it',
				allowComments: false,
				allowDuet: true,
				sendAsDraft: true,
				aiGenerated: true,
				brandedContent: true,
				brandedContentOwnBrand: true,
			},
		]);
	});

	it('sends the YouTube options, the X quote, the LinkedIn reshare and the Facebook video title', async () => {
		const context = createContext({
			accountIds: ['yt-1', 'x-1', 'li-1', 'fb-1'],
			contentType: 'VIDEO',
			additionalFields: {
				youtubeTags: 'launch\n\nproduct \n',
				youtubeLicense: 'creativeCommon',
				youtubeMadeForKids: false,
				youtubeScheduleOnYouTube: true,
				youtubeNotifySubscribers: false,
				youtubeAllowEmbedding: true,
				youtubeCategoryId: '28',
				youtubePlaylistId: 'PL123',
				twitterQuoteOf: 'https://x.com/acme/status/1',
				linkedinReshareOf: 'urn:li:share:7',
				facebookVideoTitle: 'Launch',
				thumbnailUrl: COVER,
				thumbnailTimestampMs: 1500,
			},
		});

		await execute(context);

		const body = context.postBody();
		assert.deepEqual(body.youtubeConfigs, [
			{
				connectionId: 'yt-1',
				tags: ['launch', 'product'],
				license: 'creativeCommon',
				notifySubscribers: false,
				allowEmbedding: true,
				madeForKids: false,
				scheduleOnYouTube: true,
				categoryId: '28',
				playlistId: 'PL123',
			},
		]);
		assert.deepEqual(body.twitterConfigs, [{ connectionId: 'x-1', quoteOf: 'https://x.com/acme/status/1' }]);
		assert.deepEqual(body.linkedinConfigs, [{ connectionId: 'li-1', reshareOf: 'urn:li:share:7' }]);
		assert.deepEqual(body.facebookConfigs, [{ pageId: 'fb-1', videoTitle: 'Launch' }]);
		assert.equal(body.thumbnailUrl, COVER);
		assert.equal(body.thumbnailTimestampMs, 1500);
	});
});

describe('Post > Retry Failed Platforms', () => {
	it('sends the listed platforms as platformIds', async () => {
		const context = createContext({ operation: 'retry', accountIds: [] });
		context.getNodeParameter = (name, _itemIndex, fallback) =>
			({ resource: 'post', operation: 'retry', postId: 'post-1', retryPlatformIds: 'BLUESKY\n pp-2 \n' })[name] ??
			fallback;

		await execute(context);

		assert.deepEqual(context.calls, [
			{ request: 'POST /social-posts/post-1/retry', body: { platformIds: ['BLUESKY', 'pp-2'] } },
		]);
	});

	it('sends an empty body when no platform is listed', async () => {
		const context = createContext({ operation: 'retry', accountIds: [] });

		await execute(context);

		assert.deepEqual(context.calls, [{ request: 'POST /social-posts/post-1/retry', body: {} }]);
	});
});
