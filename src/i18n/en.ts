// All interface text, in English (NFR-09). Another language = another file with the same shape.
// Plain words only: see DESIGN_REVIEW section 7 for the banned list (UX-03).

export const en = {
  /** "Monday", "Monday and Friday", "Monday, Wednesday and Friday" */
  list(items: string[]): string {
    if (items.length <= 1) return items.join('');
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  },

  /** 1st, 2nd, 3rd, 4th, 11th, 21st, 23rd */
  ordinal(n: number): string {
    const tens = n % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
    return `${n}${suffix}`;
  },

  repeat: {
    none: "Doesn't repeat",
    custom: 'Custom…',
    daily: (every: number) => (every === 1 ? 'Every day' : `Every ${every} days`),
    weekdays: 'Every weekday',
    weekly: (days: string, every: number) => (every === 1 ? `Every ${days}` : `Every ${every} weeks on ${days}`),
    monthly: (dayOrdinal: string, every: number) =>
      every === 1 ? `Every month on the ${dayOrdinal}` : `Every ${every} months on the ${dayOrdinal}`,
    yearly: (date: string, every: number) => (every === 1 ? `Every year on ${date}` : `Every ${every} years on ${date}`),
    stopsNever: 'Never',
    stopsOn: (date: string) => `On ${date}`,
    stopsAfter: (times: number) => `After ${times} ${times === 1 ? 'time' : 'times'}`,
  },

  categories: {
    wellness: 'Wellness',
    work: 'Work',
    personal: 'Personal',
    social: 'Social',
    creative: 'Creative',
  },
};

export type Strings = typeof en;
