import type { GatewaySendPayload } from 'discord-api-types/v10';
import { GatewayOpcodes } from 'discord-api-types/v10';
import { describe, expect, test, vi } from 'vitest';
import { WebSocketManager, type IShardingStrategy } from '../../src/index.js';
import { mockGatewayInformation } from '../gateway.mock.js';

vi.useFakeTimers();

const NOW = vi.fn().mockReturnValue(Date.now());
global.Date.now = NOW;

test('fetch gateway information', async () => {
	const fetchGatewayInformation = vi.fn(async () => mockGatewayInformation);

	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		fetchGatewayInformation,
	});

	const initial = await manager.fetchGatewayInformation();
	expect(initial).toEqual(mockGatewayInformation);
	expect(fetchGatewayInformation).toHaveBeenCalledOnce();

	fetchGatewayInformation.mockClear();

	const cached = await manager.fetchGatewayInformation();
	expect(cached).toEqual(mockGatewayInformation);
	expect(fetchGatewayInformation).not.toHaveBeenCalled();

	fetchGatewayInformation.mockClear();

	const forced = await manager.fetchGatewayInformation(true);
	expect(forced).toEqual(mockGatewayInformation);
	expect(fetchGatewayInformation).toHaveBeenCalledOnce();

	fetchGatewayInformation.mockClear();

	NOW.mockReturnValue(Number.POSITIVE_INFINITY);
	const cacheExpired = await manager.fetchGatewayInformation();
	expect(cacheExpired).toEqual(mockGatewayInformation);
	expect(fetchGatewayInformation).toHaveBeenCalledOnce();
});

test('fetch selfbot gateway information', async () => {
	NOW.mockReturnValue(0);
	const fetchGatewayInformation = vi.fn(async () => ({ url: 'wss://gateway.discord.gg' }));

	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		fetchGatewayInformation,
	});

	const initial = await manager.fetchGatewayInformation();
	expect(initial).toEqual({ url: 'wss://gateway.discord.gg' });
	expect(fetchGatewayInformation).toHaveBeenCalledOnce();

	fetchGatewayInformation.mockClear();

	const cached = await manager.fetchGatewayInformation();
	expect(cached).toEqual({ url: 'wss://gateway.discord.gg' });
	expect(fetchGatewayInformation).not.toHaveBeenCalled();

	fetchGatewayInformation.mockClear();

	NOW.mockReturnValue(Number.POSITIVE_INFINITY);
	const cacheExpired = await manager.fetchGatewayInformation();
	expect(cacheExpired).toEqual({ url: 'wss://gateway.discord.gg' });
	expect(fetchGatewayInformation).toHaveBeenCalledOnce();
});

describe('get shard count', () => {
	test('always resolves to a single session', async () => {
		const manager = new WebSocketManager({
			token: 'A-Very-Fake-Token',
			intents: 0,
			async fetchGatewayInformation() {
				return mockGatewayInformation;
			},
		});

		expect(await manager.getShardCount()).toBe(1);
		expect(await manager.getShardIds()).toStrictEqual([0]);
	});

	test('with selfbot gateway information', async () => {
		const manager = new WebSocketManager({
			token: 'A-Very-Fake-Token',
			intents: 0,
			async fetchGatewayInformation() {
				return { url: 'wss://gateway.discord.gg' };
			},
		});

		expect(await manager.getShardCount()).toBe(1);
		expect(await manager.getShardIds()).toStrictEqual([0]);
	});
});

test('update shard count keeps a single session', async () => {
	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		async fetchGatewayInformation() {
			return mockGatewayInformation;
		},
	});

	await manager.updateShardCount(1);
	expect(await manager.getShardCount()).toBe(1);
	expect(await manager.getShardIds()).toStrictEqual([0]);
});

test('rejects explicit shard count', () => {
	expect(
		() =>
			new WebSocketManager({
				token: 'A-Very-Fake-Token',
				intents: 0,
				shardCount: 2,
				async fetchGatewayInformation() {
					return mockGatewayInformation;
				},
			}),
	).toThrow('Sharding is not supported in this fork');
});

test('rejects explicit shard ids', () => {
	expect(
		() =>
			new WebSocketManager({
				token: 'A-Very-Fake-Token',
				intents: 0,
				shardIds: [1],
				async fetchGatewayInformation() {
					return mockGatewayInformation;
				},
			}),
	).toThrow('Sharding is not supported in this fork');
});

test('strategies', async () => {
	class MockStrategy implements IShardingStrategy {
		public spawn = vi.fn();

		public connect = vi.fn();

		public destroy = vi.fn();

		public send = vi.fn();

		public fetchStatus = vi.fn();
	}

	const strategy = new MockStrategy();

	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		async fetchGatewayInformation() {
			return mockGatewayInformation;
		},
		buildStrategy: () => strategy,
	});

	await manager.connect();
	expect(strategy.spawn).toHaveBeenCalledWith([0]);
	expect(strategy.connect).toHaveBeenCalled();

	const destroyOptions = { reason: ':3' };
	await manager.destroy(destroyOptions);
	expect(strategy.destroy).toHaveBeenCalledWith(destroyOptions);

	const send: GatewaySendPayload = {
		op: GatewayOpcodes.RequestGuildMembers,
		// eslint-disable-next-line id-length
		d: { guild_id: '1234', limit: 0, query: '' },
	};
	await manager.send(0, send);
	expect(strategy.send).toHaveBeenCalledWith(0, send);
});
