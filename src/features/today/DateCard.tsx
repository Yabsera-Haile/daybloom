import { View } from 'react-native';

import { dayOfYear } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';
import { useSettings } from '@/data/hooks';
import { seasonShown } from '@/features/ThemeProvider';
import { t } from '@/i18n';
import { longDay } from '@/i18n/format';
import { Card, DateNavigator, Sticker, Text } from '@/ui';

/** Date header (TD-01, TD-03, TD-04): the day, season and day of year, ‹ Today ›, and the season's sticker. */
export function DateCard({
  day,
  isToday,
  onMove,
  onToday,
}: {
  day: string;
  isToday: boolean;
  onMove: (by: 1 | -1) => void;
  onToday: () => void;
}) {
  const settings = useSettings();
  const p = parseDayKey(day);
  const date = new Date(p.year, p.month - 1, p.day, 12);
  const season = settings.seasons ? seasonShown(settings.theme, date, settings.hemisphere) : null;
  const { day: n, total } = dayOfYear(date);
  return (
    <Card tone="low" shadow className="flex-row items-start justify-between gap-space-sm">
      <View className="flex-1">
        <Text variant="headlineLg" accessibilityRole="header">
          {longDay(day).replace(/ (?=\d+$)/, '\u00A0')}
        </Text>
        <Text variant="labelMd" color="onSurfaceVariant">
          {t.today.dayOfYear(season ? t.seasons[season] : null, n, total)}
        </Text>
        <View className="-ml-1 mt-space-sm">
          <DateNavigator
            label={t.common.today}
            current={isToday}
            onLabelPress={onToday}
            onPrevious={() => onMove(-1)}
            onNext={() => onMove(1)}
            previousLabel={t.common.previousDay}
            nextLabel={t.common.nextDay}
          />
        </View>
      </View>
      {season ? <Sticker name={season} size={80} rotate={6} /> : null}
    </Card>
  );
}
