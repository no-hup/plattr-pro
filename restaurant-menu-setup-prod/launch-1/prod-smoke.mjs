#!/usr/bin/env node
/**
 * prod-smoke.mjs — Phase E production smoke test for Kaanchipuram Kaapi (HSR).
 *
 * Drives the REAL order loop against PRODUCTION Cloud Functions:
 *   scan (no OTP) → staff login → mint OTP → validateOTP → menu → cart →
 *   checkout → kitchen PENDING → PREPARING → READY → waiter list → SERVED →
 *   COMPLETED (paid) → table vacant → fresh scan needs OTP again.
 *
 * Touches ONLY res_kaanchipuram_kaapi_hsr / tbl_1 / phone 9000000001.
 * Every id it creates is appended to created.json for prod-smoke-cleanup.mjs.
 *
 * Node 22, no deps.
 *   node prod-smoke.mjs
 *   PLATTR_BASE_URL=... node prod-smoke.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PLATTR_BASE_URL || 'https://us-central1-rms-app-dd875.cloudfunctions.net';
const RESTAURANT = 'res_kaanchipuram_kaapi_hsr';
const TABLE = 'tbl_1';
const PHONE = '9000000001';
const NAME = 'Smoke Test';
const USER_LOCATION = { latitude: 12.9121, longitude: 77.6446 }; // HSR Layout
const CREATED_PATH = path.join(__dirname, 'created.json');

// ── created-id ledger (merged across runs so cleanup sees every run) ─────────
const created = existsSync(CREATED_PATH)
  ? JSON.parse(readFileSync(CREATED_PATH, 'utf8'))
  : { restaurantId: RESTAURANT, tableId: TABLE, customerPhones: [], sessionIds: [], staffSessionIds: [], orderIds: [], cartDocIds: [], runs: [] };
const remember = (key, val) => { if (val && !created[key].includes(val)) created[key].push(val); };
function saveCreated() { writeFileSync(CREATED_PATH, JSON.stringify(created, null, 2) + '\n'); }

// ── staff credentials (parsed from the gitignored file; never printed) ───────
function staffCreds() {
  const md = readFileSync(path.join(__dirname, 'CREDENTIALS.local.md'), 'utf8');
  const out = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*[^|]*\|\s*(\w+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);
    if (m) out[m[2]] = { username: m[3], password: m[4] };
  }
  if (!out.KITCHEN || !out.SERVER) throw new Error('Could not parse CREDENTIALS.local.md');
  return out;
}

// ── HTTP ────────────────────────────────────────────────────────────────────
const timings = [];
let failed = null;

async function call(endpoint, payload, note) {
  const t0 = performance.now();
  let resp, json, raw = '';
  try {
    resp = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });
    raw = await resp.text();
    try { json = JSON.parse(raw); } catch { json = null; }
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    timings.push({ endpoint, ms, status: 'ERR' });
    console.log(`${String(ms).padStart(6)}ms  ERR  ${endpoint}  ${e.message}`);
    return { ok: false, httpStatus: 0, json: null, raw: e.message, result: null, error: { message: e.message } };
  }
  const ms = Math.round(performance.now() - t0);
  timings.push({ endpoint, ms, status: resp.status });

  const result = json && json.result !== undefined ? json.result : json;
  const error = json && json.error ? json.error : null;
  const short = note ? note(result, error) : (error ? (error.message || error.status || '') : (result?.message || 'ok'));
  console.log(`${String(ms).padStart(6)}ms  ${String(resp.status).padStart(3)}  ${endpoint}  ${String(short).slice(0, 110)}`);
  return { ok: resp.ok, httpStatus: resp.status, json, raw, result, error };
}

// ── assertions ──────────────────────────────────────────────────────────────
let passCount = 0;
function assert(cond, label, detail) {
  if (cond) { passCount++; console.log(`        PASS  ${label}`); return true; }
  console.log(`        FAIL  ${label}${detail ? `  ← ${detail}` : ''}`);
  failed = { label, detail };
  saveCreated();
  process.exit(1);
}

// ── the loop ────────────────────────────────────────────────────────────────
const runStamp = new Date().toISOString();
console.log(`# prod-smoke ${runStamp}  base=${BASE_URL}  restaurant=${RESTAURANT}  table=${TABLE}`);
console.log('#   ms  http  endpoint  result');

// 0. Preflight: table not mid-meal.
{
  const r = await call('table-checkTableStatus', { restaurantId: RESTAURANT, tableId: TABLE },
    (res) => `status=${res?.data?.status} hasOTP=${res?.data?.hasActiveOTP}`);
  assert(r.result?.data?.status !== 'active', 'A0 tbl_1 is not mid-meal at start', `status=${r.result?.data?.status}`);
}

// 1. Scan before OTP → must be rejected with otpRequired.
{
  const r = await call('table-validateTableAndLocation',
    { restaurantId: RESTAURANT, tableId: TABLE, userLocation: USER_LOCATION },
    (res, err) => `${err?.status || ''} otpRequired=${err?.details?.data?.otpRequired ?? err?.details?.otpRequired}`);
  const d = r.error?.details?.data || r.error?.details || {};
  assert(r.httpStatus === 401, 'A1 scan before OTP → HTTP 401', `got ${r.httpStatus}: ${r.raw.slice(0, 200)}`);
  assert(d.otpRequired === true, 'A1b scan response says otpRequired', JSON.stringify(d).slice(0, 200));
  assert(d.isPhoneNumberMandatory === true && d.isUsernameMandatory === true,
    'A1c flags: phone + username mandatory', JSON.stringify({ p: d.isPhoneNumberMandatory, u: d.isUsernameMandatory }));
}

// 2. Staff logins (kitchen + server).
const creds = staffCreds();
let kitchenSession, serverSession;
{
  const r = await call('server-serverLogin', { restaurantId: RESTAURANT, username: creds.KITCHEN.username, password: creds.KITCHEN.password },
    (res) => `${res?.data?.role} ${res?.data?.serverId}`);
  kitchenSession = r.result?.data?.sessionId;
  assert(!!kitchenSession && r.result?.data?.role === 'KITCHEN', 'A2 kitchen login', r.raw.slice(0, 200));
  remember('staffSessionIds', kitchenSession);
  saveCreated();
}
{
  const r = await call('server-serverLogin', { restaurantId: RESTAURANT, username: creds.SERVER.username, password: creds.SERVER.password },
    (res) => `${res?.data?.role} ${res?.data?.serverId}`);
  serverSession = r.result?.data?.sessionId;
  assert(!!serverSession && r.result?.data?.role === 'SERVER', 'A3 server login', r.raw.slice(0, 200));
  remember('staffSessionIds', serverSession);
  saveCreated();
}

// 3. Waiter mints the OTP (the real production flow: staff reads it out).
let otp;
{
  const r = await call('table-generateTableOTP', { restaurantId: RESTAURANT, tableId: TABLE, sessionId: serverSession },
    (res) => `otp=${res?.data?.otp ? '******' : 'MISSING'} expires=${res?.data?.otpExpiresAt}`);
  otp = r.result?.data?.otp;
  assert(!!otp && /^\d{6}$/.test(otp), 'A4 waiter mints a 6-digit table OTP', r.raw.slice(0, 200));
}

// 4. Customer validates OTP → session.
let sessionId;
{
  const r = await call('table-validateOTP', { restaurantId: RESTAURANT, tableId: TABLE, otp, phoneNumber: PHONE, name: NAME },
    (res) => `session=${res?.data?.session?.sessionId || res?.data?.sessionId} primary=${res?.data?.isPrimaryCustomer}`);
  sessionId = r.result?.data?.session?.sessionId || r.result?.data?.sessionId;
  assert(!!sessionId, 'A5 validateOTP creates a session', r.raw.slice(0, 300));
  remember('sessionIds', sessionId);
  remember('customerPhones', PHONE);
  saveCreated();
}

// 5. Re-scan WITH the session → active session, no OTP.
{
  const r = await call('table-validateTableAndLocation',
    { restaurantId: RESTAURANT, tableId: TABLE, userLocation: USER_LOCATION, sessionId },
    (res) => `tableStatus=${res?.data?.tableStatus} session=${res?.data?.session?.sessionId}`);
  assert(r.httpStatus === 200 && r.result?.status === 'success', 'A6 re-scan with session → granted', r.raw.slice(0, 200));
  assert(r.result?.data?.session?.sessionId === sessionId, 'A6b same session returned', r.result?.data?.session?.sessionId);
  assert(r.result?.data?.tableStatus === 'active', 'A6c table is active', r.result?.data?.tableStatus);
}

// 6. Menu.
{
  const r = await call('menu-fetchMenu-fetchMenu', { restaurantId: RESTAURANT },
    (res) => `items=${res?.metadata?.totalMenuItems} cats=${res?.metadata?.totalCategories} menu=${res?.activeMenu?.menuId}`);
  const md = r.result?.metadata || {};
  assert(md.totalMenuItems === 30, 'A7 menu has 30 items', `got ${md.totalMenuItems}`);
  assert(md.totalCategories === 6, 'A7b menu has 6 categories', `got ${md.totalCategories}`);
}

// 7. Cart: Methu Vada (35) + Filter Coffee (20) = 55.
{
  const r = await call('cart-addItemToCart', {
    restaurantId: RESTAURANT, tableId: TABLE, sessionId,
    menuItemId: 'item_methu_masala_vada', quantity: 1,
    selectedVariants: { var_type_vada: 'opt_methu_vada' },
  }, (res, err) => err ? err.message : `cartTotal=${res?.data?.cart?.priceInfo?.finalPrice ?? res?.data?.priceInfo?.finalPrice}`);
  assert(r.result?.status === 'success', 'A8 add Methu Vada', r.raw.slice(0, 300));
  remember('cartDocIds', TABLE);
}
{
  const r = await call('cart-addItemToCart', {
    restaurantId: RESTAURANT, tableId: TABLE, sessionId,
    menuItemId: 'item_filter_coffee', quantity: 1,
  }, (res, err) => err ? err.message : `cartTotal=${res?.data?.cart?.priceInfo?.finalPrice ?? res?.data?.priceInfo?.finalPrice}`);
  assert(r.result?.status === 'success', 'A9 add Filter Coffee', r.raw.slice(0, 300));
}
{
  const r = await call('cart-getCart', { restaurantId: RESTAURANT, tableId: TABLE, sessionId },
    (res) => `items=${res?.data?.cart?.items?.length} total=${res?.data?.cart?.priceInfo?.finalPrice}`);
  const pi = r.result?.data?.cart?.priceInfo || {};
  assert(r.result?.data?.cart?.items?.length === 2, 'A10 cart has 2 lines', `got ${r.result?.data?.cart?.items?.length}`);
  assert(pi.finalPrice === 55, 'A11 cart total is 55', `got ${pi.finalPrice} (${JSON.stringify(pi)})`);
}

// 8. Checkout → order.
let orderId;
{
  const r = await call('cart-checkoutCart', { restaurantId: RESTAURANT, tableId: TABLE, sessionId },
    (res, err) => err ? err.message : `orderId=${res?.data?.orderId} status=${res?.data?.orderStatus}`);
  orderId = r.result?.data?.orderId;
  assert(r.result?.status === 'success' && !!orderId, 'A12 checkout creates an order', r.raw.slice(0, 400));
  remember('orderIds', orderId);
  saveCreated();
}
{
  const r = await call('order-getOrder', { restaurantId: RESTAURANT, orderId },
    (res) => `total=${res?.data?.total} carts=${res?.data?.carts?.length} charges=${JSON.stringify(res?.data?.priceInfo?.charges ?? null)}`);
  const o = r.result?.data || {};
  const pi = o.priceInfo || {};
  assert(pi.finalPrice === 55, 'A13 order priceInfo.finalPrice is 55', `got ${pi.finalPrice} (${JSON.stringify(pi)})`);
  assert(!pi.chargesTotal && (!Array.isArray(pi.charges) || pi.charges.length === 0),
    'A14 order has no charges', JSON.stringify({ chargesTotal: pi.chargesTotal, charges: pi.charges }));
  assert((o.carts || []).length === 1 && o.carts[0].status === 'PENDING',
    'A15 order has 1 cart in PENDING', JSON.stringify((o.carts || []).map(c => c.status)));
}

// 9. Kitchen sees the cart PENDING.
{
  const r = await call('order-getActiveCartsForKitchen', { restaurantId: RESTAURANT, sessionId: kitchenSession },
    (res, err) => err ? err.message : `orders=${res?.data?.orders?.length}`);
  const order = (r.result?.data?.orders || []).find(o => o.orderId === orderId || o.id === orderId);
  assert(!!order, 'A16 kitchen sees the order', r.raw.slice(0, 300));
  assert(order.carts?.[0]?.status === 'PENDING', 'A17 kitchen shows cart PENDING', JSON.stringify(order.carts?.map(c => c.status)));
  assert(order.priceInfo?.finalPrice === 55, 'A18 kitchen shows total 55', `got ${order.priceInfo?.finalPrice}`);
}

// 10. Kitchen PENDING → PREPARING → READY.
for (const newStatus of ['PREPARING', 'READY']) {
  const r = await call('cart-updateCartStatus',
    { restaurantId: RESTAURANT, orderId, cartIndex: 0, newStatus, sessionId: kitchenSession },
    (res, err) => err ? err.message : `cartStatus=${res?.data?.cartStatus || res?.data?.status || newStatus}`);
  assert(r.result?.status === 'success' || r.result?.success === true, `A19 cart → ${newStatus}`, r.raw.slice(0, 300));
}

// 11. Waiter list shows it READY.
{
  const r = await call('order-getActiveOrdersForRestaurant', { restaurantId: RESTAURANT, sessionId: serverSession },
    (res, err) => err ? err.message : `orders=${res?.data?.orders?.length}`);
  const order = (r.result?.data?.orders || []).find(o => o.orderId === orderId || o.id === orderId);
  assert(!!order, 'A20 waiter list shows the order', r.raw.slice(0, 300));
  assert(order.carts?.[0]?.status === 'READY', 'A21 waiter sees cart READY', JSON.stringify(order.carts?.map(c => c.status)));
  assert(order.priceInfo?.finalPrice === 55, 'A22 waiter list total 55', `got ${order.priceInfo?.finalPrice}`);
}
{
  const r = await call('server-getOrderDetails', { restaurantId: RESTAURANT, orderId, sessionId: serverSession },
    (res, err) => err ? err.message : `total=${res?.data?.order?.total ?? res?.data?.total}`);
  const total = r.result?.data?.order?.total ?? r.result?.data?.total;
  assert(total === 55, 'A23 server order detail total 55', `got ${total} (${r.raw.slice(0, 200)})`);
}

// 12. Waiter serves it.
{
  const r = await call('order-markCartAsServed', { restaurantId: RESTAURANT, orderId, cartIndex: 0, sessionId: serverSession },
    (res, err) => err ? err.message : (res?.message || 'ok'));
  assert(r.result?.status === 'success', 'A24 markCartAsServed', r.raw.slice(0, 300));
}

// 13. Paid → COMPLETED (vacates the table + ends the session).
{
  const r = await call('order-updateOrderStatus', { restaurantId: RESTAURANT, orderId, orderStatus: 'COMPLETED', sessionId: serverSession },
    (res, err) => err ? err.message : `status=${res?.data?.orderStatus} total=${res?.data?.priceInfo?.finalPrice}`);
  assert(r.result?.status === 'success', 'A25 order → COMPLETED (paid)', r.raw.slice(0, 400));
}

// 14. Table is vacant again.
{
  const r = await call('table-checkTableStatus', { restaurantId: RESTAURANT, tableId: TABLE },
    (res) => `status=${res?.data?.status} occupiedBy=${JSON.stringify(res?.data?.occupiedBy)} hasOTP=${res?.data?.hasActiveOTP}`);
  const d = r.result?.data || {};
  assert(d.status === 'vacant', 'A26 tbl_1 is vacant after payment', `got ${d.status}`);
  assert(!d.primaryCustomer && (d.occupiedBy || []).length === 0, 'A27 tbl_1 party cleared',
    JSON.stringify({ primaryCustomer: d.primaryCustomer, occupiedBy: d.occupiedBy }));
}

// 15. Fresh scan needs OTP again.
{
  const r = await call('table-validateTableAndLocation',
    { restaurantId: RESTAURANT, tableId: TABLE, userLocation: USER_LOCATION },
    (res, err) => `${err?.status || ''} otpRequired=${err?.details?.data?.otpRequired ?? err?.details?.otpRequired}`);
  const d = r.error?.details?.data || r.error?.details || {};
  assert(r.httpStatus === 401 && d.otpRequired === true, 'A28 fresh scan requires OTP again',
    `http=${r.httpStatus} ${r.raw.slice(0, 200)}`);
}

// 16. The dead session cannot order any more.
{
  const r = await call('cart-addItemToCart',
    { restaurantId: RESTAURANT, tableId: TABLE, sessionId, menuItemId: 'item_filter_coffee', quantity: 1 },
    (res, err) => err ? `${err.status}: ${err.message}` : 'UNEXPECTEDLY ALLOWED');
  assert(r.httpStatus >= 400, 'A29 ended session cannot add to cart', `http=${r.httpStatus} ${r.raw.slice(0, 200)}`);
  remember('cartDocIds', TABLE);
}

// ── latency summary ─────────────────────────────────────────────────────────
const sorted = timings.map(t => t.ms).sort((a, b) => a - b);
const pct = p => sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)];
const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 3);
console.log('');
console.log(`# calls=${timings.length}  p50=${pct(50)}ms  p95=${pct(95)}ms  max=${sorted[sorted.length - 1]}ms  total=${sorted.reduce((a, b) => a + b, 0)}ms`);
console.log(`# slowest: ${slowest.map(s => `${s.endpoint}=${s.ms}ms`).join('  ')}`);
console.log(`# assertions: ${passCount} passed, 0 failed`);

created.runs.push({ startedAt: runStamp, orderId, sessionId, calls: timings.length, p50: pct(50), p95: pct(95), max: sorted[sorted.length - 1], timings });
saveCreated();
console.log(`# created.json updated (${created.orderIds.length} order(s), ${created.sessionIds.length} customer session(s), ${created.staffSessionIds.length} staff session(s))`);
