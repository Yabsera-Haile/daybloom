import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { shadows, type ColorName } from '@/theme';

import { PickerPill } from './Fields';
import { Icon, type IconName } from './Icon';
import { usePressRetention } from './sheetContext';
import { Text } from './Text';

/** White card that groups part of a form (habit, bill). */
export function FormSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl bg-surface-container-lowest ${className}`} style={shadows.card}>
      {children}
    </View>
  );
}

/** A choice with a title and a line of detail, one of a few (routine, how a bill is paid, budget period). */
export function RadioCard({
  on,
  onPress,
  icon,
  iconColor = 'onSurfaceVariant',
  title,
  detail,
}: {
  on: boolean;
  onPress: () => void;
  icon?: IconName;
  iconColor?: ColorName;
  title: string;
  detail?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      onPress={onPress}
      pressRetentionOffset={usePressRetention()}
      className={`min-h-touch flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3 ${on ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'}`}>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline'}`}>
        {on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
      </View>
      {icon ? <Icon name={icon} color={iconColor} /> : null}
      <View className="flex-1">
        <Text variant="bodyLg">{title}</Text>
        {detail ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Two or three choices side by side in a pill ("Every day | Once a week"). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const pressRetentionOffset = usePressRetention();
  return (
    <View accessibilityRole="radiogroup" className="flex-row rounded-full bg-surface-container p-1">
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === o.value }}
          onPress={() => onChange(o.value)}
          hitSlop={{ top: 4, bottom: 4 }}
          pressRetentionOffset={pressRetentionOffset}
          className={`min-h-11 flex-1 items-center justify-center rounded-full px-1 ${value === o.value ? 'bg-primary' : ''}`}>
          <Text
            variant="labelLg"
            color={value === o.value ? 'onPrimary' : 'onSurfaceVariant'}
            style={{ textAlign: 'center' }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** "From  [8:00 AM]": a label and a pill that opens a picker. */
export function PickerRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <View className="min-h-touch flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-3">
        {icon ? <Icon name={icon} /> : null}
        <Text variant="bodyLg">{label}</Text>
      </View>
      <PickerPill label={label} value={value} onPress={onPress} />
    </View>
  );
}
