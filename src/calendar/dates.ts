// Calendar math used across Today, Week, Month and Habits. Pure functions, no device state.
import { addDays, differenceInCalendarDays, endOfMonth, getISOWeek, getWeek, isLeapYear, startOfWeek, startOfYear } from 'date-fns';

export type WeekStart = 0 | 1 | 6; // Sunday | Monday | Saturday (Settings › Weeks start on)
export type Hemisphere = 'north' | 'south';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** "Day 297 of 366" (T-TD01.2: the original design wrongly said 296 of 365 for Oct 23, 2024). */
export function dayOfYear(date: Date): { day: number; total: number } {
  return {
    day: differenceInCalendarDays(date, startOfYear(date)) + 1,
    total: isLeapYear(date) ? 366 : 365,
  };
}

/** Week number shown on Week: ISO weeks when weeks start Monday, otherwise "week containing Jan 1 is week 1". */
export function weekNumber(date: Date, weekStartsOn: WeekStart): number {
  return weekStartsOn === 1 ? getISOWeek(date) : getWeek(date, { weekStartsOn, firstWeekContainsDate: 1 });
}

export function weekRange(date: Date, weekStartsOn: WeekStart): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn });
  return { start, end: addDays(start, 6) };
}

/** First day of every week that touches the month (4, 5 or 6 of them; T-HB05.1). */
export function weeksInMonth(monthDate: Date, weekStartsOn: WeekStart): Date[] {
  const weeks: Date[] = [];
  let cursor = startOfWeek(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), { weekStartsOn });
  const last = endOfMonth(monthDate);
  while (cursor <= last) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** Meteorological seasons, flipped for the southern hemisphere (D3). */
export function seasonOf(date: Date, hemisphere: Hemisphere): Season {
  const northern: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  const season = northern[date.getMonth()];
  if (hemisphere === 'north') return season;
  const flip: Record<Season, Season> = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' };
  return flip[season];
}

// Time zones of temperate southern places. Everywhere else defaults to north; people near the
// equator (no real four seasons) can switch seasons off in Settings.
const southernZones = [
  /^Australia\//,
  /^Antarctica\//,
  /^Pacific\/(Auckland|Chatham|Norfolk)$/,
  /^America\/(Argentina\/.*|Buenos_Aires|Santiago|Punta_Arenas|Montevideo|Asuncion|Sao_Paulo)$/,
  /^Africa\/(Johannesburg|Maseru|Mbabane|Windhoek|Gaborone|Maputo|Harare)$/,
  /^Atlantic\/(Stanley|South_Georgia)$/,
  /^Indian\/(Mauritius|Reunion)$/,
];

export function hemisphereForTimeZone(timeZone: string): Hemisphere {
  return southernZones.some((re) => re.test(timeZone)) ? 'south' : 'north';
}

/** 'YYYY-MM-DD' in local time (how days are stored in the database). */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
