// Repeats in plain words (EV-05): "Every Tuesday", "Every month on the 23rd", "Every year on Oct 23".
import { parseDayKey } from '@/calendar/timezone';
import type { WeekStart } from '@/calendar/dates';
import { t, textLocale } from '@/i18n';

import type { Repeat, RepeatEnd, Weekday } from './rule';

// Dates here are calendar days, so they're formatted in UTC to avoid any zone shifting them.
const utcDay = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

export function weekdayName(day: Weekday, locale = textLocale()): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(utcDay(2023, 1, 1 + day)); // Jan 1, 2023 was a Sunday
}

/** "Oct 23" (or "23 Oct", by the phone's locale). */
export function shortDate(day: string, locale = textLocale()): string {
  const p = parseDayKey(day);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(utcDay(p.year, p.month, p.day));
}

/** "Dec 18, 2024" */
export function shortDateWithYear(day: string, locale = textLocale()): string {
  const p = parseDayKey(day);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(utcDay(p.year, p.month, p.day));
}

/**
 * @param firstDay the series' first day 'YYYY-MM-DD' (gives the day of the month and of the year)
 * @param weekStart lists weekdays in the order the user's week runs
 */
export function describeRepeat(repeat: Repeat | null, firstDay: string, weekStart: WeekStart = 1, locale = textLocale()): string {
  if (!repeat) return t.repeat.none;
  switch (repeat.freq) {
    case 'daily':
      return t.repeat.daily(repeat.every);
    case 'weekly': {
      const days = [...new Set(repeat.weekdays)];
      if (repeat.every === 1 && days.length === 7) return t.repeat.daily(1);
      if (repeat.every === 1 && days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as Weekday))) return t.repeat.weekdays;
      const ordered = days.sort((a, b) => ((a - weekStart + 7) % 7) - ((b - weekStart + 7) % 7));
      return t.repeat.weekly(t.list(ordered.map((d) => weekdayName(d, locale))), repeat.every);
    }
    case 'monthly':
      return t.repeat.monthly(t.ordinal(parseDayKey(firstDay).day), repeat.every);
    case 'yearly':
      return t.repeat.yearly(shortDate(firstDay, locale), repeat.every);
  }
}

/** For "Stops: Never / On Dec 18, 2024 / After 10 times". */
export function describeRepeatEnd(end: RepeatEnd, locale = textLocale()): string {
  switch (end.kind) {
    case 'never':
      return t.repeat.stopsNever;
    case 'on':
      return t.repeat.stopsOn(shortDateWithYear(end.day, locale));
    case 'after':
      return t.repeat.stopsAfter(end.times);
  }
}
