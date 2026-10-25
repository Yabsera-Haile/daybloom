import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { shareBackup } from '@/backup/share';
import { hemisphereForTimeZone, type WeekStart } from '@/calendar/dates';
import { localTimeZone } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useCategories, useSettings, useToday } from '@/data/hooks';
import { SoundSheet, ThemeSheet, themeLabel } from '@/features/settings/LookSheets';
import { themeFor } from '@/features/ThemeProvider';
import { useTour } from '@/features/tour/store';
import { usePermissions } from '@/features/usePermissions';
import { t } from '@/i18n';
import { clock } from '@/i18n/format';
import { saveSetting, type Settings } from '@/settings';
import { useUi } from '@/state/ui';
import { shadows, useTheme } from '@/theme';
import { Button, ChoiceSheet, Columns, Icon, Page, Row, RowGroup, Sheet, Sticker, Switch, Text, TextField } from '@/ui';

const REMINDER_OPTIONS: (number | null)[] = [null, 0, 10, 30, 60, 1440];

type Picker =
  'weekStart' | 'timeFormat' | 'defaultReminder' | 'sound' | 'theme' | 'hemisphere' | 'currency' | 'privacy' | null;

const reminderLabel = (m: number | null) => (m === null ? t.settings.noReminder : t.reminders.detail(m));
const allowedLabel = (on: boolean | null) =>
  on === null ? undefined : on ? t.settings.allowedValue : t.settings.notAllowedValue;
const currencyLabel = (code: string) => (t.currencies[code] ? `${t.currencies[code]} (${code})` : code);

/** Settings (ST-01, SH-06): opened from More. Only what you change is saved; the rest follows the phone. */
export default function SettingsScreen() {
  const { lookFor, name: themeName } = useTheme();
  const settings = useSettings();
  const today = useToday();
  const categories = useCategories();
  const { permissions, allowReminders, allowTexts, allowPopUp, allowBackground } = usePermissions();
  const [name, setName] = useState(settings.name ?? '');
  const [picker, setPicker] = useState<Picker>(null);
  const save = <K extends keyof Settings>(key: K, value: Settings[K]) => saveSetting(db, key, value);
  const fromPhone = hemisphereForTimeZone(localTimeZone()) === settings.hemisphere;
  const currencies = [...new Set([settings.currency, ...Object.keys(t.currencies)])];
  const showToast = useUi((s) => s.showToast);
  const [backingUp, setBackingUp] = useState(false);
  // ST-02: every plan, habit and expense in one file, saved wherever the person chooses
  const backup = async () => {
    if (backingUp) return;
    setBackingUp(true);
    try {
      if (!(await shareBackup())) showToast(t.settings.backupFailed);
    } catch {
      showToast(t.settings.backupFailed);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    // on a wide screen: you, planner, seasons and money on the left; the rest on the right (D20)
    <Page title={t.settings.title} columns>
      <Columns
        left={
          <>
            {/* You */}
            <View
              className="mt-space-sm flex-row items-center gap-space-md rounded-2xl bg-surface-container-lowest p-space-md"
              style={shadows.card}>
              <Sticker name={themeName} size={64} rotate={-6} />
              <View className="flex-1">
                <Text variant="labelMd" color="onSurfaceVariant">
                  {t.settings.name}
                </Text>
                <TextField
                  accessibilityLabel={t.settings.name}
                  placeholder={t.settings.namePlaceholder}
                  value={name}
                  onChangeText={setName}
                  onEndEditing={() => save('name', name)}
                  autoCapitalize="words"
                  className="mt-0.5 h-11 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
                />
              </View>
            </View>

            {permissions.reminders === false ? (
              <View className="gap-space-sm rounded-2xl bg-tertiary-fixed/50 p-space-md">
                <View className="flex-row items-start gap-3">
                  <Icon name="notifications" color="tertiary" />
                  <View className="flex-1">
                    <Text variant="bodyLg" weight="600">
                      {t.settings.remindersOff}
                    </Text>
                    <Text variant="bodyMd" color="onSurfaceVariant">
                      {t.settings.remindersOffText}
                    </Text>
                  </View>
                </View>
                <Button label={t.settings.turnOn} size="md" align="end" onPress={allowReminders} />
              </View>
            ) : null}

            <RowGroup heading={t.settings.planner}>
              <Row
                first
                icon="first_page"
                title={t.settings.weekStart}
                value={t.settings.weekdays[settings.weekStart]}
                onPress={() => setPicker('weekStart')}
              />
              <Row
                icon="schedule"
                title={t.settings.timeStyle}
                value={clock(13, 15, settings.timeFormat)}
                onPress={() => setPicker('timeFormat')}
              />
              <Row
                icon="notifications"
                title={t.settings.usualReminder}
                value={reminderLabel(settings.defaultReminder)}
                onPress={() => setPicker('defaultReminder')}
              />
              <Row
                icon="volume_up"
                title={t.settings.reminderSound}
                value={t.settings.sounds[settings.reminderSound]}
                onPress={() => setPicker('sound')}
              />
              <Row
                icon="palette"
                title={t.settings.categories}
                onPress={() => router.push('/categories')}
                right={
                  <View className="flex-row">
                    {categories.slice(0, 6).map((c, i) => (
                      <View
                        key={c.id}
                        className="h-4 w-4 rounded-full border-2 border-surface-container-lowest"
                        style={{ backgroundColor: lookFor(c.colorKey).dot, marginLeft: i ? -4 : 0 }}
                      />
                    ))}
                  </View>
                }
              />
            </RowGroup>

            <RowGroup heading={t.settings.seasons}>
              <Row
                first
                icon="palette"
                title={t.settings.colours}
                value={themeLabel(settings.theme, themeFor('auto', today, settings.hemisphere))}
                onPress={() => setPicker('theme')}
              />
              <Row
                icon="eco"
                title={t.settings.showSeasons}
                subtitle={t.settings.showSeasonsText}
                right={
                  <Switch
                    value={settings.seasons}
                    onChange={(v) => save('seasons', v)}
                    label={t.settings.showSeasons}
                  />
                }
              />
              <Row
                icon="public"
                title={t.settings.whereYouLive}
                subtitle={fromPhone ? t.settings.fromPhone : undefined}
                value={settings.hemisphere === 'north' ? t.settings.northShort : t.settings.southShort}
                onPress={() => setPicker('hemisphere')}
              />
            </RowGroup>

            <RowGroup heading={t.settings.money}>
              <Row
                first
                icon="payments"
                title={t.settings.currency}
                value={currencyLabel(settings.currency)}
                onPress={() => setPicker('currency')}
              />
            </RowGroup>
          </>
        }
        right={
          <>
            <RowGroup heading={t.settings.comfort}>
              <Row
                first
                icon="self_improvement"
                title={t.settings.calm}
                subtitle={t.settings.calmText}
                right={<Switch value={settings.calm} onChange={(v) => save('calm', v)} label={t.settings.calm} />}
              />
              <Row
                icon="notifications_active"
                title={t.settings.reminderHelp}
                subtitle={t.settings.reminderHelpText}
                onPress={() => router.push('/reminder-help')}
              />
              <Row
                icon="touch_app"
                title={t.settings.tour}
                subtitle={t.settings.tourText}
                onPress={() => {
                  router.dismissAll();
                  useTour.getState().start();
                }}
              />
            </RowGroup>

            {/* ST-06: anything skipped on the first-run pages can be allowed here */}
            <RowGroup heading={t.settings.permissions}>
              <Row
                first
                icon="notifications"
                title={t.settings.permReminders}
                subtitle={t.settings.permRemindersText}
                value={allowedLabel(permissions.reminders)}
                onPress={permissions.reminders ? () => router.push('/reminder-help') : allowReminders}
              />
              {permissions.texts !== null ? (
                <Row
                  icon="sms"
                  title={t.settings.permTexts}
                  subtitle={t.settings.permTextsText}
                  value={allowedLabel(permissions.texts)}
                  onPress={permissions.texts ? () => router.push('/bank-texts') : () => void allowTexts()}
                />
              ) : null}
              {permissions.popUp !== null ? (
                <Row
                  icon="mobile"
                  title={t.settings.permPopUp}
                  subtitle={t.settings.permPopUpText}
                  value={allowedLabel(permissions.popUp)}
                  onPress={allowPopUp}
                />
              ) : null}
              {Platform.OS === 'android' && permissions.background !== null ? (
                <Row
                  icon="battery_5_bar"
                  title={t.settings.permBackground}
                  subtitle={t.settings.permBackgroundText}
                  value={permissions.background ? t.settings.allowedValue : t.settings.limitedValue}
                  onPress={() => void allowBackground()}
                />
              ) : null}
            </RowGroup>

            <RowGroup heading={t.settings.yourData}>
              <View className="flex-row gap-space-md p-space-md">
                <Icon name="lock" color="primary" />
                <Text variant="bodyMd" color="onSurfaceVariant" style={{ flex: 1 }}>
                  {t.settings.privacyNote}
                </Text>
              </View>
              <Row
                icon="download"
                title={t.settings.backup}
                subtitle={backingUp ? t.settings.backupWorking : t.settings.backupText}
                onPress={backup}
              />
              <Row icon="policy" title={t.settings.privacy} onPress={() => setPicker('privacy')} />
            </RowGroup>
          </>
        }
      />

      <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
        {t.settings.version(Constants.expoConfig?.version ?? '')}
      </Text>

      {picker === 'weekStart' ? (
        <ChoiceSheet<WeekStart>
          title={t.settings.weekStart}
          value={settings.weekStart}
          options={([0, 1, 6] as WeekStart[]).map((d) => ({ value: d, label: t.settings.weekdays[d] }))}
          onChoose={(v) => save('weekStart', v)}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {picker === 'timeFormat' ? (
        <ChoiceSheet<'12h' | '24h'>
          title={t.settings.timeStyle}
          value={settings.timeFormat}
          options={[
            { value: '12h', label: clock(13, 15, '12h') },
            { value: '24h', label: clock(13, 15, '24h') },
          ]}
          onChoose={(v) => save('timeFormat', v)}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {picker === 'defaultReminder' ? (
        <ChoiceSheet<number | null>
          title={t.settings.usualReminder}
          value={settings.defaultReminder}
          options={REMINDER_OPTIONS.map((m) => ({ value: m, label: reminderLabel(m) }))}
          onChoose={(v) => save('defaultReminder', v)}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {picker === 'hemisphere' ? (
        <ChoiceSheet<'north' | 'south'>
          title={t.settings.whereYouLive}
          value={settings.hemisphere}
          options={[
            { value: 'north', label: t.settings.north },
            { value: 'south', label: t.settings.south },
          ]}
          onChoose={(v) => save('hemisphere', v)}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {picker === 'currency' ? (
        <ChoiceSheet<string>
          title={t.settings.currency}
          value={settings.currency}
          options={currencies.map((c) => ({ value: c, label: currencyLabel(c) }))}
          onChoose={(v) => save('currency', v)}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {picker === 'sound' ? <SoundSheet onClose={() => setPicker(null)} /> : null}
      {picker === 'theme' ? <ThemeSheet onClose={() => setPicker(null)} /> : null}
      {picker === 'privacy' ? (
        <Sheet visible onClose={() => setPicker(null)} title={t.settings.privacy} closeButton>
          <Text variant="bodyLg" color="onSurfaceVariant" style={{ paddingBottom: 16 }}>
            {t.settings.privacyText}
          </Text>
        </Sheet>
      ) : null}
    </Page>
  );
}
