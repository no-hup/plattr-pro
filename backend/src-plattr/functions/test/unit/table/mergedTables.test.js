/**
 * Merged tables: a party of eight sits at table 5 with table 6 pushed against it.
 *
 * The shared firestore mock has no batch() and its where() is always empty, so this
 * file carries its own tiny store instead of widening the shared one.
 */

const store = {};            // path -> document data
const committed = [];        // every batched update, in order

jest.mock('../../../admin/admin', () => {
    const makeDocRef = (path) => ({
        id: path.split('/').pop(),
        path,
        get: () => Promise.resolve({
            exists: Object.prototype.hasOwnProperty.call(global.__mergeStore, path),
            id: path.split('/').pop(),
            data: () => global.__mergeStore[path]
        }),
        update: (patch) => {
            global.__mergeStore[path] = { ...(global.__mergeStore[path] || {}), ...patch };
            return Promise.resolve();
        },
        collection: (sub) => makeCollectionRef(`${path}/${sub}`)
    });

    const makeCollectionRef = (path) => ({
        doc: (id) => makeDocRef(`${path}/${id}`),
        where: (field, _op, value) => {
            const matches = Object.keys(global.__mergeStore)
                .filter((p) => p.startsWith(`${path}/`) && p.split('/').length === path.split('/').length + 1)
                .filter((p) => global.__mergeStore[p][field] === value)
                // A real query hands back snapshots, not refs — mergedTables uses doc.ref.
                .map((p) => ({ id: p.split('/').pop(), ref: makeDocRef(p), data: () => global.__mergeStore[p] }));
            const query = {
                limit: () => query,
                get: () => Promise.resolve({
                    empty: matches.length === 0,
                    docs: matches,
                    forEach: (fn) => matches.forEach(fn)
                })
            };
            return query;
        }
    });

    return {
        db: {
            collection: (name) => makeCollectionRef(name),
            batch: () => {
                const ops = [];
                return {
                    update: (ref, patch) => ops.push({ path: ref.path, patch }),
                    commit: () => {
                        ops.forEach(({ path, patch }) => {
                            global.__mergeCommitted.push({ path, patch });
                            global.__mergeStore[path] = { ...(global.__mergeStore[path] || {}), ...patch };
                        });
                        return Promise.resolve();
                    }
                };
            }
        },
        admin: {}
    };
});

jest.mock('../../../utils/timestamp', () => ({
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    toISOString: (v) => v
}));

jest.mock('../../../session/sessionService', () => ({
    endTableSessions: jest.fn(() => Promise.resolve())
}));

global.__mergeStore = store;
global.__mergeCommitted = committed;

const { resolveTableId, unmergeChildren } = require('../../../table/mergedTables');
const { vacateTable } = require('../../../table/vacateTable');

const TABLES = 'restaurants/rest001/tables';

beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    committed.length = 0;

    store[`${TABLES}/table5`] = { number: 5, status: 'active' };
    store[`${TABLES}/table6`] = {
        number: 6,
        status: 'disabled',
        mergedInto: 'table5',
        mergedBy: { serverId: 'srv_asha', name: 'Asha' }
    };
    // Untouched by any of this — proves we only release our own children.
    store[`${TABLES}/table7`] = { number: 7, status: 'vacant' };
});

describe('resolveTableId', () => {
    it('sends a guest who scanned the merged table to the parent', async () => {
        expect(await resolveTableId('rest001', 'table6')).toBe('table5');
    });

    it('leaves an ordinary table alone', async () => {
        expect(await resolveTableId('rest001', 'table7')).toBe('table7');
    });

    it('leaves a production table that predates the field alone', async () => {
        store[`${TABLES}/table8`] = { number: 8, status: 'vacant' }; // no mergedInto key
        expect(await resolveTableId('rest001', 'table8')).toBe('table8');
    });

    it('does not invent a table that is not there', async () => {
        expect(await resolveTableId('rest001', 'nope')).toBe('nope');
    });
});

describe('unmergeChildren', () => {
    it('frees the child and names it', async () => {
        const released = await unmergeChildren('rest001', 'table5');

        expect(released).toEqual(['table6']);
        expect(store[`${TABLES}/table6`]).toMatchObject({
            status: 'vacant',
            mergedInto: null,
            mergedBy: null
        });
        expect(store[`${TABLES}/table7`].status).toBe('vacant'); // untouched
    });

    it('writes nothing when no table is merged into this one', async () => {
        const released = await unmergeChildren('rest001', 'table7');

        expect(released).toEqual([]);
        expect(committed).toHaveLength(0);
    });
});

describe('vacateTable', () => {
    it('releases the merge the moment the bill is settled', async () => {
        await vacateTable('rest001', 'table5');

        expect(store[`${TABLES}/table5`]).toMatchObject({ status: 'vacant', mergedInto: null });
        expect(store[`${TABLES}/table6`]).toMatchObject({ status: 'vacant', mergedInto: null });
        // Table 6 can be scanned on its own again.
        expect(await resolveTableId('rest001', 'table6')).toBe('table6');
    });

    it('clears its own pointer when the waiter vacates the child itself', async () => {
        await vacateTable('rest001', 'table6');

        expect(store[`${TABLES}/table6`]).toMatchObject({ status: 'vacant', mergedInto: null });
        expect(store[`${TABLES}/table5`].status).toBe('active'); // parent untouched
    });
});
