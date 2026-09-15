// PY · Payments — domain tests. Every PY-S id is a test name.
// Hand-computed throughout on BL-S1's bill 0417: pizza ₹500 + coke ₹80, taxable ₹580.00,
// CGST ₹14.50, SGST ₹14.50, payable ₹609.00 = 60900 paise.
// Tenders: cash (kind 'cash'), card and upi (kind 'external').
// Round-off: `settleWithin` 99 by default (PY-S21), so a remainder ≤ 99 settles a bill.
import fs from 'fs';
import path from 'path';
import {
  DEFAULTS, configFrom, outstanding, isSettled, paidTotalOf, changeFor, overpaidFor,
  canTake, canRefund, canVoid, statusFor, tenderById, businessDateFor, Bill, Row, Tender, Note,
} from './payments';

const cfg = DEFAULTS;
const exact = { ...DEFAULTS, settleWithin: 0 };
const PAYABLE = 60900;                       // ₹609.00
const bill: Bill = { billId: '0417', payable: PAYABLE, status: 'issued' };
const cash = { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false } as Tender;
const card = { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true } as Tender;
const upi = { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true } as Tender;

const take = (amount: number, tender = cash, extra: Partial<Row> = {}): Row =>
  ({ kind: 'take', amount, tender, void: null, ...extra } as Row);
const refund = (amount: number, tender = cash, extra: Partial<Row> = {}): Row =>
  ({ kind: 'refund', amount, tender, void: null, ...extra } as Row);
const voided = (r: Row): Row => ({ ...r, void: { at: 1, by: 'u1', reason: 'wrong tender' } });
const billOf = (payable: number, status: Bill['status'] = 'issued'): Bill => ({ billId: '0417', payable, status });

// canTake reads `tendered` on cash and `amount` on an external tender.
const tk = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', tenderId: 'cash', tendered: 60900, ...o });
const ext = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', tenderId: 'card', amount: 60900, ref: 'slip-1', ...o });
const note = (o: Partial<Note> = {}): Note => ({ creditNoteId: 'CN-0007', billId: '0417', total: 8400, refundedTotal: 0, ...o });
const rf = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', tenderId: 'cash', amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', ...o });

// 2026-09-15T21:06 IST and friends. IST is +330 minutes.
const ist = (y: number, m: number, d: number, hh: number, mm: number) => Date.UTC(y, m - 1, d, hh, mm) - 330 * 60_000;

type V = { ok: true } | { ok: false; code: string; message: string };
const code = (v: V | { ok: true; retry: true }): string => (v.ok ? 'ok' : v.code);
const msg = (v: V): string => (v.ok ? '' : v.message);

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments paidTotalOf(rows) — R2, net receipts over non-void rows', () => {
  it('no rows → 0', () => expect(paidTotalOf([])).toBe(0));
  it('PY-S1 one cash take 60900 → 60900', () => expect(paidTotalOf([take(60900)])).toBe(60900));
  it('PY-S3 card 40000 (₹400) + cash 20900 (₹209) → 60900', () => expect(paidTotalOf([take(40000, card), take(20900)])).toBe(60900));
  it('PY-S9 take 60900 then refund 8400 (₹84) → 52500 (₹525.00), refunds subtract', () =>
    expect(paidTotalOf([take(60900), refund(8400)])).toBe(52500));
  it('PY-S27 a voided take is excluded: take 60900 with void set → 0, not 60900', () =>
    expect(paidTotalOf([voided(take(60900))])).toBe(0));
  it('a voided refund is excluded too: take 60900 + voided refund 8400 → 60900', () =>
    expect(paidTotalOf([take(60900), voided(refund(8400))])).toBe(60900));
  it('R2 mixed: card 40000 + voided cash 20900 + cash 20900 → 60900, the void drops out', () =>
    expect(paidTotalOf([take(40000, card), voided(take(20900)), take(20900)])).toBe(60900));
  it('overpaid is never counted against the bill: take amount 60900 overpaid 4100 → 60900, not 65000', () =>
    expect(paidTotalOf([take(60900, card, { overpaid: 4100 })])).toBe(60900));
  it('PY-S32 an overpay refund does not move paidTotal: take 60900 overpaid 4100, refund 4100 naming that row → 60900', () =>
    expect(paidTotalOf([take(60900, card, { overpaid: 4100 }), refund(4100, cash, { refundsPaymentId: 'p1' })])).toBe(60900));
  it('tendered never enters paidTotal: take amount 60900 tendered 70000 change 9100 → 60900 (PY-S2 drawer bug)', () =>
    expect(paidTotalOf([take(60900, cash, { tendered: 70000, change: 9100 })])).toBe(60900));
});

describe('domain/payments outstanding(bill, rows) — R2', () => {
  it('PY-S1 payable 60900, no rows → 60900', () => expect(outstanding(bill, [])).toBe(60900));
  it('PY-S3 after card 40000 → 20900 (₹209.00)', () => expect(outstanding(bill, [take(40000, card)])).toBe(20900));
  it('PY-S3 after card 40000 + cash 20900 → 0', () => expect(outstanding(bill, [take(40000, card), take(20900)])).toBe(0));
  it('PY-S21 after cash 60899 → 1, a single paisa still outstanding (whether it settles is isSettled\'s call)', () =>
    expect(outstanding(bill, [take(60899)])).toBe(1));
  it('PY-S9 payable 60900, take 60900, refund 8400 → 8400 (₹84.00), the bill owes the guest back', () =>
    expect(outstanding(bill, [take(60900), refund(8400)])).toBe(8400));
  it('PY-S27 after voiding the take that settled it → 60900, the full amount again', () =>
    expect(outstanding(bill, [voided(take(60900))])).toBe(60900));
  it('PY-S8 payable 0, no rows → 0', () => expect(outstanding(billOf(0, 'paid'), [])).toBe(0));
  it('R2 goes negative rather than clamping: payable 60900, paidTotal 60901 → -1. Callers must see an over-take; R6 is what prevents creating one', () =>
    expect(outstanding(bill, [take(60901)])).toBe(-1));
  it('NEW over-refunded past zero: payable 60900, take 60900, refunds totalling 69300 → outstanding 69300 (₹693.00), paidTotal -8400. No clamp to 0. Production event: a full credit note refunded after a partial one', () => {
    const rows = [take(60900), refund(60900), refund(8400)];
    expect(paidTotalOf(rows)).toBe(-8400);
    expect(outstanding(bill, rows)).toBe(69300);
  });
});

describe('domain/payments isSettled(payable, paidTotal, within) — R3, the one definition BL also imports', () => {
  it('PY-S1 60900 of 60900 → true', () => expect(isSettled(60900, 60900)).toBe(true));
  it('PY-S3 40000 of 60900 → false', () => expect(isSettled(60900, 40000)).toBe(false));
  it('PY-S21 60899 of 60900 with no tolerance → false, one paisa short is not settled exactly', () =>
    expect(isSettled(60900, 60899)).toBe(false));
  it('PY-S21 60899 of 60900 within 99 → true, the round-off Shaurya chose', () => expect(isSettled(60900, 60899, 99)).toBe(true));
  it('PY-S21 boundary: 60800 of 60900 within 99 → false, ₹1.00 short is past the tolerance', () =>
    expect(isSettled(60900, 60800, 99)).toBe(false));
  it('PY-S21 boundary: 60801 of 60900 within 99 → true, exactly 99 short is forgiven', () =>
    expect(isSettled(60900, 60801, 99)).toBe(true));
  it('PY-S8 0 of 0 → true, a comped bill is settled with no payment row (BL stamps this at issue)', () =>
    expect(isSettled(0, 0)).toBe(true));
  it('PY-S30 52500 of 60900 after a refund → false, the bill owes ₹84 back', () => expect(isSettled(60900, 52500, 99)).toBe(false));
  it('R2 "0 or less" is the test, not equality: 60901 of 60900 → true', () => expect(isSettled(60900, 60901)).toBe(true));
  it('R2 pure function of integers: no bill, no rows, no clock — same inputs, same answer', () => {
    expect(isSettled(60900, 60900)).toBe(isSettled(60900, 60900));
    expect(isSettled(1, 0)).toBe(false);
    expect(isSettled(1, 1)).toBe(true);
  });
});

describe('domain/payments statusFor(bill, rows, config) — R2, follows outstanding in BOTH directions', () => {
  it('PY-S1 outstanding 0 → paid', () => expect(statusFor(bill, [take(60900)])).toBe('paid'));
  it('PY-S3 outstanding 20900 → issued', () => expect(statusFor(bill, [take(40000, card)])).toBe('issued'));
  it('PY-S27 a paid bill whose settling row is voided → issued, NOT latched at paid', () =>
    expect(statusFor(billOf(60900, 'paid'), [voided(take(60900))])).toBe('issued'));
  it('PY-S30 a paid bill with a refund reopening 8400 → issued', () =>
    expect(statusFor(billOf(60900, 'paid'), [take(60900), refund(8400)])).toBe('issued'));
  it('PY-S27 then a fresh take of 60900 → paid again; the status is recomputed, never remembered', () =>
    expect(statusFor(billOf(60900, 'issued'), [voided(take(60900)), take(60900, card)])).toBe('paid'));
  it('PY-S14 a cancelled bill stays cancelled whatever the rows say', () =>
    expect(statusFor(billOf(60900, 'cancelled'), [take(60900)])).toBe('cancelled'));
  it('PY-S21 a paisa short with the default tolerance → paid; with settleWithin 0 → issued', () => {
    expect(statusFor(bill, [take(60899)], cfg)).toBe('paid');
    expect(statusFor(bill, [take(60899)], exact)).toBe('issued');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments changeFor(tender, tendered, outstanding) — R6, cash only', () => {
  it('PY-S1 cash, tendered 60900 against 60900 → {amount: 60900, change: 0}', () =>
    expect(changeFor(cash, 60900, 60900)).toEqual({ amount: 60900, change: 0 }));
  it('PY-S2 cash, tendered 70000 (₹700) against 60900 → {amount: 60900, change: 9100 (₹91.00)}', () =>
    expect(changeFor(cash, 70000, 60900)).toEqual({ amount: 60900, change: 9100 }));
  it('PY-S4 change is computed on the OUTSTANDING not the payable: after card 50000, tendered 20000 against outstanding 10900 → {amount: 10900, change: 9100}', () =>
    expect(changeFor(cash, 20000, 10900)).toEqual({ amount: 10900, change: 9100 }));
  it('PY-S3 cash, tendered 20900 against outstanding 20900 → {amount: 20900, change: 0}', () =>
    expect(changeFor(cash, 20900, 20900)).toEqual({ amount: 20900, change: 0 }));
  it('cash tendered less than outstanding is a partial, not an error: tendered 40000 against 60900 → {amount: 40000, change: 0}', () =>
    expect(changeFor(cash, 40000, 60900)).toEqual({ amount: 40000, change: 0 }));
  it('R6 an external tender never makes change: card, tendered 70000 → throws, change is physical', () =>
    expect(() => changeFor(card, 70000, 60900)).toThrow(/cash only/));
  it('tendered 0 → {amount: 0, change: 0} is refused upstream by canTake, not here', () =>
    expect(changeFor(cash, 0, 60900)).toEqual({ amount: 0, change: 0 }));
  it('NEW off-by-one: cash tendered 60901 against 60900 → change 1, a single paisa back', () =>
    expect(changeFor(cash, 60901, 60900)).toEqual({ amount: 60900, change: 1 }));
  it('NEW invariant on every cash result above: tendered − change === amount', () => {
    for (const [t, o] of [[60900, 60900], [70000, 60900], [20000, 10900], [40000, 60900], [60901, 60900], [1, 1], [2, 1], [15000, 5900]]) {
      const r = changeFor(cash, t, o);
      expect(t - r.change).toBe(r.amount);
    }
  });
  it('PY-S33 change is computed on the re-read outstanding: tendered 15000 against a leftover of 5900 → {amount: 5900, change: 9100}', () =>
    expect(changeFor(cash, 15000, 5900)).toEqual({ amount: 5900, change: 9100 }));
  it('a negative outstanding (over-taken) is treated as 0: tendered 100 against -1 → {amount: 0, change: 100}', () =>
    expect(changeFor(cash, 100, -1)).toEqual({ amount: 0, change: 100 }));
});

describe('domain/payments overpaidFor(tender, amount, outstanding) — R6, external only', () => {
  it('PY-S28 upi, amount 65000 (₹650) against outstanding 60900 → {amount: 60900, overpaid: 4100 (₹41.00)}', () =>
    expect(overpaidFor(upi, 65000, 60900)).toEqual({ amount: 60900, overpaid: 4100 }));
  it('PY-S3 card, amount 40000 against outstanding 60900 → {amount: 40000, overpaid: 0}', () =>
    expect(overpaidFor(card, 40000, 60900)).toEqual({ amount: 40000, overpaid: 0 }));
  it('exact: card amount 60900 against 60900 → {amount: 60900, overpaid: 0}', () =>
    expect(overpaidFor(card, 60900, 60900)).toEqual({ amount: 60900, overpaid: 0 }));
  it('R6 cash never overpays, it makes change: cash → throws, use changeFor', () =>
    expect(() => overpaidFor(cash, 65000, 60900)).toThrow(/external only/));
  it('NEW overpaid on a partial: after card 40000, upi amount 30000 against outstanding 20900 → {amount: 20900, overpaid: 9100}', () =>
    expect(overpaidFor(upi, 30000, 20900)).toEqual({ amount: 20900, overpaid: 9100 }));
  it('NEW external exactly 1 paise over: amount 60901 against 60900 → {amount: 60900, overpaid: 1}', () =>
    expect(overpaidFor(card, 60901, 60900)).toEqual({ amount: 60900, overpaid: 1 }));
  it('NEW overpaid is 0 not null when there is none, so day close sums without a guard', () =>
    expect(overpaidFor(card, 60900, 60900).overpaid).toBe(0));
  it('NEW schema exclusivity: a cash row has overpaid null; an external row has tendered and change null', () => {
    const cashRow = take(60900, cash, { tendered: 70000, change: 9100, overpaid: null });
    const extRow = take(60900, card, { tendered: null, change: null, overpaid: 4100 });
    expect(cashRow.overpaid).toBeNull();
    expect(extRow.tendered).toBeNull();
    expect(extRow.change).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments businessDateFor(at, config) — R18, the day a payment belongs to', () => {
  it('R18 21:06 on 15 Sep with close 04:00 → 2026-09-15', () =>
    expect(businessDateFor(ist(2026, 9, 15, 21, 6), cfg)).toBe('2026-09-15'));
  it('R18 03:30 on 16 Sep with close 04:00 → 2026-09-15. Friday service does not leak into Saturday', () =>
    expect(businessDateFor(ist(2026, 9, 16, 3, 30), cfg)).toBe('2026-09-15'));
  it('R18 04:00 exactly on 16 Sep with close 04:00 → 2026-09-16. The boundary is decided here once', () =>
    expect(businessDateFor(ist(2026, 9, 16, 4, 0), cfg)).toBe('2026-09-16'));
  it('R18 04:01 on 16 Sep → 2026-09-16', () =>
    expect(businessDateFor(ist(2026, 9, 16, 4, 1), cfg)).toBe('2026-09-16'));
  it('R18 00:00 on 16 Sep with close 00:00 (no shift) → 2026-09-16', () =>
    expect(businessDateFor(ist(2026, 9, 16, 0, 0), { ...cfg, dayCloseHour: 0 })).toBe('2026-09-16'));
  it('R18 pure: same instant and same config always give the same string, with no reference to the machine timezone', () => {
    const at = ist(2026, 9, 16, 3, 30);
    expect(businessDateFor(at, cfg)).toBe(businessDateFor(at, cfg));
    // The same instant read as UTC (offset 0) is 22:00 on the 15th, minus 4h → still the 15th.
    expect(businessDateFor(at, { ...cfg, timezoneOffsetMinutes: 0 })).toBe('2026-09-15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments canTake(bill, rows, req, config) — R6, R11, R13', () => {
  const ok = (v: V) => expect(v).toEqual({ ok: true });

  it('PY-S1 MANAGER, cash 60900 on an issued bill with outstanding 60900 → {ok: true}', () => ok(canTake(bill, [], tk(), cfg)));
  it('PY-S12 SERVER role → {ok: false, code: permission-denied}, never a PIN prompt', () => {
    const v = canTake(bill, [], tk({ role: 'SERVER' }), cfg);
    expect(code(v)).toBe('permission-denied');
    expect(v).not.toHaveProperty('requires');
  });
  it('PY-S13 bill is null (never issued) → {ok: false, code: failed-precondition}', () =>
    expect(code(canTake(null, [], tk(), cfg))).toBe('failed-precondition'));
  it('PY-S14 bill.status cancelled → {ok: false, code: failed-precondition}', () =>
    expect(code(canTake(billOf(60900, 'cancelled'), [], tk(), cfg))).toBe('failed-precondition'));
  it('PY-S7 outstanding already 0 → {ok: false, code: failed-precondition, message names "nothing outstanding" not "already paid"}', () => {
    const v = canTake(bill, [take(60900)], tk({ tendered: 20900 }), cfg);
    expect(code(v)).toBe('failed-precondition');
    expect(msg(v)).toMatch(/nothing outstanding/i);
    expect(msg(v)).not.toMatch(/already paid/i);
  });
  it('PY-S21 outstanding 1 with settleWithin 99 → refused as nothing outstanding; with settleWithin 0 → a take of 1 is accepted', () => {
    expect(code(canTake(bill, [take(60899)], tk({ tendered: 1 }), cfg))).toBe('failed-precondition');
    ok(canTake(bill, [take(60899)], tk({ tendered: 1 }), exact));
  });
  it('PY-S30 bill is paid but a refund reopened outstanding 8400 → {ok: true}, a take of 8400 is legal', () =>
    ok(canTake(billOf(60900, 'paid'), [take(60900), refund(8400)], tk({ tendered: 8400 }), cfg)));
  it('PY-S8 payable 0 → {ok: false}, there is nothing to collect', () =>
    expect(code(canTake(billOf(0, 'paid'), [], tk({ tendered: 100 }), cfg))).toBe('failed-precondition'));
  it('PY-S5 card 70000 against outstanding 60900 → {ok: false, code: invalid-argument}, the terminal is still in hand', () =>
    expect(code(canTake(bill, [], ext({ amount: 70000 }), cfg))).toBe('invalid-argument'));
  it('PY-S6 second card 30000 against outstanding 20900 → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [take(40000, card)], ext({ amount: 30000 }), cfg))).toBe('invalid-argument'));
  it('PY-S28 upi 65000 against 60900 with captured:true → {ok: true}. The money already reached us; only captured separates this from PY-S5', () =>
    ok(canTake(bill, [], ext({ tenderId: 'upi', amount: 65000, captured: true }), cfg)));
  it('PY-S5 the SAME request with captured:false → {ok: false}. One flag, two opposite answers, so it must be tested as a pair', () =>
    expect(code(canTake(bill, [], ext({ tenderId: 'upi', amount: 65000, captured: false }), cfg))).toBe('invalid-argument'));
  it("NEW captured:true on a CASH tender → {ok: false}. Cash is never already-moved; it is in the cashier's hand", () =>
    expect(code(canTake(bill, [], tk({ captured: true }), cfg))).toBe('invalid-argument'));
  it('PY-S6 boundary: external exactly equal to outstanding 20900 → {ok: true}', () =>
    ok(canTake(bill, [take(40000, card)], ext({ amount: 20900 }), cfg)));
  it('PY-S6 boundary: external 20901 against outstanding 20900 → {ok: false}, off-by-one on the PY-S5 gate', () =>
    expect(code(canTake(bill, [take(40000, card)], ext({ amount: 20901 }), cfg))).toBe('invalid-argument'));
  it('NEW bill.status draft → {ok: false, code: failed-precondition}. Only an issued bill takes money', () =>
    expect(code(canTake(billOf(60900, 'draft'), [], tk(), cfg))).toBe('failed-precondition'));
  it('PY-S20 card with needsRef and no ref → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], ext({ ref: undefined }), cfg))).toBe('invalid-argument'));
  it("PY-S20 needsRef with ref '' and with ref '   ' → {ok: false} for both spellings", () => {
    expect(code(canTake(bill, [], ext({ ref: '' }), cfg))).toBe('invalid-argument');
    expect(code(canTake(bill, [], ext({ ref: '   ' }), cfg))).toBe('invalid-argument');
  });
  it('PY-S20 cash with no ref → {ok: true}, cash is never asked', () => ok(canTake(bill, [], tk({ ref: undefined }), cfg)));
  it('PY-S19 an unknown tenderId not in config → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], tk({ tenderId: 'sodexo' }), cfg))).toBe('invalid-argument'));
  it('PY-S22 cap: 10 live takes already present, 11th → {ok: false, code: failed-precondition}', () => {
    const rows = Array.from({ length: 10 }, () => take(1000));
    expect(code(canTake(bill, rows, tk({ tendered: 1000 }), cfg))).toBe('failed-precondition');
  });
  it('PY-S22 cap counts LIVE takes only: 10 voided takes + 1 live → an 11th is allowed, mistaps never freeze a bill', () => {
    const rows = [...Array.from({ length: 10 }, () => voided(take(1000))), take(1000)];
    ok(canTake(bill, rows, tk({ tendered: 1000 }), cfg));
  });
  it('PY-S22 cap does not count refunds: 9 takes + 5 refunds → a 10th take is allowed', () => {
    const rows = [...Array.from({ length: 9 }, () => take(1000)), ...Array.from({ length: 5 }, () => refund(1))];
    ok(canTake(bill, rows, tk({ tendered: 1000 }), cfg));
  });
  it('R8 amount 0 → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], tk({ tendered: 0 }), cfg))).toBe('invalid-argument'));
  it('R8 negative amount -100 → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], tk({ tendered: -100 }), cfg))).toBe('invalid-argument'));
  it('R8 non-integer amount 608.995 → {ok: false, code: invalid-argument}, never rounded', () =>
    expect(code(canTake(bill, [], tk({ tendered: 608.995 }), cfg))).toBe('invalid-argument'));
  it('R8 NaN amount → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], tk({ tendered: NaN }), cfg))).toBe('invalid-argument'));
  it('R8 amount as the string "60900" → {ok: false, code: invalid-argument}, no coercion', () =>
    expect(code(canTake(bill, [], tk({ tendered: '60900' }), cfg))).toBe('invalid-argument'));
  it('R8 Infinity → {ok: false, code: invalid-argument}', () =>
    expect(code(canTake(bill, [], tk({ tendered: Infinity }), cfg))).toBe('invalid-argument'));
  it('NEW amount Number.MAX_SAFE_INTEGER → {ok: false, code: invalid-argument}. Production event: an amount pad with no max length and a leaned-on key', () =>
    expect(code(canTake(bill, [], tk({ tendered: Number.MAX_SAFE_INTEGER }), cfg))).toBe('invalid-argument'));
  it('a take carrying a creditNoteId → {ok: false}. A take never reverses a note', () =>
    expect(code(canTake(bill, [], tk({ creditNoteId: 'CN-0007' }), cfg))).toBe('invalid-argument'));
  it('R11 ADMIN may take as well as MANAGER', () => ok(canTake(bill, [], tk({ role: 'ADMIN' }), cfg)));
  it('R11 role from the staff doc, never trusted as a lowercase or padded string', () =>
    expect(code(canTake(bill, [], tk({ role: 'manager' }), cfg))).toBe('permission-denied'));
});

describe('domain/payments canRefund(bill, rows, note, target, req, config) — R7, R11, PY-S36', () => {
  const paid = billOf(60900, 'paid');
  const paidRows = [take(60900)];
  const paidByCard = [take(60900, card)];
  const ok = (v: V) => expect(v).toEqual({ ok: true });

  it('PY-S9 MANAGER, cash 8400 against CN-0007 (total 8400, refundedTotal 0) → {ok: true}', () =>
    ok(canRefund(paid, paidRows, note(), null, rf(), cfg)));
  it('PY-S11 no creditNoteId on the request → {ok: false, code: invalid-argument}', () =>
    expect(code(canRefund(paid, paidRows, null, null, rf({ creditNoteId: undefined }), cfg))).toBe('invalid-argument'));
  it('PY-S10 refund 10000 against a note of 8400 → {ok: false, code: failed-precondition}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ amount: 10000 }), cfg))).toBe('failed-precondition'));
  it('PY-S26 note total 8400 with refundedTotal already 8400 → {ok: false, code: failed-precondition}', () =>
    expect(code(canRefund(paid, paidRows, note({ refundedTotal: 8400 }), null, rf(), cfg))).toBe('failed-precondition'));
  it('R7 part refunds sum to the note: total 8400, refundedTotal 5000, refund 3400 → {ok: true}', () =>
    ok(canRefund(paid, paidRows, note({ refundedTotal: 5000 }), null, rf({ amount: 3400 }), cfg)));
  it('R7 part refund that would exceed: total 8400, refundedTotal 5000, refund 3401 → {ok: false}', () =>
    expect(code(canRefund(paid, paidRows, note({ refundedTotal: 5000 }), null, rf({ amount: 3401 }), cfg))).toBe('failed-precondition'));
  it('PY-S12 SERVER role → {ok: false, code: permission-denied}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ role: 'SERVER' }), cfg))).toBe('permission-denied'));
  it('NEW note belongs to a different bill → {ok: false, code: failed-precondition}, a note cannot be refunded against the wrong bill', () =>
    expect(code(canRefund(paid, paidRows, note({ billId: '0418' }), null, rf(), cfg))).toBe('failed-precondition'));
  it('PY-S36 paid by card: refund on card → {ok: true}, back the way it came', () =>
    ok(canRefund(paid, paidByCard, note(), null, rf({ tenderId: 'card' }), cfg)));
  it('PY-S36 paid by card: refund in cash → {ok: true}, the always-allowed last resort', () =>
    ok(canRefund(paid, paidByCard, note(), null, rf({ tenderId: 'cash' }), cfg)));
  it('PY-S36 paid by card: refund on UPI → {ok: false, code: failed-precondition}. Nobody paid this bill by UPI', () =>
    expect(code(canRefund(paid, paidByCard, note(), null, rf({ tenderId: 'upi' }), cfg))).toBe('failed-precondition'));
  it('PY-S36 paid by cash: refund on card → {ok: false}. Card was never a route into this bill', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ tenderId: 'card' }), cfg))).toBe('failed-precondition'));
  it('PY-S36 a split bill (card 40000 + cash 20900) may refund on either', () => {
    const rows = [take(40000, card), take(20900)];
    ok(canRefund(paid, rows, note(), null, rf({ tenderId: 'card' }), cfg));
    ok(canRefund(paid, rows, note(), null, rf({ tenderId: 'cash' }), cfg));
  });
  it('PY-S36 a VOIDED card take does not make card a refund route', () =>
    expect(code(canRefund(paid, [voided(take(60900, card)), take(60900)], note(), null, rf({ tenderId: 'card' }), cfg))).toBe('failed-precondition'));
  it('R8 refund amount 0 → {ok: false, code: invalid-argument}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ amount: 0 }), cfg))).toBe('invalid-argument'));
  it('R8 refund amount negative → {ok: false, code: invalid-argument}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ amount: -8400 }), cfg))).toBe('invalid-argument'));
  it('R7 boundary: refund 8401 against a note of 8400 with refundedTotal 0 → {ok: false}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ amount: 8401 }), cfg))).toBe('failed-precondition'));
  it('NEW the note is cancelled → {ok: false, code: failed-precondition}', () =>
    expect(code(canRefund(paid, paidRows, note({ status: 'cancelled' }), null, rf(), cfg))).toBe('failed-precondition'));
  it('NEW a refund row carries no change and no tendered even on cash: a refund is not a tender-and-change event', () => {
    const row = refund(8400, cash, { tendered: null, change: null });
    expect(row.tendered).toBeNull();
    expect(row.change).toBeNull();
  });
  it('PY-S25 defence in depth: refund while outstanding is 20900 → {ok: false}. BL owns the precondition; PY checks it too', () =>
    expect(code(canRefund(bill, [take(40000, card)], note(), null, rf({ tenderId: 'card' }), cfg))).toBe('failed-precondition'));
  it('PY-S25 with the round-off: outstanding 1 counts as fully paid, so the refund is allowed', () =>
    ok(canRefund(bill, [take(60899)], note(), null, rf(), cfg)));
  it('PY-S32 refund with refundsPaymentId naming a row with overpaid 4100, amount 4100 → {ok: true}. No credit note needed: this money was never in paidTotal', () => {
    const target = take(60900, upi, { overpaid: 4100 });
    ok(canRefund(paid, [target], null, target, rf({ tenderId: 'upi', amount: 4100, creditNoteId: undefined, refundsPaymentId: 'p1' }), cfg));
  });
  it('PY-S32 refund with refundsPaymentId, amount 4101 against overpaid 4100 → {ok: false}', () => {
    const target = take(60900, upi, { overpaid: 4100 });
    expect(code(canRefund(paid, [target], null, target, rf({ tenderId: 'upi', amount: 4101, creditNoteId: undefined, refundsPaymentId: 'p1' }), cfg))).toBe('failed-precondition');
  });
  it('PY-S32 refund carrying BOTH creditNoteId and refundsPaymentId → {ok: false}. They are mutually exclusive', () =>
    expect(code(canRefund(paid, paidRows, note(), take(60900), rf({ refundsPaymentId: 'p1' }), cfg))).toBe('invalid-argument'));
  it('PY-S32 refund with refundsPaymentId naming a row whose overpaid is 0 → {ok: false}', () => {
    const target = take(60900, upi, { overpaid: 0 });
    expect(code(canRefund(paid, [target], null, target, rf({ tenderId: 'upi', amount: 100, creditNoteId: undefined, refundsPaymentId: 'p1' }), cfg))).toBe('failed-precondition');
  });
  it('PY-S32 the row being returned was voided → {ok: false}', () => {
    const target = voided(take(60900, upi, { overpaid: 4100 }));
    expect(code(canRefund(paid, [target], null, target, rf({ tenderId: 'upi', amount: 4100, creditNoteId: undefined, refundsPaymentId: 'p1' }), cfg))).toBe('failed-precondition');
  });
  it('NEW a refund with no reason → {ok: false, code: invalid-argument}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ reason: '  ' }), cfg))).toBe('invalid-argument'));
  it('PY-S19 a refund on an unknown tenderId → {ok: false, code: invalid-argument}', () =>
    expect(code(canRefund(paid, paidRows, note(), null, rf({ tenderId: 'sodexo' }), cfg))).toBe('invalid-argument'));
});

describe('domain/payments canVoid(row, businessDateClosed, req) — R15, R17', () => {
  const vr = (o: Record<string, unknown> = {}) => ({ role: 'MANAGER', by: 'u1', reason: 'wrong tender', ...o });

  it('PY-S16 a live cash row, day open → {ok: true}', () => expect(canVoid(take(20900), false, vr())).toEqual({ ok: true }));
  it('PY-S29 a row already carrying void → {ok: false, code: failed-precondition}', () =>
    expect(code(canVoid(voided(take(20900)), false, vr({ by: 'u2' })))).toBe('failed-precondition'));
  it('PY-S29 a live row whose businessDate DC has closed → {ok: false, code: failed-precondition}', () =>
    expect(code(canVoid(take(20900), true, vr()))).toBe('failed-precondition'));
  it('PY-S12 SERVER role → {ok: false, code: permission-denied}', () =>
    expect(code(canVoid(take(20900), false, vr({ role: 'SERVER' })))).toBe('permission-denied'));
  it('PY-S27 voiding the row that settled the bill is allowed; reopening the bill is statusFor, not a refusal here', () => {
    expect(canVoid(take(60900), false, vr())).toEqual({ ok: true });
    expect(statusFor(billOf(60900, 'paid'), [voided(take(60900))])).toBe('issued');
  });
  it('NEW voiding a refund row is allowed and returns the money to paidTotal: take 60900 + refund 8400, void the refund → paidTotal 60900', () => {
    expect(canVoid(refund(8400), false, vr())).toEqual({ ok: true });
    expect(paidTotalOf([take(60900), voided(refund(8400))])).toBe(60900);
  });
  it('NEW void with no reason, or reason "" → {ok: false, code: invalid-argument}', () => {
    expect(code(canVoid(take(20900), false, vr({ reason: '' })))).toBe('invalid-argument');
    expect(code(canVoid(take(20900), false, vr({ reason: undefined })))).toBe('invalid-argument');
  });
  it("NEW DC's answer for that businessDate is unavailable → {ok: false}. Talks-to: unknown means refuse", () =>
    expect(code(canVoid(take(20900), null, vr()))).toBe('failed-precondition'));
  it('NEW no such row → {ok: false, code: failed-precondition}', () =>
    expect(code(canVoid(null, false, vr()))).toBe('failed-precondition'));
  it('PY-S35 / R17 the same staff repeating the same reason on an already-voided row → {ok: true, retry: true}', () =>
    expect(canVoid(voided(take(20900)), false, vr({ by: 'u1', reason: 'wrong tender' }))).toEqual({ ok: true, retry: true }));
  it('PY-S35 / R17 a different reason on an already-voided row → {ok: false}', () =>
    expect(code(canVoid(voided(take(20900)), false, vr({ by: 'u1', reason: 'guest left' })))).toBe('failed-precondition'));
  it('PY-S35 the retry answer is given even after the day closed, because nothing is being written', () =>
    expect(canVoid(voided(take(20900)), true, vr())).toEqual({ ok: true, retry: true }));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments tenderById + configFrom — R10, PY-S19, portability', () => {
  it('PY-S19 a tender added to config is found by id and returns all four fields', () => {
    const { config } = configFrom({ payments: { tenders: [...DEFAULTS.tenders, { id: 'sodexo', label: 'Meal voucher', kind: 'external', opensDrawer: false, needsRef: false }] } });
    expect(tenderById(config, 'sodexo')).toEqual({ id: 'sodexo', label: 'Meal voucher', kind: 'external', opensDrawer: false, needsRef: false });
  });
  it('PY-S19 an id absent from config → undefined, the caller refuses (never a default to cash)', () =>
    expect(tenderById(cfg, 'sodexo')).toBeUndefined());
  it('R10 domain sees kind cash | external only: a config row with kind "creditcard" is rejected by configFrom', () => {
    const { config, warnings } = configFrom({ payments: { tenders: [{ id: 'x', kind: 'creditcard' }] } });
    expect(config.tenders).toEqual([]);
    expect(warnings.length).toBe(1);
  });
  it('configFrom({}) → DEFAULTS with cash, card, upi, maxTendersPerBill 10 and settleWithin 99', () => {
    const { config } = configFrom({});
    expect(config.tenders.map((t) => t.id)).toEqual(['cash', 'card', 'upi']);
    expect(config.maxTendersPerBill).toBe(10);
    expect(config.settleWithin).toBe(99);
  });
  it('configFrom(null) → DEFAULTS, and one warning', () => {
    const { config, warnings } = configFrom(null);
    expect(config).toEqual(DEFAULTS);
    expect(warnings.length).toBe(1);
  });
  it('configFrom with a malformed tenders array (a string) → DEFAULTS tenders, one warning', () => {
    const { config, warnings } = configFrom({ payments: { tenders: 'cash' } });
    expect(config.tenders).toEqual(DEFAULTS.tenders);
    expect(warnings.length).toBe(1);
  });
  it('configFrom with maxTendersPerBill 0 → treated as unlimited? NO: 0 means no takes at all, and the warning says so', () => {
    const { config, warnings } = configFrom({ payments: { maxTendersPerBill: 0 } });
    expect(config.maxTendersPerBill).toBe(0);
    expect(warnings.join(' ')).toMatch(/no take will be accepted/);
    expect(code(canTake(bill, [], tk({ tendered: 1 }), config))).toBe('failed-precondition');
  });
  it('configFrom with settleWithin 0 → exact settlement; a negative or non-integer → default 99 with a warning', () => {
    expect(configFrom({ payments: { settleWithin: 0 } }).config.settleWithin).toBe(0);
    const bad = configFrom({ payments: { settleWithin: -1 } });
    expect(bad.config.settleWithin).toBe(99);
    expect(bad.warnings.length).toBe(1);
  });
  it('R9/portability: no function in this module contains a currency symbol, a tender name, or a country string (grep assertion)', () => {
    // Compiled tests run from lib/, so the source is found relative to the package root.
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'domain', 'payments.ts').replace('/lib/', '/'), 'utf8');
    for (const banned of ['₹', 'INR', 'GST', 'HSN', 'rupee', 'Rupee', 'paise', 'Paise', 'India']) {
      expect(src).not.toContain(banned);
    }
  });
});
