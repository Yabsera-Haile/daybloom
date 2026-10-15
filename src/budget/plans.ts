// The budget: an amount for each month or each week (BU-04). A change counts from the period it is
// made in, so earlier periods keep the budget they had; the totals are always worked out (FR-13).
import { desc, gte, lte } from 'drizzle-orm';

import type { WeekStart } from '@/calendar/dates';
import { budgetPlans } from '@/db/schema';
import type { Db } from '@/db/types';

import { daysIn, periodRange, type BudgetPeriod, type Range } from './money';

export type BudgetPlan = typeof budgetPlans.$inferSelect;

/** The plan in use now (or null before any budget was set). */
export function currentPlan(db: Db): BudgetPlan | null {
  return db.select().from(budgetPlans).orderBy(desc(budgetPlans.startsOn)).limit(1).get() ?? null;
}

/** How the Budget tab counts: by month unless a weekly budget was chosen. */
export function currentPeriod(db: Db): BudgetPeriod {
  return (currentPlan(db)?.period as BudgetPeriod | undefined) ?? 'month';
}

/**
 * Sets the budget from the current month or week on. null amount = no budget. It replaces any plan
 * that started on or after this period's first day (the latest choice wins).
 */
export function setBudget(
  db: Db,
  period: BudgetPeriod,
  amountCents: number | null,
  today: string,
  weekStart: WeekStart,
): void {
  if (amountCents !== null && (!Number.isInteger(amountCents) || amountCents <= 0)) {
    throw new Error('A budget needs an amount above zero');
  }
  const startsOn = periodRange(today, period, weekStart).start;
  db.transaction((tx) => {
    tx.delete(budgetPlans).where(gte(budgetPlans.startsOn, startsOn)).run();
    tx.insert(budgetPlans).values({ period, startsOn, amountCents }).run();
  });
}

/** The budget for one period, if one was set for that kind of period by then. */
export function budgetFor(db: Db, period: BudgetPeriod, range: Range): number | null {
  const plan = db
    .select()
    .from(budgetPlans)
    .where(lte(budgetPlans.startsOn, range.start))
    .orderBy(desc(budgetPlans.startsOn))
    .limit(1)
    .get();
  return plan && plan.period === period ? plan.amountCents : null;
}

export type BudgetStatus = 'onTrack' | 'careful' | 'over';

export type BudgetSummary = {
  spentCents: number;
  budgetCents: number | null;
  /** budget − spent; below zero when over */
  leftCents: number;
  /** spent ÷ budget (can pass 1) */
  usedShare: number;
  /** how much of the period has gone by, counting today */
  elapsedShare: number;
  /** days left, counting today (0 for a past period) */
  daysLeft: number;
  /** what's left spread over the days left */
  perDayCents: number;
  status: BudgetStatus;
};

/**
 * "Left to spend", "On track" / "Careful" / "Over budget" (BU-03, T-BU03.2): careful when spending
 * runs more than 10 points ahead of the calendar.
 */
export function budgetSummary(
  spentCents: number,
  budgetCents: number | null,
  range: Range,
  today: string,
): BudgetSummary {
  const total = daysIn(range);
  const passed = today < range.start ? 0 : today > range.end ? total : daysIn({ start: range.start, end: today });
  const daysLeft = total - passed + (today >= range.start && today <= range.end ? 1 : 0);
  const budget = budgetCents ?? 0;
  const leftCents = budget - spentCents;
  const usedShare = budget > 0 ? spentCents / budget : 0;
  const elapsedShare = passed / total;
  const status: BudgetStatus =
    budget > 0 && spentCents > budget ? 'over' : budget > 0 && usedShare > elapsedShare + 0.1 ? 'careful' : 'onTrack';
  return {
    spentCents,
    budgetCents,
    leftCents,
    usedShare,
    elapsedShare,
    daysLeft,
    perDayCents: daysLeft > 0 && leftCents > 0 ? Math.floor(leftCents / daysLeft) : 0,
    status,
  };
}
