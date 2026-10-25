import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { events } from '@/db/schema';
import { withTestDb } from '@/db/testDb';
import { EventForm } from '@/features/event/EventForm';
import { EventDetail } from '@/features/sheets/EventDetail';
import { HabitForm } from '@/features/habits/HabitForm';
import { ensureDefaultRoutines, listHabits, reminderTimes } from '@/habits/store';
import { eventsBetween } from '@/planner/events';
import { saveSetting } from '@/settings';
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

describe("event form with the phone's calendars", () => {
  it("T-GC04.1 a new event goes to the phone's calendar too, ticked unless unticked", async () => {
    saveSetting(getDb(), 'phoneCalendars', ['1']);
    saveSetting(getDb(), 'saveToCalendar', '1');
    const first = await render(<EventForm initial={{ mode: 'new', day: '2026-10-26', hour: 9 }} />);
    const box = screen.getByRole('checkbox', { name: 'Add to your calendar' });
    expect(box.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.changeText(screen.getByLabelText('Event title'), 'Dentist');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await first.unmount();

    await render(<EventForm initial={{ mode: 'new', day: '2026-10-27', hour: 9 }} />);
    await fireEvent.changeText(screen.getAllByLabelText('Event title').at(-1)!, 'Haircut');
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Add to your calendar' }).at(-1)!);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Save' }).at(-1)!);
    const rows = getDb().select().from(events).all();
    expect(rows.map((r) => [r.title, r.source, r.calendarId])).toEqual([
      ['Dentist', 'device', '1'],
      ['Haircut', 'local', null],
    ]);
  });

  it('T-GC05.2 an event Daybloom may only read can be copied, not changed or deleted', async () => {
    getDb()
      .insert(events)
      .values({
        id: 'holiday',
        title: 'Thanksgiving',
        allDay: true,
        startAt: Date.UTC(2026, 10, 26),
        endAt: Date.UTC(2026, 10, 27),
        timeZone: 'UTC',
        source: 'device',
        calendarId: '2',
        externalId: '2/9',
        readOnly: true,
      })
      .run();
    const [o] = eventsBetween(getDb(), '2026-11-26', '2026-11-26');
    await render(<EventDetail occurrence={o} />);
    expect(screen.getByText('In your calendar')).toBeTruthy();
    expect(screen.getByText('To change it, open it in your calendar app.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });
});
