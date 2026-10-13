import { useEffect, useState } from 'react';
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

/** The current time, updated every minute and when the app comes back (TD-14). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    let every: ReturnType<typeof setInterval> | undefined;
    // first tick on the next whole minute, then every minute
    const first = setTimeout(
      () => {
        tick();
        every = setInterval(tick, 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshLocalTimeZone(); // the phone may have moved zones while away
        notifyDataChanged();
        tick();
      }
    });
    return () => {
      clearTimeout(first);
      clearInterval(every);
      sub.remove();
    };
  }, []);
  return now;
}

/** Today's 'YYYY-MM-DD' on the phone's calendar; changes at midnight. */
export function useToday(): string {
  return toDayKey(new Date(useNow()));
}
