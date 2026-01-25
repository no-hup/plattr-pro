/**
 * Offer Engine - Core validation and calculation logic
 * 
 * Uses Strategy Pattern for type-specific logic (BOGO, PERCENTAGE, FLAT).
 * Common validation is handled here, type-specific is delegated to strategies.
 */

const { getStrategy, isSupported } = require('./strategies');

/**
 * Validates if an offer can be applied to the cart
 * @param {Object} offer - The offer document
 * @param {Object} cart - The current cart
 * @param {Object} [sessionData] - Optional session history
 * @returns {Object} { isValid: boolean, reason: string, potentialSaving: number }
 */
function validateOfferApplication(offer, cart, sessionData = {}) {
    const conditions = offer.conditions || {};
    const cartItems = cart?.items || [];
    const cartPriceInfo = cart?.priceInfo || {};
    const cartTotal = cartPriceInfo.basePrice || 0; // Pre-discount total

    // 1. Check if offer type is supported
    if (!isSupported(offer.type)) {
        console.warn(`⚠️ OFFER_ENGINE: Unknown offer type "${offer.type}" for offer ${offer.id}`);
        return { isValid: false, reason: 'Unsupported offer type', potentialSaving: 0 };
    }

    // 2. Basic Active/Date Checks
    if (!offer.isActive) {
        return { isValid: false, reason: 'Offer is no longer active', potentialSaving: 0 };
    }

    const now = new Date();
    if (offer.validity) {
        if (offer.validity.startDate && new Date(offer.validity.startDate) > now) {
            return { isValid: false, reason: 'Offer not yet active', potentialSaving: 0 };
        }
        if (offer.validity.endDate && new Date(offer.validity.endDate) < now) {
            return { isValid: false, reason: 'Offer has expired', potentialSaving: 0 };
        }
    }

    // 3. Minimum Cart Value (Pre-discount)
    if (conditions.minCartValue && cartTotal < conditions.minCartValue) {
        const remaining = conditions.minCartValue - cartTotal;
        return {
            isValid: false,
            reason: `Add ₹${remaining.toFixed(2)} more to unlock`,
            potentialSaving: 0
        };
    }

    // 4. Required Items (Specific Logic)
    // Used for "Must have X to get Y" style offers where X != Y
    if (conditions.requiredItems && conditions.requiredItems.length > 0) {
        for (const required of conditions.requiredItems) {
            const matches = cartItems.filter(item =>
                item.menuItemId === required.menuItemId && item.status !== 'cancelled'
            );
            const totalQty = matches.reduce((sum, item) => sum + (item.quantity || 0), 0);

            if (totalQty < required.quantity) {
                return {
                    isValid: false,
                    reason: 'Add required items to cart',
                    potentialSaving: 0
                };
            }
        }
    }

    // 5. User History Checks (if session data provided for evaluation)
    if (conditions.userHistory && sessionData && typeof sessionData.totalOrderCount === 'number') {
        const { minOrderCount, activeSessionOrderCount } = conditions.userHistory;

        if (minOrderCount && sessionData.totalOrderCount < minOrderCount) {
            return {
                isValid: false,
                reason: `Complete ${minOrderCount - sessionData.totalOrderCount} more orders to unlock`,
                potentialSaving: 0
            };
        }

        if (activeSessionOrderCount && (sessionData.sessionOrderCount || 0) < activeSessionOrderCount - 1) {
            return {
                isValid: false,
                reason: `Order ${activeSessionOrderCount - (sessionData.sessionOrderCount || 0)} more items this session`,
                potentialSaving: 0
            };
        }
    }

    // 6. Defensive guard for CATEGORY/ITEM scope with empty targetIds
    if ((offer.scope === 'CATEGORY' || offer.scope === 'ITEM') &&
        (!offer.targetIds || offer.targetIds.length === 0)) {
        console.warn(`⚠️ OFFER_ENGINE: Offer ${offer.id} has scope ${offer.scope} but empty targetIds`);
        return {
            isValid: false,
            reason: 'Offer configuration incomplete',
            potentialSaving: 0
        };
    }

    // 7. Delegate type-specific validation to Strategy
    const strategy = getStrategy(offer.type);
    const typeValidation = strategy.validateTypeSpecific(offer, cart, sessionData);

    if (!typeValidation.isValid) {
        return {
            isValid: false,
            reason: typeValidation.reason,
            potentialSaving: 0
        };
    }

    // 8. Calculate potential saving using Strategy
    const { discountAmount } = strategy.calculate(offer, cart);

    return {
        isValid: true,
        reason: 'Offer Applicable',
        potentialSaving: discountAmount
    };
}

/**
 * Calculates the discount amount and identified applicable items
 * Delegates to appropriate strategy based on offer type
 * @param {Object} offer 
 * @param {Object} cart 
 * @returns {Object} { discountAmount: number, appliedItems: Array }
 */
function calculateOfferBenefit(offer, cart) {
    const strategy = getStrategy(offer.type);
    return strategy.calculate(offer, cart);
}

module.exports = {
    validateOfferApplication,
    calculateOfferBenefit
};
