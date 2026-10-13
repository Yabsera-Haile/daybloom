import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { dayKeyInZone } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useCategories, useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { fullDay, timeOf, timeRange } from '@/i18n/format';
import { createEvent, deleteEvent, deleteOccurrence, type EventOccurrence } from '@/planner/events';
import { describeRepeat, fromRRule } from '@/recurrence';
import { reminderOffsets } from '@/reminders/store';
import { useUi } from '@/state/ui';
import { categoryColors, type CategoryKey } from '@/theme';
import { Button, Icon, IconButton, Sheet, Text, UrgentBadge, type IconName } from '@/ui';

import { ScopeChooser } from './ScopeChooser';

function Row({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View className="flex-row gap-space-md">
      <Icon name={icon} />
      <View className="flex-1">{children}</View>
    </View>
  );
}

/** Event details (EV-04, TD-17): all fields, plus Delete (with Undo), Copy and Edit. */
export function EventDetail({ occurrence: o }: { occurrence: EventOccurrence }) {
  const { closeSheet, showToast } = useUi();
  const settings = useSettings();
  const categories = useCategories();
  const reminders = useLive(() => reminderOffsets(db, 'event', o.eventId), [o.eventId]);
  const [askingScope, setAskingScope] = useState(false);

  const category = categories.find((c) => c.id === o.categoryId);
  const colors = categoryColors[(category?.colorKey ?? 'personal') as CategoryKey] ?? categoryColors.personal;
  const startDay = o.allDay ? dayKeyInZone(o.startAt, o.timeZone) : toDayKey(new Date(o.startAt));
  const endDay = o.allDay
    ? dayKeyInZone(o.endAt - 1, o.timeZone)
    : toDayKey(new Date(Math.max(o.startAt, o.endAt - 1)));
  const repeat = o.rrule ? fromRRule(o.rrule, { startAt: o.startAt, timeZone: o.timeZone, allDay: o.allDay }) : null;

  const remove = (scope: 'this' | 'following' | 'all') => {
    const undo = deleteOccurrence(db, o, scope);
    closeSheet();
    showToast(t.event.deleted, undo);
  };

  if (askingScope) {
    return (
      <Sheet visible onClose={closeSheet} title={t.scope.titleEdit}>
        <ScopeChooser occurrence={o} action="delete" onCancel={() => setAskingScope(false)} onChoose={remove} />
      </Sheet>
    );
  }

  return (
    <Sheet visible onClose={closeSheet}>
      <View className="gap-space-md pb-space-sm">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 gap-space-sm">
            <View className="flex-row flex-wrap items-center gap-2">
              {category ? (
                <View
                  className="flex-row items-center gap-1 self-start rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: colors.container }}>
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.accent }} />
                  <Text variant="labelSm" style={{ color: colors.onContainer }}>
                    {category.name}
                  </Text>
                </View>
              ) : null}
              {o.urgent ? <UrgentBadge /> : null}
            </View>
            <Text variant="headlineLg" accessibilityRole="header">
              {o.title}
            </Text>
          </View>
          <IconButton
            icon="close"
            tone="tonal"
            iconColor="onSurface"
            accessibilityLabel={t.common.close}
            onPress={closeSheet}
          />
        </View>

        <Row icon="schedule">
          {startDay === endDay ? (
            <>
              <Text variant="bodyLg">{fullDay(startDay)}</Text>
              <Text variant="bodyLg" color="onSurfaceVariant">
                {o.allDay ? t.common.allDay : timeRange(o.startAt, o.endAt, settings.timeFormat)}
              </Text>
            </>
          ) : (
            <>
              <Text variant="bodyLg">
                {fullDay(startDay)}
                {o.allDay ? '' : `, ${timeOf(o.startAt, settings.timeFormat)}`}
              </Text>
              <Text variant="bodyLg">
                – {fullDay(endDay)}
                {o.allDay ? '' : `, ${timeOf(o.endAt, settings.timeFormat)}`}
              </Text>
            </>
          )}
        </Row>
        {o.rrule ? (
          <Row icon="repeat">
            <Text variant="bodyLg">{describeRepeat(repeat, startDay, settings.weekStart)}</Text>
          </Row>
        ) : null}
        {o.location ? (
          <Row icon="location_on">
            <Text variant="bodyLg" selectable>
              {o.location}
            </Text>
          </Row>
        ) : null}
        <Row icon="notifications">
          <Text variant="bodyLg">
            {reminders.length ? reminders.map((m) => t.reminders.detail(m)).join(', ') : t.event.noReminder}
          </Text>
        </Row>
        {o.notes ? (
          <Row icon="notes">
            <Text variant="bodyLg" color="onSurfaceVariant" selectable>
              {o.notes}
            </Text>
          </Row>
        ) : null}

        <View className="mt-space-sm flex-row gap-space-sm">
          <Button
            label={t.common.delete}
            icon="delete"
            variant="danger"
            className="flex-1"
            onPress={() => (o.seriesId ? setAskingScope(true) : remove('all'))}
          />
          <Button
            label={t.common.copy}
            icon="content_copy"
            variant="outline"
            className="flex-1"
            onPress={() => {
              // a copy of what you see, repeating from this occurrence if the original repeats
              const id = createEvent(db, o, reminders);
              closeSheet();
              showToast(t.event.copied, () => {
                deleteEvent(db, id);
              });
            }}
          />
          <Button
            label={t.common.edit}
            icon="edit"
            className="flex-1"
            onPress={() => {
              closeSheet();
              router.push({
                pathname: '/event/edit',
                params: {
                  id: o.eventId,
                  series: o.seriesId ?? '',
                  slot: o.originalStartAt === null ? '' : String(o.originalStartAt),
                },
              });
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
