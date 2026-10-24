import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toDayKey } from '@/calendar/dates';
import { addDaysToKey, dayKeyInZone, fromWallTime, localTimeZone, parseDayKey } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useDraft } from '@/data/drafts';
import { useCategories, useSettings } from '@/data/hooks';
import { DraftNotice } from '@/features/DraftNotice';
import { t } from '@/i18n';
import { clockText, reminderText, shortDay } from '@/i18n/format';
import { DEFAULT_CATEGORY_ID } from '@/planner/categories';
import {
  createEvent,
  deleteOccurrence,
  updateEvent,
  updateOccurrence,
  type EditScope,
  type EventInput,
  type EventOccurrence,
} from '@/planner/events';
import {
  describeRepeat,
  fromRRule,
  shortDateWithYear,
  toRRule,
  weekdayName,
  type Repeat,
  type RepeatEnd,
  type Weekday,
} from '@/recurrence';
import { reminderOffsets } from '@/reminders/store';
import { useUi } from '@/state/ui';
import { fontFamilyFor, shadows, useTheme } from '@/theme';
import { Button, ChoiceChip, Icon, KeyboardScrollView, PickerPill, Sheet, Switch, Text, TextField } from '@/ui';
import { pickDay, pickTime } from '@/ui/pickers';

import { REMINDER_CHOICES } from '../sheets/TaskForm';
import { ScopeChooser } from '../sheets/ScopeChooser';

/** Times on the form are sans semibold (the design's text-headline-sm font-semibold). */
const timeFont = { fontFamily: fontFamilyFor('sans', '600') };

type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const weekdayOf = (day: string) => {
  const p = parseDayKey(day);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() as Weekday;
};
const localClock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function lengthText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t.time.minutes(m);
  return m === 0 ? t.time.hours(h) : `${t.time.hours(h)} ${t.time.minutes(m)}`;
}

/** What the form opens with. */
type Initial = { mode: 'new'; day: string; hour?: number } | { mode: 'edit'; occurrence: EventOccurrence };

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl bg-surface-container-lowest ${className}`} style={shadows.card}>
      {children}
    </View>
  );
}

/** Add / Edit Event (EV-01..07, FR-04..06; design/daybloom/event). Only the title is required. */
export function EventForm({ initial }: { initial: Initial }) {
  const { lookFor } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const categories = useCategories();
  const showToast = useUi((s) => s.showToast);
  const tf = settings.timeFormat;
  const editing = initial.mode === 'edit' ? initial.occurrence : null;

  // ---- starting values (EV-02, EV-07)
  // a new event keeps its words until saved (UX-05)
  const draft = useDraft(editing ? null : 'event', {
    title: editing?.title ?? '',
    location: editing?.location ?? '',
    notes: editing?.notes ?? '',
  });
  const { title, location, notes } = draft.values;
  const [categoryId, setCategoryId] = useState<string | null>(
    editing
      ? editing.categoryId
      : (categories.find((c) => c.id === DEFAULT_CATEGORY_ID)?.id ?? categories[0]?.id ?? null),
  );
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [day, setDay] = useState(() => {
    if (editing) {
      return editing.allDay ? dayKeyInZone(editing.startAt, editing.timeZone) : toDayKey(new Date(editing.startAt));
    }
    const preset = initial.mode === 'new' ? initial.day : toDayKey(new Date());
    // after 11 PM the next whole hour (midnight) is tomorrow's
    const lateToday =
      initial.mode === 'new' &&
      initial.hour === undefined &&
      preset === toDayKey(new Date()) &&
      new Date().getHours() === 23;
    return lateToday ? addDaysToKey(preset, 1) : preset;
  });
  const [start, setStart] = useState(() => {
    if (editing && !editing.allDay) return localClock(editing.startAt);
    if (initial.mode === 'new' && initial.hour !== undefined) return `${pad(initial.hour)}:00`;
    return `${pad((new Date().getHours() + 1) % 24)}:00`; // the next whole hour (EV-07)
  });
  // an hour long, but not past midnight (an 11 PM start ends at 11:59 PM)
  const [end, setEnd] = useState(() =>
    editing && !editing.allDay ? localClock(editing.endAt) : fromMinutes(Math.min(toMinutes(start) + 60, 23 * 60 + 59)),
  );
  // multi-day events keep how many days they span
  const spanDays = editing
    ? Math.max(
        0,
        Math.round(
          (parseDay(
            editing.allDay ? dayKeyInZone(editing.endAt - 1, editing.timeZone) : toDayKey(new Date(editing.endAt - 1)),
          ) -
            parseDay(day)) /
            86_400_000,
        ),
      )
    : 0;
  const [reminders, setReminders] = useState<number[]>(() =>
    editing
      ? reminderOffsets(db, 'event', editing.eventId)
      : settings.defaultReminder !== null
        ? [settings.defaultReminder]
        : [],
  );
  const [urgent, setUrgent] = useState(editing?.urgent ?? false);

  // only used to read an existing rule back (a new event has none)
  const timing = { startAt: editing?.startAt ?? 0, timeZone: editing?.timeZone ?? localTimeZone(), allDay };
  const existing = editing?.rrule ? fromRRule(editing.rrule, timing) : null;
  const [repeatKind, setRepeatKind] = useState<RepeatKind>(() => {
    if (!editing?.rrule) return 'none';
    if (!existing) return 'custom';
    if (existing.every !== 1) return 'custom';
    if (existing.freq === 'weekly')
      return existing.weekdays.length === 1 && existing.weekdays[0] === weekdayOf(day) ? 'weekly' : 'custom';
    return existing.freq;
  });
  const [customDays, setCustomDays] = useState<Weekday[]>(
    existing?.freq === 'weekly' ? existing.weekdays : [weekdayOf(day)],
  );
  const [stops, setStops] = useState<RepeatEnd>(existing?.end ?? { kind: 'never' });
  const [moreOpen, setMoreOpen] = useState((!!editing && !!editing.rrule) || !!location.trim() || !!notes.trim());
  const [asking, setAsking] = useState<'edit' | 'delete' | null>(null);

  const endOk = allDay || spanDays > 0 || toMinutes(end) > toMinutes(start);
  const canSave = title.trim().length > 0 && endOk;

  function parseDay(d: string) {
    const p = parseDayKey(d);
    return Date.UTC(p.year, p.month - 1, p.day);
  }

  function repeat(): Repeat | null {
    switch (repeatKind) {
      case 'none':
        return null;
      case 'weekly':
        return { freq: 'weekly', every: 1, weekdays: [weekdayOf(day)], end: stops };
      case 'custom':
        if (existing && existing.freq !== 'weekly') return { ...existing, end: stops };
        return {
          freq: 'weekly',
          every: existing?.every ?? 1,
          weekdays: customDays.length ? customDays : [weekdayOf(day)],
          end: stops,
        };
      default:
        return { freq: repeatKind, every: 1, end: stops };
    }
  }

  function buildInput(): EventInput {
    const timeZone = editing?.timeZone ?? localTimeZone();
    const r = repeat();
    // A custom weekly repeat starts on its first chosen weekday on or after the date picked.
    let first = day;
    if (r?.freq === 'weekly') while (!r.weekdays.includes(weekdayOf(first))) first = addDaysToKey(first, 1);
    const p = parseDayKey(first);
    const lastDay = parseDayKey(addDaysToKey(first, spanDays));
    let startAt: number;
    let endAt: number;
    if (allDay) {
      startAt = fromWallTime({ ...p, hour: 0, minute: 0, second: 0 }, timeZone);
      const after = parseDayKey(addDaysToKey(first, spanDays + 1));
      endAt = fromWallTime({ ...after, hour: 0, minute: 0, second: 0 }, timeZone);
    } else {
      startAt = new Date(p.year, p.month - 1, p.day, Number(start.slice(0, 2)), Number(start.slice(3))).getTime();
      endAt = new Date(
        lastDay.year,
        lastDay.month - 1,
        lastDay.day,
        Number(end.slice(0, 2)),
        Number(end.slice(3)),
      ).getTime();
    }
    return {
      title,
      categoryId,
      urgent,
      allDay,
      startAt,
      endAt,
      timeZone,
      location,
      notes,
      rrule: r ? toRRule(r, { startAt, timeZone, allDay }) : null,
    };
  }

  const remind = reminders;
  const save = (scope?: EditScope) => {
    if (!canSave) return;
    const input = buildInput();
    if (!editing) createEvent(db, input, remind);
    else if (editing.seriesId) {
      if (!scope) return setAsking('edit');
      updateOccurrence(db, editing, input, scope, remind);
    } else updateEvent(db, editing.eventId, input, remind);
    draft.clear();
    router.back();
  };

  const remove = (scope: EditScope) => {
    if (!editing) return;
    const undo = deleteOccurrence(db, editing, scope);
    router.back();
    showToast(t.event.deleted, undo);
  };

  const chooseStart = async () => {
    const next = await pickTime(start, tf === '24h');
    if (!next) return;
    // the end keeps the same length (EV-01)
    const length = toMinutes(end) - toMinutes(start);
    setStart(next);
    if (spanDays === 0) setEnd(fromMinutes(Math.min(toMinutes(next) + Math.max(length, 15), 23 * 60 + 59)));
  };
  const chooseEnd = async () => {
    const next = await pickTime(end, tf === '24h');
    if (next) setEnd(next);
  };
  const chooseDay = async () => {
    const next = await pickDay(day);
    if (next) setDay(next);
  };

  const presets: { kind: RepeatKind; label: string }[] = [
    { kind: 'none', label: t.repeat.none },
    { kind: 'daily', label: describeRepeat({ freq: 'daily', every: 1, end: stops }, day) },
    {
      kind: 'weekly',
      label: describeRepeat({ freq: 'weekly', every: 1, weekdays: [weekdayOf(day)], end: stops }, day),
    },
    { kind: 'monthly', label: describeRepeat({ freq: 'monthly', every: 1, end: stops }, day) },
    { kind: 'yearly', label: describeRepeat({ freq: 'yearly', every: 1, end: stops }, day) },
    { kind: 'custom', label: t.repeat.custom },
  ];
  const repeatSummary = repeatKind === 'none' ? null : describeRepeat(repeat(), day, settings.weekStart);
  const moreSummary =
    [repeatSummary, location.trim() || null, notes.trim() ? t.event.notes : null].filter(Boolean).join(' · ') ||
    t.event.moreSummary;
  const weekOrder = Array.from({ length: 7 }, (_, i) => ((settings.weekStart + i) % 7) as Weekday);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Top bar: Cancel and Save always visible (EV-03) */}
      <View className="h-16 flex-row items-center justify-between border-b border-surface-variant px-1">
        <Button
          label={t.common.cancel}
          variant="text"
          align="center"
          onPress={() => {
            draft.clear();
            router.back();
          }}
        />
        <Text variant="headlineSm" accessibilityRole="header">
          {editing ? t.event.editTitle : t.event.newTitle}
        </Text>
        <Button
          label={t.common.save}
          size="md"
          align="center"
          className={`mr-3 ${canSave ? '' : 'opacity-50'}`}
          disabled={!canSave}
          onPress={() => save()}
        />
      </View>

      <KeyboardScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-space-md px-margin pt-space-md"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
        <DraftNotice draft={draft} />
        <View>
          <TextField
            autoFocus={!editing}
            accessibilityLabel={t.event.titleLabel}
            placeholder={t.event.titlePlaceholder}
            value={title}
            onChangeText={(v) => draft.set('title', v.replace(/\n/g, ' '))}
            variant="headlineLg"
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            className="border-b-[1.5px] border-primary pb-2"
          />
          {editing ? null : (
            <Text variant="bodySm" color="onSurfaceVariant" style={{ marginTop: 6 }}>
              {t.event.titleHint}
            </Text>
          )}
        </View>

        {/* Category (FR-06) */}
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.event.category}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {categories.map((c) => {
              const look = lookFor(c.colorKey);
              return (
                <ChoiceChip
                  key={c.id}
                  label={c.name}
                  dot={look.dot}
                  selected={categoryId === c.id}
                  selectedClass={look.chipOn}
                  onPress={() => setCategoryId(c.id)}
                />
              );
            })}
          </View>
        </View>

        {/* When (EV-01, EV-02) */}
        <Section>
          <View className="min-h-[56px] flex-row items-center justify-between px-space-md">
            <View className="flex-row items-center gap-3">
              <Icon name="wb_sunny" />
              <Text variant="bodyLg">{t.common.allDay}</Text>
            </View>
            <Switch value={allDay} onChange={setAllDay} label={t.common.allDay} />
          </View>
          <View className="mx-space-md border-t border-surface-variant" />
          <View className="min-h-[56px] flex-row items-center justify-between px-space-md">
            <View className="flex-row items-center gap-3">
              <Icon name="calendar_today" />
              <Text variant="bodyLg">{t.event.date}</Text>
            </View>
            <PickerPill label={t.event.date} value={shortDay(day)} onPress={chooseDay} />
          </View>
          {allDay ? null : (
            <View className="flex-row gap-space-sm px-space-md pb-space-md">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.event.starts}, ${clockText(start, tf)}`}
                onPress={chooseStart}
                className="min-h-touch flex-1 gap-1 rounded-xl bg-surface-container-low p-3 active:opacity-80">
                <Text variant="labelMd" color="onSurfaceVariant">
                  {t.event.starts}
                </Text>
                <Text variant="headlineSm" style={timeFont}>
                  {clockText(start, tf)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.event.ends}, ${clockText(end, tf)}`}
                onPress={chooseEnd}
                className={`min-h-touch flex-1 gap-1 rounded-xl p-3 active:opacity-80 ${endOk ? 'bg-surface-container-low' : 'border-[1.5px] border-secondary bg-secondary-fixed/40'}`}>
                <Text variant="labelMd" color={endOk ? 'onSurfaceVariant' : 'secondary'}>
                  {endOk && spanDays === 0
                    ? t.event.endsAfter(lengthText(toMinutes(end) - toMinutes(start)))
                    : endOk
                      ? t.event.ends
                      : t.event.endBeforeStart}
                </Text>
                <Text variant="headlineSm" style={timeFont}>
                  {clockText(end, tf)}
                </Text>
              </Pressable>
            </View>
          )}
        </Section>

        {/* Reminders (FR-04): several allowed; the usual one comes from Settings */}
        <Section className="p-space-md">
          <View className="mb-space-sm flex-row items-center gap-3">
            <Icon name="notifications" />
            <Text variant="bodyLg">{t.event.remind}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {REMINDER_CHOICES.map((m) => (
              <ChoiceChip
                key={m}
                role="checkbox"
                label={reminderText(m)}
                selected={reminders.includes(m)}
                onPress={() =>
                  setReminders(reminders.includes(m) ? reminders.filter((x) => x !== m) : [...reminders, m])
                }
              />
            ))}
          </View>
        </Section>

        {/* Urgent (FR-06) */}
        <Section className="min-h-[72px] flex-row items-center justify-between gap-3 px-space-md">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary-fixed">
              <Icon name="priority_high" color="secondary" />
            </View>
            <View className="flex-1">
              <Text variant="bodyLg">{t.event.urgent}</Text>
              <Text variant="bodySm" color="onSurfaceVariant">
                {t.event.urgentText}
              </Text>
            </View>
          </View>
          <Switch value={urgent} onChange={setUrgent} label={t.event.urgent} tone="secondary" />
        </Section>

        {/* More options: repeat, place, notes (EV-03, EV-05) */}
        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: moreOpen }}
            onPress={() => setMoreOpen(!moreOpen)}
            className="min-h-[64px] flex-row items-center justify-between px-space-md">
            <View className="flex-1">
              <Text variant="bodyLg">{t.event.more}</Text>
              <Text variant="bodySm" color="onSurfaceVariant">
                {moreSummary}
              </Text>
            </View>
            <Icon name={moreOpen ? 'expand_less' : 'expand_more'} />
          </Pressable>
          {moreOpen ? (
            <View className="gap-space-md px-space-md pb-space-md">
              <View className="border-t border-surface-variant" />
              <View className="gap-space-sm">
                <View className="flex-row items-center gap-3">
                  <Icon name="repeat" />
                  <Text variant="bodyLg">{t.event.repeat}</Text>
                </View>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {presets.map((p) => (
                    <ChoiceChip
                      key={p.kind}
                      label={p.label}
                      selected={repeatKind === p.kind}
                      onPress={() => setRepeatKind(p.kind)}
                    />
                  ))}
                </View>
                {repeatKind === 'custom' && (!existing || existing.freq === 'weekly') ? (
                  <View className="gap-2">
                    <Text variant="labelMd" color="onSurfaceVariant">
                      {t.event.repeatOn}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {weekOrder.map((d) => {
                        const on = customDays.includes(d);
                        return (
                          <Pressable
                            key={d}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={weekdayName(d)}
                            onPress={() => setCustomDays(on ? customDays.filter((x) => x !== d) : [...customDays, d])}
                            className={`h-11 w-11 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                            <Text variant="labelLg" color={on ? 'onPrimary' : 'onSurface'}>
                              {weekdayName(d).slice(0, 2)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {repeatKind === 'custom' && existing && existing.freq !== 'weekly' ? (
                  <Text variant="bodyMd" color="onSurfaceVariant">
                    {describeRepeat(existing, day, settings.weekStart)}
                  </Text>
                ) : null}
                {repeatKind !== 'none' ? (
                  <View className="gap-2 rounded-xl bg-surface-container-low p-3">
                    <Text variant="bodyMd" color="onSurfaceVariant">
                      {t.event.stops}
                    </Text>
                    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                      <ChoiceChip
                        label={t.repeat.stopsNever}
                        selected={stops.kind === 'never'}
                        onPress={() => setStops({ kind: 'never' })}
                      />
                      <ChoiceChip
                        label={
                          stops.kind === 'on' ? t.repeat.stopsOn(shortDateWithYear(stops.day)) : t.event.stopsOnDate
                        }
                        selected={stops.kind === 'on'}
                        onPress={async () => {
                          const picked = await pickDay(stops.kind === 'on' ? stops.day : addDaysToKey(day, 30));
                          if (picked) setStops({ kind: 'on', day: picked < day ? day : picked });
                        }}
                      />
                      <ChoiceChip
                        label={stops.kind === 'after' ? t.repeat.stopsAfter(stops.times) : t.event.stopsAfterTimes}
                        selected={stops.kind === 'after'}
                        onPress={() => setStops({ kind: 'after', times: stops.kind === 'after' ? stops.times : 10 })}
                      />
                    </View>
                    {stops.kind === 'after' ? (
                      <View className="flex-row items-center gap-2">
                        <Text variant="bodyMd" color="onSurfaceVariant">
                          {t.event.timesLabel}
                        </Text>
                        <TextField
                          accessibilityLabel={t.event.timesLabel}
                          keyboardType="number-pad"
                          value={String(stops.times)}
                          onChangeText={(v) =>
                            setStops({
                              kind: 'after',
                              times: Math.max(1, Math.min(999, Number(v.replace(/\D/g, '')) || 1)),
                            })
                          }
                          className="h-12 w-20 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <View className="gap-space-sm">
                <View className="flex-row items-center gap-3">
                  <Icon name="location_on" />
                  <Text variant="bodyLg">{t.event.place}</Text>
                </View>
                <TextField
                  accessibilityLabel={t.event.place}
                  placeholder={t.event.placePlaceholder}
                  value={location}
                  onChangeText={(v) => draft.set('location', v)}
                  className="h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
                />
              </View>
              <View className="gap-space-sm">
                <View className="flex-row items-center gap-3">
                  <Icon name="notes" />
                  <Text variant="bodyLg">{t.event.notes}</Text>
                </View>
                <TextField
                  accessibilityLabel={t.event.notes}
                  placeholder={t.event.notesPlaceholder}
                  value={notes}
                  onChangeText={(v) => draft.set('notes', v)}
                  multiline
                  className="min-h-[88px] rounded-xl border-[1.5px] border-outline-variant bg-surface px-3 py-2.5"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </View>
          ) : null}
        </Section>

        {editing ? (
          <Button
            label={t.event.deleteEvent}
            icon="delete"
            variant="danger"
            fullWidth
            onPress={() => (editing.seriesId ? setAsking('delete') : remove('all'))}
          />
        ) : null}
      </KeyboardScrollView>

      {editing && asking ? (
        <Sheet visible onClose={() => setAsking(null)} title={t.scope.titleEdit}>
          <ScopeChooser
            occurrence={editing}
            action={asking}
            onCancel={() => setAsking(null)}
            onChoose={(scope) => {
              setAsking(null);
              if (asking === 'edit') save(scope);
              else remove(scope);
            }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}
