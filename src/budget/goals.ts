// Savings goals (BU-05): what someone is saving for, how much, and by when. Money put aside isn't
// counted as spending.
import { and, asc, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { localDayStart } from '@/calendar/timezone';
import { goals } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import type { IconName } from '@/ui';

export type Goal = typeof goals.$inferSelect;

/** Pictures to choose from for a goal (design/daybloom/budget-goals#new-goal). */
export const GOAL_ICONS = [
  'savings',
  'shield_with_heart',
  'flight_takeoff',
  'chair',
  'school',
  'redeem',
  'laptop_mac',
  'favorite',
] as const satisfies readonly IconName[];

export type GoalInput = {
  title: string;
  note?: string | null;
  icon: string;
  targetCents: number;
  /** 'YYYY-MM-DD', optional */
  dueDate?: string | null;
};

function clean(input: GoalInput) {
  const title = input.title.trim();
  if (!title) throw new Error('A goal needs a name');
  if (!Number.isInteger(input.targetCents) || input.targetCents <= 0) throw new Error('A goal needs an amount');
  return {
    title,
    note: input.note?.trim() ? input.note.trim() : null,
    icon: input.icon,
    targetCents: input.targetCents,
    dueDate: input.dueDate ?? null,
  };
}

const active = and(eq(goals.kind, 'savings'), isNull(goals.archivedAt));

/** Goals still being saved for, in the order they were made. */
export function savingGoals(db: Db): Goal[] {
  return db
    .select()
    .from(goals)
    .where(and(active, isNull(goals.reachedAt)))
    .orderBy(asc(goals.sortOrder))
    .all();
}

/** Goals that have been reached, latest first. */
export function reachedGoals(db: Db): Goal[] {
  return db
    .select()
    .from(goals)
    .where(and(active, isNotNull(goals.reachedAt)))
    .orderBy(desc(goals.reachedAt))
    .all();
}

export function getGoal(db: Db, id: string): Goal | undefined {
  return db.select().from(goals).where(eq(goals.id, id)).get();
}

export function createGoal(db: Db, input: GoalInput): string {
  const id = newId();
  const last =
    db
      .select({ n: max(goals.sortOrder) })
      .from(goals)
      .get()?.n ?? -1;
  db.insert(goals)
    .values({ id, kind: 'savings', ...clean(input), sortOrder: last + 1 })
    .run();
  return id;
}

/** Edits a goal; a new target can bring a reached goal back to the list or mark it reached. */
export function updateGoal(db: Db, id: string, input: GoalInput): void {
  const goal = getGoal(db, id);
  if (!goal) return;
  const values = clean(input);
  const reached = goal.savedCents >= values.targetCents;
  db.update(goals)
    .set({ ...values, reachedAt: reached ? (goal.reachedAt ?? Date.now()) : null })
    .where(eq(goals.id, id))
    .run();
}

/**
 * Puts money aside for a goal (or takes some out with a negative amount, never below zero).
 * Returns true when this reaches the goal.
 */
export function addToGoal(db: Db, id: string, cents: number): boolean {
  const goal = getGoal(db, id);
  if (!goal || !Number.isInteger(cents) || cents === 0) return false;
  const saved = Math.max(0, goal.savedCents + cents);
  const reached = saved >= goal.targetCents;
  db.update(goals)
    .set({ savedCents: saved, reachedAt: reached ? (goal.reachedAt ?? Date.now()) : null })
    .where(eq(goals.id, id))
    .run();
  return reached && !goal.reachedAt;
}

/** Removes a goal; Undo brings it back. */
export function deleteGoal(db: Db, id: string): Undo {
  db.update(goals).set({ archivedAt: Date.now() }).where(eq(goals.id, id)).run();
  return () => db.update(goals).set({ archivedAt: null }).where(eq(goals.id, id)).run();
}

/** "about $320 a week to get there": what's left spread over the whole weeks until the date. */
export function weeklyToReach(
  goal: Pick<Goal, 'targetCents' | 'savedCents' | 'dueDate'>,
  today: string,
): number | null {
  if (!goal.dueDate || goal.dueDate <= today) return null;
  const left = goal.targetCents - goal.savedCents;
  if (left <= 0) return null;
  const days = Math.round((localDayStart(goal.dueDate) - localDayStart(today)) / 86_400_000);
  return Math.ceil(left / Math.max(1, Math.ceil(days / 7)));
}
