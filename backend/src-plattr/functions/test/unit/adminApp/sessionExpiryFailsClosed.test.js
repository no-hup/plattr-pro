/* eslint-disable global-require */

// The session expiry gate must FAIL CLOSED, on both doors.
//
// It used to read `if (expiresAt && expiry && expiry < now) reject`. safeToDate returning
// null made the whole condition false, so a shape it could not parse was accepted with no
// expiry check at all. The unparseable shape was `{seconds, nanoseconds}` — a Firestore
// Timestamp after any JSON round-trip — because safeToDate only knew `_seconds`.
//
// validateStaffSession is the only gate in front of billing, payments and day close.

describe.each([
    ['validateAdminSession', 'ADMIN'],
    ['validateStaffSession', 'SERVER'],
])('%s expiry fails closed', (fnName, role) => {
    let validate;
    let sessionData;
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const secs = (d) => Math.floor(d.getTime() / 1000);

    beforeEach(() => {
        jest.resetModules();
        const doc = (data) => ({ get: () => Promise.resolve({ exists: true, data: () => data }) });
        jest.doMock('../../../admin/admin', () => ({
            db: {
                collection: () => ({
                    doc: () => ({
                        collection: (name) => ({
                            doc: () => (name === 'sessions' ? doc(sessionData) : doc({ role }))
                        })
                    })
                })
            }
        }));
        validate = require('../../../adminApp/auth')[fnName];
    });

    const session = (expiresAt) => ({ entity: 'server', serverId: 's1', status: 'active', expiresAt });
    const denied = () => expect(validate('r1', 'sess')).rejects.toMatchObject({ code: 'unauthenticated' });
    const allowed = () => expect(validate('r1', 'sess')).resolves.toMatchObject({ serverId: 's1' });

    it('denies a JSON round-tripped Timestamp that has expired', async () => {
        sessionData = session({ seconds: secs(past), nanoseconds: 0 });
        await denied();
    });

    it('denies a session with no expiresAt at all', async () => {
        sessionData = session(undefined);
        await denied();
    });

    it('denies an expiry it cannot parse', async () => {
        sessionData = session({});
        await denied();
    });

    it('still allows a JSON round-tripped Timestamp in the future', async () => {
        sessionData = session({ seconds: secs(future), nanoseconds: 0 });
        await allowed();
    });
});
