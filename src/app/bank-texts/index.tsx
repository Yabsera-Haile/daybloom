import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { SenderSheet } from '@/features/bankTexts/SenderSheet';
import { TeachSheet } from '@/features/bankTexts/TeachSheet';
import { t } from '@/i18n';
import { saveSetting } from '@/settings';
import { askToReadTexts, sms } from '@/sms/native';
import { listSenders, listUnmatched, patternsOf, type Sender, type Unmatched } from '@/sms/store';
import { Button, Card, Icon, Page, Row, RowGroup, Sticker, Switch, Text } from '@/ui';

/**
 * Expenses from bank texts (BU-11, D18), from More: first an explanation and the permission, then
 * the senders being read, "Ask what each payment was for" (best as a pop-up over other apps), and
 * texts Daybloom didn't understand.
 */
export default function BankTextsScreen() {
  const settings = useSettings();
  const senders = useLive(() => listSenders(db).map((s) => ({ ...s, shapes: patternsOf(db, s.id).length })), []);
  const unread = useLive(() => listUnmatched(db), []);
  const [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState<Sender | null>(null);
  const [teaching, setTeaching] = useState<Unmatched | null>(null);
  // "Appear on top" is allowed in the phone's settings: check again on coming back from there
  const [popUp, setPopUp] = useState(() => sms?.canPopUp() ?? false);
  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') setPopUp(sms?.canPopUp() ?? false);
    });
    return () => app.remove();
  }, []);

  const pick = async () => {
    if (await askToReadTexts()) {
      setDenied(false);
      router.push('/bank-texts/senders');
    } else setDenied(true);
  };

  if (!sms) {
    return (
      <Page title={t.sms.title}>
        <Card className="items-center gap-space-md p-space-lg">
          <Sticker name="savings" size={72} />
          <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            {Platform.OS === 'android' ? t.sms.needsApp : t.sms.androidOnly}
          </Text>
        </Card>
      </Page>
    );
  }

  const permission = denied ? (
    <Card tone="low" shadow={false} className="gap-space-sm p-space-md">
      <Text variant="bodyMd">{t.sms.denied}</Text>
      <Button label={t.sms.openSettings} variant="outline" icon="open_in_new" onPress={() => Linking.openSettings()} />
    </Card>
  ) : null;

  if (!senders.length) {
    return (
      <Page title={t.sms.title}>
        <Card className="items-center gap-space-md p-space-lg">
          <Sticker name="savings" size={88} />
          <Text variant="headlineSm" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t.sms.introTitle}
          </Text>
          <View className="gap-space-sm self-stretch">
            {t.sms.introPoints.map((point) => (
              <View key={point} className="flex-row gap-space-sm">
                <Icon name="check_circle" size={20} color="primary" />
                <Text variant="bodyMd" color="onSurfaceVariant" style={{ flex: 1 }}>
                  {point}
                </Text>
              </View>
            ))}
          </View>
          <Button label={t.sms.start} icon="sms" fullWidth onPress={pick} />
        </Card>
        {permission}
      </Page>
    );
  }

  return (
    <Page title={t.sms.title}>
      <RowGroup heading={t.sms.senders}>
        {senders.map((s, i) => (
          <Row
            key={s.id}
            first={i === 0}
            icon="sms"
            title={s.label}
            subtitle={[s.address, s.enabled ? t.sms.shapes(s.shapes) : t.sms.off].join(' · ')}
            onPress={() => setEditing(s)}
          />
        ))}
        <Row icon="add" title={t.sms.addSender} onPress={pick} />
      </RowGroup>
      {permission}

      <RowGroup heading={t.sms.payments}>
        <Row
          first
          icon="notifications_active"
          title={t.sms.ask}
          subtitle={t.sms.askText}
          right={<Switch value={settings.smsAsk} label={t.sms.ask} onChange={(v) => saveSetting(db, 'smsAsk', v)} />}
        />
        {settings.smsAsk ? (
          <Row
            icon={popUp ? 'check_circle' : 'mobile'}
            title={popUp ? t.sms.popUpOn : t.sms.popUp}
            subtitle={popUp ? t.sms.popUpOnText : t.sms.popUpText}
            right={
              popUp ? undefined : <Button label={t.sms.allow} size="md" onPress={() => sms?.openPopUpSettings()} />
            }
          />
        ) : null}
      </RowGroup>

      {unread.length ? (
        <View className="gap-2">
          <Text
            variant="labelMd"
            color="onSurfaceVariant"
            accessibilityRole="header"
            style={{ textTransform: 'uppercase' }}>
            {`${t.sms.unread} (${unread.length})`}
          </Text>
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.sms.unreadText}
          </Text>
          {unread.slice(0, 20).map((u) => (
            <Pressable
              key={u.id}
              accessibilityRole="button"
              accessibilityHint={t.sms.teachTitle}
              onPress={() => setTeaching(u)}
              className="active:opacity-80">
              <Card className="flex-row items-center gap-space-sm p-space-md">
                <Text variant="bodyMd" color="onSurfaceVariant" numberOfLines={3} style={{ flex: 1 }}>
                  {u.body}
                </Text>
                <Icon name="chevron_right" />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-start justify-center gap-1 px-space-md">
        <Icon name="lock" size={16} />
        <Text variant="bodySm" color="onSurfaceVariant" style={{ flexShrink: 1 }}>
          {t.sms.privacy}
        </Text>
      </View>

      {editing ? <SenderSheet sender={editing} onClose={() => setEditing(null)} /> : null}
      {teaching ? <TeachSheet text={teaching} onClose={() => setTeaching(null)} /> : null}
    </Page>
  );
}
