import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

const PAGE_SIZE = 100;
const MAX_STATUS_IDS = 100;

const LISTS: Record<string, string> = {
	getComments: 'comments',
	getConversations: 'conversations',
	getMentions: 'mentions',
	getReviews: 'reviews',
};

const nonEmpty = (value: unknown): boolean =>
	value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

function readListQuery(this: IExecuteFunctions, i: number): IDataObject {
	const filters = this.getNodeParameter('inboxFilters', i, {}) as IDataObject;
	const query: IDataObject = {};
	for (const [key, value] of Object.entries(filters)) {
		if (nonEmpty(value)) query[key] = value;
	}
	return query;
}

async function listInbox(this: IExecuteFunctions, channel: string, i: number): Promise<IDataObject | IDataObject[]> {
	const path = `/inbox/${channel}`;
	const query = readListQuery.call(this, i);
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	if (!returnAll && this.getNodeParameter('returnPage', i, false) === true) {
		const limit = Math.min(this.getNodeParameter('limit', i) as number, PAGE_SIZE);
		return adaptlyPostApiRequest.call(this, 'GET', path, undefined, { ...query, limit });
	}
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
	const entries: IDataObject[] = [];
	let cursor = query.cursor as string | undefined;
	while (entries.length < limit) {
		const page = await adaptlyPostApiRequest.call(this, 'GET', path, undefined, {
			...query,
			cursor,
			limit: Math.min(limit - entries.length, PAGE_SIZE),
		});
		entries.push(...((page[channel] as IDataObject[] | undefined) ?? []));
		cursor = (page.nextCursor as string | null | undefined) ?? undefined;
		if (!cursor) break;
	}
	return entries.slice(0, limit);
}

function readStatusIds(this: IExecuteFunctions, i: number): string[] {
	const ids = String(this.getNodeParameter('itemIds', i) ?? '')
		.split('\n')
		.map((id) => id.trim())
		.filter(Boolean);
	if (ids.length === 0 || ids.length > MAX_STATUS_IDS) {
		throw new NodeOperationError(
			this.getNode(),
			`IDs takes from 1 to ${MAX_STATUS_IDS} IDs, one per line, got ${ids.length}`,
			{ itemIndex: i },
		);
	}
	return ids;
}

const idPath = (prefix: string, id: unknown): string => `${prefix}/${encodeURIComponent(String(id))}`;

export async function runInbox(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (LISTS[operation]) return listInbox.call(this, LISTS[operation], i);

	const comment = () => idPath('/inbox/comments', this.getNodeParameter('commentId', i));
	const review = () => idPath('/inbox/reviews', this.getNodeParameter('reviewId', i));
	const conversation = () => idPath('/inbox/conversations', this.getNodeParameter('conversationId', i));

	switch (operation) {
		case 'getSummary':
			return adaptlyPostApiRequest.call(this, 'GET', '/inbox/summary');
		case 'refresh':
			return adaptlyPostApiRequest.call(this, 'POST', '/inbox/refresh', {});
		case 'getComment':
			return adaptlyPostApiRequest.call(this, 'GET', comment());
		case 'getConversation':
			return adaptlyPostApiRequest.call(this, 'GET', conversation());
		case 'replyToComment':
			return adaptlyPostApiRequest.call(this, 'POST', `${comment()}/reply`, {
				text: this.getNodeParameter('replyText', i),
			});
		case 'hideComment':
			return adaptlyPostApiRequest.call(this, 'POST', `${comment()}/hide`, {});
		case 'unhideComment':
			return adaptlyPostApiRequest.call(this, 'POST', `${comment()}/unhide`, {});
		case 'likeComment':
			return adaptlyPostApiRequest.call(this, 'POST', `${comment()}/like`, {});
		case 'unlikeComment':
			return adaptlyPostApiRequest.call(this, 'DELETE', `${comment()}/like`);
		case 'deleteComment':
			return adaptlyPostApiRequest.call(this, 'DELETE', comment());
		case 'replyToMention':
			return adaptlyPostApiRequest.call(
				this,
				'POST',
				`${idPath('/inbox/mentions', this.getNodeParameter('mentionId', i))}/reply`,
				{ text: this.getNodeParameter('replyText', i) },
			);
		case 'sendMessage':
			return adaptlyPostApiRequest.call(this, 'POST', `${conversation()}/messages`, {
				text: this.getNodeParameter('messageText', i),
			});
		case 'replyToReview':
			return adaptlyPostApiRequest.call(this, 'PUT', `${review()}/reply`, {
				text: this.getNodeParameter('reviewReplyText', i),
			});
		case 'deleteReviewReply':
			return adaptlyPostApiRequest.call(this, 'DELETE', `${review()}/reply`);
		case 'setStatus':
			return adaptlyPostApiRequest.call(
				this,
				'POST',
				`/inbox/${this.getNodeParameter('channel', i) as string}/status`,
				{ ids: readStatusIds.call(this, i), status: this.getNodeParameter('status', i) },
			);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
	}
}
