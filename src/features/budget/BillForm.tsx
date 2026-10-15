import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BILL_REMINDERS,
  BILL_REPEATS,
  billReminder,
  createBill,
  deleteBill,
  markBillPaid,
  updateBill,
  type Bill,
  type BillPayment,
} from '@/budget/bills';
import { centsToInput, parseMoney } from '@/budget/money';
import { db } from '@/db/client';
import { useDraft } from '@/data/drafts';
import { useSettings, useToday } from '@/data/hooks';
import { DraftNotice } from '@/features/DraftNotice';
import { t } from '@/i18n';
import { shortDay } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { Button, ChoiceChip, FormSection, Icon, PickerRow, RadioCard, Text, TextField } from '@/ui';
import { pickDay } from '@/ui/pickers';

import { MoneyField } from './parts';

/** New or edited bill (BU-06, BU-10; design/daybloom/budget-bill). Name, amount and day are needed. */
export function BillForm({ bill }: { bill?: Bill }) {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const today = useToday();
  const showToast = useUi((s) => s.showToast);
  // a new bill keeps its name and amount until saved (UX-05)
  const draft = useDraft(bill ? null : 'bill', {
    title: bill?.title ?? '',
    amount: bill ? centsToInput(bill.amountCents) : '',
  });
  const { title, amount } = draft.values;
  const [dueDate, setDueDate] = useState<string | null>(bill?.dueDate ?? null);
  const [repeatMonths, setRepeatMonths] = useState<number | null>(bill ? bill.repeatMonths : 1);
  const [payment, setPayment] = useState<BillPayment>((bill?.payment as BillPayment | undefined) ?? 'auto');
  const [remind, setRemind] = useState<number | null>(bill ? billReminder(db, bill.id) : 1440);
  const [tried, setTried] = useState(false);
  const cents = parseMoney(amount);
  const valid = cents !== null && cents > 0;
  const canSave = title.trim().length > 0 && valid && dueDate !== null;

  const save = () => {
    setTried(true);
    if (!canSave) return;
    const input = {
      title,
      amountCents: cents,
      dueDate,
      repeatMonths,
      payment,
      remindMinutes: remind,
      currency: bill?.currency ?? settings.currency,
    };
    if (bill) updateBill(db, bill.id, input);
    else createBill(db, input);
    draft.clear();
    router.back();
  };

  const chooseDay = async () => {
    const picked = await pickDay(dueDate ?? today);
    if (picked) setDueDate(picked);
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center justify-between border-b border-surface-variant px-1">
        <Button
          label={t.common.cancel}
          variant="text"
          align="center"
          onPress={() => {
            draft.clear();
            router.back();
          }}
        />
        <Text variant="headlineSm" accessibilityRole="header">
          {bill ? t.budget.bill.editTitle : t.budget.bill.newTitle}
        </Text>
        <Button label={t.common.save} size="md" align="center" className="mr-3" onPress={save} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-space-md px-margin pt-space-md"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
        <DraftNotice draft={draft} />
        <TextField
          autoFocus={!bill}
          accessibilityLabel={t.budget.bill.nameLabel}
          placeholder={t.budget.bill.namePlaceholder}
          value={title}
          onChangeText={(v) => draft.set('title', v)}
          variant="headlineLg"
          className={`border-b-[1.5px] pb-2 ${tried && !title.trim() ? 'border-error' : 'border-primary'}`}
        />

        <FormSection className="gap-space-sm p-space-md">
          <MoneyField
            label={t.budget.bill.amount}
            value={amount}
            onChangeText={(v) => draft.set('amount', v)}
            currency={bill?.currency ?? settings.currency}
            big={false}
            error={tried && !valid ? t.budget.needAmount : null}
          />
          <PickerRow
            icon="event"
            label={t.budget.bill.due}
            value={dueDate ? shortDay(dueDate) : t.budget.bill.pickDate}
            onPress={chooseDay}
          />
          {tried && !dueDate ? (
            <Text variant="bodySm" color="error">
              {t.budget.bill.needDate}
            </Text>
          ) : null}
        </FormSection>

        <FormSection className="gap-space-sm p-space-md">
          <View className="flex-row items-center gap-3">
            <Icon name="repeat" />
            <Text variant="bodyLg">{t.budget.bill.repeats}</Text>
          </View>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {BILL_REPEATS.map((m) => (
              <ChoiceChip
                key={String(m)}
                label={t.budget.repeats[m ?? 'once']}
                selected={repeatMonths === m}
                onPress={() => setRepeatMonths(m)}
              />
            ))}
          </View>
        </FormSection>

        <FormSection className="gap-space-sm p-space-md">
          <View className="flex-row items-center gap-3">
            <Icon name="account_balance_wallet" />
            <Text variant="bodyLg">{t.budget.bill.howPaid}</Text>
          </View>
          <View accessibilityRole="radiogroup" className="gap-space-sm">
            <RadioCard
              on={payment === 'auto'}
              onPress={() => setPayment('auto')}
              title={t.budget.bill.auto}
              detail={t.budget.bill.autoText}
            />
            <RadioCard
              on={payment === 'manual'}
              onPress={() => setPayment('manual')}
              title={t.budget.bill.manual}
              detail={t.budget.bill.manualText}
            />
          </View>
        </FormSection>

        <FormSection className="gap-space-sm p-space-md">
          <View className="flex-row items-center gap-3">
            <Icon name="notifications" />
            <View className="flex-1">
              <Text variant="bodyLg">{t.budget.bill.remind}</Text>
              <Text variant="bodySm" color="onSurfaceVariant">
                {t.budget.bill.remindAt}
              </Text>
            </View>
          </View>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {BILL_REMINDERS.map((m) => (
              <ChoiceChip
                key={String(m)}
                label={t.budget.bill.reminders[m ?? 'none']}
                selected={remind === m}
                onPress={() => setRemind(m)}
              />
            ))}
          </View>
        </FormSection>

        {bill ? (
          <View className="gap-space-sm">
            {bill.payment === 'manual' ? (
              <Button
                label={t.budget.markPaid}
                icon="check"
                variant="outline"
                fullWidth
                onPress={() => {
                  const undo = markBillPaid(db, bill.id, Date.now());
                  router.back();
                  showToast(t.budget.paidToast(bill.title), undo);
                }}
              />
            ) : null}
            <Button
              label={t.budget.bill.delete}
              icon="delete"
              variant="danger"
              fullWidth
              onPress={() => {
                const undo = deleteBill(db, bill.id);
                router.back();
                showToast(t.budget.bill.deleted, undo);
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
