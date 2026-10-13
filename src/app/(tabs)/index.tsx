import { isNull } from 'drizzle-orm';
import { useEffect, useRef } from 'react';
import { View, type ScrollView } from 'react-native';

import { addDaysToKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { events as eventsTable, tasks as tasksTable } from '@/db/schema';
import { useNow, useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { RoutineCards, useRoutineMarkers } from '@/features/habits/RoutineCards';
import { DateCard } from '@/features/today/DateCard';
import { Intentions } from '@/features/today/Intentions';
import { Timeline } from '@/features/today/Timeline';
import { UpNext } from '@/features/today/UpNext';
import { TabScreen, useHeaderOffset } from '@/features/TabScreen';
import { t } from '@/i18n';
import { longDay } from '@/i18n/format';
import { eventsBetween } from '@/planner/events';
import { hourNotesOn } from '@/planner/notes';
import { tasksOn } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { Icon, Text } from '@/ui';

/** True until the first event or to-do is added (shows the welcome card, design/daybloom/today-empty). */
function isFreshStart(): boolean {
  return (
    !db.select({ id: eventsTable.id }).from(eventsTable).where(isNull(eventsTable.deletedAt)).limit(1).get() &&
    !db.select({ id: tasksTable.id }).from(tasksTable).where(isNull(tasksTable.deletedAt)).limit(1).get()
  );
}

export default function TodayScreen() {
  const today = useToday();
  const now = useNow();
  const settings = useSettings();
  const { todayDay, showDay, openSheet, addingTask, setAddingTask } = useUi();
  const scroll = useRef<ScrollView>(null);
  const intentionsY = useRef(0);
  const headerOffset = useHeaderOffset();
  const day = todayDay ?? today;
  const isToday = day === today;

  const events = useLive(() => eventsBetween(db, day, day), [day]);
  const tasks = useLive(() => tasksOn(db, day), [day]);
  const notes = useLive(() => hourNotesOn(db, day), [day]);
  const fresh = useLive(isFreshStart, []);
  const markers = useRoutineMarkers(day, isToday, now);
  const upNext = isToday ? events.find((e) => !e.allDay && e.startAt > now) : undefined;

  // bring the inline "Add to-do" form into view (also when opened from the + Add chooser)
  useEffect(() => {
    if (addingTask) scroll.current?.scrollTo({ y: Math.max(0, intentionsY.current - headerOffset), animated: true });
  }, [addingTask, headerOffset]);

  const move = (by: 1 | -1) => {
    setAddingTask(false);
    const next = addDaysToKey(day, by);
    showDay(next === today ? null : next);
  };

  return (
    <TabScreen
      ref={scroll}
      section={isToday ? t.tabs.today : longDay(day)}
      onAdd={() => openSheet({ kind: 'add', day, inline: true })}
      onSwipe={move}>
      <DateCard day={day} isToday={isToday} onMove={move} onToday={() => showDay(null)} />
      {fresh && isToday ? (
        <View className="flex-row gap-space-sm rounded-2xl bg-primary-fixed/50 p-space-md">
          <Icon name="local_florist" size={28} color="primary" />
          <View className="flex-1">
            <Text variant="headlineSm">{t.today.welcome(settings.name)}</Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ marginTop: 2 }}>
              {t.today.firstDay}
            </Text>
          </View>
        </View>
      ) : null}
      {upNext ? <UpNext occurrence={upNext} now={now} /> : null}
      <RoutineCards day={day} isToday={isToday} now={now} />
      <View onLayout={(e) => (intentionsY.current = e.nativeEvent.layout.y)}>
        <Intentions day={day} isToday={isToday} tasks={tasks} />
      </View>
      <Timeline day={day} isToday={isToday} now={now} events={events} tasks={tasks} notes={notes} markers={markers} />
    </TabScreen>
  );
}
