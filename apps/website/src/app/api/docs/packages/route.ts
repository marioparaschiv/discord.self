import { access, constants as fsConstants } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { PACKAGES } from '@/util/constants';
import { ENV } from '@/util/env';

const accessAsync = promisify(access);

interface PackageIndexManifest {
	packages: string[];
}

function normalizeBucketUrl(url: string) {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function getPackagesFromIndexManifest() {
	const bucketUrl = process.env.DOCS_STORAGE_BUCKET_URL;
	if (!bucketUrl) {
		return null;
	}

	try {
		const response = await fetch(`${normalizeBucketUrl(bucketUrl)}/manifests/index.json`, {
			cache: 'no-store',
		});

		if (!response.ok) {
			return null;
		}

		const json = (await response.json()) as Partial<PackageIndexManifest>;
		if (!Array.isArray(json.packages)) {
			return null;
		}

		const packages = json.packages.filter((item): item is string => typeof item === 'string');
		return packages.map((name) => ({ name }));
	} catch {
		return null;
	}
}

async function hasManifest(packageName: string) {
	const bucketUrl = process.env.DOCS_STORAGE_BUCKET_URL;
	if (bucketUrl) {
		try {
			const response = await fetch(`${normalizeBucketUrl(bucketUrl)}/manifests/${packageName}.json`, {
				cache: 'no-store',
				method: 'HEAD',
			});

			if (response.ok) {
				return true;
			}
		} catch {
			// Ignore remote manifest check failures and try local fallback below.
		}
	}

	if (ENV.IS_LOCAL_DEV) {
		try {
			await accessAsync(join(process.cwd(), `../../packages/${packageName}/docs/docs.api.json`), fsConstants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	return false;
}

export async function GET() {
	const indexedPackages = await getPackagesFromIndexManifest();
	if (indexedPackages?.length) {
		return NextResponse.json(indexedPackages);
	}

	const availability = await Promise.all(
		PACKAGES.map(async ({ name }) => ({
			available: await hasManifest(name),
			name,
		})),
	);

	const availablePackages = availability.filter((item) => item.available).map((item) => ({ name: item.name }));

	return NextResponse.json(availablePackages);
}
