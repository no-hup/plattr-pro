/* eslint-disable global-require */
// CHARACTERIZATION of updateOrderStatus's COMPLETED write, taken for TD-010 (moonshot/TECH_DEBT.md):
// PY's payments ledger now writes order.paymentStatus as a mirror inside its own transaction, so the
// `paid` side effect here had to go in the same change, or the field has two writers and a captain
// tapping Complete marks an order paid while the till is still collecting. What is pinned: the SHAPE
// of what one COMPLETED transition writes. Written first, red against the old line, green after it.

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
    const colRef = (path) => ({ doc: (id) => docRef(`${path}/${id}`), where: () => ({ _query: path }) });
    const db = {
        _seed: seed,
        collection: (name) => colRef(name),
        runTransaction: async (fn) => fn({
            get: (ref) => Promise.resolve(ref._query ? { docs: seed[`__query__${ref._query}`] || [] } : snap(ref, seed[ref.path])),
            set: (ref, data) => writes.set.push({ path: ref.path, data }),
            update: (ref, data) => writes.update.push({ path: ref.path, data }),
            delete: (ref) => writes.delete.push({ path: ref.path }),
        }),
    };
    return { db, admin: { firestore: () => db }, FieldValue: {}, Timestamp: {} };
});
jest.mock('../../../adminApp/auth', () => ({ validateStaffSession: async () => ({ serverId: 'srv_1', serverData: { role: 'MANAGER', status: 'active' } }) }));
jest.mock('../../../singleton/FeatureFlags', () => ({ loadOverrides: async () => undefined, isEnabled: () => false }));
jest.mock('../../../orders/calculateCharges', () => ({ loadChargesConfig: async () => [], calculateCharges: () => ({ charges: [], chargesTotal: 0 }) }));
jest.mock('../../../offers/evaluateOrderOffers', () => ({ evaluateAndPickBestOffer: async () => null, buildAppliedOfferObject: () => null }));
jest.mock('../../../notifications/sendNotification', () => ({ sendFCMNotification: async () => undefined }));
jest.mock('../../../utils/timestamp', () => ({ now: () => 1_000_000, serverTimestamp: () => 1_000_000, safeToDate: (v) => v }));

const { db } = require('../../../admin/admin');
const { updateOrderStatus } = require('../../../orders/updateOrderStatus');

// onCall handlers: v2 exposes .run(request); v1 is a plain (data, context) function. Both see data.data.
const invoke = (h, data) => (typeof h.run === 'function' ? h.run({ data }) : h({ data }, {}));

const order = () => ({
    restaurantId: 'res_1', tableId: 't7', sessionId: 'sess_1', orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid',
    carts: [], items: [], priceInfo: { basePrice: 0, finalPrice: 0 }, appliedOffer: null,
});

beforeEach(() => {
    writes.set.length = 0; writes.update.length = 0; writes.delete.length = 0;
    Object.keys(db._seed).forEach(k => delete db._seed[k]);
    db._seed['restaurants/res_1/orders/o1'] = order();
});

describe('updateOrderStatus — the COMPLETED write, pinned for TD-010', () => {
    test('IN_PROGRESS → COMPLETED updates orderStatus, priceInfo and appliedOffer on the order, and nothing else', async () => {
        await invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'COMPLETED' });
        expect(writes.update).toHaveLength(1);
        const [w] = writes.update;
        expect(w.path).toBe('restaurants/res_1/orders/o1');
        expect(w.data).toMatchObject({ orderStatus: 'COMPLETED', appliedOffer: null });
        expect(w.data.priceInfo).toBeDefined();
        // TD-010: payment is PY's axis. Completing an order says the food is done; it says nothing about money.
        expect(w.data).not.toHaveProperty('paymentStatus');
    });
    test('COMPLETED writes nothing to the table or its session: freeing a table is the floor module\'s alone (TD-013, TD-036)', async () => {
        db._seed['restaurants/res_1/tables/t7'] = { status: 'active', currentSessionId: 'sess_1' };
        await invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'COMPLETED' });
        const touched = [...writes.set, ...writes.update, ...writes.delete].map(w => w.path);
        expect(touched).toEqual(['restaurants/res_1/orders/o1']);
        expect(db._seed['restaurants/res_1/tables/t7']).toMatchObject({ status: 'active', currentSessionId: 'sess_1' });
    });
    test('IN_PROGRESS → CANCELLED never touched paymentStatus, before or after', async () => {
        await invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'CANCELLED' });
        expect(writes.update).toHaveLength(1);
        expect(writes.update[0].data).toMatchObject({ orderStatus: 'CANCELLED' });
        expect(writes.update[0].data).not.toHaveProperty('paymentStatus');
    });
    test('COMPLETED → anything is refused, and writes nothing', async () => {
        db._seed['restaurants/res_1/orders/o1'] = { ...order(), orderStatus: 'COMPLETED' };
        await expect(invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'IN_PROGRESS' })).rejects.toThrow();
        expect(writes.update).toHaveLength(0);
    });
});
