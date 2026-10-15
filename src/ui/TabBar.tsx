import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const tabIcons: Record<string, IconName> = {
  index: 'today',
  week: 'view_week',
  month: 'calendar_month',
  habits: 'spa',
  budget: 'account_balance_wallet',
};

/** Bottom tabs from the v2 design: icon + 12px label, active item in a soft sage pill. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-around bg-surface/95 px-1 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8), boxShadow: '0px -2px 12px rgba(45, 41, 38, 0.06)' }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            className={`h-14 min-w-[64px] items-center justify-center gap-0.5 rounded-2xl px-2 ${focused ? 'bg-primary-fixed/60' : ''}`}>
            <Icon name={tabIcons[route.name] ?? 'today'} filled={focused} color={focused ? 'primary' : 'onSurfaceVariant'} />
            <Text variant="labelSm" color={focused ? 'primary' : 'onSurfaceVariant'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
