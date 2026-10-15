import { BlurTargetView, BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { forwardRef, useRef, type ReactNode, type RefObject } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/theme';
import { AppHeader, Fab, useTabBarHeight } from '@/ui';

type TabScreenProps = {
  /** Shown under "Daybloom" in the header (TD-04: the viewed date when it isn't today). */
  section: string;
  children: ReactNode;
  /** Today, Week and Month show the "+ Add" button (UX-09); Budget its own "+ Add expense". */
  onAdd?: () => void;
  addLabel?: string;
  /** Swipe left = 1 (next), right = -1 (previous) (TD-02, WK-02, MO-01). */
  onSwipe?: (direction: 1 | -1) => void;
};

const HEADER = layout.headerHeight;

/** How much of the page the floating header covers (for scrolling something just below it). */
export function useHeaderOffset(): number {
  return useSafeAreaInsets().top + HEADER + 8;
}

/**
 * Frosted glass over the page (SH-03): a blur of what scrolls underneath with the paper color
 * over it, so text on top keeps its contrast. Phones before Android 12 get the paper color alone.
 */
function Frost({ target }: { target: RefObject<View | null> }) {
  return (
    <>
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={40}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute inset-0 bg-surface/80" />
    </>
  );
}

/**
 * Shared frame for the five tabs: frosted header on top, scrolling paper page, optional "+ Add",
 * and a frosted strip behind the floating tab bar.
 */
export const TabScreen = forwardRef<ScrollView, TabScreenProps>(function TabScreen(
  { section, children, onAdd, addLabel, onSwipe },
  ref,
) {
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarHeight();
  const target = useRef<View | null>(null);
  const swipe = Gesture.Pan()
    .enabled(!!onSwipe)
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 64 && Math.abs(e.velocityX) > 150) onSwipe?.(e.translationX < 0 ? 1 : -1);
    });
  return (
    // the page shrinks above the keyboard so inline forms stay visible
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface">
      <BlurTargetView ref={target} style={{ flex: 1 }} className="bg-surface">
        <GestureDetector gesture={swipe}>
          <ScrollView
            ref={ref}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-space-md px-margin"
            // room for the tab bar and the "+ Add" button at the end
            contentContainerStyle={{ paddingTop: insets.top + HEADER + 8, paddingBottom: tabBar + 96 }}
            scrollIndicatorInsets={{ top: insets.top + HEADER, bottom: tabBar }}>
            {children}
          </ScrollView>
        </GestureDetector>
      </BlurTargetView>
      {/* the page scrolls underneath the header and the tab bar (SH-03) */}
      <View className="absolute left-0 right-0 top-0" style={{ paddingTop: insets.top }}>
        <Frost target={target} />
        <AppHeader section={section} onSearch={() => router.push('/search')} onMore={() => router.push('/more')} />
      </View>
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0" style={{ height: tabBar }}>
        <Frost target={target} />
      </View>
      {onAdd ? (
        <View className="absolute right-margin" style={{ bottom: tabBar + 16 }}>
          <Fab label={addLabel} onPress={onAdd} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
});
