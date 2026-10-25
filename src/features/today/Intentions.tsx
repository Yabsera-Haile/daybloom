import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { clockText, shortDay } from '@/i18n/format';
import { setTaskDone, type TaskRow } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { Button, Card, Checkbox, FilterChip, Icon, IconButton, Text, UrgentBadge, useNarrow } from '@/ui';

import { TaskForm } from '../sheets/TaskForm';

type Filter = 'all' | 'urgent' | 'notUrgent';

/** One to-do: checkbox, title, Urgent, due time and list, ⋮ menu (TD-08, TD-11). */
export function TaskRowView({ task }: { task: TaskRow }) {
  const settings = useSettings();
  const { openSheet, showToast } = useUi();
  const meta = [task.dueTime ? t.task.due(clockText(task.dueTime, settings.timeFormat)) : null, task.listLabel]
    .filter(Boolean)
    .join(' · ');
  const tick = (done: boolean) => {
    setTaskDone(db, task.id, done);
    // a quick note it's done; unticking the box undoes it
    if (done) showToast(t.today.ticked(task.title));
  };
  return (
    <View className="flex-row items-start gap-1 rounded-xl bg-surface-container-low py-1 pl-1">
      <Checkbox
        checked={task.done}
        onChange={tick}
        label={task.done ? t.task.markNotDone(task.title) : t.task.markDone(task.title)}
      />
      <View className="flex-1 py-2">
        <Text
          variant="bodyLg"
          weight={task.urgent || task.dueTime ? '500' : undefined}
          color={task.done ? 'onSurfaceVariant' : 'onSurface'}
          done={task.done}>
          {task.title}
        </Text>
        {task.urgent || meta ? (
          <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {task.urgent ? <UrgentBadge /> : null}
            {meta ? (
              <View className="flex-row items-center gap-0.5">
                {task.dueTime ? <Icon name="schedule" size={16} /> : null}
                <Text variant="bodySm" color="onSurfaceVariant">
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <IconButton
        icon="more_vert"
        accessibilityLabel={t.task.options(task.title)}
        onPress={() => openSheet({ kind: 'taskMenu', taskId: task.id })}
      />
    </View>
  );
}

/** Daily Intentions (TD-08..12): to-dos for the day, filters with live counts, inline add. */
export function Intentions({ day, isToday, tasks }: { day: string; isToday: boolean; tasks: TaskRow[] }) {
  const { addingTask, setAddingTask } = useUi();
  const [filter, setFilter] = useState<Filter>('all');
  const urgent = tasks.filter((x) => x.urgent).length;
  // on a narrow screen the Add button goes under the title, which keeps its line
  const narrow = useNarrow();
  const shown = tasks
    .filter((x) => filter === 'all' || (filter === 'urgent') === x.urgent)
    .sort((a, b) => Number(a.done) - Number(b.done)); // done ones sink, otherwise list order

  return (
    <Card>
      <View className={narrow ? 'gap-space-sm' : 'flex-row items-center justify-between gap-2'}>
        <View className={`flex-row items-center gap-space-sm ${narrow ? '' : 'flex-1'}`}>
          <Icon name="checklist" color="primary" />
          <View className="flex-1">
            <Text variant="headlineMd" accessibilityRole="header">
              {t.today.intentions}
            </Text>
            <Text variant="bodySm" color="onSurfaceVariant">
              {isToday ? t.today.intentionsFor : t.today.intentionsForDay(shortDay(day))}
            </Text>
          </View>
        </View>
        {addingTask ? null : (
          <Button label={t.today.addTodo} icon="add" size="md" onPress={() => setAddingTask(true)} />
        )}
      </View>

      {addingTask ? (
        <View className="mt-space-md">
          <TaskForm key={day} day={day} scope="day" compact onClose={() => setAddingTask(false)} />
        </View>
      ) : null}

      {tasks.length === 0 ? (
        addingTask ? null : (
          <View className="mt-space-md items-center gap-space-sm rounded-xl border-[1.5px] border-dashed border-outline-variant p-space-md">
            <Text variant="bodyLg" style={{ textAlign: 'center' }}>
              {t.today.noTodos}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.today.noTodosText}
            </Text>
            <Button label={t.today.addATodo} icon="add" align="center" onPress={() => setAddingTask(true)} />
          </View>
        )
      ) : (
        <>
          <View
            accessibilityRole="tablist"
            accessibilityLabel={t.today.filterLabel}
            className="mt-space-md flex-row flex-wrap gap-2">
            <FilterChip
              label={t.today.filterAll(tasks.length)}
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <FilterChip
              label={t.today.filterUrgent(urgent)}
              selected={filter === 'urgent'}
              onPress={() => setFilter('urgent')}
            />
            <FilterChip
              label={t.today.filterNotUrgent(tasks.length - urgent)}
              selected={filter === 'notUrgent'}
              onPress={() => setFilter('notUrgent')}
            />
          </View>
          <View className="mt-space-md gap-space-sm">
            {shown.length ? (
              shown.map((task) => <TaskRowView key={task.id} task={task} />)
            ) : (
              <Text variant="bodyMd" color="onSurfaceVariant">
                {t.today.noneMatch}
              </Text>
            )}
          </View>
        </>
      )}
    </Card>
  );
}
