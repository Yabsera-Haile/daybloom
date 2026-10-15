import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { reminderOffsets } from '@/reminders/store';

import { quoteFor } from './quotes';
import {
  createTask,
  deleteTask,
  getTask,
  leftBehind,
  moveTask,
  moveTasks,
  setTaskDone,
  tasksBetween,
  tasksOn,
  updateTask,
} from './tasks';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

describe('to-dos', () => {
  it('T-07.1 a day to-do and a weekly priority land in their own lists', () => {
    createTask(db, { title: 'Water plants', date: '2024-10-23' });
    createTask(db, { title: 'Finish thesis outline', date: '2024-10-20', scope: 'week' });
    expect(titles(tasksOn(db, '2024-10-23'))).toEqual(['Water plants']);
    expect(titles(tasksBetween(db, '2024-10-20', '2024-10-26', 'week'))).toEqual(['Finish thesis outline']);
    expect(titles(tasksBetween(db, '2024-10-20', '2024-10-26'))).toEqual(['Water plants']);
  });

  it('TD-10 new to-dos go to the top of their day', () => {
    createTask(db, { title: 'First', date: '2024-10-23' });
    createTask(db, { title: 'Second', date: '2024-10-23' });
    createTask(db, { title: 'Elsewhere', date: '2024-10-24' });
    expect(titles(tasksOn(db, '2024-10-23'))).toEqual(['Second', 'First']);
  });

  it('T-14.1 a to-do with a due time is a deadline on its date', () => {
    const id = createTask(db, { title: 'Tax filing', date: '2024-10-30', dueTime: '17:00', urgent: true }, [60]);
    const [deadline] = tasksBetween(db, '2024-10-01', '2024-10-31');
    expect(deadline).toMatchObject({ title: 'Tax filing', date: '2024-10-30', dueTime: '17:00', urgent: true, done: false });
    expect(reminderOffsets(db, 'task', id)).toEqual([60]);
  });

  it('TD-11 ticking marks it done; ticking again undoes it', () => {
    const id = createTask(db, { title: 'Call mom', date: '2024-10-23' });
    setTaskDone(db, id, true);
    expect(getTask(db, id)).toMatchObject({ done: true });
    expect(getTask(db, id)!.doneAt).not.toBeNull();
    setTaskDone(db, id, false);
    expect(getTask(db, id)).toMatchObject({ done: false, doneAt: null });
  });

  it('TD-12 move to tomorrow puts it on top there; Undo puts it back', () => {
    createTask(db, { title: 'Already there', date: '2024-10-24' });
    const id = createTask(db, { title: 'Buy stamps', date: '2024-10-23' });
    const undo = moveTask(db, id, '2024-10-24');
    expect(titles(tasksOn(db, '2024-10-24'))).toEqual(['Buy stamps', 'Already there']);
    expect(tasksOn(db, '2024-10-23')).toEqual([]);
    undo();
    expect(titles(tasksOn(db, '2024-10-23'))).toEqual(['Buy stamps']);
  });

  it('TD-12 edits, urgent on/off, and delete with Undo', () => {
    const id = createTask(db, { title: 'Buy stamps', date: '2024-10-23' });
    updateTask(db, id, { title: ' Buy stamps and envelopes ', urgent: true, dueTime: '09:30', listLabel: 'Errands' });
    expect(getTask(db, id)).toMatchObject({ title: 'Buy stamps and envelopes', urgent: true, dueTime: '09:30', listLabel: 'Errands' });
    updateTask(db, id, { urgent: false, dueTime: null, listLabel: '' });
    expect(getTask(db, id)).toMatchObject({ urgent: false, dueTime: null, listLabel: null });

    const undo = deleteTask(db, id);
    expect(tasksOn(db, '2024-10-23')).toEqual([]);
    undo();
    expect(titles(tasksOn(db, '2024-10-23'))).toEqual(['Buy stamps and envelopes']);
  });

  it('needs a title and a real time', () => {
    expect(() => createTask(db, { title: ' ', date: '2024-10-23' })).toThrow();
    expect(() => createTask(db, { title: 'Run', date: '2024-10-23', dueTime: '25:00' })).toThrow();
    expect(() => createTask(db, { title: 'Run', date: '2024-10-23', dueTime: '7:00' })).toThrow();
    expect(tasksOn(db, '2024-10-23')).toEqual([]);
  });
});

describe('left from earlier days', () => {
  it('T-15.1 two to-dos left undone yesterday are offered for today; "Move" puts them on top, with Undo', () => {
    createTask(db, { title: 'Call the bank', date: '2024-10-22' });
    const done = createTask(db, { title: 'Done already', date: '2024-10-22' });
    setTaskDone(db, done, true);
    createTask(db, { title: 'Reply to Sam', date: '2024-10-22' });
    createTask(db, { title: 'Too old', date: '2024-10-01' });
    createTask(db, { title: 'Weekly one', date: '2024-10-20', scope: 'week' });
    createTask(db, { title: 'Already today', date: '2024-10-23' });
    const left = leftBehind(db, '2024-10-23');
    expect(titles(left)).toEqual(['Reply to Sam', 'Call the bank']);
    const undo = moveTasks(
      db,
      left.map((x) => x.id),
      '2024-10-23',
    );
    expect(titles(tasksOn(db, '2024-10-23'))).toEqual(['Reply to Sam', 'Call the bank', 'Already today']);
    expect(leftBehind(db, '2024-10-23')).toEqual([]);
    undo();
    expect(titles(tasksOn(db, '2024-10-22'))).toEqual(['Reply to Sam', 'Done already', 'Call the bank']);
  });
});

describe("today's quote", () => {
  it('T-TD18.1 a different quote on 3 days in a row, the same all day', () => {
    const days = ['2024-10-23', '2024-10-24', '2024-10-25'].map((d) => quoteFor(d));
    expect(new Set(days).size).toBe(3);
    expect(quoteFor('2024-10-23')).toBe(days[0]);
    expect(quoteFor('2024-10-23', ['a', 'b'])).not.toBe(quoteFor('2024-10-24', ['a', 'b']));
  });
});
