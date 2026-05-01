import Summary from '@/summary.js';

export const name = 'cloud-drive';
export const skipRedirectResolution = true;

const BAIDU_NETDISK_ICON = 'https://pan.baidu.com/m-static/base/static/images/favicon.ico';
const ALIYUN_DRIVE_ICON = 'https://img.alicdn.com/imgextra/i1/O1CN01JDQCi21Dc8EfbRwvF_!!6000000000236-73-tps-64-64.ico';

const EMPTY_PLAYER = {
	url: null,
	width: null,
	height: null,
	allow: [],
};

function isBaiduNetdiskShare(url: URL): boolean {
	if (!['http:', 'https:'].includes(url.protocol)) {
		return false;
	}

	if (url.hostname !== 'pan.baidu.com') {
		return false;
	}

	return url.pathname.startsWith('/s/') || url.pathname === '/share/init';
}

function isAliyunDriveShare(url: URL): boolean {
	if (!['http:', 'https:'].includes(url.protocol)) {
		return false;
	}

	if (!['alipan.com', 'www.alipan.com', 'aliyundrive.com', 'www.aliyundrive.com'].includes(url.hostname)) {
		return false;
	}

	return url.pathname.startsWith('/s/');
}

function getExtractionCode(url: URL): string | null {
	const code =
		url.searchParams.get('pwd') ||
		url.searchParams.get('code') ||
		url.searchParams.get('password');

	if (!code) {
		return null;
	}

	const trimmed = code.trim();
	if (!trimmed || trimmed.length > 32) {
		return null;
	}

	return trimmed;
}

function descriptionFor(url: URL): string {
	const code = getExtractionCode(url);
	if (code) {
		return `需要提取码 ${code}`;
	}

	return '打开链接查看分享内容';
}

export function test(url: URL): boolean {
	return isBaiduNetdiskShare(url) || isAliyunDriveShare(url);
}

export async function summarize(url: URL): Promise<Summary | null> {
	if (isBaiduNetdiskShare(url)) {
		return {
			title: '百度网盘分享',
			icon: BAIDU_NETDISK_ICON,
			description: descriptionFor(url),
			thumbnail: null,
			player: EMPTY_PLAYER,
			sitename: '百度网盘',
			sensitive: false,
			activityPub: null,
			fediverseCreator: null,
		};
	}

	if (isAliyunDriveShare(url)) {
		return {
			title: '阿里云盘分享',
			icon: ALIYUN_DRIVE_ICON,
			description: descriptionFor(url),
			thumbnail: null,
			player: EMPTY_PLAYER,
			sitename: '阿里云盘',
			sensitive: false,
			activityPub: null,
			fediverseCreator: null,
		};
	}

	return null;
}
