import { savingGoals } from '@/budget/goals';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { amountText } from '@/i18n/format';

import {
  addMonthProgress,
  deleteMonthGoal,
  goalShare,
  monthGoal,
  monthOf,
  setMonthGoal,
  setMonthGoalDone,
} from './monthGoal';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("the month's goal", () => {
  it('T-MO06.1 "Save 800 this month" with 400 added is 50%; reaching it says so once', () => {
    const id = setMonthGoal(db, '2024-10', { title: ' Save 800 this month ', target: 80000 });
    expect(addMonthProgress(db, id, 40000)).toBe(false);
    const g = monthGoal(db, monthOf('2024-10-23'))!;
    expect([g.title, amountText(g.savedCents), amountText(g.targetCents), goalShare(g)]).toEqual([
      'Save 800 this month',
      '400',
      '800',
      0.5,
    ]);
    expect(addMonthProgress(db, id, 50000)).toBe(true);
    expect(addMonthProgress(db, id, 100)).toBe(false); // already reached
    expect(goalShare(monthGoal(db, '2024-10')!)).toBe(1);
    // each month has its own goal, and it isn't a savings goal
    expect(monthGoal(db, '2024-11')).toBeUndefined();
    expect(savingGoals(db)).toEqual([]);
  });

  it('a goal without a number is ticked off; editing keeps progress; removing has Undo', () => {
    const id = setMonthGoal(db, '2024-10', { title: 'Finish my portfolio', target: null });
    expect(goalShare(monthGoal(db, '2024-10')!)).toBe(0);
    setMonthGoalDone(db, id, true);
    expect(goalShare(monthGoal(db, '2024-10')!)).toBe(1);
    // giving it a number later: progress starts from what was added (nothing yet)
    expect(setMonthGoal(db, '2024-10', { title: 'Read 4 books', target: 400 })).toBe(id);
    addMonthProgress(db, id, 100);
    expect(goalShare(monthGoal(db, '2024-10')!)).toBe(0.25);
    const undo = deleteMonthGoal(db, id);
    expect(monthGoal(db, '2024-10')).toBeUndefined();
    undo();
    expect(monthGoal(db, '2024-10')!.title).toBe('Read 4 books');
    expect(() => setMonthGoal(db, '2024-10', { title: '  ', target: null })).toThrow();
  });
});
