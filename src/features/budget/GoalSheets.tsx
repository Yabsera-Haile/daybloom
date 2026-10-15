import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { addToGoal, createGoal, GOAL_ICONS, updateGoal, type Goal } from '@/budget/goals';
import { centsToInput, parseMoney } from '@/budget/money';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { t } from '@/i18n';
import { money, monthDay } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, ChoiceChip, Icon, PickerRow, Sheet, Text, TextField } from '@/ui';
import { pickDay } from '@/ui/pickers';

import { MoneyField } from './parts';

const field = 'h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3';
const pct = (saved: number, target: number) => Math.round((saved / target) * 100);

/** New savings goal or edit one (design/daybloom/budget-goals#new-goal). */
export function GoalFormSheet({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const settings = useSettings();
  const today = useToday();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [note, setNote] = useState(goal?.note ?? '');
  const [target, setTarget] = useState(goal ? centsToInput(goal.targetCents) : '');
  const [dueDate, setDueDate] = useState<string | null>(goal?.dueDate ?? null);
  const [icon, setIcon] = useState<string>(goal?.icon ?? GOAL_ICONS[0]);
  const [tried, setTried] = useState(false);
  const cents = parseMoney(target);
  const valid = cents !== null && cents > 0;

  const save = () => {
    setTried(true);
    if (!title.trim() || !valid) return;
    const input = { title, note, icon, targetCents: cents, dueDate };
    if (goal) updateGoal(db, goal.id, input);
    else createGoal(db, input);
    onClose();
  };

  const chooseDay = async () => {
    const picked = await pickDay(dueDate ?? today);
    if (picked) setDueDate(picked);
  };

  return (
    <Sheet visible onClose={onClose} title={goal ? t.budget.goals.editTitle : t.budget.goals.newTitle} closeButton>
      <View className="gap-space-md pb-space-sm">
        <View className="gap-1.5">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.goals.whatFor}
          </Text>
          <TextField
            autoFocus={!goal}
            accessibilityLabel={t.budget.goals.whatFor}
            placeholder={t.budget.goals.whatForPlaceholder}
            value={title}
            onChangeText={setTitle}
            className={`${field} ${tried && !title.trim() ? 'border-error' : ''}`}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.goals.note} <Text variant="labelSm">{t.budget.goals.optional}</Text>
          </Text>
          <TextField
            accessibilityLabel={t.budget.goals.note}
            placeholder={t.budget.goals.notePlaceholder}
            value={note}
            onChangeText={setNote}
            className={field}
          />
        </View>
        <MoneyField
          label={t.budget.goals.howMuch}
          value={target}
          onChangeText={setTarget}
          currency={settings.currency}
          big={false}
          error={tried && !valid ? t.budget.needAmount : null}
        />
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <PickerRow
              icon="calendar_today"
              label={t.budget.goals.byWhen}
              value={dueDate ? monthDay(dueDate) : t.budget.goals.pickDate}
              onPress={chooseDay}
            />
          </View>
          {dueDate ? (
            <Button
              label={t.budget.goals.noDate}
              variant="text"
              size="md"
              align="center"
              onPress={() => setDueDate(null)}
            />
          ) : null}
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.goals.picture}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {GOAL_ICONS.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ checked: icon === name }}
                accessibilityLabel={name.replace(/_/g, ' ')}
                onPress={() => setIcon(name)}
                className={`h-12 w-12 items-center justify-center rounded-xl border-2 ${icon === name ? 'border-primary bg-primary-fixed' : 'border-transparent bg-surface-container'}`}>
                <Icon name={name} color={icon === name ? 'onPrimaryFixed' : 'onSurfaceVariant'} />
              </Pressable>
            ))}
          </View>
        </View>
        <Button label={goal ? t.common.save : t.budget.goals.create} fullWidth onPress={save} />
      </View>
    </Sheet>
  );
}

const QUICK = [50, 100, 200, 500];

/** "Add to Emergency fund" with quick amounts, or take some out (design/daybloom/budget-goals#add-money). */
export function AddMoneySheet({
  goal,
  takeOut = false,
  onClose,
}: {
  goal: Goal;
  takeOut?: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  const [amount, setAmount] = useState('');
  const cents = parseMoney(amount);
  const valid = cents !== null && cents > 0;
  const change = valid ? (takeOut ? -Math.min(cents, goal.savedCents) : cents) : 0;
  const after = goal.savedCents + change;
  const currency = settings.currency;

  const save = () => {
    if (!valid) return;
    const reached = addToGoal(db, goal.id, change);
    onClose();
    if (reached) showToast(t.budget.goals.reachedToast(goal.title));
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={takeOut ? t.budget.goals.takeOutTitle(goal.title) : t.budget.goals.addTo(goal.title)}
      subtitle={t.budget.goals.savedOf(money(goal.savedCents, currency), money(goal.targetCents, currency))}
      closeButton>
      <View className="gap-space-md pb-space-sm">
        <MoneyField
          label={t.budget.expense.amount}
          value={amount}
          onChangeText={setAmount}
          currency={currency}
          autoFocus
        />
        {takeOut ? null : (
          <View className="flex-row flex-wrap gap-2">
            {QUICK.map((n) => (
              <ChoiceChip
                key={n}
                role="button"
                label={`+${money(n * 100, currency, { whole: true })}`}
                selected={cents === n * 100}
                onPress={() => setAmount(String(n))}
              />
            ))}
          </View>
        )}
        {valid ? (
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.budget.goals.afterThis(money(after, currency), pct(after, goal.targetCents))}{' '}
            {t.budget.goals.notSpending}
          </Text>
        ) : null}
        <Button
          label={
            valid
              ? takeOut
                ? t.budget.goals.takeOutAmount(money(-change, currency))
                : t.budget.goals.addAmount(money(change, currency))
              : takeOut
                ? t.budget.goals.takeOut
                : t.budget.goals.addMoney
          }
          fullWidth
          disabled={!valid}
          className={valid ? '' : 'opacity-50'}
          onPress={save}
        />
      </View>
    </Sheet>
  );
}
