import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { adaptlyPostApiRequest } from './transport';

const POST_MEDIA_TYPES = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'video/mp4': '.mp4',
	'video/quicktime': '.mov',
	'application/pdf': '.pdf',
	'application/vnd.ms-powerpoint': '.ppt',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
	'application/msword': '.doc',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
} as const;

const REPLY_IMAGE_TYPES = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
} as const;

interface UploadSlot {
	uploadUrl: string;
	publicUrl: string;
}

export function uploadMediaFromUrl(
	this: IExecuteFunctions,
	sourceUrl: string,
	itemIndex: number,
): Promise<string> {
	return uploadFromUrl.call(
		this,
		sourceUrl,
		itemIndex,
		POST_MEDIA_TYPES,
		'AdaptlyPost accepts JPEG, PNG, WebP, GIF, MP4, QuickTime, and PDF, PPT, PPTX, DOC or DOCX for LinkedIn document posts.',
	);
}

export function uploadReplyImageFromUrl(
	this: IExecuteFunctions,
	sourceUrl: string,
	itemIndex: number,
): Promise<string> {
	return uploadFromUrl.call(
		this,
		sourceUrl,
		itemIndex,
		REPLY_IMAGE_TYPES,
		'A thread reply takes JPEG, PNG, GIF or WebP images.',
	);
}

async function uploadFromUrl(
	this: IExecuteFunctions,
	sourceUrl: string,
	itemIndex: number,
	extensions: Record<string, string>,
	accepted: string,
): Promise<string> {
	const source = await this.helpers.httpRequest({
		url: sourceUrl,
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});
	const headers = source.headers as Record<string, string | undefined>;
	const mimeType = (headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
	const extension = Object.prototype.hasOwnProperty.call(extensions, mimeType)
		? extensions[mimeType]
		: undefined;
	if (!extension) {
		throw new NodeOperationError(
			this.getNode(),
			`${sourceUrl} is served as "${mimeType || 'unknown'}". ${accepted}`,
			{ itemIndex },
		);
	}

	const bytes = Buffer.from(source.body as ArrayBuffer);
	const stem = new URL(sourceUrl).pathname.split('/').pop()?.replace(/\.[^.]*$/, '') || 'upload';
	const { urls } = await adaptlyPostApiRequest.call(this, 'POST', '/upload-urls', {
		files: [{ fileName: `${stem}${extension}`, mimeType }],
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
