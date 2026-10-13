// Event and to-do categories: a color and a label, editable in Settings (FR-06, ST-01).
import { asc, eq, isNull, max } from 'drizzle-orm';

import { categories } from '@/db/schema';
import { newId, type Db } from '@/db/types';
import { t } from '@/i18n';

export type Category = typeof categories.$inferSelect;

/** Palette keys from design/tokens.json, in the order the design lists them. */
export const CATEGORY_COLORS = ['wellness', 'work', 'personal', 'social', 'creative'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** New events start in Personal (EV-07). The starter categories use their color key as id. */
export const DEFAULT_CATEGORY_ID: CategoryColor = 'personal';

/** Adds the five starter categories on first run. */
export function ensureDefaultCategories(db: Db): void {
  if (db.select({ id: categories.id }).from(categories).limit(1).get()) return;
  db.insert(categories)
    .values(CATEGORY_COLORS.map((key, i) => ({ id: key, name: t.categories[key], colorKey: key, sortOrder: i })))
    .run();
}

export function listCategories(db: Db): Category[] {
  return db.select().from(categories).where(isNull(categories.archivedAt)).orderBy(asc(categories.sortOrder)).all();
}

function cleanName(name: string): string {
  const clean = name.trim();
  if (!clean) throw new Error('A category needs a name');
  return clean;
}

export function addCategory(db: Db, name: string, colorKey: CategoryColor): string {
  const id = newId();
  const last = db.select({ n: max(categories.sortOrder) }).from(categories).get()?.n ?? -1;
  db.insert(categories).values({ id, name: cleanName(name), colorKey, sortOrder: last + 1 }).run();
  return id;
}

export function renameCategory(db: Db, id: string, name: string): void {
  db.update(categories).set({ name: cleanName(name) }).where(eq(categories.id, id)).run();
}

export function recolorCategory(db: Db, id: string, colorKey: CategoryColor): void {
  db.update(categories).set({ colorKey }).where(eq(categories.id, id)).run();
}

/** Saves the order the user dragged the categories into. */
export function reorderCategories(db: Db, idsInOrder: string[]): void {
  db.transaction((tx) => {
    idsInOrder.forEach((id, i) => tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, id)).run());
  });
}
