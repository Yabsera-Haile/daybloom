// To-dos: Daily Intentions (scope 'day') and Weekly Priorities (scope 'week', dated by the week's
// first day). A to-do on a date is also that date's deadline (FR-07, FR-14).
import { and, asc, eq, gte, isNull, lt, lte, min } from 'drizzle-orm';

import { addDaysToKey } from '@/calendar/timezone';
import { tasks } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import { setReminderOffsets } from '@/reminders/store';

export type TaskRow = typeof tasks.$inferSelect;
export type TaskScope = 'day' | 'week';

export interface TaskInput {
  title: string;
  /** 'YYYY-MM-DD': the day, or the first day of the week for a weekly priority */
  date: string;
  scope?: TaskScope;
  urgent?: boolean;
  /** 'HH:mm' on the phone's clock */
  dueTime?: string | null;
  listLabel?: string | null;
  notes?: string | null;
  categoryId?: string | null;
}

const blankToNull = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);

function cleanTitle(title: string): string {
  const clean = title.trim();
  if (!clean) throw new Error('A to-do needs a title');
  return clean;
}

function cleanTime(time: string | null | undefined): string | null {
  if (!time) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Not a time: ${time}`);
  return time;
}

/** Sort position above everything already on that date, so new and moved to-dos show at the top (TD-10). */
function topOf(db: Db, date: string, scope: string): number {
  const first = db
    .select({ n: min(tasks.sortOrder) })
    .from(tasks)
    .where(and(eq(tasks.date, date), eq(tasks.scope, scope), isNull(tasks.deletedAt)))
    .get()?.n;
  return first == null ? 0 : first - 1;
}

export function getTask(db: Db, id: string): TaskRow | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(db: Db, input: TaskInput, reminderMinutes: number[] = []): string {
  const id = newId();
  const scope = input.scope ?? 'day';
  db.transaction((tx) => {
    tx.insert(tasks)
      .values({
        id,
        title: cleanTitle(input.title),
        date: input.date,
        scope,
        urgent: input.urgent ?? false,
        dueTime: cleanTime(input.dueTime),
        listLabel: blankToNull(input.listLabel),
        notes: blankToNull(input.notes),
        categoryId: input.categoryId ?? null,
        sortOrder: topOf(tx, input.date, scope),
      })
      .run();
    setReminderOffsets(tx, 'task', id, reminderMinutes);
  });
  return id;
}

export function updateTask(db: Db, id: string, patch: Partial<Omit<TaskInput, 'date' | 'scope'>>, reminderMinutes?: number[]): void {
  const values: Partial<TaskRow> = { updatedAt: Date.now() };
  if (patch.title !== undefined) values.title = cleanTitle(patch.title);
  if (patch.urgent !== undefined) values.urgent = patch.urgent;
  if (patch.dueTime !== undefined) values.dueTime = cleanTime(patch.dueTime);
  if (patch.listLabel !== undefined) values.listLabel = blankToNull(patch.listLabel);
  if (patch.notes !== undefined) values.notes = blankToNull(patch.notes);
  if (patch.categoryId !== undefined) values.categoryId = patch.categoryId;
  db.transaction((tx) => {
    tx.update(tasks).set(values).where(eq(tasks.id, id)).run();
    if (reminderMinutes) setReminderOffsets(tx, 'task', id, reminderMinutes);
  });
}

/** Ticks or unticks a to-do (TD-11); ticking again is the undo. */
export function setTaskDone(db: Db, id: string, done: boolean): void {
  db.update(tasks)
    .set({ done, doneAt: done ? Date.now() : null, updatedAt: Date.now() })
    .where(eq(tasks.id, id))
    .run();
}

/** "Move to tomorrow" / "Move to another day" (TD-12). */
export function moveTask(db: Db, id: string, date: string): Undo {
  const before = getTask(db, id);
  if (!before) throw new Error('To-do not found');
  db.update(tasks)
    .set({ date, sortOrder: topOf(db, date, before.scope), updatedAt: Date.now() })
    .where(eq(tasks.id, id))
    .run();
  return () => {
    db.update(tasks).set({ date: before.date, sortOrder: before.sortOrder }).where(eq(tasks.id, id)).run();
  };
}

/** How far back the "things left from yesterday" prompt looks (FR-15). */
export const LEFT_BEHIND_DAYS = 14;

/** Day to-dos not done on their day, from the last two weeks, oldest first (FR-15). */
export function leftBehind(db: Db, today: string): TaskRow[] {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.scope, 'day'),
        eq(tasks.done, false),
        isNull(tasks.deletedAt),
        gte(tasks.date, addDaysToKey(today, -LEFT_BEHIND_DAYS)),
        lt(tasks.date, today),
      ),
    )
    .orderBy(asc(tasks.date), asc(tasks.sortOrder), asc(tasks.createdAt))
    .all();
}

/** "Move to today" for several to-dos at once, keeping their order; Undo puts each back. */
export function moveTasks(db: Db, ids: string[], date: string): Undo {
  const undos = [...ids].reverse().map((id) => moveTask(db, id, date));
  return () => undos.forEach((undo) => undo());
}

export function deleteTask(db: Db, id: string): Undo {
  const at = Date.now();
  db.update(tasks)
    .set({ deletedAt: at })
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .run();
  return () => {
    db.update(tasks)
      .set({ deletedAt: null })
      .where(and(eq(tasks.id, id), eq(tasks.deletedAt, at)))
      .run();
  };
}

/** To-dos dated between two days (inclusive), in list order. Weekly priorities: pass the week's first and last day. */
export function tasksBetween(db: Db, firstDay: string, lastDay: string, scope: TaskScope = 'day'): TaskRow[] {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.scope, scope), gte(tasks.date, firstDay), lte(tasks.date, lastDay), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.date), asc(tasks.sortOrder), asc(tasks.createdAt))
    .all();
}

export function tasksOn(db: Db, day: string): TaskRow[] {
  return tasksBetween(db, day, day);
}
