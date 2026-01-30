const { calculateItemPrice, calculateCartValue } = require('../../../cart/calculateCartValue');

// Mock admin
jest.mock('../../../admin/admin', () => ({
    db: {}
}));

// Mock console.warn to suppress expected warnings
global.console = { ...global.console, warn: jest.fn(), log: jest.fn(), error: jest.fn() };

describe('Price Calculation', () => {
    describe('calculateItemPrice', () => {
        const baseItem = { priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 } };

        // Test #47
        test('base item only - should return correct finalPrice', () => {
            const result = calculateItemPrice(baseItem, [], []);
            expect(result.priceInfo.finalPrice).toBe(100);
            expect(result.priceInfo.totalBasePrice).toBe(100);
        });

        // Test #48
        test('with 15% discount - should apply correctly', () => {
            const item = { priceInfo: { basePrice: 100, discount: 15, finalPrice: 85 } };
            const result = calculateItemPrice(item, [], []);
            expect(result.priceInfo.finalPrice).toBe(85);
        });

        // Test #51
        test('variant respectParentDiscount=true - should apply item discount', () => {
            const item = { priceInfo: { basePrice: 100, discount: 10, finalPrice: 90 } };
            const variant = {
                priceInfo: { basePrice: 50, finalPrice: 50 },
                respectParentDiscount: true
            };
            const result = calculateItemPrice(item, [variant], []);
            // Variant base: 50. Discount 10% -> 45.
            // Total Final: 90 + 45 = 135.
            expect(result.priceInfo.totalVariantFinalPrice).toBe(45);
            expect(result.priceInfo.finalPrice).toBe(135);
        });

        // Test #52
        test('variant respectParentDiscount=false - should use own price', () => {
            const item = { priceInfo: { basePrice: 100, discount: 10, finalPrice: 90 } };
            const variant = {
                priceInfo: { basePrice: 50, finalPrice: 50 },
                respectParentDiscount: false
            };
            const result = calculateItemPrice(item, [variant], []);
            // Variant final: 50.
            // Total Final: 90 + 50 = 140.
            expect(result.priceInfo.totalVariantFinalPrice).toBe(50);
            expect(result.priceInfo.finalPrice).toBe(140);
        });

        // Test #55
        test('multiple addons - should sum all addon prices', () => {
            const item = { priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 } };
            const addons = [
                { priceInfo: { basePrice: 10, finalPrice: 10 }, respectParentDiscount: false },
                { priceInfo: { basePrice: 20, finalPrice: 20 }, respectParentDiscount: false }
            ];
            const result = calculateItemPrice(item, [], addons);
            expect(result.priceInfo.totalAddonBasePrice).toBe(30);
            expect(result.priceInfo.finalPrice).toBe(130);
        });
    });

    describe('calculateCartValue', () => {
        // Test #59 & #60
        test('multiple items - should sum all finalPrices', async () => {
            const cart = {
                items: [
                    {
                        quantity: 2,
                        priceInfo: { totalBasePrice: 100, finalPrice: 90, totalVariantBasePrice: 0, totalAddonBasePrice: 0 },
                        status: 'pending'
                    },
                    {
                        quantity: 1,
                        priceInfo: { totalBasePrice: 50, finalPrice: 50, totalVariantBasePrice: 0, totalAddonBasePrice: 0 },
                        status: 'pending'
                    }
                ]
            };
            const result = await calculateCartValue(cart);
            // Item 1: 90. (Qty handled inside priceInfo usually? 
            // WAIT. calculateCartValue logic:
            // "basePrice += itemPriceInfo.totalBasePrice;"
            // Item price info usually ALREADY includes quantity multiplier if it came from createCartItem.
            // Let's verify calculateCartValue assumption.
            // It sums up item.priceInfo.totalBasePrice.
            // So if my input items have priceInfo already calculated for their quantity, it works.
            // If I provide unit price as totalBasePrice, it will be wrong if I expect multiplication in calculateCartValue.
            // Checking calculateCartValue.js:
            // It creates CartItemPriceInfo(item.priceInfo).
            // It does NOT multiply by quantity. 
            // BUT it re-assigns `quantity = 1` if invalid.
            // It assumes item.priceInfo IS the total for that line item.

            // In createCartItem (helper.js), totalBasePrice = priceInfo.totalBasePrice * quantity.
            // So yes, priceInfo represents the line total.

            expect(result.basePrice).toBe(150); // 100 + 50
            expect(result.finalPrice).toBe(140); // 90 + 50
        });

        // Test #61
        test('contains cancelled item - should skip in total', async () => {
            const cart = {
                items: [
                    { priceInfo: { totalBasePrice: 100, finalPrice: 100 }, status: 'active' },
                    { priceInfo: { totalBasePrice: 50, finalPrice: 50 }, status: 'cancelled' }
                ]
            };
            const result = await calculateCartValue(cart);
            expect(result.basePrice).toBe(100);
        });
    });
});
