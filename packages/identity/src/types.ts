import type { Session } from 'httpcloak';
import type { DiscordBuildMetadata } from './buildMetadata.js';

export interface ResponseLike extends Pick<
	Response,
	'arrayBuffer' | 'bodyUsed' | 'headers' | 'json' | 'ok' | 'status' | 'statusText' | 'text'
> {
	body: ReadableStream | null;
}

export type HTTPCloakSessionOptions = ConstructorParameters<typeof Session>[0];
export type HTTPCloakCookieOptions = Parameters<Session['setCookie']>[2];
export type HTTPCloakResponseLike = Awaited<ReturnType<Session['get']>>;
export type HTTPCloakRequestOptions = NonNullable<Parameters<Session['get']>[1]>;
export type HTTPCloakSessionLike = Pick<
	Session,
	'close' | 'delete' | 'get' | 'marshal' | 'patch' | 'post' | 'put' | 'setCookie' | 'warmup'
>;

export interface DiscordRequestFingerprint {
	clientHeartbeatSessionId?: string;
	clientLaunchId?: string;
	launchSignature?: string;
}

export interface DiscordIdentityProfile {
	acceptLanguage: string;
	browser: string;
	browserVersion: string;
	isMobile: boolean;
	locale: string;
	os: string;
	osVersion: string;
	secChUa: string;
	userAgent: string;
	userAgentMajor: string;
}

export interface DiscordIdentityOptions {
	buildMetadata?: DiscordBuildMetadata;
	fetch?: typeof fetch;
	httpbinUrl?: string;
	locale?: string;
	seedCookies?: Record<string, string>;
	session?: Partial<HTTPCloakSessionOptions>;
	storage?: DiscordIdentityStorage;
	token?: string;
	timezone?: string;
	warmupUrl?: string;
}

export interface DiscordIdentityHeaderOptions {
	extraHeaders?: Record<string, string>;
	fingerprint?: DiscordRequestFingerprint;
	locale?: string;
	superProperties?: Record<string, unknown>;
	timezone?: string;
}

export interface DiscordSuperProperties {
	browser: string;
	browser_user_agent: string;
	browser_version: string;
	client_build_number: number;
	client_event_source: null;
	device: string;
	host_version?: string;
	native_build_number?: number;
	os: string;
	os_version: string;
	release_channel: string;
	system_locale: string;
}

export interface SerializedDiscordIdentity {
	buildMetadata?: DiscordBuildMetadata;
	profile?: DiscordIdentityProfile;
	session: string;
	version: 1;
	warmed: boolean;
}

export interface DiscordIdentityStorage {
	delete(token: string): Promise<void> | void;
	get(token: string): Promise<SerializedDiscordIdentity | null> | SerializedDiscordIdentity | null;
	set(token: string, identity: SerializedDiscordIdentity): Promise<void> | void;
}

export interface NormalizedRequestInit extends Omit<RequestInit, 'headers'> {
	headers?: Record<string, string>;
}
