import { eq } from 'drizzle-orm';

import { toDayKey } from '@/calendar/dates';
import { habits } from '@/db/schema';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { createHabit, getHabit, setHabitDone } from '@/habits/store';
import type { PlannedReminder } from '@/reminders/plan';

import { cheekyNudge, withPet, type PetVoice } from './remind';

const reminder: PlannedReminder = {
  id: 'event.abc.2026-10-25.10',
  fireAt: 0,
  title: '3:00 PM · Dentist',
  body: 'In 10 minutes',
  urgent: false,
  atStart: false,
  data: { kind: 'event', day: '2026-10-25', at: 0, sig: 's' },
};
const mochi: PetVoice = {
  kind: 'cat',
  name: 'Mochi',
  personality: 'gentle',
  picture: 'file:///pet/cat-happy-3.png',
  crossPicture: 'file:///pet/cat-cross-3.png',
};

describe('the pet in reminders (MS-03)', () => {
  it('T-MS03.4 time and title stay first; the pet speaks after them, with its picture', () => {
    const r = withPet(reminder, mochi);
    expect(r.title).toBe('3:00 PM · Dentist');
    expect(r.body).toMatch(/^In 10 minutes · Mochi: /);
    expect(r.data.largeIcon).toBe('file:///pet/cat-happy-3.png');
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

describe('Cheeky’s nudge (MS-07)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });
  const morning = new Date();
  morning.setHours(10, 0, 0, 0);
  const evening = new Date(morning);
  evening.setHours(20, 0, 0, 0);
  const cheeky: PetVoice = { ...mochi, personality: 'cheeky' };
  /** A daily habit added four days ago and not ticked since; it reminds at 8 AM unless `quiet`. */
  const slipping = (name: string, quiet = false) => {
    const id = createHabit(db, { name, routineId: null, frequency: 'daily', reminderTime: quiet ? null : '08:00' });
    db.update(habits)
      .set({ createdAt: Date.now() - 4 * 86_400_000 })
      .where(eq(habits.id, id))
      .run();
    return getHabit(db, id)!;
  };

  it('T-MS07.2 one nudge, at 7 PM today, about a slipping habit that reminds; its Done ticks the habit', () => {
    const water = slipping('Drink water');
    const nudge = cheekyNudge(db, morning.getTime(), cheeky)!;
    expect(nudge.id).toBe(`n.${toDayKey(morning)}`);
    expect(new Date(nudge.fireAt).getHours()).toBe(19);
    expect(nudge.title).toBe('Drink water');
    expect(nudge.body).toBe('Mochi: Ahem. Drink water? Two days now.');
    expect(nudge.data).toMatchObject({ kind: 'habit', habitId: water.id, largeIcon: 'file:///pet/cat-cross-3.png' });
  });

  it('T-MS07.3 no nudge from a gentle pet, for a habit without a reminder, after 7 PM, or once it’s ticked', () => {
    const water = slipping('Drink water');
    expect(cheekyNudge(db, morning.getTime(), mochi)).toBeNull();
    expect(cheekyNudge(db, morning.getTime(), null)).toBeNull();
    expect(cheekyNudge(db, evening.getTime(), cheeky)).toBeNull();
    setHabitDone(db, water, toDayKey(morning), true, 0);
    expect(cheekyNudge(db, morning.getTime(), cheeky)).toBeNull();
    slipping('Stretch', true);
    expect(cheekyNudge(db, morning.getTime(), cheeky)).toBeNull();
  });
});
