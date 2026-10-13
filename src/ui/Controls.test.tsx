import { fireEvent, render, screen } from '@testing-library/react-native';

import { Checkbox, HabitCircle, Switch } from './Controls';

describe('Checkbox', () => {
  it('T-NFR04.3 is announced as a checkbox with its label and state', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="Morning journal" checked={false} onChange={onChange} showLabel />);
    const box = screen.getByRole('checkbox', { name: 'Morning journal' });
    expect(box.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('marks a ticked item as done for screen readers', async () => {
    await render(<Checkbox label="Warm lemon water" checked onChange={jest.fn()} showLabel />);
    expect(screen.getByRole('checkbox', { name: 'Warm lemon water' }).props.accessibilityState).toEqual({ checked: true });
  });
});

describe('HabitCircle', () => {
  it('future days cannot be ticked', async () => {
    await render(<HabitCircle state="future" label="Vitamins, Thursday 24" />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByLabelText('Vitamins, Thursday 24, not yet')).toBeTruthy();
  });
});

describe('Switch', () => {
  it('reports on/off and flips when pressed', async () => {
    const onChange = jest.fn();
    await render(<Switch label="Calm mode" value onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Calm mode' });
    expect(sw.props.accessibilityState).toEqual({ checked: true });
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
