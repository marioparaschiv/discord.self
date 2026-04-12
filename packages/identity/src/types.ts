import type { Session } from 'httpcloak';
import type { DiscordBuildMetadata } from './buildMetadata.js';

/**
 * Minimal fetch-like response shape returned by identity-powered requests.
 */
export interface ResponseLike extends Pick<
	Response,
	'arrayBuffer' | 'bodyUsed' | 'headers' | 'json' | 'ok' | 'status' | 'statusText' | 'text'
> {
	/**
	 * Stream body when available from the underlying response.
	 */
	body: ReadableStream | null;
}

/**
 * Request handler shape accepted by `@discord.self/rest` clients.
 */
export type DiscordCloakedRequestHandler = (url: string, init?: RequestInit) => Promise<ResponseLike>;

export type HTTPCloakSessionOptions = ConstructorParameters<typeof Session>[0];
export type HTTPCloakCookieOptions = Parameters<Session['setCookie']>[2];
export type HTTPCloakResponseLike = Awaited<ReturnType<Session['get']>>;
export type HTTPCloakRequestOptions = NonNullable<Parameters<Session['get']>[1]>;
export type HTTPCloakSessionLike = Pick<
	Session,
	'close' | 'delete' | 'get' | 'marshal' | 'patch' | 'post' | 'put' | 'setCookie' | 'warmup'
>;

/**
 * Optional fingerprint values included in generated super-properties.
 */
export interface DiscordRequestFingerprint {
	/**
	 * Discord-provided heartbeat session identifier.
	 */
	clientHeartbeatSessionId?: string;
	/**
	 * Discord-provided launch identifier.
	 */
	clientLaunchId?: string;
	/**
	 * Discord-provided launch signature token.
	 */
	launchSignature?: string;
}

/**
 * Browser profile discovered from the warmup/httpbin phase.
 */
export interface DiscordIdentityProfile {
	/**
	 * Accept-Language header discovered during warmup.
	 */
	acceptLanguage: string;
	/**
	 * Parsed browser family name.
	 */
	browser: string;
	/**
	 * Parsed browser version string.
	 */
	browserVersion: string;
	/**
	 * Whether the discovered user agent is mobile.
	 */
	isMobile: boolean;
	/**
	 * Preferred locale derived from discovery headers.
	 */
	locale: string;
	/**
	 * Parsed operating system name.
	 */
	os: string;
	/**
	 * Parsed operating system version string.
	 */
	osVersion: string;
	/**
	 * Computed Sec-CH-UA header value.
	 */
	secChUa: string;
	/**
	 * Raw User-Agent header value.
	 */
	userAgent: string;
	/**
	 * Major browser version extracted from `userAgent`.
	 */
	userAgentMajor: string;
}

/**
 * Options for creating/restoring a {@link DiscordIdentity} instance.
 */
export interface DiscordIdentityOptions {
	/**
	 * Pre-resolved build metadata used instead of remote discovery.
	 */
	buildMetadata?: DiscordBuildMetadata;
	/**
	 * Custom fetch implementation used for network requests.
	 */
	fetch?: typeof fetch;
	/**
	 * Endpoint used to inspect discovered request headers.
	 */
	httpbinUrl?: string;
	/**
	 * Preferred Discord locale override.
	 */
	locale?: string;
	/**
	 * Cookies to pre-seed in the cloaked session.
	 */
	seedCookies?: Record<string, string>;
	/**
	 * Partial session options passed to `httpcloak`.
	 */
	session?: Partial<HTTPCloakSessionOptions>;
	/**
	 * Optional persistent storage adapter.
	 */
	storage?: DiscordIdentityStorage;
	/**
	 * Discord token used for restore/persistence and authorization.
	 */
	token?: string;
	/**
	 * Preferred timezone override for emitted headers.
	 */
	timezone?: string;
	/**
	 * URL used to warm up the cloaked browser session.
	 */
	warmupUrl?: string;
}

/**
 * Per-request header overrides and super-properties additions.
 */
export interface DiscordIdentityHeaderOptions {
	/**
	 * Additional headers merged into the default identity header set.
	 */
	extraHeaders?: Record<string, string>;
	/**
	 * Optional fingerprint fields merged into super-properties.
	 */
	fingerprint?: DiscordRequestFingerprint;
	/**
	 * Per-request locale override.
	 */
	locale?: string;
	/**
	 * Extra keys merged into serialized super-properties.
	 */
	superProperties?: Record<string, unknown>;
	/**
	 * Per-request timezone override.
	 */
	timezone?: string;
}

/**
 * Standard Discord request headers emitted by {@link DiscordIdentity#getHeaders}.
 */
export interface DiscordIdentityHeaders {
	/**
	 * Compression algorithms accepted by the client.
	 */
	'accept-encoding': string;
	/**
	 * Preferred content languages.
	 */
	'accept-language': string;
	/**
	 * Do Not Track header value.
	 */
	dnt: string;
	/**
	 * Browser client hints brand/version list.
	 */
	'sec-ch-ua': string;
	/**
	 * Browser client hints mobile indicator.
	 */
	'sec-ch-ua-mobile': string;
	/**
	 * Browser client hints platform indicator.
	 */
	'sec-ch-ua-platform': string;
	/**
	 * Browser user agent string.
	 */
	'user-agent': string;
	/**
	 * Discord debug options header.
	 */
	'x-debug-options': string;
	/**
	 * Discord locale header.
	 */
	'x-discord-locale': string;
	/**
	 * Discord timezone header.
	 */
	'x-discord-timezone': string;
	/**
	 * Base64-encoded Discord super-properties payload.
	 */
	'x-super-properties': string;
}

/**
 * Canonical Discord super-properties payload before caller extras are merged.
 */
export interface DiscordSuperProperties {
	/**
	 * Browser family name.
	 */
	browser: string;
	/**
	 * Browser user agent string.
	 */
	browser_user_agent: string;
	/**
	 * Browser version string.
	 */
	browser_version: string;
	/**
	 * Discord web client build number.
	 */
	client_build_number: number;
	/**
	 * Discord client event source marker.
	 */
	client_event_source: null;
	/**
	 * Device identifier (empty for desktop web sessions).
	 */
	device: string;
	/**
	 * Native desktop host version.
	 */
	host_version?: string;
	/**
	 * Native desktop build number.
	 */
	native_build_number?: number;
	/**
	 * Operating system name.
	 */
	os: string;
	/**
	 * Operating system version.
	 */
	os_version: string;
	/**
	 * Discord release channel.
	 */
	release_channel: string;
	/**
	 * System locale used by the client.
	 */
	system_locale: string;
}

/**
 * Super-properties payload with optional caller-provided extra keys.
 */
export type DiscordResolvedSuperProperties = DiscordSuperProperties & Record<string, unknown>;

/**
 * Serialized identity payload used for persistence and restore.
 */
export interface SerializedDiscordIdentity {
	/**
	 * Cached build metadata snapshot.
	 */
	buildMetadata?: DiscordBuildMetadata;
	/**
	 * Cached discovered browser profile.
	 */
	profile?: DiscordIdentityProfile;
	/**
	 * Serialized `httpcloak` session state.
	 */
	session: string;
	/**
	 * Serialization schema version.
	 */
	version: 1;
	/**
	 * Whether warmup/discovery completed for this identity.
	 */
	warmed: boolean;
}

/**
 * Mutable in-memory state carried by a {@link DiscordIdentity} instance.
 */
export interface DiscordIdentityState {
	/**
	 * Active resolved build metadata.
	 */
	buildMetadata: DiscordBuildMetadata | undefined;
	/**
	 * Active discovered browser profile.
	 */
	profile: DiscordIdentityProfile | undefined;
	/**
	 * Whether this instance has completed warmup.
	 */
	warmed: boolean;
}

/**
 * Storage interface for persisted identity snapshots keyed by token.
 */
export interface DiscordIdentityStorage {
	/**
	 * Deletes an identity snapshot for the provided token.
	 */
	delete(token: string): Promise<void> | void;
	/**
	 * Returns an identity snapshot for the provided token.
	 */
	get(token: string): Promise<SerializedDiscordIdentity | null> | SerializedDiscordIdentity | null;
	/**
	 * Persists an identity snapshot for the provided token.
	 */
	set(token: string, identity: SerializedDiscordIdentity): Promise<void> | void;
}

/**
 * Request options normalized for identity-powered requests.
 */
export interface NormalizedRequestInit extends Omit<RequestInit, 'headers'> {
	/**
	 * Normalized request headers merged into the cloaked request.
	 */
	headers?: Record<string, string>;
}
