import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

const EVENTS = [
	{ name: 'Account Disconnected', value: 'account.unauthorized' },
	{ name: 'Post Failed', value: 'post.failed' },
	{ name: 'Post Partially Failed', value: 'post.partially_failed' },
	{ name: 'Post Published', value: 'post.published' },
	{ name: 'Post Scheduled', value: 'post.scheduled' },
];

interface RegisteredWebhook {
	id: string;
	url: string;
	active: boolean;
	secret?: string;
}

const signatureMatches = (
	secret: string,
	timestamp: string,
	rawBody: string,
	received: string,
): boolean => {
	const expected =
		'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
	const a = Buffer.from(expected);
	const b = Buffer.from(received);
	return a.length === b.length && timingSafeEqual(a, b);
};

export class AdaptlyPostTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AdaptlyPost Trigger',
		name: 'adaptlyPostTrigger',
		icon: { light: 'file:../../icons/adaptlypost.svg', dark: 'file:../../icons/adaptlypost.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when AdaptlyPost publishes, schedules or fails a post',
		defaults: {
			name: 'AdaptlyPost Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'adaptlyPostApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENTS,
				required: true,
				default: ['post.published'],
				description:
					'Which AdaptlyPost events start the workflow. Activating the workflow registers a webhook, which needs an Editor or Admin key; a Contributor or Viewer key is refused with 403.',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const staticData = this.getWorkflowStaticData('node');
				const { webhooks } = await adaptlyPostApiRequest.call(this, 'GET', '/webhooks');
				const existing = (webhooks as RegisteredWebhook[]).find(
					(webhook) => webhook.url === webhookUrl,
				);
				if (!existing) {
					return false;
				}
				if (!staticData.webhookSecret || staticData.webhookId !== existing.id) {
					await adaptlyPostApiRequest.call(this, 'DELETE', `/webhooks/${existing.id}`);
					return false;
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const staticData = this.getWorkflowStaticData('node');
				const created = (await adaptlyPostApiRequest.call(this, 'POST', '/webhooks', {
					url: webhookUrl,
				})) as unknown as RegisteredWebhook;
				staticData.webhookId = created.id;
				staticData.webhookSecret = created.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.webhookId) {
					try {
						await adaptlyPostApiRequest.call(this, 'DELETE', `/webhooks/${staticData.webhookId}`);
					} catch (error) {
						this.logger.warn('AdaptlyPost webhook could not be deleted', {
							webhookId: staticData.webhookId,
							error: (error as Error).message,
						});
						return false;
					}
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const headers = this.getHeaderData() as Record<string, string | undefined>;
		const body = this.getBodyData() as IDataObject;
		const staticData = this.getWorkflowStaticData('node');
		const secret = staticData.webhookSecret as string | undefined;
		const rawBody = request.rawBody ? request.rawBody.toString() : JSON.stringify(body);
		const signature = headers['x-adaptly-signature'];
		const timestamp = headers['x-adaptly-timestamp'];

		if (secret && signature && timestamp && !signatureMatches(secret, timestamp, rawBody, signature)) {
			const response = this.getResponseObject();
			response.status(401).send('Invalid signature');
			return { noWebhookResponse: true };
		}

		const events = this.getNodeParameter('events') as string[];
		const event = String(body.event ?? headers['x-adaptly-event'] ?? '');
		if (event === 'webhook.test' || !events.includes(event)) {
			return { workflowData: [] };
		}

		const data = (body.data ?? {}) as IDataObject;
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					id: body.id,
					event,
					occurredAt: body.createdAt,
					...data,
				}),
			],
		};
	}
}
