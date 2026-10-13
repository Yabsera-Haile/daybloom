// Which reminders each event, to-do, routine or bill has (FR-04). The scheduler (M1 step 6)
// turns these into notifications; deleted items keep their rows so Undo brings reminders back.
import { and, eq } from 'drizzle-orm';

import { reminders } from '@/db/schema';
import { newId, type Db } from '@/db/types';

export type ReminderTarget = 'event' | 'task' | 'routine' | 'habit' | 'bill';

/** Minutes before the start or due time, smallest first (0 = at the time). */
export function reminderOffsets(db: Db, targetType: ReminderTarget, targetId: string): number[] {
  return db
    .select({ minutes: reminders.offsetMinutes })
    .from(reminders)
    .where(and(eq(reminders.targetType, targetType), eq(reminders.targetId, targetId)))
    .orderBy(reminders.offsetMinutes)
    .all()
    .map((r) => r.minutes);
}

export function setReminderOffsets(db: Db, targetType: ReminderTarget, targetId: string, offsets: number[]): void {
  const minutes = [...new Set(offsets.filter((n) => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b);
  db.delete(reminders)
    .where(and(eq(reminders.targetType, targetType), eq(reminders.targetId, targetId)))
    .run();
  if (minutes.length > 0) {
    db.insert(reminders)
      .values(minutes.map((offsetMinutes) => ({ id: newId(), targetType, targetId, offsetMinutes })))
      .run();
  }
}
