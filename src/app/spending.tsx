import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { allSpendCategories } from '@/budget/categories';
import { byCategory, expensesIn, totalOf, type Entry } from '@/budget/entries';
import { periodRange, shiftPeriod } from '@/budget/money';
import { currentPeriod } from '@/budget/plans';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { categoryName, EntryRow, ListCard } from '@/features/budget/parts';
import { t } from '@/i18n';
import { money, monthDay, monthYear, shortDay, timeOf } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { DateNavigator, EmptyState, FilterChip, Page, Text } from '@/ui';

/** All spending in a month or week, by day, with a category filter; tap one to edit or delete (BU-07). */
export default function SpendingScreen() {
  const params = useLocalSearchParams<{ start?: string; category?: string }>();
  const settings = useSettings();
  const today = useToday();
  const openSheet = useUi((s) => s.openSheet);
  const ws = settings.weekStart;
  const period = useLive(() => currentPeriod(db), []);
  const [anchor, setAnchor] = useState(params.start ?? today);
  // undefined = every category, null = no category
  const [filter, setFilter] = useState<string | null | undefined>(
    params.category === undefined ? undefined : params.category === 'none' ? null : params.category,
  );
  const range = periodRange(anchor, period, ws);
  const isCurrent = today >= range.start && today <= range.end;
  const list = useLive(() => expensesIn(db, range), [range.start, range.end]);
  const categories = useLive(() => new Map(allSpendCategories(db).map((c) => [c.id, c])), []);
  const shown = filter === undefined ? list : list.filter((e) => e.budgetCategoryId === filter);

  const days = new Map<string, Entry[]>();
  for (const e of shown) {
    const day = toDayKey(new Date(e.occurredAt));
    days.set(day, [...(days.get(day) ?? []), e]);
  }
  const shift = (by: 1 | -1) => setAnchor(shiftPeriod(range, period, by, ws).start);
  const label = isCurrent
    ? period === 'month'
      ? t.budget.thisMonth
      : t.budget.thisWeek
    : period === 'month'
      ? monthYear(range.start)
      : `${monthDay(range.start)} – ${monthDay(range.end)}`;

  return (
    <Page title={t.budget.all.title}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <DateNavigator
          label={label}
          current={isCurrent}
          onLabelPress={isCurrent ? undefined : () => setAnchor(today)}
          onPrevious={() => shift(-1)}
          onNext={() => shift(1)}
          previousLabel={period === 'month' ? t.budget.previousMonth : t.budget.previousWeek}
          nextLabel={period === 'month' ? t.budget.nextMonth : t.budget.nextWeek}
        />
        <Text variant="labelLg">{t.budget.all.total(money(totalOf(shown), settings.currency))}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-margin"
        contentContainerClassName="gap-2 px-margin">
        <FilterChip
          label={t.budget.all.everything}
          selected={filter === undefined}
          onPress={() => setFilter(undefined)}
        />
        {byCategory(list).map((c) => (
          <FilterChip
            key={c.categoryId ?? 'none'}
            label={categoryName(c.categoryId ? categories.get(c.categoryId) : undefined)}
            selected={filter === c.categoryId}
            onPress={() => setFilter(c.categoryId)}
          />
        ))}
      </ScrollView>

      {shown.length === 0 ? <EmptyState title={t.budget.all.empty} /> : null}
      {[...days].map(([day, entries]) => (
        <View key={day} className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text
              variant="labelMd"
              color="onSurfaceVariant"
              accessibilityRole="header"
              style={{ textTransform: 'uppercase' }}>
              {shortDay(day)}
            </Text>
            <Text variant="labelMd" color="onSurfaceVariant">
              {money(totalOf(entries), settings.currency, { minus: true })}
            </Text>
          </View>
          <ListCard>
            {entries.map((e, i) => (
              <EntryRow
                key={e.id}
                first={i === 0}
                entry={e}
                category={e.budgetCategoryId ? categories.get(e.budgetCategoryId) : undefined}
                when={timeOf(e.occurredAt, settings.timeFormat)}
                onPress={() => openSheet({ kind: 'expense', day, entryId: e.id })}
              />
            ))}
          </ListCard>
        </View>
      ))}
    </Page>
  );
}
