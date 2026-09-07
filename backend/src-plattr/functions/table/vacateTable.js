const { db } = require('../admin/admin');
const sessionService = require('../session/sessionService');
const timestamp = require('../utils/timestamp');

/**
 * Reset a table to vacant: clear the party's state and end its sessions.
 * Shared by the waiter's manual "Vacant" (table-updateTableStatus) and by
 * order-updateOrderStatus → COMPLETED, so paying the bill frees the table.
 */
async function vacateTable(restaurantId, tableId) {
  await db.collection('restaurants').doc(restaurantId).collection('tables').doc(tableId).update({
    status: 'vacant',
    primaryCustomer: null,
    occupiedBy: [],
    activeOrderId: null,
    currentOTP: null,
    lastUpdated: timestamp.serverTimestamp(),
  });
  try {
    await sessionService.endTableSessions(restaurantId, tableId);
  } catch (sessionError) {
    // The table is already vacant; a session-end failure must not undo that.
    console.error(`vacateTable: error ending sessions for table ${tableId}: ${sessionError.message}`);
  }
}

module.exports = { vacateTable };
