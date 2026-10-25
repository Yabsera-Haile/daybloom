import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

/** A tablet or an unfolded foldable: the screen's shorter side is 600dp or more. */
export function isTablet(screen: { width: number; height: number } = Dimensions.get('screen')): boolean {
  return Math.min(screen.width, screen.height) >= 600;
}

/**
 * Phones stay upright (app.json); tablets and unfolded foldables turn with the device, so the wide
 * layouts work in landscape too (NFR-14, D20). Android 16 already lets them turn; this does it on
 * older Android, and locks a foldable upright again once it's folded.
 */
export function useOrientation() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let turning: boolean | null = null;
    const apply = () => {
      const tablet = isTablet();
      if (tablet === turning) return;
      turning = tablet;
      const done = tablet
        ? ScreenOrientation.unlockAsync()
        : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      done.catch(() => {});
    };
    apply();
    const sub = Dimensions.addEventListener('change', apply);
    return () => sub.remove();
  }, []);
}
