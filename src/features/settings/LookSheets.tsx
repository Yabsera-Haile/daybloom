import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, Vibration, View } from 'react-native';

import { db } from '@/db/client';
import { useSettings, useToday } from '@/data/hooks';
import { themeFor } from '@/features/ThemeProvider';
import { t } from '@/i18n';
import { sendTestReminder, remindersAvailable } from '@/reminders/scheduler';
import { SOUND_FILES, VIBRATION } from '@/reminders/sounds';
import { REMINDER_SOUNDS, saveSetting, THEME_CHOICES, type ReminderSound, type ThemeChoice } from '@/settings';
import { useUi } from '@/state/ui';
import { palettes, type ThemeName } from '@/theme';
import { Button, Icon, Sheet, Sticker, Text } from '@/ui';

function Radio({ on }: { on: boolean }) {
  return (
    <View
      className={`h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline'}`}>
      {on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
    </View>
  );
}

/** Four dots of a season's colours: paper, primary, secondary, tertiary. */
function Swatch({ theme }: { theme: ThemeName }) {
  const c = palettes[theme];
  return (
    <View className="flex-row">
      {[c.primary, c.secondary, c.tertiary, c.primaryFixed].map((color, i) => (
        <View
          key={color}
          className="h-5 w-5 rounded-full border-2"
          style={{ backgroundColor: color, borderColor: c.surface, marginLeft: i ? -6 : 0 }}
        />
      ))}
    </View>
  );
}

/** The current choice in a few words: "Autumn", or "Follow the seasons · Spring now". */
export function themeLabel(choice: ThemeChoice, now: ThemeName): string {
  return choice === 'auto' ? t.settings.followSeasonsNow(t.seasons[now]) : t.seasons[choice];
}

/** Settings › Colours: one season's colours, or follow the seasons where you live. */
export function ThemeSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const today = useToday();
  const now = themeFor('auto', today, settings.hemisphere);
  return (
    <Sheet visible onClose={onClose} title={t.settings.colours} subtitle={t.settings.coloursText} closeButton>
      <View accessibilityRole="radiogroup" className="gap-space-sm pb-space-sm">
        {THEME_CHOICES.map((choice) => {
          const on = settings.theme === choice;
          const season = choice === 'auto' ? now : choice;
          const title = choice === 'auto' ? t.settings.followSeasons : t.seasons[choice];
          const detail =
            choice === 'auto' ? t.settings.followSeasonsText(t.seasons[now]) : t.settings.themeText[choice];
          return (
            <Pressable
              key={choice}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${title}, ${detail}`}
              onPress={() => saveSetting(db, 'theme', choice)}
              className={`min-h-touch flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3 ${on ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'}`}>
              <Radio on={on} />
              <View className="flex-1">
                <Text variant="bodyLg">{title}</Text>
                <Text variant="bodySm" color="onSurfaceVariant">
                  {detail}
                </Text>
              </View>
              {choice === 'auto' ? <Icon name="autorenew" color="primary" /> : <Sticker name={season} size={36} />}
              <Swatch theme={season} />
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Settings › Reminder sound: tap to choose and hear it; "Send a test reminder" plays it as a reminder. */
export function SoundSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);
  // a short preview: plays alongside any music rather than stopping it
  const player = useAudioPlayer(SOUND_FILES.chime, { updateInterval: 1000 });
  useEffect(() => {
    void setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false });
  }, []);
  const [sending, setSending] = useState(false);

  const choose = (sound: ReminderSound) => {
    saveSetting(db, 'reminderSound', sound);
    const file = SOUND_FILES[sound];
    if (file) {
      player.replace(file);
      void player.seekTo(0);
      player.play();
    } else if (sound === 'vibrate') {
      Vibration.vibrate(VIBRATION);
    }
  };

  const test = async () => {
    setSending(true);
    try {
      showToast((await sendTestReminder(5)) ? t.settings.testSent : t.settings.testFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t.settings.reminderSound} subtitle={t.settings.soundText} closeButton>
      <View className="gap-space-sm pb-space-sm">
        <View accessibilityRole="radiogroup" className="gap-1">
          {REMINDER_SOUNDS.map((sound) => {
            const on = settings.reminderSound === sound;
            return (
              <Pressable
                key={sound}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={[t.settings.sounds[sound], t.settings.soundDetails[sound]]
                  .filter(Boolean)
                  .join(', ')}
                onPress={() => choose(sound)}
                className="min-h-[56px] flex-row items-center gap-3 active:opacity-70">
                <Radio on={on} />
                <View className="flex-1">
                  <Text variant="bodyLg">{t.settings.sounds[sound]}</Text>
                  {t.settings.soundDetails[sound] ? (
                    <Text variant="bodySm" color="onSurfaceVariant">
                      {t.settings.soundDetails[sound]}
                    </Text>
                  ) : null}
                </View>
                <Icon
                  name={sound === 'vibrate' ? 'mobile_vibrate' : sound === 'phone' ? 'mobile' : 'volume_up'}
                  color={on ? 'primary' : 'onSurfaceVariant'}
                />
              </Pressable>
            );
          })}
        </View>
        {remindersAvailable ? (
          <View className="gap-1 border-t border-surface-variant pt-space-sm">
            <Button
              label={sending ? t.settings.testSending : t.settings.testSound}
              icon="notifications_active"
              variant="outline"
              fullWidth
              disabled={sending}
              onPress={test}
            />
            <Text variant="bodySm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {t.settings.silentHint}
            </Text>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
