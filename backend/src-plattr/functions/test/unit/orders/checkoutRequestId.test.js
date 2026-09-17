/* eslint-disable global-require */
// OF · R1: a retried checkout is the same order (moonshot/SPEC_OF_offline_and_sync.md OF-S1..S3).
// Harness is the characterization test's: a fake db whose transaction records set/update/delete.
//
// Seed: live cart `carts/t7` with two biryanis at ₹450 (45000 minor) each, session `sess_t7`.
// Hand-computed:
//   two biryanis            2 × 45000 = 90000 (old cart math, rupees × 100 not applied here: cart prices are rupees, 450 × 2 = 900)
//   first checkout          writes.set: 1 order + 1 counter (+ line docs); writes.delete: 1 (the cart); retry undefined
//   OF-S1 retry, same id    live cart gone, order for sess_t7 carries carts[0].requestId 'req_t7_2041'
//                           → zero writes; result.retry === true; result.id === first order id; total finalPrice 900
//   OF-S2 same id, coke     live cart present with fingerprint 'mi_coke:1' ≠ stored 'mi_biryani:2'
//                           → failed-precondition /requestId already used for a different cart/; zero writes
//   OF-S3 no id, 2nd call   preconditionFailed /Cannot process an empty cart/; zero writes (today's behaviour)

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

const item = (menuItemId, name, price, quantity, cartItemId) => ({
    menuItemId, quantity, cartItemId,
    menuItem: { meta: { name } },
    priceInfo: { itemBasePrice: price, itemFinalPrice: price, totalBasePrice: price * quantity, finalPrice: price * quantity, discount: 0, discountAmount: 0 },
});
const biryanis = () => ({ items: [item('mi_biryani', 'Biryani', 450, 2, 1)], priceInfo: { basePrice: 900, finalPrice: 900, totalDiscount: 0, totalDiscountAmount: 0 } });
const coke = () => ({ items: [item('mi_coke', 'Coke', 80, 1, 2)], priceInfo: { basePrice: 80, finalPrice: 80, totalDiscount: 0, totalDiscountAmount: 0 } });

const ordersWritten = () => writes.set.filter(w => w.path.includes('/orders/'));
const totalWrites = () => writes.set.length + writes.update.length + writes.delete.length;

/** After a checkout, make the written order visible to the session query, the way Firestore would. */
function publishOrders() {
    const docs = ordersWritten().map(w => ({ id: w.path.split('/').pop(), data: () => w.data }));
    db._seed['__query__restaurants/res_1/orders'] = docs;
}

beforeEach(() => {
    writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;
    Object.keys(db._seed).forEach(k => delete db._seed[k]);
    db._seed['restaurants/res_1/carts/t7'] = biryanis();
    db._seed['restaurants/res_1/tables/t7'] = { assignedServerId: 'srv_1' };
    db._seed['restaurants/res_1/counters/orders'] = { currentCount: 41 };
});

describe('OF · checkout requestId (R1)', () => {
    test('OF-S1 first checkout with requestId req_t7_2041 → one order, carts[0].requestId = req_t7_2041, cart deleted, retry not set', async () => {
        const first = await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        expect(ordersWritten()).toHaveLength(1);
        expect(ordersWritten()[0].data.carts[0].requestId).toBe('req_t7_2041');
        expect(writes.delete).toEqual([{ path: 'restaurants/res_1/carts/t7' }]);
        expect(first.retry).toBeUndefined();
    });

    test('OF-S1 second checkout with the same requestId, live cart gone → same order id, retry: true, zero writes, total 900', async () => {
        const first = await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        delete db._seed['restaurants/res_1/carts/t7'];   // the first transaction deleted it
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        // checkoutCart passes null once the first tap deleted the doc: the transaction decides (R1)
        const again = await createOrUpdateOrder('res_1', 't7', null, 'guest_1', '', 'sess_t7', 'req_t7_2041');
        expect(again.retry).toBe(true);
        expect(again.id).toBe(first.id);
        expect(again.carts).toHaveLength(1);
        expect(again.priceInfo.finalPrice).toBe(900);
        expect(totalWrites()).toBe(0);
    });

    test('OF-S2 same requestId, live cart is one coke (fingerprint mi_coke:1 ≠ mi_biryani:2) → failed-precondition "requestId already used for a different cart", zero writes', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        db._seed['restaurants/res_1/carts/t7'] = coke();
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        await expect(createOrUpdateOrder('res_1', 't7', coke(), 'guest_1', '', 'sess_t7', 'req_t7_2041'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringMatching(/requestId already used for a different cart/) });
        expect(totalWrites()).toBe(0);
    });

    test('OF-S2 same requestId in a different session → not a retry; today\'s empty-cart refusal, zero writes', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        delete db._seed['restaurants/res_1/carts/t7'];
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        // The session query is scoped by sessionId in Firestore; the fake returns every order, so scope it here.
        db._seed['__query__restaurants/res_1/orders'] = db._seed['__query__restaurants/res_1/orders'].filter(d => d.data().sessionId === 'sess_other');
        await expect(createOrUpdateOrder('res_1', 't7', null, 'guest_1', '', 'sess_other', 'req_t7_2041'))
            .rejects.toMatchObject({ message: expect.stringMatching(/Cannot process an empty cart/) });
        expect(totalWrites()).toBe(0);
    });

    test('OF-S2 fingerprint ignores item order: [coke, biryani] and [biryani, coke] are the same cart', async () => {
        const both = { items: [item('mi_coke', 'Coke', 80, 1, 2), item('mi_biryani', 'Biryani', 450, 2, 1)], priceInfo: { basePrice: 980, finalPrice: 980, totalDiscount: 0, totalDiscountAmount: 0 } };
        db._seed['restaurants/res_1/carts/t7'] = both;
        const first = await createOrUpdateOrder('res_1', 't7', both, 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        const swapped = { ...both, items: [both.items[1], both.items[0]] };
        db._seed['restaurants/res_1/carts/t7'] = swapped;   // the live cart still exists (the delete never landed)
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        const again = await createOrUpdateOrder('res_1', 't7', swapped, 'guest_1', '', 'sess_t7', 'req_t7_2041');
        expect(again.retry).toBe(true);
        expect(again.id).toBe(first.id);
        expect(totalWrites()).toBe(0);
    });

    test('OF-S3 no requestId on either call → second call refused "Cannot process an empty cart", zero writes', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7');
        publishOrders();
        delete db._seed['restaurants/res_1/carts/t7'];
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        // The caller's stale cart read; the transaction sees the doc is gone. (On the wire checkoutCart
        // refuses one step earlier with "No active cart found for this table.")
        await expect(createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7'))
            .rejects.toMatchObject({ message: expect.stringMatching(/Cannot process an empty cart/) });
        expect(totalWrites()).toBe(0);
        expect(ordersWritten()[0]).toBeUndefined();
    });

    test('R1 a non-string requestId (number, object) is treated as absent, never stored', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 12345);
        expect(ordersWritten()[0].data.carts[0].requestId).toBeUndefined();
    });

    test('R1 the requestId is stored on carts[].requestId only; the flat items[] copy does not carry it', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        const o = ordersWritten()[0].data;
        expect(o.carts[0].requestId).toBe('req_t7_2041');
        expect(o.items.every(i => i.requestId === undefined)).toBe(true);
    });

    test('R1 a retry whose first order has since been CANCELLED still returns that order with retry: true; never a new one', async () => {
        const first = await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        db._seed['__query__restaurants/res_1/orders'][0].data().orderStatus = 'CANCELLED';
        delete db._seed['restaurants/res_1/carts/t7'];
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        const again = await createOrUpdateOrder('res_1', 't7', null, 'guest_1', '', 'sess_t7', 'req_t7_2041');
        expect(again.retry).toBe(true);
        expect(again.id).toBe(first.id);
        expect(totalWrites()).toBe(0);
    });

    test('R1 second round in the same session with a NEW requestId appends a second cart, each carrying its own id', async () => {
        await createOrUpdateOrder('res_1', 't7', biryanis(), 'guest_1', '', 'sess_t7', 'req_t7_2041');
        publishOrders();
        db._seed['restaurants/res_1/carts/t7'] = coke();
        writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;

        await createOrUpdateOrder('res_1', 't7', coke(), 'guest_1', '', 'sess_t7', 'req_t7_2055');
        const upd = writes.update.find(w => w.path.includes('/orders/'));
        expect(upd.data.carts.map(c => c.requestId)).toEqual(['req_t7_2041', 'req_t7_2055']);
    });
});
