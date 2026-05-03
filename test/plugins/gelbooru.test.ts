/**
 * Gelbooru Plugin Tests
 */

import { describe, expect, test } from 'vitest';
import {
	setupMockResponse,
	useMockFetch,
} from '../utils/test-utils.js';

useMockFetch();

describe('Gelbooru Plugin', () => {
	test('URL matching - gelbooru.com post page', async () => {
		const { test: testUrl } = await import('@/plugins/gelbooru.js');

		expect(testUrl(new URL('https://gelbooru.com/index.php?page=post&s=view&id=7516460'))).toBe(true);
		expect(testUrl(new URL('https://img2.gelbooru.com//images/6a/8b/file.jpg'))).toBe(false);
		expect(testUrl(new URL('https://example.com/index.php?page=post&s=view&id=7516460'))).toBe(false);
	});

	test('rewrites hotlink-protected full image to public thumbnail', async () => {
		const { summarize } = await import('@/plugins/gelbooru.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Gelbooru Post</title>
	<meta property="og:title" content="Gelbooru Post">
	<meta property="og:image" content="https://img2.gelbooru.com//images/6a/8b/6a8b03c7b6ea1a11003c145de9fc17fe.jpg">
	<meta name="description" content="Test description">
	<link rel="icon" href="/favicon.png">
</head>
<body></body>
</html>`;
		setupMockResponse('https://gelbooru.com/index.php?page=post&s=view&id=7516460', html);

		const result = await summarize(new URL('https://gelbooru.com/index.php?page=post&s=view&id=7516460'));

		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://gelbooru.com/thumbnails//6a/8b/thumbnail_6a8b03c7b6ea1a11003c145de9fc17fe.jpg');
	});

	test('keeps non-Gelbooru thumbnails unchanged', async () => {
		const { summarize } = await import('@/plugins/gelbooru.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Gelbooru Post</title>
	<meta property="og:title" content="Gelbooru Post">
	<meta property="og:image" content="https://example.com/image.jpg">
</head>
<body></body>
</html>`;
		setupMockResponse('https://gelbooru.com/index.php?page=post&s=view&id=123', html);

		const result = await summarize(new URL('https://gelbooru.com/index.php?page=post&s=view&id=123'));

		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://example.com/image.jpg');
	});
});
