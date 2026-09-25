/**
 * Offer Engine - Core validation and calculation logic
 * 
 * Uses Strategy Pattern for type-specific logic (BOGO, PERCENTAGE, FLAT).
 * Common validation is handled here, type-specific is delegated to strategies.
 */

const { getStrategy, isSupported } = require('./strategies');
const { FULFILLMENT_STATUS } = require('../orders/orderConstants');

/** Milliseconds for an ISO date-time that names its zone ("Z" or "+05:30"); null for anything else. */
function instant(iso) {
    if (typeof iso !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(iso)) return null;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
}

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

    // DECISION(A26, 2026-09-26): an offer date is a whole day in the restaurant's clock; the admin write
    // (adminApp/offers_admin.js offerWindow) stores 00:00 of the first day to 23:59:59.999 of the last, zone written
    // in. A date with no zone could be read two ways, and a missing one has no end: both fail closed.
    // If you change this, ask Shaurya first.
    const start = instant(offer.validity?.startDate);
    const end = instant(offer.validity?.endDate);
    if (start === null || end === null) {
        return { isValid: false, reason: 'Offer dates are unreadable', potentialSaving: 0 };
    }
    const now = Date.now();
    if (start > now) {
        return { isValid: false, reason: 'Offer not yet active', potentialSaving: 0 };
    }
    if (end < now) {
        return { isValid: false, reason: 'Offer has expired', potentialSaving: 0 };
    }

    // 3. Minimum Order Value (pre-discount total)
    if (conditions.minOrderValue && cartTotal < conditions.minOrderValue) {
        const remaining = conditions.minOrderValue - cartTotal;
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
                item.menuItemId === required.menuItemId && item.status !== FULFILLMENT_STATUS.CANCELLED
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

    // 6. Defensive guards
    //    - ORDER scope: targetIds not required (applies to whole order)
    //    - CATEGORY/ITEM scope: targetIds must be non-empty
    const validScopes = ['ORDER', 'CATEGORY', 'ITEM'];
    if (!validScopes.includes(offer.scope)) {
        console.warn(`⚠️ OFFER_ENGINE: Offer ${offer.id} has invalid scope "${offer.scope}"`);
        return {
            isValid: false,
            reason: 'Offer configuration invalid',
            potentialSaving: 0
        };
    }
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
