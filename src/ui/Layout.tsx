import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { shadows, type ColorName } from '@/theme';

import { Button, IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { Logo, Sticker, type StickerName } from './Sticker';
import { Text } from './Text';

type CardProps = ViewProps & {
  tone?: 'lowest' | 'low' | 'container';
  shadow?: boolean;
  className?: string;
};

const toneClass = {
  lowest: 'bg-surface-container-lowest',
  low: 'bg-surface-container-low',
  container: 'bg-surface-container',
};

/** Paper card: 16 radius, warm shadow on white cards. */
export function Card({ tone = 'lowest', shadow = tone === 'lowest', className = '', style, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl p-space-md ${toneClass[tone]} ${className}`}
      style={[shadow && shadows.card, style]}
      {...rest}
    />
  );
}

type SectionHeaderProps = {
  title: string;
  icon?: IconName;
  iconColor?: ColorName;
  subtitle?: string;
  right?: ReactNode;
  size?: 'md' | 'sm';
};

export function SectionHeader({
  title,
  icon,
  iconColor = 'primary',
  subtitle,
  right,
  size = 'md',
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-space-sm">
        {icon ? <Icon name={icon} color={iconColor} /> : null}
        <View className="flex-1">
          <Text variant={size === 'md' ? 'headlineMd' : 'headlineSm'} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySm" color="onSurfaceVariant">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

type DateNavigatorProps = {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  /** The middle label jumps back to today/this week/this month (FR-08). */
  onLabelPress?: () => void;
  /** The label names what is on screen (no need to press it). */
  current?: boolean;
  previousLabel?: string;
  nextLabel?: string;
};

/** ‹ Today › pill used on Today, Week and Month. */
export function DateNavigator({
  label,
  onPrevious,
  onNext,
  onLabelPress,
  current = true,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: DateNavigatorProps) {
  return (
    <View className="flex-row items-center self-start rounded-full bg-surface-container-lowest" style={shadows.card}>
      <IconButton icon="chevron_left" accessibilityLabel={previousLabel} onPress={onPrevious} iconColor="onSurface" />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: current }}
        disabled={!onLabelPress}
        onPress={onLabelPress}
        className={`h-12 justify-center rounded-full ${current ? 'px-1' : 'bg-primary-fixed/60 px-3'}`}>
        <Text variant="labelMd" color="primary">
          {label}
        </Text>
      </Pressable>
      <IconButton icon="chevron_right" accessibilityLabel={nextLabel} onPress={onNext} iconColor="onSurface" />
    </View>
  );
}

/** Top bar for the tabs: logo, "Daybloom", section name, search. No profile button (no sign-in, D8). */
export function AppHeader({ section, onSearch }: { section: string; onSearch?: () => void }) {
  return (
    <View className="h-16 flex-row items-center justify-between bg-surface/95 pl-margin pr-2">
      <View className="flex-row items-center gap-space-sm" accessible accessibilityLabel={`Daybloom, ${section}`}>
        <Logo size={32} />
        <View>
          <Text variant="headlineSm" color="primary" style={{ lineHeight: 20 }}>
            Daybloom
          </Text>
          <Text variant="labelSm" color="onSurfaceVariant">
            {section}
          </Text>
        </View>
      </View>
      <IconButton icon="search" tone="tonal" accessibilityLabel="Search your plans" onPress={onSearch} />
    </View>
  );
}

/** Floating "+ Add" pill (one add button everywhere, DESIGN_REVIEW I7). */
export function Fab({ label = 'Add', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-14 flex-row items-center gap-2 self-end rounded-full bg-primary pl-5 pr-6 active:opacity-90"
      style={shadows.float}>
      <Icon name="add" color="onPrimary" />
      <Text variant="labelLg" color="onPrimary">
        {label}
      </Text>
    </Pressable>
  );
}

type EmptyStateProps = {
  title: string;
  text?: string;
  sticker?: StickerName;
  actionLabel?: string;
  onAction?: () => void;
};

/** Friendly sentence + one next step (UX-06). */
export function EmptyState({ title, text, sticker, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center gap-space-sm rounded-xl border-[1.5px] border-dashed border-outline-variant p-space-md">
      {sticker ? <Sticker name={sticker} size={64} rotate={-6} /> : null}
      <Text variant="bodyLg" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {text ? (
        <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
          {text}
        </Text>
      ) : null}
      {actionLabel ? <Button label={actionLabel} icon="add" onPress={onAction} /> : null}
    </View>
  );
}
