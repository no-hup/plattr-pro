/* eslint-disable global-require */
// Pins the order.items[].priceInfo contract: PER-UNIT and ALL-INCLUSIVE
// (variants + addons folded in). getOrder.js returns priceInfo.finalPrice as
// `price` and the consumer multiplies by quantity, so unit × qty must equal the
// cart line total or the item lines stop adding up to the order total.

jest.mock('../../../admin/admin', () => {
    const { mockFirestoreDb } = require('../../mocks/firestore.mock');
    return {
        db: mockFirestoreDb(),
        admin: { firestore: () => mockFirestoreDb() },
        FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
        Timestamp: { now: jest.fn(), fromDate: jest.fn() }
    };
});

const { normalizeCartItemsForOrder } = require('../../../orders/createOrUpdateOrder');

// Burger ₹200 @10% = ₹180, Large +₹50 (inherits → ₹45), Cheese +₹20 (no inherit)
// = ₹270 base / ₹245 final per unit (see CLAUDE.md Price Calculation Reference).
// Cart priceInfo is the line total for quantity 3.
const customisedBurgerQty3 = {
    menuItemId: 'burger',
    quantity: 3,
    menuItem: { meta: { name: 'Burger' } },
    priceInfo: {
        itemBasePrice: 600,
        itemFinalPrice: 540,
        totalVariantBasePrice: 150,
        totalVariantFinalPrice: 135,
        totalAddonBasePrice: 60,
        totalAddonFinalPrice: 60,
        totalBasePrice: 810,
        finalPrice: 735,
        discount: 10,
        discountAmount: 75
    }
};

describe('normalizeCartItemsForOrder', () => {
    test('stores per-unit, all-inclusive priceInfo (variants + addons included)', () => {
        const [item] = normalizeCartItemsForOrder({ items: [customisedBurgerQty3] });

        expect(item.quantity).toBe(3);
        expect(item.priceInfo).toEqual({ basePrice: 270, discount: 10, finalPrice: 245 });
        // unit × qty reproduces the cart line total
        expect(item.priceInfo.finalPrice * item.quantity).toBe(customisedBurgerQty3.priceInfo.finalPrice);
    });

    test('defaults quantity to 1 and skips cancelled / id-less items', () => {
        const items = normalizeCartItemsForOrder({
            items: [
                { menuItemId: 'a', priceInfo: { totalBasePrice: 100, finalPrice: 90, discount: 10 } },
                { menuItemId: 'b', quantity: 2, status: 'CANCELLED', priceInfo: { totalBasePrice: 50, finalPrice: 50 } },
                { quantity: 1, priceInfo: { totalBasePrice: 50, finalPrice: 50 } }
            ]
        });

        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(1);
        expect(items[0].priceInfo).toEqual({ basePrice: 100, discount: 10, finalPrice: 90 });
    });
});
