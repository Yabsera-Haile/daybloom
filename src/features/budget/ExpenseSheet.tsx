import { useState } from 'react';
import { View } from 'react-native';

import { addSpendCategory, listSpendCategories, SPEND_COLORS } from '@/budget/categories';
import { addExpense, deleteExpense, getEntry, updateExpense } from '@/budget/entries';
import { centsToInput, parseMoney } from '@/budget/money';
import { toDayKey } from '@/calendar/dates';
import { localDayStart } from '@/calendar/timezone';
import { db } from '@/db/client';
import { useDraft } from '@/data/drafts';
import { useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { DraftNotice } from '@/features/DraftNotice';
import { t } from '@/i18n';
import { monthDay, shortDay } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, ChoiceChip, PickerRow, Sheet, Text, TextField, type IconName } from '@/ui';
import { pickDay } from '@/ui/pickers';

import { MoneyField } from './parts';

const field = 'h-12 rounded-xl border-[1.5px] border-outline-variant bg-surface px-3';

/**
 * "Add an expense" (BU-08, design/daybloom/budget#entry): amount, what it was for, category, day.
 * Amount must be above zero; a new category can be added right here.
 */
export function ExpenseSheet({ day, entryId }: { day: string; entryId?: string }) {
  const closeSheet = useUi((s) => s.closeSheet);
  const showToast = useUi((s) => s.showToast);
  const settings = useSettings();
  const today = useToday();
  const categories = useLive(() => listSpendCategories(db), []);
  // read once: after a delete the sheet closes rather than turning into a new one
  const [entry] = useState(() => (entryId ? getEntry(db, entryId) : undefined));
  // a new expense keeps its typing when the sheet is closed by accident (UX-05, T-BU08.3)
  const draft = useDraft(entry ? null : 'expense', {
    amount: entry ? centsToInput(entry.amountCents) : '',
    description: entry?.description ?? '',
  });
  const { amount, description } = draft.values;
  const [categoryId, setCategoryId] = useState<string | null>(
    entry ? entry.budgetCategoryId : (categories[0]?.id ?? null),
  );
  const [date, setDate] = useState(entry ? toDayKey(new Date(entry.occurredAt)) : day);
  const [tried, setTried] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const cents = parseMoney(amount);
  const valid = cents !== null && cents > 0;

  const save = () => {
    setTried(true);
    if (!valid) return;
    const sameDay = entry && toDayKey(new Date(entry.occurredAt)) === date;
    const input = {
      amountCents: cents,
      description,
      categoryId,
      occurredAt: sameDay ? entry.occurredAt : date === today ? Date.now() : localDayStart(date) + 12 * 3_600_000,
      currency: entry?.currency ?? settings.currency,
    };
    if (entry) updateExpense(db, entry.id, input);
    else addExpense(db, input);
    draft.clear();
    closeSheet();
  };

  const addCategory = () => {
    if (!newName.trim()) return;
    const id = addSpendCategory(db, {
      name: newName,
      icon: 'sell',
      colorKey: SPEND_COLORS[categories.length % SPEND_COLORS.length],
    });
    setCategoryId(id);
    setNewName('');
    setAdding(false);
  };

  const chooseDay = async () => {
    const picked = await pickDay(date);
    if (picked) setDate(picked);
  };

  return (
    <Sheet
      visible
      onClose={closeSheet}
      title={entry ? t.budget.expense.editTitle : t.budget.expense.newTitle}
      closeButton>
      <View className="gap-space-md pb-space-sm">
        <DraftNotice draft={draft} />
        <MoneyField
          label={t.budget.expense.amount}
          value={amount}
          onChangeText={(v) => draft.set('amount', v)}
          currency={entry?.currency ?? settings.currency}
          autoFocus={!entry}
          error={tried && !valid ? t.budget.needAmount : null}
        />
        <View className="gap-1.5">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.expense.whatFor}
          </Text>
          <TextField
            accessibilityLabel={t.budget.expense.whatFor}
            placeholder={t.budget.expense.whatForPlaceholder}
            value={description}
            onChangeText={(v) => draft.set('description', v)}
            className={field}
          />
        </View>
        <View className="gap-2">
          <Text variant="labelMd" color="onSurfaceVariant">
            {t.budget.expense.category}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <ChoiceChip
                key={c.id}
                label={c.name}
                icon={c.icon as IconName}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
            <ChoiceChip
              role="button"
              icon="add"
              label={t.budget.expense.newCategory}
              selected={adding}
              onPress={() => setAdding(!adding)}
            />
          </View>
          {adding ? (
            <View className="flex-row items-center gap-2">
              <TextField
                autoFocus
                accessibilityLabel={t.budget.categories.name}
                placeholder={t.budget.categories.namePlaceholder}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={addCategory}
                returnKeyType="done"
                className={`flex-1 ${field}`}
              />
              <Button label={t.common.add} size="md" align="center" onPress={addCategory} />
            </View>
          ) : null}
        </View>
        <PickerRow
          icon="calendar_today"
          label={t.budget.expense.date}
          value={date === today ? t.budget.expense.today(monthDay(date)) : shortDay(date)}
          onPress={chooseDay}
        />
        <Button label={t.common.save} fullWidth onPress={save} />
        {entry ? (
          <Button
            label={t.budget.expense.delete}
            icon="delete"
            variant="danger"
            fullWidth
            onPress={() => {
              const undo = deleteExpense(db, entry.id);
              closeSheet();
              showToast(t.budget.expense.deleted, undo);
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
