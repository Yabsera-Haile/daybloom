import { withTestDb } from '@/db/testDb';
import { niceCeil, shortAmount } from '@/features/budget/YearCard';

import { addExpense } from './entries';
import { setBudget } from './plans';
import { budgetByMonth, lastMonthShown, spentByMonth } from './year';

const getDb = withTestDb();
/** A moment in the phone's time (tests run as a New York phone). */
const at = (month: number, day: number, hour = 12) => new Date(2025, month - 1, day, hour).getTime();
const spend = (cents: number, when: number) =>
  addExpense(getDb(), { amountCents: cents, description: 'x', categoryId: null, occurredAt: when, currency: 'USD' });

describe('a year of spending', () => {
  it('T-BU12.1 each month adds up its own spending; months with none are zero', () => {
    spend(1000, at(1, 31, 23)); // last evening of January
    spend(250, at(2, 1, 0)); // first moments of February
    spend(4000, at(3, 15));
    spend(600, at(3, 16));
    spend(9999, new Date(2024, 11, 31, 23).getTime()); // the year before
    expect(spentByMonth(getDb(), 2025)).toEqual([1000, 250, 4600, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(spentByMonth(getDb(), 2023)).toEqual(new Array(12).fill(0));
  });

  it('T-BU12.2 each month has the monthly budget it had then; none before one was set, none while weekly', () => {
    setBudget(getDb(), 'month', 300000, '2025-03-10', 1);
    setBudget(getDb(), 'month', 350000, '2025-06-02', 1);
    setBudget(getDb(), 'week', 80000, '2025-10-06', 1);
    expect(budgetByMonth(getDb(), 2025)).toEqual([
      null,
      null,
      300000,
      300000,
      300000,
      350000,
      350000,
      350000,
      350000,
      350000, // October started on the monthly budget; the weekly one began on the 6th
      null,
      null,
    ]);
  });

  it('T-BU12.3 the line reaches this month in this year, the whole of a past year, nothing of a year to come', () => {
    expect(lastMonthShown(2026, '2026-10-26')).toBe(9);
    expect(lastMonthShown(2025, '2026-10-26')).toBe(11);
    expect(lastMonthShown(2027, '2026-10-26')).toBe(-1);
  });

  it('T-BU12.4 the scale tops out at a round amount, written short', () => {
    expect([niceCeil(0), niceCeil(43_000), niceCeil(57_200), niceCeil(610_000), niceCeil(2_100_000)]).toEqual([
      10_000, 50_000, 60_000, 800_000, 2_500_000,
    ]);
    expect([shortAmount(95_000), shortAmount(123_400), shortAmount(1_500_000), shortAmount(240_000_000)]).toEqual([
      '950',
      '1.2k',
      '15k',
      '2.4M',
    ]);
  });
});
