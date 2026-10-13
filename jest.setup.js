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
