import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useSettings } from '@/data/hooks';
import { useRoam } from '@/features/pet/roam';
import { t } from '@/i18n';
import { shadows, useTheme } from '@/theme';
import { Button, findTarget, revealTarget, Text, type Rect } from '@/ui';

import { TourPicture } from './Pictures';
import { tourSteps } from './steps';
import { useTour } from './store';

const PAD = 6;
const GAP = 14;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The tour (ON-02), drawn over the real app: the screen dims except the part being explained, with
 * a card saying what it does (and, for bank texts, a small picture of each screen). Skip, Back and
 * Next; Android's back goes back a step.
 */
export function Tour() {
  const step = useTour((s) => s.step);
  // each step starts afresh: nothing highlighted until its part of the screen is found
  return step === null ? null : <TourStepView key={step} step={step} />;
}

function TourStepView({ step }: { step: number }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const part = useTour((s) => s.part);
  // with a companion out, the tour stops to meet it
  const settings = useSettings();
  const companion = settings.pet === 'off' || settings.calm ? null : (settings.petName ?? t.pet.names[settings.pet]);
  const steps = useMemo(() => tourSteps(part, companion), [part, companion]);
  const go = useTour((s) => s.go);
  const stop = useTour((s) => s.stop);
  const s = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;
  // where the thing being explained is; the card waits until it's found
  const [hole, setHole] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (s.route) router.navigate(s.route);
    // the companion may have wandered off: it comes back to Today to be met
    if (s.target === 'pet') useRoam.getState().moveTo('today', false);
    void (async () => {
      // a part of the screen: let its tab appear, and scroll it into view if it can be off screen
      if (s.target) {
        await wait(s.route ? 400 : 0);
        if (revealTarget(s.target)) await wait(300);
        const rect = await findTarget(s.target);
        if (!cancelled) setHole(rect);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [s]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) go(step - 1);
      else stop();
      return true;
    });
    return () => sub.remove();
  }, [step, go, stop]);

  const finish = () => {
    stop();
    // the whole tour ends on Today; the bank-texts part where it started
    if (part === 'app') router.navigate('/');
  };

  const h = hole && {
    x: hole.x - PAD,
    y: hole.y - PAD,
    width: hole.width + PAD * 2,
    height: hole.height + PAD * 2,
  };
  const dim = { position: 'absolute' as const, backgroundColor: colors.scrim, opacity: 0.62 };
  // the card goes on the far side of the highlighted part, lined up with it on a wide screen; beside
  // a tab in the rail (D20)
  const cardWidth = Math.min(width - 32, 480);
  const upper = h ? h.y + h.height / 2 < height / 2 : false;
  const beside = h ? h.x + h.width < width / 4 && h.x + h.width + GAP + cardWidth + 16 <= width : false;
  const cardPlace = h
    ? beside
      ? { left: h.x + h.width + GAP, ...(upper ? { top: h.y } : { bottom: height - h.y - h.height }) }
      : {
          left: Math.min(Math.max(16, h.x + h.width / 2 - cardWidth / 2), width - cardWidth - 16),
          ...(upper ? { top: h.y + h.height + GAP } : { bottom: height - h.y + GAP }),
        }
    : null;
  // "3 of 14": the steps between the welcome and the goodbye (the bank-texts part has no goodbye)
  const counted = part === 'app' ? steps.length - 2 : steps.length - 1;
  const showCount = step > 0 && (part === 'texts' || !last);
  const ending = last && part === 'app';

  return (
    // takes every touch: the app underneath waits until the tour is done
    <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true}>
      {h ? (
        <>
          <View style={[dim, { left: 0, right: 0, top: 0, height: Math.max(0, h.y) }]} />
          <View style={[dim, { left: 0, right: 0, top: h.y + h.height, bottom: 0 }]} />
          <View style={[dim, { left: 0, top: h.y, width: Math.max(0, h.x), height: h.height }]} />
          <View style={[dim, { left: h.x + h.width, right: 0, top: h.y, height: h.height }]} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              width: h.width,
              height: h.height,
              borderRadius: Math.min(20, h.height / 2),
              borderWidth: 3,
              borderColor: colors.primaryFixed,
            }}
          />
        </>
      ) : (
        <View style={[dim, StyleSheet.absoluteFill]} />
      )}

      {ready ? (
        // with nothing to point at, the card sits in the middle of the screen
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            cardPlace ? null : { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
          ]}>
          <View
            accessibilityViewIsModal
            accessibilityLiveRegion="polite"
            className="gap-space-sm rounded-3xl bg-surface-container-lowest p-space-md"
            style={[shadows.float, { width: cardWidth }, cardPlace ? { position: 'absolute', ...cardPlace } : null]}>
            {showCount ? (
              <Text variant="labelMd" color="primary">
                {t.tour.count(step, counted)}
              </Text>
            ) : null}
            <Text variant="headlineSm" accessibilityRole="header">
              {s.title}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {s.text}
            </Text>
            {s.picture ? <TourPicture id={s.picture} /> : null}
            <View className="mt-1 flex-row items-center justify-between gap-2">
              {ending ? <View /> : <Button label={t.tour.skip} variant="text" size="md" onPress={stop} />}
              <View className="flex-row gap-2">
                {step > 0 && !ending ? (
                  <Button label={t.tour.back} variant="outline" size="md" onPress={() => go(step - 1)} />
                ) : null}
                <Button
                  label={step === 0 ? t.tour.start : ending ? t.tour.finish : last ? t.tour.gotIt : t.tour.next}
                  size="md"
                  onPress={last ? finish : () => go(step + 1)}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
