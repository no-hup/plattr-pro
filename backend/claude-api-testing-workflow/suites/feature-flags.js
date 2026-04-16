/**
 * Suite: feature-flags
 *
 * Tests the observable behavior differences when feature flags are toggled.
 * Uses dev-setFeatureFlags endpoint to override the singleton.
 * Resets flags to defaults after each test group.
 * Uses TABLE_CLEAN_1 (gets reset via data reset before suite).
 */
import { call } from '../lib/api.js';
import { setFeatureFlags, resetFeatureFlags } from '../lib/data.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_1, TABLE_CLEAN_2, TABLE_CLEAN_3, TABLE_OTP } = config;

export default async function featureFlagsSuite() {
  const results = { name: 'feature-flags', pass: 0, fail: 0, tests: [] };

  function record(assertion) {
    results.tests.push(assertion);
    assertion.pass ? results.pass++ : results.fail++;
  }

  // ── 1. isOtpManadatoryAtScan: OFF → scan returns success (not 401) ──
  {
    await setFeatureFlags({ isOtpManadatoryAtScan: false });
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isSuccess = resp.status === 'success' || resp._httpStatus === 200;
    record({
      pass: isSuccess,
      message: `1. OTP OFF: scan → ${isSuccess ? 'success (no auth required)' : `unexpected ${resp.status} HTTP ${resp._httpStatus}`}`,
      actual: isSuccess ? undefined : resp,
    });
    await resetFeatureFlags();
  }

  // ── 2. isOtpManadatoryAtScan: ON (default) → scan returns 401 ──
  {
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isAuth = resp._httpStatus === 401 || resp.status === 'error';
    record({
      pass: isAuth,
      message: `2. OTP ON: scan → ${isAuth ? 'auth required as expected' : `unexpected success HTTP ${resp._httpStatus}`}`,
      actual: isAuth ? undefined : resp,
    });
  }

  // ── 3. isUsernameEnabled: OFF → OTP validation without name succeeds ──
  {
    await setFeatureFlags({ isUsernameEnabled: false });
    const resp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
      otp: TABLE_OTP,
      phoneNumber: '5551110001',
      // No name provided
    });
    const ok = resp.status === 'success' || (resp.data?.sessionId != null);
    record({
      pass: ok,
      message: `3. Username OFF: OTP without name → ${ok ? 'success' : `error: ${resp.message}`}`,
      actual: ok ? undefined : resp,
    });
    await resetFeatureFlags();
  }

  // ── 4. isUsernameEnabled: ON (default) → OTP without name fails ──
  // Need a fresh table for this test. We'll use a table from a different restaurant.
  {
    const resp = await call('table-validateOTP', {
      restaurantId: config.RESTAURANT_MULTI_VARIANT_OFF,
      tableId: TABLE_CLEAN_1,
      otp: TABLE_OTP,
      phoneNumber: '5551110002',
      // No name provided — should fail when flag is ON
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `4. Username ON: OTP without name → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  return results;
}
