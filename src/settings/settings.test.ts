import { settings } from '@/db/schema';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { phoneDefaults, readFlag, readMemo, readSettings, saveFlag, saveMemo, saveSetting } from '.';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('settings', () => {
  it('ON-01 a new install follows the phone: week start, clock, currency, hemisphere', () => {
    // the test phone is American English in New York (jest.setup.js)
    expect(phoneDefaults()).toEqual({
      name: null,
      weekStart: 0,
      timeFormat: '12h',
      defaultReminder: 10,
      seasons: true,
      hemisphere: 'north',
      currency: 'USD',
      calm: false,
      onboarded: false,
      theme: 'autumn',
      reminderSound: 'chime',
    });
    expect(readSettings(db)).toEqual(phoneDefaults());
  });

  it('T-ST01.1 saved choices win over the phone and survive reading back', () => {
    saveSetting(db, 'weekStart', 1);
    saveSetting(db, 'timeFormat', '24h');
    saveSetting(db, 'defaultReminder', null);
    saveSetting(db, 'currency', 'ZAR');
    saveSetting(db, 'weekStart', 6);
    expect(readSettings(db)).toMatchObject({
      weekStart: 6,
      timeFormat: '24h',
      defaultReminder: null,
      currency: 'ZAR',
      hemisphere: 'north',
    });
  });

  it('SH-06 the first name is optional and trimmed', () => {
    saveSetting(db, 'name', '  Ana ');
    expect(readSettings(db).name).toBe('Ana');
    saveSetting(db, 'name', '   ');
    expect(readSettings(db).name).toBeNull();
  });

  it('refuses nonsense and ignores unreadable stored values', () => {
    expect(() => saveSetting(db, 'weekStart', 3 as never)).toThrow();
    expect(() => saveSetting(db, 'currency', 'rand')).toThrow();
    db.insert(settings)
      .values([
        { key: 'timeFormat', value: '"36h"' },
        { key: 'calm', value: 'not json' },
        { key: 'unknown', value: '1' },
      ])
      .run();
    expect(readSettings(db)).toEqual(phoneDefaults());
  });
});

describe('flags', () => {
  it('HB-03 remembers a hidden tip, without touching the settings', () => {
    expect(readFlag(db, 'habitsHint.hidden')).toBe(false);
    saveFlag(db, 'habitsHint.hidden', true);
    expect(readFlag(db, 'habitsHint.hidden')).toBe(true);
    expect(readSettings(db)).toEqual(phoneDefaults());
    saveFlag(db, 'habitsHint.hidden', false);
    expect(readFlag(db, 'habitsHint.hidden')).toBe(false);
  });
});

describe('memos', () => {
  it('FR-15 remembers the day a prompt was put off, as one value', () => {
    expect(readMemo(db, 'leftBehind.hiddenOn')).toBeNull();
    saveMemo(db, 'leftBehind.hiddenOn', '2024-10-23');
    saveMemo(db, 'leftBehind.hiddenOn', '2024-10-24');
    expect(readMemo(db, 'leftBehind.hiddenOn')).toBe('2024-10-24');
    expect(db.select().from(settings).all()).toHaveLength(1);
    saveMemo(db, 'leftBehind.hiddenOn', null);
    expect(readMemo(db, 'leftBehind.hiddenOn')).toBeNull();
  });
});

describe('look and sound', () => {
  it('keeps a chosen theme and reminder sound, and ignores unknown ones', () => {
    saveSetting(db, 'theme', 'auto');
    saveSetting(db, 'reminderSound', 'vibrate');
    expect([readSettings(db).theme, readSettings(db).reminderSound]).toEqual(['auto', 'vibrate']);
    expect(() => saveSetting(db, 'theme', 'monsoon' as never)).toThrow();
  });
});
