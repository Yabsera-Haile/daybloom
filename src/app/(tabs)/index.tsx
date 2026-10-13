import { format } from 'date-fns';
import { View } from 'react-native';

import { dayOfYear, hemisphereForTimeZone, seasonOf } from '@/calendar/dates';
import { ComingSoon } from '@/features/ComingSoon';
import { TabScreen } from '@/features/TabScreen';
import { Card, DateNavigator, Sticker, Text } from '@/ui';

const seasonLabel = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' } as const;

export default function TodayScreen() {
  const now = new Date();
  const season = seasonOf(now, hemisphereForTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
  const { day, total } = dayOfYear(now);

  return (
    <TabScreen section="Today" showAdd>
      {/* Date card (TD-01, TD-03) */}
      <Card tone="low" className="flex-row items-start justify-between gap-space-sm">
        <View className="flex-1">
          <Text variant="headlineLg" accessibilityRole="header">
            {format(now, 'EEEE, MMM d')}
          </Text>
          <Text variant="labelMd" color="onSurfaceVariant">
            {seasonLabel[season]} · Day {day} of {total}
          </Text>
          <View className="mt-space-sm">
            <DateNavigator label="Today" previousLabel="Previous day" nextLabel="Next day" />
          </View>
        </View>
        <Sticker name={season} size={80} rotate={6} />
      </Card>
      <ComingSoon title="Your day, page by page" milestone="M1" sticker="spring" />
    </TabScreen>
  );
}
