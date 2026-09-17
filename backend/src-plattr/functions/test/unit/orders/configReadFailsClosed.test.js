/* eslint-disable global-require */

// A config read that cannot be completed must refuse the checkout, not guess.
//
// Both loaders used to swallow the error and return the permissive value. The cost is
// asymmetric and lands hours later:
//   - tax blocks: lines get written with no snapshotted block, the kitchen cooks, and
//     billing-preview refuses with "no tax block: Butter Chicken" when the food is on the table.
//   - waiter confirmation: a guest's round goes straight to the kitchen at a restaurant that
//     deliberately turned that off, and the waiter never gets to refuse it.
//
// The distinction that matters: a MISSING settings document is a fresh restaurant and still
// takes the default. An UNREADABLE one is indistinguishable from a fresh restaurant, so it refuses.

const mockGet = jest.fn();

jest.mock('../../../admin/admin', () => ({
    db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ get: mockGet }) }) }) }) },
}));

const { loadTaxBlocks } = require('../../../orders/lineSnapshots');

describe('loadTaxBlocks fails closed on an unreadable config', () => {
    beforeEach(() => mockGet.mockReset());

    it('refuses when the settings read throws', async () => {
        mockGet.mockRejectedValue(new Error('DEADLINE_EXCEEDED'));
        await expect(loadTaxBlocks('r1')).rejects.toMatchObject({ code: 'internal' });
    });

    it('still returns {} for a fresh restaurant with no settings document', async () => {
        mockGet.mockResolvedValue({ exists: false });
        await expect(loadTaxBlocks('r1')).resolves.toEqual({});
    });

    it('returns the blocks when the document is readable', async () => {
        const blocks = { food: { rate: 500 } };
        mockGet.mockResolvedValue({ exists: true, data: () => ({ tax: { blocks } }) });
        await expect(loadTaxBlocks('r1')).resolves.toEqual(blocks);
    });

    it('returns {} when the document exists but carries no tax config', async () => {
        mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
        await expect(loadTaxBlocks('r1')).resolves.toEqual({});
    });
});
