import { act, render, screen, within } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { ensureDefaultSpendCategories } from '@/budget/categories';
import { withTestDb } from '@/db/testDb';
import { isTablet } from '@/features/useOrientation';
import BudgetScreen from '@/app/(tabs)/budget';
import TodayScreen from '@/app/(tabs)/index';
import MonthScreen from '@/app/(tabs)/month';
import WeekScreen from '@/app/(tabs)/week';
import { ContentWidth, useNarrow, useWide } from '@/ui';

const getDb = withTestDb();
const phone = Dimensions.get('window');

/** Pretends the app runs on a screen this many dp wide (text at its usual size unless said). */
async function screenOf(width: number, height: number, fontScale = 1) {
  const size = { width, height, scale: 2, fontScale };
  await act(async () => Dimensions.set({ window: size, screen: size }));
}

afterEach(() => act(async () => Dimensions.set({ window: phone, screen: phone })));
beforeEach(() => ensureDefaultSpendCategories(getDb()));

function Probe() {
  const { panes, rail } = useWide();
  const narrow = useNarrow();
  return <Text>{[panes && 'panes', rail && 'rail', narrow && 'narrow'].filter(Boolean).join(' ') || 'phone'}</Text>;
}

describe('bigger screens (NFR-14)', () => {
  it('T-NFR14.1 phones keep the phone design; 720dp shows two panes; 840dp moves the tabs to a rail', async () => {
    // the test window is a phone: 750px at text size 2 = 375dp of room
    await render(<Probe />);
    expect(screen.getByText('narrow')).toBeTruthy();
    await screenOf(412, 915);
    expect(screen.getByText('phone')).toBeTruthy();
    await screenOf(800, 1280);
    expect(screen.getByText('panes')).toBeTruthy();
    await screenOf(1280, 800);
    expect(screen.getByText('panes rail')).toBeTruthy();
    // large text counts as less room: 800dp at 130% is a single column
    await screenOf(800, 1280, 1.3);
    expect(screen.getByText('phone')).toBeTruthy();
  });

  it('T-NFR14.2 a row in a narrow pane stacks like on a small phone', async () => {
    await screenOf(1280, 800);
    await render(
      <ContentWidth.Provider value={360}>
        <Probe />
      </ContentWidth.Provider>,
    );
    expect(screen.getByText('panes rail narrow')).toBeTruthy();
  });

  it('T-NFR14.3 tablets and unfolded foldables turn; phones and folded ones stay upright', () => {
    expect(isTablet({ width: 412, height: 915 })).toBe(false);
    expect(isTablet({ width: 800, height: 1280 })).toBe(true);
    expect(isTablet({ width: 1280, height: 800 })).toBe(true);
    expect(isTablet({ width: 673, height: 841 })).toBe(true);
  });

  it('T-NFR14.4 on a tablet each tab shows a second pane: timeline, spread, the chosen day, spending', async () => {
    await screenOf(1280, 800);
    const cases: [() => React.ReactElement, string, string][] = [
      [() => <TodayScreen />, 'Hourly Timeline', 'Today'],
      [() => <WeekScreen />, 'Weekly Spread', 'Weekly Intention'],
      [() => <MonthScreen />, 'Coming up this month', 'Grid'],
      [() => <BudgetScreen />, 'Recent spending', ' budget'],
    ];
    for (const [Screen, side, main] of cases) {
      const view = await render(<Screen />);
      expect(within(screen.getByTestId('pane-side')).getByText(side)).toBeTruthy();
      expect(within(screen.getByTestId('pane-main')).queryByText(side)).toBeNull();
      expect(within(screen.getByTestId('pane-main')).getAllByText(new RegExp(main, 'i')).length).toBeGreaterThan(0);
      await view.unmount();
    }
  });

  it('T-NFR14.5 on a phone the same parts stay in the one page, where the design has them', async () => {
    await render(<TodayScreen />);
    expect(screen.queryByTestId('pane-side')).toBeNull();
    expect(screen.getByText('Hourly Timeline')).toBeTruthy();
  });
});
