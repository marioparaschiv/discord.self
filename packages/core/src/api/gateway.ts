import type { RequestData, REST } from '@discord.self/rest';
import { Routes, type RESTGetAPIGatewayResult } from 'discord-api-types/v10';

export class GatewayAPI {
	public constructor(private readonly rest: REST) {}

	/**
	 * Gets gateway information.
	 *
	 * @see {@link https://discord.com/developers/docs/events/gateway#get-gateway}
	 * @param options - The options for fetching the gateway information.
	 * @param options.signal - Abort signal for the request.
	 */
	public async get({ signal }: Pick<RequestData, 'signal'> = {}) {
		return this.rest.get(Routes.gateway(), {
			auth: false,
			signal,
		}) as Promise<RESTGetAPIGatewayResult>;
	}
}
