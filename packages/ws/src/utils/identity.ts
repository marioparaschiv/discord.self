import type { DiscordIdentity } from '@discord.self/identity';
import type { GatewayIdentifyProperties } from 'discord-api-types/v10';

export async function resolveIdentifyProperties(
	identifyProperties: GatewayIdentifyProperties,
	identity: DiscordIdentity | null,
): Promise<GatewayIdentifyProperties> {
	if (!identity) {
		return identifyProperties;
	}

	await identity.ensureReady();
	const profile = await identity.getProfile();

	return {
		browser: profile.browser,
		device: profile.browser,
		os: profile.os,
	};
}
