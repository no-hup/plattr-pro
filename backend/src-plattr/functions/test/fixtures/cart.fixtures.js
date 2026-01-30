const cartFixtures = {
    empty: {
        restaurantId: 'rest001',
        tableId: 'table001',
        items: [],
        priceInfo: {
            basePrice: 0,
            finalPrice: 0,
            totalDiscount: 0,
            totalDiscountAmount: 0,
            totalVariantBasePrice: 0,
            totalAddonBasePrice: 0
        },
        status: 'active'
    },
    withOneItem: {
        restaurantId: 'rest001',
        tableId: 'table001',
        items: [
            {
                cartItemId: 'c1',
                menuItemId: 'item001',
                quantity: 1,
                priceInfo: {
                    itemBasePrice: 100,
                    itemFinalPrice: 100,
                    totalVariantBasePrice: 0,
                    totalVariantFinalPrice: 0,
                    totalAddonBasePrice: 0,
                    totalAddonFinalPrice: 0,
                    totalBasePrice: 100,
                    finalPrice: 100,
                    discount: 0,
                    discountAmount: 0
                },
                selectedVariantsDetails: [],
                selectedAddonsDetails: [],
                addedAt: Date.now()
            }
        ],
        priceInfo: {
            basePrice: 100,
            finalPrice: 100,
            totalDiscount: 0,
            totalDiscountAmount: 0,
            totalVariantBasePrice: 0,
            totalAddonBasePrice: 0
        },
        status: 'active'
    },
    withCancelledItem: {
        restaurantId: 'rest001',
        tableId: 'table001',
        items: [
            {
                cartItemId: 'c2',
                menuItemId: 'item001',
                quantity: 1,
                status: 'cancelled',
                priceInfo: {
                    itemBasePrice: 100,
                    itemFinalPrice: 100,
                    totalVariantBasePrice: 0,
                    totalVariantFinalPrice: 0,
                    totalAddonBasePrice: 0,
                    totalAddonFinalPrice: 0,
                    totalBasePrice: 100,
                    finalPrice: 100,
                    discount: 0,
                    discountAmount: 0
                }
            }
        ],
        priceInfo: {
            basePrice: 0,
            finalPrice: 0,
            totalDiscount: 0,
            totalDiscountAmount: 0,
            totalVariantBasePrice: 0,
            totalAddonBasePrice: 0
        },
        status: 'active'
    }
};

module.exports = cartFixtures;
