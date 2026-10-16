// Turns bank texts into expenses (BU-11). A payment becomes an expense named after who was paid
// ("Aline · MoMo") until the person says what it was for; its fee becomes a second expense named
// after the service ("MoMo fee"), so the Fees category shows what each service costs. Money coming
// in, failed payments and offers are left out. Each text is added once, even if read again.
import { and, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { budgetCategories, entries } from '@/db/schema';
import { newId, type Db } from '@/db/types';
import { t } from '@/i18n';

import { looksLikeSpending, messageId, readWith, type Reading, type ShapeKind } from './learn';
import {
  dismissUnmatched,
  getSender,
  listSenders,
  listUnmatched,
  patternsOf,
  recordUnmatched,
  type Sender,
  type SmsPattern,
} from './store';

/** A text as the phone gives it. */
export type Text = { address: string; body: string; receivedAt: number };

/** What a text says, read with its sender's shapes: the first shape that fits decides. */
export function readText(
  patterns: Pick<SmsPattern, 'kind' | 'regex' | 'amountGroup' | 'feeGroup' | 'payeeGroup'>[],
  body: string,
): { kind: ShapeKind; reading: Reading } | null {
  for (const p of patterns) {
    const reading = readWith(p, body);
    if (reading) return { kind: p.kind as ShapeKind, reading };
  }
  return null;
}

export const FEES_CATEGORY_ID = 'fees';

/** The Fees category, added the first time a fee comes in. If the person deleted it, fees have none. */
function feesCategory(db: Db): string | null {
  const row = db.select().from(budgetCategories).where(eq(budgetCategories.id, FEES_CATEGORY_ID)).get();
  if (row) return row.archivedAt ? null : row.id;
  const last =
    db
      .select({ n: max(budgetCategories.sortOrder) })
      .from(budgetCategories)
      .get()?.n ?? -1;
  db.insert(budgetCategories)
    .values({ id: FEES_CATEGORY_ID, name: t.sms.feesCategory, icon: 'sell', colorKey: 'creative', sortOrder: last + 1 })
    .run();
  return FEES_CATEGORY_ID;
}

/** The category last given to spending with this payee, so a regular shop sorts itself. */
function categoryFor(db: Db, payee: string | null): string | null {
  if (!payee) return null;
  return (
    db
      .select({ id: entries.budgetCategoryId })
      .from(entries)
      .innerJoin(budgetCategories, eq(budgetCategories.id, entries.budgetCategoryId))
      .where(
        and(
          eq(entries.payee, payee),
          isNotNull(entries.budgetCategoryId),
          isNull(entries.deletedAt),
          isNull(budgetCategories.archivedAt),
        ),
      )
      .orderBy(desc(entries.updatedAt))
      .limit(1)
      .get()?.id ?? null
  );
}

export const nameFor = (payee: string | null, label: string) =>
  payee ? t.sms.paidTo(payee, label) : t.sms.payment(label);

const known = (db: Db, ref: string) => !!db.select({ id: entries.id }).from(entries).where(eq(entries.ref, ref)).get();

function addPayment(db: Db, sender: Sender, ref: string, reading: Reading, at: number, currency: string): string {
  const id = newId();
  db.insert(entries)
    .values({
      id,
      type: 'expense',
      amountCents: reading.amountCents,
      currency,
      description: nameFor(reading.payee, sender.label),
      budgetCategoryId: categoryFor(db, reading.payee),
      occurredAt: at,
      source: 'sms',
      ref,
      payee: reading.payee,
    })
    .run();
  if (reading.feeCents > 0) {
    db.insert(entries)
      .values({
        id: newId(),
        type: 'expense',
        amountCents: reading.feeCents,
        currency,
        description: t.sms.fee(sender.label),
        budgetCategoryId: feesCategory(db),
        occurredAt: at,
        source: 'sms',
        ref: `${ref}:fee`,
      })
      .run();
  }
  return id;
}

export type Ingested = {
  /** The expenses added for payments (not their fees), oldest first */
  added: { entryId: string; textId: string }[];
  /** Texts that looked like spending but had no known shape */
  unmatched: number;
};

/** Adds the payments in these texts from the senders being read. Texts already added are skipped. */
export function ingest(db: Db, texts: Text[], currency: string): Ingested {
  const senders = new Map(
    listSenders(db)
      .filter((s) => s.enabled)
      .map((s) => [s.address, s]),
  );
  const patterns = new Map<string, SmsPattern[]>();
  const out: Ingested = { added: [], unmatched: 0 };
  const ordered = [...texts].sort((a, b) => a.receivedAt - b.receivedAt);
  db.transaction((tx) => {
    for (const text of ordered) {
      const sender = senders.get(text.address);
      if (!sender) continue;
      const textId = messageId(text.address, text.body);
      if (known(tx, textId)) continue;
      if (!patterns.has(sender.id)) patterns.set(sender.id, patternsOf(tx, sender.id));
      const read = readText(patterns.get(sender.id)!, text.body);
      if (read?.kind === 'spend') {
        if (read.reading.amountCents <= 0) continue;
        out.added.push({ entryId: addPayment(tx, sender, textId, read.reading, text.receivedAt, currency), textId });
      } else if (!read && looksLikeSpending(text.body)) {
        recordUnmatched(tx, { id: textId, senderId: sender.id, body: text.body, receivedAt: text.receivedAt });
        out.unmatched += 1;
      }
    }
  });
  return out;
}

/** "What was it for?": the answer becomes the expense's name. */
export function applyNote(db: Db, textId: string, note: string): string | null {
  const text = note.trim();
  const row = db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.ref, textId), isNull(entries.deletedAt)))
    .get();
  if (!row || !text) return row?.id ?? null;
  db.update(entries).set({ description: text, updatedAt: Date.now() }).where(eq(entries.id, row.id)).run();
  return row.id;
}

/** The expense a text was added as (for the notification's "open" tap). */
export const entryForText = (db: Db, textId: string): string | null =>
  db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.ref, textId), isNull(entries.deletedAt)))
    .get()?.id ?? null;

/** Whether a text was already added (setup leaves those off "this month's payments"). */
export const wasAdded = (db: Db, address: string, body: string) => known(db, messageId(address, body));

/** After a shape is taught: texts not understood that it now reads are added (or set aside). */
export function retryUnmatched(db: Db, senderId: string, currency: string): number {
  const sender = getSender(db, senderId);
  if (!sender) return 0;
  const patterns = patternsOf(db, senderId);
  let added = 0;
  db.transaction((tx) => {
    for (const row of listUnmatched(tx, senderId)) {
      const read = readText(patterns, row.body);
      if (!read) continue;
      dismissUnmatched(tx, row.id);
      if (read.kind === 'spend' && read.reading.amountCents > 0 && !known(tx, row.id)) {
        addPayment(tx, sender, row.id, read.reading, row.receivedAt, currency);
        added += 1;
      }
    }
  });
  return added;
}
