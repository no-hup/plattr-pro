// PY · Payments — api tests. The trust boundary, with app mocked.
// Nothing here tests money maths (domain's) or ordering (app's). This file tests
// exactly one thing: what a hostile or buggy client can put in the body, and what
// error the till gets back. Bill 0417: payable 60900 (₹609.00).
// SKELETON: the import below is restored in phase 3 when the module lands. `it.todo` bodies
// reference nothing, so commenting it keeps `make check` green while the list is reviewed.
// import { takeHandler, refundHandler, voidHandler, listHandler } from './payments';

describe('api/payments — R8, integers only, no rounding at the boundary', () => {
  it.todo('R8 amount 60899 → app receives exactly 60899. No rounding, no coercion');
  it.todo('PY-S31 amount 608.995 → invalid-argument, app is never called');
  it.todo('R8 amount 60899.999999 → invalid-argument, never rounded up to 60900');
  it.todo('R8 amount "60900" as a string → invalid-argument. 8.49 × 100 is why');
  it.todo('R8 amount NaN, Infinity, -1, 0 → invalid-argument for each');
  it.todo('R8 amount Number.MAX_SAFE_INTEGER → invalid-argument');
  it.todo('R8 amount absent → invalid-argument');
});

describe('api/payments — the server owns the numbers the client tried to send', () => {
  it.todo('R8 a body carrying {amount, tendered, change} against outstanding 20900: the server recomputes and its answer wins. Body {60900, 70000, 9100} → app receives tendered 70000 and computes {amount: 20900, change: 49100}');
  it.todo('R8 a self-consistent but wrong triple proves nothing: {amount: 10000, tendered: 10000, change: 0} against outstanding 60900 is accepted as a partial of 10000. tendered − change === amount is not a bill check');
  it.todo('R8 a body carrying overpaid is ignored; the server computes it from the outstanding');
  it.todo('R14 a body carrying at, by or businessDate → all three stripped before app is called');
  it.todo('R3 a body carrying status, paidTotal, paidAt or paidBy for the bill → all stripped');
  it.todo('unknown extra keys are dropped, not rejected, and never forwarded to app');
  it.todo('R8 a self-INCONSISTENT triple where tendered − change !== amount → invalid-argument. It is the one thing the triple could have proved');
});

describe('api/payments — R13 paymentId is the client\'s, and it must be a legal document id', () => {
  it.todo('R13 paymentId absent → invalid-argument. The server never generates one');
  it.todo("R13 paymentId '' → invalid-argument");
  it.todo("R13 paymentId 'a/b' → invalid-argument, a slash is a Firestore path separator");
  it.todo("R13 paymentId '.' and '..' → invalid-argument, both are reserved");
  it.todo('R13 paymentId of 2000 characters → invalid-argument');
  it.todo('R13 a well-formed paymentId is passed through verbatim, never rewritten');
});

describe('api/payments — the doors that must exist', () => {
  it.todo('four exports are callable: payments-take, payments-refund, payments-void, payments-list');
  it.todo('PY-S16 payments-void has its own door. Without it voidRow() is unreachable and a mistyped row cannot be corrected');
  it.todo('a null or undefined body → invalid-argument, never a crash');
});

describe('api/payments — error mapping, what the till actually sees', () => {
  it.todo('PY-S7 app failed-precondition → HttpsError failed-precondition, message "nothing outstanding" reaching the till verbatim');
  it.todo('PY-S9 ST wants a PIN → permission-denied with {requires: "pin"} in details, so the till\'s ONE interceptor fires (ST\'s challenge shape)');
  it.todo('PY-S12 SERVER role → permission-denied with NO requires key. A 403 must not look like a PIN prompt, or the till loops');
  it.todo('an unexpected throw → internal, and the body is not echoed back');
  it.todo('R16 no error path ever includes the request body in its message or details');
});

describe('api/payments — request shape per endpoint', () => {
  it.todo('PY-S11 refund with neither creditNoteId nor refundsPaymentId → invalid-argument before app is called');
  it.todo('a take carrying a creditNoteId → invalid-argument. A take never reverses a note');
  it.todo('PY-S16 void with no reason → invalid-argument');
  it.todo('PY-S19 an unknown tenderId reaches app, which refuses it against config. api does not hold a tender list');
  it.todo('PY-S28 captured must be a boolean; a string "true" → invalid-argument. It is the flag that decides whether an overpay is legal');
  it.todo('PY-S32 a refund carrying both creditNoteId and refundsPaymentId → invalid-argument');
  it.todo('R17 a void body carries the row id and a reason; the retry that makes it idempotent is the pair (row, staff, reason), not a separate request id');
});
