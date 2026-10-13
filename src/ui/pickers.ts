// The phone's own date and time pickers (design/daybloom/README: "Date and time fields open the
// phone's own pickers"). Android dialogs; iOS gets its inline pickers in Phase 5.
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { toDayKey } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';

/** Resolves with the chosen 'YYYY-MM-DD', or null if the picker was closed. */
export function pickDay(day: string): Promise<string | null> {
  const p = parseDayKey(day);
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: new Date(p.year, p.month - 1, p.day, 12),
      mode: 'date',
      onValueChange: (_event, date) => resolve(toDayKey(date)),
      onDismiss: () => resolve(null),
    });
  });
}

/** Resolves with the chosen 'HH:mm', or null if the picker was closed. */
export function pickTime(hhmm: string, is24Hour: boolean): Promise<string | null> {
  const [h, m] = hhmm.split(':').map(Number);
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: new Date(2000, 0, 1, h, m),
      mode: 'time',
      is24Hour,
      onValueChange: (_event, date) =>
        resolve(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`),
      onDismiss: () => resolve(null),
    });
  });
}
