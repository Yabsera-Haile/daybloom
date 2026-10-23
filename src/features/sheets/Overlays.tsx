import { db } from '@/db/client';
import { SenderSheet } from '@/features/bankTexts/SenderSheet';
import { TeachSheet } from '@/features/bankTexts/TeachSheet';
import { ExpenseSheet } from '@/features/budget/ExpenseSheet';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import { getTask } from '@/planner/tasks';
import { useUi, type SheetState } from '@/state/ui';
import { Sheet, Toast } from '@/ui';
import { PickerHost } from '@/ui/PickerHost';

import { AddChooser } from './AddChooser';
import { EventDetail } from './EventDetail';
import { NoteSheet } from './NoteSheet';
import { TaskForm } from './TaskForm';
import { TaskMenu } from './TaskMenu';

function TaskSheet({ sheet }: { sheet: Extract<SheetState, { kind: 'task' }> }) {
  const closeSheet = useUi((s) => s.closeSheet);
  const task = useLive(() => (sheet.taskId ? getTask(db, sheet.taskId) : undefined), [sheet.taskId]);
  const title = task ? t.task.editTitle : sheet.scope === 'week' ? t.task.newPriorityTitle : t.task.newTitle;
  return (
    <Sheet visible onClose={closeSheet} title={title} closeButton>
      <TaskForm day={sheet.day} scope={sheet.scope} task={task} dueHour={sheet.dueHour} onClose={closeSheet} />
    </Sheet>
  );
}

const keyOf = (s: SheetState) =>
  `${s.kind}:${'taskId' in s ? s.taskId : ''}:${'occurrence' in s ? s.occurrence.key : ''}:${'noteId' in s ? s.noteId : ''}:${'entryId' in s ? s.entryId : ''}:${'senderId' in s ? s.senderId : ''}:${'textId' in s ? s.textId : ''}`;

/** The sheet that is open (one at a time) and the Undo bar, above every screen. */
export function Overlays() {
  const sheet = useUi((s) => s.sheet);
  return (
    <>
      {sheet?.kind === 'add' ? <AddChooser key={keyOf(sheet)} sheet={sheet} /> : null}
      {sheet?.kind === 'task' ? <TaskSheet key={keyOf(sheet)} sheet={sheet} /> : null}
      {sheet?.kind === 'taskMenu' ? <TaskMenu key={keyOf(sheet)} taskId={sheet.taskId} /> : null}
      {sheet?.kind === 'event' ? <EventDetail key={keyOf(sheet)} occurrence={sheet.occurrence} /> : null}
      {sheet?.kind === 'note' ? (
        <NoteSheet key={keyOf(sheet)} day={sheet.day} hour={sheet.hour} noteId={sheet.noteId} />
      ) : null}
      {sheet?.kind === 'expense' ? (
        <ExpenseSheet key={keyOf(sheet)} day={sheet.day} entryId={sheet.entryId} ask={sheet.ask} />
      ) : null}
      {sheet?.kind === 'sender' ? <SenderSheet key={keyOf(sheet)} senderId={sheet.senderId} /> : null}
      {sheet?.kind === 'teach' ? <TeachSheet key={keyOf(sheet)} textId={sheet.textId} /> : null}
      <PickerHost />
      <Toast />
    </>
  );
}
