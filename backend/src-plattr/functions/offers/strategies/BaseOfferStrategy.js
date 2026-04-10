/**
 * Base Strategy Interface for Offer Types
 *
 * Each offer type (BOGO, PERCENTAGE, FLAT) implements this interface with
 * type-specific validation and calculation logic.
 */

const { FULFILLMENT_STATUS } = require('../../orders/orderConstants');

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
     * Helper: Get eligible cart items based on scope and exclusions.
     *
     * Offers V2:
     *   - scope ORDER: all non-cancelled items
     *   - scope CATEGORY: items whose categoryId or any subcategoryIds match offer.targetIds
     *   - scope ITEM: items whose menuItemId matches offer.targetIds
     *
     * After scope filtering, items matching offer.exclusionIds (by menuItemId,
     * categoryId, or any subcategoryIds) are removed.
     *
     * @param {Object} offer
     * @param {Object} cart
     * @returns {Array} Eligible items
     */
    getEligibleItems(offer, cart) {
        const cartItems = cart?.items || [];
        const targetIds = offer.targetIds || [];
        const exclusionIds = offer.exclusionIds || [];

        const scopeFiltered = cartItems.filter(item => {
            if (item.status === FULFILLMENT_STATUS.CANCELLED) return false;

            if (offer.scope === 'ORDER') {
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

        if (exclusionIds.length === 0) {
            return scopeFiltered;
        }

        return scopeFiltered.filter(item => {
            if (exclusionIds.includes(item.menuItemId)) return false;
            if (exclusionIds.includes(item.categoryId)) return false;
            const subcatIds = Array.isArray(item.subcategoryIds) ? item.subcategoryIds : [];
            if (subcatIds.some(id => exclusionIds.includes(id))) return false;
            return true;
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
