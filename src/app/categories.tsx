import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { useCategories } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import {
  addCategory,
  CATEGORY_COLORS,
  categoryUsage,
  DEFAULT_CATEGORY_ID,
  deleteCategory,
  moveCategory,
  recolorCategory,
  renameCategory,
  type Category,
  type CategoryColor,
} from '@/planner/categories';
import { useUi } from '@/state/ui';
import { shadows, useTheme } from '@/theme';
import { Button, Icon, Page, Sheet, Text, TextField } from '@/ui';

function EditSheet({
  category,
  index,
  count,
  usage,
  onClose,
}: {
  category: Category | null;
  index: number;
  count: number;
  usage: number;
  onClose: () => void;
}) {
  const { categoryColors, lookFor } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const categories = useCategories();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<CategoryColor>((category?.colorKey as CategoryColor) ?? 'personal');
  const canSave = name.trim().length > 0;
  const moveTo = categories.find((c) => c.id === DEFAULT_CATEGORY_ID) ?? categories.find((c) => c.id !== category?.id);

  const save = () => {
    if (!canSave) return;
    if (category) {
      renameCategory(db, category.id, name);
      recolorCategory(db, category.id, color);
    } else addCategory(db, name, color);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={category ? t.categorySettings.edit : t.categorySettings.new} closeButton>
      <View className="gap-space-md pb-space-sm">
        <View className="gap-1">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.categorySettings.name}
          </Text>
          <TextField
            autoFocus={!category}
            accessibilityLabel={t.categorySettings.name}
            value={name}
            onChangeText={setName}
            className="h-12 rounded-xl border-[1.5px] border-primary bg-surface px-3"
          />
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.categorySettings.color}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t.categorySettings.color}
            className="flex-row gap-space-sm">
            {CATEGORY_COLORS.map((key) => {
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
              onPress={() => moveCategory(db, category.id, -1)}
            />
            <Button
              label={t.categorySettings.moveDown}
              icon="expand_more"
              variant="outline"
              size="md"
              className={index === count - 1 ? 'opacity-40' : ''}
              disabled={index === count - 1}
              onPress={() => moveCategory(db, category.id, 1)}
            />
          </View>
        ) : null}
        <View className="flex-row gap-space-sm">
          {category && category.id !== DEFAULT_CATEGORY_ID && moveTo ? (
            <Button
              label={t.common.delete}
              icon="delete"
              variant="danger"
              className="flex-1"
              onPress={() => {
                const undo = deleteCategory(db, category.id, moveTo.id);
                onClose();
                showToast(t.categorySettings.deleted, undo);
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
        {category && category.id !== DEFAULT_CATEGORY_ID && moveTo ? (
          <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            {t.categorySettings.deleteNote(usage, moveTo.name)}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** Settings › Categories (ST-01): rename, recolor, reorder, add, delete. */
export default function CategoriesScreen() {
  const { categoryColors, lookFor } = useTheme();
  const categories = useCategories();
  const usage = useLive(() => categoryUsage(db), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const index = categories.findIndex((c) => c.id === editing);

  return (
    <Page title={t.settings.categories}>
      <Text variant="bodyMd" color="onSurfaceVariant" style={{ marginTop: 8 }}>
        {t.categorySettings.intro}
      </Text>
      <View className="overflow-hidden rounded-2xl bg-surface-container-lowest" style={shadows.card}>
        {categories.map((c, i) => {
          const look = lookFor(c.colorKey);
          const n = usage[c.id] ?? 0;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityHint={t.categorySettings.edit}
              onPress={() => setEditing(c.id)}
              className={`min-h-[60px] flex-row items-center gap-3 px-space-md active:bg-surface-container-low ${i ? 'border-t border-surface-variant' : ''}`}>
              <View
                className="h-7 w-7 rounded-full border-2"
                style={{
                  backgroundColor: categoryColors[c.colorKey as CategoryColor]?.container,
                  borderColor: look.dot,
                }}
              />
              <View className="flex-1 py-2">
                <Text variant="bodyLg">{c.name}</Text>
                <Text variant="bodySm" color="onSurfaceVariant">
                  {[t.categorySettings.plans(n), c.id === DEFAULT_CATEGORY_ID ? t.categorySettings.usedForNew : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Icon name="chevron_right" />
            </Pressable>
          );
        })}
      </View>
      <Button label={t.categorySettings.new} icon="add" variant="outline" onPress={() => setEditing('new')} />
      {editing ? (
        <EditSheet
          key={editing}
          category={editing === 'new' ? null : (categories[index] ?? null)}
          index={index}
          count={categories.length}
          usage={editing === 'new' ? 0 : (usage[editing] ?? 0)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Page>
  );
}
