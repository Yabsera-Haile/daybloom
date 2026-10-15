import { Pressable, View } from 'react-native';

import { t } from '@/i18n';
import { categoryColors, colors, lookFor, type CategoryKey, type ColorName } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Filter / choice chip: 36 visual, 48 touch. */
export function FilterChip({ label, selected = false, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      className={`h-9 justify-center rounded-full px-3 active:opacity-80 ${selected ? 'bg-primary' : 'border-[1.5px] border-outline-variant'}`}>
      <Text variant="labelMd" color={selected ? 'onPrimary' : 'onSurface'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The one "Urgent" style used everywhere (DESIGN_REVIEW I4). */
export function UrgentBadge() {
  return (
    <View
      className="flex-row items-center self-start rounded-full bg-secondary py-0.5 pl-1 pr-2"
      accessibilityLabel={t.common.urgent}>
      <Icon name="priority_high" size={14} color="onSecondary" />
      <Text variant="labelSm" color="onSecondary">
        {t.common.urgent}
      </Text>
    </View>
  );
}

/** Category label in the category's own colors. `name` is the user's name for it (categories can be renamed). */
export function CategoryTag({
  category,
  name,
  tone = 'container',
}: {
  category: CategoryKey;
  name?: string;
  tone?: 'container' | 'onCard';
}) {
  const c = categoryColors[category] ?? categoryColors.personal;
  return (
    <View
      className="shrink-0 self-start rounded-full px-2 py-0.5"
      style={{ backgroundColor: tone === 'container' ? c.container : 'rgba(255,255,255,0.8)' }}>
      <Text variant="labelSm" style={{ color: tone === 'container' ? c.onContainer : lookFor(category).detail }}>
        {name ?? c.label}
      </Text>
    </View>
  );
}

type StatusTone = 'success' | 'neutral' | 'warning' | 'alert';
const statusColors: Record<StatusTone, [ColorName, ColorName]> = {
  success: ['primaryFixed', 'onPrimaryFixed'],
  neutral: ['surfaceContainerHigh', 'onSurfaceVariant'],
  warning: ['tertiaryFixed', 'onTertiaryFixed'],
  alert: ['secondaryFixed', 'onSecondaryFixed'],
};

/** Small status pill: "All done", "3 of 4 done", "On track", "Deadline". */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const [bg, fg] = statusColors[tone];
  return (
    <View className="self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors[bg] }}>
      <Text variant="labelSm" color={fg}>
        {label}
      </Text>
    </View>
  );
}
