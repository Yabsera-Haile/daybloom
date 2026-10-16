import { ensureDefaultSpendCategories, listSpendCategories, deleteSpendCategory } from '@/budget/categories';
import { deleteExpense, expensesIn, getEntry, updateExpense } from '@/budget/entries';
import { periodRange } from '@/budget/money';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { MOMO_MESSAGES, MOMO_NOISE, MOMO_SENDER } from './fixtures';
import { applyNote, entryForText, FEES_CATEGORY_ID, ingest, retryUnmatched, wasAdded, type Text } from './ingest';
import { learnShapes, messageId, shapeOf } from './learn';
import {
  addPattern,
  labelFor,
  listSenders,
  listUnmatched,
  patternsOf,
  removeSender,
  saveSender,
  setSenderEnabled,
  toSave,
} from './store';

const at = (d: number, h = 12) => new Date(2026, 9, d, h).getTime(); // October 2026
const october = periodRange('2026-10-17', 'month', 1);
const text = (body: string, d = 17): Text => ({ address: MOMO_SENDER, body, receivedAt: at(d) });
const momoNew = (amount: string, payee: string, fee = '0', tx = '31999999999') =>
  `TxId:${tx}*S*Your payment of ${amount} RWF to ${payee} 555555 was completed at 2026-10-17 09:00:00.  Balance: 1,000 RWF. Fee ${fee} RWF.*EN#`;

let db: Db;
let senderId: string;
beforeEach(async () => {
  db = await createTestDb();
  ensureDefaultSpendCategories(db);
  senderId = saveSender(db, {
    address: MOMO_SENDER,
    label: labelFor(MOMO_SENDER),
    shapes: learnShapes([...MOMO_MESSAGES, ...MOMO_NOISE]).map(toSave),
    readFrom: at(17, 0),
  });
});

describe('bank-text senders', () => {
  it('T-BU11.4 a sender is saved with its shapes, and learning again replaces them', () => {
    expect(labelFor('M-Money')).toBe('MoMo');
    expect(labelFor('MPESA')).toBe('M-Pesa');
    expect(labelFor('Equity Bank')).toBe('Equity Bank');
    expect(listSenders(db).map((s) => [s.address, s.label, s.enabled])).toEqual([['M-Money', 'MoMo', true]]);
    expect(
      patternsOf(db, senderId)
        .map((p) => p.kind)
        .sort(),
    ).toEqual(['ignore', 'ignore', 'income', 'income', 'spend', 'spend']);

    const again = saveSender(db, {
      address: MOMO_SENDER,
      label: 'Mobile money',
      shapes: learnShapes(MOMO_MESSAGES.slice(0, 1)).map(toSave),
      readFrom: at(17, 0),
    });
    expect(again).toBe(senderId);
    expect(listSenders(db).map((s) => s.label)).toEqual(['Mobile money']);
    expect(patternsOf(db, senderId)).toHaveLength(1);
  });

  it('removing a sender keeps the expenses already added', () => {
    ingest(db, [text(MOMO_MESSAGES[0])], 'RWF');
    removeSender(db, senderId);
    expect(listSenders(db)).toEqual([]);
    expect(expensesIn(db, october)).toHaveLength(1);
  });
});

describe('adding payments from texts', () => {
  it('T-BU11.5 a payment becomes an expense named after who was paid; money in and offers do not', () => {
    const { added, unmatched } = ingest(
      db,
      [text(MOMO_MESSAGES[0], 15), text(MOMO_MESSAGES[1], 15), text(MOMO_NOISE[0]), text(MOMO_NOISE[1])],
      'RWF',
    );
    expect(unmatched).toBe(0);
    expect(added).toHaveLength(1);
    const e = getEntry(db, added[0].entryId)!;
    expect(e).toMatchObject({
      amountCents: 738000,
      currency: 'RWF',
      description: 'Aline · MoMo',
      payee: 'Aline',
      source: 'sms',
      ref: messageId(MOMO_SENDER, MOMO_MESSAGES[0]),
      budgetCategoryId: null,
      occurredAt: at(15),
    });
  });

  it('T-BU11.6 the fee is its own expense, named after the service, in Fees', () => {
    const { added } = ingest(db, [text(MOMO_MESSAGES[2])], 'RWF');
    expect(added).toHaveLength(1);
    const list = expensesIn(db, october);
    expect(list.map((e) => [e.description, e.amountCents, e.budgetCategoryId])).toEqual(
      expect.arrayContaining([
        ['Eric NSHUTI · MoMo', 120000, null],
        ['MoMo fee', 2000, FEES_CATEGORY_ID],
      ]),
    );
    expect(listSpendCategories(db).map((c) => c.name)).toContain('Fees');
    // a payment with no fee adds nothing more
    ingest(db, [text(MOMO_MESSAGES[0])], 'RWF');
    expect(expensesIn(db, october)).toHaveLength(3);
  });

  it('T-BU11.7 the same text is only ever added once, even after its expense is deleted', () => {
    const first = ingest(db, [text(MOMO_MESSAGES[0]), text(MOMO_MESSAGES[0])], 'RWF');
    expect(first.added).toHaveLength(1);
    expect(ingest(db, [text(MOMO_MESSAGES[0])], 'RWF').added).toEqual([]);
    deleteExpense(db, first.added[0].entryId);
    expect(ingest(db, [text(MOMO_MESSAGES[0])], 'RWF').added).toEqual([]);
  });

  it('T-BU11.8 a payee keeps the category it was given last', () => {
    const { added } = ingest(db, [text(momoNew('1,000', 'Corner Cafe', '0', '1'))], 'RWF');
    const e = getEntry(db, added[0].entryId)!;
    updateExpense(db, e.id, { ...e, categoryId: 'dining', description: 'Coffee' });
    const next = ingest(db, [text(momoNew('1,500', 'Corner Cafe', '0', '2'))], 'RWF');
    expect(getEntry(db, next.added[0].entryId)?.budgetCategoryId).toBe('dining');
    // a deleted category isn't used
    deleteSpendCategory(db, 'dining');
    const third = ingest(db, [text(momoNew('2,000', 'Corner Cafe', '0', '3'))], 'RWF');
    expect(getEntry(db, third.added[0].entryId)?.budgetCategoryId).toBeNull();
  });

  it('T-BU11.9 "What was it for?" names the expense', () => {
    const { added } = ingest(db, [text(MOMO_MESSAGES[0])], 'RWF');
    const ref = messageId(MOMO_SENDER, MOMO_MESSAGES[0]);
    expect(entryForText(db, ref)).toBe(added[0].entryId);
    expect(applyNote(db, ref, '  Lunch with Sara ')).toBe(added[0].entryId);
    expect(getEntry(db, added[0].entryId)?.description).toBe('Lunch with Sara');
    // an empty answer keeps the name
    applyNote(db, ref, ' ');
    expect(getEntry(db, added[0].entryId)?.description).toBe('Lunch with Sara');
  });

  it('T-BU11.10 texts from other senders, or a sender switched off, are left alone', () => {
    expect(ingest(db, [{ ...text(MOMO_MESSAGES[0]), address: '+250788000000' }], 'RWF').added).toEqual([]);
    setSenderEnabled(db, senderId, false);
    expect(ingest(db, [text(MOMO_MESSAGES[0])], 'RWF').added).toEqual([]);
  });

  it('T-BU11.11 a spending text of an unknown shape is kept to teach, then read once taught', () => {
    const odd = 'You paid 2,500 RWF for airtime 0788000000 on 2026-10-17. Thank you for using MoMo.';
    const { added, unmatched } = ingest(db, [text(odd)], 'RWF');
    expect(added).toEqual([]);
    expect(unmatched).toBe(1);
    const [row] = listUnmatched(db);
    expect(row.body).toBe(odd);

    addPattern(db, senderId, toSave(shapeOf(odd, 'spend')));
    expect(retryUnmatched(db, senderId, 'RWF')).toBe(1);
    expect(listUnmatched(db)).toEqual([]);
    expect(expensesIn(db, october).map((e) => [e.amountCents, e.description])).toEqual([[250000, 'MoMo payment']]);
    expect(wasAdded(db, MOMO_SENDER, odd)).toBe(true);
    expect(ingest(db, [text(odd)], 'RWF').added).toEqual([]);
  });

  it('a text taught as not spending is set aside without adding anything', () => {
    const odd = 'You paid 2,500 RWF for airtime 0788000000 on 2026-10-17. Thank you for using MoMo.';
    ingest(db, [text(odd)], 'RWF');
    addPattern(db, senderId, toSave(shapeOf(odd, 'ignore')));
    expect(retryUnmatched(db, senderId, 'RWF')).toBe(0);
    expect(listUnmatched(db)).toEqual([]);
    expect(expensesIn(db, october)).toEqual([]);
  });
});
