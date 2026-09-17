/**
 * Suite: coverage
 *
 * Closes the "orphaned endpoint" gap: endpoints exported in index.js that no
 * other suite calls. Covers:
 *   - customer-createOrUpdateCustomerProfile (unauthenticated onCall)
 *   - customer-getOrCreateCustomerProfile / updateCustomerVisit / endCustomerVisit
 *     (auth-bound onCall — driven with an emulator-accepted unsigned bearer token)
 *   - menu-fetchMenu
 *   - table-updateTableStatus
 *   - server-getOrderDetails + server-markItemServed (via a real checkout on
 *     the dedicated table_clean_8)
 */
import { call } from '../lib/api.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_OTP, CUSTOMER_PHONE, CUSTOMER_NAME } = config;
const TABLE = 'table_clean_8'; // dedicated to this suite (see README_AGENT.md)

// The functions emulator decodes callable auth tokens without verifying the
// signature, so an unsigned JWT with sub = phoneNumber acts as customer auth.
function fakeAuthHeader(uid) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    sub: uid, user_id: uid, uid,
    iss: `https://securetoken.google.com/demo-project`, aud: 'demo-project',
    iat: 1, exp: 9999999999, auth_time: 1, firebase: { sign_in_provider: 'phone' },
  })}.`;
  return { Authorization: `Bearer ${token}` };
}

// Test seam: set every cart item's status on an order directly in the
// Firestore emulator (no API sets item-level READY — see note below).
async function setOrderItemsStatus(orderId, status) {
  const docUrl = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents/restaurants/${RESTAURANT_ID}/orders/${orderId}`;
  // 'Bearer owner' = emulator admin bypass (rules are locked in prod)
  const owner = { Authorization: 'Bearer owner' };
  const doc = await (await fetch(docUrl, { headers: owner })).json();
  for (const cart of doc.fields?.carts?.arrayValue?.values || []) {
    for (const it of cart.mapValue?.fields?.items?.arrayValue?.values || []) {
      it.mapValue.fields.status = { stringValue: status };
    }
  }
  const resp = await fetch(`${docUrl}?updateMask.fieldPaths=carts`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...owner },
    body: JSON.stringify({ fields: { carts: doc.fields.carts } }),
  });
  if (!resp.ok) throw new Error(`seed READY failed: ${resp.status} ${await resp.text()}`);
}

export default async function coverageSuite() {
  const results = { name: 'coverage', pass: 0, fail: 0, tests: [] };
  const record = (pass, name, detail = '') => {
    results.tests.push({ pass, message: detail ? `${name} ${detail}` : name });
    pass ? results.pass++ : results.fail++;
  };

  // ── 1. customer-createOrUpdateCustomerProfile (no auth required) ──
  {
    const resp = await call('customer-createOrUpdateCustomerProfile', {
      phoneNumber: CUSTOMER_PHONE, name: CUSTOMER_NAME,
    });
    // Returns the raw profile object, not {status,...}
    const ok = resp?.id === CUSTOMER_PHONE || resp?.phoneNumber === CUSTOMER_PHONE;
    record(ok, 'customer-createOrUpdateCustomerProfile returns profile',
      ok ? '' : `→ ${JSON.stringify(resp).slice(0, 200)}`);
  }

  // ── 2. auth-bound customer endpoints ──
  // Full authed flow needs the emulator started with skipTokenVerification
  // (npm run emulators now sets FIREBASE_DEBUG_MODE / FIREBASE_DEBUG_FEATURES).
  // If verification is enforced, we still assert the auth GATE works: the
  // endpoint must reject with UNAUTHENTICATED, not 404 / INTERNAL.
  const authHdr = { headers: fakeAuthHeader(CUSTOMER_PHONE) };
  const probe = await call('customer-getOrCreateCustomerProfile', {}, authHdr);
  const authedMode = !(probe?.error?.status === 'UNAUTHENTICATED' || probe?._httpStatus === 401);
  if (authedMode) {
    const ok = probe?.phoneNumber === CUSTOMER_PHONE || probe?.id === CUSTOMER_PHONE;
    record(ok, 'customer-getOrCreateCustomerProfile (authed)',
      ok ? '' : `→ ${JSON.stringify(probe).slice(0, 200)}`);
    {
      const resp = await call('customer-updateCustomerVisit',
        { restaurantId: RESTAURANT_ID, tableId: TABLE }, authHdr);
      const ok2 = !!resp?.message && !resp?.error && resp?.status !== 'error';
      record(ok2, 'customer-updateCustomerVisit (authed)',
        ok2 ? '' : `→ ${JSON.stringify(resp).slice(0, 200)}`);
    }
    {
      const resp = await call('customer-endCustomerVisit', {}, authHdr);
      const ok2 = !!resp?.message && !resp?.error && resp?.status !== 'error';
      record(ok2, 'customer-endCustomerVisit (authed)',
        ok2 ? '' : `→ ${JSON.stringify(resp).slice(0, 200)}`);
    }
  } else {
    // Token verification enforced — assert every auth-bound endpoint rejects
    // cleanly (endpoint exists + gate works). Restart emulator via
    // `npm run emulators` for the full authed flow.
    for (const [ep, payload] of [
      ['customer-getOrCreateCustomerProfile', {}],
      ['customer-updateCustomerVisit', { restaurantId: RESTAURANT_ID, tableId: TABLE }],
      ['customer-endCustomerVisit', {}],
    ]) {
      const resp = await call(ep, payload);
      const ok = resp?._httpStatus === 401 || resp?.error?.status === 'UNAUTHENTICATED';
      record(ok, `${ep} enforces auth gate (UNAUTHENTICATED)`,
        ok ? '' : `→ ${JSON.stringify(resp).slice(0, 200)}`);
    }
  }

  // ── 3. menu fetchMenu smoke ──
  // NOTE: the endpoint is registered as menu-fetchMenu-fetchMenu because
  // menu/indexMenu.js imports the whole menu_fetch module as `fetchMenu`.
  // The live consumer app (api_constants.dart) calls this doubled name, so it
  // is load-bearing; this test pins it so a "cleanup" doesn't silently break
  // the consumer app.
  {
    const resp = await call('menu-fetchMenu-fetchMenu', { restaurantId: RESTAURANT_ID });
    const ok = Array.isArray(resp?.categories) || Array.isArray(resp?.data?.categories);
    record(ok, 'menu-fetchMenu-fetchMenu returns categories', ok ? '' : `→ ${JSON.stringify(resp).slice(0, 200)}`);
  }

  // ── 4. Checkout on dedicated table → server-getOrderDetails + markItemServed ──
  let orderId = null;
  let customerSessionId = null;
  try {
    const sessionId = await customerLogin(RESTAURANT_ID, TABLE, TABLE_OTP);
    customerSessionId = sessionId;
    const base = { restaurantId: RESTAURANT_ID, tableId: TABLE, sessionId };
    await call('cart-clearCart', base);
    const add = await call('cart-addItemToCart', { ...base, menuItemId: config.ITEMS.TIRAMISU.id, quantity: 1 });
    record(add?.status === 'success', 'coverage checkout: addItemToCart', add?.message || '');
    const co = await call('cart-checkoutCart', base);
    orderId = co?.data?.order?.orderId || co?.data?.orderId || null;
    record(co?.status === 'success' && !!orderId, 'coverage checkout: checkoutCart', co?.message || '');
  } catch (e) {
    record(false, 'coverage checkout setup', `→ ${e.message}`);
  }

  if (orderId) {
    let serverSessionId = null;
    try { serverSessionId = await serverLogin(); }
    catch (e) { record(false, 'coverage serverLogin', `→ ${e.message}`); }

    if (serverSessionId) {
      // server-getOrderDetails (previously zero coverage)
      const det = await call('server-getOrderDetails', {
        restaurantId: RESTAURANT_ID, orderId, sessionId: serverSessionId,
      });
      const order = det?.data?.order || det?.data;
      const totalOk = det?.status === 'success' && typeof order?.total === 'number' && order.total > 0;
      record(totalOk, 'server-getOrderDetails returns order with total',
        totalOk ? '' : `→ ${JSON.stringify(det).slice(0, 250)}`);

      // server-markItemServed (previously zero coverage).
      // Item state machine only allows READY → SERVED. Items are PENDING right
      // after checkout (cart-updateCartStatus cascades cart status to items,
      // but this cart is never moved to READY here). Assert the rejection
      // first, then seed READY directly in Firestore (test seam, like
      // setFeatureFlags) and assert the serve succeeds.
      const cart = (order?.carts || []).find(c => (c.items || []).length > 0);
      const item = cart?.items?.[0];
      if (item) {
        const rejected = await call('server-markItemServed', {
          restaurantId: RESTAURANT_ID, orderId, sessionId: serverSessionId,
          menuItemId: item.menuItemId, cartItemId: item.cartItemId,
        });
        const rejOk = rejected?.status !== 'success' && /Invalid status transition/i.test(rejected?.message || '');
        record(rejOk, 'server-markItemServed rejects PENDING→SERVED',
          rejOk ? '' : `→ ${rejected?.message || JSON.stringify(rejected).slice(0, 200)}`);

        await setOrderItemsStatus(orderId, 'READY');
        const served = await call('server-markItemServed', {
          restaurantId: RESTAURANT_ID, orderId, sessionId: serverSessionId,
          menuItemId: item.menuItemId, cartItemId: item.cartItemId,
        });
        record(served?.status === 'success', 'server-markItemServed marks READY item SERVED',
          served?.status === 'success' ? '' : `→ ${served?.message || JSON.stringify(served).slice(0, 200)}`);
      } else {
        record(false, 'server-markItemServed', '→ no cart item found on order to serve');
      }
    }
  }

  // ── 4b. Session resume is caller-scoped: a guessed sessionId must not hand
  //        back the table's live session (that id is the checkout credential) ──
  if (customerSessionId) {
    const scanBase = { restaurantId: RESTAURANT_ID, tableId: TABLE, userLocation: { latitude: 0, longitude: 0 } };
    const bogus = await call('table-validateTableAndLocation', { ...scanBase, sessionId: 'not-the-real-one' });
    const bogusOk = bogus?.status !== 'success';
    record(bogusOk, "validateTableAndLocation ignores a sessionId that is not the table's",
      bogusOk ? '' : `→ handed out ${bogus?.data?.session?.sessionId}`);
    const real = await call('table-validateTableAndLocation', { ...scanBase, sessionId: customerSessionId });
    const realOk = real?.status === 'success' && real?.data?.session?.sessionId === customerSessionId;
    record(realOk, "validateTableAndLocation resumes the caller's own session",
      realOk ? '' : `→ ${real?.message || JSON.stringify(real).slice(0, 200)}`);
  }

  // ── 5. table-updateTableStatus: reserved blocks self-service; vacant restores the table ──
  {
    const staffSessionId = await serverLogin();
    const setStatus = (status) => call('table-updateTableStatus', {
      restaurantId: RESTAURANT_ID, tableId: TABLE, status, sessionId: staffSessionId,
    });

    const reserved = await setStatus('reserved');
    record(reserved?.status === 'success', 'table-updateTableStatus sets table reserved',
      reserved?.status === 'success' ? '' : `→ ${reserved?.message}`);
    const scan = await call('table-validateTableAndLocation', {
      restaurantId: RESTAURANT_ID, tableId: TABLE, userLocation: { latitude: 0, longitude: 0 },
    });
    const scanOk = scan?._httpStatus === 403;
    record(scanOk, 'reserved table: scan → 403 ask staff',
      scanOk ? '' : `→ HTTP ${scan?._httpStatus} ${scan?.message}`);
    const otp = await call('table-validateOTP', {
      restaurantId: RESTAURANT_ID, tableId: TABLE, otp: TABLE_OTP,
      phoneNumber: CUSTOMER_PHONE, name: CUSTOMER_NAME,
    });
    const otpOk = otp?._httpStatus === 403;
    record(otpOk, 'reserved table: validateOTP → 403 (was 500)',
      otpOk ? '' : `→ HTTP ${otp?._httpStatus} ${otp?.message}`);

    const resp = await setStatus('vacant');
    const ok = resp?.status === 'success';
    record(ok, 'table-updateTableStatus sets table vacant',
      ok ? '' : `→ ${resp?.message || JSON.stringify(resp).slice(0, 200)}`);
  }

  return results;
}
