// Building blocks for the Budget tab and its pages (design/daybloom/budget*): the amount field,
// category icons, spending rows, the budget card, spending by category, bill and goal cards.
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { daysUntil, type Bill } from '@/budget/bills';
import type { SpendCategory } from '@/budget/categories';
import type { CategoryTotal, Entry } from '@/budget/entries';
import type { Goal } from '@/budget/goals';
import type { BudgetSummary } from '@/budget/plans';
import { t } from '@/i18n';
import { money, monthDay } from '@/i18n/format';
import { shadows, useTheme, type CategoryKey } from '@/theme';
import { Button, Card, Icon, ProgressBar, StatusBadge, Text, TextField, type IconName } from '@/ui';

const pct = (share: number) => Math.round(share * 100);

/** "0.00" amount field with the number keypad (BU-08, BU-09); no currency sign (D15). */
export const MoneyField = forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    currency: string;
    autoFocus?: boolean;
    big?: boolean;
    error?: string | null;
  }
>(function MoneyField({ label, value, onChangeText, currency, autoFocus, big = true, error }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1.5">
      <Text variant="labelMd" color="onSurfaceVariant">
        {label}
      </Text>
      <View
        className={`flex-row items-center rounded-xl border-[1.5px] bg-surface px-4 ${big ? 'h-16' : 'h-12'} ${error ? 'border-error' : focused ? 'border-primary' : 'border-outline-variant'}`}>
        <TextField
          ref={ref}
          value={value}
          // only numbers and their marks, even when pasted or typed on a full keyboard
          onChangeText={(v) => onChangeText(v.replace(/[^\d.,\s]/g, ''))}
          keyboardType="decimal-pad"
          placeholder={money(0, currency)}
          accessibilityLabel={label}
          variant={big ? 'displayLgMobile' : 'bodyLg'}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1 }}
        />
      </View>
      {error ? (
        <Text variant="bodySm" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

/** White card for rows that run edge to edge (spending, categories). */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl bg-surface-container-lowest" style={shadows.card}>
      {children}
    </View>
  );
}

/** The category's icon in its color circle. */
export function CategoryIcon({
  category,
  size = 44,
}: {
  category?: Pick<SpendCategory, 'icon' | 'colorKey'> | null;
  size?: number;
}) {
  const { categoryColors } = useTheme();
  const look = categoryColors[(category?.colorKey as CategoryKey) ?? 'creative'] ?? categoryColors.creative;
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: look.container }}>
      <Icon name={(category?.icon as IconName) ?? 'more_horiz'} size={Math.round(size * 0.5)} tint={look.onContainer} />
    </View>
  );
}

export const categoryName = (category?: Pick<SpendCategory, 'name'> | null) => category?.name ?? t.budget.noCategory;

/** One expense: icon, what it was for, category and when, amount (BU-07). */
export function EntryRow({
  entry,
  category,
  when,
  onPress,
  first = false,
}: {
  entry: Entry;
  category?: SpendCategory;
  when: string;
  onPress: () => void;
  first?: boolean;
}) {
  const name = categoryName(category);
  const title = entry.description || name;
  const amount = money(entry.amountCents, entry.currency, { minus: true });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.budget.entryLine(title, name, when, amount)}
      onPress={onPress}
      className={`min-h-[72px] flex-row items-center gap-space-md px-space-md py-3 active:bg-surface-container-low ${first ? '' : 'border-t border-surface-variant'}`}>
      <CategoryIcon category={category} />
      <View className="flex-1">
        <Text variant="bodyLg" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="bodySm" color="onSurfaceVariant">
          {entry.description ? `${name} · ${when}` : when}
        </Text>
      </View>
      <Text variant="bodyLg" weight="600">
        {amount}
      </Text>
    </Pressable>
  );
}

/** Left to spend, the bar that turns red when over, and the pace for the rest of the period (BU-03). */
/**
 * The period's budget or the year's spending (BU-12): two words in the card's corner, so the page
 * above, and the companion's nap spot beside the dates, stay as they are.
 */
export function ViewSwitch({
  value,
  period,
  onChange,
}: {
  value: 'period' | 'year';
  period: 'month' | 'week';
  onChange: (value: 'period' | 'year') => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t.budget.showAs}
      className="flex-row rounded-full bg-surface-container p-0.5">
      {(['period', 'year'] as const).map((v) => {
        const on = v === value;
        const label = v === 'year' ? t.budget.year : period === 'week' ? t.budget.week : t.budget.month;
        const spoken = v === 'year' ? t.budget.yearView : period === 'week' ? t.budget.weekView : t.budget.monthView;
        return (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={spoken}
            onPress={() => onChange(v)}
            hitSlop={8}
            className={`h-9 min-w-[56px] items-center justify-center rounded-full px-3 ${on ? 'bg-primary' : 'active:opacity-70'}`}>
            <Text variant="labelMd" color={on ? 'onPrimary' : 'onSurfaceVariant'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BudgetCard({
  summary,
  currency,
  isCurrent,
  nextStart,
  onEdit,
  switcher,
}: {
  summary: BudgetSummary;
  currency: string;
  isCurrent: boolean;
  /** first day of the next period, for "starts fresh on" */
  nextStart: string;
  onEdit: () => void;
  /** Month | Year, in the top corner */
  switcher?: ReactNode;
}) {
  const s = summary;
  const spent = money(s.spentCents, currency);

  if (s.budgetCents === null) {
    return (
      <Card className="gap-space-sm">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="labelMd" color="onSurfaceVariant" style={{ flexShrink: 1 }}>
            {t.budget.spent}
          </Text>
          {switcher}
        </View>
        <Text variant="displayLgMobile">{spent}</Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.budget.noBudgetText}
        </Text>
        <Button label={t.budget.setBudget} icon="add" onPress={onEdit} />
      </Card>
    );
  }

  const over = s.status === 'over';
  const badge =
    s.status === 'over' ? (
      <StatusBadge label={t.budget.over} tone="alert" />
    ) : s.status === 'careful' ? (
      <StatusBadge label={t.budget.careful} tone="warning" />
    ) : (
      <StatusBadge label={t.budget.onTrack} tone="success" />
    );
  return (
    <Card className="gap-space-sm">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-1">
          {over ? <Icon name="error" size={18} color="error" /> : null}
          <Text variant="labelMd" color={over ? 'error' : 'onSurfaceVariant'} style={{ flexShrink: 1 }}>
            {over ? t.budget.overBy : t.budget.leftToSpend}
          </Text>
        </View>
        {switcher}
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text variant="displayLgMobile" color={over ? 'error' : 'primary'}>
          {money(Math.abs(s.leftCents), currency)}
        </Text>
        {isCurrent ? badge : null}
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-x-2">
        <Text variant="bodySm" color="onSurfaceVariant">
          {t.budget.spentOf(spent, money(s.budgetCents, currency), pct(s.usedShare))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.budget.changeBudget}
          onPress={onEdit}
          hitSlop={8}
          className="min-h-touch flex-row items-center gap-1">
          <Text variant="labelMd" color="primary">
            {t.budget.changeBudget}
          </Text>
          <Icon name="edit" size={16} color="primary" />
        </Pressable>
      </View>
      <ProgressBar
        value={s.usedShare}
        tone={over ? 'error' : 'primary'}
        thick
        label={t.budget.usedLabel(pct(s.usedShare))}
      />
      {isCurrent ? (
        <Text variant="bodyMd" color="onSurfaceVariant">
          {over || s.perDayCents === 0
            ? t.budget.freshStart(monthDay(nextStart))
            : t.budget.perDay(money(s.perDayCents, currency), s.daysLeft)}
        </Text>
      ) : null}
    </Card>
  );
}

/** Where the money went: one labelled bar per category, biggest first (one color; the names say which). */
export function CategoryBars({
  totals,
  categories,
  currency,
  onPress,
}: {
  totals: CategoryTotal[];
  categories: Map<string, SpendCategory>;
  currency: string;
  onPress: (categoryId: string | null) => void;
}) {
  return (
    <View className="overflow-hidden rounded-2xl bg-surface-container-lowest" style={shadows.card}>
      {totals.map((row, i) => {
        const category = row.categoryId ? categories.get(row.categoryId) : undefined;
        const name = categoryName(category);
        const amount = money(row.cents, currency);
        return (
          <Pressable
            key={row.categoryId ?? 'none'}
            accessibilityRole="button"
            accessibilityLabel={t.budget.categoryLine(name, amount, pct(row.share))}
            onPress={() => onPress(row.categoryId)}
            className={`gap-2 px-space-md py-3 active:bg-surface-container-low ${i === 0 ? '' : 'border-t border-surface-variant'}`}>
            <View className="flex-row items-center gap-space-sm">
              <CategoryIcon category={category} size={36} />
              <Text variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>
                {name}
              </Text>
              <Text variant="bodyLg" weight="600">
                {amount}
              </Text>
            </View>
            <View className="flex-row items-center gap-space-sm">
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                <View
                  className="h-full rounded-full bg-primary-container"
                  style={{ width: `${Math.max(2, pct(row.share))}%` }}
                />
              </View>
              <Text variant="labelSm" color="onSurfaceVariant" style={{ width: 40, textAlign: 'right' }}>
                {`${pct(row.share)}%`}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A bill: its day ("Due soon" within 3 days), name, how often, amount, and how it's paid (BU-06). */
export function BillCard({
  bill,
  today,
  onPress,
  onMarkPaid,
}: {
  bill: Bill;
  today: string;
  onPress: () => void;
  onMarkPaid?: () => void;
}) {
  const days = daysUntil(bill.dueDate, today);
  const manual = bill.payment === 'manual';
  const urgent = manual && days <= 3;
  const day = monthDay(bill.dueDate);
  const chip = days < 0 ? t.budget.late(day) : days === 0 ? t.budget.dueToday : days <= 3 ? t.budget.dueSoon(day) : day;
  const amount = money(bill.amountCents, bill.currency);
  const how = manual ? t.budget.needsPaying : t.budget.paidAuto;
  const repeat = t.budget.repeats[bill.repeatMonths ?? 'once'];
  return (
    <View
      className={`overflow-hidden rounded-2xl border-l-4 bg-surface-container-lowest ${urgent ? 'border-secondary' : 'border-primary-container'}`}
      style={shadows.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[chip, bill.title, repeat, amount, how].join(', ')}
        onPress={onPress}
        className="flex-row items-center gap-space-sm p-space-md active:bg-surface-container-low">
        <View className="flex-1 gap-1">
          <StatusBadge label={chip} tone={urgent ? 'alert' : 'neutral'} />
          <Text variant="bodyLg" numberOfLines={2}>
            {bill.title}
          </Text>
          <Text variant="bodySm" color="onSurfaceVariant">
            {repeat}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="headlineSm">{amount}</Text>
          <Text variant="labelSm" color={manual ? 'secondary' : 'primary'}>
            {how}
          </Text>
        </View>
      </Pressable>
      {onMarkPaid && manual && days <= 3 ? (
        <View className="border-t border-surface-variant px-space-md py-1">
          <Button label={t.budget.markPaid} icon="check" variant="text" size="md" onPress={onMarkPaid} />
        </View>
      ) : null}
    </View>
  );
}

const goalTones = ['primary', 'secondary', 'tertiary'] as const;

/** A savings goal: picture, name, note or pace, saved of target, and its bar (BU-05). */
export function GoalCard({
  goal,
  index,
  currency,
  detail,
  onPress,
  actions,
}: {
  goal: Goal;
  index: number;
  currency: string;
  detail?: string | null;
  onPress?: () => void;
  actions?: ReactNode;
}) {
  const tone = goalTones[index % goalTones.length];
  const share = goal.targetCents ? goal.savedCents / goal.targetCents : 0;
  const body = (
    <>
      <View className="flex-row items-start gap-space-sm">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-surface-container">
          <Icon name={(goal.icon as IconName) ?? 'savings'} color={tone} />
        </View>
        <View className="flex-1">
          <Text variant="bodyLg" weight="600" numberOfLines={2}>
            {goal.title}
          </Text>
          {detail ? (
            <Text variant="bodySm" color="onSurfaceVariant">
              {detail}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text variant="headlineSm" color={tone}>
            {money(goal.savedCents, currency, { whole: goal.savedCents % 100 === 0 })}
          </Text>
          <Text variant="bodySm" color="onSurfaceVariant">
            {t.budget.goals.of(money(goal.targetCents, currency, { whole: goal.targetCents % 100 === 0 }))}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-space-sm">
        <View className="flex-1">
          <ProgressBar value={share} tone={tone} label={t.budget.goals.progress(goal.title, pct(share))} />
        </View>
        <Text variant="labelMd" color={tone} style={{ width: 44, textAlign: 'right' }}>
          {t.budget.goals.pct(pct(share))}
        </Text>
      </View>
      {actions}
    </>
  );
  if (!onPress) return <Card className="gap-space-sm">{body}</Card>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md active:opacity-90"
      style={shadows.card}>
      {body}
    </Pressable>
  );
}
