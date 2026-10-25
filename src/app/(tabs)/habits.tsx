import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { toDayKey, weeksInMonth } from '@/calendar/dates';
import { addDaysToKey, parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { DailyGrid, WeeklyGrid } from '@/features/habits/Grids';
import { dailyGroups, routineIconName, routineLook, useHabitData } from '@/features/habits/shared';
import { ArchivedSheet, RoutineSheet } from '@/features/habits/Sheets';
import { TabScreen } from '@/features/TabScreen';
import { bestStreak, donePeriods, doneOn, monthCompletion } from '@/habits/stats';
import { archivedHabits, moveHabit, type Habit } from '@/habits/store';
import { t } from '@/i18n';
import { monthDay, monthName, monthYear } from '@/i18n/format';
import { readFlag, saveFlag } from '@/settings';
import { shadows, useTheme } from '@/theme';
import { Button, ChoiceChip, Icon, IconButton, Text, useWide } from '@/ui';

const HINT = 'habitsHint.hidden';

function Tile({
  icon,
  value,
  unit,
  label,
  highlight = false,
}: {
  icon: 'local_fire_department' | 'spa' | 'check_circle';
  value: string;
  unit?: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 gap-0.5 rounded-2xl p-3 ${highlight ? 'bg-primary-fixed' : 'bg-surface-container-lowest'}`}
      style={shadows.card}>
      <Icon
        name={icon}
        size={20}
        filled={icon !== 'spa'}
        color={highlight ? 'onPrimaryFixed' : icon === 'spa' ? 'tertiary' : 'primary'}
      />
      <Text variant="displayLgMobile" color={highlight ? 'onPrimaryFixed' : 'onSurface'} style={{ marginTop: 4 }}>
        {value}
        {unit ? (
          <Text variant="labelMd" color={highlight ? 'onPrimaryFixed' : 'onSurfaceVariant'}>
            {unit}
          </Text>
        ) : null}
      </Text>
      <Text variant="labelSm" color={highlight ? 'onPrimaryFixedVariant' : 'onSurfaceVariant'}>
        {label}
      </Text>
    </View>
  );
}

/** A habit in the edit list: name, note, move up/down, edit (HB-07). */
function EditRow({ habit, first, last }: { habit: Habit; first: boolean; last: boolean }) {
  return (
    <View className={`min-h-[56px] flex-row items-center ${first ? '' : 'border-t border-surface-variant'}`}>
      <View className="flex-1 py-2 pl-1">
        <Text variant="bodyLg">{habit.name}</Text>
        {habit.note ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {habit.note}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon="expand_less"
        accessibilityLabel={t.habits.moveUp(habit.name)}
        disabled={first}
        onPress={() => moveHabit(db, habit.id, -1)}
      />
      <IconButton
        icon="expand_more"
        accessibilityLabel={t.habits.moveDown(habit.name)}
        disabled={last}
        onPress={() => moveHabit(db, habit.id, 1)}
      />
      <IconButton
        icon="chevron_right"
        accessibilityLabel={t.habits.editHabit(habit.name)}
        onPress={() => router.push({ pathname: '/habit/edit', params: { id: habit.id } })}
      />
    </View>
  );
}

/** Habits (HB-01…09): the month at a glance, daily habits by routine, weekly habits by week. */
export default function HabitsScreen() {
  const { colors } = useTheme();
  const today = useToday();
  const settings = useSettings();
  const { routines, habits, checks } = useHabitData();
  const hintHidden = useLive(() => readFlag(db, HINT), []);
  const archivedCount = useLive(() => archivedHabits(db).length, []);
  const [editing, setEditing] = useState(false);
  const [routineSheet, setRoutineSheet] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const ws = settings.weekStart;
  const { panes } = useWide();

  // month header (HB-01)
  const p = parseDayKey(today);
  const first = `${today.slice(0, 8)}01`;
  const total = new Date(p.year, p.month, 0).getDate();
  const completion = monthCompletion(habits, checks, first, today);
  // tiles (HB-02), all worked out from the ticks (FR-13)
  const daily = habits.filter((h) => h.frequency === 'daily');
  const weekly = habits.filter((h) => h.frequency === 'weekly');
  const best = Math.max(0, ...daily.map((h) => bestStreak(h, donePeriods(h, checks, ws))));
  const todayDone = doneOn(habits, checks, today);
  // grids
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, i - 6));
  const weeks = weeksInMonth(new Date(p.year, p.month - 1, 1), ws).map(toDayKey);
  const groups = dailyGroups(routines, habits);

  const newHabit = (params: Record<string, string> = {}) => router.push({ pathname: '/habit/new', params });

  // Weekly habits (HB-05); on a wide screen in a second pane beside the daily ones (D20)
  const weeklySection = weekly.length ? (
    <View className="gap-space-sm">
      <View className="flex-row items-end justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="calendar_view_week" color="secondary" />
          <Text variant="headlineMd" accessibilityRole="header">
            {t.habits.weekly}
          </Text>
        </View>
        <Text variant="labelMd" color="onSurfaceVariant">
          {t.habits.monthWeeks(monthName(today), weeks.length)}
        </Text>
      </View>
      {editing ? (
        <View className="rounded-2xl bg-surface-container-lowest px-3 py-1" style={shadows.card}>
          {weekly.map((h, i) => (
            <EditRow key={h.id} habit={h} first={i === 0} last={i === weekly.length - 1} />
          ))}
        </View>
      ) : (
        <WeeklyGrid habits={weekly} checks={checks} weeks={weeks} today={today} weekStart={ws} />
      )}
    </View>
  ) : null;

  return (
    <TabScreen section={t.tabs.habits} side={panes && habits.length ? weeklySection : undefined}>
      <View className="gap-space-lg">
        {/* Overview (HB-01) */}
        <View className="gap-space-sm pt-space-sm">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text variant="headlineMd" accessibilityRole="header">
                {t.habits.title(monthYear(today))}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Icon name="eco" size={16} color="primary" filled />
                <Text variant="labelMd" color="onSurfaceVariant">
                  {t.habits.dayOfMonth(p.day, total, completion === null ? null : Math.round(completion * 100))}
                </Text>
              </View>
            </View>
            {habits.length ? (
              <IconButton
                icon="calendar_month"
                tone="tonal"
                iconColor="onSurface"
                accessibilityLabel={t.habits.history}
                onPress={() => router.push({ pathname: '/habit-history', params: { id: habits[0].id } })}
              />
            ) : null}
          </View>
          <View
            accessible
            accessibilityLabel={t.habits.monthBar(Math.round((p.day / total) * 100))}
            className="h-2 overflow-hidden rounded-full bg-surface-container">
            <View className="h-full rounded-full bg-primary" style={{ width: `${(p.day / total) * 100}%` }} />
          </View>
        </View>

        {habits.length === 0 ? (
          /* First visit (empty-states) */
          <View
            className="items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-lg"
            style={shadows.card}>
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
              <Icon name="spa" size={32} color="onPrimaryFixed" />
            </View>
            <Text variant="headlineMd" style={{ textAlign: 'center' }}>
              {t.habits.startTitle}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.habits.startText}
            </Text>
            <View className="my-space-sm flex-row flex-wrap justify-center gap-2">
              {t.habits.ideas.map((idea) => (
                <ChoiceChip
                  key={idea}
                  role="button"
                  label={idea}
                  selected={false}
                  onPress={() => newHabit({ name: idea })}
                />
              ))}
            </View>
            <Button label={t.habits.ownHabit} icon="add" align="center" onPress={() => newHabit()} />
          </View>
        ) : (
          <>
            {/* Stats (HB-02) */}
            <View className="flex-row gap-space-sm">
              <Tile
                icon="local_fire_department"
                value={String(best)}
                unit={t.habits.days(best)}
                label={t.habits.bestStreak}
              />
              <Tile icon="spa" value={String(habits.length)} label={t.habits.active} />
              {todayDone.total ? (
                <Tile
                  icon="check_circle"
                  value={String(todayDone.done)}
                  unit={`/${todayDone.total}`}
                  label={t.habits.doneToday}
                  highlight
                />
              ) : null}
            </View>

            {/* Tip (HB-03) */}
            {hintHidden || editing ? null : (
              <View className="flex-row items-center gap-space-sm rounded-2xl bg-surface-container-low pl-space-md">
                <Icon name="touch_app" color="primary" />
                <Text variant="bodyMd" color="onSurfaceVariant" style={{ flex: 1 }}>
                  {t.habits.hint}
                </Text>
                <IconButton
                  icon="close"
                  accessibilityLabel={t.habits.hideHint}
                  onPress={() => saveFlag(db, HINT, true)}
                />
              </View>
            )}

            {/* Daily habits (HB-04, HB-06, HB-08) */}
            {daily.length ? (
              <View className="gap-space-sm">
                <View className="flex-row flex-wrap items-end justify-between gap-x-3">
                  <View className="flex-row items-center gap-2">
                    <Icon name="sunny" color="primary" />
                    <Text variant="headlineMd" accessibilityRole="header">
                      {t.habits.daily}
                    </Text>
                  </View>
                  <Text variant="labelMd" color="onSurfaceVariant">
                    {monthDay(days[0])} – {monthDay(today)}
                  </Text>
                </View>
                {editing ? (
                  <View className="rounded-2xl bg-surface-container-lowest px-3 pb-2" style={shadows.card}>
                    {groups.map((g) => {
                      const look = routineLook(g.routine);
                      return (
                        <View key={g.routine?.id ?? 'anytime'}>
                          <View className="flex-row items-center justify-between pb-1 pt-3">
                            <View className="flex-row items-center gap-1.5">
                              <Icon name={routineIconName(g.routine)} size={18} color={look.text} />
                              <Text variant="labelMd" color={look.text}>
                                {g.name}
                              </Text>
                            </View>
                            {g.routine ? (
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => setRoutineSheet(g.routine!.id)}
                                className="h-10 justify-center px-2">
                                <Text variant="labelMd" color="primary">
                                  {t.habits.editRoutine}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                          {g.habits.map((h, i) => (
                            <EditRow key={h.id} habit={h} first={i === 0} last={i === g.habits.length - 1} />
                          ))}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <DailyGrid groups={groups} checks={checks} days={days} today={today} weekStart={ws} />
                )}
              </View>
            ) : null}

            {panes ? null : weeklySection}

            {editing && archivedCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowArchived(true)}
                className="min-h-touch flex-row items-center gap-1.5">
                <Icon name="inventory_2" size={20} />
                <Text variant="labelLg" color="onSurfaceVariant">
                  {t.habits.archived(archivedCount)}
                </Text>
              </Pressable>
            ) : null}

            {/* Add / edit (HB-07) */}
            <View className="flex-row gap-space-sm">
              <Button
                label={editing ? t.habits.done : t.habits.editHabits}
                icon={editing ? 'check' : 'edit'}
                variant="outline"
                className="flex-1"
                onPress={() => setEditing(!editing)}
                style={editing ? { borderColor: colors.primary } : undefined}
              />
              <Button label={t.habits.newHabit} icon="add" className="flex-1" onPress={() => newHabit()} />
            </View>
          </>
        )}
      </View>

      {routineSheet ? <RoutineSheet routineId={routineSheet} onClose={() => setRoutineSheet(null)} /> : null}
      {showArchived ? <ArchivedSheet onClose={() => setShowArchived(false)} /> : null}
    </TabScreen>
  );
}
