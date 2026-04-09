/**
 * IdentifyThrottlers are responsible for dictating when a gateway session is allowed to identify.
 *
 * @see {@link https://discord.com/developers/docs/topics/gateway#sharding-max-concurrency}
 */
export interface IIdentifyThrottler {
	/**
	 * Resolves once the gateway session should be allowed to identify, or rejects if the operation was aborted.
	 */
	waitForIdentify(signal: AbortSignal): Promise<void>;
}
