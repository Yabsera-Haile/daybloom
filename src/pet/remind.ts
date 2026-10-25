// The companion in reminders (MS-03): after the time and the title comes a short line in its voice,
// and its picture shows beside the text. Off with the pet, and in Calm mode (MS-05).
import { t } from '@/i18n';
import type { PlannedReminder } from '@/reminders/plan';

import type { Personality, PetKind } from './mood';

export interface PetVoice {
  kind: PetKind;
  name: string;
  personality: Personality;
  /** A file:// picture of the pet for the notification, if one could be made. */
  picture: string | null;
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
