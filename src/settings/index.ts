// Settings (ST-01). Only what the user changes is stored; everything else follows the phone, so a
// new install starts with the phone's week start, clock style and currency (ON-01, D9).
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
}

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

export function saveSetting<K extends keyof Settings>(db: Db, key: K, value: Settings[K]): void {
  const v = typeof value === 'string' && key === 'name' ? value.trim() || null : value;
  if (!checks[key](v)) throw new Error(`Not a valid ${key}: ${String(value)}`);
  const json = JSON.stringify(v);
  db.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } }).run();
}
