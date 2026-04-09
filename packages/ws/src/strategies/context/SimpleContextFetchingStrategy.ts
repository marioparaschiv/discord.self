import type { Awaitable } from '@discord.self/util';
import type { IIdentifyThrottler } from '../../throttling/IIdentifyThrottler.js';
import type { SessionInfo, WebSocketManager } from '../../ws/WebSocketManager.js';
import type { FetchingStrategyOptions, IContextFetchingStrategy } from './IContextFetchingStrategy.js';

export class SimpleContextFetchingStrategy implements IContextFetchingStrategy {
	// This strategy assumes the gateway session is running in the current process.
	private static throttlerCache = new WeakMap<WebSocketManager, IIdentifyThrottler>();

	private static async ensureThrottler(manager: WebSocketManager): Promise<IIdentifyThrottler> {
		const throttler = SimpleContextFetchingStrategy.throttlerCache.get(manager);
		if (throttler) {
			return throttler;
		}

		const newThrottler = await manager.options.buildIdentifyThrottler(manager);
		SimpleContextFetchingStrategy.throttlerCache.set(manager, newThrottler);

		return newThrottler;
	}

	public constructor(
		private readonly manager: WebSocketManager,
		public readonly options: FetchingStrategyOptions,
	) {}

	public async retrieveSessionInfo(): Promise<SessionInfo | null> {
		return this.manager.options.retrieveSessionInfo();
	}

	public updateSessionInfo(sessionInfo: SessionInfo | null): Awaitable<void> {
		return this.manager.options.updateSessionInfo(sessionInfo);
	}

	public async waitForIdentify(signal: AbortSignal): Promise<void> {
		const throttler = await SimpleContextFetchingStrategy.ensureThrottler(this.manager);
		await throttler.waitForIdentify(signal);
	}
}
