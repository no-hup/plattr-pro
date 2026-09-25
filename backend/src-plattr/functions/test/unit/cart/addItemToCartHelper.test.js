const helper = require('../../../cart/addItemToCartBoilerplateHelper');
const { mockFirestoreDb } = require('../../mocks/firestore.mock');

jest.mock('../../../admin/admin', () => {
    const { mockFirestoreDb } = require('../../mocks/firestore.mock');
    return {
        db: mockFirestoreDb(),
        admin: { firestore: () => mockFirestoreDb() },
        FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
        Timestamp: { now: jest.fn(), fromDate: jest.fn() }
    };
});

// Mock data
const mockVariantDoc = {
    id: 'v1',
    name: 'Size',
    isMandatory: true,
    respectParentDiscount: true,
    options: [
        { id: 'opt1', name: 'Small', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
        { id: 'opt2', name: 'Large', priceInfo: { basePrice: 50, finalPrice: 50, discount: 0 } }
    ]
};

const mockAddonDoc = {
    id: 'addon1',
    meta: { name: 'Extra Cheese' },
    priceInfo: { basePrice: 20, finalPrice: 20, discount: 0 },
    respectParentDiscount: false
};

const initialData = {
    'restaurants/rest001/variants/v1': mockVariantDoc,
    'restaurants/rest001/addons/addon1': mockAddonDoc
};

const mockDbInstance = mockFirestoreDb(initialData);

// Mock ErrorHandler
const mockErrorHandler = {
    badRequest: jest.fn((msg, context) => { throw new Error(`BadRequest: ${msg} `); }),
    notFound: jest.fn((msg, context) => { throw new Error(`NotFound: ${msg} `); }),
    internalError: jest.fn((msg, context) => { throw new Error(`InternalError: ${msg} `); })
};

describe('addItemToCartBoilerplateHelper', () => {

    describe('processSelectedVariants', () => {
        const menuItem = {
            id: 'item1',
            variants: [{ id: 'v1' }]
        };

        // Test #33
        test('variant not found - should throw BadRequest (via ErrorHandler)', async () => {
            // Mock DB missing the variant
            const emptyDb = mockFirestoreDb({});
            // processSelectedVariants fetches from DB.
            // But wait, the helper checks if doc exists.
            // If doc doesn't exist, processSelectedVariants filters it out?
            // Line 316: filters validVariants.
            // Line 325: find(v => v.id === variantId). If not found -> throw badRequest.
            // So if retrieval fails (doc missing), it won't be in validVariants.
            // Then selectedVariants loop tries to find it.

            await expect(helper.processSelectedVariants(
                emptyDb,
                'rest001',
                menuItem,
                { 'v1': 'opt1' },
                mockErrorHandler
            )).rejects.toThrow('BadRequest: Variant not found.');
        });

        // Test #34
        test('variant option not found - should throw BadRequest', async () => {
            // Variant exists, but option 'invalidOpt' does not
            await expect(helper.processSelectedVariants(
                mockDbInstance,
                'rest001',
                menuItem,
                { 'v1': 'invalidOpt' },
                mockErrorHandler
            )).rejects.toThrow('BadRequest: Selected option not found for the variant.');
        });

        // Test #36
        test('mandatory variant not selected - should throw BadRequest', async () => {
            // v1 is mandatory. We provide empty selection.
            await expect(helper.processSelectedVariants(
                mockDbInstance,
                'rest001',
                menuItem,
                {}, // No selection
                mockErrorHandler
            )).rejects.toThrow("BadRequest: Mandatory variant 'Size' must be selected.");
        });

        test('valid selection - should return processed details', async () => {
            const result = await helper.processSelectedVariants(
                mockDbInstance,
                'rest001',
                menuItem,
                { 'v1': 'opt1' },
                mockErrorHandler
            );
            expect(result).toHaveLength(1);
            expect(result[0].selected_variant_id).toBe('opt1');
            expect(result[0].priceInfo.basePrice).toBe(0);
        });
    });

    // TD-015. Hand-computed: the Veg Biryani lists raita (₹40, in stock) and prawn (₹120, sold out);
    // Extra Cheese (₹20) exists in the restaurant but is not listed on this dish.
    describe('processSelectedAddons', () => {
        const dish = { id: 'mi_veg_bir', addons: ['ma_raita', 'ma_prawn', 'ma_badprice'] };
        const db = mockFirestoreDb({
            'restaurants/rest001/addons/ma_raita': { meta: { name: 'Raita' }, priceInfo: { basePrice: 40, finalPrice: 40, discount: 0 }, isInStock: true },
            'restaurants/rest001/addons/ma_prawn': { meta: { name: 'Prawn' }, priceInfo: { basePrice: 120, finalPrice: 120, discount: 0 }, isInStock: false },
            'restaurants/rest001/addons/ma_badprice': { meta: { name: 'Ghee' }, priceInfo: { basePrice: 30 }, isInStock: true },
            'restaurants/rest001/addons/addon1': { ...mockAddonDoc, isInStock: true },
        });
        const eh = { ...mockErrorHandler, preconditionFailed: jest.fn((msg) => { throw new Error(`PreconditionFailed: ${msg}`); }) };
        const run = (ids) => helper.processSelectedAddons(db, 'rest001', dish, ids, eh);

        test('TD-015 a listed, in-stock add-on comes back with its price: raita ₹40', async () => {
            const r = await run(['ma_raita']);
            expect(r).toEqual([expect.objectContaining({ id: 'ma_raita', name: 'Raita', priceInfo: { basePrice: 40, finalPrice: 40, discount: 0 } })]);
        });
        test('TD-015 a sold-out add-on is refused, not billed: prawn → PreconditionFailed naming it', async () => {
            await expect(run(['ma_raita', 'ma_prawn'])).rejects.toThrow(/PreconditionFailed: .*Prawn/);
        });
        test('TD-015 an add-on id that does not exist is refused, never silently dropped', async () => {
            await expect(run(['ma_raita', 'invalidAddon'])).rejects.toThrow(/BadRequest: Add-on not found/);
        });
        test('TD-015 an add-on that exists but is not listed on this dish is refused', async () => {
            await expect(run(['addon1'])).rejects.toThrow(/BadRequest: .*not offered/);
        });
        test('TD-015 an add-on with broken price data is refused, never billed at ₹0', async () => {
            await expect(run(['ma_badprice'])).rejects.toThrow(/InternalError: .*invalid price/);
        });
        test('no add-ons selected → []', async () => {
            expect(await run([])).toEqual([]);
        });
    });

    describe('processSelectedVariants price data (TD-015)', () => {
        test('an option with broken price data is refused, never billed at ₹0', async () => {
            const db = mockFirestoreDb({ 'restaurants/rest001/variants/v1': { ...mockVariantDoc, options: [{ id: 'opt3', name: 'Huge', priceInfo: { basePrice: 'x' } }] } });
            await expect(helper.processSelectedVariants(db, 'rest001', { variants: [{ id: 'v1' }] }, { v1: 'opt3' }, mockErrorHandler))
                .rejects.toThrow(/InternalError: .*invalid price/);
        });
    });
});

// D5: a guest phone sends the cart-item ids it showed. Table 8: Bhanu's naan was #3; he sends it (or removes it),
// then adds a Coke. If the Coke became #3 again, Asha's stale "Send all [1, 2, 3]" would send it. Ids never repeat
// within one cart: the cart remembers the last id it gave out.
describe('getNextCartItemId — ids never repeat within one cart (D5)', () => {
    test('#3 left the cart; the next dish is #4, not #3 again', () => {
        expect(helper.getNextCartItemId([{ cartItemId: 1 }, { cartItemId: 2 }], 3)).toBe(4);
    });
    test('a new cart starts at #1', () => {
        expect(helper.getNextCartItemId([], undefined)).toBe(1);
    });
});
