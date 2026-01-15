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

/**
 * Evaluates if an offer's conditions are met
 * @param {Object} offer - The offer document
 * @param {Object} cart - The current cart
 * @param {Object} sessionData - Session history data
 * @returns {Object} { isApplicable: boolean, reason: string, potentialSaving: number }
 */
function evaluateOfferConditions(offer, cart, sessionData) {
    const conditions = offer.conditions || {};
    const benefit = offer.benefit || {};
    const cartItems = cart?.items || [];
    const cartPriceInfo = cart?.priceInfo || {};

    // Calculate cart total
    const cartTotal = cartPriceInfo.basePrice || 0;

    // Check validity dates
    const now = new Date();
    if (offer.validity) {
        if (offer.validity.startDate && new Date(offer.validity.startDate) > now) {
            return { isApplicable: false, reason: 'Offer not yet active', potentialSaving: 0 };
        }
        if (offer.validity.endDate && new Date(offer.validity.endDate) < now) {
            return { isApplicable: false, reason: 'Offer has expired', potentialSaving: 0 };
        }
    }

    // Check minimum cart value
    if (conditions.minCartValue && cartTotal < conditions.minCartValue) {
        const remaining = conditions.minCartValue - cartTotal;
        return {
            isApplicable: false,
            reason: `Add ₹${remaining.toFixed(2)} more to unlock this offer`,
            potentialSaving: 0
        };
    }

    // Check required items (for BOGO and item-based offers)
    if (conditions.requiredItems && conditions.requiredItems.length > 0) {
        for (const required of conditions.requiredItems) {
            const cartItem = cartItems.find(item => item.menuItemId === required.menuItemId);
            const cartQuantity = cartItem?.quantity || 0;

            if (cartQuantity < required.quantity) {
                return {
                    isApplicable: false,
                    reason: `Add required items to unlock this offer`,
                    potentialSaving: 0
                };
            }
        }
    }

    // Check user history conditions
    if (conditions.userHistory) {
        const { minOrderCount, activeSessionOrderCount } = conditions.userHistory;

        if (minOrderCount && (sessionData?.totalOrderCount || 0) < minOrderCount) {
            return {
                isApplicable: false,
                reason: `Complete ${minOrderCount - (sessionData?.totalOrderCount || 0)} more orders to unlock`,
                potentialSaving: 0
            };
        }

        if (activeSessionOrderCount && (sessionData?.sessionOrderCount || 0) < activeSessionOrderCount - 1) {
            return {
                isApplicable: false,
                reason: `Order ${activeSessionOrderCount - (sessionData?.sessionOrderCount || 0)} more items this session`,
                potentialSaving: 0
            };
        }
    }

    // Calculate potential saving
    let potentialSaving = 0;

    switch (benefit.type) {
        case 'DISCOUNT_AMOUNT':
            potentialSaving = Math.min(benefit.value || 0, cartTotal);
            break;
        case 'DISCOUNT_PERCENTAGE':
            potentialSaving = (cartTotal * (benefit.value || 0)) / 100;
            if (benefit.maxDiscount) {
                potentialSaving = Math.min(potentialSaving, benefit.maxDiscount);
            }
            break;
        case 'FREE_ITEM':
            // For free item, we could look up the item price, but for now estimate 0
            potentialSaving = 0; // Would need menu item lookup for actual value
            break;
        default:
            potentialSaving = 0;
    }

    return {
        isApplicable: true,
        reason: 'Offer is applicable!',
        potentialSaving: Math.round(potentialSaving * 100) / 100
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

        const { restaurantId, tableId, sessionId, cart: providedCart } = data.data || {};

        // Validate required fields
        if (!restaurantId) {
            errorHandler.badRequest('Restaurant ID is required');
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
