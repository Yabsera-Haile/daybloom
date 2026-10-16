// Back up everything (ST-02): every table in one JSON file the person can keep wherever they like
// (Drive, Files, email to themselves). Nothing is sent anywhere by Daybloom itself (NFR-06).
import { toDayKey } from '@/calendar/dates';
import * as schema from '@/db/schema';
import type { Db } from '@/db/types';

import migrations from '../../drizzle/migrations';

/** The tables that hold the person's data (unsaved drafts and bank texts not yet understood are left out). */
const TABLES = {
  categories: schema.categories,
  events: schema.events,
  tasks: schema.tasks,
  hourNotes: schema.hourNotes,
  reminders: schema.reminders,
  weekIntentions: schema.weekIntentions,
  routines: schema.routines,
  habits: schema.habits,
  habitChecks: schema.habitChecks,
  goals: schema.goals,
  budgetCategories: schema.budgetCategories,
  entries: schema.entries,
  bills: schema.bills,
  budgetPlans: schema.budgetPlans,
  smsSenders: schema.smsSenders,
  smsPatterns: schema.smsPatterns,
  settings: schema.settings,
} as const;

export type Backup = {
  app: 'Daybloom';
  /** How far the database has been updated, so a future restore knows what it is reading */
  dataVersion: number;
  exportedAt: string;
  tables: { [K in keyof typeof TABLES]: Record<string, unknown>[] };
};

export function backupOf(db: Db, now: number): Backup {
  const tables = {} as Record<keyof typeof TABLES, Record<string, unknown>[]>;
  for (const name of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    tables[name] = db.select().from(TABLES[name]).all();
  }
  return {
    app: 'Daybloom',
    dataVersion: migrations.journal.entries.length,
    exportedAt: new Date(now).toISOString(),
    tables,
  };
}

/** "daybloom-backup-2024-10-23.json" */
export const backupFileName = (now: number) => `daybloom-backup-${toDayKey(new Date(now))}.json`;
