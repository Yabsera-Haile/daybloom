import { Pressable, View, type PressableProps } from 'react-native';

import type { ColorName } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'outline' | 'tonal' | 'text' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary',
  outline: 'border-[1.5px] border-outline-variant bg-transparent',
  tonal: 'bg-surface-container',
  text: 'bg-transparent',
  danger: 'border-[1.5px] border-outline-variant bg-transparent',
};
const variantText: Record<Variant, ColorName> = {
  primary: 'onPrimary',
  outline: 'onSurface',
  tonal: 'primary',
  text: 'onSurfaceVariant',
  danger: 'secondary',
};

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  /** md = 40 visual (48 touch), lg = 48, xl = 56 */
  size?: 'md' | 'lg' | 'xl';
  icon?: IconName;
  fullWidth?: boolean;
  /** How it sits in its parent when not full width: start (default), center or end. */
  align?: 'start' | 'center' | 'end';
  className?: string;
};

const sizeClass = { md: 'h-10 pl-3 pr-4', lg: 'h-12 px-5', xl: 'h-14 px-6' };
const alignClass = { start: 'self-start', center: 'self-center', end: 'self-end' };

export function Button({ label, variant = 'primary', size = 'lg', icon, fullWidth, align = 'start', className = '', ...rest }: ButtonProps) {
  const color = variantText[variant];
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={size === 'md' ? 4 : 0}
      className={`flex-row items-center justify-center gap-1.5 rounded-full active:opacity-80 ${sizeClass[size]} ${variantClass[variant]} ${fullWidth ? 'w-full' : alignClass[align]} ${className}`}
      {...rest}>
      {icon ? <Icon name={icon} size={20} color={color} /> : null}
      <Text variant={size === 'md' ? 'labelMd' : 'labelLg'} color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

type IconButtonProps = Omit<PressableProps, 'children'> & {
  icon: IconName;
  /** Required: icon-only buttons must say what they do. */
  accessibilityLabel: string;
  tone?: 'plain' | 'tonal' | 'primary';
  iconColor?: ColorName;
  filled?: boolean;
  className?: string;
};

/** 48 × 48 touch area with an optional 40 px tinted circle. */
export function IconButton({ icon, tone = 'plain', iconColor, filled, className = '', ...rest }: IconButtonProps) {
  const circle = tone === 'tonal' ? 'bg-surface-container-low' : tone === 'primary' ? 'bg-primary' : '';
  const color: ColorName = iconColor ?? (tone === 'primary' ? 'onPrimary' : 'onSurfaceVariant');
  return (
    <Pressable accessibilityRole="button" className={`h-12 w-12 items-center justify-center active:opacity-70 ${className}`} {...rest}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${circle}`}>
        <Icon name={icon} size={22} color={color} filled={filled} />
      </View>
    </Pressable>
  );
}
