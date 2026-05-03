import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '@/http-handler.js';
import { getResponse } from '@/utils/fetch.js';

const summary = {
	title: 'Example',
	icon: null,
	description: null,
	thumbnail: null,
	sitename: 'Example',
	player: {
		url: null,
		width: null,
		height: null,
		allow: [],
	},
	sensitive: false,
	activityPub: null,
	fediverseCreator: null,
	url: 'https://example.com/',
};

function request(path: string, init?: RequestInit): Request {
	return new Request(`http://localhost${path}`, init);
}

describe('local HTTP handler', () => {
	it('returns health check response', async () => {
		const response = await handleRequest(request('/health'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});

	it('serves built-in preview assets', async () => {
		const response = await handleRequest(request('/assets/baidu-netdisk-icon.png'));
		const body = await response.arrayBuffer();
		const pngHeader = new DataView(body);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('image/png');
		expect(pngHeader.getUint32(16)).toBeGreaterThanOrEqual(1024);
		expect(pngHeader.getUint32(20)).toBeGreaterThanOrEqual(1024);
	});

	it('returns 400 for missing url parameter', async () => {
		const response = await handleRequest(request('/'));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Missing required parameter: url' });
	});

	it('returns 400 for invalid url format', async () => {
		const response = await handleRequest(request('/?url=not-a-valid-url'));
		expect(response.status).toBe(400);
		expect(await response.text()).toContain('Invalid URL');
	});

	it('returns 400 for non-http URLs', async () => {
		const response = await handleRequest(request('/?url=ftp://example.com/file'));
		expect(response.status).toBe(400);
		expect(await response.text()).toContain('Only http and https URLs are supported');
	});

	it('returns 405 for POST requests', async () => {
		const response = await handleRequest(request('/', { method: 'POST' }));
		expect(response.status).toBe(405);
		expect(await response.json()).toEqual({ error: 'Method not allowed' });
	});

	it('returns 404 for unknown paths', async () => {
		const response = await handleRequest(request('/unknown'));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Not found' });
	});

	it('handles CORS preflight', async () => {
		const response = await handleRequest(request('/', { method: 'OPTIONS' }));
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('summarizes from root endpoint', async () => {
		const summarize = vi.fn().mockResolvedValue(summary);
		const response = await handleRequest(request('/?url=https://example.com'), {
			summarize,
			validateUrl: vi.fn().mockResolvedValue(undefined),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(summary);
		expect(summarize).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
			allowPrivateIp: false,
			assetBaseUrl: 'http://localhost',
		}));
	});

	it('summarizes from /api/summarize endpoint', async () => {
		const summarize = vi.fn().mockResolvedValue(summary);
		const response = await handleRequest(request('/api/summarize?url=https://example.com'), {
			summarize,
			validateUrl: vi.fn().mockResolvedValue(undefined),
		});

		expect(response.status).toBe(200);
		expect(summarize).toHaveBeenCalledOnce();
	});

	it('parses optional query parameters', async () => {
		const summarize = vi.fn().mockResolvedValue(summary);
		await handleRequest(
			request('/?url=https://example.com&lang=ja&timeout=5000&contentLengthLimit=1048576&contentLengthRequired=yes&userAgent=CustomBot/1.0'),
			{
				summarize,
				validateUrl: vi.fn().mockResolvedValue(undefined),
			},
		);

		expect(summarize).toHaveBeenCalledWith('https://example.com', {
			lang: 'ja',
			operationTimeout: 5000,
			contentLengthLimit: 1048576,
			contentLengthRequired: true,
			userAgent: 'CustomBot/1.0',
			allowPrivateIp: false,
			assetBaseUrl: 'http://localhost',
		});
	});

	it('returns service-hosted preview assets for cloud drive cards', async () => {
		const response = await handleRequest(
			request('/api/summarize?url=https%3A%2F%2Fpan.baidu.com%2Fs%2F1VwznG3qTNCakwlE6tnCxhQ%3Fpwd%3Dkmnb'),
			{
				validateUrl: vi.fn().mockResolvedValue(undefined),
			},
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.thumbnail).toBe('http://localhost/assets/baidu-netdisk-icon.png');
	});

	it('returns 500 when summarization fails', async () => {
		const response = await handleRequest(request('/?url=https://example.com'), {
			summarize: vi.fn().mockRejectedValue(new Error('boom')),
			validateUrl: vi.fn().mockResolvedValue(undefined),
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'boom' });
	});
});

describe('URL safety', () => {
	it.each([
		'http://127.0.0.1/',
		'http://10.0.0.1/',
		'http://192.168.0.1/',
		'http://localhost/',
		'http://[::1]/',
	])('rejects private URL %s', async (url) => {
		const response = await handleRequest(request(`/?url=${encodeURIComponent(url)}`));
		expect(response.status).toBe(400);
		expect(await response.text()).toContain('Private or local network URLs are not allowed');
	});

	it('allows public HTTP and HTTPS URLs', async () => {
		const summarize = vi.fn().mockResolvedValue(summary);
		const response = await handleRequest(request('/?url=https://93.184.216.34/'), {
			summarize,
		});

		expect(response.status).toBe(200);
		expect(summarize).toHaveBeenCalledOnce();
	});

	it('rejects redirects to private URLs', async () => {
		const originalFetch = global.fetch;
		global.fetch = vi.fn().mockResolvedValue(new Response(null, {
			status: 302,
			headers: {
				location: 'http://127.0.0.1/private',
			},
		})) as typeof fetch;

		try {
			await expect(getResponse({
				url: 'https://93.184.216.34/',
				method: 'GET',
				headers: {
					accept: '*/*',
				},
				allowPrivateIp: false,
			})).rejects.toThrow('Private or local network URLs are not allowed');
		} finally {
			global.fetch = originalFetch;
		}
	});
});
