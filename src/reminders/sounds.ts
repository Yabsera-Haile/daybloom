// How reminders sound (Settings › Reminder sound): the phone's own sound, one of Daybloom's gentle
// sounds (assets/sounds, made by scripts/generate-sounds.mjs), or vibrate only.
//
// Android fixes a notification channel's sound when the channel is made, so each choice has its own
// channel; changing the choice moves the waiting reminders to the new channel and removes the old.
import type { AudioSource } from 'expo-audio';

import type { ReminderSound } from '@/settings';

/** The bundled sounds; their file names are what the channel and iOS refer to. */
export const SOUND_FILES: Partial<Record<ReminderSound, AudioSource>> = {
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  birdsong: require('../../assets/sounds/birdsong.wav'),
  marimba: require('../../assets/sounds/marimba.wav'),
  ring: require('../../assets/sounds/ring.wav'),
};

/** A short double buzz, for every choice (vibrate-only included). */
export const VIBRATION = [0, 250, 150, 250];

/** Every Daybloom reminder channel starts with this (the first version used just "reminders"). */
export const CHANNEL_PREFIX = 'reminders';

export const channelFor = (sound: ReminderSound) => `${CHANNEL_PREFIX}-${sound}`;

/** What a notification's `sound` says: a bundled file, the phone's default, or none. */
export function soundFor(sound: ReminderSound): string | null {
  if (sound === 'vibrate') return null;
  if (sound === 'phone') return 'default';
  return `${sound}.wav`;
}
