import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { periodRange, rangeMs } from '@/budget/money';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { ShapeCard } from '@/features/bankTexts/ShapeCard';
import { t } from '@/i18n';
import { money, shortDay } from '@/i18n/format';
import { toDayKey } from '@/calendar/dates';
import { ingest, readText, wasAdded, type Text as SmsText } from '@/sms/ingest';
import { learnShapes, messageId, type LearnedShape } from '@/sms/learn';
import { sms } from '@/sms/native';
import { labelFor, listSenders, saveSender, toSave } from '@/sms/store';
import { useUi } from '@/state/ui';
import { useTheme } from '@/theme';
import { Button, Checkbox, Page, Text, TextField } from '@/ui';

type Loaded = { readAt: number; recent: SmsText[]; month: SmsText[] };

/**
 * Learning one sender's texts (BU-11): Daybloom reads the newest 100, groups them by shape and says
 * what it thinks each kind is; the person corrects it, names the sender, picks which of this month's
 * payments to add, and saves.
 */
export default function LearnScreen() {
  const { address = '' } = useLocalSearchParams<{ address: string }>();
  const settings = useSettings();
  const today = useToday();
  const { colors } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const [loaded, setLoaded] = useState<Loaded | 'loading' | 'failed'>('loading');
  const [label, setLabel] = useState(
    () => listSenders(db).find((s) => s.address === address)?.label ?? labelFor(address),
  );
  const [shapes, setShapes] = useState<LearnedShape[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!sms || !address) return;
    const readAt = Date.now();
    const monthStart = rangeMs(periodRange(toDayKey(new Date(readAt)), 'month', 1)).from;
    Promise.all([sms.readTexts([address], 0, 100), sms.readTexts([address], monthStart - 1, 500)])
      .then(([recent, month]) => {
        setShapes(learnShapes(recent.map((x) => x.body)));
        setLoaded({ readAt, recent, month });
      })
      .catch(() => setLoaded('failed'));
  }, [address]);

  // this month's payments, read with the shapes as they are now, leaving out ones already added
  const payments = useMemo(() => {
    if (typeof loaded !== 'object') return [];
    const patterns = shapes.map((s) => ({ kind: s.kind, ...s.pattern }));
    return loaded.month.flatMap((text) => {
      const read = readText(patterns, text.body);
      if (read?.kind !== 'spend' || read.reading.amountCents <= 0 || wasAdded(db, address, text.body)) return [];
      return [{ id: messageId(address, text.body), text, reading: read.reading }];
    });
  }, [loaded, shapes, address]);

  const hasPayments = shapes.some((s) => s.kind === 'spend');
  const name = label.trim() || labelFor(address);

  const save = () => {
    if (typeof loaded !== 'object' || !hasPayments) return;
    saveSender(db, { address, label: name, shapes: shapes.map(toSave), readFrom: loaded.readAt });
    const chosen = payments.filter((p) => !skipped.has(p.id)).map((p) => p.text);
    const { added } = ingest(db, chosen, settings.currency);
    showToast(t.sms.saved(added.length));
    router.dismissTo('/bank-texts');
  };

  if (loaded === 'loading' || loaded === 'failed') {
    return (
      <Page title={t.sms.learnTitle}>
        <View className="items-center gap-space-md py-space-xl">
          {loaded === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
          <Text variant="bodyMd" color="onSurfaceVariant">
            {loaded === 'loading' ? t.sms.reading : t.sms.readFailed}
          </Text>
        </View>
      </Page>
    );
  }

  const toggle = (id: string, on: boolean) =>
    setSkipped((s) => {
      const next = new Set(s);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Page title={t.sms.learnTitle}>
      <View className="gap-1.5">
        <Text variant="labelMd" color="onSurfaceVariant">
          {t.sms.name}
        </Text>
        <TextField
          accessibilityLabel={t.sms.name}
          placeholder={t.sms.namePlaceholder}
          value={label}
          onChangeText={setLabel}
          className="h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
        />
        <Text variant="bodySm" color="onSurfaceVariant">
          {address}
        </Text>
      </View>

      <Text variant="bodyMd">{t.sms.found(shapes.length, loaded.recent.length)}</Text>
      {shapes.map((shape, i) => (
        <ShapeCard
          key={shape.pattern.regex}
          shape={shape}
          currency={settings.currency}
          onChange={(next) => setShapes((list) => list.map((s, j) => (j === i ? next : s)))}
        />
      ))}

      {hasPayments ? (
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text variant="headlineSm" accessibilityRole="header">
              {t.sms.thisMonth}
            </Text>
            {payments.length > 1 ? (
              <View className="flex-row">
                <Button label={t.sms.all} variant="text" size="md" onPress={() => setSkipped(new Set())} />
                <Button
                  label={t.sms.none}
                  variant="text"
                  size="md"
                  onPress={() => setSkipped(new Set(payments.map((p) => p.id)))}
                />
              </View>
            ) : null}
          </View>
          <Text variant="bodySm" color="onSurfaceVariant">
            {payments.length ? t.sms.thisMonthText : t.sms.noneThisMonth}
          </Text>
          {payments.map((p) => {
            const on = !skipped.has(p.id);
            const day = toDayKey(new Date(p.text.receivedAt));
            const what = t.sms.amountTo(money(p.reading.amountCents, settings.currency), p.reading.payee);
            const when = day === today ? t.common.today : shortDay(day);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${what}, ${when}`}
                onPress={() => toggle(p.id, !on)}
                className="min-h-touch flex-row items-center gap-1 rounded-xl active:bg-surface-container-low">
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <Checkbox checked={on} label={what} onChange={(v) => toggle(p.id, v)} />
                </View>
                <View className="flex-1">
                  <Text variant="bodyLg">{what}</Text>
                  <Text variant="bodySm" color="onSurfaceVariant">
                    {when}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {hasPayments ? (
        <Button label={t.sms.save(name)} fullWidth onPress={save} />
      ) : (
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.sms.noSpend}
        </Text>
      )}
    </Page>
  );
}
