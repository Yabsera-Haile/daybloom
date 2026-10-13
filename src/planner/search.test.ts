import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { readSettings } from '@/settings';
import { toRRule } from '@/recurrence';

import { createEvent } from './events';
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
    expect(searchPlans(db, '   ', now)).toEqual({ today: [], comingUp: [], earlier: [] });
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
});
