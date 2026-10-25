// Keeps the phone's calendars and Daybloom matched while the app is open (GC-02, GC-03): a full
// sync at start, when the app comes back, every few minutes and when the calendars shown change;
// Daybloom's own changes go out a moment after they're made.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import { onDataChanged, touched } from '@/data/live';
import { readSettings } from '@/settings';

import { phoneCalendar } from './native';
import { exclusive, pull, push } from './sync';

const EVENT_TABLES = new Set(['events', 'calendar_removals']);
const EVERY = 5 * 60_000;
/** Changes made together (a form saved, a series split) go in one push. */
const SETTLE = 400;

/** Sends what changed here, then brings in what changed on the phone. */
export async function syncCalendars(): Promise<void> {
  const store = phoneCalendar;
  if (!store?.hasPermission()) return;
  const { phoneCalendars } = readSettings(db);
  if (phoneCalendars.length === 0) return;
  await exclusive(async () => {
    await push(db, store);
    const shown = (await store.calendars()).filter((c) => phoneCalendars.includes(c.id));
    await pull(db, store, shown);
  });
}

/** Sends what changed here. */
export async function sendChanges(): Promise<void> {
  const store = phoneCalendar;
  if (!store?.hasPermission() || readSettings(db).phoneCalendars.length === 0) return;
  await exclusive(() => push(db, store));
}

export function useCalendarSync(): void {
  useEffect(() => {
    if (!phoneCalendar) return;
    const sync = () => void syncCalendars().catch(() => undefined);
    sync();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') sync();
    }, EVERY);
    let shown = JSON.stringify(readSettings(db).phoneCalendars);
    let pending: ReturnType<typeof setTimeout> | undefined;
    const off = onDataChanged((tables) => {
      if (touched(tables, new Set(['settings']))) {
        const now = JSON.stringify(readSettings(db).phoneCalendars);
        if (now !== shown) {
          shown = now;
          sync();
        }
      }
      if (touched(tables, EVENT_TABLES)) {
        clearTimeout(pending);
        pending = setTimeout(() => void sendChanges().catch(() => undefined), SETTLE);
      }
    });
    return () => {
      app.remove();
      clearInterval(timer);
      clearTimeout(pending);
      off();
    };
  }, []);
}
