import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense } from '@/budget/entries';
import { createTestDb } from '@/db/testDb';
import { archiveHabit, createHabit } from '@/habits/store';
import type { Db } from '@/db/types';
import { readSettings } from '@/settings';
import { toRRule } from '@/recurrence';

import { createEvent } from './events';
import { createHourNote } from './notes';
import { forgetSearch, recentSearches, rememberSearch, searchPlans } from './search';
import { createTask } from './tasks';

const NY = 'America/New_York';
const at = (m: number, d: number, h: number) => new Date(2024, m - 1, d, h).getTime();
const now = at(10, 23, 13);

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const titles = (list: { kind: string; day: string }[]) => list.map((r) => `${r.kind} ${r.day}`);

describe('search', () => {
  it('T-SR01.1 "tax" finds the to-do and the event, grouped by date', () => {
    createTask(db, { title: 'Submit quarterly tax paperwork', date: '2024-10-23', dueTime: '17:00', urgent: true });
    createEvent(db, { title: 'Call with the TAX advisor', startAt: at(11, 5, 11), endAt: at(11, 5, 12), timeZone: NY });
    createTask(db, { title: 'Gather receipts', notes: 'for taxes', date: '2024-10-14' });
    createTask(db, { title: 'Water the palm', date: '2024-10-23' });
    const r = searchPlans(db, 'tax', now);
    expect(titles(r.today)).toEqual(['task 2024-10-23']);
    expect(titles(r.comingUp)).toEqual(['event 2024-11-05']);
    expect(titles(r.earlier)).toEqual(['task 2024-10-14']);
  });

  it('shows the next time a repeating event happens, and treats % and _ as plain text', () => {
    const startAt = at(10, 2, 9);
    createEvent(db, {
      title: 'Yoga 100% fun',
      startAt,
      endAt: startAt + 3_600_000,
      timeZone: NY,
      rrule: toRRule(
        { freq: 'weekly', every: 1, weekdays: [3], end: { kind: 'never' } },
        { startAt, timeZone: NY, allDay: false },
      ),
    });
    createTask(db, { title: 'Yoga 100 times', date: '2024-10-23' });
    expect(titles(searchPlans(db, '100%', now).comingUp)).toEqual(['event 2024-10-30']);
    expect(searchPlans(db, '   ', now)).toEqual({ today: [], comingUp: [], earlier: [], habits: [] });
  });

  it('remembers recent searches, newest first, without touching settings', () => {
    rememberSearch(db, 'dentist');
    rememberSearch(db, 'Maya');
    rememberSearch(db, 'DENTIST');
    expect(recentSearches(db)).toEqual(['DENTIST', 'Maya']);
    forgetSearch(db, 'Maya');
    expect(recentSearches(db)).toEqual(['DENTIST']);
    expect(() => readSettings(db)).not.toThrow();
  });

  it('T-SR02.1 "latte" finds the spending, "hydration" the habit; notes and categories are searched too', () => {
    ensureDefaultSpendCategories(db);
    addExpense(db, {
      amountCents: 625,
      description: 'Oat latte',
      categoryId: 'dining',
      occurredAt: at(10, 21, 9),
      currency: 'USD',
    });
    addExpense(db, {
      amountCents: 4000,
      description: '',
      categoryId: 'groceries',
      occurredAt: at(10, 23, 9),
      currency: 'USD',
    });
    createHabit(db, { name: 'Drink water', note: 'Hydration matters', frequency: 'daily', routineId: null });
    const gone = createHabit(db, { name: 'Old hydration habit', frequency: 'daily', routineId: null });
    archiveHabit(db, gone);
    createHourNote(db, { date: '2024-10-24', hour: 15, text: 'Bring the latte cups back' });

    const latte = searchPlans(db, 'latte', now);
    expect(titles(latte.earlier)).toEqual(['expense 2024-10-21']);
    expect(titles(latte.comingUp)).toEqual(['note 2024-10-24']);
    const hydration = searchPlans(db, 'HYDRATION', now);
    expect(hydration.habits.map((r) => (r.kind === 'habit' ? r.habit.name : ''))).toEqual(['Drink water']);
    // spending with no description is found by its category
    const groceries = searchPlans(db, 'grocer', now);
    expect(titles(groceries.today)).toEqual(['expense 2024-10-23']);
  });
});
