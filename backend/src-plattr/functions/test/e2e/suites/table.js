/**
 * Suite: table
 *
 * Table validation, OTP flows, status changes, server assignment.
 * Tests scan behavior, OTP validation edge cases, disabled tables.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError, assertField, assertFieldExists } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import { narrator } from '../lib/narrator.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_1, TABLE_CLEAN_2, TABLE_CLEAN_3, TABLE_CLEAN_4, TABLE_OTP } = config;

export default async function tableSuite() {
  const results = { name: 'table', pass: 0, fail: 0, tests: [] };
  let sessionId; // captured from test 3 OTP validation, used in tests 15 & 17

  function record(a) { results.tests.push(a); a.pass ? results.pass++ : results.fail++; }

  // ── 1. Validate vacant table (OTP flag ON) → auth required ─────
  {
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isAuth = resp._httpStatus === 401 || resp.status === 'error';
    record({ pass: isAuth, message: `1. Scan vacant table → ${isAuth ? 'auth required (401)' : `unexpected HTTP ${resp._httpStatus}`}`, actual: isAuth ? undefined : resp });
  }

  // ── 2. Validate disabled table → 403 ──────────────────────────
  {
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_4, // disabled
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isForbidden = resp._httpStatus === 403 || (resp.status === 'error');
    record({ pass: isForbidden, message: `2. Scan disabled table → ${isForbidden ? 'forbidden' : `unexpected HTTP ${resp._httpStatus}`}`, actual: isForbidden ? undefined : resp });
  }

  // ── 3. OTP validation - correct OTP ────────────────────────────
  {
    const resp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
      otp: TABLE_OTP,
      phoneNumber: '5552001001',
      name: 'Table Tester',
    });
    record(assertSuccess(resp, '3. OTP correct'));
    if (resp.status === 'success') {
      sessionId = resp.data?.sessionId;
      record(assertFieldExists(resp, 'data.sessionId', '3a. sessionId returned'));
      record(assertField(resp, 'data.isPrimaryCustomer', true, '3b. isPrimaryCustomer'));
    }
  }

  // ── 4. OTP validation - wrong OTP → 401 ───────────────────────
  {
    const resp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
      otp: '9999',
      phoneNumber: '5552001002',
      name: 'Wrong OTP',
    });
    const isError = resp._httpStatus === 401 || resp.status === 'error';
    record({ pass: isError, message: `4. Wrong OTP → ${isError ? 'rejected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 5. OTP without phone (vacant table) → error ───────────────
  {
    // Use a restaurant table that hasn't been scanned yet
    const resp = await call('table-validateOTP', {
      restaurantId: config.RESTAURANT_MULTI_VARIANT_OFF,
      tableId: TABLE_CLEAN_1,
      otp: TABLE_OTP,
      name: 'No Phone',
      // no phoneNumber
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `5. OTP without phone → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 6. OTP without name (username flag ON) → error ─────────────
  {
    const resp = await call('table-validateOTP', {
      restaurantId: config.RESTAURANT_FALLBACK_OFF,
      tableId: TABLE_CLEAN_1,
      otp: TABLE_OTP,
      phoneNumber: '5552001003',
      // no name
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `6. OTP without name → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 7. Secondary user joins active table ───────────────────────
  // TABLE_CLEAN_2 was activated by the primary customer in test 3.
  // A second user joining should get isPrimaryCustomer=false.
  // NOTE: The OTP may have been regenerated during test 3, so we use
  // the same OTP (1234) which should still be valid for joining.
  {
    const resp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
      otp: TABLE_OTP,
      phoneNumber: '5552001004',
      name: 'Secondary User',
    });
    const ok = resp.status === 'success';
    record({ pass: ok, message: `7. Secondary user joins → ${ok ? 'success' : `error: ${resp.message}`}`, actual: ok ? undefined : resp });
    if (ok) {
      // The user joining an active table should be secondary
      const isPrimary = resp.data?.isPrimaryCustomer;
      record({ pass: isPrimary === false, message: `7a. isPrimaryCustomer=${isPrimary} (expected false)`, actual: isPrimary === false ? undefined : resp });
    }
  }

  // ── 8. Get tables for restaurant ───────────────────────────────
  {
    const resp = await call('table-getTablesForRestaurant', {
      restaurantId: RESTAURANT_ID,
    });
    record(assertSuccess(resp, '8. Get tables'));
  }

  // ── 9. Get table details ───────────────────────────────────────
  {
    const resp = await call('table-getTableDetails', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
    });
    record(assertSuccess(resp, '9. Get table details'));
  }

  // ── 10. Server login for assignment tests ──────────────────────
  let serverSessionId;
  try {
    serverSessionId = await serverLogin();
    record({ pass: true, message: '10. Server logged in' });
  } catch (e) {
    record({ pass: false, message: `10. Server login failed: ${e.message}` });
    return results;
  }

  // ── 11. Assign server to table ─────────────────────────────────
  {
    const resp = await call('table-assignTableToServer', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
      serverId: 'server_1',
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '11. Assign server to table'));
  }

  // ── 12. Unassign server ────────────────────────────────────────
  {
    const resp = await call('table-unassignTableFromServer', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_2,
      serverId: 'server_1',
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '12. Unassign server'));
  }

  // ── 13. Missing restaurantId → error ───────────────────────────
  {
    const resp = await call('table-validateTableAndLocation', {
      tableId: TABLE_CLEAN_1,
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `13. Missing restaurantId → ${isError ? 'error' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 14. Invalid tableId → error ────────────────────────────────
  {
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: 'nonexistent_table_xyz',
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `14. Invalid tableId → ${isError ? 'error' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 15. Session resume via validateTableAndLocation with sessionId ──
  if (sessionId) {
    const resp = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      userLocation: { latitude: 12.9716, longitude: 77.5946 },
      sessionId,
    });
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({
      pass: ok,
      message: `15. Session resume with sessionId → ${ok ? 'success' : `HTTP ${resp._httpStatus}`}`,
      actual: ok ? undefined : resp,
    });
    narrator.info('Session resume via validateTableAndLocation');
  }

  // ── 16. checkTableStatus for vacant table ─────────────────────
  {
    const resp = await call('table-checkTableStatus', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
    });
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({
      pass: ok,
      message: `16. checkTableStatus (vacant) → ${ok ? 'success' : `error: ${resp.message}`}`,
      actual: ok ? undefined : resp,
    });
  }

  // ── 17. checkTableStatus for occupied table ───────────────────
  if (sessionId) {
    const resp = await call('table-checkTableStatus', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
    });
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({
      pass: ok,
      message: `17. checkTableStatus (occupied) → ${ok ? 'success' : `error: ${resp.message}`}`,
      actual: ok ? undefined : resp,
    });
  }

  return results;
}
