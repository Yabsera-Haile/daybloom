import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { money } from '@/i18n/format';
import { plannedReminders } from '@/reminders/plan';

import {
  createBill,
  getBill,
  listBills,
  markBillPaid,
  nextDueDate,
  settleAutoBills,
  upcomingBills,
  type BillInput,
} from './bills';
import {
  addSpendCategory,
  deleteSpendCategory,
  ensureDefaultSpendCategories,
  listSpendCategories,
  moveSpendCategory,
} from './categories';
import { addExpense, byCategory, deleteExpense, expensesIn, totalOf, updateExpense } from './entries';
import { addToGoal, createGoal, getGoal, reachedGoals, savingGoals, weeklyToReach } from './goals';
import { parseMoney, periodRange, shiftPeriod } from './money';
import { budgetFor, budgetSummary, currentPeriod, setBudget } from './plans';

const at = (d: number, h = 12, m = 0) => new Date(2024, 9, d, h, m).getTime(); // October 2024
const today = '2024-10-23'; // Wednesday
const october = periodRange(today, 'month', 1);
const spend = (db: Db, cents: number, d: number, categoryId: string | null = 'groceries') =>
  addExpense(db, { amountCents: cents, description: 'x', categoryId, occurredAt: at(d), currency: 'USD' });

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  ensureDefaultSpendCategories(db);
});

describe('money', () => {
  it('T-BU08.2 reads amounts as typed in different regions; nothing or zero is not an amount', () => {
    expect(parseMoney('6.25')).toBe(625);
    expect(parseMoney('12,5')).toBe(1250);
    expect(parseMoney('1,730')).toBe(173000);
    expect(parseMoney('1 730,00')).toBe(173000);
    expect(parseMoney('$4,850.00')).toBe(485000);
    expect(parseMoney('5.')).toBe(500);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('.')).toBeNull();
    expect(parseMoney('0')).toBe(0);
  });

  it('T-BU09.1 formats money in the phone style, spending with a minus', () => {
    expect(money(173000, 'USD')).toBe('$1,730.00');
    expect(money(625, 'USD', { minus: true })).toBe('−$6.25');
    expect(money(1000000, 'USD', { whole: true })).toBe('$10,000');
    expect(money(150000, 'KES')).toMatch(/1,500\.00/);
  });

  it('months and weeks, and the ones before and after', () => {
    expect(october).toEqual({ start: '2024-10-01', end: '2024-10-31' });
    expect(periodRange(today, 'week', 1)).toEqual({ start: '2024-10-21', end: '2024-10-27' });
    expect(periodRange(today, 'week', 0)).toEqual({ start: '2024-10-20', end: '2024-10-26' });
    expect(shiftPeriod(october, 'month', -1, 1)).toEqual({ start: '2024-09-01', end: '2024-09-30' });
    expect(shiftPeriod(periodRange(today, 'week', 1), 'week', 1, 1).start).toBe('2024-10-28');
  });
});

describe('budget', () => {
  it('T-BU02.1 T-BU03.1 budget $4,850, spent $3,120 on Oct 23: $1,730 left, 36% left, 9 days to go', () => {
    setBudget(db, 'month', 485000, today, 1);
    spend(db, 312000, 5);
    const s = budgetSummary(totalOf(expensesIn(db, october)), budgetFor(db, 'month', october), october, today);
    expect(s.leftCents).toBe(173000);
    expect(Math.round(s.usedShare * 1000) / 10).toBe(64.3);
    expect(Math.round((1 - s.usedShare) * 100)).toBe(36);
    expect(s.daysLeft).toBe(9);
    expect(s.perDayCents).toBe(19222);
    expect(s.status).toBe('onTrack');
  });

  it('T-BU03.2 80% spent by day 15 is "Careful"; past the budget is "Over budget" by how much', () => {
    const s = budgetSummary(80000, 100000, october, '2024-10-15');
    expect(s.status).toBe('careful');
    const over = budgetSummary(112000, 100000, october, '2024-10-15');
    expect([over.status, over.leftCents, over.perDayCents]).toEqual(['over', -12000, 0]);
  });

  it('T-BU04.1 a weekly budget counts from this week on; earlier months keep theirs', () => {
    expect(currentPeriod(db)).toBe('month');
    setBudget(db, 'month', 400000, '2024-09-10', 1);
    setBudget(db, 'week', 50000, today, 1);
    expect(currentPeriod(db)).toBe('week');
    const thisWeek = periodRange(today, 'week', 1);
    expect(budgetFor(db, 'week', thisWeek)).toBe(50000);
    expect(budgetFor(db, 'week', shiftPeriod(thisWeek, 'week', 1, 1))).toBe(50000);
    expect(budgetFor(db, 'month', periodRange('2024-09-10', 'month', 1))).toBe(400000);
    // an earlier week, when the budget was monthly, has no weekly budget
    expect(budgetFor(db, 'week', shiftPeriod(thisWeek, 'week', -1, 1))).toBeNull();
    // changing your mind in the same period replaces the choice
    setBudget(db, 'month', 450000, today, 1);
    expect(currentPeriod(db)).toBe('month');
    expect(budgetFor(db, 'month', october)).toBe(450000);
    expect(budgetFor(db, 'week', shiftPeriod(thisWeek, 'week', 1, 1))).toBeNull();
  });

  it('T-BU08.1 T-BU07.1 an expense counts in its period; edits and deletes (with Undo) change the totals', () => {
    const latte = spend(db, 625, 23, 'dining');
    spend(db, 8640, 22);
    spend(db, 1000, 31);
    spend(db, 999, 1 + 31); // November 1
    expect(expensesIn(db, october).map((e) => e.amountCents)).toEqual([1000, 625, 8640]);
    updateExpense(db, latte, {
      amountCents: 650,
      description: ' Latte ',
      categoryId: 'dining',
      occurredAt: at(23),
      currency: 'USD',
    });
    expect(totalOf(expensesIn(db, october))).toBe(10290);
    const undo = deleteExpense(db, latte);
    expect(totalOf(expensesIn(db, october))).toBe(9640);
    undo();
    expect(expensesIn(db, october).find((e) => e.id === latte)?.description).toBe('Latte');
    expect(() => spend(db, 0, 23)).toThrow();
  });

  it('spending by category, biggest first, with shares', () => {
    spend(db, 3000, 2, 'dining');
    spend(db, 6000, 3, 'groceries');
    spend(db, 1000, 4, 'dining');
    spend(db, 2000, 5, null);
    expect(byCategory(expensesIn(db, october))).toEqual([
      { categoryId: 'groceries', cents: 6000, share: 0.5 },
      { categoryId: 'dining', cents: 4000, share: 4000 / 12000 },
      { categoryId: null, cents: 2000, share: 2000 / 12000 },
    ]);
  });

  it('starter categories, plus your own; a deleted one leaves the list but not past spending', () => {
    expect(listSpendCategories(db).map((c) => c.name)).toEqual([
      'Groceries',
      'Dining',
      'Transport',
      'Home',
      'Bills',
      'Health',
      'Fun',
      'Other',
    ]);
    const coffee = addSpendCategory(db, { name: ' Coffee ', icon: 'local_cafe', colorKey: 'work' });
    moveSpendCategory(db, coffee, -1);
    expect(
      listSpendCategories(db)
        .slice(-2)
        .map((c) => c.name),
    ).toEqual(['Coffee', 'Other']);
    spend(db, 450, 9, coffee);
    const undo = deleteSpendCategory(db, coffee);
    expect(listSpendCategories(db).some((c) => c.id === coffee)).toBe(false);
    expect(expensesIn(db, october)[0].budgetCategoryId).toBe(coffee);
    undo();
    expect(listSpendCategories(db).some((c) => c.id === coffee)).toBe(true);
  });
});

describe('savings goals', () => {
  it('T-BU05.1 adding $100 to $8,200 of $10,000 makes $8,300 (83%); reaching it moves it to reached goals', () => {
    const fund = createGoal(db, { title: 'Emergency fund', icon: 'shield_with_heart', targetCents: 1000000 });
    addToGoal(db, fund, 820000);
    expect(addToGoal(db, fund, 10000)).toBe(false);
    const g = getGoal(db, fund)!;
    expect([g.savedCents, Math.round((g.savedCents / g.targetCents) * 100)]).toEqual([830000, 83]);
    expect(addToGoal(db, fund, 170000)).toBe(true);
    expect(savingGoals(db)).toEqual([]);
    expect(reachedGoals(db).map((x) => x.title)).toEqual(['Emergency fund']);
    // taking money out never goes below zero and brings it back to the list
    addToGoal(db, fund, -2000000);
    expect([getGoal(db, fund)!.savedCents, savingGoals(db).length]).toEqual([0, 1]);
  });

  it('works out a weekly amount to reach a goal by its date', () => {
    expect(weeklyToReach({ targetCents: 350000, savedCents: 245000, dueDate: '2024-11-15' }, today)).toBe(26250);
    expect(weeklyToReach({ targetCents: 350000, savedCents: 245000, dueDate: null }, today)).toBeNull();
  });
});

describe('bills', () => {
  const bill = (over: Partial<BillInput> = {}): string =>
    createBill(db, {
      title: 'Car insurance',
      amountCents: 42000,
      dueDate: '2024-10-25',
      repeatMonths: 6,
      payment: 'manual',
      remindMinutes: null,
      currency: 'USD',
      ...over,
    });

  it('T-BU06.1 upcoming shows the next 14 days: Oct 25 and 28, not Nov 10', () => {
    bill();
    bill({ title: 'Rent', dueDate: '2024-10-28', payment: 'auto', repeatMonths: 1 });
    bill({ title: 'Internet', dueDate: '2024-11-10', payment: 'auto', repeatMonths: 1 });
    expect(upcomingBills(db, today).map((b) => b.title)).toEqual(['Car insurance', 'Rent']);
  });

  it('repeats keep their day of the month, the 31st falling back in short months', () => {
    expect(nextDueDate('2024-01-31', 1, 31)).toBe('2024-02-29');
    expect(nextDueDate('2024-02-29', 1, 31)).toBe('2024-03-31');
    expect(nextDueDate('2024-11-15', 3, 15)).toBe('2025-02-15');
    expect(nextDueDate('2024-10-25', 12, 25)).toBe('2025-10-25');
  });

  it('marking a bill paid adds it to spending under Bills and moves it on; Undo takes it back', () => {
    const id = bill();
    const undo = markBillPaid(db, id, at(24, 18));
    const [paid] = expensesIn(db, october);
    expect([paid.description, paid.amountCents, paid.budgetCategoryId]).toEqual(['Car insurance', 42000, 'bills']);
    expect(getBill(db, id)!.dueDate).toBe('2025-04-25');
    undo();
    expect(expensesIn(db, october)).toEqual([]);
    expect(getBill(db, id)!.dueDate).toBe('2024-10-25');
    // a one-off bill is done once it's paid
    const once = bill({ title: 'Repair', repeatMonths: null });
    markBillPaid(db, once, at(24));
    expect(listBills(db).map((b) => b.title)).toEqual(['Car insurance']);
  });

  it('bills the bank pays are added at 9 AM on their day, catching up on missed months', () => {
    bill({ title: 'Gym', dueDate: '2024-08-23', payment: 'auto', repeatMonths: 1 });
    bill({ title: 'Later today', dueDate: '2024-10-23', payment: 'auto', repeatMonths: null, amountCents: 100 });
    expect(settleAutoBills(db, at(23, 8, 59))).toBe(2); // Aug 23 and Sep 23; Oct 23 not until 9 AM
    expect(settleAutoBills(db, at(23, 9))).toBe(2);
    expect(settleAutoBills(db, at(23, 9))).toBe(0);
    const paid = expensesIn(db, october).map((e) => [e.description, new Date(e.occurredAt).getHours()]);
    expect(paid.sort()).toEqual([
      ['Gym', 9],
      ['Later today', 9],
    ]);
    // the one-off is done; the monthly one waits for November
    expect(listBills(db).map((b) => `${b.title} ${b.dueDate}`)).toEqual(['Gym 2024-11-23']);
  });

  it('T-BU10.1 a bill with "1 day before" reminds at 9 AM the day before, with its amount', () => {
    bill({ remindMinutes: 1440 });
    bill({
      title: 'Rent',
      dueDate: '2024-10-28',
      payment: 'auto',
      repeatMonths: 1,
      amountCents: 145000,
      remindMinutes: 0,
    });
    const rs = plannedReminders(db, at(23, 13), '12h').filter((r) => r.data.kind === 'bill');
    expect(rs.map((r) => [r.fireAt, r.title, r.body, r.data.manual])).toEqual([
      [at(24, 9), 'Due tomorrow · Car insurance', '$420.00 · Needs paying', true],
      [at(28, 9), 'Due today · Rent', '$1,450.00 · Paid automatically', false],
    ]);
  });
});
