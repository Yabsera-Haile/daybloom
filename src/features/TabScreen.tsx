import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, Fab } from '@/ui';

type TabScreenProps = {
  section: string;
  children: ReactNode;
  /** Today, Week and Month show the "+ Add" button (UX-09). */
  showAdd?: boolean;
  onAdd?: () => void;
};

/** Shared frame for the five tabs: header on top, scrolling paper page, optional "+ Add". */
export function TabScreen({ section, children, showAdd = false, onAdd }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <AppHeader section={section} />
      <ScrollView contentContainerClassName="gap-space-md px-margin pb-32 pt-space-sm">{children}</ScrollView>
      {showAdd ? (
        <View className="absolute bottom-4 right-margin">
          <Fab onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}
