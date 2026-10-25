import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useUi } from '@/state/ui';
import { shadows } from '@/theme';

import { Text } from './Text';
import { centred, MAX } from './wide';

const SHOW_MS = 7000; // FR-02: Undo stays at least 5 seconds

/** "Event deleted · Undo" bar above the tabs (UX-04). */
export function Toast() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(180)}
      exiting={FadeOut.duration(150)}
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-margin"
      style={{ bottom: insets.bottom + 160 /* above the tab bar and the "+ Add" button */ }}>
      <View
        accessibilityLiveRegion="polite"
        className="min-h-touch flex-row items-center justify-between gap-2 rounded-2xl bg-inverse-surface pl-space-md pr-1"
        style={[shadows.float, centred(MAX.toast)]}>
        <Text variant="bodyMd" color="inverseOnSurface" style={{ flex: 1, paddingVertical: 12 }}>
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
            <Text variant="labelLg" color="inversePrimary">
              {t.common.undo}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
