import { View } from 'react-native';

import { addDaysToKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { leftBehind, moveTasks } from '@/planner/tasks';
import { readMemo, saveMemo } from '@/settings';
import { useUi } from '@/state/ui';
import { Button, Icon, Text } from '@/ui';

const SHOWN = 3;
const HIDDEN = 'leftBehind.hiddenOn';

/**
 * "2 things left from yesterday. Move them to today?" (FR-15, D11: paper planners call this
 * migrating). Shown on today's page until the to-dos are moved, done, or "Not now" is tapped.
 */
export function LeftBehind({ today }: { today: string }) {
  const showToast = useUi((s) => s.showToast);
  // "Not now" puts it off until tomorrow
  const hidden = useLive(() => readMemo(db, HIDDEN) === today, [today]);
  const left = useLive(() => leftBehind(db, today), [today]);
  if (hidden || left.length === 0) return null;
  const yesterday = left.every((x) => x.date === addDaysToKey(today, -1));

  return (
    <View accessibilityLiveRegion="polite" className="gap-space-sm rounded-2xl bg-tertiary-fixed/50 p-space-md">
      <View className="flex-row items-start gap-space-sm">
        <Icon name="low_priority" color="tertiary" />
        <Text variant="bodyLg" style={{ flex: 1 }}>
          {t.today.leftBehind(left.length, yesterday)}
        </Text>
      </View>
      <View className="gap-0.5 pl-9">
        {left.slice(0, SHOWN).map((x) => (
          <Text key={x.id} variant="bodyMd" color="onSurfaceVariant" numberOfLines={1}>
            {`• ${x.title}`}
          </Text>
        ))}
        {left.length > SHOWN ? (
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t.today.leftBehindMore(left.length - SHOWN)}
          </Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-space-sm pl-9">
        <Button
          label={t.today.moveToToday}
          icon="arrow_forward"
          size="md"
          onPress={() => {
            const undo = moveTasks(
              db,
              left.map((x) => x.id),
              today,
            );
            showToast(t.today.movedToToday(left.length), undo);
          }}
        />
        <Button label={t.today.notNow} variant="text" size="md" onPress={() => saveMemo(db, HIDDEN, today)} />
      </View>
    </View>
  );
}
