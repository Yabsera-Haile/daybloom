// Writes the backup to a file and opens the phone's share sheet, so it can be saved to Drive or
// Files, or sent to oneself. The file is made fresh each time in the app's cache.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { t } from '@/i18n';

import { backupFileName, backupOf } from './export';

export async function shareBackup(): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const now = Date.now();
  const file = new File(Paths.cache, backupFileName(now));
  file.create({ overwrite: true });
  file.write(JSON.stringify(backupOf(db, now), null, 1));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: t.settings.backupShare,
    UTI: 'public.json',
  });
  return true;
}
