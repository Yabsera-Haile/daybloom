import { ensureDefaultSpendCategories } from '@/budget/categories';
import { expensesIn } from '@/budget/entries';
import { periodRange } from '@/budget/money';
import { createTestDb } from '@/db/testDb';
import type { Db } from '@/db/types';

import { MOMO_MESSAGES, MOMO_SENDER } from './fixtures';
import { learnShapes, messageId } from './learn';
import { sms, type QueueItem } from './native';
import { saveSender, toSave } from './store';
import { syncTexts } from './sync';

// what the Android side hands over, faked
jest.mock('./native', () => ({
  sms: {
    readQueue: jest.fn(),
    dropQueue: jest.fn(),
    hasPermission: () => true,
    readTexts: jest.fn(),
  },
}));
const fake = sms as unknown as { readQueue: jest.Mock; dropQueue: jest.Mock; readTexts: jest.Mock };

const now = new Date(2026, 9, 23, 12).getTime();
const month = periodRange('2026-10-23', 'month', 1);
const bus = (tx: string) =>
  `TxId:${tx}*S*Your payment of 800 RWF to City Bus 123123 was completed at 2026-10-23 09:00:00.  Balance: 9,950 RWF. Fee 0 RWF.*EN#`;
const text = (body: string, at: number): QueueItem => ({
  type: 'text',
  id: messageId(MOMO_SENDER, body),
  address: MOMO_SENDER,
  body,
  receivedAt: at,
});

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  ensureDefaultSpendCategories(db);
  saveSender(db, {
    address: MOMO_SENDER,
    label: 'MoMo',
    shapes: learnShapes(MOMO_MESSAGES).map(toSave),
    readFrom: now - 3_600_000,
  });
  jest.clearAllMocks();
});

describe('adding what came in while Daybloom was closed', () => {
  it('T-BU11.21 texts and answers are taken in order: a payment put off with Later gets the payee’s new category', async () => {
    const first = bus('1');
    const second = bus('2');
    fake.readQueue.mockReturnValue(
      JSON.stringify([
        text(first, now - 60_000),
        { type: 'note', id: messageId(MOMO_SENDER, first), note: 'Bus to work', categoryId: 'transport' },
        text(second, now),
      ]),
    );
    // the inbox has the same two texts, and one the phone held back
    const heldBack = bus('3');
    fake.readTexts.mockResolvedValue([
      { address: MOMO_SENDER, body: first, receivedAt: now - 60_000 },
      { address: MOMO_SENDER, body: second, receivedAt: now },
      { address: MOMO_SENDER, body: heldBack, receivedAt: now - 30_000 },
    ]);

    const { added } = await syncTexts(db);

    expect(added).toHaveLength(3);
    const spent = expensesIn(db, month).map((e) => [e.description, e.budgetCategoryId]);
    expect(spent).toEqual(
      expect.arrayContaining([
        ['Bus to work', 'transport'],
        ['City Bus · MoMo', 'transport'],
        ['City Bus · MoMo', 'transport'],
      ]),
    );
    expect(spent).toHaveLength(3);
    expect(fake.dropQueue).toHaveBeenCalledWith(3);
  });
});
