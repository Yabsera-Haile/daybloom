import * as SystemUI from 'expo-system-ui';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { seasonOf, type Hemisphere } from '@/calendar/dates';
import { parseDayKey } from '@/calendar/timezone';
import { useSettings, useToday } from '@/data/hooks';
import type { ThemeChoice } from '@/settings';
import { ThemeContext, themes, type ThemeName } from '@/theme';

/** The theme for a setting: a chosen season, or (auto) the season it is now where you live. */
export function themeFor(choice: ThemeChoice, today: string, hemisphere: Hemisphere): ThemeName {
  if (choice !== 'auto') return choice;
  const p = parseDayKey(today);
  return seasonOf(new Date(p.year, p.month - 1, p.day), hemisphere);
}

/**
 * Applies the colour theme (Settings › Colours) to everything inside: the color classes through CSS
 * variables, and colours in code through useTheme(). With "Follow the seasons" it changes on the
 * first day of each season.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const today = useToday();
  const theme = themes[themeFor(settings.theme, today, settings.hemisphere)];

  // the window behind the app (seen while screens slide) matches the paper
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.surface);
  }, [theme.colors.surface]);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={[{ flex: 1 }, theme.style]}>{children}</View>
    </ThemeContext.Provider>
  );
}
