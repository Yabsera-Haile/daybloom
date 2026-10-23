import { createContext, useContext } from 'react';
import type { Insets } from 'react-native';

/** True inside a Sheet. */
export const InSheet = createContext(false);

/**
 * How far a finger may drift from a control before its press is dropped. A sheet is its own window
 * on Android, and on some phones (a Samsung S24) a press there was dropped after the finger moved a
 * few pixels, so a quick tap often did nothing while a longer one worked. React Native allows 20 to
 * 30 px; inside sheets presses are much more forgiving.
 */
export const SHEET_RETENTION: Insets = { top: 100, bottom: 100, left: 60, right: 60 };

export const usePressRetention = (): Insets | undefined => (useContext(InSheet) ? SHEET_RETENTION : undefined);
