export * from './buildMetadata.js';
export * from './SQLiteAdapter.js';
export * from './types.js';
export {
	DiscordIdentity,
	createDiscordIdentity,
	restoreDiscordIdentity,
	makeDiscordCloakedRequest,
} from './DiscordIdentity.js';

/**
 * The {@link https://github.com/discordjs/discord.js/blob/main/packages/identity#readme | @discord.self/identity} version
 * that you are currently using.
 *
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = '[VI]{{inject}}[/VI]' as string;
