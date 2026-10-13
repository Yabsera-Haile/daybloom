import { View } from 'react-native';

import { addDaysToKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { clockText, shortDay } from '@/i18n/format';
import { deleteTask, getTask, moveTask, updateTask } from '@/planner/tasks';
import { useUi } from '@/state/ui';
import { MenuRow, Sheet } from '@/ui';
import { pickDay } from '@/ui/pickers';

/** To-do options (TD-12): Edit, Move to tomorrow, Move to another day, Urgent on/off, Delete with Undo. */
export function TaskMenu({ taskId }: { taskId: string }) {
  const { closeSheet, openSheet, showToast } = useUi();
  const settings = useSettings();
  const task = useLive(() => getTask(db, taskId), [taskId]);
  if (!task || task.deletedAt !== null) return null;

  const weekly = task.scope === 'week';
  const move = (day: string) => {
    const undo = moveTask(db, task.id, day);
    closeSheet();
    showToast(t.task.moved(shortDay(day)), undo);
  };

  return (
    <Sheet
      visible
      onClose={closeSheet}
      eyebrow={
        weekly
          ? t.add.priority
          : t.task.menuTitle(task.dueTime ? t.task.due(clockText(task.dueTime, settings.timeFormat)) : null)
      }
      title={task.title}
      flush>
      <View>
        <MenuRow
          icon="edit"
          label={t.common.edit}
          onPress={() => openSheet({ kind: 'task', day: task.date, scope: weekly ? 'week' : 'day', taskId: task.id })}
        />
        <MenuRow
          icon="arrow_forward"
          label={weekly ? t.task.moveNextWeek : t.task.moveTomorrow}
          onPress={() => move(addDaysToKey(task.date, weekly ? 7 : 1))}
        />
        {weekly ? null : (
          <MenuRow
            icon="calendar_month"
            label={t.task.moveOther}
            onPress={async () => {
              const day = await pickDay(task.date);
              if (day && day !== task.date) move(day);
            }}
          />
        )}
        <MenuRow
          icon={task.urgent ? 'low_priority' : 'priority_high'}
          label={task.urgent ? t.task.makeNotUrgent : t.task.makeUrgent}
          onPress={() => {
            updateTask(db, task.id, { urgent: !task.urgent });
            closeSheet();
          }}
        />
        <View className="mt-1 border-t border-surface-variant">
          <MenuRow
            icon="delete"
            tone="danger"
            label={t.common.delete}
            onPress={() => {
              const undo = deleteTask(db, task.id);
              closeSheet();
              showToast(t.task.deleted, undo);
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
