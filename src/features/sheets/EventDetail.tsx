import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { dayKeyInZone } from '@/calendar/timezone';
import { phoneCalendar, type Answer } from '@/calendarSync/native';
import { answerInvite } from '@/calendarSync/sync';
import { usePhoneCalendars } from '@/calendarSync/usePhoneCalendars';
import { db } from '@/db/client';
import { useCategories, useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { fullDay, timeOf, timeRange } from '@/i18n/format';
import { createEvent, deleteEvent, deleteOccurrence, getEvent, type EventOccurrence } from '@/planner/events';
import { describeRepeat, fromRRule } from '@/recurrence';
import { reminderOffsets } from '@/reminders/store';
import { useUi } from '@/state/ui';
import { useTheme, type CategoryKey } from '@/theme';
import { Button, ChoiceChip, Icon, IconButton, Sheet, Text, UrgentBadge, type IconName } from '@/ui';

import { ScopeChooser } from './ScopeChooser';

function Row({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View className="flex-row gap-space-md">
      <Icon name={icon} />
      <View className="flex-1">{children}</View>
    </View>
  );
}

const ANSWERS: Answer[] = ['accepted', 'tentative', 'declined'];

/**
 * Event details (EV-04, TD-17): all fields, plus Delete (with Undo), Copy and Edit. An event from
 * the phone's calendar says which calendar, answers an invitation (GC-05) and opens in the
 * calendar app; one Daybloom may only read can't be changed or deleted here.
 */
export function EventDetail({ occurrence: o }: { occurrence: EventOccurrence }) {
  const { categoryColors } = useTheme();
  const { closeSheet, showToast } = useUi();
  const settings = useSettings();
  const categories = useCategories();
  const reminders = useLive(() => reminderOffsets(db, 'event', o.eventId), [o.eventId]);
  const [askingScope, setAskingScope] = useState(false);
  const calendar = usePhoneCalendars().find((c) => c.id === o.calendarId);
  // its id on the phone, to open it in the calendar app
  const onPhone = o.calendarId ? getEvent(db, o.eventId)?.externalId?.split('/')[1] : undefined;

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
        {o.calendarId ? (
          <Row icon="calendar_month">
            <View className="flex-row items-center gap-2">
              {calendar ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} /> : null}
              <Text variant="bodyLg" style={{ flexShrink: 1 }}>
                {t.calendars.from(calendar ? calendar.name || calendar.account : t.calendars.yourCalendar)}
              </Text>
            </View>
            {phoneCalendar && onPhone ? (
              <Button
                label={t.calendars.open}
                icon="open_in_new"
                variant="text"
                size="md"
                className="-ml-3"
                onPress={() => phoneCalendar?.open(onPhone, o.startAt, o.endAt)}
              />
            ) : null}
          </Row>
        ) : null}
        {/* an invitation: your answer goes back to the organizer through your calendar (GC-05) */}
        {o.invite && phoneCalendar ? (
          <Row icon="groups">
            <Text variant="bodyLg">{t.calendars.invite[o.invite] ?? t.calendars.invite.invited}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={t.calendars.going} className="mt-2 flex-row gap-2">
              {ANSWERS.map((a) => (
                <ChoiceChip
                  key={a}
                  label={t.calendars.answers[a]}
                  selected={o.invite === a}
                  onPress={() => {
                    if (phoneCalendar) void answerInvite(db, phoneCalendar, o.eventId, a).catch(() => undefined);
                  }}
                />
              ))}
            </View>
          </Row>
        ) : null}
        {o.readOnly ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.calendars.changeThere}
          </Text>
        ) : null}

        <View className="mt-space-sm flex-row gap-space-sm">
          {o.readOnly ? null : (
            <Button
              label={t.common.delete}
              icon="delete"
              variant="danger"
              className="flex-1"
              onPress={() => (o.seriesId ? setAskingScope(true) : remove('all'))}
            />
          )}
          <Button
            label={t.common.copy}
            icon="content_copy"
            variant="outline"
            className="flex-1"
            onPress={() => {
              // a copy of what you see, repeating from this occurrence if the original repeats; it
              // goes where new events go (the original's calendar may be someone else's)
              const id = createEvent(db, { ...o, calendarId: settings.saveToCalendar }, reminders);
              closeSheet();
              showToast(t.event.copied, () => {
                deleteEvent(db, id);
              });
            }}
          />
          {o.readOnly ? null : (
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
          )}
        </View>
      </View>
    </Sheet>
  );
}
