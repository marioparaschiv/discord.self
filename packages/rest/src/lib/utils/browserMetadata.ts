import { Buffer } from 'node:buffer';
import type { RequestHeaders, RESTBrowserMetadata, RESTBuildMetadata } from './types.js';

const DefaultBrowserVersion = '146.0.0.0';
const DefaultChromeUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${DefaultBrowserVersion} Safari/537.36`;

function getDefaultTimezone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

function getBrowserMajorVersion(browserVersion: string) {
	return browserVersion.split('.')[0] ?? '0';
}

function buildAcceptLanguage(locale: string) {
	return locale === 'en-US' ? 'en-US,en;q=0.9' : `${locale},en-US;q=0.9,en;q=0.8`;
}

function buildSecChUa(browser: string, browserVersion: string) {
	const major = getBrowserMajorVersion(browserVersion);

	if (browser === 'Microsoft Edge') {
		return `"Chromium";v="${major}", "Not-A.Brand";v="24", "Microsoft Edge";v="${major}"`;
	}

	return `"Chromium";v="${major}", "Not-A.Brand";v="24", "${browser}";v="${major}"`;
}

function resolveBuildMetadata(buildMetadata: RESTBuildMetadata | undefined) {
	return {
		clientBuildNumber: buildMetadata?.clientBuildNumber ?? 0,
		hostVersion: buildMetadata?.hostVersion,
		nativeBuildNumber: buildMetadata?.nativeBuildNumber,
	};
}

function buildSuperProperties(metadata: RESTBrowserMetadata) {
	const locale = metadata.locale ?? 'en-US';
	const browser = metadata.browser ?? 'Chrome';
	const browserVersion = metadata.browserVersion ?? DefaultBrowserVersion;
	const userAgent = metadata.userAgent ?? DefaultChromeUserAgent;
	const os = metadata.os ?? 'Windows';
	const osVersion = metadata.osVersion ?? '10';
	const releaseChannel = metadata.releaseChannel ?? 'stable';
	const buildMetadata = resolveBuildMetadata(metadata.buildMetadata);

	const superProperties = {
		browser,
		browser_user_agent: userAgent,
		browser_version: browserVersion,
		client_build_number: buildMetadata.clientBuildNumber,
		client_event_source: null,
		device: '',
		os,
		os_version: osVersion,
		release_channel: releaseChannel,
		system_locale: locale,
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

export function createBrowserMetadataHeaders(metadata: RESTBrowserMetadata): RequestHeaders {
	const locale = metadata.locale ?? 'en-US';
	const browser = metadata.browser ?? 'Chrome';
	const browserVersion = metadata.browserVersion ?? DefaultBrowserVersion;
	const os = metadata.os ?? 'Windows';
	const userAgent = metadata.userAgent ?? DefaultChromeUserAgent;
	const timezone = metadata.timezone ?? getDefaultTimezone();

	const headers: RequestHeaders = {
		'Accept-Language': metadata.acceptLanguage ?? buildAcceptLanguage(locale),
		'Sec-CH-UA': metadata.secChUa ?? buildSecChUa(browser, browserVersion),
		'Sec-CH-UA-Mobile': metadata.isMobile ? '?1' : '?0',
		'Sec-CH-UA-Platform': `"${os}"`,
		'User-Agent': userAgent,
		'X-Discord-Locale': locale,
		'X-Discord-Timezone': timezone,
	};

	if (metadata.superProperties !== false) {
		headers['X-Super-Properties'] = Buffer.from(JSON.stringify(buildSuperProperties(metadata))).toString('base64');
	}

	return headers;
}
