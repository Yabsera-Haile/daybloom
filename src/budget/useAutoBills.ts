import { useEffect } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';

import { settleAutoBills } from './bills';

/** Adds bills the bank pays to spending on their day: at start and whenever the app comes back. */
export function useAutoBills(): void {
  useEffect(() => {
    settleAutoBills(db, Date.now());
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') settleAutoBills(db, Date.now());
    });
    return () => app.remove();
  }, []);
}
