/* eslint-disable global-require */
/**
 * Tests for removeItemFromCart — added in Phase 2.5 of
 * TODO_Multi_Config_Cart_Feature.md.
 *
 * These are specifically regression guards for the pricing bug where
 * `safeRecalculateItemPrice` read its own previous output as per-unit and
 * re-multiplied by quantity, corrupting prices on every decrement from
 * qty > 1. Full removal at qty === 1 always worked because that branch
 * splices the item and never recalculates. See Phase 2.5 for details.
 */
const { mockFirestoreDb } = require('../../mocks/firestore.mock');

const FULFILLMENT_STATUS = { PENDING: 'PENDING', CANCELLED: 'cancelled' };

describe('removeItemFromCart Tests (Phase 2.5 decrement pricing)', () => {
  let mockData;
  let removeItemFromCart;
  let context;
  const DEFAULT_RESTAURANT_ID = 'rest001';
  const DEFAULT_TABLE_ID = 'table001';

  beforeEach(() => {
    jest.resetModules();

    mockData = {};
    context = { auth: { uid: 'user123' } };

    jest.doMock('firebase-functions', () => ({
      https: {
        onCall: (handler) => handler,
        HttpsError: class extends Error {
          constructor(code, message, details) {
            super(message);
            this.code = code;
            this.message = message;
            this.details = details;
          }
        },
      },
    }));

    jest.doMock('../../../admin/admin', () => ({
      db: mockFirestoreDb(mockData),
      admin: { firestore: () => mockFirestoreDb(mockData) },
      FieldValue: {
        serverTimestamp: () => 'SERVER_TIMESTAMP',
        increment: (n) => ({ increment: n }),
        delete: () => 'DELETE_FIELD',
      },
      Timestamp: { now: () => ({ toMillis: () => 1234567890 }) },
    }));

    jest.doMock('../../../singleton/FeatureFlags', () => ({
      isEnabled: jest.fn().mockReturnValue(false),
      loadOverrides: jest.fn().mockResolvedValue(undefined),
    }));

    jest.doMock('../../../orders/orderConstants', () => ({ FULFILLMENT_STATUS }));

    removeItemFromCart = require('../../../cart/removeItemFromCart');
  });

  const setDoc = (path, data) => {
    mockData[path] = JSON.parse(JSON.stringify(data));
  };

  const setupCart = (cartData, restaurantId = DEFAULT_RESTAURANT_ID, tableId = DEFAULT_TABLE_ID) => {
    setDoc(`restaurants/${restaurantId}/carts/${tableId}`, cartData);
  };

  const setupMenuItem = (item, restaurantId = DEFAULT_RESTAURANT_ID) => {
    setDoc(`restaurants/${restaurantId}/menuItems/${item.id}`, item);
  };

  const invoke = async (payload) => removeItemFromCart.call(null, { data: payload }, context);

  // Builds a priceInfo object in the "× quantity" schema the rest of the
  // backend expects — mirrors what `createCartItem` produces on initial add.
  const priceInfoForQty = (unitBase, unitFinal, qty) => ({
    itemBasePrice: unitBase * qty,
    itemFinalPrice: unitFinal * qty,
    totalVariantBasePrice: 0,
    totalVariantFinalPrice: 0,
    totalAddonBasePrice: 0,
    totalAddonFinalPrice: 0,
    totalBasePrice: unitBase * qty,
    finalPrice: unitFinal * qty,
    discount: 0,
    discountAmount: 0,
  });

  const seedCartWithSimpleItem = (qty, unitBase = 100, unitFinal = 100) => {
    const menuItem = {
      id: 'item001',
      name: 'Burger',
      priceInfo: { basePrice: unitBase, finalPrice: unitFinal, discount: 0 },
      isInStock: true,
      variants: [],
      addons: [],
    };
    const cart = {
      restaurantId: DEFAULT_RESTAURANT_ID,
      tableId: DEFAULT_TABLE_ID,
      items: [
        {
          cartItemId: 1,
          menuItemId: menuItem.id,
          quantity: qty,
          priceInfo: priceInfoForQty(unitBase, unitFinal, qty),
          selectedVariantsDetails: [],
          selectedAddonsDetails: [],
          status: FULFILLMENT_STATUS.PENDING,
        },
      ],
      priceInfo: {
        basePrice: unitBase * qty,
        finalPrice: unitFinal * qty,
        totalDiscount: 0,
        totalDiscountAmount: 0,
        totalVariantBasePrice: 0,
        totalAddonBasePrice: 0,
      },
      status: 'active',
    };
    setupCart(cart);
    setupMenuItem(menuItem);
    return { menuItem, cart };
  };

  describe('Decrement from qty > 1 — the Phase 2.5 bug', () => {
    test('1. decrement qty=2 -> qty=1 - cart total returns to exactly unit price', async () => {
      // This is the exact user repro. Before the fix, cart total stayed at 200
      // because safeRecalculateItemPrice re-read the corrupted priceInfo.
      seedCartWithSimpleItem(2, 100, 100);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: 'item001',
        cartItemId: 1,
      });

      expect(result.status).toBe('success');
      expect(result.data.cart.items).toHaveLength(1);

      const item = result.data.cart.items[0];
      expect(item.quantity).toBe(1);
      expect(item.priceInfo.finalPrice).toBe(100);
      expect(item.priceInfo.totalBasePrice).toBe(100);
      expect(item.priceInfo.itemBasePrice).toBe(100);
      expect(item.priceInfo.itemFinalPrice).toBe(100);
      expect(result.data.cart.priceInfo.finalPrice).toBe(100);
      expect(result.data.cart.priceInfo.basePrice).toBe(100);
    });

    test('2. decrement qty=3 -> qty=2 - scales linearly by unit price', async () => {
      seedCartWithSimpleItem(3, 100, 100);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: 'item001',
        cartItemId: 1,
      });

      const item = result.data.cart.items[0];
      expect(item.quantity).toBe(2);
      expect(item.priceInfo.finalPrice).toBe(200);
      expect(result.data.cart.priceInfo.finalPrice).toBe(200);
    });

    test('3. decrement with discounted unit price - uses discounted final for total', async () => {
      // Unit base 100, unit final 80 (20% discount). Qty=2 -> Qty=1.
      seedCartWithSimpleItem(2, 100, 80);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: 'item001',
        cartItemId: 1,
      });

      const item = result.data.cart.items[0];
      expect(item.quantity).toBe(1);
      expect(item.priceInfo.totalBasePrice).toBe(100);
      expect(item.priceInfo.finalPrice).toBe(80);
      expect(result.data.cart.priceInfo.basePrice).toBe(100);
      expect(result.data.cart.priceInfo.finalPrice).toBe(80);
    });
  });

  describe('Full removal - still works (regression guard for the qty=1 splice path)', () => {
    test('4. decrement qty=1 -> 0 - splices item and empties cart', async () => {
      seedCartWithSimpleItem(1, 100, 100);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: 'item001',
        cartItemId: 1,
      });

      expect(result.status).toBe('success');
      expect(result.data.cart.items).toHaveLength(0);
      expect(result.data.cart.priceInfo.finalPrice).toBe(0);
      expect(result.data.cart.priceInfo.basePrice).toBe(0);
    });
  });

  describe('Decrement with variants + addons', () => {
    test('5. decrement customized item qty=2 -> qty=1 - variant and addon contributions scale linearly', async () => {
      // Burger (unit base 100, unit final 80, 20% discount) + addon "cheese" (unit 20).
      // The addon has no `respectParentDiscount: true`, so it does NOT inherit the
      // parent's 20% discount — its finalPrice stays 20 (not 16). This is the
      // default behaviour in calculateItemPrice: addons only inherit the parent
      // discount when explicitly opted in via respectParentDiscount.
      // Qty=2 totals: base = (100+20)*2 = 240, final = (80+20)*2 = 200.
      // After decrement to qty=1: base = 120, final = 100.
      const menuItem = {
        id: 'item_combo',
        name: 'Burger Combo',
        priceInfo: { basePrice: 100, finalPrice: 80, discount: 20 },
        isInStock: true,
        variants: [],
        addons: [{ id: 'cheese' }],
      };
      const cart = {
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        items: [
          {
            cartItemId: 1,
            menuItemId: menuItem.id,
            quantity: 2,
            priceInfo: {
              itemBasePrice: 200,
              itemFinalPrice: 160,
              totalVariantBasePrice: 0,
              totalVariantFinalPrice: 0,
              totalAddonBasePrice: 40,
              totalAddonFinalPrice: 40,
              totalBasePrice: 240,
              finalPrice: 200,
              discount: 20,
              discountAmount: 40,
            },
            selectedVariantsDetails: [],
            selectedAddonsDetails: [
              {
                id: 'cheese',
                name: 'Cheese',
                priceInfo: { basePrice: 20, finalPrice: 20, discount: 0 },
              },
            ],
            status: FULFILLMENT_STATUS.PENDING,
          },
        ],
        priceInfo: {
          basePrice: 240,
          finalPrice: 200,
          totalDiscount: 16.67,
          totalDiscountAmount: 40,
          totalVariantBasePrice: 0,
          totalAddonBasePrice: 40,
        },
        status: 'active',
      };
      setupCart(cart);
      setupMenuItem(menuItem);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: menuItem.id,
        cartItemId: 1,
      });

      const item = result.data.cart.items[0];
      expect(item.quantity).toBe(1);
      // Unit base (100) + unit addon base (20) = 120 for qty=1.
      expect(item.priceInfo.totalBasePrice).toBe(120);
      // Unit final (80) + unit addon final (20) = 100 for qty=1.
      expect(item.priceInfo.finalPrice).toBe(100);
      expect(item.priceInfo.totalAddonBasePrice).toBe(20);
      expect(result.data.cart.priceInfo.basePrice).toBe(120);
      expect(result.data.cart.priceInfo.finalPrice).toBe(100);
    });
  });

  describe('Multi-config surgical targeting (cross-check for §1 cartItemId fix)', () => {
    test('6. decrement targets cartItemId, not menuItemId - leaves the other row untouched', async () => {
      // Two rows for the same menuItemId, differing only in addon.
      // Tapping - on row 2 (cartItemId=2) should decrement row 2 from qty=2
      // to qty=1 and leave row 1 completely alone.
      const menuItem = {
        id: 'item001',
        name: 'Burger',
        priceInfo: { basePrice: 100, finalPrice: 100, discount: 0 },
        isInStock: true,
        variants: [],
        addons: [{ id: 'cheese' }, { id: 'bacon' }],
      };
      const row1 = {
        cartItemId: 1,
        menuItemId: 'item001',
        quantity: 1,
        priceInfo: priceInfoForQty(100, 100, 1),
        selectedVariantsDetails: [],
        selectedAddonsDetails: [
          { id: 'cheese', name: 'Cheese', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
        ],
        status: FULFILLMENT_STATUS.PENDING,
      };
      const row2 = {
        cartItemId: 2,
        menuItemId: 'item001',
        quantity: 2,
        priceInfo: priceInfoForQty(100, 100, 2),
        selectedVariantsDetails: [],
        selectedAddonsDetails: [
          { id: 'bacon', name: 'Bacon', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
        ],
        status: FULFILLMENT_STATUS.PENDING,
      };
      setupCart({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        items: [row1, row2],
        priceInfo: { basePrice: 300, finalPrice: 300, totalDiscount: 0, totalDiscountAmount: 0, totalVariantBasePrice: 0, totalAddonBasePrice: 0 },
        status: 'active',
      });
      setupMenuItem(menuItem);

      const result = await invoke({
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        menuItemId: 'item001',
        cartItemId: 2,
      });

      expect(result.status).toBe('success');
      expect(result.data.cart.items).toHaveLength(2);

      const decremented = result.data.cart.items.find((i) => i.cartItemId === 2);
      const untouched = result.data.cart.items.find((i) => i.cartItemId === 1);

      expect(decremented).toBeDefined();
      expect(decremented.quantity).toBe(1);
      expect(decremented.priceInfo.finalPrice).toBe(100);

      expect(untouched).toBeDefined();
      expect(untouched.quantity).toBe(1);
      expect(untouched.priceInfo.finalPrice).toBe(100);
      // Row 1's addon snapshot must be unchanged.
      expect(untouched.selectedAddonsDetails[0].id).toBe('cheese');

      // Cart total is 2 × 100 = 200.
      expect(result.data.cart.priceInfo.finalPrice).toBe(200);
    });
  });

  describe('Menu item no longer exists', () => {
    test('7. decrement when menuItem is missing - throws failed-precondition', async () => {
      // Seed the cart but NOT the menuItem. removeItemFromCart re-fetches the
      // menuItem on every decrement (Phase 2.5) to re-derive the price, so a
      // missing menuItem must surface a clear error instead of silently
      // producing a garbage price or crashing.
      const cart = {
        restaurantId: DEFAULT_RESTAURANT_ID,
        tableId: DEFAULT_TABLE_ID,
        items: [
          {
            cartItemId: 1,
            menuItemId: 'ghost_item',
            quantity: 2,
            priceInfo: priceInfoForQty(50, 50, 2),
            selectedVariantsDetails: [],
            selectedAddonsDetails: [],
            status: FULFILLMENT_STATUS.PENDING,
          },
        ],
        priceInfo: {
          basePrice: 100,
          finalPrice: 100,
          totalDiscount: 0,
          totalDiscountAmount: 0,
          totalVariantBasePrice: 0,
          totalAddonBasePrice: 0,
        },
        status: 'active',
      };
      setupCart(cart);

      await expect(
        invoke({
          restaurantId: DEFAULT_RESTAURANT_ID,
          tableId: DEFAULT_TABLE_ID,
          menuItemId: 'ghost_item',
          cartItemId: 1,
        })
      ).rejects.toThrow();
    });
  });
});
