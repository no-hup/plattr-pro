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

    // D4 (2026-09-25): once the bill is printed only the till's Edit bill changes it. The cancel used to
    // "succeed" while skipping the billed line: the kitchen lost the dish and the guest still paid for it.
    test('D4: a round on a printed bill is refused, naming the bill, and nothing changes', async () => {
      seed(FULFILLMENT_STATUS.PENDING, { billId: 'bill_007' });
      mockData['restaurants/rest001/bills/bill_007'] = { series: 'A', number: '0002', status: 'issued' };
      const orderBefore = JSON.stringify(mockData[ORDER_PATH]);

      await expect(invoke('CANCELLED')).rejects.toThrow('Bill A-0002 is printed — ask the cashier to edit it on the till');

      expect(mockData[LINE(1)].countsTowardTotal).toBe(true);
      expect(JSON.stringify(mockData[ORDER_PATH])).toBe(orderBefore);
      expect(auditRows()).toHaveLength(0);
    });

    // A served dish was eaten. The cart cancel keeps it SERVED and billable on the order, so its line
    // must keep counting too, or the till bills less than the order says (impact review, D4).
    test('a dish already served stays on the bill when the rest of its round is cancelled', async () => {
      seed(FULFILLMENT_STATUS.READY);
      mockData[ORDER_PATH].carts[0].items[0].status = 'SERVED';

      await invoke('CANCELLED');

      expect(mockData[LINE(1)].countsTowardTotal).toBe(true);
      expect(mockData[LINE(2)].countsTowardTotal).toBe(false);
      expect(auditRows().map(r => r.lineId)).toEqual([`${CART_ID}_2`]);
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

  // ── D4: one dish off a sent round ─────────────────────────────
  // 20:10, table 6 sent Chicken 65 (a) and Butter Naan (b); the guest drops the naan. Only the naan leaves
  // the bill and the kitchen; the Chicken 65 keeps cooking. Audited, no PIN, P0 because the kitchen had it.
  describe('D4: the waiter cancels one dish', () => {
    const cancelDish = (cartItemId) => updateCartStatus.call(null, {
      data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus: 'CANCELLED', cartItemId, sessionId: 'staff-session' },
    }, context);

    test('only that dish leaves the bill and the kitchen; the round keeps going', async () => {
      seed(FULFILLMENT_STATUS.PREPARING);

      await cancelDish(2);

      const cart = mockData[ORDER_PATH].carts[0];
      expect(cart.status).toBe('PREPARING');
      expect(cart.items.map(i => i.status)).toEqual(['PREPARING', 'CANCELLED']);
      expect(mockData[LINE(1)].countsTowardTotal).toBe(true);
      expect(mockData[LINE(2)].countsTowardTotal).toBe(false);
      const rows = auditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ action: 'void', sev: 'P0', staffId: 'srv_1', lineId: `${CART_ID}_2`, reason: 'other' });
    });

    // The order total is summed from each round's own priceInfo, and the order offer is judged on it. Table 9's
    // Chicken 65 (₹280) + Coastal Crab Roast (₹620) round earned the "₹100 off (min ₹499)" offer; with the crab
    // cancelled the round is worth ₹280 and the offer must be judged on ₹280, not ₹900.
    test('the round\'s own total drops by the cancelled dish, so the order offer is judged on what is left', async () => {
      seed(FULFILLMENT_STATUS.READY);
      const cart = mockData[ORDER_PATH].carts[0];
      cart.priceInfo = { basePrice: 900, finalPrice: 900 };
      cart.items[0].priceInfo = { totalBasePrice: 280, finalPrice: 280 };
      cart.items[1].priceInfo = { totalBasePrice: 620, finalPrice: 620 };
      const { buildOrderPriceInfo } = require('../../../orders/createOrUpdateOrder');

      await cancelDish(2);

      expect(mockData[ORDER_PATH].carts[0].priceInfo).toMatchObject({ basePrice: 280, finalPrice: 280 });
      expect(buildOrderPriceInfo.mock.calls[0][1][0].priceInfo).toMatchObject({ basePrice: 280, finalPrice: 280 });
    });

    test('cancelling the last live dish cancels the round', async () => {
      seed(FULFILLMENT_STATUS.PENDING);
      mockData[ORDER_PATH].carts[0].items[0].status = 'CANCELLED';

      await cancelDish(2);

      expect(mockData[ORDER_PATH].carts[0].status).toBe('CANCELLED');
    });

    // Table 9: the Chicken 65 was served, the naan is still READY and the guest drops it. Nothing is left for the
    // kitchen, so the round is SERVED; left READY, the kitchen kept an empty ticket and COMPLETED was refused.
    test('cancelling the last unserved dish of a round with a served dish leaves the round SERVED', async () => {
      seed(FULFILLMENT_STATUS.READY);
      mockData[ORDER_PATH].carts[0].items[0].status = 'SERVED';

      await cancelDish(2);

      expect(mockData[ORDER_PATH].carts[0].status).toBe('SERVED');
      expect(mockData[ORDER_PATH].carts[0].items.map(i => i.status)).toEqual(['SERVED', 'CANCELLED']);
    });

    test('a served dish cannot be cancelled, and nothing changes', async () => {
      seed(FULFILLMENT_STATUS.READY);
      mockData[ORDER_PATH].carts[0].items[1].status = 'SERVED';

      await expect(cancelDish(2)).rejects.toThrow(/already served/);
      expect(mockData[LINE(2)].countsTowardTotal).toBe(true);
      expect(auditRows()).toHaveLength(0);
    });

    test('a dish on a printed bill is refused, naming the bill', async () => {
      seed(FULFILLMENT_STATUS.PENDING, { billId: 'bill_007' });
      mockData['restaurants/rest001/bills/bill_007'] = { series: 'A', number: '0002', status: 'issued' };

      await expect(cancelDish(2)).rejects.toThrow('Bill A-0002 is printed — ask the cashier to edit it on the till');
      expect(mockData[LINE(2)].countsTowardTotal).toBe(true);
    });

    test('a dish id that is not in the round is refused', async () => {
      seed(FULFILLMENT_STATUS.PENDING);
      await expect(cancelDish(9)).rejects.toThrow(/not in this round/);
    });

    test('a dish id with any status but CANCELLED is refused: one dish can only be cancelled', async () => {
      seed(FULFILLMENT_STATUS.PENDING);
      await expect(updateCartStatus.call(null, {
        data: { restaurantId: 'rest001', orderId: 'order001', cartIndex: 0, newStatus: 'READY', cartItemId: 2, sessionId: 'staff-session' },
      }, context)).rejects.toThrow(/only be cancelled/);
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
