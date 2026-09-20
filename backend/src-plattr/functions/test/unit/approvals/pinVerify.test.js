/* eslint-disable global-require */
// TD-041: the approval PIN is compared against `pinHash` (bcrypt) and nothing else. A plaintext
// stored value, an empty one or a missing one is not a PIN: it is refused. Runs against the
// compiled adapter in lib/, so `make check` (typecheck first) must precede it.

jest.mock('../../../admin/admin', () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }) } }));
jest.mock('../../../adminApp/auth', () => ({ validateStaffSession: async () => ({ serverId: 's1', serverData: {} }) }));

const { ports } = require('../../../lib/adapters/firestore/approvals');
const HASH_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'; // the seed's PIN_HASH

describe('ports.pin.verify (TD-041)', () => {
    test('the right PIN against its bcrypt hash passes', async () => {
        await expect(ports.pin.verify('1234', HASH_1234)).resolves.toBe(true);
    });
    test('a wrong PIN fails', async () => {
        await expect(ports.pin.verify('1235', HASH_1234)).resolves.toBe(false);
    });
    test('a plaintext stored PIN is never accepted, even when it matches', async () => {
        await expect(ports.pin.verify('1234', '1234')).resolves.toBe(false);
    });
    test('no stored hash means no PIN: refused', async () => {
        await expect(ports.pin.verify('1234', undefined)).resolves.toBe(false);
        await expect(ports.pin.verify('1234', '')).resolves.toBe(false);
    });
});
