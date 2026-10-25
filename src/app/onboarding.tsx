import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { usePermissions, type PhonePermissions } from '@/features/usePermissions';
import { t } from '@/i18n';
import { clock } from '@/i18n/format';
import { askForNotifications } from '@/reminders/scheduler';
import { saveSetting } from '@/settings';
import { sms } from '@/sms/native';
import { shadows, useTheme } from '@/theme';
import {
  Button,
  centred,
  Icon,
  Logo,
  MAX,
  Sticker,
  Text,
  TextField,
  useKeyboardHeight,
  type IconName,
  type StickerName,
} from '@/ui';

type PageId = 'welcome' | 'name' | 'reminders' | 'texts' | 'popUp' | 'background' | 'done';
const ORDER: PageId[] = ['welcome', 'name', 'reminders', 'texts', 'popUp', 'background', 'done'];

/** Whether a page has anything to ask on this phone. */
function applies(page: PageId, p: PhonePermissions): boolean {
  if (page === 'texts') return !!sms && p.texts === false;
  // popping up is only of use once texts are read
  if (page === 'popUp') return !!sms && p.texts === true && p.popUp === false;
  if (page === 'background') return p.background === false;
  return true;
}

function Big({ icon, circle, color }: { icon: IconName; circle: string; color: 'onTertiaryFixed' | 'onPrimaryFixed' }) {
  return (
    <View className={`h-16 w-16 items-center justify-center rounded-full ${circle}`}>
      <Icon name={icon} size={32} color={color} />
    </View>
  );
}

/**
 * The welcome picture: a season sticker in each corner and the round logo in the middle, worked out
 * from one size so it stays centred, and smaller on narrow or short phones.
 */
function SeasonsArt() {
  const { width, height, fontScale } = useWindowDimensions();
  // large text leaves less room for the picture
  const room = height / Math.max(1, fontScale);
  const k = Math.min(1, (width - 32) / 264, room < 520 ? 0.65 : room < 720 ? 0.8 : 1);
  const w = 264 * k;
  const h = 232 * k;
  const sticker = 96 * k;
  const logo = 72 * k;
  const ring = 5 * k;
  const spots: [StickerName, number, number, number][] = [
    ['spring', 0, 4 * k, -12],
    ['summer', w - sticker, 0, 12],
    ['autumn', 8 * k, h - sticker, 6],
    ['winter', w - sticker - 8 * k, h - sticker - 4 * k, -6],
  ];
  return (
    <View style={{ width: w, height: h }} importantForAccessibility="no-hide-descendants">
      {spots.map(([name, left, top, rotate]) => (
        <View key={name} style={{ position: 'absolute', left, top }}>
          <Sticker name={name} size={sticker} rotate={rotate} />
        </View>
      ))}
      <View
        className="bg-surface-container-lowest"
        style={[
          shadows.float,
          {
            position: 'absolute',
            left: (w - logo) / 2 - ring,
            top: (h - logo) / 2 - ring,
            padding: ring,
            borderRadius: logo / 2 + ring,
          },
        ]}>
        <Logo size={logo} round />
      </View>
    </View>
  );
}

/**
 * The middle of a page: centred when it fits, and scrolling when it doesn't (a small phone with large
 * text), so it never runs into the buttons below.
 */
function Middle({
  center = false,
  toEnd = false,
  children,
}: {
  center?: boolean;
  /** Keep the end (a text box) in view, while the keyboard leaves little room */
  toEnd?: boolean;
  children: ReactNode;
}) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (toEnd) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
  }, [toEnd]);
  return (
    <ScrollView
      ref={scroll}
      onContentSizeChange={() => toEnd && scroll.current?.scrollToEnd({ animated: false })}
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerClassName={`flex-grow justify-center gap-space-lg py-space-sm ${center ? 'items-center' : ''}`}>
      {children}
    </ScrollView>
  );
}

/** A page asking for one thing: icon, title, why, an example, a note, and its buttons. */
function AskPage({
  icon,
  title,
  text,
  note,
  children,
  actions,
}: {
  icon: IconName;
  title: string;
  text: string;
  note?: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <View className="flex-1">
      <Middle>
        <Big icon={icon} circle="bg-primary-fixed" color="onPrimaryFixed" />
        <View>
          <Text variant="displayLgMobile" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="bodyLg" color="onSurfaceVariant" style={{ marginTop: 8 }}>
            {text}
          </Text>
        </View>
        {children}
        {note ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {note}
          </Text>
        ) : null}
      </Middle>
      <View className="mt-space-lg gap-space-sm">{actions}</View>
    </View>
  );
}

/** "Allowed" with a tick, once the person has allowed it in the phone's settings. */
function Allowed() {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name="check_circle" color="primary" filled />
      <Text variant="labelLg" color="primary">
        {t.onboarding.allowed}
      </Text>
    </View>
  );
}

/**
 * First run (ON-01): welcome → name (optional) → reminders → on Android, payment texts, popping up
 * over other apps (once texts are allowed) and running in the background (when the phone limits it)
 * → done. Every page can be skipped; Settings › Phone permissions has them all later (ST-06). The
 * tour follows (ON-02).
 */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { permissions, allowTexts, allowPopUp, allowBackground } = usePermissions();
  const [page, setPage] = useState<PageId>('welcome');
  const [name, setName] = useState(settings.name ?? '');
  // the page ends above the keyboard while it's open, so what you type stays in view
  const keyboard = useKeyboardHeight();

  // the pages that apply: a page stays while it's showing, even once what it asks for is allowed
  const pages = ORDER.filter((p) => p === page || applies(p, permissions));
  const index = pages.indexOf(page);
  /** The next page that applies, judged on what is allowed now (just asked for or not). */
  const nextAfter = (from: PageId, now: PhonePermissions = permissions) =>
    ORDER.slice(ORDER.indexOf(from) + 1).find((p) => applies(p, now)) ?? 'done';
  const next = () => setPage(nextAfter(page));

  const finish = () => {
    saveSetting(db, 'onboarded', true);
    router.replace('/');
  };
  const saveName = () => {
    saveSetting(db, 'name', name);
    next();
  };

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: insets.top + 24, paddingBottom: keyboard ? keyboard + 16 : insets.bottom + 40 }}>
      {/* on a wide screen the pages keep to a centred column (D20) */}
      <View className="flex-1 px-margin" style={centred(MAX.firstRun)}>
        {/* progress + skip */}
        <View className="h-12 flex-row items-center justify-between">
          <View className="flex-row gap-1.5" importantForAccessibility="no-hide-descendants">
            {pages.map((p, i) => (
              <View
                key={p}
                className={`h-2 rounded-full ${i <= index ? 'w-6 bg-primary' : 'w-2'}`}
                style={i > index ? { backgroundColor: colors.surfaceVariant } : undefined}
              />
            ))}
          </View>
          {page !== 'done' ? <Button label={t.onboarding.skip} variant="text" onPress={finish} /> : null}
        </View>

        {page === 'welcome' ? (
          <View className="flex-1">
            <Middle center>
              <SeasonsArt />
              <View className="items-center">
                <Text variant="displayLgMobile" accessibilityRole="header" style={{ textAlign: 'center' }}>
                  {t.onboarding.welcome}
                </Text>
                <Text variant="bodyLg" color="onSurfaceVariant" style={{ textAlign: 'center', marginTop: 8 }}>
                  {t.onboarding.welcomeText}
                </Text>
              </View>
            </Middle>
            <Button label={t.onboarding.start} size="xl" fullWidth onPress={next} />
          </View>
        ) : null}

        {page === 'name' ? (
          <View className="flex-1">
            <Middle toEnd={keyboard > 0}>
              {/* the wave makes room for the box while typing */}
              {keyboard ? null : <Big icon="waving_hand" circle="bg-tertiary-fixed" color="onTertiaryFixed" />}
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
            </Middle>
            <View className="mt-space-lg gap-space-sm">
              <Button label={t.onboarding.continue} size="xl" fullWidth onPress={saveName} />
              <Button label={t.onboarding.skipThis} variant="text" fullWidth onPress={next} />
            </View>
          </View>
        ) : null}

        {page === 'reminders' ? (
          <AskPage
            icon="notifications"
            title={t.onboarding.remindTitle}
            text={t.onboarding.remindText}
            note={t.onboarding.remindNote}
            actions={
              <>
                <Button
                  label={t.onboarding.allow}
                  size="xl"
                  fullWidth
                  onPress={async () => {
                    await askForNotifications();
                    next();
                  }}
                />
                <Button label={t.onboarding.notNow} variant="text" fullWidth onPress={next} />
              </>
            }>
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
          </AskPage>
        ) : null}

        {page === 'texts' ? (
          <AskPage
            icon="sms"
            title={t.onboarding.textsTitle}
            text={t.onboarding.textsText}
            note={t.onboarding.textsNote}
            actions={
              <>
                <Button
                  label={t.onboarding.allowTexts}
                  size="xl"
                  fullWidth
                  onPress={async () => {
                    const texts = await allowTexts();
                    setPage(nextAfter('texts', { ...permissions, texts, popUp: sms?.canPopUp() ?? null }));
                  }}
                />
                <Button label={t.onboarding.notNow} variant="text" fullWidth onPress={next} />
              </>
            }>
            {/* a payment text, and the expense it becomes */}
            <View
              accessible
              accessibilityLabel={`${t.onboarding.example}: ${t.onboarding.textsExample(settings.currency)} ${t.onboarding.textsExampleAdded}`}
              className="gap-space-sm">
              <View className="max-w-[90%] self-start rounded-2xl rounded-bl-md bg-surface-container-high p-space-sm">
                <Text variant="labelMd" color="onSurfaceVariant">
                  M-Money
                </Text>
                <Text variant="bodyMd">{t.onboarding.textsExample(settings.currency)}</Text>
              </View>
              <View className="self-center">
                <Icon name="expand_more" color="primary" />
              </View>
              <View
                className="flex-row items-center gap-3 rounded-2xl bg-surface-container-lowest p-space-sm"
                style={shadows.card}>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-fixed">
                  <Icon name="restaurant" size={20} color="onPrimaryFixed" />
                </View>
                <Text variant="bodyLg" style={{ flex: 1 }}>
                  {t.onboarding.textsExampleAdded}
                </Text>
                <Text variant="labelLg">2,500</Text>
              </View>
            </View>
          </AskPage>
        ) : null}

        {page === 'popUp' ? (
          <AskPage
            icon="mobile"
            title={t.onboarding.popUpTitle}
            text={t.onboarding.popUpText}
            note={permissions.popUp ? undefined : t.onboarding.popUpNote}
            actions={
              permissions.popUp ? (
                <>
                  <Allowed />
                  <Button label={t.onboarding.continue} size="xl" fullWidth onPress={next} />
                </>
              ) : (
                <>
                  <Button label={t.onboarding.openSettings} size="xl" fullWidth onPress={allowPopUp} />
                  <Button label={t.onboarding.notNow} variant="text" fullWidth onPress={next} />
                </>
              )
            }>
            {/* what the pop-up looks like */}
            <View
              accessible
              accessibilityLabel={`${t.onboarding.example}: ${t.onboarding.popUpExampleHeading}, ${t.onboarding.popUpExampleTitle}`}
              className="gap-2 rounded-3xl bg-surface-container-lowest p-space-md"
              style={shadows.float}>
              <Text variant="labelMd" color="onSurfaceVariant">
                {t.onboarding.popUpExampleHeading}
              </Text>
              <Text variant="headlineSm">{t.onboarding.popUpExampleTitle}</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  t.budget.starterCategories.dining,
                  t.budget.starterCategories.groceries,
                  t.budget.starterCategories.transport,
                ].map((label, i) => (
                  <View
                    key={label}
                    className={`h-9 justify-center rounded-full px-3 ${i === 0 ? 'bg-primary' : 'border-[1.5px] border-outline-variant'}`}>
                    <Text variant="labelMd" color={i === 0 ? 'onPrimary' : 'onSurface'}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </AskPage>
        ) : null}

        {page === 'background' ? (
          <AskPage
            icon="battery_5_bar"
            title={t.onboarding.backgroundTitle}
            text={t.onboarding.backgroundText}
            note={permissions.background ? undefined : t.onboarding.backgroundNote}
            actions={
              permissions.background ? (
                <>
                  <Allowed />
                  <Button label={t.onboarding.continue} size="xl" fullWidth onPress={next} />
                </>
              ) : (
                <>
                  <Button
                    label={t.onboarding.openSettings}
                    size="xl"
                    fullWidth
                    onPress={() => void allowBackground()}
                  />
                  <Button label={t.onboarding.notNow} variant="text" fullWidth onPress={next} />
                </>
              )
            }
          />
        ) : null}

        {page === 'done' ? (
          <View className="flex-1">
            <Middle>
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
              <Text variant="bodySm" color="onSurfaceVariant">
                {t.onboarding.permissionsLater}
              </Text>
            </Middle>
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
    </View>
  );
}
