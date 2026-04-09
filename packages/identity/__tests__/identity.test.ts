import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	DiscordIdentity,
	clearDiscordBuildMetadataCache,
	createDiscordIdentity,
	makeDiscordCloakedRequest,
	restoreDiscordIdentity,
} from '../src/index.js';
import type {
	DiscordIdentityOptions,
	DiscordIdentityStorage,
	HTTPCloakRequestOptions,
	HTTPCloakSessionLike,
	HTTPCloakSessionOptions,
} from '../src/types.js';

class FakeSession implements HTTPCloakSessionLike {
	public readonly config: Partial<HTTPCloakSessionOptions>;
	public readonly cookies: Array<{ name: string; options?: Record<string, unknown>; value: string }> = [];
	public readonly requests: Array<{
		body?: BodyInit | null;
		headers?: Record<string, string>;
		method: string;
		url: string;
	}> = [];
	public warmups: string[] = [];

	public constructor(config: Partial<HTTPCloakSessionOptions> = {}) {
		this.config = config;
	}

	public close() {}

	public delete(url: string, options?: HTTPCloakRequestOptions) {
		this.requests.push({ body: options?.body, headers: options?.headers, method: 'DELETE', url });
		return Promise.resolve(this.respond(url));
	}

	public get(url: string, options?: HTTPCloakRequestOptions) {
		this.requests.push({ body: options?.body, headers: options?.headers, method: 'GET', url });
		return Promise.resolve(this.respond(url));
	}

	public marshal() {
		return JSON.stringify({
			cookies: this.cookies,
			warmups: this.warmups,
		});
	}

	public patch(url: string, options?: HTTPCloakRequestOptions) {
		this.requests.push({ body: options?.body, headers: options?.headers, method: 'PATCH', url });
		return Promise.resolve(this.respond(url));
	}

	public post(url: string, options?: HTTPCloakRequestOptions) {
		this.requests.push({ body: options?.body, headers: options?.headers, method: 'POST', url });
		return Promise.resolve(this.respond(url));
	}

	public put(url: string, options?: HTTPCloakRequestOptions) {
		this.requests.push({ body: options?.body, headers: options?.headers, method: 'PUT', url });
		return Promise.resolve(this.respond(url));
	}

	public setCookie(name: string, value: string, options?: Record<string, unknown>) {
		this.cookies.push({ name, options, value });
	}

	public warmup(url: string) {
		this.warmups.push(url);
	}

	protected respond(url: string) {
		if (url === 'https://httpbin.org/headers') {
			return {
				statusCode: 200,
				text: JSON.stringify({
					headers: {
						'Accept-Language': 'en-US,en;q=0.9',
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
					},
				}),
			};
		}

		return {
			headers: {
				'content-type': 'application/json',
			},
			statusCode: 200,
			text: JSON.stringify({ ok: true }),
		};
	}
}

const httpcloakState = vi.hoisted(() => {
	class HoistedMockSession {
		public readonly config: Partial<HTTPCloakSessionOptions>;
		public readonly cookies: Array<{ name: string; options?: Record<string, unknown>; value: string }> = [];
		public readonly requests: Array<{
			body?: BodyInit | null;
			headers?: Record<string, string>;
			method: string;
			url: string;
		}> = [];
		public warmups: string[] = [];

		public constructor(config: Partial<HTTPCloakSessionOptions> = {}) {
			this.config = config;
			state.sessions.push(this);
		}

		public close() {}

		public delete(url: string, options?: HTTPCloakRequestOptions) {
			this.requests.push({ body: options?.body, headers: options?.headers, method: 'DELETE', url });
			return Promise.resolve(this.respond(url));
		}

		public get(url: string, options?: HTTPCloakRequestOptions) {
			this.requests.push({ body: options?.body, headers: options?.headers, method: 'GET', url });
			return Promise.resolve(this.respond(url));
		}

		public marshal() {
			return JSON.stringify({
				cookies: this.cookies,
				warmups: this.warmups,
			});
		}

		public patch(url: string, options?: HTTPCloakRequestOptions) {
			this.requests.push({ body: options?.body, headers: options?.headers, method: 'PATCH', url });
			return Promise.resolve(this.respond(url));
		}

		public post(url: string, options?: HTTPCloakRequestOptions) {
			this.requests.push({ body: options?.body, headers: options?.headers, method: 'POST', url });
			return Promise.resolve(this.respond(url));
		}

		public put(url: string, options?: HTTPCloakRequestOptions) {
			this.requests.push({ body: options?.body, headers: options?.headers, method: 'PUT', url });
			return Promise.resolve(this.respond(url));
		}

		public setCookie(name: string, value: string, options?: Record<string, unknown>) {
			this.cookies.push({ name, options, value });
		}

		public warmup(url: string) {
			this.warmups.push(url);
		}

		public static unmarshal(serialized: string) {
			state.restoredState = serialized;
			return new HoistedMockSession({
				preset: 'chrome-latest',
				retry: 0,
				timeout: 30,
				verify: false,
			});
		}

		private respond(url: string) {
			if (url === 'https://httpbin.org/headers') {
				return {
					statusCode: 200,
					text: JSON.stringify({
						headers: {
							'Accept-Language': 'en-US,en;q=0.9',
							'User-Agent':
								'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
						},
					}),
				};
			}

			return {
				headers: {
					'content-type': 'application/json',
				},
				statusCode: 200,
				text: JSON.stringify({ ok: true }),
			};
		}
	}

	const state = {
		restoredState: null as string | null,
		sessions: [] as InstanceType<typeof HoistedMockSession>[],
		Session: HoistedMockSession,
	};

	return state;
});

vi.mock('httpcloak', () => ({
	Session: httpcloakState.Session,
}));

function createOptions(options: Partial<DiscordIdentityOptions> = {}) {
	return {
		buildMetadata: {
			clientBuildNumber: 12_345,
			hostVersion: '1.0.9000',
			nativeBuildNumber: 444,
		},
		...options,
	} satisfies DiscordIdentityOptions;
}

function createStorage(initial: SerializedDiscordIdentity | null = null) {
	let current = initial;

	const storage: DiscordIdentityStorage = {
		delete: vi.fn(() => {
			current = null;
		}),
		get: vi.fn(() => current),
		set: vi.fn((_token, identity) => {
			current = identity;
		}),
	};

	return {
		current: () => current,
		storage,
	};
}

beforeEach(() => {
	clearDiscordBuildMetadataCache();
	httpcloakState.restoredState = null;
	httpcloakState.sessions.length = 0;
});

describe('@discord.self/identity', () => {
	test('creates sessions with chrome-latest and seeds cookies', async () => {
		await createDiscordIdentity(
			createOptions({
				seedCookies: {
					__cf_bm: 'cookie-value',
				},
			}),
		);

		expect(httpcloakState.sessions).toHaveLength(1);
		expect(httpcloakState.sessions[0]?.config.preset).toBe('chrome-latest');
		expect(httpcloakState.sessions[0]?.cookies).toStrictEqual([
			{
				name: '__cf_bm',
				options: {
					domain: '.discord.com',
					path: '/',
					secure: true,
				},
				value: 'cookie-value',
			},
		]);
	});

	test('passes through httpcloak session options', async () => {
		await createDiscordIdentity(
			createOptions({
				session: {
					proxy: 'http://localhost:8080',
					timeout: 99,
					verify: true,
				},
			}),
		);

		expect(httpcloakState.sessions[0]?.config).toMatchObject({
			preset: 'chrome-latest',
			proxy: 'http://localhost:8080',
			timeout: 99,
			verify: true,
		});
	});

	test('restores a stored session per token before creating a new session', async () => {
		const persisted = {
			session: 'persisted-session',
			version: 1 as const,
			warmed: true,
		};
		const { storage } = createStorage(persisted);
		const identity = await createDiscordIdentity(
			createOptions({
				storage,
				token: 'user-token',
			}),
		);

		expect(storage.get).toHaveBeenCalledWith('user-token');
		expect(httpcloakState.restoredState).toBe('persisted-session');
		expect(httpcloakState.sessions).toHaveLength(1);
		expect(await identity.getHeaders()).toHaveProperty('x-super-properties');
	});

	test('discovers identity headers and super properties from httpbin', async () => {
		const identity = await createDiscordIdentity(createOptions());
		const headers = await identity.getHeaders({
			fingerprint: {
				clientHeartbeatSessionId: 'heartbeat',
				clientLaunchId: 'launch',
				launchSignature: 'signature',
			},
		});

		expect(headers['user-agent']).toContain('Chrome/146.0.0.0');
		expect(headers['sec-ch-ua']).toContain('"Chromium";v="146"');
		expect(headers['x-discord-locale']).toBe('en-US');

		const superProperties = JSON.parse(Buffer.from(headers['x-super-properties'], 'base64').toString('utf8')) as Record<
			string,
			unknown
		>;

		expect(superProperties.client_build_number).toBe(12_345);
		expect(superProperties.client_launch_id).toBe('launch');
		expect(superProperties.launch_signature).toBe('signature');
		expect(superProperties.client_heartbeat_session_id).toBe('heartbeat');
	});

	test('serializes and restores cached profile state', async () => {
		const identity = await createDiscordIdentity(createOptions());
		await identity.discover();

		const serialized = identity.serialize();
		const restored = await restoreDiscordIdentity(serialized, createOptions());
		const profile = await restored.getProfile();

		expect(httpcloakState.restoredState).toBe(serialized.session);
		expect(profile.browserVersion).toBe('146.0.0.0');
		expect(serialized.profile?.browser).toBe('Chrome');
	});

	test('persists discovered session state through the storage adapter', async () => {
		const { current, storage } = createStorage();
		const identity = await createDiscordIdentity(
			createOptions({
				storage,
				token: 'user-token',
			}),
		);

		await identity.getHeaders();

		expect(storage.set).toHaveBeenCalledWith(
			'user-token',
			expect.objectContaining({
				profile: expect.objectContaining({
					browser: 'Chrome',
				}),
				warmed: true,
			}),
		);
		expect(current()).toEqual(
			expect.objectContaining({
				profile: expect.objectContaining({
					browser: 'Chrome',
				}),
			}),
		);
	});

	test('request handler keeps caller headers and returns a REST-compatible response', async () => {
		const identity = await createDiscordIdentity(createOptions());
		const request = makeDiscordCloakedRequest(identity);
		const response = await request('https://discord.com/api/v10/users/@me', {
			headers: {
				'user-agent': 'Custom UA',
				'x-debug-options': 'custom',
			},
			method: 'GET',
		});

		expect(await response.json()).toStrictEqual({ ok: true });
		expect(httpcloakState.sessions[0]?.requests.at(-1)?.headers).toMatchObject({
			'user-agent': 'Custom UA',
			'x-debug-options': 'custom',
		});
	});

	test('getRequestHandler returns the same REST-compatible transport contract', async () => {
		const identity = await createDiscordIdentity(createOptions());
		const request = identity.getRequestHandler();
		const response = await request('https://discord.com/api/v10/users/@me', {
			headers: {
				Authorization: 'Bot A-Very-Fake-Token',
			},
			method: 'GET',
		});

		await expect(response.json()).resolves.toStrictEqual({ ok: true });
		expect(httpcloakState.sessions[0]?.requests.at(-1)?.method).toBe('GET');
		expect(httpcloakState.sessions[0]?.requests.at(-1)?.headers?.Authorization).toBe('Bot A-Very-Fake-Token');
	});

	test('falls back to build number 0 when build metadata fetch fails', async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
		const identity = new DiscordIdentity(new FakeSession(), {
			fetch: fetcher,
		});
		const headers = await identity.getHeaders();
		const superProperties = JSON.parse(Buffer.from(headers['x-super-properties'], 'base64').toString('utf8')) as Record<
			string,
			unknown
		>;

		expect(superProperties.client_build_number).toBe(0);
	});

	test('requires a token when storage is configured', async () => {
		const { storage } = createStorage();

		await expect(
			createDiscordIdentity(
				createOptions({
					storage,
				}),
			),
		).rejects.toThrow('storage requires a token');
	});
});
