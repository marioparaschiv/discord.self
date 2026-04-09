import { Buffer } from 'node:buffer';
import { DefaultUserAgent } from './constants.js';
import { getCloakedBrowserHeaders } from './httpcloak.js';
import type { RequestHeaders, RESTBrowserMetadata, RESTBuildMetadata } from './types.js';

const DefaultBrowserVersion = '146.0.0.0';

function getDefaultTimezone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

function buildAcceptLanguage(locale: string) {
	return locale === 'en-US' ? 'en-US,en;q=0.9' : `${locale},en-US;q=0.9,en;q=0.8`;
}

function getBrowserVersion(userAgent: string) {
	const chromeVersionMatch = /(?:chrome|chromium|crios)\/(?<version>[\d.]+)/i.exec(userAgent);

	if (chromeVersionMatch?.groups?.version) {
		return chromeVersionMatch.groups.version;
	}

	const edgeVersionMatch = /edg\/(?<version>[\d.]+)/i.exec(userAgent);

	return edgeVersionMatch?.groups?.version ?? DefaultBrowserVersion;
}

function getBrowserMajorVersion(browserVersion: string) {
	return browserVersion.split('.')[0] ?? '0';
}

function getBrowserName(userAgent: string) {
	if (/edg\//i.test(userAgent)) {
		return 'Microsoft Edge';
	}

	if (/(?:chrome|chromium|crios)\//i.test(userAgent)) {
		return 'Chrome';
	}

	return 'Chrome';
}

function getOsName(userAgent: string, secChUaPlatform?: string) {
	const normalizedPlatform = secChUaPlatform?.replaceAll('"', '');

	if (normalizedPlatform) {
		return normalizedPlatform;
	}

	if (/windows nt/i.test(userAgent)) {
		return 'Windows';
	}

	if (/android/i.test(userAgent)) {
		return 'Android';
	}

	if (/iphone|ipad|ipod/i.test(userAgent)) {
		return 'iOS';
	}

	if (/mac os x/i.test(userAgent)) {
		return 'macOS';
	}

	if (/linux/i.test(userAgent)) {
		return 'Linux';
	}

	return 'Windows';
}

function getOsVersion(userAgent: string, os: string) {
	if (os === 'Windows') {
		return /windows nt (?<version>[\d.]+)/i.exec(userAgent)?.groups?.version?.replace('10.0', '10') ?? '10';
	}

	if (os === 'Android') {
		return /android (?<version>[\d.]+)/i.exec(userAgent)?.groups?.version ?? '';
	}

	if (os === 'iOS') {
		return /os (?<version>[\d_]+)/i.exec(userAgent)?.groups?.version?.replaceAll('_', '.') ?? '';
	}

	if (os === 'macOS') {
		return /mac os x (?<version>[\d_]+)/i.exec(userAgent)?.groups?.version?.replaceAll('_', '.') ?? '';
	}

	return '';
}

function buildSecChUa(browser: string, browserVersion: string) {
	const major = getBrowserMajorVersion(browserVersion);

	if (browser === 'Microsoft Edge') {
		return `"Chromium";v="${major}", "Not-A.Brand";v="24", "Microsoft Edge";v="${major}"`;
	}

	return `"Chromium";v="${major}", "Not-A.Brand";v="24", "Google Chrome";v="${major}"`;
}

function resolveBuildMetadata(buildMetadata: RESTBuildMetadata | undefined) {
	return {
		clientBuildNumber: buildMetadata?.clientBuildNumber ?? 0,
		hostVersion: buildMetadata?.hostVersion,
		nativeBuildNumber: buildMetadata?.nativeBuildNumber,
	};
}

function buildSuperProperties(metadata: RESTBrowserMetadata, resolvedHeaders: Required<CloakedHeaderDefaults>) {
	const buildMetadata = resolveBuildMetadata(metadata.buildMetadata);
	const releaseChannel = metadata.releaseChannel ?? 'stable';

	const superProperties = {
		browser: metadata.browser ?? resolvedHeaders.browser,
		browser_user_agent: metadata.userAgent ?? resolvedHeaders.userAgent,
		browser_version: metadata.browserVersion ?? resolvedHeaders.browserVersion,
		client_build_number: buildMetadata.clientBuildNumber,
		client_event_source: null,
		device: '',
		os: metadata.os ?? resolvedHeaders.os,
		os_version: metadata.osVersion ?? resolvedHeaders.osVersion,
		release_channel: releaseChannel,
		system_locale: metadata.locale ?? resolvedHeaders.locale,
		...(buildMetadata.hostVersion ? { host_version: buildMetadata.hostVersion } : {}),
		...(buildMetadata.nativeBuildNumber ? { native_build_number: buildMetadata.nativeBuildNumber } : {}),
	};

	if (metadata.superProperties && typeof metadata.superProperties === 'object') {
		return {
			...superProperties,
			...metadata.superProperties,
		};
	}

	return superProperties;
}

interface CloakedHeaderDefaults {
	acceptLanguage: string;
	browser: string;
	browserVersion: string;
	isMobile: boolean;
	locale: string;
	os: string;
	osVersion: string;
	secChUa: string;
	secChUaMobile: '?0' | '?1';
	secChUaPlatform: string;
	userAgent: string;
}

async function resolveCloakedHeaderDefaults(metadata: RESTBrowserMetadata): Promise<CloakedHeaderDefaults> {
	const cloakedHeaders = await getCloakedBrowserHeaders(metadata);
	const userAgent = metadata.userAgent ?? cloakedHeaders.userAgent ?? DefaultUserAgent;
	const browserVersion = metadata.browserVersion ?? getBrowserVersion(userAgent);
	const browser = metadata.browser ?? getBrowserName(userAgent);
	const localeFromLanguage = (metadata.acceptLanguage ?? cloakedHeaders.acceptLanguage)?.split(',')[0]?.trim();
	const locale = metadata.locale ?? localeFromLanguage ?? 'en-US';
	const os = metadata.os ?? getOsName(userAgent, metadata.secChUaPlatform ?? cloakedHeaders.secChUaPlatform);
	const osVersion = metadata.osVersion ?? getOsVersion(userAgent, os);
	const isMobile = metadata.isMobile ?? /mobile|android|iphone|ipad|ipod/i.test(userAgent);
	const acceptLanguage =
		metadata.acceptLanguage ??
		(metadata.locale ? buildAcceptLanguage(locale) : undefined) ??
		cloakedHeaders.acceptLanguage ??
		buildAcceptLanguage(locale);

	return {
		acceptLanguage,
		browser,
		browserVersion,
		isMobile,
		locale,
		os,
		osVersion,
		secChUa: metadata.secChUa ?? cloakedHeaders.secChUa ?? buildSecChUa(browser, browserVersion),
		secChUaMobile: metadata.secChUaMobile ?? cloakedHeaders.secChUaMobile ?? (isMobile ? '?1' : '?0'),
		secChUaPlatform: metadata.secChUaPlatform ?? cloakedHeaders.secChUaPlatform ?? `"${os}"`,
		userAgent,
	};
}

export async function createBrowserMetadataHeaders(metadata: RESTBrowserMetadata): Promise<RequestHeaders> {
	const defaults = await resolveCloakedHeaderDefaults(metadata);
	const timezone = metadata.timezone ?? getDefaultTimezone();

	const headers: RequestHeaders = {
		'Accept-Language': defaults.acceptLanguage,
		'Sec-CH-UA': defaults.secChUa,
		'Sec-CH-UA-Mobile': defaults.secChUaMobile,
		'Sec-CH-UA-Platform': defaults.secChUaPlatform,
		'User-Agent': defaults.userAgent,
		'X-Discord-Locale': defaults.locale,
		'X-Discord-Timezone': timezone,
	};

	if (metadata.superProperties !== false) {
		headers['X-Super-Properties'] = Buffer.from(JSON.stringify(buildSuperProperties(metadata, defaults))).toString(
			'base64',
		);
	}

	return headers;
}
