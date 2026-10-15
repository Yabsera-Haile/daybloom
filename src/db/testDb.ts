// For tests only: a fresh in-memory SQLite (sql.js) with the same migrations the phone runs.
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import migrations from '../../drizzle/migrations';
import * as schema from './schema';
import type { Db } from './types';

let SQL: initSqlJs.SqlJsStatic | undefined;

export async function createTestDb(): Promise<Db> {
  SQL ??= await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.run('PRAGMA foreign_keys = ON;');
  for (const entry of migrations.journal.entries) {
    const text: string =
      migrations.migrations[`m${String(entry.idx).padStart(4, '0')}` as keyof typeof migrations.migrations];
    for (const statement of text.split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.run(statement);
    }
  }
  return drizzle(sqlite, { schema });
}

declare global {
  var __daybloomTestDb: Db | undefined;
}

/** A fresh test database before each test, also served as `@/db/client` (see jest.setup.js). */
export function withTestDb(): () => Db {
  beforeEach(async () => {
    globalThis.__daybloomTestDb = await createTestDb();
  });
  afterEach(() => {
    globalThis.__daybloomTestDb = undefined;
  });
  return () => globalThis.__daybloomTestDb!;
}
