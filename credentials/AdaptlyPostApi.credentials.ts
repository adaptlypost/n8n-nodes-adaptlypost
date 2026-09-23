import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AdaptlyPostApi implements ICredentialType {
	name = 'adaptlyPostApi';

	displayName = 'AdaptlyPost API';

	icon: Icon = { light: 'file:../icons/adaptlypost.svg', dark: 'file:../icons/adaptlypost.dark.svg' };

	documentationUrl =
		'https://github.com/adaptlypost/n8n-nodes-adaptlypost?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Workspace token from app.adaptlypost.com/api-tokens. It starts with adaptly_. The token carries the role chosen when it was created: an Editor or Admin key can schedule and publish, a Contributor key can only save drafts and upload media, a Viewer key can only read. The AdaptlyPost Trigger node registers a webhook, which needs an Editor or Admin key (webhooks.manage). A key never does more than the member who created it.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://post.adaptlypost.com/post/api/v1',
			url: '/social-accounts',
		},
	};
}
