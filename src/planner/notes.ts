// Hour notes on Today's timeline (TD-15) and the one-sentence weekly intention (WK-05).
import { and, asc, desc, eq, gte, isNull, lte, max } from 'drizzle-orm';

import { addDaysToKey } from '@/calendar/timezone';
import { hourNotes, weekIntentions } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';

export type HourNote = typeof hourNotes.$inferSelect;

function cleanText(text: string): string {
  const clean = text.trim();
  if (!clean) throw new Error('A note needs some text');
  return clean;
}

export function createHourNote(db: Db, input: { date: string; hour: number; text: string }): string {
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) throw new Error(`Not an hour: ${input.hour}`);
  const id = newId();
  const last = db
    .select({ n: max(hourNotes.sortOrder) })
    .from(hourNotes)
    .where(and(eq(hourNotes.date, input.date), eq(hourNotes.hour, input.hour)))
    .get()?.n;
  db.insert(hourNotes)
    .values({ id, date: input.date, hour: input.hour, text: cleanText(input.text), sortOrder: (last ?? -1) + 1 })
    .run();
  return id;
}

export function updateHourNote(db: Db, id: string, patch: { text?: string; done?: boolean }): void {
  db.update(hourNotes)
    .set({
      ...(patch.text !== undefined && { text: cleanText(patch.text) }),
      ...(patch.done !== undefined && { done: patch.done }),
      updatedAt: Date.now(),
    })
    .where(eq(hourNotes.id, id))
    .run();
}

export function deleteHourNote(db: Db, id: string): Undo {
  const at = Date.now();
  db.update(hourNotes)
    .set({ deletedAt: at })
    .where(and(eq(hourNotes.id, id), isNull(hourNotes.deletedAt)))
    .run();
  return () => {
    db.update(hourNotes)
      .set({ deletedAt: null })
      .where(and(eq(hourNotes.id, id), eq(hourNotes.deletedAt, at)))
      .run();
  };
}

export function hourNotesOn(db: Db, day: string): HourNote[] {
  return db
    .select()
    .from(hourNotes)
    .where(and(eq(hourNotes.date, day), isNull(hourNotes.deletedAt)))
    .orderBy(asc(hourNotes.hour), asc(hourNotes.sortOrder))
    .all();
}

// Intentions are looked up anywhere in the week, so they stay visible if the week-start setting changes.

export function weekIntention(db: Db, weekStart: string): string | null {
  return (
    db
      .select({ text: weekIntentions.text })
      .from(weekIntentions)
      .where(and(gte(weekIntentions.weekStart, weekStart), lte(weekIntentions.weekStart, addDaysToKey(weekStart, 6))))
      .orderBy(desc(weekIntentions.updatedAt))
      .get()?.text ?? null
  );
}

/** Saves the week's intention; blank text clears it. */
export function setWeekIntention(db: Db, weekStart: string, text: string): void {
  db.transaction((tx) => {
    tx.delete(weekIntentions)
      .where(and(gte(weekIntentions.weekStart, weekStart), lte(weekIntentions.weekStart, addDaysToKey(weekStart, 6))))
      .run();
    if (text.trim()) tx.insert(weekIntentions).values({ weekStart, text: text.trim(), updatedAt: Date.now() }).run();
  });
}
