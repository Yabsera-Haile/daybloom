import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  listHabits,
  listRoutines,
  updateHabit,
  type Frequency,
  type Habit,
} from '@/habits/store';
import { t } from '@/i18n';
import { clockText } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { shadows } from '@/theme';
import { Button, ChoiceChip, Icon, PickerPill, Sheet, Text, TextField } from '@/ui';
import { pickTime } from '@/ui/pickers';

import { routineIconName, routineLook } from './shared';
import { RoutineSheet } from './Sheets';

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl bg-surface-container-lowest ${className}`} style={shadows.card}>
      {children}
    </View>
  );
}

function Radio({
  on,
  onPress,
  icon,
  iconColor,
  title,
  detail,
}: {
  on: boolean;
  onPress: () => void;
  icon: Parameters<typeof Icon>[0]['name'];
  iconColor: Parameters<typeof Icon>[0]['color'];
  title: string;
  detail: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${title}, ${detail}`}
      onPress={onPress}
      className={`min-h-touch flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3 ${on ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'}`}>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline'}`}>
        {on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
      </View>
      <Icon name={icon} color={iconColor} />
      <View className="flex-1">
        <Text variant="bodyLg">{title}</Text>
        <Text variant="bodySm" color="onSurfaceVariant">
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

/** New or edited habit (HB-07; design/daybloom/habit). Only the name is required. */
export function HabitForm({
  habit,
  presetName,
  presetRoutine,
}: {
  habit?: Habit;
  presetName?: string;
  presetRoutine?: string;
}) {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  const routines = useLive(() => listRoutines(db), []);
  const all = useLive(() => listHabits(db), []);
  const tf = settings.timeFormat;

  const [name, setName] = useState(habit?.name ?? presetName ?? '');
  const [frequency, setFrequency] = useState<Frequency>((habit?.frequency as Frequency) ?? 'daily');
  const [routineId, setRoutineId] = useState<string | null>(habit ? habit.routineId : (presetRoutine ?? null));
  const [reminderTime, setReminderTime] = useState<string | null>(habit?.reminderTime ?? null);
  const [note, setNote] = useState(habit?.note ?? '');
  const [newRoutine, setNewRoutine] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const canSave = name.trim().length > 0;
  const routine = routines.find((r) => r.id === routineId) ?? null;

  const save = () => {
    if (!canSave) return;
    const input = { name, note, frequency, routineId: routine?.id ?? null, reminderTime };
    if (habit) updateHabit(db, habit.id, input);
    else createHabit(db, input);
    router.back();
  };

  const chooseTime = async () => {
    const picked = await pickTime(reminderTime ?? '18:00', tf === '24h');
    if (picked) setReminderTime(picked);
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center justify-between border-b border-surface-variant px-1">
        <Button label={t.common.cancel} variant="text" align="center" onPress={() => router.back()} />
        <Text variant="headlineSm" accessibilityRole="header">
          {habit ? t.habits.editTitle : t.habits.newTitle}
        </Text>
        <Button
          label={t.common.save}
          size="md"
          align="center"
          className={`mr-3 ${canSave ? '' : 'opacity-50'}`}
          disabled={!canSave}
          onPress={save}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-space-md px-margin pt-space-md"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
        <View>
          <TextField
            autoFocus={!habit && !presetName}
            accessibilityLabel={t.habits.nameLabel}
            placeholder={t.habits.namePlaceholder}
            value={name}
            onChangeText={setName}
            variant="headlineLg"
            className="border-b-[1.5px] border-primary pb-2"
          />
          {habit ? null : (
            <View className="mt-space-sm gap-2">
              <Text variant="bodySm" color="onSurfaceVariant">
                {t.habits.ideaHint}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {t.habits.ideas.map((idea) => (
                  <ChoiceChip
                    key={idea}
                    role="button"
                    label={idea}
                    selected={name === idea}
                    onPress={() => setName(idea)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* How often */}
        <Section className="p-space-md">
          <View className="mb-space-sm flex-row items-center gap-3">
            <Icon name="repeat" />
            <Text variant="bodyLg">{t.habits.howOften}</Text>
          </View>
          <View accessibilityRole="radiogroup" className="flex-row rounded-full bg-surface-container p-1">
            {(['daily', 'weekly'] as const).map((f) => (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ checked: frequency === f }}
                onPress={() => setFrequency(f)}
                className={`h-11 flex-1 items-center justify-center rounded-full ${frequency === f ? 'bg-primary' : ''}`}>
                <Text variant="labelLg" color={frequency === f ? 'onPrimary' : 'onSurfaceVariant'}>
                  {f === 'daily' ? t.habits.everyDay : t.habits.onceAWeek}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* When: part of a routine (D1) */}
        <Section className="p-space-md">
          <View className="mb-space-sm flex-row items-center gap-3">
            <Icon name="schedule" />
            <Text variant="bodyLg">{t.habits.when}</Text>
          </View>
          <View accessibilityRole="radiogroup" className="gap-space-sm">
            {routines.map((r) => (
              <Radio
                key={r.id}
                on={routineId === r.id}
                onPress={() => setRoutineId(r.id)}
                icon={routineIconName(r)}
                iconColor={routineLook(r).text}
                title={r.name}
                detail={t.habits.routineDetail(
                  r.time ? clockText(r.time, tf) : null,
                  all.filter((h) => h.routineId === r.id && h.id !== habit?.id).length,
                )}
              />
            ))}
            <Radio
              on={!routine}
              onPress={() => setRoutineId(null)}
              icon="all_inclusive"
              iconColor="onSurfaceVariant"
              title={t.habits.anytime}
              detail={t.habits.noSetTime}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setNewRoutine(true)}
              className="min-h-touch flex-row items-center gap-1.5">
              <Icon name="add" size={20} color="primary" />
              <Text variant="labelLg" color="primary">
                {t.habits.newRoutine}
              </Text>
            </Pressable>
          </View>
        </Section>

        {/* Reminder: routine habits share the routine's */}
        <Section className="min-h-[72px] flex-row items-center justify-between gap-3 px-space-md">
          <View className="flex-1 flex-row items-center gap-3">
            <Icon name="notifications" />
            <View className="flex-1">
              <Text variant="bodyLg">{t.habits.remind}</Text>
              <Text variant="bodySm" color="onSurfaceVariant">
                {routine
                  ? routine.time
                    ? t.habits.remindWithRoutine(routine.name, clockText(routine.time, tf))
                    : t.habits.remindRoutineNoTime(routine.name)
                  : reminderTime
                    ? t.habits.remindOwn
                    : t.habits.noReminder}
              </Text>
            </View>
          </View>
          {routine ? null : (
            <View className="flex-row items-center">
              <PickerPill
                label={t.habits.remind}
                value={reminderTime ? clockText(reminderTime, tf) : t.habits.addTime}
                onPress={chooseTime}
              />
              {reminderTime ? (
                <Button
                  label={t.habits.removeTime}
                  variant="text"
                  size="md"
                  align="center"
                  onPress={() => setReminderTime(null)}
                />
              ) : null}
            </View>
          )}
        </Section>

        {/* Note */}
        <Section className="p-space-md">
          <View className="mb-space-sm flex-row items-center gap-3">
            <Icon name="notes" />
            <Text variant="bodyLg">
              {t.habits.note}{' '}
              <Text variant="bodySm" color="onSurfaceVariant">
                {t.habits.optional}
              </Text>
            </Text>
          </View>
          <TextField
            accessibilityLabel={t.habits.note}
            placeholder={t.habits.notePlaceholder}
            value={note}
            onChangeText={setNote}
            className="h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
          />
        </Section>

        {habit ? (
          <View className="gap-space-sm">
            <Button
              label={t.habits.archive}
              icon="inventory_2"
              variant="outline"
              fullWidth
              onPress={() => {
                const undo = archiveHabit(db, habit.id);
                router.back();
                showToast(t.habits.archivedToast, undo);
              }}
            />
            <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.habits.archiveText}
            </Text>
            <Button
              label={t.habits.delete}
              icon="delete"
              variant="danger"
              fullWidth
              onPress={() => setAskDelete(true)}
            />
          </View>
        ) : null}
      </ScrollView>

      {newRoutine ? <RoutineSheet onClose={() => setNewRoutine(false)} onCreated={(id) => setRoutineId(id)} /> : null}
      {habit && askDelete ? (
        <Sheet visible onClose={() => setAskDelete(false)} title={t.habits.deleteAsk(habit.name)}>
          <View className="gap-space-md pb-space-sm">
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t.habits.deleteText}
            </Text>
            <View className="flex-row gap-space-sm">
              <Button label={t.habits.keep} variant="outline" className="flex-1" onPress={() => setAskDelete(false)} />
              <Button
                label={t.habits.deleteYes}
                icon="delete"
                className="flex-1"
                onPress={() => {
                  setAskDelete(false);
                  deleteHabit(db, habit.id);
                  router.back();
                }}
              />
            </View>
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
