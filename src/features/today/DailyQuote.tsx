import { View } from 'react-native';

import { quoteFor } from '@/planner/quotes';
import { fontFamilyFor } from '@/theme';
import { Icon, Text } from '@/ui';

/** A gentle line at the bottom of Today (TD-18, design/daybloom/today): serif italic. */
export function DailyQuote({ day }: { day: string }) {
  return (
    <View className="flex-row items-center gap-space-sm rounded-2xl bg-surface-container-high/60 p-space-md">
      <Icon name="spa" color="secondary" />
      <Text
        variant="bodyLg"
        color="onSurfaceVariant"
        style={{ flex: 1, fontFamily: fontFamilyFor('serif', '400', true) }}>
        {`“${quoteFor(day)}”`}
      </Text>
    </View>
  );
}
