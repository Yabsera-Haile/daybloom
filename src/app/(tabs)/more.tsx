import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { TabScreen } from '@/features/TabScreen';
import { t } from '@/i18n';
import { Icon, Row, RowGroup, Text, type IconName } from '@/ui';

type Item = { icon: IconName; title: string; detail?: string; href?: Href };

const sections: { heading: string; rows: Item[] }[] = [
  { heading: t.more.notebook, rows: [{ icon: 'savings', title: t.more.budget, detail: t.more.budgetLater }] },
  {
    heading: t.more.app,
    rows: [
      { icon: 'settings', title: t.more.settings, href: '/settings' },
      { icon: 'notifications_active', title: t.more.help, detail: t.more.helpText, href: '/reminder-help' },
      ...(__DEV__
        ? [{ icon: 'palette' as IconName, title: t.more.gallery, detail: t.more.galleryText, href: '/gallery' as Href }]
        : []),
    ],
  },
];

/** More (was "Hub", D6): Budget (M3), Settings, reminder help. No profile or account (D8). */
export default function MoreScreen() {
  return (
    <TabScreen section={t.tabs.more}>
      {sections.map((section) => (
        <RowGroup key={section.heading} heading={section.heading}>
          {section.rows.map((row, i) => (
            <Row
              key={row.title}
              first={i === 0}
              icon={row.icon}
              title={row.title}
              subtitle={row.detail}
              onPress={row.href ? () => router.push(row.href!) : undefined}
            />
          ))}
        </RowGroup>
      ))}
      <View className="flex-row items-center justify-center gap-1">
        <Icon name="lock" size={16} />
        <Text variant="bodySm" color="onSurfaceVariant">
          {t.more.private}
        </Text>
      </View>
    </TabScreen>
  );
}
