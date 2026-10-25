import { useEffect, useState } from 'react';

import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';

import { phoneCalendar, type PhoneCalendar } from './native';

/** The last list read, so a screen opening again shows names at once. */
let known: PhoneCalendar[] = [];

/** The phone's calendars, once Daybloom may see them (read again when a screen opens). */
export function usePhoneCalendars(): PhoneCalendar[] {
  const { phoneCalendars } = useSettings();
  const [list, setList] = useState(known);
  const connected = phoneCalendars.length > 0;
  useEffect(() => {
    if (!connected || !phoneCalendar?.hasPermission()) return;
    phoneCalendar
      .calendars()
      .then((all) => {
        known = all;
        setList(all);
      })
      .catch(() => undefined);
  }, [connected]);
  return list;
}

/** What to call a calendar in a sentence: "Google Calendar" for a Google account's, else its name. */
export const calendarTitle = (c: PhoneCalendar | undefined) =>
  !c ? t.calendars.yourCalendar : c.accountType === 'com.google' ? t.calendars.google : c.name || c.account;
