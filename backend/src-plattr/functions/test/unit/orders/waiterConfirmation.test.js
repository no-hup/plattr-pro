/* eslint-disable global-require */
/**
 * Waiter-confirmation gate (AWAITING_CONFIRMATION).
 *
 * A guest-placed cart is withheld from the kitchen until a waiter confirms it. The gate
 * is only a fulfillment status, so what has to hold is:
 *   1. the state machine — the only ways out are the waiter's confirm and a cancel;
 *   2. the flat order.items copy is born in the same state as the cart it came from;
 *   3. confirming cascades to the items, so the kitchen gets a PENDING cart with
 *      PENDING items (serverMarkItemServed depends on that).
 *
 * The "kitchen cannot see it" half is an endpoint filter and lives in the e2e suite.
 */
const { FULFILLMENT_STATUS } = require('../../../orders/orderConstants');
const { mapCartStatus, isValidCartTransition } = require('../../../utils/statusUtils');
const { mockFirestoreDb } = require('../../mocks/firestore.mock');

const AWAITING = FULFILLMENT_STATUS.AWAITING_CONFIRMATION;

describe('AWAITING_CONFIRMATION status mapping', () => {
  test('is a first-class fulfillment status', () => {
    expect(AWAITING).toBe('AWAITING_CONFIRMATION');
  });

  test.each(['AWAITING_CONFIRMATION', 'awaiting_confirmation', ' Awaiting_Confirmation '])(
    'mapCartStatus normalizes %p',
    (raw) => expect(mapCartStatus(raw)).toBe(AWAITING),
  );
});

describe('AWAITING_CONFIRMATION transitions', () => {
  test('the waiter can confirm it into the kitchen queue', () => {
    expect(isValidCartTransition(AWAITING, FULFILLMENT_STATUS.PENDING)).toBe(true);
  });

  test('the waiter can reject it outright', () => {
    expect(isValidCartTransition(AWAITING, FULFILLMENT_STATUS.CANCELLED)).toBe(true);
  });

  // The whole point of the gate: nothing may skip the waiter and start cooking.
  test.each([
    FULFILLMENT_STATUS.PREPARING,
    FULFILLMENT_STATUS.READY,
    FULFILLMENT_STATUS.SERVED,
    FULFILLMENT_STATUS.RETURNED,
  ])('cannot jump straight to %s', (target) => {
    expect(isValidCartTransition(AWAITING, target)).toBe(false);
  });

  test('nothing falls back INTO the gate once it is past', () => {
    for (const from of Object.values(FULFILLMENT_STATUS)) {
      expect(isValidCartTransition(from, AWAITING)).toBe(false);
    }
  });
});

describe('validateCartStatus', () => {
  let OrderInputValidation;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('firebase-functions', () => ({
      https: {
        onCall: (handler) => handler,
        HttpsError: class extends Error {
          constructor(code, message) { super(message); this.code = code; }
        },
      },
    }));
    OrderInputValidation = require('../../../orders/orderInputValidation');
  });

  test('accepts the gate status', () => {
    expect(OrderInputValidation.validateCartStatus('AWAITING_CONFIRMATION')).toBe(AWAITING);
  });

  test('still rejects a status that is not in the enum', () => {
    expect(() => OrderInputValidation.validateCartStatus('AWAITING')).toThrow(/must be one of/);
  });
});

describe('normalizeCartItemsForOrder mirrors the cart status', () => {
  let normalizeCartItemsForOrder;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../../admin/admin', () => ({
      db: mockFirestoreDb(),
      admin: { firestore: () => mockFirestoreDb() },
      FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
      Timestamp: { now: jest.fn(), fromDate: jest.fn() },
    }));
    ({ normalizeCartItemsForOrder } = require('../../../orders/createOrUpdateOrder'));
  });

  const cartItem = { menuItemId: 'burger', quantity: 1, priceInfo: { totalBasePrice: 100, finalPrice: 100 } };

  // Regression: this used to hardcode PENDING, so switching the gate on left the flat
  // order.items copy one step ahead of carts[] — items already in the kitchen's state
  // while the cart they belong to was still waiting on a waiter.
  test('an unconfirmed cart produces unconfirmed items', () => {
    const [item] = normalizeCartItemsForOrder({ status: AWAITING, items: [cartItem] });
    expect(item.status).toBe(AWAITING);
  });

  test('a normal cart still produces PENDING items', () => {
    const [item] = normalizeCartItemsForOrder({ status: FULFILLMENT_STATUS.PENDING, items: [cartItem] });
    expect(item.status).toBe(FULFILLMENT_STATUS.PENDING);
  });

  test('a cart with no status at all falls back to PENDING', () => {
    const [item] = normalizeCartItemsForOrder({ items: [cartItem] });
    expect(item.status).toBe(FULFILLMENT_STATUS.PENDING);
  });
});

describe('confirming through cart-updateCartStatus', () => {
  let mockData;
  let updateCartStatus;
  const context = { auth: { uid: 'server1' } };
  const ORDER_PATH = 'restaurants/rest001/orders/order001';

  beforeEach(() => {
    jest.resetModules();
    mockData = {};

    jest.doMock('firebase-functions', () => ({
      https: {
        onCall: (handler) => handler,
        HttpsError: class extends Error {
          constructor(code, message, details) { super(message); this.code = code; this.details = details; }
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
    jest.doMock('../../../orders/createOrUpdateOrder', () => ({
      buildOrderPriceInfo: jest.fn().mockResolvedValue({ priceInfo: {}, appliedOffer: null, offerDiscount: 0 }),
    }));
    jest.doMock('../../../orders/calculateCharges', () => ({
      loadChargesConfig: jest.fn().mockResolvedValue([]),
    }));

    updateCartStatus = require('../../../cart/updateCartStatus');
  });

  const seedUnconfirmedCart = () => {
    mockData[ORDER_PATH] = JSON.parse(JSON.stringify({
      carts: [{
        status: AWAITING,
        statusHistory: [{ status: AWAITING, timestamp: 'THEN', userId: 'system' }],
        items: [
          { cartItemId: 1, menuItemId: 'a', status: AWAITING },
          { cartItemId: 2, menuItemId: 'b', status: AWAITING },
        ],
      }],
    }));
  };

  const invoke = (newStatus) => updateCartStatus.call(null, {
    data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus, sessionId: 'staff-session' },
  }, context);

  test('the confirm carries the items with it', async () => {
    seedUnconfirmedCart();

    const cart = (await invoke('PENDING')).data.carts[0];

    expect(cart.status).toBe(FULFILLMENT_STATUS.PENDING);
    expect(cart.items.map(i => i.status)).toEqual(['PENDING', 'PENDING']);
  });

  test('the confirm is recorded in the cart history', async () => {
    seedUnconfirmedCart();

    const cart = (await invoke('PENDING')).data.carts[0];

    expect(cart.statusHistory.map(h => h.status)).toEqual([AWAITING, 'PENDING']);
  });

  test('the kitchen cannot start cooking an unconfirmed cart', async () => {
    seedUnconfirmedCart();

    await expect(invoke('PREPARING'))
      .rejects.toThrow(/Invalid status transition from AWAITING_CONFIRMATION to PREPARING/);
  });

  test('a rejection is an ordinary cancel', async () => {
    seedUnconfirmedCart();

    const cart = (await invoke('CANCELLED')).data.carts[0];

    expect(cart.status).toBe(FULFILLMENT_STATUS.CANCELLED);
    expect(cart.items.map(i => i.status)).toEqual(['CANCELLED', 'CANCELLED']);
  });
});

/**
 * The line snapshots are what the till actually bills from. The order document and those
 * snapshots are two collections telling one story, so every cart status move that changes the
 * story has to move both.
 */
describe('cart status moves the line snapshots too', () => {
  let mockData;
  let updateCartStatus;
  const context = { auth: { uid: 'server1' } };
  const ORDER_PATH = 'restaurants/rest001/orders/order001';
  const LINE = (n) => `restaurants/rest001/lines/cart_abc_${n}`;
  const CART_ID = 'cart_abc';

  beforeEach(() => {
    jest.resetModules();
    mockData = {};

    jest.doMock('firebase-functions', () => ({
      https: {
        onCall: (handler) => handler,
        HttpsError: class extends Error {
          constructor(code, message, details) { super(message); this.code = code; this.details = details; }
        },
      },
    }));
    jest.doMock('../../../admin/initializeAdmin', () => ({ firestore: () => mockFirestoreDb(mockData) }));
    jest.doMock('../../../admin/admin', () => ({
      db: mockFirestoreDb(mockData),
      admin: { firestore: () => mockFirestoreDb(mockData) },
      Timestamp: { now: jest.fn(), fromDate: jest.fn() },
      FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
    }));
    jest.doMock('../../../adminApp/auth', () => ({
      validateStaffSession: jest.fn().mockResolvedValue({ serverId: 'srv_1', serverData: { role: 'MANAGER' } }),
    }));
    jest.doMock('../../../utils/timestamp', () => ({ now: () => 'NOW' }));
    jest.doMock('../../../orders/createOrUpdateOrder', () => ({
      buildOrderPriceInfo: jest.fn().mockResolvedValue({ priceInfo: {}, appliedOffer: null, offerDiscount: 0 }),
    }));
    jest.doMock('../../../orders/calculateCharges', () => ({
      loadChargesConfig: jest.fn().mockResolvedValue([]),
    }));

    updateCartStatus = require('../../../cart/updateCartStatus');
  });

  /** A cart of two items plus the two line snapshots checkout would have written for it. */
  const seed = (cartStatus, lineOver = {}) => {
    mockData[ORDER_PATH] = {
      carts: [{
        cartId: CART_ID,
        status: cartStatus,
        statusHistory: [{ status: cartStatus, timestamp: 'THEN', userId: 'system' }],
        items: [
          { cartItemId: 1, menuItemId: 'a', status: cartStatus },
          { cartItemId: 2, menuItemId: 'b', status: cartStatus },
        ],
      }],
    };
    for (const n of [1, 2]) {
      mockData[LINE(n)] = {
        lineId: `${CART_ID}_${n}`, listPrice: 45000, v: 0, countsTowardTotal: true,
        billId: null, sent: cartStatus !== AWAITING, ...lineOver,
      };
    }
  };

  const invoke = (newStatus) => updateCartStatus.call(null, {
    data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus, sessionId: 'staff-session' },
  }, context);

  const auditRows = () => Object.entries(mockData)
    .filter(([path]) => path.startsWith('restaurants/rest001/audit/'))
    .map(([, row]) => row);

  // ── The confirm ───────────────────────────────────────────────
  describe('waiter confirms', () => {
    test('marks the lines sent — ST prices a later void off this', async () => {
      seed(AWAITING);
      expect(mockData[LINE(1)].sent).toBe(false);

      await invoke('PENDING');

      expect(mockData[LINE(1)].sent).toBe(true);
      expect(mockData[LINE(2)].sent).toBe(true);
    });

    test('confirming is not a void: the lines still count toward the bill', async () => {
      seed(AWAITING);
      await invoke('PENDING');
      expect(mockData[LINE(1)].countsTowardTotal).toBe(true);
      expect(auditRows()).toHaveLength(0);
    });
  });

  // ── The reject / cancel ───────────────────────────────────────
  describe('cart is cancelled', () => {
    // This is the money bug: the old float total on the order dropped, but the line snapshots
    // the till bills from kept counting, so a rejected round was still billable.
    test('takes its lines off the bill', async () => {
      seed(AWAITING);

      await invoke('CANCELLED');

      expect(mockData[LINE(1)].countsTowardTotal).toBe(false);
      expect(mockData[LINE(2)].countsTowardTotal).toBe(false);
    });

    test('leaves a name on each void', async () => {
      seed(AWAITING);

      await invoke('CANCELLED');

      const rows = auditRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ action: 'void', staffId: 'srv_1', lineId: `${CART_ID}_1` });
      expect(rows[0].reason).toBeTruthy();
    });

    // TD-023: the cancel does not know WHY (the kitchen ran out, the guest left, a wrong dish), so it
    // must not claim one. 'other' is on ST's list, and the staff member's own words ride in the note.
    test('the reason is never invented: "other", and the note carries what the staff typed', async () => {
      seed(AWAITING);
      await updateCartStatus.call(null, {
        data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus: 'CANCELLED', sessionId: 'staff-session', notes: 'prawns ran out' },
      }, context);
      const rows = auditRows();
      expect(rows.every(r => r.reason === 'other')).toBe(true);
      expect(rows[0].note).toBe('cart cancelled: prawns ran out');
    });

    // Severity is the same split ST uses: food the kitchen already started is the serious one.
    test('an unsent round is P1', async () => {
      seed(AWAITING);
      await invoke('CANCELLED');
      expect(auditRows().every(r => r.sev === 'P1')).toBe(true);
    });

    test('a round already with the kitchen is P0', async () => {
      seed(FULFILLMENT_STATUS.PREPARING);
      await invoke('CANCELLED');
      expect(auditRows().every(r => r.sev === 'P0')).toBe(true);
    });

    test('an already-issued bill is left alone — reversing that is a credit note, not a void', async () => {
      seed(FULFILLMENT_STATUS.PENDING, { billId: 'bill_007' });

      await invoke('CANCELLED');

      expect(mockData[LINE(1)].countsTowardTotal).toBe(true);
      expect(auditRows()).toHaveLength(0);
    });

    test('a line voided earlier is not voided twice', async () => {
      seed(FULFILLMENT_STATUS.PENDING, {
        countsTowardTotal: false,
        void: { reason: 'guest left', note: '', approverId: 'srv_9' },
      });

      await invoke('CANCELLED');

      expect(auditRows()).toHaveLength(0);
      expect(mockData[LINE(1)].void.approverId).toBe('srv_9');
    });

    test('a cart whose lines were never written (pre-snapshot order) still cancels', async () => {
      mockData[ORDER_PATH] = {
        carts: [{ cartId: 'cart_old', status: 'PENDING', items: [{ cartItemId: 1, menuItemId: 'a', status: 'PENDING' }] }],
      };

      const cart = (await invoke('CANCELLED')).data.carts[0];

      expect(cart.status).toBe(FULFILLMENT_STATUS.CANCELLED);
      expect(auditRows()).toHaveLength(0);
    });
  });

  // ── Everything else must not touch the lines ──────────────────
  test.each(['PREPARING', 'READY'])('%s leaves the snapshots alone', async (target) => {
    seed(FULFILLMENT_STATUS.PENDING);
    const before = JSON.stringify(mockData[LINE(1)]);

    await invoke(target);

    expect(JSON.stringify(mockData[LINE(1)])).toBe(before);
    expect(auditRows()).toHaveLength(0);
  });
});
