/**
 * Suite: waiter-cancel. D4 (Shaurya 2026-09-25): the waiter's cancel always takes the dish off the bill AND off the
 * kitchen, with an audit row and no PIN; once the bill is printed only the till's Edit bill changes it. TD-089 (Cancel
 * Order left the food billed) and TD-092 (completing an order with a round still cooking).
 *
 * Every state comes from the real writers (TESTING.md): guest OTP → cart → checkout → kitchen status → billing-issue →
 * payments-take, on MockData7's res_meghana with the waiter (server@), kitchen (kitchen@) and till (till@) logins.
 * Own state: wipes res_meghana's sittings, orders, lines, bills, carts, payments and audit rows and re-imports MockData7
 * on top, as qa-findings does. Tables 2, 3, 6, 9 and 10 only (4 is seeded reserved, 5 disabled).
 *
 * Hand-computed at Meghana (5 % service charge, GST 5 % exclusive, bills round to the rupee):
 *   Chicken 65 28000 + Butter Naan 6000 = 34000 + 1700 SC = 35700 + 1785 tax = 37485 → 37500
 *   Chicken 65 alone 28000 + 1400 SC = 29400 + 1470 tax = 30870 → 30900 (the ₹309 bill)
 *   Butter Naan alone 6000 + 300 SC = 6300 + 315 tax = 6615 → 6600 (the ₹66 bill)
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../lib/config.js';
import { call, fsFor, draftVersions, ok } from '../lib/rest.mjs';

const RID = 'res_meghana';
const NAAN = 'mi_butter_naan';
const C65 = 'mi_chicken65';
const T = n => `tbl_meg_${n}`;
const { getDoc, patchDoc, listCol, delDoc } = fsFor(RID);
const __dirname = dirname(fileURLToPath(import.meta.url));
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };

async function wipeAndImport() {
  for (const col of ['sessions', 'lines', 'bills', 'orders', 'carts', 'payments', 'audit']) {
    for (let docs = await listCol(col, 300); docs.length; docs = await listCol(col, 300)) for (const d of docs) await delDoc(`${col}/${d.id}`);
  }
  execSync(`node "${resolve(__dirname, '../../../mock/importMockData5.js')}" --file=mock/MockData7ProductionMenus.json --refresh-timestamps`, {
    cwd: resolve(__dirname, '../../..'), env: { ...process.env, FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST }, stdio: 'ignore', timeout: 60000,
  });
}

const login = async user => need(await call('server-serverLogin', { restaurantId: RID, username: `${user}@meg.test`, password: '1234' }), `${user} login`);
const seat = async n => {
  await patchDoc(`tables/${T(n)}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  return need(await call('table-validateOTP', { restaurantId: RID, tableId: T(n), otp: '123456', phoneNumber: '9876543210', name: `Cancel ${n}` }), `seat ${n}`).sessionId;
};
const order = async (n, guest, items) => {
  for (const id of items) need(await call('cart-addItemToCart', { restaurantId: RID, tableId: T(n), menuItemId: id, quantity: 1, sessionId: guest }), `add ${id}`);
  return need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(n), sessionId: guest }), `checkout ${n}`).orderId;
};
const linesOf = async guest => (await listCol('lines')).filter(l => l.sessionId === guest);
const kitchenItems = async (kitchen, orderId) => {
  const r = need(await call('order-getActiveCartsForKitchen', { restaurantId: RID, sessionId: kitchen }), 'kitchen read');
  const o = (r.orders || []).find(x => x.orderId === orderId);
  return o ? o.carts.flatMap(c => c.items.map(i => i.menuItemId)) : [];
};

export default async function waiterCancelSuite() {
  const results = { name: 'waiter-cancel', pass: 0, fail: 0, tests: [] };
  const check = (label, cond, actual) => {
    results.tests.push({ pass: Boolean(cond), message: `${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual });
    cond ? results.pass++ : results.fail++;
  };
  const scene = async (label, fn) => { try { await fn(); } catch (e) { check(`${label}: setup failed — ${e.message}`, false); } };

  await wipeAndImport();
  const waiter = await login('server');
  const kitchen = (await login('kitchen')).sessionId;
  const till = (await login('till')).sessionId;
  const preview = async draftId => need(await call('billing-preview', { restaurantId: RID, sessionId: till, draftId }), `preview ${draftId}`);

  // ── D4-1 ── 20:10 table 2 sends Chicken 65 + Butter Naan in one round; the kitchen starts it; the guest drops the naan.
  // The waiter cancels the naan alone: off the kitchen screen and the till bill (37500 → 30900), a P0 row, no PIN.
  await scene('D4-1', async () => {
    const g = await seat(2);
    const orderId = await order(2, g, [C65, NAAN]);
    need(await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'PREPARING', sessionId: kitchen }), 'kitchen starts');
    check('D4-1 setup: the table previews at 37500', (await preview(g)).payable === 37500, await preview(g));
    const naan = (await getDoc(`orders/${orderId}`)).carts[0].items.find(i => i.menuItemId === NAAN);
    const r = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'CANCELLED', cartItemId: naan.cartItemId, sessionId: waiter.sessionId });
    check('D4-1 the waiter cancels the naan alone, no PIN', ok(r), r);
    const lines = await linesOf(g);
    check('D4-1 the naan line stops counting, the Chicken 65 line still counts',
      lines.find(l => l.menuItemId === NAAN)?.countsTowardTotal === false && lines.find(l => l.menuItemId === C65)?.countsTowardTotal === true, lines.map(l => [l.menuItemId, l.countsTowardTotal]));
    check('D4-1 the till bill drops to the Chicken 65 alone: 30900', (await preview(g)).payable === 30900, await preview(g));
    check('D4-1 the kitchen still cooks the Chicken 65 and no longer sees the naan', JSON.stringify(await kitchenItems(kitchen, orderId)) === JSON.stringify([C65]), await kitchenItems(kitchen, orderId));
    const cart = (await getDoc(`orders/${orderId}`)).carts[0];
    check('D4-1 the round is still PREPARING; only the naan reads CANCELLED', cart.status === 'PREPARING' && cart.items.map(i => i.status).join() === 'PREPARING,CANCELLED', cart);
    const naanLine = lines.find(l => l.menuItemId === NAAN);
    const row = (await listCol('audit')).find(a => a.lineId === naanLine.lineId && a.action === 'void');
    check('D4-1 one P0 void row names the waiter, at the naan\'s price 6000', row?.sev === 'P0' && row?.staffId === waiter.serverId && row?.amount === 6000, row);
  });

  // ── D4-2 ── Table 3 sends Chicken 65 + Butter Naan, then leaves; the waiter taps Cancel Order (TD-089).
  await scene('D4-2', async () => {
    const g = await seat(3);
    const orderId = await order(3, g, [C65, NAAN]);
    const r = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'CANCELLED', sessionId: waiter.sessionId });
    check('D4-2 the waiter cancels the whole order', ok(r), r);
    const lines = await linesOf(g);
    check('D4-2 TD-089: both lines leave the bill', lines.length === 2 && lines.every(l => l.countsTowardTotal === false), lines.map(l => [l.menuItemId, l.countsTowardTotal]));
    const o = await getDoc(`orders/${orderId}`);
    check('D4-2 the order and its round read CANCELLED', o.orderStatus === 'CANCELLED' && o.carts[0].status === 'CANCELLED', [o.orderStatus, o.carts[0].status]);
    check('D4-2 the kitchen no longer sees it', (await kitchenItems(kitchen, orderId)).length === 0);
    check('D4-2 the order total the guest app shows is 0', o.priceInfo?.finalPrice === 0 && o.priceInfo?.basePrice === 0, o.priceInfo);
    const rows = (await listCol('audit')).filter(a => lines.some(l => l.lineId === a.lineId) && a.action === 'void');
    check('D4-2 one void row per dish, naming the waiter', rows.length === 2 && rows.every(a => a.staffId === waiter.serverId), rows);
  });

  // ── D4-3 ── Table 6's naan bill A-… (6600) is printed; the waiter's cancel is refused, naming the bill, and nothing
  // changes. Then the table pays; still refused. Only the till's Edit bill changes a printed bill (D2).
  await scene('D4-3', async () => {
    const g = await seat(6);
    const orderId = await order(6, g, [NAAN]);
    const bill = need(await call('billing-issue', { restaurantId: RID, sessionId: till, draftId: g, cid: `wc_${g}_${Date.now()}`, expectedV: await draftVersions(RID, g) }), 'issue');
    check('D4-3 setup: the naan bills at 6600', bill.payable === 6600, bill);
    const label = `${bill.series}-${bill.number}`;
    const refusal = `Bill ${label} is printed — ask the cashier to edit it on the till`;
    const r = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'CANCELLED', sessionId: waiter.sessionId });
    check(`D4-3 Cancel Order on the printed bill is refused: "${refusal}"`, !ok(r) && r.message === refusal, r);
    const naan = (await getDoc(`orders/${orderId}`)).carts[0].items[0];
    const r2 = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'CANCELLED', cartItemId: naan.cartItemId, sessionId: waiter.sessionId });
    check('D4-3 cancelling the one dish is refused the same way', !ok(r2) && r2.message === refusal, r2);
    const [line] = await linesOf(g);
    const o = await getDoc(`orders/${orderId}`);
    check('D4-3 nothing changed: the line counts, the order is live', line.countsTowardTotal === true && o.orderStatus !== 'CANCELLED' && o.carts[0].status === 'PENDING', [line.countsTowardTotal, o.orderStatus, o.carts[0].status]);
    need(await call('payments-take', { restaurantId: RID, sessionId: till, billId: bill.billId, paymentId: `wc_pay_${Date.now()}`, tenderId: 'cash', amount: 6600, tendered: 6600 }), 'pay');
    const r3 = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'CANCELLED', sessionId: waiter.sessionId });
    check('D4-3 after the table pays, still refused', !ok(r3) && r3.message === refusal, r3);
  });

  // ── D4-4 ── Table 10 sends Chicken 65 + Coastal Crab Roast: 90000 earns the "₹100 off (min ₹499)" order offer,
  // 90000 − 10000 = 80000 + 4000 SC = 84000 + 4200 tax = 88200. The crab is cancelled: Chicken 65 alone is 28000,
  // under the ₹499 minimum, so the offer goes too and the bill is 30900. (Found in the browser run: the round's own
  // total kept the crab, so the ₹100 stayed and the bill read 19800.)
  await scene('D4-4', async () => {
    const g = await seat(10);
    const orderId = await order(10, g, [C65, 'mi_crab_roast']);
    check('D4-4 setup: the offer fires, 88200', (await preview(g)).payable === 88200, await preview(g));
    const crab = (await getDoc(`orders/${orderId}`)).carts[0].items.find(i => i.menuItemId === 'mi_crab_roast');
    need(await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'CANCELLED', cartItemId: crab.cartItemId, sessionId: waiter.sessionId }), 'cancel crab');
    const o = await getDoc(`orders/${orderId}`);
    check('D4-4 the order no longer carries the offer the crab earned', !o.appliedOffer, o.appliedOffer);
    check('D4-4 the till bill is the Chicken 65 alone: 30900', (await preview(g)).payable === 30900, await preview(g));
  });

  // ── TD-092 ── Table 9's naan is READY on the pass; nothing completes the order until it is served.
  await scene('TD-092', async () => {
    const g = await seat(9);
    const orderId = await order(9, g, [NAAN]);
    need(await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'READY', sessionId: kitchen }), 'ready');
    const r = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'COMPLETED', sessionId: waiter.sessionId });
    check('TD-092 COMPLETED with the naan still READY is refused, naming the round', !ok(r) && r.message === 'Round 1 is still READY — serve or cancel it first', r);
    check('TD-092 the kitchen and the waiter still see it', (await kitchenItems(kitchen, orderId)).includes(NAAN));
    // D4: the kitchen strikes a round, never a whole order.
    const k = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'CANCELLED', sessionId: kitchen });
    check('D4 the kitchen login cannot cancel an order', !ok(k) && /waiter or the cashier/.test(k.message || ''), k);
  });

  return results;
}
