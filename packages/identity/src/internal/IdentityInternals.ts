import { Session } from 'httpcloak';
import type { DiscordBuildMetadata } from '../buildMetadata.js';
import {
	DEFAULT_ACCEPT_ENCODING,
	DEFAULT_HTTPBIN_URL,
	DEFAULT_RELEASE_CHANNEL,
	DEFAULT_TIMEOUT_MS,
	DEFAULT_WARMUP_URL,
	DEFAULT_X_DEBUG_OPTIONS,
} from '../constants.js';
import type {
	DiscordIdentityHeaderOptions,
	DiscordIdentityHeaders,
	DiscordIdentityOptions,
	DiscordIdentityProfile,
	DiscordRequestFingerprint,
	DiscordResolvedSuperProperties,
	DiscordSuperProperties,
	HTTPCloakRequestOptions,
	HTTPCloakResponseLike,
	HTTPCloakSessionLike,
	HTTPCloakSessionOptions,
	NormalizedRequestInit,
	ResponseLike,
	SerializedDiscordIdentity,
} from '../types.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface DiscoveredHeadersResponse {
	headers?: Record<string, string>;
}

export interface ResolvedDiscordIdentityOptions {
	buildMetadata: DiscordBuildMetadata | undefined;
	fetch: typeof fetch;
	httpbinUrl: string;
	locale: string | undefined;
	seedCookies: Record<string, string>;
	session: Partial<HTTPCloakSessionOptions>;
	storage: DiscordIdentityOptions['storage'];
	token: string | undefined;
	timezone: string;
	warmupUrl: string;
}

export class IdentityOptionsResolver {
	public static resolve(options: DiscordIdentityOptions = {}): ResolvedDiscordIdentityOptions {
		return {
			buildMetadata: options.buildMetadata,
			fetch: options.fetch ?? fetch,
			httpbinUrl: options.httpbinUrl ?? DEFAULT_HTTPBIN_URL,
			locale: options.locale,
			seedCookies: options.seedCookies ?? {},
			session: options.session ?? {},
			storage: options.storage,
			token: options.token,
			timezone: options.timezone ?? IdentityOptionsResolver.getDefaultTimezone(),
			warmupUrl: options.warmupUrl ?? DEFAULT_WARMUP_URL,
		};
	}

	public static assertStorageToken(options: ResolvedDiscordIdentityOptions) {
		if (options.storage && !options.token) {
			throw new Error('DiscordIdentity storage requires a token so sessions can be keyed per account');
		}
	}

	public static createSession(options: ResolvedDiscordIdentityOptions): HTTPCloakSessionLike {
		return new Session({
			preset: 'chrome-latest',
			retry: 0,
			timeout: DEFAULT_TIMEOUT_MS / 1_000,
			verify: false,
			...options.session,
		});
	}

	public static restoreSession(serialized: SerializedDiscordIdentity): HTTPCloakSessionLike {
		return Session.unmarshal(serialized.session);
	}

	private static getDefaultTimezone() {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	}
}

export class IdentityHeaders {
	public static build(
		profile: DiscordIdentityProfile,
		buildMetadata: DiscordBuildMetadata,
		options: DiscordIdentityHeaderOptions,
		resolvedOptions: ResolvedDiscordIdentityOptions,
	): DiscordIdentityHeaders {
		const locale = options.locale ?? resolvedOptions.locale ?? profile.locale;
		const timezone = options.timezone ?? resolvedOptions.timezone;

		return {
			'accept-encoding': DEFAULT_ACCEPT_ENCODING,
			'accept-language': profile.acceptLanguage,
			dnt: '1',
			'sec-ch-ua': profile.secChUa,
			'sec-ch-ua-mobile': profile.isMobile ? '?1' : '?0',
			'sec-ch-ua-platform': `"${profile.os}"`,
			'user-agent': profile.userAgent,
			'x-debug-options': DEFAULT_X_DEBUG_OPTIONS,
			'x-discord-locale': locale,
			'x-discord-timezone': timezone,
			'x-super-properties': IdentityEncoding.encodeBase64(
				JSON.stringify(
					IdentitySuperPropertiesBuilder.toSuperProperties(
						profile,
						buildMetadata,
						options.fingerprint,
						options.superProperties,
					),
				),
			),
			...options.extraHeaders,
		};
	}

	public static normalize(headers?: HeadersInit | Record<string, string>) {
		if (!headers) {
			return {} as Record<string, string>;
		}

		if (headers instanceof Headers) {
			return Object.fromEntries(headers.entries());
		}

		if (Array.isArray(headers)) {
			return Object.fromEntries(headers);
		}

		return { ...headers };
	}

	public static withLowerCaseKeys(record: Record<string, string>) {
		return Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
	}

	public static get(headers: Record<string, string>, name: string) {
		return headers[name.toLowerCase()];
	}
}

export class IdentityEncoding {
	public static encodeBase64(value: string) {
		return btoa(value);
	}

	public static toResponseBody(response: HTTPCloakResponseLike) {
		if (typeof response.text === 'string') {
			return textEncoder.encode(response.text);
		}

		if (typeof response.body === 'string') {
			return textEncoder.encode(response.body);
		}

		if (response.body instanceof Uint8Array) {
			return response.body;
		}

		return new Uint8Array();
	}

	public static decodeBody(body: Uint8Array) {
		return textDecoder.decode(body);
	}
}

export class IdentityResponseAdapter {
	public static toResponseLike(response: HTTPCloakResponseLike): ResponseLike {
		let bodyUsed = false;
		const body = IdentityEncoding.toResponseBody(response);
		const headers = new Headers(response.headers);

		return {
			body: null,
			async arrayBuffer() {
				bodyUsed = true;
				return body.slice().buffer;
			},
			get bodyUsed() {
				return bodyUsed;
			},
			headers,
			async json() {
				bodyUsed = true;
				return JSON.parse(IdentityEncoding.decodeBody(body));
			},
			ok: response.statusCode >= 200 && response.statusCode < 300,
			status: response.statusCode,
			statusText: '',
			async text() {
				bodyUsed = true;
				return IdentityEncoding.decodeBody(body);
			},
		};
	}
}

export class IdentityProfileParser {
	public static toProfile(headers: Record<string, string>) {
		const userAgent = IdentityHeaders.get(headers, 'user-agent');

		if (!userAgent) {
			throw new Error('Identity discovery response did not include a User-Agent header');
		}

		const acceptLanguage = IdentityHeaders.get(headers, 'accept-language') ?? 'en-US,en;q=0.9';
		const locale = IdentityProfileParser.parseLocale(acceptLanguage);
		const browserVersion = IdentityProfileParser.parseBrowserVersion(userAgent);
		const userAgentMajor = browserVersion.split('.')[0] ?? '0';
		const { os, osVersion } = IdentityProfileParser.parseOs(userAgent);

		return {
			acceptLanguage,
			browser: IdentityProfileParser.parseBrowserName(userAgent),
			browserVersion,
			isMobile: /Android|iPhone|iPad|Mobile/i.test(userAgent),
			locale,
			os,
			osVersion,
			secChUa: IdentityProfileParser.buildSecChUa(userAgentMajor),
			userAgent,
			userAgentMajor,
		} satisfies DiscordIdentityProfile;
	}

	private static parseLocale(acceptLanguage: string) {
		return acceptLanguage.split(',')[0]?.trim() || 'en-US';
	}

	private static parseBrowserName(userAgent: string) {
		if (userAgent.includes('Edg/')) {
			return 'Microsoft Edge';
		}

		if (userAgent.includes('Chrome/')) {
			return 'Chrome';
		}

		if (userAgent.includes('Firefox/')) {
			return 'Firefox';
		}

		if (userAgent.includes('Safari/')) {
			return 'Safari';
		}

		return 'Unknown';
	}

	private static parseBrowserVersion(userAgent: string) {
		const match = userAgent.match(/(?:Chrome|Edg|Firefox|Version)\/([\d.]+)/);
		return match?.[1] ?? '0.0.0.0';
	}

	private static parseOs(userAgent: string) {
		const windows = userAgent.match(/Windows NT ([\d.]+)/);
		if (windows) {
			const windowsVersion = windows[1];
			const versionMap: Record<string, string> = {
				'10.0': '10',
				'6.3': '8.1',
				'6.2': '8',
				'6.1': '7',
			};

			return {
				os: 'Windows',
				osVersion: windowsVersion ? (versionMap[windowsVersion] ?? windowsVersion) : '',
			};
		}

		const mac = userAgent.match(/Mac OS X ([\d_]+)/);
		if (mac) {
			const macVersion = mac[1];
			return {
				os: 'macOS',
				osVersion: macVersion ? macVersion.replaceAll('_', '.') : '',
			};
		}

		const android = userAgent.match(/Android ([\d.]+)/);
		if (android) {
			const androidVersion = android[1];
			return {
				os: 'Android',
				osVersion: androidVersion ?? '',
			};
		}

		const ios = userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/);
		if (ios) {
			const iosVersion = ios[1];
			return {
				os: 'iOS',
				osVersion: iosVersion ? iosVersion.replaceAll('_', '.') : '',
			};
		}

		if (userAgent.includes('Linux')) {
			return {
				os: 'Linux',
				osVersion: '',
			};
		}

		return {
			os: 'Unknown',
			osVersion: '',
		};
	}

	private static buildSecChUa(userAgentMajor: string) {
		return `"Chromium";v="${userAgentMajor}", "Not-A.Brand";v="24", "Google Chrome";v="${userAgentMajor}"`;
	}
}

export class IdentitySuperPropertiesBuilder {
	public static toSuperProperties(
		profile: DiscordIdentityProfile,
		buildMetadata: DiscordBuildMetadata,
		fingerprint?: DiscordRequestFingerprint,
		extra: Record<string, unknown> = {},
	): DiscordResolvedSuperProperties {
		const properties: DiscordSuperProperties & Record<string, unknown> = {
			browser: profile.browser,
			browser_user_agent: profile.userAgent,
			browser_version: profile.browserVersion,
			client_build_number: buildMetadata.clientBuildNumber,
			client_event_source: null,
			device: '',
			os: profile.os,
			os_version: profile.osVersion,
			release_channel: DEFAULT_RELEASE_CHANNEL,
			system_locale: profile.locale,
		};

		if (buildMetadata.hostVersion) {
			properties.host_version = buildMetadata.hostVersion;
		}

		if (buildMetadata.nativeBuildNumber) {
			properties.native_build_number = buildMetadata.nativeBuildNumber;
		}

		if (fingerprint?.clientLaunchId) {
			properties.client_launch_id = fingerprint.clientLaunchId;
		}

		if (fingerprint?.launchSignature) {
			properties.launch_signature = fingerprint.launchSignature;
		}

		if (fingerprint?.clientHeartbeatSessionId) {
			properties.client_heartbeat_session_id = fingerprint.clientHeartbeatSessionId;
		}

		return {
			...properties,
			...extra,
		};
	}
}

export class IdentitySessionTransport {
	public static async performRequest(session: HTTPCloakSessionLike, url: string, init: NormalizedRequestInit = {}) {
		const method = (init.method ?? 'GET').toUpperCase();
		const headers = IdentityHeaders.normalize(init.headers);
		const requestOptions: HTTPCloakRequestOptions = {
			headers,
		};

		if (init.body !== undefined) {
			requestOptions.body = init.body as Exclude<HTTPCloakRequestOptions['body'], undefined>;
		}

		switch (method) {
			case 'GET':
				return session.get(url, requestOptions);
			case 'POST':
				return session.post(url, requestOptions);
			case 'PUT':
				return session.put(url, requestOptions);
			case 'PATCH':
				return session.patch(url, requestOptions);
			case 'DELETE':
				return session.delete(url, requestOptions);
			default:
				throw new Error(`Unsupported method for httpcloak transport: ${method}`);
		}
	}
}
