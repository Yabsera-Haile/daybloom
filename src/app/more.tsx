import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { listSenders } from '@/sms/store';
import { Icon, Page, Row, RowGroup, Text, type IconName } from '@/ui';

type Item = { icon: IconName; title: string; detail?: string; href?: Href; onPress?: () => void; right?: ReactNode };

/**
 * More (D6), opened from the ≡ button in the header now that Budget has its tab: spending
 * categories, expenses from bank texts, Settings, reminder help. No profile or account (D8).
 */
export default function MoreScreen() {
  const reading = useLive(
    () =>
      listSenders(db)
        .filter((s) => s.enabled)
        .map((s) => s.label),
    [],
  );
  const sections: { heading: string; rows: Item[] }[] = [
    {
      heading: t.more.money,
      rows: [
        { icon: 'sell', title: t.more.categories, detail: t.more.categoriesText, href: '/spending-categories' },
        {
          icon: 'sms',
          title: t.more.bankTexts,
          detail: reading.length ? t.more.bankTextsOn(t.list(reading)) : t.more.bankTextsText,
          href: '/bank-texts',
        },
      ],
    },
    {
      heading: t.more.app,
      rows: [
        { icon: 'settings', title: t.more.settings, href: '/settings' },
        { icon: 'notifications_active', title: t.more.help, detail: t.more.helpText, href: '/reminder-help' },
        ...(__DEV__
          ? [
              {
                icon: 'palette' as IconName,
                title: t.more.gallery,
                detail: t.more.galleryText,
                href: '/gallery' as Href,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <Page title={t.tabs.more}>
      {sections.map((section) => (
        <RowGroup key={section.heading} heading={section.heading}>
          {section.rows.map((row, i) => (
            <Row
              key={row.title}
              first={i === 0}
              icon={row.icon}
              title={row.title}
              subtitle={row.detail}
              right={row.right}
              onPress={row.onPress ?? (row.href ? () => router.push(row.href!) : undefined)}
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
    </Page>
  );
}
