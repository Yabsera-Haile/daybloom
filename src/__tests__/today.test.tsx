import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { addDaysToKey } from '@/calendar/timezone';
import { toDayKey } from '@/calendar/dates';
import { withTestDb } from '@/db/testDb';
import { MonthGoalCard } from '@/features/month/MonthGoal';
import { DailyQuote } from '@/features/today/DailyQuote';
import { LeftBehind } from '@/features/today/LeftBehind';
import { TabScreen } from '@/features/TabScreen';
import { t } from '@/i18n';
import { addMonthProgress, monthGoal, setMonthGoal } from '@/planner/monthGoal';
import { quoteFor } from '@/planner/quotes';
import { createTask, tasksOn } from '@/planner/tasks';
import { Text } from '@/ui';
import { refresh } from '@/test/screen';

const getDb = withTestDb();
const today = toDayKey(new Date());
const yesterday = addDaysToKey(today, -1);

describe('left from earlier days', () => {
  it('T-15.1 offers yesterday’s 2 unfinished to-dos; "Move to today" moves them', async () => {
    createTask(getDb(), { title: 'Call the bank', date: yesterday });
    createTask(getDb(), { title: 'Reply to Sam', date: yesterday });
    await render(<LeftBehind today={today} />);
    expect(screen.getByText('2 things left from yesterday. Move them to today?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Move to today' }));
    expect(tasksOn(getDb(), today).map((x) => x.title)).toEqual(['Reply to Sam', 'Call the bank']);
    await refresh();
    expect(screen.queryByText(/left from/)).toBeNull();
  });

  it('"Not now" puts it off for the rest of the day', async () => {
    createTask(getDb(), { title: 'Call the bank', date: yesterday });
    await render(<LeftBehind today={today} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    await refresh();
    expect(screen.queryByText(/left from/)).toBeNull();
    expect(tasksOn(getDb(), yesterday)).toHaveLength(1);
  });
});

describe("today's quote", () => {
  it('T-TD18.1 shows the quote for the day', async () => {
    await render(<DailyQuote day={today} />);
    expect(screen.getByText(`“${quoteFor(today)}”`)).toBeTruthy();
  });
});

describe("the month's goal", () => {
  it('T-MO06.1 "Save 800 this month" with 400 saved shows 50% and a half-full bar', async () => {
    const id = setMonthGoal(getDb(), today.slice(0, 7), { title: 'Save 800 this month', target: 80000 });
    addMonthProgress(getDb(), id, 40000);
    await render(<MonthGoalCard month={today.slice(0, 7)} monthStart={`${today.slice(0, 7)}-01`} />);
    expect(screen.getByText("This month's goal")).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('400 of 800 so far')).toBeTruthy();
  });

  it('a month without a goal invites one, and adding progress from the card counts', async () => {
    const month = today.slice(0, 7);
    await render(<MonthGoalCard month={month} monthStart={`${month}-01`} />);
    await fireEvent.press(screen.getByRole('button', { name: /Set a goal for/ }));
    await fireEvent.changeText(screen.getByLabelText("What's your goal this month?"), 'Read 4 books');
    await fireEvent.changeText(screen.getByLabelText('A number to reach'), '4');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await refresh();
    await fireEvent.press(screen.getByRole('button', { name: /This month's goal: Read 4 books/ }));
    await fireEvent.press(screen.getByRole('button', { name: '+1' }));
    expect(monthGoal(getDb(), month)!.savedCents).toBe(100);
  });
});

describe('tab frame', () => {
  it('T-SH01.1 the header has the section name, search and More, and no profile button', async () => {
    await render(
      <TabScreen section="Today">
        <Text>Page</Text>
      </TabScreen>,
    );
    expect(screen.getByLabelText('Daybloom, Today')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.header.search }));
    expect(router.push).toHaveBeenCalledWith('/search');
    await fireEvent.press(screen.getByRole('button', { name: t.header.more }));
    expect(router.push).toHaveBeenCalledWith('/more');
    expect(screen.queryByLabelText(/profile|account/i)).toBeNull();
  });
});
