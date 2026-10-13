// Which notifications should be waiting on the phone right now (FR-04, NT-01). Pure: the scheduler
// (scheduler.ts) compares this list with what is scheduled and fixes the difference.
import { and, eq, gte, isNull, lte } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey } from '@/calendar/timezone';
import { tasks } from '@/db/schema';
import type { Db } from '@/db/types';
import { t } from '@/i18n';
import { clockText, timeOf, type TimeFormat } from '@/i18n/format';
import { eventsBetween } from '@/planner/events';

import { reminderOffsets } from './store';

/** iOS keeps at most 64 waiting notifications per app; leave room for snoozes and the test reminder. */
export const MAX_SCHEDULED = 60;
const HORIZON_DAYS = 45;
/** All-day events and their reminders are anchored to 9 AM. */
const ALL_DAY_HOUR = 9;

export type ReminderData = {
  kind: 'event' | 'task';
  /** The day it belongs to, for opening Today there */
  day: string;
  eventId?: string;
  seriesId?: string | null;
  originalStartAt?: number | null;
  taskId?: string;
  /** When the event starts / the to-do is due: Snooze never goes past it */
  at: number;
  /** Changes when anything shown changes, so the scheduler replaces it */
  sig: string;
};

export type PlannedReminder = {
  /** Stable: the same reminder for the same occurrence keeps its id across refills. */
  id: string;
  fireAt: number;
  title: string;
  body: string;
  urgent: boolean;
  /** At the start (no snoozing past it), or before */
  atStart: boolean;
  data: ReminderData;
};

function howSoon(minutes: number): string {
  if (minutes <= 0) return t.notify.startingNow;
  if (minutes % 1440 === 0) return t.notify.inDays(minutes / 1440);
  if (minutes % 60 === 0) return t.notify.inHours(minutes / 60);
  return t.notify.inMinutes(minutes);
}

function clockToMs(day: string, hhmm: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3))).getTime();
}

/** The next reminders, soonest first, at most `limit` (T-04.3). */
export function plannedReminders(
  db: Db,
  now: number,
  timeFormat: TimeFormat,
  limit = MAX_SCHEDULED,
): PlannedReminder[] {
  const first = toDayKey(new Date(now));
  const last = addDaysToKey(first, HORIZON_DAYS);
  const out: PlannedReminder[] = [];

  for (const o of eventsBetween(db, first, addDaysToKey(last, 1))) {
    const offsets = reminderOffsets(db, 'event', o.eventId);
    if (offsets.length === 0) continue;
    const day = o.allDay ? o.days[0] : toDayKey(new Date(o.startAt));
    const anchor = o.allDay ? clockToMs(day, `${String(ALL_DAY_HOUR).padStart(2, '0')}:00`) : o.startAt;
    const title = o.allDay
      ? t.notify.allDayTitle(o.title)
      : t.notify.eventTitle(timeOf(o.startAt, timeFormat), o.title);
    for (const minutes of offsets) {
      const fireAt = anchor - minutes * 60_000;
      if (fireAt <= now) continue;
      const body = [howSoon(minutes), o.location].filter(Boolean).join(' · ');
      out.push({
        id: `e.${o.key}.${minutes}`.replace(/[^A-Za-z0-9.]/g, '_'),
        fireAt,
        title,
        body,
        urgent: o.urgent,
        atStart: minutes === 0,
        data: {
          kind: 'event',
          day,
          eventId: o.eventId,
          seriesId: o.seriesId,
          originalStartAt: o.originalStartAt,
          at: anchor,
          sig: `${fireAt}|${title}|${body}|${o.urgent}`,
        },
      });
    }
  }

  const due = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.scope, 'day'),
        eq(tasks.done, false),
        isNull(tasks.deletedAt),
        gte(tasks.date, first),
        lte(tasks.date, last),
      ),
    )
    .all();
  for (const x of due) {
    if (!x.dueTime) continue;
    const at = clockToMs(x.date, x.dueTime);
    const title = t.notify.taskTitle(t.task.due(clockText(x.dueTime, timeFormat)), x.title);
    for (const minutes of reminderOffsets(db, 'task', x.id)) {
      const fireAt = at - minutes * 60_000;
      if (fireAt <= now) continue;
      const body =
        [x.urgent ? t.notify.urgent : null, x.listLabel].filter(Boolean).join(' · ') ||
        (minutes ? t.notify.dueIn(howSoon(minutes)) : t.notify.dueNow);
      out.push({
        id: `t.${x.id}.${x.date}.${minutes}`.replace(/[^A-Za-z0-9.]/g, '_'),
        fireAt,
        title,
        body,
        urgent: x.urgent,
        atStart: minutes === 0,
        data: { kind: 'task', day: x.date, taskId: x.id, at, sig: `${fireAt}|${title}|${body}|${x.urgent}` },
      });
    }
  }

  return out.sort((a, b) => a.fireAt - b.fireAt).slice(0, limit);
}

/** What to cancel and what to schedule so the phone matches the plan (T-04.4: a moved event's old reminder goes). */
export function reminderChanges(
  scheduled: { id: string; sig: string | undefined }[],
  planned: PlannedReminder[],
): { cancel: string[]; add: PlannedReminder[] } {
  const want = new Map(planned.map((p) => [p.id, p]));
  const have = new Map(scheduled.map((s) => [s.id, s.sig]));
  return {
    cancel: scheduled.filter((s) => want.get(s.id)?.data.sig !== s.sig).map((s) => s.id),
    add: planned.filter((p) => have.get(p.id) !== p.data.sig),
  };
}
