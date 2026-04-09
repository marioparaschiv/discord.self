import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test, vi } from 'vitest';
import { SQLiteAdapter } from '../src/storage.js';

const createdDirectories: string[] = [];

afterEach(() => {
	vi.restoreAllMocks();

	for (const directory of createdDirectories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

test('uses a sqlite file in process cwd by default', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'discord-identity-'));
	createdDirectories.push(cwd);

	vi.spyOn(process, 'cwd').mockReturnValue(cwd);

	const storage = new SQLiteAdapter();
	storage.set('user-token', {
		session: '{"cookies":[]}',
		version: 1,
		warmed: false,
	});
	storage.close();

	expect(existsSync(join(cwd, 'discord-identity.sqlite'))).toBe(true);
});
