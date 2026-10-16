// MTN MoMo (Rwanda) texts, shaped exactly like real ones; names, ids, account and phone numbers are
// made up. Used by the tests to check the pattern learner.
export const MOMO_SENDER = 'M-Money';

export const MOMO_MESSAGES = [
  'TxId:31250055105*S*Your payment of 7,380 RWF to Aline 209683 was completed at 2026-10-15 14:37:58.  Balance: 1,319 RWF. Fee 0 RWF.*EN#',
  'You have received 40000 RWF from JOHN DOE TESTER (*********111) at 2026-10-15 14:43:30. Message from sender: Sender:JOHN DOE TESTER,AcctId:4000000000001,FSPId:085,FSP:EquityBank. Balance:41319 RWF. FT Id: 31250172362.',
  'TransactionId: 31271804539 Your payment of 1200 RWF to Eric NSHUTI at Airtel with token and ET Id:  SUCCESSFUL at 2026-10-16T14:00:57.847+02:00.Fee:20 RWF. Balance 38699 RWF.',
  'TxId:31250180664*S*Your payment of 1,400 RWF to Kamali 1930416 was completed at 2026-10-15 14:43:42.  Balance: 39,919 RWF. Fee 0 RWF.*EN#',
  'TxId:31272303541*S*Your payment of 1,500 RWF to GREEN HILL LTD 430020 was completed at 2026-10-16 14:25:17.  Balance: 37,199 RWF. Fee 0 RWF.*EN#',
  'TxId:31272630673*S*Your payment of 1,500 RWF to Mugisha 31755 was completed at 2026-10-16 14:40:55.  Balance: 35,699 RWF. Fee 0 RWF.*EN#',
  'TxId:31284466836*S*Your payment of 1,200 RWF to Aline 209683 was completed at 2026-10-16 22:37:15.  Balance: 34,499 RWF. Fee 0 RWF.*EN#',
  'TxId:31230471948*S*Your payment of 1,000 RWF to Aline 209683 was completed at 2026-10-14 17:00:34.  Balance: 8,699 RWF. Fee 0 RWF.*EN#',
  'TxId:31230448545*S*Your payment of 1,900 RWF to Aline 209683 was completed at 2026-10-14 16:59:39.  Balance: 9,699 RWF. Fee 0 RWF.*EN#',
  'TxId:31213745106*S*Your payment of 2,500 RWF to Kamali 1930416 was completed at 2026-10-13 19:47:22.  Balance: 11,599 RWF. Fee 0 RWF.*EN#',
  'TxId:31209325597*S*Your payment of 1,400 RWF to Kamali 1930416 was completed at 2026-10-13 17:47:37.  Balance: 14,099 RWF. Fee 0 RWF.*EN#',
  'TxId:31194342349*S*Your payment of 4,000 RWF to Aline 209683 was completed at 2026-10-12 21:49:07.  Balance: 15,499 RWF. Fee 0 RWF.*EN#',
  'You have received 600 RWF from JANE ROE SAMPLE (*********222) at 2026-10-12 21:44:58 . Balance:19499 RWF. FT Id: 31194285746.',
  'You have received 600 RWF from JANE ROE SAMPLE (*********222) at 2026-10-12 21:41:24 . Balance:18899 RWF. FT Id: 31194230826.',
  'TxId:31182615216*S*Your payment of 1,200 RWF to Aline 209683 was completed at 2026-10-12 14:16:18.  Balance: 18,299 RWF. Fee 0 RWF.*EN#',
  'TxId:31163974468*S*Your payment of 3,500 RWF to Aline 209683 was completed at 2026-10-11 16:22:46.  Balance: 19,499 RWF. Fee 0 RWF.*EN#',
  'TxId:31163939807*S*Your payment of 900 RWF to Sam Ruto 1629379 was completed at 2026-10-11 16:21:06.  Balance: 22,999 RWF. Fee 0 RWF.*EN#',
  'TxId:31163890294*S*Your payment of 600 RWF to Kamali 1930416 was completed at 2026-10-11 16:19:00.  Balance: 23,899 RWF. Fee 0 RWF.*EN#',
  'TxId:31163855257*S*Your payment of 9,100 RWF to Kamali 2200024 was completed at 2026-10-11 16:17:12.  Balance: 24,499 RWF. Fee 0 RWF.*EN#',
  'TxId:31150179259*S*Your payment of 31,500 RWF to KIGALI SHOP 3037344 was completed at 2026-10-10 21:23:52.  Balance: 33,599 RWF. Fee 0 RWF.*EN#',
];

/** A promotion and a failed payment: neither is spending. */
export const MOMO_NOISE = [
  'Y’ello! Win up to 500,000 RWF this week. Dial *182*16# to play. Terms apply. Visit www.mtn.co.rw',
  'TxId:31299999999*F*Your payment of 2,000 RWF to Aline 209683 has failed. Insufficient balance.*EN#',
];
