// Expenses entered by hand (BU-07, BU-08). No bank connection; nothing leaves the phone (NFR-06).
import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';

import { entries } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';

import { rangeMs, type Range } from './money';

export type Entry = typeof entries.$inferSelect;

export type ExpenseInput = {
  amountCents: number;
  description: string;
  categoryId: string | null;
  occurredAt: number;
  currency: string;
};

function clean(input: ExpenseInput) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('An expense needs an amount above zero');
  }
  return {
    type: 'expense',
    amountCents: input.amountCents,
    description: input.description.trim(),
    budgetCategoryId: input.categoryId,
    occurredAt: input.occurredAt,
    currency: input.currency,
  };
}

export function addExpense(db: Db, input: ExpenseInput): string {
  const id = newId();
  db.insert(entries)
    .values({ id, ...clean(input) })
    .run();
  return id;
}

export function updateExpense(db: Db, id: string, input: ExpenseInput): void {
  db.update(entries)
    .set({ ...clean(input), updatedAt: Date.now() })
    .where(eq(entries.id, id))
    .run();
}

export function getEntry(db: Db, id: string): Entry | undefined {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .get();
}

/** Deletes an expense; Undo brings it back (FR-02). */
export function deleteExpense(db: Db, id: string): Undo {
  db.update(entries).set({ deletedAt: Date.now() }).where(eq(entries.id, id)).run();
  return () => db.update(entries).set({ deletedAt: null }).where(eq(entries.id, id)).run();
}

/** Expenses in a period, newest first. */
export function expensesIn(db: Db, range: Range): Entry[] {
  const { from, to } = rangeMs(range);
  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.type, 'expense'),
        isNull(entries.deletedAt),
        gte(entries.occurredAt, from),
        lt(entries.occurredAt, to),
      ),
    )
    .orderBy(desc(entries.occurredAt), desc(entries.createdAt))
    .all();
}

/** Total spent: worked out from the entries, never stored (FR-13). */
export const totalOf = (list: Pick<Entry, 'amountCents'>[]) => list.reduce((sum, e) => sum + e.amountCents, 0);

export type CategoryTotal = { categoryId: string | null; cents: number; share: number };

/** Spending per category, biggest first, with each one's share of the total. */
export function byCategory(list: Pick<Entry, 'amountCents' | 'budgetCategoryId'>[]): CategoryTotal[] {
  const sums = new Map<string | null, number>();
  for (const e of list) sums.set(e.budgetCategoryId, (sums.get(e.budgetCategoryId) ?? 0) + e.amountCents);
  const total = totalOf(list);
  return [...sums]
    .map(([categoryId, cents]) => ({ categoryId, cents, share: total ? cents / total : 0 }))
    .sort((a, b) => b.cents - a.cents);
}
