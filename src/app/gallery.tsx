import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography, useTheme, type CategoryKey, type ColorName, type TypographyVariant } from '@/theme';
import {
  Button,
  Card,
  CategoryTag,
  Checkbox,
  DateNavigator,
  EmptyState,
  Fab,
  FilterChip,
  HabitCircle,
  IconButton,
  Logo,
  ProgressBar,
  SectionHeader,
  StatusBadge,
  Sticker,
  Switch,
  Text,
  UrgentBadge,
} from '@/ui';

/** Phase 0 component gallery: every building block from docs/DESIGN_REVIEW.md section 3, for side-by-side checks. */
export default function GalleryScreen() {
  const { colors, categoryColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All (4)');
  const [ticks, setTicks] = useState({ lemon: true, journal: false });
  const [habit, setHabit] = useState<('done' | 'notDone')[]>(['done', 'done', 'notDone', 'done', 'done', 'notDone', 'notDone']);
  const [urgent, setUrgent] = useState(false);
  const [calm, setCalm] = useState(true);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center gap-1 pl-1 pr-margin">
        <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} iconColor="onSurface" />
        <Text variant="headlineMd" accessibilityRole="header">
          Component gallery
        </Text>
      </View>
      <ScrollView contentContainerClassName="gap-space-lg px-margin pb-16 pt-space-sm">
        <Section title="Colors">
          <View className="flex-row flex-wrap gap-2">
            {(['primary', 'primaryContainer', 'primaryFixed', 'secondary', 'secondaryContainer', 'secondaryFixed', 'tertiary', 'tertiaryFixed', 'surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'onSurface', 'onSurfaceVariant', 'outline', 'outlineVariant'] as ColorName[]).map((c) => (
              <View key={c} className="w-[23%] items-center gap-1">
                <View className="h-12 w-full rounded-xl border border-surface-variant" style={{ backgroundColor: colors[c] }} />
                <Text variant="labelXs" color="onSurfaceVariant" numberOfLines={1}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Type">
          {(Object.keys(typography) as TypographyVariant[]).map((v) => (
            <Text key={v} variant={v} numberOfLines={1}>
              {v} · {typography[v].size}px
            </Text>
          ))}
          <Text variant="bodyMd" italic color="onSurfaceVariant">
            Hour note in italics · Buffer &amp; focus prep
          </Text>
          <Text variant="headlineSm" italic>
            “Small seeds of mindful consistency.”
          </Text>
        </Section>

        <Section title="Stickers and logo">
          <View className="flex-row flex-wrap items-center gap-space-md">
            <Logo size={56} />
            <Sticker name="spring" size={64} rotate={-6} />
            <Sticker name="summer" size={64} rotate={6} />
            <Sticker name="autumn" size={64} rotate={-6} />
            <Sticker name="winter" size={64} rotate={6} />
            <Sticker name="savings" size={64} rotate={-6} />
          </View>
        </Section>

        <Section title="Buttons">
          <View className="flex-row flex-wrap gap-2">
            <Button label="Save" />
            <Button label="Add to-do" icon="add" size="md" />
            <Button label="Edit habits" variant="outline" icon="edit" />
            <Button label="Manage" variant="tonal" size="md" />
            <Button label="Not now" variant="text" />
            <Button label="Delete" variant="danger" icon="delete" />
          </View>
          <Button label="Open my planner" size="xl" fullWidth />
          <View className="flex-row gap-1">
            <IconButton icon="search" tone="tonal" accessibilityLabel="Search" />
            <IconButton icon="more_vert" accessibilityLabel="More options" />
            <IconButton icon="add" tone="primary" accessibilityLabel="Add" />
            <IconButton icon="close" tone="tonal" accessibilityLabel="Close" iconColor="onSurface" />
          </View>
        </Section>

        <Section title="Chips and badges">
          <View className="flex-row flex-wrap gap-2">
            {['All (4)', 'Urgent (1)', 'Not urgent (3)'].map((f) => (
              <FilterChip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <UrgentBadge />
            {(Object.keys(categoryColors) as CategoryKey[]).map((c) => (
              <CategoryTag key={c} category={c} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatusBadge label="All done" tone="success" />
            <StatusBadge label="3 of 4 done" />
            <StatusBadge label="Personal" tone="warning" />
            <StatusBadge label="Deadline" tone="alert" />
          </View>
        </Section>

        <Section title="Controls">
          <Checkbox label="Warm lemon water" showLabel checked={ticks.lemon} onChange={(v) => setTicks((t) => ({ ...t, lemon: v }))} />
          <Checkbox label="Morning journal" showLabel checked={ticks.journal} onChange={(v) => setTicks((t) => ({ ...t, journal: v }))} />
          <View className="flex-row items-center gap-1">
            {habit.map((state, i) => (
              <HabitCircle
                key={i}
                state={state}
                today={i === 6}
                label={`Gentle stretch, day ${i + 1}`}
                onPress={() => setHabit((h) => h.map((s, j) => (j === i ? (s === 'done' ? 'notDone' : 'done') : s)))}
              />
            ))}
            <HabitCircle state="future" label="Gentle stretch, tomorrow" />
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="bodyLg">Mark as urgent</Text>
            <Switch value={urgent} onChange={setUrgent} label="Mark as urgent" tone="secondary" />
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="bodyLg">Calm mode</Text>
            <Switch value={calm} onChange={setCalm} label="Calm mode" />
          </View>
          <ProgressBar value={2 / 3} label="Morning Ritual, 2 of 3 done" />
          <ProgressBar value={0.643} thick label="Budget spent, 64%" />
          <ProgressBar value={0.7} tone="secondary" label="Tokyo trip, 70%" />
          <ProgressBar value={0.75} tone="tertiary" label="Studio workstation, 75%" />
        </Section>

        <Section title="Cards and layout">
          <Card>
            <SectionHeader icon="checklist" title="Daily Intentions" subtitle="Your to-dos for today" right={<Button label="Add to-do" icon="add" size="md" />} />
          </Card>
          <Card tone="low">
            <DateNavigator label="Today" previousLabel="Previous day" nextLabel="Next day" />
          </Card>
          <Card tone="container">
            <Text variant="bodyMd">Container card (Evening Wind-Down preview)</Text>
          </Card>
          <Card>
            <EmptyState title="Nothing on your list yet" text="Write down one thing you'd like to get done today." actionLabel="Add a to-do" />
          </Card>
          <Fab />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-space-sm">
      <Text variant="labelMd" color="primary" accessibilityRole="header" style={{ textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
