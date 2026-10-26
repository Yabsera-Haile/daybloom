import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense } from '@/budget/entries';
import { setBudget } from '@/budget/plans';
import { calendarRemovals, events } from '@/db/schema';
import { createTestDb, withTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { createHabit, ensureDefaultRoutines, setHabitDone } from '@/habits/store';
import { ensureDefaultCategories } from '@/planner/categories';
import { createEvent, eventsBetween, updateOccurrence } from '@/planner/events';
import { createTask } from '@/planner/tasks';
import { readSettings, saveSetting } from '@/settings';
import { reminderOffsets } from '@/reminders/store';

import { backupOf } from './export';
import { readBackup, restoreBackup } from './restore';

const getDb = withTestDb();
const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime();
const tablesOf = (db: Db) => backupOf(db, 0).tables;
/** A backup as it comes back from a file. */
const fileOf = (db: Db) => JSON.stringify(backupOf(db, at(26, 9)));

/** A phone with a bit of everything on it. */
function fillIn(db: Db, who: string) {
  ensureDefaultCategories(db);
  ensureDefaultRoutines(db);
  ensureDefaultSpendCategories(db);
  createEvent(
    db,
    { title: `${who}'s dentist`, startAt: at(27, 15), endAt: at(27, 16), timeZone: 'America/New_York' },
    [10],
  );
  createEvent(db, {
    title: 'Swim',
    startAt: at(26, 7),
    endAt: at(26, 8),
    timeZone: 'America/New_York',
    rrule: 'FREQ=WEEKLY',
  });
  const swim = eventsBetween(db, '2026-11-02', '2026-11-02')[0];
  updateOccurrence(db, swim, { ...swim, title: 'Swim (pool closed?)' }, 'this');
  createTask(db, { title: `${who}'s plants`, date: '2026-10-26' });
  const tea = createHabit(db, { name: 'Herbal tea', frequency: 'daily', routineId: 'evening' });
  setHabitDone(db, { id: tea, frequency: 'daily' }, '2026-10-25', true, 1);
  addExpense(db, {
    amountCents: 625,
    description: 'Latte',
    categoryId: 'dining',
    occurredAt: at(25, 9),
    currency: 'USD',
  });
  setBudget(db, 'month', 400000, '2026-10-01', 1);
  saveSetting(db, 'name', who);
}

describe('restoring a backup', () => {
  it('T-ST07.1 a backup comes back whole on a new phone: events, repeats, to-dos, habits, ticks, spending, settings', async () => {
    const old = await createTestDb();
    fillIn(old, 'Ada');
    const read = readBackup(fileOf(old));
    if (!read.ok) throw new Error('unreadable');
    expect(read.summary).toMatchObject({ events: 2, todos: 1, habits: 1, expenses: 1 });

    const fresh = getDb();
    restoreBackup(fresh, read.backup);
    expect(tablesOf(fresh)).toEqual(tablesOf(old));
    expect(eventsBetween(fresh, '2026-11-02', '2026-11-02').map((o) => o.title)).toEqual(['Swim (pool closed?)']);
    expect(readSettings(fresh).name).toBe('Ada');
  });

  it('T-ST07.2 it replaces what was there, and Undo brings that back', async () => {
    const old = await createTestDb();
    fillIn(old, 'Ada');
    const db = getDb();
    fillIn(db, 'Ben');
    const mine = tablesOf(db);

    const read = readBackup(fileOf(old));
    if (!read.ok) throw new Error('unreadable');
    const undo = restoreBackup(db, read.backup);
    expect(readSettings(db).name).toBe('Ada');
    expect(eventsBetween(db, '2026-10-27', '2026-10-27').map((o) => o.title)).toEqual(["Ada's dentist"]);

    undo();
    expect(tablesOf(db)).toEqual(mine);
  });

  it("T-ST07.3 this phone's calendars stay as they are, and nothing is removed from them", async () => {
    const old = await createTestDb();
    fillIn(old, 'Ada');
    // the old phone showed a Google calendar of its own
    old
      .insert(events)
      .values({
        id: 'old-phone',
        title: 'Old phone event',
        startAt: at(28, 9),
        endAt: at(28, 10),
        timeZone: 'UTC',
        source: 'device',
        calendarId: '9',
        externalId: '9/1',
      })
      .run();
    saveSetting(old, 'phoneCalendars', ['9']);

    const db = getDb();
    const id = createEvent(
      db,
      { title: 'From Google', startAt: at(29, 9), endAt: at(29, 10), timeZone: 'America/New_York', calendarId: '1' },
      [30],
    );
    db.update(events).set({ externalId: '1/5' }).run();
    saveSetting(db, 'phoneCalendars', ['1']);
    saveSetting(db, 'saveToCalendar', '1');

    const read = readBackup(fileOf(old));
    if (!read.ok) throw new Error('unreadable');
    restoreBackup(db, read.backup);
    const titles = eventsBetween(db, '2026-10-26', '2026-10-31').map((o) => o.title);
    expect(titles).toContain('From Google');
    expect(titles).not.toContain('Old phone event');
    expect(reminderOffsets(db, 'event', id)).toEqual([30]);
    expect(readSettings(db)).toMatchObject({ phoneCalendars: ['1'], saveToCalendar: '1' });
    expect(db.select().from(calendarRemovals).all()).toEqual([]);
  });

  it('T-ST07.4 a file that isn’t a Daybloom backup, or is from a newer Daybloom, is refused; an older one is fine', async () => {
    expect(readBackup('not json')).toEqual({ ok: false, problem: 'notBackup' });
    expect(readBackup('{"app":"Something else","tables":{}}')).toEqual({ ok: false, problem: 'notBackup' });
    const backup = JSON.parse(fileOf(getDb()));
    expect(readBackup(JSON.stringify({ ...backup, dataVersion: 999 }))).toEqual({ ok: false, problem: 'newer' });
    // an early backup, from before bills and bank texts
    const { bills: _bills, smsSenders: _senders, smsPatterns: _patterns, ...early } = backup.tables;
    const read = readBackup(JSON.stringify({ ...backup, dataVersion: 3, tables: early }));
    expect(read.ok).toBe(true);
    if (read.ok) restoreBackup(getDb(), read.backup);
  });
});
