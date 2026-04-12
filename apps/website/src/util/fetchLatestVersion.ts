import { DEFAULT_ENTRY_POINT, PACKAGES_WITH_ENTRY_POINTS } from '@/util/constants';
import { ENV } from '@/util/env';
import { fetchVersions } from './fetchVersions';

export async function fetchLatestVersion(packageName: string): Promise<string> {
	const hasEntryPoints = PACKAGES_WITH_ENTRY_POINTS.includes(packageName);

	if (ENV.IS_LOCAL_DEV) {
		if (hasEntryPoints) {
			return ['main', ...DEFAULT_ENTRY_POINT].join('/');
		}

		return 'main';
	}

	try {
		const versions = await fetchVersions(packageName);
		const latestRelease = versions.find((version) => version.version !== 'main')?.version ?? 'main';

		if (hasEntryPoints) {
			return [latestRelease, ...DEFAULT_ENTRY_POINT].join('/');
		}

		return latestRelease;
	} catch {
		return hasEntryPoints ? ['main', ...DEFAULT_ENTRY_POINT].join('/') : 'main';
	}
}
