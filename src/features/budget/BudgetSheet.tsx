import { useState } from 'react';
import { View } from 'react-native';

import { centsToInput, parseMoney, type BudgetPeriod } from '@/budget/money';
import { currentPlan, setBudget } from '@/budget/plans';
import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { Button, RadioCard, Sheet, Text } from '@/ui';

import { MoneyField } from './parts';

/** "Your budget" (BU-04, design/daybloom/budget#set-budget): each month or each week, and how much. */
export function BudgetSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const settings = useSettings();
  const [plan] = useState(() => currentPlan(db));
  const [period, setPeriod] = useState<BudgetPeriod>((plan?.period as BudgetPeriod | undefined) ?? 'month');
  const [amount, setAmount] = useState(plan?.amountCents ? centsToInput(plan.amountCents) : '');
  const [tried, setTried] = useState(false);
  const cents = parseMoney(amount);
  const valid = cents !== null && cents > 0;

  const save = () => {
    setTried(true);
    if (!valid) return;
    setBudget(db, period, cents, today, settings.weekStart);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={t.budget.budgetTitle} closeButton>
      <View className="gap-space-md pb-space-sm">
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.budget.budgetText}
        </Text>
        <View accessibilityRole="radiogroup" className="gap-space-sm">
          <RadioCard on={period === 'month'} onPress={() => setPeriod('month')} title={t.budget.eachMonth} />
          <RadioCard
            on={period === 'week'}
            onPress={() => setPeriod('week')}
            title={t.budget.eachWeek}
            detail={t.budget.weekNote}
          />
        </View>
        <MoneyField
          label={period === 'month' ? t.budget.amountMonth : t.budget.amountWeek}
          value={amount}
          onChangeText={setAmount}
          currency={settings.currency}
          error={tried && !valid ? t.budget.needAmount : null}
        />
        <Button label={t.common.save} fullWidth onPress={save} />
        {plan?.amountCents ? (
          <Button
            label={t.budget.noBudgetButton}
            variant="text"
            align="center"
            onPress={() => {
              setBudget(db, period, null, today, settings.weekStart);
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
