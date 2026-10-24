// Small pictures of the bank-texts screens for the tour (ON-02): what you'll see at each step, drawn
// with the app's own colours rather than screenshots, so they follow the theme. Hidden from screen
// readers; the card's words say the same.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { shadows, useTheme } from '@/theme';
import { Icon, Text } from '@/ui';

export type PictureId = 'senders' | 'kinds' | 'month' | 'popUp' | 'fees';

function Frame({ children }: { children: ReactNode }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="gap-2 rounded-2xl bg-surface-container-low p-space-sm">
      {children}
    </View>
  );
}

function Chip({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <View
      className={`h-8 justify-center rounded-full px-3 ${on ? 'bg-primary' : 'border-[1.5px] border-outline-variant bg-surface-container-lowest'}`}>
      <Text variant="labelMd" color={on ? 'onPrimary' : 'onSurface'}>
        {label}
      </Text>
    </View>
  );
}

function Row({ icon, title, detail, right }: { icon: 'sms' | 'sell'; title: string; detail: string; right?: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-surface-container-lowest px-3 py-2" style={shadows.card}>
      <Icon name={icon} size={20} />
      <View className="flex-1">
        <Text variant="labelLg">{title}</Text>
        <Text variant="labelSm" color="onSurfaceVariant">
          {detail}
        </Text>
      </View>
      {right ? <Text variant="labelLg">{right}</Text> : null}
    </View>
  );
}

export function TourPicture({ id }: { id: PictureId }) {
  const { currency } = useSettings();
  const { colors } = useTheme();
  const p = t.tour.pictures;
  if (id === 'senders') {
    return (
      <Frame>
        <Text variant="labelSm" color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>
          {t.sms.moneySenders}
        </Text>
        <Row icon="sms" title="M-Money" detail={p.sendersDetail} right="›" />
      </Frame>
    );
  }
  if (id === 'kinds') {
    return (
      <Frame>
        <Text variant="labelSm" color="onSurfaceVariant">
          {t.sms.likeThis(27)}
        </Text>
        <Text variant="bodySm">
          {p.kindsBefore}
          <Text variant="labelMd" color="onPrimaryFixed" style={{ backgroundColor: colors.primaryFixed }}>
            {' 7,380 '}
          </Text>
          {p.kindsAfter(currency)}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          <Chip label={t.sms.kinds.spend} on />
          <Chip label={t.sms.kinds.income} />
          <Chip label={t.sms.kinds.ignore} />
        </View>
      </Frame>
    );
  }
  if (id === 'month') {
    return (
      <Frame>
        {[p.monthOne, p.monthTwo].map((line) => (
          <View key={line} className="flex-row items-center gap-2">
            <View className="h-5 w-5 items-center justify-center rounded-md bg-primary">
              <Icon name="check" size={14} color="onPrimary" />
            </View>
            <Text variant="bodySm">{line}</Text>
          </View>
        ))}
      </Frame>
    );
  }
  if (id === 'popUp') {
    return (
      <Frame>
        <View className="gap-1.5 rounded-2xl bg-surface-container-lowest p-3" style={shadows.float}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {p.popUpHeading}
          </Text>
          <Text variant="headlineSm">{t.sms.askTitle}</Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Chip label={t.budget.starterCategories.dining} on />
            <Chip label={t.budget.starterCategories.groceries} />
          </View>
        </View>
      </Frame>
    );
  }
  return (
    <Frame>
      <Row icon="sms" title={p.feesPayment} detail={p.feesPaymentDetail} right="1,200" />
      <Row icon="sell" title={p.feesFee} detail={t.sms.feesCategory} right="20" />
    </Frame>
  );
}
