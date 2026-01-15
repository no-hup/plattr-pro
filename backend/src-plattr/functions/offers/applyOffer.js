/**
 * Apply Offer Cloud Function
 * 
 * Applies a selected offer to the cart, updating the cart's priceInfo with the discount.
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

/**
 * Calculates the discount amount based on offer benefit type
 * @param {Object} benefit - The offer's benefit configuration
 * @param {Object} cart - The current cart
 * @returns {number} The calculated discount amount
 */
function calculateDiscount(benefit, cart) {
    const cartTotal = cart?.priceInfo?.basePrice || 0;

    switch (benefit.type) {
        case 'DISCOUNT_AMOUNT':
            return Math.min(benefit.value || 0, cartTotal);

        case 'DISCOUNT_PERCENTAGE':
            let discount = (cartTotal * (benefit.value || 0)) / 100;
            if (benefit.maxDiscount) {
                discount = Math.min(discount, benefit.maxDiscount);
            }
            return Math.round(discount * 100) / 100;

        case 'FREE_ITEM':
            // For free items, the discount is 0 on cart total
            // The free item would be added separately
            return 0;

        default:
            return 0;
    }
}

/**
 * Validates that an offer can be applied
 * @param {Object} offer - The offer document
 * @param {Object} cart - The current cart
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateOfferApplication(offer, cart) {
    const conditions = offer.conditions || {};
    const cartItems = cart?.items || [];
    const cartTotal = cart?.priceInfo?.basePrice || 0;

    // Check if offer is active
    if (!offer.isActive) {
        return { valid: false, reason: 'Offer is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    if (offer.validity) {
        if (offer.validity.startDate && new Date(offer.validity.startDate) > now) {
            return { valid: false, reason: 'Offer is not yet active' };
        }
        if (offer.validity.endDate && new Date(offer.validity.endDate) < now) {
            return { valid: false, reason: 'Offer has expired' };
        }
    }

    // Check minimum cart value
    if (conditions.minCartValue && cartTotal < conditions.minCartValue) {
        return {
            valid: false,
            reason: `Minimum cart value of ₹${conditions.minCartValue} required`
        };
    }

    // Check required items
    if (conditions.requiredItems && conditions.requiredItems.length > 0) {
        for (const required of conditions.requiredItems) {
            const cartItem = cartItems.find(item => item.menuItemId === required.menuItemId);
            const cartQuantity = cartItem?.quantity || 0;

            if (cartQuantity < required.quantity) {
                return { valid: false, reason: 'Required items not in cart' };
            }
        }
    }

    return { valid: true, reason: 'Offer is valid' };
}

const applyOffer = functions.https.onCall(async (data, context) => {
    try {
        console.log('📢 OFFERS: applyOffer request received:', JSON.stringify(data.data));

        const { restaurantId, tableId, offerId } = data.data || {};

        // Validate required fields
        if (!restaurantId) {
            errorHandler.badRequest('Restaurant ID is required');
        }
        if (!tableId) {
            errorHandler.badRequest('Table ID is required');
        }
        if (!offerId) {
            errorHandler.badRequest('Offer ID is required');
        }

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

        // Validate offer can be applied
        const validation = validateOfferApplication(offer, cart);
        if (!validation.valid) {
            errorHandler.preconditionFailed(validation.reason);
        }

        // Calculate discount
        const discountAmount = calculateDiscount(offer.benefit, cart);

        // Update cart priceInfo with the applied offer
        const currentPriceInfo = cart.priceInfo || {};
        const basePrice = currentPriceInfo.basePrice || 0;
        const existingDiscount = currentPriceInfo.totalDiscountAmount || 0;

        const updatedPriceInfo = {
            ...currentPriceInfo,
            totalDiscountAmount: existingDiscount + discountAmount,
            finalPrice: Math.max(0, basePrice - existingDiscount - discountAmount),
            appliedOfferId: offerId,
            appliedOfferTitle: offer.title,
            offerDiscount: discountAmount,
        };

        // Update the cart
        await cartRef.update({
            priceInfo: updatedPriceInfo,
            lastUpdated: timestamp.now(),
        });

        // Fetch updated cart
        const updatedCartDoc = await cartRef.get();
        const updatedCart = updatedCartDoc.data();

        console.log(`📢 OFFERS: Successfully applied offer ${offerId}, discount: ₹${discountAmount}`);

        return ResponseBuilder.success(
            {
                cart: updatedCart,
                appliedOffer: {
                    id: offer.id,
                    title: offer.title,
                    discountAmount,
                }
            },
            `Offer "${offer.title}" applied successfully! You saved ₹${discountAmount.toFixed(2)}`
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
