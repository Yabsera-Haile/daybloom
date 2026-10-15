import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  addSpendCategory,
  deleteSpendCategory,
  listSpendCategories,
  moveSpendCategory,
  SPEND_COLORS,
  SPEND_ICONS,
  updateSpendCategory,
  type SpendCategory,
} from '@/budget/categories';
import { db } from '@/db/client';
import { useLive } from '@/data/live';
import { CategoryIcon, ListCard } from '@/features/budget/parts';
import { t } from '@/i18n';
import type { CategoryColor } from '@/planner/categories';
import { useUi } from '@/state/ui';
import { useTheme } from '@/theme';
import { Button, Icon, Page, Sheet, Text, TextField } from '@/ui';

function CategorySheet({
  category,
  index,
  count,
  onClose,
}: {
  category: SpendCategory | null;
  index: number;
  count: number;
  onClose: () => void;
}) {
  const { categoryColors, lookFor } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState<string>(category?.icon ?? 'sell');
  const [color, setColor] = useState<CategoryColor>((category?.colorKey as CategoryColor) ?? 'personal');
  const canSave = name.trim().length > 0;
  const c = t.budget.categories;

  const save = () => {
    if (!canSave) return;
    const input = { name, icon, colorKey: color };
    if (category) updateSpendCategory(db, category.id, input);
    else addSpendCategory(db, input);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={category ? c.editTitle : c.newTitle} closeButton>
      <View className="gap-space-md pb-space-sm">
        <View className="flex-row items-center gap-space-md">
          <CategoryIcon category={{ icon, colorKey: color }} size={56} />
          <View className="flex-1 gap-1">
            <Text variant="labelMd" color="onSurfaceVariant">
              {c.name}
            </Text>
            <TextField
              autoFocus={!category}
              accessibilityLabel={c.name}
              placeholder={c.namePlaceholder}
              value={name}
              onChangeText={setName}
              className="h-12 rounded-xl border-[1.5px] border-primary bg-surface px-3"
            />
          </View>
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {c.icon}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {SPEND_ICONS.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ checked: icon === name }}
                accessibilityLabel={name.replace(/_/g, ' ')}
                onPress={() => setIcon(name)}
                className={`h-12 w-12 items-center justify-center rounded-xl border-2 ${icon === name ? 'border-primary bg-primary-fixed' : 'border-transparent bg-surface-container'}`}>
                <Icon name={name} color={icon === name ? 'onPrimaryFixed' : 'onSurfaceVariant'} />
              </Pressable>
            ))}
          </View>
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {c.color}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row gap-space-sm">
            {SPEND_COLORS.map((key) => {
              const on = color === key;
              const look = lookFor(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t.categorySettings.colors[key]}
                  onPress={() => setColor(key)}
                  className="h-12 w-12 items-center justify-center rounded-full border-2"
                  style={{
                    backgroundColor: categoryColors[key].container,
                    borderColor: on ? look.dot : 'transparent',
                  }}>
                  {on ? (
                    <Icon name="check" size={22} tint={look.dot} />
                  ) : (
                    <View className="h-4 w-4 rounded-full" style={{ backgroundColor: look.dot }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        {category ? (
          <View className="flex-row gap-space-sm">
            <Button
              label={t.categorySettings.moveUp}
              icon="expand_less"
              variant="outline"
              size="md"
              className={index === 0 ? 'opacity-40' : ''}
              disabled={index === 0}
              onPress={() => moveSpendCategory(db, category.id, -1)}
            />
            <Button
              label={t.categorySettings.moveDown}
              icon="expand_more"
              variant="outline"
              size="md"
              className={index === count - 1 ? 'opacity-40' : ''}
              disabled={index === count - 1}
              onPress={() => moveSpendCategory(db, category.id, 1)}
            />
          </View>
        ) : null}
        <View className="flex-row gap-space-sm">
          {category ? (
            <Button
              label={t.common.delete}
              icon="delete"
              variant="danger"
              className="flex-1"
              onPress={() => {
                const undo = deleteSpendCategory(db, category.id);
                onClose();
                showToast(c.deleted, undo);
              }}
            />
          ) : (
            <Button label={t.common.cancel} variant="outline" className="flex-1" onPress={onClose} />
          )}
          <Button
            label={t.common.save}
            className={`flex-1 ${canSave ? '' : 'opacity-50'}`}
            disabled={!canSave}
            onPress={save}
          />
        </View>
        {category ? (
          <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            {c.deleteText}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** More › Spending categories: add your own, rename, change icon and color, reorder, delete. */
export default function SpendingCategoriesScreen() {
  const categories = useLive(() => listSpendCategories(db), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const index = categories.findIndex((c) => c.id === editing);

  return (
    <Page title={t.budget.categories.title}>
      <ListCard>
        {categories.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={t.budget.categories.edit(c.name)}
            onPress={() => setEditing(c.id)}
            className={`min-h-[60px] flex-row items-center gap-3 px-space-md py-2 active:bg-surface-container-low ${i ? 'border-t border-surface-variant' : ''}`}>
            <CategoryIcon category={c} size={40} />
            <Text variant="bodyLg" style={{ flex: 1 }}>
              {c.name}
            </Text>
            <Icon name="chevron_right" />
          </Pressable>
        ))}
      </ListCard>
      <Button label={t.budget.categories.add} icon="add" variant="outline" onPress={() => setEditing('new')} />
      {editing ? (
        <CategorySheet
          key={editing}
          category={categories[index] ?? null}
          index={index}
          count={categories.length}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Page>
  );
}
