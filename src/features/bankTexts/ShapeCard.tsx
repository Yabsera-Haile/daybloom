import { View } from 'react-native';

import { t } from '@/i18n';
import type { LearnedShape, ShapeKind } from '@/sms/learn';
import { Card, Segmented, Text } from '@/ui';

import { AmountChips, MarkedText, ReadsAs } from './parts';

const KINDS: ShapeKind[] = ['spend', 'income', 'ignore'];

/**
 * One kind of text a sender sends, as Daybloom understood it: an example, whether it's a payment,
 * and (for payments) which number is the amount. The person corrects either with a tap.
 */
export function ShapeCard({
  shape,
  currency,
  onChange,
}: {
  shape: LearnedShape;
  currency: string;
  onChange: (shape: LearnedShape) => void;
}) {
  const example = shape.examples[0];
  return (
    <Card className="gap-space-sm p-space-md">
      <Text variant="labelMd" color="onSurfaceVariant">
        {t.sms.likeThis(shape.count)}
      </Text>
      <MarkedText
        pattern={shape.kind === 'spend' ? shape.pattern : { ...shape.pattern, amountGroup: null }}
        body={example}
        groups={shape.amountGroups}
      />
      <Segmented
        value={shape.kind}
        options={KINDS.map((k) => ({ value: k, label: t.sms.kinds[k] }))}
        onChange={(kind) => onChange({ ...shape, kind })}
      />
      {shape.kind === 'spend' ? (
        <View className="gap-space-sm">
          {shape.amountGroups.length > 1 ? (
            <AmountChips
              pattern={shape.pattern}
              body={example}
              groups={shape.amountGroups}
              onChange={(pattern) => onChange({ ...shape, pattern })}
            />
          ) : null}
          <ReadsAs pattern={shape.pattern} body={example} currency={currency} />
        </View>
      ) : (
        <Text variant="bodySm" color="onSurfaceVariant">
          {t.sms.notAdded}
        </Text>
      )}
    </Card>
  );
}
