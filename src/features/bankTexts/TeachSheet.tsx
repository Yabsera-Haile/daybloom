import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { retryUnmatched } from '@/sms/ingest';
import { shapeOf } from '@/sms/learn';
import { addPattern, dismissUnmatched, getUnmatched, toSave, type Unmatched } from '@/sms/store';
import { useUi } from '@/state/ui';
import { Button, Card, Segmented, Sheet, Text } from '@/ui';

import { AmountChips, FeeChips, MarkedText, ReadsAs } from './parts';

/**
 * A text that looked like a payment but had no known shape (BU-11): the person says whether it is
 * one and which number is the amount, and Daybloom learns texts like it from then on.
 */
export function TeachSheet({ textId }: { textId: string }) {
  const closeSheet = useUi((s) => s.closeSheet);
  const [text] = useState(() => getUnmatched(db, textId));
  return text ? <TeachForm text={text} onClose={closeSheet} /> : null;
}

function TeachForm({ text, onClose }: { text: Unmatched; onClose: () => void }) {
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  const [shape, setShape] = useState(() => shapeOf(text.body, 'spend'));
  const payment = shape.kind === 'spend';

  const save = () => {
    addPattern(db, text.senderId, toSave(shape));
    const added = retryUnmatched(db, text.senderId, settings.currency);
    onClose();
    showToast(t.sms.taught(added));
  };

  return (
    <Sheet visible onClose={onClose} title={t.sms.teachTitle} closeButton>
      <View className="gap-space-md pb-space-sm">
        <Card tone="low" shadow={false} className="p-space-md">
          <MarkedText
            pattern={payment ? shape.pattern : { ...shape.pattern, amountGroup: null }}
            body={text.body}
            groups={shape.amountGroups}
          />
        </Card>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.sms.isPayment}
          </Text>
          <Segmented
            value={payment ? 'spend' : 'ignore'}
            options={[
              { value: 'spend', label: t.sms.yesPayment },
              { value: 'ignore', label: t.sms.notPayment },
            ]}
            onChange={(kind) => setShape({ ...shape, kind })}
          />
        </View>
        {payment && shape.amountGroups.length > 1 ? (
          <>
            <AmountChips
              pattern={shape.pattern}
              body={text.body}
              groups={shape.amountGroups}
              onChange={(pattern) => setShape({ ...shape, pattern })}
            />
            <FeeChips
              pattern={shape.pattern}
              body={text.body}
              groups={shape.amountGroups}
              onChange={(pattern) => setShape({ ...shape, pattern })}
            />
          </>
        ) : null}
        {payment ? <ReadsAs pattern={shape.pattern} body={text.body} currency={settings.currency} /> : null}
        <Button label={t.common.save} fullWidth onPress={save} />
        <Button
          label={t.sms.forget}
          variant="text"
          fullWidth
          onPress={() => {
            dismissUnmatched(db, text.id);
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
