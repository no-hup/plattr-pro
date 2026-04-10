/**
 * Flat Discount Strategy
 *
 * Handles FLAT offer type.
 * - ORDER scope: Full flat amount off order total (or eligible items after exclusions)
 * - CATEGORY/ITEM scope: Flat amount off total of eligible items (not per-item)
 */

const BaseOfferStrategy = require('./BaseOfferStrategy');

class FlatStrategy extends BaseOfferStrategy {
    /**
     * Flat offers need to check eligibility for all scopes (ORDER may have exclusions)
     */
    validateTypeSpecific(offer, cart, sessionData = {}) {
        const eligibleItems = this.getEligibleItems(offer, cart);

        if (eligibleItems.length === 0) {
            return {
                isValid: false,
                reason: 'Add eligible items to cart'
            };
        }

        return { isValid: true, reason: 'Eligible for flat discount' };
    }

    /**
     * Calculate flat discount
     */
    calculate(offer, cart) {
        const benefit = offer.benefit || {};
        const flatValue = benefit.value || 0;
        const maxDiscount = benefit.maxDiscount || flatValue; // For FLAT, maxDiscount defaults to value

        const cartPriceInfo = cart?.priceInfo || {};
        const cartTotal = cartPriceInfo.basePrice || 0;

        let totalDiscount = 0;
        const appliedItems = [];

        if (offer.scope === 'ORDER') {
            // ORDER scope: flat amount off order total (or eligible items if exclusions present)
            const hasExclusions = (offer.exclusionIds && offer.exclusionIds.length > 0);
            if (hasExclusions) {
                const eligibleItems = this.getEligibleItems(offer, cart);
                const eligibleTotal = eligibleItems.reduce(
                    (sum, item) => sum + (item.priceInfo?.finalPrice || 0),
                    0
                );
                totalDiscount = Math.min(flatValue, eligibleTotal);
            } else {
                totalDiscount = Math.min(flatValue, cartTotal);
            }
            // No itemized breakdown for ORDER scope
        } else {
            // CATEGORY or ITEM scope: Flat amount off eligible items total
            const eligibleItems = this.getEligibleItems(offer, cart);
            const eligibleTotal = eligibleItems.reduce((sum, item) => {
                return sum + (item.priceInfo?.finalPrice || 0);
            }, 0);

            // Discount is the flat value, capped at eligible items total
            totalDiscount = Math.min(flatValue, eligibleTotal);

            // Distribute discount proportionally across eligible items for breakdown
            if (eligibleTotal > 0 && totalDiscount > 0) {
                eligibleItems.forEach(item => {
                    const itemTotalPrice = item.priceInfo?.finalPrice || 0;
                    const proportion = itemTotalPrice / eligibleTotal;
                    const itemDiscount = totalDiscount * proportion;

                    appliedItems.push({
                        menuItemId: item.menuItemId,
                        cartItemId: item.cartItemId,
                        originalPrice: itemTotalPrice,
                        discountAmount: this.round(itemDiscount),
                        discountedPrice: this.round(itemTotalPrice - itemDiscount)
                    });
                });
            }
        }

        // Apply max cap
        totalDiscount = Math.min(totalDiscount, maxDiscount);

        return {
            discountAmount: this.round(totalDiscount),
            appliedItems
        };
    }
}

module.exports = FlatStrategy;
