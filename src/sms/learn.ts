// Learns how a bank's or mobile-money service's texts look (BU-11), with no AI: these texts are made
// by a computer from a few fixed templates where only the amounts, names, dates and reference
// numbers change. So we mask the parts that change, group messages of the same shape (aligning them
// word by word, as log-file template mining does), guess what each shape means from its words, and
// write a pattern for it. The person confirms each shape with a tap; nothing is sent anywhere.
//
// Patterns use only regex features JavaScript and Java share, so the Android side (which shows the
// "What was it for?" notification while Daybloom is closed) can run the same ones.
import { parseMoney } from '@/budget/money';

export type SlotType = 'amount' | 'num' | 'date' | 'time' | 'id';
type RawToken = { kind: 'word' | 'punct' | SlotType; text: string };
/** A fixed word or mark (`word`: letters, not punctuation; `cap`: starts with a capital), a slot, or a gap */
type Tok = { lit: string; word: boolean; cap: boolean } | { slot: SlotType } | { wild: true };

export type ShapeKind = 'spend' | 'income' | 'ignore';

/** A learned pattern: a regex plus which capture group holds what (1-based; null = none). */
export type PatternDef = {
  regex: string;
  amountGroup: number | null;
  feeGroup: number | null;
  payeeGroup: number | null;
};

export type LearnedShape = {
  kind: ShapeKind;
  /** How many of the messages read have this shape */
  count: number;
  examples: string[];
  pattern: PatternDef;
  /** Capture groups that hold amounts, for "tap the amount" */
  amountGroups: number[];
};

// --------------------------------------------------------------------------------------------
// Reading a message into tokens

const PUNCT = String.raw`.,:;!?*#()\[\]{}"'\/\\|<>=+&%@~^_\-’‘“”`;
const PARTS: [RawToken['kind'], RegExp][] = (
  [
    ['date', String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?`],
    ['date', String.raw`\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}`],
    ['time', String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm](?![A-Za-z]))?`],
    ['id', String.raw`\*{2,}\d+`],
    ['id', String.raw`(?:[A-Za-z]+\d|\d+[A-Za-z])[A-Za-z0-9]*`],
    ['num', String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`],
    ['punct', `[${PUNCT}]`],
    ['word', `[^\\s\\d${PUNCT}]+`],
  ] as [RawToken['kind'], string][]
).map(([kind, source]) => [kind, new RegExp(`^(?:${source})`)]);

/** Currency codes and signs that mark a number as an amount. */
const CURRENCIES = new Set(
  'rwf frw rf etb birr br kes ksh ugx tzs ghs ngn zar xof xaf usd eur gbp inr rs zmw mwk bif cdf ssp sos mzn egp mad aed sar $ € £ ₦ ₵'.split(
    ' ',
  ),
);
const isCurrency = (t: RawToken | undefined) => !!t && t.kind === 'word' && CURRENCIES.has(t.text.toLowerCase());

export function tokenize(text: string): RawToken[] {
  const out: RawToken[] = [];
  let rest = text;
  while (rest.length) {
    const space = /^\s+/.exec(rest);
    if (space) {
      rest = rest.slice(space[0].length);
      continue;
    }
    let matched = false;
    for (const [kind, re] of PARTS) {
      const m = re.exec(rest);
      if (m && m[0].length) {
        out.push({ kind, text: m[0] });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push({ kind: 'punct', text: rest[0] });
      rest = rest.slice(1);
    }
  }
  // a number next to a currency is an amount ("7,380 RWF", "ETB 250.00")
  out.forEach((t, i) => {
    if (t.kind !== 'num') return;
    const before = out[i - 1];
    const twoBefore = out[i - 2];
    if (isCurrency(out[i + 1]) || (isCurrency(before) && twoBefore?.kind !== 'num' && twoBefore?.kind !== 'amount')) {
      t.kind = 'amount';
    }
  });
  return out;
}

const toTemplate = (tokens: RawToken[]): Tok[] =>
  tokens.map((t) =>
    t.kind === 'word' || t.kind === 'punct'
      ? {
          lit: t.text.toLowerCase(),
          word: t.kind === 'word',
          // has a capital first letter (scripts without case never do)
          cap: t.kind === 'word' && t.text[0] !== t.text[0].toLowerCase(),
        }
      : { slot: t.kind },
  );

// --------------------------------------------------------------------------------------------
// Grouping messages by shape

const same = (a: Tok, b: Tok) =>
  ('lit' in a && 'lit' in b && a.lit === b.lit) || ('slot' in a && 'slot' in b && a.slot === b.slot);

/** Longest common subsequence of two token lists, as pairs of matched indexes. */
function lcs(a: Tok[], b: Tok[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = !('wild' in a[i]) && same(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (!('wild' in a[i]) && same(a[i], b[j])) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const solid = (t: Tok[]) => t.filter((x) => !('wild' in x)).length;

function similarity(template: Tok[], msg: Tok[]): number {
  return lcs(template, msg).length / Math.max(solid(template), msg.length, 1);
}

/** Keeps what both share; anything that differs becomes a "could be anything" gap. */
function merge(template: Tok[], msg: Tok[]): Tok[] {
  const out: Tok[] = [];
  const pushWild = () => {
    if (!out.length || !('wild' in out[out.length - 1])) out.push({ wild: true });
  };
  let i = 0;
  let j = 0;
  for (const [ti, mj] of [...lcs(template, msg), [template.length, msg.length] as [number, number]]) {
    if (ti > i || mj > j) pushWild();
    if (ti < template.length) out.push(template[ti]);
    i = ti + 1;
    j = mj + 1;
  }
  return out;
}

const STOP = new Set([
  'was',
  'at',
  'on',
  'for',
  'with',
  'via',
  'has',
  'is',
  'have',
  'of',
  'by',
  'ref',
  'reference',
  'the',
  'and',
]);
const PERSON_LEAD = new Set(['to', 'from']);

/**
 * Names change from message to message: the words after "to" / "from", and runs of two or more
 * capitalised words, could be anyone. Even a shape seen once then matches the next payee.
 */
function generaliseNames(t: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let k = 0; k < t.length; k++) {
    const tok = t[k];
    out.push(tok);
    if (!('lit' in tok) || !PERSON_LEAD.has(tok.lit)) continue;
    let end = k + 1;
    while (end < t.length) {
      const next = t[end];
      if (!('lit' in next) || STOP.has(next.lit) || !next.word) break;
      end++;
    }
    if (end > k + 1) {
      out.push({ wild: true });
      k = end - 1;
    }
  }
  // runs of capitalised words (JOHN DOE TESTER, Eric NSHUTI) that weren't caught above
  const result: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    let end = k;
    while (end < out.length) {
      const x = out[end];
      if (!('lit' in x) || !x.cap || STOP.has(x.lit)) break;
      end++;
    }
    if (end - k >= 2 && k > 0) {
      result.push({ wild: true });
      k = end - 1;
    } else result.push(out[k]);
  }
  // no two gaps side by side
  return result.filter((x, k) => !('wild' in x) || !result[k - 1] || !('wild' in result[k - 1]));
}

// --------------------------------------------------------------------------------------------
// What a shape means

const SPEND = new Set([
  'paid',
  'pay',
  'payment',
  'sent',
  'send',
  'debited',
  'debit',
  'purchase',
  'purchased',
  'withdrawn',
  'withdrawal',
  'withdraw',
  'transferred',
  'transfer',
  'bought',
  'spent',
]);
const INCOME = new Set(['received', 'receive', 'credited', 'deposited', 'deposit']);
const FAILED = new Set([
  'failed',
  'unsuccessful',
  'declined',
  'reversed',
  'reversal',
  'insufficient',
  'cancelled',
  'canceled',
  'rejected',
]);
const PROMO = new Set([
  'win',
  'won',
  'offer',
  'bonus',
  'promo',
  'dial',
  'subscribe',
  'discount',
  'prize',
  'www',
  'http',
  'https',
]);
const FEE = new Set(['fee', 'fees', 'charge', 'charges', 'commission']);
const BALANCE = new Set(['balance', 'bal', 'available', 'avail', 'limit', 'vat', 'tax']);

function kindOf(t: Tok[]): ShapeKind {
  const words = t.flatMap((x) => ('lit' in x ? [x.lit] : []));
  if (!t.some((x) => 'slot' in x && x.slot === 'amount')) return 'ignore';
  if (words.some((w) => FAILED.has(w))) return 'ignore';
  // whichever cue comes first decides: "Your payment of…" vs "You have received a payment…"
  for (const w of words) {
    if (PROMO.has(w)) return 'ignore';
    if (INCOME.has(w)) return 'income';
    if (SPEND.has(w)) return 'spend';
  }
  return 'ignore';
}

/** The words just before token k (up to three), skipping punctuation. */
function wordsBefore(t: Tok[], k: number): string[] {
  const out: string[] = [];
  for (let i = k - 1; i >= 0 && out.length < 3; i--) {
    const x = t[i];
    if ('slot' in x || 'wild' in x) break;
    if (x.word) out.push(x.lit);
  }
  return out;
}

// --------------------------------------------------------------------------------------------
// Writing the pattern

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
const SLOT_REGEX: Record<SlotType, string> = {
  amount: String.raw`\d[\d,.]*`,
  num: String.raw`\d[\d,.]*`,
  date: String.raw`\d[\dT:.+\-/Z]*`,
  time: String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?`,
  id: String.raw`[\w*]+`,
};

function toPattern(t: Tok[], kind: ShapeKind): { pattern: PatternDef; amountGroups: number[] } {
  const parts: string[] = [];
  const amountGroups: number[] = [];
  const wildGroups: { group: number; at: number }[] = [];
  let group = 0;
  let amountGroup: number | null = null;
  let feeGroup: number | null = null;
  let best = -Infinity;
  t.forEach((x, k) => {
    if ('lit' in x) parts.push(escape(x.lit));
    else if ('wild' in x) {
      parts.push('(.*?)');
      wildGroups.push({ group: ++group, at: k });
    } else if (x.slot === 'amount') {
      parts.push(`(${SLOT_REGEX.amount})`);
      amountGroups.push(++group);
      const before = wordsBefore(t, k);
      if (before.some((w) => FEE.has(w))) {
        feeGroup ??= group;
        return;
      }
      if (before.some((w) => BALANCE.has(w))) return;
      const score =
        (before.some((w) => SPEND.has(w) || w === 'of' || w === 'amount') ? 3 : 0) + (amountGroup === null ? 1 : 0);
      if (score > best) {
        best = score;
        amountGroup = group;
      }
    } else parts.push(SLOT_REGEX[x.slot]);
  });
  // the payee is the gap after "to" (or "at" / "for")
  const lead = (at: number) => {
    const w = wordsBefore(t, at)[0];
    return w === 'to' ? 2 : w === 'at' || w === 'for' || w === 'merchant' ? 1 : 0;
  };
  const payee = wildGroups.filter((w) => lead(w.at) > 0).sort((a, b) => lead(b.at) - lead(a.at))[0];
  return {
    pattern: {
      regex: `^\\s*${parts.join('\\s*')}\\s*$`,
      amountGroup: kind === 'spend' ? (amountGroup ?? amountGroups[0] ?? null) : null,
      feeGroup: kind === 'spend' ? feeGroup : null,
      payeeGroup: kind === 'spend' ? (payee?.group ?? null) : null,
    },
    amountGroups,
  };
}

// --------------------------------------------------------------------------------------------

const SIMILAR = 0.7;

/**
 * The shapes in a set of messages from one sender, most common first. Spending shapes are always
 * kept; at most `max` shapes in all.
 */
export function learnShapes(messages: string[], max = 6): LearnedShape[] {
  const clusters: { kind: ShapeKind; tokens: Tok[]; examples: string[]; count: number }[] = [];
  for (const body of messages) {
    const tokens = toTemplate(tokenize(body));
    if (!tokens.length) continue;
    // "has been debited" and "has been credited" differ by one word: only group texts of one kind
    const kind = kindOf(tokens);
    let bestCluster: (typeof clusters)[number] | null = null;
    let bestScore = SIMILAR;
    for (const c of clusters) {
      if (c.kind !== kind) continue;
      const s = similarity(c.tokens, tokens);
      if (s >= bestScore) {
        bestScore = s;
        bestCluster = c;
      }
    }
    if (bestCluster) {
      bestCluster.tokens = merge(bestCluster.tokens, tokens);
      bestCluster.count += 1;
      if (bestCluster.examples.length < 3) bestCluster.examples.push(body);
    } else clusters.push({ kind, tokens, examples: [body], count: 1 });
  }
  const shapes = clusters.map((c) => {
    const { pattern, amountGroups } = toPattern(generaliseNames(c.tokens), c.kind);
    return { kind: c.kind, count: c.count, examples: c.examples, pattern, amountGroups };
  });
  shapes.sort((a, b) => b.count - a.count);
  const spend = shapes.filter((s) => s.kind === 'spend');
  const rest = shapes.filter((s) => s.kind !== 'spend');
  return [...spend, ...rest.slice(0, Math.max(0, max - spend.length))].sort((a, b) => b.count - a.count);
}

/** A shape for one message the person is teaching ("Messages I didn't understand"). */
export function shapeOf(body: string, kind: ShapeKind, amountIndex = 0): LearnedShape {
  const tokens = generaliseNames(toTemplate(tokenize(body)));
  const { pattern, amountGroups } = toPattern(tokens, 'spend');
  const amountGroup = amountGroups[amountIndex] ?? pattern.amountGroup;
  return {
    kind,
    count: 1,
    examples: [body],
    amountGroups,
    pattern:
      kind === 'spend'
        ? { ...pattern, amountGroup, feeGroup: pattern.feeGroup === amountGroup ? null : pattern.feeGroup }
        : { ...pattern, amountGroup: null, feeGroup: null, payeeGroup: null },
  };
}

// --------------------------------------------------------------------------------------------
// Using a pattern

const compiled = new Map<string, RegExp>();
function regexOf(source: string): RegExp {
  let re = compiled.get(source);
  if (!re) {
    re = new RegExp(source, 'i');
    compiled.set(source, re);
  }
  return re;
}

export type Reading = { amountCents: number; feeCents: number; payee: string | null };

/** Tidies a captured name: "Aline 209683" stays "Aline"; spaces and stray punctuation go. */
export function cleanPayee(raw: string | undefined): string | null {
  const s = (raw ?? '').replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '');
  return s ? s : null;
}

/** What a message says, if it has this pattern's shape. */
export function readWith(p: PatternDef, body: string): Reading | null {
  const m = regexOf(p.regex).exec(body);
  if (!m) return null;
  const cents = (g: number | null) => (g ? (parseMoney(m[g] ?? '') ?? 0) : 0);
  return {
    amountCents: cents(p.amountGroup),
    feeCents: cents(p.feeGroup),
    payee: p.payeeGroup ? cleanPayee(m[p.payeeGroup]) : null,
  };
}

export const matches = (p: Pick<PatternDef, 'regex'>, body: string) => regexOf(p.regex).test(body);

/** The message cut into pieces, with the captured amounts marked: for "tap the amount". */
export function pieces(p: PatternDef, body: string, groups: number[]): { text: string; group?: number }[] {
  const m = regexOf(p.regex).exec(body);
  if (!m) return [{ text: body }];
  const out: { text: string; group?: number }[] = [];
  let at = 0;
  // capture groups come in order; find each in the text after the last one
  const all = m.slice(1).map((v, i) => ({ v, group: i + 1 }));
  for (const { v, group } of all) {
    if (!v) continue;
    const start = body.indexOf(v, at);
    if (start < 0) continue;
    if (groups.includes(group)) {
      if (start > at) out.push({ text: body.slice(at, start) });
      out.push({ text: v, group });
    } else if (start + v.length > at) {
      out.push({ text: body.slice(at, start + v.length) });
    }
    at = start + v.length;
  }
  if (at < body.length) out.push({ text: body.slice(at) });
  return out;
}

/** Looks like spending (has an amount and a spending word), for "Messages I didn't understand". */
export function looksLikeSpending(body: string): boolean {
  return kindOf(toTemplate(tokenize(body))) === 'spend';
}

/** A stable id for a message (FNV-1a, twice): the same text from the same sender is one expense. */
export function messageId(address: string, body: string): string {
  const s = `${address}\n${body}`;
  const fnv = (seed: number) => {
    let h = seed;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  return fnv(0x811c9dc5) + fnv(0x4f1bbcdd);
}
