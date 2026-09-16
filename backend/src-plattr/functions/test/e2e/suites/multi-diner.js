/**
 * Suite: multi-diner — two people on one table, from the first tap to the paid-off order.
 *
 * checkoutCart + createOrUpdateOrder are the two most dangerous functions in the codebase:
 * they turn a shared mutable cart into money. This suite drives them the way a real table
 * does — two phones on one cart, taps landing at the same moment, a dish cancelled after the
 * kitchen already plated one of them — and asserts the invariant that actually matters:
 * nothing a diner ordered is lost, and nothing is billed twice.
 *
 * Runs on `res_e2e_simple_menu`: no offers, no service charge, no variants, so every rupee
 * below is hand-computed and exact.
 *   Grilled Chicken item_simple_1  150      Caesar Salad item_simple_3  100
 *   Pasta Alfredo  item_simple_2   240      Steak        item_simple_4  450
 *
 * The party: Asha (phone `dev_asha`) and Bhanu (phone `dev_bhanu`) at table_clean_1.
 * Seeds and cleans its own tables through the Firestore REST API, so it reruns without a reset.
 *
 * Hand-computed:
 *   MD-1   Asha adds Pasta 240, Bhanu adds Steak 450 → one cart doc, 2 lines, 690, one owner each
 *   MD-2   Bhanu's phone removes Asha's Pasta → permission-denied, cart still 690
 *   MD-3   Asha taps Place order (addedBy dev_asha) → order = [Pasta] 240; cart survives = [Steak] 450
 *   MD-4   Bhanu taps → SAME order (same session), carts 2, order 690, cart doc gone
 *   MD-5   Asha adds Salad 100, taps TWICE at once with one requestId → carts 3, order 790, one retry
 *   MD-6   Asha adds Chicken 150, Bhanu adds Salad 100, both tap at the same moment
 *          → ordered + still-in-cart === 250, nothing doubled  (order 1040 if both land)
 *   MD-7   kitchen takes cart 0 to PREPARING → cart 0's lines PREPARING, cart 1's still PENDING
 *   MD-8   cart 1 → READY, one line of it served by hand, then cart 1 CANCELLED
 *          → the served line stays SERVED, the rest CANCELLED, order drops by 450 → 590
 *   MD-9   CANCELLED → PREPARING refused (terminal)
 *   MD-10  every live cart SERVED → order COMPLETED, table vacated, old session locked out
 *   MD-11  the next party on the same table gets a NEW order, never the last party's
 *   MD-12  Bhanu's Salad goes out of stock → Asha's own round must still leave (table_clean_2)
 *   MD-13  Asha taps with nothing of hers in the cart → refused, Bhanu's line untouched
 *   MD-14  two tables check out at the same instant → two different order numbers
 */
import { call } from '../lib/api.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const RID = 'res_e2e_simple_menu';
const T1 = 'table_clean_1';
const T2 = 'table_clean_2';
const T3 = 'table_clean_3';
const CHICKEN = 'item_simple_1';   // 150
const PASTA   = 'item_simple_2';   // 240
const SALAD   = 'item_simple_3';   // 100
const STEAK   = 'item_simple_4';   // 450
const ASHA = 'dev_asha';
const BHANU = 'dev_bhanu';

const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };
function enc(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
}
function dec(f) {
  if (!f) return undefined;
  if ('nullValue' in f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(dec);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return undefined;
}
const docOf = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
async function seed(path, obj) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
async function getDoc(path) { const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H }); return r.status === 404 ? null : docOf(await r.json()); }
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
async function listCol(col) { const j = await (await fetch(`${FS}/restaurants/${RID}/${col}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...docOf(d) })); }

const ok = r => r?.status === 'success' || r?.success === true;
const isErr = r => r?.status === 'error' || r?._httpStatus >= 400;
const codeOf = r => r?.error?.details?.data?.code || r?.data?.code || r?.error?.code || '';

const add = (tableId, sessionId, menuItemId, addedBy, quantity = 1) =>
  call('cart-addItemToCart', { restaurantId: RID, tableId, menuItemId, quantity, sessionId, addedBy });
const checkout = (tableId, sessionId, extra = {}) =>
  call('cart-checkoutCart', { restaurantId: RID, tableId, sessionId, ...extra });
const cartOf = tableId => getDoc(`carts/${tableId}`);
const ordersOf = async sessionId => (await listCol('orders')).filter(o => o.sessionId === sessionId);

/** Put a table back to vacant with a live OTP and no history, so the suite reruns clean. */
async function freshTable(tableId) {
  await delDoc(`carts/${tableId}`);
  for (const s of await listCol('sessions')) if (s.tableId === tableId) await delDoc(`sessions/${s.id}`);
  for (const o of await listCol('orders')) if (o.tableId === tableId) await delDoc(`orders/${o.id}`);
  await seed(`tables/${tableId}`, {
    number: tableId.toUpperCase(), capacity: 4, status: 'vacant', assignedServerId: null,
    currentOTP: { code: config.TABLE_OTP, expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date() },
  });
}

export default async function multiDinerSuite() {
  const results = { name: 'multi-diner', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── setup ────────────────────────────────────────────────────────
  for (const t of [T1, T2, T3]) await freshTable(t);
  // MD-12 flips this back on at the end; make sure a crashed earlier run left it in stock.
  await seed(`menuItems/${SALAD}`, { ...(await getDoc(`menuItems/${SALAD}`)), isInStock: true });

  let staff;
  try {
    staff = await serverLogin(RID, 'server1@e2e-simple.com', '1234');
  } catch (e) { record(false, `ABORT: staff login failed — ${e.message}`); return results; }

  let sAsha, sBhanu;
  try {
    sAsha = await customerLogin(RID, T1, config.TABLE_OTP, '5551130001', 'Asha');
    sBhanu = await customerLogin(RID, T1, config.TABLE_OTP, '5551130002', 'Bhanu');
  } catch (e) { record(false, `ABORT: guest login failed — ${e.message}`); return results; }

  check('MD-0 two phones on one table join ONE session (the table gets one bill)', sAsha === sBhanu, { sAsha, sBhanu });
  const S = sAsha;

  // ── MD-1 one cart, two owners ───────────────────────────────────
  await add(T1, S, PASTA, ASHA);
  await add(T1, S, STEAK, BHANU);
  {
    const c = await cartOf(T1);
    const items = c?.items || [];
    check('MD-1 the table shares one cart doc with both lines', items.length === 2, items.map(i => i.menuItemId));
    check('MD-1 each line is stamped with the phone that added it',
      items.find(i => i.menuItemId === PASTA)?.addedBy === ASHA && items.find(i => i.menuItemId === STEAK)?.addedBy === BHANU,
      items.map(i => [i.menuItemId, i.addedBy]));
    check('MD-1 cart total 240 + 450 = 690', c?.priceInfo?.finalPrice === 690, c?.priceInfo);
  }

  // ── MD-2 nobody deletes someone else's food ─────────────────────
  {
    const c = await cartOf(T1);
    const ashasLine = (c.items || []).find(i => i.menuItemId === PASTA);
    const resp = await call('cart-removeItemFromCart', { restaurantId: RID, tableId: T1, menuItemId: PASTA, cartItemId: ashasLine.cartItemId, addedBy: BHANU });
    check('MD-2 Bhanu cannot remove Asha\'s Pasta', isErr(resp) && /not yours/i.test(resp.message || ''), resp);
    const after = await cartOf(T1);
    check('MD-2 the cart is untouched after the refusal', (after.items || []).length === 2 && after.priceInfo?.finalPrice === 690, after?.priceInfo);
  }

  // ── MD-3 Asha sends her round; Bhanu is still deciding ──────────
  let orderId;
  {
    const resp = await checkout(T1, S, { addedBy: ASHA });
    check('MD-3 Asha\'s Place order succeeds', ok(resp), resp);
    orderId = resp.data?.orderId;
    const o = orderId ? await getDoc(`orders/${orderId}`) : null;
    check('MD-3 only Asha\'s Pasta left for the kitchen', (o?.items || []).length === 1 && o.items[0].menuItemId === PASTA, (o?.items || []).map(i => i.menuItemId));
    check('MD-3 the order is billed 240, not 690', o?.priceInfo?.finalPrice === 240, o?.priceInfo);
    const c = await cartOf(T1);
    check('MD-3 Bhanu\'s Steak survives in the cart', (c?.items || []).length === 1 && c.items[0].menuItemId === STEAK, c?.items?.map(i => i.menuItemId));
    check('MD-3 the surviving cart is re-priced to 450', c?.priceInfo?.finalPrice === 450, c?.priceInfo);
  }

  // ── MD-4 Bhanu sends his; one table, one bill ───────────────────
  {
    const resp = await checkout(T1, S, { addedBy: BHANU });
    check('MD-4 Bhanu\'s Place order succeeds', ok(resp), resp);
    check('MD-4 it lands on the SAME order, not a second one', resp.data?.orderId === orderId, { got: resp.data?.orderId, want: orderId });
    const o = await getDoc(`orders/${orderId}`);
    check('MD-4 the order now holds two rounds', (o?.carts || []).length === 2, (o?.carts || []).length);
    check('MD-4 the bill is 240 + 450 = 690', o?.priceInfo?.finalPrice === 690, o?.priceInfo);
    check('MD-4 the cart doc is gone once the last line left', (await cartOf(T1)) === null);
    check('MD-4 the session has exactly one order', (await ordersOf(S)).length === 1, (await ordersOf(S)).map(o => o.id));
  }

  // ── MD-5 the double tap: one requestId, two calls at once ───────
  {
    await add(T1, S, SALAD, ASHA);
    const reqId = `req_md5_${Date.now()}`;
    const [a, b] = await Promise.all([
      checkout(T1, S, { addedBy: ASHA, requestId: reqId }),
      checkout(T1, S, { addedBy: ASHA, requestId: reqId }),
    ]);
    const bothAnswered = ok(a) && ok(b);
    check('MD-5 both taps are answered, neither errors', bothAnswered, { a, b });
    check('MD-5 both answers name the same order', a.data?.orderId === orderId && b.data?.orderId === orderId, { a: a.data?.orderId, b: b.data?.orderId });
    check('MD-5 one of the two is flagged as a repeat', (a.data?.retry === true) !== (b.data?.retry === true), { a: a.data?.retry, b: b.data?.retry });
    const o = await getDoc(`orders/${orderId}`);
    check('MD-5 the Salad is cooked once: three rounds, not four', (o?.carts || []).length === 3, (o?.carts || []).length);
    check('MD-5 the bill is 690 + 100 = 790', o?.priceInfo?.finalPrice === 790, o?.priceInfo);
    check('MD-5 the session still has exactly one order', (await ordersOf(S)).length === 1);
  }

  // ── MD-6 two phones tap at the same moment ──────────────────────
  {
    await add(T1, S, CHICKEN, ASHA);   // 150
    await add(T1, S, SALAD, BHANU);    // 100
    const [a, b] = await Promise.all([
      checkout(T1, S, { addedBy: ASHA }),
      checkout(T1, S, { addedBy: BHANU }),
    ]);
    record(true, `MD-6 (context) simultaneous taps answered: Asha=${ok(a) ? 'ok' : codeOf(a) || 'error'}, Bhanu=${ok(b) ? 'ok' : codeOf(b) || 'error'}`);
    const o = await getDoc(`orders/${orderId}`);
    const leftover = await cartOf(T1);
    const billed = o?.priceInfo?.finalPrice || 0;
    const still = leftover?.priceInfo?.finalPrice || 0;
    check('MD-6 nothing lost, nothing doubled: billed + still-in-cart === 790 + 250', billed + still === 1040, { billed, still });
    check('MD-6 the session still has exactly one order', (await ordersOf(S)).length === 1, (await ordersOf(S)).map(x => x.id));
    if (still > 0) {   // one tap lost the race; let it through so the rest of the suite has both lines
      const again = await checkout(T1, S, {});
      record(true, `MD-6 (context) the loser retried and ${ok(again) ? 'landed' : 'failed again'}`);
    }
    const o2 = await getDoc(`orders/${orderId}`);
    check('MD-6 after the retry the whole table is on the bill: 1040', o2?.priceInfo?.finalPrice === 1040, o2?.priceInfo);
    check('MD-6 no cart doc is left behind', (await cartOf(T1)) === null);
  }

  // ── MD-7 the kitchen picks up round 1 only ──────────────────────
  {
    const before = await getDoc(`orders/${orderId}`);
    const cart0 = before.carts[0], cart1 = before.carts[1];
    const resp = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'PREPARING', sessionId: staff });
    check('MD-7 kitchen moves round 1 to PREPARING', ok(resp), resp);
    const o = await getDoc(`orders/${orderId}`);
    check('MD-7 round 1 and every line in it says PREPARING',
      o.carts[0].status === 'PREPARING' && (o.carts[0].items || []).every(i => i.status === 'PREPARING'),
      { cart: o.carts[0].status, items: (o.carts[0].items || []).map(i => i.status) });
    check('MD-7 round 2 is untouched', o.carts[1].status === cart1.status, { now: o.carts[1].status, was: cart1.status });
    check('MD-7 the flat items[] copy moved with it, and only for that round',
      (o.items || []).filter(i => i.cartId === cart0.cartId).every(i => i.status === 'PREPARING') &&
      (o.items || []).filter(i => i.cartId === cart1.cartId).every(i => i.status !== 'PREPARING'),
      (o.items || []).map(i => [i.cartId === cart0.cartId ? 'r1' : 'other', i.status]));
  }

  // ── MD-8 a plate already on the table when the round is cancelled ─
  {
    await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 1, newStatus: 'READY', sessionId: staff });
    const mid = await getDoc(`orders/${orderId}`);
    const cart1 = mid.carts[1];
    const line = (cart1.items || [])[0];
    const served = await call('server-markItemServed', { restaurantId: RID, orderId, menuItemId: line.menuItemId, cartItemId: line.cartItemId, sessionId: staff });
    check('MD-8 the waiter hands over one dish of round 2', ok(served), served);

    const cancel = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 1, newStatus: 'CANCELLED', notes: 'guest changed their mind', sessionId: staff });
    check('MD-8 the rest of round 2 is cancelled', ok(cancel), cancel);
    const o = await getDoc(`orders/${orderId}`);
    const c1 = o.carts[1];
    check('MD-8 the dish already eaten stays SERVED, it is not un-served by a cancel',
      (c1.items || []).find(i => i.cartItemId === line.cartItemId)?.status === 'SERVED',
      (c1.items || []).map(i => [i.cartItemId, i.status]));
    check('MD-8 round 2 is CANCELLED and drops off the bill: 1040 − 450 = 590',
      c1.status === 'CANCELLED' && o.priceInfo?.finalPrice === 590, { status: c1.status, priceInfo: o.priceInfo });
    check('MD-8 the flat items[] copy agrees with the rounds',
      (o.items || []).filter(i => i.cartId === c1.cartId).every(i => i.status === 'CANCELLED' || i.status === 'SERVED'),
      (o.items || []).filter(i => i.cartId === c1.cartId).map(i => i.status));
  }

  // ── MD-9 a cancelled round is final ─────────────────────────────
  {
    const resp = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 1, newStatus: 'PREPARING', sessionId: staff });
    check('MD-9 a cancelled round cannot go back to the kitchen', isErr(resp), resp);
  }

  // ── MD-10 the table pays and leaves ─────────────────────────────
  {
    const o = await getDoc(`orders/${orderId}`);
    for (let i = 0; i < (o.carts || []).length; i++) {
      const s = o.carts[i].status;
      if (s === 'CANCELLED' || s === 'RETURNED' || s === 'SERVED') continue;
      if (s !== 'READY') await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: i, newStatus: 'READY', sessionId: staff });
      await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: i, newStatus: 'SERVED', sessionId: staff });
    }
    const after = await getDoc(`orders/${orderId}`);
    check('MD-10 every live round is SERVED',
      (after.carts || []).every(c => ['SERVED', 'CANCELLED', 'RETURNED'].includes(c.status)),
      (after.carts || []).map(c => c.status));
    const done = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'COMPLETED', sessionId: staff });
    check('MD-10 the order closes', ok(done), done);
    const closed = await getDoc(`orders/${orderId}`);
    check('MD-10 the cancelled round never comes back into the total: 590', closed.priceInfo?.finalPrice === 590, closed.priceInfo);
    const late = await add(T1, S, SALAD, ASHA);
    check('MD-10 the old session cannot order again after the table is closed', isErr(late), late);
  }

  // ── MD-11 the next party is not the last party ──────────────────
  {
    await call('table-validateTableAndLocation', { restaurantId: RID, tableId: T1, userLocation: { latitude: 12.9716, longitude: 77.5946 } });
    let sNext;
    try { sNext = await customerLogin(RID, T1, config.TABLE_OTP, '5551130003', 'Next Party'); }
    catch (e) { record(false, `MD-11 the next party could not scan in — ${e.message}`); }
    if (sNext) {
      check('MD-11 the next party gets a session of its own', sNext !== S, { sNext, S });
      await add(T1, sNext, CHICKEN, 'dev_next');
      const resp = await checkout(T1, sNext, { addedBy: 'dev_next' });
      check('MD-11 their round opens a NEW order', ok(resp) && resp.data?.orderId !== orderId, resp);
      const n = await getDoc(`orders/${resp.data?.orderId}`);
      check('MD-11 they are billed 150, not the last party\'s 590 as well', n?.priceInfo?.finalPrice === 150, n?.priceInfo);
    }
  }

  // ── MD-12 one diner's dish runs out; the other's round must still leave ──
  {
    let sC;
    try { sC = await customerLogin(RID, T2, config.TABLE_OTP, '5551130004', 'Chandan'); }
    catch (e) { record(false, `MD-12 login failed — ${e.message}`); }
    if (sC) {
      await add(T2, sC, PASTA, ASHA);
      await add(T2, sC, SALAD, BHANU);
      await seed(`menuItems/${SALAD}`, { ...(await getDoc(`menuItems/${SALAD}`)), isInStock: false });
      const resp = await checkout(T2, sC, { addedBy: ASHA });
      check('MD-12 Bhanu\'s sold-out Salad does not block Asha\'s Pasta', ok(resp), resp);
      const c = await cartOf(T2);
      check('MD-12 the sold-out line is still sitting in the cart for its owner to deal with',
        ok(resp) ? (c?.items || []).length === 1 && c.items[0].menuItemId === SALAD : true, c?.items?.map(i => i.menuItemId));
      const blocked = await checkout(T2, sC, { addedBy: BHANU });
      check('MD-12 Bhanu\'s own round IS refused while his dish is out of stock', isErr(blocked), blocked);
      await seed(`menuItems/${SALAD}`, { ...(await getDoc(`menuItems/${SALAD}`)), isInStock: true });
    }
  }

  // ── MD-13 an empty round is not an order ────────────────────────
  {
    const c = await cartOf(T2);
    const before = (c?.items || []).length;
    const sC = (await listCol('sessions')).find(s => s.tableId === T2 && s.status === 'active')?.id;
    const resp = await checkout(T2, sC, { addedBy: 'dev_nobody' });
    check('MD-13 a phone with nothing in the cart is refused', isErr(resp), resp);
    const after = await cartOf(T2);
    check('MD-13 the refusal leaves everyone else\'s food alone', (after?.items || []).length === before, { before, after: (after?.items || []).length });
  }

  // ── MD-14 two tables, one instant, two order numbers ────────────
  {
    await freshTable(T3);
    let sA, sB;
    try {
      sB = (await listCol('sessions')).find(s => s.tableId === T2 && s.status === 'active')?.id;
      sA = await customerLogin(RID, T3, config.TABLE_OTP, '5551130005', 'Table Three');
    } catch (e) { record(false, `MD-14 login failed — ${e.message}`); }
    if (sA && sB) {
      await add(T3, sA, STEAK, 'dev_t3');
      await add(T2, sB, CHICKEN, BHANU);
      const [x, y] = await Promise.all([checkout(T3, sA, {}), checkout(T2, sB, {})]);
      check('MD-14 both tables\' rounds land', ok(x) && ok(y), { x, y });
      const nx = x.data?.orderNumber, ny = y.data?.orderNumber;
      check('MD-14 the two orders get different numbers (the counter is not raced)', nx && ny && nx !== ny, { nx, ny });
    }
  }

  return results;
}
