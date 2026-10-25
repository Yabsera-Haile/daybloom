import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
import { Text, useTourTarget } from '@/ui';

import { arts } from './art';
import type { PetArt, PoseName } from './art/types';
import { PetFigure, type Move, type PetFigureHandle } from './PetFigure';
import { elsewhere, useRoam, type Spot } from './roam';

/** How long a pet stays up after waking, unless it's sulking (it waits up for you then). */
const NAP_AFTER = 12_000;
/** How long a speech bubble stays. */
const SAY_FOR = 4_500;
/** The widest a speech bubble gets. */
const BUBBLE = 200;
/** How long it naps in one spot while you watch before it may wander to another tab (ms). */
const WANDER_AFTER: [number, number] = [60_000, 150_000];

/**
 * The companion pet (MS-01…MS-12, D21). Each tab has a nap spot (`at`); the pet is in one of them
 * at a time. It naps unless there's something to show: it wakes happy when you tick a habit or
 * finish a to-do (jumping over to the tab you're on), and waits on Today, sad (gentle) or cross
 * (cheeky), while a habit slips or to-dos sit overdue. Now and then it wakes, yawns, stretches and
 * leaps off to nap on another tab. Tap it to say hello. Off in Calm mode.
 */
export function Companion({
  at,
  width = 96,
  bubble = 'left',
}: {
  at: Spot;
  width?: number;
  /** Which side its speech bubble opens on (away from the edge of the screen). */
  bubble?: 'left' | 'right';
}) {
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
      at={at}
      bubble={bubble}
    />
  );
}

/** Whether the companion is out at all (chosen, and not in Calm mode). */
export function useCompanionOn(): boolean {
  const settings = useSettings();
  return settings.pet !== 'off' && !settings.calm;
}

/** How tall the companion is at a width (every pet's box is 4:3). */
export const companionHeight = (width: number) => (width * 3) / 4;

/** What the pet says for what it feels. */
function linesFor(expression: Expression, s: PetSignals): string[] {
  const l = t.pet.lines;
  if (expression === 'sad') return s.slipping[0] ? l.sadHabit(s.slipping[0]) : l.sadTodos(s.overdue);
  if (expression === 'cross') return s.slipping[0] ? l.crossHabit(s.slipping[0]) : l.crossTodos(s.overdue);
  return l[expression];
}

/** Small moves while nobody touches it; one every few seconds, nothing in between. */
function idleMoves(art: PetArt, asleep: boolean, expression: Expression): Move[] {
  // winged pets stretch their wings now and then, awake
  const wings: Move[] = art.sit.wings ? ['flap'] : [];
  if (asleep) return ['breathe', 'breathe', 'snore', 'twitch'];
  if (expression === 'happy') return [art.tail, art.tail, 'hop', 'twitch', 'tilt', ...wings];
  if (expression === 'cross') return ['flick', 'blink', 'blink', 'twitch', ...wings];
  return ['blink', 'blink', art.tail === 'wag' ? 'wag' : 'sway', 'twitch', 'tilt', ...wings];
}

/** Timers that are cleared when the pet goes. */
function useLater() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
}

/** Something it's in the middle of: waking (a yawn), stretching, or leaping off or in. */
type Doing = 'yawning' | 'stretching' | 'leaving' | 'landing' | null;

function Pet({
  art,
  kind,
  name,
  personality,
  width,
  at,
  bubble,
}: {
  art: PetArt;
  kind: PetKind;
  name: string;
  personality: Personality;
  width: number;
  at: Spot;
  bubble: 'left' | 'right';
}) {
  const today = useToday();
  const now = useNow();
  const signals = useLive(() => petSignals(db, today), [today]);
  const mood = moodOf(signals);
  const expression = expressionOf(mood, personality);
  const bedtime = isBedtime(new Date(now));
  const figure = useRef<PetFigureHandle>(null);
  const later = useLater();
  // the tour stops to meet it (ON-02)
  const tourRef = useTourTarget<View>('pet');
  const spot = useRoam((s) => s.spot);
  const landing = useRoam((s) => s.landing);
  const here = spot === at;

  // it moves only while you can see it: its tab on screen, the app open, and motion allowed (MS-06)
  const still = useReducedMotion();
  const focused = useIsFocused();
  const [open, setOpen] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setOpen(state === 'active'));
    return () => sub.remove();
  }, []);
  const moving = here && focused && open && !still;

  // awake while sulking or for a while after waking; asleep at bedtime whatever happens
  const [wokeAt, setWokeAt] = useState<number | null>(() => (mood === 'happy' ? Date.now() : null));
  const [doing, setDoing] = useState<Doing>(null);
  const asleep = bedtime || (mood !== 'sulky' && wokeAt === null && doing === null);
  const pose: PoseName =
    doing === 'leaving' || doing === 'landing'
      ? 'leap'
      : doing === 'stretching'
        ? 'stretch'
        : doing === 'yawning' || !asleep
          ? 'sit'
          : 'sleep';
  useEffect(() => {
    if (wokeAt === null || mood === 'sulky') return;
    const timer = setTimeout(() => setWokeAt(null), Math.max(0, wokeAt + NAP_AFTER - Date.now()));
    return () => clearTimeout(timer);
  }, [wokeAt, mood]);

  // the speech bubble
  const said = useRef(0);
  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback((lines: string[]) => {
    const text = lines[said.current % lines.length];
    said.current += 1;
    setLine({ text, id: said.current });
  }, []);
  useEffect(() => {
    if (!line) return;
    const timer = setTimeout(() => setLine(null), SAY_FOR);
    return () => clearTimeout(timer);
  }, [line]);

  // leaping off and landing move the whole pet across the card
  const jumpX = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const shown = useSharedValue(1);
  const height = (width * art.box[1]) / art.box[0];
  const jump = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: jumpX.value }, { translateY: jumpY.value }],
  }));

  /** Wakes with a yawn and a stretch, then sits up. */
  const wake = useCallback(
    (then?: () => void) => {
      if (still) {
        setWokeAt(Date.now());
        then?.();
        return;
      }
      setDoing('yawning');
      figure.current?.play('stretch');
      later(1000, () => setDoing('stretching'));
      later(2200, () => {
        setDoing(null);
        setWokeAt(Date.now());
        figure.current?.play('hop');
        then?.();
      });
    },
    [still, later],
  );

  /** Leaps off the card, to nap on another tab (or wait on Today). */
  const leave = useCallback(
    (to: Spot) => {
      const go = () => useRoam.getState().moveTo(to, false);
      if (still) return go();
      wake(() =>
        later(500, () => {
          setDoing('leaving');
          figure.current?.play('flap');
          jumpX.value = withTiming(-width * 1.9, { duration: 700, easing: Easing.in(Easing.quad) });
          jumpY.value = withSequence(
            withTiming(-height * 0.7, { duration: 320, easing: Easing.out(Easing.quad) }),
            withTiming(-height * 0.2, { duration: 380, easing: Easing.in(Easing.quad) }),
          );
          shown.value = withDelay(420, withTiming(0, { duration: 280 }));
          later(720, () => {
            setDoing(null);
            setWokeAt(null);
            go();
            jumpX.value = 0;
            jumpY.value = 0;
            shown.value = 1;
          });
        }),
      );
    },
    [still, wake, later, jumpX, jumpY, shown, width, height],
  );

  // landing here: it leaps in from the side, sits, and has a look round
  useEffect(() => {
    if (!here || !landing) return;
    useRoam.getState().landed();
    if (still) return;
    later(0, () => {
      setDoing('landing');
      figure.current?.play('flap');
    });
    // from off to the side and above, in an arc down onto the spot
    jumpX.set(
      withSequence(
        withTiming(width * 1.9, { duration: 0 }),
        withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) }),
      ),
    );
    jumpY.set(
      withSequence(
        withTiming(-height * 0.8, { duration: 0 }),
        withTiming(-height * 0.95, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 390, easing: Easing.in(Easing.quad) }),
      ),
    );
    shown.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 200 })));
    later(660, () => {
      setDoing(null);
      setWokeAt(Date.now());
      figure.current?.play('hop');
    });
  }, [here, landing, still, later, jumpX, jumpY, shown, width, height]);

  // ticking a habit or finishing a to-do: it cheers once, coming over to the tab you're on if need be
  useEffect(() => {
    if (!focused) return;
    const { cheered, cheer } = useRoam.getState();
    const more = cheered !== null && signals.doneToday > cheered;
    if (cheered !== signals.doneToday) cheer(signals.doneToday);
    if (!more || bedtime) return;
    // the last habit of the day ticked: a celebration, once a day (MS-04)
    const { done, total } = signals.habitsToday;
    const allDone = total > 0 && done === total && useRoam.getState().celebrated !== today;
    if (allDone) useRoam.getState().celebrate(today);
    const hooray = (allDone ? t.pet.lines.allDone : t.pet.lines.happy).map((line) => `${t.pet.sound[kind]} ${line}`);
    const party = () => figure.current?.play(allDone ? 'cheer' : 'hop');
    if (!here) {
      useRoam.getState().moveTo(at, true);
      later(800, () => {
        say(hooray);
        party();
      });
      return;
    }
    later(0, () => {
      setWokeAt(Date.now());
      say(hooray);
      party();
    });
  }, [signals.doneToday, signals.habitsToday, bedtime, focused, here, at, later, say, kind, today]);

  // when something slips it comes back to Today and waits there
  useEffect(() => {
    if (mood !== 'sulky' || bedtime || at !== 'today' || here || !focused) return;
    useRoam.getState().moveTo('today', true);
    later(800, () => say(linesFor(expression, signals)));
  }, [mood, bedtime, at, here, focused, later, say, expression, signals]);

  // this spot is somewhere it can go
  useEffect(() => {
    useRoam.getState().offer(at);
    return () => useRoam.getState().withdraw(at);
  }, [at]);

  // now and then, napping while you watch, it wanders off to another tab
  useEffect(() => {
    if (!moving || !asleep || bedtime || mood === 'sulky') return;
    const [shortest, longest] = WANDER_AFTER;
    const timer = setTimeout(
      () => {
        const to = elsewhere(at);
        if (to) leave(to);
      },
      shortest + Math.random() * (longest - shortest),
    );
    return () => clearTimeout(timer);
  }, [moving, asleep, bedtime, mood, leave, at]);

  // waking up or curling up is a stretch
  const wasAsleep = useRef(asleep);
  useEffect(() => {
    if (wasAsleep.current !== asleep && moving) figure.current?.play('stretch');
    wasAsleep.current = asleep;
  }, [asleep, moving]);

  // the small moves while it's on screen
  useEffect(() => {
    if (!moving || doing) return;
    const moves = idleMoves(art, asleep, expression);
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
  }, [moving, asleep, expression, doing, art]);

  if (!here) return null;

  const onPress = () => {
    if (doing) return;
    if (bedtime) {
      figure.current?.play('snore');
      say(t.pet.lines.bedtime);
      return;
    }
    if (asleep) {
      wake(() => say(linesFor(expression, signals)));
      return;
    }
    setWokeAt(Date.now());
    figure.current?.play(expression === 'happy' ? 'hop' : expression === 'cross' ? 'flick' : 'tilt');
    say(linesFor(expression, signals));
  };

  return (
    <View ref={tourRef} collapsable={false} style={{ width, height }}>
      <Animated.View style={jump}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.pet.label(name, t.pet.kinds[kind], t.pet.how[asleep ? 'asleep' : expression])}
          accessibilityHint={t.pet.hint}
          onPress={onPress}
          hitSlop={8}>
          <PetFigure
            ref={figure}
            art={art}
            pose={pose}
            face={doing === 'yawning' ? 'yawn' : expression}
            width={width}
          />
        </Pressable>
      </Animated.View>
      {line ? (
        // a 200dp holder beside the face; the bubble inside is only as wide as its words
        <View
          pointerEvents="none"
          className={`absolute ${bubble === 'left' ? 'items-end' : 'items-start'}`}
          style={[
            { width: BUBBLE, bottom: height * 0.45 },
            bubble === 'left' ? { right: width * 0.82 } : { left: width * 0.82 },
          ]}>
          <Animated.View
            key={line.id}
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(160)}
            accessibilityLiveRegion="polite"
            className="rounded-2xl bg-surface-container-lowest px-3 py-2"
            style={shadows.float}>
            <Text variant="petSpeech">{line.text}</Text>
            <View
              className="absolute h-3 w-3 rotate-45 bg-surface-container-lowest"
              style={[{ bottom: 12 }, bubble === 'left' ? { right: -5 } : { left: -5 }]}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
