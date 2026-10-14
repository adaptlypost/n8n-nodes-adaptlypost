import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import { PLATFORM_LABELS, type Platform } from './accounts';
import { adaptlyPostApiRequest } from './transport';

export const DEFAULT_WAIT_TIMEOUT_SECONDS = 300;

export const POLL_INTERVAL_MS = 5000;

const IN_PROGRESS_STATUSES = ['PENDING', 'PUBLISHING'];
const FAILED_STATUSES = ['FAILED', 'PARTIAL_FAILURE'];
const NOT_PUBLISHING_STATUSES = ['DRAFT', 'SCHEDULED'];

interface PlatformResult {
	platform: string;
	accountName?: string | null;
	status: string;
	errorMessage?: string | null;
}

export class PostResultError extends NodeOperationError {
	constructor(
		node: INode,
		message: string,
		description: string,
		itemIndex: number,
		readonly output: IDataObject,
	) {
		super(node, message, { description, itemIndex });
	}
}

const accountLabel = (result: PlatformResult): string => {
	const platform = PLATFORM_LABELS[result.platform as Platform] ?? result.platform;
	return result.accountName ? `${platform} (${result.accountName})` : platform;
};

const failureMessage = (results: PlatformResult[]): string => {
	const failures = results
		.filter((result) => result.status === 'FAILED')
		.map((result) =>
			result.errorMessage
				? `${accountLabel(result)}: ${result.errorMessage}`
				: accountLabel(result),
		);
	return failures.length ? `Publishing failed on ${failures.join('; ')}` : 'Publishing failed';
};

const RETRY_WARNING = 'Running this node again creates a second post.';

export async function waitForPostResults(
	this: IExecuteFunctions,
	created: IDataObject,
	timeoutSeconds: number,
	itemIndex: number,
): Promise<IDataObject> {
	const postId = created.postId;
	if (typeof postId !== 'string' || !postId) {
		throw new NodeOperationError(
			this.getNode(),
			'The create response has no post ID, so its result cannot be read',
			{
				description: `Find the post with Post > Get Many before running the node again. ${RETRY_WARNING}`,
				itemIndex,
			},
		);
	}
	const deadline = Date.now() + timeoutSeconds * 1000;
	let outcome: IDataObject;
	do {
		await sleep(
			Math.min(POLL_INTERVAL_MS, Math.max(deadline - Date.now(), 0)),
			this.getExecutionCancelSignal(),
		);
		outcome = await adaptlyPostApiRequest.call(this, 'GET', `/social-posts/${postId}/results`);
	} while (IN_PROGRESS_STATUSES.includes(outcome.status as string) && Date.now() < deadline);

	const status = outcome.status as string;
	const results = (outcome.results ?? []) as unknown as PlatformResult[];
	const output: IDataObject = { ...created, status, results: outcome.results };
	if (status === 'COMPLETED') return output;

	if (IN_PROGRESS_STATUSES.includes(status)) {
		throw new PostResultError(
			this.getNode(),
			`Post ${postId} is still publishing after ${timeoutSeconds} seconds`,
			`Read the outcome later with Post > Get Results and this Post ID, or raise Wait Timeout. ${RETRY_WARNING}`,
			itemIndex,
			output,
		);
	}
	if (NOT_PUBLISHING_STATUSES.includes(status)) return output;
	if (!FAILED_STATUSES.includes(status)) {
		throw new PostResultError(
			this.getNode(),
			`Post ${postId} reported an unknown status: ${status ?? 'none'}`,
			`Read the outcome with Post > Get Results and this Post ID. ${RETRY_WARNING}`,
			itemIndex,
			output,
		);
	}

	throw new PostResultError(
		this.getNode(),
		failureMessage(results),
		[
			`Post ${postId} ended as ${status}.`,
			...results.map((result) => `${accountLabel(result)}: ${result.status}.`),
			'Retry the failed accounts with Post > Retry Failed Platforms and this Post ID.',
			RETRY_WARNING,
		].join(' '),
		itemIndex,
		output,
	);
}
