/* eslint-disable global-require */
/**
 * Pins "an order does not count itself as a prior order". The prior-order
 * count queries orders by sessionId, so once the order exists every
 * re-evaluation (append cart, cancel cart, COMPLETED) would otherwise see it
 * and unlock a userHistory offer the customer never saw at checkout.
 */

// Orders returned by the session query; tests mutate this per case.
let mockOrders = [];

jest.mock('../../../admin/admin', () => {
    const snap = (rows) => ({
        empty: rows.length === 0,
        size: rows.length,
        docs: rows.map(([id, data]) => ({ id, data: () => data })),
    });
    const mockOffers = [['off_loyalty', {
        isActive: true,
        type: 'PERCENTAGE',
        scope: 'ORDER',
        title: 'Loyalty 15% (≥1 prior order)',
        benefit: { value: 15 },
        conditions: { userHistory: { minOrderCount: 1 } },
    }]];
    return {
        db: {
            collection: () => ({
                doc: () => ({
                    // restaurant doc → offers enabled (default true)
                    get: async () => ({ exists: true, data: () => ({}) }),
                    collection: (name) => ({
                        where: () => ({ get: async () => snap(name === 'orders' ? mockOrders : mockOffers) }),
                    }),
                }),
            }),
        },
    };
});

const { evaluateAndPickBestOffer } = require('../../../offers/evaluateOrderOffers');

const ITEMS = [{ menuItemId: 'a', cartItemId: 1, quantity: 1, status: 'PENDING', priceInfo: { finalPrice: 500 } }];
const evaluate = (excludeOrderId) => evaluateAndPickBestOffer('rest001', ITEMS, 500, 'ses001', excludeOrderId);

describe('evaluateAndPickBestOffer userHistory prior-order count', () => {
    test('the order being re-evaluated does not count as its own prior order', async () => {
        mockOrders = [['order001', { sessionId: 'ses001' }]];

        expect(await evaluate('order001')).toBeNull();
    });

    test('other orders in the session still count', async () => {
        mockOrders = [['order000', { sessionId: 'ses001' }], ['order001', { sessionId: 'ses001' }]];

        const pick = await evaluate('order001');
        expect(pick.offer.id).toBe('off_loyalty');
        expect(pick.discountAmount).toBe(75);
        // No excludeOrderId (first checkout — order has no id yet) excludes nothing
        expect((await evaluate(null)).offer.id).toBe('off_loyalty');
    });
});
