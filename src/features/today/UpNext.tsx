import { Pressable, View } from 'react-native';

import { useCategories, useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { timeRange, untilText } from '@/i18n/format';
import { eventIcon } from '@/planner/eventIcon';
import type { EventOccurrence } from '@/planner/events';
import { useUi } from '@/state/ui';
import { lookFor, shadows } from '@/theme';
import { Icon, Text } from '@/ui';

/** "Up next · in 45 min" (TD-19): the next event today. */
export function UpNext({ occurrence: o, now }: { occurrence: EventOccurrence; now: number }) {
  const settings = useSettings();
  const categories = useCategories();
  const openSheet = useUi((s) => s.openSheet);
  const look = lookFor(categories.find((c) => c.id === o.categoryId)?.colorKey);
  const detail = [timeRange(o.startAt, o.endAt, settings.timeFormat), o.location].filter(Boolean).join(' · ');
  const eyebrow = t.today.upNext(untilText(o.startAt, now));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}. ${o.title}, ${detail}`}
      onPress={() => openSheet({ kind: 'event', occurrence: o })}
      className="flex-row items-center gap-3 rounded-2xl bg-surface-container-lowest p-space-md active:opacity-80"
      style={shadows.card}>
      <View className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: look.dot }} />
      <View className="flex-1">
        <Text variant="labelSm" color="primary" style={{ textTransform: 'uppercase' }}>
          {eyebrow}
        </Text>
        <Text variant="bodyLg" weight="600">
          {o.title}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {detail}
        </Text>
      </View>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${look.card}`}>
        <Icon name={eventIcon(o.title, look.icon)} tint={look.detail} />
      </View>
    </Pressable>
  );
}
