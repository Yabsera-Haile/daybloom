import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { Expression } from '@/pet/mood';
import { Text } from '@/ui';

import type { Part, PetArt } from './art/types';

/** Short moves the figure can make; each one ends, so nothing animates between them (battery). */
export type Move = 'breathe' | 'blink' | 'twitch' | 'sway' | 'flick' | 'tilt' | 'hop' | 'snore' | 'stretch';

export interface PetFigureHandle {
  play: (move: Move) => void;
}

type Props = {
  art: PetArt;
  asleep: boolean;
  expression: Expression;
  /** Width in dp; the height follows the art's box. */
  width: number;
};

const ease = Easing.inOut(Easing.sin);
const t = (to: number, duration: number) => withTiming(to, { duration, easing: ease });

/** Ears droop when sad and flatten a little when cross (degrees, the right ear's way). */
const earAngle = (expression: Expression) => (expression === 'sad' ? 24 : expression === 'cross' ? -6 : 0);

/**
 * A pet drawn from its layers (art/types.ts), with each part moving around its own pivot. Moves
 * are played on request (see Companion); with none playing, nothing redraws.
 */
export const PetFigure = forwardRef<PetFigureHandle, Props>(function PetFigure(
  { art, asleep, expression, width },
  ref,
) {
  const [bw, bh] = art.box;
  const height = (width * bh) / bw;
  const pose = asleep ? art.asleep : art.awake;
  const face = asleep ? null : art.awake.faces[expression];

  const body = useSharedValue(1);
  const head = useSharedValue(0);
  const nod = useSharedValue(0);
  const ear = useSharedValue(asleep ? 0 : earAngle(expression));
  const twitch = useSharedValue(0);
  const tail = useSharedValue(0);
  const eyes = useSharedValue(1);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const zzz = useSharedValue(0);

  // ears settle into the mood's position
  useEffect(() => {
    ear.value = t(asleep ? 0 : earAngle(expression), 260);
  }, [ear, asleep, expression]);

  useImperativeHandle(
    ref,
    () => ({
      play(move) {
        switch (move) {
          case 'breathe':
            body.value = withSequence(t(1.04, 1300), t(1, 1500), t(1.04, 1300), t(1, 1500));
            nod.value = withSequence(t(-0.012, 1300), t(0, 1500), t(-0.012, 1300), t(0, 1500));
            break;
          case 'blink':
            eyes.value = withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 120 }));
            break;
          case 'twitch':
            twitch.value = withSequence(withTiming(16, { duration: 70 }), withTiming(-5, { duration: 90 }), t(0, 160));
            break;
          case 'sway':
            tail.value = withSequence(t(10, 600), t(-7, 700), t(0, 600));
            break;
          case 'flick':
            tail.value = withSequence(
              withTiming(14, { duration: 90 }),
              withTiming(-8, { duration: 90 }),
              withTiming(14, { duration: 90 }),
              withTiming(-8, { duration: 90 }),
              t(0, 160),
            );
            break;
          case 'tilt':
            head.value = withSequence(t(-8, 320), withDelay(900, t(0, 420)));
            break;
          case 'hop':
            squash.value = withSequence(
              withTiming(0.9, { duration: 110 }),
              withTiming(1.05, { duration: 140 }),
              t(1, 200),
            );
            lift.value = withSequence(
              withDelay(110, withTiming(-0.1, { duration: 170, easing: Easing.out(Easing.quad) })),
              withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
            );
            break;
          case 'snore':
            zzz.value = 0;
            zzz.value = withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) });
            break;
          case 'stretch':
            squash.value = withSequence(
              withTiming(0.88, { duration: 140 }),
              withTiming(1.06, { duration: 180 }),
              t(1, 240),
            );
            break;
        }
      },
    }),
    [body, nod, eyes, twitch, tail, head, squash, lift, zzz],
  );

  const box = { width, height };
  const whole = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value * height }, { scaleY: squash.value }, { scaleX: 2 - squash.value }],
  }));
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: zzz.value === 0 ? 0 : Math.sin(zzz.value * Math.PI),
    transform: [{ translateY: -zzz.value * height * 0.25 }, { translateX: zzz.value * width * 0.08 }],
  }));

  return (
    <View style={box} pointerEvents="none">
      <Animated.View style={[box, { transformOrigin: '50% 100%' }, whole]}>
        {pose.tail ? <Layer art={art} part={pose.tail} width={width} value={tail} kind="rotate" /> : null}
        <Layer art={art} part={pose.body} width={width} value={body} kind="scaleY" />
        <HeadGroup art={art} part={pose.head} width={width} turn={head} nod={nod}>
          {pose.ears ? (
            <>
              <Layer art={art} part={pose.ears[0]} width={width} value={ear} kind="rotate" mirror />
              <Layer art={art} part={pose.ears[1]} width={width} value={ear} extra={twitch} kind="rotate" />
            </>
          ) : null}
          <Layer art={art} part={pose.head} width={width} />
          {face ? (
            <>
              <Layer art={art} part={{ svg: face.eyes, pivot: face.eyesAt }} width={width} value={eyes} kind="scaleY" />
              <Layer art={art} part={{ svg: face.rest, pivot: face.eyesAt }} width={width} />
            </>
          ) : (
            <Layer art={art} part={{ svg: art.asleep.face, pivot: [0, 0] }} width={width} />
          )}
        </HeadGroup>
        {pose.front ? <Layer art={art} part={{ svg: pose.front, pivot: [0, 0] }} width={width} /> : null}
      </Animated.View>
      {asleep ? (
        <Animated.View style={[styles.zzz, { left: width * 0.42, top: height * 0.12 }, zzzStyle]}>
          <Text variant="labelSm" color="onSurfaceVariant">
            z
          </Text>
          <Text variant="labelMd" color="onSurfaceVariant" style={{ marginLeft: 6, marginTop: -10 }}>
            z
          </Text>
          <Text variant="labelLg" color="onSurfaceVariant" style={{ marginLeft: 14, marginTop: -12 }}>
            Z
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
});

const origin = (art: PetArt, [x, y]: [number, number]) => `${(x / art.box[0]) * 100}% ${(y / art.box[1]) * 100}%`;

/** The head and everything on it turn and nod together. */
function HeadGroup({
  art,
  part,
  width,
  turn,
  nod,
  children,
}: {
  art: PetArt;
  part: Part;
  width: number;
  turn: SharedValue<number>;
  nod: SharedValue<number>;
  children: ReactNode;
}) {
  const height = (width * art.box[1]) / art.box[0];
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: nod.value * height }, { rotate: `${turn.value}deg` }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(art, part.pivot) }, style]}>
      {children}
    </Animated.View>
  );
}

/** One drawing of the art, moved around its pivot by `value` (degrees, or a vertical stretch). */
const Layer = memo(function Layer({
  art,
  part,
  width,
  value,
  extra,
  kind = 'rotate',
  mirror = false,
}: {
  art: PetArt;
  part: Part;
  width: number;
  value?: SharedValue<number>;
  extra?: SharedValue<number>;
  kind?: 'rotate' | 'scaleY';
  /** Turns the other way (the left ear droops to the left). */
  mirror?: boolean;
}) {
  const height = (width * art.box[1]) / art.box[0];
  const xml = useMemo(
    () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${art.box[0]} ${art.box[1]}">${part.svg}</svg>`,
    [art, part.svg],
  );
  const style = useAnimatedStyle(() => {
    if (!value) return {};
    const v = value.value + (extra?.value ?? 0);
    return kind === 'rotate' ? { transform: [{ rotate: `${mirror ? -v : v}deg` }] } : { transform: [{ scaleY: v }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(art, part.pivot) }, style]}>
      <SvgXml xml={xml} width={width} height={height} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  zzz: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start' },
});
