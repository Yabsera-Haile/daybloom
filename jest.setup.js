/* global jest */
// Native modules replaced with fixed, plain-JS answers in tests: an American English phone in New York.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [
    {
      languageTag: 'en-US',
      languageCode: 'en',
      regionCode: 'US',
      currencyCode: 'USD',
      currencySymbol: '$',
      decimalSeparator: '.',
      digitGroupingSeparator: ',',
      measurementSystem: 'us',
      textDirection: 'ltr',
    },
  ],
  getCalendars: () => [{ calendar: 'gregory', firstWeekday: 1, uses24hourClock: false, timeZone: 'America/New_York' }],
}));

// The phone's database can't open in Node: code that uses `@/db/client` gets the in-memory test
// database a test sets up with `withTestDb()` (src/db/testDb.ts).
jest.mock('@/db/client', () => ({
  get db() {
    if (!globalThis.__daybloomTestDb) throw new Error('This test needs withTestDb() from @/db/testDb');
    return globalThis.__daybloomTestDb;
  },
}));

// Screens re-read after a change; tests trigger that by hand (see notifyDataChanged).
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => {} }) }));
