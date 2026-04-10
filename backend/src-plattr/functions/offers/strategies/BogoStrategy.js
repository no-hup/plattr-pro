/**
 * BOGO (Buy One Get One) Strategy
 * 
 * Handles BOGO and FREE_ITEM offer types.
 * - Applies once per cart (no multiples for higher quantities)
 * - Cheapest eligible units are made free
 * - Unit price includes variants and addons (finalPrice / quantity)
 */

const BaseOfferStrategy = require('./BaseOfferStrategy');

class BogoStrategy extends BaseOfferStrategy {
    /**
     * BOGO-specific validation: Check if enough items in cart
     */
    validateTypeSpecific(offer, cart, sessionData = {}) {
        const benefit = offer.benefit || {};
        const buyQuantity = benefit.buyQuantity || 1;
        const getQuantity = benefit.getQuantity || 1;
        const minQtyNeeded = buyQuantity + getQuantity;

        const eligibleItems = this.getEligibleItems(offer, cart);
        const eligibleQty = eligibleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

        if (eligibleQty < minQtyNeeded) {
            return {
                isValid: false,
                reason: `Add ${minQtyNeeded - eligibleQty} more eligible item(s) to claim free item`
            };
        }

        return { isValid: true, reason: 'Eligible for BOGO' };
    }

    /**
     * Calculate BOGO discount - cheapest items made free
     */
    calculate(offer, cart) {
        const benefit = offer.benefit || {};
        const buyQuantity = benefit.buyQuantity || 1;
        const getQuantity = benefit.getQuantity || 1;
        const maxDiscount = benefit.maxDiscount || Infinity;

        const eligibleItems = this.getEligibleItems(offer, cart);

        // Unroll items by quantity with unit prices
        let eligibleLineItems = eligibleItems.map(item => {
            const unitPrice = (item.priceInfo?.finalPrice || 0) / (item.quantity || 1);
            return {
                ...item,
                unitPrice
            };
        });

        // Sort by unit price ASCENDING (cheapest first - these get discounted)
        eligibleLineItems.sort((a, b) => a.unitPrice - b.unitPrice);

        const totalUnits = eligibleLineItems.reduce((sum, item) => sum + item.quantity, 0);

        let totalDiscount = 0;
        const appliedItems = [];

        // APPLIES ONCE PER ORDER RULE
        if (totalUnits >= (buyQuantity + getQuantity)) {
            let unitsToDiscount = getQuantity;

            for (const lineItem of eligibleLineItems) {
                if (unitsToDiscount <= 0) break;

                const canTake = Math.min(unitsToDiscount, lineItem.quantity);
                const discountForThese = canTake * lineItem.unitPrice;
                totalDiscount += discountForThese;

                appliedItems.push({
                    menuItemId: lineItem.menuItemId,
                    cartItemId: lineItem.cartItemId,
                    originalPrice: lineItem.unitPrice * canTake,
                    discountAmount: this.round(discountForThese),
                    discountedPrice: 0 // Free
                });

                unitsToDiscount -= canTake;
            }
        }

        // Apply max cap with scaling
        if (totalDiscount > maxDiscount) {
            const scale = maxDiscount / totalDiscount;
            appliedItems.forEach(item => {
                item.discountAmount = this.round(item.discountAmount * scale);
                item.discountedPrice = this.round(item.originalPrice - item.discountAmount);
            });
            totalDiscount = maxDiscount;
        }

        return {
            discountAmount: this.round(totalDiscount),
            appliedItems
        };
    }
}

module.exports = BogoStrategy;
