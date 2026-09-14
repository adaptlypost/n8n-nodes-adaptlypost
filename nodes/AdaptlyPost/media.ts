import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

const SUPPORTED_MEDIA_TYPES = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'video/mp4': '.mp4',
	'video/quicktime': '.mov',
} as const;

type MediaType = keyof typeof SUPPORTED_MEDIA_TYPES;

const isSupported = (value: string): value is MediaType => value in SUPPORTED_MEDIA_TYPES;

interface UploadSlot {
	uploadUrl: string;
	publicUrl: string;
}

export async function uploadMediaFromUrl(
	this: IExecuteFunctions,
	sourceUrl: string,
	itemIndex: number,
): Promise<string> {
	const source = await this.helpers.httpRequest({
		url: sourceUrl,
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});
	const headers = source.headers as Record<string, string | undefined>;
	const mimeType = (headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
	if (!isSupported(mimeType)) {
		throw new NodeOperationError(
			this.getNode(),
			`${sourceUrl} is served as "${mimeType || 'unknown'}". AdaptlyPost accepts JPEG, PNG, WebP, MP4 and QuickTime.`,
			{ itemIndex },
		);
	}

	const bytes = Buffer.from(source.body as ArrayBuffer);
	const stem = new URL(sourceUrl).pathname.split('/').pop()?.replace(/\.[^.]*$/, '') || 'upload';
	const { urls } = await adaptlyPostApiRequest.call(this, 'POST', '/upload-urls', {
		files: [{ fileName: `${stem}${SUPPORTED_MEDIA_TYPES[mimeType]}`, mimeType }],
	});
	const slot = (urls as UploadSlot[])[0];

	await this.helpers.httpRequest({
		method: 'PUT',
		url: slot.uploadUrl,
		body: bytes,
		headers: { 'Content-Type': mimeType, 'Content-Length': String(bytes.length) },
	});

	return slot.publicUrl;
}
