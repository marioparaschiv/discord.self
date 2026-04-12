import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { info, setFailed } from '@actions/core';
import { create } from '@actions/glob';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

if (
	!process.env.READMES_STORAGE_ACCESS_KEY_ID ||
	!process.env.READMES_STORAGE_SECRET_ACCESS_KEY ||
	!process.env.READMES_STORAGE_BUCKET ||
	!process.env.READMES_STORAGE_ENDPOINT
) {
	setFailed('Missing environment variables.');
	process.exit(1);
}

const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

const S3READMEFiles = new S3Client({
	region: 'auto',
	endpoint: process.env.READMES_STORAGE_ENDPOINT,
	forcePathStyle,
	credentials: {
		accessKeyId: process.env.READMES_STORAGE_ACCESS_KEY_ID,
		secretAccessKey: process.env.READMES_STORAGE_SECRET_ACCESS_KEY,
	},
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED',
});

const promises = [];
const packageFilter = (() => {
	const fromEnv = (process.env.BOOTSTRAP_PACKAGES ?? '').trim();
	if (!fromEnv || fromEnv === '*') {
		return new Set<string>();
	}

	return new Set(
		fromEnv
			.split(',')
			.map((packageName) => packageName.replace(/^@discord(?:\.self|js)\//, '').trim())
			.filter(Boolean),
	);
})();

// Find all packages with an api-extractor.json file.
const globber = await create('packages/*/api-extractor.json');

for await (const apiExtractorFile of globber.globGenerator()) {
	const readmePath = apiExtractorFile.replace('/api-extractor.json', '/README.md');
	const packageName = apiExtractorFile.split('/').at(-2)!;
	if (packageFilter.size > 0 && !packageFilter.has(packageName)) {
		continue;
	}

	const readmeKey = `${packageName}/home-README.md`;
	info(`Uploading ${readmePath}...`);

	promises.push(
		// eslint-disable-next-line promise/prefer-await-to-then
		readFile(readmePath, 'utf8').then(async (readmeData) =>
			S3READMEFiles.send(
				new PutObjectCommand({
					Bucket: process.env.READMES_STORAGE_BUCKET,
					Key: readmeKey,
					Body: readmeData,
				}),
			),
		),
	);
}

try {
	await Promise.all(promises);
	info('All README.md files uploaded successfully!');
} catch (error) {
	setFailed(`Failed to upload README files: ${error}`);
	process.exit(1);
}
