import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { WeekStart } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { currentStreak, donePeriods } from '@/habits/stats';
import { setHabitDone, type Habit, type HabitCheck } from '@/habits/store';
import { t } from '@/i18n';
import { fullDay, monthDay, weekdayLetter } from '@/i18n/format';
import { shadows } from '@/theme';
import { HabitCircle, Icon, Text, useNarrow } from '@/ui';

import { routineIconName, routineLook, type HabitGroup } from './shared';

const CELL = 28;
const GAP = 4;

/** Name (wraps to 2 lines, HB-08) and its streak (when 2+) or note. */
function HabitName({
  habit,
  streak,
  onPress,
  own = false,
}: {
  habit: Habit;
  streak: number;
  onPress: () => void;
  /** On its own line, above the circles */
  own?: boolean;
}) {
  const detail =
    streak >= 2 ? (habit.frequency === 'daily' ? t.habits.streak(streak) : t.habits.weekStreak(streak)) : habit.note;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.habits.history}
      onPress={onPress}
      className={own ? 'w-full pb-1' : 'flex-1 pr-1'}>
      <Text variant="bodyMd" weight="500" numberOfLines={2} style={{ lineHeight: 18 }}>
        {habit.name}
      </Text>
      {detail ? (
        <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={{ marginTop: 2 }}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const openHistory = (habit: Habit) => router.push({ pathname: '/habit-history', params: { id: habit.id } });

/** Daily habits by routine, the last 7 days with today on the right (HB-04, HB-06). */
export function DailyGrid({
  groups,
  checks,
  days,
  today,
  weekStart,
}: {
  groups: HabitGroup[];
  checks: HabitCheck[];
  days: string[];
  today: string;
  weekStart: WeekStart;
}) {
  // under 360dp there's no room for a name beside seven days
  const own = useNarrow(360);
  return (
    <View className="rounded-2xl bg-surface-container-lowest p-3" style={shadows.card}>
      <View className="flex-row items-end pb-2">
        {/* the names have their own lines on a very narrow screen, so the label isn't needed */}
        <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={{ flex: 1 }}>
          {own ? '' : t.habits.habit}
        </Text>
        {days.map((d) => (
          <View
            key={d}
            className={`items-center rounded-lg py-0.5 ${d === today ? 'bg-primary-fixed/60' : ''}`}
            style={{ width: CELL, marginLeft: GAP }}>
            <Text variant="labelSm" color={d === today ? 'primary' : 'onSurfaceVariant'}>
              {weekdayLetter(d)}
            </Text>
            <Text variant="labelSm" color={d === today ? 'primary' : 'onSurfaceVariant'}>
              {parseDayKey(d).day}
            </Text>
          </View>
        ))}
      </View>
      {groups.map((g) => {
        const look = routineLook(g.routine);
        return (
          <View key={g.routine?.id ?? 'anytime'} className="mt-1 border-t border-surface-variant">
            <View className="flex-row items-center gap-1.5 pb-1 pt-3">
              <Icon name={routineIconName(g.routine)} size={18} color={look.text} />
              <Text variant="labelMd" color={look.text}>
                {g.name}
              </Text>
            </View>
            {g.habits.map((h) => {
              const done = donePeriods(h, checks, weekStart);
              return (
                <View
                  key={h.id}
                  className={`min-h-touch flex-row flex-wrap items-center py-1.5 ${own ? 'justify-end' : ''}`}>
                  <HabitName
                    habit={h}
                    streak={currentStreak(h, done, today, weekStart)}
                    onPress={() => openHistory(h)}
                    own={own}
                  />
                  {days.map((d) => (
                    <View key={d} style={{ width: CELL, marginLeft: GAP }} className="items-center">
                      <HabitCircle
                        state={done.has(d) ? 'done' : 'notDone'}
                        today={d === today}
                        label={t.habits.circle(h.name, fullDay(d), done.has(d))}
                        onPress={() => setHabitDone(db, h, d, !done.has(d), weekStart)}
                      />
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/** Weekly habits: one circle per week of the month; later weeks can't be ticked yet (HB-05). */
export function WeeklyGrid({
  habits,
  checks,
  weeks,
  today,
  weekStart,
}: {
  habits: Habit[];
  checks: HabitCheck[];
  /** first day of each week touching the month */
  weeks: string[];
  today: string;
  weekStart: WeekStart;
}) {
  const current = weeks.filter((w) => w <= today).at(-1);
  const W = 32;
  return (
    <View className="rounded-2xl bg-surface-container-lowest p-3" style={shadows.card}>
      <View className="flex-row items-end pb-2">
        <Text variant="labelSm" color="onSurfaceVariant" style={{ flex: 1 }}>
          {t.habits.weekOf}
        </Text>
        {weeks.map((w) => {
          const [a, b] = monthDay(w).split(' ');
          return (
            <View
              key={w}
              className={`items-center rounded-lg py-0.5 ${w === current ? 'bg-primary-fixed/60' : ''}`}
              style={{ width: W, marginLeft: 6 }}>
              <Text variant="labelSm" color={w === current ? 'primary' : 'onSurfaceVariant'}>
                {a}
              </Text>
              <Text variant="labelSm" color={w === current ? 'primary' : 'onSurfaceVariant'}>
                {b}
              </Text>
            </View>
          );
        })}
      </View>
      {habits.map((h) => {
        const done = donePeriods(h, checks, weekStart);
        return (
          <View key={h.id} className="min-h-touch flex-row items-center border-t border-surface-variant py-1.5">
            <HabitName habit={h} streak={currentStreak(h, done, today, weekStart)} onPress={() => openHistory(h)} />
            {weeks.map((w) => (
              <View key={w} style={{ width: W, marginLeft: 6 }} className="items-center">
                <HabitCircle
                  state={w > today ? 'future' : done.has(w) ? 'done' : 'notDone'}
                  today={w === current}
                  label={
                    w > today
                      ? t.habits.notYet(t.habits.weekOfDay(monthDay(w)))
                      : t.habits.circle(h.name, t.habits.weekOfDay(monthDay(w)), done.has(w))
                  }
                  onPress={() => setHabitDone(db, h, w, !done.has(w), weekStart)}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
