import { ENV } from './env';

interface DocsManifest {
	versions: string[];
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
	const releases = deduped.filter((version) => version !== 'main').sort(compareVersionDescending);

	return includesMain ? ['main', ...releases] : releases;
}

export async function fetchVersions(packageName: string) {
	if (ENV.IS_LOCAL_DEV) {
		return [{ version: 'main' }];
	}

	if (!process.env.DOCS_STORAGE_BUCKET_URL) {
		return [];
	}

	try {
		const bucketUrl = process.env.DOCS_STORAGE_BUCKET_URL.endsWith('/')
			? process.env.DOCS_STORAGE_BUCKET_URL.slice(0, -1)
			: process.env.DOCS_STORAGE_BUCKET_URL;

		const response = await fetch(`${bucketUrl}/manifests/${packageName}.json`, {
			cache: 'no-store',
		});

		if (!response.ok) {
			return [];
		}

		const manifest = (await response.json()) as Partial<DocsManifest>;
		const versions = Array.isArray(manifest.versions)
			? manifest.versions.filter((version): version is string => typeof version === 'string')
			: [];

		return sortVersions(versions).map((version) => ({ version }));
	} catch {
		return [];
	}
}
