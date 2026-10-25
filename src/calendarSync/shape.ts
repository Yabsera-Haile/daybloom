// What an event is, as both sides can agree on it (GC-03): Daybloom's row and the phone calendar's
// event are each turned into a Shape, and a fingerprint of it tells whether either side changed.
// All-day events are compared at midnight UTC, the way the phone keeps them; a cancelled
// occurrence is only which occurrence it is.
import { dayKeyInZone, fromWallTime, parseDayKey } from '@/calendar/timezone';
import type { events } from '@/db/schema';
import { t } from '@/i18n';

import type { EventValues, PhoneEvent } from './native';

type EventRow = typeof events.$inferSelect;

export interface Shape {
  calendarId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: number;
  endAt: number;
  allDay: boolean;
  timeZone: string;
  rrule: string | null;
  /** For a changed or cancelled occurrence: its repeating event on the phone, and which occurrence. */
  parent: string | null;
  originalStartAt: number | null;
  cancelled: boolean;
}

const DAY = 86_400_000;

/** Midnight UTC starting the day an instant falls on in a zone. */
export function utcMidnight(ms: number, timeZone: string): number {
  const p = parseDayKey(dayKeyInZone(ms, timeZone));
  return Date.UTC(p.year, p.month - 1, p.day);
}

const blank = (s: string | null | undefined) => (s?.trim() ? s : null);

/** A rule as kept, without a leading 'RRULE:'. */
export const ruleOf = (rule: string | null | undefined) => blank(rule?.replace(/^RRULE:/i, '').trim());

/** An event with no title on the phone shows as "(No title)" here, and stays untitled there. */
export const titleOf = (title: string) => (title === t.calendars.noTitle ? '' : title);

/** A cancelled occurrence is only which occurrence it is. */
function cancelledShape(s: Shape): Shape {
  return { ...s, title: '', notes: null, location: null, startAt: 0, endAt: 0, rrule: null };
}

/**
 * A Daybloom row as the phone would keep it. A changed occurrence needs its series (for which
 * repeating event, and the zone its occurrences are counted in).
 */
export function shapeOfRow(row: EventRow, series?: EventRow): Shape {
  const at = (ms: number) => (row.allDay ? utcMidnight(ms, row.timeZone) : ms);
  const original =
    row.originalStartAt === null
      ? null
      : series?.allDay
        ? utcMidnight(row.originalStartAt, series.timeZone)
        : row.originalStartAt;
  const shape: Shape = {
    calendarId: row.calendarId ?? '',
    title: titleOf(row.title),
    notes: blank(row.notes),
    location: blank(row.location),
    startAt: at(row.startAt),
    endAt: at(row.endAt),
    allDay: row.allDay,
    timeZone: row.allDay ? 'UTC' : row.timeZone,
    rrule: row.seriesId ? null : ruleOf(row.rrule),
    parent: row.seriesId ? (series?.externalId ?? null) : null,
    originalStartAt: original,
    cancelled: row.seriesId !== null && row.deletedAt !== null,
  };
  return shape.cancelled ? cancelledShape(shape) : shape;
}

/** How long an RFC 5545 duration is ('P3600S', 'PT1H30M', 'P1D'), in ms. */
export function durationMs(value: string | null): number {
  const m = value ? /^[+]?P(?:(\d+)W)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value) : null;
  if (!m) return 0;
  const [w, d, h, min, s] = m.slice(1).map((x) => Number(x ?? 0));
  return (((w * 7 + d) * 24 + h) * 60 + min) * 60_000 + s * 1000;
}

/** A phone event as a Shape; `parent` is its repeating event's id here, for a changed occurrence. */
export function shapeOfPhone(p: PhoneEvent, parent: string | null = null): Shape {
  const startAt = p.startAt ?? 0;
  const shape: Shape = {
    calendarId: p.calendarId,
    title: p.title,
    notes: blank(p.notes),
    location: blank(p.location),
    startAt,
    endAt: p.endAt ?? startAt + durationMs(p.duration),
    allDay: p.allDay,
    timeZone: p.allDay ? 'UTC' : p.timeZone || 'UTC',
    rrule: parent ? null : ruleOf(p.rrule),
    parent,
    originalStartAt: parent ? p.originalStartAt : null,
    cancelled: parent !== null && p.cancelled,
  };
  return shape.cancelled ? cancelledShape(shape) : shape;
}

/** A short fingerprint of a Shape (FNV-1a over its fields in a fixed order). */
export function fingerprint(s: Shape): string {
  const text = JSON.stringify([
    s.calendarId,
    s.title,
    s.notes,
    s.location,
    s.startAt,
    s.endAt,
    s.allDay,
    s.timeZone,
    s.rrule,
    s.parent,
    s.originalStartAt,
    s.cancelled,
  ]);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

/** What to write to the phone for a Shape. */
export function valuesOf(s: Shape): EventValues {
  return {
    calendarId: s.calendarId,
    title: s.title,
    notes: s.notes,
    location: s.location,
    startAt: s.startAt,
    endAt: Math.max(s.endAt, s.startAt + (s.allDay ? DAY : 0)),
    allDay: s.allDay,
    timeZone: s.timeZone,
    rrule: s.rrule,
  };
}

/**
 * The occurrences left out of a repeating event, from its EXDATE: 'YYYYMMDD' (all-day),
 * 'YYYYMMDDTHHMMSSZ' (an instant) or 'YYYYMMDDTHHMMSS' (a clock time in its zone), comma-separated,
 * possibly after a zone and ';'.
 */
export function exdates(value: string | null, timeZone: string): number[] {
  if (!value) return [];
  const out: number[] = [];
  for (const line of value.split(/\r?\n/)) {
    let zone = timeZone;
    let list = line.replace(/^EXDATE/i, '').replace(/^:/, '');
    const semi = list.lastIndexOf(';');
    if (semi >= 0) {
      zone = list.slice(0, semi).replace(/^.*TZID=/i, '') || timeZone;
      list = list.slice(semi + 1).replace(/^[^:]*:/, '');
    }
    for (const v of list.split(',')) {
      const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v.trim());
      if (!m) continue;
      const [y, mo, d, h, mi, s] = m.slice(1, 7).map((x) => Number(x ?? 0));
      if (m[4] === undefined) out.push(Date.UTC(y, mo - 1, d));
      else if (m[7]) out.push(Date.UTC(y, mo - 1, d, h, mi, s));
      else out.push(fromWallTime({ year: y, month: mo, day: d, hour: h, minute: mi, second: s }, zone));
    }
  }
  return out;
}
