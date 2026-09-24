/**
 * Suite: cart
 *
 * Cart CRUD operations: add (simple, customized, out-of-stock, invalid),
 * remove, get, clear, checkout edge cases.
 * Uses TABLE_CLEAN_2.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError, assertField, assertFieldExists, assertArrayLength } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import { fsFor } from '../lib/rest.mjs';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_2, ITEMS, VARIANTS, ADDONS } = config;

export default async function cartSuite() {
  const results = { name: 'cart', pass: 0, fail: 0, tests: [] };

  function record(assertion) {
    results.tests.push(assertion);
    assertion.pass ? results.pass++ : results.fail++;
  }

  // Setup: get a session
  let sessionId;
  try {
    sessionId = await customerLogin(RESTAURANT_ID, TABLE_CLEAN_2, config.TABLE_OTP, config.CUSTOMER_PHONE_2, config.CUSTOMER_NAME_2);
  } catch (e) {
    record({ pass: false, message: `Setup: customerLogin failed: ${e.message}` });
    return results;
  }

  const cartParams = { restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_2 };

  // ── 1. Add simple item (tiramisu, no variants/addons) ──────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    record(assertSuccess(resp, '1. Add tiramisu (simple item)'));
  }

  // ── 2. Add same item again → quantity should merge ─────────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    record(assertSuccess(resp, '2. Add tiramisu again (qty merge)'));
    // Verify cart has 1 item with qty=2
    if (resp.status === 'success') {
      const items = resp.data?.cart?.items || resp.data?.items || [];
      const tiramisu = items.find(i => i.menuItemId === ITEMS.TIRAMISU.id);
      record({
        pass: tiramisu?.quantity === 2,
        message: `2a. Tiramisu quantity → 2: ${tiramisu?.quantity === 2 ? 'yes' : `got ${tiramisu?.quantity}`}`,
        actual: tiramisu?.quantity === 2 ? undefined : resp,
      });
    }
  }

  // ── 3. Add item with mandatory variant ─────────────────────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    });
    record(assertSuccess(resp, '3. Add burger with Regular variant'));
  }

  // ── 4. Add item with variant + addon ───────────────────────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
      selectedAddons: [ADDONS.CHEESE.id],
    });
    record(assertSuccess(resp, '4. Add burger Large + cheese'));
  }

  // ── 5. Add item WITHOUT mandatory variant → error ─────────────
  // Burger has a mandatory size variant. After removing the fallback flag,
  // missing a mandatory variant must always fail (no auto-fill from prior adds).
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      // No selectedVariants — mandatory size variant missing
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `5. Add burger without mandatory variant → ${isError ? 'rejected as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── 6. Add out-of-stock item → error ───────────────────────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BEER.id,
      quantity: 1,
      sessionId,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `6. Add out-of-stock beer → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── 7. Add item with invalid variant ID → error ────────────────
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { 'fake_variant_id': 'fake_option' },
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `7. Add with fake variant ID → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── 8. Add item with invalid addon ID ───────────────────────
  // TD-015: an unknown add-on id is refused. It used to be silently dropped, so the guest was
  // shown their burger "with cheese" and served one without.
  {
    const resp = await call('cart-addItemToCart', {
      ...cartParams,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
      selectedAddons: ['fake_addon_id'],
    });
    record(assertError(resp, null, '8. Add with fake addon ID is refused (TD-015)'));
  }

  // ── 9. Get cart ────────────────────────────────────────────────
  {
    const resp = await call('cart-getCart', cartParams);
    record(assertSuccess(resp, '9. Get cart'));
  }

  // ── 10. Remove item (decrement quantity) ───────────────────────
  {
    const resp = await call('cart-removeItemFromCart', {
      ...cartParams,
      menuItemId: ITEMS.TIRAMISU.id,
      sessionId,   // TD-033: only the table's own session touches its cart
    });
    record(assertSuccess(resp, '10. Remove tiramisu (decrement qty 2→1)'));
  }

  // ── 11. Clear cart ─────────────────────────────────────────────
  // clearCart returns { message: "..." } without status field (doesn't use ResponseBuilder)
  {
    const resp = await call('cart-clearCart', { ...cartParams, sessionId });
    const ok = resp.status === 'success' || resp._httpStatus === 200 || resp.message?.includes('cleared');
    record({
      pass: ok,
      message: `11. Clear cart → ${ok ? 'success' : 'failed'}`,
      actual: ok ? undefined : resp,
    });
  }

  // ── 12. Get empty cart → error ─────────────────────────────────
  {
    const resp = await call('cart-getCart', cartParams);
    // After clearing, cart should not exist
    const isEmpty = resp.status === 'error' || resp._httpStatus >= 400 ||
      (resp.data?.items || []).length === 0;
    record({
      pass: isEmpty,
      message: `12. Get cleared cart → ${isEmpty ? 'empty/not-found as expected' : 'unexpected items found'}`,
      actual: isEmpty ? undefined : resp,
    });
  }

  // ── 13. Checkout empty cart → error ────────────────────────────
  {
    const resp = await call('cart-checkoutCart', {
      ...cartParams,
      sessionId,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `13. Checkout empty cart → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── 14. Missing restaurantId → error ───────────────────────────
  {
    const resp = await call('cart-addItemToCart', {
      tableId: TABLE_CLEAN_2,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `14. Missing restaurantId → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── 15. Missing tableId → error ────────────────────────────────
  {
    const resp = await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({
      pass: isError,
      message: `15. Missing tableId → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`,
      actual: isError ? undefined : resp,
    });
  }

  // ── TD-033: a cart belongs to the sitting that filled it ─────────────────
  // Party A puts a Tiramisu (₹200) on table_cart_td033 and never sends it. The captain marks the table
  // Vacant (allowed: an unsent cart is not money). Party B sits and orders a Tiramisu. B's order must be
  // ONE Tiramisu, not two — and no phone but B's may write into that cart.
  {
    const T = 'table_cart_td033';
    const { getDoc, setDoc, patchDoc } = fsFor(RESTAURANT_ID);
    const arm = () => patchDoc(`tables/${T}`, { status: 'vacant', currentOTP: { code: config.TABLE_OTP, createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    const tpl = await getDoc(`tables/${TABLE_CLEAN_2}`);
    await setDoc(`tables/${T}`, { ...tpl, tableId: T, number: 'TD33', status: 'vacant', mergedInto: null, occupiedBy: [], primaryCustomer: null });
    await fetch(`http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents/restaurants/${RESTAURANT_ID}/carts/${T}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
    await arm();
    const t = { restaurantId: RESTAURANT_ID, tableId: T };
    const add = sid => call('cart-addItemToCart', { ...t, menuItemId: ITEMS.TIRAMISU.id, quantity: 1, ...(sid ? { sessionId: sid } : {}) });

    const a = await customerLogin(RESTAURANT_ID, T, config.TABLE_OTP, config.CUSTOMER_PHONE, config.CUSTOMER_NAME);
    record(assertSuccess(await add(a), 'TD-033 party A adds a Tiramisu and does not send it'));
    record(assertError(await add(null), null, 'TD-033 a write naming no session is refused'));
    record(assertError(await add(sessionId), null, 'TD-033 a live session of ANOTHER table cannot write this table\'s cart'));

    const staff = await serverLogin();
    record(assertSuccess(await call('table-updateTableStatus', { ...t, status: 'vacant', sessionId: staff }), 'TD-033 captain marks the table Vacant (unsent cart, no money)'));
    await arm();
    const b = await customerLogin(RESTAURANT_ID, T, config.TABLE_OTP, config.CUSTOMER_PHONE_2, config.CUSTOMER_NAME_2);
    const seen = await call('cart-getCart', { ...t, sessionId: b });
    const seenItems = seen?.data?.cart?.items ?? seen?.data?.items ?? [];
    record({ pass: seenItems.length === 0, message: `TD-033 party B opens the menu to an empty cart, not A's Tiramisu → ${seenItems.length} item(s)`, actual: seenItems.length ? seen : undefined });
    record(assertError(await add(a), null, 'TD-033 party A\'s old phone can no longer write here'));
    record(assertSuccess(await add(b), 'TD-033 party B adds one Tiramisu'));
    const co = await call('cart-checkoutCart', { ...t, sessionId: b });
    const order = (await getDoc(`orders/${co?.data?.orderId}`)) || {};
    const qty = (order.carts ?? []).flatMap(c => c.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0);
    record({ pass: (co?.status === 'success' || co?.success === true) && qty === 1, message: `TD-033 B's order carries exactly 1 Tiramisu, not A's too → ${qty}`, actual: qty === 1 ? undefined : co });
  }

  return results;
}
