// Search events and to-dos by any word in their title, place, notes or list (SR-01).
import { and, eq, isNull, or, sql, type AnyColumn } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { dayKeyInZone } from '@/calendar/timezone';
import { events, settings, tasks } from '@/db/schema';
import type { Db } from '@/db/types';
import { expandSeries, type Series } from '@/recurrence';

import { findOccurrence, type EventOccurrence } from './events';
import type { TaskRow } from './tasks';

export type SearchResult =
  | { kind: 'event'; key: string; day: string; occurrence: EventOccurrence }
  | { kind: 'task'; key: string; day: string; task: TaskRow };

export type SearchGroups = { today: SearchResult[]; comingUp: SearchResult[]; earlier: SearchResult[] };

const LIMIT = 50;
const YEAR = 366 * 86_400_000;

/** Case-insensitive "contains"; % and _ in the search are plain text, so "50%" finds "50%". */
const contains = (column: AnyColumn, q: string) =>
  sql`${column} LIKE ${`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`} ESCAPE '\\'`;

export function searchPlans(db: Db, query: string, now: number): SearchGroups {
  const q = query.trim();
  const groups: SearchGroups = { today: [], comingUp: [], earlier: [] };
  if (!q) return groups;
  const today = toDayKey(new Date(now));
  const results: SearchResult[] = [];

  const rows = db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        isNull(events.seriesId),
        or(contains(events.title, q), contains(events.location, q), contains(events.notes, q)),
      ),
    )
    .limit(LIMIT)
    .all();
  for (const e of rows) {
    // a repeating event shows its next occurrence (or its last one, if it has ended)
    let ref = { eventId: e.id, seriesId: null as string | null, originalStartAt: null as number | null };
    if (e.rrule) {
      const next = expandSeries(e as Series, now, now + YEAR)[0];
      const slot = next?.startAt ?? expandSeries(e as Series, e.startAt, now).at(-1)?.startAt ?? e.startAt;
      ref = { eventId: e.id, seriesId: e.id, originalStartAt: slot };
    }
    const o = findOccurrence(db, ref);
    if (!o) continue;
    const day = o.allDay ? dayKeyInZone(o.startAt, o.timeZone) : toDayKey(new Date(o.startAt));
    results.push({ kind: 'event', key: o.key, day, occurrence: o });
  }

  const todos = db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        or(contains(tasks.title, q), contains(tasks.notes, q), contains(tasks.listLabel, q)),
      ),
    )
    .limit(LIMIT)
    .all();
  for (const x of todos) results.push({ kind: 'task', key: x.id, day: x.date, task: x });

  const time = (r: SearchResult) => (r.kind === 'event' ? r.occurrence.startAt : 0);
  for (const r of results.sort((a, b) => a.day.localeCompare(b.day) || time(a) - time(b))) {
    if (r.day === today) groups.today.push(r);
    else if (r.day > today) groups.comingUp.push(r);
    else groups.earlier.unshift(r); // most recent first
  }
  return groups;
}

// Recent searches live with the settings rows, but outside the Settings shape.
const RECENT_KEY = 'recentSearches';
const RECENT_MAX = 6;

export function recentSearches(db: Db): string[] {
  const row = db.select().from(settings).where(eq(settings.key, RECENT_KEY)).get();
  try {
    const list: unknown = row ? JSON.parse(row.value) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(db: Db, list: string[]): void {
  const value = JSON.stringify(list.slice(0, RECENT_MAX));
  db.insert(settings)
    .values({ key: RECENT_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function rememberSearch(db: Db, query: string): void {
  const q = query.trim();
  if (q) saveRecent(db, [q, ...recentSearches(db).filter((x) => x.toLowerCase() !== q.toLowerCase())]);
}

export function forgetSearch(db: Db, query: string): void {
  saveRecent(
    db,
    recentSearches(db).filter((x) => x !== query),
  );
}
