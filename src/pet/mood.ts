// The pet's mood (MS-04, MS-11), worked out from the planner each time and never stored (FR-13):
// happy once you've done something today, sulking while a habit slips or to-dos sit overdue,
// content otherwise. It forgives at once: one thing done today makes it happy again.
import { and, eq, gte, isNull } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey, localDayStart } from '@/calendar/timezone';
import { habitChecks, tasks } from '@/db/schema';
import type { Db } from '@/db/types';
import { checksBetween, listHabits } from '@/habits/store';
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
  /** Daily habits missed yesterday and the day before, by name. */
  slipping: string[];
  /** Day to-dos left unfinished on earlier days (FR-15). */
  overdue: number;
}

export function moodOf(s: PetSignals): Mood {
  if (s.doneToday > 0) return 'happy';
  if (s.slipping.length > 0 || s.overdue > 0) return 'sulky';
  return 'content';
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

/** What the mood is worked out from, read from the planner for `today`. */
export function petSignals(db: Db, today: string): PetSignals {
  const yesterday = addDaysToKey(today, -1);
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
  // a daily habit slips when two whole days pass without a tick (not counting days before it was added)
  const slipping = listHabits(db)
    .filter((h) => h.frequency === 'daily' && toDayKey(new Date(h.createdAt)) <= dayBefore)
    .filter((h) => !checks.some((c) => c.habitId === h.id && (c.period === yesterday || c.period === dayBefore)))
    .map((h) => h.name);
  return {
    doneToday: ticked.length + finished.length,
    slipping,
    overdue: leftBehind(db, today).length,
  };
}
