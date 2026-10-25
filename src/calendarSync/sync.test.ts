import { eq } from 'drizzle-orm';

import { fromWallTime, localDayStart } from '@/calendar/timezone';
import { events } from '@/db/schema';
import { withTestDb } from '@/db/testDb';
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
} from '@/planner/events';

import { FakeCalendar } from './fake';
import { answerInvite, forgetPhoneEvents, moveToCalendar, pull, push } from './sync';

const getDb = withTestDb();
const NOW = Date.UTC(2026, 9, 1);
const ny = (month: number, day: number, hour: number, minute = 0) =>
  fromWallTime({ year: 2026, month, day, hour, minute, second: 0 }, 'America/New_York');
const HOUR = 3_600_000;

const between = () => eventsBetween(getDb(), '2026-10-01', '2026-12-31');
const titlesOn = (day: string) =>
  between()
    .filter((o) => o.days.includes(day))
    .map((o) => o.title);
const inputOf = (o: EventOccurrence, over: Partial<EventInput> = {}): EventInput => ({
  title: o.title,
  startAt: o.startAt,
  endAt: o.endAt,
  timeZone: o.timeZone,
  allDay: o.allDay,
  rrule: o.rrule,
  calendarId: o.calendarId,
  ...over,
});

/** A phone with your Google calendar, a read-only Holidays one and a Work one that isn't shown. */
function aPhone() {
  const phone = new FakeCalendar([{ name: 'you@gmail.com' }, { name: 'Holidays', writable: false }, { name: 'Work' }]);
  const shown = phone.calendarList.slice(0, 2);
  return { phone, shown };
}

describe('phone calendars', () => {
  it('T-GC02.1 brings in one-offs, repeats with their changed, cancelled and left-out occurrences, holidays and invitations', async () => {
    const { phone, shown } = aPhone();
    phone.add({ title: 'Dentist', startAt: ny(10, 5, 15), endAt: ny(10, 5, 16) });
    const yoga = phone.add({
      title: 'Yoga',
      startAt: ny(10, 6, 7),
      duration: 'P3600S',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      exdate: '20261013T110000Z', // Tuesday 13 October, 7 AM in New York
    });
    phone.add({
      title: 'Yoga, later',
      startAt: ny(10, 20, 8),
      endAt: ny(10, 20, 9),
      originalId: yoga,
      originalStartAt: ny(10, 20, 7),
    });
    phone.add({
      title: 'Yoga',
      startAt: ny(10, 27, 7),
      endAt: ny(10, 27, 8),
      originalId: yoga,
      originalStartAt: ny(10, 27, 7),
      cancelled: true,
    });
    phone.add({
      calendarId: '2',
      title: 'Thanksgiving',
      allDay: true,
      startAt: Date.UTC(2026, 10, 26),
      endAt: Date.UTC(2026, 10, 27),
      timeZone: 'UTC',
    });
    phone.add({
      title: 'Team lunch',
      startAt: ny(10, 8, 12),
      endAt: ny(10, 8, 13),
      hasGuests: true,
      isOrganizer: false,
      selfStatus: 3,
      organizer: 'boss@work.com',
    });
    phone.add({ calendarId: '3', title: 'Work only', startAt: ny(10, 9, 9), endAt: ny(10, 9, 10) });

    expect(await pull(getDb(), phone, shown, NOW)).toEqual({ added: 6, changed: 0, removed: 0 });
    expect(titlesOn('2026-10-05')).toEqual(['Dentist']);
    expect(titlesOn('2026-10-06')).toEqual(['Yoga']);
    expect(titlesOn('2026-10-13')).toEqual([]);
    expect(titlesOn('2026-10-20')).toEqual(['Yoga, later']);
    expect(titlesOn('2026-10-27')).toEqual([]);
    expect(titlesOn('2026-11-03')).toEqual(['Yoga']);
    expect(titlesOn('2026-10-09')).toEqual([]);
    const holiday = between().find((o) => o.title === 'Thanksgiving')!;
    expect(holiday).toMatchObject({ allDay: true, days: ['2026-11-26'], readOnly: true, calendarId: '2' });
    expect(between().find((o) => o.title === 'Team lunch')).toMatchObject({ invite: 'invited', readOnly: true });

    // nothing changed: nothing to bring in, nothing to send
    expect(await pull(getDb(), phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(await push(getDb(), phone)).toBe(0);
  });

  it('T-GC02.2 changes on the phone come in, but not over a change made here that is still on its way', async () => {
    const { phone, shown } = aPhone();
    const dentist = phone.add({ title: 'Dentist', startAt: ny(10, 5, 15), endAt: ny(10, 5, 16) });
    const lunch = phone.add({ title: 'Lunch', startAt: ny(10, 8, 12), endAt: ny(10, 8, 13) });
    const piano = phone.add({ title: 'Piano', startAt: ny(10, 9, 17), endAt: ny(10, 9, 18) });
    await pull(getDb(), phone, shown, NOW);

    phone.items.set(dentist, {
      ...phone.items.get(dentist)!,
      title: 'Dentist (moved)',
      startAt: ny(10, 6, 9),
      endAt: ny(10, 6, 10),
    });
    await phone.remove(lunch);
    const mine = between().find((o) => o.title === 'Piano')!;
    updateEvent(getDb(), mine.eventId, inputOf(mine, { title: 'Piano lesson' }));
    phone.items.set(piano, { ...phone.items.get(piano)!, title: 'Piano (phone)' });

    expect(await pull(getDb(), phone, shown, NOW)).toEqual({ added: 0, changed: 1, removed: 1 });
    expect(titlesOn('2026-10-06')).toEqual(['Dentist (moved)']);
    expect(titlesOn('2026-10-08')).toEqual([]);
    expect(titlesOn('2026-10-09')).toEqual(['Piano lesson']);
    await push(getDb(), phone);
    expect(phone.items.get(piano)!.title).toBe('Piano lesson');
  });

  it('T-GC03.1 an event saved to a calendar goes to the phone; changes, deleting and Undo follow it there', async () => {
    const { phone, shown } = aPhone();
    const db = getDb();
    const id = createEvent(db, {
      title: 'Piano',
      startAt: ny(10, 9, 17),
      endAt: ny(10, 9, 18),
      timeZone: 'America/New_York',
      calendarId: '1',
    });
    expect(await push(db, phone)).toBe(1);
    const onPhone = () => [...phone.items.values()].map((e) => e.title);
    expect(onPhone()).toEqual(['Piano']);
    expect(getEvent(db, id)!.externalId).toMatch(/^1\/\d+$/);

    const o = between()[0];
    updateEvent(db, id, inputOf(o, { title: 'Piano lesson' }));
    expect(await push(db, phone)).toBe(1);
    expect(onPhone()).toEqual(['Piano lesson']);

    const undo = deleteEvent(db, id);
    await push(db, phone);
    expect(onPhone()).toEqual([]);
    undo();
    await push(db, phone);
    expect(onPhone()).toEqual(['Piano lesson']);
    expect(await push(db, phone)).toBe(0);
    // and the phone's copy is the one Daybloom knows: a pull changes nothing
    expect(await pull(db, phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
  });

  it('T-GC03.2 an all-day repeat made here goes at midnight UTC with a length, and still falls on its days', async () => {
    const { phone, shown } = aPhone();
    const db = getDb();
    createEvent(db, {
      title: 'Bins out',
      allDay: true,
      startAt: localDayStart('2026-11-02'),
      endAt: localDayStart('2026-11-03'),
      timeZone: 'America/New_York',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      calendarId: '1',
    });
    await push(db, phone);
    expect([...phone.items.values()][0]).toMatchObject({
      allDay: true,
      startAt: Date.UTC(2026, 10, 2),
      endAt: null,
      duration: 'P1D',
      timeZone: 'UTC',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    });
    expect(titlesOn('2026-11-09')).toEqual(['Bins out']);
    expect(await pull(db, phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(titlesOn('2026-11-16')).toEqual(['Bins out']);
  });

  it('T-GC03.3 changing, cancelling and splitting a repeating event reach the phone as Android keeps them', async () => {
    const { phone, shown } = aPhone();
    const db = getDb();
    createEvent(db, {
      title: 'Run',
      startAt: ny(10, 5, 6),
      endAt: ny(10, 5, 7),
      timeZone: 'America/New_York',
      rrule: 'FREQ=DAILY',
      calendarId: '1',
    });
    await push(db, phone);
    const series = [...phone.items.values()][0];
    const on = (day: string) => between().find((o) => o.days.includes(day))!;

    updateOccurrence(db, on('2026-10-06'), inputOf(on('2026-10-06'), { title: 'Long run' }), 'this');
    deleteOccurrence(db, on('2026-10-07'), 'this');
    await push(db, phone);
    const changes = [...phone.items.values()].filter((e) => e.originalId === series.id);
    expect(changes.map((e) => [e.title, e.originalStartAt, e.cancelled])).toEqual([
      ['Long run', ny(10, 6, 6), false],
      ['Run', ny(10, 7, 6), true],
    ]);

    // all of them an hour later: the changed occurrences go, as in Google Calendar
    const first = on('2026-10-05');
    updateOccurrence(db, first, inputOf(first, { startAt: first.startAt + HOUR, endAt: first.endAt + HOUR }), 'all');
    await push(db, phone);
    expect([...phone.items.values()].map((e) => [e.title, e.startAt])).toEqual([['Run', ny(10, 5, 7)]]);

    // from the 10th on, called "Evening run" at 6 PM: the first stops, a second starts
    const tenth = on('2026-10-10');
    updateOccurrence(
      db,
      tenth,
      inputOf(tenth, { title: 'Evening run', startAt: ny(10, 10, 18), endAt: ny(10, 10, 19) }),
      'following',
    );
    await push(db, phone);
    const rules = [...phone.items.values()].map((e) => [e.title, e.rrule]);
    expect(rules).toEqual([
      ['Run', expect.stringMatching(/^FREQ=DAILY;UNTIL=2026101\dT\d{6}Z$/)],
      ['Evening run', 'FREQ=DAILY'],
    ]);
    const before = between().map((o) => [o.title, o.startAt]);
    expect(await pull(db, phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(between().map((o) => [o.title, o.startAt])).toEqual(before);
  });

  it('T-GC04.2 unticked, an event leaves the phone and stays in Daybloom', async () => {
    const { phone } = aPhone();
    const db = getDb();
    const id = createEvent(db, {
      title: 'Piano',
      startAt: ny(10, 9, 17),
      endAt: ny(10, 9, 18),
      timeZone: 'America/New_York',
      calendarId: '1',
    });
    await push(db, phone);
    updateEvent(db, id, inputOf(between()[0], { calendarId: null }));
    await push(db, phone);
    expect(phone.items.size).toBe(0);
    expect(getEvent(db, id)).toMatchObject({ source: 'local', calendarId: null, externalId: null });
    expect(titlesOn('2026-10-09')).toEqual(['Piano']);
  });

  it('T-GC06.1 events made in Daybloom move to a calendar once, changed occurrences and all, with nothing doubled', async () => {
    const { phone, shown } = aPhone();
    const db = getDb();
    createEvent(db, { title: 'Dentist', startAt: ny(10, 5, 15), endAt: ny(10, 5, 16), timeZone: 'America/New_York' });
    createEvent(db, {
      title: 'Swim',
      startAt: ny(10, 6, 7),
      endAt: ny(10, 6, 8),
      timeZone: 'America/New_York',
      rrule: 'FREQ=WEEKLY',
    });
    const second = between().find((o) => o.days.includes('2026-10-13'))!;
    updateOccurrence(db, second, inputOf(second, { title: 'Swim (pool closed?)' }), 'this');
    const before = between().map((o) => [o.title, o.startAt]);

    expect(moveToCalendar(db, '1')).toBe(2);
    expect(await push(db, phone)).toBe(3);
    expect([...phone.items.values()].map((e) => e.title).sort()).toEqual(['Dentist', 'Swim', 'Swim (pool closed?)']);
    expect(await push(db, phone)).toBe(0);
    expect(await pull(db, phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(between().map((o) => [o.title, o.startAt])).toEqual(before);
  });

  it('T-GC05.1 answering an invitation shows here at once and goes to the phone', async () => {
    const { phone, shown } = aPhone();
    const lunch = phone.add({
      title: 'Team lunch',
      startAt: ny(10, 8, 12),
      endAt: ny(10, 8, 13),
      hasGuests: true,
      isOrganizer: false,
      selfStatus: 3,
    });
    await pull(getDb(), phone, shown, NOW);
    const o = between()[0];
    await answerInvite(getDb(), phone, o.eventId, 'accepted');
    expect(between()[0].invite).toBe('accepted');
    expect(phone.items.get(lunch)!.selfStatus).toBe(1);
    expect(await pull(getDb(), phone, shown, NOW)).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(between()[0].invite).toBe('accepted');
  });

  it('T-GC01.3 a calendar no longer shown, or all of them, leave Daybloom and stay on the phone', async () => {
    const { phone, shown } = aPhone();
    const db = getDb();
    phone.add({ title: 'Dentist', startAt: ny(10, 5, 15), endAt: ny(10, 5, 16) });
    phone.add({
      calendarId: '2',
      title: 'Thanksgiving',
      allDay: true,
      startAt: Date.UTC(2026, 10, 26),
      endAt: Date.UTC(2026, 10, 27),
    });
    await pull(db, phone, shown, NOW);
    expect(await pull(db, phone, shown.slice(0, 1), NOW)).toEqual({ added: 0, changed: 0, removed: 1 });
    expect(between().map((o) => o.title)).toEqual(['Dentist']);
    forgetPhoneEvents(db);
    expect(between()).toEqual([]);
    expect(await push(db, phone)).toBe(0);
    expect(phone.items.size).toBe(2);
    expect(db.select().from(events).where(eq(events.source, 'device')).all()).toEqual([]);
  });
});
