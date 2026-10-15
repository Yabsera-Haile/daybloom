import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { useDraft } from '@/data/drafts';
import { useSettings } from '@/data/hooks';
import { DraftNotice } from '@/features/DraftNotice';
import { t } from '@/i18n';
import { clockText, reminderText } from '@/i18n/format';
import { createTask, updateTask, type TaskRow, type TaskScope } from '@/planner/tasks';
import { reminderOffsets } from '@/reminders/store';
import { Button, ChoiceChip, IconButton, Text, TextField } from '@/ui';
import { pickTime } from '@/ui/pickers';

export const REMINDER_CHOICES = [0, 10, 30, 60, 1440];

type TaskFormProps = {
  day: string;
  scope: TaskScope;
  task?: TaskRow;
  /** Preset due hour (opened from an hour on Today). */
  dueHour?: number;
  /** Today's inline form (TD-10): title, Urgent, time, Cancel, Save. */
  compact?: boolean;
  placeholder?: string;
  onClose: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** New or edited to-do (TD-10, TD-12) or weekly priority (WK-10). Only the title is required. */
export function TaskForm({ day, scope, task, dueHour, compact = false, placeholder, onClose }: TaskFormProps) {
  const settings = useSettings();
  // a new to-do keeps its typing until saved (UX-05)
  const draft = useDraft(task ? null : `task.${scope}`, {
    title: task?.title ?? '',
    listLabel: task?.listLabel ?? '',
    notes: task?.notes ?? '',
  });
  const { title, listLabel, notes } = draft.values;
  const [urgent, setUrgent] = useState(task?.urgent ?? false);
  const [dueTime, setDueTime] = useState<string | null>(
    task?.dueTime ?? (dueHour !== undefined ? `${pad(dueHour)}:00` : null),
  );
  const [reminders, setReminders] = useState<number[]>(() =>
    task ? reminderOffsets(db, 'task', task.id) : settings.defaultReminder !== null ? [settings.defaultReminder] : [],
  );
  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const remind = dueTime ? reminders : [];
    if (task) updateTask(db, task.id, { title, urgent, dueTime, listLabel, notes }, remind);
    else createTask(db, { title, date: day, scope, urgent, dueTime, listLabel, notes }, remind);
    draft.clear();
    onClose();
  };

  // Cancel means "I don't want this": the typing goes too
  const cancel = () => {
    draft.clear();
    onClose();
  };

  const chooseTime = async () => {
    const next = new Date();
    const time = await pickTime(dueTime ?? `${pad((next.getHours() + 1) % 24)}:00`, settings.timeFormat === '24h');
    if (time) setDueTime(time);
  };

  const chips = (
    <View className="flex-row flex-wrap items-center gap-2">
      <ChoiceChip
        role="checkbox"
        icon="priority_high"
        label={t.common.urgent}
        selected={urgent}
        selectedClass="border-secondary bg-secondary"
        selectedText="onSecondary"
        onPress={() => setUrgent(!urgent)}
      />
      {scope === 'day' ? (
        <View className="flex-row items-center">
          <ChoiceChip
            role="button"
            icon="schedule"
            label={dueTime ? t.task.due(clockText(dueTime, settings.timeFormat)) : t.task.addTime}
            selected={!!dueTime}
            selectedClass="border-primary bg-primary-fixed"
            selectedText="onPrimaryFixed"
            onPress={chooseTime}
          />
          {dueTime ? (
            <IconButton icon="close" accessibilityLabel={t.task.removeTime} onPress={() => setDueTime(null)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (compact) {
    return (
      <View className="gap-space-sm rounded-2xl bg-surface-container p-space-sm">
        <DraftNotice draft={draft} />
        <TextField
          autoFocus
          accessibilityLabel={t.task.newLabel}
          placeholder={placeholder ?? (scope === 'week' ? t.week.priorityPlaceholder : t.task.newPlaceholder)}
          value={title}
          onChangeText={(v) => draft.set('title', v)}
          returnKeyType="done"
          onSubmitEditing={save}
          className="h-12 rounded-xl border-[1.5px] border-primary bg-surface-container-lowest px-3"
        />
        <View className="flex-row flex-wrap items-center gap-2">
          {chips}
          <View className="ml-auto flex-row items-center gap-1">
            <Button label={t.common.cancel} variant="text" size="md" onPress={cancel} />
            <Button
              label={t.common.save}
              size="md"
              onPress={save}
              disabled={!canSave}
              className={canSave ? '' : 'opacity-50'}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-space-md pb-space-sm">
      <DraftNotice draft={draft} />
      <TextField
        autoFocus={!task}
        accessibilityLabel={scope === 'week' ? t.task.newPriorityTitle : t.task.newLabel}
        placeholder={placeholder ?? (scope === 'week' ? t.week.priorityPlaceholder : t.task.newPlaceholder)}
        value={title}
        onChangeText={(v) => draft.set('title', v)}
        variant="headlineSm"
        multiline
        className="border-b-[1.5px] border-primary pb-2"
      />
      {chips}
      {scope === 'day' && dueTime ? (
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.event.remind}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {REMINDER_CHOICES.map((m) => (
              <ChoiceChip
                key={m}
                role="checkbox"
                label={m === 0 ? t.reminders.atDue : reminderText(m)}
                selected={reminders.includes(m)}
                onPress={() =>
                  setReminders(reminders.includes(m) ? reminders.filter((x) => x !== m) : [...reminders, m])
                }
              />
            ))}
          </View>
        </View>
      ) : null}
      {scope === 'day' ? (
        <View className="gap-1">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.task.listLabel}
          </Text>
          <TextField
            accessibilityLabel={t.task.listLabel}
            placeholder={t.task.listPlaceholder}
            value={listLabel}
            onChangeText={(v) => draft.set('listLabel', v)}
            className="h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
          />
        </View>
      ) : null}
      <View className="gap-1">
        <Text variant="labelMd" color="onSurfaceVariant">
          {t.task.notes}
        </Text>
        <TextField
          accessibilityLabel={t.task.notes}
          placeholder={t.event.notesPlaceholder}
          value={notes}
          onChangeText={(v) => draft.set('notes', v)}
          multiline
          className="min-h-[72px] rounded-xl border-[1.5px] border-outline-variant bg-surface px-3 py-2.5"
          style={{ textAlignVertical: 'top' }}
        />
      </View>
      <View className="flex-row gap-space-sm">
        <Button label={t.common.cancel} variant="outline" onPress={cancel} className="flex-1" />
        <Button
          label={t.common.save}
          onPress={save}
          disabled={!canSave}
          className={`flex-1 ${canSave ? '' : 'opacity-50'}`}
        />
      </View>
    </View>
  );
}
