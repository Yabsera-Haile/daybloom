import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { toDayKey, weeksInMonth } from '@/calendar/dates';
import { addDaysToKey, parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useHabitData } from '@/features/habits/shared';
import { bestStreak, currentStreak, donePeriods, periodOf, startedOn } from '@/habits/stats';
import { setHabitDone } from '@/habits/store';
import { t } from '@/i18n';
import { fullDay, monthYear, weekdayLetter } from '@/i18n/format';
import { shadows, useTheme } from '@/theme';
import { ChoiceChip, DateNavigator, Icon, Page, Sticker, Text } from '@/ui';

function Stat({
  value,
  unit,
  label,
  highlight = false,
}: {
  value: string;
  unit: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-2xl p-3 ${highlight ? 'bg-primary-fixed' : 'bg-surface-container-lowest'}`}
      style={shadows.card}>
      <Text variant="displayLgMobile" color={highlight ? 'onPrimaryFixed' : 'onSurface'}>
        {value}
        <Text variant="labelMd" color={highlight ? 'onPrimaryFixed' : 'onSurfaceVariant'}>
          {unit}
        </Text>
      </Text>
      <Text variant="labelSm" color={highlight ? 'onPrimaryFixedVariant' : 'onSurfaceVariant'}>
        {label}
      </Text>
    </View>
  );
}

/** One habit's month, day by day; tap a day to change it (HB-09). */
export default function HabitHistoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const today = useToday();
  const settings = useSettings();
  const { name: themeName } = useTheme();
  const ws = settings.weekStart;
  const { habits, checks } = useHabitData();
  const [selected, setSelected] = useState(id);
  const [month, setMonth] = useState(today.slice(0, 7));
  const habit = habits.find((h) => h.id === selected) ?? habits[0];

  if (!habit) {
    return (
      <Page title={t.habits.historyTitle}>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.habits.startText}
        </Text>
      </Page>
    );
  }

  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const last = toDayKey(new Date(y, m, 0));
  const done = donePeriods(habit, checks, ws);
  const isDone = (day: string) => done.has(periodOf(habit, day, ws));
  const weeks = weeksInMonth(new Date(y, m - 1, 1), ws).map(toDayKey);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDaysToKey(d, 1)) days.push(d);
  const start = startedOn(habit, done);
  const daily = habit.frequency === 'daily';
  const past = days.filter((d) => d <= today && d >= start);
  const pastWeeks = weeks.filter((w) => w <= today && w >= periodOf(habit, start, ws));
  const doneCount = daily ? past.filter(isDone).length : pastWeeks.filter((w) => done.has(w)).length;
  const possible = daily ? past.length : pastWeeks.length;
  const now = currentStreak(habit, done, today, ws);
  const best = bestStreak(habit, done);
  const cheer =
    now >= 3 && now === best ? t.habits.cheerBest : now >= 2 ? t.habits.cheerGoing(now) : t.habits.cheerStart;
  const shift = (by: number) => {
    const d = new Date(y, m - 1 + by, 1);
    setMonth(toDayKey(d).slice(0, 7));
  };

  return (
    <Page title={t.habits.historyTitle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t.habits.chooseHabit}
        className="-mx-margin"
        contentContainerClassName="gap-2 px-margin pt-space-sm">
        {habits.map((h) => (
          <ChoiceChip
            key={h.id}
            role="radio"
            label={h.name}
            selected={h.id === habit.id}
            onPress={() => setSelected(h.id)}
          />
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between">
        <Text variant="headlineLg" accessibilityRole="header">
          {monthYear(first)}
        </Text>
        <DateNavigator
          label={t.common.today}
          current={month === today.slice(0, 7)}
          onLabelPress={() => setMonth(today.slice(0, 7))}
          onPrevious={() => shift(-1)}
          onNext={() => shift(1)}
          previousLabel={t.month.previous}
          nextLabel={t.month.next}
        />
      </View>

      <View className="flex-row gap-space-sm">
        <Stat value={String(doneCount)} unit={`/${possible}`} label={daily ? t.habits.daysDone : t.habits.weeksDone} />
        <Stat value={String(now)} unit={daily ? t.habits.days(now) : ''} label={t.habits.streakNow} highlight />
        <Stat value={String(best)} unit={daily ? t.habits.days(best) : ''} label={t.habits.bestStreak} />
      </View>

      <View
        accessibilityLabel={monthYear(first)}
        className="rounded-2xl bg-surface-container-lowest p-space-sm"
        style={shadows.card}>
        <View className="mb-1 flex-row">
          {Array.from({ length: 7 }, (_, i) => addDaysToKey(weeks[0], i)).map((d) => (
            <Text
              key={d}
              variant="labelSm"
              color="onSurfaceVariant"
              style={{ flex: 1, textAlign: 'center', paddingVertical: 4 }}>
              {weekdayLetter(d)}
            </Text>
          ))}
        </View>
        {weeks.map((w) => (
          <View key={w} className="flex-row py-0.5">
            {Array.from({ length: 7 }, (_, i) => addDaysToKey(w, i)).map((d) => {
              const inMonth = d >= first && d <= last;
              if (!inMonth) return <View key={d} className="flex-1" />;
              const future = d > today;
              const on = isDone(d);
              // before the habit began: no ring, but still tappable to fill in
              const before = !on && periodOf(habit, d, ws) < periodOf(habit, start, ws);
              return (
                <View key={d} className="flex-1 items-center">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: future }}
                    accessibilityLabel={
                      future ? t.habits.notYet(fullDay(d)) : t.habits.circle(habit.name, fullDay(d), on)
                    }
                    disabled={future}
                    onPress={() => setHabitDone(db, habit, d, !on, ws)}
                    hitSlop={2}
                    className={`h-9 w-9 items-center justify-center rounded-full ${on ? 'bg-primary' : future || before ? '' : 'border-[1.5px] border-outline'} ${d === today ? 'border-2 border-primary' : ''}`}>
                    <Text
                      variant="labelMd"
                      color={on ? 'onPrimary' : future ? 'outline' : before ? 'onSurfaceVariant' : 'onSurface'}>
                      {parseDayKey(d).day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View className="flex-row items-center gap-space-md">
        <View className="flex-row items-center gap-1">
          <View className="h-3.5 w-3.5 rounded-full bg-primary" />
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.habits.legendDone}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3.5 w-3.5 rounded-full border-[1.5px] border-outline" />
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.habits.legendMissed}
          </Text>
        </View>
        <Text variant="bodySm" color="onSurfaceVariant" style={{ marginLeft: 'auto' }}>
          {t.habits.tapDay}
        </Text>
      </View>

      {settings.calm ? null : (
        <View className="flex-row items-center gap-space-sm rounded-2xl bg-primary-fixed/40 p-space-md">
          {settings.seasons ? <Sticker name={themeName} size={48} rotate={-6} /> : <Icon name="eco" color="primary" />}
          <Text variant="bodyMd" style={{ flex: 1 }}>
            {cheer}
          </Text>
        </View>
      )}
    </Page>
  );
}
