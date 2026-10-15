// The phone's own date and time pickers (design/daybloom/README: "Date and time fields open the
// phone's own pickers"). Android shows its dialogs; on iPhone the same calls open a sheet with
// Apple's inline calendar or time wheel (PickerHost, mounted once in Overlays).
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { toDayKey } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';

const pad = (n: number) => String(n).padStart(2, '0');
const clockOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** A picker waiting for an answer on iPhone. */
export type PickerRequest = {
  mode: 'date' | 'time';
  value: Date;
  is24Hour: boolean;
  /** Called once: the chosen moment, or null when closed */
  resolve: (date: Date | null) => void;
};

export const usePickerRequest = create<{ request: PickerRequest | null; set: (r: PickerRequest | null) => void }>(
  (set) => ({ request: null, set: (request) => set({ request }) }),
);

function ask(mode: 'date' | 'time', value: Date, is24Hour: boolean): Promise<Date | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour,
        onValueChange: (_event, date) => resolve(date),
        onDismiss: () => resolve(null),
      });
      return;
    }
    // one at a time: a new question closes the old one unanswered
    usePickerRequest.getState().request?.resolve(null);
    usePickerRequest.getState().set({ mode, value, is24Hour, resolve });
  });
}

/** Resolves with the chosen 'YYYY-MM-DD', or null if the picker was closed. */
export async function pickDay(day: string): Promise<string | null> {
  const p = parseDayKey(day);
  const date = await ask('date', new Date(p.year, p.month - 1, p.day, 12), false);
  return date ? toDayKey(date) : null;
}

/** Resolves with the chosen 'HH:mm', or null if the picker was closed. */
export async function pickTime(hhmm: string, is24Hour: boolean): Promise<string | null> {
  const [h, m] = hhmm.split(':').map(Number);
  const date = await ask('time', new Date(2000, 0, 1, h, m), is24Hour);
  return date ? clockOf(date) : null;
}
