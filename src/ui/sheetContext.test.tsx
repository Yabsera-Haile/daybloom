import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from './Sheet';
import { usePressRetention } from './sheetContext';

/** Shows how forgiving a press would be where it is drawn. */
function Probe({ where }: { where: string }) {
  const retention = usePressRetention();
  return <Text>{`${where}: ${retention ? `${retention.top} up, ${retention.bottom} down` : 'default'}`}</Text>;
}

describe('presses inside sheets', () => {
  it('controls in a sheet keep their press when the finger drifts; on a page they keep the default', async () => {
    await render(
      <>
        <Probe where="page" />
        <Sheet visible onClose={() => undefined} title="Sender">
          <Probe where="sheet" />
        </Sheet>
      </>,
    );
    expect(screen.getByText('page: default')).toBeTruthy();
    expect(screen.getByText('sheet: 100 up, 100 down')).toBeTruthy();
  });
});
