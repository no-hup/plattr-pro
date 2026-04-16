/**
 * Offer Feature Guard
 * 
 * Helper to check if offers are enabled for a restaurant.
 * Used as a killswitch to disable offers at the restaurant level in production.
 */

const { db } = require('../admin/admin');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Asserts that offers are enabled for the given restaurant.
 * Throws preconditionFailed error if offers are disabled.
 * 
 * @param {string} restaurantId - The restaurant ID to check
 * @throws {HttpsError} If restaurant not found or offers disabled
 */
async function assertOffersEnabled(restaurantId) {
    const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();

    if (!restaurantDoc.exists) {
        errorHandler.notFound('Restaurant not found');
    }

    const restaurant = restaurantDoc.data();

    // Default to true if featureFlags or isOffersEnabled is not set
    const isOffersEnabled = restaurant.featureFlags?.isOffersEnabled ?? true;

    if (!isOffersEnabled) {
        console.log(`📢 OFFERS: Offers disabled for restaurant ${restaurantId}`);
        errorHandler.preconditionFailed('Offers are currently disabled for this restaurant');
    }
}

/**
 * Checks if offers are enabled for a restaurant (non-throwing version)
 * 
 * @param {string} restaurantId - The restaurant ID to check
 * @returns {Promise<boolean>} True if offers enabled, false otherwise
 */
async function isOffersEnabled(restaurantId) {
    try {
        const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();

        if (!restaurantDoc.exists) {
            return false;
        }

        const restaurant = restaurantDoc.data();
        return restaurant.featureFlags?.isOffersEnabled ?? true;
    } catch (error) {
        console.error('Error checking offers enabled:', error);
        return false;
    }
}

module.exports = {
    assertOffersEnabled,
    isOffersEnabled
};
