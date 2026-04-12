import { BUILD_NUMBER_REGEX } from './constants.js';

/**
 * Resolved Discord web/native build metadata used in super-properties.
 */
export interface DiscordBuildMetadata {
	/**
	 * Current Discord web client build number.
	 */
	clientBuildNumber: number;
	/**
	 * Current Discord desktop host version.
	 */
	hostVersion?: string;
	/**
	 * Current Discord desktop native build number.
	 */
	nativeBuildNumber?: number;
}

/**
 * Configuration for Discord build metadata resolution.
 */
export interface DiscordBuildMetadataOptions {
	/**
	 * Custom fetch implementation used for metadata requests.
	 */
	fetch?: typeof fetch;
	/**
	 * Whether to bypass and reset the in-memory metadata cache.
	 */
	refresh?: boolean;
}

interface NativeBuildResponse {
	metadata_version: number;
	full?: {
		host_version?: number[];
	};
}

let cachedBuildMetadata: DiscordBuildMetadata | null = null;
let cachedBuildMetadataPromise: Promise<DiscordBuildMetadata> | null = null;

/**
 * Fetches Discord native desktop build metadata from the public update feed.
 */
export async function getLatestNativeBuild(fetcher: typeof fetch = fetch) {
	const response = await fetcher(
		`https://updates.discord.com/distributions/app/manifests/latest?channel=stable&platform=win&arch=x64&install_id=${crypto.randomUUID()}`,
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch latest native build: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as NativeBuildResponse;
	const hostVersion = data.full?.host_version?.join('.');

	if (!hostVersion) {
		throw new Error('Failed to fetch latest native build: missing host version');
	}

	if (!data.metadata_version) {
		throw new Error('Failed to fetch latest native build: missing native build number');
	}

	return {
		hostVersion,
		nativeBuildNumber: data.metadata_version,
	};
}

/**
 * Extracts the current Discord web build number from the app shell assets.
 */
export async function getLatestDiscordBuildNumber(fetcher: typeof fetch = fetch) {
	const response = await fetcher('https://discord.com/app');

	if (!response.ok) {
		throw new Error(`Failed to fetch Discord app page: ${response.status} ${response.statusText}`);
	}

	const html = await response.text();
	const scripts = html.match(/\/assets\/web\.[^"' )]+\.js/gim);

	if (!scripts?.length) {
		throw new Error('Failed to get latest build number: no scripts found in app shell');
	}

	for (const script of scripts.reverse()) {
		const assetResponse = await fetcher(`https://discord.com${script}`, {
			headers: {
				Origin: 'https://discord.com',
				Referer: 'https://discord.com/app',
			},
		});

		if (!assetResponse.ok) {
			continue;
		}

		const source = await assetResponse.text();
		const match = source.match(BUILD_NUMBER_REGEX);
		const candidate = Number(match?.[1] ?? match?.[2]);

		if (!Number.isNaN(candidate) && candidate > 0) {
			return candidate;
		}
	}

	throw new Error('Failed to get latest build number from Discord assets');
}

/**
 * Resolves and caches combined Discord web/native build metadata.
 */
export async function getDiscordBuildMetadata(options: DiscordBuildMetadataOptions = {}) {
	const fetcher = options.fetch ?? fetch;

	if (options.refresh) {
		cachedBuildMetadata = null;
		cachedBuildMetadataPromise = null;
	}

	if (cachedBuildMetadata) {
		return cachedBuildMetadata;
	}

	cachedBuildMetadataPromise ??= (async () => {
		const [clientBuildNumber, nativeBuild] = await Promise.all([
			getLatestDiscordBuildNumber(fetcher),
			getLatestNativeBuild(fetcher),
		]);

		cachedBuildMetadata = {
			clientBuildNumber,
			hostVersion: nativeBuild.hostVersion,
			nativeBuildNumber: nativeBuild.nativeBuildNumber,
		};

		return cachedBuildMetadata;
	})();

	try {
		return await cachedBuildMetadataPromise;
	} finally {
		cachedBuildMetadataPromise = null;
	}
}

/**
 * Clears the in-memory metadata cache used by {@link getDiscordBuildMetadata}.
 */
export function clearDiscordBuildMetadataCache() {
	cachedBuildMetadata = null;
	cachedBuildMetadataPromise = null;
}
