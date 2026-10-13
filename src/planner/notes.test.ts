import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { createHourNote, deleteHourNote, hourNotesOn, setWeekIntention, updateHourNote, weekIntention } from './notes';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('hour notes', () => {
  it('TD-15 lists a day\'s notes by hour, in the order written; they can be ticked, edited and deleted', () => {
    createHourNote(db, { date: '2024-10-23', hour: 14, text: 'Pick up dry cleaning' });
    const id = createHourNote(db, { date: '2024-10-23', hour: 10, text: 'Prep for 1:1' });
    createHourNote(db, { date: '2024-10-23', hour: 14, text: 'Pay rent' });
    createHourNote(db, { date: '2024-10-24', hour: 9, text: 'Another day' });
    expect(hourNotesOn(db, '2024-10-23').map((n) => `${n.hour} ${n.text}`)).toEqual(['10 Prep for 1:1', '14 Pick up dry cleaning', '14 Pay rent']);

    updateHourNote(db, id, { done: true, text: 'Prep for the 1:1' });
    expect(hourNotesOn(db, '2024-10-23')[0]).toMatchObject({ text: 'Prep for the 1:1', done: true });

    const undo = deleteHourNote(db, id);
    expect(hourNotesOn(db, '2024-10-23')).toHaveLength(2);
    undo();
    expect(hourNotesOn(db, '2024-10-23')).toHaveLength(3);
  });

  it('needs text and a real hour', () => {
    expect(() => createHourNote(db, { date: '2024-10-23', hour: 24, text: 'x' })).toThrow();
    expect(() => createHourNote(db, { date: '2024-10-23', hour: 9, text: '  ' })).toThrow();
  });
});

describe('weekly intention', () => {
  it('WK-05 one sentence per week; blank clears it', () => {
    expect(weekIntention(db, '2024-10-20')).toBeNull();
    setWeekIntention(db, '2024-10-20', ' Rest more, rush less. ');
    expect(weekIntention(db, '2024-10-20')).toBe('Rest more, rush less.');
    setWeekIntention(db, '2024-10-20', 'Be kind to myself.');
    expect(weekIntention(db, '2024-10-20')).toBe('Be kind to myself.');
    expect(weekIntention(db, '2024-10-27')).toBeNull();
    setWeekIntention(db, '2024-10-20', '');
    expect(weekIntention(db, '2024-10-20')).toBeNull();
  });

  it('stays visible after switching the week to start on Monday', () => {
    setWeekIntention(db, '2024-10-21', 'Monday-start week'); // saved while weeks started on Monday
    expect(weekIntention(db, '2024-10-20')).toBe('Monday-start week'); // now the Sunday-start week holds it
  });
});
