import { fromWallTime, toWallTime } from '@/calendar/timezone';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { parseRuleParts, toRRule, type Repeat } from '@/recurrence';
import { reminderOffsets } from '@/reminders/store';

import {
  createEvent,
  deleteEvent,
  deleteOccurrence,
  eventsBetween,
  getEvent,
  updateEvent,
  updateOccurrence,
  type EventInput,
  type EventOccurrence,
} from './events';

const NY = 'America/New_York'; // the test phone's zone

function at(day: string, hour = 9, minute = 0, timeZone = NY): number {
  const [year, month, d] = day.split('-').map(Number);
  return fromWallTime({ year, month, day: d, hour, minute, second: 0 }, timeZone);
}

const event = (over: Partial<EventInput> = {}): EventInput => ({
  title: 'Dentist',
  startAt: at('2024-10-24', 15),
  endAt: at('2024-10-24', 16),
  timeZone: NY,
  ...over,
});

/** Yoga, Wednesdays 9–10 AM from Oct 2, 2024. */
function yoga(end: Repeat['end'] = { kind: 'never' }): EventInput {
  const startAt = at('2024-10-02', 9);
  return {
    title: 'Yoga',
    startAt,
    endAt: at('2024-10-02', 10),
    timeZone: NY,
    rrule: toRRule({ freq: 'weekly', every: 1, weekdays: [3], end }, { startAt, timeZone: NY, allDay: false }),
  };
}

const october = (db: Db) => eventsBetween(db, '2024-10-01', '2024-10-31');
const summary = (list: EventOccurrence[]) =>
  list.map((o) => {
    const w = toWallTime(o.startAt, NY);
    return `${o.days[0]} ${w.hour}:${String(w.minute).padStart(2, '0')} ${o.title}`;
  });
const on = (list: EventOccurrence[], day: string) => list.find((o) => o.days.includes(day))!;
/** What the event form saves when opened on an occurrence: its own values, with some changed. */
const form = (o: EventOccurrence, changes: Partial<EventInput> = {}): EventInput => ({ ...o, ...changes });

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('one-off events', () => {
  it('T-01.1 shows an event on its day and nowhere else', () => {
    createEvent(db, event());
    expect(summary(eventsBetween(db, '2024-10-20', '2024-10-26'))).toEqual(['2024-10-24 15:00 Dentist']);
    expect(eventsBetween(db, '2024-10-25', '2024-10-31')).toEqual([]);
  });

  it('T-01.2 an event with no time is all-day', () => {
    createEvent(db, event({ allDay: true, startAt: at('2024-10-24', 0), endAt: at('2024-10-25', 0) }));
    const [o] = eventsBetween(db, '2024-10-20', '2024-10-26');
    expect(o.allDay).toBe(true);
    expect(o.days).toEqual(['2024-10-24']);
  });

  it('T-01.3 an event needs a title', () => {
    expect(() => createEvent(db, event({ title: '   ' }))).toThrow();
    expect(eventsBetween(db, '2024-10-01', '2024-10-31')).toEqual([]);
  });

  it('T-11.1 keeps the moment for timed events and the date for all-day ones when zones differ', () => {
    createEvent(db, event({ title: 'Call', startAt: at('2024-10-24', 15, 0, 'Africa/Nairobi'), endAt: at('2024-10-24', 16, 0, 'Africa/Nairobi'), timeZone: 'Africa/Nairobi' }));
    // all-day on Oct 24 in Auckland: its midnight is 7 AM on Oct 23 in New York
    createEvent(db, event({ title: 'Holiday', allDay: true, timeZone: 'Pacific/Auckland', startAt: at('2024-10-24', 0, 0, 'Pacific/Auckland'), endAt: at('2024-10-25', 0, 0, 'Pacific/Auckland') }));
    const list = eventsBetween(db, '2024-10-20', '2024-10-26');
    expect(toWallTime(list.find((o) => o.title === 'Call')!.startAt, NY).hour).toBe(8); // 3 PM Nairobi = 8 AM New York
    expect(list.find((o) => o.title === 'Holiday')!.days).toEqual(['2024-10-24']);
  });

  it('T-11.2 an event crossing midnight shows on both days; one ending at midnight does not', () => {
    createEvent(db, event({ title: 'Night shift', startAt: at('2024-10-24', 23), endAt: at('2024-10-25', 1) }));
    createEvent(db, event({ title: 'Late show', startAt: at('2024-10-24', 22), endAt: at('2024-10-25', 0) }));
    const list = eventsBetween(db, '2024-10-20', '2024-10-26');
    expect(list.find((o) => o.title === 'Night shift')!.days).toEqual(['2024-10-24', '2024-10-25']);
    expect(list.find((o) => o.title === 'Late show')!.days).toEqual(['2024-10-24']);
  });

  it('T-02.1 editing changes the event everywhere, reminders included', () => {
    const id = createEvent(db, event(), [10]);
    updateEvent(db, id, event({ title: 'Dentist (moved)', startAt: at('2024-10-25', 11), endAt: at('2024-10-25', 12), location: ' Main St ' }), [30, 0]);
    expect(summary(eventsBetween(db, '2024-10-20', '2024-10-26'))).toEqual(['2024-10-25 11:00 Dentist (moved)']);
    expect(getEvent(db, id)!.location).toBe('Main St');
    expect(reminderOffsets(db, 'event', id)).toEqual([0, 30]);
  });

  it('T-02.2 delete hides the event; Undo brings it back with its reminders', () => {
    const id = createEvent(db, event(), [10, 30]);
    const undo = deleteEvent(db, id);
    expect(eventsBetween(db, '2024-10-20', '2024-10-26')).toEqual([]);
    expect(getEvent(db, id)!.deletedAt).not.toBeNull(); // soft delete, for Undo and later sync
    undo();
    expect(eventsBetween(db, '2024-10-20', '2024-10-26')).toHaveLength(1);
    expect(reminderOffsets(db, 'event', id)).toEqual([10, 30]);
  });
});

describe('repeating events', () => {
  it('lists each occurrence in range', () => {
    createEvent(db, yoga());
    expect(summary(october(db))).toEqual(['2024-10-02 9:00 Yoga', '2024-10-09 9:00 Yoga', '2024-10-16 9:00 Yoga', '2024-10-23 9:00 Yoga', '2024-10-30 9:00 Yoga']);
  });

  it('T-05.4 stays at 9:00 AM after the clocks change', () => {
    createEvent(db, yoga());
    const nov6 = on(eventsBetween(db, '2024-11-01', '2024-11-07'), '2024-11-06');
    expect(nov6.startAt).toBe(Date.UTC(2024, 10, 6, 14)); // EST now: 9 AM = 14:00 UTC
  });

  it('T-05.5 "Just this one" changes only that date', () => {
    const id = createEvent(db, yoga(), [10]);
    const oct16 = on(october(db), '2024-10-16');
    const changedId = updateOccurrence(db, oct16, { ...yoga(), title: 'Yoga in the park', startAt: at('2024-10-16', 11), endAt: at('2024-10-16', 12) }, 'this');
    expect(summary(october(db))).toEqual([
      '2024-10-02 9:00 Yoga',
      '2024-10-09 9:00 Yoga',
      '2024-10-16 11:00 Yoga in the park',
      '2024-10-23 9:00 Yoga',
      '2024-10-30 9:00 Yoga',
    ]);
    expect(reminderOffsets(db, 'event', changedId)).toEqual([10]); // took the series' reminder
    expect(on(october(db), '2024-10-16')).toMatchObject({ seriesId: id, eventId: changedId, rrule: yoga().rrule });

    // and changing it again updates the same row
    updateOccurrence(db, on(october(db), '2024-10-16'), form(on(october(db), '2024-10-16'), { title: 'Park yoga' }), 'this');
    expect(summary(october(db))[2]).toBe('2024-10-16 11:00 Park yoga');
  });

  it('T-05.6 "This one and the ones after" splits the series; earlier dates stay', () => {
    const id = createEvent(db, yoga());
    const oct16 = on(october(db), '2024-10-16');
    const newId = updateOccurrence(db, oct16, { ...yoga(), startAt: at('2024-10-16', 18), endAt: at('2024-10-16', 19) }, 'following');
    expect(summary(october(db))).toEqual(['2024-10-02 9:00 Yoga', '2024-10-09 9:00 Yoga', '2024-10-16 18:00 Yoga', '2024-10-23 18:00 Yoga', '2024-10-30 18:00 Yoga']);
    expect(newId).not.toBe(id);
    expect(parseRuleParts(getEvent(db, id)!.rrule!).get('UNTIL')).toBeDefined();
  });

  it('T-05.6 a repeat that stops after N times keeps its total when split', () => {
    createEvent(db, yoga({ kind: 'after', times: 5 }));
    const oct16 = on(october(db), '2024-10-16');
    updateOccurrence(db, oct16, { ...yoga({ kind: 'after', times: 5 }), startAt: at('2024-10-16', 18), endAt: at('2024-10-16', 19) }, 'following');
    expect(summary(eventsBetween(db, '2024-10-01', '2024-12-31'))).toEqual([
      '2024-10-02 9:00 Yoga',
      '2024-10-09 9:00 Yoga',
      '2024-10-16 18:00 Yoga',
      '2024-10-23 18:00 Yoga',
      '2024-10-30 18:00 Yoga',
    ]);
  });

  it('"All of them" from a later date moves the whole series by the same clock time', () => {
    const id = createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-23'), { ...yoga(), title: 'Yoga', startAt: at('2024-10-23', 7, 30), endAt: at('2024-10-23', 8, 30) }, 'all');
    expect(summary(october(db)).map((s) => s.slice(11))).toEqual(Array(5).fill('7:30 Yoga'));
    expect(toWallTime(getEvent(db, id)!.startAt, NY)).toMatchObject({ day: 2, hour: 7, minute: 30 });
  });

  it('"All of them": new details reach single changes; new times replace them', () => {
    createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-16'), { ...yoga(), startAt: at('2024-10-16', 11), endAt: at('2024-10-16', 12) }, 'this');

    updateOccurrence(db, on(october(db), '2024-10-23'), form(on(october(db), '2024-10-23'), { title: 'Stretch' }), 'all');
    expect(summary(october(db))).toContain('2024-10-16 11:00 Stretch'); // kept its own time, took the new title

    updateOccurrence(db, on(october(db), '2024-10-09'), { ...yoga(), title: 'Stretch', startAt: at('2024-10-09', 8), endAt: at('2024-10-09', 9) }, 'all');
    expect(summary(october(db)).map((s) => s.slice(11))).toEqual(Array(5).fill('8:00 Stretch'));
  });

  it('editing a moved occurrence for all of them without touching its time keeps it moved', () => {
    createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-16'), { ...yoga(), startAt: at('2024-10-16', 11), endAt: at('2024-10-16', 12) }, 'this');
    const moved = on(october(db), '2024-10-16');
    updateOccurrence(db, moved, form(moved, { title: 'Stretch' }), 'all');
    expect(summary(october(db))).toEqual([
      '2024-10-02 9:00 Stretch',
      '2024-10-09 9:00 Stretch',
      '2024-10-16 11:00 Stretch',
      '2024-10-23 9:00 Stretch',
      '2024-10-30 9:00 Stretch',
    ]);
  });

  it('T-05.7 deleting one occurrence removes only that date; Undo restores it', () => {
    createEvent(db, yoga());
    const undo = deleteOccurrence(db, on(october(db), '2024-10-16'), 'this');
    expect(october(db).flatMap((o) => o.days)).toEqual(['2024-10-02', '2024-10-09', '2024-10-23', '2024-10-30']);
    undo();
    expect(october(db)).toHaveLength(5);
  });

  it('deletes a changed occurrence the same way', () => {
    createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-16'), form(on(october(db), '2024-10-16'), { title: 'Park yoga' }), 'this');
    const undo = deleteOccurrence(db, on(october(db), '2024-10-16'), 'this');
    expect(october(db)).toHaveLength(4);
    undo();
    expect(summary(october(db))[2]).toBe('2024-10-16 9:00 Park yoga');
  });

  it('deletes this one and the ones after, with Undo', () => {
    createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-23'), form(on(october(db), '2024-10-23'), { title: 'Park yoga' }), 'this');
    const undo = deleteOccurrence(db, on(october(db), '2024-10-16'), 'following');
    expect(october(db).flatMap((o) => o.days)).toEqual(['2024-10-02', '2024-10-09']);
    undo();
    expect(summary(october(db))).toContain('2024-10-23 9:00 Park yoga');
    expect(october(db)).toHaveLength(5);
  });

  it('deletes the whole series from any occurrence, with Undo', () => {
    createEvent(db, yoga());
    const undo = deleteOccurrence(db, on(october(db), '2024-10-23'), 'all');
    expect(october(db)).toEqual([]);
    undo();
    expect(october(db)).toHaveLength(5);
  });

  it('turning off the repeat for all of them leaves one event', () => {
    createEvent(db, yoga());
    updateOccurrence(db, on(october(db), '2024-10-02'), form(on(october(db), '2024-10-02'), { rrule: null }), 'all');
    expect(summary(october(db))).toEqual(['2024-10-02 9:00 Yoga']);
  });
});
