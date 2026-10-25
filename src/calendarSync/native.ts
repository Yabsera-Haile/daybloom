// Daybloom's own Android module (modules/daybloom-calendar) over the phone's calendar store, where
// Google Calendar and other accounts keep their events (GC-01). Not in Expo Go; iOS will use
// expo-calendar (EventKit) behind the same shape later.
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

/** A calendar on the phone, e.g. "you@gmail.com" of a Google account, or Holidays. */
export type PhoneCalendar = {
  id: string;
  name: string;
  /** The account it belongs to, and its kind ('com.google' for Google). */
  account: string;
  accountType: string;
  color: string;
  /** Daybloom may add and change events in it. */
  writable: boolean;
  /** Shown in the phone's calendar app. */
  visible: boolean;
  primary: boolean;
  owner: string | null;
  synced: boolean;
};

/** An event as the phone keeps it (times in UTC ms). */
export type PhoneEvent = {
  id: string;
  calendarId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: number | null;
  /** One-off events have an end; repeating ones a length (`duration`, RFC 5545, e.g. 'P3600S'). */
  endAt: number | null;
  duration: string | null;
  allDay: boolean;
  timeZone: string | null;
  rrule: string | null;
  /** Occurrences left out of a repeating event (RFC 5545 EXDATE values). */
  exdate: string | null;
  /** For a changed or cancelled occurrence: the repeating event, and which occurrence. */
  originalId: string | null;
  originalStartAt: number | null;
  cancelled: boolean;
  /** Your answer to an invitation: 0 none, 1 accepted, 2 declined, 3 invited, 4 tentative. */
  selfStatus: number;
  organizer: string | null;
  hasGuests: boolean;
  guestsCanModify: boolean;
  isOrganizer: boolean;
  color: string | null;
  syncId: string | null;
  originalSyncId: string | null;
};

/** What Daybloom writes for an event (all-day ones at midnight UTC). */
export type EventValues = {
  calendarId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: number;
  endAt: number;
  allDay: boolean;
  timeZone: string;
  rrule: string | null;
};

export type Answer = 'accepted' | 'tentative' | 'declined';

/** The parts of the phone's calendar the sync uses (a fake one stands in for it in tests). */
export interface CalendarStore {
  calendars(): Promise<PhoneCalendar[]>;
  events(calendarIds: string[], since: number): Promise<PhoneEvent[]>;
  insert(values: EventValues): Promise<string>;
  insertException(
    originalId: string,
    originalStartAt: number,
    values: EventValues | null,
    cancelled: boolean,
  ): Promise<string>;
  update(id: string, values: EventValues): Promise<boolean>;
  setCancelled(id: string, cancelled: boolean): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  respond(eventId: string, answer: Answer): Promise<boolean>;
}

declare class DaybloomCalendarModule extends NativeModule implements CalendarStore {
  hasPermission(): boolean;
  calendars(): Promise<PhoneCalendar[]>;
  events(calendarIds: string[], since: number): Promise<PhoneEvent[]>;
  insert(values: EventValues): Promise<string>;
  insertException(
    originalId: string,
    originalStartAt: number,
    values: EventValues | null,
    cancelled: boolean,
  ): Promise<string>;
  update(id: string, values: EventValues): Promise<boolean>;
  setCancelled(id: string, cancelled: boolean): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  respond(eventId: string, answer: Answer): Promise<boolean>;
  open(eventId: string, begin: number, end: number): void;
}

export const phoneCalendar =
  Platform.OS === 'android' ? requireOptionalNativeModule<DaybloomCalendarModule>('DaybloomCalendar') : null;

/**
 * Asks to see and change the phone's calendars. 'blocked' when the phone no longer shows the
 * question (it was refused for good), so only its settings can allow it.
 */
export async function requestCalendars(): Promise<'granted' | 'denied' | 'blocked'> {
  if (!phoneCalendar) return 'denied';
  if (phoneCalendar.hasPermission()) return 'granted';
  const result = Object.values(
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
      PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
    ]),
  );
  if (result.every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  return result.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) ? 'blocked' : 'denied';
}
