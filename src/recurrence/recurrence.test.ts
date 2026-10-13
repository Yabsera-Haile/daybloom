import { fromWallTime, toWallTime } from '@/calendar/timezone';

import { describeRepeat, describeRepeatEnd } from './describe';
import { countBefore, expandSeries, type Series } from './expand';
import { fromRRule, stopBefore, toRRule, type Repeat } from './rule';

const NY = 'America/New_York';

function series(start: [number, number, number, number?], repeat: Repeat, timeZone = NY, allDay = false): Series {
  const [y, m, d, h = 9] = start;
  const startAt = fromWallTime({ year: y, month: m, day: d, hour: allDay ? 0 : h, minute: 0, second: 0 }, timeZone);
  const endAt = allDay
    ? fromWallTime({ year: y, month: m, day: d + 1, hour: 0, minute: 0, second: 0 }, timeZone)
    : startAt + 3_600_000;
  const timing = { startAt, timeZone, allDay };
  return { ...timing, endAt, rrule: toRRule(repeat, timing) };
}

const years = (from: number, to: number) => [Date.UTC(from, 0, 1), Date.UTC(to + 1, 0, 1)] as const;
const days = (s: Series, from: number, to: number) =>
  expandSeries(s, ...years(from, to)).map((o) => {
    const w = toWallTime(o.startAt, s.timeZone);
    return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
  });

describe('repeats', () => {
  it('T-05.1 weekly on Tuesday and Thursday for 6 weeks gives exactly 12', () => {
    const s = series([2024, 10, 1], { freq: 'weekly', every: 1, weekdays: [2, 4], end: { kind: 'on', day: '2024-11-07' } });
    expect(days(s, 2024, 2025)).toHaveLength(12);
    expect(days(s, 2024, 2025).at(-1)).toBe('2024-11-07');
  });

  it('T-05.2 monthly on the 31st skips shorter months, like Google Calendar', () => {
    const s = series([2024, 1, 31], { freq: 'monthly', every: 1, end: { kind: 'never' } });
    expect(days(s, 2024, 2024)).toEqual(['2024-01-31', '2024-03-31', '2024-05-31', '2024-07-31', '2024-08-31', '2024-10-31', '2024-12-31']);
  });

  it('T-05.3 yearly on Feb 29 happens only in leap years', () => {
    const s = series([2024, 2, 29], { freq: 'yearly', every: 1, end: { kind: 'never' } });
    expect(days(s, 2024, 2033)).toEqual(['2024-02-29', '2028-02-29', '2032-02-29']);
  });

  it('T-05.4 a weekly 9:00 AM stays 9:00 AM across a daylight-saving change', () => {
    const ny = series([2024, 10, 21], { freq: 'weekly', every: 1, weekdays: [1], end: { kind: 'after', times: 3 } });
    expect(expandSeries(ny, ...years(2024, 2024)).map((o) => o.startAt)).toEqual([
      Date.UTC(2024, 9, 21, 13),
      Date.UTC(2024, 9, 28, 13),
      Date.UTC(2024, 10, 4, 14), // clocks went back on Nov 3
    ]);
    // a zone other than the phone's (London changes a week earlier)
    const london = series([2024, 10, 21], { freq: 'weekly', every: 1, weekdays: [1], end: { kind: 'after', times: 2 } }, 'Europe/London');
    expect(expandSeries(london, ...years(2024, 2024)).map((o) => toWallTime(o.startAt, 'Europe/London').hour)).toEqual([9, 9]);
    expect(expandSeries(london, ...years(2024, 2024)).map((o) => o.startAt)).toEqual([Date.UTC(2024, 9, 21, 8), Date.UTC(2024, 9, 28, 9)]);
  });

  it('T-05.8 nothing after the end date or the last time', () => {
    const until = series([2024, 10, 1], { freq: 'daily', every: 1, end: { kind: 'on', day: '2024-10-05' } });
    expect(days(until, 2024, 2025)).toEqual(['2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05']);
    const count = series([2024, 10, 1], { freq: 'daily', every: 2, end: { kind: 'after', times: 3 } });
    expect(days(count, 2024, 2025)).toEqual(['2024-10-01', '2024-10-03', '2024-10-05']);
    const allDay = series([2024, 10, 1], { freq: 'daily', every: 1, end: { kind: 'on', day: '2024-10-03' } }, NY, true);
    expect(days(allDay, 2024, 2025)).toEqual(['2024-10-01', '2024-10-02', '2024-10-03']);
  });

  it('lists only occurrences that overlap the asked range, including one that started before it', () => {
    const s = series([2024, 10, 1, 23], { freq: 'daily', every: 1, end: { kind: 'never' } }); // 11 PM to midnight
    const from = fromWallTime({ year: 2024, month: 10, day: 10, hour: 23, minute: 30, second: 0 }, NY);
    const occ = expandSeries(s, from, from + 60_000);
    expect(occ).toHaveLength(1);
    expect(toWallTime(occ[0].startAt, NY)).toMatchObject({ day: 10, hour: 23 });
  });
});

describe('repeat rules', () => {
  const timed = { startAt: fromWallTime({ year: 2024, month: 10, day: 23, hour: 9, minute: 0, second: 0 }, NY), timeZone: NY, allDay: false };

  it('writes rules Google Calendar understands', () => {
    expect(toRRule({ freq: 'weekly', every: 1, weekdays: [4, 2, 2], end: { kind: 'never' } }, timed)).toBe('FREQ=WEEKLY;BYDAY=TU,TH');
    expect(toRRule({ freq: 'daily', every: 2, end: { kind: 'after', times: 10 } }, timed)).toBe('FREQ=DAILY;INTERVAL=2;COUNT=10');
    // until the end of Dec 18 in New York, written in UTC
    expect(toRRule({ freq: 'monthly', every: 1, end: { kind: 'on', day: '2024-12-18' } }, timed)).toBe('FREQ=MONTHLY;UNTIL=20241219T045959Z');
    expect(toRRule({ freq: 'yearly', every: 1, end: { kind: 'on', day: '2030-10-23' } }, { ...timed, allDay: true })).toBe('FREQ=YEARLY;UNTIL=20301023');
  });

  it('reads its own rules back', () => {
    const repeats: Repeat[] = [
      { freq: 'daily', every: 1, end: { kind: 'never' } },
      { freq: 'weekly', every: 2, weekdays: [1, 3, 5], end: { kind: 'after', times: 6 } },
      { freq: 'monthly', every: 1, end: { kind: 'on', day: '2025-01-23' } },
      { freq: 'yearly', every: 1, end: { kind: 'never' } },
    ];
    for (const r of repeats) {
      expect(fromRRule(toRRule(r, timed), timed)).toEqual(r);
      expect(fromRRule(toRRule(r, { ...timed, allDay: true }), { ...timed, allDay: true })).toEqual(r);
    }
  });

  it('fills in the weekday of a weekly rule without one, and declines rules the form cannot show', () => {
    expect(fromRRule('RRULE:FREQ=WEEKLY', timed)).toEqual({ freq: 'weekly', every: 1, weekdays: [3], end: { kind: 'never' } });
    expect(fromRRule('FREQ=MONTHLY;BYDAY=2TU', timed)).toBeNull();
    expect(fromRRule('FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR', timed)).toBeNull();
  });

  it('stops a series just before one of its occurrences', () => {
    const s = series([2024, 10, 1], { freq: 'daily', every: 1, end: { kind: 'after', times: 10 } });
    const fifth = expandSeries(s, ...years(2024, 2024))[4];
    expect(countBefore(s, fifth.startAt)).toBe(4);
    const stopped = { ...s, rrule: stopBefore(s.rrule, fifth.startAt, s) };
    expect(stopped.rrule).not.toContain('COUNT');
    expect(days(stopped, 2024, 2024)).toEqual(['2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04']);
  });
});

describe('repeats in plain words', () => {
  const words = (r: Repeat) => describeRepeat(r, '2024-10-23', 1, 'en-US');
  const never = { kind: 'never' } as const;

  it('T-EV05.1 "Every Tuesday", "Every month on the 23rd"', () => {
    expect(words({ freq: 'weekly', every: 1, weekdays: [2], end: never })).toBe('Every Tuesday');
    expect(words({ freq: 'monthly', every: 1, end: never })).toBe('Every month on the 23rd');
    expect(words({ freq: 'yearly', every: 1, end: never })).toBe('Every year on Oct 23');
    expect(words({ freq: 'daily', every: 1, end: never })).toBe('Every day');
  });

  it('names several days, weekdays, and longer gaps simply', () => {
    expect(words({ freq: 'weekly', every: 1, weekdays: [4, 2], end: never })).toBe('Every Tuesday and Thursday');
    expect(words({ freq: 'weekly', every: 1, weekdays: [0, 1, 3], end: never })).toBe('Every Monday, Wednesday and Sunday');
    expect(describeRepeat({ freq: 'weekly', every: 1, weekdays: [0, 1, 3], end: never }, '2024-10-23', 0, 'en-US')).toBe(
      'Every Sunday, Monday and Wednesday',
    );
    expect(words({ freq: 'weekly', every: 1, weekdays: [1, 2, 3, 4, 5], end: never })).toBe('Every weekday');
    expect(words({ freq: 'weekly', every: 2, weekdays: [1], end: never })).toBe('Every 2 weeks on Monday');
    expect(words({ freq: 'daily', every: 3, end: never })).toBe('Every 3 days');
    expect(describeRepeat(null, '2024-10-23')).toBe("Doesn't repeat");
    expect(describeRepeat({ freq: 'monthly', every: 1, end: never }, '2024-10-01', 1, 'en-US')).toBe('Every month on the 1st');
    expect(describeRepeat({ freq: 'monthly', every: 1, end: never }, '2024-10-12', 1, 'en-US')).toBe('Every month on the 12th');
  });

  it('follows the phone for date order', () => {
    expect(describeRepeat({ freq: 'yearly', every: 1, end: never }, '2024-10-23', 1, 'en-ZA')).toBe('Every year on 23 Oct');
  });

  it('says when a repeat stops', () => {
    expect(describeRepeatEnd({ kind: 'never' })).toBe('Never');
    expect(describeRepeatEnd({ kind: 'on', day: '2024-12-18' }, 'en-US')).toBe('On Dec 18, 2024');
    expect(describeRepeatEnd({ kind: 'after', times: 10 })).toBe('After 10 times');
  });
});
