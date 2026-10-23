import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { shadows } from '@/theme';

import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { KeyboardScrollView } from './keyboard';
import { Sheet } from './Sheet';
import { SHEET_RETENTION, usePressRetention } from './sheetContext';
import { Text } from './Text';

/**
 * A screen opened on top of the tabs: back arrow, title, scrolling page (design shell data-back).
 * With `list`, the child is the scrolling list itself (a virtualized list can't sit in a ScrollView).
 */
export function Page({
  title,
  children,
  right,
  list = false,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  list?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center justify-between pl-1 pr-margin">
        <View className="flex-1 flex-row items-center gap-1">
          <IconButton
            icon="arrow_back"
            accessibilityLabel={t.common.back}
            iconColor="onSurface"
            onPress={() => router.back()}
          />
          <Text variant="headlineMd" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {list ? (
        <View className="flex-1">{children}</View>
      ) : (
        <KeyboardScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-space-lg px-margin pt-space-sm"
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
          {children}
        </KeyboardScrollView>
      )}
    </View>
  );
}

/** "YOUR PLANNER" + a white card of rows. */
export function RowGroup({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {heading ? (
        <Text
          variant="labelMd"
          color="onSurfaceVariant"
          accessibilityRole="header"
          style={{ textTransform: 'uppercase' }}>
          {heading}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-2xl bg-surface-container-lowest" style={shadows.card}>
        {children}
      </View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  first?: boolean;
};

/** A settings row: icon, title (and subtitle), value, chevron. */
export function Row({ icon, title, subtitle, value, onPress, right, first = false }: RowProps) {
  const pressRetentionOffset = usePressRetention();
  const body = (
    <>
      <Icon name={icon} />
      <View className="flex-1 py-2">
        <Text variant="bodyLg">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'right', maxWidth: 140 }}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress ? <Icon name="chevron_right" /> : null}
    </>
  );
  const className = `min-h-[60px] flex-row items-center gap-space-md px-space-md ${first ? '' : 'border-t border-surface-variant'}`;
  if (!onPress) return <View className={className}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, value].filter(Boolean).join(', ')}
      onPress={onPress}
      pressRetentionOffset={pressRetentionOffset}
      className={`${className} active:bg-surface-container-low`}>
      {body}
    </Pressable>
  );
}

/** A sheet with one choice from a short list (Settings pickers, design/daybloom/settings#week-start). */
export function ChoiceSheet<T extends string | number | null>({
  title,
  options,
  value,
  onChoose,
  onClose,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChoose: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible onClose={onClose} title={title}>
      <View accessibilityRole="radiogroup" className="pb-space-sm">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              pressRetentionOffset={SHEET_RETENTION}
              onPress={() => {
                onChoose(o.value);
                onClose();
              }}
              className="min-h-[56px] flex-row items-center gap-3 active:opacity-70">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline'}`}>
                {on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
              </View>
              <Text variant="bodyLg">{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
