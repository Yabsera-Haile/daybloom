import { format } from 'date-fns';
import { View } from 'react-native';

import { weekNumber, weekRange } from '@/calendar/dates';
import { ComingSoon } from '@/features/ComingSoon';
import { TabScreen } from '@/features/TabScreen';
import { DateNavigator, Text } from '@/ui';

export default function WeekScreen() {
  const now = new Date();
  const { start, end } = weekRange(now, 0);
  return (
    <TabScreen section="Week" showAdd>
      <View className="gap-1">
        <Text variant="labelMd" color="onSurfaceVariant">
          Week {weekNumber(now, 0)} · {format(now, 'yyyy')}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text variant="headlineLg" accessibilityRole="header">
            {format(start, 'MMM d')} – {format(end, 'MMM d')}
          </Text>
          <DateNavigator label="This week" previousLabel="Previous week" nextLabel="Next week" />
        </View>
      </View>
      <ComingSoon title="Your week as a spread" milestone="M1" sticker="summer" />
    </TabScreen>
  );
}
