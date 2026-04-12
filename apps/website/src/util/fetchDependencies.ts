import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ENV } from './env';

const INTERNAL_PACKAGE_SCOPE_REGEX = /^@discord(?:\.self|js)\//;

export async function fetchDependencies({
	packageName,
	version,
}: {
	readonly packageName: string;
	readonly version: string;
}) {
	if (ENV.IS_LOCAL_DEV) {
		try {
			const fileContent = await readFile(
				join(process.cwd(), `../../packages/${packageName}/docs/${packageName}/split/${version}.dependencies.api.json`),
				'utf8',
			);

			const parsedDependencies = JSON.parse(fileContent);

			return Object.entries<string>(parsedDependencies)
				.filter(([key]) => INTERNAL_PACKAGE_SCOPE_REGEX.test(key) && !key.includes('api-extractor'))
				.map(
					([key, value]) =>
						`${key.replace(INTERNAL_PACKAGE_SCOPE_REGEX, '').replaceAll('.', '-')}-${sanitizeVersion(value)}`,
				);
		} catch {
			return [];
		}
	}

	try {
		const fileContent = await fetch(
			`${process.env.DOCS_STORAGE_BUCKET_URL}/${packageName}/${version}.dependencies.api.json`,
			{ cache: 'no-store' },
		);
		const parsedDependencies = await fileContent.json();

		return Object.entries<string>(parsedDependencies)
			.filter(([key]) => INTERNAL_PACKAGE_SCOPE_REGEX.test(key) && !key.includes('api-extractor'))
			.map(
				([key, value]) =>
					`${key.replace(INTERNAL_PACKAGE_SCOPE_REGEX, '').replaceAll('.', '-')}-${sanitizeVersion(value)}`,
			);
	} catch {
		return [];
	}
}

function sanitizeVersion(version: string) {
	return version.replaceAll('.', '-').replace(/^[\^~]/, '');
}
