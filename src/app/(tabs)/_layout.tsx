import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { TabBar } from '@/ui';

export default function TabsLayout() {
  const { colors } = useTheme();
  const settings = useSettings();
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
