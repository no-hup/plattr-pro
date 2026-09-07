/**
 * Suite: order-lifecycle
 *
 * Tests the full order state machine:
 *   checkout → kitchen PREPARING → READY → server SERVED → COMPLETED
 * Also tests invalid transitions and multi-cart model.
 *
 * NOTE: If checkout fails due to the known Firestore transaction bug in
 * createOrUpdateOrder.js, this suite will skip gracefully.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError, assertField, assertFieldExists } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import { narrator } from '../lib/narrator.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_1, TABLE_CLEAN_6, TABLE_OTP, ITEMS, VARIANTS } = config;

// COMPLETED vacates the table and ends its session, so the next party has to
// scan (which mints a fresh OTP) and join again.
async function rejoin(tableId, phone, name) {
  await call('table-validateTableAndLocation', {
    restaurantId: RESTAURANT_ID, tableId,
    userLocation: { latitude: 12.9716, longitude: 77.5946 },
  });
  return customerLogin(RESTAURANT_ID, tableId, TABLE_OTP, phone, name);
}

export default async function orderLifecycleSuite() {
  const results = { name: 'order-lifecycle', pass: 0, fail: 0, tests: [] };

  function record(assertion) {
    results.tests.push(assertion);
    assertion.pass ? results.pass++ : results.fail++;
  }

  // ── Setup: create a session and add items ───────────────────────
  let sessionId, serverSessionId;
  try {
    sessionId = await customerLogin(RESTAURANT_ID, TABLE_CLEAN_1, TABLE_OTP, '5551120001', 'Order Tester');
  } catch (e) {
    record({ pass: false, message: `Setup: customerLogin failed: ${e.message}` });
    return results;
  }

  // Add a couple items to cart
  await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID,
    tableId: TABLE_CLEAN_1,
    menuItemId: ITEMS.TIRAMISU.id,
    quantity: 1,
    sessionId,
  });
  await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID,
    tableId: TABLE_CLEAN_1,
    menuItemId: ITEMS.WHISKEY.id,
    quantity: 1,
    sessionId,
  });

  // ── 1. Checkout → create order ─────────────────────────────────
  let orderId;
  {
    const resp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      sessionId,
    });
    const ok = resp.status === 'success';
    record({
      pass: ok,
      message: ok
        ? '1. Checkout → order created'
        : '1. Checkout → KNOWN BUG: Firestore transaction ordering in createOrUpdateOrder.js',
      actual: ok ? undefined : resp,
    });
    if (ok) {
      orderId = resp.data?.orderId;
    }
  }

  if (!orderId) {
    record({ pass: false, message: 'SKIP: remaining tests blocked by checkout bug' });
    return results;
  }

  // ── 2. Get order → verify initial state ────────────────────────
  {
    const resp = await call('order-getOrder', {
      restaurantId: RESTAURANT_ID,
      orderId,
    });
    record(assertSuccess(resp, '2. Get order'));
    if (resp.status === 'success') {
      const carts = resp.data?.carts || [];
      record({
        pass: carts.length >= 1,
        message: `2a. Order has ${carts.length} cart(s)`,
      });
      if (carts.length > 0) {
        const cartStatus = carts[0].status || carts[0].cartStatus;
        record({
          pass: cartStatus === 'PENDING',
          message: `2b. Cart status: ${cartStatus} (expected PENDING)`,
        });
      }
    }
  }

  // ── 3. Server login ────────────────────────────────────────────
  try {
    serverSessionId = await serverLogin();
  } catch (e) {
    record({ pass: false, message: `3. Server login failed: ${e.message}` });
    return results;
  }
  record({ pass: true, message: '3. Server logged in' });

  // ── 4. Kitchen marks PREPARING ─────────────────────────────────
  {
    const resp = await call('cart-updateCartStatus', {
      restaurantId: RESTAURANT_ID,
      orderId,
      cartIndex: 0,
      newStatus: 'PREPARING',
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '4. Kitchen marks PREPARING'));
  }

  // ── 5. Kitchen marks READY ─────────────────────────────────────
  {
    const resp = await call('cart-updateCartStatus', {
      restaurantId: RESTAURANT_ID,
      orderId,
      cartIndex: 0,
      newStatus: 'READY',
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '5. Kitchen marks READY'));
  }

  // ── 6. Server sees READY items ─────────────────────────────────
  {
    const resp = await call('order-getActiveOrdersForRestaurant', {
      restaurantId: RESTAURANT_ID,
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '6. Server gets active orders'));
  }

  // ── 7. Server marks cart SERVED ────────────────────────────────
  {
    const resp = await call('order-markCartAsServed', {
      restaurantId: RESTAURANT_ID,
      orderId,
      cartIndex: 0,
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '7. Server marks cart SERVED'));
  }

  // ── 8. Served carts visible in history ─────────────────────────
  {
    const resp = await call('order-getServedCartsForServer', {
      restaurantId: RESTAURANT_ID,
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '8. Get served carts for server'));
  }

  // ── 9. Mark order COMPLETED ────────────────────────────────────
  {
    const resp = await call('order-updateOrderStatus', {
      restaurantId: RESTAURANT_ID,
      orderId,
      orderStatus: 'COMPLETED',
      sessionId: serverSessionId,
    });
    record(assertSuccess(resp, '9. Mark order COMPLETED'));
  }

  // ── 9b. COMPLETED vacates the table and ends the session ───────
  // The paid party is done: the old session must not be able to order again,
  // but it may still read its own bill. A new party scans and gets a new OTP.
  {
    const addResp = await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId,
    });
    const rejected = addResp.status === 'error' || addResp._httpStatus >= 400;
    record({ pass: rejected, message: `9b. Old session cannot add to cart after COMPLETED → ${rejected ? 'rejected' : 'unexpectedly allowed'}`, actual: rejected ? undefined : addResp });

    const billResp = await call('order-getOrder', { restaurantId: RESTAURANT_ID, orderId, sessionId });
    record(assertSuccess(billResp, '9b. Old session can still read its own COMPLETED bill'));

    try {
      sessionId = await rejoin(TABLE_CLEAN_1, '5551120002', 'Next Party');
      record({ pass: true, message: '9b. Table vacated: next party scans and gets a fresh session' });
    } catch (e) {
      record({ pass: false, message: `9b. Next party could not join after COMPLETED: ${e.message}` });
    }
  }

  // ── 10. Invalid transition: PENDING → SERVED (should fail) ────
  // We need a new order for this test. Add item and checkout again.
  {
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id,
      quantity: 1,
      sessionId,
    });
    const coResp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_1,
      sessionId,
    });
    if (coResp.status === 'success') {
      const newOrderId = coResp.data?.orderId;
      const resp = await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID,
        orderId: newOrderId,
        cartIndex: 0,
        newStatus: 'SERVED', // PENDING → SERVED is invalid
        sessionId: serverSessionId,
      });
      const isError = resp.status === 'error' || resp._httpStatus >= 400;
      record({
        pass: isError,
        message: `10. Invalid transition PENDING → SERVED → ${isError ? 'rejected' : 'unexpectedly allowed'}`,
        actual: isError ? undefined : resp,
      });
    } else {
      record({ pass: false, message: '10. SKIP: second checkout also failed (transaction bug)' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CANCELLED FLOW — uses a separate table to avoid state conflicts
  // ══════════════════════════════════════════════════════════════

  let cancelSessionId, cancelOrderId;

  // ── 11. Setup cancel flow: new session on TABLE_CLEAN_6 ───────
  try {
    cancelSessionId = await customerLogin(RESTAURANT_ID, TABLE_CLEAN_6, TABLE_OTP, '5551120006', 'Cancel Tester');
    record({ pass: true, message: '11. Cancel flow: session created on TABLE_CLEAN_6' });
    narrator.setup('Cancel flow session on TABLE_CLEAN_6');
  } catch (e) {
    record({ pass: false, message: `11. Cancel flow setup failed: ${e.message}` });
    narrator.skip('Cancel flow', 'Setup failed');
  }

  if (cancelSessionId) {
    // Add items and checkout
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_6,
      menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId: cancelSessionId,
    });
    const coResp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_6, sessionId: cancelSessionId,
    });

    if (coResp.status === 'success') {
      cancelOrderId = coResp.data?.orderId;

      // ── 12. Cancel order: PENDING → CANCELLED ───────────────────
      {
        // Cancellation is a staff action (updateOrderStatus is staff-gated)
        const resp = await call('order-updateOrderStatus', {
          restaurantId: RESTAURANT_ID, orderId: cancelOrderId,
          orderStatus: 'CANCELLED', sessionId: serverSessionId,
        });
        record(assertSuccess(resp, '12. Cancel order'));
        narrator.orderStatus(cancelOrderId, 'PENDING', 'CANCELLED');
      }

      // ── 13. No transition after CANCELLED → error ───────────────
      {
        const resp = await call('order-updateOrderStatus', {
          restaurantId: RESTAURANT_ID, orderId: cancelOrderId,
          orderStatus: 'COMPLETED', sessionId: cancelSessionId,
        });
        const isError = resp.status === 'error' || resp._httpStatus >= 400;
        record({
          pass: isError,
          message: `13. CANCELLED → COMPLETED → ${isError ? 'rejected (terminal state)' : 'unexpectedly allowed'}`,
          actual: isError ? undefined : resp,
        });
        narrator.errorCase('CANCELLED → COMPLETED', 'terminal state');
      }
    } else {
      record({ pass: false, message: '12. SKIP: checkout failed (BUG-1)' });
      record({ pass: false, message: '13. SKIP: cancel flow blocked' });
      narrator.skip('Cancel flow', 'BUG-1');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Additional state machine tests (using orderId from earlier flow)
  // ══════════════════════════════════════════════════════════════

  // ── 14. Invalid: PREPARING → PENDING (backward) ───────────────
  // Create new order for this test
  if (sessionId) {
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId,
    });
    const coResp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1, sessionId,
    });
    if (coResp.status === 'success') {
      const testOrderId = coResp.data?.orderId;
      // Move to PREPARING first
      await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId: testOrderId,
        cartIndex: 0, newStatus: 'PREPARING', sessionId: serverSessionId,
      });
      narrator.cartStatus(0, 'PENDING', 'PREPARING');

      // Try backward: PREPARING → PENDING
      const resp = await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId: testOrderId,
        cartIndex: 0, newStatus: 'PENDING', sessionId: serverSessionId,
      });
      const isError = resp.status === 'error' || resp._httpStatus >= 400;
      record({
        pass: isError,
        message: `14. PREPARING → PENDING → ${isError ? 'rejected' : 'unexpectedly allowed'}`,
        actual: isError ? undefined : resp,
      });

      // ── 15. Continue: PREPARING → READY → SERVED → verify ─────
      await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId: testOrderId,
        cartIndex: 0, newStatus: 'READY', sessionId: serverSessionId,
      });
      narrator.cartStatus(0, 'PREPARING', 'READY');

      // Invalid: READY → PREPARING (backward)
      {
        const resp2 = await call('cart-updateCartStatus', {
          restaurantId: RESTAURANT_ID, orderId: testOrderId,
          cartIndex: 0, newStatus: 'PREPARING', sessionId: serverSessionId,
        });
        const isErr = resp2.status === 'error' || resp2._httpStatus >= 400;
        record({
          pass: isErr,
          message: `15. READY → PREPARING → ${isErr ? 'rejected' : 'unexpectedly allowed'}`,
          actual: isErr ? undefined : resp2,
        });
      }

      // ── 16. SERVED → READY (backward) ─────────────────────────
      await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId: testOrderId,
        cartIndex: 0, newStatus: 'SERVED', sessionId: serverSessionId,
      });
      narrator.cartStatus(0, 'READY', 'SERVED');
      {
        const resp3 = await call('cart-updateCartStatus', {
          restaurantId: RESTAURANT_ID, orderId: testOrderId,
          cartIndex: 0, newStatus: 'READY', sessionId: serverSessionId,
        });
        const isErr = resp3.status === 'error' || resp3._httpStatus >= 400;
        record({
          pass: isErr,
          message: `16. SERVED → READY → ${isErr ? 'rejected' : 'unexpectedly allowed'}`,
          actual: isErr ? undefined : resp3,
        });
      }

      // ── 17. Complete then try reopen ──────────────────────────
      await call('order-updateOrderStatus', {
        restaurantId: RESTAURANT_ID, orderId: testOrderId,
        orderStatus: 'COMPLETED', sessionId: serverSessionId,
      });
      narrator.orderStatus(testOrderId, 'IN_PROGRESS', 'COMPLETED');
      {
        const resp4 = await call('order-updateOrderStatus', {
          restaurantId: RESTAURANT_ID, orderId: testOrderId,
          orderStatus: 'IN_PROGRESS', sessionId: serverSessionId,
        });
        const isErr = resp4.status === 'error' || resp4._httpStatus >= 400;
        record({
          pass: isErr,
          message: `17. COMPLETED → IN_PROGRESS → ${isErr ? 'rejected' : 'unexpectedly allowed'}`,
          actual: isErr ? undefined : resp4,
        });
      }
    } else {
      record({ pass: false, message: '14. SKIP: checkout failed (BUG-1)' });
      record({ pass: false, message: '15. SKIP: blocked' });
      record({ pass: false, message: '16. SKIP: blocked' });
      record({ pass: false, message: '17. SKIP: blocked' });
      narrator.skip('State machine tests', 'BUG-1');
    }
  }

  // ── 18. Multi-cart independence ────────────────────────────────
  // Already covered in the main flow above (test 10 creates a second order)
  // Verify by checking that completing one cart doesn't affect another.
  // Step 17 COMPLETED the table's order, so join as a new party first.
  try {
    sessionId = await rejoin(TABLE_CLEAN_1, '5551120003', 'Multi Cart Party');
  } catch (e) {
    sessionId = null;
    record({ pass: false, message: `18. Could not rejoin table after COMPLETED: ${e.message}` });
  }
  if (sessionId) {
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId,
    });
    await call('cart-addItemToCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
      menuItemId: ITEMS.WHISKEY.id, quantity: 1, sessionId,
    });
    const coResp = await call('cart-checkoutCart', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1, sessionId,
    });
    if (coResp.status === 'success') {
      const mcOrderId = coResp.data?.orderId;
      // Checkout again to create second cart
      await call('cart-addItemToCart', {
        restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1,
        menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId,
      });
      const co2 = await call('cart-checkoutCart', {
        restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_1, sessionId,
      });
      if (co2.status === 'success') {
        // Advance cart 0 to SERVED
        await call('cart-updateCartStatus', {
          restaurantId: RESTAURANT_ID, orderId: mcOrderId,
          cartIndex: 0, newStatus: 'PREPARING', sessionId: serverSessionId,
        });
        await call('cart-updateCartStatus', {
          restaurantId: RESTAURANT_ID, orderId: mcOrderId,
          cartIndex: 0, newStatus: 'READY', sessionId: serverSessionId,
        });
        await call('cart-updateCartStatus', {
          restaurantId: RESTAURANT_ID, orderId: mcOrderId,
          cartIndex: 0, newStatus: 'SERVED', sessionId: serverSessionId,
        });
        // Verify cart 1 is still PENDING
        const orderResp = await call('order-getOrder', {
          restaurantId: RESTAURANT_ID, orderId: mcOrderId,
        });
        if (orderResp.status === 'success') {
          const carts = orderResp.data?.carts || [];
          const cart1Status = carts.length > 1 ? (carts[1].status || carts[1].cartStatus) : null;
          record({
            pass: cart1Status === 'PENDING',
            message: `18. Multi-cart: cart 0 SERVED, cart 1 still ${cart1Status || 'unknown'} (expected PENDING)`,
            actual: cart1Status === 'PENDING' ? undefined : orderResp,
          });
          narrator.info(`Multi-cart: cart 0=SERVED, cart 1=${cart1Status}`);
        } else {
          record({ pass: false, message: '18. Multi-cart: could not get order', actual: orderResp });
        }
      } else {
        record({ pass: false, message: '18. SKIP: second checkout failed (BUG-1)' });
      }
    } else {
      record({ pass: false, message: '18. SKIP: first checkout failed (BUG-1)' });
      narrator.skip('Multi-cart test', 'BUG-1');
    }
  }

  return results;
}
