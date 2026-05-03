import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export const name = 'gelbooru';

export function test(url: URL): boolean {
	return url.hostname === 'gelbooru.com' &&
		url.pathname === '/index.php' &&
		url.searchParams.get('page') === 'post' &&
		url.searchParams.get('s') === 'view' &&
		!!url.searchParams.get('id');
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	const result = await general(url, opts);
	if (!result) return null;

	const thumbnail = toPublicThumbnail(result.thumbnail);
	if (thumbnail) {
		result.thumbnail = thumbnail;
	}

	return result;
}

function toPublicThumbnail(imageUrl: string | null): string | null {
	if (!imageUrl) return null;

	const parsed = (() => {
		try {
			return new URL(imageUrl);
		} catch {
			return null;
		}
	})();
	if (!parsed || !/^img\d*\.gelbooru\.com$/.test(parsed.hostname)) {
		return null;
	}

	const match = parsed.pathname.match(/^\/\/images\/([0-9a-f]{2})\/([0-9a-f]{2})\/([0-9a-f]+)\.(?:jpe?g|png|gif|webp)$/i);
	if (!match) {
		return null;
	}

	const [, first, second, hash] = match;
	return `https://gelbooru.com/thumbnails//${first}/${second}/thumbnail_${hash}.jpg`;
}
