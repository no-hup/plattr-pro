const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../../../genericModels/priceinfo');

describe('Price Info Models', () => {
    describe('BasicPriceInfo', () => {
        test('should correct invalid values', () => {
            const price = new BasicPriceInfo(NaN, -10, null);
            expect(price.basePrice).toBe(0);
            expect(price.discount).toBe(0); // Clamped
            // finalPrice calculation: 0 * (1-0) = 0
            expect(price.finalPrice).toBe(0);
        });

        test('should calculate finalPrice from discount', () => {
            const price = new BasicPriceInfo(100, 20);
            expect(price.finalPrice).toBe(80);
        });

        test('should clamp discount > 100', () => {
            const price = new BasicPriceInfo(100, 120);
            expect(price.discount).toBe(100);
            expect(price.finalPrice).toBe(0);
        });
    });

    describe('CartItemPriceInfo', () => {
        test('should sanitize input fields', () => {
            const price = new CartItemPriceInfo({
                itemBasePrice: 'invalid', // should be 0
                finalPrice: NaN
            });
            expect(price.itemBasePrice).toBe(0);
            expect(price.finalPrice).toBe(0);
        });

        test('fromComponents should calculate totals correctly', () => {
            const itemPrice = { basePrice: 100, discount: 10, finalPrice: 90 };
            const variantPrice = 20;
            const addonPrice = 10;
            const price = CartItemPriceInfo.fromComponents(itemPrice, variantPrice, addonPrice, 10);

            expect(price.totalBasePrice).toBe(130); // 100 + 20 + 10
            expect(price.finalPrice).toBe(120); // 90 + 20 + 10
            expect(price.discountAmount).toBe(10); // 130 - 120
        });
    });

    describe('CartTotalPriceInfo', () => {
        test('fromCartItems should aggregate correctly', () => {
            const items = [
                { priceInfo: { totalBasePrice: 100, finalPrice: 90, totalVariantBasePrice: 0, totalAddonBasePrice: 0 } },
                { priceInfo: { totalBasePrice: 50, finalPrice: 50, totalVariantBasePrice: 10, totalAddonBasePrice: 0 } }
            ];
            const total = CartTotalPriceInfo.fromCartItems(items);

            expect(total.basePrice).toBe(150);
            expect(total.finalPrice).toBe(140);
            expect(total.totalVariantBasePrice).toBe(10);
            expect(total.totalDiscountAmount).toBe(10);
        });

        test('should ignore cancelled items', () => {
            const items = [
                { priceInfo: { totalBasePrice: 100, finalPrice: 100 }, status: 'active' },
                { priceInfo: { totalBasePrice: 50, finalPrice: 50 }, status: 'cancelled' }
            ];
            const total = CartTotalPriceInfo.fromCartItems(items);
            expect(total.basePrice).toBe(100);
        });
    });
});
