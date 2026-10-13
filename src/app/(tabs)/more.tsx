import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { TabScreen } from '@/features/TabScreen';
import { shadows } from '@/theme';
import { Icon, Text, type IconName } from '@/ui';

type Row = { icon: IconName; title: string; detail: string; href?: Href };

const sections: { heading: string; rows: Row[] }[] = [
  { heading: 'Your notebook', rows: [{ icon: 'savings', title: 'Budget', detail: 'Coming in milestone M3' }] },
  {
    heading: 'App',
    rows: [
      { icon: 'settings', title: 'Settings', detail: 'Coming in milestone M1' },
      { icon: 'notifications_active', title: 'Reminders not arriving?', detail: 'Coming in milestone M1' },
      { icon: 'palette', title: 'Component gallery', detail: 'Check the building blocks against the designs', href: '/gallery' },
    ],
  },
];

export default function MoreScreen() {
  return (
    <TabScreen section="More">
      {sections.map((section) => (
        <View key={section.heading} className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant" accessibilityRole="header" style={{ textTransform: 'uppercase' }}>
            {section.heading}
          </Text>
          <View className="rounded-2xl bg-surface-container-lowest" style={shadows.card}>
            {section.rows.map((row, i) => (
              <Pressable
                key={row.title}
                accessibilityRole="button"
                disabled={!row.href}
                onPress={() => row.href && router.push(row.href)}
                className={`min-h-[60px] flex-row items-center gap-space-md px-space-md py-2 active:opacity-70 ${i > 0 ? 'border-t border-surface-variant' : ''}`}>
                <Icon name={row.icon} />
                <View className="flex-1">
                  <Text variant="bodyLg">{row.title}</Text>
                  <Text variant="bodySm" color="onSurfaceVariant">
                    {row.detail}
                  </Text>
                </View>
                {row.href ? <Icon name="chevron_right" /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <View className="flex-row items-center justify-center gap-1">
        <Icon name="lock" size={16} />
        <Text variant="bodySm" color="onSurfaceVariant">
          Everything stays on this phone. No account needed.
        </Text>
      </View>
    </TabScreen>
  );
}
