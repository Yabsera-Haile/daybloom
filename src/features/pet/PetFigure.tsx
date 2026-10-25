import { Canvas, Group, ImageSVG, Oval, Skia, type SkSVG } from '@shopify/react-native-skia';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/ui';

import type { FaceName, Part, PetArt, PoseName } from './art/types';

/** Short moves the figure can make; each one ends, so nothing redraws between them (battery). */
export type Move =
  'breathe' | 'blink' | 'twitch' | 'sway' | 'wag' | 'flick' | 'flap' | 'tilt' | 'hop' | 'snore' | 'stretch' | 'cheer';

export interface PetFigureHandle {
  play: (move: Move) => void;
}

type Props = {
  art: PetArt;
  pose: PoseName;
  /** The face when sitting (other poses have their own). */
  face: FaceName;
  /** Width in dp; the height follows the art's box. */
  width: number;
};

const ease = Easing.inOut(Easing.sin);
const t = (to: number, duration: number) => withTiming(to, { duration, easing: ease });
/** Degrees to radians; runs on the UI thread inside the moves. */
const rad = (deg: number) => {
  'worklet';
  return (deg * Math.PI) / 180;
};

/** How the ears sit for a face (degrees, the right ear's way); each pet says how far (art.earMood). */
const earAngle = (art: PetArt, face: FaceName) =>
  face === 'sad' ? art.earMood.sad : face === 'cross' ? art.earMood.cross : 0;

// each drawing is parsed once and kept
const parsed = new Map<string, SkSVG | null>();
function svgOf(art: PetArt, markup: string | undefined): SkSVG | null {
  if (!markup) return null;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${art.box[0]} ${art.box[1]}">${art.defs}${markup}</svg>`;
  if (!parsed.has(xml)) {
    const svg = Skia.SVG.MakeFromString(xml);
    if (!svg) console.warn('A pet drawing could not be read:', markup.slice(0, 80));
    parsed.set(xml, svg);
  }
  return parsed.get(xml) ?? null;
}

/**
 * A pet drawn from its layers (art/types.ts) in one Skia canvas, each part moving around its own
 * pivot inside the drawing. Whole-body moves (a hop, a squash) move the canvas. Moves are played
 * on request (see Companion); with none playing, nothing redraws.
 */
export const PetFigure = forwardRef<PetFigureHandle, Props>(function PetFigure({ art, pose, face, width }, ref) {
  const [bw, bh] = art.box;
  const height = (width * bh) / bw;
  const p = art[pose];
  const sitting = pose === 'sit';
  const faceArt = sitting ? art.sit.faces[face] : null;

  const body = useSharedValue(1);
  const head = useSharedValue(0);
  const nod = useSharedValue(0);
  const ear = useSharedValue(sitting ? earAngle(art, face) : 0);
  const flap = useSharedValue(0);
  const twitch = useSharedValue(0);
  const tail = useSharedValue(0);
  const eyes = useSharedValue(1);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const zzz = useSharedValue(0);
  const sparkle = useSharedValue(0);

  // ears settle into the mood's position
  useEffect(() => {
    ear.value = t(sitting ? earAngle(art, face) : 0, 260);
  }, [ear, sitting, face, art]);

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
          case 'wag':
            tail.value = withSequence(
              withTiming(16, { duration: 80 }),
              withTiming(-12, { duration: 80 }),
              withTiming(16, { duration: 80 }),
              withTiming(-12, { duration: 80 }),
              withTiming(16, { duration: 80 }),
              t(0, 140),
            );
            break;
          case 'flap':
            flap.value = withSequence(
              withTiming(-22, { duration: 120 }),
              withTiming(8, { duration: 140 }),
              withTiming(-18, { duration: 120 }),
              withTiming(6, { duration: 140 }),
              t(0, 200),
            );
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
          case 'cheer':
            // a burst of sparkles and two hops
            sparkle.value = 0;
            sparkle.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
            lift.value = withSequence(
              withTiming(-0.12, { duration: 170, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
              withTiming(-0.1, { duration: 160, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
            );
            break;
        }
      },
    }),
    [body, nod, eyes, twitch, tail, flap, head, squash, lift, zzz, sparkle],
  );

  // the parts move inside the drawing
  const tailMove = useDerivedValue(() => [{ rotate: rad(tail.value) }]);
  const bodyMove = useDerivedValue(() => [{ scaleY: body.value }]);
  const headMove = useDerivedValue(() => [{ translateY: nod.value * bh }, { rotate: rad(head.value) }]);
  const leftEarMove = useDerivedValue(() => [{ rotate: rad(-ear.value) }]);
  const rightEarMove = useDerivedValue(() => [{ rotate: rad(ear.value + twitch.value) }]);
  const eyesMove = useDerivedValue(() => [{ scaleY: eyes.value }]);
  const leftWingMove = useDerivedValue(() => [{ rotate: rad(flap.value) }]);
  const rightWingMove = useDerivedValue(() => [{ rotate: rad(-flap.value) }]);

  // the whole pet hops and squashes as one view
  const whole = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value * height }, { scaleY: squash.value }, { scaleX: 2 - squash.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value === 0 ? 0 : Math.sin(sparkle.value * Math.PI),
    transform: [{ scale: 0.6 + sparkle.value * 0.7 }],
  }));
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: zzz.value === 0 ? 0 : Math.sin(zzz.value * Math.PI),
    transform: [{ translateY: -zzz.value * height * 0.25 }, { translateX: zzz.value * width * 0.08 }],
  }));

  const drawings = useMemo(
    () => ({
      tail: svgOf(art, p.tail?.svg),
      leftWing: svgOf(art, p.wings?.[0].svg),
      rightWing: svgOf(art, p.wings?.[1].svg),
      body: svgOf(art, p.body.svg),
      leftEar: svgOf(art, p.ears?.[0].svg),
      rightEar: svgOf(art, p.ears?.[1].svg),
      head: svgOf(art, p.head.svg),
      eyes: svgOf(art, faceArt?.eyes),
      face: svgOf(art, faceArt ? faceArt.rest : (p as { face?: string }).face),
      front: svgOf(art, p.front),
    }),
    [art, p, faceArt],
  );

  const [sx, sy, srx, sry] = art.shadow;
  const at = (part: Part | undefined) => (part ? { x: part.pivot[0], y: part.pivot[1] } : { x: 0, y: 0 });
  const full = { x: 0, y: 0, width: bw, height: bh };

  return (
    <View style={{ width, height }} pointerEvents="none">
      <Animated.View style={[{ width, height, transformOrigin: '50% 100%' }, whole]}>
        <Canvas style={{ width, height }}>
          <Group transform={[{ scale: width / bw }]}>
            {/* the ground shadow is drawn by Skia itself (a canvas of only SVG drawings shows nothing) */}
            <Oval
              x={sx - srx}
              y={sy - sry}
              width={srx * 2}
              height={sry * 2}
              color="#5A4632"
              opacity={pose === 'leap' ? 0.06 : 0.12}
            />
            {drawings.tail ? (
              <Group origin={at(p.tail)} transform={tailMove}>
                <ImageSVG svg={drawings.tail} {...full} />
              </Group>
            ) : null}
            {drawings.leftWing ? (
              <Group origin={at(p.wings?.[0])} transform={leftWingMove}>
                <ImageSVG svg={drawings.leftWing} {...full} />
              </Group>
            ) : null}
            {drawings.rightWing ? (
              <Group origin={at(p.wings?.[1])} transform={rightWingMove}>
                <ImageSVG svg={drawings.rightWing} {...full} />
              </Group>
            ) : null}
            <Group origin={at(p.body)} transform={bodyMove}>
              <ImageSVG svg={drawings.body} {...full} />
            </Group>
            <Group origin={at(p.head)} transform={headMove}>
              {drawings.leftEar ? (
                <Group origin={at(p.ears?.[0])} transform={leftEarMove}>
                  <ImageSVG svg={drawings.leftEar} {...full} />
                </Group>
              ) : null}
              {drawings.rightEar ? (
                <Group origin={at(p.ears?.[1])} transform={rightEarMove}>
                  <ImageSVG svg={drawings.rightEar} {...full} />
                </Group>
              ) : null}
              <ImageSVG svg={drawings.head} {...full} />
              {drawings.eyes && faceArt ? (
                <Group origin={{ x: faceArt.eyesAt[0], y: faceArt.eyesAt[1] }} transform={eyesMove}>
                  <ImageSVG svg={drawings.eyes} {...full} />
                </Group>
              ) : null}
              {drawings.face ? <ImageSVG svg={drawings.face} {...full} /> : null}
            </Group>
            {drawings.front ? <ImageSVG svg={drawings.front} {...full} /> : null}
          </Group>
        </Canvas>
      </Animated.View>
      {/* sparkles round its head when it celebrates */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sparkleStyle]}>
        {SPARKLES.map(([x, y, size], i) => (
          <Text
            key={i}
            variant="labelLg"
            color="tertiary"
            style={{ position: 'absolute', left: x * width, top: y * height, fontSize: size, lineHeight: size + 2 }}>
            ✦
          </Text>
        ))}
      </Animated.View>
      {pose === 'sleep' ? (
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

/** Where the celebration sparkles sit, as parts of the box: x, y, size. */
const SPARKLES: [number, number, number][] = [
  [0.18, 0.02, 14],
  [0.74, 0.0, 18],
  [0.08, 0.36, 12],
  [0.86, 0.3, 13],
  [0.46, -0.12, 12],
];

const styles = StyleSheet.create({
  zzz: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start' },
});
