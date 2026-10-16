// Adds payments from bank texts as they come (BU-11): at start, whenever the app comes back, and the
// moment a text arrives while Daybloom is open, when it asks "What was it for?" right away (if wanted).
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getEntry } from '@/budget/entries';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { onDataChanged } from '@/data/live';
import { readSettings } from '@/settings';
import { useUi } from '@/state/ui';
import { useTheme } from '@/theme';

import { sms } from './native';
import { pushConfig, syncTexts } from './sync';

/** Opens "What was it for?" for a payment just added, unless another sheet is open. */
export function askAbout(entryId: string): void {
  const ui = useUi.getState();
  const entry = getEntry(db, entryId);
  if (!entry || ui.sheet) return;
  ui.openSheet({ kind: 'expense', day: toDayKey(new Date(entry.occurredAt)), entryId, ask: true });
}

export function useBankTexts(): void {
  const { colors } = useTheme();

  // the Android side watches for new texts with the senders and shapes saved here
  useEffect(() => {
    if (!sms) return;
    const push = () => void pushConfig(db, colors.primary).catch(() => undefined);
    push();
    return onDataChanged(push);
  }, [colors.primary]);

  useEffect(() => {
    const native = sms;
    if (!native) return;
    const sync = (ask: boolean) =>
      syncTexts(db)
        .then(({ added }) => {
          const last = added[added.length - 1];
          if (ask && last && readSettings(db).smsAsk) askAbout(last.entryId);
        })
        .catch(() => undefined);
    void sync(false);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync(false);
    });
    const arrived = native.addListener('onText', () => void sync(true));
    return () => {
      app.remove();
      arrived.remove();
    };
  }, []);
}
