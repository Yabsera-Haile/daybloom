import { useLocalSearchParams } from 'expo-router';

import { toDayKey } from '@/calendar/dates';
import { EventForm } from '@/features/event/EventForm';

/** New event, with the date (and hour) of wherever it was opened from (EV-02). */
export default function NewEventScreen() {
  const { day, hour } = useLocalSearchParams<{ day?: string; hour?: string }>();
  return (
    <EventForm initial={{ mode: 'new', day: day ?? toDayKey(new Date()), hour: hour ? Number(hour) : undefined }} />
  );
}
