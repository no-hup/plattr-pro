# Bugs Surfaced by E2E Test Suite

Discovered during E2E API testing against Firebase emulator with MockData5.

---

## BUG-1: Firestore Transaction Ordering in createOrUpdateOrder.js

**Severity: CRITICAL**
**Ease of Fix: MEDIUM**

- **File:** `functions/orders/createOrUpdateOrder.js`
- **Line:** ~287 (write) vs ~403 (read)
- **Error:** `Firestore transactions require all reads to be executed before all writes.`
- **Impact:** ALL checkout operations fail. Blocks customer ordering, order creation, and the entire order lifecycle.
- **Root cause:** `transaction.set(newOrderRef, newOrder)` at line 287 writes before `transaction.get(counterRef)` at line 403 reads the order counter.
- **Fix:** Move all `transaction.get()` calls (including `counterRef`) to before any `transaction.set()` or `transaction.update()` calls. Read the counter first, compute the next order number, then write the order with that number.
- **Tests affected:** customer-journey (tests 7+), order-lifecycle (all)

---

## BUG-2: Admin Endpoint Emulator Namespace Bug

**Severity: MEDIUM**
**Ease of Fix: EASY**

- **File:** `functions/index.js` (lines 30-53)
- **Error:** `Failed to find function admin.getRestaurantSettings in the loaded module`
- **Impact:** All `admin-*` endpoints fail in the Firebase emulator. Admin app cannot be tested locally.
- **Root cause:** `exports['admin-getRestaurantSettings']` uses a dash in the key. The emulator interprets `admin-` as a namespace separator and looks for `admin.getRestaurantSettings` (dot-separated), which doesn't exist.
- **Fix:** Change export pattern from `exports['admin-getRestaurantSettings']` to `exports.adminApp = { getRestaurantSettings, ... }` so the URL becomes `adminApp-getRestaurantSettings`. OR use underscores: `exports['admin_getRestaurantSettings']`.
- **Tests affected:** admin suite (all 16 tests skip gracefully)

---

## BUG-3: server-getTables and server-generateTableOTP Param Validation

**Severity: MEDIUM**
**Ease of Fix: EASY**

- **File:** `functions/server/tables_fetch.js`, `functions/server/table_otp.js`
- **Error:** `Restaurant ID is required` even when restaurantId is provided
- **Impact:** Server app cannot fetch tables or generate OTPs via these endpoints.
- **Root cause:** Likely a mismatch between how the `onCall` handler unpacks request data. The function reads `const { restaurantId } = data` but the emulator may be passing the data at a different nesting level. Other `onCall` functions (cart, table) work fine with the same data format, so this may be a function-specific issue in how `ServerInputValidation.validateGetTables(data)` receives the data.
- **Fix:** Add debug logging to see what `data` actually contains. Compare with working functions like `addItemToCart` to find the nesting difference. May need `data.data.restaurantId` instead of `data.restaurantId`.
- **Tests affected:** server-journey (tests 4, 5)

---

## BUG-4: clearCart Doesn't Use ResponseBuilder

**Severity: LOW**
**Ease of Fix: EASY**

- **File:** `functions/cart/clearCart.js` (line ~42)
- **Current response:** `{ message: "Cart cleared successfully." }` (no `status` field)
- **Expected response:** `{ status: "success", message: "Cart cleared successfully.", data: {} }`
- **Impact:** Frontend must handle inconsistent response format. Tests need special handling.
- **Fix:** Replace `return { message: "Cart cleared successfully." }` with `return ResponseBuilder.success({}, "Cart cleared successfully.")`
- **Tests affected:** cart (test 11 — worked around)

---

## BUG-5: addItemToCart Silently Ignores Unknown Addon IDs

**Severity: LOW**
**Ease of Fix: EASY**

- **File:** `functions/cart/addItemToCart.js` (addon processing section)
- **Behavior:** When `selectedAddons` contains an ID that doesn't exist in the restaurant's addon collection, the addon is silently skipped. No error is returned.
- **Impact:** Customer may think they added an addon that doesn't exist. Cart price won't include it but no feedback is given.
- **Fix:** After fetching addons from Firestore, check if any requested addon IDs were not found. If so, return a 404 error listing the missing addon IDs, similar to how variants handle `"variant(s) not found"`.
- **Tests affected:** cart (test 8 — updated to match current behavior)

---

## BUG-6: Feature Flag Singleton Uses Object.freeze() Preventing Runtime Override

**Severity: LOW**
**Ease of Fix: DONE (workaround in place)**

- **File:** `functions/singleton/FeatureFlags.js`
- **Issue:** `Object.freeze(featureFlags)` at line 42 prevents adding new properties or reassigning existing ones on the singleton instance. This blocks runtime flag overrides for testing.
- **Workaround applied:** Added `_overrideStore` object in constructor (before freeze), and `loadOverrides(db)` method that reads from `_system/featureFlagOverrides` Firestore doc. The `_overrideStore.data` is mutated (nested object, not frozen). `isEnabled()` checks overrides before defaults.
- **Architectural note:** Feature flags are global singleton — NOT per-restaurant. The `adminApp/settings.js` endpoint saves per-restaurant settings but NO API function reads them. Per-restaurant flag overrides are dead code.
- **Future fix:** Refactor to read flags from restaurant-level Firestore settings instead of singleton.

---

## BUG-7: validateTableAndLocation Regenerates OTP on Scan

**Severity: LOW (by design, but causes test friction)**
**Ease of Fix: N/A (design decision)**

- **File:** `functions/table/table.js` (validateTableAndLocation)
- **Behavior:** When a vacant table is scanned, the function generates a new OTP and overwrites `currentOTP` in Firestore. The mock data's pre-seeded OTP ("1234") is lost.
- **Impact:** Tests cannot scan a table and then validate with the known mock OTP — they must either skip the scan step or extract the new OTP from the scan response (which doesn't include it for security).
- **Workaround:** Tests validate OTP directly without scanning first.

---

## BUG-8: Order State Machine Missing — Terminal States Not Enforced

**Severity: MEDIUM**
**Ease of Fix: DONE (2026-04-16)**

- **File:** `functions/orders/updateOrderStatus.js`
- **Issue:** No state transition validation — any status could be written regardless of current state. CANCELLED→COMPLETED and COMPLETED→IN_PROGRESS were allowed.
- **Fix:** Added `ALLOWED_TRANSITIONS` guard after reading the order. COMPLETED and CANCELLED are now terminal states.
- **Tests affected:** order-lifecycle (tests 13, 17 — now pass)

---

## Summary

| Bug | Severity | Ease of Fix | Status |
|-----|----------|-------------|--------|
| BUG-1: Transaction ordering | **CRITICAL** | MEDIUM | **FIXED (2026-04-16)** — hoisted all reads before writes in `createOrUpdateOrder.js` |
| BUG-2: Admin namespace | MEDIUM | EASY | Open — admin untestable in emulator |
| BUG-3: Server param validation | MEDIUM | EASY | **FIXED (2026-04-16)** — added `data.data \|\| data` unwrapping in `tables_fetch.js` and `table_otp.js` |
| BUG-4: clearCart no ResponseBuilder | LOW | EASY | Open — cosmetic |
| BUG-5: Silent addon ignore | LOW | EASY | Open — validation gap |
| BUG-6: Frozen singleton | LOW | DONE | Workaround applied |
| BUG-7: OTP regeneration | LOW | N/A | By design |
| BUG-8: Order state machine | MEDIUM | EASY | **FIXED (2026-04-16)** — added transition allowlist in `updateOrderStatus.js` |

### Remaining priority:
1. **BUG-2** (MEDIUM) — unblocks admin endpoint local testing
2. **BUG-4** (LOW) — quick 1-line fix for consistency
3. **BUG-5** (LOW) — add validation for addon IDs
