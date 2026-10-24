import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { doneOn, weekSoFar } from '@/habits/stats';
import { t } from '@/i18n';
import { weekdayLetter, weekdayLong } from '@/i18n/format';
import { shadows } from '@/theme';
import { Icon, Text, useNarrow } from '@/ui';

import { dailyGroups, PartialRing, useHabitData } from './shared';

const COL = 30;
/** Each routine row's padding (p-2), each side */
const ROW_PAD = 8;

/** Habits at a Glance on Week (WK-11): each routine's days as all / some / none done. Read-only; opens Habits. */
export function HabitsAtGlance({ days, today }: { days: string[]; today: string }) {
  const { routines, habits, checks } = useHabitData();
  const narrow = useNarrow();
  // on a narrow screen the seven days share the row's whole width, each up to 30dp
  const [rowWidth, setRowWidth] = useState(0);
  const col = narrow && rowWidth ? Math.max(20, Math.min(COL, Math.floor((rowWidth - 2 * ROW_PAD) / 7) - 4)) : COL;
  const groups = dailyGroups(routines, habits);
  if (groups.length === 0) return null;
  const share = weekSoFar(habits, checks, days, today);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.habits.openHabits}
      onPress={() => router.navigate('/habits')}
      className="gap-space-sm rounded-2xl bg-surface-container-low p-space-md active:opacity-90">
      <View className="flex-row flex-wrap items-center justify-between gap-x-2">
        <View className="flex-row items-center gap-2">
          <Icon name="spa" color="primary" />
          <Text variant="headlineMd" accessibilityRole="header">
            {t.habits.glance}
          </Text>
        </View>
        {share === null ? null : (
          <Text variant="labelMd" color="primary">
            {t.habits.soFar(Math.round(share * 100))}
          </Text>
        )}
      </View>
      <View
        className="flex-row items-center"
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        style={narrow ? { paddingRight: ROW_PAD } : undefined}>
        {/* the routine names have their own lines on a narrow screen, so the label isn't needed */}
        <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={{ flex: 1 }}>
          {narrow ? '' : t.habits.routineCol}
        </Text>
        {days.map((d) => (
          <Text
            key={d}
            variant="labelSm"
            color={d === today ? 'primary' : 'onSurfaceVariant'}
            style={{ width: col, marginLeft: 4, textAlign: 'center' }}>
            {weekdayLetter(d)}
          </Text>
        ))}
      </View>
      {groups.map((g) => (
        <View
          key={g.routine?.id ?? 'anytime'}
          className={`flex-row flex-wrap items-center rounded-xl bg-surface-container-lowest p-2 ${narrow ? 'justify-end' : ''}`}
          style={shadows.card}>
          {/* a narrow screen leaves no room beside seven days: the name goes on its own line */}
          <Text
            variant="bodyMd"
            weight="500"
            numberOfLines={2}
            style={narrow ? { width: '100%', marginBottom: 2 } : { flex: 1 }}>
            {g.name}
          </Text>
          {days.map((d) => {
            const name = weekdayLong(d);
            const { done, total } = doneOn(g.habits, checks, d);
            const ring =
              d === today
                ? { borderWidth: 2, borderColor: 'rgba(67,101,79,0.5)', borderRadius: 999, padding: 2 }
                : { padding: 4 };
            let cell;
            let label;
            if (d > today) {
              cell = <View className="h-6 w-6 rounded-full border-[1.5px] border-dashed border-outline-variant" />;
              label = t.habits.dayFuture(name);
            } else if (done === total) {
              cell = (
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Icon name="check" size={16} color="onPrimary" />
                </View>
              );
              label = t.habits.dayAll(name);
            } else if (done > 0) {
              cell = <PartialRing value={done / total} />;
              label = t.habits.daySome(name, done, total);
            } else {
              cell = <View className="h-6 w-6 rounded-full border-[1.5px] border-outline" />;
              label = t.habits.dayNone(name);
            }
            return (
              <View
                key={d}
                accessible
                accessibilityLabel={label}
                className="items-center"
                style={{ width: col, marginLeft: 4 }}>
                <View style={ring}>{cell}</View>
              </View>
            );
          })}
        </View>
      ))}
      <View className="flex-row flex-wrap items-center gap-x-space-md gap-y-1">
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-full bg-primary" />
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.habits.allDone}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <PartialRing value={0.5} size={12} />
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.habits.someDone}
          </Text>
        </View>
        <View className="ml-auto flex-row items-center">
          <Text variant="labelMd" color="primary">
            {t.habits.openHabits}
          </Text>
          <Icon name="chevron_right" size={18} color="primary" />
        </View>
      </View>
    </Pressable>
  );
}
