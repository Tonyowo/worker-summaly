/**
 * Cloud drive fallback plugin tests
 */

import { describe, expect, test } from 'vitest';
import { summaly } from '@/index.js';

describe('Cloud drive fallback plugin', () => {
	test('matches Baidu Netdisk share URLs', async () => {
		const { test: testUrl } = await import('@/plugins/cloud-drive.js');

		expect(testUrl(new URL('https://pan.baidu.com/s/1VwznG3qTNCakwlE6tnCxhQ?pwd=kmnb'))).toBe(true);
		expect(testUrl(new URL('https://pan.baidu.com/share/init?surl=VwznG3qTNCakwlE6tnCxhQ&pwd=kmnb'))).toBe(true);
		expect(testUrl(new URL('https://pan.baidu.com/disk/home'))).toBe(false);
		expect(testUrl(new URL('ftp://pan.baidu.com/s/1VwznG3qTNCakwlE6tnCxhQ'))).toBe(false);
	});

	test('matches Aliyun Drive share URLs', async () => {
		const { test: testUrl } = await import('@/plugins/cloud-drive.js');

		expect(testUrl(new URL('https://www.alipan.com/s/L6N3rF4xJiN'))).toBe(true);
		expect(testUrl(new URL('https://alipan.com/s/L6N3rF4xJiN?pwd=8b0c'))).toBe(true);
		expect(testUrl(new URL('https://www.aliyundrive.com/s/L6N3rF4xJiN'))).toBe(true);
		expect(testUrl(new URL('https://www.alipan.com/drive/home'))).toBe(false);
	});

	test('returns a Baidu Netdisk branded card with icon and thumbnail', async () => {
		const result = await summaly('https://pan.baidu.com/s/1VwznG3qTNCakwlE6tnCxhQ?pwd=kmnb');

		expect(result.title).toBe('百度网盘分享');
		expect(result.description).toBe('需要提取码 kmnb');
		expect(result.sitename).toBe('百度网盘');
		expect(result.icon).toBe('https://nd-static.bdstatic.com/m-static/wp-brand/favicon.ico');
		expect(result.thumbnail).toBe('https://nd-static.bdstatic.com/m-static/wp-brand/img/logo-pan.6af52c5e.png');
		expect(result.player.url).toBeNull();
	});

	test('uses the service asset URL for Baidu Netdisk when an asset base URL is provided', async () => {
		const result = await summaly('https://pan.baidu.com/s/1VwznG3qTNCakwlE6tnCxhQ?pwd=kmnb', {
			assetBaseUrl: 'https://summaly.example',
		});

		expect(result.thumbnail).toBe('https://summaly.example/assets/baidu-netdisk-icon.png');
	});

	test('returns an Aliyun Drive branded card with icon and thumbnail', async () => {
		const result = await summaly('https://www.alipan.com/s/L6N3rF4xJiN?pwd=8b0c');

		expect(result.title).toBe('阿里云盘分享');
		expect(result.description).toBe('需要提取码 8b0c');
		expect(result.sitename).toBe('阿里云盘');
		expect(result.icon).toBe('https://img.alicdn.com/imgextra/i1/O1CN01JDQCi21Dc8EfbRwvF_!!6000000000236-73-tps-64-64.ico');
		expect(result.thumbnail).toBe('https://img.alicdn.com/imgextra/i2/O1CN01DOYcs71v3B6bOemVM_!!6000000006116-2-tps-512-512.png');
		expect(result.player.url).toBeNull();
	});

	test('does not invent an Aliyun Drive extraction code when it is not in the URL', async () => {
		const result = await summaly('https://www.alipan.com/s/L6N3rF4xJiN');

		expect(result.description).toBe('打开链接查看分享内容');
	});
});
