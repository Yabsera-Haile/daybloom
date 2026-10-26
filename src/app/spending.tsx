import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { allSpendCategories } from '@/budget/categories';
import { byCategory, expensesIn, totalOf, type Entry } from '@/budget/entries';
import { periodRange, shiftPeriod } from '@/budget/money';
import { yearRange } from '@/budget/year';
import { currentPeriod } from '@/budget/plans';
import { toDayKey } from '@/calendar/dates';
import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { categoryName, EntryRow } from '@/features/budget/parts';
import { t } from '@/i18n';
import { money, monthDay, monthYear, shortDay, timeOf } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { DateNavigator, EmptyState, FilterChip, Page, Text } from '@/ui';

type DaySection = { day: string; total: number; data: Entry[] };

/**
 * All spending in a month or week (or a whole year, from Budget's year view, BU-12), by day, with a
 * category filter; tap one to edit or delete (BU-07). A virtualized list: a busy month draws only
 * the rows on screen.
 */
export default function SpendingScreen() {
  const params = useLocalSearchParams<{ start?: string; year?: string; category?: string }>();
  const insets = useSafeAreaInsets();
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
  // a whole year when opened from the year view
  const [year, setYear] = useState(params.year ? Number(params.year) : null);
  const range = year !== null ? yearRange(year) : periodRange(anchor, period, ws);
  const isCurrent = today >= range.start && today <= range.end;
  const thisYear = Number(today.slice(0, 4));
  const list = useLive(() => expensesIn(db, range), [range.start, range.end]);
  const categories = useLive(() => new Map(allSpendCategories(db).map((c) => [c.id, c])), []);
  const shown = filter === undefined ? list : list.filter((e) => e.budgetCategoryId === filter);

  // newest first, so days come in order as they're met
  const sections: DaySection[] = [];
  for (const e of shown) {
    const day = toDayKey(new Date(e.occurredAt));
    const last = sections.at(-1);
    if (last?.day === day) {
      last.data.push(e);
      last.total += e.amountCents;
    } else sections.push({ day, total: e.amountCents, data: [e] });
  }
  const shift = (by: 1 | -1) =>
    year !== null ? setYear(year + by) : setAnchor(shiftPeriod(range, period, by, ws).start);
  const label =
    year !== null
      ? year === thisYear
        ? t.budget.thisYear
        : String(year)
      : isCurrent
        ? period === 'month'
          ? t.budget.thisMonth
          : t.budget.thisWeek
        : period === 'month'
          ? monthYear(range.start)
          : `${monthDay(range.start)} – ${monthDay(range.end)}`;

  const header = (
    <View className="gap-space-lg pb-space-sm">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <DateNavigator
          label={label}
          current={isCurrent}
          onLabelPress={isCurrent ? undefined : () => (year !== null ? setYear(thisYear) : setAnchor(today))}
          onPrevious={() => shift(-1)}
          onNext={() => shift(1)}
          previousLabel={
            year !== null ? t.budget.previousYear : period === 'month' ? t.budget.previousMonth : t.budget.previousWeek
          }
          nextLabel={year !== null ? t.budget.nextYear : period === 'month' ? t.budget.nextMonth : t.budget.nextWeek}
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
    </View>
  );

  return (
    <Page title={t.budget.all.title} list>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        initialNumToRender={14}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-margin pt-space-sm"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        renderSectionHeader={({ section }) => (
          <View className="mb-2 mt-space-md flex-row items-center justify-between">
            <Text
              variant="labelMd"
              color="onSurfaceVariant"
              accessibilityRole="header"
              style={{ textTransform: 'uppercase' }}>
              {shortDay(section.day)}
            </Text>
            <Text variant="labelMd" color="onSurfaceVariant">
              {money(section.total, settings.currency, { minus: true })}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          // each day's rows form one rounded card
          <View
            className={`overflow-hidden bg-surface-container-lowest ${index === 0 ? 'rounded-t-2xl' : ''} ${index === section.data.length - 1 ? 'rounded-b-2xl' : ''}`}>
            <EntryRow
              first={index === 0}
              entry={item}
              category={item.budgetCategoryId ? categories.get(item.budgetCategoryId) : undefined}
              when={timeOf(item.occurredAt, settings.timeFormat)}
              onPress={() => openSheet({ kind: 'expense', day: section.day, entryId: item.id })}
            />
          </View>
        )}
      />
    </Page>
  );
}
