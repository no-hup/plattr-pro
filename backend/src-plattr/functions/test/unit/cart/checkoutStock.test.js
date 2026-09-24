// TD-015 · checkout re-checks what it is about to send to the kitchen. An add-on switched off between
// add and send (the prawns ran out at 20:40) must stop the round, the same way a sold-out dish does.
// Hand-computed: cart has Veg Biryani (in stock) with raita (in stock) and prawn (sold out since add).
jest.mock('../../../admin/admin', () => {
    const { mockFirestoreDb } = require('../../mocks/firestore.mock');
    const db = mockFirestoreDb({
        'restaurants/r1/menuItems/mi_veg_bir': { meta: { name: 'Veg Biryani' }, isInStock: true },
        'restaurants/r1/menuItems/mi_coke': { meta: { name: 'Coke' }, isInStock: false },
        'restaurants/r1/addons/ma_raita': { meta: { name: 'Raita' }, isInStock: true },
        'restaurants/r1/addons/ma_prawn': { meta: { name: 'Prawn' }, isInStock: false },
    });
    return { db, admin: { firestore: () => db }, FieldValue: {}, Timestamp: {} };
});
const { validateMenuItemsStock } = require('../../../cart/checkoutCart');

const item = (menuItemId, addons = []) => ({ menuItemId, selectedAddonsDetails: addons.map(id => ({ id })) });

describe('checkout stock re-check', () => {
    test('all in stock → nothing refused', async () => {
        expect(await validateMenuItemsStock('r1', [item('mi_veg_bir', ['ma_raita'])])).toEqual([]);
    });
    test('TD-015 an add-on sold out since it was added → named, so the round is refused', async () => {
        expect(await validateMenuItemsStock('r1', [item('mi_veg_bir', ['ma_raita', 'ma_prawn'])]))
            .toEqual([{ menuItemId: 'mi_veg_bir', addonId: 'ma_prawn', name: 'Prawn' }]);
    });
    test('a sold-out dish is still named (unchanged)', async () => {
        expect(await validateMenuItemsStock('r1', [item('mi_coke')])).toEqual([{ menuItemId: 'mi_coke', name: 'Coke' }]);
    });
});
