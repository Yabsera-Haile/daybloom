// The companion in reminders (MS-03): after the time and the title comes a short line in its voice,
// and its picture shows beside the text. Off with the pet, and in Calm mode (MS-05).
import { toDayKey } from '@/calendar/dates';
import type { Db } from '@/db/types';
import { routineReminds } from '@/habits/store';
import { t } from '@/i18n';
import type { PlannedReminder } from '@/reminders/plan';

import { slippingHabits, type Personality, type PetKind } from './mood';

export interface PetVoice {
  kind: PetKind;
  name: string;
  personality: Personality;
  /** A file:// picture of the pet for the notification, if one could be made. */
  picture: string | null;
  /** The same, looking cross (Cheeky's nudge). */
  crossPicture: string | null;
}

/** When Cheeky nudges, if it does (7 PM). */
export const NUDGE_HOUR = 19;

/**
 * Cheeky's nudge (MS-07, D21): at most one a day, at 7 PM, about a daily habit that's slipping and
 * already reminds (its own time or its routine's). Gone as soon as the habit is ticked; never from a
 * gentle pet. Its Done button ticks the habit, like the habit's own reminders.
 */
export function cheekyNudge(db: Db, now: number, pet: PetVoice | null): PlannedReminder | null {
  if (!pet || pet.personality !== 'cheeky') return null;
  const fireAt = new Date(now);
  fireAt.setHours(NUDGE_HOUR, 0, 0, 0);
  if (fireAt.getTime() <= now) return null;
  const today = toDayKey(new Date(now));
  const habit = slippingHabits(db, today).find(
    (h) => h.reminderTime !== null || (h.routineId !== null && routineReminds(db, h.routineId)),
  );
  if (!habit) return null;
  const line = `${pet.name}: ${t.pet.lines.crossHabit(habit.name)[0]}`;
  return {
    id: `n.${today}`,
    fireAt: fireAt.getTime(),
    title: habit.name,
    body: line,
    urgent: false,
    atStart: false,
    data: {
      kind: 'habit',
      day: today,
      habitId: habit.id,
      at: fireAt.getTime(),
      ...(pet.crossPicture ? { largeIcon: pet.crossPicture } : {}),
      sig: `${fireAt.getTime()}|${habit.id}|${line}|${pet.crossPicture ?? ''}`,
    },
  };
}

/** The same reminder always gets the same line, so refills don't change it. */
function pick<T>(items: T[], key: string): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return items[Math.abs(h) % items.length];
}

/** "Mochi: You’ve got this.", the same line for the same reminder every time. */
export function petLine(pet: PetVoice, key: string): string {
  return `${pet.name}: ${pick(t.pet.remind[pet.personality], key)}`;
}

/** A reminder as the pet would send it; unchanged when there's no pet. */
export function withPet(r: PlannedReminder, pet: PetVoice | null): PlannedReminder {
  if (!pet) return r;
  const line = petLine(pet, r.id);
  return {
    ...r,
    body: r.body ? `${r.body} · ${line}` : line,
    data: {
      ...r.data,
      ...(pet.picture ? { largeIcon: pet.picture } : {}),
      // a different pet, name or personality sends the reminders again
      sig: `${r.data.sig}|${pet.kind}|${pet.name}|${pet.personality}|${pet.picture ?? ''}`,
    },
  };
}
