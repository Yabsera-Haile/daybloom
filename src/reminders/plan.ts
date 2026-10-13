// Which notifications should be waiting on the phone right now (FR-04, NT-01). Pure: the scheduler
// (scheduler.ts) compares this list with what is scheduled and fixes the difference.
import { and, eq, gte, isNull, lte } from 'drizzle-orm';

import { toDayKey, type WeekStart } from '@/calendar/dates';
import { addDaysToKey } from '@/calendar/timezone';
import { tasks } from '@/db/schema';
import type { Db } from '@/db/types';
import { t } from '@/i18n';
import { clockText, timeOf, type TimeFormat } from '@/i18n/format';
import { doneOn, donePeriods, periodOf } from '@/habits/stats';
import { checksBetween, listHabits, listRoutines, reminderTimes, weekOf } from '@/habits/store';
import { eventsBetween } from '@/planner/events';

import { reminderOffsets } from './store';

/** iOS keeps at most 64 waiting notifications per app; leave room for snoozes and the test reminder. */
export const MAX_SCHEDULED = 60;
const HORIZON_DAYS = 45;
/** Routines and habits remind this many days ahead. */
const HABIT_DAYS = 7;
/** At most this many waiting reminders per habit; opening Daybloom tops them up. */
const HABIT_MAX = 24;
/** All-day events and their reminders are anchored to 9 AM. */
const ALL_DAY_HOUR = 9;

export type ReminderData = {
  kind: 'event' | 'task' | 'routine' | 'habit';
  /** The day it belongs to, for opening Today there */
  day: string;
  eventId?: string;
  seriesId?: string | null;
  originalStartAt?: number | null;
  taskId?: string;
  routineId?: string;
  habitId?: string;
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
  weekStart: WeekStart = 1,
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

  // Routines and habits remind for the next week only, so they don't crowd events out of the window.
  // Nothing is sent for a day that is already all ticked.
  const habitDays = Array.from({ length: HABIT_DAYS }, (_, i) => addDaysToKey(first, i));
  const habits = listHabits(db);
  const ticks = checksBetween(db, addDaysToKey(first, -7), addDaysToKey(first, HABIT_DAYS + 7));
  for (const r of listRoutines(db)) {
    if (!r.time || reminderOffsets(db, 'routine', r.id).length === 0) continue;
    const members = habits.filter((h) => h.routineId === r.id && h.frequency === 'daily');
    if (members.length === 0) continue;
    const title = t.notify.eventTitle(clockText(r.time, timeFormat), r.name);
    const body = members.map((h) => h.name).join(' · ');
    for (const day of habitDays) {
      const fireAt = clockToMs(day, r.time);
      if (fireAt <= now || doneOn(members, ticks, day).done === members.length) continue;
      out.push({
        id: `r.${r.id}.${day}`.replace(/[^A-Za-z0-9.]/g, '_'),
        fireAt,
        title,
        body,
        urgent: false,
        atStart: true,
        data: { kind: 'routine', day, routineId: r.id, at: fireAt, sig: `${fireAt}|${title}|${body}` },
      });
    }
  }
  for (const h of habits) {
    const times = h.routineId ? [] : reminderTimes(h);
    if (times.length === 0) continue;
    const body = h.note ?? t.notify.habitBody;
    const done = donePeriods(h, ticks, weekStart);
    let left = HABIT_MAX; // a habit that repeats every half hour can't fill the whole window
    for (const day of habitDays) {
      // weekly habits are reminded on the first day of their week
      if (h.frequency === 'weekly' && weekOf(day, weekStart).start !== day) continue;
      if (done.has(periodOf(h, day, weekStart))) continue;
      for (const time of times) {
        const fireAt = clockToMs(day, time);
        if (fireAt <= now || left === 0) continue;
        left -= 1;
        const title = t.notify.eventTitle(clockText(time, timeFormat), h.name);
        out.push({
          id: `h.${h.id}.${day}.${time}`.replace(/[^A-Za-z0-9.]/g, '_'),
          fireAt,
          title,
          body,
          urgent: false,
          atStart: true,
          data: { kind: 'habit', day, habitId: h.id, at: fireAt, sig: `${fireAt}|${title}|${body}` },
        });
      }
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
