import type { REST } from '@discord.self/rest';
import { GatewayRateLimitError } from '@discord.self/util';
import { WebSocketShardEvents } from '@discord.self/ws';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import {
	GatewayDispatchEvents,
	GatewayOpcodes,
	type GatewayApplicationCommandPermissionsUpdateDispatchData,
	type GatewayAutoModerationActionExecutionDispatchData,
	type GatewayAutoModerationRuleCreateDispatchData,
	type GatewayAutoModerationRuleDeleteDispatchData,
	type GatewayAutoModerationRuleUpdateDispatchData,
	type GatewayChannelCreateDispatchData,
	type GatewayChannelDeleteDispatchData,
	type GatewayChannelPinsUpdateDispatchData,
	type GatewayChannelUpdateDispatchData,
	type GatewayEntitlementCreateDispatchData,
	type GatewayEntitlementDeleteDispatchData,
	type GatewayEntitlementUpdateDispatchData,
	type GatewayGuildAuditLogEntryCreateDispatchData,
	type GatewayGuildBanAddDispatchData,
	type GatewayGuildBanRemoveDispatchData,
	type GatewayGuildCreateDispatchData,
	type GatewayGuildDeleteDispatchData,
	type GatewayGuildEmojisUpdateDispatchData,
	type GatewayGuildIntegrationsUpdateDispatchData,
	type GatewayGuildMemberAddDispatchData,
	type GatewayGuildMemberRemoveDispatchData,
	type GatewayGuildMemberUpdateDispatchData,
	type GatewayGuildMembersChunkDispatchData,
	type GatewayGuildRoleCreateDispatchData,
	type GatewayGuildRoleDeleteDispatchData,
	type GatewayGuildRoleUpdateDispatchData,
	type GatewayGuildScheduledEventCreateDispatchData,
	type GatewayGuildScheduledEventDeleteDispatchData,
	type GatewayGuildScheduledEventUpdateDispatchData,
	type GatewayGuildScheduledEventUserAddDispatchData,
	type GatewayGuildScheduledEventUserRemoveDispatchData,
	type GatewayGuildSoundboardSoundCreateDispatch,
	type GatewayGuildSoundboardSoundDeleteDispatch,
	type GatewayGuildSoundboardSoundUpdateDispatch,
	type GatewayGuildSoundboardSoundsUpdateDispatch,
	type GatewayGuildStickersUpdateDispatchData,
	type GatewayGuildUpdateDispatchData,
	type GatewayIntegrationCreateDispatchData,
	type GatewayIntegrationDeleteDispatchData,
	type GatewayIntegrationUpdateDispatchData,
	type GatewayInteractionCreateDispatchData,
	type GatewayInviteCreateDispatchData,
	type GatewayInviteDeleteDispatchData,
	type GatewayMessageCreateDispatchData,
	type GatewayMessageDeleteBulkDispatchData,
	type GatewayMessageDeleteDispatchData,
	type GatewayMessagePollVoteDispatchData,
	type GatewayMessageReactionAddDispatchData,
	type GatewayMessageReactionRemoveAllDispatchData,
	type GatewayMessageReactionRemoveDispatchData,
	type GatewayMessageReactionRemoveEmojiDispatchData,
	type GatewayMessageUpdateDispatchData,
	type GatewayPresenceUpdateData,
	type GatewayPresenceUpdateDispatchData,
	type GatewayRateLimitedDispatchData,
	type GatewayReadyDispatchData,
	type GatewayRequestGuildMembersData,
	type GatewayStageInstanceCreateDispatchData,
	type GatewayStageInstanceDeleteDispatchData,
	type GatewayStageInstanceUpdateDispatchData,
	type GatewaySubscriptionCreateDispatchData,
	type GatewaySubscriptionDeleteDispatchData,
	type GatewaySubscriptionUpdateDispatchData,
	type GatewayThreadCreateDispatchData,
	type GatewayThreadDeleteDispatchData,
	type GatewayThreadListSyncDispatchData,
	type GatewayThreadMemberUpdateDispatchData,
	type GatewayThreadMembersUpdateDispatchData,
	type GatewayThreadUpdateDispatchData,
	type GatewayTypingStartDispatchData,
	type GatewayUserUpdateDispatchData,
	type GatewayVoiceServerUpdateDispatchData,
	type GatewayVoiceStateUpdateData,
	type GatewayVoiceStateUpdateDispatchData,
	type GatewayWebhooksUpdateDispatchData,
	type GatewayRequestSoundboardSoundsData,
	type GatewaySoundboardSoundsDispatchData,
} from 'discord-api-types/v10';
import type { Gateway } from './Gateway.js';
import { API } from './api/index.js';

/**
 * Shared values included in emitted core client event payloads.
 */
export interface IntrinsicProps {
	/**
	 * The REST API
	 */
	api: API;
}

/**
 * Wraps a gateway dispatch payload with intrinsic event helpers.
 */
export interface ToEventProps<Data> extends IntrinsicProps {
	/**
	 * Dispatch payload data from the gateway event.
	 */
	data: Data;
}

/**
 * Mapping of gateway dispatch names to emitted listener tuple payloads.
 */
export interface MappedEvents {
	/**
	 * Listener tuple for `GatewayDispatchEvents.ApplicationCommandPermissionsUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ApplicationCommandPermissionsUpdate]: [
		ToEventProps<GatewayApplicationCommandPermissionsUpdateDispatchData>,
	];
	/**
	 * Listener tuple for `GatewayDispatchEvents.AutoModerationActionExecution` dispatches.
	 */
	[GatewayDispatchEvents.AutoModerationActionExecution]: [
		ToEventProps<GatewayAutoModerationActionExecutionDispatchData>,
	];
	/**
	 * Listener tuple for `GatewayDispatchEvents.AutoModerationRuleCreate` dispatches.
	 */
	[GatewayDispatchEvents.AutoModerationRuleCreate]: [ToEventProps<GatewayAutoModerationRuleCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.AutoModerationRuleDelete` dispatches.
	 */
	[GatewayDispatchEvents.AutoModerationRuleDelete]: [ToEventProps<GatewayAutoModerationRuleDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.AutoModerationRuleUpdate` dispatches.
	 */
	[GatewayDispatchEvents.AutoModerationRuleUpdate]: [ToEventProps<GatewayAutoModerationRuleUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ChannelCreate` dispatches.
	 */
	[GatewayDispatchEvents.ChannelCreate]: [ToEventProps<GatewayChannelCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ChannelDelete` dispatches.
	 */
	[GatewayDispatchEvents.ChannelDelete]: [ToEventProps<GatewayChannelDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ChannelPinsUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ChannelPinsUpdate]: [ToEventProps<GatewayChannelPinsUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ChannelUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ChannelUpdate]: [ToEventProps<GatewayChannelUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.EntitlementCreate` dispatches.
	 */
	[GatewayDispatchEvents.EntitlementCreate]: [ToEventProps<GatewayEntitlementCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.EntitlementDelete` dispatches.
	 */
	[GatewayDispatchEvents.EntitlementDelete]: [ToEventProps<GatewayEntitlementDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.EntitlementUpdate` dispatches.
	 */
	[GatewayDispatchEvents.EntitlementUpdate]: [ToEventProps<GatewayEntitlementUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildAuditLogEntryCreate` dispatches.
	 */
	[GatewayDispatchEvents.GuildAuditLogEntryCreate]: [ToEventProps<GatewayGuildAuditLogEntryCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildBanAdd` dispatches.
	 */
	[GatewayDispatchEvents.GuildBanAdd]: [ToEventProps<GatewayGuildBanAddDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildBanRemove` dispatches.
	 */
	[GatewayDispatchEvents.GuildBanRemove]: [ToEventProps<GatewayGuildBanRemoveDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildCreate` dispatches.
	 */
	[GatewayDispatchEvents.GuildCreate]: [ToEventProps<GatewayGuildCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildDelete` dispatches.
	 */
	[GatewayDispatchEvents.GuildDelete]: [ToEventProps<GatewayGuildDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildEmojisUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildEmojisUpdate]: [ToEventProps<GatewayGuildEmojisUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildIntegrationsUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildIntegrationsUpdate]: [ToEventProps<GatewayGuildIntegrationsUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildMemberAdd` dispatches.
	 */
	[GatewayDispatchEvents.GuildMemberAdd]: [ToEventProps<GatewayGuildMemberAddDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildMemberRemove` dispatches.
	 */
	[GatewayDispatchEvents.GuildMemberRemove]: [ToEventProps<GatewayGuildMemberRemoveDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildMemberUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildMemberUpdate]: [ToEventProps<GatewayGuildMemberUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildMembersChunk` dispatches.
	 */
	[GatewayDispatchEvents.GuildMembersChunk]: [ToEventProps<GatewayGuildMembersChunkDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildRoleCreate` dispatches.
	 */
	[GatewayDispatchEvents.GuildRoleCreate]: [ToEventProps<GatewayGuildRoleCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildRoleDelete` dispatches.
	 */
	[GatewayDispatchEvents.GuildRoleDelete]: [ToEventProps<GatewayGuildRoleDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildRoleUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildRoleUpdate]: [ToEventProps<GatewayGuildRoleUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildScheduledEventCreate` dispatches.
	 */
	[GatewayDispatchEvents.GuildScheduledEventCreate]: [ToEventProps<GatewayGuildScheduledEventCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildScheduledEventDelete` dispatches.
	 */
	[GatewayDispatchEvents.GuildScheduledEventDelete]: [ToEventProps<GatewayGuildScheduledEventDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildScheduledEventUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildScheduledEventUpdate]: [ToEventProps<GatewayGuildScheduledEventUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildScheduledEventUserAdd` dispatches.
	 */
	[GatewayDispatchEvents.GuildScheduledEventUserAdd]: [ToEventProps<GatewayGuildScheduledEventUserAddDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildScheduledEventUserRemove` dispatches.
	 */
	[GatewayDispatchEvents.GuildScheduledEventUserRemove]: [
		ToEventProps<GatewayGuildScheduledEventUserRemoveDispatchData>,
	];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildSoundboardSoundCreate` dispatches.
	 */
	[GatewayDispatchEvents.GuildSoundboardSoundCreate]: [ToEventProps<GatewayGuildSoundboardSoundCreateDispatch>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildSoundboardSoundDelete` dispatches.
	 */
	[GatewayDispatchEvents.GuildSoundboardSoundDelete]: [ToEventProps<GatewayGuildSoundboardSoundDeleteDispatch>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildSoundboardSoundUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildSoundboardSoundUpdate]: [ToEventProps<GatewayGuildSoundboardSoundUpdateDispatch>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildSoundboardSoundsUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildSoundboardSoundsUpdate]: [ToEventProps<GatewayGuildSoundboardSoundsUpdateDispatch>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.SoundboardSounds` dispatches.
	 */
	[GatewayDispatchEvents.SoundboardSounds]: [ToEventProps<GatewaySoundboardSoundsDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildStickersUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildStickersUpdate]: [ToEventProps<GatewayGuildStickersUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.GuildUpdate` dispatches.
	 */
	[GatewayDispatchEvents.GuildUpdate]: [ToEventProps<GatewayGuildUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.IntegrationCreate` dispatches.
	 */
	[GatewayDispatchEvents.IntegrationCreate]: [ToEventProps<GatewayIntegrationCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.IntegrationDelete` dispatches.
	 */
	[GatewayDispatchEvents.IntegrationDelete]: [ToEventProps<GatewayIntegrationDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.IntegrationUpdate` dispatches.
	 */
	[GatewayDispatchEvents.IntegrationUpdate]: [ToEventProps<GatewayIntegrationUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.InteractionCreate` dispatches.
	 */
	[GatewayDispatchEvents.InteractionCreate]: [ToEventProps<GatewayInteractionCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.InviteCreate` dispatches.
	 */
	[GatewayDispatchEvents.InviteCreate]: [ToEventProps<GatewayInviteCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.InviteDelete` dispatches.
	 */
	[GatewayDispatchEvents.InviteDelete]: [ToEventProps<GatewayInviteDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageCreate` dispatches.
	 */
	[GatewayDispatchEvents.MessageCreate]: [ToEventProps<GatewayMessageCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageDelete` dispatches.
	 */
	[GatewayDispatchEvents.MessageDelete]: [ToEventProps<GatewayMessageDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageDeleteBulk` dispatches.
	 */
	[GatewayDispatchEvents.MessageDeleteBulk]: [ToEventProps<GatewayMessageDeleteBulkDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessagePollVoteAdd` dispatches.
	 */
	[GatewayDispatchEvents.MessagePollVoteAdd]: [ToEventProps<GatewayMessagePollVoteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessagePollVoteRemove` dispatches.
	 */
	[GatewayDispatchEvents.MessagePollVoteRemove]: [ToEventProps<GatewayMessagePollVoteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageReactionAdd` dispatches.
	 */
	[GatewayDispatchEvents.MessageReactionAdd]: [ToEventProps<GatewayMessageReactionAddDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageReactionRemove` dispatches.
	 */
	[GatewayDispatchEvents.MessageReactionRemove]: [ToEventProps<GatewayMessageReactionRemoveDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageReactionRemoveAll` dispatches.
	 */
	[GatewayDispatchEvents.MessageReactionRemoveAll]: [ToEventProps<GatewayMessageReactionRemoveAllDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageReactionRemoveEmoji` dispatches.
	 */
	[GatewayDispatchEvents.MessageReactionRemoveEmoji]: [ToEventProps<GatewayMessageReactionRemoveEmojiDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.MessageUpdate` dispatches.
	 */
	[GatewayDispatchEvents.MessageUpdate]: [ToEventProps<GatewayMessageUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.PresenceUpdate` dispatches.
	 */
	[GatewayDispatchEvents.PresenceUpdate]: [ToEventProps<GatewayPresenceUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.RateLimited` dispatches.
	 */
	[GatewayDispatchEvents.RateLimited]: [ToEventProps<GatewayRateLimitedDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.Ready` dispatches.
	 */
	[GatewayDispatchEvents.Ready]: [ToEventProps<GatewayReadyDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.Resumed` dispatches.
	 */
	[GatewayDispatchEvents.Resumed]: [ToEventProps<never>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.StageInstanceCreate` dispatches.
	 */
	[GatewayDispatchEvents.StageInstanceCreate]: [ToEventProps<GatewayStageInstanceCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.StageInstanceDelete` dispatches.
	 */
	[GatewayDispatchEvents.StageInstanceDelete]: [ToEventProps<GatewayStageInstanceDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.StageInstanceUpdate` dispatches.
	 */
	[GatewayDispatchEvents.StageInstanceUpdate]: [ToEventProps<GatewayStageInstanceUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.SubscriptionCreate` dispatches.
	 */
	[GatewayDispatchEvents.SubscriptionCreate]: [ToEventProps<GatewaySubscriptionCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.SubscriptionDelete` dispatches.
	 */
	[GatewayDispatchEvents.SubscriptionDelete]: [ToEventProps<GatewaySubscriptionDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.SubscriptionUpdate` dispatches.
	 */
	[GatewayDispatchEvents.SubscriptionUpdate]: [ToEventProps<GatewaySubscriptionUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadCreate` dispatches.
	 */
	[GatewayDispatchEvents.ThreadCreate]: [ToEventProps<GatewayThreadCreateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadDelete` dispatches.
	 */
	[GatewayDispatchEvents.ThreadDelete]: [ToEventProps<GatewayThreadDeleteDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadListSync` dispatches.
	 */
	[GatewayDispatchEvents.ThreadListSync]: [ToEventProps<GatewayThreadListSyncDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadMemberUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ThreadMemberUpdate]: [ToEventProps<GatewayThreadMemberUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadMembersUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ThreadMembersUpdate]: [ToEventProps<GatewayThreadMembersUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.ThreadUpdate` dispatches.
	 */
	[GatewayDispatchEvents.ThreadUpdate]: [ToEventProps<GatewayThreadUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.TypingStart` dispatches.
	 */
	[GatewayDispatchEvents.TypingStart]: [ToEventProps<GatewayTypingStartDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.UserUpdate` dispatches.
	 */
	[GatewayDispatchEvents.UserUpdate]: [ToEventProps<GatewayUserUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.VoiceServerUpdate` dispatches.
	 */
	[GatewayDispatchEvents.VoiceServerUpdate]: [ToEventProps<GatewayVoiceServerUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.VoiceStateUpdate` dispatches.
	 */
	[GatewayDispatchEvents.VoiceStateUpdate]: [ToEventProps<GatewayVoiceStateUpdateDispatchData>];
	/**
	 * Listener tuple for `GatewayDispatchEvents.WebhooksUpdate` dispatches.
	 */
	[GatewayDispatchEvents.WebhooksUpdate]: [ToEventProps<GatewayWebhooksUpdateDispatchData>];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
/**
 * Public event map used by shard-level client event emitters.
 */
export interface ManagerShardEventsMap extends MappedEvents {}

/**
 * Required dependencies for constructing a {@link Client}.
 */
export interface ClientOptions {
	/**
	 * Gateway transport implementation.
	 */
	gateway: Gateway;
	/**
	 * REST transport implementation.
	 */
	rest: REST;
}

/**
 * Aggregated result payload yielded from guild member chunk streaming.
 */
export interface RequestGuildMembersResult {
	/**
	 * Members included in the received chunk.
	 */
	members: GatewayGuildMembersChunkDispatchData['members'];
	/**
	 * Nonce used to correlate the request and response chunks.
	 */
	nonce: NonNullable<GatewayGuildMembersChunkDispatchData['nonce']>;
	/**
	 * User IDs that could not be resolved in the request.
	 */
	notFound: NonNullable<GatewayGuildMembersChunkDispatchData['not_found']>;
	/**
	 * Presence payloads included with the received members.
	 */
	presences: NonNullable<GatewayGuildMembersChunkDispatchData['presences']>;
}

function createTimer(controller: AbortController, timeout: number) {
	return setTimeout(() => controller.abort(), timeout);
}

export class Client extends AsyncEventEmitter<MappedEvents> {
	public readonly rest: REST;

	public readonly gateway: Gateway;

	public readonly api: API;

	public constructor(options: ClientOptions) {
		super();
		this.rest = options.rest;
		this.gateway = options.gateway;
		this.api = new API(this.rest);

		this.gateway.on(WebSocketShardEvents.Dispatch, (dispatch) => {
			this.emit(dispatch.t, this.toEventProps(dispatch.d));
		});
	}

	/**
	 * Requests guild members from the gateway and returns an async iterator that yields the data from each guild members chunk event.
	 *
	 * @see {@link https://discord.com/developers/docs/topics/gateway-events#request-guild-members}
	 * @param options - The options for the request
	 * @param timeout - The timeout for waiting for each guild members chunk event
	 * @example
	 * Requesting all members from a guild
	 * ```ts
	 * for await (const { members } of client.requestGuildMembersIterator({ guild_id: '1234567890', query: '', limit: 0 })) {
	 * 	console.log(members);
	 * }
	 * ```
	 */
	public async *requestGuildMembersIterator(options: GatewayRequestGuildMembersData, timeout = 10_000) {
		const nonce = options.nonce ?? DiscordSnowflake.generate().toString();

		const controller = new AbortController();

		let timer: NodeJS.Timeout | undefined = createTimer(controller, timeout);

		const onRatelimit = ({ data }: ToEventProps<GatewayRateLimitedDispatchData>) => {
			// We could verify meta.guild_id === options.guild_id as well, but really, the nonce check is enough
			if (data.meta.nonce === nonce) {
				controller.abort(new GatewayRateLimitError(data, options));
			}
		};

		const cleanup = () => {
			if (timer) {
				clearTimeout(timer);
			}

			this.off(GatewayDispatchEvents.RateLimited, onRatelimit);
		};

		this.on(GatewayDispatchEvents.RateLimited, onRatelimit);
		await this.gateway.send({
			op: GatewayOpcodes.RequestGuildMembers,
			// eslint-disable-next-line id-length
			d: {
				...options,
				nonce,
			},
		});

		try {
			const iterator = AsyncEventEmitter.on(this, GatewayDispatchEvents.GuildMembersChunk, {
				signal: controller.signal,
			});

			for await (const [{ data }] of iterator) {
				if (data.nonce !== nonce) continue;

				clearTimeout(timer);
				timer = undefined;

				yield {
					members: data.members,
					nonce,
					notFound: data.not_found ?? null,
					presences: data.presences ?? null,
					chunkIndex: data.chunk_index,
					chunkCount: data.chunk_count,
				};

				if (data.chunk_index >= data.chunk_count - 1) break;

				// eslint-disable-next-line require-atomic-updates
				timer = createTimer(controller, timeout);
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				if (error.cause instanceof GatewayRateLimitError) {
					throw error.cause;
				}

				throw new Error('Request timed out');
			}

			throw error;
		} finally {
			cleanup();
		}
	}

	/**
	 * Requests guild members from the gateway.
	 *
	 * @see {@link https://discord.com/developers/docs/topics/gateway-events#request-guild-members}
	 * @param options - The options for the request
	 * @param timeout - The timeout for waiting for each guild members chunk event
	 * @example
	 * Requesting specific members from a guild
	 * ```ts
	 * const { members } = await client.requestGuildMembers({ guild_id: '1234567890', user_ids: ['9876543210'] });
	 * ```
	 */
	public async requestGuildMembers(options: GatewayRequestGuildMembersData, timeout = 10_000) {
		const members: RequestGuildMembersResult['members'] = [];
		const notFound: RequestGuildMembersResult['notFound'] = [];
		const presences: RequestGuildMembersResult['presences'] = [];
		const nonce = options.nonce ?? DiscordSnowflake.generate().toString();

		for await (const data of this.requestGuildMembersIterator({ ...options, nonce }, timeout)) {
			members.push(...data.members);
			if (data.presences) presences.push(...data.presences);
			if (data.notFound) notFound.push(...data.notFound);
		}

		return { members, nonce, notFound, presences };
	}

	/**
	 * Requests soundboard sounds from the gateway and returns an async iterator that yields the data from each soundboard sounds event.
	 *
	 * @see {@link https://discord.com/developers/docs/topics/gateway-events#request-soundboard-sounds}
	 * @param options - The options for the request
	 * @param timeout - The timeout for waiting for each soundboard sounds
	 * @example
	 * Requesting soundboard sounds for specific guilds
	 * ```ts
	 * for await (const { guildId, soundboardSounds } of this.requestSoundboardSoundsIterator({
	 *	guild_ids: ['1234567890', '9876543210'],
	 * })) {
	 *	console.log(`Soundboard sounds for guild ${guildId}:`, soundboardSounds);
	 * }
	 * ```
	 */
	public async *requestSoundboardSoundsIterator(options: GatewayRequestSoundboardSoundsData, timeout = 10_000) {
		const controller = new AbortController();

		let timer: NodeJS.Timeout | undefined = createTimer(controller, timeout);

		await this.gateway.send({
			op: GatewayOpcodes.RequestSoundboardSounds,
			// eslint-disable-next-line id-length
			d: options,
		});

		try {
			const iterator = AsyncEventEmitter.on(this, GatewayDispatchEvents.SoundboardSounds, {
				signal: controller.signal,
			});

			const guildIds = new Set(options.guild_ids);

			for await (const [{ data }] of iterator) {
				if (!guildIds.has(data.guild_id)) continue;

				clearTimeout(timer);
				timer = undefined;

				yield {
					guildId: data.guild_id,
					soundboardSounds: data.soundboard_sounds,
				};

				guildIds.delete(data.guild_id);

				if (guildIds.size === 0) break;

				timer = createTimer(controller, timeout);
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request timed out');
			}

			throw error;
		} finally {
			if (timer) {
				clearTimeout(timer);
			}
		}
	}

	/**
	 * Requests soundboard sounds from the gateway.
	 *
	 * @see {@link https://discord.com/developers/docs/topics/gateway-events#request-soundboard-sounds}
	 * @param options - The options for the request
	 * @param timeout - The timeout for waiting for each soundboard sounds event
	 * @example
	 * Requesting soundboard sounds for specific guilds
	 * ```ts
	 * const soundboardSounds = await client.requestSoundboardSounds({ guild_ids: ['1234567890', '9876543210'], });
	 *
	 * console.log(soundboardSounds.get('1234567890'));
	 * ```
	 */
	public async requestSoundboardSounds(options: GatewayRequestSoundboardSoundsData, timeout = 10_000) {
		const soundboardSounds = new Map<
			GatewaySoundboardSoundsDispatchData['guild_id'],
			GatewaySoundboardSoundsDispatchData['soundboard_sounds']
		>();

		for await (const data of this.requestSoundboardSoundsIterator(options, timeout)) {
			soundboardSounds.set(data.guildId, data.soundboardSounds);
		}

		return soundboardSounds;
	}

	/**
	 * Updates the voice state of the bot user
	 *
	 * @see {@link https://discord.com/developers/docs/topics/gateway-events#update-voice-state}
	 * @param options - The options for updating the voice state
	 */
	public async updateVoiceState(options: GatewayVoiceStateUpdateData) {
		await this.gateway.send({
			op: GatewayOpcodes.VoiceStateUpdate,
			// eslint-disable-next-line id-length
			d: options,
		});
	}

	/**
	 * Updates the presence of the bot user
	 *
	 * @param options - The options for updating the presence
	 */
	public async updatePresence(options: GatewayPresenceUpdateData) {
		await this.gateway.send({
			op: GatewayOpcodes.PresenceUpdate,
			// eslint-disable-next-line id-length
			d: options,
		});
	}

	private toEventProps<ObjectType>(obj: ObjectType): ToEventProps<ObjectType> {
		return {
			api: this.api,
			data: obj,
		};
	}
}
