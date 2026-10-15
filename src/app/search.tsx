import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { useCategories, useNow, useSettings } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { clockText, hourLabel, money, shortDay, timeOf } from '@/i18n/format';
import { eventIcon } from '@/planner/eventIcon';
import {
  forgetSearch,
  recentSearches,
  rememberSearch,
  searchPlans,
  type SearchKind,
  type SearchResult,
} from '@/planner/search';
import { useUi } from '@/state/ui';
import { shadows, useTheme, type ColorName } from '@/theme';
import { FilterChip, Icon, IconButton, Sticker, Text, TextField, UrgentBadge, type IconName } from '@/ui';

/** The title with the searched word highlighted. */
function Highlighted({ text, query, done }: { text: string; query: string; done?: boolean }) {
  const { colors } = useTheme();
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  const n = query.trim().length;
  return (
    <Text variant="bodyLg" color={done ? 'onSurfaceVariant' : 'onSurface'} done={done}>
      {i < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, i)}
          <Text variant="bodyLg" style={{ backgroundColor: colors.tertiaryFixed }}>
            {text.slice(i, i + n)}
          </Text>
          {text.slice(i + n)}
        </>
      )}
    </Text>
  );
}

function Card({
  icon,
  circle,
  iconColor,
  title,
  detail,
  query,
  onOpen,
  amount,
}: {
  icon: IconName;
  circle: string;
  iconColor: ColorName;
  title: string;
  detail: string;
  query: string;
  onOpen: () => void;
  amount?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      className="flex-row items-start gap-3 rounded-2xl bg-surface-container-lowest p-space-md active:opacity-80"
      style={shadows.card}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${circle}`}>
        <Icon name={icon} color={iconColor} />
      </View>
      <View className="flex-1">
        <Highlighted text={title} query={query} />
        <Text variant="bodySm" color="onSurfaceVariant" style={{ marginTop: 4 }}>
          {detail}
        </Text>
      </View>
      {amount ? (
        <Text variant="bodyLg" weight="600">
          {amount}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ResultCard({ result, query, onOpen }: { result: SearchResult; query: string; onOpen: () => void }) {
  const { lookFor } = useTheme();
  const settings = useSettings();
  const categories = useCategories();
  const tf = settings.timeFormat;
  if (result.kind === 'note') {
    const n = result.note;
    return (
      <Card
        icon="notes"
        circle="bg-secondary-fixed"
        iconColor="onSecondaryFixed"
        title={n.text}
        detail={[t.search.hourNote(hourLabel(n.hour, tf)), shortDay(result.day)].join(' · ')}
        query={query}
        onOpen={onOpen}
      />
    );
  }
  if (result.kind === 'habit') {
    const h = result.habit;
    return (
      <Card
        icon={(h.icon as IconName) ?? 'spa'}
        circle="bg-primary-fixed"
        iconColor="onPrimaryFixed"
        title={h.name}
        detail={[t.search.habit, h.note].filter(Boolean).join(' · ')}
        query={query}
        onOpen={onOpen}
      />
    );
  }
  if (result.kind === 'expense') {
    const e = result.entry;
    return (
      <Card
        icon="payments"
        circle="bg-tertiary-fixed"
        iconColor="onTertiaryFixed"
        title={e.description || result.categoryName || t.budget.noCategory}
        detail={[t.search.expense, shortDay(result.day), result.categoryName].filter(Boolean).join(' · ')}
        query={query}
        onOpen={onOpen}
        amount={money(e.amountCents, e.currency, { minus: true })}
      />
    );
  }
  if (result.kind === 'task') {
    const x = result.task;
    const detail = [
      x.scope === 'week' ? t.search.priority : t.search.todo,
      x.dueTime ? t.task.due(clockText(x.dueTime, tf)) : null,
      x.done ? t.task.done : null,
      x.listLabel,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        className="flex-row items-start gap-3 rounded-2xl bg-surface-container-lowest p-space-md active:opacity-80"
        style={shadows.card}>
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${x.done ? 'bg-primary-fixed' : 'bg-tertiary-fixed'}`}>
          <Icon name={x.done ? 'check' : 'task_alt'} color={x.done ? 'onPrimaryFixed' : 'onTertiaryFixed'} />
        </View>
        <View className="flex-1">
          <Highlighted text={x.title} query={query} done={x.done} />
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {x.urgent && !x.done ? <UrgentBadge /> : null}
            <Text variant="bodySm" color="onSurfaceVariant">
              {detail}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
  const o = result.occurrence;
  const category = categories.find((c) => c.id === o.categoryId);
  const look = lookFor(category?.colorKey);
  const detail = [
    t.search.event,
    shortDay(result.day),
    o.allDay ? t.common.allDay : timeOf(o.startAt, tf),
    category?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      className="flex-row items-start gap-3 rounded-2xl bg-surface-container-lowest p-space-md active:opacity-80"
      style={shadows.card}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${look.card}`}>
        <Icon name={eventIcon(o.title, look.icon)} tint={look.detail} />
      </View>
      <View className="flex-1">
        <Highlighted text={o.title} query={query} />
        <Text variant="bodySm" color="onSurfaceVariant" style={{ marginTop: 4 }}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Search (SR-01, SR-02): events, to-dos, hour notes and spending grouped Today / Coming up / Earlier,
 * then habits; tapping opens the item.
 */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const openSheet = useUi((s) => s.openSheet);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | SearchKind>('all');
  const groups = useLive(() => searchPlans(db, query, now), [query, now]);
  const recent = useLive(() => recentSearches(db), []);
  const all = [...groups.today, ...groups.comingUp, ...groups.earlier, ...groups.habits];
  const count = (kind: SearchKind) => all.filter((r) => r.kind === kind).length;
  const keep = (list: SearchResult[]) => list.filter((r) => filter === 'all' || r.kind === filter);

  const open = (r: SearchResult) => {
    rememberSearch(db, query);
    if (r.kind === 'event') openSheet({ kind: 'event', occurrence: r.occurrence });
    else if (r.kind === 'task') openSheet({ kind: 'taskMenu', taskId: r.task.id });
    else if (r.kind === 'note') openSheet({ kind: 'note', day: r.day, hour: r.note.hour, noteId: r.note.id });
    else if (r.kind === 'expense') openSheet({ kind: 'expense', day: r.day, entryId: r.entry.id });
    else router.push({ pathname: '/habit-history', params: { id: r.habit.id } });
  };

  const sections: { title: string; list: SearchResult[]; today?: boolean }[] = [
    {
      title: groups.today[0] ? t.month.todayHeading(shortDay(groups.today[0].day)) : '',
      list: keep(groups.today),
      today: true,
    },
    { title: t.search.comingUp, list: keep(groups.comingUp) },
    { title: t.search.earlier, list: keep(groups.earlier) },
    { title: t.search.habitsHeading, list: keep(groups.habits) },
  ];

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center gap-1 pl-1 pr-margin">
        <IconButton
          icon="arrow_back"
          accessibilityLabel={t.common.back}
          iconColor="onSurface"
          onPress={() => router.back()}
        />
        <View className="flex-1 justify-center">
          <View className="absolute left-3 z-10">
            <Icon name="search" size={22} />
          </View>
          <TextField
            autoFocus
            accessibilityLabel={t.header.search}
            placeholder={t.header.search}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => rememberSearch(db, query)}
            className="h-12 rounded-full border-[1.5px] border-primary bg-surface-container-lowest pl-11 pr-12"
          />
          {query ? (
            <View className="absolute right-0">
              <IconButton icon="close" accessibilityLabel={t.search.clear} onPress={() => setQuery('')} />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-space-md px-margin pt-space-sm"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
        {!query.trim() ? (
          <View className="gap-space-sm">
            {recent.length ? (
              <>
                <Text variant="labelMd" color="onSurfaceVariant" style={{ textTransform: 'uppercase' }}>
                  {t.search.recent}
                </Text>
                <View className="rounded-2xl bg-surface-container-lowest" style={shadows.card}>
                  {recent.map((r, i) => (
                    <View key={r} className={`flex-row items-center ${i ? 'border-t border-surface-variant' : ''}`}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setQuery(r)}
                        className="min-h-[56px] flex-1 flex-row items-center gap-space-md pl-space-md">
                        <Icon name="history" />
                        <Text variant="bodyLg">{r}</Text>
                      </Pressable>
                      <IconButton
                        icon="close"
                        accessibilityLabel={t.search.remove(r)}
                        onPress={() => forgetSearch(db, r)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ marginTop: 8 }}>
              {t.search.hint}
            </Text>
          </View>
        ) : all.length === 0 ? (
          <View className="items-center gap-space-sm pt-space-xl">
            <Sticker name="winter" size={80} rotate={-6} />
            <Text variant="headlineMd" style={{ textAlign: 'center' }}>
              {t.search.noneTitle(query.trim())}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.search.noneText}
            </Text>
          </View>
        ) : (
          <>
            <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
              <FilterChip
                label={t.search.all(all.length)}
                selected={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <FilterChip
                label={t.search.events(count('event'))}
                selected={filter === 'event'}
                onPress={() => setFilter('event')}
              />
              <FilterChip
                label={t.search.todos(count('task'))}
                selected={filter === 'task'}
                onPress={() => setFilter('task')}
              />
              {(
                [
                  ['note', t.search.notes],
                  ['habit', t.search.habitsChip],
                  ['expense', t.search.spending],
                ] as const
              )
                .filter(([kind]) => count(kind) > 0)
                .map(([kind, label]) => (
                  <FilterChip
                    key={kind}
                    label={label(count(kind))}
                    selected={filter === kind}
                    onPress={() => setFilter(kind)}
                  />
                ))}
            </View>
            {sections
              .filter((s) => s.list.length > 0)
              .map((s) => (
                <View key={s.title} className="gap-1.5">
                  <Text
                    variant="labelMd"
                    color={s.today ? 'primary' : 'onSurfaceVariant'}
                    style={{ textTransform: 'uppercase' }}>
                    {s.title}
                  </Text>
                  <View className="gap-space-sm">
                    {s.list.map((r) => (
                      <ResultCard key={r.key} result={r} query={query} onOpen={() => open(r)} />
                    ))}
                  </View>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
