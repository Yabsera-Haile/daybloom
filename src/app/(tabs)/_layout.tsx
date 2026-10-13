import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { TabBar } from '@/ui';

export default function TabsLayout() {
  const settings = useSettings();
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      // Android back: from another tab it goes to Today; from Today it leaves the app (SH-04)
      backBehavior="firstRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.today }} />
      <Tabs.Screen name="week" options={{ title: t.tabs.week }} />
      <Tabs.Screen name="month" options={{ title: t.tabs.month }} />
      <Tabs.Screen name="habits" options={{ title: t.tabs.habits }} />
      <Tabs.Screen name="more" options={{ title: t.tabs.more }} />
    </Tabs>
  );
}
