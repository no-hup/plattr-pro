/**
 * Remove Offer Cloud Function
 * 
 * Removes the currently applied offer from the cart and recalculates the final price
 * using centralized PriceCalculator to preserve item-level discounts.
 * 
 * @param {Object} data - Input parameters
 * @param {string} data.restaurantId - ID of the restaurant
 * @param {string} data.tableId - ID of the table
 * @returns {Object} Updated cart with offer removed
 */

const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');
const { calculatePriceWithoutOffer } = require('../cart/PriceCalculator');
const { assertOffersEnabled } = require('./offerFeatureGuard');

const removeOffer = functions.https.onCall(async (data, context) => {
    try {
        console.log('📢 OFFERS: removeOffer request received:', JSON.stringify(data.data));

        const { restaurantId, tableId } = data.data || {};

        // Validate required fields
        if (!restaurantId) errorHandler.badRequest('Restaurant ID is required');
        if (!tableId) errorHandler.badRequest('Table ID is required');

        // Check if offers are enabled for this restaurant (killswitch)
        await assertOffersEnabled(restaurantId);

        const cartRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('carts')
            .doc(tableId);

        const cartDoc = await cartRef.get();

        if (!cartDoc.exists) {
            errorHandler.notFound('Cart not found');
        }

        const cart = cartDoc.data();
        const currentPriceInfo = cart.priceInfo || {};

        // Check if an offer is actually applied
        if (!currentPriceInfo.appliedOfferId) {
            return ResponseBuilder.success({ cart }, 'No offer applied to remove.');
        }

        // Calculate complete priceInfo without offer using centralized PriceCalculator
        // This preserves item-level discounts and properly recalculates all totals
        const updatedPriceInfo = await calculatePriceWithoutOffer(cart);

        // Update the cart
        await cartRef.update({
            priceInfo: updatedPriceInfo,
            lastUpdated: timestamp.now()
        });

        // Fetch updated cart to return
        const updatedCartDoc = await cartRef.get();
        const updatedCart = updatedCartDoc.data();

        console.log(`📢 OFFERS: Successfully removed offer from cart ${tableId}`);

        return ResponseBuilder.success(
            { cart: updatedCart },
            'Offer removed successfully'
        );

    } catch (error) {
        console.error('Error in removeOffer:', error);
        return errorHandler.handleError(error, 'removeOffer', {
            restaurantId: data?.data?.restaurantId,
            tableId: data?.data?.tableId
        });
    }
});

module.exports = removeOffer;
