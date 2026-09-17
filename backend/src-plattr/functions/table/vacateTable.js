const { db } = require('../admin/admin');
const sessionService = require('../session/sessionService');
const timestamp = require('../utils/timestamp');
const { unmergeChildren } = require('./mergedTables');

/**
 * Reset a table to vacant: clear the party's state, release any tables merged into
 * it, and end its sessions.
 *
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
    // Vacant means genuinely free in both directions: this table is nobody's child
    // any more either, so a waiter vacating a merged table doesn't leave it pointing
    // at a parent.
    mergedInto: null,
    mergedBy: null,
    lastUpdated: timestamp.serverTimestamp(),
  });

  // The bill is settled, so the party of eight has gone and table 6 goes back to
  // being table 6. Nobody is asked to confirm — the tables are already empty.
  try {
    const released = await unmergeChildren(restaurantId, tableId);
    if (released.length) {
      console.log(`vacateTable: released ${released.length} table(s) merged into ${tableId}: ${released.join(', ')}`);
    }
  } catch (mergeError) {
    // The table is already vacant; an unmerge failure must not undo that.
    console.error(`vacateTable: error unmerging children of table ${tableId}: ${mergeError.message}`);
  }

  try {
    await sessionService.endTableSessions(restaurantId, tableId);
  } catch (sessionError) {
    // The table is already vacant; a session-end failure must not undo that.
    console.error(`vacateTable: error ending sessions for table ${tableId}: ${sessionError.message}`);
  }
}

module.exports = { vacateTable };
