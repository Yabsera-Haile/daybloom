import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { phoneCalendar, requestCalendars, type PhoneCalendar } from '@/calendarSync/native';
import { eventsMadeHere, forgetPhoneEvents, moveToCalendar } from '@/calendarSync/sync';
import { usePhoneCalendars } from '@/calendarSync/usePhoneCalendars';
import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { saveSetting } from '@/settings';
import { useUi } from '@/state/ui';
import { Button, ChoiceSheet, Icon, Row, RowGroup, Sheet, Text } from '@/ui';

/** The calendar new events go to: your Google one if there is, otherwise any you may add to. */
export function defaultTarget(calendars: PhoneCalendar[]): PhoneCalendar | undefined {
  const writable = calendars.filter((c) => c.writable);
  return (
    writable.find((c) => c.primary && c.accountType === 'com.google') ??
    writable.find((c) => c.primary) ??
    writable.find((c) => c.accountType === 'com.google') ??
    writable[0]
  );
}

/** A calendar's name, and its account when that says something more. */
const nameOf = (c: PhoneCalendar) => c.name || c.account;
const detailOf = (c: PhoneCalendar) =>
  [c.account !== c.name ? c.account : null, c.writable ? null : t.calendars.seeOnly].filter(Boolean).join(' · ');

/** A calendar's colour as a small dot. */
function Dot({ color }: { color: string }) {
  return <View className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />;
}

/**
 * Settings › Your calendars (GC-01, GC-04, GC-06): show the phone's calendars, pick which, where
 * new events go, copy Daybloom's events there once, or stop showing them. Android only.
 */
export function CalendarSettings() {
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  const listed = usePhoneCalendars();
  const [fresh, setFresh] = useState<PhoneCalendar[] | null>(null);
  const phone = fresh ?? listed;
  const [sheet, setSheet] = useState<'shown' | 'saveTo' | 'copy' | 'stop' | null>(null);
  const madeHere = useLive(() => eventsMadeHere(db), []);
  const connected = settings.phoneCalendars.length > 0;

  const store = phoneCalendar;
  if (!store) return null;

  const shown = phone.filter((c) => settings.phoneCalendars.includes(c.id));
  const target = phone.find((c) => c.id === settings.saveToCalendar);

  const connect = async () => {
    const answer = await requestCalendars();
    if (answer === 'blocked') {
      showToast(t.calendars.blocked);
      void Linking.openSettings();
      return;
    }
    if (answer !== 'granted') return;
    const all = await store.calendars();
    if (all.length === 0) {
      showToast(t.calendars.none);
      return;
    }
    const visible = all.filter((c) => c.visible);
    saveSetting(
      db,
      'phoneCalendars',
      (visible.length ? visible : all).map((c) => c.id),
    );
    saveSetting(db, 'saveToCalendar', defaultTarget(visible.length ? visible : all)?.id ?? null);
    setFresh(all);
  };

  const toggle = (c: PhoneCalendar, on: boolean) => {
    const ids = on ? [...settings.phoneCalendars, c.id] : settings.phoneCalendars.filter((id) => id !== c.id);
    if (ids.length === 0) return; // at least one; "Stop showing them" turns them all off
    saveSetting(db, 'phoneCalendars', ids);
    // new events can only go to a calendar that's shown
    if (!on && settings.saveToCalendar === c.id) {
      saveSetting(db, 'saveToCalendar', defaultTarget(phone.filter((x) => ids.includes(x.id)))?.id ?? null);
    }
  };

  if (!connected) {
    return (
      <RowGroup heading={t.calendars.section}>
        <Row
          first
          icon="calendar_month"
          title={t.calendars.connect}
          subtitle={t.calendars.connectText}
          onPress={() => void connect()}
        />
      </RowGroup>
    );
  }

  return (
    <RowGroup heading={t.calendars.section}>
      <Row
        first
        icon="calendar_month"
        title={t.calendars.shown}
        value={t.calendars.shownCount(settings.phoneCalendars.length)}
        onPress={() => setSheet('shown')}
      />
      <Row
        icon="event_upcoming"
        title={t.calendars.saveTo}
        value={target ? nameOf(target) : t.calendars.daybloomOnly}
        onPress={() => setSheet('saveTo')}
      />
      {target && madeHere > 0 ? (
        <Row
          icon="content_copy"
          title={t.calendars.copy(nameOf(target))}
          subtitle={t.calendars.copyCount(madeHere)}
          onPress={() => setSheet('copy')}
        />
      ) : null}
      <Row icon="close" title={t.calendars.stop} subtitle={t.calendars.stopText} onPress={() => setSheet('stop')} />

      {sheet === 'shown' ? (
        <Sheet
          visible
          onClose={() => setSheet(null)}
          title={t.calendars.shown}
          subtitle={t.calendars.shownText}
          closeButton>
          <View className="pb-space-sm">
            {phone.map((c) => {
              const on = settings.phoneCalendars.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c, !on)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={[nameOf(c), detailOf(c)].filter(Boolean).join(', ')}
                  className="min-h-[56px] flex-row items-center gap-1 active:opacity-70">
                  <View className="h-12 w-12 items-center justify-center">
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md ${on ? 'bg-primary' : 'border-[1.5px] border-outline bg-surface-container-lowest'}`}>
                      {on ? <Icon name="check" size={18} color="onPrimary" /> : null}
                    </View>
                  </View>
                  <Dot color={c.color} />
                  <View className="ml-2 flex-1 py-2">
                    <Text variant="bodyLg">{nameOf(c)}</Text>
                    {detailOf(c) ? (
                      <Text variant="bodySm" color="onSurfaceVariant">
                        {detailOf(c)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Sheet>
      ) : null}

      {sheet === 'saveTo' ? (
        <ChoiceSheet<string | null>
          title={t.calendars.saveTo}
          value={settings.saveToCalendar}
          options={[
            ...shown
              .filter((c) => c.writable)
              .map((c) => ({ value: c.id, label: nameOf(c), detail: detailOf(c) || undefined })),
            { value: null, label: t.calendars.daybloomOnly, detail: t.calendars.daybloomOnlyText },
          ]}
          onChoose={(v) => saveSetting(db, 'saveToCalendar', v)}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'copy' && target ? (
        <Sheet visible onClose={() => setSheet(null)} title={t.calendars.copyTitle}>
          <View className="gap-space-md pb-space-sm">
            <Text variant="bodyLg" color="onSurfaceVariant">
              {t.calendars.copyText(nameOf(target))}
            </Text>
            <View className="flex-row justify-end gap-space-sm">
              <Button label={t.common.cancel} variant="text" onPress={() => setSheet(null)} />
              <Button
                label={t.calendars.copyGo}
                icon="content_copy"
                onPress={() => {
                  showToast(t.calendars.copying(moveToCalendar(db, target.id)));
                  setSheet(null);
                }}
              />
            </View>
          </View>
        </Sheet>
      ) : null}

      {sheet === 'stop' ? (
        <Sheet visible onClose={() => setSheet(null)} title={t.calendars.stopTitle}>
          <View className="gap-space-md pb-space-sm">
            <Text variant="bodyLg" color="onSurfaceVariant">
              {t.calendars.stopBody}
            </Text>
            <View className="flex-row justify-end gap-space-sm">
              <Button label={t.common.cancel} variant="text" onPress={() => setSheet(null)} />
              <Button
                label={t.calendars.stopGo}
                variant="outline"
                onPress={() => {
                  saveSetting(db, 'phoneCalendars', []);
                  saveSetting(db, 'saveToCalendar', null);
                  forgetPhoneEvents(db);
                  setSheet(null);
                }}
              />
            </View>
          </View>
        </Sheet>
      ) : null}
    </RowGroup>
  );
}
