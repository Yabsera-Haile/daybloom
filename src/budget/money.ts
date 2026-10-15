// Turning what someone typed into whole cents (NFR-12), and the budget's periods.
import { weekRange, toDayKey, type WeekStart } from '@/calendar/dates';
import { addDaysToKey, localDayStart, parseDayKey } from '@/calendar/timezone';

/**
 * "12", "12.5", "12,50", "1,730", "1 730,00" → cents. Takes the last "." or "," followed by one or
 * two digits as the decimal mark (phones in many regions type a comma); other marks group thousands.
 * null when there's no number.
 */
export function parseMoney(text: string): number | null {
  const s = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const decimal = /[.,](\d{1,2})$/.exec(s);
  const whole = (decimal ? s.slice(0, decimal.index) : s).replace(/[.,]/g, '');
  const cents = Number(whole || '0') * 100 + (decimal ? Number(decimal[1].padEnd(2, '0')) : 0);
  return Number.isFinite(cents) ? cents : null;
}

/** Cents back into an amount field: 1730 → "17.30", 500000 → "5000" */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export type BudgetPeriod = 'month' | 'week';

/** A budget period: first and last day, inclusive. */
export type Range = { start: string; end: string };

/** The month or week a day falls in (weeks follow Settings › Weeks start on). */
export function periodRange(day: string, period: BudgetPeriod, weekStart: WeekStart): Range {
  const p = parseDayKey(day);
  if (period === 'month') {
    const last = new Date(p.year, p.month, 0).getDate();
    const mm = String(p.month).padStart(2, '0');
    return { start: `${p.year}-${mm}-01`, end: `${p.year}-${mm}-${String(last).padStart(2, '0')}` };
  }
  const r = weekRange(new Date(p.year, p.month - 1, p.day), weekStart);
  return { start: toDayKey(r.start), end: toDayKey(r.end) };
}

/** The period before (-1) or after (1). */
export function shiftPeriod(range: Range, period: BudgetPeriod, by: -1 | 1, weekStart: WeekStart): Range {
  return periodRange(by < 0 ? addDaysToKey(range.start, -1) : addDaysToKey(range.end, 1), period, weekStart);
}

/** Moments from the first day's midnight up to (not including) the midnight after the last day. */
export function rangeMs(range: Range): { from: number; to: number } {
  return { from: localDayStart(range.start), to: localDayStart(addDaysToKey(range.end, 1)) };
}

/** Number of days in a range, inclusive. */
export function daysIn(range: Range): number {
  return Math.round((localDayStart(addDaysToKey(range.end, 1)) - localDayStart(range.start)) / 86_400_000);
}
