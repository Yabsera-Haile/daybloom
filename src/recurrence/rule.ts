// Repeat choices from the event form <-> RFC 5545 rules (the format Google Calendar uses, FR-05).
import { dayKeyInZone, dayKeyOf, floating, fromFloating, fromWallTime, parseDayKey, toWallTime } from '@/calendar/timezone';

/** Sunday = 0 … Saturday = 6, like Date#getDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RepeatEnd = { kind: 'never' } | { kind: 'on'; day: string } | { kind: 'after'; times: number };

export type Repeat =
  | { freq: 'daily'; every: number; end: RepeatEnd }
  | { freq: 'weekly'; every: number; weekdays: Weekday[]; end: RepeatEnd }
  | { freq: 'monthly'; every: number; end: RepeatEnd }
  | { freq: 'yearly'; every: number; end: RepeatEnd };

/** Where a series starts; repeats follow the wall clock of its time zone. */
export interface SeriesTiming {
  startAt: number;
  timeZone: string;
  allDay: boolean;
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const FREQS = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' } as const;

/** 'FREQ=WEEKLY;BYDAY=TU,TH' -> Map, keys upper-case, in order. A leading 'RRULE:' is ignored. */
export function parseRuleParts(rule: string): Map<string, string> {
  const parts = new Map<string, string>();
  for (const part of rule.replace(/^RRULE:/i, '').split(';')) {
    const [key, value] = part.split('=');
    if (key && value !== undefined) parts.set(key.trim().toUpperCase(), value.trim());
  }
  return parts;
}

export function formatRuleParts(parts: Map<string, string>): string {
  return [...parts].map(([k, v]) => `${k}=${v}`).join(';');
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function utcStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** UNTIL for a series whose last occurrence may start on `day` (inclusive). */
function untilValue(day: string, series: SeriesTiming): string {
  const p = parseDayKey(day);
  if (series.allDay) return `${p.year}${pad(p.month)}${pad(p.day)}`;
  return utcStamp(fromWallTime({ ...p, hour: 23, minute: 59, second: 59 }, series.timeZone));
}

/** UNTIL as a floating wall time in the series' zone (see calendar/timezone `floating`). */
export function untilFloating(value: string, timeZone: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!m) throw new Error(`Unreadable UNTIL: ${value}`);
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  if (m[4] === undefined) return Date.UTC(y, mo - 1, d, 23, 59, 59); // a date: the whole day counts
  const stamp = Date.UTC(y, mo - 1, d, h, mi, s);
  return m[7] ? floating(toWallTime(stamp, timeZone)) : stamp; // Z = an instant; otherwise already wall time
}

export function toRRule(repeat: Repeat, series: SeriesTiming): string {
  const parts = new Map<string, string>([['FREQ', FREQS[repeat.freq]]]);
  if (repeat.every > 1) parts.set('INTERVAL', String(repeat.every));
  if (repeat.freq === 'weekly') {
    const days = [...new Set(repeat.weekdays)].sort((a, b) => a - b);
    if (days.length > 0) parts.set('BYDAY', days.map((d) => BYDAY[d]).join(','));
  }
  if (repeat.end.kind === 'on') parts.set('UNTIL', untilValue(repeat.end.day, series));
  if (repeat.end.kind === 'after') parts.set('COUNT', String(Math.max(1, Math.round(repeat.end.times))));
  return formatRuleParts(parts);
}

/** The form's repeat choice for a rule, or null if the rule uses parts the form can't show. */
export function fromRRule(rule: string, series: SeriesTiming): Repeat | null {
  const parts = parseRuleParts(rule);
  const allowed = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'UNTIL', 'COUNT', 'WKST']);
  if ([...parts.keys()].some((k) => !allowed.has(k))) return null;

  const every = Number(parts.get('INTERVAL') ?? 1);
  if (!Number.isInteger(every) || every < 1) return null;

  let end: RepeatEnd = { kind: 'never' };
  const until = parts.get('UNTIL');
  const count = parts.get('COUNT');
  if (until) {
    end = { kind: 'on', day: dayKeyOf(fromFloating(untilFloating(until, series.timeZone))) };
  } else if (count) {
    end = { kind: 'after', times: Number(count) };
  }

  const freq = parts.get('FREQ');
  const byday = parts.get('BYDAY');
  if (byday && freq !== 'WEEKLY') return null;
  switch (freq) {
    case 'DAILY':
      return { freq: 'daily', every, end };
    case 'WEEKLY': {
      const codes = byday ? byday.split(',') : [];
      const weekdays = codes.map((c) => BYDAY.indexOf(c as (typeof BYDAY)[number]));
      if (weekdays.some((d) => d < 0)) return null; // e.g. "2TU" (second Tuesday)
      if (weekdays.length === 0) {
        const start = parseDayKey(dayKeyInZone(series.startAt, series.timeZone));
        weekdays.push(new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay());
      }
      return { freq: 'weekly', every, weekdays: (weekdays as Weekday[]).sort((a, b) => a - b), end };
    }
    case 'MONTHLY':
      return { freq: 'monthly', every, end };
    case 'YEARLY':
      return { freq: 'yearly', every, end };
    default:
      return null;
  }
}

/**
 * The same rule, stopped just before one of its occurrences (for "This one and the ones after").
 * COUNT becomes UNTIL, since a rule can't have both.
 */
export function stopBefore(rule: string, occurrenceStartAt: number, series: SeriesTiming): string {
  const parts = parseRuleParts(rule);
  parts.delete('COUNT');
  if (series.allDay) {
    const p = parseDayKey(dayKeyInZone(occurrenceStartAt - 1000, series.timeZone));
    parts.set('UNTIL', `${p.year}${pad(p.month)}${pad(p.day)}`);
  } else {
    parts.set('UNTIL', utcStamp(occurrenceStartAt - 1000));
  }
  return formatRuleParts(parts);
}
