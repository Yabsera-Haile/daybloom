import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';

import { habits } from '@/db/schema';
import { withTestDb } from '@/db/testDb';
import { Companion } from '@/features/pet/Companion';
import { useRoam } from '@/features/pet/roam';
import { createHabit } from '@/habits/store';
import { saveSetting } from '@/settings';

// the clock decides bedtime; the tests decide the clock
const mockBedtime = jest.fn(() => false);
jest.mock('@/pet/mood', () => ({ ...jest.requireActual('@/pet/mood'), isBedtime: () => mockBedtime() }));

const getDb = withTestDb();

/** A daily habit added a few days ago and never ticked: it's slipping. */
const slipping = (name: string) => {
  const id = createHabit(getDb(), { name, routineId: null, frequency: 'daily' });
  getDb()
    .update(habits)
    .set({ createdAt: Date.now() - 4 * 86_400_000 })
    .where(eq(habits.id, id))
    .run();
};

beforeEach(() => {
  mockBedtime.mockReturnValue(false);
  useRoam.setState({ spot: 'today', landing: false, cheered: null });
});

describe('companion pet', () => {
  it('T-MS12.1 with nothing to show it naps on the card; a tap wakes it (a yawn, a stretch) to say hello', async () => {
    await render(<Companion at="today" />);
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      await fireEvent.press(screen.getByLabelText('Mochi the cat, asleep'));
      await act(async () => jest.advanceTimersByTime(2500));
      expect(screen.getByLabelText('Mochi the cat, awake')).toBeTruthy();
      expect(screen.getByText('Hello! I’ll keep you company.')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('T-MS10.2 a gentle pet is a little sad about a slipping habit and says so kindly', async () => {
    slipping('Drink water');
    await render(<Companion at="today" />);
    await fireEvent.press(screen.getByLabelText('Mochi the cat, a little sad'));
    expect(screen.getByText('I miss Drink water. Shall we try today?')).toBeTruthy();
  });

  it('T-MS10.3 a cheeky pet with a new name is cross about it, and says so', async () => {
    slipping('Drink water');
    saveSetting(getDb(), 'petPersonality', 'cheeky');
    saveSetting(getDb(), 'petName', 'Biscuit');
    await render(<Companion at="today" />);
    await fireEvent.press(screen.getByLabelText('Biscuit the cat, cross with you'));
    expect(screen.getByText('Ahem. Drink water? Two days now.')).toBeTruthy();
  });

  it('T-MS04.3 at bedtime it stays asleep, whatever its mood', async () => {
    slipping('Drink water');
    mockBedtime.mockReturnValue(true);
    await render(<Companion at="today" />);
    await fireEvent.press(screen.getByLabelText('Mochi the cat, asleep'));
    expect(screen.getByLabelText('Mochi the cat, asleep')).toBeTruthy();
    expect(screen.getByText('It’s late. Sleep well!')).toBeTruthy();
  });

  it('T-MS05.1 Calm mode or "Off" leaves no pet at all', async () => {
    saveSetting(getDb(), 'calm', true);
    const view = await render(<Companion at="today" />);
    expect(screen.queryByLabelText(/Mochi/)).toBeNull();
    await view.unmount();
    saveSetting(getDb(), 'calm', false);
    saveSetting(getDb(), 'pet', 'off');
    await render(<Companion at="today" />);
    expect(screen.queryByLabelText(/Mochi/)).toBeNull();
  });
});
