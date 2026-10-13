import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

export const PLATFORMS = [
	'FACEBOOK',
	'INSTAGRAM',
	'THREADS',
	'TIKTOK',
	'TWITTER',
	'BLUESKY',
	'LINKEDIN',
	'PINTEREST',
	'YOUTUBE',
	'MASTODON',
	'GOOGLE_BUSINESS',
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
	FACEBOOK: 'Facebook',
	INSTAGRAM: 'Instagram',
	THREADS: 'Threads',
	TIKTOK: 'TikTok',
	TWITTER: 'X (Twitter)',
	BLUESKY: 'Bluesky',
	LINKEDIN: 'LinkedIn',
	PINTEREST: 'Pinterest',
	YOUTUBE: 'YouTube',
	MASTODON: 'Mastodon',
	GOOGLE_BUSINESS: 'Google Business Profile',
};

export interface SocialAccount {
	id: string;
	platform: Platform;
	displayName: string;
	username?: string;
	status: 'active' | 'unauthorized';
	unauthorizedReason?: string;
	pageId?: string;
	supportsInstagramAudio?: boolean;
}

const CONNECTION_ID_FIELD: Record<Exclude<Platform, 'FACEBOOK'>, string> = {
	INSTAGRAM: 'instagramConnectionIds',
	THREADS: 'threadsConnectionIds',
	TIKTOK: 'tiktokConnectionIds',
	TWITTER: 'twitterConnectionIds',
	BLUESKY: 'blueskyConnectionIds',
	LINKEDIN: 'linkedinConnectionIds',
	PINTEREST: 'pinterestConnectionIds',
	YOUTUBE: 'youtubeConnectionIds',
	MASTODON: 'mastodonConnectionIds',
	GOOGLE_BUSINESS: 'googleBusinessConnectionIds',
};

export const connectionField = (platform: Platform): string =>
	platform === 'FACEBOOK' ? 'pageIds' : CONNECTION_ID_FIELD[platform];

export interface PostTargets {
	platforms: Platform[];
	[connectionField: string]: string[];
}

export function groupAccountsByPlatform(
	selectedIds: string[],
	accounts: SocialAccount[],
): PostTargets {
	const byId = new Map(accounts.map((account) => [account.id, account]));
	const targets: PostTargets = { platforms: [] };

	for (const id of selectedIds) {
		const account = byId.get(id);
		if (!account) {
			throw new Error(`Account ${id} is not connected to this AdaptlyPost workspace`);
		}
		if (account.status === 'unauthorized') {
			throw new Error(
				`${account.displayName} (${PLATFORM_LABELS[account.platform]}) is disconnected. Reconnect it in AdaptlyPost or remove it from Accounts.`,
			);
		}
		if (!targets.platforms.includes(account.platform)) {
			targets.platforms.push(account.platform);
		}
		const field = connectionField(account.platform);
		targets[field] = [...(targets[field] ?? []), account.id];
	}

	return targets;
}

const disconnectedLast = (account: SocialAccount) => Number(account.status === 'unauthorized');

export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	return [...(accounts as SocialAccount[])]
		.sort((a, b) => disconnectedLast(a) - disconnectedLast(b))
		.map((account) => {
			const label = `${account.displayName} (${PLATFORM_LABELS[account.platform]})`;
			return account.status === 'unauthorized'
				? {
						name: `${label} - Disconnected`,
						value: account.id,
						description: 'Reconnect this account in AdaptlyPost before posting to it',
					}
				: { name: label, value: account.id };
		});
}

export async function getInstagramAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	const audioFirst = (account: SocialAccount) => Number(!account.supportsInstagramAudio);
	return (accounts as SocialAccount[])
		.filter((account) => account.platform === 'INSTAGRAM')
		.sort((a, b) => audioFirst(a) - audioFirst(b) || disconnectedLast(a) - disconnectedLast(b))
		.map((account) => ({
			name: account.displayName,
			value: account.id,
			description: account.supportsInstagramAudio
				? undefined
				: 'Audio search needs an Instagram account connected through Facebook',
		}));
}

export interface PinterestBoard {
	id: string;
	name: string;
}

export async function getPinterestAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	return (accounts as SocialAccount[])
		.filter((account) => account.platform === 'PINTEREST')
		.sort((a, b) => disconnectedLast(a) - disconnectedLast(b))
		.map((account) =>
			account.status === 'unauthorized'
				? {
						name: `${account.displayName} - Disconnected`,
						value: account.id,
						description: 'Reconnect this account in AdaptlyPost before listing its boards',
					}
				: { name: account.displayName, value: account.id },
		);
}

export async function getPinterestBoards(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const selected = this.getCurrentNodeParameter('accountIds');
	const selectedIds = Array.isArray(selected) ? selected : [];
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	const pinterestAccounts = (accounts as SocialAccount[]).filter(
		(account) => account.platform === 'PINTEREST' && account.status === 'active',
	);
	const chosen = pinterestAccounts.filter((account) => selectedIds.includes(account.id));
	const targets = chosen.length ? chosen : pinterestAccounts;

	const options: INodePropertyOptions[] = [];
	for (const account of targets) {
		const { boards } = await adaptlyPostApiRequest.call(
			this,
			'GET',
			`/social-accounts/${encodeURIComponent(account.id)}/pinterest-boards`,
		);
		for (const board of boards as PinterestBoard[]) {
			options.push({
				name: targets.length > 1 ? `${board.name} (${account.displayName})` : board.name,
				value: board.id,
			});
		}
	}
	return options;
}
