/**
 * Suite: multi-diner-offers — what an offer does when one table's bill arrives in pieces.
 *
 * Cart ownership let one diner check out their own lines and leave everyone else's behind.
 * That quietly changed the input to the offer engine: an offer used to see the whole table's
 * cart in one go, and now it sees a round at a time. The dangerous shapes are
 *   - an offer that needs TWO of something, when the two belong to different people;
 *   - an offer counted once per round instead of once per bill;
 *   - a round that is cancelled after its items already bought the table an offer.
 *
 * `buildOrderPriceInfo` re-evaluates every live round on the order at each checkout
 * (`orders/createOrUpdateOrder.js`), so the claim under test is that a bill split across
 * phones is priced exactly like the same bill placed by one phone.
 *
 * Runs on `res_e2e_offer_configs` — the only restaurant carrying all nine seeded offers —
 * on its own tables, seeded and cleaned here so the suite reruns without a data reset.
 *
 *   Burger  item_burger_1   base 200, 10 % off → 180   (Regular variant adds 0)
 *   Tiramisu item_tiramisu  base 200, no discount → 200
 *   Whiskey item_whiskey_1  base 500, no discount → 500
 *
 * Charges land after the offer: 7.5 % service − 5 % global on the post-offer total.
 *
 * Hand-computed:
 *   MDO-1  Asha's lone burger → the ₹100-capped order offer, bill 80
 *          Bhanu's burger lands on the SAME order → BOGO now qualifies across two phones,
 *          bill 360 − 180 = 180, and the first offer is replaced, not stacked
 *   MDO-2  the leftover cart is re-priced WITHOUT an offer — offers belong to the bill
 *   MDO-3  a split bill costs exactly what the same food costs placed in one tap (180)
 *   MDO-4  cancel Bhanu's round → BOGO no longer qualifies, the bill falls back to one burger
 *   MDO-5  an offer counts once per bill, never once per round
 */
import { call } from '../lib/api.js';
import { customerLogin, serverLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const { RESTAURANT_OFFER_CONFIGS: RID, TABLE_OTP, ITEMS, VARIANTS, OFFERS } = config;

const BURGER = ITEMS.BURGER.id;
const TIRAMISU = ITEMS.TIRAMISU.id;
const REG = { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id };
const ASHA = 'dev_asha';
const BHANU = 'dev_bhanu';
const T_A = 'table_clean_6';   // MDO-1..2, 4..5
const T_B = 'table_clean_7';   // MDO-3 control

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

const add = (tableId, sessionId, menuItemId, addedBy, quantity = 1, selectedVariants) =>
  call('cart-addItemToCart', { restaurantId: RID, tableId, menuItemId, quantity, sessionId, addedBy, ...(selectedVariants ? { selectedVariants } : {}) });
const checkout = (tableId, sessionId, extra = {}) =>
  call('cart-checkoutCart', { restaurantId: RID, tableId, sessionId, ...extra });
const cartOf = tableId => getDoc(`carts/${tableId}`);
const orderOf = async (orderId, sessionId) => (await call('order-getOrder', { restaurantId: RID, orderId, sessionId }))?.data;
const ok = r => r?.status === 'success' || r?.success === true;

async function freshTable(tableId) {
  await delDoc(`carts/${tableId}`);
  for (const s of await listCol('sessions')) if (s.tableId === tableId) await delDoc(`sessions/${s.id}`);
  for (const o of await listCol('orders')) if (o.tableId === tableId) await delDoc(`orders/${o.id}`);
  await seed(`tables/${tableId}`, {
    number: tableId.toUpperCase(), capacity: 4, status: 'vacant', assignedServerId: null,
    currentOTP: { code: TABLE_OTP, expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date() },
  });
}

export default async function multiDinerOffersSuite() {
  const results = { name: 'multi-diner-offers', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  for (const t of [T_A, T_B]) await freshTable(t);

  let S;
  try {
    S = await customerLogin(RID, T_A, TABLE_OTP, '5551140001', 'Asha');
    const sb = await customerLogin(RID, T_A, TABLE_OTP, '5551140002', 'Bhanu');
    check('MDO-0 both phones join the one session this table is billed on', S === sb, { S, sb });
  } catch (e) { record(false, `ABORT: guest login failed — ${e.message}`); return results; }

  // ── MDO-1 · an offer that needs two, when the two belong to two people ─────────────
  await add(T_A, S, BURGER, ASHA, 1, REG);
  await add(T_A, S, BURGER, BHANU, 1, REG);
  {
    const c = await cartOf(T_A);
    check('MDO-1 two burgers sit as two separately owned lines, not one line of qty 2',
      (c?.items || []).length === 2 && (c.items || []).every(i => i.quantity === 1),
      (c?.items || []).map(i => [i.menuItemId, i.addedBy, i.quantity]));
    check('MDO-1 the live cart carries no offer — offers are decided at checkout',
      c?.priceInfo?.finalPrice === 360 && !c?.priceInfo?.offerDiscount, c?.priceInfo);
  }

  const coAsha = await checkout(T_A, S, { addedBy: ASHA });
  check('MDO-1 Asha places her own burger', ok(coAsha), coAsha);
  const orderId = coAsha?.data?.orderId;
  {
    const o = await orderOf(orderId, S);
    check('MDO-1 one burger cannot buy BOGO, so the capped order offer wins instead',
      o?.appliedOffer?.id === OFFERS.MAXDISCOUNT_CAP.id, o?.appliedOffer);
    check('MDO-1 her half of the bill is 180 − 100 = 80', o?.priceInfo?.finalPrice === 80, o?.priceInfo);
  }

  const coBhanu = await checkout(T_A, S, { addedBy: BHANU });
  check('MDO-1 Bhanu places his', ok(coBhanu), coBhanu);
  check('MDO-1 his round joins the same bill', coBhanu?.data?.orderId === orderId, { orderId, got: coBhanu?.data?.orderId });
  {
    const o = await orderOf(orderId, S);
    check('MDO-1 the bill now holds two rounds', (o?.carts || []).length === 2, (o?.carts || []).length);
    check('MDO-1 BOGO qualifies across two phones — the second burger is free even though a different person bought it',
      o?.appliedOffer?.id === OFFERS.BOGO_BURGER.id, o?.appliedOffer);
    check('MDO-1 the earlier offer is REPLACED, not stacked: one discount of 180, not 100 + 180',
      o?.appliedOffer?.discountAmount === 180 && o?.priceInfo?.offerDiscount === 180, o?.priceInfo);
    check('MDO-1 the table pays 360 − 180 = 180', o?.priceInfo?.finalPrice === 180, o?.priceInfo);
    check('MDO-1 charges are computed on the post-offer 180, exactly as for a single-phone bill',
      o?.priceInfo?.chargesTotal === 4.5, o?.priceInfo);
    check('MDO-1 the cart doc is gone once the last owned line left', (await cartOf(T_A)) === null);
  }

  // ── MDO-3 · the control: the same food, one phone, one tap ────────────────────────
  let sSolo;
  try { sSolo = await customerLogin(RID, T_B, TABLE_OTP, '5551140003', 'Solo'); }
  catch (e) { record(false, `MDO-3 setup failed — ${e.message}`); }
  if (sSolo) {
    await add(T_B, sSolo, BURGER, null, 2, REG);
    const co = await checkout(T_B, sSolo);
    const o = await orderOf(co?.data?.orderId, sSolo);
    check('MDO-3 placed in one tap, the same two burgers also land on BOGO',
      o?.appliedOffer?.id === OFFERS.BOGO_BURGER.id, o?.appliedOffer);
    check('MDO-3 a bill split across two phones costs exactly what it costs in one tap: 180 either way',
      o?.priceInfo?.finalPrice === 180, o?.priceInfo);
  }

  // ── MDO-4 · a round cancelled after its items bought the table an offer ───────────
  let staff;
  try { staff = await serverLogin(RID, 'server1@e2e-offer.com', '1234'); }
  catch (e) { record(false, `MDO-4 staff login failed — ${e.message}`); }
  if (staff) {
    const res = await call('cart-updateCartStatus', {
      restaurantId: RID, orderId, cartIndex: 1, newStatus: 'CANCELLED', notes: 'guest changed their mind', sessionId: staff,
    });
    check('MDO-4 the waiter cancels Bhanu\'s round', ok(res), res);
    const o = await orderOf(orderId, S);
    check('MDO-4 with his burger voided BOGO no longer qualifies, so the bill falls back to the capped order offer',
      o?.appliedOffer?.id === OFFERS.MAXDISCOUNT_CAP.id, o?.appliedOffer);
    check('MDO-4 the table is billed for the one burger that stands: 180 − 100 = 80',
      o?.priceInfo?.finalPrice === 80, o?.priceInfo);
    check('MDO-4 a free burger is not still being given away against a cancelled round',
      o?.priceInfo?.offerDiscount === 100, o?.priceInfo);
  }

  // ── MDO-2 / MDO-5 · the leftover cart, and an offer counted once per bill ─────────
  await freshTable(T_A);
  let S2;
  try {
    S2 = await customerLogin(RID, T_A, TABLE_OTP, '5551140004', 'Asha2');
    await customerLogin(RID, T_A, TABLE_OTP, '5551140005', 'Bhanu2');
  } catch (e) { record(false, `MDO-2 setup failed — ${e.message}`); }
  if (S2) {
    await add(T_A, S2, TIRAMISU, ASHA, 10);
    await add(T_A, S2, BURGER, BHANU, 1, REG);
    const co1 = await checkout(T_A, S2, { addedBy: ASHA });
    const oid = co1?.data?.orderId;
    {
      const o = await orderOf(oid, S2);
      check('MDO-5 Asha\'s ten desserts win the capped 50 % dessert offer', o?.appliedOffer?.id === OFFERS.DESSERT_50.id, o?.appliedOffer);
      check('MDO-5 2000 − 500 = 1500', o?.priceInfo?.finalPrice === 1500, o?.priceInfo);
      const c = await cartOf(T_A);
      check('MDO-2 Bhanu\'s burger stays in the cart, re-priced on its own', c?.items?.length === 1 && c?.priceInfo?.finalPrice === 180, c?.priceInfo);
      check('MDO-2 the leftover cart carries NO offer discount — the offer lives on the bill, not the cart',
        !c?.priceInfo?.offerDiscount, c?.priceInfo);
    }
    const co2 = await checkout(T_A, S2, { addedBy: BHANU });
    check('MDO-5 Bhanu places onto the same bill', ok(co2) && co2?.data?.orderId === oid, co2?.data);
    {
      const o = await orderOf(oid, S2);
      check('MDO-5 the dessert cap is applied ONCE to the whole bill, not once per round',
        o?.priceInfo?.offerDiscount === 500, o?.priceInfo);
      check('MDO-5 2000 + 180 − 500 = 1680', o?.priceInfo?.finalPrice === 1680, o?.priceInfo);
    }
  }

  for (const t of [T_A, T_B]) await freshTable(t);
  return results;
}
