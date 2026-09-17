// FL · onCall wrappers. Exported from index.js as `floor-get`, `floor-open`, `floor-clear`
// and `table-moveTable` (OR-4's name: move is a table verb and belongs in that family).
// Parse the body, call app, map errors. Nothing here logs the body.
import { ApprovalError, clearTable, getFloor, moveTable, openTable, setMerge } from '../app/floor';
import { ports } from '../adapters/firestore/floor';

/* eslint-disable @typescript-eslint/no-var-requires */
const functions = require('firebase-functions');
const errorHandler = require('../../singleton/ErrorHandler');

const wrap = (name: string, message: string, fn: (data: never) => Promise<unknown>) =>
  functions.https.onCall(async (request: { data?: Record<string, unknown> }) => {
    const data = request?.data;
    if (!data || typeof data !== 'object') errorHandler.badRequest('Invalid request format - missing data');
    try {
      return { status: 'success', message, data: await fn(data as never) };
    } catch (e) {
      if (e instanceof ApprovalError) errorHandler.throwError(e.code, e.message, e.details);
      errorHandler.handleError(e, name);
    }
  });

export const getHandler = wrap('floor-get', 'Floor', d => getFloor(ports, d));
export const openHandler = wrap('floor-open', 'Table', d => openTable(ports, d));
export const clearHandler = wrap('floor-clear', 'Cleared', d => clearTable(ports, d));
export const moveHandler = wrap('table-moveTable', 'Moved', d => moveTable(ports, d));

/**
 * `table-setMerge` keeps its own name and its own door; the rules and the transaction moved to
 * one implementation. Staff sessions arrive as `sessionId` on this endpoint, because that is what
 * it shipped with — `staffSessionId` is accepted too, which is what every other FL call uses.
 */
export const setMergeHandler = wrap('table-setMerge', 'Merge updated', (d: never) => {
  const body = d as Record<string, unknown>;
  return setMerge(ports, { ...body, staffSessionId: (body.staffSessionId ?? body.sessionId) as string } as never);
});
