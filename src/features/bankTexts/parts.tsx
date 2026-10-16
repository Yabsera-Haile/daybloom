// Pieces shared by the bank-text screens (BU-11): a text with its amount marked, the "which number
// is the amount?" chips, and what a text would add.
import { View } from 'react-native';

import { t } from '@/i18n';
import { money } from '@/i18n/format';
import { pieces, readWith, withAmount, type PatternDef } from '@/sms/learn';
import { useTheme } from '@/theme';
import { ChoiceChip, Text } from '@/ui';

/** The text as it came, with the number used as the amount marked. */
export function MarkedText({ pattern, body, groups }: { pattern: PatternDef; body: string; groups: number[] }) {
  const { colors } = useTheme();
  return (
    <Text variant="bodyMd" color="onSurfaceVariant">
      {pieces(pattern, body, groups).map((p, i) =>
        p.group === pattern.amountGroup ? (
          <Text
            key={i}
            variant="labelLg"
            color="onPrimaryFixed"
            style={{ backgroundColor: colors.primaryFixed, borderRadius: 4 }}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

/** Each number in the text that could be the amount, to pick one. */
export function AmountChips({
  pattern,
  body,
  groups,
  onChange,
}: {
  pattern: PatternDef;
  body: string;
  groups: number[];
  onChange: (pattern: PatternDef) => void;
}) {
  const values = new Map(pieces(pattern, body, groups).flatMap((p) => (p.group ? [[p.group, p.text] as const] : [])));
  return (
    <View className="gap-2">
      <Text variant="labelMd" color="onSurfaceVariant">
        {t.sms.whichAmount}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.sms.whichAmount} className="flex-row flex-wrap gap-2">
        {groups.map((g) =>
          values.has(g) ? (
            <ChoiceChip
              key={g}
              label={values.get(g)!}
              selected={pattern.amountGroup === g}
              onPress={() => onChange(withAmount(pattern, g))}
            />
          ) : null,
        )}
      </View>
    </View>
  );
}

/** "Adds 7,380, paid to Aline, and a fee of 20" */
export function ReadsAs({ pattern, body, currency }: { pattern: PatternDef; body: string; currency: string }) {
  const r = readWith(pattern, body);
  if (!r) return null;
  const line =
    t.sms.readsAs(money(r.amountCents, currency), r.payee) +
    (r.feeCents > 0 ? t.sms.andFee(money(r.feeCents, currency)) : '');
  return (
    <Text variant="bodySm" color="primary">
      {line}
    </Text>
  );
}
