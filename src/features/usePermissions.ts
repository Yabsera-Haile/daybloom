// What Daybloom may do on this phone, for the first-run pages (ON-01) and Settings › Phone
// permissions (ST-06): reminders, reading payment texts, popping up over other apps, and running in
// the background. Checked again whenever the person comes back from the phone's settings.
import * as Battery from 'expo-battery';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { requestTexts, sms } from '@/sms/native';

import { useNotificationStatus } from './useNotificationStatus';

/** true = allowed, false = not yet; null = doesn't apply to this phone (or not known yet). */
export type PhonePermissions = {
  reminders: boolean | null;
  texts: boolean | null;
  popUp: boolean | null;
  background: boolean | null;
};

async function readOthers(): Promise<Omit<PhonePermissions, 'reminders'>> {
  const background =
    Platform.OS === 'android'
      ? await Battery.isBatteryOptimizationEnabledAsync().then(
          (limited) => !limited,
          () => null,
        )
      : null;
  return { texts: sms ? sms.hasPermission() : null, popUp: sms ? sms.canPopUp() : null, background };
}

export function usePermissions() {
  const { status, turnOn } = useNotificationStatus();
  const [others, setOthers] = useState<Omit<PhonePermissions, 'reminders'>>({
    texts: sms ? sms.hasPermission() : null,
    popUp: sms ? sms.canPopUp() : null,
    background: null,
  });

  const refresh = useCallback(async () => setOthers(await readOthers()), []);

  useEffect(() => {
    let alive = true;
    const load = () => readOthers().then((s) => alive && setOthers(s));
    void load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  /** Asks the phone; once it no longer asks, opens Daybloom's page in the phone's settings. */
  const allowTexts = useCallback(async (): Promise<boolean> => {
    const result = await requestTexts();
    if (result === 'blocked') await Linking.openSettings();
    await refresh();
    return result === 'granted';
  }, [refresh]);

  return {
    permissions: { reminders: status ? status.granted : null, ...others } satisfies PhonePermissions,
    allowReminders: turnOn,
    allowTexts,
    /** The phone's "Appear on top" page for Daybloom; checked again on coming back. */
    allowPopUp: () => sms?.openPopUpSettings(),
    /** Daybloom's page in the phone's settings, where Battery › Unrestricted is. */
    allowBackground: () => Linking.openSettings(),
    refresh,
  };
}
