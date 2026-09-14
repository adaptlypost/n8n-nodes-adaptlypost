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
