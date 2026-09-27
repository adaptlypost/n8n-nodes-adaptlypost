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
		arrayFormat: 'repeat',
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
	keyRole?: string;
	issuerRole?: string;
	tokenType?: string;
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

const optionalString = (value: unknown): string | undefined =>
	typeof value === 'string' && value ? value : undefined;

export function readApiErrorBody(error: unknown): ApiErrorBody | undefined {
	for (const candidate of bodyCandidates(error)) {
		if (!isRecord(candidate)) continue;
		const { statusCode, code, message } = candidate;
		if (typeof statusCode !== 'number' || typeof code !== 'string') continue;
		return {
			statusCode,
			code,
			message: Array.isArray(message) ? message.join('; ') : String(message ?? ''),
			requiredPermission: optionalString(candidate.requiredPermission),
			role: optionalString(candidate.role),
			keyRole: optionalString(candidate.keyRole),
			issuerRole: optionalString(candidate.issuerRole),
			tokenType: optionalString(candidate.tokenType),
		};
	}
	return undefined;
}

const roleLabel = (role: string): string => role.charAt(0).toUpperCase() + role.slice(1);

const narrowingIssuerRole = (body: ApiErrorBody): string | undefined =>
	body.keyRole && body.issuerRole && body.keyRole !== body.issuerRole && body.role === body.issuerRole
		? body.issuerRole
		: undefined;

function describeDeniedRole(body: ApiErrorBody): string | undefined {
	const issuerRole = narrowingIssuerRole(body);
	if (issuerRole && body.keyRole) {
		return `This key carries the ${roleLabel(body.keyRole)} role, but the member who created it is now a ${roleLabel(issuerRole)}, so the key holds only that member's permissions.`;
	}
	if (body.tokenType === 'api_token' && body.keyRole) {
		return `This key has the ${roleLabel(body.keyRole)} role.`;
	}
	return undefined;
}

export function describeApiError(body: ApiErrorBody): string {
	switch (body.code) {
		case 'permission_denied':
			return [
				body.requiredPermission ? `Required permission: ${body.requiredPermission}.` : undefined,
				describeDeniedRole(body),
				narrowingIssuerRole(body)
					? `Retrying will not help. Ask a workspace admin to restore that member's role, or to create a key with the Editor or Admin role (${TOKENS_URL}).`
					: `Retrying will not help. Use a key created with the Editor or Admin role (${TOKENS_URL}), or ask a workspace admin for one.`,
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
