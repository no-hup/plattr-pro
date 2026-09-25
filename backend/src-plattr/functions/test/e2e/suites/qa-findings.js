/**
 * Suite: qa-findings. The QA findings of 2026-09-25 that only show when the REAL writers produce the state
 * (TESTING.md "Seams are tested from the real writer"): guest OTP → cart → checkout → billing-issue →
 * payments-take → floor-clear, on MockData7's res_meghana, the restaurant and menu the QA runs used.
 * Rules with pure logic are unit tests in test/unit/qa/. Fix plan: moonshot/reviews/2026-09-25-qa-fix-plan.md.
 *
 * Each open finding is recorded with `knownBug: '<id>'` (run.js): listed, not failed, while the bug is there;
 * a failure the day it passes, so the mark is removed with the fix.
 *
 * Own state: the suite wipes res_meghana's sittings, orders, lines, bills, carts, payments and audit rows,
 * then re-imports MockData7 on top (no --clean, nothing else is touched). Tables 2, 3, 7, 8, 9, 10, 11, 12 only.
 *
 * Hand-computed at Meghana (5 % service charge, GST 5 % exclusive, bills round to the rupee):
 *   Butter Naan 6000 → 6000 + 300 SC = 6300 + 2 × 157.5 tax = 6615 → bill 6600 (the QA run's ₹66.00)
 *   Chicken 65 28000 + Coastal Crab Roast 62000, FLAT ₹100 order offer → the QA run's ₹882.00 (88200)
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../lib/config.js';
import { call, fsFor, draftVersions, errOf } from '../lib/rest.mjs';

const RID = 'res_meghana';
const PIN = '1234';
const NAAN = 'mi_butter_naan';
const T = n => `tbl_meg_${n}`;
const { getDoc, patchDoc, listCol, delDoc } = fsFor(RID);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ok = r => r?.status === 'success' || r?.success === true;
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };

async function wipeAndImport() {
  for (const col of ['sessions', 'lines', 'bills', 'orders', 'carts', 'payments', 'audit']) {
    for (let docs = await listCol(col, 300); docs.length; docs = await listCol(col, 300)) for (const d of docs) await delDoc(`${col}/${d.id}`);
  }
  execSync(`node "${resolve(__dirname, '../../../mock/importMockData5.js')}" --file=mock/MockData7ProductionMenus.json --refresh-timestamps`, {
    cwd: resolve(__dirname, '../../..'), env: { ...process.env, FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST }, stdio: 'ignore', timeout: 60000,
  });
}

let qf1Bill;   // D1: table 7's walked-out bill, paid later by the returning guest
let till;   // the cashier's login: till@ is a MANAGER (CLAUDE.md "the app's own name is the username")
const seat = async n => {
  await patchDoc(`tables/${T(n)}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const r = await call('table-validateOTP', { restaurantId: RID, tableId: T(n), otp: '123456', phoneNumber: '9876543210', name: `QA ${n}` });
  return need(r, `seat ${n}`).sessionId;
};
const order = async (n, guest, items) => {
  for (const id of items) need(await call('cart-addItemToCart', { restaurantId: RID, tableId: T(n), menuItemId: id, quantity: 1, sessionId: guest }), `add ${id}`);
  return need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(n), sessionId: guest }), `checkout ${n}`).orderId;
};
const issue = async (draftId, extra = {}) => need(await call('billing-issue', { restaurantId: RID, sessionId: till, draftId, cid: `qa_${draftId}_${Date.now()}`, expectedV: await draftVersions(RID, draftId), ...extra }), `issue ${draftId}`);
const preview = async draftId => need(await call('billing-preview', { restaurantId: RID, sessionId: till, draftId }), `preview ${draftId}`);
const walkOut = (n, cid) => call('floor-clear', { restaurantId: RID, staffSessionId: till, tableId: T(n), cid, reason: 'guest left', note: 'walk-out', pin: PIN });

export default async function qaFindingsSuite() {
  const results = { name: 'qa-findings', pass: 0, fail: 0, tests: [] };
  // knownBug: see run.js. The runner re-counts these; here they count like any other test.
  const check = (label, cond, actual, knownBug) => {
    results.tests.push({ pass: Boolean(cond), message: `${knownBug ? `[known bug] ${knownBug} ` : ''}${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual, knownBug });
    cond ? results.pass++ : results.fail++;
  };
  const scene = async (label, fn) => { try { await fn(); } catch (e) { check(`${label}: setup failed — ${e.message}`, false); } };

  await wipeAndImport();
  till = need(await call('server-serverLogin', { restaurantId: RID, username: 'till@meg.test', password: '1234' }), 'till login').sessionId;

  // ── QF-1 · P0 ── 21:10 the couple at 7 walks out on printed bill 6600; 21:30 a family sits at 7 and orders a
  // naan (6000). R9 / FL-S1: the family's 6000 is on a tile of table 7.
  await scene('QF-1', async () => {
    const couple = await seat(7);
    await order(7, couple, [NAAN]);
    const bill = await issue(couple);
    check('QF-1 setup: the couple\'s naan bills at 6600', bill.payable === 6600, bill);
    const out = await walkOut(7, 'qa_qf1_walkout');
    check('QF-1 setup: walk-out with the PIN frees table 7', ok(out) && (out.data?.freed || []).includes(T(7)), out);
    const family = await seat(7);
    await order(7, family, [NAAN]);
    const tiles = need(await call('floor-get', { restaurantId: RID, staffSessionId: till }), 'floor-get').tiles;
    const t7 = tiles.filter(t => t.tableIds.includes(T(7)));
    check('FL R9: the new party at walked-out table 7 shows its 6000 on the floor', t7.some(t => t.onTable === 6000), t7);
    // D1 / TD-064: the walked-out bill owes nothing on the floor, so no tile of table 7 still reads 6600 due.
    check('D1 TD-064: table 7 no longer shows the walked-out 6600 due', !t7.some(t => t.unpaid === 6600), t7);
    const walked = await getDoc(`bills/${bill.billId}`);
    check('D1: the bill keeps its number and reads walkedOut for 6600', walked?.status === 'walkedOut' && walked?.walkedOut?.amount === 6600 && walked?.number === bill.number, walked);
    qf1Bill = bill;
  });

  // ── QF-6 · P2 ── Table 10's 6600 bill is printed, then they order a naan (6000), then walk out. The P0 row
  // "owed" is the amount abandoned: the bill 6600 plus what the naan would bill at, 6600 → 13200.
  // Today it is 6600 + 6000 = 12600, a post-tax figure plus a pre-tax one.
  await scene('QF-6', async () => {
    const g = await seat(10);
    await order(10, g, [NAAN]);
    await issue(g);
    await order(10, g, [NAAN]);
    need(await walkOut(10, 'qa_qf6_walkout'), 'walk-out 10');
    const row = await getDoc('audit/qa_qf6_walkout_clear');
    check('ST: the walk-out audit row records the abandoned amount as it would be billed, 13200', row?.owed === 13200, row);
    const mine = (await listCol('bills')).filter(b => b.sittingId === g);
    check('D1 Q1-2: the naan never billed became its own numbered bill; both walked out, 6600 each', mine.length === 2 && mine.every(b => b.status === 'walkedOut' && b.walkedOut?.amount === 6600), mine.map(b => [b.number, b.status, b.walkedOut?.amount]));
  });

  // ── D1 · DC-S25a ── the day view shows the walk-outs on their own line: QF-1's 6600 and QF-6's two, 19800 · 3 bills.
  // The QF-1 guest comes back and pays 6600 cash on the walked-out bill (Q1-3): it turns paid and leaves the line.
  await scene('D1 day close', async () => {
    const day = async () => need(await call('dayClose-get', { restaurantId: RID, sessionId: till }), 'dayClose-get');
    const v = await day();
    check('D1 DC-S25a: day close shows "walked out 19800 · 3 bills"', v.walkouts?.amount === 19800 && v.walkouts?.count === 3, v.walkouts);
    // TD-073: what blocks the close is the bills still `issued` (DC R5); the three walked-out ones are not among them.
    const issuedNow = (await listCol('bills')).filter(b => b.status === 'issued' && !b.creditNoteOf).length;
    check('D1 TD-073: the close counts only issued bills as open, never the walked-out ones', v.floor?.issuedBills === issuedNow, { floor: v.floor, issuedNow });
    const back = await call('payments-take', { restaurantId: RID, sessionId: till, billId: qf1Bill.billId, paymentId: `qa_d1_back_${Date.now()}`, tenderId: 'cash', tendered: 6600 });
    const after = await getDoc(`bills/${qf1Bill.billId}`);
    check('D1 Q1-3: the guest who came back pays 6600 on the walked-out bill; it reads paid', ok(back) && after?.status === 'paid' && after?.paidTotal === 6600, { back, status: after?.status });
    const v2 = await day();
    check('D1 DC-S25a: the paid one leaves the walk-out line: 13200 · 2 bills', v2.walkouts?.amount === 13200 && v2.walkouts?.count === 2, v2.walkouts);
  });

  // ── QB-2 · P0 ── Table 11's 6600 bill; one guest pays 3300 cash; the cashier cancels with the PIN.
  // BL "Who can do what": cancel is for an issued, unpaid bill. Refused, and the bill keeps its 3300.
  await scene('QB-2', async () => {
    const g = await seat(11);
    await order(11, g, [NAAN]);
    const bill = await issue(g);
    need(await call('payments-take', { restaurantId: RID, sessionId: till, billId: bill.billId, paymentId: `qa_qb2_${Date.now()}`, tenderId: 'cash', amount: 3300, tendered: 3300 }), 'take 3300');
    const r = await call('billing-cancel', { restaurantId: RID, sessionId: till, cid: 'qa_qb2_cancel', billId: bill.billId, reason: 'other', pin: PIN });
    const after = await getDoc(`bills/${bill.billId}`);
    check('BL: a bill with 3300 cash on it cannot be cancelled, and stays issued', !ok(r) && errOf(r).code !== undefined && after?.status === 'issued', { r, status: after?.status, paidTotal: after?.paidTotal });
    check('D3: the refusal names the bill and the money, "₹33 already paid on A-…"', /^₹33 already paid on A-\d{4} — take the rest first$/.test(r.message || ''), r);
    // D3 / FL R18: the table orders a second naan while the bill is part-paid. The round waits, on the real checkout.
    for (const id of [NAAN]) need(await call('cart-addItemToCart', { restaurantId: RID, tableId: T(11), menuItemId: id, quantity: 1, sessionId: g }), `add ${id}`);
    const round = await call('cart-checkoutCart', { restaurantId: RID, tableId: T(11), sessionId: g });
    check('D3: a round on the part-paid table waits, "A-… is being paid — finish the payment, then add"', !ok(round) && /is being paid — finish the payment, then add$/.test(round.message || ''), round);
  });

  // ── QB-1 · P0 ── Table 12: Chicken 65 + Coastal Crab Roast, the ₹100 order offer fires, 88200. The crab is
  // split onto its own draft. However the offer is treated (dropped, D 2026-09-15; or apportioned), the two
  // halves never add up to less than the unsplit 88200. Today each half takes the full ₹100 (QA: 19800 + 57300).
  await scene('QB-1', async () => {
    const g = await seat(12);
    await order(12, g, ['mi_chicken65', 'mi_crab_roast']);
    const whole = await preview(g);
    check('QB-1 setup: the unsplit table previews at 88200', whole.payable === 88200, whole);
    const crab = (await listCol('lines')).find(l => l.sessionId === g && l.menuItemId === 'mi_crab_roast');
    need(await call('billing-split', { restaurantId: RID, sessionId: till, cid: 'qa_qb1_split', draftId: g, moves: [{ lineId: crab.lineId, toDraftId: `${g}_b` }] }), 'split');
    const a = await preview(g), b = await preview(`${g}_b`);
    check('BL-S12: the split halves add up to at least the unsplit 88200', a.payable + b.payable >= 88200, { a: a.payable, b: b.payable });
    // D2: the ₹100 is shared by value over the whole order. Chicken floor(10000 × 28000 ÷ 90000) = 3111, crab 6889.
    // A 24889 + SC 1244 = 26133 + 1306 tax = 27439 → 27400; B 55111 + SC 2755 = 57866 + 2894 = 60760 → 60800. Sum 88200.
    check('D2 BL-S12: the halves take 3111 and 6889 of the ₹100 and come to 27400 + 60800 = 88200', a.discount?.amount === 3111 && b.discount?.amount === 6889 && a.payable === 27400 && b.payable === 60800, { a: [a.discount?.amount, a.payable], b: [b.discount?.amount, b.payable] });
  });

  // ── QB-12 · P2 ── Table 8: a naan comped in full for a birthday (the till sends amount 6000, pct 100).
  // The P0 audit row says what was given: amount 6000, pct 100. Today pct is 0.
  await scene('QB-12', async () => {
    const g = await seat(8);
    await order(8, g, [NAAN]);
    const cid = `qa_qb12_${Date.now()}`;
    const bill = need(await call('billing-issue', { restaurantId: RID, sessionId: till, draftId: g, cid, expectedV: await draftVersions(RID, g), discount: { amount: 6000, pct: 100, source: { reason: 'birthday', note: '' } }, pin: PIN }), 'comp');
    check('QB-12 setup: the comped bill is paid at 0', bill.payable === 0 && bill.status === 'paid', bill);
    const row = (await listCol('audit')).find(a => a.cid === cid && a.action === 'billDiscount');
    check('ST: the comp audit row reads amount 6000, pct 100', row?.amount === 6000 && row?.pct === 100, row, 'QB-12');
  });

  // ── D2 · Edit bill, on the real writers ── 22:10 table 3's naan is billed 6600; they order a second naan. Edit: the
  // bill is cancelled as "edited" with no PIN and one P1 row; the draft previews both naans at 13200 (12000 + SC 600 =
  // 12600 + 630 tax = 13230 → 13200) and the new bill says it replaces the old one. Once 13200 is paid, a third naan is
  // refused "table 3 has paid — clear it first", and so is a stranger scanning table 3.
  await scene('D2', async () => {
    const g = await seat(3);
    await order(3, g, [NAAN]);
    const first = await issue(g);
    await order(3, g, [NAAN]);
    const e = await call('billing-edit', { restaurantId: RID, sessionId: till, cid: `qa_d2_edit_${Date.now()}`, billId: first.billId });
    const row = await getDoc(`audit/${first.billId}_edit`);
    check('D2 BL-S9: Edit needs no PIN, cancels the bill as "edited", and writes one P1 bill.edit row with its payable', ok(e) && e.data?.status === 'cancelled' && e.data?.cancelled?.reason === 'edited' && row?.sev === 'P1' && row?.action === 'bill.edit' && row?.amount === 6600, { e, row });
    const second = await issue(g);
    const label = `${first.series}-${first.number}`;
    check('D2 BL-S25: the new bill carries both naans, 13200, and says it replaces the edited one', second.payable === 13200 && second.replaces?.[0]?.number === label, second);
    const old = await getDoc(`bills/${first.billId}`);
    check('D2 BL-S25: the edited bill lists what replaced it', old?.replacedBy?.[0]?.billId === second.billId, old?.replacedBy);
    need(await call('payments-take', { restaurantId: RID, sessionId: till, billId: second.billId, paymentId: `qa_d2_pay_${Date.now()}`, tenderId: 'cash', tendered: 13200 }), 'take 13200');
    need(await call('cart-addItemToCart', { restaurantId: RID, tableId: T(3), menuItemId: NAAN, quantity: 1, sessionId: g }), 'add after paid');
    const late = await call('cart-checkoutCart', { restaurantId: RID, tableId: T(3), sessionId: g });
    check('D2 FL-S14: a round on the paid table is refused "table 3 has paid — clear it first"', !ok(late) && late.message === 'table 3 has paid — clear it first', late);
    const stranger = await call('table-validateOTP', { restaurantId: RID, tableId: T(3), otp: '123456', phoneNumber: '9876543211', name: 'Stranger' });
    check('D2 FL-S14 / TD-120: a stranger scanning the paid table is refused, not joined', !ok(stranger) && /table 3 has paid — clear it first/.test(stranger.message || ''), stranger);
  });

  // ── D5 · the guest's shared cart asks what to send ── table 9: Asha's phone adds Chicken 65 (28000), Bhanu's a
  // Butter Naan (6000), the captain a Coastal Crab Roast (62000). Asha's phone shows "Your dishes ₹280 · Table ₹340" and
  // sends all [1, 2]. Meanwhile Bhanu adds a Paneer 65 (#4). Exactly Chicken 65 + Naan go (34000, under the ₹499 offer:
  // 34000 + SC 1700 = 35700 + 2 × 892.5 tax = 37485 → the draft previews 37500). The crab (staff) and the paneer (added
  // after the read) stay. Had the crab been swept, the round would be 96000 and take the FLAT ₹100 offer.
  await scene('D5', async () => {
    const g = await seat(9);
    const A = 'dev_qa_d5_asha', B = 'dev_qa_d5_bhanu';
    const add = (menuItemId, addedBy, sessionId = g) => call('cart-addItemToCart', { restaurantId: RID, tableId: T(9), menuItemId, quantity: 1, sessionId, addedBy });
    const send = (addedBy, cartItemIds, sessionId = g) => call('cart-checkoutCart', { restaurantId: RID, tableId: T(9), sessionId, ...(addedBy ? { addedBy } : {}), ...(cartItemIds ? { cartItemIds } : {}) });
    const captain = need(await call('server-serverLogin', { restaurantId: RID, username: 'server@meg.test', password: '1234' }), 'captain login').sessionId;
    const open = need(await call('table-openTable', { restaurantId: RID, sessionId: captain, tableId: T(9) }), 'captain opens 9');
    check('D5 setup: the captain joins the guests\' sitting on 9', open.sessionId === g && open.addedBy.startsWith('staff:'), open);
    need(await add('mi_chicken65', A), 'Asha adds Chicken 65');
    need(await add(NAAN, B), 'Bhanu adds naan');
    need(await add('mi_crab_roast', open.addedBy), 'captain adds crab');
    const shown = (await getDoc(`carts/${T(9)}`)).items.map(i => [i.cartItemId, i.addedBy, i.priceInfo.finalPrice]);
    check('D5 setup: the cart is #1 Asha 280, #2 Bhanu 60, #3 the captain 620', JSON.stringify(shown) === JSON.stringify([[1, A, 280], [2, B, 60], [3, open.addedBy, 620]]), shown);
    need(await add('mi_paneer65', B), 'Bhanu adds paneer after Asha\'s phone read the cart');

    const staffRefused = await send(A, [1, 3]);
    check('D5: the captain\'s crab is refused from a guest send, naming it', !ok(staffRefused) && staffRefused.message === "Coastal Crab Roast was added by staff — only guests' dishes can be sent from here", staffRefused);
    const gone = await send(A, [1, 2, 99]);
    check('D5: an id not in the cart is refused "Your table\'s order changed"', !ok(gone) && gone.message === "Your table's order changed — check the cart and send again", gone);
    const anon = await send(null, [1, 2]);
    check('D5: ids without the sending phone are refused (never placed as "system")', !ok(anon) && /addedBy/.test(anon.message || ''), anon);
    check('D5: the refusals wrote nothing: still 4 dishes in the cart, no order', (await getDoc(`carts/${T(9)}`)).items.length === 4 && !(await listCol('orders')).some(o => o.sessionId === g), null);

    const all = need(await send(A, [1, 2]), 'Asha sends all 2');
    const order = await getDoc(`orders/${all.orderId}`);
    check('D5: "Send all" sends exactly Chicken 65 + Naan, 340, no offer, each keeping its owner', JSON.stringify(order.carts[0].items.map(i => [i.menuItemId, i.addedBy])) === JSON.stringify([['mi_chicken65', A], [NAAN, B]]) && order.priceInfo.finalPrice === 340 && !order.appliedOffer, order);
    const left = (await getDoc(`carts/${T(9)}`)).items.map(i => i.cartItemId);
    check('D5: the crab (#3) and the paneer added meanwhile (#4) stay in the cart', JSON.stringify(left) === '[3,4]', left);
    const lines = (await listCol('lines')).filter(l => l.sessionId === g);
    check('D5: two line snapshots, placed by Asha\'s phone', lines.length === 2 && lines.every(l => l.placedBy === A), lines);
    const kitchenSess = need(await call('server-serverLogin', { restaurantId: RID, username: 'kitchen@meg.test', password: '1234' }), 'kitchen login').sessionId;
    const k = await call('order-getActiveCartsForKitchen', { restaurantId: RID, sessionId: kitchenSess });
    const kCarts = (k.data?.orders || []).find(o => o.orderId === all.orderId)?.carts || [];
    check('D5: the kitchen gets one round of exactly those two dishes', kCarts.length === 1 && kCarts[0].items.length === 2, kCarts);
    const p = await preview(g);
    check('D5: the till previews the round at 37500 (34000 + SC 1700 + tax 1785 = 37485, rounded)', p.payable === 37500, p);

    const captainSend = await call('cart-checkoutCart', { restaurantId: RID, tableId: T(9), sessionId: g, addedBy: open.addedBy });
    check('D5: the captain\'s own Send still sends his crab', ok(captainSend) && JSON.stringify((await getDoc(`carts/${T(9)}`)).items.map(i => i.cartItemId)) === '[4]', captainSend);
    need(await add('mi_paneer65', A), 'Asha adds her own paneer');
    const mineIds = (await getDoc(`carts/${T(9)}`)).items.filter(i => i.addedBy === B).map(i => i.cartItemId);
    check('D5: Asha\'s new paneer is #5, not a reused id', JSON.stringify((await getDoc(`carts/${T(9)}`)).items.map(i => i.cartItemId)) === '[4,5]', null);
    need(await send(B, mineIds), 'Bhanu sends his 1 dish');
    const after = (await getDoc(`carts/${T(9)}`)).items.map(i => [i.cartItemId, i.addedBy]);
    check('D5: "Send your 1 dish" sends Bhanu\'s paneer only; Asha\'s stays', JSON.stringify(after) === JSON.stringify([[5, A]]), after);
  });

  // ── TD-140 (QA2-4) ── 20:10 the manager deletes Butter Naan; table 2 already has a naan (Bhanu's) and a Chicken 65
  // (Asha's) in the cart. "Send all" is refused, naming the naan, and nothing reaches the kitchen. Asha's own send
  // goes: Chicken 65 28000 + SC 1400 = 29400 + 2 × 735 tax = 30870 → the till previews 30900 (₹309).
  // Last scene on purpose: the naan stays deleted until the re-import below.
  await scene('TD-140', async () => {
    const g = await seat(2);
    const A = 'dev_qa_td140_asha', B = 'dev_qa_td140_bhanu';
    const add = (menuItemId, addedBy) => call('cart-addItemToCart', { restaurantId: RID, tableId: T(2), menuItemId, quantity: 1, sessionId: g, addedBy });
    const send = (addedBy, cartItemIds) => call('cart-checkoutCart', { restaurantId: RID, tableId: T(2), sessionId: g, addedBy, cartItemIds });
    need(await add('mi_chicken65', A), 'Asha adds Chicken 65');
    need(await add(NAAN, B), 'Bhanu adds naan');
    const manager = need(await call('server-serverLogin', { restaurantId: RID, username: 'manager@meg.test', password: '1234' }), 'manager login').sessionId;
    need(await call('menu-deleteMenuItem', { restaurantId: RID, sessionId: manager, menuItemId: NAAN }), 'manager deletes Butter Naan');
    const refused = await send(A, [1, 2]);
    check('TD-140: sending a dish deleted from the menu is refused, naming it',
      !ok(refused) && refused.message === 'Cannot checkout. The following items are out of stock: Butter Naan (no longer on the menu)', refused);
    check('TD-140: the refusal wrote nothing: both dishes still in the cart, no order',
      (await getDoc(`carts/${T(2)}`)).items.length === 2 && !(await listCol('orders')).some(o => o.sessionId === g), null);
    need(await send(A, [1]), 'Asha sends her Chicken 65');
    const p = await preview(g);
    check('TD-140: Asha\'s Chicken 65 still goes, and the till previews 30900 (28000 + SC 1400 + tax 1470 = 30870, rounded)', p.payable === 30900, p);
  });

  await wipeAndImport();   // puts the naan back for every suite after this one
  return results;
}
