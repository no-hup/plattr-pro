/**
 * Base Strategy Interface for Offer Types
 * 
 * Each offer type (BOGO, PERCENTAGE, FLAT) implements this interface with
 * type-specific validation and calculation logic.
 */

/**
 * Base class defining the strategy interface
 * All strategies should implement these methods
 */
class BaseOfferStrategy {
    /**
     * Type-specific validation beyond common checks
     * @param {Object} offer - The offer document
     * @param {Object} cart - The current cart
     * @param {Object} [sessionData] - Optional session data
     * @returns {Object} { isValid: boolean, reason: string }
     */
    validateTypeSpecific(offer, cart, sessionData = {}) {
        throw new Error('validateTypeSpecific must be implemented by subclass');
    }

    /**
     * Calculate discount for this offer type
     * @param {Object} offer - The offer document
     * @param {Object} cart - The current cart
     * @returns {Object} { discountAmount: number, appliedItems: Array }
     */
    calculate(offer, cart) {
        throw new Error('calculate must be implemented by subclass');
    }

    /**
     * Helper: Get eligible cart items based on scope
     * @param {Object} offer 
     * @param {Object} cart 
     * @returns {Array} Eligible items
     */
    getEligibleItems(offer, cart) {
        const cartItems = cart?.items || [];
        const targetIds = offer.targetIds || [];

        return cartItems.filter(item => {
            if (item.status === 'cancelled') return false;

            if (offer.scope === 'CART') {
                return true;
            } else if (offer.scope === 'CATEGORY') {
                const subcatIds = Array.isArray(item.subcategoryIds) ? item.subcategoryIds : [];
                return targetIds.includes(item.categoryId) ||
                    subcatIds.some(id => targetIds.includes(id));
            } else if (offer.scope === 'ITEM') {
                return targetIds.includes(item.menuItemId);
            }
            return false;
        });
    }

    /**
     * Helper: Round to 2 decimal places
     */
    round(value) {
        return Math.round(value * 100) / 100;
    }
}

module.exports = BaseOfferStrategy;
