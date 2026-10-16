// Spending categories (BU-08): a name, an icon and one of the five category colors. A few to start
// with; people add their own. Deleting one archives it, so past spending keeps its name.
import { asc, eq, isNull, max } from 'drizzle-orm';

import { budgetCategories } from '@/db/schema';
import { newId, type Db, type Undo } from '@/db/types';
import { t } from '@/i18n';
import { CATEGORY_COLORS, type CategoryColor } from '@/planner/categories';
import type { IconName } from '@/ui';

export type SpendCategory = typeof budgetCategories.$inferSelect;
export const SPEND_COLORS = CATEGORY_COLORS;

/** Icons to choose from for a category. */
export const SPEND_ICONS = [
  'local_mall',
  'restaurant',
  'local_cafe',
  'directions_bus',
  'local_gas_station',
  'home',
  'receipt_long',
  'sell',
  'shopping_bag',
  'checkroom',
  'favorite',
  'fitness_center',
  'palette',
  'school',
  'child_care',
  'pets',
  'flight_takeoff',
  'redeem',
  'more_horiz',
] as const satisfies readonly IconName[];

const STARTERS: { id: keyof typeof t.budget.starterCategories; icon: IconName; colorKey: CategoryColor }[] = [
  { id: 'groceries', icon: 'local_mall', colorKey: 'wellness' },
  { id: 'dining', icon: 'restaurant', colorKey: 'creative' },
  { id: 'transport', icon: 'directions_bus', colorKey: 'work' },
  { id: 'home', icon: 'home', colorKey: 'personal' },
  { id: 'bills', icon: 'receipt_long', colorKey: 'social' },
  { id: 'health', icon: 'favorite', colorKey: 'wellness' },
  { id: 'fun', icon: 'palette', colorKey: 'personal' },
  { id: 'other', icon: 'more_horiz', colorKey: 'creative' },
];

/** Bills that are paid land in this one while it exists. */
export const BILLS_CATEGORY_ID = 'bills';

/** Adds the starter categories on first run. Their ids are their keys. */
export function ensureDefaultSpendCategories(db: Db): void {
  if (db.select({ id: budgetCategories.id }).from(budgetCategories).limit(1).get()) return;
  db.insert(budgetCategories)
    .values(STARTERS.map((c, i) => ({ ...c, name: t.budget.starterCategories[c.id], sortOrder: i })))
    .run();
}

/** The categories to choose from, in their order. */
export function listSpendCategories(db: Db): SpendCategory[] {
  return db
    .select()
    .from(budgetCategories)
    .where(isNull(budgetCategories.archivedAt))
    .orderBy(asc(budgetCategories.sortOrder))
    .all();
}

/** Every category, deleted ones too, for naming past spending. */
export function allSpendCategories(db: Db): SpendCategory[] {
  return db.select().from(budgetCategories).orderBy(asc(budgetCategories.sortOrder)).all();
}

export type SpendCategoryInput = { name: string; icon: string; colorKey: CategoryColor };

function clean(input: SpendCategoryInput) {
  const name = input.name.trim();
  if (!name) throw new Error('A category needs a name');
  return { name, icon: input.icon, colorKey: input.colorKey };
}

export function addSpendCategory(db: Db, input: SpendCategoryInput): string {
  const id = newId();
  const last =
    db
      .select({ n: max(budgetCategories.sortOrder) })
      .from(budgetCategories)
      .get()?.n ?? -1;
  db.insert(budgetCategories)
    .values({ id, ...clean(input), sortOrder: last + 1 })
    .run();
  return id;
}

export function updateSpendCategory(db: Db, id: string, input: SpendCategoryInput): void {
  db.update(budgetCategories).set(clean(input)).where(eq(budgetCategories.id, id)).run();
}

/** "Move up" / "Move down" in More › Spending categories. */
export function moveSpendCategory(db: Db, id: string, by: -1 | 1): void {
  const ids = listSpendCategories(db).map((c) => c.id);
  const i = ids.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  db.transaction((tx) => {
    ids.forEach((cid, n) =>
      tx.update(budgetCategories).set({ sortOrder: n }).where(eq(budgetCategories.id, cid)).run(),
    );
  });
}

/** Takes a category off the list; its past spending keeps the name. */
export function deleteSpendCategory(db: Db, id: string): Undo {
  db.update(budgetCategories).set({ archivedAt: Date.now() }).where(eq(budgetCategories.id, id)).run();
  return () => db.update(budgetCategories).set({ archivedAt: null }).where(eq(budgetCategories.id, id)).run();
}
