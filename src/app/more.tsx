import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { t } from '@/i18n';
import { Button, Icon, Page, Row, RowGroup, Sheet, StatusBadge, Text, type IconName } from '@/ui';

type Item = { icon: IconName; title: string; detail?: string; href?: Href; onPress?: () => void; right?: ReactNode };

/**
 * More (D6), opened from the ≡ button in the header now that Budget has its tab: spending
 * categories, bank texts (next version), Settings, reminder help. No profile or account (D8).
 */
export default function MoreScreen() {
  const [bankTexts, setBankTexts] = useState(false);
  const sections: { heading: string; rows: Item[] }[] = [
    {
      heading: t.more.money,
      rows: [
        { icon: 'sell', title: t.more.categories, detail: t.more.categoriesText, href: '/spending-categories' },
        {
          icon: 'sms',
          title: t.more.bankTexts,
          detail: t.more.bankTextsSoon,
          onPress: () => setBankTexts(true),
          right: (
            <View>
              <StatusBadge label={t.more.soon} />
            </View>
          ),
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

      {bankTexts ? (
        <Sheet visible onClose={() => setBankTexts(false)} title={t.more.bankTextsTitle} closeButton>
          <View className="gap-space-md pb-space-sm">
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t.more.bankTextsText}
            </Text>
            <Button label={t.more.gotIt} fullWidth onPress={() => setBankTexts(false)} />
          </View>
        </Sheet>
      ) : null}
    </Page>
  );
}
