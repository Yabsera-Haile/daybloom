import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { toDayKey } from '@/calendar/dates';
import { t } from '@/i18n';
import { longDay, monthDay } from '@/i18n/format';
import type { EditScope, EventOccurrence } from '@/planner/events';
import { describeRepeat, fromRRule } from '@/recurrence';
import { Button, Text } from '@/ui';

/** "This event repeats. Which ones should change?" (FR-05; design/daybloom/event#edit-scope). */
export function ScopeChooser({
  occurrence,
  action,
  onCancel,
  onChoose,
}: {
  occurrence: EventOccurrence;
  action: 'edit' | 'delete';
  onCancel: () => void;
  onChoose: (scope: EditScope) => void;
}) {
  const [scope, setScope] = useState<EditScope>('this');
  const day = toDayKey(new Date(occurrence.startAt));
  const repeat = occurrence.rrule
    ? fromRRule(occurrence.rrule, {
        startAt: occurrence.startAt,
        timeZone: occurrence.timeZone,
        allDay: occurrence.allDay,
      })
    : null;
  const options: { value: EditScope; title: string; text: string }[] = [
    { value: 'this', title: t.scope.this, text: longDay(day) },
    { value: 'following', title: t.scope.following, text: t.scope.followingText(monthDay(day)) },
    { value: 'all', title: t.scope.all, text: t.scope.allText(describeRepeat(repeat, day)) },
  ];

  return (
    <View className="gap-space-sm pb-space-sm">
      <Text variant="bodyMd" color="onSurfaceVariant">
        {action === 'edit' ? t.scope.textEdit : t.scope.textDelete}
      </Text>
      <View accessibilityRole="radiogroup" className="gap-space-sm">
        {options.map((o) => {
          const on = scope === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setScope(o.value)}
              className={`min-h-touch flex-row items-center gap-3 rounded-2xl border-[1.5px] p-space-md ${on ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'}`}>
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline'}`}>
                {on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
              </View>
              <View className="flex-1">
                <Text variant="bodyLg">{o.title}</Text>
                <Text variant="bodySm" color="onSurfaceVariant">
                  {o.text}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-space-sm flex-row gap-space-sm">
        <Button label={t.common.goBack} variant="outline" className="flex-1" onPress={onCancel} />
        <Button
          label={action === 'edit' ? t.common.save : t.common.delete}
          icon={action === 'delete' ? 'delete' : undefined}
          className="flex-1"
          onPress={() => onChoose(scope)}
        />
      </View>
    </View>
  );
}
