import * as Battery from 'expo-battery';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { useNotificationStatus } from '@/features/useNotificationStatus';
import { t } from '@/i18n';
import { remindersAvailable, sendTestReminder } from '@/reminders/scheduler';
import { useUi } from '@/state/ui';
import { shadows } from '@/theme';
import { Button, Icon, Page, Text, type IconName } from '@/ui';

type Check = 'ok' | 'off' | 'check';

function CheckRow({
  title,
  text,
  state,
  first,
  children,
}: {
  title: string;
  text: string;
  state: Check | null;
  first?: boolean;
  children?: ReactNode;
}) {
  const icon: IconName = state === 'ok' ? 'check_circle' : 'error';
  const label = state === 'ok' ? t.help.on : state === 'off' ? t.help.off : t.help.check;
  return (
    <View className={`gap-space-sm p-space-md ${first ? '' : 'border-t border-surface-variant'}`}>
      <View className="flex-row items-center gap-space-md">
        {state ? (
          <Icon name={icon} color={state === 'ok' ? 'primary' : 'tertiary'} filled />
        ) : (
          <View className="h-6 w-6" />
        )}
        <View className="flex-1">
          <Text variant="bodyLg">{title}</Text>
          <Text variant="bodySm" color="onSurfaceVariant">
            {text}
          </Text>
        </View>
        {state ? (
          <Text variant="labelLg" color={state === 'ok' ? 'primary' : 'tertiary'}>
            {label}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Steps({ title, steps, first = false }: { title: string; steps: string[]; first?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View className={first ? '' : 'border-t border-surface-variant'}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-[56px] flex-row items-center justify-between px-space-md">
        <Text variant="bodyLg">{title}</Text>
        <Icon name={open ? 'expand_less' : 'expand_more'} />
      </Pressable>
      {open ? (
        <View className="gap-2 px-space-md pb-space-md">
          {steps.map((s, i) => (
            <View key={s} className="flex-row gap-3">
              {steps.length > 1 ? (
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary-fixed">
                  <Text variant="labelSm" color="onPrimaryFixed">
                    {i + 1}
                  </Text>
                </View>
              ) : null}
              <Text variant="bodyMd" style={{ flex: 1 }}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** "Reminders not arriving?" (ST-03): live checks, phone-by-phone help, a test reminder. */
export default function ReminderHelpScreen() {
  const { status, turnOn } = useNotificationStatus();
  const showToast = useUi((s) => s.showToast);
  const [batterySaving, setBatterySaving] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void Battery.isBatteryOptimizationEnabledAsync().then(setBatterySaving, () => setBatterySaving(null));
  }, [status]);

  return (
    <Page title={t.help.title}>
      <View className="mt-space-sm flex-row items-start gap-space-md">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-fixed">
          <Icon name="notifications_active" color="onPrimaryFixed" />
        </View>
        <Text variant="bodyLg" color="onSurfaceVariant" style={{ flex: 1 }}>
          {t.help.intro}
        </Text>
      </View>
      {remindersAvailable ? null : (
        <View className="flex-row gap-3 rounded-2xl bg-tertiary-fixed/50 p-space-md">
          <Icon name="error" color="tertiary" />
          <Text variant="bodyMd" style={{ flex: 1 }}>
            {t.help.expoGo}
          </Text>
        </View>
      )}

      <View className="gap-2">
        <Text variant="labelMd" color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>
          {t.help.yourPhone}
        </Text>
        <View className="rounded-2xl bg-surface-container-lowest" style={shadows.card}>
          <CheckRow
            first
            title={t.help.notifications}
            text={t.help.notificationsText}
            state={status ? (status.granted ? 'ok' : 'off') : null}>
            {status && !status.granted ? <Button label={t.help.turnOn} size="md" onPress={turnOn} /> : null}
          </CheckRow>
          {/* granted with the app install (USE_EXACT_ALARM, allowed for planners and calendars) */}
          <CheckRow title={t.help.exact} text={t.help.exactText} state={remindersAvailable ? 'ok' : 'check'} />
          <CheckRow
            title={t.help.battery}
            text={t.help.batteryText}
            state={batterySaving === null ? null : batterySaving ? 'check' : 'ok'}>
            {batterySaving ? (
              <Button
                label={t.help.openBattery}
                icon="open_in_new"
                variant="outline"
                size="md"
                onPress={() => Linking.openSettings()}
              />
            ) : null}
          </CheckRow>
        </View>
      </View>

      <View className="gap-2">
        <Text variant="labelMd" color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>
          {t.help.steps}
        </Text>
        <View className="rounded-2xl bg-surface-container-lowest" style={shadows.card}>
          <Steps first title={t.help.samsung} steps={t.help.samsungSteps} />
          <Steps title={t.help.xiaomi} steps={t.help.xiaomiSteps} />
          <Steps title={t.help.oneplus} steps={t.help.oneplusSteps} />
          <Steps title={t.help.other} steps={t.help.otherSteps} />
        </View>
      </View>

      <View className="gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
        <Text variant="headlineSm">{t.help.sure}</Text>
        <Button
          label={t.help.test}
          icon="send"
          onPress={async () => showToast((await sendTestReminder()) ? t.help.testSent : t.help.testBlocked)}
        />
        <Text variant="bodySm" color="onSurfaceVariant">
          {t.help.testText}
        </Text>
      </View>
    </Page>
  );
}
