const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const environment = require('../singleton/Environment');

/**
 * Lists all restaurants for local development tooling.
 * Excluded from production by guarding on the emulator environment.
 */
const listRestaurants = functions.https.onCall(async (_, context) => {
  if (!environment.isEmulator()) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'listRestaurants is available only in emulator/development environments.'
    );
  }

  try {
    const snapshot = await db.collection('restaurants').get();
    const restaurants = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const restaurantData = doc.data() || {};
        const tablesSnapshot = await doc.ref.collection('tables').get();
        const tables = tablesSnapshot.docs.map((tableDoc) => {
          const tableData = tableDoc.data() || {};
          return {
            id: tableDoc.id,
            label: tableData.number || tableData.name || tableDoc.id,
            status: tableData.status || 'unknown',
          };
        });

        return {
          id: doc.id,
          name: restaurantData.name || doc.id,
          address: restaurantData.address || '',
          phone: restaurantData.phone || '',
          tables,
        };
      })
    );

    return {
      status: 'success',
      message: 'Restaurants fetched successfully',
      data: {
        restaurants,
      },
    };
  } catch (error) {
    console.error('[dev][listRestaurants] Failed to fetch restaurants', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch restaurants for development tooling.'
    );
  }
});

module.exports = {
  listRestaurants,
};
