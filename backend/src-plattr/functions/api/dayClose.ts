// DC · onCall wrappers. Exported from index.js as dayClose-close / -get / -move / -voidMove.
// The trust boundary: integers only, no rounding, the server owns every computed number.
// The PIN arrives once in the body and is handed straight to app; nothing here logs the body.
import { close, get, move, voidMove, DayCloseError } from '../app/dayClose';
import { ports } from '../adapters/firestore/dayClose';

/* eslint-disable @typescript-eslint/no-var-requires */
const functions = require('firebase-functions');
const errorHandler = require('../../singleton/ErrorHandler');

type Body = Record<string, unknown>;

// R8/R9: the server owns these. Present in a body, they are dropped before app sees them.
// `businessDate` survives on close and get because there it is the INPUT (which day), not a stamp.
const SERVER_OWNED = ['closed', 'closedAt', 'closedBy', 'expectedCash', 'difference', 'openingFloat', 'at', 'by', 'void'];
const KEEP: Record<string, string[]> = {
  close: ['restaurantId', 'sessionId', 'businessDate', 'countedCash', 'countedByTender', 'leftInDrawer', 'note', 'pin'],
  get: ['restaurantId', 'sessionId', 'businessDate'],
  move: ['restaurantId', 'sessionId', 'movementId', 'kind', 'amount', 'reason', 'note', 'pin'],
  voidMove: ['restaurantId', 'sessionId', 'movementId', 'reason', 'note', 'pin'],
};

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const bad = (msg: string): never => { errorHandler.badRequest(msg); throw new Error('unreachable'); };

/** R13: the till's id is the document id, so it must be one Firestore accepts. */
function checkMovementId(v: unknown): void {
  if (typeof v !== 'string' || v === '') bad('movementId required; the server never generates one');
  const id = v as string;
  if (id.length > 1500 || id.includes('/') || id === '.' || id === '..' || /^__.*__$/.test(id)) bad('movementId is not a legal document id');
}

export function shape(op: keyof typeof KEEP, data: unknown): Body {
  if (!data || typeof data !== 'object') bad('Invalid request format - missing data');
  const raw = data as Body;
  const body: Body = {};
  for (const k of KEEP[op]) if (k in raw && !SERVER_OWNED.includes(k)) body[k] = raw[k];
  for (const k of ['countedCash', 'leftInDrawer', 'amount']) if (k in body && !isInt(body[k])) bad(`${k} must be a non-negative integer in minor units`);
  if ('countedByTender' in body) {
    const c = body.countedByTender;
    if (!c || typeof c !== 'object' || Array.isArray(c)) bad('countedByTender must be an object keyed by tender id');
    for (const [k, v] of Object.entries(c as Body)) if (!isInt(v)) bad(`countedByTender.${k} must be a non-negative integer in minor units`);
  }
  if (op === 'close' && !isInt(body.countedCash)) bad('countedCash is required, as a non-negative integer in minor units');
  if (op === 'move' || op === 'voidMove') checkMovementId(body.movementId);
  return body;
}

function wrap<T>(op: keyof typeof KEEP, run: (body: Body) => Promise<T>, label: string) {
  return functions.https.onCall(async (request: { data?: unknown }) => {
    const body = shape(op, request?.data);
    try {
      return { status: 'success', message: label, data: await run(body) };
    } catch (e) {
      if (e instanceof DayCloseError) errorHandler.throwError(e.code, e.message, e.details);
      errorHandler.handleError(e, `dayClose-${op}`);
    }
  });
}

export const closeHandler = wrap('close', b => close(ports, b as never), 'Day closed');
export const getHandler = wrap('get', b => get(ports, b as never), 'Day');
export const moveHandler = wrap('move', b => move(ports, b as never), 'Drawer movement recorded');
export const voidMoveHandler = wrap('voidMove', b => voidMove(ports, b as never), 'Drawer movement voided');
