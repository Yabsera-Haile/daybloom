import * as Notifications from './notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getBill, markBillPaid } from '@/budget/bills';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { onDataChanged, onlyTouched } from '@/data/live';
import { getHabit, setHabitDone } from '@/habits/store';
import { findOccurrence } from '@/planner/events';
import { setTaskDone } from '@/planner/tasks';
import { readSettings } from '@/settings';
import { useUi } from '@/state/ui';

import type { ReminderData } from './plan';
import { remindAgain, remindersAvailable, setUpNotifications, syncReminders } from './scheduler';

function handle(response: Notifications.NotificationResponse) {
  const { content, identifier } = response.notification.request;
  const data = content.data as Partial<ReminderData> | undefined;
  if (!data?.kind || !data.day) return;
  switch (response.actionIdentifier) {
    case 'done':
      if (data.taskId) setTaskDone(db, data.taskId, true);
      if (data.habitId) {
        const habit = getHabit(db, data.habitId);
        if (habit) setHabitDone(db, habit, data.day, true, readSettings(db).weekStart);
      }
      // "Mark paid", unless it was already paid in the app
      if (data.billId && getBill(db, data.billId)?.dueDate === data.day) markBillPaid(db, data.billId, Date.now());
      break;
    case 'later':
      void remindAgain(content, 30);
      break;
    case 'snooze':
      void remindAgain(content, 10);
      break;
    default: {
      // a tap (or "Open"): a habit opens Habits, a bill Budget; anything else shows that day on Today
      // with the item open
      if (data.kind === 'habit' || data.kind === 'bill') {
        router.navigate(data.kind === 'habit' ? '/habits' : '/budget');
        break;
      }
      const ui = useUi.getState();
      ui.showDay(data.day === toDayKey(new Date()) ? null : data.day);
      router.navigate('/');
      if (data.taskId) ui.openSheet({ kind: 'taskMenu', taskId: data.taskId });
      else if (data.eventId) {
        const occurrence = findOccurrence(db, {
          eventId: data.eventId,
          seriesId: data.seriesId,
          originalStartAt: data.originalStartAt,
        });
        if (occurrence) ui.openSheet({ kind: 'event', occurrence });
      }
    }
  }
  void Notifications.dismissNotificationAsync(identifier);
}

/** Keeps reminders scheduled and answers taps and buttons. Mounted once, after the database is ready. */
/** Tables no reminder is made from (any other change, or a new table, works the reminders out again). */
const NO_REMINDERS = new Set([
  'entries',
  'budget_categories',
  'budget_plans',
  'goals',
  'hour_notes',
  'week_intentions',
  'sms_senders',
  'sms_patterns',
  'sms_unmatched',
]);

export function useReminders(): void {
  useEffect(() => {
    if (!remindersAvailable) return;
    void setUpNotifications().then(syncReminders);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopData = onDataChanged((tables) => {
      // spending, savings and bank texts never change a reminder: no need to work them all out again
      if (onlyTouched(tables, NO_REMINDERS)) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncReminders(), 800);
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminders();
    });
    const responses = Notifications.addNotificationResponseReceivedListener(handle);
    const launched = Notifications.getLastNotificationResponse();
    if (launched) {
      handle(launched);
      Notifications.clearLastNotificationResponse();
    }
    return () => {
      clearTimeout(timer);
      stopData();
      app.remove();
      responses.remove();
    };
  }, []);
}
