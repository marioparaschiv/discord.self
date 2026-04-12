import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { getInput, setFailed } from '@actions/core';
import { create } from '@actions/glob';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';

if (
	!process.env.CF_R2_DOCS_URL ||
	!process.env.CF_R2_DOCS_ACCESS_KEY_ID ||
	!process.env.CF_R2_DOCS_SECRET_ACCESS_KEY ||
	!process.env.CF_R2_DOCS_BUCKET
) {
	setFailed('Missing environment variables');
}

const pkg = getInput('package') || '*';
const version = getInput('version') || 'main';
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

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

interface DocsManifest {
	packageName: string;
	updatedAt: string;
	versions: string[];
}

function parseVersion(version: string) {
	const [base] = version.split(/[-+]/);
	const parts = base?.split('.');

	if (!parts || parts.length !== 3) {
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
				Bucket: process.env.CF_R2_DOCS_BUCKET,
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

const limit = pLimit(10);
const promises = [];

const globber = await create(`packages/${pkg}/docs/docs.api.json`);
console.log('Glob: ', await globber.glob());
for await (const file of globber.globGenerator()) {
	const data = await readFile(file, 'utf8');
	try {
		promises.push(
			limit(async () => {
				console.log(`Uploading ${file} with ${version}...`);
				const json = JSON.parse(data);
				const packageName = String(json.name ?? json.n ?? '')
					.replace('@discord.self/', '')
					.replace('@discordjs/', '');
				const key = `${packageName}/${version}.json`;

				await S3.send(
					new PutObjectCommand({
						Bucket: process.env.CF_R2_DOCS_BUCKET,
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
						Bucket: process.env.CF_R2_DOCS_BUCKET,
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

try {
	await Promise.all(promises);
} catch (error) {
	console.log(error);
}
