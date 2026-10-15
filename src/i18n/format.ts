// Dates and times as the screens show them. Times follow the 12/24-hour setting and always read
// the same way (DESIGN_REVIEW I9: "2:00 PM", "8:30 – 9:30 AM"); day and month names come from the
// phone's locale (NFR-09).
import { parseDayKey } from '@/calendar/timezone';

import { t, textLocale } from '.';

export type TimeFormat = '12h' | '24h';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Formats a calendar day ('YYYY-MM-DD'). Done in UTC so no time zone can shift the date. */
function dayText(day: string, options: Intl.DateTimeFormatOptions): string {
  const locale = textLocale();
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    formatters.set(key, f);
  }
  const p = parseDayKey(day);
  return f.format(new Date(Date.UTC(p.year, p.month - 1, p.day, 12)));
}

/** "Wednesday, Oct 23" */
export const longDay = (day: string) => dayText(day, { weekday: 'long', month: 'short', day: 'numeric' });
/** "Wed, Oct 23" */
export const shortDay = (day: string) => dayText(day, { weekday: 'short', month: 'short', day: 'numeric' });
/** "Wednesday, October 23" */
export const fullDay = (day: string) => dayText(day, { weekday: 'long', month: 'long', day: 'numeric' });
/** "Oct 23" */
export const monthDay = (day: string) => dayText(day, { month: 'short', day: 'numeric' });
/** "October 2024" */
export const monthYear = (day: string) => dayText(day, { month: 'long', year: 'numeric' });
/** "October" */
export const monthName = (day: string) => dayText(day, { month: 'long' });
/** "Wednesday" */
export const weekdayLong = (day: string) => dayText(day, { weekday: 'long' });
/** "Wed" */
export const weekdayShort = (day: string) => dayText(day, { weekday: 'short' });
/** "W" */
export const weekdayLetter = (day: string) => dayText(day, { weekday: 'narrow' });

const two = (n: number) => String(n).padStart(2, '0');

/** "2:00 PM" or "14:00" */
export function clock(hour: number, minute: number, format: TimeFormat): string {
  if (format === '24h') return `${two(hour)}:${two(minute)}`;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${two(minute)} ${hour < 12 ? t.time.am : t.time.pm}`;
}

/** A moment on the phone's clock: "2:00 PM" */
export function timeOf(ms: number, format: TimeFormat): string {
  const d = new Date(ms);
  return clock(d.getHours(), d.getMinutes(), format);
}

/** A stored 'HH:mm': "5:00 PM" */
export function clockText(hhmm: string, format: TimeFormat): string {
  const [h, m] = hhmm.split(':').map(Number);
  return clock(h, m, format);
}

/** "8:30 – 9:30 AM", "11:30 AM – 12:30 PM", "14:00 – 15:00" */
export function timeRange(startMs: number, endMs: number, format: TimeFormat): string {
  const start = timeOf(startMs, format);
  const end = timeOf(endMs, format);
  if (endMs <= startMs) return start;
  if (format === '12h') {
    const s = new Date(startMs).getHours() < 12;
    const e = new Date(endMs).getHours() < 12;
    if (s === e) return `${start.slice(0, -3)} – ${end}`;
  }
  return `${start} – ${end}`;
}

/** Timeline hour labels: "7 AM" or "07:00" */
export function hourLabel(hour: number, format: TimeFormat): string {
  if (format === '24h') return `${two(hour)}:00`;
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? t.time.am : t.time.pm}`;
}

/** "in 45 min", "in 2 hours", "now" */
export function untilText(ms: number, now: number): string {
  const minutes = Math.round((ms - now) / 60_000);
  if (minutes <= 0) return t.time.now;
  if (minutes < 60) return t.time.inMinutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.time.inHours(hours);
  return t.time.inDays(Math.round(hours / 24));
}

const moneyFormats = new Map<string, Intl.NumberFormat>();

/** How many decimals the currency uses (2 for most, 0 for yen or won). */
function decimalsOf(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function moneyFormat(currency: string, whole: boolean): Intl.NumberFormat {
  const locale = textLocale();
  const key = `${locale}|${currency}|${whole}`;
  let f = moneyFormats.get(key);
  if (!f) {
    const digits = whole ? 0 : decimalsOf(currency);
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    moneyFormats.set(key, f);
  }
  return f;
}

/**
 * Money from whole cents, written the phone's way but with no currency sign, since people use
 * different currencies (D15): "1,730.00", "1 730,00". `minus` writes spending as "−86.40"; `whole`
 * drops the cents for round goal targets ("10,000").
 */
export function money(cents: number, currency: string, opts: { minus?: boolean; whole?: boolean } = {}): string {
  const text = moneyFormat(currency, !!opts.whole).format(Math.abs(cents) / 100);
  return opts.minus || cents < 0 ? `−${text}` : text;
}

/** "10 minutes before", "When it starts", "1 day before" */
export function reminderText(minutes: number): string {
  if (minutes === 0) return t.reminders.atStart;
  if (minutes % 1440 === 0) return t.reminders.daysBefore(minutes / 1440);
  if (minutes % 60 === 0) return t.reminders.hoursBefore(minutes / 60);
  return t.reminders.minutesBefore(minutes);
}
