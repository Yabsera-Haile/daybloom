import * as Notifications from '@/reminders/notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

type Status = { granted: boolean; canAskAgain: boolean };

const read = (): Promise<Status> =>
  Notifications.getPermissionsAsync().then((p) => ({ granted: p.granted, canAskAgain: p.canAskAgain }));

/** Whether reminders may show, re-checked when the person comes back from the phone's settings. */
export function useNotificationStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => read().then((s) => alive && setStatus(s));
    void load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  /** Asks, or opens the phone's settings for Daybloom once asking is no longer possible (FR-12). */
  const turnOn = useCallback(async () => {
    const now = await read();
    if (now.granted) return;
    if (now.canAskAgain) await Notifications.requestPermissionsAsync();
    else await Linking.openSettings();
    setStatus(await read());
  }, []);

  return { status, turnOn };
}
