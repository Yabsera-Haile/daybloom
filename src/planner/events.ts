// Events: one-off, repeating (a "series" row with a rule) and changed occurrences of a series
// (rows with series_id + original_start_at; a deleted one cancels that occurrence). FR-01, FR-02, FR-05, FR-11.
import { and, eq, gt, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey, dayKeyInZone, floating, fromFloating, fromWallTime, localDayStart, toWallTime } from '@/calendar/timezone';
import { events, reminders } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import { countBefore, expandSeries, formatRuleParts, parseRuleParts, stopBefore, type Series } from '@/recurrence';
import { reminderOffsets, setReminderOffsets } from '@/reminders/store';

export type EventRow = typeof events.$inferSelect;

/** What the event form saves. */
export interface EventInput {
  title: string;
  notes?: string | null;
  location?: string | null;
  categoryId?: string | null;
  urgent?: boolean;
  allDay?: boolean;
  /** For all-day events: midnight starting the first day, and midnight after the last day, in timeZone. */
  startAt: number;
  endAt: number;
  /** The zone the event's clock time belongs to (usually the phone's when it was made). */
  timeZone: string;
  /** Repeat rule (see recurrence/rule.ts), or null for a one-off event. */
  rrule?: string | null;
}

/** One appearance of an event on the calendar. */
export interface EventOccurrence {
  /** Unique across the calendar (list keys, navigation). */
  key: string;
  /** The row holding this occurrence's details: the one-off event, its series, or a changed occurrence. */
  eventId: string;
  /** For repeating events: the series, and which of its occurrences this is. */
  seriesId: string | null;
  originalStartAt: number | null;
  title: string;
  notes: string | null;
  location: string | null;
  categoryId: string | null;
  urgent: boolean;
  allDay: boolean;
  startAt: number;
  endAt: number;
  timeZone: string;
  /** The series' repeat rule (also set on its changed occurrences). */
  rrule: string | null;
  /** The days it appears on in the phone's calendar, within the range asked for. */
  days: string[];
}

/** "Just this one" / "This one and the ones after" / "All of them" (FR-05). */
export type EditScope = 'this' | 'following' | 'all';

const PAD = 26 * 3_600_000; // the widest gap between two time zones' clocks

const blankToNull = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);

function clean(input: EventInput) {
  const title = input.title.trim();
  if (!title) throw new Error('An event needs a title'); // the form never allows this (T-01.3)
  if (input.endAt < input.startAt) throw new Error('An event cannot end before it starts');
  return {
    title,
    notes: blankToNull(input.notes),
    location: blankToNull(input.location),
    categoryId: input.categoryId ?? null,
    urgent: input.urgent ?? false,
    allDay: input.allDay ?? false,
    startAt: input.startAt,
    endAt: input.endAt,
    timeZone: input.timeZone,
    rrule: blankToNull(input.rrule),
  };
}

type Clean = ReturnType<typeof clean>;

/** The fields a changed occurrence can differ in, apart from its times. */
const details = (e: Clean | EventRow) => ({
  title: e.title,
  notes: e.notes,
  location: e.location,
  categoryId: e.categoryId,
  urgent: e.urgent,
});
const DETAIL_FIELDS = ['title', 'notes', 'location', 'categoryId', 'urgent'] as const;

export function getEvent(db: Db, id: string): EventRow | undefined {
  return db.select().from(events).where(eq(events.id, id)).get();
}

export function createEvent(db: Db, input: EventInput, reminderMinutes: number[] = []): string {
  const id = newId();
  db.transaction((tx) => {
    tx.insert(events).values({ id, ...clean(input) }).run();
    setReminderOffsets(tx, 'event', id, reminderMinutes);
  });
  return id;
}

// ---------------------------------------------------------------------------------------------
// Reading

function daysOf(e: { allDay: boolean; timeZone: string }, startAt: number, endAt: number, firstDay: string, lastDay: string): string[] {
  // All-day events keep their date wherever the phone is (T-11.1); timed ones follow the phone's clock.
  const dayOf = (ms: number) => (e.allDay ? dayKeyInZone(ms, e.timeZone) : toDayKey(new Date(ms)));
  const first = dayOf(startAt);
  const last = endAt > startAt ? dayOf(endAt - 1) : first;
  const days: string[] = [];
  for (let d = first < firstDay ? firstDay : first; d <= last && d <= lastDay; d = addDaysToKey(d, 1)) days.push(d);
  return days;
}

function occurrence(
  row: EventRow,
  startAt: number,
  endAt: number,
  series: { id: string; rrule: string | null; originalStartAt: number } | null,
  range: [string, string],
): EventOccurrence {
  return {
    key: series ? `${series.id}:${series.originalStartAt}` : row.id,
    eventId: row.id,
    seriesId: series?.id ?? null,
    originalStartAt: series?.originalStartAt ?? null,
    ...details(row),
    allDay: row.allDay,
    startAt,
    endAt,
    timeZone: row.timeZone,
    rrule: series?.rrule ?? null,
    days: daysOf(row, startAt, endAt, ...range),
  };
}

/** Every event appearing between two days of the phone's calendar (inclusive), repeats expanded. */
export function eventsBetween(db: Db, firstDay: string, lastDay: string): EventOccurrence[] {
  const from = localDayStart(firstDay) - PAD;
  const to = localDayStart(addDaysToKey(lastDay, 1)) + PAD;
  const range: [string, string] = [firstDay, lastDay];
  const out: EventOccurrence[] = [];

  const oneOffs = db
    .select()
    .from(events)
    .where(and(isNull(events.rrule), isNull(events.seriesId), isNull(events.deletedAt), lt(events.startAt, to), gt(events.endAt, from)))
    .all();
  for (const e of oneOffs) out.push(occurrence(e, e.startAt, e.endAt, null, range));

  const series = db
    .select()
    .from(events)
    .where(and(isNotNull(events.rrule), isNull(events.seriesId), isNull(events.deletedAt), lt(events.startAt, to)))
    .all();
  if (series.length > 0) {
    const changed = db
      .select()
      .from(events)
      .where(inArray(events.seriesId, series.map((s) => s.id)))
      .all();
    const changedKeys = new Set(changed.map((x) => `${x.seriesId}:${x.originalStartAt}`));
    const byId = new Map(series.map((s) => [s.id, s]));

    for (const s of series) {
      for (const o of expandSeries(s as Series, from, to)) {
        if (changedKeys.has(`${s.id}:${o.startAt}`)) continue;
        out.push(occurrence(s, o.startAt, o.endAt, { id: s.id, rrule: s.rrule, originalStartAt: o.startAt }, range));
      }
    }
    for (const x of changed) {
      if (x.deletedAt !== null || x.startAt >= to || x.endAt <= from) continue;
      const s = byId.get(x.seriesId!)!;
      out.push(occurrence(x, x.startAt, x.endAt, { id: s.id, rrule: s.rrule, originalStartAt: x.originalStartAt! }, range));
    }
  }

  return out.filter((o) => o.days.length > 0).sort((a, b) => a.startAt - b.startAt || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------------------------
// Changing

/** Change a one-off event (or a whole series through its own row). */
export function updateEvent(db: Db, id: string, input: EventInput, reminderMinutes?: number[]): void {
  db.transaction((tx) => {
    tx.update(events)
      .set({ ...clean(input), updatedAt: Date.now() })
      .where(eq(events.id, id))
      .run();
    if (reminderMinutes) setReminderOffsets(tx, 'event', id, reminderMinutes);
  });
}

function removeRows(db: Db, rows: EventRow[]): void {
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  db.delete(reminders)
    .where(and(eq(reminders.targetType, 'event'), inArray(reminders.targetId, ids)))
    .run();
  db.delete(events).where(inArray(events.id, ids)).run();
}

const wall = (ms: number, timeZone: string) => floating(toWallTime(ms, timeZone));
const instant = (f: number, timeZone: string) => fromWallTime(fromFloating(f), timeZone);

/**
 * Times for a series whose first occurrence sits at rule slot `firstSlot`. If the form moved the
 * edited occurrence (rule slot `slot`), the series moves by the same clock time and takes its length.
 */
function seriesTimes(series: EventRow, firstSlot: number, slot: number, next: Clean, movedInForm: boolean) {
  if (!movedInForm) {
    const length = wall(series.endAt, series.timeZone) - wall(series.startAt, series.timeZone);
    return { startAt: firstSlot, endAt: instant(wall(firstSlot, series.timeZone) + length, series.timeZone) };
  }
  const first = wall(firstSlot, series.timeZone) + wall(next.startAt, next.timeZone) - wall(slot, series.timeZone);
  const length = wall(next.endAt, next.timeZone) - wall(next.startAt, next.timeZone);
  return { startAt: instant(first, next.timeZone), endAt: instant(first + length, next.timeZone) };
}

/**
 * Changed occurrences after a change to several occurrences: dropped when the times or the repeat
 * changed (as Google Calendar does); otherwise they keep their own changes, take the edits to
 * details they hadn't changed, and the edited one takes the form's details.
 */
function settleChanged(db: Db, own: EventRow | undefined, others: EventRow[], before: EventRow, next: Clean, seriesId: string, timingChanged: boolean) {
  if (timingChanged) {
    removeRows(db, own ? [own, ...others] : others);
    return;
  }
  for (const row of others) {
    const patch: Partial<EventRow> = { seriesId, updatedAt: Date.now() };
    for (const field of DETAIL_FIELDS) {
      if (row[field] === before[field]) Object.assign(patch, { [field]: next[field] });
    }
    db.update(events).set(patch).where(eq(events.id, row.id)).run();
  }
  if (own) {
    db.update(events)
      .set({ ...details(next), seriesId, updatedAt: Date.now() })
      .where(eq(events.id, own.id))
      .run();
  }
}

/**
 * Saves the event form for an occurrence of a repeating event.
 * Returns the id of the row that now holds the edited occurrence.
 */
export function updateOccurrence(db: Db, occ: EventOccurrence, input: EventInput, scope: EditScope, reminderMinutes?: number[]): string {
  if (!occ.seriesId) {
    updateEvent(db, occ.eventId, input, reminderMinutes);
    return occ.eventId;
  }
  const series = getEvent(db, occ.seriesId);
  const seriesRule = series?.rrule;
  if (!series || !seriesRule) throw new Error('Series not found');
  const next = clean(input);
  const slot = occ.originalStartAt!;
  const movedInForm = next.startAt !== occ.startAt || next.endAt !== occ.endAt || next.allDay !== occ.allDay;
  const timingChanged = movedInForm || next.rrule !== seriesRule;

  return db.transaction((tx) => {
    const changed = tx.select().from(events).where(eq(events.seriesId, series.id)).all();
    const own = changed.find((x) => x.id === occ.eventId);
    const others = changed.filter((x) => x !== own);
    const minutes = reminderMinutes ?? reminderOffsets(tx, 'event', occ.eventId);

    if (scope === 'this') {
      const values = { ...next, rrule: null, seriesId: series.id, originalStartAt: slot, updatedAt: Date.now() };
      const id = own?.id ?? newId();
      if (own) tx.update(events).set(values).where(eq(events.id, id)).run();
      else tx.insert(events).values({ id, ...values }).run();
      setReminderOffsets(tx, 'event', id, minutes);
      return id;
    }

    if (scope === 'all' || slot === series.startAt) {
      tx.update(events)
        .set({ ...next, ...seriesTimes(series, series.startAt, slot, next, movedInForm), updatedAt: Date.now() })
        .where(eq(events.id, series.id))
        .run();
      setReminderOffsets(tx, 'event', series.id, minutes);
      settleChanged(tx, own, others, series, next, series.id, timingChanged);
      return series.id;
    }

    // "This one and the ones after": the old series stops before this occurrence; a new one starts here,
    // with the remaining count if the repeat stopped after N times.
    let rule = next.rrule;
    const oldCount = parseRuleParts(seriesRule).get('COUNT');
    if (rule && oldCount && parseRuleParts(rule).get('COUNT') === oldCount) {
      const parts = parseRuleParts(rule);
      parts.set('COUNT', String(Math.max(1, Number(oldCount) - countBefore(series as Series, slot))));
      rule = formatRuleParts(parts);
    }
    tx.update(events)
      .set({ rrule: stopBefore(seriesRule, slot, series), updatedAt: Date.now() })
      .where(eq(events.id, series.id))
      .run();
    const id = newId();
    tx.insert(events)
      .values({ id, ...next, ...seriesTimes(series, slot, slot, next, movedInForm), rrule: rule })
      .run();
    setReminderOffsets(tx, 'event', id, minutes);
    settleChanged(
      tx,
      own,
      others.filter((x) => x.originalStartAt! >= slot),
      series,
      next,
      id,
      timingChanged,
    );
    return id;
  });
}

// ---------------------------------------------------------------------------------------------
// Deleting (soft, so Undo can bring events back with their reminders)

/** Deletes a one-off event, a whole series, or a changed occurrence. */
export function deleteEvent(db: Db, id: string): Undo {
  const at = Date.now();
  db.update(events)
    .set({ deletedAt: at })
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .run();
  return () => {
    db.update(events)
      .set({ deletedAt: null })
      .where(and(eq(events.id, id), eq(events.deletedAt, at)))
      .run();
  };
}

export function deleteOccurrence(db: Db, occ: EventOccurrence, scope: EditScope): Undo {
  if (!occ.seriesId) return deleteEvent(db, occ.eventId);
  const series = getEvent(db, occ.seriesId);
  if (!series?.rrule) throw new Error('Series not found');
  const slot = occ.originalStartAt!;
  if (scope === 'all' || (scope === 'following' && slot === series.startAt)) return deleteEvent(db, series.id);

  if (scope === 'this') {
    if (occ.eventId !== series.id) return deleteEvent(db, occ.eventId);
    // A cancelled occurrence is a changed-occurrence row that is already deleted.
    const id = newId();
    db.insert(events)
      .values({
        id,
        ...details(series),
        allDay: series.allDay,
        timeZone: series.timeZone,
        startAt: occ.startAt,
        endAt: occ.endAt,
        seriesId: series.id,
        originalStartAt: slot,
        deletedAt: Date.now(),
      })
      .run();
    return () => {
      db.delete(events).where(eq(events.id, id)).run();
    };
  }

  const ruleBefore = series.rrule;
  const at = Date.now();
  db.transaction((tx) => {
    tx.update(events)
      .set({ rrule: stopBefore(ruleBefore, slot, series) })
      .where(eq(events.id, series.id))
      .run();
    tx.update(events)
      .set({ deletedAt: at })
      .where(and(eq(events.seriesId, series.id), gte(events.originalStartAt, slot), isNull(events.deletedAt)))
      .run();
  });
  return () => {
    db.transaction((tx) => {
      tx.update(events).set({ rrule: ruleBefore }).where(eq(events.id, series.id)).run();
      tx.update(events)
        .set({ deletedAt: null })
        .where(and(eq(events.seriesId, series.id), eq(events.deletedAt, at)))
        .run();
    });
  };
}
