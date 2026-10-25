import type { Href } from 'expo-router';

import { t } from '@/i18n';
import { sms } from '@/sms/native';
import type { TargetId } from '@/ui';

import type { PictureId } from './Pictures';

/**
 * One stop on the tour: the tab to show, what to point at (none: a card in the middle), the words,
 * and a small picture of the screen it describes.
 */
export type TourStep = { route?: Href; target?: TargetId; title: string; text: string; picture?: PictureId };

/** Which tour: the whole app, or just how expenses from bank texts work. */
export type TourPart = 'app' | 'texts';

/** Expenses from bank texts, step by step: the part most likely to need explaining. */
function textsSteps(): TourStep[] {
  const s = t.tour;
  return [
    { picture: 'senders', title: s.textsPick, text: s.textsPickText },
    { picture: 'kinds', title: s.textsKinds, text: s.textsKindsText },
    { picture: 'month', title: s.textsMonth, text: s.textsMonthText },
    { picture: 'popUp', title: s.textsAsk, text: s.textsAskText },
    { picture: 'fees', title: s.textsFees, text: s.textsFeesText },
  ];
}

/**
 * The tour (ON-02): a welcome, each part of the app where it lives, bank texts in detail, a goodbye.
 * With a companion (its name), a stop to meet it.
 */
export function tourSteps(part: TourPart = 'app', companion: string | null = null): TourStep[] {
  const s = t.tour;
  if (part === 'texts') return [{ title: s.texts, text: s.textsHereText }, ...textsSteps()];
  // bank texts only where Daybloom can read them (Android, installed app)
  const texts: TourStep[] =
    sms !== null
      ? [{ route: '/budget', target: 'menu', title: s.texts, text: s.textsText }, ...textsSteps()]
      : [{ route: '/budget', target: 'menu', title: s.more, text: s.moreText }];
  return [
    { route: '/', title: s.welcome, text: s.welcomeText },
    { route: '/', target: 'tab-index', title: s.today, text: s.todayText },
    { route: '/', target: 'add', title: s.add, text: s.addText },
    ...(companion ? [{ route: '/' as Href, target: 'pet' as const, title: s.pet(companion), text: s.petText }] : []),
    { route: '/week', target: 'tab-week', title: s.week, text: s.weekText },
    { route: '/month', target: 'tab-month', title: s.month, text: s.monthText },
    { route: '/habits', target: 'tab-habits', title: s.habits, text: s.habitsText },
    { route: '/budget', target: 'tab-budget', title: s.budget, text: s.budgetText },
    { route: '/budget', target: 'savings', title: s.savings, text: s.savingsText },
    ...texts,
    { route: '/budget', target: 'search', title: s.search, text: s.searchText },
    { route: '/', title: s.done, text: s.doneText },
  ];
}
