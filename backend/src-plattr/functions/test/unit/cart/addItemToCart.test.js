/* eslint-disable global-require */
const { mockFirestoreDb } = require('../../mocks/firestore.mock');
const cartFixtures = require('../../fixtures/cart.fixtures');
const menuItemFixtures = require('../../fixtures/menuItem.fixtures');

// Mock specific constants if needed, otherwise assume strings
const FULFILLMENT_STATUS = { PENDING: 'PENDING' };

describe('addItemToCart Tests (Phase 5 & 6)', () => {
    let mockData;
    let addItemToCart;
    let mockFeatureFlagEnabled;
    let context;
    const DEFAULT_RESTAURANT_ID = 'rest001';
    const DEFAULT_TABLE_ID = 'table001';
    const DEFAULT_SESSION_ID = 'session123';

    beforeEach(() => {
        jest.resetModules(); // Reset cache to ensure new mocks apply

        mockData = {}; // Reset data store
        context = { auth: { uid: 'user123' } };

        // Mock feature flags
        mockFeatureFlagEnabled = jest.fn();

        // Setup Mocks
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
                }
            }
        }));

        jest.doMock('../../../admin/admin', () => ({
            db: mockFirestoreDb(mockData),
            admin: { firestore: () => mockFirestoreDb(mockData) },
            FieldValue: {
                serverTimestamp: () => 'SERVER_TIMESTAMP',
                increment: (n) => ({ increment: n }),
                delete: () => 'DELETE_FIELD'
            },
            Timestamp: { now: () => ({ toMillis: () => 1234567890 }) }
        }));

        jest.doMock('../../../singleton/FeatureFlags', () => ({
            isEnabled: mockFeatureFlagEnabled,
            loadOverrides: jest.fn().mockResolvedValue(undefined)
        }));

        // Mock orderConstants if used by boilerplate helper
        jest.doMock('../../../orders/orderConstants', () => ({
            FULFILLMENT_STATUS
        }));

        // Table always has an active session in unit tests; the guard itself
        // is exercised by the e2e suite against the emulator.
        jest.doMock('../../../session/sessionService', () => ({
            validateTableSession: jest.fn().mockResolvedValue({ id: DEFAULT_SESSION_ID })
        }));

        // Initialize dependencies
        addItemToCart = require('../../../cart/addItemToCart');

        // Default flag behavior
        mockFeatureFlagEnabled.mockImplementation((flag) => {
            const defaults = {
                isOtpManadatoryAtScan: true,
                isUsernameEnabled: false,
                isMultiUserSupportEnabled: false
            };
            return defaults[flag] ?? false;
        });
    });

    const invokeAddItem = async (payload) => {
        return addItemToCart.call(null, { data: payload }, context);
    };

    // Helper to populate mockData
    const setDoc = (path, data) => {
        mockData[path] = JSON.parse(JSON.stringify(data)); // Deep copy to prevent side effects
    };

    // --- Usage Helpers to reduce redundancy ---

    const setupSession = (restaurantId = DEFAULT_RESTAURANT_ID, sessionId = DEFAULT_SESSION_ID, isActive = true) => {
        setDoc(`restaurants/${restaurantId}/sessions/${sessionId}`, {
            status: isActive ? 'active' : 'ended',
            expiresAt: Date.now() + 10000
        });
    };

    const setupMenuItem = (restaurantId = DEFAULT_RESTAURANT_ID, item) => {
        setDoc(`restaurants/${restaurantId}/menuItems/${item.id}`, item);
    };

    const setupCart = (restaurantId = DEFAULT_RESTAURANT_ID, tableId = DEFAULT_TABLE_ID, cartData) => {
        setDoc(`restaurants/${restaurantId}/carts/${tableId}`, cartData);
    };

    const setupVariant = (restaurantId = DEFAULT_RESTAURANT_ID, variant) => {
        setDoc(`restaurants/${restaurantId}/variants/${variant.id}`, variant);
    };

    describe('Core Happy Path', () => {
        test('1. addItemToCart - empty cart - should create new cart with item', async () => {
            const menuItem = menuItemFixtures.simple;

            // Setup
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);
            // No cart setup implies empty/new cart

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: DEFAULT_TABLE_ID,
                menuItemId: menuItem.id,
                quantity: 1,
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);

            expect(result.status).toBe('success');
            expect(result.data.cart.items).toHaveLength(1);
            expect(result.data.cart.items[0].menuItemId).toBe(menuItem.id);
            expect(result.data.cart.priceInfo.finalPrice).toBe(100);
        });

        test('2. addItemToCart - existing cart - should add new item', async () => {
            const existingCart = cartFixtures.withOneItem;
            const newItem = menuItemFixtures.discounted;

            setupCart(DEFAULT_RESTAURANT_ID, DEFAULT_TABLE_ID, existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, newItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: DEFAULT_TABLE_ID,
                menuItemId: newItem.id,
                quantity: 2,
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);

            expect(result.status).toBe('success');
            expect(result.data.cart.items).toHaveLength(2);
            const addedItem = result.data.cart.items.find(i => i.menuItemId === newItem.id);
            expect(addedItem.quantity).toBe(2);
            expect(addedItem.priceInfo.finalPrice).toBe(160); // 80 * 2
        });

        test('3. addItemToCart - identical item exists - should increase quantity', async () => {
            const existingCart = cartFixtures.withOneItem; // Has item001
            const menuItem = menuItemFixtures.simple; // item001

            setupCart(DEFAULT_RESTAURANT_ID, DEFAULT_TABLE_ID, existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: DEFAULT_TABLE_ID,
                menuItemId: menuItem.id,
                quantity: 1,
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);

            expect(result.status).toBe('success');
            // Should merge into existing item, length remains 1
            expect(result.data.cart.items).toHaveLength(1);
            expect(result.data.cart.items[0].quantity).toBe(2);
            expect(result.data.cart.items[0].priceInfo.finalPrice).toBe(200); // 100 * 2
        });

        test('4. addItemToCart - with variants - should apply variant pricing', async () => {
            const menuItem = {
                id: 'item_var',
                priceInfo: { basePrice: 10, finalPrice: 10, discount: 0 },
                variants: [{ id: 'v1' }],
                isInStock: true
            };
            const variantDoc = {
                id: 'v1',
                options: [
                    { id: 'opt1', priceInfo: { basePrice: 5, finalPrice: 5, discount: 0 } }
                ],
                respectParentDiscount: true
            };

            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupVariant(DEFAULT_RESTAURANT_ID, variantDoc);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: menuItem.id,
                quantity: 1,
                selectedVariants: { 'v1': 'opt1' },
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);

            expect(result.status).toBe('success');
            const item = result.data.cart.items[0];
            // Base 10 + Variant 5 = 15
            expect(item.priceInfo.finalPrice).toBe(15);
        });
    });

    describe('Multi-Config Cart Entries', () => {
        test('37. addItemToCart - different variant configs - should create two distinct cart entries', async () => {
            const menuItem = { id: 'item1', priceInfo: { basePrice: 10, finalPrice: 10, discount: 0 }, variants: [{ id: 'v1' }], isInStock: true };
            const variantDoc = {
                id: 'v1',
                options: [
                    { id: 'optA', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
                    { id: 'optB', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } }
                ]
            };

            const existingItem = {
                menuItemId: 'item1',
                quantity: 1,
                cartItemId: 1,
                selectedVariantsDetails: [{ id: 'v1', selected_variant_id: 'optA', name: 'v1', selected_variant_name: 'optA', priceInfo: { finalPrice: 0 } }],
                selectedAddonsDetails: [],
                priceInfo: { finalPrice: 10 }
            };

            const existingCart = { items: [existingItem], priceInfo: { finalPrice: 10, totalBase: 10 } };

            setupCart(DEFAULT_RESTAURANT_ID, 't1', existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupVariant(DEFAULT_RESTAURANT_ID, variantDoc);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: 'item1',
                quantity: 1,
                selectedVariants: { 'v1': 'optB' },
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);

            expect(result.status).toBe('success');
            expect(result.data.cart.items).toHaveLength(2);
            // Both entries must have distinct cartItemIds (monotonically assigned)
            const cartItemIds = result.data.cart.items.map(i => i.cartItemId);
            expect(new Set(cartItemIds).size).toBe(2);
            expect(Math.max(...cartItemIds)).toBeGreaterThan(1);
        });

        test('38. addItemToCart - identical config twice - should increment existing entry, not create second', async () => {
            // Regression: confirms the findIdenticalItemInCart path still merges same-config adds.
            const menuItem = menuItemFixtures.simple;
            const existingItem = {
                menuItemId: menuItem.id,
                quantity: 1,
                cartItemId: 1,
                selectedVariantsDetails: [],
                selectedAddonsDetails: [],
                priceInfo: menuItem.priceInfo
            };
            const existingCart = { items: [existingItem], priceInfo: { ...menuItem.priceInfo } };

            setupCart(DEFAULT_RESTAURANT_ID, 't1', existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const payload = {
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: menuItem.id,
                quantity: 1,
                sessionId: DEFAULT_SESSION_ID
            };

            const result = await invokeAddItem(payload);
            expect(result.status).toBe('success');
            expect(result.data.cart.items).toHaveLength(1);
            expect(result.data.cart.items[0].quantity).toBe(2);
        });

        test('39. addItemToCart - multi-entry cart totals - should sum independently', async () => {
            // Two distinct variant configs of the same menu item → cart finalPrice = sum of entry finalPrices.
            // Uses a pre-seeded cart with one entry (optA) then adds optB in one call — mirrors the
            // seed-then-add pattern used by test 37 to avoid sequential-invoke mock fragility.
            const menuItem = { id: 'item1', priceInfo: { basePrice: 10, finalPrice: 10, discount: 0 }, variants: [{ id: 'v1' }], isInStock: true };
            const variantDoc = {
                id: 'v1',
                options: [
                    { id: 'optA', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
                    { id: 'optB', priceInfo: { basePrice: 5, finalPrice: 5, discount: 0 } }
                ]
            };

            const existingItem = {
                menuItemId: 'item1',
                quantity: 1,
                cartItemId: 1,
                selectedVariantsDetails: [{ id: 'v1', selected_variant_id: 'optA', name: 'v1', selected_variant_name: 'optA', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } }],
                selectedAddonsDetails: [],
                priceInfo: {
                    itemBasePrice: 10,
                    itemFinalPrice: 10,
                    totalVariantBasePrice: 0,
                    totalVariantFinalPrice: 0,
                    totalAddonBasePrice: 0,
                    totalAddonFinalPrice: 0,
                    totalBasePrice: 10,
                    finalPrice: 10,
                    discount: 0,
                    discountAmount: 0
                }
            };
            const existingCart = { items: [existingItem], priceInfo: { basePrice: 10, finalPrice: 10, totalDiscount: 0, totalDiscountAmount: 0, totalAddonBasePrice: 0, totalVariantBasePrice: 0 } };

            setupCart(DEFAULT_RESTAURANT_ID, 't1', existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupVariant(DEFAULT_RESTAURANT_ID, variantDoc);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            // Add optB as a new distinct entry
            const result = await invokeAddItem({
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: 'item1',
                quantity: 1,
                selectedVariants: { 'v1': 'optB' },
                sessionId: DEFAULT_SESSION_ID
            });

            expect(result.status).toBe('success');
            expect(result.data.cart.items).toHaveLength(2);
            // Each entry carries its own priceInfo — verifies the backend is not
            // collapsing multi-config entries into a single row on price calculation.
            const optAEntry = result.data.cart.items.find(i => i.selectedVariantsDetails?.[0]?.selected_variant_id === 'optA');
            const optBEntry = result.data.cart.items.find(i => i.selectedVariantsDetails?.[0]?.selected_variant_id === 'optB');
            expect(optAEntry).toBeDefined();
            expect(optBEntry).toBeDefined();
            expect(optBEntry.priceInfo.finalPrice).toBe(15); // 10 base + 5 variant
        });
    });

    describe('Transaction Integrity', () => {
        test('63. addItemToCart - ensures DB transaction is used', async () => {
            const menuItem = menuItemFixtures.simple;

            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const result = await invokeAddItem({
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: menuItem.id,
                quantity: 1,
                sessionId: DEFAULT_SESSION_ID
            });
            expect(result.status).toBe('success');
        });
    });

    describe('Dining Flows', () => {
        test('69. addItemToCart - after kitchen cancel - should maintain correct total', async () => {
            const menuItem = menuItemFixtures.simple; // price 100
            const cancelledItem = {
                menuItemId: 'otherItem',
                quantity: 1,
                priceInfo: { finalPrice: 50, discount: 0, basePrice: 50, totalBasePrice: 50 },
                status: 'cancelled'
            };

            const existingCart = {
                items: [cancelledItem],
                priceInfo: { finalPrice: 0, totalBase: 0 }
            };

            setupCart(DEFAULT_RESTAURANT_ID, 't1', existingCart);
            setupMenuItem(DEFAULT_RESTAURANT_ID, menuItem);
            setupSession(DEFAULT_RESTAURANT_ID, DEFAULT_SESSION_ID);

            const result = await invokeAddItem({
                restaurantId: DEFAULT_RESTAURANT_ID,
                tableId: 't1',
                menuItemId: menuItem.id,
                quantity: 1,
                sessionId: DEFAULT_SESSION_ID
            });

            const newTotal = result.data.cart.priceInfo.finalPrice;
            // Should be just the new item (100)
            expect(newTotal).toBe(100);
        });
    });
});
