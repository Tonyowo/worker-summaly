import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type UrlSafetyOptions = {
	allowPrivateIp?: boolean;
};

const blockedHostnames = new Set([
	'localhost',
]);

function normalizeHostname(hostname: string): string {
	const lower = hostname.toLowerCase().replace(/\.$/, '');
	if (lower.startsWith('[') && lower.endsWith(']')) {
		return lower.slice(1, -1);
	}
	return lower;
}

function isBlockedHostname(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	return blockedHostnames.has(normalized) || normalized.endsWith('.localhost');
}

function isPrivateIpv4(address: string): boolean {
	const parts = address.split('.').map(part => Number(part));
	if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
		return true;
	}

	const [a, b] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0) ||
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) ||
		(a === 198 && b === 51) ||
		(a === 203 && b === 0) ||
		a >= 224
	);
}

function expandIpv6(address: string): number[] | null {
	const mappedIpv4 = address.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
	if (mappedIpv4) {
		return isPrivateIpv4(mappedIpv4[1]) ? [0] : [0x2000];
	}

	const parts = address.split('::');
	if (parts.length > 2) return null;

	const left = parts[0] ? parts[0].split(':') : [];
	const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
	const missing = 8 - left.length - right.length;
	if (missing < 0) return null;

	const groups = [
		...left,
		...Array<string>(missing).fill('0'),
		...right,
	];

	if (groups.length !== 8) return null;

	return groups.map((group) => {
		const value = Number.parseInt(group, 16);
		return Number.isNaN(value) ? -1 : value;
	});
}

function isPrivateIpv6(address: string): boolean {
	const groups = expandIpv6(address);
	if (!groups || groups.some(group => group < 0 || group > 0xffff)) {
		return true;
	}

	const isUnspecified = groups.every(group => group === 0);
	const isLoopback = groups.slice(0, 7).every(group => group === 0) && groups[7] === 1;
	const first = groups[0];

	return (
		isUnspecified ||
		isLoopback ||
		(first & 0xfe00) === 0xfc00 ||
		(first & 0xffc0) === 0xfe80 ||
		(first & 0xff00) === 0xff00
	);
}

export function isPrivateAddress(address: string): boolean {
	const normalized = normalizeHostname(address);
	const version = isIP(normalized);
	if (version === 4) return isPrivateIpv4(normalized);
	if (version === 6) return isPrivateIpv6(normalized);
	return true;
}

export async function assertPublicUrl(url: string | URL, options?: UrlSafetyOptions): Promise<void> {
	if (options?.allowPrivateIp) return;

	const parsed = typeof url === 'string' ? new URL(url) : url;
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error('Only http and https URLs are supported');
	}

	const hostname = normalizeHostname(parsed.hostname);
	if (isBlockedHostname(hostname)) {
		throw new Error('Private or local network URLs are not allowed');
	}

	const version = isIP(hostname);
	if (version !== 0) {
		if (isPrivateAddress(hostname)) {
			throw new Error('Private or local network URLs are not allowed');
		}
		return;
	}

	const addresses = await lookup(hostname, {
		all: true,
		verbatim: true,
	});

	if (addresses.some(address => isPrivateAddress(address.address))) {
		throw new Error('Private or local network URLs are not allowed');
	}
}
