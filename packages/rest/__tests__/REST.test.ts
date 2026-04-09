import { Buffer } from 'node:buffer';
import { DiscordSnowflake } from '@sapphire/snowflake';
import type { Snowflake } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { type FormData, fetch } from 'undici';
import { MockAgent, setGlobalDispatcher } from 'undici';
import type { Interceptable, MockInterceptor } from 'undici/types/mock-interceptor.js';
import { beforeEach, afterEach, test, expect, vitest } from 'vitest';
import { REST } from '../src/index.js';
import { getCloakedBrowserHeaders } from '../src/lib/utils/httpcloak.js';
import { genPath } from './util.js';

vitest.mock('../src/lib/utils/httpcloak.js', () => ({
	getCloakedBrowserHeaders: vitest.fn(async () => ({
		acceptLanguage: 'en-US,en;q=0.9',
		secChUa: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
		secChUaMobile: '?0',
		secChUaPlatform: '"Windows"',
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
	})),
}));

const newSnowflake: Snowflake = DiscordSnowflake.generate().toString();

const api = new REST().setToken('A-Very-Fake-Token');
const browserMetadataApi = new REST({
	browser: {
		buildMetadata: {
			clientBuildNumber: 123_456,
			hostVersion: '1.0.9000',
			nativeBuildNumber: 444,
		},
		locale: 'en-GB',
		timezone: 'Europe/London',
	},
}).setToken('A-Very-Fake-Token');
const identityHeaders = vitest.fn(async () => ({
	'user-agent': 'Mozilla/5.0 identity',
	'x-discord-locale': 'en-GB',
	'x-super-properties': 'identity-super-properties',
}));
const identityTransport = vitest.fn();
const identityApi = new REST({
	identity: {
		async ensureReady() {},
		getHeaders: identityHeaders,
		getRequestHandler: () => identityTransport,
	} as never,
}).setToken('A-Very-Fake-Token');

const makeRequestMock = vitest.fn(fetch);

const fetchApi = new REST({ makeRequest: makeRequestMock }).setToken('A-Very-Fake-Token');

// @discord.self/rest uses the `content-type` header to detect whether to parse
// the response as JSON or as an ArrayBuffer.
const responseOptions: MockInterceptor.MockResponseOptions = {
	headers: {
		'content-type': 'application/json',
	},
};

let mockAgent: MockAgent;
let mockPool: Interceptable;

beforeEach(() => {
	mockAgent = new MockAgent();
	mockAgent.disableNetConnect(); // prevent actual requests to Discord
	setGlobalDispatcher(mockAgent); // enabled the mock client to intercept requests

	mockPool = mockAgent.get('https://discord.com');
	api.setAgent(mockAgent);
	browserMetadataApi.setAgent(mockAgent);
	identityApi.setAgent(mockAgent);
	fetchApi.setAgent(mockAgent);
	vitest.mocked(getCloakedBrowserHeaders).mockClear();
	identityHeaders.mockClear();
	identityTransport.mockReset();
});

afterEach(async () => {
	await mockAgent.close();
});

test('simple GET', async () => {
	mockPool
		.intercept({
			path: genPath('/simpleGet'),
			method: 'GET',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.get('/simpleGet')).toStrictEqual({ test: true });
});

test('simple DELETE', async () => {
	mockPool
		.intercept({
			path: genPath('/simpleDelete'),
			method: 'DELETE',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.delete('/simpleDelete')).toStrictEqual({ test: true });
});

test('simple PATCH', async () => {
	mockPool
		.intercept({
			path: genPath('/simplePatch'),
			method: 'PATCH',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.patch('/simplePatch')).toStrictEqual({ test: true });
});

test('simple PUT', async () => {
	mockPool
		.intercept({
			path: genPath('/simplePut'),
			method: 'PUT',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.put('/simplePut')).toStrictEqual({ test: true });
});

test('simple POST', async () => {
	mockPool
		.intercept({
			path: genPath('/simplePost'),
			method: 'POST',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.post('/simplePost')).toStrictEqual({ test: true });
});

test('simple POST with fetch', async () => {
	mockPool
		.intercept({
			path: genPath('/fetchSimplePost'),
			method: 'POST',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await fetchApi.post('/fetchSimplePost')).toStrictEqual({ test: true });
	expect(makeRequestMock).toHaveBeenCalledTimes(1);
});

test('per-request user-agent headers override the default rest user-agent', async () => {
	mockPool
		.intercept({
			path: genPath('/userAgentOverride'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({
				userAgent:
					(from.headers as unknown as Record<string, string | undefined>)['user-agent'] ??
					(from.headers as unknown as Record<string, string | undefined>)['User-Agent'] ??
					null,
			}),
			responseOptions,
		);

	expect(
		await api.get('/userAgentOverride', {
			headers: {
				'user-agent': 'Mozilla/5.0 cloaked',
			},
		}),
	).toStrictEqual({ userAgent: 'Mozilla/5.0 cloaked' });
});

test('rest options user-agent headers override the generated default', async () => {
	const customUserAgentApi = new REST({
		headers: {
			'user-agent': 'Custom Rest Header',
		},
	}).setToken('A-Very-Fake-Token');

	customUserAgentApi.setAgent(mockAgent);

	mockPool
		.intercept({
			path: genPath('/restHeaderUserAgent'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({
				userAgent:
					(from.headers as unknown as Record<string, string | undefined>)['user-agent'] ??
					(from.headers as unknown as Record<string, string | undefined>)['User-Agent'] ??
					null,
			}),
			responseOptions,
		);

	expect(await customUserAgentApi.get('/restHeaderUserAgent')).toStrictEqual({
		userAgent: 'Custom Rest Header',
	});
});

test('simple PUT 2', async () => {
	mockPool
		.intercept({
			path: genPath('/simplePut'),
			method: 'PUT',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.put('/simplePut')).toStrictEqual({ test: true });
});

test('getQuery', async () => {
	const query = new URLSearchParams([
		['foo', 'bar'],
		['hello', 'world'],
	]);

	mockPool
		.intercept({
			path: `${genPath('/getQuery')}?${query.toString()}`,
			method: 'GET',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(
		await api.get('/getQuery', {
			query,
		}),
	).toStrictEqual({ test: true });
});

test('getAuth', async () => {
	mockPool
		.intercept({
			path: genPath('/getAuth'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({ auth: (from.headers as unknown as Record<string, string | undefined>).Authorization ?? null }),
			responseOptions,
		)
		.times(5);

	// default
	expect(await api.get('/getAuth')).toStrictEqual({ auth: 'A-Very-Fake-Token' });

	// unauthorized
	expect(
		await api.get('/getAuth', {
			auth: false,
		}),
	).toStrictEqual({ auth: null });

	// authorized
	expect(
		await api.get('/getAuth', {
			auth: true,
		}),
	).toStrictEqual({ auth: 'A-Very-Fake-Token' });

	// Custom Auth
	expect(
		await api.get('/getAuth', {
			auth: { token: 'A-Very-Different-Fake-Token' },
		}),
	).toStrictEqual({ auth: 'A-Very-Different-Fake-Token' });
});

test('browser metadata adds Discord client headers', async () => {
	mockPool
		.intercept({
			path: genPath('/browserMetadataHeaders'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({
				acceptLanguage:
					(from.headers as unknown as Record<string, string | undefined>)['accept-language'] ??
					(from.headers as unknown as Record<string, string | undefined>)['Accept-Language'] ??
					null,
				locale:
					(from.headers as unknown as Record<string, string | undefined>)['x-discord-locale'] ??
					(from.headers as unknown as Record<string, string | undefined>)['X-Discord-Locale'] ??
					null,
				secChUa:
					(from.headers as unknown as Record<string, string | undefined>)['sec-ch-ua'] ??
					(from.headers as unknown as Record<string, string | undefined>)['Sec-CH-UA'] ??
					null,
				superProperties:
					(from.headers as unknown as Record<string, string | undefined>)['x-super-properties'] ??
					(from.headers as unknown as Record<string, string | undefined>)['X-Super-Properties'] ??
					null,
				timezone:
					(from.headers as unknown as Record<string, string | undefined>)['x-discord-timezone'] ??
					(from.headers as unknown as Record<string, string | undefined>)['X-Discord-Timezone'] ??
					null,
				userAgent:
					(from.headers as unknown as Record<string, string | undefined>)['user-agent'] ??
					(from.headers as unknown as Record<string, string | undefined>)['User-Agent'] ??
					null,
			}),
			responseOptions,
		);

	const response = (await browserMetadataApi.get('/browserMetadataHeaders')) as {
		acceptLanguage: string;
		locale: string;
		secChUa: string;
		superProperties: string;
		timezone: string;
		userAgent: string;
	};

	expect(response.acceptLanguage).toBe('en-GB,en-US;q=0.9,en;q=0.8');
	expect(response.locale).toBe('en-GB');
	expect(response.secChUa).toBe('"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"');
	expect(response.timezone).toBe('Europe/London');
	expect(response.userAgent).toContain('Chrome/146.0.0.0');
	expect(getCloakedBrowserHeaders).toHaveBeenCalledWith(
		expect.objectContaining({
			buildMetadata: {
				clientBuildNumber: 123_456,
				hostVersion: '1.0.9000',
				nativeBuildNumber: 444,
			},
			locale: 'en-GB',
			timezone: 'Europe/London',
		}),
	);

	expect(JSON.parse(Buffer.from(response.superProperties, 'base64').toString('utf8'))).toMatchObject({
		browser: 'Chrome',
		client_build_number: 123_456,
		host_version: '1.0.9000',
		native_build_number: 444,
		os: 'Windows',
		release_channel: 'stable',
		system_locale: 'en-GB',
	});
});

test('identity headers take precedence over generated browser metadata', async () => {
	identityTransport.mockImplementationOnce(async (_url, init) => {
		const headers = new Headers((init as { headers?: HeadersInit }).headers);
		return new Response(
			JSON.stringify({
				locale: headers.get('x-discord-locale'),
				superProperties: headers.get('x-super-properties'),
				userAgent: headers.get('user-agent'),
			}),
			responseOptions,
		);
	});

	expect(await identityApi.get('/identityHeaders')).toStrictEqual({
		locale: 'en-GB',
		superProperties: 'identity-super-properties',
		userAgent: 'Mozilla/5.0 identity',
	});
	expect(identityHeaders).toHaveBeenCalledOnce();
	expect(identityTransport).toHaveBeenCalledOnce();
	expect(getCloakedBrowserHeaders).not.toHaveBeenCalled();
});

test('per-request headers override generated browser metadata headers', async () => {
	mockPool
		.intercept({
			path: genPath('/browserMetadataOverride'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({
				timezone:
					(from.headers as unknown as Record<string, string | undefined>)['x-discord-timezone'] ??
					(from.headers as unknown as Record<string, string | undefined>)['X-Discord-Timezone'] ??
					null,
				userAgent:
					(from.headers as unknown as Record<string, string | undefined>)['user-agent'] ??
					(from.headers as unknown as Record<string, string | undefined>)['User-Agent'] ??
					null,
			}),
			responseOptions,
		);

	expect(
		await browserMetadataApi.get('/browserMetadataOverride', {
			headers: {
				'User-Agent': 'Mozilla/5.0 custom',
				'X-Discord-Timezone': 'America/New_York',
			},
		}),
	).toStrictEqual({
		timezone: 'America/New_York',
		userAgent: 'Mozilla/5.0 custom',
	});
});

test('getReason', async () => {
	mockPool
		.intercept({
			path: genPath('/getReason'),
			method: 'GET',
		})
		.reply(
			200,
			(from) => ({
				reason: (from.headers as unknown as Record<string, string | undefined>)['X-Audit-Log-Reason'] ?? null,
			}),
			responseOptions,
		)
		.times(3);

	// default
	expect(await api.get('/getReason')).toStrictEqual({ reason: null });

	// plain text
	expect(
		await api.get('/getReason', {
			reason: 'Hello',
		}),
	).toStrictEqual({ reason: 'Hello' });

	// encoded
	expect(
		await api.get('/getReason', {
			reason: '😄',
		}),
	).toStrictEqual({ reason: '%F0%9F%98%84' });
});

test('urlEncoded', async () => {
	mockPool
		.intercept({
			path: genPath('/urlEncoded'),
			method: 'POST',
		})
		.reply((from) => ({
			data: from.body!,
			statusCode: 200,
		}));

	const body = new URLSearchParams([
		['client_id', '1234567890123545678'],
		['client_secret', 'totally-valid-secret'],
		['redirect_uri', 'http://localhost'],
		['grant_type', 'authorization_code'],
		['code', 'very-invalid-code'],
	]);

	expect(
		new Uint8Array(
			(await api.post('/urlEncoded', {
				body,
				passThroughBody: true,
				auth: false,
			})) as ArrayBuffer,
		),
	).toStrictEqual(new Uint8Array(Buffer.from(body.toString())));
});

test('postEcho', async () => {
	mockPool
		.intercept({
			path: genPath('/postEcho'),
			method: 'POST',
		})
		.reply((from) => ({
			data: from.body!,
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.post('/postEcho', { body: { foo: 'bar' } })).toStrictEqual({ foo: 'bar' });
});

test('201 status code', async () => {
	mockPool
		.intercept({
			path: genPath('/postNon200StatusCode'),
			method: 'POST',
		})
		.reply((from) => ({
			data: from.body!,
			statusCode: 201,
			responseOptions,
		}));

	expect(await api.post('/postNon200StatusCode', { body: { foo: 'bar' } })).toStrictEqual({ foo: 'bar' });
});

test('Old Message Delete Edge-Case: Old message', async () => {
	mockPool
		.intercept({
			path: genPath('/channels/339942739275677727/messages/392063687801700356'),
			method: 'DELETE',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.delete(Routes.channelMessage('339942739275677727', '392063687801700356'))).toStrictEqual({
		test: true,
	});
});

test('Old Message Delete Edge-Case: Old message 2', async () => {
	mockPool
		.intercept({
			path: genPath(`/channels/339942739275677727/messages/${newSnowflake}`),
			method: 'DELETE',
		})
		.reply(() => ({
			data: { test: true },
			statusCode: 200,
			responseOptions,
		}));

	expect(await api.delete(Routes.channelMessage('339942739275677727', newSnowflake))).toStrictEqual({ test: true });
});

test('postFile', async () => {
	const mockData = {
		statusCode: 200,
		data: 'Hello',
	};

	mockPool
		.intercept({
			path: genPath('/postFileEmptyArray'),
			method: 'POST',
		})
		.reply(({ body }) => {
			expect(body).toBeNull();
			return mockData;
		});

	// postFile empty
	await api.post('/postFileEmptyArray', { files: [] });

	mockPool
		.intercept({
			path: genPath('/postFileStringData'),
			method: 'POST',
		})
		.reply(({ body }) => {
			const fd = body as FormData;

			expect(fd.get('files[0]')).toBeInstanceOf(File);
			expect(fd.get('files[0]')).toHaveProperty('size', 5); // 'Hello'

			return mockData;
		});

	// postFile file (string)
	await api.post('/postFileStringData', {
		files: [{ name: 'out.txt', data: 'Hello' }],
	});

	mockPool
		.intercept({
			path: genPath('/postFileBufferWithJson'),
			method: 'POST',
		})
		.reply(({ body }) => {
			const fd = body as FormData;

			expect(fd.get('files[0]')).toBeInstanceOf(File);
			expect(fd.get('files[0]')).toHaveProperty('size', 5); // Buffer.from('Hello')
			expect(fd.get('payload_json')).toStrictEqual(JSON.stringify({ foo: 'bar' }));

			return mockData;
		});

	// postFile file and JSON
	await api.post('/postFileBufferWithJson', {
		files: [{ name: 'out.txt', data: Buffer.from('Hello') }],
		body: { foo: 'bar' },
	});

	mockPool
		.intercept({
			path: genPath('/postFilesAndJson'),
			method: 'POST',
		})
		.reply(({ body }) => {
			const fd = body as FormData;

			expect(fd.get('files[0]')).toBeInstanceOf(File);
			expect(fd.get('files[1]')).toBeInstanceOf(File);
			expect(fd.get('files[0]')).toHaveProperty('size', 5); // Buffer.from('Hello')
			expect(fd.get('files[1]')).toHaveProperty('size', 2); // Buffer.from('Hi')
			expect(fd.get('payload_json')).toStrictEqual(JSON.stringify({ files: [{ id: 0, description: 'test' }] }));

			return mockData;
		});

	// postFile files and JSON
	await api.post('/postFilesAndJson', {
		files: [
			{ name: 'out.txt', data: Buffer.from('Hello') },
			{ name: 'out.txt', data: Buffer.from('Hi') },
		],
		body: { files: [{ id: 0, description: 'test' }] },
	});

	mockPool
		.intercept({
			path: genPath('/postFileStickerAndJson'),
			method: 'POST',
		})
		.reply(({ body }) => {
			const fd = body as FormData;

			expect(fd.get('file')).toBeInstanceOf(File);
			expect(fd.get('file')).toHaveProperty('size', 7); // Buffer.from('Sticker')
			expect(fd.get('foo')).toStrictEqual('bar');

			return mockData;
		});

	// postFile sticker and JSON
	await api.post('/postFileStickerAndJson', {
		files: [{ key: 'file', name: 'sticker.png', data: Buffer.from('Sticker') }],
		body: { foo: 'bar' },
		appendToFormData: true,
	});
});
