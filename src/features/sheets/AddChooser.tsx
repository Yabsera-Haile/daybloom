import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSettings } from '@/data/hooks';
import { t } from '@/i18n';
import { hourLabel, longDay, monthDay } from '@/i18n/format';
import { useUi, type SheetState } from '@/state/ui';
import { Icon, Sheet, Text, type IconName } from '@/ui';

type Option = {
  icon: IconName;
  circle: string;
  iconColor: 'onPrimaryFixed' | 'onTertiaryFixed' | 'onSecondaryFixed';
  title: string;
  text: string;
  onPress: () => void;
};

function OptionRow({ option }: { option: Option }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${option.title}. ${option.text}`}
      onPress={option.onPress}
      className="min-h-touch flex-row items-center gap-space-md rounded-2xl bg-surface-container-low p-space-md active:opacity-80">
      <View className={`h-12 w-12 items-center justify-center rounded-full ${option.circle}`}>
        <Icon name={option.icon} color={option.iconColor} />
      </View>
      <View className="flex-1">
        <Text variant="bodyLg" weight="600">
          {option.title}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {option.text}
        </Text>
      </View>
      <Icon name="chevron_right" size={22} />
    </Pressable>
  );
}

/** "What would you like to add?" with the day (and hour) preset from where it was opened (SH-05, WK-12, TD-15). */
export function AddChooser({ sheet }: { sheet: Extract<SheetState, { kind: 'add' }> }) {
  const { openSheet, closeSheet, setAddingTask } = useUi();
  const settings = useSettings();
  const { day, week, hour } = sheet;

  const options: Option[] = [
    {
      icon: 'event',
      circle: 'bg-primary-fixed',
      iconColor: 'onPrimaryFixed',
      title: t.add.event,
      text: t.add.eventText,
      onPress: () => {
        closeSheet();
        router.push({ pathname: '/event/new', params: { day, ...(hour !== undefined && { hour: String(hour) }) } });
      },
    },
    {
      icon: 'task_alt',
      circle: 'bg-tertiary-fixed',
      iconColor: 'onTertiaryFixed',
      title: t.add.todo,
      text: t.add.todoText,
      onPress: () => {
        if (sheet.inline) {
          closeSheet();
          setAddingTask(true);
        } else {
          openSheet({ kind: 'task', day, scope: 'day', dueHour: hour });
        }
      },
    },
  ];
  if (week) {
    options.push({
      icon: 'flag',
      circle: 'bg-secondary-fixed',
      iconColor: 'onSecondaryFixed',
      title: t.add.priority,
      text: t.add.priorityText,
      onPress: () => openSheet({ kind: 'task', day: week.start, scope: 'week' }),
    });
  }
  if (hour !== undefined) {
    options.push({
      icon: 'notes',
      circle: 'bg-secondary-fixed',
      iconColor: 'onSecondaryFixed',
      title: t.add.hourNote,
      text: t.add.hourNoteText,
      onPress: () => openSheet({ kind: 'note', day, hour }),
    });
  }

  const forWhat = week
    ? t.add.forWeek(`${monthDay(week.start)} – ${monthDay(week.end)}`)
    : t.add.forDay(hour !== undefined ? `${longDay(day)}, ${hourLabel(hour, settings.timeFormat)}` : longDay(day));

  return (
    <Sheet visible onClose={closeSheet} title={t.add.title} subtitle={forWhat} closeButton>
      <View className="gap-space-sm pt-space-sm">
        {options.map((o) => (
          <OptionRow key={o.title} option={o} />
        ))}
      </View>
    </Sheet>
  );
}
