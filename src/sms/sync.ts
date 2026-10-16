// Keeps spending in step with bank texts (BU-11): tells the Android side which senders to watch,
// and adds what came in: texts caught as they arrived, answers typed into a notification, and
// anything in the inbox since the last read (in case the phone held texts back).
import type { Db } from '@/db/types';
import { t } from '@/i18n';
import { readSettings } from '@/settings';

import { applyNote, ingest, type Ingested, type Text } from './ingest';
import { sms, type QueueItem } from './native';
import { listSenders, markRead, patternsOf } from './store';

let pushed = '';

/** Tells the Android side what to watch for (only when it changed). */
export async function pushConfig(db: Db, color: string): Promise<void> {
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
  const json = JSON.stringify({ ask: readSettings(db).smsAsk, senders, strings: t.sms.notice, color });
  if (json === pushed) return;
  await sms.configure(json);
  pushed = json;
}

const NONE: Ingested = { added: [], unmatched: 0 };
let queue: Promise<unknown> = Promise.resolve();

async function run(db: Db): Promise<Ingested> {
  if (!sms) return NONE;
  const items = JSON.parse(sms.readQueue()) as QueueItem[];
  const texts: Text[] = items.flatMap((i) => (i.type === 'text' ? [i] : []));
  const senders = listSenders(db).filter((s) => s.enabled);
  if (senders.length && sms.hasPermission()) {
    const started = Date.now();
    const since = new Map(senders.map((s) => [s.address, s.readUntil]));
    const inbox = await sms.readTexts([...since.keys()], Math.min(...since.values()), 500);
    texts.push(...inbox.filter((x) => x.receivedAt > (since.get(x.address) ?? Infinity)));
    markRead(
      db,
      senders.map((s) => s.id),
      started,
    );
  }
  const result = texts.length ? ingest(db, texts, readSettings(db).currency) : NONE;
  // answers come after their texts, whose expenses now exist
  for (const i of items) if (i.type === 'note') applyNote(db, i.id, i.note);
  sms.dropQueue(items.length);
  return result;
}

/** Adds what came in. A call while one is running waits for it, then reads again. */
export function syncTexts(db: Db): Promise<Ingested> {
  const next = queue.then(() => run(db));
  queue = next.catch(() => undefined);
  return next;
}
