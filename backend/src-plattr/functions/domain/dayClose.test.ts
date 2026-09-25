// DC · Day close — domain tests. Every DC-S id is a test name.
// Hand-computed throughout on the sheet's running day, 2026-09-16 at Meghana:
//   opening float        200000   (₹2,000.00)   one `float` movement at 11:00
//   cash taken          1245000   (₹12,450.00)  Priya 720000 + Ravi 525000
//   cash refunded          8400   (₹84.00)
//   cash out (vendor)    120000   (₹1,200.00)   at 18:40
//   card taken          3120000 · upi taken 890000   — neither is ever in the drawer
//   expected cash = 200000 + 1245000 − 8400 − 120000 = 1316600  (₹13,166.00)
// `overShortP0Above` is 10000 (₹100.00) by default.
import {
  DEFAULTS, configFrom, openingFloatOf, expectedCashFrom, differenceOf, severityOf, totalsFrom,
  canClose, canMove, canVoidMove, isBusinessDate, LedgerRow, Movement, IssuedBill, UnbilledLine, Floor, discountsFrom, walkoutsFrom, DayBill,
} from './dayClose';

type Snap = LedgerRow['tender'];
const cash: Snap = { label: 'Cash', kind: 'cash' };
const card: Snap = { label: 'Card', kind: 'external' };
const upi: Snap = { label: 'UPI', kind: 'external' };
const idOf = (t: Snap) => t.label.split(' ')[0].toLowerCase();

const take = (amount: number, tender: Snap = cash, by = 'priya', extra: Partial<LedgerRow> = {}): LedgerRow =>
  ({ kind: 'take', amount, tenderId: idOf(tender), tender, by, void: null, ...extra });
const refund = (amount: number, tender: Snap = cash, by = 'priya'): LedgerRow =>
  ({ kind: 'refund', amount, tenderId: idOf(tender), tender, by, void: null });
const voided = (r: LedgerRow): LedgerRow => ({ ...r, void: { at: 1, by: 'priya', reason: 'wrong tender' } });

const DAY = '2026-09-16';
const move = (kind: Movement['kind'], amount: number, o: Partial<Movement> = {}): Movement =>
  ({ movementId: `m_${kind}_${amount}`, businessDate: DAY, kind, amount, reason: 'vendor payment', at: 1, by: 'priya', void: null, ...o });

const ROWS: LedgerRow[] = [
  take(720000, cash, 'priya'), take(525000, cash, 'ravi'), refund(8400, cash, 'priya'),
  take(3120000, card, 'priya'), take(890000, upi, 'ravi'),
];
const MOVES: Movement[] = [move('float', 200000, { reason: 'opening float' }), move('out', 120000)];
const EXPECTED = 1316600;

const cfg = DEFAULTS;
type V = { ok: true } | { ok: false; code: string; message: string };
const code = (v: V | { ok: true; retry: true }): string => (v.ok ? 'ok' : v.code);
const msg = (v: V | { ok: true; retry: true }): string => ('message' in v ? (v as { message: string }).message : '');

describe('expectedCashFrom', () => {
  test('DC-S1 float 200000 + cash 1245000 − refunds 8400 − out 120000 = 1316600', () => {
    expect(expectedCashFrom(ROWS, MOVES)).toBe(EXPECTED);
    expect(openingFloatOf(MOVES)).toBe(200000);
  });

  test('DC-S9 two floats, 200000 and 50000, give openingFloat 250000 and expected 1366600', () => {
    const moves = [...MOVES, move('float', 50000, { movementId: 'm_float_2', reason: 'opening float' })];
    expect(openingFloatOf(moves)).toBe(250000);
    expect(expectedCashFrom(ROWS, moves)).toBe(1366600);
  });

  test('DC-S14 card 3120000 and upi 890000 move expected by nothing: still 1316600', () => {
    const noCards = ROWS.filter(r => r.tender.kind === 'cash');
    expect(expectedCashFrom(noCards, MOVES)).toBe(EXPECTED);
  });

  test('DC-S15 a captured upi take of 60900 with overpaid 4100 leaves the drawer alone', () => {
    const rows = [...ROWS, take(60900, upi, 'ravi', { overpaid: 4100 })];
    expect(expectedCashFrom(rows, MOVES)).toBe(EXPECTED);
    const u = totalsFrom(rows).byTender.find(t => t.tenderId === 'upi');
    expect(u).toMatchObject({ taken: 950900, overpaid: 4100 });   // 890000 + 60900
  });

  test('DC-S16 a voided cash take of 60900 is excluded entirely: expected unchanged at 1316600', () => {
    expect(expectedCashFrom([...ROWS, voided(take(60900, cash))], MOVES)).toBe(EXPECTED);
  });

  test('DC-S17 an 8400 refund on the card tender does not leave the drawer: expected 1325000', () => {
    const rows = ROWS.map(r => (r.kind === 'refund' ? refund(8400, card, 'priya') : r));
    expect(expectedCashFrom(rows, MOVES)).toBe(1325000);   // 200000 + 1245000 − 120000
  });

  test('DC-S19 no rows and no movements: openingFloat 0, expected 0', () => {
    expect(openingFloatOf([])).toBe(0);
    expect(expectedCashFrom([], [])).toBe(0);
  });

  test('a voided movement is excluded: voiding the 120000 vendor row puts expected back to 1436600', () => {
    const moves = MOVES.map(m => (m.kind === 'out' ? { ...m, void: { at: 2, by: 'priya', reason: 'wrong amount' } } : m));
    expect(expectedCashFrom(ROWS, moves)).toBe(1436600);
  });

  test('an `in` movement of 50000 adds: expected 1366600', () => {
    expect(expectedCashFrom(ROWS, [...MOVES, move('in', 50000, { reason: 'change in' })])).toBe(1366600);
  });

  test('drawer money is the frozen tender.kind, never the tenderId', () => {
    // A tender whose id reads `cash` but which settles externally moves no drawer.
    const liar: LedgerRow = { kind: 'take', amount: 500000, tenderId: 'cash', tender: { label: 'Cash on delivery', kind: 'external' }, by: 'priya', void: null };
    expect(expectedCashFrom([...ROWS, liar], MOVES)).toBe(EXPECTED);
  });

  test('a cash take counts `amount`, never `tendered`: change of 9100 stays out of it', () => {
    // PY-S2: guest hands ₹700 for a ₹609.00 bill. The drawer gains 60900, not 70000.
    const row = { ...take(60900, cash), tendered: 70000, change: 9100 } as LedgerRow;
    expect(expectedCashFrom([row], [])).toBe(60900);
  });
});

describe('differenceOf', () => {
  test('DC-S1 counted 1316600 against expected 1316600 is 0', () => expect(differenceOf(1316600, EXPECTED)).toBe(0));
  test('DC-S2 counted 1311600 is −5000, short and negative', () => expect(differenceOf(1311600, EXPECTED)).toBe(-5000));
  test('DC-S3 counted 1321600 is +5000, over and positive', () => expect(differenceOf(1321600, EXPECTED)).toBe(5000));
  test('counted 0 against expected 1316600 is −1316600: never clamped to zero', () => expect(differenceOf(0, EXPECTED)).toBe(-1316600));
});

describe('severityOf', () => {
  test('DC-S23 a difference of −2000 with p0Above 10000 is P1', () => expect(severityOf(-2000, cfg)).toBe('P1'));
  test('DC-S23 a difference of −90000 is P0', () => expect(severityOf(-90000, cfg)).toBe('P0'));
  test('exactly 10000 is P1 — "above" is strict, so the boundary sits on the quiet side', () => expect(severityOf(-10000, cfg)).toBe('P1'));
  test('10001 is P0', () => expect(severityOf(-10001, cfg)).toBe('P0'));
  test('a difference of 0 is P2: a clean close is a routine event, not a finding', () => expect(severityOf(0, cfg)).toBe('P2'));
  test('severity reads the absolute difference: +90000 over is P0 too', () => expect(severityOf(90000, cfg)).toBe('P0'));
});

describe('canClose', () => {
  const req = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', businessDate: DAY, countedCash: EXPECTED, ...o });
  const bill = (o: Partial<IssuedBill> = {}): IssuedBill => ({ billId: 'b1', number: '0431', businessDate: DAY, tableLabel: 'Table 12', ...o });
  const line = (o: Partial<UnbilledLine> = {}): UnbilledLine => ({ lineId: 'l1', name: 'Mutton Biryani', businessDate: DAY, tableId: 'Table 4', ...o });
  const clear: Floor = { issued: [], unbilled: [] };
  const floor = (issued: IssuedBill[] = [], unbilled: UnbilledLine[] = []): Floor => ({ issued, unbilled });

  test('DC-S1 a MANAGER on an open day with no issued bill and a countable figure passes', () => {
    expect(code(canClose(req(), 'open', clear, DAY))).toBe('ok');
  });
  test('DC-S20 a SERVER is permission-denied', () => expect(code(canClose(req({ role: 'SERVER' }), 'open', clear, DAY))).toBe('permission-denied'));
  test('an ADMIN passes', () => expect(code(canClose(req({ role: 'ADMIN' }), 'open', clear, DAY))).toBe('ok'));
  test('DC-S7 a day already closed is failed-precondition', () => {
    const v = canClose(req(), 'closed', clear, DAY);
    expect(code(v)).toBe('failed-precondition');
    expect(msg(v)).toMatch(/already closed/);
  });
  test('DC-S13 a day whose state is unknown is failed-precondition, never treated as open', () => {
    expect(code(canClose(req(), 'unknown', clear, DAY))).toBe('failed-precondition');
  });
  test('DC-S5 one bill still `issued` on the date is failed-precondition and the message names it', () => {
    const v = canClose(req(), 'open', floor([bill()]), DAY);
    expect(code(v)).toBe('failed-precondition');
    expect(msg(v)).toMatch(/0431/);
    expect(msg(v)).toMatch(/Table 12/);
  });
  test('a bill `issued` on a different date does not block', () => {
    expect(code(canClose(req(), 'open', floor([bill({ businessDate: '2026-09-15' })]), DAY))).toBe('ok');
  });
  test('a `paid` or `cancelled` bill on the date does not block — BL never hands it to us', () => {
    expect(code(canClose(req(), 'open', clear, DAY))).toBe('ok');
  });
  test('DC-S25 a line on the date with no billId refuses, and the message names the table', () => {
    const v = canClose(req(), 'open', floor([], [line()]), DAY);
    expect(code(v)).toBe('failed-precondition');
    expect(msg(v)).toMatch(/Table 4/);
    expect(msg(v)).toMatch(/not on a bill/);
  });
  test('DC-S25 an unbilled line on a different date does not block', () => {
    expect(code(canClose(req(), 'open', floor([], [line({ businessDate: '2026-09-15' })]), DAY))).toBe('ok');
  });
  test('DC-S25 the refusal counts the items and never prints a rupee figure (R15)', () => {
    const v = canClose(req(), 'open', floor([], [line(), line({ lineId: 'l2' })]), DAY);
    expect(msg(v)).toMatch(/^2 items/);
    expect(msg(v)).not.toMatch(/[₹0-9]{2,}\.[0-9]{2}/);
  });
  test('DC-S22 a business date later than the current one is invalid-argument', () => {
    expect(code(canClose(req({ businessDate: '2026-09-17' }), 'open', clear, DAY))).toBe('invalid-argument');
  });
  test('DC-S21 a business date before the current one passes', () => {
    expect(code(canClose(req({ businessDate: '2026-09-15' }), 'open', clear, DAY))).toBe('ok');
  });
  test('a counted figure that is not a non-negative integer is invalid-argument', () => {
    for (const countedCash of [-1, 1.5, '100', null, undefined, NaN]) {
      expect(code(canClose(req({ countedCash }), 'open', clear, DAY))).toBe('invalid-argument');
    }
  });
  test('a business date that is not a real YYYY-MM-DD is invalid-argument', () => {
    for (const businessDate of ['2026-9-16', '16-09-2026', '2026-02-30', '', 'yesterday', 20260916]) {
      expect(code(canClose(req({ businessDate }), 'open', clear, DAY))).toBe('invalid-argument');
    }
    expect(isBusinessDate('2026-02-30')).toBe(false);
    expect(isBusinessDate('2026-02-28')).toBe(true);
  });
});

describe('canMove', () => {
  const req = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', kind: 'out', amount: 120000, reason: 'vendor payment', ...o });
  test('DC-S8 a MANAGER moving 120000 out with a listed reason passes', () => expect(code(canMove(req(), 'open', cfg))).toBe('ok'));
  test('DC-S20 a SERVER is permission-denied', () => expect(code(canMove(req({ role: 'SERVER' }), 'open', cfg))).toBe('permission-denied'));
  test('DC-S11 a closed business date is failed-precondition', () => expect(code(canMove(req(), 'closed', cfg))).toBe('failed-precondition'));
  test('an unknown day state is failed-precondition', () => expect(code(canMove(req(), 'unknown', cfg))).toBe('failed-precondition'));
  test('an amount of 0, a negative one, or a non-integer is invalid-argument', () => {
    for (const amount of [0, -1, 1.5, '120000', null, undefined]) expect(code(canMove(req({ amount }), 'open', cfg))).toBe('invalid-argument');
  });
  test('a kind outside float | in | out is invalid-argument', () => {
    for (const kind of ['OUT', 'withdrawal', '', null, undefined]) expect(code(canMove(req({ kind }), 'open', cfg))).toBe('invalid-argument');
  });
  test('a blank or whitespace reason is invalid-argument', () => {
    for (const reason of ['', '   ', null, undefined, 7]) expect(code(canMove(req({ reason }), 'open', cfg))).toBe('invalid-argument');
  });
  test('a reason outside dayClose.reasons is invalid-argument', () => {
    expect(code(canMove(req({ reason: 'because' }), 'open', cfg))).toBe('invalid-argument');
  });
  test('taking out more than the drawer is believed to hold is ALLOWED', () => {
    expect(code(canMove(req({ amount: 9_000_00 }), 'open', cfg))).toBe('ok');
  });
});

describe('canVoidMove', () => {
  const req = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', by: 'priya', reason: 'wrong amount', ...o });
  const m = move('out', 1200000);
  const already = { ...m, void: { at: 2, by: 'priya', reason: 'wrong amount' } };

  test('DC-S10 a MANAGER voiding with a reason passes', () => expect(code(canVoidMove(m, 'open', req()))).toBe('ok'));
  test('DC-S20 a SERVER is permission-denied', () => expect(code(canVoidMove(m, 'open', req({ role: 'SERVER' })))).toBe('permission-denied'));
  test('the same staff repeating the same reason on an already-void row is a retry, not an error', () => {
    expect(canVoidMove(already, 'open', req())).toEqual({ ok: true, retry: true });
  });
  test('a different staff or a different reason on an already-void row is failed-precondition', () => {
    expect(code(canVoidMove(already, 'open', req({ by: 'ravi' })))).toBe('failed-precondition');
    expect(code(canVoidMove(already, 'open', req({ reason: 'correction' })))).toBe('failed-precondition');
  });
  test('a closed business date is failed-precondition', () => expect(code(canVoidMove(m, 'closed', req()))).toBe('failed-precondition'));
  test('a blank reason is invalid-argument', () => expect(code(canVoidMove(m, 'open', req({ reason: '  ' })))).toBe('invalid-argument'));
  test('a movement that does not exist is failed-precondition', () => expect(code(canVoidMove(null, 'open', req()))).toBe('failed-precondition'));
});

describe('configFrom', () => {
  const of = (dayClose: unknown) => configFrom({ dayClose });
  test('a missing config document gives the defaults and one warning', () => {
    const r = configFrom(undefined);
    expect(r.config).toEqual(DEFAULTS);
    expect(r.warnings).toHaveLength(1);
  });
  test('DC-S4 blindCount defaults to true', () => expect(of({}).config.blindCount).toBe(true));
  test('blindCount false is honoured', () => expect(of({ blindCount: false }).config.blindCount).toBe(false));
  test('a non-boolean blindCount falls back to true with a warning', () => {
    const r = of({ blindCount: 'no' });
    expect(r.config.blindCount).toBe(true);
    expect(r.warnings.join()).toMatch(/blindCount/);
  });
  test('overShortP0Above negative or non-integer falls back to 10000 with a warning', () => {
    for (const v of [-1, 5.5, '100']) {
      const r = of({ overShortP0Above: v });
      expect(r.config.overShortP0Above).toBe(10000);
      expect(r.warnings.join()).toMatch(/overShortP0Above/);
    }
    expect(of({ overShortP0Above: 50000 }).config.overShortP0Above).toBe(50000);
  });
  test('reasons that are not an array, or an empty array, fall back to the default list with a warning', () => {
    for (const reasons of ['vendor', {}, []]) {
      const r = of({ reasons });
      expect(r.config.reasons).toEqual(DEFAULTS.reasons);
      expect(r.warnings.join()).toMatch(/reasons/);
    }
  });
  test('a reasons array with blanks in it keeps the good rows and warns about the rest', () => {
    const r = of({ reasons: ['vendor payment', '', '  ', 7, 'bank drop'] });
    expect(r.config.reasons).toEqual(['vendor payment', 'bank drop']);
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });
  test('the close hour comes from payments.*, never from a dayClose key of its own', () => {
    expect(Object.keys(of({}).config).sort()).toEqual(['blindCount', 'overShortP0Above', 'reasons']);
  });
});

describe('BT · NC / staff meal / complimentary: what the day gave away, by reason, from the bills BL froze', () => {
  const src = (reason: string, approverId = 'priya') => ({ reason, note: '', approverId });
  const bills: DayBill[] = [
    // A staff meal comped whole (BL-S22): bill discount 42000 under `staff meal`; its lines carry billDiscount, not `discount`.
    { status: 'paid', discount: { amount: 42000, pct: 100, source: src('staff meal') }, lines: [{ countsTowardTotal: true }, { countsTowardTotal: true }] },
    // A birthday dessert comped on its line (ST discount 5000), and the same bill under the happy-hour offer (10000).
    { status: 'paid', discount: { amount: 10000, pct: 0, source: src('Happy Hour', 'offer') }, lines: [{ countsTowardTotal: true, discount: { amount: 5000, pct: 100, source: src('birthday') } }, { countsTowardTotal: false, discount: { amount: 999, pct: 0, source: src('birthday') } }] },
    // A cancelled bill and a credit note are not the day's giving.
    { status: 'cancelled', discount: { amount: 30000, pct: 0, source: src('regular') }, lines: [] },
    { status: 'issued', discount: null, creditNoteOf: { billId: 'b1' }, lines: [{ countsTowardTotal: true, discount: { amount: -5000, pct: 0, source: src('birthday') } }] },
  ];
  it('BT-N1 groups line and bill discounts by reason: staff meal 42000 ×1, Happy Hour 10000 ×1, birthday 5000 ×1; voided lines, cancelled bills and credit notes excluded; biggest first', () => {
    expect(discountsFrom(bills)).toEqual([
      { reason: 'staff meal', amount: 42000, count: 1 },
      { reason: 'Happy Hour', amount: 10000, count: 1 },
      { reason: 'birthday', amount: 5000, count: 1 },
    ]);
  });
  it('BT-N1 nothing given away → an empty list, never a missing field', () => {
    expect(discountsFrom([{ status: 'paid', discount: null, lines: [{ countsTowardTotal: true }] }])).toEqual([]);
  });
});

// D1 / DC-S25a. 22:40 table 6 walks out on A-0004 (₹660.00, nothing paid); 23:05 table 10 walks out on A-0007 (₹1,320.00)
// having paid ₹500, so ₹820.00 is written off. A-0009 walked out, then the guest came back and paid: it is `paid` now and
// is not the day's walk-out. A cancelled bill is never one. The line reads "Walked out ₹1,480.00 · 2 bills".
describe('D1 walkoutsFrom — walked-out money is its own line at close', () => {
  const b = (number: string, status: string, amount: number | null): DayBill => ({ billId: `b_${number}`, series: 'A', number, status, lines: [], ...(amount === null ? {} : { walkedOut: { amount } }) });
  it('DC-S25a two walk-outs: 66000 + 82000 = 148000, count 2, each named by its number', () => {
    expect(walkoutsFrom([b('0004', 'walkedOut', 66000), b('0007', 'walkedOut', 82000), b('0009', 'paid', 40000), b('0010', 'cancelled', null), b('0011', 'paid', null)]))
      .toEqual({ amount: 148000, count: 2, bills: [{ billId: 'b_0004', number: 'A-0004', amount: 66000 }, { billId: 'b_0007', number: 'A-0007', amount: 82000 }] });
  });
  it('DC-S25a none → zero, never a missing field', () => expect(walkoutsFrom([])).toEqual({ amount: 0, count: 0, bills: [] }));
  // Review P1: A-0007 (₹1,320) walked out with ₹500 paid, ₹820 written off; at 23:20 the guest brings back ₹200 of it.
  // The line reads ₹620, so the ₹200 is counted once, as taken.
  it('D1 a part brought back the same day shrinks the line: 82000 − 20000 = 62000', () => {
    expect(walkoutsFrom([{ ...b('0007', 'walkedOut', 82000), payable: 132000, paidTotal: 70000 }]).amount).toBe(62000);
  });
});

describe('BT · tips and money owed at day close', () => {
  const account: Snap = { label: 'On account', kind: 'credit' };
  it('BT-T5 a cash tip is in the drawer: expected cash rises by it; a card tip is not; tips are reported by tender and staff outside net', () => {
    const rows = [...ROWS, take(60900, cash, 'priya', { tip: 5000 }), take(60900, card, 'ravi', { tip: 3000 })];
    expect(expectedCashFrom(rows, MOVES)).toBe(EXPECTED + 60900 + 5000);
    const { byTender, byStaff } = totalsFrom(rows);
    expect(byTender.find(t => t.tenderId === 'cash')).toMatchObject({ taken: 720000 + 525000 + 60900, tips: 5000, net: 720000 + 525000 + 60900 - 8400 });
    expect(byTender.find(t => t.tenderId === 'card')?.tips).toBe(3000);
    expect(byStaff.find(s => s.staffId === 'ravi')?.tips).toBe(3000);
  });
  it('BT-A8 a bill settled on account is its own tender line, kind credit, and never enters expected cash', () => {
    const rows = [...ROWS, { kind: 'take', amount: 184000, tenderId: 'account', tender: account, by: 'priya', void: null } as LedgerRow];
    expect(expectedCashFrom(rows, MOVES)).toBe(EXPECTED);
    expect(totalsFrom(rows).byTender.find(t => t.tenderId === 'account')).toMatchObject({ kind: 'credit', taken: 0, owed: 184000, net: 0 });
  });
  it('BT-A arch P2: on-account money counts once, on the day it arrives — the sale day shows it owed, the collection day shows it taken; two days summed = 184000', () => {
    const saleDay = [{ kind: 'take', amount: 184000, tenderId: 'account', tender: account, by: 'priya', void: null } as LedgerRow];
    const collectDay = [take(184000, cash, 'ravi', { receivableId: 'r1' } as Partial<LedgerRow>)];
    const sum = (rows: LedgerRow[]) => totalsFrom(rows).byTender.reduce((n, t) => n + t.net, 0);
    expect(sum(saleDay)).toBe(0);
    expect(totalsFrom(saleDay).byStaff[0]).toMatchObject({ taken: 0, owed: 184000, net: 0 });
    expect(sum(collectDay)).toBe(184000);
    expect(sum(saleDay) + sum(collectDay)).toBe(184000);
  });
});

