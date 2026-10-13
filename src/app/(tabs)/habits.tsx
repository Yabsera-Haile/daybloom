import { ComingSoon } from '@/features/ComingSoon';
import { TabScreen } from '@/features/TabScreen';

export default function HabitsScreen() {
  return (
    <TabScreen section="Habits">
      <ComingSoon title="Gentle habits and routines" milestone="M2" sticker="spring" />
    </TabScreen>
  );
}
