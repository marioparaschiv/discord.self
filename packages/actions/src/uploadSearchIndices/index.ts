import process from 'node:process';
import { setFailed } from '@actions/core';
import { generateAllIndices } from '@discord.self/scripts';
import { type EnqueuedTask, MeiliSearch } from 'meilisearch';
import pLimit from 'p-limit';
import { fetch } from 'undici';

if (!process.env.SEARCH_API_URL) {
	setFailed('SEARCH_API_URL is not set');
	process.exit(1);
}

if (!process.env.SEARCH_API_KEY) {
	setFailed('SEARCH_API_KEY is not set');
	process.exit(1);
}

if (!process.env.DOCS_STORAGE_BUCKET_URL) {
	setFailed('DOCS_STORAGE_BUCKET_URL is not set');
	process.exit(1);
}

const docsBucketUrl = process.env.DOCS_STORAGE_BUCKET_URL.endsWith('/')
	? process.env.DOCS_STORAGE_BUCKET_URL.slice(0, -1)
	: process.env.DOCS_STORAGE_BUCKET_URL;

function parsePositiveInteger(value: string | undefined) {
	if (!value) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function normalizePackageName(packageName: string) {
	return packageName.replace(/^@discord(?:\.self|js)\//, '').trim();
}

function parsePackageFilter() {
	const fromEnv = process.env.BOOTSTRAP_PACKAGES ?? '';
	if (!fromEnv || fromEnv === '*') {
		return [];
	}

	return fromEnv
		.split(',')
		.map((packageName) => normalizePackageName(packageName))
		.filter(Boolean);
}

interface DocsManifest {
	versions: string[];
}

async function fetchManifest(packageName: string): Promise<DocsManifest | null> {
	try {
		const response = await fetch(`${docsBucketUrl}/manifests/${packageName}.json`);
		if (!response.ok) {
			return null;
		}

		const parsed = (await response.json()) as Partial<DocsManifest>;
		if (!Array.isArray(parsed.versions)) {
			return null;
		}

		return {
			versions: parsed.versions.filter((version): version is string => typeof version === 'string'),
		};
	} catch {
		return null;
	}
}

const client = new MeiliSearch({
	host: process.env.SEARCH_API_URL,
	apiKey: process.env.SEARCH_API_KEY,
});

const isLikelyLocalUpload = /(?:^https?:\/\/)?(?:localhost|127\.0\.0\.1|minio)(?::\d+)?(?:\/|$)/i.test(docsBucketUrl);
const uploadConcurrency = parsePositiveInteger(process.env.SEARCH_UPLOAD_CONCURRENCY) ?? (isLikelyLocalUpload ? 20 : 5);
const limit = pLimit(uploadConcurrency);

console.log(`Search upload concurrency=${uploadConcurrency}, local=${isLikelyLocalUpload}`);

try {
	const packages = parsePackageFilter();
	const selectedPackages = new Set(packages);

	console.log('Generating all indices...');
	const indices = await generateAllIndices({
		fetchPackageVersions: async (pkg) => {
			if (selectedPackages.size > 0 && !selectedPackages.has(pkg)) {
				return [];
			}

			console.info(`Fetching versions for ${pkg}...`);
			const manifest = await fetchManifest(pkg);
			return manifest?.versions ?? [];
		},
		fetchPackageVersionDocs: async (pkg, version) => {
			console.log(`Fetching data for ${pkg} ${version}...`);
			const response = await fetch(`${docsBucketUrl}/${pkg}/${version}.json`);
			if (!response.ok) {
				throw new Error(`Could not fetch docs payload for ${pkg}@${version}`);
			}

			return response.json();
		},
		writeToFile: false,
	});
	console.log('Generated all indices.');

	console.log('Uploading indices...');

	const promises = indices.map(async (index) =>
		limit(async () => {
			console.log(`Uploading ${index.index}...`);
			let task: EnqueuedTask | undefined;
			try {
				task = await client.createIndex(index.index);
			} catch {}

			if (task) {
				await client.tasks.waitForTask(task, { timeout: 10_000 });
			}

			const searchIndex = client.index(index.index);
			await searchIndex.updateSettings({ sortableAttributes: ['type'] });

			await searchIndex.addDocuments(index.data);
		}),
	);

	await Promise.all(promises);

	console.log('Uploaded all indices.');
} catch (error) {
	const err = error as Error;
	console.error(err);
	setFailed(err.message);
	process.exit(1);
}
