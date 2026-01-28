/**
 * Price Calculator Service
 * 
 * Centralized price calculation logic for carts with offers.
 * This is the single source of truth for computing priceInfo.
 * 
 * Used by:
 * - applyOffer.js - when applying an offer
 * - removeOffer.js - when removing an offer
 * - createOrUpdateOrder.js - for lazy revalidation
 * - validateCart.js - for validation (indirectly via calculateCartValue)
 */

const { calculateCartValue } = require('./calculateCartValue');
const { calculateOfferBenefit } = require('../offers/offerEngine');
const timestamp = require('../utils/timestamp');

/**
 * Utility for consistent rounding to 2 decimal places
 */
function roundPrice(price) {
    return Math.round(price * 100) / 100;
}

/**
 * Calculates complete cart priceInfo with an applied offer
 * 
 * @param {Object} cart - The cart object with items
 * @param {Object} offer - The offer to apply
 * @returns {Object} Complete priceInfo with offer applied
 */
async function calculatePriceWithOffer(cart, offer) {
    // Step 1: Clear any existing offer to get clean base calculation
    const cartWithoutOffer = {
        ...cart,
        priceInfo: {
            ...cart.priceInfo,
            appliedOfferId: null,
            appliedOfferTitle: null,
            offerDiscount: 0,
            appliedOfferItems: [],
            offerAppliedAt: null
        }
    };

    // Step 2: Calculate base cart value (items + item discounts only)
    const basePriceInfo = await calculateCartValue(cartWithoutOffer);

    // Step 3: Calculate offer discount using the strategy pattern
    const { discountAmount, appliedItems } = calculateOfferBenefit(offer, {
        ...cart,
        priceInfo: basePriceInfo
    });

    // Step 4: Determine which discount to apply (item vs offer)
    const basePrice = basePriceInfo.basePrice || 0;
    const itemDiscountAmount = Math.max(0, basePrice - (basePriceInfo.finalPrice || 0));
    const rawOfferDiscount = Math.max(0, discountAmount || 0);
    const applicableOfferDiscount = Math.min(rawOfferDiscount, basePrice);
    const useOfferDiscount = applicableOfferDiscount > itemDiscountAmount;
    const appliedDiscountAmount = useOfferDiscount ? applicableOfferDiscount : itemDiscountAmount;
    const finalPrice = Math.max(0, basePrice - appliedDiscountAmount);
    const totalDiscountAmount = appliedDiscountAmount;
    const totalDiscount = basePrice > 0 ? (totalDiscountAmount / basePrice) * 100 : 0;

    // Step 5: Construct complete priceInfo
    return {
        ...basePriceInfo,
        finalPrice: roundPrice(finalPrice),
        totalDiscount: roundPrice(totalDiscount),
        totalDiscountAmount: roundPrice(totalDiscountAmount),
        appliedOfferId: offer.id,
        appliedOfferTitle: offer.title,
        offerDiscount: useOfferDiscount ? roundPrice(applicableOfferDiscount) : 0,
        applicableOfferDiscount: roundPrice(applicableOfferDiscount),
        appliedOfferItems: appliedItems,
        offerAppliedAt: timestamp.now()
    };
}

/**
 * Calculates complete cart priceInfo without any offer
 * 
 * @param {Object} cart - The cart object with items
 * @returns {Object} Complete priceInfo with no offer
 */
async function calculatePriceWithoutOffer(cart) {
    // Step 1: Clear offer fields
    const cartWithoutOffer = {
        ...cart,
        priceInfo: {
            ...cart.priceInfo,
            appliedOfferId: null,
            appliedOfferTitle: null,
            offerDiscount: 0,
            appliedOfferItems: [],
            offerAppliedAt: null
        }
    };

    // Step 2: Calculate cart value (this will compute base + item discounts)
    const basePriceInfo = await calculateCartValue(cartWithoutOffer);

    // Step 3: Ensure offer fields are explicitly cleared
    return {
        ...basePriceInfo,
        appliedOfferId: null,
        appliedOfferTitle: null,
        offerDiscount: 0,
        applicableOfferDiscount: 0,
        appliedOfferItems: [],
        offerAppliedAt: null
    };
}

/**
 * Recalculates cart priceInfo, preserving or clearing offer based on flag
 * 
 * @param {Object} cart - The cart object with items
 * @param {Object|null} offer - The offer to apply (null to clear)
 * @returns {Object} Complete recalculated priceInfo
 */
async function recalculateCartPrice(cart, offer = null) {
    if (offer) {
        return calculatePriceWithOffer(cart, offer);
    }
    return calculatePriceWithoutOffer(cart);
}

module.exports = {
    calculatePriceWithOffer,
    calculatePriceWithoutOffer,
    recalculateCartPrice,
    roundPrice
};
