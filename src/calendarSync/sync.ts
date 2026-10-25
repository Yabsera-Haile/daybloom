// Keeps Daybloom and the phone's calendars matched (GC-02, GC-03). The phone's events live in
// Daybloom's events table (source 'device'), so Today, Week, Month, search and reminders see them
// like any other; `externalId` is '<calendar>/<event>' on the phone and `externalEtag` the
// fingerprint (shape.ts) of what both sides last agreed on.
//   - pull: brings in what changed on the phone, unless Daybloom changed it too and hasn't sent it
//   - push: sends what changed here (new, changed, cancelled, deleted, moved in or out of a calendar)
// Occurrences left out of a repeating event (EXDATE) come in as cancelled occurrences with an
// externalId '<event>@<time>'; they are the phone's to keep, so they're never sent back.
import { and, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm';

import { calendarRemovals, events, reminders } from '@/db/schema';
import { newId, type Db } from '@/db/types';
import { t } from '@/i18n';

import type { Answer, CalendarStore, PhoneCalendar, PhoneEvent } from './native';
import { exdates, fingerprint, shapeOfPhone, shapeOfRow, utcMidnight, valuesOf, type Shape } from './shape';

type EventRow = typeof events.$inferSelect;

const DAY = 86_400_000;
/** Events that ended more than this long ago stay out (a year of history is plenty to look back on). */
export const PAST = 366 * DAY;
/** A deleted event is kept this long, in case Undo brings it back. */
const UNDO_GRACE = 60_000;

const keyOf = (calendarId: string, id: string) => `${calendarId}/${id}`;
/** The phone's event id in an externalId. */
const phoneId = (externalId: string) => externalId.slice(externalId.indexOf('/') + 1);
const calendarOf = (externalId: string) => externalId.slice(0, externalId.indexOf('/'));
const isLeftOut = (externalId: string | null) => externalId?.includes('@') ?? false;

/** Your answer to an invitation, or null when it isn't one (or it's your own event). */
function inviteOf(p: PhoneEvent): string | null {
  if (!p.hasGuests || p.isOrganizer) return null;
  return { 1: 'accepted', 2: 'declined', 3: 'invited', 4: 'tentative' }[p.selfStatus] ?? null;
}

/** One sync at a time: pulls and pushes queue behind each other. */
let running: Promise<unknown> = Promise.resolve();
export function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const next = running.then(job, job);
  running = next.catch(() => undefined);
  return next;
}

/**
 * Drops events from Daybloom without touching the phone (they're gone there, or their calendar is
 * no longer shown): the externalId goes first, so nothing is queued to delete on the phone.
 */
function forget(db: Db, ids: string[]): void {
  if (ids.length === 0) return;
  db.update(events).set({ externalId: null }).where(inArray(events.id, ids)).run();
  db.delete(reminders)
    .where(and(eq(reminders.targetType, 'event'), inArray(reminders.targetId, ids)))
    .run();
  db.delete(events).where(inArray(events.id, ids)).run();
}

/** Daybloom changed it and the change isn't on the phone yet. */
function changedHere(row: EventRow, series: EventRow | undefined): boolean {
  return row.externalId === null || row.externalEtag !== fingerprint(shapeOfRow(row, series));
}

/** The row's content from a phone event's shape. */
function contentOf(s: Shape, p: PhoneEvent) {
  return {
    title: p.title.trim() ? p.title : t.calendars.noTitle,
    notes: s.notes,
    location: s.location,
    allDay: s.allDay,
    startAt: s.startAt,
    endAt: s.endAt,
    timeZone: s.timeZone,
    rrule: s.rrule,
  };
}

export type PullResult = { added: number; changed: number; removed: number };

/** Brings in the events of the calendars shown, as they are on the phone now. */
export async function pull(
  db: Db,
  store: CalendarStore,
  calendars: PhoneCalendar[],
  now = Date.now(),
): Promise<PullResult> {
  const shown = new Set(calendars.map((c) => c.id));
  const writable = new Map(calendars.map((c) => [c.id, c.writable]));
  const phone = shown.size ? await store.events([...shown], now - PAST) : [];
  const result: PullResult = { added: 0, changed: 0, removed: 0 };

  db.transaction((tx) => {
    const local = tx.select().from(events).where(eq(events.source, 'device')).all();
    const byId = new Map(local.map((r) => [r.id, r]));
    const byKey = new Map(local.filter((r) => r.externalId).map((r) => [r.externalId!, r]));

    // events of calendars no longer shown leave Daybloom; they stay on the phone
    const hidden = local.filter((r) => r.calendarId && !shown.has(r.calendarId)).map((r) => r.id);
    forget(tx, hidden);
    result.removed += hidden.length;

    const phoneById = new Map(phone.map((p) => [p.id, p]));
    const bySyncId = new Map(phone.filter((p) => p.syncId).map((p) => [p.syncId!, p]));
    const parentOf = (p: PhoneEvent) =>
      (p.originalId ? phoneById.get(p.originalId) : undefined) ??
      (p.originalSyncId ? bySyncId.get(p.originalSyncId) : undefined);
    const seen = new Set<string>();

    // repeating and one-off events first, so changed occurrences find their series
    const ordered = [...phone].sort(
      (a, b) => Number(Boolean(a.originalId || a.originalSyncId)) - Number(Boolean(b.originalId || b.originalSyncId)),
    );
    for (const p of ordered) {
      if (p.startAt === null) continue;
      const isOccurrence = Boolean(p.originalId || p.originalSyncId);
      const parentEvent = isOccurrence ? parentOf(p) : undefined;
      const parentKey = parentEvent ? keyOf(parentEvent.calendarId, parentEvent.id) : null;
      const series = parentKey ? byKey.get(parentKey) : undefined;
      // an occurrence of a series that isn't here, or a whole event that was called off
      if (isOccurrence ? !series : p.cancelled) continue;

      const key = keyOf(p.calendarId, p.id);
      seen.add(key);
      const shape = shapeOfPhone(p, parentKey);
      const print = fingerprint(shape);
      const extra = {
        invite: inviteOf(p),
        readOnly: !writable.get(p.calendarId) || (p.hasGuests && !p.isOrganizer && !p.guestsCanModify),
      };
      const linked = series
        ? { seriesId: series.id, originalStartAt: p.originalStartAt }
        : { seriesId: null, originalStartAt: null };
      const row = byKey.get(key);

      if (!row) {
        const id = newId();
        const values = {
          id,
          ...contentOf(shape, p),
          ...linked,
          ...extra,
          source: 'device',
          calendarId: p.calendarId,
          externalId: key,
          externalEtag: print,
          deletedAt: shape.cancelled ? now : null,
        };
        tx.insert(events).values(values).run();
        const added = tx.select().from(events).where(eq(events.id, id)).get()!;
        byKey.set(key, added);
        byId.set(id, added);
        result.added += 1;
      } else if (row.externalEtag !== print && !changedHere(row, row.seriesId ? byId.get(row.seriesId) : undefined)) {
        const patch = {
          ...contentOf(shape, p),
          ...linked,
          ...extra,
          externalEtag: print,
          deletedAt: shape.cancelled ? (row.deletedAt ?? now) : null,
          updatedAt: now,
        };
        tx.update(events).set(patch).where(eq(events.id, row.id)).run();
        byKey.set(key, { ...row, ...patch });
        result.changed += 1;
      } else if (row.invite !== extra.invite || row.readOnly !== extra.readOnly) {
        tx.update(events).set(extra).where(eq(events.id, row.id)).run();
      }

      // occurrences the phone leaves out of a repeating event
      if (!isOccurrence && shape.rrule) {
        const mine = byKey.get(key)!;
        const wanted = new Set(exdates(p.exdate, shape.timeZone));
        const prefix = `${key}@`;
        const have = local.filter((r) => r.externalId?.startsWith(prefix));
        forget(
          tx,
          have.filter((r) => !wanted.has(r.originalStartAt!)).map((r) => r.id),
        );
        const haveAt = new Set(have.map((r) => r.originalStartAt));
        for (const at of wanted) {
          if (haveAt.has(at)) continue;
          tx.insert(events)
            .values({
              id: newId(),
              title: mine.title,
              allDay: mine.allDay,
              timeZone: mine.timeZone,
              startAt: at,
              endAt: at + (mine.endAt - mine.startAt),
              seriesId: mine.id,
              originalStartAt: at,
              source: 'device',
              calendarId: p.calendarId,
              externalId: `${prefix}${at}`,
              deletedAt: now,
            })
            .run();
        }
      }
    }

    // gone from the phone (deleted there, or ended long ago)
    const gone = local.filter(
      (r) =>
        r.externalId &&
        !isLeftOut(r.externalId) &&
        r.calendarId &&
        shown.has(r.calendarId) &&
        !seen.has(r.externalId) &&
        !(r.deletedAt !== null && now - r.deletedAt < UNDO_GRACE && r.seriesId === null),
    );
    // deleted here and on the phone, and past Undo
    const done = local.filter(
      (r) => r.deletedAt !== null && r.externalId === null && r.seriesId === null && now - r.deletedAt > UNDO_GRACE,
    );
    forget(
      tx,
      [...gone, ...done].map((r) => r.id),
    );
    result.removed += gone.length;
  });
  return result;
}

/**
 * All-day events are kept at midnight UTC on the phone; ones made in Daybloom (at midnight where
 * they were made) move onto that footing before they go there, with their changed occurrences, so
 * occurrences changed on either side line up.
 */
function allDayAtUtc(db: Db): void {
  const local = db
    .select()
    .from(events)
    .where(
      and(eq(events.source, 'device'), eq(events.allDay, true), ne(events.timeZone, 'UTC'), isNull(events.seriesId)),
    )
    .all();
  if (local.length === 0) return;
  db.transaction((tx) => {
    for (const series of local) {
      for (const x of tx.select().from(events).where(eq(events.seriesId, series.id)).all()) {
        tx.update(events)
          .set({
            originalStartAt: x.originalStartAt === null ? null : utcMidnight(x.originalStartAt, series.timeZone),
            ...(x.allDay && x.timeZone !== 'UTC'
              ? {
                  startAt: utcMidnight(x.startAt, x.timeZone),
                  endAt: utcMidnight(x.endAt, x.timeZone),
                  timeZone: 'UTC',
                }
              : {}),
          })
          .where(eq(events.id, x.id))
          .run();
      }
      tx.update(events)
        .set({
          startAt: utcMidnight(series.startAt, series.timeZone),
          endAt: utcMidnight(series.endAt, series.timeZone),
          timeZone: 'UTC',
        })
        .where(eq(events.id, series.id))
        .run();
    }
  });
}

/** Sends Daybloom's changes to the phone's calendars; how many events it wrote. */
export async function push(db: Db, store: CalendarStore): Promise<number> {
  let written = 0;
  const set = (id: string, patch: Partial<EventRow>) => db.update(events).set(patch).where(eq(events.id, id)).run();
  allDayAtUtc(db);

  // dropped here by Daybloom itself (a changed occurrence of a series whose times changed)
  for (const gone of db.select().from(calendarRemovals).all()) {
    try {
      await store.remove(phoneId(gone.externalId));
      written += 1;
    } catch {
      // already gone, or the calendar is out of reach: nothing more to do
    }
    db.delete(calendarRemovals).where(eq(calendarRemovals.externalId, gone.externalId)).run();
  }

  // taken out of the phone's calendars (made Daybloom-only)
  const left = db
    .select()
    .from(events)
    .where(and(ne(events.source, 'device'), isNotNull(events.externalId)))
    .all();
  for (const row of left) {
    try {
      await store.remove(phoneId(row.externalId!));
      written += 1;
    } catch {
      continue;
    }
    set(row.id, { externalId: null, externalEtag: null });
  }

  const rows = db
    .select()
    .from(events)
    .where(and(eq(events.source, 'device'), isNotNull(events.calendarId), eq(events.readOnly, false)))
    .all()
    .filter((r) => !isLeftOut(r.externalId));
  // whole events first, so changed occurrences have their repeating event on the phone
  const ordered = [...rows].sort((a, b) => Number(a.seriesId !== null) - Number(b.seriesId !== null));

  for (const stale of ordered) {
    // read again: an earlier write may have given its series an id on the phone
    const row = db.select().from(events).where(eq(events.id, stale.id)).get();
    if (!row || row.source !== 'device' || !row.calendarId) continue;
    const series = row.seriesId
      ? (db.select().from(events).where(eq(events.id, row.seriesId)).get() ?? undefined)
      : undefined;
    if (row.seriesId && !series?.externalId) continue; // its series isn't on the phone yet
    const shape = shapeOfRow(row, series);
    const print = fingerprint(shape);
    const deleted = row.seriesId === null && row.deletedAt !== null;
    // nothing to send: deleted and gone from the phone, or the same as the phone has
    if (deleted ? row.externalId === null : row.externalId !== null && row.externalEtag === print) continue;

    try {
      if (row.seriesId === null) {
        // a one-off or repeating event
        if (deleted) {
          await store.remove(phoneId(row.externalId!));
          set(row.id, { externalId: null, externalEtag: null });
          written += 1;
          continue;
        }
        let key = row.externalId;
        if (key && calendarOf(key) !== row.calendarId) {
          await store.remove(phoneId(key)); // moved to another calendar
          key = null;
        }
        if (key && !(await store.update(phoneId(key), valuesOf(shape)))) key = null;
        if (!key) key = keyOf(row.calendarId, await store.insert(valuesOf(shape)));
        set(row.id, { externalId: key, externalEtag: print });
      } else {
        // a changed or cancelled occurrence: made again, under its series as it is now
        if (row.externalId) await store.remove(phoneId(row.externalId));
        const id = await store.insertException(
          phoneId(series!.externalId!),
          shape.originalStartAt!,
          shape.cancelled ? null : valuesOf(shape),
          shape.cancelled,
        );
        set(row.id, { externalId: keyOf(row.calendarId, id), externalEtag: print });
      }
      written += 1;
    } catch (e) {
      // out of reach for now (permission taken back, calendar gone): tried again next time
      console.warn('Calendar sync could not send', row.title, e);
    }
  }
  return written;
}

/** Answers an invitation (GC-05): here at once, and on the phone, which tells the organizer. */
export async function answerInvite(db: Db, store: CalendarStore, eventId: string, answer: Answer): Promise<void> {
  const row = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!row?.externalId || isLeftOut(row.externalId)) return;
  // an occurrence of a repeating invitation answers for the whole of it
  const target = row.seriesId ? db.select().from(events).where(eq(events.id, row.seriesId)).get() : row;
  if (!target?.externalId) return;
  db.update(events)
    .set({ invite: answer })
    .where(and(eq(events.source, 'device'), inArray(events.id, [target.id, row.id])))
    .run();
  await store.respond(phoneId(target.externalId), answer);
}

/** How many events made in Daybloom could go to a phone calendar. */
export function eventsMadeHere(db: Db): number {
  return db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.source, 'local'), isNull(events.seriesId), isNull(events.deletedAt)))
    .all().length;
}

/**
 * Moves every event made in Daybloom (with its changed occurrences) into a phone calendar (GC-06),
 * so it's in Google Calendar too; the next push adds them there. One copy each, so nothing doubles.
 */
export function moveToCalendar(db: Db, calendarId: string): number {
  const count = eventsMadeHere(db);
  db.update(events)
    .set({ source: 'device', calendarId, updatedAt: Date.now() })
    .where(eq(events.source, 'local'))
    .run();
  return count;
}

/** Stops showing the phone's calendars: their events leave Daybloom and stay on the phone. */
export function forgetPhoneEvents(db: Db): void {
  const ids = db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.source, 'device'))
    .all()
    .map((r) => r.id);
  db.transaction((tx) => forget(tx, ids));
}
