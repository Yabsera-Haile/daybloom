// Screens read the database synchronously and read again after any change (expo-sqlite's change
// listener, switched on in db/client.ts), so every tab is current after an edit anywhere.
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useMemo, useSyncExternalStore } from 'react';

let version = 0;
let pending = false;
let listening = false;
const listeners = new Set<() => void>();

/** One re-read per burst of changes (a save can touch several rows). */
export function notifyDataChanged(): void {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    version += 1;
    listeners.forEach((l) => l());
  }, 0);
}

/** Saved on every keystroke and read only by the form itself, so no screen needs to re-read. */
const QUIET_TABLES = new Set(['drafts']);

function subscribe(listener: () => void) {
  if (!listening) {
    listening = true;
    addDatabaseChangeListener((change) => {
      if (!QUIET_TABLES.has(change.tableName)) notifyDataChanged();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getVersion = () => version;

/** Calls `listener` after each burst of database changes (used to keep reminders in step). */
export function onDataChanged(listener: () => void): () => void {
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
