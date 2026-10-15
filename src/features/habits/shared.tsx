import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { checksBetween, listHabits, listRoutines, type Habit, type Routine } from '@/habits/store';
import { t } from '@/i18n';
import { useTheme, type ColorName } from '@/theme';
import type { IconName } from '@/ui';

/** Routines, active habits and every tick, re-read after any change. */
export function useHabitData() {
  const routines = useLive(() => listRoutines(db), []);
  const habits = useLive(() => listHabits(db), []);
  const checks = useLive(() => checksBetween(db, '0000-01-01', '9999-12-31'), []);
  return { routines, habits, checks };
}

export type HabitGroup = { routine: Routine | null; name: string; habits: Habit[] };

/** Daily habits by routine, in the order of the day, then Anytime; empty groups left out. */
export function dailyGroups(routines: Routine[], habits: Habit[]): HabitGroup[] {
  const daily = habits.filter((h) => h.frequency === 'daily');
  const groups: HabitGroup[] = routines.map((r) => ({
    routine: r,
    name: r.name,
    habits: daily.filter((h) => h.routineId === r.id),
  }));
  const known = new Set(routines.map((r) => r.id));
  groups.push({
    routine: null,
    name: t.habits.anytime,
    habits: daily.filter((h) => !h.routineId || !known.has(h.routineId)),
  });
  return groups.filter((g) => g.habits.length > 0);
}

export type RoutineLook = { circle: string; icon: ColorName; text: ColorName; tile: ColorName; card: string };

/** Morning in sage, evening in rose, midday in butterscotch, Anytime in stone (design/daybloom/today, habits). */
export function routineLook(routine: Pick<Routine, 'icon'> | null): RoutineLook {
  switch (routine?.icon) {
    case 'wb_twilight':
      return {
        circle: 'bg-primary-fixed',
        icon: 'onPrimaryFixed',
        text: 'primary',
        tile: 'primary',
        card: 'bg-primary-fixed/30',
      };
    case 'bedtime':
      return {
        circle: 'bg-secondary-fixed',
        icon: 'onSecondaryFixed',
        text: 'secondary',
        tile: 'secondary',
        card: 'bg-secondary-fixed/30',
      };
    case 'sunny':
      return {
        circle: 'bg-tertiary-fixed',
        icon: 'onTertiaryFixed',
        text: 'tertiary',
        tile: 'tertiary',
        card: 'bg-tertiary-fixed/30',
      };
    default:
      return {
        circle: 'bg-surface-container',
        icon: 'onSurfaceVariant',
        text: 'onSurfaceVariant',
        tile: 'onSurfaceVariant',
        card: 'bg-surface-container',
      };
  }
}

export const routineIconName = (routine: Pick<Routine, 'icon'> | null): IconName =>
  (routine?.icon as IconName) ?? 'all_inclusive';

/** "Some done" circle for Habits at a Glance: a ring filled to the share done. */
export function PartialRing({ value, size = 24 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  const stroke = 4;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceContainerHigh}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${length * value} ${length}`}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
