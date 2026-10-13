import { Pressable, View } from 'react-native';

import { useCategories, useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { clockText, timeOf } from '@/i18n/format';
import { useUi } from '@/state/ui';
import { colors, lookFor } from '@/theme';
import { Icon, Text, UrgentBadge } from '@/ui';

import type { Plan } from './plans';

/** One event or to-do in a day list (Week day cards, Month's day sheet): stripe, title, detail, time. */
export function PlanRow({ plan, day }: { plan: Plan; day: string }) {
  const settings = useSettings();
  const categories = useCategories();
  const openSheet = useUi((s) => s.openSheet);
  const tf = settings.timeFormat;

  if (plan.kind === 'task') {
    const x = plan.task;
    const due = x.dueTime ? t.task.due(clockText(x.dueTime, tf)) : t.task.dueEndOfDay;
    const detail = [due, x.listLabel].filter(Boolean).join(' · ');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[x.title, detail, x.urgent ? t.common.urgent : null, x.done ? t.task.done : null]
          .filter(Boolean)
          .join(', ')}
        onPress={() => openSheet({ kind: 'taskMenu', taskId: x.id })}
        className={`min-h-touch flex-row items-center justify-between gap-2 rounded-xl p-2.5 active:opacity-80 ${x.urgent && !x.done ? 'bg-secondary-fixed/60' : 'bg-surface-container-lowest'}`}>
        <View className="flex-1 flex-row items-center gap-2">
          <Icon
            name={x.done ? 'check_circle' : 'task_alt'}
            size={20}
            color={x.urgent ? 'secondary' : 'onSurfaceVariant'}
          />
          <View className="flex-1">
            <Text
              variant="bodyMd"
              weight="600"
              color={x.urgent && !x.done ? 'onSecondaryFixed' : 'onSurface'}
              done={x.done}>
              {x.title}
            </Text>
            <Text variant="bodySm" color={x.urgent && !x.done ? 'secondary' : 'onSurfaceVariant'}>
              {detail}
            </Text>
          </View>
        </View>
        {x.urgent && !x.done ? <UrgentBadge /> : null}
      </Pressable>
    );
  }

  const o = plan.occurrence;
  const category = categories.find((c) => c.id === o.categoryId);
  const look = lookFor(category?.colorKey);
  const allDay = o.allDay || o.days[0] !== day;
  const subtitle = allDay ? [t.common.allDay, o.location].filter(Boolean).join(' · ') : o.location;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        o.title,
        allDay ? t.common.allDay : timeOf(o.startAt, tf),
        o.location,
        category?.name,
        o.urgent ? t.common.urgent : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => openSheet({ kind: 'event', occurrence: o })}
      className="min-h-touch flex-row items-center justify-between gap-2 rounded-xl bg-surface-container-lowest p-2.5 active:opacity-80">
      <View className="flex-1 flex-row items-center gap-2">
        <View
          className={`w-1.5 rounded-full ${subtitle ? 'h-8' : 'h-6'}`}
          style={{ backgroundColor: look.dot ?? colors.outline }}
        />
        <View className="flex-1">
          <Text variant="bodyMd" weight="500">
            {o.title}
          </Text>
          {subtitle ? (
            <Text variant="bodySm" color="onSurfaceVariant">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {o.urgent ? <UrgentBadge /> : null}
      {allDay ? null : (
        <Text variant="labelMd" color="onSurfaceVariant">
          {timeOf(o.startAt, tf)}
        </Text>
      )}
    </Pressable>
  );
}
