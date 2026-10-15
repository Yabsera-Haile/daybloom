import { forwardRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { fontFamilyFor, typography, useTheme, type ColorName, type TypographyVariant } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type TextFieldProps = TextInputProps & { variant?: TypographyVariant; className?: string };

/** Text input in the design's type styles (custom fonts need the right file per weight). */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { variant = 'bodyLg', style, className = '', ...rest },
  ref,
) {
  const { colors } = useTheme();
  const ty = typography[variant];
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.outline}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      className={className}
      style={[
        {
          fontFamily: fontFamilyFor(ty.font, ty.weight),
          fontSize: ty.size,
          color: colors.onSurface,
          paddingVertical: 0,
        },
        style,
      ]}
      {...rest}
    />
  );
});

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Category dot color */
  dot?: string;
  /** Classes when selected (category chips use the category's colors). */
  selectedClass?: string;
  /** Text color when selected with selectedClass (default onSurface). */
  selectedText?: ColorName;
  icon?: IconName;
  /** Radio-like groups announce as radio buttons; multi-select as checkboxes. */
  role?: 'radio' | 'checkbox' | 'button';
};

/** 40 visual / 48 touch choice chip ("10 min before", "Every day", category). */
export function ChoiceChip({
  label,
  selected,
  onPress,
  dot,
  selectedClass,
  selectedText,
  icon,
  role = 'radio',
}: ChoiceChipProps) {
  const on = selectedClass ?? 'border-primary bg-primary';
  const text: ColorName = !selected ? 'onSurface' : selectedClass ? (selectedText ?? 'onSurface') : 'onPrimary';
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'button' ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      className={`h-10 flex-row items-center gap-1.5 rounded-full border-[1.5px] active:opacity-80 ${dot ? 'pl-2 pr-3.5' : 'px-3.5'} ${selected ? on : 'border-outline-variant bg-surface-container-lowest'}`}>
      {dot ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: dot }} /> : null}
      {icon ? <Icon name={icon} size={18} color={text} /> : null}
      <Text variant="labelLg" color={text}>
        {label}
      </Text>
    </Pressable>
  );
}

type MenuRowProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'normal' | 'danger';
  detail?: string;
};

/** Row in a sheet menu: icon + label, 56 tall. */
export function MenuRow({ icon, label, onPress, tone = 'normal', detail }: MenuRowProps) {
  const color: ColorName = tone === 'danger' ? 'secondary' : 'onSurface';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-space-md px-margin active:bg-surface-container-low">
      <Icon name={icon} color={tone === 'danger' ? 'secondary' : 'onSurfaceVariant'} />
      <View className="flex-1">
        <Text variant="bodyLg" color={color}>
          {label}
        </Text>
        {detail ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A pill that shows a value and opens a picker ("Wed, Oct 23", "2:00 PM"). */
export function PickerPill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      hitSlop={4}
      className="h-10 flex-row items-center justify-center rounded-full bg-surface-container px-4 active:opacity-80">
      <Text variant="labelLg">{value}</Text>
    </Pressable>
  );
}
