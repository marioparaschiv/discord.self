import { setTimeout as sleep } from 'node:timers/promises';
import { AsyncQueue } from '@sapphire/async-queue';
import type { IIdentifyThrottler } from './IIdentifyThrottler.js';

/**
 * Local, in-memory identify throttler.
 */
export class SimpleIdentifyThrottler implements IIdentifyThrottler {
	private readonly queue = new AsyncQueue();

	private resetsAt = Number.POSITIVE_INFINITY;

	/**
	 * {@inheritDoc IIdentifyThrottler.waitForIdentify}
	 */
	public async waitForIdentify(signal: AbortSignal): Promise<void> {
		await this.queue.wait({ signal });

		try {
			const diff = this.resetsAt - Date.now();
			if (diff > 0 && diff <= 5_000) {
				// To account for the latency the IDENTIFY payload goes through, we add a bit more wait time
				const time = diff + Math.random() * 1_500;
				await sleep(time);
			}

			this.resetsAt = Date.now() + 5_000;
		} finally {
			this.queue.shift();
		}
	}
}
