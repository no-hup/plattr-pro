/**
 * Percentage Discount Strategy
 *
 * Handles PERCENTAGE offer type for ORDER, CATEGORY, and ITEM scopes.
 * - Calculates percentage off eligible items
 * - Supports maxDiscount cap with proportional scaling
 */

const BaseOfferStrategy = require('./BaseOfferStrategy');

class PercentageStrategy extends BaseOfferStrategy {
    /**
     * Percentage offers don't need additional type-specific validation
     * Common validation (active, dates, minCartValue) handles eligibility
     */
    validateTypeSpecific(offer, cart, sessionData = {}) {
        const eligibleItems = this.getEligibleItems(offer, cart);

        if (eligibleItems.length === 0) {
            return {
                isValid: false,
                reason: 'Add eligible items to cart'
            };
        }

        return { isValid: true, reason: 'Eligible for percentage discount' };
    }

    /**
     * Calculate percentage discount on eligible items
     */
    calculate(offer, cart) {
        const benefit = offer.benefit || {};
        const percentageValue = benefit.value || 0;
        const maxDiscount = benefit.maxDiscount || Infinity;

        const cartPriceInfo = cart?.priceInfo || {};
        const cartTotal = cartPriceInfo.basePrice || 0;

        let totalDiscount = 0;
        const appliedItems = [];

        if (offer.scope === 'ORDER') {
            // Order-level percentage: apply to entire order total (minus exclusions)
            const eligibleItems = this.getEligibleItems(offer, cart);
            const eligibleTotal = eligibleItems.reduce(
                (sum, item) => sum + (item.priceInfo?.finalPrice || 0),
                0
            );
            // If exclusions present, base discount on eligible items only; otherwise use cart total
            const discountBase = (offer.exclusionIds && offer.exclusionIds.length > 0)
                ? eligibleTotal
                : cartTotal;
            totalDiscount = (discountBase * percentageValue) / 100;
            // No itemized breakdown for ORDER scope
        } else {
            // CATEGORY or ITEM scope: calculate per eligible item
            const eligibleItems = this.getEligibleItems(offer, cart);

            eligibleItems.forEach(item => {
                const itemTotalPrice = item.priceInfo?.finalPrice || 0;
                const itemDiscount = (itemTotalPrice * percentageValue) / 100;

                appliedItems.push({
                    menuItemId: item.menuItemId,
                    cartItemId: item.cartItemId,
                    originalPrice: itemTotalPrice,
                    discountAmount: this.round(itemDiscount),
                    discountedPrice: this.round(itemTotalPrice - itemDiscount)
                });

                totalDiscount += itemDiscount;
            });
        }

        // Apply max cap with scaling
        if (totalDiscount > maxDiscount) {
            if (appliedItems.length > 0) {
                const scale = maxDiscount / totalDiscount;
                appliedItems.forEach(item => {
                    item.discountAmount = this.round(item.discountAmount * scale);
                    item.discountedPrice = this.round(item.originalPrice - item.discountAmount);
                });
            }
            totalDiscount = maxDiscount;
        }

        return {
            discountAmount: this.round(totalDiscount),
            appliedItems
        };
    }
}

module.exports = PercentageStrategy;
