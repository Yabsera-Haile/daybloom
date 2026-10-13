import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { fromWallTime } from '@/calendar/timezone';

import {
  addCategory,
  categoryUsage,
  DEFAULT_CATEGORY_ID,
  deleteCategory,
  ensureDefaultCategories,
  listCategories,
  moveCategory,
  recolorCategory,
  renameCategory,
  reorderCategories,
} from './categories';
import { createEvent, eventsBetween } from './events';
import { createTask, tasksOn } from './tasks';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('categories', () => {
  it('starts with the five categories from the design, once', () => {
    ensureDefaultCategories(db);
    ensureDefaultCategories(db);
    expect(listCategories(db).map((c) => c.name)).toEqual(['Wellness', 'Work', 'Personal', 'Social', 'Creative']);
    expect(listCategories(db).find((c) => c.id === DEFAULT_CATEGORY_ID)?.name).toBe('Personal'); // EV-07
  });

  it('ST-01 rename, recolor, reorder and add', () => {
    ensureDefaultCategories(db);
    renameCategory(db, 'work', ' Job ');
    recolorCategory(db, 'work', 'creative');
    reorderCategories(db, ['personal', 'work', 'wellness', 'social', 'creative']);
    addCategory(db, 'Family', 'social');
    expect(listCategories(db).map((c) => `${c.name}:${c.colorKey}`)).toEqual([
      'Personal:personal',
      'Job:creative',
      'Wellness:wellness',
      'Social:social',
      'Creative:creative',
      'Family:social',
    ]);
    expect(() => renameCategory(db, 'work', '  ')).toThrow();
  });

  it('counts plans per category, moves them up and down, and deletes with Undo', () => {
    ensureDefaultCategories(db);
    const startAt = fromWallTime({ year: 2024, month: 10, day: 23, hour: 9, minute: 0, second: 0 }, 'America/New_York');
    createEvent(db, {
      title: 'Sync',
      startAt,
      endAt: startAt + 3_600_000,
      timeZone: 'America/New_York',
      categoryId: 'work',
    });
    createTask(db, { title: 'Report', date: '2024-10-23', categoryId: 'work' });
    expect(categoryUsage(db)).toEqual({ work: 2 });

    moveCategory(db, 'work', -1);
    moveCategory(db, 'creative', 1); // already last: stays
    expect(listCategories(db).map((c) => c.id)).toEqual(['work', 'wellness', 'personal', 'social', 'creative']);

    const undo = deleteCategory(db, 'work', DEFAULT_CATEGORY_ID);
    expect(listCategories(db).map((c) => c.id)).not.toContain('work');
    expect(eventsBetween(db, '2024-10-23', '2024-10-23')[0].categoryId).toBe('personal');
    expect(tasksOn(db, '2024-10-23')[0].categoryId).toBe('personal');
    undo();
    expect(categoryUsage(db)).toEqual({ work: 2 });
    expect(listCategories(db)[0].id).toBe('work');
  });
});
