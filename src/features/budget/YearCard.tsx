import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { amountText, money, monthLetter, monthName } from '@/i18n/format';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { Button, Card, Text } from '@/ui';

/** The chart's drawing area: its height, and room on the left for the amounts. */
const HEIGHT = 168;
const LEFT = 44;
const TOP = 10;
const BOTTOM = 6;
/** The scale never shrinks below this (cents), so a quiet year doesn't look dramatic. */
const LEAST = 10_000;

/** A round top for the scale, just above the highest value, so its middle line is round too: 600, 1.5k, 8k. */
export function niceCeil(value: number): number {
  if (value <= LEAST) return LEAST;
  const p = 10 ** Math.floor(Math.log10(value));
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= value)! * p;
}

/** A short amount for the scale, without a currency sign like the rest of Budget: 950, 1.2k, 2.4M. */
export function shortAmount(cents: number): string {
  const v = cents / 100;
  if (v >= 1e6) return `${amountText(Math.round(v / 1e5) * 10)}M`;
  if (v >= 1e3) return `${amountText(Math.round(v / 100) * 10)}k`;
  return amountText(Math.round(v) * 100);
}

const firstOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}-01`;

type ChartProps = {
  year: number;
  /** Cents spent each month (0 = January). */
  spent: number[];
  /** The monthly budget each month, or null. */
  budgets: (number | null)[];
  /** The last month drawn (this month in this year). */
  last: number;
  currency: string;
  selected: number;
  onSelect: (month: number) => void;
};

/**
 * A line of the year's spending, month by month, over a dashed line of the budget; months over
 * budget get a red dot (BU-12). Tap a month (or, with a screen reader, swipe up or down) to see it.
 */
export function SpendingChart({ year, spent, budgets, last, currency, selected, onSelect }: ChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const top = niceCeil(Math.max(...spent.slice(0, last + 1), ...budgets.map((b) => b ?? 0)) * 1.1);
  const column = (width - LEFT) / 12;
  const x = (month: number) => LEFT + column * (month + 0.5);
  const y = (cents: number) => TOP + (HEIGHT - TOP - BOTTOM) * (1 - cents / top);
  const floor = y(0);
  const months = Array.from({ length: last + 1 }, (_, m) => m);
  const line = months.map((m) => `${m === 0 ? 'M' : 'L'}${x(m)} ${y(spent[m])}`).join(' ');
  const over = (m: number) => budgets[m] !== null && spent[m] > budgets[m]!;
  const readout = (m: number) => t.budget.monthSpent(monthName(firstOf(year, m)), money(spent[m], currency));
  const pick = (m: number) => onSelect(Math.max(0, Math.min(last, m)));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={t.budget.chartLabel(String(year))}
        accessibilityValue={{ text: readout(selected) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => pick(selected + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
        onPress={(e) => pick(Math.floor((e.nativeEvent.locationX - LEFT) / column))}>
        <View style={{ height: HEIGHT }}>
          {width > 0 ? (
            <Svg width={width} height={HEIGHT}>
              {/* the scale: nothing, half way, the top */}
              {[0, top / 2, top].map((v) => (
                <Line key={v} x1={LEFT} x2={width} y1={y(v)} y2={y(v)} stroke={colors.outlineVariant} strokeWidth={1} />
              ))}
              {/* the budget, month by month */}
              {budgets.map((b, m) =>
                b === null ? null : (
                  <Line
                    key={`b${m}`}
                    x1={LEFT + column * m}
                    x2={LEFT + column * (m + 1)}
                    y1={y(b)}
                    y2={y(b)}
                    stroke={colors.outline}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                ),
              )}
              {last >= 0 ? (
                <>
                  <Line
                    x1={x(selected)}
                    x2={x(selected)}
                    y1={TOP}
                    y2={floor}
                    stroke={colors.outlineVariant}
                    strokeWidth={1.5}
                  />
                  <Path d={`${line} L${x(last)} ${floor} L${x(0)} ${floor} Z`} fill={colors.primary} opacity={0.1} />
                  <Path d={line} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
                  {months.map((m) => (
                    <Circle
                      key={m}
                      cx={x(m)}
                      cy={y(spent[m])}
                      r={m === selected ? 6 : 4}
                      fill={over(m) ? colors.error : colors.primary}
                      stroke={colors.surfaceContainerLowest}
                      strokeWidth={2}
                    />
                  ))}
                </>
              ) : null}
            </Svg>
          ) : null}
          {width > 0
            ? [0, top / 2, top].map((v) => (
                <Text
                  key={v}
                  variant="labelSm"
                  color="onSurfaceVariant"
                  style={{ position: 'absolute', left: 0, width: LEFT - 6, top: y(v) - 8, textAlign: 'right' }}>
                  {shortAmount(v)}
                </Text>
              ))
            : null}
        </View>
        {/* the months along the bottom */}
        <View className="flex-row" style={{ paddingLeft: LEFT }}>
          {Array.from({ length: 12 }, (_, m) => (
            <Text
              key={m}
              variant="labelSm"
              color={m === selected ? 'primary' : 'onSurfaceVariant'}
              weight={m === selected ? '700' : undefined}
              style={{ flex: 1, textAlign: 'center' }}>
              {monthLetter(firstOf(year, m))}
            </Text>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

/**
 * The year's spending in the budget card's place (BU-12): the total, the chart, a key, and the
 * month picked on it, with a way to open that month's budget.
 */
export function YearCard({
  year,
  spent,
  budgets,
  last,
  currency,
  switcher,
  onOpenMonth,
}: {
  year: number;
  spent: number[];
  budgets: (number | null)[];
  last: number;
  currency: string;
  switcher: ReactNode;
  onOpenMonth: (month: number) => void;
}) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<number | null>(null);
  const selected = Math.min(picked ?? last, last);
  const total = spent.slice(0, last + 1).reduce((a, b) => a + b, 0);
  const month = monthName(firstOf(year, Math.max(0, selected)));
  const budget = selected >= 0 ? budgets[selected] : null;
  const gap = budget === null ? 0 : spent[selected] - budget;

  return (
    <Card className="gap-space-sm">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="labelMd" color="onSurfaceVariant" style={{ flexShrink: 1 }}>
          {t.budget.spentIn(String(year))}
        </Text>
        {switcher}
      </View>
      <Text variant="displayLgMobile" color="primary">
        {money(total, currency)}
      </Text>
      {last < 0 ? (
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t.budget.yearAhead(String(year))}
        </Text>
      ) : (
        <>
          <SpendingChart
            year={year}
            spent={spent}
            budgets={budgets}
            last={last}
            currency={currency}
            selected={selected}
            onSelect={setPicked}
          />
          {/* the key */}
          <View className="flex-row items-center gap-space-md" importantForAccessibility="no-hide-descendants">
            <View className="flex-row items-center gap-1.5">
              <View className="h-1 w-4 rounded-full" style={{ backgroundColor: colors.primary }} />
              <Text variant="labelSm" color="onSurfaceVariant">
                {t.budget.legendSpent}
              </Text>
            </View>
            {budgets.some((b) => b !== null) ? (
              <View className="flex-row items-center gap-1.5">
                <View
                  className="h-0.5 w-4"
                  style={{ borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.outline }}
                />
                <Text variant="labelSm" color="onSurfaceVariant">
                  {t.budget.legendBudget}
                </Text>
              </View>
            ) : null}
          </View>
          {/* the month picked */}
          <View className="flex-row flex-wrap items-center justify-between gap-x-2 rounded-xl bg-surface-container-low px-3 py-1">
            <View className="py-2" accessible>
              <Text variant="bodyLg" weight="600">
                {t.budget.monthSpent(month, money(spent[selected], currency))}
              </Text>
              {budget !== null ? (
                <Text variant="bodySm" color={gap > 0 ? 'error' : 'onSurfaceVariant'}>
                  {gap > 0
                    ? t.budget.overBudgetBy(money(gap, currency))
                    : t.budget.underBudgetBy(money(-gap, currency))}
                </Text>
              ) : null}
            </View>
            <Button
              label={t.budget.openMonth(month)}
              variant="text"
              size="md"
              icon="arrow_forward"
              onPress={() => onOpenMonth(selected)}
            />
          </View>
        </>
      )}
    </Card>
  );
}
