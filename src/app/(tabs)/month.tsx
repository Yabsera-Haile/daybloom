import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { toDayKey, weeksInMonth } from '@/calendar/dates';
import { addDaysToKey, parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useCategories, useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { MonthGoalCard } from '@/features/month/MonthGoal';
import { plansByDay, type Plan } from '@/features/plans';
import { TabScreen } from '@/features/TabScreen';
import { seasonShown } from '@/features/ThemeProvider';
import { t } from '@/i18n';
import { clockText, fullDay, longDay, monthDay, monthYear, shortDay, timeOf, weekdayShort } from '@/i18n/format';
import { eventsBetween } from '@/planner/events';
import { monthOf } from '@/planner/monthGoal';
import { tasksBetween } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { shadows, useTheme, type CategoryKey } from '@/theme';
import { DateNavigator, Icon, IconButton, Text, UrgentBadge, Button } from '@/ui';

const firstOfMonth = (day: string) => `${day.slice(0, 8)}01`;
const lastOfMonth = (day: string) => {
  const p = parseDayKey(day);
  return toDayKey(new Date(p.year, p.month, 0));
};
const dateOf = (day: string) => {
  const p = parseDayKey(day);
  return new Date(p.year, p.month - 1, p.day, 12);
};

/** Category colors for a plan's label, or the solid rose for urgent ones (MO-04, I4). */
function useLabelColors() {
  const { colors, categoryColors, lookFor } = useTheme();
  const categories = useCategories();
  return (p: Plan): { bg: string; fg: string; stripe: string } => {
    if (p.urgent && !p.done) return { bg: colors.secondary, fg: colors.onSecondary, stripe: colors.secondary };
    const id = p.kind === 'event' ? p.occurrence.categoryId : p.task.categoryId;
    const key = (categories.find((c) => c.id === id)?.colorKey ??
      (p.kind === 'task' ? null : 'personal')) as CategoryKey | null;
    if (!key) return { bg: colors.tertiaryFixed, fg: colors.onTertiaryFixed, stripe: colors.outlineVariant };
    const c = categoryColors[key] ?? categoryColors.personal;
    return { bg: c.container, fg: c.onContainer, stripe: lookFor(key).dot };
  };
}

const titleOf = (p: Plan) => (p.kind === 'event' ? p.occurrence.title : p.task.title);

/** A row in the selected day's list and the agenda: stripe, time column, title, Urgent (MO-06). */
function TimedRow({ plan, day, tinted }: { plan: Plan; day: string; tinted?: boolean }) {
  const settings = useSettings();
  const openSheet = useUi((s) => s.openSheet);
  const label = useLabelColors()(plan);
  const tf = settings.timeFormat;
  let when: string;
  if (plan.kind === 'task')
    when = plan.task.dueTime ? `${t.month.due}\n${clockText(plan.task.dueTime, tf)}` : t.month.endOfDay;
  else
    when =
      plan.occurrence.allDay || plan.occurrence.days[0] !== day ? t.common.allDay : timeOf(plan.occurrence.startAt, tf);
  const urgent = plan.urgent && !plan.done;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[titleOf(plan), when.replace('\n', ' '), urgent ? t.common.urgent : null]
        .filter(Boolean)
        .join(', ')}
      onPress={() =>
        openSheet(
          plan.kind === 'event'
            ? { kind: 'event', occurrence: plan.occurrence }
            : { kind: 'taskMenu', taskId: plan.task.id },
        )
      }
      className={`min-h-touch flex-row items-stretch gap-3 rounded-xl p-2.5 active:opacity-80 ${urgent ? 'bg-secondary-fixed/50' : tinted ? 'bg-surface-container-low' : ''}`}>
      <View className="w-1.5 rounded-full" style={{ backgroundColor: label.stripe }} />
      <Text variant="labelMd" color={urgent ? 'secondary' : 'onSurfaceVariant'} style={{ width: 64, paddingTop: 2 }}>
        {when}
      </Text>
      <Text variant="bodyMd" weight={urgent ? '600' : undefined} done={plan.done} style={{ flex: 1 }}>
        {titleOf(plan)}
      </Text>
      {urgent ? <UrgentBadge /> : null}
    </Pressable>
  );
}

export default function MonthScreen() {
  const today = useToday();
  const settings = useSettings();
  const { monthDay: selectedDay, showMonthDay, showDay, openSheet } = useUi();
  const labelColors = useLabelColors();
  const [view, setView] = useState<'grid' | 'agenda'>('grid');
  const [showEarlier, setShowEarlier] = useState(false);

  const selected = selectedDay ?? today;
  const first = firstOfMonth(selected);
  const last = lastOfMonth(selected);
  const isThisMonth = today >= first && today <= last;
  const days: string[] = [];
  for (let d = first; d <= last; d = addDaysToKey(d, 1)) days.push(d);

  const events = useLive(() => eventsBetween(db, first, last), [first, last]);
  const tasks = useLive(() => tasksBetween(db, first, last), [first, last]);
  const byDay = plansByDay(days, events, tasks);
  const season = settings.seasons ? seasonShown(settings.theme, dateOf(first), settings.hemisphere) : null;

  // summary (MO-02), worked out from the data (FR-13)
  const urgentCount = [...byDay.values()].flat().filter((p) => p.urgent && !p.done).length;
  const busyDays = days.filter((d) => byDay.get(d)!.length > 0).length;

  const goMonth = (by: 1 | -1) => {
    const p = parseDayKey(first);
    const next = toDayKey(new Date(p.year, p.month - 1 + by, 1));
    showMonthDay(today >= next && today <= lastOfMonth(next) ? null : next);
    setShowEarlier(false);
  };
  const openDay = (day: string) => {
    showDay(day === today ? null : day);
    router.navigate('/');
  };

  const weeks = weeksInMonth(dateOf(first), settings.weekStart).map((start) =>
    Array.from({ length: 7 }, (_, i) => addDaysToKey(toDayKey(start), i)),
  );
  const selectedPlans = byDay.get(selected) ?? [];
  const timedPlans = selectedPlans.filter((p) => p.kind === 'event' || p.task.dueTime || p.urgent);
  const untimed = selectedPlans.length - timedPlans.length;
  const deadlines = tasks
    .filter((x) => !x.done && x.date > today) // "later this month": none for past months
    .sort((a, b) => a.date.localeCompare(b.date) || (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99'));
  const agendaFrom = isThisMonth && !showEarlier ? today : first;

  return (
    <TabScreen section={t.tabs.month} onAdd={() => openSheet({ kind: 'add', day: selected })} onSwipe={goMonth}>
      {/* Title, navigation, view switch (MO-01..03) */}
      <View className="gap-space-sm pt-space-sm">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="displayLgMobile" accessibilityRole="header">
            {monthYear(first)}
          </Text>
          {season ? (
            <View className="rounded-full bg-secondary-fixed px-2.5 py-0.5">
              <Text variant="labelSm" color="onSecondaryFixed">
                {t.seasons[season]}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <DateNavigator
            label={t.common.today}
            current={isThisMonth && selected === today}
            onLabelPress={() => showMonthDay(null)}
            onPrevious={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            previousLabel={t.month.previous}
            nextLabel={t.month.next}
          />
          <View
            accessibilityRole="tablist"
            accessibilityLabel={t.month.viewLabel}
            className="flex-row items-center rounded-full bg-surface-container p-1">
            {(['grid', 'agenda'] as const).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="tab"
                accessibilityState={{ selected: view === v }}
                onPress={() => setView(v)}
                className={`h-10 flex-row items-center gap-1 rounded-full px-3 ${view === v ? 'bg-surface-container-lowest' : ''}`}
                style={view === v ? shadows.card : undefined}>
                <Icon
                  name={v === 'grid' ? 'grid_view' : 'view_agenda'}
                  size={18}
                  color={view === v ? 'primary' : 'onSurfaceVariant'}
                />
                <Text variant="labelMd" color={view === v ? 'primary' : 'onSurfaceVariant'}>
                  {t.month[v]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {urgentCount || busyDays ? (
          <View className="flex-row items-center gap-space-md">
            {urgentCount ? (
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full bg-secondary" />
                <Text variant="bodyMd" color="onSurfaceVariant">
                  {t.month.urgentCount(urgentCount)}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-full bg-primary" />
              <Text variant="bodyMd" color="onSurfaceVariant">
                {t.month.busyDays(busyDays)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {view === 'grid' ? (
        <>
          {/* Month grid (MO-04, MO-05): one label per day plus "+n"; labels 11px */}
          <View
            accessibilityLabel={monthYear(first)}
            className="-mx-3 rounded-2xl bg-surface-container-lowest px-1 py-space-sm"
            style={shadows.card}>
            <View className="mb-1 flex-row">
              {weeks[0].map((d) => (
                <Text
                  key={d}
                  variant="labelSm"
                  color="onSurfaceVariant"
                  style={{ flex: 1, textAlign: 'center', paddingVertical: 4, textTransform: 'uppercase' }}>
                  {weekdayShort(d)}
                </Text>
              ))}
            </View>
            <View className="gap-0.5">
              {weeks.map((week) => (
                <View key={week[0]} className="flex-row gap-0.5">
                  {week.map((d) => {
                    const inMonth = d >= first && d <= last;
                    const n = parseDayKey(d).day;
                    if (!inMonth) {
                      return (
                        <View
                          key={d}
                          className="min-h-[64px] flex-1 items-center rounded-lg bg-surface-container-low/50 p-1"
                          importantForAccessibility="no">
                          <Text variant="labelMd" color="outline" style={{ opacity: 0.7 }}>
                            {n}
                          </Text>
                        </View>
                      );
                    }
                    const plans = byDay.get(d)!;
                    const top = plans[0];
                    const c = top ? labelColors(top) : null;
                    const isSel = d === selected;
                    const isToday = d === today;
                    return (
                      <Pressable
                        key={d}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSel }}
                        accessibilityLabel={t.month.cell(
                          fullDay(d),
                          isToday,
                          isSel,
                          plans.length,
                          plans.filter((p) => p.urgent && !p.done).length,
                          top ? titleOf(top) : null,
                        )}
                        onPress={() => showMonthDay(d === today ? null : d)}
                        className={`min-h-[64px] flex-1 items-center gap-0.5 rounded-lg px-0.5 py-1 ${isSel ? 'border-2 border-primary bg-primary-fixed/40' : ''}`}>
                        {isToday ? (
                          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                            <Text variant="labelMd" color="onPrimary">
                              {n}
                            </Text>
                          </View>
                        ) : (
                          <Text variant="labelMd" color={d < today ? 'onSurfaceVariant' : 'onSurface'}>
                            {n}
                          </Text>
                        )}
                        {top && c ? (
                          <View className="w-full rounded px-1 py-px" style={{ backgroundColor: c.bg }}>
                            <Text variant="labelXs" numberOfLines={1} style={{ color: c.fg, textAlign: 'center' }}>
                              {titleOf(top)}
                            </Text>
                          </View>
                        ) : null}
                        {plans.length > 1 ? (
                          <Text variant="labelXs" color="onSurfaceVariant">
                            +{plans.length - 1}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Selected day (MO-05, MO-06) */}
          <View className="rounded-2xl bg-surface-container-lowest p-space-md" style={shadows.card}>
            <View className="flex-row items-center justify-between gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityHint={t.month.openDay}
                onPress={() => openDay(selected)}
                className="flex-1 flex-row items-center gap-space-sm">
                <View
                  className={`h-11 w-11 items-center justify-center rounded-full ${selected === today ? 'bg-primary' : 'bg-surface-container'}`}>
                  <Text variant="headlineSm" color={selected === today ? 'onPrimary' : 'onSurface'}>
                    {parseDayKey(selected).day}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text variant="headlineMd" accessibilityRole="header">
                    {longDay(selected)}
                  </Text>
                  {selectedPlans.length || selected === today ? (
                    <Text variant="labelMd" color="onSurfaceVariant">
                      {t.month.daySummary(
                        selected === today,
                        selectedPlans.filter((p) => p.kind === 'event').length,
                        selectedPlans.filter((p) => p.kind === 'task').length,
                      )}
                    </Text>
                  ) : (
                    <Text variant="labelMd" color="onSurfaceVariant">
                      {t.month.freeDay}
                    </Text>
                  )}
                </View>
              </Pressable>
              <IconButton
                icon="add"
                tone="tonal"
                iconColor="primary"
                accessibilityLabel={t.month.addTo(longDay(selected))}
                onPress={() => openSheet({ kind: 'add', day: selected })}
              />
            </View>
            {timedPlans.length ? (
              <View className="mt-space-md gap-1.5">
                {timedPlans.map((p) => (
                  <TimedRow key={p.key} plan={p} day={selected} tinted />
                ))}
              </View>
            ) : selectedPlans.length === 0 ? (
              <View className="mt-space-md items-center">
                <Button
                  label={t.month.planSomething}
                  align="center"
                  icon="add"
                  variant="tonal"
                  onPress={() => openSheet({ kind: 'add', day: selected })}
                />
              </View>
            ) : null}
            {untimed > 0 || timedPlans.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openDay(selected)}
                className="mt-1 min-h-touch flex-row items-center gap-1">
                <Text variant="labelLg" color="primary">
                  {untimed > 0 ? t.month.untimed(untimed) : t.month.openDay}
                </Text>
                <Icon name="arrow_forward" size={18} color="primary" />
              </Pressable>
            ) : null}
          </View>

          {/* This month's goal (MO-06: goals belong to the month, not a day) */}
          <MonthGoalCard month={monthOf(first)} monthStart={first} />

          {/* Coming up this month (MO-07) */}
          <View className="gap-space-sm">
            <View className="flex-row items-end justify-between">
              <Text variant="headlineSm" accessibilityRole="header">
                {t.month.comingUp}
              </Text>
              <Text variant="labelMd" color="onSurfaceVariant">
                {t.month.deadlines}
              </Text>
            </View>
            {deadlines.length ? (
              deadlines.map((x) => (
                <Pressable
                  key={x.id}
                  accessibilityRole="button"
                  accessibilityLabel={[
                    x.title,
                    longDay(x.date),
                    x.dueTime ? clockText(x.dueTime, settings.timeFormat) : t.month.endOfDay,
                    x.urgent ? t.common.urgent : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onPress={() => openSheet({ kind: 'taskMenu', taskId: x.id })}
                  className="flex-row items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-3 active:opacity-80"
                  style={shadows.card}>
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-xl ${x.urgent ? 'bg-secondary-fixed' : 'bg-tertiary-fixed'}`}>
                    <Text
                      variant="labelXs"
                      weight="700"
                      color={x.urgent ? 'onSecondaryFixed' : 'onTertiaryFixed'}
                      style={{ textTransform: 'uppercase' }}>
                      {monthDay(x.date).replace(/[\d\s,]/g, '')}
                    </Text>
                    <Text
                      variant="headlineSm"
                      weight="700"
                      color={x.urgent ? 'onSecondaryFixed' : 'onTertiaryFixed'}
                      style={{ lineHeight: 22 }}>
                      {parseDayKey(x.date).day}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-1.5">
                      {x.urgent ? <UrgentBadge /> : null}
                      <Text variant="labelMd" color="onSurfaceVariant">
                        {t.month.deadlineWhen(
                          weekdayShort(x.date),
                          x.dueTime ? clockText(x.dueTime, settings.timeFormat) : t.month.endOfDay,
                        )}
                      </Text>
                    </View>
                    <Text variant="bodyLg" numberOfLines={1}>
                      {x.title}
                    </Text>
                  </View>
                  <Icon name="chevron_right" />
                </Pressable>
              ))
            ) : (
              <View className="flex-row items-center gap-space-sm rounded-2xl border-[1.5px] border-dashed border-outline-variant p-space-md">
                <Icon name="task_alt" color="primary" />
                <Text variant="bodyMd" color="onSurfaceVariant" style={{ flex: 1 }}>
                  {t.month.noDeadlines}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        /* Agenda (MO-03): from today to the end of the month, earlier days on request */
        <View className="gap-space-md">
          <MonthGoalCard month={monthOf(first)} monthStart={first} />
          {isThisMonth && today > first && !showEarlier ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowEarlier(true)}
              className="min-h-touch flex-row items-center justify-center gap-1 rounded-full bg-surface-container-low active:opacity-80">
              <Icon name="expand_less" size={18} />
              <Text variant="labelLg" color="onSurfaceVariant">
                {t.month.showEarlier(monthDay(first), monthDay(addDaysToKey(today, -1)))}
              </Text>
            </Pressable>
          ) : null}
          {days
            .filter((d) => d >= agendaFrom && byDay.get(d)!.length > 0)
            .map((d) => {
              const plans = byDay.get(d)!;
              const shown = d === today ? plans.slice(0, 3) : plans;
              return (
                <View key={d}>
                  <Text
                    variant="labelMd"
                    color={d === today ? 'primary' : 'onSurfaceVariant'}
                    style={{ textTransform: 'uppercase', marginBottom: 6 }}>
                    {d === today ? t.month.todayHeading(shortDay(d)) : shortDay(d)}
                  </Text>
                  <View className="rounded-2xl bg-surface-container-lowest" style={shadows.card}>
                    {shown.map((p, i) => (
                      <View key={p.key} className={i > 0 ? 'border-t border-surface-variant' : ''}>
                        <TimedRow plan={p} day={d} />
                      </View>
                    ))}
                    {plans.length > shown.length ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => openDay(d)}
                        className="min-h-touch justify-center border-t border-surface-variant px-3">
                        <Text variant="labelLg" color="primary">
                          {t.month.moreToday(plans.length - shown.length)}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          {days.every((d) => d < agendaFrom || byDay.get(d)!.length === 0) ? (
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t.month.agendaEmpty}
            </Text>
          ) : null}
        </View>
      )}
    </TabScreen>
  );
}
