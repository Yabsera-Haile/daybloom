// The month's goal (MO-06): one goal per month, shown on Month as its own card. It can have a number
// to reach ("Save 800", "Read 4 books": progress is added along the way) or none ("Finish my
// portfolio": it's simply marked done). Stored in `goals` with kind 'general'; numbers in hundredths.
import { and, eq, isNull } from 'drizzle-orm';

import { goals } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';

export type MonthGoal = typeof goals.$inferSelect;

/** 'YYYY-MM' of a day key */
export const monthOf = (day: string) => day.slice(0, 7);

export function monthGoal(db: Db, month: string): MonthGoal | undefined {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.kind, 'general'), eq(goals.month, month), isNull(goals.archivedAt)))
    .get();
}

export type MonthGoalInput = {
  title: string;
  /** what to reach, in hundredths (800 → 80000); null = no number, just done or not */
  target: number | null;
};

/** Sets (or replaces the wording and number of) the month's goal; progress so far is kept. */
export function setMonthGoal(db: Db, month: string, input: MonthGoalInput): string {
  const title = input.title.trim();
  if (!title) throw new Error('A goal needs a name');
  if (input.target !== null && (!Number.isInteger(input.target) || input.target <= 0)) {
    throw new Error('A goal number must be above zero');
  }
  const targetCents = input.target ?? 0;
  const existing = monthGoal(db, month);
  if (existing) {
    const reached = targetCents > 0 ? existing.savedCents >= targetCents : !!existing.reachedAt;
    db.update(goals)
      .set({ title, targetCents, reachedAt: reached ? (existing.reachedAt ?? Date.now()) : null })
      .where(eq(goals.id, existing.id))
      .run();
    return existing.id;
  }
  const id = newId();
  db.insert(goals).values({ id, kind: 'general', month, title, targetCents, savedCents: 0 }).run();
  return id;
}

/** Adds progress (or takes some back with a negative amount, never below zero). True when this reaches the goal. */
export function addMonthProgress(db: Db, id: string, amount: number): boolean {
  const goal = db.select().from(goals).where(eq(goals.id, id)).get();
  if (!goal || goal.targetCents <= 0 || !Number.isInteger(amount) || amount === 0) return false;
  const saved = Math.max(0, goal.savedCents + amount);
  const reached = saved >= goal.targetCents;
  db.update(goals)
    .set({ savedCents: saved, reachedAt: reached ? (goal.reachedAt ?? Date.now()) : null })
    .where(eq(goals.id, id))
    .run();
  return reached && !goal.reachedAt;
}

/** For a goal without a number: done or not. */
export function setMonthGoalDone(db: Db, id: string, done: boolean): void {
  db.update(goals)
    .set({ reachedAt: done ? Date.now() : null })
    .where(eq(goals.id, id))
    .run();
}

/** 0..1: share reached (a goal without a number is 0 or 1). */
export function goalShare(goal: Pick<MonthGoal, 'targetCents' | 'savedCents' | 'reachedAt'>): number {
  if (goal.targetCents <= 0) return goal.reachedAt ? 1 : 0;
  return Math.min(1, goal.savedCents / goal.targetCents);
}

export function deleteMonthGoal(db: Db, id: string): Undo {
  db.update(goals).set({ archivedAt: Date.now() }).where(eq(goals.id, id)).run();
  return () => db.update(goals).set({ archivedAt: null }).where(eq(goals.id, id)).run();
}
