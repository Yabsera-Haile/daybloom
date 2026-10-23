import { notifyDataChanged, onDataChanged, onlyTouched, touched, type Changed } from './live';

describe('which tables changed', () => {
  it('one burst of changes reports every table it touched', async () => {
    const seen: Changed[] = [];
    const stop = onDataChanged((tables) => seen.push(tables));
    notifyDataChanged('entries');
    notifyDataChanged('sms_senders');
    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();
    expect(seen.map((t) => [...t].sort())).toEqual([['entries', 'sms_senders']]);
  });

  it('reminders skip changes made only to tables they never read', () => {
    const noReminders = new Set(['entries', 'sms_senders']);
    expect(onlyTouched(new Set(['entries', 'sms_senders']), noReminders)).toBe(true);
    expect(onlyTouched(new Set(['entries', 'tasks']), noReminders)).toBe(false);
    // not knowing what changed (the app coming back) counts as everything
    expect(onlyTouched(new Set(['*']), noReminders)).toBe(false);
    expect(touched(new Set(['*']), new Set(['settings']))).toBe(true);
    expect(touched(new Set(['tasks']), new Set(['settings']))).toBe(false);
  });
});
