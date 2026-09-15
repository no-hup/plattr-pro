/**
 * Suite: payments (PY · Payments). Real Cloud Functions on the emulator.
 *
 * SKELETON. Every case below is `todo` for one reason, stated on each line:
 * a payment needs an ISSUED BILL, and BL's finalise endpoint does not exist yet.
 * Seeding a bill document by hand would test PY against a bill shape nobody has
 * agreed to, so these wait for `billing-finalise` rather than guess it.
 *
 * What this suite covers that the app tests cannot: real Firestore transactions
 * (so a real contention retry, not a fake adapter), the real callable error
 * codes a client sees, and the real security rules (R16).
 *
 * Seeds and deletes its own bills, payments and staff first so it reruns without
 * a data reset, same Bearer-owner REST seam as the approvals suite.
 * Money is paise. Bill 0417 = payable 60900 (₹609.00).
 */
import { call } from '../lib/api.js';
import config from '../lib/config.js';

export const name = 'payments';

export default function suite(t) {
  const WAIT = 'todo: needs BL billing-finalise to issue a bill; seeding a bill by hand would test an unagreed shape';

  // ── taking money ──────────────────────────────────────────────────────────
  t.todo(`PY-S1 cash 60900 on bill 0417 → row written, bill paid, paidTotal 60900 — ${WAIT}`);
  t.todo(`PY-S2 cash tendered 70000 → row {amount:60900, tendered:70000, change:9100}, paidTotal 60900 — ${WAIT}`);
  t.todo(`PY-S3 card 40000 → bill issued, paidTotal 40000, order mirror partially_paid; then cash 20900 → paid — ${WAIT}`);
  t.todo(`PY-S5 card 70000 against payable 60900 → invalid-argument, no row — ${WAIT}`);
  t.todo(`PY-S13 take against a table with no issued bill → failed-precondition — ${WAIT}`);
  t.todo(`PY-S14 take against a cancelled bill → failed-precondition — ${WAIT}`);
  t.todo(`PY-S8 take against a payable-0 comped bill → failed-precondition; the bill is already paid — ${WAIT}`);
  t.todo(`PY-S20 card with needsRef and no ref → invalid-argument — ${WAIT}`);
  t.todo(`PY-S22 an 11th live take → failed-precondition; 10 voided takes do not count — ${WAIT}`);

  // ── the retry, against a REAL callable ────────────────────────────────────
  t.todo(`PY-S23 same paymentId sent twice (partial cash 40000) → one row, paidTotal 40000, second call returns the same row — ${WAIT}`);
  t.todo(`PY-S24 same paymentId sent twice (completing cash 60900) → second call SUCCEEDS with the same row, never failed-precondition — ${WAIT}`);
  t.todo(`R13 missing paymentId → invalid-argument; the server never generates one — ${WAIT}`);

  // ── real contention, not a fake adapter ───────────────────────────────────
  t.todo(`PY-S7 two concurrent calls, distinct paymentIds, cash 20900 each against outstanding 20900 → exactly one row, paidTotal 60900, the loser gets failed-precondition "nothing outstanding" — ${WAIT}`);
  t.todo(`PY-S26 two concurrent refunds of CN-0007 (8400) → one row, note.refundedTotal 8400, the loser refused — ${WAIT}`);
  t.todo(`PY-S29 two concurrent voids of one row → one wins, the other refused; the audit is not last-write-wins — ${WAIT}`);
  t.todo(`PY-S33 two concurrent cash tenders of 15000 against outstanding 20900 → first 15000, second {amount:5900, change:9100}. paidTotal 60900, never 30000 — ${WAIT}`);
  t.todo(`PY-S34 concurrent void-of-the-card and take-of-the-rest, both orderings → paidTotal 20900, outstanding 40000, status issued — ${WAIT}`);
  t.todo(`R13 two in-flight calls with the SAME paymentId (a double tap) → one row, both callers succeed — ${WAIT}`);

  // ── refunds and voids ─────────────────────────────────────────────────────
  t.todo(`PY-S9 refund 8400 against CN-0007 with PIN → row written, refundedTotal 8400, paidTotal 52500, bill back to issued — ${WAIT}`);
  t.todo(`PY-S10 refund 10000 against an 8400 note → failed-precondition — ${WAIT}`);
  t.todo(`PY-S11 refund with no creditNoteId → invalid-argument — ${WAIT}`);
  t.todo(`PY-S9 refund without a PIN → permission-denied carrying {requires:'pin'}, then the same body plus pin succeeds (ST's one interceptor shape) — ${WAIT}`);
  t.todo(`PY-S27 void the settling row → bill back to issued, outstanding 60900; a fresh UPI 60900 then settles it — ${WAIT}`);
  t.todo(`PY-S29 void an already-voided row by a different person → failed-precondition — ${WAIT}`);
  t.todo(`PY-S35 / R17 the same cashier retries the same void with the same reason → success, one void block — ${WAIT}`);
  t.todo(`PY-S32 refund an overpay: after the PY-S28 row, refund 4100 with refundsPaymentId → bill stays paid, paidTotal still 60900 — ${WAIT}`);
  t.todo(`PY-S32 a refund carrying both creditNoteId and refundsPaymentId → invalid-argument — ${WAIT}`);

  // ── roles ─────────────────────────────────────────────────────────────────
  t.todo(`PY-S12 a SERVER-role session calling payments-take → permission-denied, NOT a PIN challenge — ${WAIT}`);
  t.todo(`PY-S12 a SERVER-role session calling payments-refund → permission-denied — ${WAIT}`);
  t.todo(`PY-S12 a SERVER-role session calling payments-void → permission-denied — ${WAIT}`);
  t.todo('an unauthenticated call to payments-take → unauthenticated (no bill needed, runs today)');
  t.todo('a session from ANOTHER restaurant → unauthenticated, never a cross-outlet payment (ST donor MISSING 2)');

  // ── the rules that are not about money ────────────────────────────────────
  t.todo(`R16 a client write straight to restaurants/{id}/payments/{x} via the REST API with a staff token → PERMISSION_DENIED by firestore.rules. Without this, R3 is theatre — ${WAIT}`);
  t.todo(`R16 a client write to bills/{id}.status = 'paid' with a staff token → PERMISSION_DENIED — ${WAIT}`);
  t.todo(`R16 a client UPDATE of an existing payment row, and a DELETE of one → both PERMISSION_DENIED. Append-only must hold at the rules layer too — ${WAIT}`);
  t.todo(`R16 a client write of refundedTotal on a credit note → PERMISSION_DENIED — ${WAIT}`);
  t.todo(`R16 the rule is not a blanket deny: a legitimate BL-side write to another bill field still succeeds — ${WAIT}`);
  t.todo(`R14 businessDate on the written row is the server's, and a businessDate in the request body is ignored — ${WAIT}`);
  t.todo(`R18 a take at 03:30 with close 04:00 carries businessDate of the previous day, and still does after the close-time key is changed — ${WAIT}`);
  t.todo(`R19 payments-list returns cash, card and upi as separate figures, not one external total — ${WAIT}`);
  t.todo(`R14 at on the written row is server time, and an at in the request body is ignored — ${WAIT}`);
  t.todo(`R8 amount 608.995 → invalid-argument, never rounded to 60900 or 60899 — ${WAIT}`);
  t.todo(`R8 amount "60900" as a string → invalid-argument, no coercion — ${WAIT}`);
  t.todo(`R4 the order mirror is written in the same transaction: after a successful take, order.paymentStatus reads paid — ${WAIT}`);
  t.todo(`TD-010 the captain double-take path: while outstanding is 20900, a captain calls order-updateOrderStatus COMPLETED. The BILL must be untouched (issued, paidTotal 40000) and a following payments-take of 20900 must still succeed. This is the test that makes the debt visible — ${WAIT}`);
  t.todo(`PY-S15 no exported endpoint moves a settled bill back: payments-list and order-updateOrderStatus both leave bill.status alone — ${WAIT}`);
  t.todo(`PY-S8 / R3 BL's zero-payable stamp and PY's settle agree, because both call domain isSettled: a 0 bill and a 60900 bill answer the same predicate — ${WAIT}`);
  t.todo(`PY-S21 cash 60899 → issued with outstanding 1; then cash 1 → paid. Two rows, paidTotal 60900 — ${WAIT}`);
  t.todo(`PY-S19 a tender added to config is accepted on the next call with no deploy — ${WAIT}`);

  // ── reading back ──────────────────────────────────────────────────────────
  t.todo(`PY-S18 payments-list for the day groups by tender.kind: cash 1245000, card 3120000, upi 890000, cash refunds 8400, net cash 1236600 — ${WAIT}`);
  t.todo(`PY-S18 a voided row is absent from every group — ${WAIT}`);
  t.todo(`PY-S28 upi 65000 against 60900 → row {amount:60900, overpaid:4100}; list shows upi received 65000 — ${WAIT}`);
}
