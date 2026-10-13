import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { EventForm } from '@/features/event/EventForm';
import { findOccurrence } from '@/planner/events';

/** Edit an event, or one occurrence of a repeating one (?id=row&series=series&slot=original start). */
export default function EditEventScreen() {
  const { id, series, slot } = useLocalSearchParams<{ id: string; series?: string; slot?: string }>();
  // looked up once: the form works on a copy until Save
  const [occurrence] = useState(() =>
    findOccurrence(db, { eventId: id, seriesId: series || null, originalStartAt: slot ? Number(slot) : null }),
  );
  if (!occurrence) return <Redirect href="/" />;
  return <EventForm initial={{ mode: 'edit', occurrence }} />;
}
