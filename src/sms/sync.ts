// Keeps spending in step with bank texts (BU-11): tells the Android side which senders to watch,
// and adds what came in: texts caught as they arrived, answers given in the pop-up or a notification, and
// anything in the inbox since the last read (in case the phone held texts back).
import { listSpendCategories } from '@/budget/categories';
import type { Db } from '@/db/types';
import { t } from '@/i18n';
import { readSettings } from '@/settings';
import type { Palette } from '@/theme';

import { applyNote, ingest, payeeCategories, type Ingested, type Text } from './ingest';
import { sms, type QueueItem } from './native';
import { listSenders, markRead, patternsOf } from './store';

let pushed = '';

/** The theme colours the pop-up uses, so it looks like Daybloom. */
const POPUP_COLORS = ['surface', 'onSurface', 'onSurfaceVariant', 'outlineVariant', 'primary', 'onPrimary'] as const;

/**
 * Tells the Android side what to watch for, and what the pop-up offers: the categories, each payee's
 * last one, the words and the colours (only when something changed).
 */
export async function pushConfig(db: Db, palette: Palette): Promise<void> {
  if (!sms) return;
  const senders = listSenders(db)
    .filter((s) => s.enabled)
    .map((s) => ({
      address: s.address,
      label: s.label,
      shapes: patternsOf(db, s.id).map((p) => ({
        kind: p.kind,
        regex: p.regex,
        amountGroup: p.amountGroup ?? 0,
        payeeGroup: p.payeeGroup ?? 0,
      })),
    }));
  const json = JSON.stringify({
    ask: readSettings(db).smsAsk,
    senders,
    strings: t.sms.notice,
    colors: Object.fromEntries(POPUP_COLORS.map((k) => [k, palette[k]])),
    categories: listSpendCategories(db).map((c) => ({ id: c.id, name: c.name })),
    payees: senders.length ? payeeCategories(db) : {},
  });
  if (json === pushed) return;
  await sms.configure(json);
  pushed = json;
}

const NONE: Ingested = { added: [], unmatched: 0 };
let queue: Promise<unknown> = Promise.resolve();

type Note = Extract<QueueItem, { type: 'note' }>;

async function run(db: Db): Promise<Ingested> {
  if (!sms) return NONE;
  const items = JSON.parse(sms.readQueue()) as QueueItem[];
  const currency = readSettings(db).currency;
  const result: Ingested = { added: [], unmatched: 0 };
  const add = (texts: Text[]) => {
    if (!texts.length) return;
    const r = ingest(db, texts, currency);
    result.added.push(...r.added);
    result.unmatched += r.unmatched;
  };
  // in the order they came: an answer's category is then known when the next payment to the same
  // payee is added, even if that one was put off with "Later"
  const waiting: Note[] = [];
  for (const i of items) {
    if (i.type === 'text') add([i]);
    else if (!applyNote(db, i.id, i.note, i.categoryId)) waiting.push(i);
  }
  // then anything in the inbox the phone held back
  const senders = listSenders(db).filter((s) => s.enabled);
  if (senders.length && sms.hasPermission()) {
    const started = Date.now();
    const since = new Map(senders.map((s) => [s.address, s.readUntil]));
    const inbox = await sms.readTexts([...since.keys()], Math.min(...since.values()), 500);
    add(inbox.filter((x) => x.receivedAt > (since.get(x.address) ?? Infinity)));
    markRead(
      db,
      senders.map((s) => s.id),
      started,
    );
  }
  // answers to texts that only came from the inbox
  for (const i of waiting) applyNote(db, i.id, i.note, i.categoryId);
  sms.dropQueue(items.length);
  return result;
}

/** Adds what came in. A call while one is running waits for it, then reads again. */
export function syncTexts(db: Db): Promise<Ingested> {
  const next = queue.then(() => run(db));
  queue = next.catch(() => undefined);
  return next;
}
