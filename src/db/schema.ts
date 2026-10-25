// Daybloom's on-device database (SQLite via expo-sqlite + Drizzle). See docs/PLAN.md section 5.3.
// Conventions:
//   - ids are text UUIDs; timestamps are integer milliseconds since epoch (UTC)
//   - calendar days are text 'YYYY-MM-DD', months 'YYYY-MM', clock times 'HH:mm' (the user's local wall time)
//   - money is integer cents (NFR-12)
//   - soft delete with deleted_at (undo + future sync)
//   - nothing derived (streaks, totals, counts) is stored (FR-13)
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey();
const createdAt = () => integer('created_at').notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () => integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`);
const deletedAt = () => integer('deleted_at');
const bool = (name: string) => integer(name, { mode: 'boolean' }).notNull().default(false);

export const categories = sqliteTable('categories', {
  id: id(),
  name: text('name').notNull(),
  /** wellness | work | personal | social | creative (palette key from design/tokens.json) */
  colorKey: text('color_key').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at'),
});

export const events = sqliteTable(
  'events',
  {
    id: id(),
    title: text('title').notNull(),
    notes: text('notes'),
    location: text('location'),
    categoryId: text('category_id').references(() => categories.id),
    urgent: bool('urgent'),
    allDay: bool('all_day'),
    /** UTC ms; for all-day events, midnight of the first day in time_zone */
    startAt: integer('start_at').notNull(),
    endAt: integer('end_at').notNull(),
    /** IANA zone the event was created in, e.g. 'Africa/Nairobi' (FR-11) */
    timeZone: text('time_zone').notNull(),
    /** RFC 5545 rule, same format Google Calendar uses (FR-05) */
    rrule: text('rrule'),
    /** For an exception to a repeating event: the series it belongs to and the original start it replaces */
    seriesId: text('series_id'),
    originalStartAt: integer('original_start_at'),
    /** local | device (a phone calendar, GC-01) | google (a later direct sync) */
    source: text('source').notNull().default('local'),
    /** For a phone-calendar event: its id there, and a fingerprint of what was last read or written (sync/fingerprint.ts) */
    externalId: text('external_id'),
    externalEtag: text('external_etag'),
    /** The phone calendar it lives in (Android's calendar id) */
    calendarId: text('calendar_id'),
    /** An invitation's answer: invited | accepted | tentative | declined (GC-05) */
    invite: text('invite'),
    /** Can't be changed from Daybloom: someone else's invitation, or a calendar it may only read */
    readOnly: bool('read_only'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index('events_start_idx').on(t.startAt),
    index('events_series_idx').on(t.seriesId),
    index('events_external_idx').on(t.externalId),
  ],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    title: text('title').notNull(),
    notes: text('notes'),
    urgent: bool('urgent'),
    categoryId: text('category_id').references(() => categories.id),
    /** Free-text list label, e.g. "Finances", "Home" */
    listLabel: text('list_label'),
    /** day = a Daily Intention; week = a Weekly Priority */
    scope: text('scope').notNull().default('day'),
    /** The day, or the first day of the week for weekly priorities */
    date: text('date').notNull(),
    /** Optional due time 'HH:mm'; a to-do with a due date is a deadline (FR-14) */
    dueTime: text('due_time'),
    done: bool('done'),
    doneAt: integer('done_at'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('tasks_date_idx').on(t.date)],
);

/** Short notes written next to an hour on Today (TD-15). */
export const hourNotes = sqliteTable(
  'hour_notes',
  {
    id: id(),
    date: text('date').notNull(),
    hour: integer('hour').notNull(),
    text: text('text').notNull(),
    done: bool('done'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('hour_notes_date_idx').on(t.date)],
);

/** Reminders for events, to-dos, routines and bills; the scheduler keeps a rolling window of these. */
export const reminders = sqliteTable(
  'reminders',
  {
    id: id(),
    /** event | task | routine | habit | bill */
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    /** Minutes before the start/due time (0 = at the time) */
    offsetMinutes: integer('offset_minutes').notNull(),
  },
  (t) => [index('reminders_target_idx').on(t.targetType, t.targetId)],
);

export const weekIntentions = sqliteTable('week_intentions', {
  weekStart: text('week_start').primaryKey(),
  text: text('text').notNull(),
  updatedAt: updatedAt(),
});

/** A routine is a group of habits with an optional time (D1). */
export const routines = sqliteTable('routines', {
  id: id(),
  name: text('name').notNull(),
  icon: text('icon'),
  time: text('time'),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at'),
});

export const habits = sqliteTable('habits', {
  id: id(),
  name: text('name').notNull(),
  note: text('note'),
  icon: text('icon'),
  /** daily | weekly */
  frequency: text('frequency').notNull().default('daily'),
  routineId: text('routine_id').references(() => routines.id),
  /** Own reminder time 'HH:mm' for habits outside a routine; the first one when it repeats */
  reminderTime: text('reminder_time'),
  /** Several times a day (daily habits): again every this many minutes, up to reminderUntil 'HH:mm' */
  reminderEvery: integer('reminder_every'),
  reminderUntil: text('reminder_until'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  archivedAt: integer('archived_at'),
});

/** One row per tick. period = the day (daily) or the week's first day (weekly). */
export const habitChecks = sqliteTable(
  'habit_checks',
  {
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id),
    period: text('period').notNull(),
    checkedAt: integer('checked_at').notNull().default(sql`(unixepoch() * 1000)`),
  },
  // ticks are read by date range across all habits (Today, Week, Habits, reminders)
  (t) => [primaryKey({ columns: [t.habitId, t.period] }), index('habit_checks_period_idx').on(t.period)],
);

export const goals = sqliteTable('goals', {
  id: id(),
  title: text('title').notNull(),
  note: text('note'),
  icon: text('icon'),
  /** savings (Budget) | general (Month's goal) */
  kind: text('kind').notNull().default('savings'),
  targetCents: integer('target_cents').notNull(),
  savedCents: integer('saved_cents').notNull().default(0),
  /** 'YYYY-MM' for a month's goal */
  month: text('month'),
  dueDate: text('due_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  reachedAt: integer('reached_at'),
  archivedAt: integer('archived_at'),
});

export const budgetCategories = sqliteTable('budget_categories', {
  id: id(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  colorKey: text('color_key').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at'),
});

/** Money in or out, entered by hand or read from a bank text on the phone (no bank connection). */
export const entries = sqliteTable(
  'entries',
  {
    id: id(),
    /** expense | income */
    type: text('type').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    description: text('description').notNull(),
    budgetCategoryId: text('budget_category_id').references(() => budgetCategories.id),
    occurredAt: integer('occurred_at').notNull(),
    /** null = entered by hand; 'sms' = read from a text (BU-11) */
    source: text('source'),
    /** The text it came from (its id; a fee adds ':fee'), so one text is never added twice */
    ref: text('ref'),
    /** Who was paid, as the text said */
    payee: text('payee'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('entries_occurred_idx').on(t.occurredAt), uniqueIndex('entries_ref_idx').on(t.ref)],
);

/** Who sends the bank or mobile-money texts that expenses are read from (BU-11). */
export const smsSenders = sqliteTable('sms_senders', {
  id: id(),
  /** As the phone shows the sender, e.g. 'M-Money' */
  address: text('address').notNull().unique(),
  /** What to call it, e.g. 'MoMo' */
  label: text('label').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  /** Texts that arrived up to this time have been read (older ones were added only if picked at setup) */
  readUntil: integer('read_until').notNull(),
  createdAt: createdAt(),
});

/** The shapes of a sender's texts, learned from them (src/sms/learn.ts) and confirmed by the person. */
export const smsPatterns = sqliteTable(
  'sms_patterns',
  {
    id: id(),
    senderId: text('sender_id')
      .notNull()
      .references(() => smsSenders.id),
    /** spend | income | ignore */
    kind: text('kind').notNull(),
    regex: text('regex').notNull(),
    amountGroup: integer('amount_group'),
    feeGroup: integer('fee_group'),
    payeeGroup: integer('payee_group'),
    /** A text it was learned from, to show */
    example: text('example').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sms_patterns_sender_idx').on(t.senderId)],
);

/** Texts that looked like spending but had no known shape, for the person to teach (BU-11). */
export const smsUnmatched = sqliteTable('sms_unmatched', {
  /** messageId(address, body) */
  id: text('id').primaryKey(),
  senderId: text('sender_id')
    .notNull()
    .references(() => smsSenders.id),
  body: text('body').notNull(),
  receivedAt: integer('received_at').notNull(),
});

export const bills = sqliteTable('bills', {
  id: id(),
  title: text('title').notNull(),
  note: text('note'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  /** Next due day 'YYYY-MM-DD' */
  dueDate: text('due_date').notNull(),
  /** Day of the month it falls on (31 = the last day in shorter months), so repeats don't drift */
  dueDay: integer('due_day'),
  /** null = just once; 1, 3, 6 or 12 = repeats every N months */
  repeatMonths: integer('repeat_months'),
  /** auto (added to spending on the day) | manual (added when marked paid) */
  payment: text('payment').notNull().default('auto'),
  lastPaidAt: integer('last_paid_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

/**
 * The budget, monthly or weekly (BU-04). A change applies from the period it was made in, so earlier
 * months or weeks keep the budget they had. null amount = no budget from then on.
 */
export const budgetPlans = sqliteTable('budget_plans', {
  /** month | week */
  period: text('period').notNull(),
  /** First day of the period it starts in 'YYYY-MM-DD' */
  startsOn: text('starts_on').primaryKey(),
  amountCents: integer('amount_cents'),
  createdAt: createdAt(),
});

/** Small key/value settings (name, week start, time style, seasons, currency, calm mode…). Values are JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * Unsaved typing (UX-05): the text of a form that wasn't saved yet, so it comes back after the app
 * closes. One row per form; screens don't re-read on changes here (see data/live.ts).
 */
export const drafts = sqliteTable('drafts', {
  key: text('key').primaryKey(),
  /** JSON of the form's text fields */
  value: text('value').notNull(),
  updatedAt: updatedAt(),
});

/**
 * Phone-calendar events Daybloom dropped by itself (a changed occurrence of a series whose times
 * changed), so the sync removes them from the phone's calendar too (GC-03).
 */
export const calendarRemovals = sqliteTable('calendar_removals', {
  externalId: text('external_id').primaryKey(),
  removedAt: integer('removed_at').notNull().default(sql`(unixepoch() * 1000)`),
});
