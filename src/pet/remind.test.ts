import type { PlannedReminder } from '@/reminders/plan';

import { withPet, type PetVoice } from './remind';

const reminder: PlannedReminder = {
  id: 'event.abc.2026-10-25.10',
  fireAt: 0,
  title: '3:00 PM · Dentist',
  body: 'In 10 minutes',
  urgent: false,
  atStart: false,
  data: { kind: 'event', day: '2026-10-25', at: 0, sig: 's' },
};
const mochi: PetVoice = { kind: 'cat', name: 'Mochi', personality: 'gentle', picture: 'file:///pet/cat-2.png' };

describe('the pet in reminders (MS-03)', () => {
  it('T-MS03.4 time and title stay first; the pet speaks after them, with its picture', () => {
    const r = withPet(reminder, mochi);
    expect(r.title).toBe('3:00 PM · Dentist');
    expect(r.body).toMatch(/^In 10 minutes · Mochi: /);
    expect(r.data.largeIcon).toBe('file:///pet/cat-2.png');
  });

  it('T-MS03.5 a reminder keeps its line; a cheeky pet has cheeky ones; a change of pet sends them again', () => {
    expect(withPet(reminder, mochi).body).toBe(withPet(reminder, mochi).body);
    const cheeky = withPet(reminder, { ...mochi, personality: 'cheeky' });
    expect(['Don’t make me ask twice.', 'Chop chop!', 'I’m watching… lovingly.', 'No excuses today.']).toContain(
      cheeky.body.split('Mochi: ')[1],
    );
    expect(cheeky.data.sig).not.toBe(withPet(reminder, mochi).data.sig);
    expect(withPet(reminder, { ...mochi, name: 'Biscuit' }).data.sig).not.toBe(withPet(reminder, mochi).data.sig);
  });

  it('T-MS05.2 no pet (off, or Calm mode): the reminder is as it was', () => {
    expect(withPet(reminder, null)).toBe(reminder);
  });
});
