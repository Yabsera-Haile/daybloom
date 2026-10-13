import { dayOfYear, hemisphereForTimeZone, seasonOf, toDayKey, weekNumber, weekRange, weeksInMonth } from './dates';

const oct23 = new Date(2024, 9, 23); // Wednesday, the design fixture's "today"

describe('dayOfYear', () => {
  it('T-TD01.2 counts a leap year correctly', () => {
    expect(dayOfYear(oct23)).toEqual({ day: 297, total: 366 });
    expect(dayOfYear(new Date(2025, 9, 23))).toEqual({ day: 296, total: 365 });
    expect(dayOfYear(new Date(2024, 0, 1))).toEqual({ day: 1, total: 366 });
    expect(dayOfYear(new Date(2024, 11, 31))).toEqual({ day: 366, total: 366 });
  });
});

describe('weeks', () => {
  it('T-11.3 week 43 with both Sunday and Monday starts', () => {
    expect(weekNumber(oct23, 0)).toBe(43);
    expect(weekNumber(oct23, 1)).toBe(43);
    expect(toDayKey(weekRange(oct23, 0).start)).toBe('2024-10-20');
    expect(toDayKey(weekRange(oct23, 0).end)).toBe('2024-10-26');
    expect(toDayKey(weekRange(oct23, 1).start)).toBe('2024-10-21');
    expect(toDayKey(weekRange(oct23, 1).end)).toBe('2024-10-27');
  });

  it('T-HB05.1 October 2024 touches five Sunday-start weeks', () => {
    expect(weeksInMonth(oct23, 0).map(toDayKey)).toEqual(['2024-09-29', '2024-10-06', '2024-10-13', '2024-10-20', '2024-10-27']);
  });

  it('February 2026 fits in exactly four Sunday-start weeks', () => {
    expect(weeksInMonth(new Date(2026, 1, 10), 0)).toHaveLength(4);
  });
});

describe('seasons', () => {
  it('T-11.4 autumn in New York, spring in Sydney and Johannesburg', () => {
    expect(seasonOf(oct23, hemisphereForTimeZone('America/New_York'))).toBe('autumn');
    expect(seasonOf(oct23, hemisphereForTimeZone('Australia/Sydney'))).toBe('spring');
    expect(seasonOf(oct23, hemisphereForTimeZone('Africa/Johannesburg'))).toBe('spring');
  });

  it('defaults places near the equator to north', () => {
    expect(hemisphereForTimeZone('Africa/Nairobi')).toBe('north');
  });

  it('covers every month', () => {
    const north = Array.from({ length: 12 }, (_, m) => seasonOf(new Date(2024, m, 15), 'north'));
    expect(north).toEqual(['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']);
  });
});
