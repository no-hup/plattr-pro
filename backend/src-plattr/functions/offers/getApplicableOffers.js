/**
 * Get Applicable Offers Cloud Function
 * 
 * Retrieves all applicable offers for a restaurant based on cart state and user session.
 * Evaluates offer conditions and returns offers with applicability status.
 * 
 * @param {Object} data - Input parameters
 * @param {string} data.restaurantId - ID of the restaurant
 * @param {string} [data.tableId] - ID of the table (optional if cart is provided)
 * @param {string} [data.sessionId] - Session ID for session-based offers
 * @param {Object} [data.cart] - Cart object (optional, will be fetched if not provided)
 * @returns {Object} List of offers with applicability status and potential savings
 */

const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');
const { validateOfferApplication } = require('./offerEngine');
const { isOffersEnabled } = require('./offerFeatureGuard');
const { resolveTableId } = require('../table/mergedTables');

/**
 * Evaluates if an offer's conditions are met
 * @param {Object} offer - The offer document
 * @param {Object} cart - The current cart
 * @param {Object} sessionData - Session history data
 * @returns {Object} { isApplicable: boolean, reason: string, potentialSaving: number }
 */
function evaluateOfferConditions(offer, cart, sessionData) {
    const result = validateOfferApplication(offer, cart, sessionData);

    return {
        isApplicable: result.isValid,
        reason: result.reason,
        potentialSaving: result.potentialSaving
    };
}

/**
 * Fetches session data for user history based offers
 * @param {string} restaurantId 
 * @param {string} sessionId 
 * @returns {Object} Session data with order counts
 */
async function getSessionData(restaurantId, sessionId) {
    if (!sessionId) {
        return { totalOrderCount: 0, sessionOrderCount: 0 };
    }

    try {
        // Query orders for this session to get order count
        const ordersSnapshot = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('orders')
            .where('sessionId', '==', sessionId)
            .get();

        return {
            totalOrderCount: ordersSnapshot.size,
            sessionOrderCount: ordersSnapshot.size,
        };
    } catch (error) {
        console.error('Error fetching session data:', error);
        return { totalOrderCount: 0, sessionOrderCount: 0 };
    }
}

/**
 * Fetches cart if not provided
 * @param {string} restaurantId 
 * @param {string} tableId 
 * @returns {Object|null} Cart object or null
 */
async function fetchCartIfNeeded(restaurantId, tableId) {
    if (!tableId) return null;

    try {
        const cartDoc = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('carts')
            .doc(tableId)
            .get();

        return cartDoc.exists ? cartDoc.data() : null;
    } catch (error) {
        console.error('Error fetching cart:', error);
        return null;
    }
}

const getApplicableOffers = functions.https.onCall(async (data, context) => {
    try {
        console.log('📢 OFFERS: getApplicableOffers request received:', JSON.stringify(data.data));

        let { restaurantId, tableId, sessionId, cart: providedCart } = data.data || {};

        // Validate required fields
        if (!restaurantId) {
            errorHandler.badRequest('Restaurant ID is required');
        }

        // A merged table shares the parent's cart, so offers must be judged on it.
        tableId = await resolveTableId(restaurantId, tableId);

        // Check if offers are enabled for this restaurant (killswitch)
        const offersEnabled = await isOffersEnabled(restaurantId);
        if (!offersEnabled) {
            console.log(`📢 OFFERS: Offers disabled for restaurant ${restaurantId}, returning empty`);
            return ResponseBuilder.success(
                { offers: [] },
                'Offers not available for this restaurant'
            );
        }

        // Fetch cart if not provided
        const cart = providedCart || await fetchCartIfNeeded(restaurantId, tableId);

        // Fetch session data for user history based offers
        const sessionData = await getSessionData(restaurantId, sessionId);

        // Fetch all active offers for this restaurant
        const offersSnapshot = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('offers')
            .where('isActive', '==', true)
            .get();

        console.log(`📢 OFFERS: Found ${offersSnapshot.size} active offers`);

        // Evaluate each offer
        const offers = [];
        for (const doc of offersSnapshot.docs) {
            const offer = { id: doc.id, ...doc.data() };
            const evaluation = evaluateOfferConditions(offer, cart, sessionData);

            offers.push({
                id: offer.id,
                code: offer.code || null,
                title: offer.title,
                description: offer.description,
                imageUrl: offer.imageUrl || null,
                type: offer.type,
                benefit: offer.benefit,
                isApplicable: evaluation.isApplicable,
                reason: evaluation.reason,
                potentialSaving: Number(evaluation.potentialSaving),
            });
        }

        // Sort offers: applicable first, then by potential saving
        offers.sort((a, b) => {
            if (a.isApplicable !== b.isApplicable) {
                return b.isApplicable ? 1 : -1;
            }
            return b.potentialSaving - a.potentialSaving;
        });

        return ResponseBuilder.success(
            { offers },
            `Found ${offers.length} offers`
        );

    } catch (error) {
        console.error('Error in getApplicableOffers:', error);
        return errorHandler.handleError(error, 'getApplicableOffers', {
            restaurantId: data?.data?.restaurantId,
        });
    }
});

module.exports = getApplicableOffers;
