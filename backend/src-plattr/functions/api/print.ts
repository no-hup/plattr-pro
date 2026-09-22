// KT · onCall wrappers. Exported from index.js as `print-pending`, `print-claim`, `print-ack`, `print-fail`,
// `print-status`, `print-reprint`, `print-config`, plus the every-minute sweep `print-sweepJobs` and its
// emulator-only manual trigger `print-sweepNow`. Parse the body, call app, map errors. Nothing here logs the body.
import { ApprovalError, ack, agentConfig, claim, failed, pending, reprint, status, sweepEverywhere } from '../app/print';
import { ports } from '../adapters/firestore/print';
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

export const pendingHandler = wrap('print-pending', 'Pending print jobs', d => pending(ports, d));
export const claimHandler = wrap('print-claim', 'Claimed', d => claim(ports, d));
export const ackHandler = wrap('print-ack', 'Printed', d => ack(ports, d));
export const failHandler = wrap('print-fail', 'Returned to the queue', d => failed(ports, d));
export const statusHandler = wrap('print-status', 'Print status', d => status(ports, d));
export const reprintHandler = wrap('print-reprint', 'Queued', d => reprint(ports, d));
export const configHandler = wrap('print-config', 'Print config', d => agentConfig(ports, d));

/** KT-S23. Its own schedule, its own failure domain (not FL's idle sweep). Names silence; prints nothing. */
export const sweepJobs = onSchedule({ schedule: 'every 1 minutes', maxInstances: 1, retryCount: 0 }, async () => { await sweepEverywhere(ports); });

/** The emulator never fires a schedule, so the e2e suite calls the sweep through this emulator-only door. */
export const sweepNowHandler = functions.https.onCall(async () => {
  if (!environment.isEmulator()) errorHandler.forbidden('print-sweepNow is emulator-only', {});
  return { status: 'success', message: 'Swept', data: { reports: await sweepEverywhere(ports) } };
});
