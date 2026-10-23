// The bank and mobile-money senders Daybloom reads expenses from, and the shapes learned from their
// texts (BU-11). Everything stays in the phone's database (NFR-06).
import { asc, eq, inArray } from 'drizzle-orm';

import { smsPatterns, smsSenders, smsUnmatched } from '@/db/schema';
import { newId, type Db } from '@/db/types';

import type { LearnedShape, PatternDef, ShapeKind } from './learn';

export type Sender = typeof smsSenders.$inferSelect;
export type SmsPattern = typeof smsPatterns.$inferSelect & { kind: ShapeKind };
export type Unmatched = typeof smsUnmatched.$inferSelect;

/** A shape the person confirmed, to save. */
export type ShapeToSave = { kind: ShapeKind; pattern: PatternDef; example: string };

/** Names people know these senders by. */
const KNOWN: [RegExp, string][] = [
  [/^m-?money$|^mtn|momo/i, 'MoMo'],
  [/^m-?pesa$/i, 'M-Pesa'],
  [/^127$|telebirr/i, 'telebirr'],
  [/airtel/i, 'Airtel Money'],
  [/^cbe$|commercial ?bank/i, 'CBE'],
];

/** What to call a sender at first ("M-Money" → "MoMo"); the person can change it. */
export function labelFor(address: string): string {
  return KNOWN.find(([re]) => re.test(address.trim()))?.[1] ?? address.trim();
}

export function listSenders(db: Db): Sender[] {
  return db.select().from(smsSenders).orderBy(asc(smsSenders.createdAt), asc(smsSenders.label)).all();
}

export const getSender = (db: Db, id: string): Sender | undefined =>
  db.select().from(smsSenders).where(eq(smsSenders.id, id)).get();

export function patternsOf(db: Db, senderId: string): SmsPattern[] {
  return db
    .select()
    .from(smsPatterns)
    .where(eq(smsPatterns.senderId, senderId))
    .orderBy(asc(smsPatterns.createdAt), asc(smsPatterns.id))
    .all() as SmsPattern[];
}

const patternRows = (senderId: string, shapes: ShapeToSave[], now: number) =>
  shapes.map((s, i) => ({
    id: newId(),
    senderId,
    kind: s.kind,
    regex: s.pattern.regex,
    amountGroup: s.pattern.amountGroup,
    feeGroup: s.pattern.feeGroup,
    payeeGroup: s.pattern.payeeGroup,
    example: s.example,
    // keeps the order they were shown in
    createdAt: now + i,
  }));

/**
 * Starts reading a sender's texts, or learns them again: its shapes are replaced. Texts that arrive
 * after `readFrom` are added as they come; older ones only if picked at setup.
 */
export function saveSender(
  db: Db,
  input: { address: string; label: string; shapes: ShapeToSave[]; readFrom: number; now?: number },
): string {
  const now = input.now ?? Date.now();
  const label = input.label.trim() || labelFor(input.address);
  return db.transaction((tx) => {
    const old = tx.select().from(smsSenders).where(eq(smsSenders.address, input.address)).get();
    const id = old?.id ?? newId();
    if (old) {
      tx.update(smsSenders)
        .set({ label, enabled: true, readUntil: Math.max(old.readUntil, input.readFrom) })
        .where(eq(smsSenders.id, id))
        .run();
      tx.delete(smsPatterns).where(eq(smsPatterns.senderId, id)).run();
    } else {
      tx.insert(smsSenders)
        .values({ id, address: input.address, label, readUntil: input.readFrom, createdAt: now })
        .run();
    }
    if (input.shapes.length)
      tx.insert(smsPatterns)
        .values(patternRows(id, input.shapes, now))
        .run();
    return id;
  });
}

/** One more shape, taught from a text Daybloom didn't understand. */
export function addPattern(db: Db, senderId: string, shape: ShapeToSave, now = Date.now()): void {
  db.insert(smsPatterns)
    .values(patternRows(senderId, [shape], now))
    .run();
}

export function renameSender(db: Db, id: string, label: string): void {
  const name = label.trim();
  if (!name) return;
  db.update(smsSenders).set({ label: name }).where(eq(smsSenders.id, id)).run();
}

export function setSenderEnabled(db: Db, id: string, enabled: boolean, now = Date.now()): void {
  // switched back on: texts that came while it was off aren't added
  db.update(smsSenders)
    .set(enabled ? { enabled, readUntil: now } : { enabled })
    .where(eq(smsSenders.id, id))
    .run();
}

export function markRead(db: Db, ids: string[], until: number): void {
  if (ids.length) db.update(smsSenders).set({ readUntil: until }).where(inArray(smsSenders.id, ids)).run();
}

/** Stops reading a sender's texts. Expenses already added stay. */
export function removeSender(db: Db, id: string): void {
  db.transaction((tx) => {
    tx.delete(smsUnmatched).where(eq(smsUnmatched.senderId, id)).run();
    tx.delete(smsPatterns).where(eq(smsPatterns.senderId, id)).run();
    tx.delete(smsSenders).where(eq(smsSenders.id, id)).run();
  });
}

/** Texts that looked like spending but had no known shape, newest first. */
export function listUnmatched(db: Db, senderId?: string): Unmatched[] {
  return db
    .select()
    .from(smsUnmatched)
    .where(senderId ? eq(smsUnmatched.senderId, senderId) : undefined)
    .orderBy(asc(smsUnmatched.receivedAt))
    .all()
    .reverse();
}

export const getUnmatched = (db: Db, id: string): Unmatched | undefined =>
  db.select().from(smsUnmatched).where(eq(smsUnmatched.id, id)).get();

export function dismissUnmatched(db: Db, id: string): void {
  db.delete(smsUnmatched).where(eq(smsUnmatched.id, id)).run();
}

export function recordUnmatched(db: Db, row: Unmatched): void {
  db.insert(smsUnmatched).values(row).onConflictDoNothing().run();
}

/** The learned shapes as saved shapes (for a sender learned again with the same answers). */
export const toSave = (s: LearnedShape): ShapeToSave => ({ kind: s.kind, pattern: s.pattern, example: s.examples[0] });
