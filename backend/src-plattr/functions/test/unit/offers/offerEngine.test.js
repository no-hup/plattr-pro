/**
 * Pins the userHistory.activeSessionOrderCount arithmetic in offerEngine.
 *
 * sessionData.sessionOrderCount is the number of PRIOR orders in the sitting
 * (the order being evaluated is excluded by evaluateOrderOffers). The rule
 * `sessionOrderCount < activeSessionOrderCount - 1` therefore reads
 * "activeSessionOrderCount = N unlocks on the Nth order of the sitting".
 * Before the prior-count fix the -1 was compensating for the current order
 * being counted; now it is load-bearing, so a change in either place must
 * break this test.
 */
const { validateOfferApplication } = require('../../../offers/offerEngine');

const offer = {
    id: 'off_second_order',
    isActive: true,
    validity: { startDate: '2020-01-01T00:00:00.000+05:30', endDate: '2099-12-31T23:59:59.999+05:30' },
    type: 'PERCENTAGE',
    scope: 'ORDER',
    benefit: { value: 10 },
    conditions: { userHistory: { activeSessionOrderCount: 2 } },
};
const cart = {
    items: [{ menuItemId: 'a', cartItemId: 1, quantity: 1, status: 'PENDING', priceInfo: { finalPrice: 500 } }],
    priceInfo: { basePrice: 500 },
};
const check = (priorOrders) =>
    validateOfferApplication(offer, cart, { totalOrderCount: priorOrders, sessionOrderCount: priorOrders }).isValid;

describe('offerEngine userHistory.activeSessionOrderCount', () => {
    test('activeSessionOrderCount=2 is locked on the first order of the sitting', () => {
        expect(check(0)).toBe(false);
    });

    test('activeSessionOrderCount=2 unlocks on the second order (one prior)', () => {
        expect(check(1)).toBe(true);
        expect(check(2)).toBe(true);
    });
});
