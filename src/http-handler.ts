import { readFile } from 'node:fs/promises';
import type { SummalyResult } from '@/summary.js';
import { summaly, type SummalyOptions } from '@/index.js';
import { assertPublicUrl } from '@/utils/url-safety.js';

type Summarize = (url: string, options?: SummalyOptions) => Promise<SummalyResult>;

export type HttpHandlerDependencies = {
	summarize?: Summarize;
	validateUrl?: typeof assertPublicUrl;
};

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const baiduNetdiskPreviewPath = new URL('../assets/baidu-netdisk-preview.png', import.meta.url);

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders,
		},
	});
}

async function imageResponse(path: URL): Promise<Response> {
	return new Response(await readFile(path), {
		status: 200,
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
			...corsHeaders,
		},
	});
}

function handleOptions(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

function parseNumberParam(value: string | null): number | undefined {
	if (value === null) return undefined;
	const num = Number(value);
	if (Number.isNaN(num) || num < 0) return undefined;
	return num;
}

function parseBooleanParam(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	const lower = value.toLowerCase();
	if (lower === 'true' || lower === '1' || lower === 'yes') return true;
	if (lower === 'false' || lower === '0' || lower === 'no') return false;
	return undefined;
}

function getAssetBaseUrl(requestUrl: URL): string {
	const configured = process.env.PUBLIC_BASE_URL;
	if (configured) {
		return configured;
	}

	return requestUrl.origin;
}

export async function handleRequest(
	request: Request,
	dependencies: HttpHandlerDependencies = {},
): Promise<Response> {
	const summarize = dependencies.summarize || summaly;
	const validateUrl = dependencies.validateUrl || assertPublicUrl;
	const requestUrl = new URL(request.url);

	if (request.method === 'OPTIONS') {
		return handleOptions();
	}

	if (request.method !== 'GET') {
		console.warn({
			event: 'request_rejected',
			reason: 'method_not_allowed',
			method: request.method,
			path: requestUrl.pathname,
		});
		return jsonResponse({ error: 'Method not allowed' }, 405);
	}

	if (requestUrl.pathname === '/assets/baidu-netdisk-preview.png') {
		return await imageResponse(baiduNetdiskPreviewPath);
	}

	if (requestUrl.pathname === '/health') {
		return jsonResponse({ status: 'ok' });
	}

	if (requestUrl.pathname !== '/' && requestUrl.pathname !== '/api/summarize') {
		console.warn({
			event: 'request_rejected',
			reason: 'not_found',
			path: requestUrl.pathname,
		});
		return jsonResponse({ error: 'Not found' }, 404);
	}

	const targetUrl = requestUrl.searchParams.get('url');
	const lang = requestUrl.searchParams.get('lang') || undefined;
	const timeout = parseNumberParam(requestUrl.searchParams.get('timeout'));
	const contentLengthLimit = parseNumberParam(requestUrl.searchParams.get('contentLengthLimit'));
	const contentLengthRequired = parseBooleanParam(requestUrl.searchParams.get('contentLengthRequired'));
	const userAgent = requestUrl.searchParams.get('userAgent') || undefined;

	if (!targetUrl) {
		console.warn({
			event: 'request_rejected',
			reason: 'missing_url_parameter',
			path: requestUrl.pathname,
		});
		return jsonResponse({ error: 'Missing required parameter: url' }, 400);
	}

	try {
		await validateUrl(targetUrl, { allowPrivateIp: false });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid URL format';
		console.warn({
			event: 'request_rejected',
			reason: 'invalid_or_blocked_url',
			targetUrl,
			error: message,
		});
		return jsonResponse({ error: message }, 400);
	}

	console.info({
		event: 'summarization_request',
		targetUrl,
		lang: lang || 'default',
		timeout: timeout || 'default',
		contentLengthLimit: contentLengthLimit || 'default',
		contentLengthRequired: contentLengthRequired === undefined ? 'default' : contentLengthRequired,
		userAgent: userAgent || 'default',
	});

	try {
		const result = await summarize(targetUrl, {
			lang,
			operationTimeout: timeout,
			contentLengthLimit,
			contentLengthRequired,
			userAgent,
			allowPrivateIp: false,
			assetBaseUrl: getAssetBaseUrl(requestUrl),
		});

		console.info({
			event: 'summarization_success',
			targetUrl,
			hasTitle: !!result.title,
			hasDescription: !!result.description,
			hasThumbnail: !!result.thumbnail,
			hasPlayer: !!result.player.url,
			sensitive: result.sensitive,
		});

		return jsonResponse(result);
	} catch (error) {
		const message = error instanceof Error
			? error.message
			: 'Unknown error occurred';

		console.error({
			event: 'summarization_error',
			targetUrl,
			error: message,
			stack: error instanceof Error ? error.stack : undefined,
		});

		return jsonResponse({ error: message }, 500);
	}
}
