// PY · Payments — app tests. Fake adapters and a fake clock, no emulator, no network.
// Bill 0417 throughout: payable 60900 (₹609.00). See domain/payments.test.ts for the arithmetic.
// These tests are about ORDERING and PARTIAL FAILURE: what lands together, what rolls back,
// and what a second caller sees. The maths is domain's.
// SKELETON: the import below is restored in phase 3 when the module lands. `it.todo` bodies
// reference nothing, so commenting it keeps `make check` green while the list is reviewed.
// import { take, refund, voidRow, list, PaymentError } from './payments';

describe('app/payments take() — the happy paths land everything in one transaction', () => {
  it.todo('PY-S1 cash 60900: one row written, bill {status: paid, paidTotal: 60900, paidAt, paidBy}, order mirror "paid" — all four in ONE transaction (R4)');
  it.todo('PY-S2 cash tendered 70000: row {amount: 60900, tendered: 70000, change: 9100}, bill paidTotal 60900 — the drawer figure is amount, never tendered');
  it.todo('PY-S3 card 40000 then cash 20900: after the first, bill {status: issued, paidTotal: 40000} and mirror "partially_paid"; after the second, {status: paid, paidTotal: 60900} and mirror "paid"');
  it.todo('PY-S28 upi 65000: row {amount: 60900, overpaid: 4100}, bill paidTotal 60900 — the overpaid 4100 never enters paidTotal');
  it.todo('R14 businessDate is resolved server-side from config and frozen on the row; a businessDate in the request body is ignored');
  it.todo('NEW R14 past midnight: fake clock 03:30 on 16 Sep, configured close 05:00 → businessDate is 2026-09-15. Friday service does not leak into Saturday');
  it.todo('NEW R14 exactly at the configured close instant → belongs to the NEW day. Pinned here so the boundary is decided once, not per reader');
  it.todo('R14 frozen: changing the close time in config after the write and re-reading the row → businessDate unchanged');
  it.todo('R14 at is the fake clock, not the body: a request carrying at=0 still writes the clock value');
  it.todo('by is the staff id from the session, never from the body: a body carrying by="someone-else" is ignored');
  it.todo('R10 the whole tender row is snapshotted: row.tender === {label, kind, opensDrawer, needsRef}, all four');
  it.todo('R10 changing config after the write does not change the row: re-read gives the old label');
});

describe('app/payments take() — R13 idempotency, the retry that would double-charge', () => {
  it.todo('PY-S23 same paymentId twice, partial: cash 40000 commits, retry returns THE SAME ROW. One row total, paidTotal 40000, outstanding 20900, status issued. Not two rows, not change 19100, not paid');
  it.todo('PY-S24 same paymentId twice, completing: cash 60900 commits, retry returns the same row and SUCCEEDS. Never failed-precondition — a cashier told "already paid" voids and takes again, and the guest pays twice');
  it.todo('PY-S23 the retry does not re-write the bill or re-stamp paidAt: paidAt is the first call clock value, not the second');
  it.todo('PY-S23 the retry does not write a second audit/log line as a new payment');
  it.todo('R13 two DIFFERENT paymentIds for the same amount are two real payments: cash 20900 and cash 20900 with distinct ids against outstanding 41800 → paidTotal 41800, two rows. A split is not a retry');
  it.todo('R13 a paymentId already used on a DIFFERENT bill → failed-precondition, ids are unique per restaurant');
  it.todo('R13 a missing paymentId in the request → invalid-argument. The server never generates one: an auto-id makes every retry a new row');
  it.todo('NEW a retry of a row that was since VOIDED returns the voided row, it does not resurrect it or create a new take');
  it.todo('NEW same paymentId, DIFFERENT amount: p1 exists at 40000, a call reuses p1 with 20900 → failed-precondition. An id collision is never a silent overwrite');
  it.todo('R13 the idempotent path is a read of the row by id, not a query: a fake adapter whose listRows is empty must still find p1 by id');
});

describe('app/payments take() — concurrency, R5 re-read inside the write', () => {
  it.todo('PY-S7 two tills, outstanding 20900, both send cash 20900 with different ids: the first commits, the second gets failed-precondition "nothing outstanding". Exactly one row, paidTotal 60900, never 81800');
  it.todo('PY-S7 the decision is made on the FRESH read: a fake adapter whose outstanding drops to 0 between the first read and the transaction body must refuse, not apply the stale decision');
  it.todo('NEW partial race: outstanding 60900, two tills each send cash 40000. Both are legal at read time. Serialised, the first leaves 20900 and the second is refused as an over-take (R6), not silently clamped to 20900');
  it.todo('PY-S30 a take against a bill reopened by a refund is decided on the fresh outstanding 8400, not on the stale status "paid"');
  it.todo('NEW both partial, CASH: outstanding 60900, two tills each tender 40000. A commits, leaving 20900. B re-reads and becomes {amount: 20900, tendered: 40000, change: 19100 (₹191.00)} — R6 computes change on the RE-READ outstanding, not the one B saw first');
  it.todo('NEW both partial, EXTERNAL: same setup with card 40000 each. A commits, B is refused invalid-argument (R6 refuses an external over-take at the till). The cash and card paths must diverge here');
  it.todo('PY-S33 two cashiers split the remainder in CASH: outstanding 20900, both tender 15000. First takes 15000 leaving 5900. Second re-reads and becomes {amount: 5900 (₹59.00), tendered: 15000, change: 9100 (₹91.00)}. paidTotal 60900, paid. Never 30000 taken, never a refusal');
  it.todo('PY-S33 reversed order gives the identical end state: whoever commits second is the one who gets the 5900 and the 9100 change');
  it.todo('PY-S34 void and take race, order A-then-B: card 40000 live, one till takes cash 20900, the other voids the card. End: live cash 20900, voided card, paidTotal 20900, outstanding 40000, status issued');
  it.todo('PY-S34 the reverse order ends identically. Never paidTotal 60900 with the card voided, never paidTotal 0 with the cash row missing');
  it.todo('NEW two in-flight calls with the SAME paymentId (a double tap before any response): one row, both callers get success, paidTotal counted once');
  it.todo('NEW Firestore retries the transaction body on contention: a fake transaction that aborts once then succeeds writes EXACTLY ONE row. Nothing inside the body may be a non-idempotent side effect');
});

describe('app/payments take() — partial failure, nothing lands alone (R4)', () => {
  it.todo('PY-S17 the row write throws: bill is NOT stamped, mirror NOT written, paidTotal unchanged, caller sees the error');
  it.todo('PY-S17 the bill stamp throws: the row is NOT left behind');
  it.todo('R4 the ORDER MIRROR throws: the whole take fails. A paid bill the floor cannot see is how a guest is asked to pay twice');
  it.todo('R4 the order document is missing entirely: the take fails rather than skipping the mirror');
  it.todo('config read throws: the take is refused. PY never defaults a tender — guessing cash records a card payment as cash');
  it.todo('config returns no tenders array at all: DEFAULTS apply for a fresh restaurant, and a warning is logged');
  it.todo('config returns an EMPTY tenders array: the take is refused, not defaulted');
  it.todo('R4 all-or-nothing under an injected abort partway through the write set: either all four writes or none, never the row without the stamp');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('app/payments refund() — R7, the credit note is the gate', () => {
  it.todo('PY-S9 cash 8400 against CN-0007: row written with creditNoteId, note.refundedTotal stamped 8400, bill paidTotal 52500, outstanding 8400, status back to issued (PY-S30)');
  it.todo('PY-S9 the note stamp and the row are ONE transaction: the note write throwing leaves no refund row');
  it.todo('PY-S26 two tills refund the same note 8400 concurrently: the transaction reads and stamps refundedTotal, so the first commits and the second gets failed-precondition. paidTotal 52500, never 44100');
  it.todo('PY-S26 the limit is enforced by refundedTotal on the note, NOT by querying the payments collection — a fake adapter whose row query returns stale/incomplete results must still refuse the second');
  it.todo('PY-S10 refund 10000 against a note of 8400 → failed-precondition, nothing written');
  it.todo('PY-S11 no creditNoteId → invalid-argument, nothing written');
  it.todo('R7 two part refunds 5000 then 3400 against an 8400 note both succeed; refundedTotal ends 8400; a third of 1 is refused');
  it.todo('Decisions: a refund on the card tender writes the row with tender.kind external and does NOT count as cash movement in list()');
  it.todo('PY-S9 the refund requires a PIN via ST: ST refusing means no row, no note stamp, no bill change');
  it.todo('R13 idempotency applies to refunds too: the same paymentId retried returns the same refund row, refundedTotal stays 8400 and never 16800');
  it.todo('R7 the mechanism, not just the outcome: assert listRows was NOT called inside the refund transaction. Only readNote and stampNote');
  it.todo('R7 two concurrent PARTIAL refunds that fit: note 8400, A 5000 and B 3400 → both commit, refundedTotal 8400, paidTotal 52500, two rows');
  it.todo('R7 two concurrent partials that do not fit: note 8400, A 5000 and B 5000 → A commits, B refused. refundedTotal 5000, paidTotal 55900 (₹559.00)');
  it.todo('PY-S25 defence in depth: a refund while outstanding is 20900 is refused by PY too, not only by BL');
  it.todo('NEW a refund past zero: bill paid 60900, a note of 69300 refunded in full → paidTotal -8400, outstanding 69300, status issued. No clamp');
  it.todo('NEW ST is unavailable (its adapter throws) → refused, no row, no note stamp. Money never moves on an unanswered PIN');
  it.todo('NEW refund with no reason → invalid-argument, nothing written');
});

describe('app/payments voidRow() — R15', () => {
  it.todo('PY-S16 void a cash 20900 row: row gains {void: {at, by, reason, note}}, paidTotal drops by 20900, bill status recomputed, mirror updated — one transaction');
  it.todo('PY-S27 void the row that settled the bill: paidTotal 0, outstanding 60900, bill status back to ISSUED, mirror no longer paid. Then a fresh UPI 60900 take is accepted and settles it again');
  it.todo('PY-S29 void a row already carrying void → failed-precondition, the first void\'s {at, by, reason} is not overwritten');
  it.todo('PY-S29 two concurrent voids of the same row: one commits, the other gets failed-precondition. The audit is not last-write-wins');
  it.todo('PY-S29 void a row whose businessDate DC has closed → failed-precondition');
  it.todo('R15 a void does NOT open the drawer and writes no cash-movement row: list() for the day shows the voided row excluded and no compensating entry');
  it.todo('NEW void a refund row: refundedTotal on the note is decremented back, so the note can be refunded again. Otherwise a mistyped refund burns the note');
  it.todo('PY-S12 SERVER role → permission-denied, nothing written');
  it.todo('PY-S16 void requires a PIN via ST; ST refusing means the row is untouched');
  it.todo('R1 a void never deletes: after the void, every original field byte-matches the pre-void read except the added void block');
  it.todo('NEW void one of two takes: 40000 + 20900 settled, void the 20900 → paidTotal 40000, outstanding 20900, status issued, mirror partially_paid');
  it.todo('R4 the mirror write fails during a void → the void block is NOT left on the row and the bill stays paid');
  it.todo("Out of scope guard: there is no unvoid path. A call asking to clear a void is rejected, never honoured");
  it.todo('PY-S35 / R17 a void retried by the SAME staff with the SAME reason on an already-voided row → success, one void block, the first void\'s at and by kept. The PY-S24 trap does not stop at take');
  it.todo('PY-S35 / R17 the same row voided by a DIFFERENT person, or with a different reason → failed-precondition');
  it.todo('NEW the mirror after a void that takes paidTotal to 0 is "unpaid", not "partially_paid" and not left at "paid"');
  it.todo('NEW paidAt and paidBy are CLEARED when a void or refund takes the bill out of settled, so an issued bill never carries a paid timestamp');
  it.todo('NEW paidAt and paidBy are re-stamped with the new clock value when a later take settles it again');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('app/payments list() — PY-S18, what DC and RP read', () => {
  it.todo('PY-S18 a day of rows groups by tender.kind and businessDate: cash 1245000, card 3120000, upi 890000, cash refunds 8400 → net cash movement 1236600 (₹12,366.00)');
  it.todo('PY-S18 voided rows are excluded from every group');
  it.todo('PY-S18 grouping is by the frozen businessDate, NOT by a range over at: a row with at=03:30 and businessDate=Friday counts on Friday even when the query asks for Saturday');
  it.todo('PY-S28 overpaid is reported separately so bank settlement reconciles: upi group shows applied 60900 and overpaid 4100, total received 65000');
  it.todo('PY-S18 a day with no rows → zeros for every configured tender, not an empty object');
  it.todo('R19 grouping is by tenderId, so card and upi are separate numbers. Grouping by kind alone would merge two bank statements into one figure nobody can reconcile');
  it.todo('PY-S18 one day carrying all four effects at once: cash take tendered 70000 (amount 60900), card take 40000, a VOIDED cash take 20900, a cash refund 8400 → net cash 52500 (₹525.00), card 40000. The voided row and the 9100 of change both stay out');
  it.todo('PY-S32 an overpay refund is not cash taken and not bill money: it shows as a return against its own row, and paidTotal is untouched');
  it.todo('R12 list() reads rows only; it never touches a table, a line, or an order');
  it.todo('PY-S18 the adapter throws → "ledger unavailable", never a report of zeros. A zeroed day and a broken day must not look alike');
  it.todo('Who-can row 1: a SERVER session may call list() to see what a bill owes; only take, refund and void are 403');
});

describe('app/payments — what PY must never do', () => {
  it.todo('R12 no take, refund or void writes any table document');
  it.todo('R12 no take, refund or void writes any line document');
  it.todo('R3 no code path writes bill.status = paid for a bill with payable 0 — that is BL at issue (PY-S8)');
  it.todo('R3 no code path writes any bill field other than status, paidTotal, paidAt, paidBy');
  it.todo('PY-S8 a take against a payable-0 bill is refused before any write');
});
