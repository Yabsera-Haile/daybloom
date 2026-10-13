import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { clock } from '@/i18n/format';
import { askForNotifications } from '@/reminders/scheduler';
import { saveSetting } from '@/settings';
import { colors, shadows } from '@/theme';
import { Button, Icon, Logo, Sticker, Text, TextField, type IconName } from '@/ui';

function Big({ icon, circle, color }: { icon: IconName; circle: string; color: 'onTertiaryFixed' | 'onPrimaryFixed' }) {
  return (
    <View className={`h-16 w-16 items-center justify-center rounded-full ${circle}`}>
      <Icon name={icon} size={32} color={color} />
    </View>
  );
}

/** First run (ON-01): welcome → name (optional) → why reminders matter + permission → done. All skippable. */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(settings.name ?? '');

  const finish = () => {
    saveSetting(db, 'onboarded', true);
    router.replace('/');
  };
  const saveName = () => {
    saveSetting(db, 'name', name);
    setStep(3);
  };

  return (
    <View
      className="flex-1 bg-surface px-margin"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}>
      {/* progress + skip */}
      <View className="h-12 flex-row items-center justify-between">
        <View className="flex-row gap-1.5" importantForAccessibility="no-hide-descendants">
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              className={`h-2 rounded-full ${s <= step ? 'w-6 bg-primary' : 'w-2'}`}
              style={s > step ? { backgroundColor: colors.surfaceVariant } : undefined}
            />
          ))}
        </View>
        {step < 4 ? <Button label={t.onboarding.skip} variant="text" onPress={finish} /> : null}
      </View>

      {step === 1 ? (
        <View className="flex-1">
          <View className="flex-1 items-center justify-center gap-space-lg">
            <View className="h-60 w-72" importantForAccessibility="no-hide-descendants">
              <View className="absolute left-0 top-2">
                <Sticker name="spring" size={96} rotate={-12} />
              </View>
              <View className="absolute right-0 top-0">
                <Sticker name="summer" size={96} rotate={12} />
              </View>
              <View className="absolute bottom-0 left-3">
                <Sticker name="autumn" size={96} rotate={6} />
              </View>
              <View className="absolute bottom-1 right-3">
                <Sticker name="winter" size={96} rotate={-6} />
              </View>
              <View className="absolute left-[96px] top-[72px] rounded-[23px]" style={shadows.float}>
                <Logo size={96} />
              </View>
            </View>
            <View className="items-center">
              <Text variant="displayLgMobile" accessibilityRole="header" style={{ textAlign: 'center' }}>
                {t.onboarding.welcome}
              </Text>
              <Text variant="bodyLg" color="onSurfaceVariant" style={{ textAlign: 'center', marginTop: 8 }}>
                {t.onboarding.welcomeText}
              </Text>
            </View>
          </View>
          <Button label={t.onboarding.start} size="xl" fullWidth onPress={() => setStep(2)} />
        </View>
      ) : null}

      {step === 2 ? (
        <View className="flex-1">
          <View className="flex-1 justify-center gap-space-lg">
            <Big icon="waving_hand" circle="bg-tertiary-fixed" color="onTertiaryFixed" />
            <View>
              <Text variant="displayLgMobile" accessibilityRole="header">
                {t.onboarding.nameTitle}
              </Text>
              <Text variant="bodyLg" color="onSurfaceVariant" style={{ marginTop: 8 }}>
                {t.onboarding.nameText}
              </Text>
            </View>
            <TextField
              autoFocus
              accessibilityLabel={t.onboarding.nameLabel}
              placeholder={t.onboarding.nameLabel}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={saveName}
              variant="headlineMd"
              className="h-14 rounded-xl border-[1.5px] border-primary bg-surface-container-lowest px-4"
            />
          </View>
          <View className="gap-space-sm">
            <Button label={t.onboarding.continue} size="xl" fullWidth onPress={saveName} />
            <Button label={t.onboarding.skipThis} variant="text" fullWidth onPress={() => setStep(3)} />
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View className="flex-1">
          <View className="flex-1 justify-center gap-space-lg">
            <Big icon="notifications" circle="bg-primary-fixed" color="onPrimaryFixed" />
            <View>
              <Text variant="displayLgMobile" accessibilityRole="header">
                {t.onboarding.remindTitle}
              </Text>
              <Text variant="bodyLg" color="onSurfaceVariant" style={{ marginTop: 8 }}>
                {t.onboarding.remindText}
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`${t.onboarding.example}: ${t.onboarding.exampleTitle(clock(15, 0, settings.timeFormat))}, ${t.onboarding.exampleBody}`}
              className="flex-row gap-3 rounded-2xl bg-surface-container-lowest p-space-md"
              style={shadows.float}>
              <Logo size={40} />
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text variant="labelMd" color="onSurfaceVariant">
                    Daybloom
                  </Text>
                  <Text variant="labelMd" color="onSurfaceVariant">
                    {t.onboarding.now}
                  </Text>
                </View>
                <Text variant="bodyLg" weight="600">
                  {t.onboarding.exampleTitle(clock(15, 0, settings.timeFormat))}
                </Text>
                <Text variant="bodyMd" color="onSurfaceVariant">
                  {t.onboarding.exampleBody}
                </Text>
              </View>
            </View>
            <Text variant="bodySm" color="onSurfaceVariant">
              {t.onboarding.remindNote}
            </Text>
          </View>
          <View className="gap-space-sm">
            <Button
              label={t.onboarding.allow}
              size="xl"
              fullWidth
              onPress={async () => {
                await askForNotifications();
                setStep(4);
              }}
            />
            <Button label={t.onboarding.notNow} variant="text" fullWidth onPress={() => setStep(4)} />
          </View>
        </View>
      ) : null}

      {step === 4 ? (
        <View className="flex-1">
          <View className="flex-1 justify-center gap-space-lg">
            <Big icon="local_florist" circle="bg-primary-fixed" color="onPrimaryFixed" />
            <View>
              <Text variant="displayLgMobile" accessibilityRole="header">
                {t.onboarding.doneTitle(settings.name)}
              </Text>
              <Text variant="bodyLg" color="onSurfaceVariant" style={{ marginTop: 8 }}>
                {t.onboarding.doneText}
              </Text>
            </View>
            <View className="gap-1 rounded-2xl bg-surface-container-lowest p-space-sm" style={shadows.card}>
              {(
                [
                  ['first_page', t.onboarding.weekStarts(t.settings.weekdays[settings.weekStart])],
                  ['schedule', t.onboarding.timesLook(clock(13, 15, settings.timeFormat))],
                  [
                    'notifications',
                    settings.defaultReminder === null
                      ? t.onboarding.noReminders
                      : t.onboarding.reminders(t.reminders.detail(settings.defaultReminder)),
                  ],
                ] as [IconName, string][]
              ).map(([icon, text]) => (
                <View key={icon} className="min-h-touch flex-row items-center gap-space-md px-space-sm">
                  <Icon name={icon} />
                  <Text variant="bodyLg">{text}</Text>
                </View>
              ))}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={finish}
            className="h-14 items-center justify-center rounded-full bg-primary active:opacity-80">
            <Text variant="labelLg" color="onPrimary">
              {t.onboarding.open}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
