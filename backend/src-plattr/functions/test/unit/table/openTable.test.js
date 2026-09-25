/* eslint-disable global-require */
// OR-S1 / S19 / S22: staff open a table with no scan. Vacant → one new table session, table active,
// openedBy stamped, covers only when given. Occupied → the live sitting, extended, nothing minted.
// Disabled → refused. The staff session is the key; the answer is the TABLE session.

const store = {};
const updates = [];

jest.mock('../../../admin/admin', () => {
    const ref = (path) => ({
        id: path.split('/').pop(), path,
        get: () => Promise.resolve({ exists: !!store[path], id: path.split('/').pop(), data: () => store[path] }),
        update: (patch) => { updates.push({ path, patch }); store[path] = { ...(store[path] || {}), ...patch }; return Promise.resolve(); },
        collection: (sub) => col(`${path}/${sub}`),
    });
    const col = (path) => ({ doc: (id) => ref(`${path}/${id}`) });
    return { db: { collection: (n) => col(n) } };
});
jest.mock('../../../utils/timestamp', () => ({ serverTimestamp: () => 'TS', fromDate: (d) => d.getTime() }));
jest.mock('../../../adminApp/auth', () => ({ validateStaffSession: jest.fn(async () => ({ serverId: 'srv_9', serverData: { role: 'SERVER' } })) }));
jest.mock('../../../table/mergedTables', () => ({ resolveTableId: async (_r, t) => (t === 'child' ? 'parent' : t) }));

const live = { current: null };
const created = [];
jest.mock('../../../session/sessionService', () => ({
    validateTableSession: async () => live.current,
    createOrGetTableSession: async (_r, tableId, primaryUserId) => { created.push({ tableId, primaryUserId }); return { id: 'sess_new', tableId, primaryUserId }; },
}));

// D2 / D3: the sitting's bills decide whether a round may go on; the rule itself is domain/floor's, tested there.
const refusal = { current: null, asked: [] };
jest.mock('../../../lib/adapters/firestore/floor', () => ({
    sittingRefusal: async (...a) => { refusal.asked.push(a); return refusal.current; },
}));

const { openTable } = require('../../../table/openTable');
const invoke = (data) => (typeof openTable.run === 'function' ? openTable.run({ data }) : openTable({ data }, {}));
const T = 'restaurants/r1/tables';

beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    updates.length = 0; created.length = 0; live.current = null; refusal.current = null; refusal.asked.length = 0;
    store[`${T}/t7`] = { number: '7', status: 'vacant' };
    store[`${T}/t9`] = { number: '9', status: 'disabled' };
    store['restaurants/r1/sessions/sess_new'] = {};
    store['restaurants/r1/sessions/sess_old'] = { tableId: 't7', status: 'active', expiresAt: 1 };
});

describe('table-openTable', () => {
    test('OR-S1 a vacant table gets one staff session, goes active, and carries who opened it and how many sat', async () => {
        const res = await invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s', covers: 2 });
        expect(res.data).toMatchObject({ tableId: 't7', sessionId: 'sess_new', created: true, addedBy: 'staff:srv_9', covers: 2 });
        expect(created).toEqual([{ tableId: 't7', primaryUserId: 'staff:srv_9' }]);
        expect(store[`${T}/t7`]).toMatchObject({ status: 'active', openedBy: 'staff:srv_9' });
        expect(store['restaurants/r1/sessions/sess_new']).toMatchObject({ openedBy: 'staff:srv_9', covers: 2 });
    });
    test('covers is optional: nothing is stamped when the captain skips it', async () => {
        const res = await invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s' });
        expect(res.data.covers).toBeNull();
        expect(store['restaurants/r1/sessions/sess_new']).not.toHaveProperty('covers');
    });
    test('OR-S22 an occupied table returns the live sitting and mints nothing', async () => {
        live.current = { id: 'sess_old', tableId: 't7', covers: 4 };
        const res = await invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s' });
        expect(res.data).toMatchObject({ sessionId: 'sess_old', created: false, covers: 4 });
        expect(created).toEqual([]);
    });
    test('OR-S19 opening an occupied table extends its expiry instead of splitting the bill', async () => {
        live.current = { id: 'sess_old', tableId: 't7' };
        const before = Date.now();
        await invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s' });
        const w = updates.find(u => u.path === 'restaurants/r1/sessions/sess_old');
        expect(w.patch.expiresAt).toBeGreaterThanOrEqual(before + 4 * 60 * 60 * 1000 - 5);
    });
    // D2 (Shaurya 2026-09-25): 23:15 table 7 has paid ₹3,100; the captain opens it to add two filter coffees. Refused,
    // naming the table, and nothing is extended or minted: the cashier clears it and the coffees start a new sitting.
    test('D2 FL-S14 opening a paid table to add dishes is refused "table 7 has paid — clear it first", nothing written', async () => {
        live.current = { id: 'sess_old', tableId: 't7' };
        refusal.current = 'table 7 has paid — clear it first';
        await expect(invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s' })).rejects.toMatchObject({ code: 'failed-precondition', message: 'table 7 has paid — clear it first' });
        expect(refusal.asked).toEqual([['r1', 'sess_old', '7', 'round']]);
        expect(updates).toEqual([]);
        expect(created).toEqual([]);
    });
    test('a merged child opens its parent, like the cart does', async () => {
        store[`${T}/parent`] = { number: '5', status: 'vacant' };
        const res = await invoke({ restaurantId: 'r1', tableId: 'child', sessionId: 'staff_s' });
        expect(res.data.tableId).toBe('parent');
    });
    test('a disabled table is refused; a bad covers value is refused; an unknown table is refused', async () => {
        await expect(invoke({ restaurantId: 'r1', tableId: 't9', sessionId: 'staff_s' })).rejects.toMatchObject({ code: 'failed-precondition' });
        await expect(invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s', covers: 0 })).rejects.toMatchObject({ code: 'invalid-argument' });
        await expect(invoke({ restaurantId: 'r1', tableId: 't7', sessionId: 'staff_s', covers: 2.5 })).rejects.toMatchObject({ code: 'invalid-argument' });
        await expect(invoke({ restaurantId: 'r1', tableId: 'nope', sessionId: 'staff_s' })).rejects.toMatchObject({ code: 'not-found' });
        expect(created).toEqual([]);
    });
});
