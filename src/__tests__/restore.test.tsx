import { fireEvent, render, screen } from '@testing-library/react-native';

import OnboardingScreen from '@/app/onboarding';
import SettingsScreen from '@/app/settings';
import { backupOf } from '@/backup/export';
import { createTestDb, withTestDb } from '@/db/testDb';
import { createEvent, eventsBetween } from '@/planner/events';
import { createTask } from '@/planner/tasks';
import { readSettings, saveSetting } from '@/settings';
import { useUi } from '@/state/ui';

// the phone's file picker, faked: it hands back whatever file the test chose
let mockPicked: string | null = null;
jest.mock('expo-file-system', () => ({
  File: Object.assign(function File() {}, {
    pickFileAsync: async () =>
      mockPicked === null
        ? { canceled: true, result: null }
        : { canceled: false, result: { text: async () => mockPicked } },
  }),
  Directory: function Directory() {},
  Paths: {},
}));
jest.mock('@/reminders/scheduler', () => ({ askForNotifications: jest.fn(async () => true) }));
jest.mock('@/reminders/notifications', () => ({
  getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
jest.mock('expo-battery', () => ({ isBatteryOptimizationEnabledAsync: async () => false }));
// Settings plays reminder sounds; the tests don't
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), replace: jest.fn() }),
}));

const getDb = withTestDb();
const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime();

/** A backup from Ada's old phone: an event, a to-do and her name. */
async function adasBackup(): Promise<string> {
  const old = await createTestDb();
  createEvent(old, { title: 'Dentist', startAt: at(27, 15), endAt: at(27, 16), timeZone: 'America/New_York' });
  createTask(old, { title: 'Water plants', date: '2026-10-26' });
  saveSetting(old, 'name', 'Ada');
  saveSetting(old, 'onboarded', true);
  return JSON.stringify(backupOf(old, at(23, 9)));
}

beforeEach(() => {
  mockPicked = null;
  useUi.setState({ toast: null });
});

describe('restoring a backup', () => {
  it('T-ST07.5 Settings: the backup says what it holds and when it was made, then replaces the data, with Undo', async () => {
    createTask(getDb(), { title: 'Something here already', date: '2026-10-26' });
    mockPicked = await adasBackup();
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Restore from a backup/ }));

    expect(screen.getByText('Restore this backup?')).toBeTruthy();
    expect(screen.getByText('Made on Friday, October 23')).toBeTruthy();
    expect(screen.getByText('1 event')).toBeTruthy();
    expect(screen.getByText('1 to-do')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Replace with the backup' }));

    expect(readSettings(getDb()).name).toBe('Ada');
    expect(eventsBetween(getDb(), '2026-10-27', '2026-10-27').map((o) => o.title)).toEqual(['Dentist']);
    const toast = useUi.getState().toast!;
    expect(toast.message).toBe('Your backup is back');
    toast.undo!();
    expect(readSettings(getDb()).name).toBeNull();
  });

  it('T-ST07.6 a file that isn’t a backup changes nothing and says so', async () => {
    mockPicked = '{"hello": "world"}';
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Restore from a backup/ }));
    expect(screen.queryByText('Restore this backup?')).toBeNull();
    expect(useUi.getState().toast?.message).toBe(
      'That file isn’t a Daybloom backup. Pick the file named daybloom-backup.',
    );
  });

  it('T-ST07.7 a new phone: the welcome page restores a backup and goes on to the phone’s permissions', async () => {
    mockPicked = await adasBackup();
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Have a backup? Restore it' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Replace with the backup' }));
    expect(screen.getByText('Never miss what matters')).toBeTruthy();
    expect(readSettings(getDb()).name).toBe('Ada');
  });
});
