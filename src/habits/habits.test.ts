import { addDaysToKey } from '@/calendar/timezone';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';
import { reminderOffsets } from '@/reminders/store';

import { bestStreak, currentStreak, donePeriods, doneOn, monthCompletion, startedOn, weekSoFar } from './stats';
import {
  archiveHabit,
  archivedHabits,
  checksBetween,
  checksFor,
  createHabit,
  createRoutine,
  deleteHabit,
  deleteRoutine,
  ensureDefaultRoutines,
  getHabit,
  listHabits,
  listRoutines,
  moveHabit,
  reminderTimes,
  restoreHabit,
  setHabitDone,
  type Habit,
  type HabitInput,
} from './store';

const today = '2024-10-23'; // Wednesday
let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  ensureDefaultRoutines(db);
});

const tickDays = (habit: Habit, from: string, to: string) => {
  for (let d = from; d <= to; d = addDaysToKey(d, 1)) setHabitDone(db, habit, d, true, 0);
};
const done = (habit: Habit) => donePeriods(habit, checksFor(db, habit.id), 0);
const make = (name: string, routineId: string | null, frequency: 'daily' | 'weekly' = 'daily') =>
  getHabit(db, createHabit(db, { name, routineId, frequency }))!;

describe('routines', () => {
  it('start with Morning Ritual and Evening Wind-Down, reminding at their time, once', () => {
    ensureDefaultRoutines(db);
    expect(listRoutines(db).map((r) => `${r.name} ${r.time}`)).toEqual([
      'Morning Ritual 07:00',
      'Evening Wind-Down 21:30',
    ]);
    expect(reminderOffsets(db, 'routine', 'morning')).toEqual([0]);
  });

  it('a new routine sorts by its time; deleting one moves its habits to Anytime, with Undo', () => {
    const lunch = createRoutine(db, { name: 'Lunch break', time: '12:30', remind: false });
    expect(listRoutines(db).map((r) => r.name)).toEqual(['Morning Ritual', 'Lunch break', 'Evening Wind-Down']);
    const walk = make('Short walk', lunch);
    const undo = deleteRoutine(db, lunch);
    expect(getHabit(db, walk.id)!.routineId).toBeNull();
    expect(listRoutines(db)).toHaveLength(2);
    undo();
    expect(getHabit(db, walk.id)!.routineId).toBe(lunch);
  });
});

describe('ticks', () => {
  it('T-TD07.1 a tick from a routine on Today is the same tick on the Habits tab', () => {
    const lemon = make('Warm lemon water', 'morning');
    setHabitDone(db, lemon, today, true, 0); // ticked on Today's Morning Ritual card
    expect(doneOn(listHabits(db), checksBetween(db, today, today), today)).toEqual({ done: 1, total: 1 }); // Habits tab
    setHabitDone(db, lemon, today, false, 0); // unticked on the Habits tab
    expect(doneOn(listHabits(db), checksBetween(db, today, today), today).done).toBe(0);
  });

  it('a weekly tick covers its whole week, even after the week start changes', () => {
    const clean = make('Deep clean the studio', null, 'weekly');
    setHabitDone(db, clean, '2024-10-22', true, 0); // Tuesday; week starts Sunday Oct 20
    expect(checksFor(db, clean.id).map((c) => c.period)).toEqual(['2024-10-20']);
    expect([...donePeriods(clean, checksFor(db, clean.id), 1)]).toEqual(['2024-10-14']); // Monday weeks: Oct 20 is in Oct 14–20
    setHabitDone(db, clean, '2024-10-25', false, 0); // untick from another day of the same week
    expect(checksFor(db, clean.id)).toEqual([]);
  });
});

describe('streaks', () => {
  it('T-HB06.1 not done yet today keeps the streak until the day ends', () => {
    const lemon = make('Warm lemon water', 'morning');
    tickDays(lemon, '2024-10-06', '2024-10-22'); // 17 days up to yesterday
    expect(currentStreak(lemon, done(lemon), today, 0)).toBe(17);
    setHabitDone(db, lemon, today, true, 0);
    expect(currentStreak(lemon, done(lemon), today, 0)).toBe(18);
    setHabitDone(db, lemon, today, false, 0);
    expect(currentStreak(lemon, done(lemon), '2024-10-24', 0)).toBe(0); // the next day, still not done: broken
  });

  it('counts weeks for weekly habits and finds the longest run', () => {
    const budget = make('Budget check-in', null, 'weekly');
    for (const d of ['2024-09-30', '2024-10-07', '2024-10-14', '2024-10-23']) setHabitDone(db, budget, d, true, 0);
    expect(currentStreak(budget, done(budget), today, 0)).toBe(4);
    const lemon = make('Warm lemon water', 'morning');
    tickDays(lemon, '2024-09-01', '2024-09-10');
    tickDays(lemon, '2024-10-20', today);
    expect(bestStreak(lemon, done(lemon))).toBe(10);
    expect(currentStreak(lemon, done(lemon), today, 0)).toBe(4);
  });
});

describe('numbers on the Habits tab', () => {
  it('T-HB02.2 v2 fixture: 11 active habits, 3 of 8 done today, best streak 18', () => {
    const daily = [
      ['Warm lemon water', 'morning'],
      ['Gentle stretch, 15 min', 'morning'],
      ['Morning journal', 'morning'],
      ['Skin care', 'evening'],
      ['Read 20 minutes', 'evening'],
      ['Lights out by 10:30', 'evening'],
      ['10,000 steps', null],
      ['Vitamins', null],
    ].map(([name, routine]) => make(name!, routine));
    ['Deep clean the studio', 'Budget check-in', 'Meal prep Sunday'].forEach((n) => make(n, null, 'weekly'));
    tickDays(daily[0], '2024-10-06', today); // lemon water: 18 days
    setHabitDone(db, daily[1], today, true, 0);
    setHabitDone(db, daily[7], today, true, 0);

    const habits = listHabits(db);
    const checks = checksBetween(db, '2024-01-01', today);
    expect(habits).toHaveLength(11);
    expect(doneOn(habits, checks, today)).toEqual({ done: 3, total: 8 });
    expect(Math.max(...habits.map((h) => bestStreak(h, donePeriods(h, checks, 0))))).toBe(18);
  });

  it("HB-01 the month's share counts each habit from the day it was added", () => {
    const a = { id: 'a', frequency: 'daily' as const, createdAt: new Date(2024, 9, 1).getTime() };
    const b = { id: 'b', frequency: 'daily' as const, createdAt: new Date(2024, 9, 22).getTime() };
    const checks = [
      { habitId: 'a', period: '2024-10-01', checkedAt: 0 },
      { habitId: 'a', period: '2024-10-02', checkedAt: 0 },
      { habitId: 'b', period: '2024-10-22', checkedAt: 0 },
    ];
    // Oct 1–3: a ticked 2 of 3 days. Oct 1–23: a 2 of 23 days, b (added Oct 22) 1 of 2 days → 3 of 25
    expect(monthCompletion([a], checks, '2024-10-01', '2024-10-03')).toBeCloseTo(2 / 3);
    expect(monthCompletion([a, b], checks, '2024-10-01', '2024-10-23')).toBeCloseTo(3 / 25);
    expect(monthCompletion([], checks, '2024-10-01', '2024-10-23')).toBeNull();
  });

  it('history begins when a habit was added, or at an earlier tick filled in later', () => {
    const h = { id: 'h', frequency: 'daily' as const, createdAt: new Date(2024, 9, 14, 0, 30).getTime() };
    expect(startedOn(h, new Set())).toBe('2024-10-14');
    expect(startedOn(h, new Set(['2024-10-13', '2024-10-14']))).toBe('2024-10-13');
  });

  it('WK-11 "done so far" counts only days up to today', () => {
    const lemon = make('Warm lemon water', 'morning');
    const stretch = make('Stretch', 'morning');
    tickDays(lemon, '2024-10-20', today);
    setHabitDone(db, stretch, '2024-10-21', true, 0);
    const days = Array.from({ length: 7 }, (_, i) => addDaysToKey('2024-10-20', i));
    // 4 days so far × 2 habits = 8; 4 + 1 ticks
    expect(weekSoFar(listHabits(db), checksBetween(db, days[0], days[6]), days, today)).toBeCloseTo(5 / 8);
  });
});

describe('editing habits', () => {
  it('T-HB07.1 add a weekly habit, archive one (history kept), bring it back, delete one', () => {
    const vitamins = make('Vitamins', null);
    setHabitDone(db, vitamins, today, true, 0);
    make('Call grandma', null, 'weekly');
    archiveHabit(db, vitamins.id);
    expect(listHabits(db).map((h) => `${h.name} ${h.frequency}`)).toEqual(['Call grandma weekly']);
    expect(archivedHabits(db).map((h) => h.name)).toEqual(['Vitamins']);
    expect(checksFor(db, vitamins.id)).toHaveLength(1);
    restoreHabit(db, vitamins.id);
    expect(listHabits(db)).toHaveLength(2);
    deleteHabit(db, vitamins.id);
    expect(getHabit(db, vitamins.id)).toBeUndefined();
    expect(checksFor(db, vitamins.id)).toEqual([]);
  });

  it('moves a habit only among the habits shown with it', () => {
    const a = make('A', 'morning');
    make('Evening thing', 'evening');
    const b = make('B', 'morning');
    moveHabit(db, b.id, -1);
    expect(
      listHabits(db)
        .filter((h) => h.routineId === 'morning')
        .map((h) => h.name),
    ).toEqual(['B', 'A']);
    moveHabit(db, b.id, -1); // already first in its group
    expect(
      listHabits(db)
        .filter((h) => h.routineId === 'morning')
        .map((h) => h.name),
    ).toEqual(['B', 'A']);
    expect(a.icon).toBe('spa');
    expect(make('Read 10 pages', null).icon).toBe('menu_book');
  });

  it('T-HB07.2 a reminder several times a day: every hour from 7 AM to 6 PM is 12 a day', () => {
    const water = (over: Partial<HabitInput>) =>
      getHabit(
        db,
        createHabit(db, {
          name: 'Drink water',
          frequency: 'daily',
          routineId: null,
          reminderTime: '07:00',
          reminderEvery: 60,
          reminderUntil: '18:00',
          ...over,
        }),
      )!;
    const hourly = reminderTimes(water({}));
    expect(hourly).toHaveLength(12);
    expect([hourly[0], hourly[1], hourly[11]]).toEqual(['07:00', '08:00', '18:00']);
    // the last one is the last step that fits before the end
    expect(reminderTimes(water({ reminderEvery: 180, reminderUntil: '17:30' }))).toEqual([
      '07:00',
      '10:00',
      '13:00',
      '16:00',
    ]);
    // once a day when it can't repeat: an end before the start, a weekly habit, or part of a routine
    expect(reminderTimes(water({ reminderUntil: '06:00' }))).toEqual(['07:00']);
    expect(water({ frequency: 'weekly' }).reminderEvery).toBeNull();
    expect(reminderTimes(water({ routineId: 'morning' }))).toEqual([]);
  });
});
