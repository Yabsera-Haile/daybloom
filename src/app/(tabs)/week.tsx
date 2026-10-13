import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type ScrollView } from 'react-native';

import { seasonOf, toDayKey, weekNumber, weekRange } from '@/calendar/dates';
import { addDaysToKey, parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useCategories, useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { HabitsAtGlance } from '@/features/habits/Glance';
import { PlanRow } from '@/features/PlanRow';
import { dayStatus, paceLabel, plansByDay, type Plan } from '@/features/plans';
import { TaskForm } from '@/features/sheets/TaskForm';
import { TabScreen, useHeaderOffset } from '@/features/TabScreen';
import { t } from '@/i18n';
import { monthDay, weekdayLetter, weekdayLong } from '@/i18n/format';
import { eventsBetween } from '@/planner/events';
import { setWeekIntention, weekIntention } from '@/planner/notes';
import { setTaskDone, tasksBetween, type TaskRow } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { categoryColors, shadows, type CategoryKey } from '@/theme';
import {
  Button,
  Checkbox,
  DateNavigator,
  Icon,
  IconButton,
  ProgressBar,
  Sheet,
  Sticker,
  Text,
  TextField,
  UrgentBadge,
} from '@/ui';

const dateOf = (day: string) => {
  const p = parseDayKey(day);
  return new Date(p.year, p.month - 1, p.day, 12);
};

function StatusChip({ plans, when }: { plans: Plan[]; when: 'past' | 'today' | 'future' }) {
  const categories = useCategories();
  const status = dayStatus(plans, when);
  if (!status) return null;
  if (status.kind === 'allDone') {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5">
        <Icon name="check_circle" size={14} color="onPrimaryFixed" filled />
        <Text variant="labelSm" color="onPrimaryFixed">
          {t.week.allDone}
        </Text>
      </View>
    );
  }
  if (status.kind === 'nDone') {
    return (
      <View className="rounded-full bg-surface-container-high px-2.5 py-0.5">
        <Text variant="labelSm" color="onSurfaceVariant">
          {t.week.nDone(status.done, status.total)}
        </Text>
      </View>
    );
  }
  if (status.kind === 'deadline') {
    return (
      <View className="rounded-full bg-secondary-fixed px-2.5 py-0.5">
        <Text variant="labelSm" color="onSecondaryFixed">
          {t.week.deadline}
        </Text>
      </View>
    );
  }
  const category = categories.find((c) => c.id === status.categoryId);
  if (!category) return null;
  const c = categoryColors[category.colorKey as CategoryKey] ?? categoryColors.personal;
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: c.container }}>
      <Text variant="labelSm" style={{ color: c.onContainer }}>
        {category.name}
      </Text>
    </View>
  );
}

const SHOWN = 3;

/** One day of the weekly spread (WK-06..09). Tapping it opens that day on Today. */
function DayCard({
  day,
  plans,
  when,
  onOpen,
  onAdd,
}: {
  day: string;
  plans: Plan[];
  when: 'past' | 'today' | 'future';
  onOpen: () => void;
  onAdd: () => void;
}) {
  const n = parseDayKey(day).day;
  const more = plans.length - SHOWN;
  const list = (
    <View className="mt-space-sm gap-2">
      {plans.slice(0, SHOWN).map((p) => (
        <PlanRow key={p.key} plan={p} day={day} />
      ))}
    </View>
  );

  if (when === 'today') {
    const events = plans.filter((p) => p.kind === 'event').length;
    return (
      <View className="overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md" style={shadows.card}>
        <View className="absolute bottom-0 left-0 top-0 w-2 bg-primary" />
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t.week.openDay}
          onPress={onOpen}
          className="flex-row items-center justify-between pl-2">
          <View className="flex-row items-center gap-space-sm">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Text variant="headlineSm" weight="700" color="onPrimary">
                {n}
              </Text>
            </View>
            <View>
              <Text variant="headlineMd" weight="600" color="primary">
                {weekdayLong(day)}
              </Text>
              <Text variant="labelMd" color="onSurfaceVariant">
                {t.week.todaySummary(events, plans.length - events)}
              </Text>
            </View>
          </View>
          <View className="rounded-full bg-primary px-3 py-1">
            <Text variant="labelSm" color="onPrimary" style={{ textTransform: 'uppercase' }}>
              {t.common.today}
            </Text>
          </View>
        </Pressable>
        {plans.length ? <View className="pl-2">{list}</View> : null}
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          className="mt-2 min-h-touch flex-row items-center gap-1 pl-2">
          <Text variant="labelLg" color="primary">
            {more > 0 ? t.week.more(more) : t.week.openDay}
          </Text>
          <Icon name="arrow_forward" size={18} color="primary" />
        </Pressable>
      </View>
    );
  }

  const header = (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-space-sm">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-variant">
          <Text variant="labelMd" color="onSurfaceVariant">
            {n}
          </Text>
        </View>
        <Text variant="headlineSm">{weekdayLong(day)}</Text>
      </View>
      {plans.length ? (
        <StatusChip plans={plans} when={when} />
      ) : when === 'past' ? (
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.week.nothingPlanned}
        </Text>
      ) : (
        <Button label={t.common.add} icon="add" size="md" variant="tonal" onPress={onAdd} />
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.week.openDay}
      onPress={onOpen}
      className={`rounded-2xl p-space-md active:opacity-90 ${plans.length || when === 'future' ? 'bg-surface-container-low' : 'bg-surface-container-low/60'}`}>
      {header}
      {plans.length ? <View className="ml-10">{list}</View> : null}
      {more > 0 ? (
        <Text variant="labelMd" color="primary" style={{ marginLeft: 40, marginTop: 8 }}>
          {t.week.more(more)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function PriorityRow({ task }: { task: TaskRow }) {
  const openSheet = useUi((s) => s.openSheet);
  return (
    <View className="flex-row items-start gap-1 rounded-xl bg-surface-container-lowest py-1 pr-1" style={shadows.card}>
      <Checkbox
        checked={task.done}
        onChange={(done) => setTaskDone(db, task.id, done)}
        label={task.done ? t.task.markNotDone(task.title) : t.task.markDone(task.title)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.task.options(task.title)}
        onPress={() => openSheet({ kind: 'taskMenu', taskId: task.id })}
        className="flex-1 flex-row items-start gap-2 py-2.5">
        <View className="flex-1">
          <Text
            variant="bodyLg"
            weight={task.done ? undefined : '500'}
            color={task.done ? 'onSurfaceVariant' : 'onSurface'}
            done={task.done}>
            {task.title}
          </Text>
          {task.notes ? (
            <Text variant="bodySm" color="onSurfaceVariant">
              {task.notes}
            </Text>
          ) : null}
        </View>
        {task.urgent && !task.done ? <UrgentBadge /> : null}
      </Pressable>
    </View>
  );
}

export default function WeekScreen() {
  const today = useToday();
  const settings = useSettings();
  const { weekDay, showWeek, showDay, openSheet } = useUi();
  const scroll = useRef<ScrollView>(null);
  const spreadY = useRef(0);
  const cardY = useRef<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [addingPriority, setAddingPriority] = useState(false);
  const prioritiesY = useRef(0);
  const headerOffset = useHeaderOffset();
  useEffect(() => {
    if (addingPriority) scroll.current?.scrollTo({ y: prioritiesY.current - headerOffset, animated: true });
  }, [addingPriority, headerOffset]);
  const [editingIntention, setEditingIntention] = useState<string | null>(null);

  const range = weekRange(dateOf(weekDay ?? today), settings.weekStart);
  const start = toDayKey(range.start);
  const end = toDayKey(range.end);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
  const isThisWeek = today >= start && today <= end;
  const n = weekNumber(range.start, settings.weekStart);
  const year = (n === 1 ? range.end : range.start).getFullYear();

  const events = useLive(() => eventsBetween(db, start, end), [start, end]);
  const tasks = useLive(() => tasksBetween(db, start, end), [start, end]);
  const priorities = useLive(() => tasksBetween(db, start, end, 'week'), [start, end]);
  const intention = useLive(() => weekIntention(db, start), [start]);
  const byDay = plansByDay(days, events, tasks);

  // counts are always worked out from the data (FR-13)
  const allTasks = [...tasks, ...priorities];
  const done = allTasks.filter((x) => x.done).length;
  const soFar = tasks.filter((x) => x.date <= today);
  const pace = isThisWeek
    ? paceLabel(
        soFar.filter((x) => x.done).length + priorities.filter((x) => x.done).length,
        soFar.length + priorities.length,
      )
    : null;
  const season = settings.seasons ? seasonOf(dateOf(start), settings.hemisphere) : null;

  const move = (by: 1 | -1) => {
    const next = addDaysToKey(start, by * 7);
    showWeek(today >= next && today <= addDaysToKey(next, 6) ? null : next);
    setSelected(null);
  };
  const openDay = (day: string) => {
    showDay(day === today ? null : day);
    router.navigate('/');
  };
  const jumpTo = (day: string) => {
    setSelected(day);
    scroll.current?.scrollTo({ y: spreadY.current + (cardY.current[day] ?? 0) - headerOffset, animated: true });
  };
  const addDay = isThisWeek ? today : start;

  return (
    <TabScreen
      ref={scroll}
      section={t.tabs.week}
      onAdd={() => openSheet({ kind: 'add', day: selected ?? addDay, week: { start, end } })}
      onSwipe={move}>
      {/* Header (WK-01..03) */}
      <View className="gap-1 pt-space-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Icon name="calendar_today" size={18} color="primary" />
            <Text variant="labelMd" color="onSurfaceVariant">
              {t.week.number(n, year)}
            </Text>
          </View>
          {pace ? (
            <View className="h-8 flex-row items-center gap-1.5 rounded-full bg-primary-fixed/60 px-3">
              <View className="h-2 w-2 rounded-full bg-primary" />
              <Text variant="labelMd" color="onPrimaryFixedVariant">
                {t.week[pace]}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text variant="headlineLg" accessibilityRole="header">
            {monthDay(start)} – {monthDay(end)}
          </Text>
          <DateNavigator
            label={t.week.thisWeek}
            current={isThisWeek}
            onLabelPress={() => showWeek(null)}
            onPrevious={() => move(-1)}
            onNext={() => move(1)}
            previousLabel={t.week.previous}
            nextLabel={t.week.next}
          />
        </View>
      </View>

      {/* Week strip (WK-04) */}
      <View
        accessibilityLabel={t.week.stripLabel}
        className="flex-row gap-1 rounded-2xl bg-surface-container-low p-1.5"
        style={shadows.card}>
        {days.map((d) => {
          const plans = byDay.get(d)!;
          const urgent = plans.filter((p) => p.urgent && !p.done).length;
          const filled = d === (selected ?? (isThisWeek ? today : null));
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: filled }}
              accessibilityLabel={t.week.stripDay(
                `${weekdayLong(d)} ${parseDayKey(d).day}`,
                d === today,
                plans.length,
                urgent,
              )}
              onPress={() => jumpTo(d)}
              className={`min-h-touch flex-1 items-center rounded-xl py-2 ${filled ? 'bg-primary' : ''}`}
              style={filled ? shadows.card : undefined}>
              <Text variant="labelSm" color={filled ? 'primaryFixed' : 'onSurfaceVariant'}>
                {weekdayLetter(d)}
              </Text>
              <Text
                variant="bodyLg"
                weight={filled ? '700' : '600'}
                color={filled ? 'onPrimary' : d < today ? 'onSurfaceVariant' : 'onSurface'}>
                {parseDayKey(d).day}
              </Text>
              <View
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${urgent ? (filled ? 'bg-secondary-container' : 'bg-secondary') : plans.length ? (filled ? 'bg-primary-fixed' : 'bg-primary') : ''}`}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Weekly intention (WK-05) */}
      <View
        className="flex-row items-center gap-space-md rounded-2xl bg-surface-container p-space-md"
        style={shadows.card}>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text variant="labelSm" color="tertiary" style={{ textTransform: 'uppercase' }}>
              {t.week.intention}
            </Text>
            <IconButton
              icon="edit"
              accessibilityLabel={t.week.intentionEdit}
              className="-my-3 -mr-3"
              onPress={() => setEditingIntention(intention ?? '')}
            />
          </View>
          {intention ? (
            <Text variant="headlineSm" italic>
              “{intention}”
            </Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setEditingIntention('')}>
              <Text variant="bodyLg" color="onSurfaceVariant" italic>
                {t.week.intentionEmpty}
              </Text>
            </Pressable>
          )}
          {allTasks.length ? (
            <>
              <Text variant="bodySm" color="onSurfaceVariant" style={{ marginTop: 4 }}>
                {t.week.doneThisWeek(done, allTasks.length)}
              </Text>
              <View className="mt-1.5">
                <ProgressBar value={done / allTasks.length} label={t.week.doneThisWeek(done, allTasks.length)} />
              </View>
            </>
          ) : null}
        </View>
        {season ? <Sticker name={season} size={80} rotate={-6} /> : null}
      </View>

      {/* Weekly spread (WK-06..09) */}
      <View className="gap-space-sm" onLayout={(e) => (spreadY.current = e.nativeEvent.layout.y)}>
        <View className="flex-row items-end justify-between">
          <Text variant="headlineMd" accessibilityRole="header">
            {t.week.spread}
          </Text>
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.week.tapDay}
          </Text>
        </View>
        {days.map((d) => (
          <View key={d} onLayout={(e) => (cardY.current[d] = e.nativeEvent.layout.y)}>
            <DayCard
              day={d}
              plans={byDay.get(d)!}
              when={d < today ? 'past' : d === today ? 'today' : 'future'}
              onOpen={() => openDay(d)}
              onAdd={() => openSheet({ kind: 'add', day: d })}
            />
          </View>
        ))}
      </View>

      {/* Weekly priorities (WK-10) */}
      <View
        onLayout={(e) => (prioritiesY.current = e.nativeEvent.layout.y)}
        className="gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2">
            <Icon name="flag" color="primary" />
            <View className="flex-1">
              <Text variant="headlineMd" accessibilityRole="header">
                {t.week.priorities}
              </Text>
              {priorities.length ? (
                <Text variant="bodySm" color="onSurfaceVariant">
                  {t.week.prioritiesDone(priorities.filter((x) => x.done).length, priorities.length)}
                </Text>
              ) : null}
            </View>
          </View>
          {addingPriority ? null : (
            <IconButton
              icon="add"
              tone="primary"
              accessibilityLabel={t.week.addPriority}
              onPress={() => setAddingPriority(true)}
            />
          )}
        </View>
        {addingPriority ? (
          <TaskForm key={start} day={start} scope="week" compact onClose={() => setAddingPriority(false)} />
        ) : null}
        {priorities.length ? (
          <View className="gap-2">
            {priorities.map((x) => (
              <PriorityRow key={x.id} task={x} />
            ))}
          </View>
        ) : addingPriority ? null : (
          <View className="items-center gap-space-sm rounded-xl border-[1.5px] border-dashed border-outline-variant p-space-md">
            <Text variant="bodyLg" style={{ textAlign: 'center' }}>
              {t.week.noPriorities}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.week.noPrioritiesText}
            </Text>
            <Button label={t.week.addAPriority} icon="add" align="center" onPress={() => setAddingPriority(true)} />
          </View>
        )}
      </View>

      {/* Habits at a glance (WK-11) */}
      <HabitsAtGlance days={days} today={today} />

      {editingIntention !== null ? (
        <Sheet visible onClose={() => setEditingIntention(null)} title={t.week.intention} closeButton>
          <View className="gap-space-md pb-space-sm">
            <TextField
              autoFocus
              accessibilityLabel={t.week.intention}
              placeholder={t.week.intentionPlaceholder}
              value={editingIntention}
              onChangeText={setEditingIntention}
              variant="headlineSm"
              multiline
              className="border-b-[1.5px] border-primary pb-2"
            />
            <View className="flex-row gap-space-sm">
              <Button
                label={t.common.cancel}
                variant="outline"
                className="flex-1"
                onPress={() => setEditingIntention(null)}
              />
              <Button
                label={t.common.save}
                className="flex-1"
                onPress={() => {
                  setWeekIntention(db, start, editingIntention);
                  setEditingIntention(null);
                }}
              />
            </View>
          </View>
        </Sheet>
      ) : null}
    </TabScreen>
  );
}
