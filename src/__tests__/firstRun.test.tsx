import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import OnboardingScreen from '@/app/onboarding';
import { withTestDb } from '@/db/testDb';
import { TOUR_FLAG, useTour } from '@/features/tour/store';
import { Tour } from '@/features/tour/Tour';
import { readFlag, readSettings } from '@/settings';

// the phone, faked: reminders not yet allowed; texts can be read once allowed; battery limited
const phone = { texts: false, popUp: false, batteryLimited: true, module: true };
jest.mock('@/reminders/notifications', () => ({
  getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
jest.mock('@/reminders/scheduler', () => ({ askForNotifications: jest.fn(async () => true) }));
jest.mock('expo-battery', () => ({ isBatteryOptimizationEnabledAsync: async () => phone.batteryLimited }));
jest.mock('@/sms/native', () => {
  const module = {
    hasPermission: () => phone.texts,
    canPopUp: () => phone.popUp,
    openPopUpSettings: jest.fn(),
  };
  return {
    get sms() {
      return phone.module ? module : null;
    },
    requestTexts: jest.fn(async () => {
      phone.texts = true;
      return 'granted';
    }),
  };
});

const getDb = withTestDb();

beforeEach(() => {
  Object.assign(phone, { texts: false, popUp: false, batteryLimited: true, module: true });
  jest.clearAllMocks();
});
afterEach(() => jest.restoreAllMocks());

const tap = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('first run', () => {
  it('T-ON01.2 asks for reminders, payment texts, popping up and the battery, one page each, then opens the planner', async () => {
    // the battery page is Android's
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<OnboardingScreen />);
    await tap('Get started');
    await tap('Skip this');
    expect(screen.getByText('Would you like a companion?')).toBeTruthy();
    await tap('Skip this');
    expect(screen.getByText('Never miss what matters')).toBeTruthy();
    await tap('Not now');
    expect(await screen.findByText('Spending from your payment texts')).toBeTruthy();
    await tap('Allow reading texts');
    // allowed: the pop-up page follows
    expect(await screen.findByText('Ask right away, over any app')).toBeTruthy();
    await tap('Not now');
    expect(screen.getByText('Keep reminders on time')).toBeTruthy();
    await tap('Not now');
    expect(screen.getByText('Change any of these in Settings › Phone permissions.')).toBeTruthy();
    await tap('Open my planner');
    expect(readSettings(getDb()).onboarded).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('T-ON01.3 pages that don’t apply are left out: no texts here, battery not limited', async () => {
    phone.module = false;
    phone.batteryLimited = false;
    await render(<OnboardingScreen />);
    await tap('Get started');
    await tap('Skip this');
    await tap('Skip this');
    await tap('Not now');
    expect(await screen.findByText('Open my planner')).toBeTruthy();
    expect(screen.queryByText('Spending from your payment texts')).toBeNull();
    expect(screen.queryByText('Keep reminders on time')).toBeNull();
  });

  it('T-ON01.4 texts not allowed: the pop-up page is skipped', async () => {
    phone.batteryLimited = false;
    await render(<OnboardingScreen />);
    await tap('Get started');
    await tap('Skip this');
    await tap('Skip this');
    await tap('Not now');
    await screen.findByText('Spending from your payment texts');
    await tap('Not now');
    expect(screen.queryByText('Ask right away, over any app')).toBeNull();
    expect(screen.getByText('Open my planner')).toBeTruthy();
  });
});

describe('the companion page', () => {
  it('T-ON03.1 pick the cat, name it Biscuit and make it cheeky', async () => {
    await render(<OnboardingScreen />);
    await tap('Get started');
    await tap('Skip this');
    await fireEvent.press(screen.getByRole('radio', { name: 'Cat' }));
    await fireEvent.changeText(screen.getByLabelText('Its name'), 'Biscuit');
    await fireEvent.press(screen.getByRole('radio', { name: /^Cheeky/ }));
    await tap('Continue');
    expect(readSettings(getDb())).toMatchObject({ pet: 'cat', petName: 'Biscuit', petPersonality: 'cheeky' });
    expect(screen.getByText('Never miss what matters')).toBeTruthy();
  });

  it('T-ON03.2 "No thanks" turns the companion off', async () => {
    await render(<OnboardingScreen />);
    await tap('Get started');
    await tap('Skip this');
    await fireEvent.press(screen.getByRole('radio', { name: 'No thanks' }));
    expect(screen.queryByLabelText('Its name')).toBeNull();
    await tap('Continue');
    expect(readSettings(getDb()).pet).toBe('off');
  });
});

describe('the tour', () => {
  afterEach(() => act(() => useTour.setState({ step: null })));

  it('T-ON02.1 walks through each part of the app, meeting the companion, moving between tabs, and can go back', async () => {
    useTour.getState().start();
    await render(<Tour />);
    expect(await screen.findByText('A quick look around')).toBeTruthy();
    await tap('Show me');
    expect(await screen.findByText('1 of 15')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Add anything')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Meet Mochi')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Week')).toBeTruthy();
    expect(router.navigate).toHaveBeenCalledWith('/week');
    await tap('Back');
    expect(await screen.findByText('Meet Mochi')).toBeTruthy();
  });

  it('T-ON02.2 the tour shows habits, budget, savings and bank texts step by step, and ends on Today', async () => {
    useTour.setState({ step: 6, part: 'app' });
    await render(<Tour />);
    expect(await screen.findByText('Habits')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Budget')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Savings and bills')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('Spending from your bank texts')).toBeTruthy();
    for (const title of [
      'Pick who texts you',
      'Check what it understood',
      'Add this month’s payments',
      'Say what it was for',
      'Fees, and texts it doesn’t know',
    ]) {
      await tap('Next');
      expect(await screen.findByText(title)).toBeTruthy();
    }
    await tap('Next');
    expect(await screen.findByText('Search')).toBeTruthy();
    await tap('Next');
    expect(await screen.findByText('You’re ready')).toBeTruthy();
    await tap('Start planning');
    expect(useTour.getState().step).toBeNull();
    expect(readFlag(getDb(), TOUR_FLAG)).toBe(true);
    expect(router.navigate).toHaveBeenLastCalledWith('/');
  });

  it('T-ON02.3 Skip tour ends it and remembers', async () => {
    useTour.getState().start();
    await render(<Tour />);
    await screen.findByText('A quick look around');
    await tap('Skip tour');
    expect(useTour.getState().step).toBeNull();
    expect(readFlag(getDb(), TOUR_FLAG)).toBe(true);
    expect(screen.queryByText('A quick look around')).toBeNull();
  });

  it('T-ON02.5 "How it works" on bank texts shows just that part, and ends where it started', async () => {
    useTour.getState().start('texts');
    await render(<Tour />);
    expect(await screen.findByText('Spending from your bank texts')).toBeTruthy();
    await tap('Show me');
    expect(await screen.findByText('1 of 5')).toBeTruthy();
    expect(screen.getByText('Pick who texts you')).toBeTruthy();
    for (let i = 0; i < 4; i++) await tap('Next');
    expect(await screen.findByText('Fees, and texts it doesn’t know')).toBeTruthy();
    await tap('Got it');
    expect(useTour.getState().step).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    // this part alone doesn't count as having seen the tour
    expect(readFlag(getDb(), TOUR_FLAG)).toBe(false);
  });
});
