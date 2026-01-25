/**
 * Apply Offer Cloud Function
 * 
 * Applies a selected offer to the cart, updating the cart's priceInfo with the discount.
 * Uses centralized PriceCalculator for consistent price computation.
 * 
 * @param {Object} data - Input parameters
 * @param {string} data.restaurantId - ID of the restaurant
 * @param {string} data.tableId - ID of the table
 * @param {string} data.offerId - ID of the offer to apply
 * @returns {Object} Updated cart with applied offer
 */

const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');
const { validateOfferApplication } = require('./offerEngine');
const { calculatePriceWithOffer } = require('../cart/PriceCalculator');
const { assertOffersEnabled } = require('./offerFeatureGuard');

const applyOffer = functions.https.onCall(async (data, context) => {
    try {
        console.log('📢 OFFERS: applyOffer request received:', JSON.stringify(data.data));

        const { restaurantId, tableId, offerId } = data.data || {};

        // Validate required fields
        if (!restaurantId) errorHandler.badRequest('Restaurant ID is required');
        if (!tableId) errorHandler.badRequest('Table ID is required');
        if (!offerId) errorHandler.badRequest('Offer ID is required');

        // Check if offers are enabled for this restaurant (killswitch)
        await assertOffersEnabled(restaurantId);

        // Fetch the offer
        const offerDoc = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('offers')
            .doc(offerId)
            .get();

        if (!offerDoc.exists) {
            errorHandler.notFound('Offer not found');
        }

        const offer = { id: offerDoc.id, ...offerDoc.data() };

        // Fetch the cart
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

        // 1. Check if an offer is already applied (Strict Single Offer Rule)
        // If it's the SAME offer, we allow re-application (idempotency/update)
        if (currentPriceInfo.appliedOfferId && currentPriceInfo.appliedOfferId !== offerId) {
            errorHandler.preconditionFailed('Another offer is already applied. Please remove it first.');
        }

        // 2. Validate offer applicability
        const validation = validateOfferApplication(offer, cart);
        if (!validation.isValid) {
            errorHandler.preconditionFailed(validation.reason);
        }

        // 3. Calculate complete priceInfo with offer using centralized PriceCalculator
        const updatedPriceInfo = await calculatePriceWithOffer(cart, offer);

        // 4. Update the cart
        await cartRef.update({
            priceInfo: updatedPriceInfo,
            lastUpdated: timestamp.now(),
        });

        // Fetch updated cart
        const updatedCartDoc = await cartRef.get();
        const updatedCart = updatedCartDoc.data();

        console.log(`📢 OFFERS: Successfully applied offer ${offerId}, discount: ₹${updatedPriceInfo.offerDiscount}`);

        return ResponseBuilder.success(
            {
                cart: updatedCart,
                appliedOffer: {
                    id: offer.id,
                    title: offer.title,
                    discountAmount: updatedPriceInfo.offerDiscount,
                    appliedItems: updatedPriceInfo.appliedOfferItems || []
                }
            },
            `Offer "${offer.title}" applied successfully! You saved ₹${updatedPriceInfo.offerDiscount.toFixed(2)}`
        );

    } catch (error) {
        console.error('Error in applyOffer:', error);
        return errorHandler.handleError(error, 'applyOffer', {
            restaurantId: data?.data?.restaurantId,
            tableId: data?.data?.tableId,
            offerId: data?.data?.offerId,
        });
    }
});

module.exports = applyOffer;
