/* eslint-disable global-require */
// CHARACTERIZATION of checkout's writes, taken BEFORE the BL line-snapshot hook was added
// (moonshot/SPEC_BL_billing_and_tax.md, phase 4; contract: touch an existing dir only with a
// characterization test first). What is pinned here is the SHAPE and COUNT of what one checkout
// writes inside its transaction. The hook is allowed to add line documents; it is not allowed to
// change anything below.

const writes = { set: [], update: [], delete: [] };

jest.mock('../../../admin/admin', () => {
    const seed = {};
    const snap = (ref, data) => ({ exists: !!data, id: ref.id, ref, data: () => data });
    const docRef = (path) => ({
        id: path.split('/').pop(),
        path,
        collection: (sub) => colRef(`${path}/${sub}`),
        get: () => Promise.resolve(snap({ id: path.split('/').pop(), path }, seed[path])),
    });
    let generated = 0;
    const colRef = (path) => ({
        doc: (id) => docRef(`${path}/${id || `gen${++generated}`}`),
        where: () => ({ _query: path }),
    });
    const db = {
        _seed: seed,
        collection: (name) => colRef(name),
        runTransaction: async (fn) => fn({
            get: (ref) => Promise.resolve(ref._query
                ? { docs: (seed[`__query__${ref._query}`] || []) }
                : snap(ref, seed[ref.path])),
            set: (ref, data) => writes.set.push({ path: ref.path, data }),
            update: (ref, data) => writes.update.push({ path: ref.path, data }),
            delete: (ref) => writes.delete.push({ path: ref.path }),
        }),
    };
    return { db, admin: { firestore: () => db }, FieldValue: {}, Timestamp: {} };
});
jest.mock('../../../orders/calculateCharges', () => ({
    loadChargesConfig: async () => [],
    calculateCharges: () => ({ charges: [], chargesTotal: 0 }),
}));
jest.mock('../../../offers/evaluateOrderOffers', () => ({
    evaluateAndPickBestOffer: async () => null,
    buildAppliedOfferObject: () => null,
}));

const { db } = require('../../../admin/admin');
const { createOrUpdateOrder } = require('../../../orders/createOrUpdateOrder');

// One pizza ₹500 (no discount) and one beer ₹499, quantity 1 each.
const cart = {
    items: [
        {
            menuItemId: 'mi_pizza', quantity: 1, cartItemId: 1,
            menuItem: { meta: { name: 'Margherita' } },
            priceInfo: { itemBasePrice: 500, itemFinalPrice: 500, totalBasePrice: 500, finalPrice: 500, discount: 0, discountAmount: 0 },
        },
        {
            menuItemId: 'mi_beer', quantity: 1, cartItemId: 2,
            menuItem: { meta: { name: 'Kingfisher' } },
            priceInfo: { itemBasePrice: 499, itemFinalPrice: 499, totalBasePrice: 499, finalPrice: 499, discount: 0, discountAmount: 0 },
        },
    ],
    priceInfo: { basePrice: 999, finalPrice: 999, totalDiscount: 0, totalDiscountAmount: 0 },
};

beforeEach(() => {
    writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;
    Object.keys(db._seed).forEach(k => delete db._seed[k]);
    db._seed['restaurants/res_1/carts/t7'] = JSON.parse(JSON.stringify(cart));
    db._seed['restaurants/res_1/tables/t7'] = { assignedServerId: 'srv_1' };
    db._seed['restaurants/res_1/counters/orders'] = { currentCount: 41 };
});

describe('createOrUpdateOrder — writes inside one checkout transaction (pinned before the BL hook)', () => {
    test('a first checkout writes exactly one order and one counter, deletes the cart, updates nothing', async () => {
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');

        const orders = writes.set.filter(w => w.path.includes('/orders/'));
        const counters = writes.set.filter(w => w.path.includes('/counters/'));
        expect(orders).toHaveLength(1);
        expect(counters).toEqual([{ path: 'restaurants/res_1/counters/orders', data: { currentCount: 42 } }]);
        expect(writes.update).toHaveLength(0);
        expect(writes.delete).toEqual([{ path: 'restaurants/res_1/carts/t7' }]);
    });

    test('the order document keeps its shape: carts[] holds the snapshot, items[] the flat copy, both lines priced', async () => {
        const order = await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const [written] = writes.set.filter(w => w.path.includes('/orders/'));

        expect(written.data).toMatchObject({
            restaurantId: 'res_1', tableId: 't7', orderNumber: 'ORD-00042',
            orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid',
            isActive: true, assignedServer: 'srv_1', sessionId: 'sess_1', appliedOffer: null,
        });
        expect(written.data.carts).toHaveLength(1);
        expect(written.data.items.map(i => [i.menuItemId, i.name, i.quantity, i.priceInfo.finalPrice]))
            .toEqual([['mi_pizza', 'Margherita', 1, 500], ['mi_beer', 'Kingfisher', 1, 499]]);
        expect(written.data.priceInfo).toMatchObject({ basePrice: 999, finalPrice: 999 });
        expect(order.id).toBe(written.path.split('/').pop());
    });

    test('every flat item carries the cartId of the snapshot it came from', async () => {
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const [written] = writes.set.filter(w => w.path.includes('/orders/'));
        const cartId = written.data.carts[0].cartId;

        expect(cartId).toMatch(/^res_1_t7_/);
        expect(written.data.items.every(i => i.cartId === cartId)).toBe(true);
    });

    test('an empty cart is refused and writes nothing', async () => {
        db._seed['restaurants/res_1/carts/t7'] = { items: [] };
        await expect(createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1')).rejects.toThrow();
        expect(writes.set).toHaveLength(0);
        expect(writes.delete).toHaveLength(0);
    });
});

// ── Added WITH the BL hook. Everything above still passes unchanged; this is what the hook adds.
describe('createOrUpdateOrder — BL line snapshots written in the same transaction', () => {
    const food = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
    const liquor = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [] };

    const taxed = () => {
        const c = JSON.parse(JSON.stringify(cart));
        c.items[0].menuItem.taxBlockId = 'food';
        c.items[0].menuItem.taxCode = '9963';
        c.items[1].menuItem.taxBlockId = 'liquor';
        db._seed['restaurants/res_1/carts/t7'] = c;
        db._seed['restaurants/res_1/config/settings'] = { tax: { blocks: { food, liquor } } };
    };
    const lineWrites = () => writes.set.filter(w => w.path.includes('/lines/'));

    test('one line document per placed item, id is cartId_cartItemId, in the same transaction as the order', async () => {
        taxed();
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const [order] = writes.set.filter(w => w.path.includes('/orders/'));
        const cartId = order.data.carts[0].cartId;

        expect(lineWrites().map(w => w.path)).toEqual([
            `restaurants/res_1/lines/${cartId}_1`,
            `restaurants/res_1/lines/${cartId}_2`,
        ]);
        expect(writes.delete).toEqual([{ path: 'restaurants/res_1/carts/t7' }]);
    });

    test('money is integer minor units and the block is frozen by value, not referenced', async () => {
        taxed();
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const [pizza, beer] = lineWrites().map(w => w.data);

        expect(pizza).toMatchObject({ name: 'Margherita', qty: 1, listPrice: 50000, offer: null, sent: false, v: 0, countsTowardTotal: true, billId: null });
        expect(pizza.components).toEqual([{ id: '1_item', kind: 'item', name: 'Margherita', unitListPrice: 50000, taxBlockId: 'food', taxCode: '9963' }]);
        expect(pizza.taxBlocks).toEqual({ food });
        expect(beer).toMatchObject({ listPrice: 49900, taxBlocks: { liquor } });
        expect(beer.taxBlocks.food).toBeUndefined();
    });

    test('provenance: cid and orderId are the order, draftId is the sitting, placedBy is the checkout user', async () => {
        taxed();
        const order = await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const [pizza] = lineWrites().map(w => w.data);

        expect(pizza).toMatchObject({ cid: order.id, orderId: order.id, tableId: 't7', sessionId: 'sess_1', draftId: 'sess_1', placedBy: 'guest_1' });
        expect(pizza.placedAt).toBeGreaterThan(0);
    });

    test('a menu item with no tax block is still written, with a null block, and BL refuses to bill it (BL-S14)', async () => {
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');   // no config seeded
        const [pizza] = lineWrites().map(w => w.data);

        expect(pizza.components[0].taxBlockId).toBeNull();
        expect(pizza.taxBlocks).toEqual({});
        expect(lineWrites()).toHaveLength(2);
    });

    test('a cancelled cart item gets no line, exactly as it gets no order item', async () => {
        const c = JSON.parse(JSON.stringify(cart));
        c.items[1].status = 'CANCELLED';
        db._seed['restaurants/res_1/carts/t7'] = c;
        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');

        expect(lineWrites()).toHaveLength(1);
        const [order] = writes.set.filter(w => w.path.includes('/orders/'));
        expect(order.data.items).toHaveLength(1);
    });

    test('round two appends to the open order and its lines carry the same orderId with a new cartId', async () => {
        taxed();
        const first = await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');
        const firstCartId = writes.set.filter(w => w.path.includes('/orders/'))[0].data.carts[0].cartId;
        db._seed['__query__restaurants/res_1/orders'] = [{
            id: first.id, data: () => ({ ...first, orderStatus: 'IN_PROGRESS' }),
        }];
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;
        db._seed['restaurants/res_1/carts/t7'] = JSON.parse(JSON.stringify(db._seed['restaurants/res_1/carts/t7'] || cart));
        taxed();

        await createOrUpdateOrder('res_1', 't7', cart, 'guest_1', '', 'sess_1');

        expect(writes.update).toHaveLength(1);
        expect(writes.set.filter(w => w.path.includes('/orders/'))).toHaveLength(0);
        const lines = lineWrites();
        expect(lines).toHaveLength(2);
        expect(lines.every(w => w.data.orderId === first.id)).toBe(true);
        expect(lines.every(w => w.data.cartId !== firstCartId)).toBe(true);
    });
});
