import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense } from '@/budget/entries';
import { withTestDb } from '@/db/testDb';
import { createHabit } from '@/habits/store';
import SearchScreen from '@/app/search';

const getDb = withTestDb();

describe('search', () => {
  it('T-SR02.1 "latte" finds the spending, then "hydration" the habit, which opens its history', async () => {
    ensureDefaultSpendCategories(getDb());
    addExpense(getDb(), {
      amountCents: 625,
      description: 'Oat latte',
      categoryId: 'dining',
      occurredAt: Date.now(),
      currency: 'USD',
    });
    const water = createHabit(getDb(), { name: 'Drink water', note: 'Hydration', frequency: 'daily', routineId: null });
    await render(<SearchScreen />);
    const box = screen.getByLabelText('Search your plans');
    await fireEvent.changeText(box, 'latte');
    expect(screen.getByText('Spending (1)')).toBeTruthy();
    expect(screen.getByText('−6.25')).toBeTruthy();
    await fireEvent.changeText(box, 'hydration');
    expect(screen.getByText('Habits (1)')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Drink water/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/habit-history', params: { id: water } });
  });
});
