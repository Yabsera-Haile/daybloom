import { addDaysToKey, dayKeyInZone, fromWallTime, localDayStart, localTimeZone, toWallTime } from './timezone';

const wall = (year: number, month: number, day: number, hour = 0, minute = 0) => ({ year, month, day, hour, minute, second: 0 });

describe('time zones', () => {
  it('runs tests as a New York phone', () => {
    expect(localTimeZone()).toBe('America/New_York');
  });

  it('T-11.1 a 3:00 PM event made in Nairobi shows at 1:00 PM in London', () => {
    const start = fromWallTime(wall(2024, 10, 23, 15), 'Africa/Nairobi');
    expect(start).toBe(Date.UTC(2024, 9, 23, 12));
    expect(toWallTime(start, 'Europe/London')).toEqual(wall(2024, 10, 23, 13));
    expect(toWallTime(start, 'America/New_York')).toEqual(wall(2024, 10, 23, 8));
  });

  it('reads and writes the same wall time with and without Intl', () => {
    for (const zone of ['America/New_York', 'America/Chicago', 'Europe/London', 'Asia/Kolkata', 'Pacific/Chatham']) {
      const ms = fromWallTime(wall(2025, 7, 4, 9, 45), zone);
      expect(toWallTime(ms, zone)).toEqual(wall(2025, 7, 4, 9, 45));
    }
  });

  it('moves a time skipped by daylight saving forward, like the phone clock', () => {
    // 2:30 AM doesn't exist on these days; it becomes 3:30 AM (New York uses the fast path, Chicago and London Intl)
    expect(fromWallTime(wall(2024, 3, 10, 2, 30), 'America/New_York')).toBe(Date.UTC(2024, 2, 10, 7, 30));
    expect(fromWallTime(wall(2024, 3, 10, 2, 30), 'America/Chicago')).toBe(Date.UTC(2024, 2, 10, 8, 30));
    expect(fromWallTime(wall(2024, 3, 31, 1, 30), 'Europe/London')).toBe(Date.UTC(2024, 2, 31, 1, 30));
  });

  it('picks the first of a time that happens twice', () => {
    expect(fromWallTime(wall(2024, 11, 3, 1, 30), 'America/New_York')).toBe(Date.UTC(2024, 10, 3, 5, 30));
    expect(fromWallTime(wall(2024, 11, 3, 1, 30), 'America/Chicago')).toBe(Date.UTC(2024, 10, 3, 6, 30));
    expect(fromWallTime(wall(2024, 10, 27, 1, 30), 'Europe/London')).toBe(Date.UTC(2024, 9, 27, 0, 30));
  });

  it('gives the day as seen in a zone', () => {
    const ms = Date.UTC(2024, 9, 23, 22); // 10 PM UTC
    expect(dayKeyInZone(ms, 'America/New_York')).toBe('2024-10-23');
    expect(dayKeyInZone(ms, 'Africa/Nairobi')).toBe('2024-10-24');
  });

  it('day keys: local midnight and day arithmetic across months and DST', () => {
    expect(localDayStart('2024-11-03')).toBe(Date.UTC(2024, 10, 3, 4)); // still EDT at midnight
    expect(localDayStart('2024-11-04')).toBe(Date.UTC(2024, 10, 4, 5));
    expect(addDaysToKey('2024-10-30', 3)).toBe('2024-11-02');
    expect(addDaysToKey('2024-03-01', -1)).toBe('2024-02-29');
  });
});
