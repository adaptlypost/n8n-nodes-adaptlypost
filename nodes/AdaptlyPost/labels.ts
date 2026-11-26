import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

export interface Label {
	id: string;
	name: string;
	color: string;
}

export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { labels } = await adaptlyPostApiRequest.call(this, 'GET', '/labels');
	return (labels as Label[]).map((label) => ({ name: label.name, value: label.id }));
}
