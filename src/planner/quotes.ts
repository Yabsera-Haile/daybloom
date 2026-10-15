// Today's quote (TD-18): picked from the bundled list by the date, so it stays the same all day,
// changes the next day, and works offline (NFR-02).
import { localDayStart } from '@/calendar/timezone';
import { t } from '@/i18n';

export function quoteFor(day: string, quotes: readonly string[] = t.quotes): string {
  const dayNumber = Math.round(localDayStart(day) / 86_400_000);
  return quotes[((dayNumber % quotes.length) + quotes.length) % quotes.length];
}
