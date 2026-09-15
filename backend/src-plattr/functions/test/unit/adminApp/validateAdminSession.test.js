/* eslint-disable global-require */

// TD-006 characterization: validateAdminSession must accept a session whose
// expiresAt is an ISO string (seed / legacy docs). validateStaffSession already
// does via timestamp.safeToDate; the admin path called .toDate() unguarded and
// every admin-* endpoint 500'd in the emulator.

describe('validateAdminSession expiresAt shapes', () => {
    let validateAdminSession;
    let sessionData;
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 60 * 1000);

    beforeEach(() => {
        jest.resetModules();
        const doc = (data) => ({ get: () => Promise.resolve({ exists: true, data: () => data }) });
        jest.doMock('../../../admin/admin', () => ({
            db: {
                collection: () => ({
                    doc: () => ({
                        collection: (name) => ({
                            doc: () => (name === 'sessions' ? doc(sessionData) : doc({ role: 'ADMIN' }))
                        })
                    })
                })
            }
        }));
        validateAdminSession = require('../../../adminApp/auth').validateAdminSession;
    });

    const session = (expiresAt) => ({ entity: 'server', serverId: 's1', expiresAt });

    it('accepts a Firestore Timestamp in the future', async () => {
        sessionData = session({ toDate: () => future });
        await expect(validateAdminSession('r1', 'sess')).resolves.toEqual({ serverData: { role: 'ADMIN' }, serverId: 's1' });
    });

    it('accepts an ISO string in the future (seed data shape)', async () => {
        sessionData = session(future.toISOString());
        await expect(validateAdminSession('r1', 'sess')).resolves.toEqual({ serverData: { role: 'ADMIN' }, serverId: 's1' });
    });

    it('rejects an ISO string in the past as unauthenticated, not a crash', async () => {
        sessionData = session(past.toISOString());
        await expect(validateAdminSession('r1', 'sess')).rejects.toMatchObject({ code: 'unauthenticated' });
    });

    it('rejects a Timestamp in the past', async () => {
        sessionData = session({ toDate: () => past });
        await expect(validateAdminSession('r1', 'sess')).rejects.toMatchObject({ code: 'unauthenticated' });
    });
});
