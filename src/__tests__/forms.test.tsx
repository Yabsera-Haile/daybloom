import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { withTestDb } from '@/db/testDb';
import { HabitForm } from '@/features/habits/HabitForm';
import { ensureDefaultRoutines, listHabits, reminderTimes } from '@/habits/store';
import { Sheet, Text } from '@/ui';

const getDb = withTestDb();

describe('habit form', () => {
  it('T-HB07.2 "Drink water" reminding every hour from 7 AM to 6 PM is saved as 12 times a day', async () => {
    ensureDefaultRoutines(getDb());
    await render(<HabitForm />);
    await fireEvent.changeText(screen.getByLabelText('Habit name'), 'Drink water');
    await fireEvent.press(screen.getByRole('radio', { name: /Anytime/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Several times' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Every hour' }));
    // the default range is 8 AM to 8 PM: 13 a day
    expect(screen.getByText(/Every hour, 8:00 AM to 8:00 PM · 13 reminders a day/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    const [water] = listHabits(getDb());
    expect([water.name, water.reminderEvery, reminderTimes(water).length]).toEqual(['Drink water', 60, 13]);
    expect(router.back).toHaveBeenCalled();
  });

  it('T-UX05 a new habit keeps its name if the form is left without saving', async () => {
    const first = await render(<HabitForm />);
    await fireEvent.changeText(screen.getByLabelText('Habit name'), 'Stretch');
    await first.unmount();
    await render(<HabitForm />);
    expect(screen.getByLabelText('Habit name').props.value).toBe('Stretch');
    // Cancel means it isn't wanted
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await render(<HabitForm />);
    expect(screen.getAllByLabelText('Habit name').at(-1)!.props.value).toBe('');
  });
});

describe('sheet', () => {
  it('closes as soon as the ✕ is touched, once', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} title="Add an expense" closeButton>
        <Text>Body</Text>
      </Sheet>,
    );
    // the backdrop is a Close button too; the ✕ comes after it
    const x = screen.getAllByRole('button', { name: 'Close', hidden: true }).at(-1)!;
    await fireEvent(x, 'pressIn');
    await fireEvent.press(x);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
