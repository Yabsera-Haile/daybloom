import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Sticker, Text, type StickerName } from '@/ui';

/** Placeholder used during Phase 0; each tab is built in milestone M1–M3 (docs/PLAN.md). */
export function ComingSoon({ title, milestone, sticker = 'autumn' }: { title: string; milestone: string; sticker?: StickerName }) {
  return (
    <Card className="items-center gap-space-sm py-space-lg">
      <Sticker name={sticker} size={88} rotate={-6} />
      <Text variant="headlineMd" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
        This page is being built in milestone {milestone}. Its design is in design/daybloom.
      </Text>
      <View className="mt-space-sm">
        <Button label="See the components" variant="outline" icon="palette" onPress={() => router.push('/gallery')} />
      </View>
    </Card>
  );
}
