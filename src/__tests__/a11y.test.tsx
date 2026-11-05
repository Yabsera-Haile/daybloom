import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import type { TestInstance } from 'test-renderer';

import BudgetScreen from '@/app/(tabs)/budget';
import HabitsScreen from '@/app/(tabs)/habits';
import TodayScreen from '@/app/(tabs)/index';
import MonthScreen from '@/app/(tabs)/month';
import WeekScreen from '@/app/(tabs)/week';
import OnboardingScreen from '@/app/onboarding';
import SettingsScreen from '@/app/settings';
import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense } from '@/budget/entries';
import { setBudget } from '@/budget/plans';
import { toDayKey } from '@/calendar/dates';
import { withTestDb } from '@/db/testDb';
import { ExpenseSheet } from '@/features/budget/ExpenseSheet';
import { EventForm } from '@/features/event/EventForm';
import { HabitForm } from '@/features/habits/HabitForm';
import { createHabit, ensureDefaultRoutines } from '@/habits/store';
import { ensureDefaultCategories } from '@/planner/categories';
import { createEvent } from '@/planner/events';
import { createTask } from '@/planner/tasks';

jest.mock('@/reminders/scheduler', () => ({ askForNotifications: jest.fn(async () => true) }));
jest.mock('@/reminders/notifications', () => ({
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
jest.mock('expo-battery', () => ({ isBatteryOptimizationEnabledAsync: async () => false }));
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), replace: jest.fn() }),
}));

const getDb = withTestDb();
const today = toDayKey(new Date());

/** A phone with a bit of everything, so every kind of card and row is on screen. */
function fillIn() {
  const db = getDb();
  ensureDefaultCategories(db);
  ensureDefaultRoutines(db);
  ensureDefaultSpendCategories(db);
  const at = (h: number) => new Date(new Date().setHours(h, 0, 0, 0)).getTime();
  createEvent(
    db,
    { title: 'Dentist', startAt: at(15), endAt: at(16), timeZone: 'America/New_York', categoryId: 'work' },
    [10],
  );
  createEvent(db, { title: 'Swim', startAt: at(7), endAt: at(8), timeZone: 'America/New_York', rrule: 'FREQ=DAILY' });
  createTask(db, { title: 'Water plants', date: today });
  createTask(db, { title: 'Pay rent', date: today, urgent: true });
  createHabit(db, { name: 'Herbal tea', frequency: 'daily', routineId: 'evening' });
  createHabit(db, { name: 'Long walk', frequency: 'weekly', routineId: null });
  setBudget(db, 'month', 400000, today, 1);
  addExpense(db, {
    amountCents: 625,
    description: 'Latte',
    categoryId: 'dining',
    occurredAt: Date.now(),
    currency: 'USD',
  });
}

const INTERACTIVE = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'adjustable',
  'tab',
  'menuitem',
  'togglebutton',
]);

/** Everything a screen reader would stop on to press. */
const pressables = (root: TestInstance) =>
  root.queryAll(
    (node) =>
      typeof node.type === 'string' &&
      (typeof node.props.onClick === 'function' || INTERACTIVE.has(node.props.accessibilityRole)) &&
      node.props.accessible !== false &&
      node.props.importantForAccessibility !== 'no-hide-descendants',
  );

/** Everything a screen reader would stop on to press, with no name to say. */
function unnamed(root: TestInstance): string[] {
  const textOf = (node: TestInstance): string =>
    node.children
      .map((child) => (typeof child === 'string' ? child : textOf(child)))
      .join(' ')
      .trim();
  return pressables(root)
    .filter((node) => !(node.props.accessibilityLabel ?? node.props['aria-label'] ?? textOf(node)))
    .map(
      (node) => `${node.props.accessibilityRole ?? 'pressable'} (${node.props.testID ?? node.props.className ?? '?'})`,
    );
}

describe('everything you can press has a name (NFR-04)', () => {
  beforeEach(fillIn);

  it('the check itself catches a button with nothing to say, and counts what it looked at', async () => {
    const view = await render(
      <View>
        <Pressable onPress={() => undefined}>
          <View />
        </Pressable>
        <Pressable onPress={() => undefined} accessibilityLabel="Close" />
        <Pressable onPress={() => undefined}>
          <Text>Save</Text>
        </Pressable>
      </View>,
    );
    expect(unnamed(view.container)).toHaveLength(1);
    expect(pressables(view.container)).toHaveLength(3);
  });

  it.each([
    ['Today', () => <TodayScreen />],
    ['Week', () => <WeekScreen />],
    ['Month', () => <MonthScreen />],
    ['Habits', () => <HabitsScreen />],
    ['Budget', () => <BudgetScreen />],
    ['Settings', () => <SettingsScreen />],
    ['First run', () => <OnboardingScreen />],
    ['the event form', () => <EventForm initial={{ mode: 'new', day: today, hour: 9 }} />],
    ['the expense sheet', () => <ExpenseSheet day={today} />],
    ['the habit form', () => <HabitForm />],
  ])('T-NFR04.4 %s', async (_name, screenOf) => {
    const view = await render(screenOf());
    expect(pressables(view.container).length).toBeGreaterThanOrEqual(3);
    expect(unnamed(view.container)).toEqual([]);
  });

  it('T-NFR04.4 Budget, the year', async () => {
    const view = await render(<BudgetScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'The year’s spending, month by month' }));
    expect(unnamed(view.container)).toEqual([]);
  });
});
