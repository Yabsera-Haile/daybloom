import { withTestDb } from '@/db/testDb';

import { readDraft, saveDraft } from './drafts';

const getDb = withTestDb();

describe('drafts', () => {
  it('T-UX05 typed text is kept until it is saved, and empty forms leave nothing behind', () => {
    const db = getDb();
    saveDraft(db, 'expense', { amount: '6.25', description: '' });
    saveDraft(db, 'expense', { amount: '6.25', description: 'Latte' });
    expect(readDraft(db, 'expense')).toEqual({ amount: '6.25', description: 'Latte' });
    expect(readDraft(db, 'task.day')).toBeNull();
    // clearing every field forgets the draft
    saveDraft(db, 'expense', { amount: ' ', description: '' });
    expect(readDraft(db, 'expense')).toBeNull();
    saveDraft(db, 'event', { title: 'Dentist' });
    saveDraft(db, 'event', null);
    expect(readDraft(db, 'event')).toBeNull();
  });
});
