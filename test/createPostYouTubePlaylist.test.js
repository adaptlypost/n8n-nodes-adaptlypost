const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { AdaptlyPost } = require('../dist/nodes/AdaptlyPost/AdaptlyPost.node.js');

const API_PREFIX = '/post/api/v1';

const ACCOUNTS = [
	{ id: 'yt-main', platform: 'YOUTUBE', displayName: 'Main channel', status: 'active' },
	{ id: 'yt-clips', platform: 'YOUTUBE', displayName: 'Clips', status: 'active' },
	{ id: 'yt-old', platform: 'YOUTUBE', displayName: 'Old channel', status: 'unauthorized' },
	{ id: 'li-1', platform: 'LINKEDIN', displayName: 'Company', status: 'active' },
];

const PLAYLISTS = {
	'yt-main': [
		{ id: 'PL-launch', title: 'Launches', privacyStatus: 'public', itemCount: 12 },
		{ id: 'PL-drafts', title: 'Drafts', privacyStatus: 'private', itemCount: 1 },
	],
	'yt-clips': [{ id: 'PL-shorts', title: 'Shorts', privacyStatus: 'unlisted' }],
	'yt-old': [{ id: 'PL-gone', title: 'Gone' }],
};

function createContext(accountIds) {
	const requests = [];
	return {
		requests,
		getCurrentNodeParameter: (name) => (name === 'accountIds' ? accountIds : undefined),
		getNode: () => ({
			id: 'node-1',
			name: 'AdaptlyPost',
			type: 'n8n-nodes-adaptlypost.adaptlyPost',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				const request = `${options.method} ${new URL(options.url).pathname.slice(API_PREFIX.length)}`;
				requests.push(request);
				if (request === 'GET /social-accounts') return { accounts: ACCOUNTS };
				const playlists = /^GET \/social-accounts\/([^/]+)\/youtube-playlists$/.exec(request);
				if (playlists) return { playlists: PLAYLISTS[decodeURIComponent(playlists[1])] };
				throw new Error(`Unexpected request ${request}`);
			},
		},
	};
}

const loadPlaylists = (context) =>
	new AdaptlyPost().methods.loadOptions.getYouTubePlaylists.call(context);

describe('YouTube playlists', () => {
	it('lists the playlists of the selected channel by title, with privacy and video count', async () => {
		const context = createContext(['yt-main', 'li-1']);

		assert.deepEqual(await loadPlaylists(context), [
			{ name: 'Launches', value: 'PL-launch', description: 'Public playlist, 12 videos' },
			{ name: 'Drafts', value: 'PL-drafts', description: 'Private playlist, 1 video' },
		]);
		assert.ok(!context.requests.includes('GET /social-accounts/yt-clips/youtube-playlists'));
	});

	it('names each playlist after its channel when several channels are selected', async () => {
		const context = createContext(['yt-main', 'yt-clips']);

		assert.deepEqual(await loadPlaylists(context), [
			{ name: 'Launches (Main channel)', value: 'PL-launch', description: 'Public playlist, 12 videos' },
			{ name: 'Drafts (Main channel)', value: 'PL-drafts', description: 'Private playlist, 1 video' },
			{ name: 'Shorts (Clips)', value: 'PL-shorts', description: 'Unlisted playlist' },
		]);
	});

	it('lists every connected channel when no YouTube account is selected, skipping disconnected ones', async () => {
		const context = createContext(['li-1']);

		const playlists = await loadPlaylists(context);

		assert.deepEqual(
			playlists.map((playlist) => playlist.value),
			['PL-launch', 'PL-drafts', 'PL-shorts'],
		);
		assert.ok(!context.requests.includes('GET /social-accounts/yt-old/youtube-playlists'));
	});
});
