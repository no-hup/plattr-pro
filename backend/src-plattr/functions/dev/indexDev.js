const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const environment = require('../singleton/Environment');
const { withCors } = require('../utils/cors');

/**
 * Lists all restaurants for local development tooling.
 * Excluded from production by guarding on the emulator environment.
 * 
 * Uses onRequest instead of onCall for Flutter web CORS compatibility.
 */
const listRestaurants = functions.https.onRequest(withCors(async (req, res) => {
  // Only allow in emulator mode
  if (!environment.isEmulator()) {
    res.status(403).json({
      result: {
        status: 'error',
        message: 'listRestaurants is available only in emulator/development environments.',
        data: { code: 'permission-denied' }
      }
    });
    return;
  }

  // Only allow POST (like onCall would)
  if (req.method !== 'POST') {
    res.status(405).json({
      result: {
        status: 'error',
        message: 'Method not allowed. Use POST.',
        data: { code: 'invalid-argument' }
      }
    });
    return;
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

    // Return in callable function format (wrapped in 'result')
    res.status(200).json({
      result: {
        status: 'success',
        message: 'Restaurants fetched successfully',
        data: {
          restaurants,
        },
      }
    });
  } catch (error) {
    console.error('[dev][listRestaurants] Failed to fetch restaurants', error);
    res.status(500).json({
      result: {
        status: 'error',
        message: 'Failed to fetch restaurants for development tooling.',
        data: { code: 'internal' }
      }
    });
  }
}));

module.exports = {
  listRestaurants,
};

