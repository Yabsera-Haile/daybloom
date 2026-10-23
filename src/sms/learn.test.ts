import { MOMO_MESSAGES, MOMO_NOISE, MOMO_SENDER } from './fixtures';
import {
  learnShapes,
  looksLikeSpending,
  messageId,
  pieces,
  readWith,
  shapeOf,
  withFee,
  type LearnedShape,
} from './learn';

const read = (shapes: LearnedShape[], body: string) => {
  for (const s of shapes) {
    const r = readWith(s.pattern, body);
    if (r) return { kind: s.kind, ...r };
  }
  return null;
};

describe('learning a sender’s texts', () => {
  const shapes = learnShapes([...MOMO_MESSAGES, ...MOMO_NOISE]);

  it('T-BU11.1 finds MoMo’s payment shapes; money in, promotions and failed payments are not spending', () => {
    const spend = shapes.filter((s) => s.kind === 'spend');
    expect(spend.map((s) => s.count)).toEqual([16, 1]);
    expect(shapes.filter((s) => s.kind === 'income').map((s) => s.count)).toEqual([2, 1]);
    expect(read(shapes, MOMO_NOISE[0])?.kind).toBe('ignore');
    expect(read(shapes, MOMO_NOISE[1])?.kind).toBe('ignore');
    // every message read has a shape
    expect(MOMO_MESSAGES.filter((m) => !read(shapes, m))).toEqual([]);
  });

  it('T-BU11.2 reads the amount, the fee and who was paid, not the balance', () => {
    expect(read(shapes, MOMO_MESSAGES[0])).toEqual({ kind: 'spend', amountCents: 738000, feeCents: 0, payee: 'Aline' });
    expect(read(shapes, MOMO_MESSAGES[19])).toEqual({
      kind: 'spend',
      amountCents: 3150000,
      feeCents: 0,
      payee: 'KIGALI SHOP',
    });
    expect(read(shapes, MOMO_MESSAGES[2])).toEqual({
      kind: 'spend',
      amountCents: 120000,
      feeCents: 2000,
      payee: 'Eric NSHUTI',
    });
    expect(read(shapes, MOMO_MESSAGES[1])?.kind).toBe('income');
  });

  it('T-BU11.3 a later payment to someone new, in either shape, is read too', () => {
    expect(
      read(
        shapes,
        'TxId:31999999999*S*Your payment of 12,000 RWF to New Person Here 555555 was completed at 2026-10-20 09:00:00.  Balance: 1,000 RWF. Fee 0 RWF.*EN#',
      ),
    ).toEqual({ kind: 'spend', amountCents: 1200000, feeCents: 0, payee: 'New Person Here' });
    expect(
      read(
        shapes,
        'TransactionId: 31999999998 Your payment of 5000 RWF to Grace UWASE at Airtel with token and ET Id:  SUCCESSFUL at 2026-10-21T08:00:00.000+02:00.Fee:100 RWF. Balance 1000 RWF.',
      ),
    ).toEqual({ kind: 'spend', amountCents: 500000, feeCents: 10000, payee: 'Grace UWASE' });
  });

  it('other banks: a debit with the balance after it gives the debit, with cents', () => {
    const bank = [
      'Dear Customer, your account 1000*****1234 has been debited with ETB 250.00 on 16/10/2026. Available balance ETB 1,230.50. Thank you for banking with us.',
      'Dear Customer, your account 1000*****1234 has been debited with ETB 1,045.75 on 17/10/2026. Available balance ETB 184.75. Thank you for banking with us.',
      'Dear Customer, your account 1000*****1234 has been credited with ETB 5,000.00 on 18/10/2026. Available balance ETB 5,184.75. Thank you for banking with us.',
    ];
    const s = learnShapes(bank);
    expect(read(s, bank[1])).toEqual({ kind: 'spend', amountCents: 104575, feeCents: 0, payee: null });
    expect(read(s, bank[2])?.kind).toBe('income');
  });
});

describe('amounts written against their currency', () => {
  it('T-BU11.22 M-Pesa: "Ksh1,250.00" is the amount and "Transaction cost" the fee', () => {
    const mpesa = [
      'QJK3AB12CD Confirmed. Ksh1,250.00 sent to JOHN DOE 0712345678 on 17/10/26 at 9:15 AM. New M-PESA balance is Ksh3,420.50. Transaction cost, Ksh13.00.',
      'QJK3AB12CE Confirmed. Ksh500.00 sent to MARY ROE 0722000111 on 18/10/26 at 1:20 PM. New M-PESA balance is Ksh2,907.50. Transaction cost, Ksh7.00.',
    ];
    const [shape] = learnShapes(mpesa);
    expect(shape.kind).toBe('spend');
    expect(readWith(shape.pattern, mpesa[0])).toEqual({ amountCents: 125000, feeCents: 1300, payee: 'JOHN DOE' });
    expect(readWith(shape.pattern, mpesa[1])).toEqual({ amountCents: 50000, feeCents: 700, payee: 'MARY ROE' });
  });

  it('a fee written as "100RWF" is read, and an id like QJK3AB12CD is not taken for an amount', () => {
    const body = 'QJK3AB12CD You sent 5,000RWF to Sam. Fee:100RWF. Balance:RWF900.';
    const [shape] = learnShapes([body]);
    expect(readWith(shape.pattern, body)).toEqual({ amountCents: 500000, feeCents: 10000, payee: 'Sam' });
  });
});

describe('choosing the fee', () => {
  it('T-BU11.23 any other number can be marked as the fee, or none', () => {
    const body = MOMO_MESSAGES[2]; // "… 1200 RWF … Fee:20 RWF. Balance 38699 RWF."
    const [shape] = learnShapes([body]);
    const [amount, fee, balance] = shape.amountGroups;
    expect(shape.pattern.feeGroup).toBe(fee);
    expect(readWith(withFee(shape.pattern, null), body)?.feeCents).toBe(0);
    expect(readWith(withFee(shape.pattern, balance), body)?.feeCents).toBe(3869900);
    // the amount can't also be the fee
    expect(withFee(shape.pattern, amount)).toEqual(shape.pattern);
  });
});

describe('teaching one message', () => {
  it('learns from a single message, with the amount the person tapped', () => {
    const body = 'Paid 2,500 RWF to Kigali Bakery. New balance 9,000 RWF. Ref AB12CD.';
    const shape = shapeOf(body, 'spend', 0);
    expect(readWith(shape.pattern, body)).toEqual({ amountCents: 250000, feeCents: 0, payee: 'Kigali Bakery' });
    // tapping the other number makes that the amount
    expect(readWith(shapeOf(body, 'spend', 1).pattern, body)?.amountCents).toBe(900000);
    expect(readWith(shape.pattern, 'Paid 300 RWF to Bob. New balance 8,700 RWF. Ref ZZ99XX.')?.payee).toBe('Bob');
  });

  it('marks the amounts in the example, to tap', () => {
    const [shape] = learnShapes(MOMO_MESSAGES.slice(0, 1));
    const marked = pieces(shape.pattern, MOMO_MESSAGES[0], shape.amountGroups).filter((p) => p.group);
    expect(marked.map((p) => p.text)).toEqual(['7,380', '1,319', '0']);
    expect(
      pieces(shape.pattern, MOMO_MESSAGES[0], shape.amountGroups)
        .map((p) => p.text)
        .join(''),
    ).toBe(MOMO_MESSAGES[0]);
  });

  it('spots texts that look like spending, to ask about them', () => {
    expect(looksLikeSpending('Your payment of 1,000 RWF to X was completed.')).toBe(true);
    expect(looksLikeSpending(MOMO_MESSAGES[1])).toBe(false);
    expect(looksLikeSpending(MOMO_NOISE[0])).toBe(false);
  });
});

describe('patterns', () => {
  it('only use regex features Java shares, so Android can run them', () => {
    for (const s of learnShapes([...MOMO_MESSAGES, ...MOMO_NOISE])) {
      // no named groups, lookarounds or Unicode classes
      for (const feature of ['(?<', '(?=', '(?!', '\\p{', '\\k']) expect(s.pattern.regex).not.toContain(feature);
    }
  });

  it('give each message one stable id', () => {
    expect(messageId(MOMO_SENDER, MOMO_MESSAGES[0])).toBe(messageId(MOMO_SENDER, MOMO_MESSAGES[0]));
    expect(messageId(MOMO_SENDER, MOMO_MESSAGES[0])).not.toBe(messageId(MOMO_SENDER, MOMO_MESSAGES[3]));
    expect(messageId(MOMO_SENDER, MOMO_MESSAGES[0])).toMatch(/^[0-9a-f]{16}$/);
  });
});
