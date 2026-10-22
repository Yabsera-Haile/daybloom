import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ensureDefaultSpendCategories } from '@/budget/categories';
import { expensesIn } from '@/budget/entries';
import { periodRange } from '@/budget/money';
import { toDayKey } from '@/calendar/dates';
import { withTestDb } from '@/db/testDb';
import BankTextsScreen from '@/app/bank-texts';
import LearnScreen from '@/app/bank-texts/learn';
import SendersScreen from '@/app/bank-texts/senders';
import { ingest } from '@/sms/ingest';
import { MOMO_MESSAGES, MOMO_NOISE, MOMO_SENDER } from '@/sms/fixtures';
import { learnShapes } from '@/sms/learn';
import { sms } from '@/sms/native';
import { listSenders, listUnmatched, saveSender, toSave } from '@/sms/store';
import { refresh, setParams } from '@/test/screen';

// the phone's texts, faked: the Android module isn't there in tests
jest.mock('@/sms/native', () => ({
  sms: {
    hasPermission: () => true,
    listSenders: jest.fn(),
    readTexts: jest.fn(),
    configure: jest.fn(async () => undefined),
    readQueue: () => '[]',
    dropQueue: jest.fn(),
    cancelNotice: jest.fn(),
    canPopUp: jest.fn(() => false),
    openPopUpSettings: jest.fn(),
    addListener: () => ({ remove() {} }),
  },
  askToReadTexts: jest.fn(async () => true),
}));
const fake = sms as unknown as {
  listSenders: jest.Mock;
  readTexts: jest.Mock;
  canPopUp: jest.Mock;
  openPopUpSettings: jest.Mock;
};

const getDb = withTestDb();
const now = Date.now();
const month = periodRange(toDayKey(new Date()), 'month', 1);
// newest first, a minute apart, as the phone gives them
const inbox = [...MOMO_MESSAGES, ...MOMO_NOISE].map((body, i) => ({
  address: MOMO_SENDER,
  body,
  receivedAt: now - (i + 1) * 60_000,
}));

beforeEach(() => {
  ensureDefaultSpendCategories(getDb());
  jest.clearAllMocks();
});

describe('bank texts', () => {
  it('T-BU11.13 starts with what it does and asks to read texts before picking a sender', async () => {
    await render(<BankTextsScreen />);
    expect(screen.getByText('Let your payment texts fill in your spending')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Pick a sender' }));
    expect(router.push).toHaveBeenCalledWith('/bank-texts/senders');
  });

  it('T-BU11.14 senders whose texts mention money come first; others on request', async () => {
    fake.listSenders.mockResolvedValue([
      { address: '+250788000000', count: 40, lastAt: now, samples: ['See you at 5?'] },
      { address: MOMO_SENDER, count: 22, lastAt: now, samples: MOMO_MESSAGES.slice(0, 5) },
    ]);
    await render(<SendersScreen />);
    expect(await screen.findByText('Texts about money')).toBeTruthy();
    expect(screen.getByText(MOMO_SENDER)).toBeTruthy();
    expect(screen.queryByText('+250788000000')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show all senders' }));
    expect(screen.getByText('+250788000000')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: MOMO_SENDER }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bank-texts/learn', params: { address: MOMO_SENDER } });
  });

  it('T-BU11.15 setup shows each kind of text, then adds the picked payments from this month', async () => {
    fake.readTexts.mockResolvedValue(inbox);
    setParams({ address: MOMO_SENDER });
    await render(<LearnScreen />);
    expect(await screen.findByText('16 texts like this')).toBeTruthy();
    expect(screen.getByDisplayValue('MoMo')).toBeTruthy();
    expect(screen.getByText('Adds 7,380.00, paid to Aline')).toBeTruthy();
    expect(screen.getByText('Adds 1,200.00, paid to Eric NSHUTI, and a fee of 20.00')).toBeTruthy();

    // 17 payments this month; leave one out
    const kigali = screen.getByRole('checkbox', { name: /^31,500\.00 to KIGALI SHOP/ });
    await fireEvent.press(kigali);
    await fireEvent.press(screen.getByRole('button', { name: 'Start reading MoMo texts' }));

    expect(listSenders(getDb()).map((s) => s.label)).toEqual(['MoMo']);
    const spent = expensesIn(getDb(), month);
    expect(spent).toHaveLength(17); // 16 payments and one fee
    expect(spent.some((e) => e.payee === 'KIGALI SHOP')).toBe(false);
    expect(spent.filter((e) => e.description === 'MoMo fee').map((e) => e.amountCents)).toEqual([2000]);
    expect(router.dismissTo).toHaveBeenCalledWith('/bank-texts');
  });

  it('T-BU11.16 marking a kind as Skip leaves its texts out', async () => {
    fake.readTexts.mockResolvedValue(inbox);
    setParams({ address: MOMO_SENDER });
    await render(<LearnScreen />);
    await screen.findByText('16 texts like this');
    // the cards come in the learner's order; skip the payment-with-a-fee kind
    const kind = learnShapes(inbox.map((x) => x.body)).findIndex((s) => s.examples[0].includes('Eric NSHUTI'));
    await fireEvent.press(screen.getAllByRole('radio', { name: 'Skip' })[kind]);
    expect(screen.queryByText('Adds 1,200.00, paid to Eric NSHUTI, and a fee of 20.00')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Start reading MoMo texts' }));
    expect(expensesIn(getDb(), month).some((e) => e.payee === 'Eric NSHUTI')).toBe(false);
  });

  it('T-BU11.17 a text that wasn’t understood can be taught from the list', async () => {
    const id = saveSender(getDb(), {
      address: MOMO_SENDER,
      label: 'MoMo',
      shapes: learnShapes(MOMO_MESSAGES).map(toSave),
      readFrom: now,
    });
    const odd = 'You paid 2,500 RWF for airtime 0788000000 on 2026-10-17. Thank you for using MoMo.';
    ingest(getDb(), [{ address: MOMO_SENDER, body: odd, receivedAt: now }], 'USD');
    await render(<BankTextsScreen />);
    expect(screen.getByText('Texts Daybloom didn’t understand (1)')).toBeTruthy();
    await fireEvent.press(screen.getByText(odd));
    expect(screen.getByText('Adds 2,500.00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await refresh();
    expect(listUnmatched(getDb(), id)).toEqual([]);
    expect(expensesIn(getDb(), month).map((e) => [e.amountCents, e.description])).toEqual([[250000, 'MoMo payment']]);
    expect(screen.queryByText(/didn’t understand/)).toBeNull();
  });

  it('T-BU11.19 asks to pop up over other apps, and says so once allowed', async () => {
    saveSender(getDb(), {
      address: MOMO_SENDER,
      label: 'MoMo',
      shapes: learnShapes(MOMO_MESSAGES).map(toSave),
      readFrom: now,
    });
    const first = await render(<BankTextsScreen />);
    expect(screen.getByText('Pop up over other apps')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Allow' }));
    expect(fake.openPopUpSettings).toHaveBeenCalled();
    await first.unmount();

    fake.canPopUp.mockReturnValue(true);
    await render(<BankTextsScreen />);
    expect(screen.getByText('Pops up over other apps')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
  });
});
