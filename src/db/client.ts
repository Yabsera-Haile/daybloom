import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// One database file on the phone. Change listener on so useLiveQuery screens update by themselves.
const sqlite = openDatabaseSync('daybloom.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export { schema };
