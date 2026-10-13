import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import {
  archivedHabits,
  createRoutine,
  deleteRoutine,
  getRoutine,
  restoreHabit,
  routineReminds,
  updateRoutine,
} from '@/habits/store';
import { t } from '@/i18n';
import { clockText } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, ChoiceChip, Sheet, Switch, Text, TextField } from '@/ui';
import { pickTime } from '@/ui/pickers';

/** New or edited routine: name, optional time, reminder at that time; delete moves habits to Anytime. */
export function RoutineSheet({
  routineId,
  onClose,
  onCreated,
}: {
  routineId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  const [existing] = useState(() => (routineId ? getRoutine(db, routineId) : undefined));
  const [name, setName] = useState(existing?.name ?? '');
  const [time, setTime] = useState<string | null>(existing ? existing.time : '12:00');
  const [remind, setRemind] = useState(() => (routineId ? routineReminds(db, routineId) : true));
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (routineId) updateRoutine(db, routineId, { name, time, remind });
    else onCreated?.(createRoutine(db, { name, time, remind }));
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={routineId ? t.habits.routineEdit : t.habits.routineNew} closeButton>
      <View className="gap-space-md pb-space-sm">
        <View className="gap-1">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.habits.routineName}
          </Text>
          <TextField
            autoFocus={!routineId}
            accessibilityLabel={t.habits.routineName}
            placeholder={t.habits.routineNamePlaceholder}
            value={name}
            onChangeText={setName}
            className="h-12 rounded-xl border-[1.5px] border-primary bg-surface px-3"
          />
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.habits.routineTime}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <ChoiceChip
              role="radio"
              icon="schedule"
              label={time ? clockText(time, settings.timeFormat) : t.habits.addTime}
              selected={!!time}
              onPress={async () => {
                const picked = await pickTime(time ?? '12:00', settings.timeFormat === '24h');
                if (picked) setTime(picked);
              }}
            />
            <ChoiceChip role="radio" label={t.habits.routineNoTime} selected={!time} onPress={() => setTime(null)} />
          </View>
        </View>
        {time ? (
          <View className="min-h-touch flex-row items-center justify-between">
            <Text variant="bodyLg">{t.habits.routineRemind}</Text>
            <Switch value={remind} onChange={setRemind} label={t.habits.routineRemind} />
          </View>
        ) : null}
        <View className="flex-row gap-space-sm">
          {routineId ? (
            <Button
              label={t.common.delete}
              icon="delete"
              variant="danger"
              className="flex-1"
              onPress={() => {
                const undo = deleteRoutine(db, routineId);
                onClose();
                showToast(t.habits.routineDeleted, undo);
              }}
            />
          ) : (
            <Button label={t.common.cancel} variant="outline" className="flex-1" onPress={onClose} />
          )}
          <Button
            label={t.common.save}
            className={`flex-1 ${canSave ? '' : 'opacity-50'}`}
            disabled={!canSave}
            onPress={save}
          />
        </View>
        {routineId ? (
          <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            {t.habits.routineDeleteText}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** Archived habits, each with "Bring back" (HB-07). */
export function ArchivedSheet({ onClose }: { onClose: () => void }) {
  const showToast = useUi((s) => s.showToast);
  const archived = useLive(() => archivedHabits(db), []);
  return (
    <Sheet visible onClose={onClose} title={t.habits.archivedTitle} subtitle={t.habits.archivedText} closeButton>
      <View className="pb-space-sm">
        {archived.length === 0 ? (
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t.habits.noneArchived}
          </Text>
        ) : (
          archived.map((h, i) => (
            <View
              key={h.id}
              className={`min-h-[56px] flex-row items-center justify-between gap-2 ${i ? 'border-t border-surface-variant' : ''}`}>
              <View className="flex-1">
                <Text variant="bodyLg">{h.name}</Text>
                <Text variant="bodySm" color="onSurfaceVariant">
                  {h.frequency === 'daily' ? t.habits.everyDay : t.habits.onceAWeek}
                </Text>
              </View>
              <Button
                label={t.habits.bringBack}
                variant="tonal"
                size="md"
                align="center"
                onPress={() => {
                  restoreHabit(db, h.id);
                  showToast(t.habits.restored);
                }}
              />
            </View>
          ))
        )}
      </View>
    </Sheet>
  );
}
