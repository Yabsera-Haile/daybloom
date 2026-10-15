import { fireEvent, render, screen } from '@testing-library/react-native';

import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense, expensesIn } from '@/budget/entries';
import { periodRange } from '@/budget/money';
import { setBudget } from '@/budget/plans';
import { toDayKey } from '@/calendar/dates';
import { withTestDb } from '@/db/testDb';
import { BudgetSheet } from '@/features/budget/BudgetSheet';
import { ExpenseSheet } from '@/features/budget/ExpenseSheet';
import BudgetScreen from '@/app/(tabs)/budget';
import { refresh } from '@/test/screen';

const getDb = withTestDb();
const today = toDayKey(new Date());
const month = periodRange(today, 'month', 1);

beforeEach(() => ensureDefaultSpendCategories(getDb()));

describe('expense sheet', () => {
  it('T-BU08.2 an empty or zero amount is not saved, with a friendly hint', async () => {
    await render(<ExpenseSheet day={today} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Type an amount above zero')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Amount'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(expensesIn(getDb(), month)).toEqual([]);
  });

  it('T-BU08.1 "6.25, Latte, Dining" is saved as today’s spending', async () => {
    await render(<ExpenseSheet day={today} />);
    await fireEvent.changeText(screen.getByLabelText('Amount'), '6.25');
    await fireEvent.changeText(screen.getByLabelText('What was it for?'), 'Latte');
    await fireEvent.press(screen.getByRole('radio', { name: 'Dining' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    const [latte] = expensesIn(getDb(), month);
    expect([latte.amountCents, latte.description, latte.budgetCategoryId]).toEqual([625, 'Latte', 'dining']);
  });

  it('T-BU08.3 closing keeps what was typed; it comes back next time', async () => {
    const first = await render(<ExpenseSheet day={today} />);
    await fireEvent.changeText(screen.getByLabelText('Amount'), '12.50');
    await first.unmount();
    await render(<ExpenseSheet day={today} />);
    expect(screen.getByText('Picked up where you left off')).toBeTruthy();
    expect(screen.getByLabelText('Amount').props.value).toBe('12.50');
  });
});

describe('budget tab', () => {
  it('T-BU03.2 over budget: the card says by how much and the bar is full', async () => {
    setBudget(getDb(), 'month', 100000, today, 1);
    addExpense(getDb(), {
      amountCents: 112000,
      description: 'Laptop repair',
      categoryId: 'other',
      occurredAt: Date.now(),
      currency: 'USD',
    });
    await render(<BudgetScreen />);
    expect(screen.getByText('Over budget by')).toBeTruthy();
    expect(screen.getByText('120.00')).toBeTruthy();
    expect(screen.getByLabelText('112% of the budget used').props.accessibilityValue.now).toBe(100);
    expect(screen.getByText('Laptop repair')).toBeTruthy();
  });

  it('T-BU04.1 setting a weekly budget switches the tab to weeks', async () => {
    const onClose = jest.fn();
    await render(<BudgetSheet today={today} onClose={onClose} />);
    await fireEvent.press(screen.getByRole('radio', { name: /Each week/ }));
    await fireEvent.changeText(screen.getByLabelText('Amount each week'), '500');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onClose).toHaveBeenCalled();
    await render(<BudgetScreen />);
    await refresh();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Left to spend')).toBeTruthy();
  });
});
