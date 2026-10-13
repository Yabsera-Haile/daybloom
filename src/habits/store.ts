// Routines, habits and their ticks (HB-04…07, TD-05…07). A routine is a group of habits with an
// optional time (D1): ticking a habit on Today's routine card and on the Habits tab is the same tick.
// Daily habits are ticked per day ('YYYY-MM-DD'); weekly ones per week, dated by the week's first day.
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, max } from 'drizzle-orm';

import { toDayKey, weekRange, type WeekStart } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';
import { habitChecks, habits, reminders, routines } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import { t } from '@/i18n';
import { setReminderOffsets } from '@/reminders/store';

import { habitIcon, routineIcon } from './icons';

export type Routine = typeof routines.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitCheck = typeof habitChecks.$inferSelect;
export type Frequency = 'daily' | 'weekly';

const cleanName = (name: string, what: string) => {
  const clean = name.trim();
  if (!clean) throw new Error(`A ${what} needs a name`);
  return clean;
};

function cleanTime(time: string | null | undefined): string | null {
  if (!time) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Not a time: ${time}`);
  return time;
}

// ---------------------------------------------------------------------------------------------
// Routines

/** Morning Ritual (7:00 AM) and Evening Wind-Down (9:30 PM) on first run, both reminding at their time. */
export function ensureDefaultRoutines(db: Db): void {
  if (db.select({ id: routines.id }).from(routines).limit(1).get()) return;
  db.transaction((tx) => {
    tx.insert(routines)
      .values([
        { id: 'morning', name: t.habits.morningRitual, icon: 'wb_twilight', time: '07:00', sortOrder: 0 },
        { id: 'evening', name: t.habits.eveningWindDown, icon: 'bedtime', time: '21:30', sortOrder: 1 },
      ])
      .run();
    setReminderOffsets(tx, 'routine', 'morning', [0]);
    setReminderOffsets(tx, 'routine', 'evening', [0]);
  });
}

/** Routines in the order of the day: timed ones by time, then untimed ones. */
export function listRoutines(db: Db): Routine[] {
  return db
    .select()
    .from(routines)
    .where(isNull(routines.archivedAt))
    .orderBy(asc(routines.sortOrder))
    .all()
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

export function getRoutine(db: Db, id: string): Routine | undefined {
  return db.select().from(routines).where(eq(routines.id, id)).get();
}

export function routineReminds(db: Db, id: string): boolean {
  return !!db
    .select({ id: reminders.id })
    .from(reminders)
    .where(and(eq(reminders.targetType, 'routine'), eq(reminders.targetId, id)))
    .get();
}

export function createRoutine(db: Db, input: { name: string; time: string | null; remind: boolean }): string {
  const id = newId();
  const last =
    db
      .select({ n: max(routines.sortOrder) })
      .from(routines)
      .get()?.n ?? -1;
  const time = cleanTime(input.time);
  db.transaction((tx) => {
    tx.insert(routines)
      .values({ id, name: cleanName(input.name, 'routine'), time, icon: routineIcon(time), sortOrder: last + 1 })
      .run();
    setReminderOffsets(tx, 'routine', id, input.remind && time ? [0] : []);
  });
  return id;
}

export function updateRoutine(db: Db, id: string, input: { name: string; time: string | null; remind: boolean }): void {
  const time = cleanTime(input.time);
  db.transaction((tx) => {
    tx.update(routines)
      .set({ name: cleanName(input.name, 'routine'), time, icon: routineIcon(time) })
      .where(eq(routines.id, id))
      .run();
    setReminderOffsets(tx, 'routine', id, input.remind && time ? [0] : []);
  });
}

/** Deletes a routine; its habits move to Anytime. Undo puts them back. */
export function deleteRoutine(db: Db, id: string): Undo {
  const moved = db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.routineId, id))
    .all()
    .map((h) => h.id);
  db.transaction((tx) => {
    if (moved.length) tx.update(habits).set({ routineId: null }).where(inArray(habits.id, moved)).run();
    tx.update(routines).set({ archivedAt: Date.now() }).where(eq(routines.id, id)).run();
  });
  return () => {
    db.transaction((tx) => {
      tx.update(routines).set({ archivedAt: null }).where(eq(routines.id, id)).run();
      if (moved.length) tx.update(habits).set({ routineId: id }).where(inArray(habits.id, moved)).run();
    });
  };
}

// ---------------------------------------------------------------------------------------------
// Habits

export interface HabitInput {
  name: string;
  note?: string | null;
  frequency: Frequency;
  /** null = Anytime */
  routineId: string | null;
  /** Own reminder 'HH:mm' for habits outside a routine (in a routine they share its reminder) */
  reminderTime?: string | null;
}

function clean(input: HabitInput) {
  return {
    name: cleanName(input.name, 'habit'),
    note: input.note?.trim() ? input.note.trim() : null,
    frequency: input.frequency,
    routineId: input.routineId,
    reminderTime: input.routineId ? null : cleanTime(input.reminderTime),
    icon: habitIcon(input.name),
  };
}

export function listHabits(db: Db): Habit[] {
  return db
    .select()
    .from(habits)
    .where(isNull(habits.archivedAt))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt))
    .all();
}

export function archivedHabits(db: Db): Habit[] {
  return db.select().from(habits).where(isNotNull(habits.archivedAt)).orderBy(asc(habits.name)).all();
}

export function getHabit(db: Db, id: string): Habit | undefined {
  return db.select().from(habits).where(eq(habits.id, id)).get();
}

export function createHabit(db: Db, input: HabitInput): string {
  const id = newId();
  const last =
    db
      .select({ n: max(habits.sortOrder) })
      .from(habits)
      .get()?.n ?? -1;
  db.insert(habits)
    .values({ id, ...clean(input), sortOrder: last + 1 })
    .run();
  return id;
}

export function updateHabit(db: Db, id: string, input: HabitInput): void {
  db.update(habits).set(clean(input)).where(eq(habits.id, id)).run();
}

/** Hides a habit and keeps its history (HB-07). */
export function archiveHabit(db: Db, id: string): Undo {
  const at = Date.now();
  db.update(habits).set({ archivedAt: at }).where(eq(habits.id, id)).run();
  return () => restoreHabit(db, id);
}

export function restoreHabit(db: Db, id: string): void {
  db.update(habits).set({ archivedAt: null }).where(eq(habits.id, id)).run();
}

/** Removes a habit and every tick. The screen asks first (UX-04). */
export function deleteHabit(db: Db, id: string): void {
  db.transaction((tx) => {
    tx.delete(habitChecks).where(eq(habitChecks.habitId, id)).run();
    tx.delete(reminders)
      .where(and(eq(reminders.targetType, 'habit'), eq(reminders.targetId, id)))
      .run();
    tx.delete(habits).where(eq(habits.id, id)).run();
  });
}

/** Moves a habit up or down among the habits it is shown with (same routine and frequency). */
export function moveHabit(db: Db, id: string, by: -1 | 1): void {
  const all = listHabits(db);
  const habit = all.find((h) => h.id === id);
  if (!habit) return;
  const group = all.filter(
    (h) => h.frequency === habit.frequency && (h.frequency === 'weekly' || h.routineId === habit.routineId),
  );
  const i = group.findIndex((h) => h.id === id);
  const other = group[i + by];
  if (!other) return;
  // renumber everything so the swap is unambiguous
  const order = all.map((h) => h.id);
  const a = order.indexOf(id);
  const b = order.indexOf(other.id);
  [order[a], order[b]] = [order[b], order[a]];
  db.transaction((tx) => {
    order.forEach((hid, n) => tx.update(habits).set({ sortOrder: n }).where(eq(habits.id, hid)).run());
  });
}

// ---------------------------------------------------------------------------------------------
// Ticks

/** Ticks with a period between two days (inclusive). */
export function checksBetween(db: Db, firstDay: string, lastDay: string): HabitCheck[] {
  return db
    .select()
    .from(habitChecks)
    .where(and(gte(habitChecks.period, firstDay), lte(habitChecks.period, lastDay)))
    .all();
}

export function checksFor(db: Db, habitId: string): HabitCheck[] {
  return db.select().from(habitChecks).where(eq(habitChecks.habitId, habitId)).orderBy(asc(habitChecks.period)).all();
}

const dateOf = (day: string) => {
  const p = parseDayKey(day);
  return new Date(p.year, p.month - 1, p.day, 12);
};

/** The week (first and last day) a day belongs to. */
export function weekOf(day: string, weekStart: WeekStart): { start: string; end: string } {
  const r = weekRange(dateOf(day), weekStart);
  return { start: toDayKey(r.start), end: toDayKey(r.end) };
}

/**
 * Ticks or unticks a habit for the day (daily) or for the week containing the day (weekly).
 * A weekly tick counts anywhere in its week, so changing the week-start setting keeps it.
 */
export function setHabitDone(
  db: Db,
  habit: Pick<Habit, 'id' | 'frequency'>,
  day: string,
  done: boolean,
  weekStart: WeekStart,
): void {
  if (habit.frequency === 'daily') {
    if (done) db.insert(habitChecks).values({ habitId: habit.id, period: day }).onConflictDoNothing().run();
    else
      db.delete(habitChecks)
        .where(and(eq(habitChecks.habitId, habit.id), eq(habitChecks.period, day)))
        .run();
    return;
  }
  const week = weekOf(day, weekStart);
  db.transaction((tx) => {
    tx.delete(habitChecks)
      .where(
        and(eq(habitChecks.habitId, habit.id), gte(habitChecks.period, week.start), lte(habitChecks.period, week.end)),
      )
      .run();
    if (done) tx.insert(habitChecks).values({ habitId: habit.id, period: week.start }).run();
  });
}
