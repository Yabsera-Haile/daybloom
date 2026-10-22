// Daybloom's own Android module (modules/daybloom-sms), which reads texts on the phone. It isn't in
// Expo Go, and iOS doesn't let apps read texts, so there bank texts aren't offered.
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

import type { Text } from './ingest';

/** Someone who sent texts to this phone, from the newest ones. */
export type SenderSummary = { address: string; count: number; lastAt: number; samples: string[] };

/** What waits in the module's queue: texts that arrived, and answers typed into a notification. */
export type QueueItem =
  ({ type: 'text'; id: string } & Text) | { type: 'note'; id: string; note: string; categoryId?: string };

declare class DaybloomSmsModule extends NativeModule<{ onText: () => void }> {
  hasPermission(): boolean;
  listSenders(scan: number, samples: number): Promise<SenderSummary[]>;
  readTexts(addresses: string[], since: number, limit: number): Promise<Text[]>;
  configure(json: string): Promise<void>;
  readQueue(): string;
  dropQueue(count: number): void;
  cancelNotice(id: string): void;
  canPopUp(): boolean;
  openPopUpSettings(): void;
}

export const sms = Platform.OS === 'android' ? requireOptionalNativeModule<DaybloomSmsModule>('DaybloomSms') : null;

/** Asks to read texts (and to see new ones arrive). True when allowed. */
export async function askToReadTexts(): Promise<boolean> {
  if (!sms) return false;
  if (sms.hasPermission()) return true;
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);
  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}
