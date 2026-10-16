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

// Screens are tested on their own: navigation calls are recorded instead of moving anywhere, and
// route params come from `globalThis.__routeParams`.
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: () => globalThis.__routeParams ?? {},
    Redirect: () => null,
    Link: ({ children }) => children,
  };
});

// Animations and the safe area, as their libraries suggest for tests.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
