// OR-S1 / OR-S19 / OR-S22: staff open a table with no QR scan. The staff session is the key; the
// answer is the TABLE session the cart endpoints want (cart-addItemToCart, cart-checkoutCart both
// take the table's own sessionId). Occupied table → the live sitting, extended, never a second
// session (one table, one bill). Covers is optional and only stamped when given (D4, 2026-09-20).
const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const sessionService = require('../session/sessionService');
const { validateStaffSession } = require('../adminApp/auth');
const { resolveTableId } = require('./mergedTables');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const timestamp = require('../utils/timestamp');

const SESSION_MS = 4 * 60 * 60 * 1000; // DEBT(TD-049): same literal as sessionService.js; ordering.sessionHours when someone asks

const openTable = functions.https.onCall(async (request) => {
  const data = request?.data || {};
  try {
    const { restaurantId, sessionId, covers } = data;
    if (!restaurantId || !data.tableId) errorHandler.badRequest('restaurantId and tableId are required', {});
    if (covers !== undefined && covers !== null && !(Number.isInteger(covers) && covers >= 1 && covers <= 99)) {
      errorHandler.badRequest('covers must be a whole number from 1 to 99', { covers });
    }
    const { serverId } = await validateStaffSession(restaurantId, sessionId);
    const openedBy = `staff:${serverId}`;

    // A merged child opens its parent's sitting, the same way the cart does.
    const tableId = await resolveTableId(restaurantId, data.tableId);
    const tableRef = db.collection('restaurants').doc(restaurantId).collection('tables').doc(tableId);
    const tableDoc = await tableRef.get();
    if (!tableDoc.exists) errorHandler.notFound('Table not found', { restaurantId, tableId });
    const table = tableDoc.data();
    if (String(table.status || '').toLowerCase() === 'disabled') {
      errorHandler.preconditionFailed('Table is disabled', { tableId });
    }

    // OR-S22: already seated → that sitting. OR-S19: a long dinner is extended, not re-minted.
    const live = await sessionService.validateTableSession(restaurantId, tableId, { throwError: false });
    if (live) {
      const patch = { expiresAt: timestamp.fromDate(new Date(Date.now() + SESSION_MS)), updatedAt: timestamp.serverTimestamp() };
      if (covers && !live.covers) patch.covers = covers;
      await db.collection('restaurants').doc(restaurantId).collection('sessions').doc(live.id).update(patch);
      return ResponseBuilder.success({ tableId, sessionId: live.id, created: false, addedBy: openedBy, covers: live.covers ?? covers ?? null }, 'Table already open');
    }

    const session = await sessionService.createOrGetTableSession(restaurantId, tableId, openedBy);
    const sessionPatch = { openedBy, ...(covers ? { covers } : {}) };
    await db.collection('restaurants').doc(restaurantId).collection('sessions').doc(session.id).update(sessionPatch);
    await tableRef.update({ status: 'active', openedBy, lastActivity: timestamp.serverTimestamp() });
    return ResponseBuilder.success({ tableId, sessionId: session.id, created: true, addedBy: openedBy, covers: covers ?? null }, 'Table opened');
  } catch (error) {
    console.error('Error in openTable:', error);
    errorHandler.handleError(error, 'openTable', { restaurantId: data.restaurantId, tableId: data.tableId });
  }
});

module.exports = { openTable };
