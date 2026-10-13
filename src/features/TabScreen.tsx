import { router } from 'expo-router';
import { forwardRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/theme';
import { AppHeader, Fab } from '@/ui';

type TabScreenProps = {
  /** Shown under "Daybloom" in the header (TD-04: the viewed date when it isn't today). */
  section: string;
  children: ReactNode;
  /** Today, Week and Month show the "+ Add" button (UX-09). */
  onAdd?: () => void;
  /** Swipe left = 1 (next), right = -1 (previous) (TD-02, WK-02, MO-01). */
  onSwipe?: (direction: 1 | -1) => void;
};

const HEADER = layout.headerHeight;

/** How much of the page the floating header covers (for scrolling something just below it). */
export function useHeaderOffset(): number {
  return useSafeAreaInsets().top + HEADER + 8;
}

/** Shared frame for the five tabs: header on top, scrolling paper page, optional "+ Add". */
export const TabScreen = forwardRef<ScrollView, TabScreenProps>(function TabScreen(
  { section, children, onAdd, onSwipe },
  ref,
) {
  const insets = useSafeAreaInsets();
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
      <GestureDetector gesture={swipe}>
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-space-md px-margin pb-32"
          contentContainerStyle={{ paddingTop: insets.top + HEADER + 8 }}
          scrollIndicatorInsets={{ top: insets.top + HEADER }}>
          {children}
        </ScrollView>
      </GestureDetector>
      {/* translucent paper header; the page scrolls underneath it (SH-03) */}
      <View className="absolute left-0 right-0 top-0 bg-surface/95" style={{ paddingTop: insets.top }}>
        <AppHeader section={section} onSearch={() => router.push('/search')} />
      </View>
      {onAdd ? (
        <View className="absolute bottom-4 right-margin">
          <Fab onPress={onAdd} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
});
