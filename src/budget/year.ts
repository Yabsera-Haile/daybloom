// A year of spending at a glance (BU-12): what went out each month, against the monthly budget.
// Worked out from the entries every time, never stored (FR-13).
import type { Db } from '@/db/types';

import { expensesIn } from './entries';
import { periodRange, type Range } from './money';
import { budgetFor } from './plans';

/** January 1 to December 31. */
export const yearRange = (year: number): Range => ({ start: `${year}-01-01`, end: `${year}-12-31` });

const firstOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}-01`;

/** Cents spent in each month of a year (0 = January); a month with nothing spent is 0. */
export function spentByMonth(db: Db, year: number): number[] {
  const out = new Array<number>(12).fill(0);
  for (const e of expensesIn(db, yearRange(year))) out[new Date(e.occurredAt).getMonth()] += e.amountCents;
  return out;
}

/** The monthly budget in force in each month of a year; null where there was none (or it was weekly). */
export function budgetByMonth(db: Db, year: number): (number | null)[] {
  return Array.from({ length: 12 }, (_, m) => budgetFor(db, 'month', periodRange(firstOf(year, m), 'month', 1)));
}

/**
 * The last month of a year to draw: all twelve for a past year, up to this month for this year,
 * none (-1) for a year still to come.
 */
export function lastMonthShown(year: number, today: string): number {
  const thisYear = Number(today.slice(0, 4));
  if (year < thisYear) return 11;
  if (year > thisYear) return -1;
  return Number(today.slice(5, 7)) - 1;
}
