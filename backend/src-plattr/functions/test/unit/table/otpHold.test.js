// The OTP rules, 2026-09-21. Three sentences, and every one of them used to be the other way:
//
//   1. A fresh code holds nothing. Minting must not make a table look claimed.
//   2. A scan keeps the code the table already has. Rotating it on scan let anyone with the QR
//      invalidate the number a waiter was in the middle of reading out.
//   3. The hold is what expires, not the code. `expiresAt` is the claim, and it lapses by itself.
//
// Decided in moonshot/reviews/2026-09-21-otp-and-table-state.md.

// otpService pulls in admin/admin for Timestamp; the rules under test touch neither.
jest.mock('../../../admin/admin', () => ({ Timestamp: {} }));
jest.mock('../../../utils/timestamp', () => ({ now: () => 1, fromDate: (d) => d, safeToDate: (v) => (v instanceof Date ? v : new Date(v)) }));

const otpService = require('../../../session/otpService');

describe('the code and the hold are two different things', () => {
    test('a fresh code holds nothing', () => {
        const otp = otpService.createOTPObject();
        expect(otp.code).toHaveLength(6);
        expect(otp.expiresAt).toBeNull();
        expect(otpService.isHoldActive(otp)).toBe(false);
    });

    test('a table that already has a code keeps it — a scan never rotates one', () => {
        const mine = { code: '424242', createdAt: 1, expiresAt: null };
        expect(otpService.handleOTPGeneration({ currentOTP: mine })).toBe(mine);
        // even one whose hold has long lapsed: the hold is spent, the code is not
        const cold = { code: '424242', createdAt: 1, expiresAt: new Date(Date.now() - 60_000) };
        expect(otpService.handleOTPGeneration({ currentOTP: cold })).toBe(cold);
    });

    test('a table with no code at all gets one', () => {
        expect(otpService.handleOTPGeneration({}).code).toHaveLength(6);
        expect(otpService.handleOTPGeneration({ currentOTP: { code: '' } }).code).toHaveLength(6);
    });

    test('the hold runs from now and lapses on its own clock', () => {
        const held = { code: '1', createdAt: 1, expiresAt: otpService.holdExpiry() };
        expect(otpService.isHoldActive(held)).toBe(true);
        expect(otpService.isHoldActive({ code: '1', expiresAt: new Date(Date.now() - 1000) })).toBe(false);
        expect(otpService.isHoldActive(null)).toBe(false);
        expect(otpService.isHoldActive({ code: '1' })).toBe(false);
    });
});
