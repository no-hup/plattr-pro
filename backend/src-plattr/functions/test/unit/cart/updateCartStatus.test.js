/* eslint-disable global-require */
/**
 * Tests for updateCartStatus — cart status must cascade to the cart's
 * non-terminal items. Without it nothing ever sets an item to READY and
 * serverMarkItemServed (READY → SERVED only) rejects every waiter tap.
 */
const { mockFirestoreDb } = require('../../mocks/firestore.mock');

describe('updateCartStatus item cascade', () => {
  let mockData;
  let updateCartStatus;
  const context = { auth: { uid: 'kitchen1' } };
  const ORDER_PATH = 'restaurants/rest001/orders/order001';

  beforeEach(() => {
    jest.resetModules();
    mockData = {};

    jest.doMock('firebase-functions', () => ({
      https: {
        onCall: (handler) => handler,
        HttpsError: class extends Error {
          constructor(code, message, details) {
            super(message);
            this.code = code;
            this.details = details;
          }
        },
      },
    }));
    jest.doMock('../../../admin/initializeAdmin', () => ({
      firestore: () => mockFirestoreDb(mockData),
    }));
    // orders/lineSnapshots.js (line snapshots + the void on cancel) reaches Firestore through
    // admin/admin, not initializeAdmin. Same store, so its writes land where the test can see them.
    jest.doMock('../../../admin/admin', () => ({
      db: mockFirestoreDb(mockData),
      admin: { firestore: () => mockFirestoreDb(mockData) },
      Timestamp: { now: jest.fn(), fromDate: jest.fn() },
      FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
    }));
    // The real validateStaffSession returns the acting staff; the void on cancel puts that
    // id on the audit row (ST R5), so the stub has to be truthful about it.
    jest.doMock('../../../adminApp/auth', () => ({
      validateStaffSession: jest.fn().mockResolvedValue({ serverId: 'srv_1', serverData: { role: 'MANAGER' } }),
    }));
    jest.doMock('../../../utils/timestamp', () => ({ now: () => 'NOW' }));
    // Bill recompute on CANCELLED/RETURNED is covered by the order-level code;
    // keep this test about the cascade only.
    jest.doMock('../../../orders/createOrUpdateOrder', () => ({
      buildOrderPriceInfo: jest.fn().mockResolvedValue({ priceInfo: {}, appliedOffer: null, offerDiscount: 0 }),
    }));
    jest.doMock('../../../orders/calculateCharges', () => ({
      loadChargesConfig: jest.fn().mockResolvedValue([]),
    }));

    updateCartStatus = require('../../../cart/updateCartStatus');
  });

  const seedOrder = (cart) => {
    mockData[ORDER_PATH] = JSON.parse(JSON.stringify({ carts: [cart] }));
  };

  const invoke = (newStatus) => updateCartStatus.call(null, {
    data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus, sessionId: 'staff-session' },
  }, context);

  test('READY cascades to PENDING/PREPARING items and skips terminal ones', async () => {
    seedOrder({
      status: 'PENDING',
      items: [
        { cartItemId: 1, menuItemId: 'a', status: 'PENDING' },
        { cartItemId: 2, menuItemId: 'b', status: 'PREPARING' },
        { cartItemId: 3, menuItemId: 'c', status: 'CANCELLED' },
        { cartItemId: 4, menuItemId: 'd', status: 'SERVED' },
        { cartItemId: 5, menuItemId: 'e', status: 'RETURNED' },
      ],
    });

    const result = await invoke('READY');
    const cart = result.data.carts[0];

    expect(cart.status).toBe('READY');
    expect(cart.items.map(i => i.status)).toEqual(['READY', 'READY', 'CANCELLED', 'SERVED', 'RETURNED']);
    // Non-status fields untouched
    expect(cart.items[0].menuItemId).toBe('a');
  });

  test('cart without an items array still updates', async () => {
    seedOrder({ status: 'PENDING' });

    const result = await invoke('PREPARING');

    expect(result.data.carts[0].status).toBe('PREPARING');
    expect(result.data.carts[0].items).toEqual([]);
  });

  test('invalid transition is still rejected before any cascade', async () => {
    seedOrder({ status: 'READY', items: [{ cartItemId: 1, menuItemId: 'a', status: 'READY' }] });

    await expect(invoke('PENDING')).rejects.toThrow(/Invalid status transition from READY to PENDING/);
  });
});
