import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { getBill } from '@/budget/bills';
import { db } from '@/db/client';
import { BillForm } from '@/features/budget/BillForm';

export default function EditBillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // looked up once: the form works on a copy until Save
  const [bill] = useState(() => getBill(db, id));
  if (!bill || bill.deletedAt) return <Redirect href="/budget" />;
  return <BillForm bill={bill} />;
}
