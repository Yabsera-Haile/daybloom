// The pet's mood (MS-04, MS-11), worked out from the planner each time and never stored (FR-13):
// sulking while a habit slips or to-dos sit overdue, until that's dealt with; otherwise happy once
// you've done something today, content before. (Finishing anything still gets a happy hop.)
import { and, eq, gte, isNull } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey, localDayStart } from '@/calendar/timezone';
import { habitChecks, tasks } from '@/db/schema';
import type { Db } from '@/db/types';
import { checksBetween, listHabits, type Habit } from '@/habits/store';
import { leftBehind } from '@/planner/tasks';

export type PetKind = 'cat' | 'dog' | 'bird' | 'dragon' | 'fairy';
/** Gentle gets sad when things slip; cheeky gets cross, Duolingo-style (D21). */
export type Personality = 'gentle' | 'cheeky';
export type Mood = 'happy' | 'content' | 'sulky';
/** What the pet's face shows. */
export type Expression = 'happy' | 'content' | 'sad' | 'cross';

export interface PetSignals {
  /** Habit ticks made and to-dos finished today (catching up on yesterday counts too). */
  doneToday: number;
  /** Daily habits with no tick today, yesterday or the day before, by name. */
  slipping: string[];
  /** Day to-dos left unfinished on earlier days (FR-15). */
  overdue: number;
  /** Daily habits ticked for today, of all of them (all done: it celebrates, MS-04). */
  habitsToday: { done: number; total: number };
}

export function moodOf(s: Pick<PetSignals, 'doneToday' | 'slipping' | 'overdue'>): Mood {
  if (s.slipping.length > 0 || s.overdue > 0) return 'sulky';
  return s.doneToday > 0 ? 'happy' : 'content';
}

/** Sulking shows as sad for a gentle pet and cross for a cheeky one. */
export function expressionOf(mood: Mood, personality: Personality): Expression {
  if (mood !== 'sulky') return mood;
  return personality === 'cheeky' ? 'cross' : 'sad';
}

/** Quiet hours (MS-04): the pet sleeps from 10 PM to 7 AM, whatever its mood. */
export function isBedtime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 22 || hour < 7;
}

/**
 * Daily habits that are slipping: two whole days without a tick (not counting days before they
 * were added), until they're ticked again.
 */
export function slippingHabits(db: Db, today: string): Habit[] {
  const dayBefore = addDaysToKey(today, -2);
  const checks = checksBetween(db, dayBefore, today);
  return listHabits(db).filter(
    (h) =>
      h.frequency === 'daily' &&
      toDayKey(new Date(h.createdAt)) <= dayBefore &&
      !checks.some((c) => c.habitId === h.id),
  );
}

/** What the mood is worked out from, read from the planner for `today`. */
export function petSignals(db: Db, today: string): PetSignals {
  const dayBefore = addDaysToKey(today, -2);
  const checks = checksBetween(db, dayBefore, today);
  const start = localDayStart(today);
  const ticked = db
    .select({ id: habitChecks.habitId })
    .from(habitChecks)
    .where(gte(habitChecks.checkedAt, start))
    .all();
  const finished = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.done, true), isNull(tasks.deletedAt), gte(tasks.doneAt, start)))
    .all();
  const daily = listHabits(db).filter((h) => h.frequency === 'daily');
  return {
    doneToday: ticked.length + finished.length,
    slipping: slippingHabits(db, today).map((h) => h.name),
    overdue: leftBehind(db, today).length,
    habitsToday: {
      done: daily.filter((h) => checks.some((c) => c.habitId === h.id && c.period === today)).length,
      total: daily.length,
    },
  };
}
