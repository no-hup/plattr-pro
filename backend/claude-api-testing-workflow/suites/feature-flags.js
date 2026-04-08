/**
 * Suite: feature-flags
 *
 * Tests the observable behavior differences when feature flags are toggled.
 * Uses dev-setFeatureFlags endpoint to override the singleton.
 * Resets flags to defaults after each test group.
 * Uses TABLE_CLEAN_1 (gets reset via data reset before suite).
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError } from '../lib/assert.js';
import { customerLogin } from '../lib/auth.js';
import { setFeatureFlags, resetFeatureFlags } from '../lib/data.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_1, TABLE_CLEAN_2, TABLE_CLEAN_3, TABLE_OTP, ITEMS, VARIANTS } = config;

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

  // ── 5. isMultipleVariantOrAddonForMenuItemsSupported: OFF ──
  // Adding same item with different config should fail
  {
    await setFeatureFlags({ isMultipleVariantOrAddonForMenuItemsSupported: false });

    // Get a session on a fresh table from another restaurant
    let sessionId;
    try {
      sessionId = await customerLogin(
        config.RESTAURANT_FALLBACK_OFF, TABLE_CLEAN_2, TABLE_OTP, '5551110003', 'Flag Tester'
      );
    } catch (e) {
      record({ pass: false, message: `5. Setup failed: ${e.message}` });
      await resetFeatureFlags();
      return results;
    }

    // Add burger with Regular
    await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_FALLBACK_OFF,
      tableId: TABLE_CLEAN_2,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    });

    // Small delay to ensure Firestore write is visible
    await new Promise(r => setTimeout(r, 500));

    // Add burger with Large (different config) — should fail
    const resp = await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_FALLBACK_OFF,
      tableId: TABLE_CLEAN_2,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `5. MultiVariant OFF: same item, different config → ${isError ? 'rejected as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
    await resetFeatureFlags();
  }

  // ── 6. isMultipleVariantOrAddonForMenuItemsSupported: ON (default) ──
  // Same operation should succeed
  {
    let sessionId;
    try {
      sessionId = await customerLogin(
        config.RESTAURANT_FALLBACK_OFF, TABLE_CLEAN_3, TABLE_OTP, '5551110004', 'Flag Tester 2'
      );
    } catch (e) {
      record({ pass: false, message: `6. Setup failed: ${e.message}` });
      return results;
    }

    // Add burger Regular
    await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_FALLBACK_OFF,
      tableId: TABLE_CLEAN_3,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    });

    // Add burger Large — should succeed as separate line item
    const resp = await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_FALLBACK_OFF,
      tableId: TABLE_CLEAN_3,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
    });
    record(assertSuccess(resp, '6. MultiVariant ON: same item, different config → allowed'));
  }

  // ── 7. fallbackToSameCustomConfigurationForAddItem: OFF ──
  // Adding same item without config should NOT auto-fill from previous
  {
    await setFeatureFlags({ fallbackToSameCustomConfigurationForAddItem: false });

    // Use a table from RESTAURANT_MULTI_VARIANT_OFF that hasn't been touched
    let sessionId;
    try {
      sessionId = await customerLogin(
        config.RESTAURANT_MULTI_VARIANT_OFF, TABLE_CLEAN_2, TABLE_OTP, '5551110005', 'Fallback Tester',
      );
    } catch (e) {
      record({ pass: false, message: `7. Setup failed: ${e.message}` });
      await resetFeatureFlags();
      return results;
    }

    // Add burger with Large
    await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_MULTI_VARIANT_OFF,
      tableId: TABLE_CLEAN_2,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
    });

    // Add burger without any config — should fail (mandatory variant not selected, no fallback)
    const resp = await call('cart-addItemToCart', {
      restaurantId: config.RESTAURANT_MULTI_VARIANT_OFF,
      tableId: TABLE_CLEAN_2,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      // No selectedVariants, no selectedAddons — and fallback is OFF
    });
    // With fallback OFF and mandatory variant not provided, this SHOULD fail.
    // However, if the backend doesn't enforce mandatory variant when no fallback,
    // it may still succeed (adding without variant). Check actual behavior.
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `7. Fallback OFF: add without config → ${isError ? 'error (mandatory variant enforced)' : 'succeeded (mandatory variant NOT enforced without fallback)'}`,
      actual: isError ? undefined : resp,
    });
    await resetFeatureFlags();
  }

  return results;
}
