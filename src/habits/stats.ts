// Every habit number on screen is worked out from the ticks, never stored (FR-13): streaks,
// "Done today", "78% of habits done", a routine's "2 of 3 done", Week's "75% done so far".
import { toDayKey, type WeekStart } from '@/calendar/dates';
import { addDaysToKey } from '@/calendar/timezone';

import { weekOf, type Habit, type HabitCheck } from './store';

type HabitLike = Pick<Habit, 'id' | 'frequency' | 'createdAt'>;

/** The days (daily) or week starts (weekly, under the current week-start setting) a habit is done. */
export function donePeriods(habit: HabitLike, checks: HabitCheck[], weekStart: WeekStart): Set<string> {
  const mine = checks.filter((c) => c.habitId === habit.id).map((c) => c.period);
  return new Set(habit.frequency === 'daily' ? mine : mine.map((p) => weekOf(p, weekStart).start));
}

/** The period a day falls in for this habit: the day itself, or its week's first day. */
export function periodOf(habit: Pick<Habit, 'frequency'>, day: string, weekStart: WeekStart): string {
  return habit.frequency === 'daily' ? day : weekOf(day, weekStart).start;
}

/**
 * HB-06: consecutive days (weeks) done, up to today (this week). Not having done it yet today
 * doesn't break the streak; it breaks when the day (week) ends without a tick.
 */
export function currentStreak(
  habit: Pick<Habit, 'frequency'>,
  done: Set<string>,
  today: string,
  weekStart: WeekStart,
): number {
  const step = habit.frequency === 'daily' ? 1 : 7;
  let cursor = periodOf(habit, today, weekStart);
  if (!done.has(cursor)) cursor = addDaysToKey(cursor, -step);
  let n = 0;
  while (done.has(cursor)) {
    n += 1;
    cursor = addDaysToKey(cursor, -step);
  }
  return n;
}

/** The longest run ever. */
export function bestStreak(habit: Pick<Habit, 'frequency'>, done: Set<string>): number {
  const step = habit.frequency === 'daily' ? 1 : 7;
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const p of [...done].sort()) {
    run = prev !== null && addDaysToKey(prev, step) === p ? run + 1 : 1;
    best = Math.max(best, run);
    prev = p;
  }
  return best;
}

const createdDay = (h: HabitLike) => toDayKey(new Date(h.createdAt));

/** Where a habit's history begins: the day it was added, or its first tick if earlier. Days before aren't missed. */
export function startedOn(habit: HabitLike, done: Set<string>): string {
  let start = createdDay(habit);
  for (const p of done) if (p < start) start = p;
  return start;
}

/**
 * HB-01: share of daily ticks done this month so far, counting each habit from the day it was
 * added. null when there is nothing to count yet.
 */
export function monthCompletion(
  habits: HabitLike[],
  checks: HabitCheck[],
  firstOfMonth: string,
  today: string,
): number | null {
  let possible = 0;
  let done = 0;
  for (const h of habits.filter((x) => x.frequency === 'daily')) {
    const ticks = new Set(checks.filter((c) => c.habitId === h.id).map((c) => c.period));
    for (let d = createdDay(h) > firstOfMonth ? createdDay(h) : firstOfMonth; d <= today; d = addDaysToKey(d, 1)) {
      possible += 1;
      if (ticks.has(d)) done += 1;
    }
  }
  return possible === 0 ? null : done / possible;
}

/** "Done today 3/8" (HB-02) and a routine's "2 of 3 done" (TD-05): daily habits ticked on a day. */
export function doneOn(
  habits: Pick<Habit, 'id' | 'frequency'>[],
  checks: HabitCheck[],
  day: string,
): { done: number; total: number } {
  const daily = habits.filter((h) => h.frequency === 'daily');
  const ticked = new Set(checks.filter((c) => c.period === day).map((c) => c.habitId));
  return { done: daily.filter((h) => ticked.has(h.id)).length, total: daily.length };
}

/** WK-11: share of daily ticks done from the week's first day up to today. */
export function weekSoFar(
  habits: Pick<Habit, 'id' | 'frequency'>[],
  checks: HabitCheck[],
  days: string[],
  today: string,
): number | null {
  const past = days.filter((d) => d <= today);
  let done = 0;
  let total = 0;
  for (const d of past) {
    const r = doneOn(habits, checks, d);
    done += r.done;
    total += r.total;
  }
  return total === 0 ? null : done / total;
}
