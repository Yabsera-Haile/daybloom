import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { useSettings } from '@/data/hooks';
import { TOUR_FLAG, useTour } from '@/features/tour/store';
import { t } from '@/i18n';
import { readFlag } from '@/settings';
import { useTheme } from '@/theme';
import { TabBar } from '@/ui';

export default function TabsLayout() {
  const { colors } = useTheme();
  const settings = useSettings();
  // the tour, once (ON-02): after the first-run pages, or the first time after the update that added it
  useEffect(() => {
    if (settings.onboarded && !readFlag(db, TOUR_FLAG) && useTour.getState().step === null) useTour.getState().start();
  }, [settings.onboarded]);
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      // Android back: from another tab it goes to Today; from Today it leaves the app (SH-04)
      backBehavior="firstRoute"
      tabBar={(props) => <TabBar {...props} />}
      // tabs out of view stop re-rendering on every data change and clock tick until you come back
      screenOptions={{ headerShown: false, freezeOnBlur: true, sceneStyle: { backgroundColor: colors.surface } }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.today }} />
      <Tabs.Screen name="week" options={{ title: t.tabs.week }} />
      <Tabs.Screen name="month" options={{ title: t.tabs.month }} />
      <Tabs.Screen name="habits" options={{ title: t.tabs.habits }} />
      <Tabs.Screen name="budget" options={{ title: t.tabs.budget }} />
    </Tabs>
  );
}
