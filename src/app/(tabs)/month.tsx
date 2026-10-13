import { format } from 'date-fns';

import { ComingSoon } from '@/features/ComingSoon';
import { TabScreen } from '@/features/TabScreen';
import { Text } from '@/ui';

export default function MonthScreen() {
  return (
    <TabScreen section="Month" showAdd>
      <Text variant="displayLgMobile" accessibilityRole="header">
        {format(new Date(), 'MMMM yyyy')}
      </Text>
      <ComingSoon title="The month at a glance" milestone="M1" sticker="winter" />
    </TabScreen>
  );
}
