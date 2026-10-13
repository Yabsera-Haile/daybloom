import { categoryLooks } from '@/theme';

import { eventIcon } from './eventIcon';

describe('event icons', () => {
  it('T-EV06.1 picks the icon from the title, else the category icon', () => {
    expect(eventIcon('Lunch with Sam', categoryLooks.personal.icon)).toBe('restaurant');
    expect(eventIcon('Morning walk', categoryLooks.wellness.icon)).toBe('directions_walk');
    expect(eventIcon('Zoom call', categoryLooks.work.icon)).toBe('videocam');
    expect(eventIcon('Quarterly review', categoryLooks.work.icon)).toBe(categoryLooks.work.icon);
  });

  it('matches whole words only', () => {
    expect(eventIcon('Recall notes', 'event')).toBe('event'); // not "call"
    expect(eventIcon('Team project review', 'event')).toBe('groups');
  });
});
