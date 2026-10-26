// Restoring a backup (ST-07): the file from "Back up your data", read back in on this phone or a
// new one. It replaces Daybloom's own data in one go (all or nothing) and can be undone at once.
// The phone's calendars stay as they are: their events live in Google Calendar (or wherever) and
// come back by themselves, so the backup's copies of them are left out, and so is which calendars
// this phone shows.
import { and, eq, inArray, ne, not, notInArray } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';
import type { Db, Undo } from '@/db/types';

import migrations from '../../drizzle/migrations';
import { backupOf, type Backup } from './export';

type TableName = keyof Backup['tables'];
type Row = Record<string, unknown>;

/** Parents before the tables that point at them; deleting goes the other way. */
const ORDER: [TableName, SQLiteTable][] = [
  ['categories', schema.categories],
  ['routines', schema.routines],
  ['budgetCategories', schema.budgetCategories],
  ['smsSenders', schema.smsSenders],
  ['events', schema.events],
  ['tasks', schema.tasks],
  ['hourNotes', schema.hourNotes],
  ['reminders', schema.reminders],
  ['weekIntentions', schema.weekIntentions],
  ['habits', schema.habits],
  ['habitChecks', schema.habitChecks],
  ['goals', schema.goals],
  ['entries', schema.entries],
  ['bills', schema.bills],
  ['budgetPlans', schema.budgetPlans],
  ['smsPatterns', schema.smsPatterns],
  ['settings', schema.settings],
];

/** Settings that belong to this phone, not to the plans: which of its calendars are shown. */
const PHONE_SETTINGS = ['phoneCalendars', 'saveToCalendar'];

/** What a backup holds, to show before anything is replaced. */
export type BackupSummary = {
  exportedAt: string;
  events: number;
  todos: number;
  habits: number;
  expenses: number;
  goals: number;
  bills: number;
};

export type ReadBackup =
  | { ok: true; backup: Backup; summary: BackupSummary }
  /** not a Daybloom backup (or damaged), or from a newer Daybloom than this one */
  | { ok: false; problem: 'notBackup' | 'newer' };

const isRow = (x: unknown): x is Row => typeof x === 'object' && x !== null && !Array.isArray(x);
const live = (rows: Row[]) => rows.filter((r) => r.deletedAt === null || r.deletedAt === undefined);

/** Reads a backup file's text, checking it's one this Daybloom can restore. */
export function readBackup(text: string): ReadBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'notBackup' };
  }
  if (!isRow(data) || data.app !== 'Daybloom' || !isRow(data.tables) || typeof data.dataVersion !== 'number') {
    return { ok: false, problem: 'notBackup' };
  }
  if (data.dataVersion > migrations.journal.entries.length) return { ok: false, problem: 'newer' };
  // a table from an older Daybloom that didn't have it yet is simply empty
  const tables = {} as Record<TableName, Row[]>;
  for (const [name] of ORDER) {
    const rows = data.tables[name] ?? [];
    if (!Array.isArray(rows) || !rows.every(isRow)) return { ok: false, problem: 'notBackup' };
    tables[name] = rows;
  }
  const backup: Backup = {
    app: 'Daybloom',
    dataVersion: data.dataVersion,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    tables,
  };
  const ownEvents = live(tables.events).filter((e) => e.source !== 'device' && !e.seriesId);
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      events: ownEvents.length,
      todos: live(tables.tasks).length,
      habits: tables.habits.filter((h) => !h.archivedAt && !h.deletedAt).length,
      expenses: live(tables.entries).filter((e) => e.type === 'expense').length,
      goals: live(tables.goals).length,
      bills: live(tables.bills).length,
    },
  };
}

/** Inserts rows a few at a time (SQLite limits how many values one statement takes). */
function insertAll(db: Db, table: SQLiteTable, rows: Row[]): void {
  for (let i = 0; i < rows.length; i += 50)
    db.insert(table)
      .values(rows.slice(i, i + 50))
      .run();
}

/**
 * Replaces Daybloom's data with a backup's, all at once; the Undo puts back what was there. Phone
 * calendar events and this phone's calendar settings stay; drafts and unread bank texts go.
 */
export function restoreBackup(db: Db, backup: Backup): Undo {
  const before = backupOf(db, Date.now());
  const t = backup.tables;
  // the backup's copies of phone-calendar events (and their reminders) are left out
  const phoneEvents = new Set(t.events.filter((e) => e.source === 'device').map((e) => e.id));
  const rows: Record<TableName, Row[]> = {
    ...t,
    events: t.events.filter((e) => !phoneEvents.has(e.id)),
    reminders: t.reminders.filter((r) => !(r.targetType === 'event' && phoneEvents.has(r.targetId))),
    settings: t.settings.filter((s) => !PHONE_SETTINGS.includes(String(s.key))),
  };

  db.transaction((tx) => {
    const kept = tx
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(eq(schema.events.source, 'device'))
      .all()
      .map((e) => e.id);
    // this phone's calendar events keep their place; a category the backup doesn't have comes off them
    const categoryIds = rows.categories.map((c) => String(c.id));
    tx.update(schema.events)
      .set({ categoryId: null })
      .where(
        and(
          eq(schema.events.source, 'device'),
          categoryIds.length ? notInArray(schema.events.categoryId, categoryIds) : undefined,
        ),
      )
      .run();

    // out with the old, children first; nothing is queued to delete from the phone's calendars
    tx.delete(schema.drafts).run();
    tx.delete(schema.smsUnmatched).run();
    for (const [name, table] of [...ORDER].reverse()) {
      if (name === 'events') tx.delete(schema.events).where(ne(schema.events.source, 'device')).run();
      else if (name === 'reminders')
        tx.delete(schema.reminders)
          .where(
            kept.length
              ? not(and(eq(schema.reminders.targetType, 'event'), inArray(schema.reminders.targetId, kept))!)
              : undefined,
          )
          .run();
      else if (name === 'settings')
        tx.delete(schema.settings).where(notInArray(schema.settings.key, PHONE_SETTINGS)).run();
      else tx.delete(table).run();
    }
    tx.delete(schema.calendarRemovals).run();

    // in with the backup, parents first
    for (const [name, table] of ORDER) insertAll(tx, table, rows[name]);
  });

  return () => {
    restoreBackup(db, before);
  };
}
