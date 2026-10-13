import { getLocales } from 'expo-localization';

import { en, type Strings } from './en';

/** Interface text. English only in the MVP (NFR-09). */
export const t: Strings = en;

/**
 * Locale for dates and numbers inside sentences: the phone's own English variant ("Oct 23" in
 * the US, "23 Oct" in South Africa), or plain English when the phone uses another language.
 */
export function textLocale(): string {
  const tag = getLocales()[0]?.languageTag;
  return tag?.startsWith('en') ? tag : 'en';
}
