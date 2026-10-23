// Screens read the database synchronously and read again after any change (expo-sqlite's change
// listener, switched on in db/client.ts), so every tab is current after an edit anywhere.
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useMemo, useSyncExternalStore } from 'react';

/** The tables changed in one burst; '*' when it isn't known (the app coming back, tests). */
export type Changed = ReadonlySet<string>;

let version = 0;
let pending = false;
let listening = false;
let changed = new Set<string>();
const listeners = new Set<(tables: Changed) => void>();

/** One re-read per burst of changes (a save can touch several rows). */
export function notifyDataChanged(table = '*'): void {
  changed.add(table);
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    version += 1;
    const tables = changed;
    changed = new Set();
    listeners.forEach((l) => l(tables));
  }, 0);
}

/** Whether a burst of changes touched any of these tables. */
export const touched = (tables: Changed, among: ReadonlySet<string>) =>
  tables.has('*') || [...tables].some((t) => among.has(t));

/** Whether a burst of changes touched only these tables (and nothing unknown). */
export const onlyTouched = (tables: Changed, among: ReadonlySet<string>) =>
  !tables.has('*') && [...tables].every((t) => among.has(t));

/** Saved on every keystroke and read only by the form itself, so no screen needs to re-read. */
const QUIET_TABLES = new Set(['drafts']);

function subscribe(listener: (tables: Changed) => void) {
  if (!listening) {
    listening = true;
    addDatabaseChangeListener((change) => {
      if (!QUIET_TABLES.has(change.tableName)) notifyDataChanged(change.tableName);
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getVersion = () => version;

/** Calls `listener` after each burst of database changes, with the tables changed (used to keep reminders in step). */
export function onDataChanged(listener: (tables: Changed) => void): () => void {
  return subscribe(listener);
}

/**
 * Runs `read` now and again whenever the database changes or `deps` change.
 * `deps` are the plain values (strings, numbers) `read` uses, like useMemo's.
 */
export function useLive<T>(read: () => T, deps: readonly (string | number | boolean | null | undefined)[]): T {
  const v = useSyncExternalStore(subscribe, getVersion);
  const key = JSON.stringify(deps);
  // `read` is a new function each render; `key` stands for everything it depends on
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [v, key]);
}
