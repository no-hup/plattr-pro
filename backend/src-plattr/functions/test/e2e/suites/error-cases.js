/**
 * Suite: error-cases
 *
 * Negative tests across all API groups:
 * missing params, invalid IDs, expired sessions, out-of-stock.
 */
import { call } from '../lib/api.js';
import { assertSuccess } from '../lib/assert.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import config from '../lib/config.js';
import { narrator } from '../lib/narrator.js';

const { RESTAURANT_ID, RESTAURANT_EMPTY_MENU, TABLE_CLEAN_4, TABLE_2, ITEMS } = config;

export default async function errorCasesSuite() {
  const results = { name: 'error-cases', pass: 0, fail: 0, tests: [] };

  function record(a) { results.tests.push(a); a.pass ? results.pass++ : results.fail++; }

  function expectError(resp, label) {
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `${label} → ${isError ? 'error as expected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  /**
   * Like expectError, but the rejection must NOT have come from the auth gate.
   *
   * Since the 2026-09-07 hardening, cart and staff endpoints reject a caller
   * with no session before they ever look at the payload. A negative test that
   * sends no session therefore "passes" without exercising the thing it names —
   * a fake menuItemId test that never reaches the menu lookup. These tests now
   * carry a real session, and this assertion is what keeps them honest.
   */
  function expectErrorPastAuth(resp, label) {
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    const blob = `${resp.message || ''} ${resp.error?.status || ''} ${resp.error?.message || ''}`.toLowerCase();
    const auth = resp._httpStatus === 401 || resp._httpStatus === 403 ||
      blob.includes('unauthenticated') || blob.includes('permission-denied') ||
      blob.includes('active session') || blob.includes('session') && blob.includes('required');
    const pass = isError && !auth;
    record({
      pass,
      message: `${label} → ${!isError ? 'unexpectedly succeeded' : auth ? 'REJECTED BY AUTH GATE, not by the case under test' : 'error as expected'}`,
      actual: pass ? undefined : resp,
    });
  }

  // A real table session and a real staff session, so the negative tests below
  // are rejected for the reason they claim rather than for having no session.
  // TABLE_2 is used by no other suite, so this cannot disturb their state.
  let tableSession = null;
  let staffSession = null;
  try { tableSession = await customerLogin(RESTAURANT_ID, TABLE_2); } catch (e) { /* asserted below */ }
  try { staffSession = await serverLogin(); } catch (e) { /* asserted below */ }
  record({
    pass: !!tableSession && !!staffSession,
    message: `0. Fixture sessions for negative tests → ${tableSession ? 'table ok' : 'TABLE FAILED'}, ${staffSession ? 'staff ok' : 'STAFF FAILED'}`,
  });

  // ── Table endpoints: missing params ────────────────────────────

  // 1. validateTableAndLocation: no data
  expectError(await call('table-validateTableAndLocation', {}), '1. Table validate: empty data');

  // 2. validateTableAndLocation: no tableId
  expectError(await call('table-validateTableAndLocation', { restaurantId: RESTAURANT_ID }), '2. Table validate: no tableId');

  // 3. validateOTP: no OTP
  expectError(await call('table-validateOTP', {
    restaurantId: RESTAURANT_ID, tableId: 'table_1', phoneNumber: '123', name: 'X',
  }), '3. OTP: missing otp');

  // 4. validateOTP: non-existent restaurant
  expectError(await call('table-validateOTP', {
    restaurantId: 'fake_restaurant', tableId: 'table_1', otp: '1234', phoneNumber: '123', name: 'X',
  }), '4. OTP: fake restaurant');

  // ── Cart endpoints: missing params ─────────────────────────────

  // 5. addItemToCart: no menuItemId
  expectError(await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID, tableId: 'table_1', quantity: 1,
  }), '5. Cart add: no menuItemId');

  // 6. addItemToCart: quantity = 0
  expectError(await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID, tableId: 'table_1', menuItemId: ITEMS.TIRAMISU.id, quantity: 0,
  }), '6. Cart add: quantity=0');

  // 7. addItemToCart: negative quantity
  expectError(await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID, tableId: 'table_1', menuItemId: ITEMS.TIRAMISU.id, quantity: -1,
  }), '7. Cart add: negative quantity');

  // 8. addItemToCart: non-existent menu item
  expectErrorPastAuth(await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID, tableId: TABLE_2, sessionId: tableSession,
    menuItemId: 'nonexistent_item_xyz', quantity: 1,
  }), '8. Cart add: fake menuItemId');

  // 9. addItemToCart: out-of-stock item
  expectErrorPastAuth(await call('cart-addItemToCart', {
    restaurantId: RESTAURANT_ID, tableId: TABLE_2, sessionId: tableSession,
    menuItemId: ITEMS.BEER.id, quantity: 1,
  }), '9. Cart add: out-of-stock (beer)');

  // 10. getCart: non-existent table
  {
    const resp = await call('cart-getCart', {
      restaurantId: RESTAURANT_ID, tableId: 'nonexistent_table_xyz',
    });
    // May return error or empty cart
    const isEmptyOrError = resp.status === 'error' || resp._httpStatus >= 400 ||
      (resp.data?.cart?.items || []).length === 0;
    record({ pass: isEmptyOrError, message: `10. Get cart: fake table → ${isEmptyOrError ? 'empty/error' : 'unexpected data'}`, actual: isEmptyOrError ? undefined : resp });
  }

  // 11. removeItemFromCart: non-existent cart
  expectError(await call('cart-removeItemFromCart', {
    restaurantId: RESTAURANT_ID, tableId: 'nonexistent_table_xyz', menuItemId: ITEMS.TIRAMISU.id,
  }), '11. Remove from non-existent cart');

  // 12. checkoutCart: no restaurantId
  expectError(await call('cart-checkoutCart', {
    tableId: 'table_1', sessionId: 'fake',
  }), '12. Checkout: no restaurantId');

  // ── Order endpoints: invalid IDs ───────────────────────────────

  // 13. getOrder: fake orderId
  expectError(await call('order-getOrder', {
    restaurantId: RESTAURANT_ID, orderId: 'nonexistent_order_xyz',
  }), '13. Get order: fake orderId');

  // 14. updateOrderStatus: fake orderId
  expectErrorPastAuth(await call('order-updateOrderStatus', {
    restaurantId: RESTAURANT_ID, orderId: 'fake', orderStatus: 'COMPLETED',
    sessionId: staffSession,
  }), '14. Update order status: fake orderId');

  // 15. updateCartStatus: invalid transition
  expectErrorPastAuth(await call('cart-updateCartStatus', {
    restaurantId: RESTAURANT_ID, orderId: 'fake', cartIndex: 0, newStatus: 'SERVED',
    sessionId: staffSession,
  }), '15. Update cart status: fake orderId');

  // ── Server endpoints: auth failures ────────────────────────────

  // 16. serverLogin: wrong password
  {
    const resp = await call('server-serverLogin', {
      restaurantId: RESTAURANT_ID, username: config.SERVER_EMAIL, password: 'wrong',
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `16. Server login: wrong password → ${isError ? 'rejected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // 17. serverLogin: fake sessionId
  {
    const resp = await call('server-serverLogin', {
      restaurantId: RESTAURANT_ID, sessionId: 'fake_session_xyz',
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `17. Server login: fake session → ${isError ? 'rejected' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── Offers: invalid ────────────────────────────────────────────

  // 18. applyOffer: missing restaurantId
  expectError(await call('offers-applyOffer', {
    tableId: 'table_1', offerId: 'fake',
  }), '18. Apply offer: no restaurantId');

  // ── Admin: no auth ─────────────────────────────────────────────

  // 19. getSettings: no sessionId
  expectError(await call('admin-getRestaurantSettings', {
    restaurantId: RESTAURANT_ID,
  }), '19. Admin settings: no session');

  // 20. addServer: no sessionId
  expectError(await call('admin-addServer', {
    restaurantId: RESTAURANT_ID, name: 'Hacker', email: 'h@h.com', pin: '0000',
  }), '20. Admin add server: no session');

  // ── 21. Cart add on empty-menu restaurant ─────────────────────
  expectError(
    await call('cart-addItemToCart', { restaurantId: config.RESTAURANT_EMPTY_MENU, tableId: 'table_clean_1', menuItemId: ITEMS.TIRAMISU.id, quantity: 1 }),
    '21. Add item to empty-menu restaurant'
  );
  narrator.errorCase('Add to empty menu restaurant', 'item not found');

  // ── 22. Checkout with invalid sessionId ───────────────────────
  expectError(
    await call('cart-checkoutCart', { restaurantId: RESTAURANT_ID, tableId: 'table_clean_2', sessionId: 'fake_session_xyz' }),
    '22. Checkout with fake sessionId'
  );
  narrator.errorCase('Checkout with fake session', 'session validation failed');

  // ── 23. Order updateStatus with wrong restaurantId ────────────
  expectError(
    await call('order-updateOrderStatus', { restaurantId: 'wrong_restaurant', orderId: 'order_active_1', orderStatus: 'COMPLETED', sessionId: staffSession }),
    '23. Order update with wrong restaurantId'
  );
  narrator.errorCase('Order update wrong restaurant', 'not found');

  // ── 24. Apply offer from wrong restaurant ─────────────────────
  expectError(
    await call('offers-applyOffer', { restaurantId: config.RESTAURANT_EMPTY_MENU, tableId: 'table_clean_1', offerId: 'offer_dessert_50' }),
    '24. Apply offer on wrong restaurant'
  );
  narrator.errorCase('Apply offer wrong restaurant', 'offer not found');

  // ── 25. Remove item not in cart ───────────────────────────────
  // TD-033: a remove names the table's own session, so this uses the real TABLE_2 session and is
  // refused for the item, not for the missing session.
  expectErrorPastAuth(
    await call('cart-removeItemFromCart', { restaurantId: RESTAURANT_ID, tableId: TABLE_2, sessionId: tableSession, menuItemId: 'nonexistent_item_xyz', cartItemId: 'nonexistent_cart_item' }),
    '25. Remove item not in cart'
  );
  narrator.errorCase('Remove nonexistent item', 'item not found');

  return results;
}
