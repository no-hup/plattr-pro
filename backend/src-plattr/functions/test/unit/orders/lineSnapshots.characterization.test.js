/* eslint-disable global-require */
// CHARACTERIZATION of `toCartItem`, the adapter that turns a cart item into the shape the bill's
// line snapshot is built from. Taken for TD-014 (moonshot/TECH_DEBT.md), which is the bug where a
// variant or add-on marked `respectParentDiscount: true` inherits the item's menu discount in the
// CART but not on the BILL, so the guest is charged more than the app quoted them.
//
// What is pinned here: the shape and the every-other-case behaviour, which the fix must not move.
// The three `respectParentDiscount: true` expectations were RED before the fix and green after.
//
// `toCartItem` is pure, but its module reaches for the db at load time, so admin is stubbed.

jest.mock('../../../admin/admin', () => ({ db: { collection: () => ({ doc: () => ({}) }) } }));

const { toCartItem } = require('../../../orders/lineSnapshots');

// The real cart item the emulator produces for: Mutton Biryani (₹420, 10% off) ×1,
// Family portion (+₹260, inherits), Extra Gravy (+₹60, inherits), Raita (+₹40, does NOT),
// Boiled Egg (+₹30, does NOT). Captured from a live checkout on res_meghana.
const muttonBiryani = (over = {}) => ({
    menuItemId: 'mi_mutton_bir',
    cartItemId: 1,
    quantity: 1,
    menuItem: { meta: { name: 'Mutton Biryani' }, taxBlockId: 'food', taxCode: '996331' },
    priceInfo: {
        itemBasePrice: 420, itemFinalPrice: 378,
        totalVariantBasePrice: 260, totalVariantFinalPrice: 234,
        totalAddonBasePrice: 130, totalAddonFinalPrice: 124,
        totalBasePrice: 810, finalPrice: 736,
        discount: 10, discountAmount: 74,
    },
    selectedVariantsDetails: [{
        id: 'mv_bir_portion', selected_variant_id: 'family', selected_variant_name: 'Family (serves 3)',
        priceInfo: { basePrice: 260, finalPrice: 260, discount: 0 },
        respectParentDiscount: true, isMandatory: true,
    }],
    selectedAddonsDetails: [
        { id: 'ma_extra_gravy', name: 'Extra Gravy', priceInfo: { basePrice: 60, finalPrice: 60, discount: 0 }, respectParentDiscount: true },
        { id: 'ma_extra_raita', name: 'Extra Raita', priceInfo: { basePrice: 40, finalPrice: 40, discount: 0 }, respectParentDiscount: false },
        { id: 'ma_extra_egg', name: 'Boiled Egg', priceInfo: { basePrice: 30, finalPrice: 30, discount: 0 }, respectParentDiscount: false },
    ],
    ...over,
});

describe('toCartItem — the shape, pinned', () => {
    test('carries the identifiers, quantity and tax label straight through, in minor units', () => {
        const out = toCartItem(muttonBiryani());
        expect(out).toMatchObject({
            menuItemId: 'mi_mutton_bir', name: 'Mutton Biryani', quantity: 1, cartItemId: '1',
            taxBlockId: 'food', taxCode: '996331',
            itemBasePrice: 42000, itemFinalPrice: 37800,
        });
        expect(out.variants).toHaveLength(1);
        expect(out.addons).toHaveLength(3);
    });

    test('a variant is named by its OPTION, not its group, and keyed by the group id', () => {
        const [v] = toCartItem(muttonBiryani()).variants;
        expect(v.id).toBe('mv_bir_portion');
        expect(v.name).toBe('Family (serves 3)');
    });

    test('quantity below 1 or missing falls back to 1', () => {
        expect(toCartItem(muttonBiryani({ quantity: 0 })).quantity).toBe(1);
        expect(toCartItem(muttonBiryani({ quantity: undefined })).quantity).toBe(1);
    });

    test('no variants or add-ons gives empty lists, not undefined', () => {
        const out = toCartItem(muttonBiryani({ selectedVariantsDetails: undefined, selectedAddonsDetails: undefined }));
        expect(out.variants).toEqual([]);
        expect(out.addons).toEqual([]);
    });

    test('a missing tax block stays null rather than guessing — BL refuses to bill it', () => {
        const out = toCartItem(muttonBiryani({ menuItem: { meta: { name: 'X' } } }));
        expect(out.taxBlockId).toBeNull();
        expect(out.taxCode).toBe('');
    });
});

describe('toCartItem — respectParentDiscount (TD-014)', () => {
    test('a variant flagged to inherit is priced at the parent discount: ₹260 less 10% = ₹234', () => {
        const [v] = toCartItem(muttonBiryani()).variants;
        expect(v.basePrice).toBe(26000);
        expect(v.finalPrice).toBe(23400);
    });

    test('an add-on flagged to inherit is priced the same way: ₹60 less 10% = ₹54', () => {
        const gravy = toCartItem(muttonBiryani()).addons.find(a => a.id === 'ma_extra_gravy');
        expect(gravy.basePrice).toBe(6000);
        expect(gravy.finalPrice).toBe(5400);
    });

    test('an add-on NOT flagged keeps its own price, untouched by the parent discount', () => {
        const { addons } = toCartItem(muttonBiryani());
        expect(addons.find(a => a.id === 'ma_extra_raita')).toMatchObject({ basePrice: 4000, finalPrice: 4000 });
        expect(addons.find(a => a.id === 'ma_extra_egg')).toMatchObject({ basePrice: 3000, finalPrice: 3000 });
    });

    test('the components add back to the cart total the guest was shown (₹736), not ₹768', () => {
        const out = toCartItem(muttonBiryani());
        const net = out.itemFinalPrice
            + [...out.variants, ...out.addons].reduce((a, c) => a + c.finalPrice, 0);
        expect(net).toBe(73600);
    });

    test('an item with NO discount is unaffected by the flag — inheriting 0% changes nothing', () => {
        const zero = muttonBiryani({
            priceInfo: { ...muttonBiryani().priceInfo, itemBasePrice: 320, itemFinalPrice: 320, discount: 0 },
        });
        const [v] = toCartItem(zero).variants;
        expect(v.finalPrice).toBe(26000);
    });

    test('inheritance rounds to the nearest paisa, the same as the cart does', () => {
        // ₹99.99 less 15% = ₹84.9915 → 8499 paise, never 8500 and never a float.
        const odd = muttonBiryani({
            priceInfo: { ...muttonBiryani().priceInfo, discount: 15 },
            selectedVariantsDetails: [{
                id: 'mv_x', selected_variant_name: 'Odd', priceInfo: { basePrice: 99.99, finalPrice: 99.99 },
                respectParentDiscount: true,
            }],
        });
        expect(toCartItem(odd).variants[0].finalPrice).toBe(8499);
    });
});
