import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { AppState } from 'react-native';

import { habits } from '@/db/schema';
import { withTestDb } from '@/db/testDb';
import { Companion } from '@/features/pet/Companion';
import { enterSide, useRoam } from '@/features/pet/roam';
import { toDayKey } from '@/calendar/dates';
import { createHabit, getHabit, setHabitDone } from '@/habits/store';
import { refresh } from '@/test/screen';
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
  // the app is open (the pet only follows you while it is)
  Object.assign(AppState, { currentState: 'active' });
  useRoam.setState({ spot: 'today', from: 'today', landing: false, cheered: null, celebrated: null, grumbled: null });
});

/** Runs a test on a fake clock, with what Math.random says fixed (0.9: never too sleepy). */
async function onFakeClock(test: () => Promise<void>, random = 0.9) {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  const spy = jest.spyOn(Math, 'random').mockReturnValue(random);
  try {
    await test();
  } finally {
    spy.mockRestore();
    jest.useRealTimers();
  }
}
const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

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

  it('T-MS01.3 the puppy and the dragon come with their own names', async () => {
    saveSetting(getDb(), 'pet', 'dog');
    const view = await render(<Companion at="today" />);
    expect(screen.getByLabelText('Biscuit the dog, asleep')).toBeTruthy();
    await view.unmount();
    saveSetting(getDb(), 'pet', 'dragon');
    await render(<Companion at="today" />);
    expect(screen.getByLabelText('Ember the dragon, asleep')).toBeTruthy();
  });

  it('T-MS04.4 the last habit of the day ticked: it celebrates, once a day', async () => {
    const id = createHabit(getDb(), { name: 'Drink water', routineId: null, frequency: 'daily' });
    const read = getHabit(getDb(), createHabit(getDb(), { name: 'Read', routineId: null, frequency: 'daily' }))!;
    await render(<Companion at="today" />);
    const today = toDayKey(new Date());
    const tick = async (habit: Parameters<typeof setHabitDone>[1], done = true) => {
      setHabitDone(getDb(), habit, today, done, 0);
      await refresh();
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    };
    await tick(getHabit(getDb(), id)!);
    expect(screen.getByText('Purr! You did a thing! I’m so proud.')).toBeTruthy();
    await tick(read);
    // its lines take turns, so either celebration line
    expect(screen.getByText(/^Purr! (Every habit done today|All of them, done)/)).toBeTruthy();
    // unticked and ticked again: a cheer, not another celebration
    await tick(read, false);
    await tick(read);
    expect(screen.queryByText(/Every habit done|All of them, done/)).toBeNull();
    expect(screen.getByText(/^Purr! /)).toBeTruthy();
  });

  it('T-MS12.6 stay on a tab a few seconds and it comes over from that side, looks round, and curls up again', async () => {
    await onFakeClock(async () => {
      await render(<Companion at="month" />);
      expect(screen.queryByLabelText(/Mochi/)).toBeNull();
      await wait(4900);
      expect(screen.queryByLabelText(/Mochi/)).toBeNull();
      await wait(200);
      expect(useRoam.getState()).toMatchObject({ spot: 'month', from: 'today' });
      // in from the left (Today is left of Month), then up for a look round
      await wait(1200);
      expect(screen.getByLabelText('Mochi the cat, awake')).toBeTruthy();
      await wait(7000);
      expect(screen.getByLabelText('Mochi the cat, asleep')).toBeTruthy();
    });
  });

  it('T-MS12.7 now and then it is too sleepy to come at once, and comes later; at bedtime it stays put', async () => {
    await onFakeClock(async () => {
      const view = await render(<Companion at="week" />);
      await wait(6000);
      expect(useRoam.getState().spot).toBe('today');
      await wait(15_000);
      expect(useRoam.getState().spot).toBe('week');
      await view.unmount();
      mockBedtime.mockReturnValue(true);
      await render(<Companion at="budget" />);
      await wait(60_000);
      expect(useRoam.getState().spot).toBe('week');
    }, 0.1);
  });

  it('T-MS12.8 sulking it always comes over, and says what is wrong only now and then', async () => {
    slipping('Drink water');
    await onFakeClock(async () => {
      const view = await render(<Companion at="habits" />);
      await wait(5000);
      await wait(1500);
      expect(screen.getByLabelText('Mochi the cat, a little sad')).toBeTruthy();
      expect(screen.getByText('I miss Drink water. Shall we try today?')).toBeTruthy();
      await view.unmount();
      // over to Week a minute later: it comes, quietly this time
      await render(<Companion at="week" />);
      await wait(6500);
      expect(screen.getByLabelText('Mochi the cat, a little sad')).toBeTruthy();
      expect(screen.queryByText(/Drink water/)).toBeNull();
    }, 0.1);
  });

  it('T-MS12.9 it comes in from the side its last tab is on in the tab bar', () => {
    expect(enterSide('today', 'month')).toBe('left');
    expect(enterSide('budget', 'week')).toBe('right');
    expect(enterSide('habits', 'budget')).toBe('left');
  });
});
