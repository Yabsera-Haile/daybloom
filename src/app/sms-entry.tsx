import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { entryForText } from '@/sms/ingest';
import { syncTexts } from '@/sms/sync';
import { askAbout } from '@/sms/useBankTexts';

/**
 * Opened by tapping a payment notification (daybloom://sms-entry?id=…): adds the text if it isn't
 * yet, then shows Budget with "What was it for?" open (BU-11).
 */
export default function SmsEntry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  useEffect(() => {
    void syncTexts(db)
      .catch(() => undefined)
      .then(() => {
        router.replace('/budget');
        const entryId = id ? entryForText(db, id) : null;
        if (entryId) askAbout(entryId);
      });
  }, [id]);
  return <View className="flex-1 bg-surface" />;
}
