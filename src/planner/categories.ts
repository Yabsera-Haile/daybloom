// Event and to-do categories: a color and a label, editable in Settings (FR-06, ST-01).
import { and, asc, count, eq, inArray, isNull, max } from 'drizzle-orm';

import { categories, events, tasks } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
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
  const last =
    db
      .select({ n: max(categories.sortOrder) })
      .from(categories)
      .get()?.n ?? -1;
  db.insert(categories)
    .values({ id, name: cleanName(name), colorKey, sortOrder: last + 1 })
    .run();
  return id;
}

export function renameCategory(db: Db, id: string, name: string): void {
  db.update(categories)
    .set({ name: cleanName(name) })
    .where(eq(categories.id, id))
    .run();
}

export function recolorCategory(db: Db, id: string, colorKey: CategoryColor): void {
  db.update(categories).set({ colorKey }).where(eq(categories.id, id)).run();
}

/** Saves a new order (the add form lists categories in this order). */
export function reorderCategories(db: Db, idsInOrder: string[]): void {
  db.transaction((tx) => {
    idsInOrder.forEach((id, i) => tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, id)).run());
  });
}

/** "Move up" / "Move down" in Settings › Categories. */
export function moveCategory(db: Db, id: string, by: -1 | 1): void {
  const ids = listCategories(db).map((c) => c.id);
  const i = ids.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  reorderCategories(db, ids);
}

/** How many events and to-dos use each category (worked out, never stored: FR-13). */
export function categoryUsage(db: Db): Record<string, number> {
  const usage: Record<string, number> = {};
  const rows = [
    ...db
      .select({ id: events.categoryId, n: count() })
      .from(events)
      .where(and(isNull(events.deletedAt), isNull(events.seriesId)))
      .groupBy(events.categoryId)
      .all(),
    ...db
      .select({ id: tasks.categoryId, n: count() })
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .groupBy(tasks.categoryId)
      .all(),
  ];
  for (const r of rows) if (r.id) usage[r.id] = (usage[r.id] ?? 0) + r.n;
  return usage;
}

/** Deletes a category; its plans move to `moveTo`. Undo puts everything back. */
export function deleteCategory(db: Db, id: string, moveTo: string): Undo {
  const eventIds = db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.categoryId, id))
    .all()
    .map((r) => r.id);
  const taskIds = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.categoryId, id))
    .all()
    .map((r) => r.id);
  db.transaction((tx) => {
    if (eventIds.length) tx.update(events).set({ categoryId: moveTo }).where(inArray(events.id, eventIds)).run();
    if (taskIds.length) tx.update(tasks).set({ categoryId: moveTo }).where(inArray(tasks.id, taskIds)).run();
    tx.update(categories).set({ archivedAt: Date.now() }).where(eq(categories.id, id)).run();
  });
  return () => {
    db.transaction((tx) => {
      if (eventIds.length) tx.update(events).set({ categoryId: id }).where(inArray(events.id, eventIds)).run();
      if (taskIds.length) tx.update(tasks).set({ categoryId: id }).where(inArray(tasks.id, taskIds)).run();
      tx.update(categories).set({ archivedAt: null }).where(eq(categories.id, id)).run();
    });
  };
}
