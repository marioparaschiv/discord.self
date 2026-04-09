import { describe, expect, test, vi } from 'vitest';
import { resolveIdentifyProperties } from '../../src/utils/identity.js';

describe('resolveIdentifyProperties', () => {
	test('keeps explicit identify properties when no identity is provided', async () => {
		await expect(
			resolveIdentifyProperties(
				{
					browser: 'custom-browser',
					device: 'custom-device',
					os: 'custom-os',
				},
				null,
			),
		).resolves.toStrictEqual({
			browser: 'custom-browser',
			device: 'custom-device',
			os: 'custom-os',
		});
	});

	test('derives identify properties from the shared identity profile', async () => {
		const ensureReady = vi.fn(async () => {});
		const getProfile = vi.fn(async () => ({
			acceptLanguage: 'en-US,en;q=0.9',
			browser: 'Chrome',
			browserVersion: '146.0.0.0',
			isMobile: false,
			locale: 'en-US',
			os: 'Windows',
			osVersion: '10',
			secChUa: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
			userAgentMajor: '146',
		}));

		await expect(
			resolveIdentifyProperties(
				{
					browser: 'custom-browser',
					device: 'custom-device',
					os: 'custom-os',
				},
				{
					ensureReady,
					getProfile,
				} as never,
			),
		).resolves.toStrictEqual({
			browser: 'Chrome',
			device: 'Chrome',
			os: 'Windows',
		});
		expect(ensureReady).toHaveBeenCalledOnce();
		expect(getProfile).toHaveBeenCalledOnce();
	});
});
