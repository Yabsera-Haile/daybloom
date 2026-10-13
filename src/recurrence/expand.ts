// Occurrences of a repeating event. rrule works on "floating" times (wall-clock digits stored as
// UTC), so a 9:00 AM event stays at 9:00 AM through daylight-saving changes (T-05.4).
import { RRule } from 'rrule';

import { floating, fromFloating, fromWallTime, toWallTime } from '@/calendar/timezone';

import { formatRuleParts, parseRuleParts, untilFloating, type SeriesTiming } from './rule';

export interface Series extends SeriesTiming {
  endAt: number;
  rrule: string;
}

export interface Occurrence {
  /** When this occurrence starts by the rule; it identifies the occurrence within its series. */
  startAt: number;
  endAt: number;
  /** Start and end as floating wall-clock times in the series' zone (all-day events are placed by these). */
  startWall: number;
  endWall: number;
}

const HOUR = 3_600_000;
const LIMIT = 1000; // per call; a year of a daily event is 366

function ruleFor(series: Series) {
  const start = floating(toWallTime(series.startAt, series.timeZone));
  const duration = floating(toWallTime(series.endAt, series.timeZone)) - start;
  const parts = parseRuleParts(series.rrule);
  const until = parts.get('UNTIL');
  parts.delete('UNTIL');
  const rule = new RRule({
    ...RRule.parseString(formatRuleParts(parts)),
    dtstart: new Date(start),
    until: until ? new Date(untilFloating(until, series.timeZone)) : null,
  });
  return { rule, start, duration };
}

/** Occurrences that overlap [fromMs, toMs). */
export function expandSeries(series: Series, fromMs: number, toMs: number): Occurrence[] {
  const { rule, duration } = ruleFor(series);
  const from = floating(toWallTime(fromMs, series.timeZone)) - Math.max(duration, 0) - HOUR;
  const to = floating(toWallTime(toMs, series.timeZone)) + HOUR;
  return rule
    .between(new Date(from), new Date(to), true, (_, count) => count < LIMIT)
    .map((d) => {
      const startWall = d.getTime();
      const endWall = startWall + duration;
      return {
        startAt: fromWallTime(fromFloating(startWall), series.timeZone),
        endAt: fromWallTime(fromFloating(endWall), series.timeZone),
        startWall,
        endWall,
      };
    })
    .filter((o) => o.startAt < toMs && (o.endAt > fromMs || o.startAt >= fromMs));
}

/** How many occurrences come before the one starting at `startAt`. */
export function countBefore(series: Series, startAt: number): number {
  const { rule, start } = ruleFor(series);
  const cut = floating(toWallTime(startAt, series.timeZone));
  if (cut <= start) return 0;
  return rule.between(new Date(start), new Date(cut - 1), true).length;
}
