const { db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');

const tablesRef = (restaurantId) =>
  db.collection('restaurants').doc(restaurantId).collection('tables');

/**
 * Two tables pushed together are one table to the guest. The child keeps its own
 * printed QR code, so someone scanning table 6 has to land in table 5's session,
 * table 5's cart and table 5's order. Every guest-facing endpoint runs the scanned
 * id through here first.
 *
 * Staff endpoints deliberately do NOT resolve — a waiter assigning, disabling or
 * vacating table 6 means the real table 6.
 *
 * Merges are one level deep by design (table-setMerge refuses to make a child a
 * parent), so this is a single hop and can never loop.
 */
async function resolveTableId(restaurantId, tableId) {
  if (!restaurantId || !tableId) return tableId;
  const doc = await tablesRef(restaurantId).doc(tableId).get();
  return (doc.exists && doc.data().mergedInto) || tableId;
}

/**
 * Release every table merged into this one, and say which ones were released.
 *
 * Called whenever the parent is vacated — the bill being paid, or a waiter tapping
 * Vacant — so a merge never outlives the party that needed it. Waiting for a human
 * to confirm is the worse failure: the child would stay disabled, still pointing at
 * a table nobody is sitting at, and the next guest to scan it would land in a dead
 * session.
 */
async function unmergeChildren(restaurantId, parentTableId) {
  const children = await tablesRef(restaurantId)
    .where('mergedInto', '==', parentTableId)
    .get();
  if (children.empty) return [];

  const batch = db.batch();
  children.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'vacant',
      mergedInto: null,
      mergedBy: null,
      lastUpdated: timestamp.serverTimestamp(),
    });
  });
  await batch.commit();

  return children.docs.map((doc) => doc.id);
}

module.exports = { resolveTableId, unmergeChildren };
