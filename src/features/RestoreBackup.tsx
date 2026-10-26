import { File } from 'expo-file-system';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { readBackup, restoreBackup, type BackupSummary } from '@/backup/restore';
import type { Backup } from '@/backup/export';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { t } from '@/i18n';
import { fullDay } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, Icon, Sheet, Text, type IconName } from '@/ui';

/** What the backup holds, a line each (only what's there). */
function contentsOf(s: BackupSummary): [IconName, string][] {
  const lines: [IconName, number, (n: number) => string][] = [
    ['event', s.events, t.restore.events],
    ['task_alt', s.todos, t.restore.todos],
    ['spa', s.habits, t.restore.habits],
    ['payments', s.expenses, t.restore.expenses],
    ['savings', s.goals, t.restore.goals],
    ['receipt_long', s.bills, t.restore.bills],
  ];
  return lines.filter(([, n]) => n > 0).map(([icon, n, say]) => [icon, say(n)]);
}

/**
 * Restoring a backup (ST-07): pick the file, see what's in it and when it was made, then replace
 * Daybloom's data with it (Undo for a few seconds). Settings and the first-run welcome use it.
 * `start` opens the phone's file picker; `sheet` is the confirmation to render.
 */
export function useRestore(onRestored?: () => void): { start: () => void; sheet: ReactNode } {
  const showToast = useUi((s) => s.showToast);
  const [found, setFound] = useState<{ backup: Backup; summary: BackupSummary } | null>(null);

  const start = async () => {
    try {
      const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
      if (picked.canceled) return;
      const read = readBackup(await picked.result.text());
      if (read.ok) setFound(read);
      else showToast(read.problem === 'newer' ? t.restore.newer : t.restore.notBackup);
    } catch {
      showToast(t.restore.failed);
    }
  };

  const replace = () => {
    if (!found) return;
    try {
      const undo = restoreBackup(db, found.backup);
      setFound(null);
      showToast(t.restore.done, undo);
      onRestored?.();
    } catch {
      setFound(null);
      showToast(t.restore.notBackup);
    }
  };

  const contents = found ? contentsOf(found.summary) : [];
  const made = found?.summary.exportedAt ? new Date(found.summary.exportedAt) : null;
  const sheet = found ? (
    <Sheet
      visible
      onClose={() => setFound(null)}
      title={t.restore.title}
      subtitle={made && !Number.isNaN(made.getTime()) ? t.restore.made(fullDay(toDayKey(made))) : undefined}>
      <View className="gap-space-md pb-space-sm">
        <View className="gap-1">
          {contents.length ? (
            contents.map(([icon, text]) => (
              <View key={icon} className="min-h-[36px] flex-row items-center gap-space-md">
                <Icon name={icon} size={20} color="onSurfaceVariant" />
                <Text variant="bodyLg">{text}</Text>
              </View>
            ))
          ) : (
            <Text variant="bodyLg">{t.restore.empty}</Text>
          )}
        </View>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.restore.warn}
        </Text>
        <View className="flex-row flex-wrap justify-end gap-space-sm">
          <Button label={t.common.cancel} variant="text" onPress={() => setFound(null)} />
          <Button label={t.restore.go} icon="history" onPress={replace} />
        </View>
      </View>
    </Sheet>
  ) : null;

  return { start: () => void start(), sheet };
}
