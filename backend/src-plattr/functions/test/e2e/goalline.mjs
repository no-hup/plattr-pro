/**
 * goalline.mjs — Production goal-line E2E runner (MockData7)
 * ============================================================================
 * Drives the LIVE backend (Firebase emulator) through goldenExpectedValues.json
 * and asserts every scenario against the golden goal-line. This is the
 * agent-monitored "goal-line for all testing" over the 5 production restaurants.
 *
 * It is INDEPENDENT of the 12 hard-coded suites (which target the res_e2e_*
 * dataset); this one targets res_meghana / res_pizzabakery / res_truffles /
 * res_salt / res_chowman from MockData7ProductionMenus.json.
 *
 * PREREQUISITES (run on a machine with the Firebase CLI):
 *   cd backend/src-plattr && npm run emulators          # firestore + functions
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node functions/mock/importMockData5.js \
 *       --file=functions/mock/MockData7ProductionMenus.json --clean --refresh-timestamps
 *
 * RUN:
 *   cd backend/src-plattr/functions/test/e2e && node goalline.mjs
 *   node goalline.mjs --restaurant res_meghana     # single restaurant
 *   node goalline.mjs --verbose
 *
 * Golden values are ALSO verified offline against real backend code by
 * ../../mock/verifyGolden.js (no emulator needed). If verifyGolden passes but
 * goalline fails, the gap is in the API/transaction/offer-auto-apply layer, not
 * the pricing model.
 * ============================================================================
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { call } from './lib/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(path.join(__dirname, '../../mock/goldenExpectedValues.json'), 'utf8'));
const seed = JSON.parse(readFileSync(path.join(__dirname, '../../mock/MockData7ProductionMenus.json'), 'utf8'));

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const onlyR = args.includes('--restaurant') ? args[args.indexOf('--restaurant') + 1] : null;
const TOL = 0.05;
const OTP = '123456';

// A clean vacant table (valid OTP) per restaurant to run scenarios on.
const TEST_TABLE = {
  res_meghana: 'tbl_meg_6', res_pizzabakery: 'tbl_pb_6', res_truffles: 'tbl_tr_6',
  res_salt: 'tbl_salt_6', res_chowman: 'tbl_cw_6',
};
// Scenarios tagged 'requires-session-history' must run on the ACTIVE table —
// its session has seeded prior orders (backend derives userHistory counts by
// querying orders by sessionId; a fresh table/session would have 0).
const HISTORY_TABLE = {
  res_meghana: 'tbl_meg_1', res_pizzabakery: 'tbl_pb_1', res_truffles: 'tbl_tr_1',
  res_salt: 'tbl_salt_1', res_chowman: 'tbl_cw_1',
};
// The backend groups successive checkouts in ONE session into ONE multi-cart
// order, so each independent checkout scenario needs its OWN fresh table/session
// (a pool of vacant, valid-OTP tables per restaurant). Item scenarios don't
// create orders, so they share the base table.
const slugOf = { res_meghana: 'meg', res_pizzabakery: 'pb', res_truffles: 'tr', res_salt: 'salt', res_chowman: 'cw' };
function freshTablePool(restaurantId) {
  const slug = slugOf[restaurantId];
  return [7, 8, 9, 10].map(n => `tbl_${slug}_${n}`); // vacant tables reserved for checkouts
}

let pass = 0, fail = 0; const failures = [];
const near = (a, b) => Math.abs((a ?? NaN) - b) <= TOL;
function record(ok, label, detail) {
  if (ok) { pass++; if (VERBOSE) console.log(`  ✓ ${label}`); }
  else { fail++; failures.push(`  ✗ ${label} ${detail || ''}`); console.log(`  ✗ ${label} ${detail || ''}`); }
}

// Staff logins for the cross-app consistency layer. MockData7 easy-auth:
// kitchen@<slug>.test / server@<slug>.test, password 1234.
async function staffLogin(restaurantId, role) {
  const resp = await call('server-serverLogin', {
    restaurantId, username: `${role}@${slugOf[restaurantId]}.test`, password: '1234',
  });
  const sid = resp?.data?.sessionId;
  if (!sid) throw new Error(`${role} login failed for ${restaurantId}: ${resp?.message || JSON.stringify(resp)}`);
  return sid;
}

async function login(restaurantId, tableId) {
  const resp = await call('table-validateOTP', { restaurantId, tableId, otp: OTP, phoneNumber: '9876543210', name: 'Customer One' });
  const sid = resp?.data?.sessionId;
  if (!sid) throw new Error(`login failed for ${restaurantId}/${tableId}: ${resp?.message || JSON.stringify(resp)}`);
  return sid;
}
// TD-033: a cart belongs to the sitting that filled it, so the clear names the sitting.
async function clearCart(base) { await call('cart-clearCart', { restaurantId: base.restaurantId, tableId: base.tableId, sessionId: base.sessionId }); }
async function addItem(base, spec) {
  const selectedVariants = (spec.selVariants || []).reduce((m, v) => { m[v.variantId] = v.optionId; return m; }, {});
  return call('cart-addItemToCart', {
    ...base, menuItemId: spec.menuItemId, quantity: spec.quantity || 1,
    selectedVariants: Object.keys(selectedVariants).length ? selectedVariants : undefined,
    selectedAddons: (spec.selAddonIds && spec.selAddonIds.length) ? spec.selAddonIds : undefined,
  });
}
async function getCartPriceInfo(restaurantId, tableId) {
  const r = await call('cart-getCart', { restaurantId, tableId });
  return r?.data?.cart?.priceInfo || r?.data?.priceInfo || null;
}

async function runItem(sc, base) {
  await clearCart(base);
  const add = await addItem(base, sc.input);
  if (add?.status !== 'success') { record(false, `${sc.scenarioId} add`, `→ ${add?.message || JSON.stringify(add)}`); return; }
  const pi = await getCartPriceInfo(base.restaurantId, base.tableId);
  if (!pi) { record(false, `${sc.scenarioId} getCart`, '→ no priceInfo'); return; }
  record(near(pi.finalPrice, sc.expected.finalPrice), `${sc.scenarioId} cart.finalPrice`, `expected ${sc.expected.finalPrice}, got ${pi.finalPrice}`);
}

/**
 * Cross-app consistency layer: the same golden rupee value must appear in
 * every app's read path for the order — Kitchen (getActiveCartsForKitchen),
 * Server list (getActiveOrdersForRestaurant), Server detail (getOrderDetails).
 * Layer-2b: if the consumer order matched golden but an app view disagrees,
 * the bug is in that app's read/sanitize path.
 */
async function runCrossApp(sc, base, orderId, staff) {
  const expected = sc.expected.finalPriceAfterOffer;
  if (staff.kitchen) {
    const r = await call('order-getActiveCartsForKitchen', { restaurantId: base.restaurantId, sessionId: staff.kitchen });
    const order = (r?.data?.orders || []).find(o => o.orderId === orderId);
    if (!order) record(false, `${sc.scenarioId} kitchen view`, `→ order ${orderId} not in getActiveCartsForKitchen (${r?.message || 'ok'})`);
    else record(near(order.priceInfo?.finalPrice, expected), `${sc.scenarioId} kitchen finalPrice`,
      `expected ${expected}, got ${order.priceInfo?.finalPrice}`);
  }
  if (staff.server) {
    const r = await call('order-getActiveOrdersForRestaurant', { restaurantId: base.restaurantId, sessionId: staff.server });
    const order = (r?.data?.orders || []).find(o => o.orderId === orderId);
    if (!order) record(false, `${sc.scenarioId} server view`, `→ order ${orderId} not in getActiveOrdersForRestaurant (${r?.message || 'ok'})`);
    else record(near(order.priceInfo?.finalPrice, expected), `${sc.scenarioId} server finalPrice`,
      `expected ${expected}, got ${order.priceInfo?.finalPrice}`);

    const d = await call('server-getOrderDetails', { restaurantId: base.restaurantId, orderId, sessionId: staff.server });
    const total = d?.data?.order?.total ?? d?.data?.total;
    record(near(total, expected), `${sc.scenarioId} server orderDetails.total`,
      `expected ${expected}, got ${total} (${d?.message || 'ok'})`);
  }
}

async function runCheckout(sc, base, staff) {
  await clearCart(base);
  for (const it of sc.input.items) {
    const add = await addItem(base, it);
    if (add?.status !== 'success') { record(false, `${sc.scenarioId} add ${it.menuItemId}`, `→ ${add?.message || JSON.stringify(add)}`); return; }
  }
  const co = await call('cart-checkoutCart', { ...base });
  if (co?.status !== 'success') { record(false, `${sc.scenarioId} checkout`, `→ ${co?.message || JSON.stringify(co)}`); return; }
  // checkout returns {orderId,...} only — fetch the order for its priceInfo.
  const orderId = co?.data?.order?.orderId || co?.data?.orderId;
  let opi = co?.data?.order?.priceInfo || co?.data?.priceInfo;
  if (!opi && orderId) { const o = await call('order-getOrder', { ...base, orderId }); opi = o?.data?.order?.priceInfo || o?.data?.priceInfo; }
  if (!opi) { record(false, `${sc.scenarioId} order.priceInfo`, `→ not found (orderId=${orderId})`); return; }
  const chargesTotal = opi.chargesTotal || 0;
  const grand = (opi.finalPrice ?? 0) + chargesTotal;
  record(near(opi.finalPrice, sc.expected.finalPriceAfterOffer), `${sc.scenarioId} finalPriceAfterOffer`, `expected ${sc.expected.finalPriceAfterOffer}, got ${opi.finalPrice}`);
  record(near(opi.offerDiscount ?? 0, sc.expected.offerDiscount), `${sc.scenarioId} offerDiscount`, `expected ${sc.expected.offerDiscount}, got ${opi.offerDiscount ?? 0}`);
  record(near(grand, sc.expected.grandTotal), `${sc.scenarioId} grandTotal`, `expected ${sc.expected.grandTotal}, got ${grand}`);
  if (orderId && staff) await runCrossApp(sc, base, orderId, staff);
}

(async () => {
  const restaurants = [...new Set(golden.scenarios.map(s => s.restaurantId))].filter(r => !onlyR || r === onlyR);
  for (const restaurantId of restaurants) {
    const tableId = TEST_TABLE[restaurantId];
    const name = seed.restaurants[restaurantId]?.info?.name || restaurantId;
    console.log(`\n── ${restaurantId} (${name}) — table ${tableId} ──`);
    let sessionId;
    try { sessionId = await login(restaurantId, tableId); }
    catch (e) { record(false, `${restaurantId} login`, `→ ${e.message}`); continue; }
    const base = { restaurantId, tableId, sessionId };
    // Staff sessions for the cross-app consistency layer (kitchen + server).
    const staff = {};
    try { staff.kitchen = await staffLogin(restaurantId, 'kitchen'); }
    catch (e) { record(false, `${restaurantId} kitchen-login`, `→ ${e.message}`); }
    try { staff.server = await staffLogin(restaurantId, 'server'); }
    catch (e) { record(false, `${restaurantId} server-login`, `→ ${e.message}`); }
    let historyBase = null;         // lazy login on the active (history) table
    const pool = freshTablePool(restaurantId); let poolIdx = 0;
    for (const sc of golden.scenarios.filter(s => s.restaurantId === restaurantId)) {
      let scBase = base;
      if ((sc.tags || []).includes('requires-session-history')) {
        // Independent order on the history-bearing session.
        if (!historyBase) {
          const hTable = HISTORY_TABLE[restaurantId];
          try { historyBase = { restaurantId, tableId: hTable, sessionId: await login(restaurantId, hTable) }; }
          catch (e) { record(false, `${sc.scenarioId} history-login`, `→ ${e.message}`); continue; }
        }
        scBase = historyBase;
      } else if (sc.kind === 'checkout') {
        // Each checkout needs a FRESH session/table (multi-cart order grouping).
        const t = pool[poolIdx++ % pool.length];
        try { scBase = { restaurantId, tableId: t, sessionId: await login(restaurantId, t) }; }
        catch (e) { record(false, `${sc.scenarioId} login(${t})`, `→ ${e.message}`); continue; }
      }
      try { sc.kind === 'item' ? await runItem(sc, scBase) : await runCheckout(sc, scBase, staff); }
      catch (e) { record(false, `${sc.scenarioId}`, `→ threw: ${e.message}`); }
    }
  }
  console.log(`\n${'='.repeat(70)}`);
  console.log(`GOAL-LINE E2E (live backend) — ${pass + fail} assertions`);
  console.log('='.repeat(70));
  if (fail === 0) console.log(`✅ ALL ${pass} passed — backend matches the golden goal-line.`);
  else { console.log(`❌ ${fail} failed (${pass} passed):`); failures.forEach(f => console.log(f)); }
  process.exit(fail === 0 ? 0 : 1);
})();
