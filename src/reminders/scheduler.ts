// Keeps the phone's scheduled notifications in step with plan.ts: on start, after any change, and
// when the app comes back. A rolling window of the next reminders (iOS allows 64; PLAN 5.4).
// The phone delivers them with the app closed and after a restart (FR-10).
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { petPicture } from '@/features/pet/picture';
import { t } from '@/i18n';
import { petLine, withPet, type PetVoice } from '@/pet/remind';
import { readSettings, type ReminderSound, type Settings } from '@/settings';
import { defaultColors as colors } from '@/theme';

import * as Notifications from './notifications';
import { plannedReminders, reminderChanges, type PlannedReminder, type ReminderData } from './plan';
import { CHANNEL_PREFIX, channelFor, soundFor, VIBRATION } from './sounds';

/**
 * Expo Go on Android can't show local reminders any more (its notification channels are gone since
 * SDK 53), so there Daybloom skips them quietly; the installed app (a development or store build) has them.
 */
export const remindersAvailable = !(Platform.OS === 'android' && isRunningInExpoGo());
const PLANNED = /^[ethrb]\./; // ids made by plan.ts (events, to-dos, habits, routines, bills); snoozes and tests are left alone

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
  await ensureChannel(readSettings(db).reminderSound);
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
  await Notifications.setNotificationCategoryAsync('bill', [
    { identifier: 'done', buttonTitle: t.notify.markPaid, options: { opensAppToForeground: true } },
    { identifier: 'open', buttonTitle: t.notify.open, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('billAuto', [
    { identifier: 'open', buttonTitle: t.notify.open, options: { opensAppToForeground: true } },
  ]);
}

/**
 * The channel for a reminder sound (Android). Android fixes a channel's sound when it's made, so
 * each sound has its own; the sound and vibration are set explicitly so they don't depend on the
 * phone's defaults.
 */
async function ensureChannel(sound: ReminderSound): Promise<string> {
  const id = channelFor(sound);
  if (Platform.OS !== 'android') return id;
  await Notifications.setNotificationChannelAsync(id, {
    name: t.notify.channel,
    description: t.notify.channelText,
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.primary,
    enableVibrate: true,
    vibrationPattern: VIBRATION,
    // omitted = the phone's notification sound; null = silent (vibrate only)
    ...(sound === 'phone' ? {} : { sound: soundFor(sound) }),
  });
  return id;
}

/** Removes Daybloom's channels for sounds no longer chosen (after their reminders have moved). */
async function removeOtherChannels(keep: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const channel of await Notifications.getNotificationChannelsAsync()) {
    if (channel.id.startsWith(CHANNEL_PREFIX) && channel.id !== keep) {
      await Notifications.deleteNotificationChannelAsync(channel.id);
    }
  }
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

/** The companion that sends the reminders, with its picture (MS-03); none when off or in Calm mode. */
function petVoice(settings: Settings): PetVoice | null {
  if (settings.pet === 'off' || settings.calm) return null;
  return {
    kind: settings.pet,
    name: settings.petName ?? t.pet.names[settings.pet],
    personality: settings.petPersonality,
    picture: Platform.OS === 'android' ? petPicture(settings.pet) : null,
  };
}

function contentOf(
  r: Pick<PlannedReminder, 'title' | 'body' | 'urgent' | 'atStart' | 'data'>,
  sound: ReminderSound,
): Notifications.NotificationContentInput {
  return {
    title: r.title,
    body: r.body,
    data: r.data,
    // urgent to-dos use the rose accent (NT-01)
    color: r.urgent ? colors.secondary : colors.primary,
    categoryIdentifier:
      r.data.kind === 'event'
        ? r.atStart
          ? 'eventNow'
          : 'event'
        : r.data.kind === 'bill' && !r.data.manual
          ? 'billAuto'
          : r.data.kind,
    // iOS and Android before 8 read the sound here; newer Android takes it from the channel
    sound: soundFor(sound) ?? false,
    vibrate: VIBRATION,
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
        const sound = settings.reminderSound;
        const channelId = await ensureChannel(sound);
        // the sound is part of each reminder's signature: choosing another sound moves them all; the
        // pet says its line after the time and title (MS-03)
        const pet = petVoice(settings);
        const planned = plannedReminders(db, Date.now(), settings.timeFormat, undefined, settings.weekStart).map((r) =>
          withPet({ ...r, data: { ...r.data, sig: r.data.sig + '|' + sound } }, pet),
        );
        const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
          .filter((n) => PLANNED.test(n.identifier))
          .map((n) => ({ id: n.identifier, sig: (n.content.data as Partial<ReminderData> | undefined)?.sig }));
        const { cancel, add } = reminderChanges(scheduled, planned);
        for (const id of cancel) await Notifications.cancelScheduledNotificationAsync(id);
        for (const r of add) {
          await Notifications.scheduleNotificationAsync({
            identifier: r.id,
            content: contentOf(r, sound),
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId },
          });
        }
        await removeOtherChannels(channelId);
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
  const sound = readSettings(db).reminderSound;
  const channelId = await ensureChannel(sound);
  await Notifications.scheduleNotificationAsync({
    identifier: `snooze.${Date.now()}`,
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      color: (content as { color?: string }).color,
      categoryIdentifier: data.kind === 'task' ? 'task' : 'eventNow',
      sound: soundFor(sound) ?? false,
      vibrate: VIBRATION,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId },
  });
}

/**
 * "Send a test reminder" (ST-03): arrives after a minute (the help screen), or after a few seconds
 * to hear the reminder sound (Settings), with the sound chosen now.
 */
export async function sendTestReminder(inSeconds = 60): Promise<boolean> {
  if (!remindersAvailable) return false;
  if (!(await askForNotifications())) return false;
  const settings = readSettings(db);
  const sound = settings.reminderSound;
  const channelId = await ensureChannel(sound);
  const pet = petVoice(settings);
  await Notifications.scheduleNotificationAsync({
    identifier: `test.${Date.now()}`,
    content: {
      title: t.notify.testTitle,
      body: pet ? `${t.notify.testBody} · ${petLine(pet, 'test')}` : t.notify.testBody,
      data: pet?.picture ? { largeIcon: pet.picture } : undefined,
      color: colors.primary,
      sound: soundFor(sound) ?? false,
      vibrate: VIBRATION,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: Date.now() + inSeconds * 1000, channelId },
  });
  return true;
}
