import { router } from 'expo-router';

import { listBills, markBillPaid } from '@/budget/bills';
import { db } from '@/db/client';
import { useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { BillCard } from '@/features/budget/parts';
import { t } from '@/i18n';
import { useUi } from '@/state/ui';
import { Button, Page } from '@/ui';

/** Every bill still to pay, soonest first, beyond the Budget tab's next 14 days. */
export default function BillsScreen() {
  const today = useToday();
  const showToast = useUi((s) => s.showToast);
  const bills = useLive(() => listBills(db), []);
  return (
    <Page title={t.budget.allBills(bills.length)}>
      {bills.map((b) => (
        <BillCard
          key={b.id}
          bill={b}
          today={today}
          onPress={() => router.push({ pathname: '/bill/edit', params: { id: b.id } })}
          onMarkPaid={() => showToast(t.budget.paidToast(b.title), markBillPaid(db, b.id, Date.now()))}
        />
      ))}
      <Button label={t.budget.addBill} icon="add" fullWidth onPress={() => router.push('/bill/new')} />
    </Page>
  );
}
