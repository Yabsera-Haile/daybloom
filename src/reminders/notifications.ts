// The parts of expo-notifications Daybloom uses, imported one by one. The package's main entry
// starts push-token registration as soon as it loads, and in Expo Go on Android that throws (push
// was removed from Expo Go in SDK 53), taking every screen that imports it down. Daybloom only
// schedules local reminders, which Expo Go still supports, so it never loads the push code.
export { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
export { dismissNotificationAsync } from 'expo-notifications/build/dismissNotificationAsync';
export { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export {
  SchedulableTriggerInputTypes,
  type NotificationContent,
  type NotificationContentInput,
  type NotificationResponse,
} from 'expo-notifications/build/Notifications.types';
export {
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  getLastNotificationResponse,
} from 'expo-notifications/build/NotificationsEmitter';
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { setNotificationCategoryAsync } from 'expo-notifications/build/setNotificationCategoryAsync';
export { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
