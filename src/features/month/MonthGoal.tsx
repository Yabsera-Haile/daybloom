import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { centsToInput, parseMoney } from '@/budget/money';
import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { amountText, monthName } from '@/i18n/format';
import {
  addMonthProgress,
  deleteMonthGoal,
  goalShare,
  monthGoal,
  quickSteps,
  setMonthGoal,
  setMonthGoalDone,
  type MonthGoal,
} from '@/planner/monthGoal';
import { useUi } from '@/state/ui';
import { Button, ChoiceChip, Icon, ProgressBar, Sheet, Text, TextField } from '@/ui';

const field = 'h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3';
const pctOf = (goal: MonthGoal) => Math.round(goalShare(goal) * 100);

function GoalForm({ month, goal, onDone }: { month: string; goal?: MonthGoal; onDone: () => void }) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [target, setTarget] = useState(goal && goal.targetCents > 0 ? centsToInput(goal.targetCents) : '');
  const [tried, setTried] = useState(false);
  const g = t.month.goal;

  const save = () => {
    setTried(true);
    if (!title.trim()) return;
    const number = parseMoney(target);
    setMonthGoal(db, month, { title, target: number && number > 0 ? number : null });
    onDone();
  };

  return (
    <View className="gap-space-md pb-space-sm">
      <View className="gap-1.5">
        <Text variant="labelMd" color="onSurfaceVariant">
          {g.whatGoal}
        </Text>
        <TextField
          autoFocus={!goal}
          accessibilityLabel={g.whatGoal}
          placeholder={g.whatPlaceholder}
          value={title}
          onChangeText={setTitle}
          className={`${field} ${tried && !title.trim() ? 'border-error' : ''}`}
        />
        {tried && !title.trim() ? (
          <Text variant="bodySm" color="error">
            {g.needTitle}
          </Text>
        ) : null}
      </View>
      <View className="gap-1.5">
        <Text variant="labelMd" color="onSurfaceVariant">
          {g.number}
        </Text>
        <TextField
          accessibilityLabel={g.number}
          accessibilityHint={g.numberHint}
          placeholder={g.numberPlaceholder}
          keyboardType="decimal-pad"
          value={target}
          onChangeText={setTarget}
          className={field}
        />
        <Text variant="bodySm" color="onSurfaceVariant">
          {g.numberHint}
        </Text>
      </View>
      <Button label={t.common.save} fullWidth onPress={save} />
    </View>
  );
}

function GoalProgress({ goal, onEdit, onClose }: { goal: MonthGoal; onEdit: () => void; onClose: () => void }) {
  const showToast = useUi((s) => s.showToast);
  const [amount, setAmount] = useState('');
  const g = t.month.goal;
  const value = parseMoney(amount);
  const hasNumber = goal.targetCents > 0;

  const add = (n: number) => {
    if (addMonthProgress(db, goal.id, n)) showToast(g.reached);
    setAmount('');
  };

  return (
    <View className="gap-space-md pb-space-sm">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="bodyMd" color="onSurfaceVariant">
            {hasNumber
              ? g.progress(amountText(goal.savedCents), amountText(goal.targetCents))
              : goal.reachedAt
                ? g.done
                : g.notDone}
          </Text>
          <Text variant="labelLg" color="tertiary">
            {g.pct(pctOf(goal))}
          </Text>
        </View>
        <ProgressBar value={goalShare(goal)} tone="tertiary" thick label={g.a11y(goal.title, pctOf(goal))} />
      </View>
      {hasNumber ? (
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {g.addProgress}
          </Text>
          <View className="flex-row items-center gap-2">
            <TextField
              accessibilityLabel={g.amount}
              placeholder={g.amount}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              className={`flex-1 ${field}`}
            />
            <Button
              label={value && value > 0 ? g.add(amountText(value)) : t.common.add}
              size="md"
              align="center"
              disabled={!value || value <= 0}
              className={value && value > 0 ? '' : 'opacity-50'}
              onPress={() => value && value > 0 && add(value)}
            />
          </View>
          <View className="flex-row gap-2">
            {quickSteps(goal.targetCents).map((n) => (
              <ChoiceChip key={n} role="button" label={`+${n}`} selected={false} onPress={() => add(n * 100)} />
            ))}
          </View>
        </View>
      ) : (
        <Button
          label={goal.reachedAt ? g.markNotDone : g.markDone}
          icon={goal.reachedAt ? undefined : 'check'}
          variant={goal.reachedAt ? 'outline' : 'primary'}
          fullWidth
          onPress={() => {
            setMonthGoalDone(db, goal.id, !goal.reachedAt);
            if (!goal.reachedAt) showToast(g.reached);
          }}
        />
      )}
      <View className="flex-row gap-space-sm">
        <Button label={g.edit} icon="edit" variant="outline" className="flex-1" onPress={onEdit} />
        <Button
          label={g.remove}
          icon="delete"
          variant="danger"
          className="flex-1"
          onPress={() => {
            const undo = deleteMonthGoal(db, goal.id);
            onClose();
            showToast(g.removed, undo);
          }}
        />
      </View>
    </View>
  );
}

/** "This month's goal" card on Month (MO-06, design/daybloom/month), or an invitation to set one. */
export function MonthGoalCard({ month, monthStart }: { month: string; monthStart: string }) {
  const goal = useLive(() => monthGoal(db, month), [month]);
  const [opened, setOpen] = useState<'view' | 'edit' | null>(null);
  // a goal removed while its sheet was open
  const open = opened === 'view' && !goal ? null : opened;
  const g = t.month.goal;
  const close = () => setOpen(null);

  return (
    <>
      {goal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={g.a11y(goal.title, pctOf(goal))}
          onPress={() => setOpen('view')}
          className="flex-row items-stretch gap-3 rounded-2xl bg-surface-container-low p-space-md active:opacity-90">
          <View className="w-1.5 rounded-full bg-tertiary" />
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text variant="labelSm" color="tertiary" style={{ textTransform: 'uppercase' }}>
                {g.heading}
              </Text>
              <Text variant="labelMd" color="tertiary">
                {g.pct(pctOf(goal))}
              </Text>
            </View>
            <Text variant="bodyLg" weight="600">
              {goal.title}
            </Text>
            <Text variant="bodySm" color="onSurfaceVariant">
              {goal.targetCents > 0
                ? g.progress(amountText(goal.savedCents), amountText(goal.targetCents))
                : goal.reachedAt
                  ? g.done
                  : g.notDone}
            </Text>
            <View className="mt-2">
              <ProgressBar value={goalShare(goal)} tone="tertiary" label={g.a11y(goal.title, pctOf(goal))} />
            </View>
          </View>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen('edit')}
          className="min-h-touch flex-row items-center gap-space-sm rounded-2xl border-[1.5px] border-dashed border-outline-variant p-space-md active:opacity-80">
          <Icon name="flag" color="tertiary" />
          <View className="flex-1">
            <Text variant="bodyLg">{g.setFor(monthName(monthStart))}</Text>
            <Text variant="bodySm" color="onSurfaceVariant">
              {g.setText}
            </Text>
          </View>
          <Icon name="add" color="primary" />
        </Pressable>
      )}
      {open ? (
        <Sheet
          visible
          onClose={close}
          title={open === 'edit' ? (goal ? g.editTitle : g.newTitle) : goal!.title}
          eyebrow={open === 'view' ? g.heading : undefined}
          closeButton>
          {open === 'edit' ? (
            <GoalForm month={month} goal={goal} onDone={close} />
          ) : (
            <GoalProgress goal={goal!} onEdit={() => setOpen('edit')} onClose={close} />
          )}
        </Sheet>
      ) : null}
    </>
  );
}
