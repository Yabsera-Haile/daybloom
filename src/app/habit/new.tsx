import { useLocalSearchParams } from 'expo-router';

import { HabitForm } from '@/features/habits/HabitForm';

/** New habit; "name" from an idea chip, "routine" from Today's "Start a gentle routine". */
export default function NewHabitScreen() {
  const { name, routine } = useLocalSearchParams<{ name?: string; routine?: string }>();
  return <HabitForm presetName={name} presetRoutine={routine} />;
}
