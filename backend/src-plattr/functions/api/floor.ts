// FL · onCall wrappers. Exported from index.js as `floor-get`, `floor-open`, `floor-clear`
// and `table-moveTable` (OR-4's name: move is a table verb and belongs in that family).
// Parse the body, call app, map errors. Nothing here logs the body.
import { ApprovalError, clearTable, getFloor, moveTable, openTable, setMerge, releaseIdleEverywhere } from '../app/floor';
import { ports } from '../adapters/firestore/floor';
import { onSchedule } from 'firebase-functions/v2/scheduler';

/* eslint-disable @typescript-eslint/no-var-requires */
const functions = require('firebase-functions');
const errorHandler = require('../../singleton/ErrorHandler');
const environment = require('../../singleton/Environment');

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

// ── FL-S36 · the sweep that frees the table nobody cleared (TD-044) ─────────

/**
 * Every five minutes, not one: the threshold is an hour and the candidate read is the bill.
 * `maxInstances: 1` and no retry, because each sitting is re-read in its own transaction and a
 * missed sweep is caught by the next one. This is its own schedule, not a shared "housekeeping"
 * door — a print sweep, when it exists, has its own cadence and its own failure domain.
 */
export const releaseIdleTables = onSchedule(
  { schedule: 'every 5 minutes', maxInstances: 1, retryCount: 0 },
  async () => { await releaseIdleEverywhere(ports); },
);

/**
 * The emulator registers a schedule and never fires it, so the e2e suite calls the same sweep
 * through this door. It keeps the old `table-cleanupInactiveSessions` name and its guard: an
 * unauthenticated cross-tenant mutation has no business answering outside the emulator.
 */
export const idleSweepHandler = functions.https.onCall(async () => {
  if (!environment.isEmulator()) errorHandler.forbidden('cleanupInactiveSessions is emulator-only', {});
  const reports = await releaseIdleEverywhere(ports);
  return { status: 'success', message: 'Idle tables swept', data: { reports } };
});
