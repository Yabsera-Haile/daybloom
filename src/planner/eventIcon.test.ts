import { themes } from '@/theme';

import { eventIcon } from './eventIcon';

const lookFor = themes.autumn.lookFor;

describe('event icons', () => {
  it('T-EV06.1 picks the icon from the title, else the category icon', () => {
    expect(eventIcon('Lunch with Sam', lookFor('personal').icon)).toBe('restaurant');
    expect(eventIcon('Morning walk', lookFor('wellness').icon)).toBe('directions_walk');
    expect(eventIcon('Zoom call', lookFor('work').icon)).toBe('videocam');
    expect(eventIcon('Quarterly review', lookFor('work').icon)).toBe(lookFor('work').icon);
  });

  it('matches whole words only', () => {
    expect(eventIcon('Recall notes', 'event')).toBe('event'); // not "call"
    expect(eventIcon('Team project review', 'event')).toBe('groups');
  });
});
