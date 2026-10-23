import { Pressable, View } from 'react-native';

import { useTheme, type ColorName } from '@/theme';

import { Icon } from './Icon';
import { usePressRetention } from './sheetContext';
import { Text } from './Text';

type CheckboxProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** What is being ticked, e.g. "Morning journal". */
  label: string;
  /** Show the label next to the box (lists); off when the row shows it elsewhere. */
  showLabel?: boolean;
};

/** Rounded-square checkbox: 24 visual, 48 touch, 3:1 outline when empty (A11). */
export function Checkbox({ checked, onChange, label, showLabel = false }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange?.(!checked)}
      pressRetentionOffset={usePressRetention()}
      className="min-h-touch flex-row items-center gap-1">
      <View className="h-12 w-12 items-center justify-center">
        <View
          className={`h-6 w-6 items-center justify-center rounded-md ${checked ? 'bg-primary' : 'border-[1.5px] border-outline bg-surface-container-lowest'}`}>
          {checked ? <Icon name="check" size={18} color="onPrimary" /> : null}
        </View>
      </View>
      {showLabel ? (
        <Text variant="bodyLg" color={checked ? 'onSurfaceVariant' : 'onSurface'} done={checked}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

type HabitCircleProps = {
  state: 'done' | 'notDone' | 'future';
  today?: boolean;
  onPress?: () => void;
  /** e.g. "Warm lemon water, Thursday 17" */
  label: string;
};

/** Habit tick: 28 visual, 32 touch (dense grid, NFR-04). Future days can't be ticked. */
export function HabitCircle({ state, today = false, onPress, label }: HabitCircleProps) {
  const pressRetentionOffset = usePressRetention();
  const ring = today ? { outlineWidth: 2, outlineStyle: 'solid' as const, outlineOffset: 1, outlineColor: 'rgba(67,101,79,0.4)' } : null;
  if (state === 'future') {
    return (
      <View
        accessibilityLabel={`${label}, not yet`}
        className="h-7 w-7 rounded-full border-[1.5px] border-dashed border-outline-variant"
      />
    );
  }
  const done = state === 'done';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={2}
      pressRetentionOffset={pressRetentionOffset}
      style={ring}
      className={`h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-primary' : 'border-[1.5px] border-outline bg-surface-container-lowest'}`}>
      {done ? <Icon name="check" size={18} color="onPrimary" /> : null}
    </Pressable>
  );
}

type SwitchProps = {
  value: boolean;
  onChange?: (value: boolean) => void;
  label: string;
  tone?: 'primary' | 'secondary';
};

export function Switch({ value, onChange, label, tone = 'primary' }: SwitchProps) {
  const { colors } = useTheme();
  const on: ColorName = tone === 'secondary' ? 'secondary' : 'primary';
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange?.(!value)}
      hitSlop={8}
      pressRetentionOffset={usePressRetention()}
      className="h-8 w-14 justify-center rounded-full px-1"
      style={{
        backgroundColor: value ? colors[on] : colors.surfaceContainerHighest,
        borderWidth: 1.5,
        borderColor: value ? colors[on] : colors.outline,
      }}>
      <View
        className="h-5 w-5 rounded-full"
        style={{ backgroundColor: value ? colors.onPrimary : colors.outline, transform: [{ translateX: value ? 24 : 0 }] }}
      />
    </Pressable>
  );
}

type ProgressBarProps = {
  /** 0..1 */
  value: number;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  thick?: boolean;
  label: string;
};

const fill: Record<NonNullable<ProgressBarProps['tone']>, ColorName> = {
  primary: 'primaryContainer',
  secondary: 'secondaryContainer',
  tertiary: 'tertiaryContainer',
  error: 'error',
};

export function ProgressBar({ value, tone = 'primary', thick = false, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      className={`w-full overflow-hidden rounded-full bg-surface-container-high ${thick ? 'h-3 p-0.5' : 'h-2'}`}>
      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[fill[tone]] }} />
    </View>
  );
}
