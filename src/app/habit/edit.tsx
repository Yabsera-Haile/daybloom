import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { HabitForm } from '@/features/habits/HabitForm';
import { getHabit } from '@/habits/store';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // looked up once: the form works on a copy until Save
  const [habit] = useState(() => getHabit(db, id));
  if (!habit) return <Redirect href="/habits" />;
  return <HabitForm habit={habit} />;
}
