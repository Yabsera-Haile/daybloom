import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { refreshLocalTimeZone } from '@/calendar/timezone';
import { db } from '@/db/client';
import { listCategories, type Category } from '@/planner/categories';
import { readSettings, type Settings } from '@/settings';

import { notifyDataChanged, useLive } from './live';

export function useSettings(): Settings {
  return useLive(() => readSettings(db), []);
}

export function useCategories(): Category[] {
  return useLive(() => listCategories(db), []);
}

// One clock for the whole app: a single timer and one app-state listener, however many screens
// show the time (each tab used to run its own).
let minute = Math.floor(Date.now() / 60_000) * 60_000;
const clockListeners = new Set<() => void>();
let stopClock: (() => void) | null = null;

function tick() {
  const now = Math.floor(Date.now() / 60_000) * 60_000;
  if (now === minute) return;
  minute = now;
  clockListeners.forEach((l) => l());
}

function startClock(): () => void {
  let timer: ReturnType<typeof setTimeout>;
  // tick on each whole minute
  const schedule = () => {
    timer = setTimeout(
      () => {
        tick();
        schedule();
      },
      60_000 - (Date.now() % 60_000) + 50,
    );
  };
  schedule();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      refreshLocalTimeZone(); // the phone may have moved zones while away
      notifyDataChanged();
      tick();
    }
  });
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  stopClock ??= startClock();
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      stopClock?.();
      stopClock = null;
    }
  };
}

const readClock = () => minute;

/** The current time to the minute, updated on each whole minute and when the app comes back (TD-14). */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, readClock);
}

/** Today's 'YYYY-MM-DD' on the phone's calendar; changes at midnight. */
export function useToday(): string {
  return toDayKey(new Date(useNow()));
}
