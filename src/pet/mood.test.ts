import { eq } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey } from '@/calendar/timezone';
import { habits } from '@/db/schema';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { createHabit, ensureDefaultRoutines, getHabit, setHabitDone } from '@/habits/store';
import { createTask, setTaskDone } from '@/planner/tasks';

import { expressionOf, isBedtime, moodOf, petSignals } from './mood';

const today = toDayKey(new Date());
let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  ensureDefaultRoutines(db);
});

/** A daily habit added `daysAgo` days ago. */
const habitAdded = (name: string, daysAgo: number) => {
  const id = createHabit(db, { name, routineId: null, frequency: 'daily' });
  db.update(habits)
    .set({ createdAt: Date.now() - daysAgo * 86_400_000 })
    .where(eq(habits.id, id))
    .run();
  return getHabit(db, id)!;
};

describe('pet mood (MS-11)', () => {
  it('T-MS11.1 content with nothing slipping; sulking while things slip; one thing done today forgives', () => {
    expect(moodOf({ doneToday: 0, slipping: [], overdue: 0 })).toBe('content');
    expect(moodOf({ doneToday: 0, slipping: ['Read'], overdue: 0 })).toBe('sulky');
    expect(moodOf({ doneToday: 0, slipping: [], overdue: 2 })).toBe('sulky');
    expect(moodOf({ doneToday: 1, slipping: ['Read'], overdue: 2 })).toBe('happy');
  });

  it('T-MS10.1 sulking is sad for a gentle pet and cross for a cheeky one', () => {
    expect(expressionOf('sulky', 'gentle')).toBe('sad');
    expect(expressionOf('sulky', 'cheeky')).toBe('cross');
    expect(expressionOf('happy', 'cheeky')).toBe('happy');
    expect(expressionOf('content', 'gentle')).toBe('content');
  });

  it('T-MS11.2 a daily habit slips after two days without a tick, not counting days before it was added', () => {
    habitAdded('Drink water', 5);
    const read = habitAdded('Read 10 pages', 5);
    habitAdded('Stretch', 1);
    setHabitDone(db, read, addDaysToKey(today, -1), true, 0);
    expect(petSignals(db, today).slipping).toEqual(['Drink water']);
  });

  it('T-MS11.3 to-dos left on earlier days count as overdue; finishing one or ticking a habit today counts as done', () => {
    const late = createTask(db, { title: 'Call the bank', date: addDaysToKey(today, -1) });
    expect(petSignals(db, today)).toMatchObject({ doneToday: 0, overdue: 1 });
    setTaskDone(db, late, true);
    setHabitDone(db, habitAdded('Walk', 3), today, true, 0);
    expect(petSignals(db, today)).toMatchObject({ doneToday: 2, overdue: 0 });
  });

  it('T-MS04.2 the pet sleeps from 10 PM to 7 AM', () => {
    const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);
    expect([at(22, 30), at(6, 59), at(7), at(21, 59)].map(isBedtime)).toEqual([true, true, false, false]);
  });
});
