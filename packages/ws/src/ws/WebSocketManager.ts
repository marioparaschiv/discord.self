import type { DiscordIdentity } from '@discord.self/identity';
import { type Awaitable } from '@discord.self/util';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import type {
	GatewayIdentifyProperties,
	GatewayPresenceUpdateData,
	RESTGetAPIGatewayBotResult,
	GatewayIntentBits,
	GatewaySendPayload,
} from 'discord-api-types/v10';
import {
	type FetchingStrategyOptions,
	managerToFetchingStrategyOptions,
} from '../strategies/context/IContextFetchingStrategy.js';
import { SimpleContextFetchingStrategy } from '../strategies/context/SimpleContextFetchingStrategy.js';
import type { IIdentifyThrottler } from '../throttling/IIdentifyThrottler.js';
import { DefaultWebSocketManagerOptions, type CompressionMethod, type Encoding } from '../utils/constants.js';
import {
	WebSocketShard,
	type WebSocketShardDestroyOptions,
	WebSocketShardEvents,
	type WebSocketShardEventsMap,
	type WebSocketShardStatus,
} from './WebSocketShard.js';

/**
 * Session information used to resume a session.
 */
export interface SessionInfo {
	/**
	 * URL to use when resuming
	 */
	resumeURL: string;
	/**
	 * The sequence number of the last message sent by the shard
	 */
	sequence: number;
	/**
	 * Session id for this shard
	 */
	sessionId: string;
	/**
	 * Self-session gateway URL.
	 */
}

export interface GatewayInfo {
	url: string;
}

export type GatewayInformation = GatewayInfo | RESTGetAPIGatewayBotResult;

function isBotGatewayInfo(data: GatewayInformation): data is RESTGetAPIGatewayBotResult {
	return 'session_start_limit' in data && 'shards' in data;
}

/**
 * Required options for the WebSocketManager
 */
export interface RequiredWebSocketManagerOptions {
	/**
	 * Function for retrieving the information returned by the `/gateway` endpoint.
	 * We recommend using a REST client that respects Discord's rate limits, such as `@discord.self/rest`.
	 *
	 * @example
	 * ```ts
	 * const rest = new REST().setToken(process.env.DISCORD_TOKEN);
	 * const manager = new WebSocketManager({
	 *  token: process.env.DISCORD_TOKEN,
	 *  fetchGatewayInformation() {
	 *    return rest.get(Routes.gateway()) as Promise<GatewayInfo>;
	 *  },
	 * });
	 * ```
	 */
	fetchGatewayInformation(): Awaitable<GatewayInformation>;
	/**
	 * The intents to request
	 */
	intents: GatewayIntentBits | 0;
}

/**
 * Optional additional configuration for the WebSocketManager
 */
export interface OptionalWebSocketManagerOptions {
	/**
	 * Builds an identify throttler to use for this manager's gateway session.
	 */
	buildIdentifyThrottler(manager: WebSocketManager): Awaitable<IIdentifyThrottler>;
	/**
	 * The transport compression method to use - mutually exclusive with `useIdentifyCompression`
	 *
	 * @defaultValue `null` (no transport compression)
	 */
	compression: CompressionMethod | null;
	/**
	 * The encoding to use
	 *
	 * @defaultValue `'json'`
	 */
	encoding: Encoding;
	/**
	 * How long to wait for a shard to connect before giving up
	 */
	handshakeTimeout: number | null;
	/**
	 * How long to wait for a shard's HELLO packet before giving up
	 */
	helloTimeout: number | null;
	/**
	 * Properties to send to the gateway when identifying
	 */
	identifyProperties: GatewayIdentifyProperties;
	/**
	 * Shared Discord identity used to derive gateway identify properties.
	 *
	 * @defaultValue `null`
	 */
	identity: DiscordIdentity | null;
	/**
	 * Initial presence data to send to the gateway when identifying
	 */
	initialPresence: GatewayPresenceUpdateData | null;
	/**
	 * Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list
	 */
	largeThreshold: number | null;
	/**
	 * How long to wait for a shard's READY packet before giving up
	 */
	readyTimeout: number | null;
	/**
	 * Function used to retrieve session information (and attempt to resume) for the gateway session.
	 *
	 * @example
	 * ```ts
	 * const manager = new WebSocketManager({
	 *   async retrieveSessionInfo(): Awaitable<SessionInfo | null> {
	 *     // Fetch this info from redis or similar
	 *     return { sessionId: string, sequence: number };
	 *     // Return null if no information is found
	 *   },
	 * });
	 * ```
	 */
	retrieveSessionInfo(): Awaitable<SessionInfo | null>;
	/**
	 * The token to use for identifying with the gateway
	 *
	 * If not provided, the token must be set using {@link WebSocketManager.setToken}
	 */
	token: string;
	/**
	 * Function used to store session information for the gateway session.
	 */
	updateSessionInfo(sessionInfo: SessionInfo | null): Awaitable<void>;
	/**
	 * Whether to use the `compress` option when identifying
	 *
	 * @defaultValue `false`
	 */
	useIdentifyCompression: boolean;
	/**
	 * The gateway version to use
	 *
	 * @defaultValue `'10'`
	 */
	version: string;
}

export interface WebSocketManagerOptions extends OptionalWebSocketManagerOptions, RequiredWebSocketManagerOptions {}

export interface CreateWebSocketManagerOptions
	extends Partial<OptionalWebSocketManagerOptions>, RequiredWebSocketManagerOptions {}

export type ManagerShardEventsMap = WebSocketShardEventsMap;

export class WebSocketManager extends AsyncEventEmitter<ManagerShardEventsMap> implements AsyncDisposable {
	#token: string | null = null;

	/**
	 * The options being used by this manager
	 */
	public readonly options: Omit<WebSocketManagerOptions, 'token'>;

	/**
	 * Internal cache for a GET /gateway or /gateway/bot result
	 */
	private gatewayInformation: {
		data: GatewayInformation;
		expiresAt: number;
	} | null = null;

	private optionsCache: FetchingStrategyOptions | null = null;

	private shard: WebSocketShard | null = null;

	/**
	 * Gets the token set for this manager. If no token is set, an error is thrown.
	 * To set the token, use {@link WebSocketManager.setToken} or pass it in the options.
	 *
	 * @remarks
	 * This getter is mostly used to pass the token to the sharding strategy internally, there's not much reason to use it.
	 */
	public get token(): string {
		if (!this.#token) {
			throw new Error('Token has not been set');
		}

		return this.#token;
	}

	public constructor(options: CreateWebSocketManagerOptions) {
		if (typeof options.fetchGatewayInformation !== 'function') {
			throw new TypeError('fetchGatewayInformation is required');
		}

		super();
		this.options = {
			...DefaultWebSocketManagerOptions,
			...options,
		};
		this.#token = options.token ?? null;
	}

	/**
	 * Fetches the gateway information from Discord - or returns it from cache if available
	 *
	 * @param force - Whether to ignore the cache and force a fresh fetch
	 */
	public async fetchGatewayInformation(force = false) {
		if (this.gatewayInformation) {
			if (this.gatewayInformation.expiresAt <= Date.now()) {
				this.gatewayInformation = null;
			} else if (!force) {
				return this.gatewayInformation.data;
			}
		}

		const data = await this.options.fetchGatewayInformation();

		const expiresAt = isBotGatewayInfo(data)
			? Date.now() + (data.session_start_limit.reset_after || 5_000)
			: Date.now() + 300_000;
		this.gatewayInformation = { data, expiresAt };
		return this.gatewayInformation.data;
	}

	private async ensureShard() {
		if (this.shard) {
			return this.shard;
		}

		this.optionsCache = await managerToFetchingStrategyOptions(this);
		const shard = new WebSocketShard(new SimpleContextFetchingStrategy(this, this.optionsCache));

		for (const event of Object.values(WebSocketShardEvents)) {
			// @ts-expect-error Event tuples are forwarded as-is.
			shard.on(event, (...args) => this.emit(event, ...args));
		}

		this.shard = shard;
		return this.shard;
	}

	public async connect() {
		await this.fetchGatewayInformation();
		await (await this.ensureShard()).connect();
	}

	public setToken(token: string): void {
		if (this.#token) {
			throw new Error('Token has already been set');
		}

		this.#token = token;
	}

	public setIdentity(identity: DiscordIdentity | null): void {
		this.options.identity = identity;
		this.optionsCache = null;
	}

	public async destroy(options?: Omit<WebSocketShardDestroyOptions, 'recover'>) {
		if (!this.shard) {
			return;
		}

		const shard = this.shard;
		this.shard = null;
		this.optionsCache = null;
		await shard.destroy(options);
	}

	public async send(payload: GatewaySendPayload) {
		return (await this.ensureShard()).send(payload);
	}

	public fetchStatus(): Awaitable<WebSocketShardStatus> {
		return this.shard?.status ?? 0;
	}

	public async [Symbol.asyncDispose]() {
		await this.destroy();
	}
}
