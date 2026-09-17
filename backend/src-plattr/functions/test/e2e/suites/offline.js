/**
 * Suite: offline (OF · Offline & sync). Real Cloud Functions on the emulator.
 * Sheet: moonshot/SPEC_OF_offline_and_sync.md. Seeds through the Firestore REST API (Bearer owner)
 * and deletes its own documents first, so it reruns without a reset.
 *
 * Own fixtures: guest table `table_of` (seeded here with the standard OTP), draft `draft_of`
 * (+ draft_of3, draft_of4), order `order_of`, bills `of_0417` / `of_0418`, staff manager@of.test / captain@of.test.
 *
 * Hand-computed (minor units; food block exclusive CGST 2.5 + SGST 2.5):
 *   OF-S1/S2/S3  guest cart on table_of via cart-addItemToCart + cart-checkoutCart with requestId
 *                two Tiramisu (config.ITEMS.TIRAMISU, 200 rupees each) → one order for the session
 *                retry same requestId → status success, data.retry === true, same orderId, still one order
 *                same requestId, one Whiskey → error failed-precondition /requestId already used/
 *                no requestId → second checkout error failed-precondition /No active cart found/ (today's refusal)
 *   OF-S4        bills/of_0417 payable 184000 issued; take paymentId of_s4 cash tendered 184000 twice
 *                → row once, paidTotal 184000, second answer retry: true
 *   OF-S8        lines of_pizza 50000 + of_coke 8000 on draft_of → preview taxable 58000, tax 1450+1450, payable 60900
 *                estimate recorded 60900 → issue → take paymentId of_s8 tendered 60900 ref 'est:draft_of:20260916T2045:60900'
 *                → bill paid, payments/of_s8.ref === that string, businessDate === server's today (bdFor(Date.now()))
 *   OF-S9        the same take's businessDate is the SERVER's date even when the ref says yesterday's time;
 *                a body businessDate of '2020-01-01' is ignored (PY R14)
 *   OF-S11a      lines of_idli 60000 on draft_of3 → payable 63000; then of_dosa 38000 added → payable 102900
 *                take 63000 → amount 63000, outstanding 39900, bill still 'issued'
 *   OF-S11b      of_idli voided (countsTowardTotal false), of_dosa left → payable 39900; cash tendered 63000
 *                → amount 39900, change 23100, bill 'paid'
 *   OF-S17       bills/of_0418 issued 184000, no take yet → take only 184000 → paid; billing-issue on its draft
 *                → failed-precondition /already issued/ (BL-S7), no second number
 *   OF-S19       draft_of4 lines all voided → preview payable 0; dayClose-move kind 'in' amount 231000
 *                reason 'correction' note 'est:draft_of4:20260916T2045:231000' movementId of_s19 with pin 1234
 *                → movement row amount 231000, audit `of_s19_drawer` sev P0   (a move has no ref field; the note carries it)
 *   OF-S20       approvals-apply action 'estimate' cid 'est_draft_of_20260916T2045' amountMinor 231000 note '...'
 *                → success, audit/est_draft_of_20260916T2045_estimate sev P1 amount 231000; again → retry true, one row;
 *                same cid amountMinor 184000 → failed-precondition; captain → permission-denied without requires
 */
import { call } from '../lib/api.js';
import { customerLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const RID = config.RESTAURANT_ID;
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
const doc = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
async function seed(path, obj) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
async function getDoc(path) { const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H }); return r.status === 404 ? null : doc(await r.json()); }
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
async function listCol(col) { const j = await (await fetch(`${FS}/restaurants/${RID}/${col}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...doc(d) })); }
const errData = r => r?.error?.details?.data || r?.data || {};
const codeOf = r => errData(r).code || r?.error?.code;
const bdFor = (at, h = 4, m = 0, tz = 330) => new Date(at + tz * 60_000 - (h * 60 + m) * 60_000).toISOString().slice(0, 10);

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const line = (lineId, name, list, draftId, extra = {}) => ({
  lineId, cid: 'order_of', orderId: 'order_of', cartId: 'cart_of', cartItemId: lineId, tableId: 'table_of_bill', sessionId: 'sess_of', placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }],
  taxBlocks: { food: FOOD }, offer: null, ...extra,
});
const TABLE = 'table_of';

export default async function offlineSuite() {
  const results = { name: 'offline', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ──
  for (const l of ['of_pizza', 'of_coke', 'of_idli', 'of_dosa', 'of_gone']) await delDoc(`lines/${l}`);
  for (const b of await listCol('bills')) if (/^cid_of/.test(b.cid || '')) await delDoc(`bills/${b.id}`);
  for (const a of await listCol('audit')) if (/^(est_draft_of|of_s19|cid_of)/.test(a.cid || '') || /^est_draft_of/.test(a.id)) await delDoc(`audit/${a.id}`);
  for (const p of ['of_s4', 'of_s8', 'of_s11a', 'of_s11b', 'of_s17']) await delDoc(`payments/${p}`);
  await delDoc('drawerMovements/of_s19');
  for (const k of await listCol('counters')) if (/^(A|CN)_/.test(k.id)) await delDoc(`counters/${k.id}`);
  for (const o of await listCol('orders')) if (o.tableId === TABLE) await delDoc(`orders/${o.id}`);
  await delDoc(`carts/${TABLE}`);
  for (const s of await listCol('sessions')) if (s.tableId === TABLE) await delDoc(`sessions/${s.id}`);
  const inAnHour = new Date(Date.now() + 3600_000);
  await seed(`tables/${TABLE}`, { number: 'OF', capacity: 4, status: 'vacant', currentOTP: { code: config.TABLE_OTP, expiresAt: inAnHour, createdAt: new Date() } });
  await seed('servers/manager_of', { name: 'Manager OF', role: 'MANAGER', status: 'active', email: 'manager@of.test', password: '1234' });
  await seed('servers/captain_of', { name: 'Captain OF', role: 'SERVER', status: 'active', email: 'captain@of.test', password: '1234' });
  const settings = (await getDoc('config/settings')) || {};
  await seed('config/settings', { ...settings, tax: { blocks: { food: FOOD } }, seller: { name: 'E2E Bar', taxId: 'GSTIN_E2E' }, billing: { ...(settings.billing || {}), charges: [] } });
  await seed('orders/order_of', { orderId: 'order_of', tableId: 'table_of_bill', status: 'IN_PROGRESS', paymentStatus: 'unpaid', restaurantId: RID });
  await seed('lines/of_pizza', line('of_pizza', 'Margherita', 50000, 'draft_of'));
  await seed('lines/of_coke', line('of_coke', 'Coke', 8000, 'draft_of'));
  await seed('lines/of_idli', line('of_idli', 'Idli', 60000, 'draft_of3'));
  await seed('lines/of_gone', line('of_gone', 'Thali', 220000, 'draft_of4', { countsTowardTotal: false, void: 'guest left' }));
  await seed('bills/of_0417', { payable: 184000, status: 'issued', cid: 'cid_of17', number: 'of_0417', lines: [{ lineId: 'l17', orderId: 'order_of', countsTowardTotal: true }] });
  await seed('bills/of_0418', { payable: 184000, status: 'issued', cid: 'cid_of18', number: 'of_0418', lines: [{ lineId: 'l18', orderId: 'order_of', countsTowardTotal: true }] });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@of.test');
  const captain = await login('captain@of.test');
  if (!manager || !captain) { record(false, 'ABORT: staff login failed', { manager, captain }); return results; }
  const bill = (fn, sessionId, body) => call(`billing-${fn}`, { restaurantId: RID, sessionId, expectedV: {}, ...body });
  const take = (billId, body) => call('payments-take', { restaurantId: RID, sessionId: manager, billId, tenderId: 'cash', ...body });
  const applyAs = (sessionId, body) => call('approvals-apply', { restaurantId: RID, sessionId, action: 'estimate', cid: 'est_draft_of_20260916T2045', amountMinor: 231000, note: 'cash draft_of 20:45 preview 20:38', ...body });
  const TODAY = bdFor(Date.now());

  // ── OF-S1 / S2 / S3: the guest's Place order tap ──
  {
    let guest;
    try { guest = await customerLogin(RID, TABLE, config.TABLE_OTP, config.CUSTOMER_PHONE, config.CUSTOMER_NAME); }
    catch (e) { record(false, `ABORT OF-S1: guest login on ${TABLE} failed → ${e.message}`); guest = null; }
    if (guest) {
      const add = (menuItemId, quantity) => call('cart-addItemToCart', { restaurantId: RID, tableId: TABLE, menuItemId, quantity, sessionId: guest });
      const checkout = body => call('cart-checkoutCart', { restaurantId: RID, tableId: TABLE, sessionId: guest, ...body });
      const ordersForSession = async () => (await listCol('orders')).filter(o => o.sessionId === guest);

      await add(config.ITEMS.TIRAMISU.id, 2);
      const first = await checkout({ requestId: 'req_of_2041' });
      const orderId = first.data?.orderId;
      check('OF-S1 first checkout with requestId → success, an order, retry false', first.status === 'success' && !!orderId && first.data.retry === false, first);
      const again = await checkout({ requestId: 'req_of_2041' });
      check('OF-S1 same requestId again (cart gone) → success, retry:true, same orderId', again.status === 'success' && again.data?.retry === true && again.data?.orderId === orderId, again);
      const orders = await ordersForSession();
      check('OF-S1 still one order for the session, one cart on it, carts[0].requestId stored', orders.length === 1 && orders[0].carts?.length === 1 && orders[0].carts[0].requestId === 'req_of_2041', orders.map(o => ({ id: o.id, carts: o.carts?.length })));

      await add(config.ITEMS.WHISKEY.id, 1);
      const diff = await checkout({ requestId: 'req_of_2041' });
      check('OF-S2 same requestId, a different cart (one Whiskey) → failed-precondition "requestId already used for a different cart"', codeOf(diff) === 'failed-precondition' && /requestId already used for a different cart/.test(diff.message || ''), diff);
      check('OF-S2 nothing written: one order, one cart, the live cart still holds the whiskey', (await ordersForSession())[0]?.carts?.length === 1 && (await getDoc(`carts/${TABLE}`))?.items?.length === 1, await getDoc(`carts/${TABLE}`));

      const noId = await checkout({});
      check('OF-S3 no requestId → today\'s path: the whiskey checks out as round two (2 carts)', noId.status === 'success' && noId.data?.orderId === orderId && (await ordersForSession())[0]?.carts?.length === 2, noId);
      const noIdAgain = await checkout({});
      check('OF-S3 no requestId, cart gone → failed-precondition "No active cart found for this table." (unchanged)', codeOf(noIdAgain) === 'failed-precondition' && /No active cart found/.test(noIdAgain.message || ''), noIdAgain);
    }
  }

  // ── OF-S4 double Pay ──
  {
    const r = await take('of_0417', { paymentId: 'of_s4', tendered: 184000 });
    const again = await take('of_0417', { paymentId: 'of_s4', tendered: 184000 });
    const rows = (await listCol('payments')).filter(p => p.billId === 'of_0417');
    check('OF-S4 take of_s4 cash 184000 twice → first success, second retry:true, one row, bill paid 184000', r.status === 'success' && again.status === 'success' && again.data?.retry === true && rows.length === 1 && (await getDoc('bills/of_0417'))?.paidTotal === 184000, { r, again, rows });
  }

  // ── OF-S20 the estimate on ST's door ──
  {
    const r = await applyAs(manager, {});
    const row = await getDoc('audit/est_draft_of_20260916T2045_estimate');
    check('OF-S20 manager records estimate 231000 → auditId est_draft_of_20260916T2045_estimate, row sev P1 amount 231000, no pin field', r.status === 'success' && r.data?.auditId === 'est_draft_of_20260916T2045_estimate' && row?.sev === 'P1' && row?.amount === 231000 && row?.action === 'estimate' && !('pin' in (row || {})), { r, row });
    const again = await applyAs(manager, { pin: '1234' });
    const rows = (await listCol('audit')).filter(a => a.cid === 'est_draft_of_20260916T2045');
    check('OF-S20 the same cid again → retry:true, still one row', again.status === 'success' && again.data?.retry === true && rows.length === 1, { again, rows: rows.length });
    const other = await applyAs(manager, { amountMinor: 184000 });
    check('OF-S20 same cid, amountMinor 184000 → failed-precondition, row keeps 231000', codeOf(other) === 'failed-precondition' && (await getDoc('audit/est_draft_of_20260916T2045_estimate'))?.amount === 231000, other);
    const cap = await applyAs(captain, { cid: 'est_draft_of_20260916T2046' });
    check('OF-S20 captain → permission-denied without requires, no row', codeOf(cap) === 'permission-denied' && errData(cap).requires === undefined && (await getDoc('audit/est_draft_of_20260916T2046_estimate')) === null, cap);
  }

  // ── OF-S8 / OF-S9 reconcile the 60900 estimate on draft_of ──
  {
    const pv = await bill('preview', captain, { cid: 'cid_of8', draftId: 'draft_of', tableIds: ['table_of_bill'] });
    check('OF-S8 morning preview of draft_of → payable 60900, tax 1450 + 1450', pv.status === 'success' && pv.data?.payable === 60900 && pv.data?.taxTotal === 2900, pv);
    const is = await bill('issue', manager, { cid: 'cid_of8', draftId: 'draft_of', tableIds: ['table_of_bill'] });
    const billId = is.data?.billId;
    check('OF-S8 issue → a numbered bill, payable 60900', is.status === 'success' && !!billId && is.data?.payable === 60900 && is.data?.status === 'issued', is);
    const tk = await take(billId, { paymentId: 'of_s8', tendered: 60900, ref: 'est:draft_of:20260916T2045:60900', businessDate: '2020-01-01' });
    const pay = await getDoc('payments/of_s8');
    check('OF-S8 take 60900 with the est: ref → bill paid, ref stored', tk.status === 'success' && tk.data?.bill?.status === 'paid' && pay?.ref === 'est:draft_of:20260916T2045:60900', { tk, pay });
    check(`OF-S9 the take is dated by the server (${TODAY}); the body's 2020-01-01 is ignored, the ref keeps 20260916T2045`, pay?.businessDate === TODAY && /20260916T2045/.test(pay?.ref || ''), pay);
  }

  // ── OF-S11a stale-low, OF-S11b stale-high ──
  {
    const pv1 = await bill('preview', captain, { cid: 'cid_of11', draftId: 'draft_of3', tableIds: ['table_of_bill'] });
    check('OF-S11a idli alone → payable 63000 (what the estimate recorded)', pv1.data?.payable === 63000, pv1);
    await seed('lines/of_dosa', line('of_dosa', 'Dosa', 38000, 'draft_of3'));
    const is = await bill('issue', manager, { cid: 'cid_of11', draftId: 'draft_of3', tableIds: ['table_of_bill'] });
    check('OF-S11a morning: idli + dosa → payable 102900', is.data?.payable === 102900, is);
    const tk = await take(is.data?.billId, { paymentId: 'of_s11a', tendered: 63000 });
    check('OF-S11a take 63000 → amount 63000, outstanding 39900, bill still issued', tk.status === 'success' && tk.data?.row?.amount === 63000 && tk.data?.bill?.outstanding === 39900 && tk.data?.bill?.status === 'issued', tk);

    // reverse: the estimate said 63000 (idli), the idli was voided after the cut; only the dosa is owed
    await seed('lines/of_idli', line('of_idli', 'Idli', 60000, 'draft_of5', { countsTowardTotal: false, void: 'guest left' }));
    await seed('lines/of_dosa', line('of_dosa', 'Dosa', 38000, 'draft_of5'));
    const is2 = await bill('issue', manager, { cid: 'cid_of11b', draftId: 'draft_of5', tableIds: ['table_of_bill'] });
    check('OF-S11b dosa alone → payable 39900', is2.data?.payable === 39900, is2);
    const tk2 = await take(is2.data?.billId, { paymentId: 'of_s11b', tendered: 63000 });
    check('OF-S11b cash tendered 63000 → amount 39900, change 23100, bill paid', tk2.status === 'success' && tk2.data?.row?.amount === 39900 && tk2.data?.row?.change === 23100 && tk2.data?.bill?.status === 'paid', tk2);
  }

  // ── OF-S17 issued, then dark ──
  {
    const tk = await take('of_0418', { paymentId: 'of_s17', tendered: 184000 });
    check('OF-S17 take only on the already-issued of_0418 → paid', tk.status === 'success' && tk.data?.bill?.status === 'paid', tk);
    const seeded = { ...line('of_0418_line', 'Thali', 184000, 'draft_of18'), billId: 'of_0418' };
    await seed('lines/of_0418_line', seeded);
    const re = await bill('issue', manager, { cid: 'cid_of18', draftId: 'draft_of18', tableIds: ['table_of_bill'] });
    check('OF-S17 billing-issue on that draft again → failed-precondition already issued, no second number', codeOf(re) === 'failed-precondition' && /already issued/i.test(re.message || ''), re);
    await delDoc('lines/of_0418_line');
  }

  // ── OF-S19 draft gone: nothing to bill, cash booked as a drawer cash-in ──
  {
    const pv = await bill('preview', captain, { cid: 'cid_of19', draftId: 'draft_of4', tableIds: ['table_of_bill'] });
    check('OF-S19 preview of the voided draft → payable 0, nothing to issue', pv.status === 'success' && pv.data?.payable === 0, pv);
    const mv = await call('dayClose-move', { restaurantId: RID, sessionId: manager, movementId: 'of_s19', kind: 'in', amount: 231000, reason: 'correction', note: 'est:draft_of4:20260916T2045:231000', pin: '1234' });
    const row = await getDoc('drawerMovements/of_s19');
    const audit = await getDoc('audit/of_s19_drawer');
    check('OF-S19 dayClose-move in 231000 reason correction, note est:… with PIN → movement 231000, audit of_s19_drawer P0', mv.status === 'success' && row?.amount === 231000 && row?.note === 'est:draft_of4:20260916T2045:231000' && audit?.sev === 'P0', { mv, row, audit });
  }

  return results;
}
