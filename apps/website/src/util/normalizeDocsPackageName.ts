export function normalizeDocsPackageName(packageName: string | null | undefined): string {
	if (!packageName) {
		return '';
	}

	if (packageName.startsWith('@discord.self/')) {
		return packageName.slice('@discord.self/'.length);
	}

	if (packageName.startsWith('@discordjs/')) {
		return packageName.slice('@discordjs/'.length);
	}

	return packageName;
}
