import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { shadows, spacing } from '@/theme';

import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { KeyboardScrollView } from './keyboard';
import { useNarrow } from './narrow';
import { Sheet } from './Sheet';
import { SHEET_RETENTION, usePressRetention } from './sheetContext';
import { Text } from './Text';
import { centred, ContentWidth, MAX, useWide } from './wide';

/**
 * A screen opened on top of the tabs: back arrow, title, scrolling page (design shell data-back).
 * With `list`, the child is the scrolling list itself (a virtualized list can't sit in a ScrollView).
 * On a wide screen it keeps to a centred column; with `columns`, a wider one for <Columns> (D20).
 */
export function Page({
  title,
  children,
  right,
  list = false,
  columns = false,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  list?: boolean;
  columns?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const column = centred(columns ? MAX.columns : MAX.page);
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center justify-between pl-1 pr-margin" style={column}>
        <View className="flex-1 flex-row items-center gap-1">
          <IconButton
            icon="arrow_back"
            accessibilityLabel={t.common.back}
            iconColor="onSurface"
            onPress={() => router.back()}
          />
          {/* a long title shrinks a little to fit on one line (small phones, large text) */}
          <Text
            variant="headlineMd"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{ flex: 1 }}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {list ? (
        <View className="flex-1" style={column}>
          {children}
        </View>
      ) : (
        <KeyboardScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-space-lg px-margin pt-space-sm"
          contentContainerStyle={[column, { paddingBottom: insets.bottom + 48 }]}>
          {children}
        </KeyboardScrollView>
      )}
    </View>
  );
}

/**
 * Two columns side by side on a wide screen, in a `<Page columns>` (Settings, More; D20); on a
 * phone the left one's parts, then the right one's, as before.
 */
export function Columns({ left, right }: { left: ReactNode; right: ReactNode }) {
  const { width } = useWindowDimensions();
  const { panes } = useWide();
  if (!panes) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  // each column's width, so rows in it stack like on a phone when it's narrow
  const each = (Math.min(width, MAX.columns) - 2 * spacing.margin - spacing.spaceLg) / 2;
  return (
    <ContentWidth.Provider value={each}>
      <View className="flex-row items-start gap-space-lg">
        <View className="flex-1 gap-space-lg">{left}</View>
        <View className="flex-1 gap-space-lg">{right}</View>
      </View>
    </ContentWidth.Provider>
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
  // on a narrow screen the value sits under the title instead of squeezing it
  const stacked = useNarrow();
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
        {value && stacked ? (
          <Text variant="labelLg" color="primary" style={{ marginTop: 2 }}>
            {value}
          </Text>
        ) : null}
      </View>
      {value && !stacked ? (
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
  options: { value: T; label: string; detail?: string }[];
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
              <View className="flex-1 py-2">
                <Text variant="bodyLg">{o.label}</Text>
                {o.detail ? (
                  <Text variant="bodySm" color="onSurfaceVariant">
                    {o.detail}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
