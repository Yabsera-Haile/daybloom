import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import {
  createEvent,
  deleteEvent,
  deleteOccurrence,
  eventsBetween,
  updateEvent,
  type EventInput,
} from '@/planner/events';
import { createTask, setTaskDone } from '@/planner/tasks';
import { toRRule } from '@/recurrence';

import { MAX_SCHEDULED, plannedReminders, reminderChanges } from './plan';

const NY = 'America/New_York';
const at = (d: number, h: number, m = 0) => new Date(2024, 9, d, h, m).getTime();
const now = at(23, 13, 15); // Wed Oct 23, 1:15 PM

const dentist = (over: Partial<EventInput> = {}): EventInput => ({
  title: 'Dentist',
  startAt: at(24, 15),
  endAt: at(24, 16),
  timeZone: NY,
  location: 'Main St',
  ...over,
});
const plan = (db: Db) => plannedReminders(db, now, '12h');
const asScheduled = (db: Db) => plan(db).map((p) => ({ id: p.id, sig: p.data.sig }));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('reminders', () => {
  it('T-04.1 an event at 3:00 PM with "10 min before" rings at 2:50 PM, time and title first', () => {
    createEvent(db, dentist(), [10]);
    const [r] = plan(db);
    expect(r.fireAt).toBe(at(24, 14, 50));
    expect(r.title).toBe('3:00 PM · Dentist');
    expect(r.body).toBe('In 10 minutes · Main St');
  });

  it('T-04.2 two reminders on one event are both scheduled', () => {
    createEvent(db, dentist(), [10, 1440]);
    expect(plan(db).map((r) => r.fireAt)).toEqual([at(23, 15), at(24, 14, 50)]);
    expect(plan(db)[0].body).toBe('Tomorrow · Main St');
  });

  it('T-04.3 with 200 coming up, only the next ones are scheduled, soonest first', () => {
    const startAt = at(24, 9);
    createEvent(
      db,
      {
        title: 'Stretch',
        startAt,
        endAt: startAt + 900_000,
        timeZone: NY,
        rrule: toRRule({ freq: 'daily', every: 1, end: { kind: 'never' } }, { startAt, timeZone: NY, allDay: false }),
      },
      [0, 10, 30, 60, 1440],
    );
    const planned = plan(db);
    expect(planned).toHaveLength(MAX_SCHEDULED);
    expect(MAX_SCHEDULED).toBeLessThanOrEqual(64);
    expect(planned.map((r) => r.fireAt)).toEqual([...planned.map((r) => r.fireAt)].sort((a, b) => a - b));
  });

  it('T-04.4 moving an event cancels the old reminder and schedules the new one', () => {
    const id = createEvent(db, dentist(), [10]);
    const before = asScheduled(db);
    updateEvent(db, id, dentist({ startAt: at(25, 11), endAt: at(25, 12) }));
    const changes = reminderChanges(before, plan(db));
    expect(changes.cancel).toEqual([before[0].id]);
    expect(changes.add.map((r) => r.fireAt)).toEqual([at(25, 10, 50)]);
    expect(reminderChanges(asScheduled(db), plan(db))).toEqual({ cancel: [], add: [] }); // nothing to do once in step
  });

  it('T-02.3 a deleted event has no reminders left', () => {
    const id = createEvent(db, dentist(), [10]);
    const before = asScheduled(db);
    deleteEvent(db, id);
    expect(reminderChanges(before, plan(db))).toEqual({ cancel: [before[0].id], add: [] });
  });

  it('T-05.7 deleting one occurrence cancels only its reminder', () => {
    const startAt = at(24, 9);
    createEvent(
      db,
      {
        title: 'Stretch',
        startAt,
        endAt: startAt + 900_000,
        timeZone: NY,
        rrule: toRRule(
          { freq: 'daily', every: 1, end: { kind: 'after', times: 3 } },
          { startAt, timeZone: NY, allDay: false },
        ),
      },
      [0],
    );
    const before = asScheduled(db);
    deleteOccurrence(db, eventsBetween(db, '2024-10-25', '2024-10-25')[0], 'this');
    expect(reminderChanges(before, plan(db)).cancel).toEqual([before[1].id]);
    expect(plan(db)).toHaveLength(2);
  });

  it('to-dos ring before they are due, until ticked; past and untimed ones never', () => {
    const id = createTask(
      db,
      { title: 'Submit tax paperwork', date: '2024-10-23', dueTime: '17:00', urgent: true, listLabel: 'Finances' },
      [60],
    );
    createTask(db, { title: 'Water the palm', date: '2024-10-23' }, [10]);
    createTask(db, { title: 'Was due this morning', date: '2024-10-23', dueTime: '09:00' }, [0]);
    expect(plan(db).map((r) => [r.title, r.body, r.fireAt, r.urgent])).toEqual([
      ['Due 5:00 PM · Submit tax paperwork', 'Urgent · Finances', at(23, 16), true],
    ]);
    setTaskDone(db, id, true);
    expect(plan(db)).toEqual([]);
  });

  it('all-day events ring at 9 AM (the "1 day before" one, 9 AM today, has already passed)', () => {
    createEvent(
      db,
      dentist({ title: "Mom's birthday", allDay: true, startAt: at(24, 0), endAt: at(25, 0), location: null }),
      [0, 1440],
    );
    expect(plan(db).map((r) => [r.fireAt, r.title])).toEqual([[at(24, 9), "All day · Mom's birthday"]]);
  });
});
