import { View } from 'react-native';

import { quoteFor } from '@/planner/quotes';
import { fontFamilyFor } from '@/theme';
import { Icon, Text } from '@/ui';

/**
 * A gentle line just under the date on Today (TD-18): serif italic, no box, so it reads as part of
 * the day's heading rather than one more card.
 */
export function DailyQuote({ day }: { day: string }) {
  return (
    <View className="flex-row items-start gap-space-sm px-space-sm">
      <View className="pt-0.5">
        <Icon name="spa" size={18} color="primary" />
      </View>
      <Text
        variant="bodyMd"
        color="onSurfaceVariant"
        style={{ flex: 1, fontFamily: fontFamilyFor('serif', '400', true) }}>
        {`“${quoteFor(day)}”`}
      </Text>
    </View>
  );
}
