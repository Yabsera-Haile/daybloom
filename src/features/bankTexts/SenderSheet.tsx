import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { t } from '@/i18n';
import { removeSender, renameSender, setSenderEnabled, type Sender } from '@/sms/store';
import { useUi } from '@/state/ui';
import { Button, Row, Sheet, Switch, Text, TextField } from '@/ui';

/** One sender: its name, on or off, learn its texts again, or stop reading it (BU-11). */
export function SenderSheet({ sender, onClose }: { sender: Sender; onClose: () => void }) {
  const showToast = useUi((s) => s.showToast);
  const [label, setLabel] = useState(sender.label);
  const [enabled, setEnabled] = useState(sender.enabled);

  const close = () => {
    renameSender(db, sender.id, label);
    onClose();
  };

  return (
    <Sheet visible onClose={close} title={t.sms.senderTitle} closeButton>
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
            onSubmitEditing={close}
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
            right={
              <Switch
                value={enabled}
                label={t.sms.readOn}
                onChange={(v) => {
                  setEnabled(v);
                  setSenderEnabled(db, sender.id, v);
                }}
              />
            }
          />
        </View>
        <Button label={t.common.save} fullWidth onPress={close} />
        <Button
          label={t.sms.learnAgain}
          icon="autorenew"
          variant="outline"
          fullWidth
          onPress={() => {
            close();
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
