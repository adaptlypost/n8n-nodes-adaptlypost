import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	connectionField,
	getAccounts,
	getInstagramAccounts,
	getPinterestAccounts,
	getPinterestBoards,
	groupAccountsByPlatform,
	type PinterestBoard,
	type Platform,
	type SocialAccount,
} from './accounts';
import { uploadMediaFromUrl } from './media';
import { postProperties } from './post.properties';
import { DEFAULT_WAIT_TIMEOUT_SECONDS, PostResultError, waitForPostResults } from './postResults';
import { analyticsProperties } from './analytics.properties';
import { recurringPostProperties } from './recurringPost.properties';
import { adaptlyPostApiRequest, describeApiError, readApiErrorBody } from './transport';

const asLines = (value: unknown): string[] => {
	const lines = String(value ?? '')
		.split('\n')
		.map((line) => line.trim());
	while (lines.length > 0 && !lines[lines.length - 1]) lines.pop();
	return lines;
};

const asList = (value: unknown): string[] =>
	Array.isArray(value)
		? value.map(String)
		: String(value ?? '')
				.split(/[\n,]/)
				.map((entry) => entry.trim())
				.filter(Boolean);

export class AdaptlyPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AdaptlyPost',
		name: 'adaptlyPost',
		icon: { light: 'file:../../icons/adaptlypost.svg', dark: 'file:../../icons/adaptlypost.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule and publish social posts with AdaptlyPost',
		defaults: {
			name: 'AdaptlyPost',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'adaptlyPostApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Post', value: 'post' },
					{ name: 'Recurring Post', value: 'recurringPost' },
				],
				default: 'post',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many accounts',
						description: 'List the social accounts connected to the workspace',
					},
					{
						name: 'Get Pinterest Boards',
						value: 'getPinterestBoards',
						action: 'Get pinterest boards',
						description:
							'List the boards of a Pinterest account, secret boards included. Use a board ID as Pinterest Board when creating a post.',
					},
					{
						name: 'Remove',
						value: 'remove',
						action: 'Remove an account',
						description:
							'Disconnect an account from the workspace, disconnected ones included. Pending and recurring posts stop publishing to it. To bring it back, connect it again in AdaptlyPost.',
					},
					{
						name: 'Search Instagram Audio',
						value: 'searchInstagramAudio',
						action: 'Search instagram audio',
						description:
							'Find music or original sounds to add to an Instagram Reel. Returns only audio Meta has cleared for publishing from other apps, which can differ from what the Instagram app shows.',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Instagram Account Name or ID',
				name: 'instagramAccountId',
				type: 'options',
				required: true,
				default: '',
				typeOptions: { loadOptionsMethod: 'getInstagramAccounts' },
				displayOptions: { show: { resource: ['account'], operation: ['searchInstagramAudio'] } },
				description:
					'Instagram account connected through Facebook. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Pinterest Account Name or ID',
				name: 'pinterestAccountId',
				type: 'options',
				required: true,
				default: '',
				typeOptions: { loadOptionsMethod: 'getPinterestAccounts' },
				displayOptions: { show: { resource: ['account'], operation: ['getPinterestBoards'] } },
				description:
					'Pinterest account to list boards for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Account Name or ID',
				name: 'accountId',
				type: 'options',
				required: true,
				default: '',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				displayOptions: { show: { resource: ['account'], operation: ['remove'] } },
				description:
					'Account to disconnect, such as the account ID from the Account Disconnected trigger, or a Facebook page ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Audio Type',
				name: 'audioType',
				type: 'options',
				options: [
					{ name: 'Music', value: 'music' },
					{ name: 'Original Sound', value: 'original_sound' },
				],
				default: 'music',
				displayOptions: { show: { resource: ['account'], operation: ['searchInstagramAudio'] } },
			},
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['account'], operation: ['searchInstagramAudio'] } },
				description: 'Keyword filter, up to 100 characters. Leave empty for trending audio.',
			},
			...postProperties,
			...analyticsProperties,
			...recurringPostProperties,
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
			getInstagramAccounts,
			getPinterestAccounts,
			getPinterestBoards,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await runOperation.call(this, resource, operation, i);
				const rows = Array.isArray(result) ? result : [result];
				returnData.push(
					...rows.map((json) => ({ json: json as IDataObject, pairedItem: { item: i } })),
				);
			} catch (error) {
				const apiError = readApiErrorBody(error);
				if (this.continueOnFail()) {
					if (error instanceof PostResultError) {
						returnData.push({
							json: { error: error.message, ...error.output },
							error,
							pairedItem: { item: i },
						});
						continue;
					}
					returnData.push({
						json: {
							error: apiError?.message || (error as Error).message,
							...(apiError && {
								code: apiError.code,
								requiredPermission: apiError.requiredPermission,
								role: apiError.role,
								keyRole: apiError.keyRole,
								issuerRole: apiError.issuerRole,
								issues: apiError.issues,
							}),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				if (apiError?.code === 'post_validation_failed') {
					throw new NodeOperationError(this.getNode(), apiError.message, {
						itemIndex: i,
						description: describeApiError(apiError),
					});
				}
				throw error instanceof NodeOperationError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject, {
							itemIndex: i,
							...(apiError && {
								httpCode: String(apiError.statusCode),
								message: apiError.message,
								description: describeApiError(apiError),
							}),
						});
			}
		}

		return [returnData];
	}
}

async function runOperation(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (resource === 'account') {
		if (operation === 'searchInstagramAudio') {
			const accountId = this.getNodeParameter('instagramAccountId', i) as string;
			const { audio } = await adaptlyPostApiRequest.call(
				this,
				'GET',
				`/social-accounts/${encodeURIComponent(accountId)}/instagram-audio`,
				undefined,
				{
					audioType: this.getNodeParameter('audioType', i),
					searchQuery: this.getNodeParameter('searchQuery', i, '') || undefined,
				},
			);
			return audio as IDataObject[];
		}
		if (operation === 'getPinterestBoards') {
			const accountId = this.getNodeParameter('pinterestAccountId', i) as string;
			const { boards } = await adaptlyPostApiRequest.call(
				this,
				'GET',
				`/social-accounts/${encodeURIComponent(accountId)}/pinterest-boards`,
			);
			return boards as IDataObject[];
		}
		if (operation === 'remove') {
			const accountId = this.getNodeParameter('accountId', i) as string;
			return adaptlyPostApiRequest.call(
				this,
				'DELETE',
				`/social-accounts/${encodeURIComponent(accountId)}`,
			);
		}
		const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
		return accounts as IDataObject[];
	}

	if (resource === 'analytics') {
		return runAnalytics.call(this, operation, i);
	}

	if (resource === 'recurringPost') {
		return runRecurringPost.call(this, operation, i);
	}

	switch (operation) {
		case 'create':
			return createPost.call(this, i);
		case 'validate':
			return validatePost.call(this, i);
		case 'get':
			return adaptlyPostApiRequest.call(
				this,
				'GET',
				`/social-posts/${this.getNodeParameter('postId', i)}`,
			);
		case 'getAll': {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
			const limit = returnAll ? 100 : (this.getNodeParameter('limit', i) as number);
			const posts: IDataObject[] = [];
			let offset = 0;
			while (true) {
				const page = await adaptlyPostApiRequest.call(this, 'GET', '/social-posts', undefined, {
					...filters,
					limit: Math.min(limit - posts.length, 100),
					offset,
				});
				posts.push(...(page.posts as IDataObject[]));
				offset += (page.posts as IDataObject[]).length;
				if (!page.hasMore || (!returnAll && posts.length >= limit)) break;
			}
			return posts;
		}
		case 'getResults':
			return adaptlyPostApiRequest.call(
				this,
				'GET',
				`/social-posts/${this.getNodeParameter('postId', i)}/results`,
			);
		case 'publishDraft':
			return adaptlyPostApiRequest.call(
				this,
				'POST',
				`/social-posts/${this.getNodeParameter('postId', i)}/publish`,
				{
					scheduledAt: this.getNodeParameter('scheduledAt', i, '') || undefined,
					timezone: this.getNodeParameter('timezone', i, 'UTC') || 'UTC',
				},
			);
		case 'retry':
			return adaptlyPostApiRequest.call(
				this,
				'POST',
				`/social-posts/${this.getNodeParameter('postId', i)}/retry`,
				{},
			);
		case 'unschedule':
			return adaptlyPostApiRequest.call(
				this,
				'POST',
				`/social-posts/${this.getNodeParameter('postId', i)}/unschedule`,
				{},
			);
		case 'delete':
			return adaptlyPostApiRequest.call(
				this,
				'DELETE',
				`/social-posts/${this.getNodeParameter('postId', i)}`,
			);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
	}
}

const GRANULARITY: Record<string, string> = {
	DAY: 'DAILY',
	WEEK: 'WEEKLY',
	MONTH: 'MONTHLY',
};

async function runAnalytics(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const range: IDataObject = {
		from: this.getNodeParameter('from', i),
		to: this.getNodeParameter('to', i),
	};
	if (operation === 'platformBreakdown') {
		return adaptlyPostApiRequest.call(
			this,
			'GET',
			'/analytics/platform-breakdown',
			undefined,
			range,
		);
	}
	const qs: IDataObject = { ...range, platforms: this.getNodeParameter('platforms', i, []) };
	switch (operation) {
		case 'overview':
			return adaptlyPostApiRequest.call(this, 'GET', '/analytics/overview', undefined, qs);
		case 'timeseries': {
			const interval = this.getNodeParameter('interval', i) as string;
			return adaptlyPostApiRequest.call(this, 'GET', '/analytics/timeseries', undefined, {
				...qs,
				granularity: GRANULARITY[interval] ?? interval,
			});
		}
		case 'posts': {
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const limit = returnAll ? 100 : Math.min(this.getNodeParameter('limit', i) as number, 100);
			const sortBy = this.getNodeParameter('sortBy', i);
			const posts: IDataObject[] = [];
			for (let page = 1; ; page++) {
				const result = await adaptlyPostApiRequest.call(this, 'GET', '/analytics/posts', undefined, {
					...qs,
					sortBy,
					page,
					limit,
				});
				posts.push(...(result.posts as IDataObject[]));
				if (!returnAll || !result.hasMore) break;
			}
			return posts;
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
	}
}

async function runRecurringPost(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const limit = returnAll ? 100 : (this.getNodeParameter('limit', i) as number);
		const recurringPosts: IDataObject[] = [];
		let offset = 0;
		while (true) {
			const page = await adaptlyPostApiRequest.call(this, 'GET', '/recurring-posts', undefined, {
				...filters,
				limit: Math.min(limit - recurringPosts.length, 100),
				offset,
			});
			recurringPosts.push(...(page.recurringPosts as IDataObject[]));
			offset += (page.recurringPosts as IDataObject[]).length;
			if (!page.hasMore || (!returnAll && recurringPosts.length >= limit)) break;
		}
		return recurringPosts;
	}

	const path = `/recurring-posts/${this.getNodeParameter('recurringPostId', i)}`;
	switch (operation) {
		case 'get':
			return adaptlyPostApiRequest.call(this, 'GET', path);
		case 'pause':
			return adaptlyPostApiRequest.call(this, 'POST', `${path}/pause`, {});
		case 'resume':
			return adaptlyPostApiRequest.call(this, 'POST', `${path}/resume`, {});
		case 'delete':
			return adaptlyPostApiRequest.call(this, 'DELETE', path);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
	}
}

function readRecurrence(this: IExecuteFunctions, i: number): IDataObject | undefined {
	const repeat = this.getNodeParameter('recurrence', i, {}) as IDataObject;
	if (Object.keys(repeat).length === 0) return undefined;
	if (!repeat.frequency) {
		throw new NodeOperationError(this.getNode(), 'Choose how often the post repeats', {
			itemIndex: i,
		});
	}
	if (repeat.ends === 'onDate' && !repeat.endsOn) {
		throw new NodeOperationError(this.getNode(), 'Add an End Date or choose another Ends option', {
			itemIndex: i,
		});
	}
	if (repeat.ends === 'afterCount' && !repeat.maxOccurrences) {
		throw new NodeOperationError(
			this.getNode(),
			'Add a Number of Posts or choose another Ends option',
			{ itemIndex: i },
		);
	}
	const weekdays = repeat.frequency === 'WEEKLY' ? asList(repeat.weekdays) : [];
	return {
		frequency: repeat.frequency,
		interval: repeat.interval,
		weekdays: weekdays.length ? weekdays : undefined,
		endsOn: repeat.ends === 'onDate' ? String(repeat.endsOn).slice(0, 10) : undefined,
		maxOccurrences: repeat.ends === 'afterCount' ? repeat.maxOccurrences : undefined,
	};
}

const fixedCollectionEntries = (value: unknown, key: string): IDataObject[] => {
	const entries = (value as IDataObject | undefined)?.[key];
	if (!entries) return [];
	return (Array.isArray(entries) ? entries : [entries]) as IDataObject[];
};

const googleBusinessConfig = (connectionId: string, settings: IDataObject): IDataObject => {
	const topicType = (settings.topicType as string) || 'STANDARD';
	const hasEvent = topicType === 'EVENT' || topicType === 'OFFER';
	const isOffer = topicType === 'OFFER';
	const callToActionType = (settings.callToActionType as string) || undefined;
	return {
		connectionId,
		topicType,
		callToActionType,
		callToActionUrl:
			callToActionType && callToActionType !== 'CALL'
				? settings.callToActionUrl || undefined
				: undefined,
		eventTitle: hasEvent ? settings.eventTitle || undefined : undefined,
		eventStart: hasEvent ? settings.eventStart || undefined : undefined,
		eventEnd: hasEvent ? settings.eventEnd || undefined : undefined,
		offerCouponCode: isOffer ? settings.offerCouponCode || undefined : undefined,
		offerRedeemUrl: isOffer ? settings.offerRedeemUrl || undefined : undefined,
		offerTerms: isOffer ? settings.offerTerms || undefined : undefined,
	};
};

function readInstagramAudio(
	this: IExecuteFunctions,
	options: IDataObject,
	i: number,
): IDataObject | undefined {
	const audio = fixedCollectionEntries(options.instagramAudio, 'audio')[0];
	if (!audio) return undefined;
	if (!audio.audioId) {
		throw new NodeOperationError(
			this.getNode(),
			'Instagram Audio needs an Audio ID. Find one with Account > Search Instagram Audio.',
			{ itemIndex: i },
		);
	}
	return {
		audioId: audio.audioId,
		title: audio.title || undefined,
		artist: audio.artist || undefined,
		audioVolume: audio.audioVolume ?? undefined,
		videoVolume: audio.videoVolume ?? undefined,
	};
}

function readInstagramUserTags(
	this: IExecuteFunctions,
	options: IDataObject,
	i: number,
): IDataObject[] {
	const position = (value: unknown, axis: 'X' | 'Y', username: string): number | undefined => {
		const text = String(value ?? '').trim();
		if (!text) return undefined;
		const coordinate = Number(text);
		if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) {
			throw new NodeOperationError(
				this.getNode(),
				`Instagram User Tags: ${axis} of ${username} must be a number from 0 to 1`,
				{ itemIndex: i },
			);
		}
		return coordinate;
	};
	return fixedCollectionEntries(options.instagramUserTags, 'tag').flatMap((tag) => {
		const username = String(tag.username ?? '').trim();
		if (!username) return [];
		return [
			{
				username,
				x: position(tag.x, 'X', username),
				y: position(tag.y, 'Y', username),
			},
		];
	});
}

function readTumblrTags(this: IExecuteFunctions, options: IDataObject, i: number): string[] {
	const tags = asLines(options.tumblrTags ?? '').filter(Boolean);
	const withComma = tags.find((tag) => tag.includes(','));
	if (withComma) {
		throw new NodeOperationError(
			this.getNode(),
			`Tumblr Tags take one tag per line, without commas: "${withComma}"`,
			{ itemIndex: i },
		);
	}
	return tags;
}

async function readPlatformThumbnails(
	this: IExecuteFunctions,
	options: IDataObject,
	i: number,
): Promise<IDataObject[]> {
	const thumbnails: IDataObject[] = [];
	for (const entry of fixedCollectionEntries(options.platformThumbnails, 'thumbnail')) {
		if (entry.source === 'frame') {
			thumbnails.push({
				platform: entry.platform,
				thumbnailTimestampMs: entry.thumbnailTimestampMs ?? 0,
			});
			continue;
		}
		const url = String(entry.thumbnailUrl ?? '').trim();
		if (!url) {
			throw new NodeOperationError(
				this.getNode(),
				`Add an Image URL to the ${entry.platform as string} video thumbnail or switch it to Video Frame`,
				{ itemIndex: i },
			);
		}
		thumbnails.push({
			platform: entry.platform,
			thumbnailUrl: url.startsWith('data:') ? url : await uploadMediaFromUrl.call(this, url, i),
		});
	}
	return thumbnails;
}

interface PinterestBoardChoice {
	boardId?: string;
	boardName?: string;
}

function readPinterestBoardChoice(
	this: IExecuteFunctions,
	options: IDataObject,
	i: number,
): PinterestBoardChoice {
	const boardId = String(options.pinterestBoard ?? '').trim();
	const boardName = String(options.pinterestBoardName ?? '').trim();
	if (boardId && boardName) {
		throw new NodeOperationError(
			this.getNode(),
			'Set Pinterest Board or Pinterest Board Name, not both',
			{
				itemIndex: i,
				description:
					'Pinterest Board picks a board by its ID and Pinterest Board Name picks it by name. Clear one of them.',
			},
		);
	}
	return { boardId: boardId || undefined, boardName: boardName || undefined };
}

async function pinterestAccountsOwningBoard(
	this: IExecuteFunctions,
	connectionIds: string[],
	choice: PinterestBoardChoice,
	i: number,
): Promise<string[]> {
	if (connectionIds.length === 1) return connectionIds;
	const wantedName = choice.boardName?.toLowerCase();
	const matches = (board: PinterestBoard) =>
		choice.boardId ? board.id === choice.boardId : board.name.trim().toLowerCase() === wantedName;
	const owners: string[] = [];
	for (const connectionId of connectionIds) {
		const { boards } = await adaptlyPostApiRequest.call(
			this,
			'GET',
			`/social-accounts/${encodeURIComponent(connectionId)}/pinterest-boards`,
		);
		if ((boards as PinterestBoard[]).some(matches)) {
			owners.push(connectionId);
		}
	}
	if (!owners.length) {
		throw new NodeOperationError(
			this.getNode(),
			choice.boardId
				? `Pinterest board ${choice.boardId} does not belong to any of the selected Pinterest accounts`
				: `None of the selected Pinterest accounts has a board named "${choice.boardName}"`,
			{
				itemIndex: i,
				description: choice.boardId
					? 'Pick a board from the list or leave Pinterest Board empty.'
					: 'Check the name with Account > Get Pinterest Boards or leave Pinterest Board Name empty.',
			},
		);
	}
	return owners;
}

async function buildPostBody(
	this: IExecuteFunctions,
	i: number,
): Promise<{ body: IDataObject; options: IDataObject }> {
	const accountIds = asList(this.getNodeParameter('accountIds', i));
	if (accountIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one account', {
			itemIndex: i,
		});
	}
	const options = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const pinterestBoard = readPinterestBoardChoice.call(this, options, i);
	const recurrence = readRecurrence.call(this, i);
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	let targets;
	try {
		targets = groupAccountsByPlatform(accountIds, accounts as SocialAccount[]);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
	}
	const ids = (platform: Platform) => targets[connectionField(platform)] ?? [];

	const mediaUrls: string[] = [];
	for (const sourceUrl of asList(this.getNodeParameter('mediaUrls', i, ''))) {
		mediaUrls.push(await uploadMediaFromUrl.call(this, sourceUrl, i));
	}

	const body: IDataObject = {
		...targets,
		contentType: this.getNodeParameter('contentType', i),
		text: this.getNodeParameter('text', i, '') || undefined,
		mediaUrls: mediaUrls.length ? mediaUrls : undefined,
		mediaAltTexts: mediaUrls.length && options.mediaAltTexts ? asLines(options.mediaAltTexts) : undefined,
		scheduledAt: options.scheduledAt || undefined,
		timezone: options.timezone || 'UTC',
		saveAsDraft: options.saveAsDraft === true,
		recurrence,
		twitterKeepLinks: targets.platforms.includes('TWITTER') && options.twitterKeepLinks === true ? true : undefined,
		firstComments: fixedCollectionEntries(options.firstComments, 'comment').map((comment) => ({
			platform: comment.platform,
			text: comment.text,
		})),
		platformAspectRatios: fixedCollectionEntries(options.platformAspectRatios, 'shape').map(
			(shape) => ({
				platform: shape.platform,
				aspectRatio: shape.aspectRatio,
				fit: shape.fit || undefined,
			}),
		),
		platformThumbnails: await readPlatformThumbnails.call(this, options, i),
	};
	for (const field of ['firstComments', 'platformAspectRatios', 'platformThumbnails']) {
		if ((body[field] as IDataObject[]).length === 0) delete body[field];
	}

	if (targets.platforms.includes('TIKTOK')) {
		body.tiktokConfigs = ids('TIKTOK').map((connectionId) => ({
			connectionId,
			privacyLevel: options.tiktokPrivacyLevel || 'PUBLIC_TO_EVERYONE',
		}));
	}
	if (targets.platforms.includes('PINTEREST')) {
		const { boardId, boardName } = pinterestBoard;
		const link = options.pinterestLink || undefined;
		const boardOwners =
			boardId || boardName
				? await pinterestAccountsOwningBoard.call(this, ids('PINTEREST'), pinterestBoard, i)
				: [];
		if (boardId || boardName || link) {
			body.pinterestConfigs = ids('PINTEREST').map((connectionId) => {
				const ownsBoard = boardOwners.includes(connectionId);
				return {
					connectionId,
					boardId: ownsBoard ? boardId : undefined,
					boardName: ownsBoard ? boardName : undefined,
					link,
				};
			});
		}
	}
	const instagramAudio = readInstagramAudio.call(this, options, i);
	const collaborators = asLines(options.instagramCollaborators ?? '').filter(Boolean);
	const userTags = readInstagramUserTags.call(this, options, i);
	if (
		targets.platforms.includes('INSTAGRAM') &&
		(options.instagramPostType ||
			options.instagramTrialGraduation ||
			options.instagramShareToStory === true ||
			options.instagramAiGenerated === true ||
			collaborators.length ||
			userTags.length ||
			instagramAudio)
	) {
		body.instagramConfigs = ids('INSTAGRAM').map((connectionId) => ({
			connectionId,
			postType: options.instagramPostType || undefined,
			trialGraduation: options.instagramTrialGraduation || undefined,
			shareToStory: options.instagramShareToStory === true ? true : undefined,
			collaborators: collaborators.length ? collaborators : undefined,
			userTags: userTags.length ? userTags : undefined,
			aiGenerated: options.instagramAiGenerated === true ? true : undefined,
			audio: instagramAudio,
		}));
	}
	if (
		targets.platforms.includes('FACEBOOK') &&
		(options.facebookPostType ||
			options.facebookShareToStory === true ||
			options.facebookTextFormatPresetId ||
			options.facebookImageLayout)
	) {
		const carouselCards =
			options.facebookImageLayout === 'CAROUSEL'
				? fixedCollectionEntries(options.facebookCarouselCards, 'card').map((card) => ({
					link: card.link,
					title: card.title || undefined,
					description: card.description || undefined,
				}))
			: [];
		body.facebookConfigs = ids('FACEBOOK').map((pageId) => ({
			pageId,
			postType: options.facebookPostType || undefined,
			shareToStory: options.facebookShareToStory === true ? true : undefined,
			textFormatPresetId: options.facebookTextFormatPresetId || undefined,
			imageLayout: options.facebookImageLayout || undefined,
			carouselCards: carouselCards.length ? carouselCards : undefined,
		}));
	}
	const googleBusiness = fixedCollectionEntries(options.googleBusiness, 'settings')[0];
	if (targets.platforms.includes('GOOGLE_BUSINESS') && googleBusiness) {
		body.googleBusinessConfigs = ids('GOOGLE_BUSINESS').map((connectionId) =>
			googleBusinessConfig(connectionId, googleBusiness),
		);
	}
	if (targets.platforms.includes('LINKEDIN') && options.linkedinDocumentTitle) {
		body.linkedinConfigs = ids('LINKEDIN').map((connectionId) => ({
			connectionId,
			documentTitle: options.linkedinDocumentTitle,
		}));
	}
	if (targets.platforms.includes('TUMBLR')) {
		const tags = readTumblrTags.call(this, options, i);
		const title = String(options.tumblrTitle ?? '').trim();
		const sourceUrl = String(options.tumblrSourceUrl ?? '').trim();
		if (tags.length || title || sourceUrl) {
			body.tumblrConfigs = ids('TUMBLR').map((connectionId) => ({
				connectionId,
				tags: tags.length ? tags : undefined,
				title: title || undefined,
				sourceUrl: sourceUrl || undefined,
			}));
		}
	}
	if (targets.platforms.includes('YOUTUBE')) {
		body.youtubeConfigs = ids('YOUTUBE').map((connectionId) => ({
			connectionId,
			videoTitle: options.youtubeTitle || undefined,
			privacyStatus: options.youtubePrivacyStatus || undefined,
			postType: options.youtubePostType || undefined,
			aiGenerated: options.youtubeAiGenerated === true ? true : undefined,
		}));
	}

	return { body, options };
}

async function createPost(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const { body, options } = await buildPostBody.call(this, i);
	const created = await adaptlyPostApiRequest.call(this, 'POST', '/social-posts', body);
	const publishesNow = body.saveAsDraft !== true && created.isScheduled !== true;
	if (options.waitForResult !== true || !publishesNow) return created;
	return waitForPostResults.call(
		this,
		created,
		(options.waitTimeout as number | undefined) ?? DEFAULT_WAIT_TIMEOUT_SECONDS,
		i,
	);
}

async function validatePost(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const { body } = await buildPostBody.call(this, i);
	return adaptlyPostApiRequest.call(this, 'POST', '/social-posts/validate', body);
}
