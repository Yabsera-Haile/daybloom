import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { doneOn } from '@/habits/stats';
import { setHabitDone, type HabitCheck } from '@/habits/store';
import { t } from '@/i18n';
import { clockText } from '@/i18n/format';
import { readFlag, saveFlag } from '@/settings';
import { shadows } from '@/theme';
import { Button, Checkbox, Icon, IconButton, ProgressBar, Text, type IconName } from '@/ui';

import { dailyGroups, routineIconName, routineLook, useHabitData, type HabitGroup } from './shared';

const pad = (n: number) => String(n).padStart(2, '0');

function RoutineCard({
  group,
  checks,
  day,
  isToday,
  now,
}: {
  group: HabitGroup;
  checks: HabitCheck[];
  day: string;
  isToday: boolean;
  now: number;
}) {
  const settings = useSettings();
  const routine = group.routine!;
  const flag = `routine.collapsed.${routine.id}`;
  const collapsed = useLive(() => readFlag(db, flag), [flag]);
  const [opened, setOpened] = useState(false);
  const look = routineLook(routine);
  const time = routine.time ? clockText(routine.time, settings.timeFormat) : null;
  const { done, total } = doneOn(group.habits, checks, day);
  const ticked = new Set(checks.filter((c) => c.period === day).map((c) => c.habitId));
  const d = new Date(now);
  const later = isToday && !!routine.time && routine.time > `${pad(d.getHours())}:${pad(d.getMinutes())}` && !opened;
  const future = !isToday && day > toDayKey(new Date(now));

  // TD-06: a routine later today is a compact preview; tapping opens its checklist
  if (later && done === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${routine.name}, ${t.habits.startsAt(time!, total)}`}
        accessibilityHint={t.habits.expand(routine.name)}
        onPress={() => setOpened(true)}
        className="gap-space-sm rounded-2xl bg-surface-container p-space-md active:opacity-90">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-space-sm">
            <View className={`h-10 w-10 items-center justify-center rounded-full ${look.circle}`}>
              <Icon name={routineIconName(routine)} color={look.icon} />
            </View>
            <View className="flex-1">
              <Text variant="headlineSm">{routine.name}</Text>
              <Text variant="labelMd" color={look.text}>
                {t.habits.startsAt(time!, total)}
              </Text>
            </View>
          </View>
          <Icon name="chevron_right" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {group.habits.map((h) => (
            <View key={h.id} className="gap-1 rounded-xl bg-surface-container-lowest/90 p-2" style={{ width: '31.5%' }}>
              <Icon name={(h.icon as IconName) ?? 'spa'} size={20} color={look.tile} />
              <Text variant="bodySm" numberOfLines={2}>
                {h.name}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <View className="rounded-2xl bg-surface-container-lowest p-space-md" style={shadows.card}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-space-sm">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${look.circle}`}>
            <Icon name={routineIconName(routine)} color={look.icon} />
          </View>
          <View className="flex-1">
            <Text variant="headlineSm" accessibilityRole="header">
              {routine.name}
            </Text>
            <Text variant="labelMd" color={look.text}>
              {t.habits.progress(time, done, total)}
            </Text>
          </View>
        </View>
        <IconButton
          icon={collapsed ? 'expand_more' : 'keyboard_arrow_up'}
          tone="tonal"
          accessibilityLabel={collapsed ? t.habits.expand(routine.name) : t.habits.collapse(routine.name)}
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => saveFlag(db, flag, !collapsed)}
        />
      </View>
      <View className="mt-space-sm">
        <ProgressBar value={total ? done / total : 0} label={t.habits.progress(null, done, total)} />
      </View>
      {collapsed ? null : (
        <View className="mt-space-sm">
          {group.habits.map((h) => (
            <View key={h.id} pointerEvents={future ? 'none' : 'auto'} style={future ? { opacity: 0.6 } : undefined}>
              <Checkbox
                checked={ticked.has(h.id)}
                showLabel
                label={h.name}
                onChange={(on) => setHabitDone(db, h, day, on, settings.weekStart)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Today's routine cards (TD-05…07), or an invitation to start one on the first day. */
export function RoutineCards({ day, isToday, now }: { day: string; isToday: boolean; now: number }) {
  const { routines, habits, checks } = useHabitData();
  const groups = dailyGroups(routines, habits).filter((g) => g.routine);

  if (habits.length === 0) {
    if (!isToday) return null;
    const start = (routineId: string | undefined) =>
      router.push({ pathname: '/habit/new', params: routineId ? { routine: routineId } : {} });
    const morning = routines.find((r) => r.icon === 'wb_twilight');
    const evening = routines.find((r) => r.icon === 'bedtime');
    return (
      <View className="rounded-2xl bg-surface-container-lowest p-space-md" style={shadows.card}>
        <View className="flex-row items-center gap-space-sm">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container">
            <Icon name="wb_twilight" />
          </View>
          <View className="flex-1">
            <Text variant="headlineSm">{t.habits.startRoutine}</Text>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t.habits.startRoutineText}
            </Text>
          </View>
        </View>
        <View className="mt-space-md flex-row gap-space-sm">
          <Button
            label={t.habits.morning}
            icon="wb_twilight"
            variant="outline"
            className="flex-1"
            onPress={() => start(morning?.id)}
          />
          <Button
            label={t.habits.evening}
            icon="bedtime"
            variant="outline"
            className="flex-1"
            onPress={() => start(evening?.id)}
          />
        </View>
      </View>
    );
  }

  return (
    <>
      {groups.map((g) => (
        <RoutineCard key={g.routine!.id} group={g} checks={checks} day={day} isToday={isToday} now={now} />
      ))}
    </>
  );
}

/** Routine markers for the timeline (TD-13): "Morning Ritual · 2 of 3 done" at its hour. */
export function useRoutineMarkers(day: string, isToday: boolean, now: number) {
  const settings = useSettings();
  const { routines, habits, checks } = useHabitData();
  const nowHHMM = `${pad(new Date(now).getHours())}:${pad(new Date(now).getMinutes())}`;
  return dailyGroups(routines, habits)
    .filter((g) => g.routine?.time)
    .map((g) => {
      const r = g.routine!;
      const look = routineLook(r);
      const { done, total } = doneOn(g.habits, checks, day);
      const later = isToday && r.time! > nowHHMM && done === 0;
      return {
        key: r.id,
        hour: Number(r.time!.slice(0, 2)),
        icon: routineIconName(r),
        iconColor: look.text,
        card: look.card,
        text: later
          ? t.habits.routineAt(r.name, clockText(r.time!, settings.timeFormat))
          : t.habits.routineDone(r.name, done, total),
      };
    });
}
