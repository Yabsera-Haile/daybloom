import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type ScrollView } from 'react-native';

import { listBills, markBillPaid, upcomingBills } from '@/budget/bills';
import { allSpendCategories } from '@/budget/categories';
import { byCategory, expensesIn, totalOf } from '@/budget/entries';
import { savingGoals, weeklyToReach } from '@/budget/goals';
import { periodRange, shiftPeriod } from '@/budget/money';
import { budgetFor, budgetSummary, currentPeriod } from '@/budget/plans';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { BudgetSheet } from '@/features/budget/BudgetSheet';
import { BillCard, BudgetCard, CategoryBars, EntryRow, GoalCard, ListCard } from '@/features/budget/parts';
import { TabScreen, useHeaderOffset } from '@/features/TabScreen';
import { t } from '@/i18n';
import { money, monthDay, monthName, monthYear, timeOf } from '@/i18n/format';
import { useUi } from '@/state/ui';
import {
  Button,
  Card,
  DateNavigator,
  EmptyState,
  IconButton,
  SectionHeader,
  Sticker,
  Text,
  useTourTarget,
  useWide,
} from '@/ui';

/**
 * Budget (BU-01…10; design/daybloom/budget, with ideas from Cashew): how much is left this month or
 * week, a bar that turns red when over, where the money went, recent spending, bills and goals.
 */
export default function BudgetScreen() {
  const settings = useSettings();
  const today = useToday();
  const openSheet = useUi((s) => s.openSheet);
  const showToast = useUi((s) => s.showToast);
  const ws = settings.weekStart;
  const currency = settings.currency;
  const period = useLive(() => currentPeriod(db), []);
  // a day in the period on screen; null = the current one
  const [anchor, setAnchor] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const range = periodRange(anchor ?? today, period, ws);
  const isCurrent = today >= range.start && today <= range.end;

  const spent = useLive(() => expensesIn(db, range), [range.start, range.end]);
  const budget = useLive(() => budgetFor(db, period, range), [period, range.start]);
  const categories = useLive(() => new Map(allSpendCategories(db).map((c) => [c.id, c])), []);
  const goals = useLive(() => savingGoals(db), []);
  const bills = useLive(() => upcomingBills(db, today), [today]);
  const billCount = useLive(() => listBills(db).length, []);

  const summary = budgetSummary(totalOf(spent), budget, range, today);
  const totals = byCategory(spent);
  const next = shiftPeriod(range, period, 1, ws);
  const shift = (by: 1 | -1) => {
    const to = shiftPeriod(range, period, by, ws);
    setAnchor(today >= to.start && today <= to.end ? null : to.start);
  };
  const addDay = isCurrent ? today : range.end < today ? range.end : range.start;
  const title =
    period === 'month' ? t.budget.monthTitle(monthName(range.start)) : t.budget.weekTitle(monthDay(range.start));
  const navLabel = isCurrent
    ? period === 'month'
      ? t.budget.thisMonth
      : t.budget.thisWeek
    : period === 'month'
      ? monthYear(range.start)
      : `${monthDay(range.start)} – ${monthDay(range.end)}`;
  const left = summary.budgetCents ? Math.max(0, Math.round((1 - summary.usedShare) * 100)) : 0;

  // the tour scrolls down to savings goals to show them (ON-02); on a wide screen they're in the
  // second pane
  const { panes } = useWide();
  const scroll = useRef<ScrollView>(null);
  const sideScroll = useRef<ScrollView>(null);
  const savingsY = useRef(0);
  const headerOffset = useHeaderOffset();
  const savingsRef = useTourTarget<View>('savings', () =>
    (panes ? sideScroll : scroll).current?.scrollTo({
      y: Math.max(0, savingsY.current - headerOffset),
      animated: false,
    }),
  );

  // recent spending, bills and savings goals: on a wide screen a second pane beside the budget (D20)
  const lists = (
    <>
      <View className="gap-space-sm">
        <SectionHeader
          title={t.budget.recent}
          icon="receipt_long"
          right={
            spent.length > 0 ? (
              <Button
                label={t.budget.viewAll}
                variant="text"
                size="md"
                onPress={() => router.push({ pathname: '/spending', params: { start: range.start } })}
              />
            ) : undefined
          }
        />
        {spent.length > 0 ? (
          <ListCard>
            {spent.slice(0, 5).map((e, i) => (
              <EntryRow
                key={e.id}
                first={i === 0}
                entry={e}
                category={e.budgetCategoryId ? categories.get(e.budgetCategoryId) : undefined}
                when={`${monthDay(toDayKey(new Date(e.occurredAt)))}, ${timeOf(e.occurredAt, settings.timeFormat)}`}
                onPress={() => openSheet({ kind: 'expense', day: addDay, entryId: e.id })}
              />
            ))}
          </ListCard>
        ) : (
          <EmptyState
            title={t.budget.noSpending}
            text={t.budget.noSpendingText}
            actionLabel={t.budget.addExpense}
            onAction={() => openSheet({ kind: 'expense', day: addDay })}
          />
        )}
      </View>

      <View className="gap-space-sm">
        <SectionHeader
          title={t.budget.bills}
          subtitle={t.budget.next14}
          icon="event_upcoming"
          right={
            <IconButton
              icon="add_circle"
              accessibilityLabel={t.budget.addBill}
              onPress={() => router.push('/bill/new')}
            />
          }
        />
        {bills.length > 0 ? (
          bills.map((b) => (
            <BillCard
              key={b.id}
              bill={b}
              today={today}
              onPress={() => router.push({ pathname: '/bill/edit', params: { id: b.id } })}
              onMarkPaid={() => showToast(t.budget.paidToast(b.title), markBillPaid(db, b.id, Date.now()))}
            />
          ))
        ) : (
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t.budget.noBills}
          </Text>
        )}
        {billCount > 0 ? (
          <Button label={t.budget.allBills(billCount)} variant="text" size="md" onPress={() => router.push('/bills')} />
        ) : (
          <Button label={t.budget.addBill} icon="add" variant="outline" onPress={() => router.push('/bill/new')} />
        )}
      </View>

      <View
        ref={savingsRef}
        collapsable={false}
        onLayout={(e) => (savingsY.current = e.nativeEvent.layout.y)}
        className="gap-space-sm">
        <SectionHeader
          title={t.budget.savings}
          icon="savings"
          right={<Button label={t.budget.manage} variant="text" size="md" onPress={() => router.push('/savings')} />}
        />
        {goals.length > 0 ? (
          goals.slice(0, 3).map((g, i) => {
            const weekly = weeklyToReach(g, today);
            return (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                currency={currency}
                detail={g.note ?? (weekly ? t.budget.goals.perWeek(money(weekly, currency)) : null)}
                onPress={() => router.push('/savings')}
              />
            );
          })
        ) : (
          <Card className="gap-space-sm">
            <Text variant="bodyLg">{t.budget.noGoals}</Text>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t.budget.noGoalsText}
            </Text>
            <Button
              label={t.budget.goals.newTitle}
              icon="add"
              variant="outline"
              onPress={() => router.push({ pathname: '/savings', params: { new: '1' } })}
            />
          </Card>
        )}
      </View>
    </>
  );

  return (
    <TabScreen
      ref={scroll}
      section={t.tabs.budget}
      onAdd={() => openSheet({ kind: 'expense', day: addDay })}
      addLabel={t.budget.addExpense}
      onSwipe={shift}
      side={panes ? lists : undefined}
      sideRef={sideScroll}>
      <View className="gap-space-sm">
        <Text variant="headlineLg" accessibilityRole="header">
          {title}
        </Text>
        <DateNavigator
          label={navLabel}
          current={isCurrent}
          onLabelPress={isCurrent ? undefined : () => setAnchor(null)}
          onPrevious={() => shift(-1)}
          onNext={() => shift(1)}
          previousLabel={period === 'month' ? t.budget.previousMonth : t.budget.previousWeek}
          nextLabel={period === 'month' ? t.budget.nextMonth : t.budget.nextWeek}
        />
      </View>

      {/* BU-02: a gentle line while there's budget left (hidden in calm mode) */}
      {isCurrent && summary.budgetCents && summary.status !== 'over' && !settings.calm ? (
        <View className="flex-row items-center gap-space-md rounded-2xl bg-surface-container p-space-md">
          <Sticker name="savings" size={56} rotate={-6} />
          <View className="flex-1 gap-1">
            <Text variant="headlineSm" italic>
              {t.budget.quote}
            </Text>
            <Text variant="bodySm" color="onSurfaceVariant">
              {t.budget.quoteLine(left, summary.daysLeft)}
            </Text>
          </View>
        </View>
      ) : null}

      <BudgetCard
        summary={summary}
        currency={currency}
        isCurrent={isCurrent}
        nextStart={next.start}
        onEdit={() => setEditingBudget(true)}
      />

      {totals.length > 0 ? (
        <View className="gap-space-sm">
          <SectionHeader
            title={t.budget.whereItWent}
            icon="sell"
            right={
              <Button
                label={t.budget.editCategories}
                variant="text"
                size="md"
                onPress={() => router.push('/spending-categories')}
              />
            }
          />
          <CategoryBars
            totals={totals}
            categories={categories}
            currency={currency}
            onPress={(id) =>
              router.push({ pathname: '/spending', params: { start: range.start, category: id ?? 'none' } })
            }
          />
        </View>
      ) : null}

      {panes ? null : lists}

      {editingBudget ? <BudgetSheet today={today} onClose={() => setEditingBudget(false)} /> : null}
    </TabScreen>
  );
}
