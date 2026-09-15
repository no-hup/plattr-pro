// BL · onCall wrappers. Exported from index.js as `billing-preview`, `billing-issue`, `billing-cancel`,
// `billing-creditNote`, `billing-split`, `billing-get`. Parse the body, call app, map errors. Nothing here logs the body.
import { ApprovalError, cancel, creditNote, get, issue, preview, split } from '../app/billing';
import { ports } from '../adapters/firestore/billing';

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

export const previewHandler = wrap('billing-preview', 'Preview', d => preview(ports, d));
export const issueHandler = wrap('billing-issue', 'Issued', d => issue(ports, d));
export const cancelHandler = wrap('billing-cancel', 'Cancelled', d => cancel(ports, d));
export const creditNoteHandler = wrap('billing-creditNote', 'Credit note issued', d => creditNote(ports, d));
export const splitHandler = wrap('billing-split', 'Split', d => split(ports, d));
export const getHandler = wrap('billing-get', 'Bill', d => get(ports, d));
