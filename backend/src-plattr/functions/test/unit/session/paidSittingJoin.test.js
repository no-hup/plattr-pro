/* eslint-disable global-require */
// D2 (Shaurya 2026-09-25), FL-S14 / R18, TD-120. 21:45 table 9 has paid ₹660; a couple scans the QR and signs in.
// Both ways a phone joins a live sitting (the primary scan finding a session, and a second phone added to it) refuse
// "table 9 has paid — clear it first", and nothing is written. Someone already in the sitting is not asked.
const store = {};
const updates = [];
jest.mock('../../../admin/admin', () => {
    const ref = (path) => ({
        id: path.split('/').pop(), path,
        get: () => Promise.resolve({ exists: !!store[path], id: path.split('/').pop(), ref: ref(path), data: () => store[path] }),
        update: (patch) => { updates.push({ path, patch }); return Promise.resolve(); },
        collection: (sub) => col(`${path}/${sub}`),
    });
    const col = (path) => {
        const q = { where: () => q, limit: () => q, get: async () => {
            const docs = Object.keys(store).filter(k => k.startsWith(`${path}/`) && store[k].status === 'active').map(k => ({ id: k.split('/').pop(), ref: ref(k), data: () => store[k] }));
            return { empty: !docs.length, docs };
        } };
        return { doc: (id) => ref(`${path}/${id}`), ...q };
    };
    return { db: { collection: (n) => col(n) }, admin: {}, FieldValue: {} };
});
const refusal = { current: null, asked: [] };
jest.mock('../../../lib/adapters/firestore/floor', () => ({
    sittingRefusal: async (...a) => { refusal.asked.push(a); return refusal.current; },
}));

const svc = require('../../../session/sessionService');
const S = 'restaurants/r1/sessions';

beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    updates.length = 0; refusal.asked.length = 0; refusal.current = 'table 9 has paid — clear it first';
    store['restaurants/r1'] = { name: 'R' };
    store['restaurants/r1/tables/t9'] = { number: '9' };
    store[`${S}/sess_paid`] = { tableId: 't9', status: 'active', users: ['9876543210'], expiresAt: new Date(Date.now() + 3600e3) };
});

describe('a paid sitting takes no new guest (D2)', () => {
    test('a new phone scanning table 9 is refused, naming the table, and is not added', async () => {
        await expect(svc.createOrGetTableSession('r1', 't9', '9876500000')).rejects.toMatchObject({ code: 'failed-precondition', message: 'table 9 has paid — clear it first' });
        expect(refusal.asked).toEqual([['r1', 'sess_paid', '9', 'guest']]);
        expect(updates).toEqual([]);
    });
    test('a second phone added to the paid sitting is refused the same way', async () => {
        await expect(svc.addUserToTableSession('r1', 'sess_paid', '9876500000')).rejects.toMatchObject({ code: 'failed-precondition', message: 'table 9 has paid — clear it first' });
        expect(updates).toEqual([]);
    });
    test('the paying guest re-opening their own phone is not a new guest and is not asked', async () => {
        const s = await svc.createOrGetTableSession('r1', 't9', '9876543210');
        expect(s.id).toBe('sess_paid');
        expect(refusal.asked).toEqual([]);
    });
    test('a table that has not paid lets the new phone in', async () => {
        refusal.current = null;
        const s = await svc.createOrGetTableSession('r1', 't9', '9876500000');
        expect(s.id).toBe('sess_paid');
        expect(updates.map(u => u.path)).toEqual([`${S}/sess_paid`]);
    });
});
