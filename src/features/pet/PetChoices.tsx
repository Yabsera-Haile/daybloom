import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '@/i18n';
import type { Personality, PetKind } from '@/pet/mood';
import { PET_KINDS } from '@/settings';
import { shadows } from '@/theme';
import { Icon, Text, TextField } from '@/ui';

import { arts } from './art';
import type { FaceName } from './art/types';
import { PetFigure } from './PetFigure';
import { useOutfit } from './season';

/** A still picture of a pet, dressed for the season. */
function Portrait({ kind, face, width }: { kind: PetKind; face: FaceName; width: number }) {
  const art = arts[kind];
  const season = useOutfit();
  return art ? <PetFigure art={art} pose="sit" face={face} width={width} season={season} /> : null;
}

/** A choice card: picked ones get the primary border. */
function Choice({
  selected,
  onPress,
  label,
  children,
  className = '',
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`items-center rounded-2xl border-2 bg-surface-container-lowest p-space-sm active:opacity-80 ${selected ? 'border-primary' : 'border-transparent'} ${className}`}
      style={shadows.card}>
      {children}
    </Pressable>
  );
}

/**
 * Pick a companion (or none), its name and its personality (ON-03, MS-01, MS-02, MS-10): pet cards
 * with each pet's picture, a name box, and Gentle or Cheeky shown with the face each one makes when
 * a habit slips.
 */
/** A card for each pet, with its picture, and "No thanks". */
export function PetCards({ kind, onKind }: { kind: PetKind | 'off'; onKind: (kind: PetKind | 'off') => void }) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-space-sm">
      {PET_KINDS.map((k) => (
        <Choice key={k} selected={kind === k} onPress={() => onKind(k)} label={t.pet.kinds[k]} className="w-[112px]">
          <Portrait kind={k} face="happy" width={88} />
          <Text variant="labelLg">{t.pet.kinds[k]}</Text>
        </Choice>
      ))}
      <Choice
        selected={kind === 'off'}
        onPress={() => onKind('off')}
        label={t.onboarding.noPet}
        className="w-[112px] justify-center">
        <View className="h-[66px] items-center justify-center">
          <Icon name="do_not_disturb_on" size={32} />
        </View>
        <Text variant="labelLg">{t.onboarding.noPet}</Text>
      </Choice>
    </View>
  );
}

export function PetChoices({
  kind,
  onKind,
  name,
  onName,
  personality,
  onPersonality,
}: {
  kind: PetKind | 'off';
  onKind: (kind: PetKind | 'off') => void;
  name: string;
  onName: (name: string) => void;
  personality: Personality;
  onPersonality: (personality: Personality) => void;
}) {
  return (
    <View className="gap-space-lg">
      <PetCards kind={kind} onKind={onKind} />

      {kind === 'off' ? null : (
        <>
          <View className="gap-1">
            <Text variant="labelMd" color="onSurfaceVariant">
              {t.settings.petName}
            </Text>
            <TextField
              accessibilityLabel={t.settings.petName}
              placeholder={t.pet.names[kind]}
              value={name}
              onChangeText={onName}
              autoCapitalize="words"
              maxLength={24}
              variant="headlineSm"
              className="h-14 rounded-xl border-[1.5px] border-primary bg-surface-container-lowest px-4"
            />
          </View>
          <View className="gap-1">
            <Text variant="labelMd" color="onSurfaceVariant">
              {t.settings.personality}
            </Text>
            <View accessibilityRole="radiogroup" className="gap-space-sm">
              {(['gentle', 'cheeky'] as const).map((p) => (
                <Choice
                  key={p}
                  selected={personality === p}
                  onPress={() => onPersonality(p)}
                  label={`${t.settings[p]}. ${t.settings[`${p}Text`]}`}
                  className="flex-row gap-space-sm">
                  <Portrait kind={kind} face={p === 'gentle' ? 'sad' : 'cross'} width={72} />
                  <View className="flex-1">
                    <Text variant="labelLg">{t.settings[p]}</Text>
                    <Text variant="bodySm" color="onSurfaceVariant">
                      {t.settings[`${p}Text`]}
                    </Text>
                  </View>
                </Choice>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}
