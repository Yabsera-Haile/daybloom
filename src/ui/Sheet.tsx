import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { shadows } from '@/theme';

import { IconButton } from './Button';
import { Text } from './Text';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Heading; also what a screen reader announces. */
  title?: string;
  /** Small line above the title, e.g. "To-do · Due 5:00 PM". */
  eyebrow?: string;
  /** Line under the title, e.g. "For Wednesday, Oct 23". */
  subtitle?: string;
  /** Show the round close button next to the title. */
  closeButton?: boolean;
  /** Content runs edge to edge (menus); otherwise it gets the page margin. */
  flush?: boolean;
};

/**
 * Bottom sheet from the designs: scrim, handle, rounded top. The Android back button and a tap on
 * the scrim close it. Slides in (no motion when the phone asks to reduce it).
 */
export function Sheet({
  visible,
  onClose,
  children,
  title,
  eyebrow,
  subtitle,
  closeButton = false,
  flush = false,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={onClose}
          className="absolute inset-0 bg-scrim/30"
        />
        <Animated.View
          entering={SlideInDown.duration(220)}
          accessibilityViewIsModal
          className="max-h-[90%] rounded-t-2xl bg-surface-container-lowest pt-3"
          style={[shadows.float, { paddingBottom: insets.bottom + 16 }]}>
          <View className="mb-space-sm h-1.5 w-12 self-center rounded-full bg-surface-variant" />
          {title ? (
            <View className="flex-row items-start justify-between gap-2 px-margin pb-space-sm">
              <View className="flex-1">
                {eyebrow ? (
                  <Text variant="labelSm" color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>
                    {eyebrow}
                  </Text>
                ) : null}
                <Text variant="headlineMd" accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="bodyMd" color="onSurfaceVariant">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {closeButton ? (
                <IconButton
                  icon="close"
                  tone="tonal"
                  accessibilityLabel={t.common.close}
                  onPress={onClose}
                  iconColor="onSurface"
                />
              ) : null}
            </View>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerClassName={flush ? '' : 'px-margin'}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
