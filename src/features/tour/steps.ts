import type { Href } from 'expo-router';

import { t } from '@/i18n';
import { sms } from '@/sms/native';
import type { TargetId } from '@/ui';

/** One stop on the tour: the tab to show, what to point at (none: a card in the middle), and the words. */
export type TourStep = { route?: Href; target?: TargetId; title: string; text: string };

/** The tour (ON-02): a welcome, each part of the app where it lives, and a goodbye. */
export function tourSteps(): TourStep[] {
  // bank texts only where Daybloom can read them (Android, installed app)
  const texts = sms !== null;
  return [
    { route: '/', title: t.tour.welcome, text: t.tour.welcomeText },
    { route: '/', target: 'tab-index', title: t.tour.today, text: t.tour.todayText },
    { route: '/', target: 'add', title: t.tour.add, text: t.tour.addText },
    { route: '/week', target: 'tab-week', title: t.tour.week, text: t.tour.weekText },
    { route: '/month', target: 'tab-month', title: t.tour.month, text: t.tour.monthText },
    { route: '/habits', target: 'tab-habits', title: t.tour.habits, text: t.tour.habitsText },
    { route: '/budget', target: 'tab-budget', title: t.tour.budget, text: t.tour.budgetText },
    { route: '/budget', target: 'savings', title: t.tour.savings, text: t.tour.savingsText },
    {
      route: '/budget',
      target: 'menu',
      title: texts ? t.tour.moreTexts : t.tour.more,
      text: texts ? t.tour.moreTextsText : t.tour.moreText,
    },
    { route: '/budget', target: 'search', title: t.tour.search, text: t.tour.searchText },
    { route: '/', title: t.tour.done, text: t.tour.doneText },
  ];
}
