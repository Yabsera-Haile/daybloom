import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { addCategory, DEFAULT_CATEGORY_ID, ensureDefaultCategories, listCategories, recolorCategory, renameCategory, reorderCategories } from './categories';

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
});
