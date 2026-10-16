import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useToday } from '@/data/hooks';
import { t } from '@/i18n';
import { shortDay } from '@/i18n/format';
import { mentionsMoney } from '@/sms/learn';
import { sms, type SenderSummary } from '@/sms/native';
import { listSenders } from '@/sms/store';
import { useTheme } from '@/theme';
import { Button, Page, Row, RowGroup, StatusBadge, Text } from '@/ui';

/**
 * "Pick a sender" (BU-11): who sent the newest texts on the phone, those whose texts mention money
 * first. Only names and counts are shown here; a sender's texts are read once it is picked.
 */
export default function SendersScreen() {
  const today = useToday();
  const { colors } = useTheme();
  const [list, setList] = useState<SenderSummary[] | 'loading' | 'failed'>('loading');
  const [showAll, setShowAll] = useState(false);
  const added = useMemo(() => new Set(listSenders(db).map((s) => s.address)), []);

  useEffect(() => {
    sms
      ?.listSenders(3000, 20)
      .then(setList)
      .catch(() => setList('failed'));
  }, []);

  const groups = useMemo(() => {
    if (!Array.isArray(list)) return null;
    const scored = list.map((s) => ({ ...s, money: s.samples.filter(mentionsMoney).length }));
    return {
      money: scored.filter((s) => s.money > 0).sort((a, b) => b.money - a.money || b.count - a.count),
      other: scored.filter((s) => s.money === 0).sort((a, b) => b.lastAt - a.lastAt),
    };
  }, [list]);

  if (!groups) {
    return (
      <Page title={t.sms.pickTitle}>
        <View className="items-center gap-space-md py-space-xl">
          {list === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
          <Text variant="bodyMd" color="onSurfaceVariant">
            {list === 'loading' ? t.sms.reading : t.sms.readFailed}
          </Text>
        </View>
      </Page>
    );
  }

  const rows = (senders: (SenderSummary & { money: number })[]) =>
    senders.map((s, i) => {
      const day = toDayKey(new Date(s.lastAt));
      return (
        <Row
          key={s.address}
          first={i === 0}
          icon="sms"
          title={s.address}
          subtitle={`${t.sms.texts(s.count)} · ${t.sms.lastText(day === today ? t.sms.today : shortDay(day))}`}
          right={added.has(s.address) ? <StatusBadge label={t.sms.added} /> : undefined}
          onPress={() => router.push({ pathname: '/bank-texts/learn', params: { address: s.address } })}
        />
      );
    });

  return (
    <Page title={t.sms.pickTitle}>
      <Text variant="bodyMd" color="onSurfaceVariant">
        {groups.money.length || groups.other.length ? t.sms.pickIntro : t.sms.noTexts}
      </Text>
      {groups.money.length ? <RowGroup heading={t.sms.moneySenders}>{rows(groups.money)}</RowGroup> : null}
      {groups.other.length ? (
        showAll || !groups.money.length ? (
          <RowGroup heading={t.sms.otherSenders}>{rows(groups.other)}</RowGroup>
        ) : (
          <Button label={t.sms.showAll} variant="outline" fullWidth onPress={() => setShowAll(true)} />
        )
      ) : null}
    </Page>
  );
}
