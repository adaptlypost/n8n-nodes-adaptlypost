import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const API_BASE_URL = 'https://post.adaptlypost.com/post/api/v1';

export const CREDENTIAL_NAME = 'adaptlyPostApi';

export const TOKENS_URL = 'https://app.adaptlypost.com/api-tokens';

type ApiContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

export async function adaptlyPostApiRequest(
	this: ApiContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${API_BASE_URL}${path}`,
		qs,
		body,
		json: true,
	};
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIAL_NAME,
		options,
	)) as IDataObject;
}

export interface ApiErrorBody {
	statusCode: number;
	code: string;
	message: string;
	requiredPermission?: string;
	role?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const bodyCandidates = (error: unknown): unknown[] => {
	if (!isRecord(error)) return [];
	const response = error.response;
	const cause = error.cause;
	return [
		isRecord(response) ? response.data : undefined,
		isRecord(response) ? response.body : undefined,
		isRecord(cause) && isRecord(cause.response) ? cause.response.data : undefined,
		error.errorResponse,
	];
};

export function readApiErrorBody(error: unknown): ApiErrorBody | undefined {
	for (const candidate of bodyCandidates(error)) {
		if (!isRecord(candidate)) continue;
		const { statusCode, code, message } = candidate;
		if (typeof statusCode !== 'number' || typeof code !== 'string') continue;
		return {
			statusCode,
			code,
			message: Array.isArray(message) ? message.join('; ') : String(message ?? ''),
			requiredPermission:
				typeof candidate.requiredPermission === 'string' ? candidate.requiredPermission : undefined,
			role: typeof candidate.role === 'string' ? candidate.role : undefined,
		};
	}
	return undefined;
}

export function describeApiError(body: ApiErrorBody): string {
	switch (body.code) {
		case 'permission_denied':
			return [
				body.requiredPermission ? `Required permission: ${body.requiredPermission}.` : undefined,
				body.role ? `This key has the ${body.role} role.` : undefined,
				`Retrying will not help. Use a key created with the Editor or Admin role (${TOKENS_URL}), or ask a workspace admin for one.`,
			]
				.filter(Boolean)
				.join(' ');
		case 'token_issuer_lost_access':
			return `The member who created this key no longer has access to the workspace, so the key is revoked. Ask a workspace admin for a new key (${TOKENS_URL}).`;
		case 'subscription_required':
			return 'The workspace plan does not allow this. Update the subscription in the AdaptlyPost app.';
		default:
			return '';
	}
}
