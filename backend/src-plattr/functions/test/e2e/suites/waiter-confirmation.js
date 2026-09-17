/**
 * Suite: waiter-confirmation
 *
 * The gate a restaurant switches on when it wants QR ordering but not unattended
 * QR ordering: a guest-placed cart lands in AWAITING_CONFIRMATION and stays off the
 * kitchen queue until a waiter confirms it at the table.
 *
 * What this suite pins that the unit tests cannot: the two read paths disagree on
 * purpose. The kitchen endpoint must NOT return an unconfirmed cart; the waiter
 * endpoint must. Get that backwards and the feature either does nothing or hides the
 * order from the one person who can release it.
 *
 * Uses the dedicated table_clean_9 (same convention as coverage.js / table_clean_8)
 * and restores the setting to OFF on the way out — every other suite assumes the
 * old straight-to-kitchen behaviour.
 */
import { call } from '../lib/api.js';
import { assertSuccess } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import { setWaiterConfirmation } from '../lib/data.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, ITEMS, TABLE_OTP, CUSTOMER_PHONE, CUSTOMER_NAME } = config;
const TABLE = 'table_clean_9';   // dedicated to this suite
const KITCHEN_EMAIL = 'kitchen1@e2e.com';

/** carts[] the kitchen endpoint returns for one order (empty when it withholds them all). */
function kitchenCartsFor(resp, orderId) {
  const order = (resp.data?.orders || []).find(o => o.orderId === orderId);
  return order ? (order.carts || []) : [];
}

/** carts[] the waiter endpoint returns for one order. */
function waiterCartsFor(resp, orderId) {
  const order = (resp.data?.orders || []).find(o => o.orderId === orderId);
  return order ? (order.carts || []) : [];
}

export default async function waiterConfirmationSuite() {
  const results = { name: 'waiter-confirmation', pass: 0, fail: 0, tests: [] };
  function record(a) { results.tests.push(a); a.pass ? results.pass++ : results.fail++; }

  let customerSession;
  let waiterSession;
  let kitchenSession;

  try {
    await setWaiterConfirmation(RESTAURANT_ID, true);

    // ── Staff sessions ────────────────────────────────────────────
    try {
      waiterSession = await serverLogin();
      kitchenSession = await serverLogin(RESTAURANT_ID, KITCHEN_EMAIL, config.SERVER_PASSWORD);
    } catch (e) {
      record({ pass: false, message: `ABORT: staff login failed → ${e.message}` });
      return results;
    }

    // ── Guest places an order ─────────────────────────────────────
    try {
      customerSession = await customerLogin(RESTAURANT_ID, TABLE, TABLE_OTP, CUSTOMER_PHONE, CUSTOMER_NAME);
    } catch (e) {
      record({ pass: false, message: `ABORT: customer login on ${TABLE} failed → ${e.message}` });
      return results;
    }

    {
      const resp = await call('cart-addItemToCart', {
        restaurantId: RESTAURANT_ID, tableId: TABLE,
        menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId: customerSession,
      });
      record(assertSuccess(resp, '1. Guest adds an item'));
    }

    let orderId;
    {
      const resp = await call('cart-checkoutCart', {
        restaurantId: RESTAURANT_ID, tableId: TABLE, sessionId: customerSession,
      });
      const ok = resp.status === 'success';
      orderId = resp.data?.orderId;
      record({ pass: ok && !!orderId, message: `2. Guest checks out → ${ok ? `order ${orderId}` : 'failed'}`, actual: ok ? undefined : resp });
    }

    if (!orderId) {
      record({ pass: false, message: 'ABORT: no orderId' });
      return results;
    }

    // ── 3. The cart is born behind the gate ───────────────────────
    let cartIndex = 0;
    {
      const resp = await call('order-getActiveOrdersForRestaurant', {
        restaurantId: RESTAURANT_ID, sessionId: waiterSession,
      });
      const carts = waiterCartsFor(resp, orderId);
      const cart = carts[0];
      const ok = cart?.status === 'AWAITING_CONFIRMATION';
      if (cart && typeof cart.cartIndex === 'number') cartIndex = cart.cartIndex;
      record({ pass: ok, message: `3. Cart status after checkout → ${ok ? 'AWAITING_CONFIRMATION' : `got ${cart?.status}`}`, actual: ok ? undefined : resp });
    }

    // ── 4. The kitchen cannot see it. This is the feature. ────────
    {
      const resp = await call('order-getActiveCartsForKitchen', {
        restaurantId: RESTAURANT_ID, sessionId: kitchenSession,
      });
      const carts = kitchenCartsFor(resp, orderId);
      const ok = resp.status === 'success' && carts.length === 0;
      record({ pass: ok, message: `4. Kitchen view withholds the unconfirmed cart → ${ok ? 'withheld' : `saw ${carts.length} cart(s)`}`, actual: ok ? undefined : resp });
    }

    // ── 5. The waiter CAN see it — otherwise nobody can release it ─
    {
      const resp = await call('order-getActiveOrdersForRestaurant', {
        restaurantId: RESTAURANT_ID, sessionId: waiterSession,
      });
      const carts = waiterCartsFor(resp, orderId);
      const ok = carts.length === 1;
      record({ pass: ok, message: `5. Waiter view shows the unconfirmed cart → ${ok ? 'visible' : `saw ${carts.length} cart(s)`}`, actual: ok ? undefined : resp });
    }

    // ── 6. Nobody can skip the gate into the kitchen's states ─────
    {
      const resp = await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId, cartIndex,
        newStatus: 'PREPARING', sessionId: kitchenSession,
      });
      const rejected = resp.status === 'error' || resp._httpStatus >= 400;
      record({ pass: rejected, message: `6. PREPARING before confirm → ${rejected ? 'rejected' : 'ALLOWED (gate is leaking)'}`, actual: rejected ? undefined : resp });
    }

    // ── 7. The waiter confirms ────────────────────────────────────
    {
      const resp = await call('cart-updateCartStatus', {
        restaurantId: RESTAURANT_ID, orderId, cartIndex,
        newStatus: 'PENDING', sessionId: waiterSession,
      });
      const ok = resp.success === true || resp.status === 'success';
      record({ pass: ok, message: `7. Waiter confirms → ${ok ? 'PENDING' : 'failed'}`, actual: ok ? undefined : resp });
    }

    // ── 8. Now — and only now — the kitchen has it ────────────────
    {
      const resp = await call('order-getActiveCartsForKitchen', {
        restaurantId: RESTAURANT_ID, sessionId: kitchenSession,
      });
      const carts = kitchenCartsFor(resp, orderId);
      const ok = carts.length === 1 && carts[0].status === 'PENDING';
      record({ pass: ok, message: `8. Kitchen sees the confirmed cart → ${ok ? 'PENDING' : `saw ${carts.length} cart(s), status ${carts[0]?.status}`}`, actual: ok ? undefined : resp });
    }

    // ── 9. The items came with it ─────────────────────────────────
    {
      const resp = await call('order-getActiveCartsForKitchen', {
        restaurantId: RESTAURANT_ID, sessionId: kitchenSession,
      });
      const items = kitchenCartsFor(resp, orderId)[0]?.items || [];
      const ok = items.length > 0 && items.every(i => i.status === 'PENDING');
      record({ pass: ok, message: `9. Confirmed cart's items are PENDING → ${ok ? 'yes' : `got ${items.map(i => i.status).join(',') || 'no items'}`}`, actual: ok ? undefined : resp });
    }

    // ── 10. Gate OFF → the old behaviour, unchanged ───────────────
    await setWaiterConfirmation(RESTAURANT_ID, false);
    {
      const addResp = await call('cart-addItemToCart', {
        restaurantId: RESTAURANT_ID, tableId: TABLE,
        menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId: customerSession,
      });
      const coResp = addResp.status === 'success'
        ? await call('cart-checkoutCart', { restaurantId: RESTAURANT_ID, tableId: TABLE, sessionId: customerSession })
        : addResp;

      const kResp = await call('order-getActiveCartsForKitchen', {
        restaurantId: RESTAURANT_ID, sessionId: kitchenSession,
      });
      // Same sitting, so the second round appends a cart to the same order.
      const carts = kitchenCartsFor(kResp, coResp.data?.orderId || orderId);
      const fresh = carts.filter(c => c.status === 'PENDING');
      const ok = coResp.status === 'success' && fresh.length >= 2;
      record({ pass: ok, message: `10. Gate OFF → second round reaches the kitchen straight away (${fresh.length} PENDING carts)`, actual: ok ? undefined : { coResp, carts } });
    }
  } finally {
    // Never leave the gate on: every other suite assumes checkout → kitchen.
    await setWaiterConfirmation(RESTAURANT_ID, false).catch(() => {});
  }

  return results;
}
