/**
 * Suite: customer-journey
 *
 * Full customer flow: scan table → OTP → menu → add items → checkout → verify order.
 * Also verifies cross-app visibility (server/kitchen can see the order).
 * Uses TABLE_CLEAN_1.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError, assertField, assertFieldExists, assertPrice, assertArrayLength } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import { narrator } from '../lib/narrator.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, RESTAURANT_SIMPLE, TABLE_CLEAN_1, TABLE_CLEAN_7, TABLE_OTP, CUSTOMER_PHONE, CUSTOMER_NAME, ITEMS, ITEMS_SIMPLE, VARIANTS } = config;

export default async function customerJourneySuite() {
  const results = { name: 'customer-journey', pass: 0, fail: 0, tests: [] };

  function record(assertion) {
    results.tests.push(assertion);
    assertion.pass ? results.pass++ : results.fail++;
  }

  // ── 1. Validate OTP as primary customer (direct, without prior scan) ─
  // NOTE: We validate OTP first because calling validateTableAndLocation
  // regenerates the OTP (overwriting the mock "1234"). We test scan
  // separately in the table suite.
  let sessionId;
  {
    const resp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      otp: TABLE_OTP,
      phoneNumber: CUSTOMER_PHONE,
      name: CUSTOMER_NAME,
    });
    const a = assertSuccess(resp, '1. OTP validation');
    record(a);
    if (a.pass) {
      sessionId = resp.data?.sessionId;
      record(assertFieldExists(resp, 'data.sessionId', '1a. sessionId returned'));
      record(assertField(resp, 'data.isPrimaryCustomer', true, '1b. isPrimaryCustomer'));
    }
  }

  if (!sessionId) {
    record({ pass: false, message: 'ABORT: no sessionId, cannot continue' });
    return results;
  }

  // ── 3. Fetch menu ──────────────────────────────────────────────
  {
    const resp = await call('menu-getRestaurantMenu', { restaurantId: RESTAURANT_ID });
    record(assertSuccess(resp, '3. Fetch menu'));
    if (resp.status === 'success') {
      record(assertFieldExists(resp, 'data', '3a. menu data exists'));
    }
  }

  // ── 4. Add simple item (tiramisu, no variants) ─────────────────
  {
    const resp = await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    record(assertSuccess(resp, '4. Add tiramisu to cart'));
  }

  // ── 5. Add customized item (burger Large + cheese) ─────────────
  {
    const resp = await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.BURGER.id,
      quantity: 1,
      sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
      selectedAddons: [config.ADDONS.CHEESE.id],
    });
    record(assertSuccess(resp, '5. Add burger Large + cheese'));
  }

  // ── 6. Get cart ────────────────────────────────────────────────
  {
    const resp = await call('cart-getCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
    });
    record(assertSuccess(resp, '6. Get cart'));
    if (resp.status === 'success') {
      // getCart returns { data: { cart: { items: [...] } } }
      const items = resp.data?.cart?.items || resp.data?.items || [];
      record({
        pass: items.length === 2,
        message: `6a. Cart has 2 items: ${items.length === 2 ? 'yes' : `got ${items.length}`}`,
        actual: items.length === 2 ? undefined : resp,
      });
    }
  }

  // ── 7. Checkout ────────────────────────────────────────────────
  // KNOWN BUG: createOrUpdateOrder has a Firestore transaction ordering issue
  // (reads after writes). This may fail with "Firestore transactions require
  // all reads to be executed before all writes." The test is correct — this
  // surfaces a real backend bug that needs fixing in createOrUpdateOrder.js
  // (line 403 reads counterRef after line 287 writes newOrderRef).
  let orderId;
  {
    const resp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      sessionId,
    });
    const checkoutOk = resp.status === 'success';
    record({
      pass: checkoutOk,
      message: checkoutOk
        ? '7. Checkout → success'
        : '7. Checkout → KNOWN BUG: Firestore transaction ordering (reads after writes in createOrUpdateOrder)',
      actual: checkoutOk ? undefined : resp,
    });
    if (checkoutOk) {
      orderId = resp.data?.orderId;
      record(assertFieldExists(resp, 'data.orderId', '7a. orderId returned'));
    }
  }

  if (!orderId) {
    record({ pass: false, message: 'SKIP: remaining tests need orderId (checkout bug blocks them)' });
    return results;
  }

  // ── 8. Server sees the order ───────────────────────────────────
  {
    let serverSessionId;
    try {
      serverSessionId = await serverLogin();
    } catch (e) {
      record({ pass: false, message: `8. Server login failed: ${e.message}` });
      return results;
    }

    const resp = await call('order-getActiveOrdersForRestaurant', {
      restaurantId: RESTAURANT_ID,
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '8. Server gets active orders'));
    if (resp.status === 'success') {
      const orders = resp.data?.orders || [];
      const found = orders.some(o => o.orderId === orderId || o.id === orderId);
      record({
        pass: found,
        message: `8a. Server can see order ${orderId}`,
        actual: found ? undefined : resp,
      });
    }
  }

  // ── 9. Second checkout (multi-cart) ────────────────────────────
  {
    // Add another item
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.WHISKEY.id,
      quantity: 1,
      sessionId,
    });

    const resp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      sessionId,
    });
    record(assertSuccess(resp, '9. Second checkout (multi-cart)'));
    if (resp.status === 'success') {
      // Should return the SAME orderId (multi-cart appends to existing order)
      const secondOrderId = resp.data?.orderId;
      record({
        pass: secondOrderId === orderId,
        message: `9a. Same orderId (multi-cart): ${secondOrderId === orderId ? 'yes' : `got ${secondOrderId}, expected ${orderId}`}`,
        actual: secondOrderId === orderId ? undefined : resp,
      });
    }
  }

  // ── 10. Verify order has 2 carts ───────────────────────────────
  {
    const resp = await call('order-getOrder', {
      restaurantId: RESTAURANT_ID,
      orderId,
    });
    record(assertSuccess(resp, '10. Get order details'));
    if (resp.status === 'success') {
      const carts = resp.data?.carts || resp.data?.order?.carts || [];
      record({
        pass: carts.length === 2,
        message: `10a. Order has 2 carts: ${carts.length === 2 ? 'yes' : `got ${carts.length}`}`,
        actual: carts.length === 2 ? undefined : resp,
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Extended journey: offer flow
  // ══════════════════════════════════════════════════════════════

  // ── 11. Journey with offer: add items → apply offer → checkout ─
  if (orderId) {
    narrator.suite('customer-journey', 'Offer flow');
    await call('cart-clearCart', { restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1 });
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id, quantity: 2, sessionId,
    });
    narrator.cartAdd('Tiramisu x2', {}, 400);

    // Get and apply an offer
    const offersResp = await call('offers-getApplicableOffers', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
    });
    let appliedOffer = false;
    if (offersResp.status === 'success') {
      const offers = offersResp.data?.offers || [];
      const applicable = offers.find(o => o.isApplicable);
      if (applicable) {
        const applyResp = await call('offers-applyOffer', {
          restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
          offerId: applicable.id, sessionId,
        });
        appliedOffer = applyResp.status === 'success' || applyResp._httpStatus === 200;
        if (appliedOffer) narrator.offerApplied(applicable.title || applicable.id, 'auto', 0, 0);
      }
    }

    const coResp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1, sessionId,
    });
    if (coResp.status === 'success') {
      const newOrderId = coResp.data?.orderId;
      const orderResp = await call('order-getOrder', {
        restaurantId: RESTAURANT_ID, orderId: newOrderId,
      });
      record(assertSuccess(orderResp, '11. Journey with offer → order created'));
      if (appliedOffer && orderResp.status === 'success') {
        narrator.checkout(newOrderId, coResp.data?.orderNumber, 'PENDING');
        narrator.info('Offer applied and persisted through checkout');
      }
    } else {
      record({ pass: false, message: '11. Journey with offer → KNOWN BUG: checkout failed' });
      narrator.skip('Journey with offer', 'BUG-1');
    }
  }

  // ── 12. Journey on simple-menu restaurant ─────────────────────
  {
    narrator.suite('customer-journey', 'Simple menu restaurant');
    let simpleSessionId;
    try {
      simpleSessionId = await customerLogin(RESTAURANT_SIMPLE, TABLE_CLEAN_7, TABLE_OTP, '5551120007', 'Simple Tester');
    } catch (e) {
      record({ pass: false, message: `12. Simple restaurant setup failed: ${e.message}` });
    }

    if (simpleSessionId) {
      narrator.setup('Session on simple-menu restaurant, TABLE_CLEAN_7');

      // Fetch menu
      const menuResp = await call('menu-getRestaurantMenu', { restaurantId: RESTAURANT_SIMPLE });
      record(assertSuccess(menuResp, '12. Simple menu fetch'));

      // Add simple item (no variants/addons)
      const addResp = await call('cart-addItemToCart', {
        restaurantId: RESTAURANT_SIMPLE, tableId: TABLE_CLEAN_7,
        menuItemId: ITEMS_SIMPLE.CHICKEN.id, quantity: 1, sessionId: simpleSessionId,
      });
      record(assertSuccess(addResp, '12a. Add simple item'));
      narrator.cartAdd('Grilled Chicken', {}, ITEMS_SIMPLE.CHICKEN.finalPrice);

      // Checkout
      const coResp = await call('cart-checkoutCart', {
        restaurantId: RESTAURANT_SIMPLE, tableId: TABLE_CLEAN_7, sessionId: simpleSessionId,
      });
      if (coResp.status === 'success') {
        record({ pass: true, message: '12b. Simple restaurant checkout → success' });
        narrator.checkout(coResp.data?.orderId, coResp.data?.orderNumber, 'PENDING');
      } else {
        record({ pass: false, message: '12b. Simple restaurant checkout → BUG-1' });
        narrator.skip('Simple restaurant checkout', 'BUG-1');
      }
    }
  }

  return results;
}
