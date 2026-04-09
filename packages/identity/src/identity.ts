import { Session } from 'httpcloak';
import { getDiscordBuildMetadata } from './buildMetadata.js';
import type { DiscordBuildMetadata } from './buildMetadata.js';
import {
	DEFAULT_ACCEPT_ENCODING,
	DEFAULT_COOKIE_DOMAIN,
	DEFAULT_COOKIE_PATH,
	DEFAULT_HTTPBIN_URL,
	DEFAULT_RELEASE_CHANNEL,
	DEFAULT_TIMEOUT_MS,
	DEFAULT_WARMUP_URL,
	DEFAULT_X_DEBUG_OPTIONS,
} from './constants.js';
import type {
	DiscordIdentityHeaderOptions,
	DiscordIdentityOptions,
	DiscordIdentityProfile,
	DiscordRequestFingerprint,
	DiscordSuperProperties,
	HTTPCloakCookieOptions,
	HTTPCloakRequestOptions,
	HTTPCloakResponseLike,
	HTTPCloakSessionLike,
	HTTPCloakSessionOptions,
	NormalizedRequestInit,
	ResponseLike,
	SerializedDiscordIdentity,
} from './types.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface DiscoveredHeadersResponse {
	headers?: Record<string, string>;
}

interface ResolvedDiscordIdentityOptions {
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

interface DiscordIdentityState {
	buildMetadata: DiscordBuildMetadata | undefined;
	profile: DiscordIdentityProfile | undefined;
	warmed: boolean;
}

function getDefaultTimezone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function resolveOptions(options: DiscordIdentityOptions = {}): ResolvedDiscordIdentityOptions {
	return {
		buildMetadata: options.buildMetadata,
		fetch: options.fetch ?? fetch,
		httpbinUrl: options.httpbinUrl ?? DEFAULT_HTTPBIN_URL,
		locale: options.locale,
		seedCookies: options.seedCookies ?? {},
		session: options.session ?? {},
		storage: options.storage,
		token: options.token,
		timezone: options.timezone ?? getDefaultTimezone(),
		warmupUrl: options.warmupUrl ?? DEFAULT_WARMUP_URL,
	};
}

function normalizeHeaders(headers?: HeadersInit | Record<string, string>) {
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

function withLowerCaseKeys(record: Record<string, string>) {
	return Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
}

function getHeader(headers: Record<string, string>, name: string) {
	return headers[name.toLowerCase()];
}

function encodeBase64(value: string) {
	return btoa(value);
}

function toResponseBody(response: HTTPCloakResponseLike) {
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

function toResponseLike(response: HTTPCloakResponseLike): ResponseLike {
	let bodyUsed = false;
	const body = toResponseBody(response);
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
			return JSON.parse(textDecoder.decode(body));
		},
		ok: response.statusCode >= 200 && response.statusCode < 300,
		status: response.statusCode,
		statusText: '',
		async text() {
			bodyUsed = true;
			return textDecoder.decode(body);
		},
	};
}

function parseLocale(acceptLanguage: string) {
	return acceptLanguage.split(',')[0]?.trim() || 'en-US';
}

function parseBrowserName(userAgent: string) {
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

function parseBrowserVersion(userAgent: string) {
	const match = userAgent.match(/(?:Chrome|Edg|Firefox|Version)\/([\d.]+)/);
	return match?.[1] ?? '0.0.0.0';
}

function parseOs(userAgent: string) {
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

function buildSecChUa(userAgentMajor: string) {
	return `"Chromium";v="${userAgentMajor}", "Not-A.Brand";v="24", "Google Chrome";v="${userAgentMajor}"`;
}

function toProfile(headers: Record<string, string>) {
	const userAgent = getHeader(headers, 'user-agent');

	if (!userAgent) {
		throw new Error('Identity discovery response did not include a User-Agent header');
	}

	const acceptLanguage = getHeader(headers, 'accept-language') ?? 'en-US,en;q=0.9';
	const locale = parseLocale(acceptLanguage);
	const browserVersion = parseBrowserVersion(userAgent);
	const userAgentMajor = browserVersion.split('.')[0] ?? '0';
	const { os, osVersion } = parseOs(userAgent);

	return {
		acceptLanguage,
		browser: parseBrowserName(userAgent),
		browserVersion,
		isMobile: /Android|iPhone|iPad|Mobile/i.test(userAgent),
		locale,
		os,
		osVersion,
		secChUa: buildSecChUa(userAgentMajor),
		userAgent,
		userAgentMajor,
	} satisfies DiscordIdentityProfile;
}

function toSuperProperties(
	profile: DiscordIdentityProfile,
	buildMetadata: DiscordBuildMetadata,
	fingerprint?: DiscordRequestFingerprint,
	extra: Record<string, unknown> = {},
) {
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

async function performSessionRequest(session: HTTPCloakSessionLike, url: string, init: NormalizedRequestInit = {}) {
	const method = (init.method ?? 'GET').toUpperCase();
	const headers = normalizeHeaders(init.headers);
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

export class DiscordIdentity {
	#buildMetadata: DiscordBuildMetadata | undefined;
	#options: ResolvedDiscordIdentityOptions;
	#profile: DiscordIdentityProfile | undefined;
	#profilePromise: Promise<DiscordIdentityProfile> | null = null;
	#session: HTTPCloakSessionLike;
	#warmPromise: Promise<void> | null = null;
	#warmed = false;

	public constructor(
		session: HTTPCloakSessionLike,
		options: DiscordIdentityOptions = {},
		state: DiscordIdentityState = { buildMetadata: undefined, profile: undefined, warmed: false },
	) {
		this.#session = session;
		this.#options = resolveOptions(options);
		this.#profile = state.profile;
		this.#buildMetadata = state.buildMetadata ?? this.#options.buildMetadata;
		this.#warmed = state.warmed;

		for (const [name, value] of Object.entries(this.#options.seedCookies)) {
			this.setCookie(name, value);
		}
	}

	public async discover() {
		return this.#ensureProfile();
	}

	public async ensureReady() {
		await this.warmup();
		await this.#ensureProfile();
	}

	public close() {
		void this.persist();
		this.#session.close();
	}

	public getRequestHandler() {
		return makeDiscordCloakedRequest(this);
	}

	public async getHeaders(options: DiscordIdentityHeaderOptions = {}) {
		const profile = await this.#ensureProfile();
		const buildMetadata = await this.#ensureBuildMetadata();
		const locale = options.locale ?? this.#options.locale ?? profile.locale;
		const timezone = options.timezone ?? this.#options.timezone;

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
			'x-super-properties': encodeBase64(
				JSON.stringify(toSuperProperties(profile, buildMetadata, options.fingerprint, options.superProperties)),
			),
			...options.extraHeaders,
		};
	}

	public async getProfile() {
		return this.#ensureProfile();
	}

	public async getSuperProperties(fingerprint?: DiscordRequestFingerprint, extra: Record<string, unknown> = {}) {
		const profile = await this.#ensureProfile();
		const buildMetadata = await this.#ensureBuildMetadata();
		return toSuperProperties(profile, buildMetadata, fingerprint, extra);
	}

	public async request(url: string, init: NormalizedRequestInit = {}): Promise<ResponseLike> {
		if (init.signal?.aborted) {
			throw init.signal.reason ?? new Error('The request was aborted before it started');
		}

		await this.ensureReady();

		const identityHeaders = await this.getHeaders();
		const requestHeaders = normalizeHeaders(init.headers);
		const mergedHeaders = { ...identityHeaders, ...requestHeaders };

		try {
			const response = await performSessionRequest(this.#session, url, {
				...init,
				headers: mergedHeaders,
			});

			return toResponseLike(response);
		} catch (error) {
			if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
				throw new Error(`Request timed out: ${(init.method ?? 'GET').toUpperCase()} ${url}`);
			}

			throw error;
		}
	}

	public serialize(): SerializedDiscordIdentity {
		const serialized: SerializedDiscordIdentity = {
			session: this.#session.marshal(),
			version: 1,
			warmed: this.#warmed,
		};

		if (this.#buildMetadata) {
			serialized.buildMetadata = this.#buildMetadata;
		}

		if (this.#profile) {
			serialized.profile = this.#profile;
		}

		return serialized;
	}

	public setCookie(name: string, value: string, options: HTTPCloakCookieOptions = {}) {
		this.#session.setCookie(name, value, {
			domain: options.domain ?? DEFAULT_COOKIE_DOMAIN,
			path: options.path ?? DEFAULT_COOKIE_PATH,
			secure: options.secure ?? true,
			...options,
		});
		void this.persist();
	}

	public async warmup() {
		if (this.#warmed) {
			return;
		}

		this.#warmPromise ??= Promise.resolve(this.#session.warmup(this.#options.warmupUrl)).then(() => {
			this.#warmed = true;
			return this.persist();
		});

		return this.#warmPromise;
	}

	public async persist() {
		const token = this.#options.token;
		const storage = this.#options.storage;

		if (!token || !storage) {
			return;
		}

		await storage.set(token, this.serialize());
	}

	async #ensureBuildMetadata(): Promise<DiscordBuildMetadata> {
		if (!this.#buildMetadata) {
			try {
				this.#buildMetadata = await getDiscordBuildMetadata({ fetch: this.#options.fetch });
			} catch {
				this.#buildMetadata = {
					clientBuildNumber: 0,
				};
			}
		}

		return this.#buildMetadata;
	}

	async #ensureProfile(): Promise<DiscordIdentityProfile> {
		if (this.#profile) {
			return this.#applyProfileOverrides(this.#profile);
		}

		this.#profilePromise ??= (async () => {
			await this.warmup();
			const response = await this.#session.get(this.#options.httpbinUrl);
			const body = typeof response.text === 'string' ? response.text : textDecoder.decode(toResponseBody(response));
			const payload = JSON.parse(body) as DiscoveredHeadersResponse;
			const normalizedHeaders = withLowerCaseKeys(payload.headers ?? {});
			const profile = this.#applyProfileOverrides(toProfile(normalizedHeaders));
			this.#profile = profile;
			await this.persist();
			return profile;
		})();

		return this.#profilePromise;
	}

	#applyProfileOverrides(profile: DiscordIdentityProfile) {
		return {
			...profile,
			locale: this.#options.locale ?? profile.locale,
		};
	}
}

export async function createDiscordIdentity(options: DiscordIdentityOptions = {}) {
	const resolvedOptions = resolveOptions(options);

	if (resolvedOptions.storage && !resolvedOptions.token) {
		throw new Error('DiscordIdentity storage requires a token so sessions can be keyed per account');
	}

	if (resolvedOptions.storage && resolvedOptions.token) {
		const persisted = await resolvedOptions.storage.get(resolvedOptions.token);

		if (persisted) {
			try {
				return await restoreDiscordIdentity(persisted, options);
			} catch {
				await resolvedOptions.storage.delete(resolvedOptions.token);
			}
		}
	}

	const session = new Session({
		preset: 'chrome-latest',
		retry: 0,
		timeout: DEFAULT_TIMEOUT_MS / 1_000,
		verify: false,
		...resolvedOptions.session,
	});

	return new DiscordIdentity(session, options);
}

export async function restoreDiscordIdentity(
	serialized: SerializedDiscordIdentity,
	options: DiscordIdentityOptions = {},
) {
	const resolvedOptions = resolveOptions(options);

	if (resolvedOptions.storage && !resolvedOptions.token) {
		throw new Error('DiscordIdentity storage requires a token so sessions can be keyed per account');
	}

	const session = Session.unmarshal(serialized.session);
	return new DiscordIdentity(session, options, {
		buildMetadata: serialized.buildMetadata,
		profile: serialized.profile,
		warmed: serialized.warmed,
	});
}

export function makeDiscordCloakedRequest(identity: DiscordIdentity) {
	return async (url: string, init: RequestInit = {}) => identity.request(url, init as NormalizedRequestInit);
}
