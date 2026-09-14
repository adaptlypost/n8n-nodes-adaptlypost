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
};

export interface SocialAccount {
	id: string;
	platform: Platform;
	displayName: string;
	username?: string;
	status: 'active' | 'unauthorized';
	pageId?: string;
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
		if (!targets.platforms.includes(account.platform)) {
			targets.platforms.push(account.platform);
		}
		const field = connectionField(account.platform);
		targets[field] = [...(targets[field] ?? []), account.id];
	}

	return targets;
}

export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	return (accounts as SocialAccount[]).map((account) => ({
		name: `${account.displayName} (${PLATFORM_LABELS[account.platform]})`,
		value: account.id,
	}));
}
