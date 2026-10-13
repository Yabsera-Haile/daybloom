// A habit's icon comes from its name, like an event's (EV-06); the user never picks one.
import type { IconName } from '@/ui/generated/icons';

const rules: [RegExp, IconName][] = [
  [/\b(water|drink|hydrat\w*|tea|lemon)\b/, 'local_cafe'],
  [/\b(skin|face|teeth|floss|shower|wash)\b/, 'clean_hands'],
  [/\b(read|reading|book|pages?)\b/, 'menu_book'],
  [/\b(lights|sleep|bed|bedtime|nap)\b/, 'nightlight'],
  [/\b(stretch\w*|yoga|pilates|meditat\w*|breath\w*)\b/, 'self_improvement'],
  [/\b(walk\w*|steps|run\w*|hike|jog\w*)\b/, 'directions_walk'],
  [/\b(journal\w*|write|writing|diary|gratitude)\b/, 'edit'],
  [/\b(vitamins?|pills?|medicine|meds)\b/, 'shield_with_heart'],
  [/\b(clean\w*|tidy|laundry|dishes)\b/, 'inventory_2'],
  [/\b(meal|cook\w*|prep|lunch|dinner|breakfast|fruit|veg\w*)\b/, 'restaurant'],
  [/\b(budget|money|save|savings|pay)\b/, 'payments'],
  [/\b(call|phone|text)\b/, 'call'],
  [/\b(plants?|garden|flowers?)\b/, 'local_florist'],
  [/\b(study|learn\w*|practice|class|lesson)\b/, 'school'],
];

export function habitIcon(name: string): IconName {
  const words = name.toLowerCase();
  return rules.find(([re]) => re.test(words))?.[1] ?? 'spa';
}

/** Routine icons follow the time of day. */
export function routineIcon(time: string | null): IconName {
  if (!time) return 'all_inclusive';
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'wb_twilight';
  if (hour < 17) return 'sunny';
  return 'bedtime';
}
