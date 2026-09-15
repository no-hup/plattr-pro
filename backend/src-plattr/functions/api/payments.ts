// PY · onCall wrappers. Exported from index.js as payments-take / -refund / -void / -list.
// The trust boundary: integers only, no rounding, the server owns every computed number.
// The PIN arrives once in the body and is handed straight to app; nothing here logs the body.
import { take, refund, voidRow, list, PaymentError } from '../app/payments';
import { ports } from '../adapters/firestore/payments';

/* eslint-disable @typescript-eslint/no-var-requires */
const functions = require('firebase-functions');
const errorHandler = require('../../singleton/ErrorHandler');

type Body = Record<string, unknown>;

// R14/R3: the server owns these. Present in a body, they are dropped before app sees them.
const SERVER_OWNED = ['at', 'by', 'businessDate', 'status', 'paidTotal', 'paidAt', 'paidBy', 'change', 'overpaid', 'void', 'cid'];
const KEEP: Record<string, string[]> = {
  take: ['restaurantId', 'sessionId', 'billId', 'paymentId', 'tenderId', 'amount', 'tendered', 'captured', 'ref'],
  refund: ['restaurantId', 'sessionId', 'billId', 'paymentId', 'tenderId', 'amount', 'creditNoteId', 'refundsPaymentId', 'reason', 'note', 'pin'],
  void: ['restaurantId', 'sessionId', 'paymentId', 'reason', 'note', 'pin'],
  list: ['restaurantId', 'sessionId', 'billId', 'businessDate'],
};

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const bad = (msg: string): never => { errorHandler.badRequest(msg); throw new Error('unreachable'); };

/** R13: the till's id is the document id, so it must be one Firestore accepts. */
function checkPaymentId(v: unknown): void {
  if (typeof v !== 'string' || v === '') bad('paymentId required; the server never generates one');
  const id = v as string;
  if (id.length > 1500 || id.includes('/') || id === '.' || id === '..' || /^__.*__$/.test(id)) bad('paymentId is not a legal document id');
}

export function shape(op: keyof typeof KEEP, data: unknown): Body {
  if (!data || typeof data !== 'object') bad('Invalid request format - missing data');
  const raw = data as Body;
  // A self-INCONSISTENT triple is the one thing the client's numbers can prove; R8 recomputes the rest.
  if (op === 'take' && isInt(raw.amount) && isInt(raw.tendered) && isInt(raw.change) && (raw.tendered as number) - (raw.change as number) !== raw.amount) {
    bad('tendered − change must equal amount');
  }
  const body: Body = {};
  for (const k of KEEP[op]) if (k in raw && !SERVER_OWNED.includes(k)) body[k] = raw[k];
  for (const k of ['amount', 'tendered']) if (k in body && !isInt(body[k])) bad(`${k} must be a non-negative integer in minor units`);
  if ('captured' in body && typeof body.captured !== 'boolean') bad('captured must be a boolean');
  if (op === 'take' || op === 'refund') checkPaymentId(body.paymentId);
  if (op === 'take' && raw.creditNoteId != null) bad('A take never reverses a credit note');   // read raw: KEEP has already dropped it
  if (op === 'refund' && (body.creditNoteId != null) === (body.refundsPaymentId != null)) bad('Name exactly one of creditNoteId or refundsPaymentId');
  if (op === 'void') checkPaymentId(body.paymentId);
  return body;
}

function wrap<T>(op: keyof typeof KEEP, run: (body: Body) => Promise<T>, label: string) {
  return functions.https.onCall(async (request: { data?: unknown }) => {
    const body = shape(op, request?.data);
    try {
      return { status: 'success', message: label, data: await run(body) };
    } catch (e) {
      if (e instanceof PaymentError) errorHandler.throwError(e.code, e.message, e.details);
      errorHandler.handleError(e, `payments-${op}`);
    }
  });
}

export const takeHandler = wrap('take', b => take(ports, b as never), 'Payment recorded');
export const refundHandler = wrap('refund', b => refund(ports, b as never), 'Refund recorded');
export const voidHandler = wrap('void', b => voidRow(ports, b as never), 'Payment voided');
export const listHandler = wrap('list', b => list(ports, b as never), 'Payments');
