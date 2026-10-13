import type { EventOccurrence } from '@/planner/events';
import type { TaskRow } from '@/planner/tasks';

import { dayStatus, paceLabel, plansByDay } from './plans';

const day = '2024-10-23';
const at = (h: number, m = 0) => new Date(2024, 9, 23, h, m).getTime();

const event = (title: string, over: Partial<EventOccurrence> = {}): EventOccurrence => ({
  key: title,
  eventId: title,
  seriesId: null,
  originalStartAt: null,
  title,
  notes: null,
  location: null,
  categoryId: 'work',
  urgent: false,
  allDay: false,
  startAt: at(10),
  endAt: at(11),
  timeZone: 'America/New_York',
  rrule: null,
  days: [day],
  ...over,
});

const task = (title: string, over: Partial<TaskRow> = {}): TaskRow => ({
  id: title,
  title,
  notes: null,
  urgent: false,
  categoryId: null,
  listLabel: null,
  scope: 'day',
  date: day,
  dueTime: null,
  done: false,
  doneAt: null,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...over,
});

const titles = (list: ReturnType<typeof plansByDay>) =>
  list.get(day)!.map((p) => (p.kind === 'event' ? p.occurrence.title : p.task.title));

describe("a day's plans", () => {
  it('T-WK08.1 urgent first, then all-day, then by time; to-dos without a time last', () => {
    const plans = plansByDay(
      [day],
      [
        event('Strategy sync', { startAt: at(10) }),
        event("Mom's birthday", { allDay: true }),
        event('Walk', { startAt: at(8, 30) }),
      ],
      [
        task('Tax paperwork', { urgent: true, dueTime: '17:00' }),
        task('Water the palm'),
        task('Review', { dueTime: '14:00' }),
      ],
    );
    expect(titles(plans)).toEqual([
      'Tax paperwork',
      "Mom's birthday",
      'Walk',
      'Strategy sync',
      'Review',
      'Water the palm',
    ]);
  });
});

describe('week labels', () => {
  it('T-WK03.1 "In rhythm" at 80%, "Finding your pace" at 50%, nothing for a week with no plans yet', () => {
    expect(paceLabel(4, 5)).toBe('inRhythm');
    expect(paceLabel(1, 2)).toBe('findingPace');
    expect(paceLabel(0, 0)).toBeNull();
  });

  it('WK-07 day status: past days count to-dos, later days show a deadline or their main category', () => {
    const done = plansByDay([day], [], [task('a', { done: true }), task('b', { done: true })]).get(day)!;
    const half = plansByDay([day], [], [task('a', { done: true }), task('b')]).get(day)!;
    const eventsOnly = plansByDay([day], [event('x'), event('y'), event('z', { categoryId: 'social' })], []).get(day)!;
    expect(dayStatus(done, 'past')).toEqual({ kind: 'allDone' });
    expect(dayStatus(half, 'past')).toEqual({ kind: 'nDone', done: 1, total: 2 });
    expect(dayStatus(half, 'future')).toEqual({ kind: 'deadline' });
    expect(dayStatus(eventsOnly, 'future')).toEqual({ kind: 'category', categoryId: 'work' });
    expect(dayStatus([], 'past')).toBeNull();
  });
});
