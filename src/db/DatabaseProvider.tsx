import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ensureDefaultRoutines } from '@/habits/store';
import { ensureDefaultCategories } from '@/planner/categories';
import { Text } from '@/ui';

import migrations from '../../drizzle/migrations';
import { db } from './client';

let seeded = false;

/** First-run data (starter categories and routines), once the tables exist. Safe to repeat. */
function seedOnce() {
  if (seeded) return;
  ensureDefaultCategories(db);
  ensureDefaultRoutines(db);
  seeded = true;
}

/** Brings the on-device database up to date before the app shows anything that reads it. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-margin">
        <Text variant="headlineSm" style={{ textAlign: 'center' }}>
          Daybloom couldn’t open your planner.
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center', marginTop: 8 }}>
          Please restart the app. If it keeps happening, contact us from the Play Store page. ({error.message})
        </Text>
      </View>
    );
  }
  if (!success) return null;
  seedOnce();
  return <>{children}</>;
}
