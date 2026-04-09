import type { RESTBrowserMetadata } from './types.js';

const DefaultBrowserPreset = 'chrome-latest';
const DefaultProbeUrl = 'https://httpbin.org/headers';
const DefaultProbeTimeoutSeconds = 30;

export interface CloakedBrowserHeaders {
	acceptLanguage?: string;
	secChUa?: string;
	secChUaMobile?: '?0' | '?1';
	secChUaPlatform?: string;
	userAgent?: string;
}

const browserHeaderCache = new Map<string, Promise<CloakedBrowserHeaders>>();

function getHeader(headers: Record<string, string>, name: string) {
	const lowerCaseName = name.toLowerCase();

	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === lowerCaseName) {
			return value;
		}
	}

	return undefined;
}

async function fetchCloakedBrowserHeaders({
	preset = DefaultBrowserPreset,
	probeUrl = DefaultProbeUrl,
}: RESTBrowserMetadata): Promise<CloakedBrowserHeaders> {
	try {
		const { Session } = await import('httpcloak');
		const session = new Session({
			preset,
			retry: 0,
			timeout: DefaultProbeTimeoutSeconds,
			verify: false,
		});

		try {
			const response = await session.get(probeUrl);
			const data = JSON.parse(response.text) as { headers?: Record<string, string> };
			const headers = data.headers ?? {};
			const acceptLanguage = getHeader(headers, 'accept-language');
			const secChUa = getHeader(headers, 'sec-ch-ua');
			const secChUaMobile = getHeader(headers, 'sec-ch-ua-mobile') as '?0' | '?1' | undefined;
			const secChUaPlatform = getHeader(headers, 'sec-ch-ua-platform');
			const userAgent = getHeader(headers, 'user-agent');

			return {
				...(acceptLanguage ? { acceptLanguage } : {}),
				...(secChUa ? { secChUa } : {}),
				...(secChUaMobile ? { secChUaMobile } : {}),
				...(secChUaPlatform ? { secChUaPlatform } : {}),
				...(userAgent ? { userAgent } : {}),
			};
		} finally {
			session.close();
		}
	} catch {
		return {};
	}
}

export async function getCloakedBrowserHeaders(metadata: RESTBrowserMetadata): Promise<CloakedBrowserHeaders> {
	const preset = metadata.preset ?? DefaultBrowserPreset;
	const probeUrl = metadata.probeUrl ?? DefaultProbeUrl;
	const cacheKey = `${preset}:${probeUrl}`;

	const cachedHeaders =
		browserHeaderCache.get(cacheKey) ??
		fetchCloakedBrowserHeaders({
			preset,
			probeUrl,
		});

	browserHeaderCache.set(cacheKey, cachedHeaders);

	try {
		return await cachedHeaders;
	} catch {
		browserHeaderCache.delete(cacheKey);
		return {};
	}
}
