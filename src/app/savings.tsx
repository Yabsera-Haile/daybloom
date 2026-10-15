import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { deleteGoal, reachedGoals, savingGoals, weeklyToReach, type Goal } from '@/budget/goals';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { AddMoneySheet, GoalFormSheet } from '@/features/budget/GoalSheets';
import { GoalCard } from '@/features/budget/parts';
import { t } from '@/i18n';
import { money, monthDay, monthName } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, IconButton, MenuRow, Page, Row, RowGroup, Sheet, Sticker, Text } from '@/ui';

type Open =
  | { kind: 'new' }
  | { kind: 'edit'; goal: Goal }
  | { kind: 'add'; goal: Goal }
  | { kind: 'takeOut'; goal: Goal }
  | { kind: 'menu'; goal: Goal }
  | { kind: 'reached' }
  | null;

/** Savings goals (BU-05, design/daybloom/budget-goals): saved so far, each goal, add money, new goal. */
export default function SavingsScreen() {
  const params = useLocalSearchParams<{ new?: string }>();
  const settings = useSettings();
  const today = useToday();
  const showToast = useUi((s) => s.showToast);
  const goals = useLive(() => savingGoals(db), []);
  const reached = useLive(() => reachedGoals(db), []);
  const [open, setOpen] = useState<Open>(params.new ? { kind: 'new' } : null);
  const currency = settings.currency;
  const saved = goals.reduce((sum, g) => sum + g.savedCents, 0);
  const close = () => setOpen(null);

  const detailOf = (g: Goal) => {
    const weekly = weeklyToReach(g, today);
    const parts = [
      g.dueDate ? t.budget.goals.by(monthDay(g.dueDate)) : null,
      weekly ? t.budget.goals.perWeek(money(weekly, currency)) : null,
    ].filter(Boolean);
    return g.note ?? (parts.length ? parts.join(' · ') : null);
  };

  return (
    <Page title={t.budget.goals.title}>
      <View className="flex-row items-center gap-space-md rounded-2xl bg-surface-container p-space-md">
        <Sticker name="savings" size={64} rotate={-6} />
        <View className="flex-1" accessible>
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.goals.savedSoFar}
          </Text>
          <Text variant="displayLgMobile" color="primary">
            {money(saved, currency, { whole: saved % 100 === 0 })}
          </Text>
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.budget.goals.across(goals.length)}
          </Text>
        </View>
      </View>

      {goals.map((g, i) => (
        <GoalCard
          key={g.id}
          goal={g}
          index={i}
          currency={currency}
          detail={detailOf(g)}
          actions={
            <View className="flex-row items-center justify-between">
              <IconButton
                icon="more_vert"
                accessibilityLabel={t.budget.goals.options(g.title)}
                onPress={() => setOpen({ kind: 'menu', goal: g })}
              />
              <Button
                label={t.budget.goals.addMoney}
                icon="add"
                variant="outline"
                size="md"
                onPress={() => setOpen({ kind: 'add', goal: g })}
              />
            </View>
          }
        />
      ))}

      <Button label={t.budget.goals.newTitle} icon="add" fullWidth onPress={() => setOpen({ kind: 'new' })} />

      {reached.length > 0 ? (
        <RowGroup>
          <Row
            first
            icon="celebration"
            title={t.budget.goals.reached(reached.length)}
            subtitle={t.budget.goals.reachedLine(
              `${reached[0].title} · ${money(reached[0].targetCents, currency, { whole: true })}`,
              monthName(toDayKey(new Date(reached[0].reachedAt!))),
            )}
            onPress={() => setOpen({ kind: 'reached' })}
          />
        </RowGroup>
      ) : null}

      {open?.kind === 'new' ? <GoalFormSheet onClose={close} /> : null}
      {open?.kind === 'edit' ? <GoalFormSheet goal={open.goal} onClose={close} /> : null}
      {open?.kind === 'add' ? <AddMoneySheet goal={open.goal} onClose={close} /> : null}
      {open?.kind === 'takeOut' ? <AddMoneySheet goal={open.goal} takeOut onClose={close} /> : null}
      {open?.kind === 'menu' ? (
        <Sheet visible onClose={close} title={open.goal.title} flush>
          <View className="pb-space-sm">
            <MenuRow
              icon="edit"
              label={t.budget.goals.edit}
              onPress={() => setOpen({ kind: 'edit', goal: open.goal })}
            />
            {open.goal.savedCents > 0 ? (
              <MenuRow
                icon="south_west"
                label={t.budget.goals.takeOut}
                onPress={() => setOpen({ kind: 'takeOut', goal: open.goal })}
              />
            ) : null}
            <MenuRow
              icon="delete"
              label={t.budget.goals.delete}
              tone="danger"
              onPress={() => {
                const undo = deleteGoal(db, open.goal.id);
                close();
                showToast(t.budget.goals.deleted, undo);
              }}
            />
          </View>
        </Sheet>
      ) : null}
      {open?.kind === 'reached' ? (
        <Sheet visible onClose={close} title={t.budget.goals.reached(reached.length)} closeButton flush>
          <View className="pb-space-sm">
            {reached.map((g) => (
              <MenuRow
                key={g.id}
                icon="celebration"
                label={g.title}
                detail={t.budget.goals.reachedLine(
                  money(g.savedCents, currency, { whole: g.savedCents % 100 === 0 }),
                  monthName(toDayKey(new Date(g.reachedAt!))),
                )}
                onPress={() => setOpen({ kind: 'menu', goal: g })}
              />
            ))}
          </View>
        </Sheet>
      ) : null}
    </Page>
  );
}
