import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
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
import { shadows, spacing } from '@/theme';
import { Text, useTourTarget } from '@/ui';

import { arts } from './art';
import type { FaceName, PetArt, PoseName } from './art/types';
import { bubbleFit } from './bubble';
import { PetFigure, type Move, type PetFigureHandle } from './PetFigure';
import { enterSide, useRoam, type Spot } from './roam';
import { useOutfit } from './season';

/** How long a pet stays up after waking or cheering, unless it's sulking (it waits up for you then). */
const NAP_AFTER = 12_000;
/** Come over to a tab, it sits and has a look round this long, then curls up again. */
const LOOK_ROUND = 5_000;
/** How long you stay on a tab before it comes over (MS-12). */
const FOLLOW_AFTER = 5_000;
/** One time in four it's too sleepy to come at once, and comes over later. */
const SLEEPY = 0.25;
const SLEEPY_FOLLOW_AFTER = 20_000;
/** Coming over sulky, it says what's wrong at most this often (not on every tab). */
const GRUMBLE_EVERY = 10 * 60_000;
/** How long a speech bubble stays. */
const SAY_FOR = 4_500;
/** How long it beams, eyes squeezed shut with joy. */
const BEAM_FOR = 1_400;
/** How far off the screen's edge it starts when it comes over (dp). */
const OFF_EDGE = 12;

/**
 * The companion pet (MS-01…MS-12, D21). Each tab has a nap spot (`at`); the pet is in one of them
 * at a time, and follows you: stay on a tab a few seconds and it comes over, leaping (or flying)
 * in from the side of the tab it was on, has a look round, and curls up again. It wakes happy when
 * you tick a habit or finish a to-do, and stays up, sad (gentle) or cross (cheeky), while a habit
 * slips or to-dos sit overdue. Tap it to say hello. Off in Calm mode.
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
  if (expression === 'happy') return [art.tail, art.tail, 'blink', 'hop', 'twitch', 'look', ...wings];
  if (expression === 'cross') return ['flick', 'blink', 'blink', 'twitch', ...wings];
  return ['blink', 'blink', art.tail === 'wag' ? 'wag' : 'sway', 'twitch', 'tilt', 'look', ...wings];
}

/** Timers that are cleared when the pet goes. */
function useLater() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
}

/** Something it's in the middle of: a yawn (waking or dozing off), a stretch, or coming over. */
type Doing = 'yawning' | 'stretching' | 'landing' | null;

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
  const sulky = mood === 'sulky';
  const expression = expressionOf(mood, personality);
  const bedtime = isBedtime(new Date(now));
  const season = useOutfit();
  const figure = useRef<PetFigureHandle>(null);
  const later = useLater();
  // the tour stops to meet it (ON-02)
  const tourRef = useTourTarget<View>('pet');
  // where it sits across the screen, so its speech bubble stays on screen
  const { width: screen } = useWindowDimensions();
  const [petX, setPetX] = useState<number | null>(null);
  const measure = useCallback(() => tourRef.current?.measureInWindow((x) => setPetX(x)), [tourRef]);
  const spot = useRoam((s) => s.spot);
  const landing = useRoam((s) => s.landing);
  const here = spot === at;
  /** What it does once it has come over (a cheer, or saying what's wrong). */
  const greet = useRef<(() => void) | null>(null);

  // it moves only while you can see it: its tab on screen, the app open, and motion allowed (MS-06)
  const still = useReducedMotion();
  const focused = useIsFocused();
  const [open, setOpen] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setOpen(state === 'active'));
    return () => sub.remove();
  }, []);
  const moving = here && focused && open && !still;

  // awake while sulking or until it's time to nap again; asleep at bedtime whatever happens
  const [napAt, setNapAt] = useState<number | null>(() => (mood === 'happy' ? Date.now() + NAP_AFTER : null));
  const [doing, setDoing] = useState<Doing>(null);
  const [beaming, setBeaming] = useState(false);
  /** Coming over from the left (its leap is drawn facing left, so it turns round). */
  const [fromLeft, setFromLeft] = useState(false);
  const asleep = bedtime || (!sulky && napAt === null && doing === null);
  const pose: PoseName =
    doing === 'landing'
      ? 'leap'
      : doing === 'stretching'
        ? 'stretch'
        : doing === 'yawning' || !asleep
          ? 'sit'
          : 'sleep';
  const face: FaceName = doing === 'yawning' ? 'yawn' : beaming && expression === 'happy' ? 'beam' : expression;

  // up for a while, then a yawn, and it curls up again
  useEffect(() => {
    if (napAt === null || sulky) return;
    const timer = setTimeout(
      () => {
        setDoing((d) => d ?? 'yawning');
        later(1000, () => {
          setDoing((d) => (d === 'yawning' ? null : d));
          // unless something woke it again meanwhile
          setNapAt((next) => (next === napAt ? null : next));
        });
      },
      Math.max(0, napAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [napAt, sulky, later]);

  // the speech bubble
  const said = useRef(0);
  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback(
    (lines: string[]) => {
      measure();
      const text = lines[said.current % lines.length];
      said.current += 1;
      setLine({ text, id: said.current });
    },
    [measure],
  );
  useEffect(() => {
    if (!line) return;
    const timer = setTimeout(() => setLine(null), SAY_FOR);
    return () => clearTimeout(timer);
  }, [line]);

  /** Eyes squeezed shut with joy, for a moment. */
  const beam = useCallback(() => {
    setBeaming(true);
    later(BEAM_FOR, () => setBeaming(false));
  }, [later]);

  // coming over moves the whole pet across the screen
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
        setNapAt(Date.now() + NAP_AFTER);
        then?.();
        return;
      }
      setDoing('yawning');
      figure.current?.play('stretch');
      later(1000, () => setDoing('stretching'));
      later(2200, () => {
        setDoing(null);
        setNapAt(Date.now() + NAP_AFTER);
        figure.current?.play('hop');
        then?.();
      });
    },
    [still, later],
  );

  // coming over: in from the side of the tab it was on, in a long bound (two from far off) or
  // flying; then a little squash as it lands, a look round, and in a while it curls up again
  const land = useEffectEvent(() => {
    const { from, landed } = useRoam.getState();
    landed();
    const hello = greet.current;
    greet.current = null;
    const arrive = () => {
      setDoing(null);
      setNapAt(Date.now() + LOOK_ROUND);
      hello?.();
    };
    if (still) {
      later(0, arrive);
      return;
    }
    // from just off that edge of the screen (it has been laid out by now, so measuring answers at once)
    let x = petX ?? (screen - width) / 2;
    tourRef.current?.measureInWindow((left) => {
      x = left;
    });
    const left = enterSide(from, at) === 'left';
    const start = left ? -(x + width + OFF_EDGE) : screen - x + OFF_EDGE;
    const flies = Boolean(art.leap.wings);
    const bounds = !flies && Math.abs(start) > width * 3.2 ? 2 : 1;
    const duration = flies ? Math.min(1400, Math.max(900, Math.abs(start) * 2.4)) : bounds * 560;
    later(0, () => {
      setDoing('landing');
      setFromLeft(left);
    });
    shown.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 150 })));
    jumpX.set(
      withSequence(
        withTiming(start, { duration: 0 }),
        withTiming(0, { duration, easing: flies ? Easing.out(Easing.quad) : Easing.linear }),
      ),
    );
    if (flies) {
      // gliding down from up high, rising a little on a beat of its wings
      jumpY.set(
        withSequence(
          withTiming(-height * 1.4, { duration: 0 }),
          withTiming(-height * 0.7, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(-height * 0.9, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.35, easing: Easing.in(Easing.quad) }),
        ),
      );
      for (let beat = 0; beat < duration - 300; beat += 420) later(beat, () => figure.current?.play('flap'));
    } else {
      const arc = duration / bounds;
      const bound = () => [
        withTiming(-height * 0.9, { duration: arc * 0.45, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: arc * 0.55, easing: Easing.in(Easing.quad) }),
      ];
      jumpY.set(withSequence(withTiming(-height * 0.3, { duration: 0 }), ...bound(), ...(bounds === 2 ? bound() : [])));
    }
    later(duration + 20, () => {
      arrive();
      figure.current?.play('stretch');
      later(900, () => figure.current?.play('look'));
    });
  });
  useEffect(() => {
    if (here && landing) land();
  }, [here, landing]);

  // stay on a tab a few seconds and it comes over (MS-12); one time in four it's too sleepy to
  // come at once, and comes later. Sulking, it always comes, and now and then says what's wrong.
  // At bedtime it stays asleep where it is.
  const comeOver = useEffectEvent(() => {
    const { grumbled, grumble, moveTo } = useRoam.getState();
    if (sulky && (grumbled === null || Date.now() - grumbled > GRUMBLE_EVERY)) {
      grumble(Date.now());
      greet.current = () => say(linesFor(expression, signals));
    }
    moveTo(at, true);
  });
  useEffect(() => {
    if (here || !focused || !open || bedtime) return;
    const wait = sulky || Math.random() >= SLEEPY ? FOLLOW_AFTER : SLEEPY_FOLLOW_AFTER;
    const timer = setTimeout(() => comeOver(), wait);
    return () => clearTimeout(timer);
  }, [here, focused, open, bedtime, sulky]);

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
    const party = () => {
      setNapAt(Date.now() + NAP_AFTER);
      say(hooray);
      figure.current?.play(allDone ? 'cheer' : 'hop');
      beam();
    };
    if (!here) {
      greet.current = party;
      useRoam.getState().moveTo(at, true);
      return;
    }
    later(0, party);
  }, [signals.doneToday, signals.habitsToday, bedtime, focused, here, at, later, say, beam, kind, today]);

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
    setNapAt(Date.now() + NAP_AFTER);
    figure.current?.play(expression === 'happy' ? 'hop' : expression === 'cross' ? 'flick' : 'tilt');
    if (expression === 'happy') beam();
    say(linesFor(expression, signals));
  };

  // the bubble opens where there's room, a page margin clear of the screen's edge (MS-12)
  const fit = bubbleFit(bubble, petX, width, screen, spacing.margin);
  return (
    <View ref={tourRef} collapsable={false} onLayout={measure} style={{ width, height }}>
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
            face={face}
            width={width}
            flip={doing === 'landing' && fromLeft}
            season={season}
          />
        </Pressable>
      </Animated.View>
      {line ? (
        // a holder beside the face as wide as the room there; the bubble inside is only as wide as
        // its words, and a long line wraps
        <View
          pointerEvents="none"
          className={`absolute ${fit.side === 'left' ? 'items-end' : 'items-start'}`}
          style={[
            { width: fit.width, bottom: height * 0.45 },
            fit.side === 'left' ? { right: width * 0.82 } : { left: width * 0.82 },
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
              style={[{ bottom: 12 }, fit.side === 'left' ? { right: -5 } : { left: -5 }]}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
