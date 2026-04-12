import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { getInput, setFailed } from '@actions/core';
import { create } from '@actions/glob';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';

if (
	!process.env.DOCS_STORAGE_ENDPOINT ||
	!process.env.DOCS_STORAGE_ACCESS_KEY_ID ||
	!process.env.DOCS_STORAGE_SECRET_ACCESS_KEY ||
	!process.env.DOCS_STORAGE_BUCKET
) {
	setFailed('Missing environment variables');
}

function normalizePackageName(packageName: string) {
	return packageName.replace(/^@discord(?:\.self|js)\//, '').trim();
}

function parsePackageFilter() {
	const fromInput = getInput('package').trim();
	const fromEnv = (process.env.BOOTSTRAP_PACKAGES ?? '').trim();
	const value = fromInput || fromEnv;

	if (!value || value === '*') {
		return [];
	}

	return value
		.split(',')
		.map((packageName) => normalizePackageName(packageName))
		.filter(Boolean);
}

const packageFilter = parsePackageFilter();
const version = getInput('version') || 'main';
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
const docsEndpoint = process.env.DOCS_STORAGE_ENDPOINT ?? '';

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

const isLikelyLocalUpload = /(?:^https?:\/\/)?(?:localhost|127\.0\.0\.1|minio)(?::\d+)?(?:\/|$)/i.test(docsEndpoint);
const uploadConcurrency =
	parsePositiveInteger(process.env.DOCS_MANIFEST_UPLOAD_CONCURRENCY) ?? (isLikelyLocalUpload ? 32 : 10);

const S3 = new S3Client({
	region: 'auto',
	endpoint: process.env.DOCS_STORAGE_ENDPOINT!,
	forcePathStyle,
	credentials: {
		accessKeyId: process.env.DOCS_STORAGE_ACCESS_KEY_ID!,
		secretAccessKey: process.env.DOCS_STORAGE_SECRET_ACCESS_KEY!,
	},
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED',
});

interface DocsManifest {
	packageName: string;
	updatedAt: string;
	versions: string[];
}

interface DocsPackageIndexManifest {
	packages: string[];
	updatedAt: string;
}

function parseVersion(version: string) {
	const [base] = version.split(/[+-]/);
	const parts = base?.split('.');

	if (parts?.length !== 3) {
		return null;
	}

	const parsed = parts.map((part) => Number.parseInt(part, 10));

	if (parsed.some((part) => Number.isNaN(part))) {
		return null;
	}

	return parsed as [number, number, number];
}

function compareVersionDescending(left: string, right: string) {
	const leftParsed = parseVersion(left);
	const rightParsed = parseVersion(right);

	if (leftParsed && rightParsed) {
		for (let index = 0; index < 3; index++) {
			if (leftParsed[index] !== rightParsed[index]) {
				return rightParsed[index]! - leftParsed[index]!;
			}
		}

		return right.localeCompare(left);
	}

	if (leftParsed && !rightParsed) {
		return -1;
	}

	if (!leftParsed && rightParsed) {
		return 1;
	}

	return right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' });
}

function sortVersions(versions: string[]) {
	const deduped = [...new Set(versions.filter((version) => version.trim().length > 0))];
	const includesMain = deduped.includes('main');
	const releaseVersions = deduped.filter((version) => version !== 'main').sort(compareVersionDescending);

	return includesMain ? ['main', ...releaseVersions] : releaseVersions;
}

async function loadManifest(packageName: string): Promise<DocsManifest> {
	const key = `manifests/${packageName}.json`;

	try {
		const response = await S3.send(
			new GetObjectCommand({
				Bucket: process.env.DOCS_STORAGE_BUCKET,
				Key: key,
			}),
		);
		const body = await response.Body?.transformToString?.();
		if (!body) {
			return { packageName, updatedAt: new Date().toISOString(), versions: [] };
		}

		const parsed = JSON.parse(body) as Partial<DocsManifest>;
		const versions = Array.isArray(parsed.versions)
			? parsed.versions.filter((item): item is string => typeof item === 'string')
			: [];

		return {
			packageName,
			updatedAt: parsed.updatedAt ?? new Date().toISOString(),
			versions,
		};
	} catch {
		return { packageName, updatedAt: new Date().toISOString(), versions: [] };
	}
}

async function loadPackageIndexManifest(): Promise<DocsPackageIndexManifest> {
	const key = 'manifests/index.json';

	try {
		const response = await S3.send(
			new GetObjectCommand({
				Bucket: process.env.DOCS_STORAGE_BUCKET,
				Key: key,
			}),
		);
		const body = await response.Body?.transformToString?.();
		if (!body) {
			return { packages: [], updatedAt: new Date().toISOString() };
		}

		const parsed = JSON.parse(body) as Partial<DocsPackageIndexManifest>;
		const packages = Array.isArray(parsed.packages)
			? parsed.packages.filter((item): item is string => typeof item === 'string')
			: [];

		return {
			packages,
			updatedAt: parsed.updatedAt ?? new Date().toISOString(),
		};
	} catch {
		return { packages: [], updatedAt: new Date().toISOString() };
	}
}

const limit = pLimit(uploadConcurrency);
const promises = [];
const uploadedPackages = new Set<string>();

console.log(`Docs manifest upload concurrency=${uploadConcurrency}, local=${isLikelyLocalUpload}`);

const patterns =
	packageFilter.length > 0
		? packageFilter.map((packageName) => `packages/${packageName}/docs/docs.api.json`)
		: ['packages/*/docs/docs.api.json'];

for (const pattern of patterns) {
	const globber = await create(pattern);
	console.log('Glob: ', await globber.glob());
	for await (const file of globber.globGenerator()) {
		const data = await readFile(file, 'utf8');
		try {
			promises.push(
				limit(async () => {
					console.log(`Uploading ${file} with ${version}...`);
					const json = JSON.parse(data);
					const packageName = String(json.name ?? json.n ?? '').replace(/^@discord(?:\.self|js)\//, '');
					const key = `${packageName}/${version}.json`;
					uploadedPackages.add(packageName);

					await S3.send(
						new PutObjectCommand({
							Bucket: process.env.DOCS_STORAGE_BUCKET,
							Key: key,
							Body: data,
						}),
					);

					const currentManifest = await loadManifest(packageName);
					const manifest: DocsManifest = {
						packageName,
						updatedAt: new Date().toISOString(),
						versions: sortVersions([...currentManifest.versions, version]),
					};

					await S3.send(
						new PutObjectCommand({
							Bucket: process.env.DOCS_STORAGE_BUCKET,
							Key: `manifests/${packageName}.json`,
							Body: JSON.stringify(manifest),
							ContentType: 'application/json',
						}),
					);
				}),
			);
		} catch (error) {
			console.log(error);
		}
	}
}

try {
	await Promise.all(promises);

	let resolvedIndexManifest: DocsPackageIndexManifest;
	if (packageFilter.length === 0) {
		resolvedIndexManifest = {
			packages: [...uploadedPackages].sort((left, right) =>
				left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
			),
			updatedAt: new Date().toISOString(),
		};
	} else {
		const currentManifest = await loadPackageIndexManifest();
		const existingPackages = new Set<string>(currentManifest.packages);

		for (const packageName of uploadedPackages) {
			existingPackages.add(packageName);
		}

		resolvedIndexManifest = {
			packages: [...existingPackages].sort((left, right) =>
				left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
			),
			updatedAt: new Date().toISOString(),
		};
	}

	await S3.send(
		new PutObjectCommand({
			Bucket: process.env.DOCS_STORAGE_BUCKET,
			Key: 'manifests/index.json',
			Body: JSON.stringify(resolvedIndexManifest),
			ContentType: 'application/json',
		}),
	);
} catch (error) {
	console.log(error);
}
