import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { db } from '@/db/client';
import { useNow, useSettings, useToday } from '@/data/hooks';
import { useLive } from '@/data/live';
import { t } from '@/i18n';
import {
  expressionOf,
  isBedtime,
  moodOf,
  petSignals,
  type Expression,
  type Personality,
  type PetKind,
  type PetSignals,
} from '@/pet/mood';
import { shadows } from '@/theme';
import { Text } from '@/ui';

import { cat } from './art/cat';
import type { PetArt } from './art/types';
import { PetFigure, type Move, type PetFigureHandle } from './PetFigure';

const arts: Partial<Record<PetKind, PetArt>> = { cat };

/** How long a pet stays up after waking, unless it's sulking (it waits up for you then). */
const NAP_AFTER = 12_000;
/** How long a speech bubble stays. */
const SAY_FOR = 4_500;
/** The widest a speech bubble gets. */
const BUBBLE = 200;

/**
 * The companion pet (MS-01…MS-07, D21), on Today's date card. It naps unless there's something to
 * show: it wakes happy when you tick a habit or finish a to-do, and stays up sad (gentle) or cross
 * (cheeky) while a habit slips or to-dos sit overdue. Tap it to say hello. Off in Calm mode.
 */
export function Companion({ width = 96 }: { width?: number }) {
  const settings = useSettings();
  const kind = settings.pet === 'off' || settings.calm ? null : settings.pet;
  const art = kind ? arts[kind] : undefined;
  if (!kind || !art) return null;
  return (
    <Pet
      art={art}
      kind={kind}
      name={settings.petName ?? t.pet.names[kind]}
      personality={settings.petPersonality}
      width={width}
    />
  );
}

/** What the pet says for what it feels. */
function linesFor(expression: Expression, s: PetSignals): string[] {
  const l = t.pet.lines;
  if (expression === 'sad') return s.slipping[0] ? l.sadHabit(s.slipping[0]) : l.sadTodos(s.overdue);
  if (expression === 'cross') return s.slipping[0] ? l.crossHabit(s.slipping[0]) : l.crossTodos(s.overdue);
  return l[expression];
}

/** Small moves while nobody touches it; one every few seconds, nothing in between. */
function idleMoves(asleep: boolean, expression: Expression): Move[] {
  if (asleep) return ['breathe', 'breathe', 'snore', 'twitch'];
  if (expression === 'happy') return ['sway', 'hop', 'twitch', 'tilt'];
  if (expression === 'cross') return ['flick', 'blink', 'blink', 'twitch'];
  return ['blink', 'blink', 'sway', 'twitch', 'tilt'];
}

function Pet({
  art,
  kind,
  name,
  personality,
  width,
}: {
  art: PetArt;
  kind: PetKind;
  name: string;
  personality: Personality;
  width: number;
}) {
  const today = useToday();
  const now = useNow();
  const signals = useLive(() => petSignals(db, today), [today]);
  const mood = moodOf(signals);
  const expression = expressionOf(mood, personality);
  const bedtime = isBedtime(new Date(now));
  const figure = useRef<PetFigureHandle>(null);

  // it moves only while you can see it: Today on screen, the app open, and motion allowed (MS-06)
  const still = useReducedMotion();
  const focused = useIsFocused();
  const [open, setOpen] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setOpen(state === 'active'));
    return () => sub.remove();
  }, []);
  const moving = focused && open && !still;

  // awake while sulking, or for a while after waking; asleep at bedtime whatever happens
  const [wokeAt, setWokeAt] = useState<number | null>(() => (mood === 'happy' ? Date.now() : null));
  const asleep = bedtime || (mood !== 'sulky' && wokeAt === null);
  useEffect(() => {
    if (wokeAt === null || mood === 'sulky') return;
    const timer = setTimeout(() => setWokeAt(null), Math.max(0, wokeAt + NAP_AFTER - Date.now()));
    return () => clearTimeout(timer);
  }, [wokeAt, mood]);

  // the speech bubble
  const said = useRef(0);
  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const say = (lines: string[]) => {
    const text = lines[said.current % lines.length];
    said.current += 1;
    setLine({ text, id: said.current });
  };
  useEffect(() => {
    if (!line) return;
    const timer = setTimeout(() => setLine(null), SAY_FOR);
    return () => clearTimeout(timer);
  }, [line]);

  // ticking a habit or finishing a to-do wakes it up happy
  const doneBefore = useRef(signals.doneToday);
  useEffect(() => {
    const more = signals.doneToday > doneBefore.current;
    doneBefore.current = signals.doneToday;
    if (!more || bedtime) return;
    const timer = setTimeout(() => {
      setWokeAt(Date.now());
      say(t.pet.lines.happy);
      figure.current?.play('hop');
    }, 0);
    return () => clearTimeout(timer);
  }, [signals.doneToday, bedtime]);

  // waking up or curling up is a stretch
  const wasAsleep = useRef(asleep);
  useEffect(() => {
    if (wasAsleep.current !== asleep && moving) figure.current?.play('stretch');
    wasAsleep.current = asleep;
  }, [asleep, moving]);

  // the small moves while it's on screen
  useEffect(() => {
    if (!moving) return;
    const moves = idleMoves(asleep, expression);
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          figure.current?.play(moves[Math.floor(Math.random() * moves.length)]);
          next();
        },
        2500 + Math.random() * 3500,
      );
    };
    next();
    return () => clearTimeout(timer);
  }, [moving, asleep, expression]);

  const onPress = () => {
    if (bedtime) {
      figure.current?.play('snore');
      say(t.pet.lines.bedtime);
      return;
    }
    setWokeAt(Date.now());
    if (asleep) figure.current?.play('stretch');
    else figure.current?.play(expression === 'happy' ? 'hop' : expression === 'cross' ? 'flick' : 'tilt');
    say(linesFor(expression, signals));
  };

  const height = (width * art.box[1]) / art.box[0];
  return (
    <View style={{ width, height }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.pet.label(name, t.pet.kinds[kind], t.pet.how[asleep ? 'asleep' : expression])}
        accessibilityHint={t.pet.hint}
        onPress={onPress}
        hitSlop={8}>
        <PetFigure ref={figure} art={art} asleep={asleep} expression={expression} width={width} />
      </Pressable>
      {line ? (
        // a 200dp holder beside the face; the bubble inside is only as wide as its words
        <View
          pointerEvents="none"
          className="absolute items-end"
          style={{ width: BUBBLE, right: width * 0.82, bottom: height * 0.45 }}>
          <Animated.View
            key={line.id}
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(160)}
            accessibilityLiveRegion="polite"
            className="rounded-2xl bg-surface-container-lowest px-3 py-2"
            style={shadows.float}>
            <Text variant="bodySm">{line.text}</Text>
            <View
              className="absolute h-3 w-3 rotate-45 bg-surface-container-lowest"
              style={{ right: -5, bottom: 12 }}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
