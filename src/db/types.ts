import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'expo-crypto';

import type * as schema from './schema';

/**
 * The database as the data layer sees it: the phone's expo-sqlite in the app, an in-memory
 * sql.js in tests (see testDb.ts). Both are synchronous, so queries use .all() / .get() / .run().
 */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Undoes a change (FR-02: deletes can be undone for at least 5 seconds). */
export type Undo = () => void;

export const newId = (): string => randomUUID();
