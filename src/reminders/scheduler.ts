// Keeps the phone's scheduled notifications in step with plan.ts: on start, after any change, and
// when the app comes back. A rolling window of the next reminders (iOS allows 64; PLAN 5.4).
// The phone delivers them with the app closed and after a restart (FR-10).
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { t } from '@/i18n';
import { readSettings } from '@/settings';
import { colors } from '@/theme';

import * as Notifications from './notifications';
import { plannedReminders, reminderChanges, type PlannedReminder, type ReminderData } from './plan';

export const CHANNEL = 'reminders';

/**
 * Expo Go on Android can't show local reminders any more (its notification channels are gone since
 * SDK 53), so there Daybloom skips them quietly; the installed app (a development or store build) has them.
 */
export const remindersAvailable = !(Platform.OS === 'android' && isRunningInExpoGo());
const PLANNED = /^[ethr]\./; // ids made by plan.ts (events, to-dos, habits, routines); snoozes and tests are left alone

export async function setUpNotifications(): Promise<void> {
  if (!remindersAvailable) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: t.notify.channel,
      description: t.notify.channelText,
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.primary,
    });
  }
  // At most two buttons (NT-01). Snooze isn't offered once the event has started.
  await Notifications.setNotificationCategoryAsync('event', [
    { identifier: 'snooze', buttonTitle: t.notify.snooze, options: { opensAppToForeground: true } },
    { identifier: 'open', buttonTitle: t.notify.open, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('eventNow', [
    { identifier: 'open', buttonTitle: t.notify.open, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('task', [
    { identifier: 'done', buttonTitle: t.notify.done, options: { opensAppToForeground: true } },
    { identifier: 'later', buttonTitle: t.notify.later, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('routine', [
    { identifier: 'open', buttonTitle: t.notify.openChecklist, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('habit', [
    { identifier: 'done', buttonTitle: t.notify.done, options: { opensAppToForeground: true } },
    { identifier: 'open', buttonTitle: t.notify.open, options: { opensAppToForeground: true } },
  ]);
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Asks once, in plain words around it (FR-12, ON-01). The app works either way. */
export async function askForNotifications(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function contentOf(
  r: Pick<PlannedReminder, 'title' | 'body' | 'urgent' | 'atStart' | 'data'>,
): Notifications.NotificationContentInput {
  return {
    title: r.title,
    body: r.body,
    data: r.data,
    // urgent to-dos use the rose accent (NT-01)
    color: r.urgent ? colors.secondary : colors.primary,
    categoryIdentifier: r.data.kind === 'event' ? (r.atStart ? 'eventNow' : 'event') : r.data.kind,
    sound: 'default',
  };
}

let running: Promise<void> | null = null;
let again = false;

/** Brings the scheduled notifications in line with the plan. Safe to call often. */
export function syncReminders(): Promise<void> {
  if (!remindersAvailable) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        if (!(await notificationsAllowed())) return;
        const settings = readSettings(db);
        const planned = plannedReminders(db, Date.now(), settings.timeFormat, undefined, settings.weekStart);
        const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
          .filter((n) => PLANNED.test(n.identifier))
          .map((n) => ({ id: n.identifier, sig: (n.content.data as Partial<ReminderData> | undefined)?.sig }));
        const { cancel, add } = reminderChanges(scheduled, planned);
        for (const id of cancel) await Notifications.cancelScheduledNotificationAsync(id);
        for (const r of add) {
          await Notifications.scheduleNotificationAsync({
            identifier: r.id,
            content: contentOf(r),
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: CHANNEL },
          });
        }
      } while (again);
    } catch (e) {
      console.warn('Could not update reminders', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Snooze 10 min / In 30 min: the same reminder again later, never past an event's start (NT-01). */
export async function remindAgain(content: Notifications.NotificationContent, minutes: number): Promise<void> {
  if (!remindersAvailable) return;
  const data = content.data as ReminderData;
  let when = Date.now() + minutes * 60_000;
  if (data.kind === 'event') when = Math.min(when, data.at);
  if (when <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `snooze.${Date.now()}`,
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      color: (content as { color?: string }).color,
      categoryIdentifier: data.kind === 'task' ? 'task' : 'eventNow',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
  });
}

/** "Send a test reminder" on the help screen (ST-03): arrives in a minute. */
export async function sendTestReminder(): Promise<boolean> {
  if (!remindersAvailable) return false;
  if (!(await askForNotifications())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: `test.${Date.now()}`,
    content: { title: t.notify.testTitle, body: t.notify.testBody, color: colors.primary, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: Date.now() + 60_000, channelId: CHANNEL },
  });
  return true;
}
