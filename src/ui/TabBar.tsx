import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { useTourTarget, type TargetId } from './tourTarget';
import { RAIL, useWide } from './wide';

const tabIcons: Record<string, IconName> = {
  index: 'today',
  week: 'view_week',
  month: 'calendar_month',
  habits: 'spa',
  budget: 'account_balance_wallet',
};

const ITEM = 56;
const TOP = 8;

/**
 * Height of the tab bar, gesture bar included: pages leave this much room at the bottom. With the
 * tabs in a rail on the left (wide screens), only the gesture bar.
 */
export function useTabBarHeight(): number {
  const bottom = useSafeAreaInsets().bottom;
  const { rail } = useWide();
  return rail ? bottom : TOP + ITEM + Math.max(bottom, 8);
}

type ItemProps = { name: string; label: string; focused: boolean; onPress: () => void; rail?: boolean };

function TabItem({ name, label, focused, onPress, rail = false }: ItemProps) {
  // the tour points at each tab
  const ref = useTourTarget<View>(`tab-${name}` as TargetId);
  return (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`items-center justify-center gap-0.5 rounded-2xl px-2 ${rail ? 'h-16 w-full' : 'h-14 min-w-[56px] flex-shrink'} ${focused ? 'bg-primary-fixed/60' : ''}`}>
      <Icon name={tabIcons[name] ?? 'today'} filled={focused} color={focused ? 'primary' : 'onSurfaceVariant'} />
      <Text
        variant="labelSm"
        color={focused ? 'primary' : 'onSurfaceVariant'}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Bottom tabs from the v2 design: icon + 12px label, active item in a soft sage pill. It floats over
 * the page; each tab page draws the frosted glass behind it (SH-03, features/TabScreen). On a wide
 * screen the same tabs stand in a rail down the left, in the middle where thumbs reach (D20).
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const height = useTabBarHeight();
  const { rail } = useWide();
  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return <TabItem key={route.key} name={route.name} label={label} focused={focused} onPress={onPress} rail={rail} />;
  });
  if (rail) {
    return (
      <View
        className="justify-center gap-space-sm border-r border-surface-variant/70 bg-surface px-2"
        style={{ width: RAIL + insets.left, paddingLeft: insets.left + 8, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {items}
      </View>
    );
  }
  return (
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-start justify-around border-t border-surface-variant/70 px-1"
      style={{ height, paddingTop: TOP, paddingBottom: Math.max(insets.bottom, 8) }}>
      {items}
    </View>
  );
}
