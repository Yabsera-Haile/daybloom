import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { localDayStart } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useCategories, useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { hourLabel, timeOf, timeRange } from '@/i18n/format';
import { eventIcon } from '@/planner/eventIcon';
import type { EventOccurrence } from '@/planner/events';
import type { HourNote } from '@/planner/notes';
import { updateHourNote } from '@/planner/notes';
import type { TaskRow } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { useTheme, type ColorName } from '@/theme';
import { Card, Icon, IconButton, Text, UrgentBadge, type IconName } from '@/ui';

export type TimelineMarker = {
  key: string;
  hour: number;
  icon: IconName;
  iconColor: ColorName;
  card: string;
  text: string;
};

type TimelineProps = {
  day: string;
  isToday: boolean;
  now: number;
  events: EventOccurrence[];
  tasks: TaskRow[];
  notes: HourNote[];
  /** Routines at their hour (TD-13) */
  markers?: TimelineMarker[];
};

const urgentFirst = (a: EventOccurrence, b: EventOccurrence) =>
  Number(b.urgent) - Number(a.urgent) || a.startAt - b.startAt;

/** An event on the timeline or in a list: icon, title, time · place, category, Urgent. */
export function EventCard({ occurrence: o, compact = false }: { occurrence: EventOccurrence; compact?: boolean }) {
  const { lookFor } = useTheme();
  const settings = useSettings();
  const categories = useCategories();
  const openSheet = useUi((s) => s.openSheet);
  const category = categories.find((c) => c.id === o.categoryId);
  const look = lookFor(category?.colorKey);
  const when = o.allDay ? null : timeRange(o.startAt, o.endAt, settings.timeFormat);
  const detail = [when, o.location].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        o.title,
        o.allDay ? t.common.allDay : when,
        o.location,
        category?.name,
        o.urgent ? t.common.urgent : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => openSheet({ kind: 'event', occurrence: o })}
      className={`min-h-touch flex-row items-start gap-2 rounded-xl active:opacity-80 ${look.card} ${compact ? 'items-center px-3' : 'p-3'}`}>
      {compact ? null : (
        <View className="mt-0.5">
          <Icon name={eventIcon(o.title, look.icon)} size={20} tint={look.detail} />
        </View>
      )}
      <View className="flex-1">
        <Text variant="bodyLg" weight="500" style={{ color: look.title }}>
          {o.title}
        </Text>
        {detail && !compact ? (
          <Text variant="bodySm" style={{ color: look.detail }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        {category ? (
          <View className="rounded-full bg-surface-container-lowest/80 px-2 py-0.5">
            <Text variant="labelSm" style={{ color: look.detail }}>
              {category.name}
            </Text>
          </View>
        ) : null}
        {o.urgent ? <UrgentBadge /> : null}
      </View>
    </Pressable>
  );
}

function DueTask({ task }: { task: TaskRow }) {
  const openSheet = useUi((s) => s.openSheet);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.today.due} ${task.title}${task.urgent ? `, ${t.common.urgent}` : ''}`}
      onPress={() => openSheet({ kind: 'taskMenu', taskId: task.id })}
      className={`min-h-touch flex-row items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 active:opacity-80 ${task.urgent ? 'border-secondary bg-secondary-fixed/40' : 'border-dashed border-outline-variant'}`}>
      <Icon name="task_alt" size={20} color={task.urgent ? 'secondary' : 'onSurfaceVariant'} />
      <Text variant="bodyMd" style={{ flex: 1 }} done={task.done}>
        <Text
          variant="bodyMd"
          color={task.urgent ? 'secondary' : 'onSurfaceVariant'}
          weight={task.urgent ? '600' : undefined}>
          {t.today.due}
        </Text>{' '}
        {task.title}
      </Text>
      {task.urgent ? <UrgentBadge /> : null}
    </Pressable>
  );
}

function NoteRow({ note }: { note: HourNote }) {
  const openSheet = useUi((s) => s.openSheet);
  return (
    <View className="min-h-touch flex-row items-center rounded-xl bg-surface-container-low pl-3">
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.note.edit}
        onPress={() => openSheet({ kind: 'note', day: note.date, hour: note.hour, noteId: note.id })}
        className="flex-1 justify-center self-stretch py-2">
        <Text variant="bodyMd" italic color="onSurfaceVariant" done={note.done}>
          {note.text}
        </Text>
      </Pressable>
      <IconButton
        icon={note.done ? 'check_circle' : 'check'}
        iconColor={note.done ? 'primary' : 'outline'}
        accessibilityLabel={note.done ? t.today.noteDone : t.today.noteNotDone}
        onPress={() => updateHourNote(db, note.id, { done: !note.done })}
      />
    </View>
  );
}

function HourRow({
  label,
  children,
  labelSmall = false,
}: {
  label: string;
  children: ReactNode;
  labelSmall?: boolean;
}) {
  return (
    <View className="flex-row gap-2">
      <Text
        variant={labelSmall ? 'labelSm' : 'labelMd'}
        color="outline"
        style={{ width: 48, textAlign: 'right', paddingTop: labelSmall ? 8 : 12 }}>
        {label}
      </Text>
      <View className="flex-1 gap-1.5">{children}</View>
    </View>
  );
}

/** Hourly timeline (TD-13..17): events under their start hour, due to-dos, notes, all-day row, the Now line. */
export function Timeline({ day, isToday, now, events, tasks, notes, markers = [] }: TimelineProps) {
  const settings = useSettings();
  const openSheet = useUi((s) => s.openSheet);
  const [wholeDay, setWholeDay] = useState(false);
  const tf = settings.timeFormat;

  const dayStart = localDayStart(day);
  const allDay = events.filter((e) => e.allDay || e.startAt < dayStart).sort(urgentFirst);
  const timed = events.filter((e) => !e.allDay && e.startAt >= dayStart);
  const due = tasks.filter((x) => x.dueTime);
  const hourOf = (ms: number) => new Date(ms).getHours();
  const usedHours = [
    ...timed.map((e) => hourOf(e.startAt)),
    ...due.map((x) => Number(x.dueTime!.slice(0, 2))),
    ...notes.map((n) => n.hour),
    ...markers.map((m) => m.hour),
  ];
  const nowHour = hourOf(now);
  const empty = usedHours.length === 0 && allDay.length === 0;

  // 7 AM – 9 PM, stretched to fit anything earlier or later; an empty day shows a few hours around now.
  let first = Math.min(7, ...usedHours);
  let last = Math.max(21, ...usedHours);
  if (empty && !wholeDay) {
    first = isToday ? Math.max(0, Math.min(nowHour - 1, 19)) : 9;
    last = first + 4;
  }
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const nowAfter = !isToday ? null : nowHour < first ? first - 1 : Math.min(nowHour, last);
  const nowLine = (
    <View
      key="now"
      accessible
      accessibilityLabel={t.today.nowAt(timeOf(now, tf))}
      className="flex-row items-center gap-2">
      <Text variant="labelSm" color="secondary" style={{ width: 48, textAlign: 'right' }}>
        {timeOf(now, tf).replace(/ (AM|PM)$/, '')}
      </Text>
      <View className="flex-1 flex-row items-center">
        <View className="-ml-1.5 h-3 w-3 rounded-full bg-secondary" />
        <View className="h-[2px] flex-1 bg-secondary" />
      </View>
    </View>
  );
  let tapHintShown = false;

  return (
    <Card>
      <View className="mb-space-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm">
          <Icon name="schedule" color="primary" />
          <Text variant="headlineMd" accessibilityRole="header">
            {t.today.timeline}
          </Text>
        </View>
        {isToday ? (
          <View className="h-8 flex-row items-center gap-1.5 rounded-full bg-surface-container px-3">
            <View className="h-2 w-2 rounded-full bg-secondary" />
            <Text variant="labelMd" color="onSurfaceVariant">
              {t.time.nowLabel(timeOf(now, tf))}
            </Text>
          </View>
        ) : null}
      </View>
      {empty ? (
        <Text variant="bodyMd" color="onSurfaceVariant" style={{ marginBottom: 16 }}>
          {t.today.dayOpen}
        </Text>
      ) : null}

      <View className="gap-1.5">
        {allDay.length ? (
          <HourRow label={t.common.allDay} labelSmall>
            {allDay.map((e) => (
              <EventCard key={e.key} occurrence={e} compact />
            ))}
          </HourRow>
        ) : null}
        {nowAfter === first - 1 ? nowLine : null}
        {hours.map((h) => {
          const hourEvents = timed.filter((e) => hourOf(e.startAt) === h).sort(urgentFirst);
          const hourDue = due.filter((x) => Number(x.dueTime!.slice(0, 2)) === h);
          const hourNotes = notes.filter((n) => n.hour === h);
          const hourMarkers = markers.filter((m) => m.hour === h);
          const isEmpty = !hourEvents.length && !hourDue.length && !hourNotes.length && !hourMarkers.length;
          const showHint = isEmpty && empty && !tapHintShown && (!isToday || h > nowHour);
          if (showHint) tapHintShown = true;
          return [
            <HourRow key={h} label={hourLabel(h, tf)}>
              {hourMarkers.map((m) => (
                <View key={m.key} className={`min-h-touch flex-row items-center gap-2 rounded-xl px-3 ${m.card}`}>
                  <Icon name={m.icon} size={20} color={m.iconColor} />
                  <Text variant="bodyMd" style={{ flex: 1 }}>
                    {m.text}
                  </Text>
                </View>
              ))}
              {hourEvents.map((e) => (
                <EventCard key={e.key} occurrence={e} />
              ))}
              {hourDue.map((x) => (
                <DueTask key={x.id} task={x} />
              ))}
              {hourNotes.map((n) => (
                <NoteRow key={n.id} note={n} />
              ))}
              {isEmpty ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.today.addAtHour(hourLabel(h, tf))}
                  onPress={() => openSheet({ kind: 'add', day, hour: h })}
                  className="min-h-touch flex-row items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-outline-variant/70 active:bg-surface-container-low">
                  {showHint ? (
                    <>
                      <Icon name="add" size={18} />
                      <Text variant="labelMd" color="onSurfaceVariant">
                        {t.today.tapToAdd}
                      </Text>
                    </>
                  ) : null}
                </Pressable>
              ) : null}
            </HourRow>,
            nowAfter === h ? nowLine : null,
          ];
        })}
      </View>

      {empty && !wholeDay ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setWholeDay(true)}
          className="mt-1 min-h-touch flex-row items-center justify-center gap-1 active:opacity-70">
          <Icon name="unfold_more" size={18} color="primary" />
          <Text variant="labelLg" color="primary">
            {t.today.wholeDay(hourLabel(7, tf), hourLabel(21, tf))}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
