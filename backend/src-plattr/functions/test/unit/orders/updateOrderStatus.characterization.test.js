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
// Cancel Order reuses cart/updateCartStatus's cascade, which opens the admin SDK through its own door.
jest.mock('../../../admin/initializeAdmin', () => ({ firestore: () => require('../../../admin/admin').db }));
const mockStaff = { role: 'MANAGER' };
jest.mock('../../../adminApp/auth', () => ({ validateStaffSession: async () => ({ serverId: 'srv_1', serverData: { role: mockStaff.role, status: 'active' } }) }));
jest.mock('../../../orders/createOrUpdateOrder', () => ({ buildOrderPriceInfo: async () => ({ priceInfo: { basePrice: 0, finalPrice: 0 }, appliedOffer: null }) }));
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
    mockStaff.role = 'MANAGER';
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
        const w = writes.update.find(u => u.path === 'restaurants/res_1/orders/o1');
        expect(w.data).toMatchObject({ orderStatus: 'CANCELLED' });
        expect(w.data).not.toHaveProperty('paymentStatus');
    });
    test('COMPLETED → anything is refused, and writes nothing', async () => {
        db._seed['restaurants/res_1/orders/o1'] = { ...order(), orderStatus: 'COMPLETED' };
        await expect(invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'IN_PROGRESS' })).rejects.toThrow();
        expect(writes.update).toHaveLength(0);
    });
});

// D4 (Shaurya 2026-09-25) and TD-089: 20:10 table 6 sent Chicken 65 (₹280) and Butter Naan (₹60); the guest
// leaves before either is cooked and the captain taps Cancel Order. Both dishes leave the bill and the kitchen,
// with an audit row each, no PIN. It used to write only orderStatus: the kitchen lost the ticket, the till still
// billed ₹309 + ₹66.
describe('D4: Cancel Order voids every dish on the order', () => {
    const LINES = 'restaurants/res_1/lines';
    const seedRound = (status, lineOver = {}) => {
        db._seed['restaurants/res_1/orders/o1'] = {
            ...order(),
            carts: [{ cartId: 'c1', status, items: [
                { cartItemId: 1, menuItemId: 'mi_chicken65', name: 'Chicken 65', status },
                { cartItemId: 2, menuItemId: 'mi_butter_naan', name: 'Butter Naan', status },
            ] }],
            items: [
                { cartId: 'c1', cartItemId: 1, menuItemId: 'mi_chicken65', status },
                { cartId: 'c1', cartItemId: 2, menuItemId: 'mi_butter_naan', status },
            ],
        };
        db._seed[`${LINES}/c1_1`] = { lineId: 'c1_1', listPrice: 28000, v: 0, countsTowardTotal: true, billId: null, sent: true, ...lineOver };
        db._seed[`${LINES}/c1_2`] = { lineId: 'c1_2', listPrice: 6000, v: 0, countsTowardTotal: true, billId: null, sent: true, ...lineOver };
    };
    const cancel = () => invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'CANCELLED' });
    const lineWrite = id => writes.set.find(w => w.path === `${LINES}/${id}`);
    const audits = () => writes.set.filter(w => w.path.startsWith('restaurants/res_1/audit/')).map(w => w.data);

    test('both lines stop counting, each with a P0 void row naming the waiter, and the round is CANCELLED', async () => {
        seedRound('PENDING');
        await cancel();
        expect(lineWrite('c1_1').data.countsTowardTotal).toBe(false);
        expect(lineWrite('c1_2').data.countsTowardTotal).toBe(false);
        expect(audits().map(a => [a.lineId, a.action, a.sev, a.staffId, a.amount])).toEqual([
            ['c1_1', 'void', 'P0', 'srv_1', 28000], ['c1_2', 'void', 'P0', 'srv_1', 6000],
        ]);
        const o = writes.update.find(u => u.path === 'restaurants/res_1/orders/o1').data;
        expect(o.orderStatus).toBe('CANCELLED');
        expect(o.carts[0].status).toBe('CANCELLED');
        expect(o.carts[0].items.map(i => i.status)).toEqual(['CANCELLED', 'CANCELLED']);
        expect(o.items.map(i => i.status)).toEqual(['CANCELLED', 'CANCELLED']);
    });

    test('a printed bill refuses the cancel, naming it, and nothing is written', async () => {
        seedRound('PENDING', { billId: 'b7' });
        db._seed['restaurants/res_1/bills/b7'] = { series: 'A', number: '0002', status: 'issued' };
        await expect(cancel()).rejects.toThrow('Bill A-0002 is printed — ask the cashier to edit it on the till');
        expect(writes.set.length + writes.update.length).toBe(0);
    });

    test('a paid bill refuses the cancel too', async () => {
        seedRound('SERVED', { billId: 'b8' });
        db._seed['restaurants/res_1/orders/o1'].carts[0].status = 'READY';
        db._seed['restaurants/res_1/orders/o1'].carts[0].items.forEach(i => { i.status = 'READY'; });
        db._seed['restaurants/res_1/bills/b8'] = { series: 'A', number: '0003', status: 'paid' };
        await expect(cancel()).rejects.toThrow('Bill A-0003 is printed');
        expect(writes.set.length + writes.update.length).toBe(0);
    });

    test('an order with a dish already served is refused: that food was eaten', async () => {
        seedRound('READY');
        db._seed['restaurants/res_1/orders/o1'].carts[0].items[1].status = 'SERVED';
        await expect(cancel()).rejects.toThrow('Butter Naan is already served — cancel the other dishes one at a time');
        expect(writes.set.length + writes.update.length).toBe(0);
    });

    test('the kitchen cannot cancel an order', async () => {
        seedRound('PENDING');
        mockStaff.role = 'KITCHEN';
        await expect(cancel()).rejects.toThrow(/waiter or the cashier/);
        expect(writes.set.length + writes.update.length).toBe(0);
    });
});

// TD-092: table 9's naan is READY on the pass; nothing may complete the order while a round is unserved, or the
// kitchen and waiter screens drop food the till still bills. (The waiter app's Mark Paid is gone, D4.)
describe('TD-092: COMPLETED waits for every live round to be served', () => {
    test('a READY round refuses COMPLETED, naming the round', async () => {
        db._seed['restaurants/res_1/orders/o1'] = { ...order(), carts: [
            { cartId: 'c1', status: 'SERVED', items: [] }, { cartId: 'c2', status: 'READY', items: [] }, { cartId: 'c3', status: 'CANCELLED', items: [] },
        ] };
        await expect(invoke(updateOrderStatus, { restaurantId: 'res_1', sessionId: 'sess_1', orderId: 'o1', orderStatus: 'COMPLETED' }))
            .rejects.toThrow('Round 2 is still READY — serve or cancel it first');
        expect(writes.update).toHaveLength(0);
    });
});
