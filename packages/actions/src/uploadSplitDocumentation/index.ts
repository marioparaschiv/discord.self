import { readFile } from 'node:fs/promises';
import { basename, dirname, relative, sep } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { setFailed, getInput } from '@actions/core';
import { create } from '@actions/glob';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import PQueue from 'p-queue';

if (
	!process.env.CF_R2_DOCS_URL ||
	!process.env.CF_R2_DOCS_ACCESS_KEY_ID ||
	!process.env.CF_R2_DOCS_SECRET_ACCESS_KEY ||
	!process.env.CF_R2_DOCS_BUCKET
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
const docsEndpoint = process.env.CF_R2_DOCS_URL ?? '';

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
const queueConcurrency = parsePositiveInteger(process.env.DOCS_UPLOAD_CONCURRENCY) ?? (isLikelyLocalUpload ? 64 : 10);
const queueInterval = parsePositiveInteger(process.env.DOCS_UPLOAD_INTERVAL_MS) ?? (isLikelyLocalUpload ? 0 : 60_000);
const queueIntervalCap =
	parsePositiveInteger(process.env.DOCS_UPLOAD_INTERVAL_CAP) ?? (isLikelyLocalUpload ? 0 : 1_000);

const queueOptions: ConstructorParameters<typeof PQueue>[0] =
	queueInterval > 0 && queueIntervalCap > 0
		? {
				concurrency: queueConcurrency,
				interval: queueInterval,
				intervalCap: queueIntervalCap,
			}
		: {
				concurrency: queueConcurrency,
			};

const queue = new PQueue(queueOptions);
const promises = [];
const failedUploads: string[] = [];

console.log(
	`Upload queue config: concurrency=${queueConcurrency}, interval=${queueInterval || 0}, intervalCap=${queueIntervalCap || 0}, local=${isLikelyLocalUpload}`,
);

const S3 = new S3Client({
	region: 'auto',
	endpoint: process.env.CF_R2_DOCS_URL!,
	forcePathStyle,
	credentials: {
		accessKeyId: process.env.CF_R2_DOCS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.CF_R2_DOCS_SECRET_ACCESS_KEY!,
	},
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED',
});

const patterns =
	packageFilter.length > 0
		? packageFilter.map((packageName) => `packages/${packageName}/docs/${packageName}/split/*.api.json`)
		: ['packages/*/docs/*/split/*.api.json'];

for (const pattern of patterns) {
	const globber = await create(pattern);
	console.log('Glob: ', await globber.glob());
	for await (const file of globber.globGenerator()) {
		const data = await readFile(file, 'utf8');
		const pkgName = dirname(relative(process.cwd(), file)).split(sep)[1];
		try {
			promises.push(
				queue.add(async () => {
					console.log(`Uploading ${file} with ${version} from ${pkgName}...`);
					const name = basename(file).replace('main.', '');
					async function upload(retries = 0) {
						try {
							await S3.send(
								new PutObjectCommand({
									Bucket: process.env.CF_R2_DOCS_BUCKET,
									Key: `${pkgName}/${version}.${name}`,
									Body: data,
								}),
							);
						} catch (error) {
							if (retries > 3) {
								console.error(`Could not upload ${file} after 3 retries`, error);
								failedUploads.push(name);
								return;
							}

							if (typeof error === 'object' && error && 'retryAfter' in error && typeof error.retryAfter === 'number') {
								await sleep(error.retryAfter * 1_000);
								return upload(retries + 1);
							} else {
								console.error(`Could not upload ${file}`, error);
								failedUploads.push(name);
							}
						}
					}

					await upload();
				}),
			);
		} catch (error) {
			console.log(error);
		}
	}
}

try {
	await Promise.all(promises);
	if (failedUploads.length) {
		setFailed(`Failed to upload ${failedUploads.length} files: ${failedUploads.join(', ')}`);
	}
} catch (error) {
	console.log(error);
}
