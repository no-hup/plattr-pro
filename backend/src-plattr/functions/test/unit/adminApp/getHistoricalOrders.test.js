/* eslint-disable global-require */

// Regression test for the admin history bug: QuerySnapshot.forEach passes no
// index, so `forEach((doc, index) => index < pageSize ...)` returned zero
// orders for every page. Must iterate snapshot.docs instead.

describe('getHistoricalOrders pagination', () => {
    let getHistoricalOrders;
    let orderDocs;

    const makeDoc = (id, data) => ({ id, data: () => data });

    beforeEach(() => {
        jest.resetModules();

        jest.doMock('firebase-functions', () => ({
            https: { onCall: (handler) => handler }
        }));
        jest.doMock('../../../adminApp/auth', () => ({
            validateAdminSession: jest.fn(() => Promise.resolve())
        }));
        jest.doMock('../../../utils/timestamp', () => ({
            fromDate: (d) => d,
            toISOString: (t) => t
        }));

        const query = {
            orderBy: () => query,
            where: () => query,
            startAfter: () => query,
            limit: () => query,
            get: () => Promise.resolve({ docs: orderDocs, forEach: (fn) => orderDocs.forEach(fn) })
        };
        jest.doMock('../../../admin/admin', () => ({
            admin: {},
            db: { collection: () => ({ doc: () => ({ collection: () => query }) }) }
        }));

        getHistoricalOrders = require('../../../adminApp/orders_admin').getHistoricalOrders;
    });

    test('returns pageSize orders with hasMore on a pageSize+1 snapshot', async () => {
        const pageSize = 3;
        orderDocs = Array.from({ length: pageSize + 1 }, (_, i) =>
            makeDoc(`order_${i}`, {
                orderStatus: 'COMPLETED',
                priceInfo: { finalPrice: 100 + i },
                createdAt: `2026-09-0${i + 1}T00:00:00Z`,
                carts: [{ items: [{ quantity: 2 }] }]
            })
        );

        const res = await getHistoricalOrders({
            data: { restaurantId: 'rest001', sessionId: 's1', pageSize }
        });

        const payload = res.data;
        expect(payload.orders).toHaveLength(pageSize);
        expect(payload.hasMore).toBe(true);
        expect(payload.nextCursor).toBe('2026-09-03T00:00:00Z');
        expect(payload.orders[0].status).toBe('COMPLETED');
        expect(payload.orders[0].totalAmount).toBe(100);
        expect(payload.orders[0].itemCount).toBe(2);
    });

    test('short page: all orders, no hasMore', async () => {
        orderDocs = [makeDoc('order_only', { orderStatus: 'IN_PROGRESS', priceInfo: { finalPrice: 50 } })];

        const res = await getHistoricalOrders({
            data: { restaurantId: 'rest001', sessionId: 's1', pageSize: 20 }
        });

        expect(res.data.orders).toHaveLength(1);
        expect(res.data.hasMore).toBe(false);
        expect(res.data.nextCursor).toBeNull();
    });
});
