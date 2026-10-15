// Typed text is never lost (UX-05): a new event, to-do, note, expense, habit or bill keeps its text
// as it's typed, so closing the sheet, going back or the app being closed doesn't lose it. Saving
// the form, or Cancel, clears it; "Start fresh" throws it away.
import { eq } from 'drizzle-orm';
import { useState } from 'react';

import { db } from '@/db/client';
import { drafts } from '@/db/schema';
import type { Db } from '@/db/types';

export type DraftFields = Record<string, string>;

export function readDraft(database: Db, key: string): DraftFields | null {
  const row = database.select().from(drafts).where(eq(drafts.key, key)).get();
  if (!row) return null;
  try {
    const value: unknown = JSON.parse(row.value);
    return value && typeof value === 'object' ? (value as DraftFields) : null;
  } catch {
    return null;
  }
}

/** Saves the fields, or forgets them when every field is empty. */
export function saveDraft(database: Db, key: string, fields: DraftFields | null): void {
  const empty = !fields || Object.values(fields).every((v) => !v.trim());
  if (empty) {
    database.delete(drafts).where(eq(drafts.key, key)).run();
    return;
  }
  const value = JSON.stringify(fields);
  database
    .insert(drafts)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: drafts.key, set: { value, updatedAt: Date.now() } })
    .run();
}

export type Draft<T extends DraftFields> = {
  values: T;
  set: (name: keyof T, value: string) => void;
  /** The form opened with text kept from before */
  restored: boolean;
  /** Throws the kept text away and empties the fields */
  startFresh: () => void;
  /** After Save or Cancel */
  clear: () => void;
};

/**
 * Text fields that survive closing. `key` null = not kept (editing something that already exists:
 * its own values are the starting point).
 */
export function useDraft<T extends DraftFields>(key: string | null, initial: T): Draft<T> {
  const [start] = useState(() => {
    const kept = key ? readDraft(db, key) : null;
    return { values: kept ? ({ ...initial, ...kept } as T) : initial, restored: !!kept };
  });
  const [values, setValues] = useState<T>(start.values);
  const [restored, setRestored] = useState(start.restored);
  return {
    values,
    restored,
    set: (name, value) =>
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        if (key) saveDraft(db, key, next);
        return next;
      }),
    startFresh: () => {
      setValues(initial);
      setRestored(false);
      if (key) saveDraft(db, key, null);
    },
    clear: () => {
      if (key) saveDraft(db, key, null);
    },
  };
}
