// Bills (BU-06, BU-10): an amount due on a day, once or every few months. A bill the bank pays is
// added to spending on its day; one paid by hand is added when it's marked paid. Either way the
// next due day moves on.
import { and, asc, eq, isNull } from 'drizzle-orm';

import { addDaysToKey, localDayStart, parseDayKey } from '@/calendar/timezone';
import { bills, budgetCategories } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import { reminderOffsets, setReminderOffsets } from '@/reminders/store';

import { BILLS_CATEGORY_ID } from './categories';
import { addExpense, deleteExpense } from './entries';

export type Bill = typeof bills.$inferSelect;
export type BillPayment = 'auto' | 'manual';

/** Just once, every month, every 3 or 6 months, every year */
export const BILL_REPEATS = [null, 1, 3, 6, 12] as const;
/** No reminder, on the day, 1 day before, 3 days before (minutes before BILL_HOUR on the due day) */
export const BILL_REMINDERS = [null, 0, 1440, 4320] as const;
/** Bills are due, reminded and paid automatically at 9 AM. */
export const BILL_HOUR = 9;
/** Upcoming bills show this many days ahead (BU-06). */
export const UPCOMING_DAYS = 14;

export type BillInput = {
  title: string;
  amountCents: number;
  dueDate: string;
  repeatMonths: number | null;
  payment: BillPayment;
  /** minutes before 9 AM on the due day, or null for no reminder */
  remindMinutes: number | null;
  currency: string;
};

function clean(input: BillInput) {
  const title = input.title.trim();
  if (!title) throw new Error('A bill needs a name');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('A bill needs an amount');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error(`Not a day: ${input.dueDate}`);
  return {
    title,
    amountCents: input.amountCents,
    dueDate: input.dueDate,
    dueDay: parseDayKey(input.dueDate).day,
    repeatMonths: input.repeatMonths,
    payment: input.payment,
    currency: input.currency,
  };
}

const remind = (db: Db, id: string, minutes: number | null) =>
  setReminderOffsets(db, 'bill', id, minutes === null ? [] : [minutes]);

export function createBill(db: Db, input: BillInput): string {
  const id = newId();
  db.insert(bills)
    .values({ id, ...clean(input) })
    .run();
  remind(db, id, input.remindMinutes);
  return id;
}

/** Edits a bill; a bill paid just once that gets a new date or a repeat is open again. */
export function updateBill(db: Db, id: string, input: BillInput): void {
  db.update(bills)
    .set({ ...clean(input), lastPaidAt: null, updatedAt: Date.now() })
    .where(eq(bills.id, id))
    .run();
  remind(db, id, input.remindMinutes);
}

export function getBill(db: Db, id: string): Bill | undefined {
  return db.select().from(bills).where(eq(bills.id, id)).get();
}

/** The bill's reminder in minutes before its day's 9 AM, or null. */
export const billReminder = (db: Db, id: string): number | null => reminderOffsets(db, 'bill', id)[0] ?? null;

export function deleteBill(db: Db, id: string): Undo {
  db.update(bills).set({ deletedAt: Date.now() }).where(eq(bills.id, id)).run();
  return () => db.update(bills).set({ deletedAt: null }).where(eq(bills.id, id)).run();
}

/** Bills still to pay, soonest first (a one-off bill that was paid is done). */
export function listBills(db: Db): Bill[] {
  return db
    .select()
    .from(bills)
    .where(isNull(bills.deletedAt))
    .orderBy(asc(bills.dueDate))
    .all()
    .filter((b) => b.repeatMonths !== null || b.lastPaidAt === null);
}

/** Due in the next 14 days, plus any still waiting to be paid by hand (T-BU06.1). */
export function upcomingBills(db: Db, today: string): Bill[] {
  const last = addDaysToKey(today, UPCOMING_DAYS);
  return listBills(db).filter((b) => b.dueDate <= last);
}

/** Days from today to the bill's day (negative when it's late). */
export function daysUntil(dueDate: string, today: string): number {
  return Math.round((localDayStart(dueDate) - localDayStart(today)) / 86_400_000);
}

/** The next due day after this one, keeping the day of the month (the 31st becomes the 30th or 28th). */
export function nextDueDate(dueDate: string, repeatMonths: number, dueDay: number | null): string {
  const p = parseDayKey(dueDate);
  const months = p.month - 1 + repeatMonths;
  const year = p.year + Math.floor(months / 12);
  const month = (months % 12) + 1;
  const day = Math.min(dueDay ?? p.day, new Date(year, month, 0).getDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const billsCategory = (db: Db) =>
  db
    .select({ id: budgetCategories.id })
    .from(budgetCategories)
    .where(and(eq(budgetCategories.id, BILLS_CATEGORY_ID), isNull(budgetCategories.archivedAt)))
    .get()?.id ?? null;

/** Adds the bill to spending and moves it to its next day (or closes a one-off). */
function pay(db: Db, bill: Bill, at: number): { entryId: string; dueDate: string; lastPaidAt: number | null } {
  const entryId = addExpense(db, {
    amountCents: bill.amountCents,
    description: bill.title,
    categoryId: billsCategory(db),
    occurredAt: at,
    currency: bill.currency,
  });
  const dueDate = bill.repeatMonths ? nextDueDate(bill.dueDate, bill.repeatMonths, bill.dueDay) : bill.dueDate;
  db.update(bills).set({ dueDate, lastPaidAt: at }).where(eq(bills.id, bill.id)).run();
  return { entryId, dueDate, lastPaidAt: at };
}

/** "Mark as paid" on a bill paid by hand; Undo takes the payment back out. */
export function markBillPaid(db: Db, id: string, now: number): Undo {
  const bill = getBill(db, id);
  if (!bill) return () => {};
  const { entryId } = pay(db, bill, now);
  return () => {
    deleteExpense(db, entryId);
    db.update(bills).set({ dueDate: bill.dueDate, lastPaidAt: bill.lastPaidAt }).where(eq(bills.id, id)).run();
  };
}

/**
 * Bills the bank pays are added to spending at 9 AM on their day, catching up on any days missed
 * while the app was closed. Returns how many payments were added.
 */
export function settleAutoBills(db: Db, now: number): number {
  let added = 0;
  for (const bill of listBills(db).filter((b) => b.payment === 'auto')) {
    let current: Bill = bill;
    for (let i = 0; i < 120; i++) {
      const at = localDayStart(current.dueDate) + BILL_HOUR * 3_600_000;
      if (at > now || (current.repeatMonths === null && current.lastPaidAt !== null)) break;
      const paid = pay(db, current, at);
      current = { ...current, dueDate: paid.dueDate, lastPaidAt: paid.lastPaidAt };
      added += 1;
    }
  }
  return added;
}
