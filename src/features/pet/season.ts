import type { Season } from '@/calendar/dates';
import { useSettings, useToday } from '@/data/hooks';
import { themeFor } from '@/features/ThemeProvider';
import type { Settings } from '@/settings';

/**
 * The season the pet dresses for (MS-13): the one the app pictures (Today's sticker, the colours),
 * so it follows the hemisphere and a fixed colour theme alike; nothing with the season pictures off.
 */
export function outfitFor(settings: Pick<Settings, 'seasons' | 'theme' | 'hemisphere'>, today: string): Season | null {
  return settings.seasons ? themeFor(settings.theme, today, settings.hemisphere) : null;
}

export function useOutfit(): Season | null {
  const settings = useSettings();
  const today = useToday();
  return outfitFor(settings, today);
}
