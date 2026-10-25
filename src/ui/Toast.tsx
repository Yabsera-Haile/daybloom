import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useUi } from '@/state/ui';
import { shadows } from '@/theme';

import { Text } from './Text';
import { MAX } from './wide';

/** FR-02: a note with Undo stays at least 5 seconds, so there's time to tap it. */
const UNDO_MS = 5000;
/** A note that something was done: about a second, a little longer for more words. */
const doneFor = (message: string) => Math.min(3000, 1000 + message.length * 25);

/**
 * "Event deleted · Undo" above the tabs (UX-04): a soft sage pill in the app's colours. A tap on
 * it puts it away.
 */
export function Toast() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, toast.undo ? UNDO_MS : doneFor(toast.message));
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(160)}
      exiting={FadeOut.duration(140)}
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-margin"
      style={{ bottom: insets.bottom + 160 /* above the tab bar and the "+ Add" button */ }}>
      <Pressable
        accessibilityLiveRegion="polite"
        accessibilityHint={t.common.close}
        onPress={hide}
        className="min-h-touch flex-row items-center gap-1 rounded-full border border-primary/15 bg-primary-fixed pl-space-md pr-1"
        style={[shadows.float, { maxWidth: MAX.toast }]}>
        <Text variant="bodyMd" color="onPrimaryFixed" style={{ flexShrink: 1, paddingVertical: 12 }}>
          {toast.message}
        </Text>
        {toast.undo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.common.undo}: ${toast.message}`}
            onPress={() => {
              toast.undo?.();
              hide();
            }}
            className="h-12 justify-center rounded-full px-4 active:opacity-70">
            <Text variant="labelLg" color="primary">
              {t.common.undo}
            </Text>
          </Pressable>
        ) : (
          <View className="w-3" />
        )}
      </Pressable>
    </Animated.View>
  );
}
