// FL · the manual trigger's guard. The sweep body is tested in app/floor.test.ts; this file proves
// the door still refuses outside the emulator now that the old JS body is gone (TD-044).
jest.mock('../adapters/firestore/floor', () => ({ ports: {} }));
jest.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_o: unknown, fn: unknown) => fn }));
jest.mock('firebase-functions', () => ({ https: { onCall: (fn: unknown) => fn } }));
const mockIsEmulator = jest.fn(() => false);
jest.mock('../../singleton/Environment', () => ({ isEmulator: () => mockIsEmulator() }));
jest.mock('../../singleton/ErrorHandler', () => ({
  forbidden: (m: string) => { throw Object.assign(new Error(m), { code: 'permission-denied' }); },
  badRequest: (m: string) => { throw new Error(m); },
  throwError: (c: string, m: string) => { throw Object.assign(new Error(m), { code: c }); },
  handleError: (e: Error) => { throw e; },
}));
jest.mock('../app/floor', () => ({ ...jest.requireActual('../app/floor'), releaseIdleEverywhere: jest.fn(async () => [{ restaurantId: 'r1', candidates: 0, freed: [], money: [], skipped: [] }]) }));

import { idleSweepHandler } from './floor';

describe('table-cleanupInactiveSessions — the manual trigger for the idle sweep', () => {
  it('refuses outside the emulator: an unauthenticated cross-tenant mutation never answers in production', async () => {
    mockIsEmulator.mockReturnValue(false);
    await expect((idleSweepHandler as unknown as () => Promise<unknown>)()).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('runs the sweep in the emulator and answers the reports', async () => {
    mockIsEmulator.mockReturnValue(true);
    await expect((idleSweepHandler as unknown as () => Promise<unknown>)()).resolves.toMatchObject({ status: 'success', data: { reports: [{ restaurantId: 'r1' }] } });
  });
});
