// Settings (ST-01). Only what the user changes is stored; everything else follows the phone, so a
// new install starts with the phone's week start, clock style and currency (ON-01, D9).
import { eq } from 'drizzle-orm';
import { getCalendars, getLocales } from 'expo-localization';

import { hemisphereForTimeZone, type Hemisphere, type WeekStart } from '@/calendar/dates';
import { localTimeZone } from '@/calendar/timezone';
import { settings } from '@/db/schema';
import type { Db } from '@/db/types';

export interface Settings {
  /** Optional first name, used only for greetings (D8). */
  name: string | null;
  weekStart: WeekStart;
  timeFormat: '12h' | '24h';
  /** The usual reminder for new events and to-dos, in minutes before; null = none. */
  defaultReminder: number | null;
  /** Seasonal stickers on Today (TD-03). */
  seasons: boolean;
  hemisphere: Hemisphere;
  /** ISO 4217 code, e.g. 'ZAR' (BU-09). */
  currency: string;
  /** Calm mode: fewer flourishes. */
  calm: boolean;
  /** Onboarding finished or skipped (ON-01). */
  onboarded: boolean;
  /** Colour theme: one season, or 'auto' to follow the seasons where you live. */
  theme: ThemeChoice;
  /** How reminders sound: the phone's own sound, one of Daybloom's, or vibrate only. */
  reminderSound: ReminderSound;
}

export type ThemeChoice = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
export const THEME_CHOICES: ThemeChoice[] = ['auto', 'spring', 'summer', 'autumn', 'winter'];

export type ReminderSound = 'phone' | 'chime' | 'bell' | 'birdsong' | 'marimba' | 'ring' | 'vibrate';
export const REMINDER_SOUNDS: ReminderSound[] = ['phone', 'chime', 'bell', 'birdsong', 'marimba', 'ring', 'vibrate'];

type Check<T> = (v: unknown) => v is T;
const isBool: Check<boolean> = (v): v is boolean => typeof v === 'boolean';

const checks: { [K in keyof Settings]: Check<Settings[K]> } = {
  name: (v): v is string | null => v === null || (typeof v === 'string' && v.trim() !== ''),
  weekStart: (v): v is WeekStart => v === 0 || v === 1 || v === 6,
  timeFormat: (v): v is '12h' | '24h' => v === '12h' || v === '24h',
  defaultReminder: (v): v is number | null => v === null || (Number.isInteger(v) && (v as number) >= 0),
  seasons: isBool,
  hemisphere: (v): v is Hemisphere => v === 'north' || v === 'south',
  currency: (v): v is string => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  calm: isBool,
  onboarded: isBool,
  theme: (v): v is ThemeChoice => THEME_CHOICES.includes(v as ThemeChoice),
  reminderSound: (v): v is ReminderSound => REMINDER_SOUNDS.includes(v as ReminderSound),
};

export function phoneDefaults(): Settings {
  const calendar = getCalendars()[0];
  // expo-localization counts Sunday = 1 … Saturday = 7; Daybloom offers Sunday, Monday or Saturday.
  const weekStart: WeekStart = calendar?.firstWeekday === 1 ? 0 : calendar?.firstWeekday === 7 ? 6 : 1;
  return {
    name: null,
    weekStart,
    timeFormat: calendar?.uses24hourClock ? '24h' : '12h',
    defaultReminder: 10,
    seasons: true,
    hemisphere: hemisphereForTimeZone(localTimeZone()),
    currency: getLocales()[0]?.currencyCode ?? 'USD',
    calm: false,
    onboarded: false,
    theme: 'autumn',
    reminderSound: 'chime',
  };
}

/** The user's choices on top of the phone's defaults. A stored value that doesn't make sense is ignored. */
export function readSettings(db: Db, defaults: Settings = phoneDefaults()): Settings {
  const out: Record<string, unknown> = { ...defaults };
  for (const row of db.select().from(settings).all()) {
    if (!Object.prototype.hasOwnProperty.call(checks, row.key)) continue;
    try {
      const value: unknown = JSON.parse(row.value);
      if (checks[row.key as keyof Settings](value)) out[row.key] = value;
    } catch {
      // unreadable: keep the default
    }
  }
  return out as unknown as Settings;
}

/**
 * Small remembered choices that aren't settings: a tip that was hidden (HB-03), a routine card
 * left collapsed (TD-05). Stored as `flag.<name>` next to the settings.
 */
export function readFlag(db: Db, name: string): boolean {
  return (
    db
      .select()
      .from(settings)
      .where(eq(settings.key, `flag.${name}`))
      .get()?.value === 'true'
  );
}

export function saveFlag(db: Db, name: string, on: boolean): void {
  if (!on) {
    db.delete(settings)
      .where(eq(settings.key, `flag.${name}`))
      .run();
    return;
  }
  db.insert(settings)
    .values({ key: `flag.${name}`, value: 'true' })
    .onConflictDoUpdate({ target: settings.key, set: { value: 'true' } })
    .run();
}

/** A small remembered value, like the day a prompt was put off ("Not now"). Stored as `memo.<name>`. */
export function readMemo(db: Db, name: string): string | null {
  return (
    db
      .select()
      .from(settings)
      .where(eq(settings.key, `memo.${name}`))
      .get()?.value ?? null
  );
}

export function saveMemo(db: Db, name: string, value: string | null): void {
  if (value === null) {
    db.delete(settings)
      .where(eq(settings.key, `memo.${name}`))
      .run();
    return;
  }
  db.insert(settings)
    .values({ key: `memo.${name}`, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function saveSetting<K extends keyof Settings>(db: Db, key: K, value: Settings[K]): void {
  const v = typeof value === 'string' && key === 'name' ? value.trim() || null : value;
  if (!checks[key](v)) throw new Error(`Not a valid ${key}: ${String(value)}`);
  const json = JSON.stringify(v);
  db.insert(settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } })
    .run();
}
