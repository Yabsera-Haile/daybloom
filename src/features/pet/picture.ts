// The pet's picture for reminders (MS-03): drawn once with Skia off screen and kept as a PNG in the
// app's files, where the notification reads it (patches/expo-notifications: data.largeIcon).
import { Skia } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';

import type { PetKind } from '@/pet/mood';

import { cat } from './art/cat';
import type { PetArt } from './art/types';

const arts: Partial<Record<PetKind, PetArt>> = { cat };

/** Bump when the art changes, so phones draw the picture again. */
const VERSION = 2;
const SIZE = 256;

/** The pet sitting up, smiling, in a square around it (the art's box is wider than it is tall). */
function portrait(art: PetArt): string {
  const s = art.sit;
  const face = s.faces.happy;
  const [bw, bh] = art.box;
  const side = bh - 4;
  const view = `${(bw - side) / 2 + 8} 2 ${side} ${side}`;
  const layers = [s.tail?.svg, s.body.svg, s.ears?.[0].svg, s.ears?.[1].svg, s.head.svg, face.eyes, face.rest, s.front];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">${art.defs}${layers.filter(Boolean).join('')}</svg>`;
}

/** A file:// picture of the pet, made the first time it's needed; null if it can't be made. */
export function petPicture(kind: PetKind): string | null {
  const art = arts[kind];
  if (!art) return null;
  try {
    const dir = new Directory(Paths.document, 'pet');
    if (!dir.exists) dir.create();
    const file = new File(dir, `${kind}-${VERSION}.png`);
    if (!file.exists) {
      const svg = Skia.SVG.MakeFromString(portrait(art));
      const surface = Skia.Surface.Make(SIZE, SIZE);
      if (!svg || !surface) {
        console.warn('Could not draw the pet picture', !svg ? 'drawing' : 'surface');
        return null;
      }
      const canvas = surface.getCanvas();
      // a soft cream circle behind it, like the stickers
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('#FFF1E4'));
      canvas.drawCircle(SIZE / 2, SIZE / 2, SIZE / 2, paint);
      canvas.drawSvg(svg, SIZE, SIZE);
      surface.flush();
      file.create();
      file.write(surface.makeImageSnapshot().encodeToBytes());
    }
    return file.uri;
  } catch (e) {
    console.warn('Could not make the pet picture', e);
    return null;
  }
}
