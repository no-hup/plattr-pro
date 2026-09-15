// ST · onCall wrapper. Exported from index.js as `approvals-apply`. Parses the body, calls app, maps errors.
// The PIN arrives once in the body and is handed straight to app; nothing here logs the body.
import { apply, ApprovalError } from '../app/approvals';
import { ports } from '../adapters/firestore/approvals';

/* eslint-disable @typescript-eslint/no-var-requires */
const functions = require('firebase-functions');
const errorHandler = require('../../singleton/ErrorHandler');

export const applyHandler = functions.https.onCall(async (request: { data?: Record<string, unknown> }) => {
  const data = request?.data;
  if (!data || typeof data !== 'object') errorHandler.badRequest('Invalid request format - missing data');
  try {
    const result = await apply(ports, data as never);
    return { status: 'success', message: 'Applied', data: result };
  } catch (e) {
    if (e instanceof ApprovalError) errorHandler.throwError(e.code, e.message, e.details);
    errorHandler.handleError(e, 'approvals-apply');
  }
});
