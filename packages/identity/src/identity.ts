import { getDiscordBuildMetadata } from './buildMetadata.js';
import type { DiscordBuildMetadata } from './buildMetadata.js';
import { DEFAULT_COOKIE_DOMAIN, DEFAULT_COOKIE_PATH } from './constants.js';
import {
	IdentityEncoding,
	IdentityHeaders,
	IdentityOptionsResolver,
	IdentityProfileParser,
	IdentityResponseAdapter,
	IdentitySessionTransport,
	IdentitySuperPropertiesBuilder,
	type DiscoveredHeadersResponse,
	type ResolvedDiscordIdentityOptions,
} from './internal/IdentityInternals.js';
import type {
	DiscordCloakedRequestHandler,
	DiscordIdentityHeaderOptions,
	DiscordIdentityHeaders,
	DiscordIdentityOptions,
	DiscordIdentityProfile,
	DiscordIdentityState,
	DiscordRequestFingerprint,
	DiscordResolvedSuperProperties,
	HTTPCloakCookieOptions,
	HTTPCloakSessionLike,
	NormalizedRequestInit,
	ResponseLike,
	SerializedDiscordIdentity,
} from './types.js';

class DiscordIdentityFactory {
	public static async create(options: DiscordIdentityOptions = {}) {
		const resolvedOptions = IdentityOptionsResolver.resolve(options);
		IdentityOptionsResolver.assertStorageToken(resolvedOptions);

		if (resolvedOptions.storage && resolvedOptions.token) {
			const persisted = await resolvedOptions.storage.get(resolvedOptions.token);

			if (persisted) {
				try {
					return await DiscordIdentityFactory.restore(persisted, options);
				} catch {
					await resolvedOptions.storage.delete(resolvedOptions.token);
				}
			}
		}

		return new DiscordIdentity(IdentityOptionsResolver.createSession(resolvedOptions), options);
	}

	public static async restore(serialized: SerializedDiscordIdentity, options: DiscordIdentityOptions = {}) {
		const resolvedOptions = IdentityOptionsResolver.resolve(options);
		IdentityOptionsResolver.assertStorageToken(resolvedOptions);

		return new DiscordIdentity(IdentityOptionsResolver.restoreSession(serialized), options, {
			buildMetadata: serialized.buildMetadata,
			profile: serialized.profile,
			warmed: serialized.warmed,
		});
	}
}

/**
 * High-level identity/session manager for Discord browser-like requests.
 */
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
		this.#options = IdentityOptionsResolver.resolve(options);
		this.#profile = state.profile;
		this.#buildMetadata = state.buildMetadata ?? this.#options.buildMetadata;
		this.#warmed = state.warmed;

		for (const [name, value] of Object.entries(this.#options.seedCookies)) {
			this.setCookie(name, value);
		}
	}

	/**
	 * Performs header/profile discovery and returns the resolved profile.
	 */
	public async discover() {
		return this.#ensureProfile();
	}

	/**
	 * Ensures warmup and profile discovery have completed.
	 */
	public async ensureReady() {
		await this.warmup();
		await this.#ensureProfile();
	}

	/**
	 * Persists state (if configured) and closes the underlying session.
	 */
	public close() {
		void this.persist();
		this.#session.close();
	}

	/**
	 * Returns a request handler that can be passed directly to REST clients.
	 */
	public getRequestHandler(): DiscordCloakedRequestHandler {
		return makeDiscordCloakedRequest(this);
	}

	/**
	 * Builds standard Discord browser-like headers, including `x-super-properties`.
	 */
	public async getHeaders(options: DiscordIdentityHeaderOptions = {}): Promise<DiscordIdentityHeaders> {
		const profile = await this.#ensureProfile();
		const buildMetadata = await this.#ensureBuildMetadata();
		return IdentityHeaders.build(profile, buildMetadata, options, this.#options);
	}

	public async getProfile() {
		return this.#ensureProfile();
	}

	/**
	 * Resolves the decoded super-properties object used to build `x-super-properties`.
	 */
	public async getSuperProperties(
		fingerprint?: DiscordRequestFingerprint,
		extra: Record<string, unknown> = {},
	): Promise<DiscordResolvedSuperProperties> {
		const profile = await this.#ensureProfile();
		const buildMetadata = await this.#ensureBuildMetadata();
		return IdentitySuperPropertiesBuilder.toSuperProperties(profile, buildMetadata, fingerprint, extra);
	}

	public async request(url: string, init: NormalizedRequestInit = {}): Promise<ResponseLike> {
		if (init.signal?.aborted) {
			throw init.signal.reason ?? new Error('The request was aborted before it started');
		}

		await this.ensureReady();

		const identityHeaders = await this.getHeaders();
		const requestHeaders = IdentityHeaders.normalize(init.headers);
		const mergedHeaders = { ...identityHeaders, ...requestHeaders };

		try {
			const response = await IdentitySessionTransport.performRequest(this.#session, url, {
				...init,
				headers: mergedHeaders,
			});

			return IdentityResponseAdapter.toResponseLike(response);
		} catch (error) {
			if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
				throw new Error(`Request timed out: ${(init.method ?? 'GET').toUpperCase()} ${url}`);
			}

			throw error;
		}
	}

	/**
	 * Serializes the current session/profile/build metadata snapshot.
	 */
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

	/**
	 * Sets a cookie on the underlying session and persists state when enabled.
	 */
	public setCookie(name: string, value: string, options: HTTPCloakCookieOptions = {}) {
		this.#session.setCookie(name, value, {
			domain: options.domain ?? DEFAULT_COOKIE_DOMAIN,
			path: options.path ?? DEFAULT_COOKIE_PATH,
			secure: options.secure ?? true,
			...options,
		});
		void this.persist();
	}

	/**
	 * Warms the session against the configured warmup URL.
	 */
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

	/**
	 * Persists the current serialized identity using the configured storage adapter.
	 */
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
			const body =
				typeof response.text === 'string'
					? response.text
					: IdentityEncoding.decodeBody(IdentityEncoding.toResponseBody(response));
			const payload = JSON.parse(body) as DiscoveredHeadersResponse;
			const normalizedHeaders = IdentityHeaders.withLowerCaseKeys(payload.headers ?? {});
			const profile = this.#applyProfileOverrides(IdentityProfileParser.toProfile(normalizedHeaders));
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

/**
 * Creates a new identity instance and optionally restores persisted state.
 */
export async function createDiscordIdentity(options: DiscordIdentityOptions = {}) {
	return DiscordIdentityFactory.create(options);
}

/**
 * Restores an identity instance from a previously serialized snapshot.
 */
export async function restoreDiscordIdentity(
	serialized: SerializedDiscordIdentity,
	options: DiscordIdentityOptions = {},
) {
	return DiscordIdentityFactory.restore(serialized, options);
}

/**
 * Creates a fetch-like request handler backed by a {@link DiscordIdentity} instance.
 */
export function makeDiscordCloakedRequest(identity: DiscordIdentity): DiscordCloakedRequestHandler {
	return async (url: string, init: RequestInit = {}) => identity.request(url, init as NormalizedRequestInit);
}
