// PY · Payments — domain tests. Every PY-S id is a test name.
// Hand-computed throughout on BL-S1's bill 0417: pizza ₹500 + coke ₹80, taxable ₹580.00,
// CGST ₹14.50, SGST ₹14.50, payable ₹609.00 = 60900 paise.
// Tenders: cash (kind 'cash'), card and upi (kind 'external').
import {
  DEFAULTS, configFrom, outstanding, isSettled, paidTotalOf, changeFor, overpaidFor,
  canTake, canRefund, canVoid, statusFor, tenderById, Bill, Row, Tender,
} from './payments';

const cfg = DEFAULTS;
const PAYABLE = 60900;                       // ₹609.00
const bill: Bill = { billId: '0417', payable: PAYABLE, status: 'issued' };
const cash = { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false } as Tender;
const card = { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true } as Tender;

const take = (amount: number, tender = cash, extra: Partial<Row> = {}): Row =>
  ({ kind: 'take', amount, tender, void: null, ...extra } as Row);
const refund = (amount: number, tender = cash, extra: Partial<Row> = {}): Row =>
  ({ kind: 'refund', amount, tender, void: null, ...extra } as Row);

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments paidTotalOf(rows) — R2, net receipts over non-void rows', () => {
  it.todo('no rows → 0');
  it.todo('PY-S1 one cash take 60900 → 60900');
  it.todo('PY-S3 card 40000 (₹400) + cash 20900 (₹209) → 60900');
  it.todo('PY-S9 take 60900 then refund 8400 (₹84) → 52500 (₹525.00), refunds subtract');
  it.todo('PY-S27 a voided take is excluded: take 60900 with void set → 0, not 60900');
  it.todo('a voided refund is excluded too: take 60900 + voided refund 8400 → 60900');
  it.todo('R2 mixed: card 40000 + voided cash 20900 + cash 20900 → 60900, the void drops out');
  it.todo('overpaid is never counted against the bill: take amount 60900 overpaid 4100 → 60900, not 65000');
});

describe('domain/payments outstanding(bill, rows) — R2', () => {
  it.todo('PY-S1 payable 60900, no rows → 60900');
  it.todo('PY-S3 after card 40000 → 20900 (₹209.00)');
  it.todo('PY-S3 after card 40000 + cash 20900 → 0');
  it.todo('PY-S21 after cash 60899 → 1, a single paisa still outstanding');
  it.todo('PY-S9 payable 60900, take 60900, refund 8400 → 8400 (₹84.00), the bill owes the guest back');
  it.todo('PY-S27 after voiding the take that settled it → 60900, the full amount again');
  it.todo('PY-S8 payable 0, no rows → 0');
  it.todo('R2 goes negative rather than clamping: payable 60900, paidTotal 60901 → -1. Callers must see an over-take; R6 is what prevents creating one');
  it.todo('NEW over-refunded past zero: payable 60900, take 60900, refunds totalling 69300 → outstanding 69300 (₹693.00), paidTotal -8400. No clamp to 0. Production event: a full credit note refunded after a partial one');
});

describe('domain/payments isSettled(payable, paidTotal) — R3, the one definition BL also imports', () => {
  it.todo('PY-S1 60900 of 60900 → true');
  it.todo('PY-S3 40000 of 60900 → false');
  it.todo('PY-S21 60899 of 60900 → false, one paisa short is not settled');
  it.todo('PY-S8 0 of 0 → true, a comped bill is settled with no payment row (BL stamps this at issue)');
  it.todo('PY-S30 52500 of 60900 after a refund → false, the bill owes ₹84 back');
  it.todo('R2 "0 or less" is the test, not equality: 60901 of 60900 → true');
  it.todo('R2 pure function of two integers: no bill, no rows, no clock — same inputs, same answer');
});

describe('domain/payments statusFor(bill, rows) — R2, follows outstanding in BOTH directions', () => {
  it.todo('PY-S1 outstanding 0 → paid');
  it.todo('PY-S3 outstanding 20900 → issued');
  it.todo("PY-S27 a paid bill whose settling row is voided → issued, NOT latched at paid");
  it.todo('PY-S30 a paid bill with a refund reopening 8400 → issued');
  it.todo('PY-S27 then a fresh take of 60900 → paid again; the status is recomputed, never remembered');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments changeFor(tender, tendered, outstanding) — R6, cash only', () => {
  it.todo('PY-S1 cash, tendered 60900 against 60900 → {amount: 60900, change: 0}');
  it.todo('PY-S2 cash, tendered 70000 (₹700) against 60900 → {amount: 60900, change: 9100 (₹91.00)}');
  it.todo('PY-S4 change is computed on the OUTSTANDING not the payable: after card 50000, tendered 20000 against outstanding 10900 → {amount: 10900, change: 9100}');
  it.todo('PY-S3 cash, tendered 20900 against outstanding 20900 → {amount: 20900, change: 0}');
  it.todo('cash tendered less than outstanding is a partial, not an error: tendered 40000 against 60900 → {amount: 40000, change: 0}');
  it.todo('R6 an external tender never makes change: card, tendered 70000 → throws, change is physical');
  it.todo('tendered 0 → {amount: 0, change: 0} is refused upstream by canTake, not here');
  it.todo('NEW off-by-one: cash tendered 60901 against 60900 → change 1, a single paisa back');
  it.todo('NEW invariant on every cash result above: tendered − change === amount');
});

describe('domain/payments overpaidFor(tender, amount, outstanding) — R6, external only', () => {
  it.todo('PY-S28 upi, amount 65000 (₹650) against outstanding 60900 → {applied: 60900, overpaid: 4100 (₹41.00)}');
  it.todo('PY-S3 card, amount 40000 against outstanding 60900 → {applied: 40000, overpaid: 0}');
  it.todo('exact: card amount 60900 against 60900 → {applied: 60900, overpaid: 0}');
  it.todo('R6 cash never overpays, it makes change: cash → throws, use changeFor');
  it.todo('NEW overpaid on a partial: after card 40000, upi amount 30000 against outstanding 20900 → {applied: 20900, overpaid: 9100}');
  it.todo('NEW external exactly 1 paise over: amount 60901 against 60900 → {applied: 60900, overpaid: 1}');
  it.todo('NEW overpaid is 0 not null when there is none, so day close sums without a guard');
  it.todo('NEW schema exclusivity: a cash row has overpaid null; an external row has tendered and change null');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments canTake(bill, rows, req, config) — R6, R11, R13', () => {
  it.todo('PY-S1 MANAGER, cash 60900 on an issued bill with outstanding 60900 → {ok: true}');
  it.todo('PY-S12 SERVER role → {ok: false, code: permission-denied}, never a PIN prompt');
  it.todo('PY-S13 bill is null (never issued) → {ok: false, code: failed-precondition}');
  it.todo('PY-S14 bill.status cancelled → {ok: false, code: failed-precondition}');
  it.todo('PY-S7 outstanding already 0 → {ok: false, code: failed-precondition, message names "nothing outstanding" not "already paid"}');
  it.todo('PY-S30 bill is paid but a refund reopened outstanding 8400 → {ok: true}, a take of 8400 is legal');
  it.todo('PY-S8 payable 0 → {ok: false}, there is nothing to collect');
  it.todo('PY-S5 card 70000 against outstanding 60900 → {ok: false, code: invalid-argument}, the terminal is still in hand');
  it.todo('PY-S6 second card 30000 against outstanding 20900 → {ok: false, code: invalid-argument}');
  it.todo('PY-S28 upi 65000 against 60900 with captured:true → {ok: true}. The money already reached us; only captured separates this from PY-S5');
  it.todo('PY-S5 the SAME request with captured:false → {ok: false}. One flag, two opposite answers, so it must be tested as a pair');
  it.todo('NEW captured:true on a CASH tender → {ok: false}. Cash is never already-moved; it is in the cashier\'s hand');
  it.todo('PY-S6 boundary: external exactly equal to outstanding 20900 → {ok: true}');
  it.todo('PY-S6 boundary: external 20901 against outstanding 20900 → {ok: false}, off-by-one on the PY-S5 gate');
  it.todo('NEW bill.status draft → {ok: false, code: failed-precondition}. Only an issued bill takes money');
  it.todo('PY-S20 card with needsRef and no ref → {ok: false, code: invalid-argument}');
  it.todo("PY-S20 needsRef with ref '' and with ref '   ' → {ok: false} for both spellings");
  it.todo('PY-S20 cash with no ref → {ok: true}, cash is never asked');
  it.todo('PY-S19 an unknown tenderId not in config → {ok: false, code: invalid-argument}');
  it.todo('PY-S22 cap: 10 live takes already present, 11th → {ok: false, code: failed-precondition}');
  it.todo('PY-S22 cap counts LIVE takes only: 10 voided takes + 1 live → an 11th is allowed, mistaps never freeze a bill');
  it.todo('PY-S22 cap does not count refunds: 9 takes + 5 refunds → a 10th take is allowed');
  it.todo('R8 amount 0 → {ok: false, code: invalid-argument}');
  it.todo('R8 negative amount -100 → {ok: false, code: invalid-argument}');
  it.todo('R8 non-integer amount 608.995 → {ok: false, code: invalid-argument}, never rounded');
  it.todo('R8 NaN amount → {ok: false, code: invalid-argument}');
  it.todo('R8 amount as the string "60900" → {ok: false, code: invalid-argument}, no coercion');
  it.todo('R8 Infinity → {ok: false, code: invalid-argument}');
  it.todo('NEW amount Number.MAX_SAFE_INTEGER → {ok: false, code: invalid-argument}. Production event: an amount pad with no max length and a leaned-on key');
});

describe('domain/payments canRefund(bill, rows, note, req, config) — R7, R11', () => {
  it.todo('PY-S9 MANAGER, cash 8400 against CN-0007 (total 8400, refundedTotal 0) → {ok: true}');
  it.todo('PY-S11 no creditNoteId on the request → {ok: false, code: invalid-argument}');
  it.todo('PY-S10 refund 10000 against a note of 8400 → {ok: false, code: failed-precondition}');
  it.todo('PY-S26 note total 8400 with refundedTotal already 8400 → {ok: false, code: failed-precondition}');
  it.todo('R7 part refunds sum to the note: total 8400, refundedTotal 5000, refund 3400 → {ok: true}');
  it.todo('R7 part refund that would exceed: total 8400, refundedTotal 5000, refund 3401 → {ok: false}');
  it.todo('PY-S12 SERVER role → {ok: false, code: permission-denied}');
  it.todo('NEW note belongs to a different bill → {ok: false, code: failed-precondition}, a note cannot be refunded against the wrong bill');
  it.todo('Decisions: refund on the card tender → {ok: true}, documents an EDC reversal (reverses the cash-only v1 default)');
  it.todo('R8 refund amount 0 → {ok: false, code: invalid-argument}');
  it.todo('R8 refund amount negative → {ok: false, code: invalid-argument}');
  it.todo('R7 boundary: refund 8401 against a note of 8400 with refundedTotal 0 → {ok: false}');
  it.todo('NEW the note is cancelled → {ok: false, code: failed-precondition}');
  it.todo('NEW a refund row carries no change and no tendered even on cash: a refund is not a tender-and-change event');
  it.todo('NEW a refund on an external tender never produces overpaid');
  it.todo('PY-S25 defence in depth: refund while outstanding is 20900 → {ok: false}. BL owns the precondition; PY checks it too');
  it.todo('PY-S32 refund with refundsPaymentId naming a row with overpaid 4100, amount 4100 → {ok: true}. No credit note needed: this money was never in paidTotal');
  it.todo('PY-S32 refund with refundsPaymentId, amount 4101 against overpaid 4100 → {ok: false}');
  it.todo('PY-S32 refund carrying BOTH creditNoteId and refundsPaymentId → {ok: false}. They are mutually exclusive');
  it.todo('PY-S32 refund with refundsPaymentId naming a row whose overpaid is 0 → {ok: false}');
  it.todo('NEW a refund row never carries tendered or change, even on cash. Handing money back is not a tender-and-change event');
});

describe('domain/payments canVoid(row, businessDateClosed) — R15', () => {
  it.todo('PY-S16 a live cash row, day open → {ok: true}');
  it.todo('PY-S29 a row already carrying void → {ok: false, code: failed-precondition}');
  it.todo('PY-S29 a live row whose businessDate DC has closed → {ok: false, code: failed-precondition}');
  it.todo('PY-S12 SERVER role → {ok: false, code: permission-denied}');
  it.todo('PY-S27 voiding the row that settled the bill is allowed; reopening the bill is statusFor, not a refusal here');
  it.todo('NEW voiding a refund row is allowed and returns the money to paidTotal: take 60900 + refund 8400, void the refund → paidTotal 60900');
  it.todo('NEW void with no reason, or reason "" → {ok: false, code: invalid-argument}');
  it.todo("NEW DC's answer for that businessDate is unavailable → {ok: false}. Talks-to: unknown means refuse");
});

// ─────────────────────────────────────────────────────────────────────────────
describe('domain/payments businessDateFor(at, config) — R18, the day a payment belongs to', () => {
  it.todo('R18 21:06 on 15 Sep with close 04:00 → 2026-09-15');
  it.todo('R18 03:30 on 16 Sep with close 04:00 → 2026-09-15. Friday service does not leak into Saturday');
  it.todo('R18 04:00 exactly on 16 Sep with close 04:00 → 2026-09-16. The boundary is decided here once');
  it.todo('R18 04:01 on 16 Sep → 2026-09-16');
  it.todo('R18 00:00 on 16 Sep with close 00:00 (no shift) → 2026-09-16');
  it.todo('R18 pure: same instant and same config always give the same string, with no reference to the machine timezone');
});

describe('domain/payments tenderById + configFrom — R10, PY-S19, portability', () => {
  it.todo('PY-S19 a tender added to config is found by id and returns all four fields');
  it.todo('PY-S19 an id absent from config → undefined, the caller refuses (never a default to cash)');
  it.todo('R10 domain sees kind cash | external only: a config row with kind "creditcard" is rejected by configFrom');
  it.todo('configFrom({}) → DEFAULTS with cash, card, upi and maxTendersPerBill 10');
  it.todo('configFrom(null) → DEFAULTS, and one warning');
  it.todo('configFrom with a malformed tenders array (a string) → DEFAULTS tenders, one warning');
  it.todo('configFrom with maxTendersPerBill 0 → treated as unlimited? NO: 0 means no takes at all, and the warning says so');
  it.todo('R9/portability: no function in this module contains a currency symbol, a tender name, or a country string (grep assertion)');
});
