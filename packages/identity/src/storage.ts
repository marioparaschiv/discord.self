import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DiscordIdentityStorage, SerializedDiscordIdentity } from './types.js';

const DEFAULT_TABLE_NAME = 'discord_identity_sessions';
const DEFAULT_SQLITE_FILENAME = 'discord-identity.sqlite';

function getDefaultSQLitePath() {
	return join(process.cwd(), DEFAULT_SQLITE_FILENAME);
}

export interface SQLiteAdapterOptions {
	tableName?: string;
}

export class SQLiteAdapter implements DiscordIdentityStorage {
	#database: DatabaseSync;
	#deleteStatement;
	#getStatement;
	#setStatement;
	#tableName: string;

	public constructor(filename = getDefaultSQLitePath(), options: SQLiteAdapterOptions = {}) {
		mkdirSync(dirname(filename), { recursive: true });

		this.#database = new DatabaseSync(filename);
		this.#tableName = options.tableName ?? DEFAULT_TABLE_NAME;
		this.#database.exec(`
			CREATE TABLE IF NOT EXISTS ${this.#tableName} (
				token TEXT PRIMARY KEY,
				identity_json TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`);

		this.#getStatement = this.#database.prepare(`SELECT identity_json FROM ${this.#tableName} WHERE token = ?`);
		this.#setStatement = this.#database.prepare(
			`INSERT INTO ${this.#tableName} (token, identity_json, updated_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(token) DO UPDATE SET
			 	identity_json = excluded.identity_json,
			 	updated_at = excluded.updated_at`,
		);
		this.#deleteStatement = this.#database.prepare(`DELETE FROM ${this.#tableName} WHERE token = ?`);
	}

	public close() {
		this.#database.close();
	}

	public delete(token: string) {
		this.#deleteStatement.run(token);
	}

	public get(token: string): SerializedDiscordIdentity | null {
		const row = this.#getStatement.get(token) as { identity_json?: string } | undefined;
		if (!row?.identity_json) {
			return null;
		}

		return JSON.parse(row.identity_json) as SerializedDiscordIdentity;
	}

	public set(token: string, identity: SerializedDiscordIdentity) {
		this.#setStatement.run(token, JSON.stringify(identity), Date.now());
	}
}
