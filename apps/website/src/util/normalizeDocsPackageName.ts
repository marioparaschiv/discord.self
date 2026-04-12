export function normalizeDocsPackageName(packageName: string | null | undefined): string {
	if (!packageName) {
		return '';
	}

	if (/^@discord(?:\.self|js)\//.test(packageName)) {
		return packageName.replace(/^@discord(?:\.self|js)\//, '');
	}

	return packageName;
}
