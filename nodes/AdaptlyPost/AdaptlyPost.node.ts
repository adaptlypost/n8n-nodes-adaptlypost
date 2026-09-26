import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getAccounts, groupAccountsByPlatform, type SocialAccount } from './accounts';
import { uploadMediaFromUrl } from './media';
import { postProperties } from './post.properties';
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
				],
				default: 'getAll',
			},
			...postProperties,
			...analyticsProperties,
			...recurringPostProperties,
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
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
					returnData.push({
						json: {
							error: apiError?.message || (error as Error).message,
							...(apiError && {
								code: apiError.code,
								requiredPermission: apiError.requiredPermission,
								role: apiError.role,
							}),
						},
						pairedItem: { item: i },
					});
					continue;
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

async function runAnalytics(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const qs: IDataObject = {
		from: this.getNodeParameter('from', i),
		to: this.getNodeParameter('to', i),
		platforms: this.getNodeParameter('platforms', i, []),
	};
	switch (operation) {
		case 'overview':
			return adaptlyPostApiRequest.call(this, 'GET', '/analytics/overview', undefined, qs);
		case 'timeseries':
			return adaptlyPostApiRequest.call(this, 'GET', '/analytics/timeseries', undefined, {
				...qs,
				interval: this.getNodeParameter('interval', i),
			});
		case 'platformBreakdown':
			return adaptlyPostApiRequest.call(
				this,
				'GET',
				'/analytics/platform-breakdown',
				undefined,
				qs,
			);
		case 'posts': {
			const page = await adaptlyPostApiRequest.call(this, 'GET', '/analytics/posts', undefined, {
				...qs,
				sortBy: this.getNodeParameter('sortBy', i),
				limit: this.getNodeParameter('limit', i),
			});
			return page.posts as IDataObject[];
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

async function createPost(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const accountIds = asList(this.getNodeParameter('accountIds', i));
	if (accountIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one account', {
			itemIndex: i,
		});
	}
	const recurrence = readRecurrence.call(this, i);
	const { accounts } = await adaptlyPostApiRequest.call(this, 'GET', '/social-accounts');
	let targets;
	try {
		targets = groupAccountsByPlatform(accountIds, accounts as SocialAccount[]);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
	}
	const ids = (platform: (typeof targets.platforms)[number]) =>
		targets[platform === 'FACEBOOK' ? 'pageIds' : `${platform.toLowerCase()}ConnectionIds`] ?? [];

	const mediaUrls: string[] = [];
	for (const sourceUrl of asList(this.getNodeParameter('mediaUrls', i, ''))) {
		mediaUrls.push(await uploadMediaFromUrl.call(this, sourceUrl, i));
	}

	const options = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
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
	};

	if (targets.platforms.includes('TIKTOK')) {
		body.tiktokConfigs = ids('TIKTOK').map((connectionId) => ({
			connectionId,
			privacyLevel: options.tiktokPrivacyLevel || 'PUBLIC_TO_EVERYONE',
		}));
	}
	if (targets.platforms.includes('PINTEREST')) {
		if (!options.pinterestBoard) {
			throw new NodeOperationError(this.getNode(), 'Pinterest posts need a board ID', {
				itemIndex: i,
			});
		}
		body.pinterestConfigs = ids('PINTEREST').map((connectionId) => ({
			connectionId,
			boardId: options.pinterestBoard,
			link: options.pinterestLink || undefined,
		}));
	}
	if (targets.platforms.includes('INSTAGRAM') && options.instagramPostType) {
		body.instagramConfigs = ids('INSTAGRAM').map((connectionId) => ({
			connectionId,
			postType: options.instagramPostType,
		}));
	}
	if (targets.platforms.includes('FACEBOOK') && options.facebookPostType) {
		body.facebookConfigs = ids('FACEBOOK').map((pageId) => ({
			pageId,
			postType: options.facebookPostType,
		}));
	}
	if (targets.platforms.includes('LINKEDIN') && options.linkedinDocumentTitle) {
		body.linkedinConfigs = ids('LINKEDIN').map((connectionId) => ({
			connectionId,
			documentTitle: options.linkedinDocumentTitle,
		}));
	}
	if (targets.platforms.includes('YOUTUBE')) {
		body.youtubeConfigs = ids('YOUTUBE').map((connectionId) => ({
			connectionId,
			videoTitle: options.youtubeTitle || undefined,
			privacyStatus: options.youtubePrivacyStatus || undefined,
			postType: options.youtubePostType || undefined,
		}));
	}

	return adaptlyPostApiRequest.call(this, 'POST', '/social-posts', body);
}
