// A day's events and to-dos together, for Week's day cards and Month's day list.
import type { EventOccurrence } from '@/planner/events';
import type { TaskRow } from '@/planner/tasks';

export type Plan =
  | { kind: 'event'; key: string; urgent: boolean; done: false; occurrence: EventOccurrence }
  | { kind: 'task'; key: string; urgent: boolean; done: boolean; task: TaskRow };

const minutesOf = (p: Plan, day: string): number => {
  if (p.kind === 'task')
    return p.task.dueTime ? Number(p.task.dueTime.slice(0, 2)) * 60 + Number(p.task.dueTime.slice(3)) : 24 * 60;
  if (p.occurrence.allDay || p.occurrence.days[0] !== day) return -1; // all day (or started earlier) first
  const d = new Date(p.occurrence.startAt);
  return d.getHours() * 60 + d.getMinutes();
};

/** Urgent first, then all-day, then by time; to-dos without a time last (WK-08, MO-06). */
export function sortPlans(plans: Plan[], day: string): Plan[] {
  return [...plans].sort((a, b) => Number(b.urgent) - Number(a.urgent) || minutesOf(a, day) - minutesOf(b, day));
}

/** Each day's plans, sorted. */
export function plansByDay(days: string[], events: EventOccurrence[], tasks: TaskRow[]): Map<string, Plan[]> {
  const out = new Map<string, Plan[]>(days.map((d) => [d, []]));
  for (const o of events)
    for (const d of o.days)
      out.get(d)?.push({ kind: 'event', key: `${o.key}@${d}`, urgent: o.urgent, done: false, occurrence: o });
  for (const x of tasks) out.get(x.date)?.push({ kind: 'task', key: x.id, urgent: x.urgent, done: x.done, task: x });
  for (const d of days) out.set(d, sortPlans(out.get(d)!, d));
  return out;
}

/** WK-03: the gentle label for how this week is going so far (null = say nothing). */
export function paceLabel(doneSoFar: number, plannedSoFar: number): 'inRhythm' | 'findingPace' | null {
  if (plannedSoFar === 0) return null;
  return doneSoFar / plannedSoFar >= 0.75 ? 'inRhythm' : 'findingPace';
}

/**
 * WK-07: a day card's status chip. Past days: "All done" or "n of m done" (to-dos); later days:
 * "Deadline" if a to-do is due, otherwise the main category. Never shames: past days with nothing
 * done just say how many.
 */
export function dayStatus(
  plans: Plan[],
  when: 'past' | 'today' | 'future',
):
  | { kind: 'allDone' }
  | { kind: 'nDone'; done: number; total: number }
  | { kind: 'deadline' }
  | { kind: 'category'; categoryId: string }
  | null {
  const tasks = plans.filter((p) => p.kind === 'task');
  if (when === 'past') {
    if (tasks.length === 0) return null;
    const done = tasks.filter((p) => p.done).length;
    return done === tasks.length ? { kind: 'allDone' } : { kind: 'nDone', done, total: tasks.length };
  }
  if (when === 'today') return null;
  if (tasks.some((p) => !p.done)) return { kind: 'deadline' };
  const counts = new Map<string, number>();
  for (const p of plans) {
    const id = p.kind === 'event' ? p.occurrence.categoryId : p.task.categoryId;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return top ? { kind: 'category', categoryId: top[0] } : null;
}
