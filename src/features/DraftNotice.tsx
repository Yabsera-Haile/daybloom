import { View } from 'react-native';

import type { Draft, DraftFields } from '@/data/drafts';
import { t } from '@/i18n';
import { Button, Icon, Text } from '@/ui';

/** "Picked up where you left off · Start fresh" when a form opens with kept text (UX-05). */
export function DraftNotice<T extends DraftFields>({ draft }: { draft: Draft<T> }) {
  if (!draft.restored || Object.values(draft.values).every((v) => !v.trim())) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-xl bg-primary-fixed/40 py-1 pl-3 pr-1">
      <Icon name="history" size={18} color="primary" />
      <Text variant="bodySm" style={{ flex: 1 }}>
        {t.drafts.restored}
      </Text>
      <Button label={t.drafts.startFresh} variant="text" size="md" onPress={draft.startFresh} />
    </View>
  );
}
