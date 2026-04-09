import { GatewayOpcodes } from 'discord-api-types/v10';
import { describe, expect, test, vi } from 'vitest';
import { WebSocketManager, WebSocketShardStatus } from '../../src/index.js';
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
	test('starts idle before connecting', async () => {
		const manager = new WebSocketManager({
			token: 'A-Very-Fake-Token',
			intents: 0,
			async fetchGatewayInformation() {
				return mockGatewayInformation;
			},
		});

		expect(await manager.fetchStatus()).toBe(WebSocketShardStatus.Idle);
	});

	test('uses selfbot gateway information', async () => {
		const manager = new WebSocketManager({
			token: 'A-Very-Fake-Token',
			intents: 0,
			async fetchGatewayInformation() {
				return { url: 'wss://gateway.discord.gg' };
			},
		});

		expect(await manager.fetchGatewayInformation()).toEqual({ url: 'wss://gateway.discord.gg' });
	});
});

test('send still rejects before the gateway session is connected', async () => {
	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		async fetchGatewayInformation() {
			return mockGatewayInformation;
		},
	});

	await expect(
		manager.send({
			op: GatewayOpcodes.RequestGuildMembers,
			// eslint-disable-next-line id-length
			d: { guild_id: '1234', limit: 0, query: '' },
		}),
	).rejects.toThrow();
	expect(await manager.fetchStatus()).toBe(WebSocketShardStatus.Idle);
});

test('destroy clears the gateway session', async () => {
	const manager = new WebSocketManager({
		token: 'A-Very-Fake-Token',
		intents: 0,
		async fetchGatewayInformation() {
			return mockGatewayInformation;
		},
	});

	await expect(
		manager.send({
			op: GatewayOpcodes.RequestGuildMembers,
			// eslint-disable-next-line id-length
			d: { guild_id: '1234', limit: 0, query: '' },
		}),
	).rejects.toThrow();

	await manager.destroy({ reason: ':3' });
	expect(await manager.fetchStatus()).toBe(WebSocketShardStatus.Idle);
});
