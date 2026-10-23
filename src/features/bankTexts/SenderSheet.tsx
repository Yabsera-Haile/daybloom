import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { t } from '@/i18n';
import { removeSender, renameSender, setSenderEnabled, type Sender } from '@/sms/store';
import { useUi } from '@/state/ui';
import { Button, Row, Sheet, Switch, Text, TextField } from '@/ui';

/**
 * One sender: its name, on or off, learn its texts again, or stop reading it (BU-11). Changes are
 * kept when the sheet closes, and a short message says what happened.
 */
export function SenderSheet({ sender, onClose }: { sender: Sender; onClose: () => void }) {
  const showToast = useUi((s) => s.showToast);
  const [label, setLabel] = useState(sender.label);
  const [enabled, setEnabled] = useState(sender.enabled);
  const name = label.trim() || sender.label;

  /** Keeps what changed. Save always confirms; closing confirms only a change. */
  const finish = (saving: boolean) => {
    const renamed = name !== sender.label;
    const switched = enabled !== sender.enabled;
    if (renamed) renameSender(db, sender.id, name);
    if (switched) setSenderEnabled(db, sender.id, enabled);
    onClose();
    if (switched) showToast(enabled ? t.sms.turnedOn(name) : t.sms.turnedOff(name));
    else if (renamed || saving) showToast(t.sms.senderSaved);
  };

  return (
    <Sheet visible onClose={() => finish(false)} title={t.sms.senderTitle} closeButton>
      <View className="gap-space-md pb-space-sm">
        <View className="gap-1.5">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.sms.name}
          </Text>
          <TextField
            accessibilityLabel={t.sms.name}
            placeholder={t.sms.namePlaceholder}
            value={label}
            onChangeText={setLabel}
            onSubmitEditing={() => finish(true)}
            returnKeyType="done"
            className="h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3"
          />
          <Text variant="bodySm" color="onSurfaceVariant">
            {sender.address}
          </Text>
        </View>
        <View className="-mx-space-md">
          <Row
            first
            icon="sms"
            title={t.sms.readOn}
            subtitle={enabled ? t.sms.readOnText(name) : t.sms.readOffText}
            right={
              // flips from what it shows now, however quickly it's tapped
              <Switch value={enabled} label={t.sms.readOn} onChange={() => setEnabled((on) => !on)} />
            }
          />
        </View>
        <Button label={t.common.save} fullWidth onPress={() => finish(true)} />
        <Button
          label={t.sms.learnAgain}
          icon="autorenew"
          variant="outline"
          fullWidth
          onPress={() => {
            if (name !== sender.label) renameSender(db, sender.id, name);
            onClose();
            router.push({ pathname: '/bank-texts/learn', params: { address: sender.address } });
          }}
        />
        <View className="gap-1">
          <Button
            label={t.sms.remove}
            icon="delete"
            variant="danger"
            fullWidth
            onPress={() => {
              removeSender(db, sender.id);
              onClose();
              showToast(t.sms.removed);
            }}
          />
          <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            {t.sms.removeText}
          </Text>
        </View>
      </View>
    </Sheet>
  );
}
