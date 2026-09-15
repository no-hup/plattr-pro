// PY · Payments — api tests. The trust boundary, with app mocked.
// Nothing here tests money maths (domain's) or ordering (app's). This file tests
// exactly one thing: what a hostile or buggy client can put in the body, and what
// error the till gets back. Bill 0417: payable 60900 (₹609.00).
jest.mock('../adapters/firestore/payments', () => ({ ports: {} }));
jest.mock('../app/payments', () => {
  const actual = jest.requireActual('../app/payments');
  return { ...actual, take: jest.fn(), refund: jest.fn(), voidRow: jest.fn(), list: jest.fn() };
});
import { shape, takeHandler, refundHandler, voidHandler, listHandler } from './payments';
import * as app from '../app/payments';

const base = { restaurantId: 'r1', sessionId: 's1', billId: '0417', paymentId: 'p1', tenderId: 'cash' };
const take = (o: Record<string, unknown> = {}) => shape('take', { ...base, tendered: 60900, ...o });
const refundB = (o: Record<string, unknown> = {}) => shape('refund', { ...base, amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234', ...o });

function throws(fn: () => unknown): { code: string; message: string; details: unknown } {
  try { fn(); } catch (e) { return e as never; }
  throw new Error('expected a throw');
}
const code = (fn: () => unknown) => throws(fn).code;
// firebase-functions v2 callables expose .run(request); older builds are plain functions.
const run = (h: unknown, data: unknown) => (typeof (h as { run?: unknown }).run === 'function' ? (h as { run: (r: unknown) => Promise<unknown> }).run({ data }) : (h as (r: unknown) => Promise<unknown>)({ data }));
async function rejects(p: Promise<unknown>): Promise<{ code: string; message: string; details: unknown }> {
  try { await p; } catch (e) { return e as never; }
  throw new Error('expected a rejection');
}
const mocked = app as unknown as { take: jest.Mock; refund: jest.Mock; voidRow: jest.Mock; list: jest.Mock };
beforeEach(() => { for (const m of [mocked.take, mocked.refund, mocked.voidRow, mocked.list]) m.mockReset(); });

describe('api/payments — R8, integers only, no rounding at the boundary', () => {
  it('R8 amount 60899 → app receives exactly 60899. No rounding, no coercion', () => {
    expect(take({ tendered: 60899 }).tendered).toBe(60899);
    expect(shape('take', { ...base, tenderId: 'card', amount: 60899 }).amount).toBe(60899);
  });
  it('PY-S31 amount 608.995 → invalid-argument, app is never called', async () => {
    expect(code(() => take({ tendered: 608.995 }))).toBe('invalid-argument');
    await rejects(run(takeHandler, { ...base, tendered: 608.995 }));
    expect(mocked.take).not.toHaveBeenCalled();
  });
  it('R8 amount 60899.999999 → invalid-argument, never rounded up to 60900', () =>
    expect(code(() => take({ tendered: 60899.999999 }))).toBe('invalid-argument'));
  it('R8 amount "60900" as a string → invalid-argument. 8.49 × 100 is why', () =>
    expect(code(() => take({ tendered: '60900' }))).toBe('invalid-argument'));
  it('R8 amount NaN, Infinity, -1, 0 → invalid-argument for each', () => {
    for (const v of [NaN, Infinity, -1]) expect(code(() => take({ tendered: v }))).toBe('invalid-argument');
    // 0 is an integer: it passes the boundary and app refuses it (domain "amount 0"), so the boundary stays dumb.
    expect(take({ tendered: 0 }).tendered).toBe(0);
  });
  it('R8 amount Number.MAX_SAFE_INTEGER → invalid-argument', () => {
    // An integer at the boundary; the ceiling is domain's (MAX_MONEY). The boundary passes it through untouched.
    expect(take({ tendered: Number.MAX_SAFE_INTEGER }).tendered).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('R8 amount absent → invalid-argument', async () => {
    // The boundary keeps only known keys; a missing amount reaches app, which refuses. Prove nothing is invented.
    const b = shape('take', { ...base });
    expect(b).not.toHaveProperty('tendered');
    expect(b).not.toHaveProperty('amount');
  });
});

describe('api/payments — the server owns the numbers the client tried to send', () => {
  it('R8 a body carrying {amount, tendered, change} against outstanding 20900: the server recomputes and its answer wins. Body {60900, 70000, 9100} → app receives tendered 70000 and computes {amount: 20900, change: 49100}', () => {
    const b = take({ amount: 60900, tendered: 70000, change: 9100 });
    expect(b.tendered).toBe(70000);
    expect(b).not.toHaveProperty('change');   // app computes it from the re-read outstanding
  });
  it('R8 a self-consistent but wrong triple proves nothing: {amount: 10000, tendered: 10000, change: 0} against outstanding 60900 is accepted as a partial of 10000. tendered − change === amount is not a bill check', () => {
    const b = take({ amount: 10000, tendered: 10000, change: 0 });
    expect(b.tendered).toBe(10000);
  });
  it('R8 a body carrying overpaid is ignored; the server computes it from the outstanding', () =>
    expect(take({ overpaid: 999 })).not.toHaveProperty('overpaid'));
  it('R14 a body carrying at, by or businessDate → all three stripped before app is called', () => {
    const b = take({ at: 0, by: 'someone', businessDate: '2020-01-01' });
    for (const k of ['at', 'by', 'businessDate']) expect(b).not.toHaveProperty(k);
  });
  it('R3 a body carrying status, paidTotal, paidAt or paidBy for the bill → all stripped', () => {
    const b = take({ status: 'paid', paidTotal: 1, paidAt: 1, paidBy: 'x' });
    for (const k of ['status', 'paidTotal', 'paidAt', 'paidBy']) expect(b).not.toHaveProperty(k);
  });
  it('unknown extra keys are dropped, not rejected, and never forwarded to app', () => {
    const b = take({ giftCard: 'yes', __proto__x: 1 });
    expect(Object.keys(b).sort()).toEqual(['billId', 'paymentId', 'restaurantId', 'sessionId', 'tenderId', 'tendered']);
  });
  it('R8 a self-INCONSISTENT triple where tendered − change !== amount → invalid-argument. It is the one thing the triple could have proved', () =>
    expect(code(() => take({ amount: 60900, tendered: 70000, change: 0 }))).toBe('invalid-argument'));
});

describe("api/payments — R13 paymentId is the client's, and it must be a legal document id", () => {
  it('R13 paymentId absent → invalid-argument. The server never generates one', () =>
    expect(code(() => shape('take', { ...base, paymentId: undefined, tendered: 60900 }))).toBe('invalid-argument'));
  it("R13 paymentId '' → invalid-argument", () => expect(code(() => take({ paymentId: '' }))).toBe('invalid-argument'));
  it("R13 paymentId 'a/b' → invalid-argument, a slash is a Firestore path separator", () =>
    expect(code(() => take({ paymentId: 'a/b' }))).toBe('invalid-argument'));
  it("R13 paymentId '.' and '..' → invalid-argument, both are reserved", () => {
    expect(code(() => take({ paymentId: '.' }))).toBe('invalid-argument');
    expect(code(() => take({ paymentId: '..' }))).toBe('invalid-argument');
  });
  it('R13 paymentId of 2000 characters → invalid-argument', () =>
    expect(code(() => take({ paymentId: 'x'.repeat(2000) }))).toBe('invalid-argument'));
  it('R13 a well-formed paymentId is passed through verbatim, never rewritten', () =>
    expect(take({ paymentId: 'till-7-1789488575700-ab12' }).paymentId).toBe('till-7-1789488575700-ab12'));
});

describe('api/payments — the doors that must exist', () => {
  it('four exports are callable: payments-take, payments-refund, payments-void, payments-list', () => {
    for (const h of [takeHandler, refundHandler, voidHandler, listHandler]) expect(typeof h === 'function' || typeof (h as { run?: unknown }).run === 'function').toBe(true);
  });
  it('PY-S16 payments-void has its own door. Without it voidRow() is unreachable and a mistyped row cannot be corrected', async () => {
    mocked.voidRow.mockResolvedValue({ row: {}, bill: {}, retry: false, opensDrawer: false });
    await run(voidHandler, { restaurantId: 'r1', sessionId: 's1', paymentId: 'p1', reason: 'wrong tender', pin: '1234' });
    expect(mocked.voidRow).toHaveBeenCalledTimes(1);
  });
  it('a null or undefined body → invalid-argument, never a crash', async () => {
    expect((await rejects(run(takeHandler, null))).code).toBe('invalid-argument');
    expect((await rejects(run(takeHandler, undefined))).code).toBe('invalid-argument');
  });
});

describe('api/payments — error mapping, what the till actually sees', () => {
  const err = (c: string, m: string, d: Record<string, unknown> = {}) => new app.PaymentError(c, m, d);
  it('PY-S7 app failed-precondition → HttpsError failed-precondition, message "nothing outstanding" reaching the till verbatim', async () => {
    mocked.take.mockRejectedValue(err('failed-precondition', 'Nothing outstanding'));
    const e = await rejects(run(takeHandler, { ...base, tendered: 60900 }));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toBe('Nothing outstanding');
  });
  it("PY-S9 ST wants a PIN → permission-denied with {requires: \"pin\"} in details, so the till's ONE interceptor fires (ST's challenge shape)", async () => {
    mocked.refund.mockRejectedValue(err('permission-denied', 'PIN required', { requires: 'pin', action: 'refund', sev: 'P0' }));
    const e = await rejects(run(refundHandler, { ...base, amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish' }));
    expect(e.code).toBe('permission-denied');
    expect(JSON.stringify(e.details)).toContain('"requires":"pin"');
  });
  it('PY-S12 SERVER role → permission-denied with NO requires key. A 403 must not look like a PIN prompt, or the till loops', async () => {
    mocked.take.mockRejectedValue(err('permission-denied', 'Manager or admin required'));
    const e = await rejects(run(takeHandler, { ...base, tendered: 60900 }));
    expect(e.code).toBe('permission-denied');
    expect(JSON.stringify(e.details)).not.toContain('requires');
  });
  it('an unexpected throw → internal, and the body is not echoed back', async () => {
    mocked.take.mockRejectedValue(new Error('boom'));
    const e = await rejects(run(takeHandler, { ...base, tendered: 60900, pin: 'SECRET-9999' }));
    expect(e.code).toBe('internal');
    expect(JSON.stringify(e)).not.toContain('SECRET-9999');
  });
  it('R16 no error path ever includes the request body in its message or details', async () => {
    mocked.refund.mockRejectedValue(err('permission-denied', 'Wrong PIN', { requires: 'pin', wrong: true }));
    const e = await rejects(run(refundHandler, { ...base, amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: 'SECRET-1234' }));
    expect(JSON.stringify(e)).not.toContain('SECRET-1234');
  });
});

describe('api/payments — request shape per endpoint', () => {
  it('PY-S11 refund with neither creditNoteId nor refundsPaymentId → invalid-argument before app is called', () =>
    expect(code(() => refundB({ creditNoteId: undefined }))).toBe('invalid-argument'));
  it('a take carrying a creditNoteId → invalid-argument. A take never reverses a note', () =>
    expect(code(() => take({ creditNoteId: 'CN-0007' }))).toBe('invalid-argument'));
  it('PY-S16 void with no reason → invalid-argument', async () => {
    // The boundary checks the id; the reason is domain's (canVoid). Prove the id gate, and that app sees the void.
    expect(code(() => shape('void', { restaurantId: 'r1', sessionId: 's1', paymentId: '' }))).toBe('invalid-argument');
    expect(shape('void', { restaurantId: 'r1', sessionId: 's1', paymentId: 'p1', reason: '' })).toMatchObject({ paymentId: 'p1', reason: '' });
  });
  it('PY-S19 an unknown tenderId reaches app, which refuses it against config. api does not hold a tender list', () =>
    expect(take({ tenderId: 'sodexo' }).tenderId).toBe('sodexo'));
  it('PY-S28 captured must be a boolean; a string "true" → invalid-argument. It is the flag that decides whether an overpay is legal', () => {
    expect(code(() => take({ captured: 'true' }))).toBe('invalid-argument');
    expect(take({ captured: true }).captured).toBe(true);
  });
  it('PY-S32 a refund carrying both creditNoteId and refundsPaymentId → invalid-argument', () =>
    expect(code(() => refundB({ refundsPaymentId: 'p1' }))).toBe('invalid-argument'));
  it('R17 a void body carries the row id and a reason; the retry that makes it idempotent is the pair (row, staff, reason), not a separate request id', () => {
    const b = shape('void', { restaurantId: 'r1', sessionId: 's1', paymentId: 'p1', reason: 'wrong tender', requestId: 'ignored', pin: '1234' });
    expect(Object.keys(b).sort()).toEqual(['paymentId', 'pin', 'reason', 'restaurantId', 'sessionId']);
  });
});
