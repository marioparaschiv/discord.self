import process from 'node:process';
import { lazy } from '@discord.self/util';
import { APIVersion, GatewayOpcodes } from 'discord-api-types/v10';
import { SimpleIdentifyThrottler } from '../throttling/SimpleIdentifyThrottler.js';
import type { SessionInfo, OptionalWebSocketManagerOptions } from '../ws/WebSocketManager.js';
import type { SendRateLimitState } from '../ws/WebSocketShard.js';

/**
 * Valid encoding types
 */
export enum Encoding {
	JSON = 'json',
}

/**
 * Valid compression methods
 */
export enum CompressionMethod {
	ZlibNative,
	ZlibSync,
	ZstdNative,
}

export const DefaultDeviceProperty = `@discord.self/ws [VI]{{inject}}[/VI]` as `@discord.self/ws ${string}`;

const getDefaultSessionStore = lazy(() => ({ session: null as SessionInfo | null }));

export const CompressionParameterMap = {
	[CompressionMethod.ZlibNative]: 'zlib-stream',
	[CompressionMethod.ZlibSync]: 'zlib-stream',
	[CompressionMethod.ZstdNative]: 'zstd-stream',
} as const satisfies Record<CompressionMethod, string>;

/**
 * Default options used by the manager
 */
export const DefaultWebSocketManagerOptions = {
	async buildIdentifyThrottler() {
		return new SimpleIdentifyThrottler();
	},
	identity: null,
	largeThreshold: null,
	initialPresence: null,
	identifyProperties: {
		browser: DefaultDeviceProperty,
		device: DefaultDeviceProperty,
		os: process.platform,
	},
	version: APIVersion,
	encoding: Encoding.JSON,
	compression: null,
	useIdentifyCompression: false,
	retrieveSessionInfo() {
		const store = getDefaultSessionStore();
		return store.session;
	},
	updateSessionInfo(info: SessionInfo | null) {
		const store = getDefaultSessionStore();
		store.session = info;
	},
	handshakeTimeout: 30_000,
	helloTimeout: 60_000,
	readyTimeout: 15_000,
} as const satisfies Omit<OptionalWebSocketManagerOptions, 'fetchGatewayInformation' | 'token'>;

export const ImportantGatewayOpcodes = new Set([
	GatewayOpcodes.Heartbeat,
	GatewayOpcodes.Identify,
	GatewayOpcodes.Resume,
]);

export function getInitialSendRateLimitState(): SendRateLimitState {
	return {
		sent: 0,
		resetAt: Date.now() + 60_000,
	};
}
