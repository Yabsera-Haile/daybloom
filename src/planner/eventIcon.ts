// The icon on an event is picked from its title, falling back to its category's icon; the user
// never chooses one (EV-06). English keywords for now, like the rest of the text (NFR-09).
import type { IconName } from '@/ui/generated/icons';

const rules: [RegExp, IconName][] = [
  [/\b(zoom|video|facetime|meet|teams|webinar)\b/, 'videocam'],
  [/\b(call|phone|ring)\b/, 'call'],
  [/\b(lunch|dinner|breakfast|brunch|supper|meal|restaurant|eat)\b/, 'restaurant'],
  [/\b(coffee|tea|cafe|café|latte)\b/, 'local_cafe'],
  [/\b(walk|hike|run|jog|stroll)\b/, 'directions_walk'],
  [/\b(yoga|pilates|meditat\w*|stretch\w*|mindful\w*)\b/, 'self_improvement'],
  [/\b(team|meeting|standup|stand-up|party|gathering)\b/, 'groups'],
  [/\b(birthday|anniversary|celebrat\w*|wedding)\b/, 'celebration'],
  [/\b(class|lecture|lesson|school|study|exam|tutor\w*)\b/, 'school'],
  [/\b(flight|fly|airport|trip|travel)\b/, 'flight_takeoff'],
  [/\b(train|bus|subway|commute)\b/, 'directions_subway'],
  [/\b(read|reading|book club|library)\b/, 'menu_book'],
  [/\b(shop|shopping|groceries|grocery|market)\b/, 'local_mall'],
  [/\b(rent|bill|pay|bank|tax(es)?)\b/, 'payments'],
  [/\b(design|paint|draw|sketch|craft)\b/, 'brush'],
  [/\b(garden|plants?|flowers?)\b/, 'local_florist'],
  [/\b(sleep|nap|bed)\b/, 'bedtime'],
];

export function eventIcon(title: string, categoryIcon: IconName): IconName {
  const words = title.toLowerCase();
  return rules.find(([re]) => re.test(words))?.[1] ?? categoryIcon;
}
