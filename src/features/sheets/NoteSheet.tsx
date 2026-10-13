import { eq } from 'drizzle-orm';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { hourNotes } from '@/db/schema';
import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { hourLabel } from '@/i18n/format';
import { createHourNote, deleteHourNote, updateHourNote } from '@/planner/notes';
import { useUi } from '@/state/ui';
import { Button, Sheet, TextField } from '@/ui';

/** A short note next to an hour on Today (TD-15). */
export function NoteSheet({ day, hour, noteId }: { day: string; hour: number; noteId?: string }) {
  const { closeSheet, showToast } = useUi();
  const settings = useSettings();
  const [text, setText] = useState(() =>
    noteId ? (db.select().from(hourNotes).where(eq(hourNotes.id, noteId)).get()?.text ?? '') : '',
  );
  const canSave = text.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (noteId) updateHourNote(db, noteId, { text });
    else createHourNote(db, { date: day, hour, text });
    closeSheet();
  };

  return (
    <Sheet
      visible
      onClose={closeSheet}
      title={noteId ? t.note.edit : t.note.title(hourLabel(hour, settings.timeFormat))}
      closeButton>
      <View className="gap-space-md pb-space-sm">
        <TextField
          autoFocus
          accessibilityLabel={t.note.title(hourLabel(hour, settings.timeFormat))}
          placeholder={t.note.placeholder}
          value={text}
          onChangeText={setText}
          returnKeyType="done"
          onSubmitEditing={save}
          className="h-12 rounded-xl border-[1.5px] border-primary bg-surface px-3"
        />
        <View className="flex-row gap-space-sm">
          {noteId ? (
            <Button
              label={t.common.delete}
              variant="danger"
              icon="delete"
              className="flex-1"
              onPress={() => {
                const undo = deleteHourNote(db, noteId);
                closeSheet();
                showToast(t.note.deleted, undo);
              }}
            />
          ) : (
            <Button label={t.common.cancel} variant="outline" className="flex-1" onPress={closeSheet} />
          )}
          <Button
            label={t.common.save}
            className={`flex-1 ${canSave ? '' : 'opacity-50'}`}
            disabled={!canSave}
            onPress={save}
          />
        </View>
      </View>
    </Sheet>
  );
}
