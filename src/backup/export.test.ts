import { ensureDefaultSpendCategories } from '@/budget/categories';
import { addExpense } from '@/budget/entries';
import { saveDraft } from '@/data/drafts';
import { withTestDb } from '@/db/testDb';
import { createHabit, ensureDefaultRoutines, setHabitDone } from '@/habits/store';
import { ensureDefaultCategories } from '@/planner/categories';
import { createEvent } from '@/planner/events';
import { createTask } from '@/planner/tasks';
import { saveSetting } from '@/settings';

import { backupFileName, backupOf } from './export';

const getDb = withTestDb();
const at = (d: number, h: number) => new Date(2024, 9, d, h).getTime();

describe('backup', () => {
  it('T-ST02.1 the file holds every event, to-do, habit, tick and expense, and no drafts', () => {
    const db = getDb();
    ensureDefaultCategories(db);
    ensureDefaultRoutines(db);
    ensureDefaultSpendCategories(db);
    createEvent(db, { title: 'Dentist', startAt: at(24, 15), endAt: at(24, 16), timeZone: 'America/New_York' }, [10]);
    createTask(db, { title: 'Water plants', date: '2024-10-23' });
    const tea = createHabit(db, { name: 'Herbal tea', frequency: 'daily', routineId: 'evening' });
    setHabitDone(db, { id: tea, frequency: 'daily' }, '2024-10-23', true, 1);
    addExpense(db, {
      amountCents: 625,
      description: 'Latte',
      categoryId: 'dining',
      occurredAt: at(23, 9),
      currency: 'USD',
    });
    saveSetting(db, 'name', 'Ada');
    saveDraft(db, 'task.day', { title: 'half typed' });

    const backup = JSON.parse(JSON.stringify(backupOf(db, at(23, 13))));
    expect(backup.app).toBe('Daybloom');
    expect(backup.dataVersion).toBeGreaterThan(0);
    expect(backup.tables.events.map((e: { title: string }) => e.title)).toEqual(['Dentist']);
    expect(backup.tables.reminders).toHaveLength(3); // the event's and both routines'
    expect(backup.tables.tasks.map((x: { title: string }) => x.title)).toEqual(['Water plants']);
    expect(backup.tables.habits.map((h: { name: string }) => h.name)).toEqual(['Herbal tea']);
    expect(backup.tables.habitChecks).toEqual([expect.objectContaining({ habitId: tea, period: '2024-10-23' })]);
    expect(backup.tables.entries[0]).toEqual(expect.objectContaining({ description: 'Latte', amountCents: 625 }));
    expect(backup.tables.settings).toEqual([{ key: 'name', value: '"Ada"' }]);
    expect(backup.tables.routines).toHaveLength(2);
    expect(JSON.stringify(backup)).not.toContain('half typed');
    expect(backupFileName(at(23, 13))).toBe('daybloom-backup-2024-10-23.json');
  });
});
