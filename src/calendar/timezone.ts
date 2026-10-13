// Wall-clock time in any IANA time zone, without a time zone library (FR-11).
// Hermes documents Intl.DateTimeFormat#format with a timeZone but not formatToParts, so the
// digits are read from format(). Times in the phone's own zone (nearly all) skip Intl entirely.
import { getCalendars } from 'expo-localization';

export interface WallTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const DAY_MS = 86_400_000;

let engineZoneCache: string | null | undefined;

/** The zone the JS engine uses for local Date methods, if it says. */
function engineZone(): string | null {
  if (engineZoneCache === undefined) {
    try {
      engineZoneCache = new Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      engineZoneCache = null;
    }
  }
  return engineZoneCache;
}

/** The phone's time zone, stored on new events so they keep their wall-clock time. */
export function localTimeZone(): string {
  return engineZone() ?? getCalendars()[0]?.timeZone ?? 'UTC';
}

/** Call when the app returns to the foreground: the phone may have moved to another zone. */
export function refreshLocalTimeZone(): void {
  engineZoneCache = undefined;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US-u-nu-latn', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function toWallTime(ms: number, timeZone: string): WallTime {
  if (timeZone === engineZone()) {
    const d = new Date(ms);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
    };
  }
  // en-US numeric: "10/23/2024, 13:15:00" (some engines write midnight as 24)
  const [month, day, year, hour, minute, second] = (formatterFor(timeZone).format(new Date(ms)).match(/\d+/g) ?? []).map(Number);
  return { year, month, day, hour: hour % 24, minute, second };
}

/** A wall time as a plain number (its digits read as UTC): handy for date math without zones. */
export function floating(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
}

export function fromFloating(f: number): WallTime {
  const d = new Date(f);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

/** Milliseconds the zone is ahead of UTC at this instant. */
function offsetAt(ms: number, timeZone: string): number {
  return floating(toWallTime(ms, timeZone)) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant a wall time happens in a zone. Like JS Date: a time skipped by a daylight-saving
 * jump moves forward (2:30 AM → 3:30 AM); a time that happens twice is the first one.
 */
export function fromWallTime(w: WallTime, timeZone: string): number {
  if (timeZone === engineZone()) {
    return new Date(w.year, w.month - 1, w.day, w.hour, w.minute, w.second).getTime();
  }
  const f = floating(w);
  const before = offsetAt(f - DAY_MS, timeZone);
  const after = offsetAt(f + DAY_MS, timeZone);
  const valid = [f - before, f - after].filter((ms, i) => offsetAt(ms, timeZone) === (i === 0 ? before : after));
  if (valid.length > 0) return Math.min(...valid);
  return f - before; // in a daylight-saving gap
}

export function dayKeyOf(w: Pick<WallTime, 'year' | 'month' | 'day'>): string {
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' as seen in a zone. */
export function dayKeyInZone(ms: number, timeZone: string): string {
  return dayKeyOf(toWallTime(ms, timeZone));
}

export function parseDayKey(day: string): { year: number; month: number; day: number } {
  const [year, month, d] = day.split('-').map(Number);
  return { year, month, day: d };
}

/** Midnight at the start of a day, in the phone's zone. */
export function localDayStart(day: string): number {
  const p = parseDayKey(day);
  return new Date(p.year, p.month - 1, p.day).getTime();
}

/** The day `n` days after (or before) a day key. */
export function addDaysToKey(day: string, n: number): string {
  const p = parseDayKey(day);
  return dayKeyOf(fromFloating(Date.UTC(p.year, p.month - 1, p.day + n)));
}
