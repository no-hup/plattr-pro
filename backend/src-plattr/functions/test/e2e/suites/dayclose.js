// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared. A suite
// that seeds only a plaintext password logs in fine and then fails at every PIN. Same constant
// hash of 1234 the seeds carry.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
/**
 * Suite: dayclose (DC · Day close & cash count). Real Cloud Functions on the emulator.
 *
 * Two kinds of day are exercised, because they prove different things:
 *   · TODAY  — a real bill issued and paid through BL and PY, real drawer movements, then the close.
 *              Expected cash is asserted as a DELTA (what my float and my cash-out did to it), so
 *              other suites' payments on the same date cannot make this suite lie or flake.
 *   · A PAST, empty date — the arithmetic of a short drawer, the PIN over the threshold, the second
 *              close and the retry, none of which can be run twice on one date.
 *
 * Seeds through the Firestore REST API (Bearer owner) and deletes its own documents first, so it
 * reruns without a reset.
 */
import { call } from '../lib/api.js';
import { draftVersions } from '../lib/rest.mjs';
import config from '../lib/config.js';

const RID = config.RESTAURANT_ID;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };
function enc(v) {
  if (v === null) return { nullValue: null };
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
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(dec);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return undefined;
}
const doc = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
async function seed(path, obj, headers) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'PATCH', headers: headers || H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!headers && !r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
  return r;
}
async function getDoc(path) { const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H }); return r.status === 404 ? null : doc(await r.json()); }
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
async function listCol(col) { const j = await (await fetch(`${FS}/restaurants/${RID}/${col}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...doc(d) })); }
const errData = r => r?.error?.details?.data || r?.data || {};
const codeOf = r => errData(r).code || r?.error?.code;

// R8: the same shift domain/payments.businessDateFor does. IST, close at 04:00.
const bdFor = (at, h = 4, m = 0, tz = 330) => new Date(at + tz * 60_000 - (h * 60 + m) * 60_000).toISOString().slice(0, 10);

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
// The same three PY's own suite expects: this suite must not narrow the restaurant's tenders,
// or every suite that runs after it loses UPI.
const TENDERS = [
  { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
  { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
  { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
];
const line = (lineId, name, list, draftId = 'draft_dc') => ({
  lineId, cid: 'cid_dc', orderId: 'order_dc', cartId: 'cart_dc', cartItemId: lineId, tableId: 'table_dc', sessionId: 'sess_dc',
  placedAt: Date.now(), placedBy: 'guest', menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0,
  countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }],
  taxBlocks: { food: FOOD }, offer: null,
});

export default async function dayCloseSuite() {
  const results = { name: 'dayclose', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  const TODAY = bdFor(Date.now());
  const PAST_SHORT = '2026-01-05';
  const PAST_BIG = '2026-01-06';
  const PAST_RACE = '2026-01-07';

  // ── clean ──────────────────────────────────────────────────────────────────
  for (const d of [TODAY, PAST_SHORT, PAST_BIG, PAST_RACE]) await delDoc(`dayClose/${d}`);
  for (const m of await listCol('drawerMovements')) await delDoc(`drawerMovements/${m.id}`);
  for (const a of await listCol('audit')) if (a.cid === 'cid_dc' || /^day_/.test(a.cid || '')) await delDoc(`audit/${a.id}`);
  for (const l of ['dc_biryani', 'dc_naan', 'dc_walkout', 'dc_late']) await delDoc(`lines/${l}`);
  for (const b of await listCol('bills')) if (b.cid === 'cid_dc') await delDoc(`bills/${b.id}`);
  // R5 reads the WHOLE restaurant, so another suite's leftovers would block this close. They all
  // reseed themselves, so clearing them here is safe and is the only way this suite can ever be green.
  const strays = { bills: 0, lines: 0 };
  for (const b of await listCol('bills')) if (b.status === 'issued') { await delDoc(`bills/${b.id}`); strays.bills++; }
  for (const l of await listCol('lines')) if (l.billId === null || l.billId === undefined) { await delDoc(`lines/${l.id}`); strays.lines++; }

  // PY's R4 mirrors every payment onto the order the bill's lines name, so that order must exist.
  await seed('orders/order_dc', { orderId: 'order_dc', tableId: 'table_dc', status: 'IN_PROGRESS', paymentStatus: 'unpaid', restaurantId: RID });
  await seed('orders/order_dc_late', { orderId: 'order_dc_late', tableId: 'table_dc', status: 'IN_PROGRESS', paymentStatus: 'unpaid', restaurantId: RID });
  await seed('servers/manager_dc', { name: 'Manager DC', role: 'MANAGER', status: 'active', email: 'manager@dc.test', password: '1234', pinHash: PIN_1234 });
  await seed('servers/captain_dc', { name: 'Captain DC', role: 'SERVER', status: 'active', email: 'captain@dc.test', password: '1234', pinHash: PIN_1234 });
  const settings = (await getDoc('config/settings')) || {};
  await seed('config/settings', {
    ...settings,
    tax: { blocks: { food: FOOD } },
    seller: { name: 'E2E Bar', taxId: 'GSTIN_E2E' },
    billing: { ...(settings.billing || {}), charges: [] },
    payments: { ...(settings.payments || {}), tenders: TENDERS },
    dayClose: { blindCount: true, overShortP0Above: 10000, reasons: ['opening float', 'vendor payment', 'bank drop', 'correction'] },
  });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@dc.test');
  const captain = await login('captain@dc.test');
  if (!manager || !captain) { record(false, 'ABORT: staff login failed', { manager, captain }); return results; }
  const dc = (fn, sessionId, body) => call(`dayClose-${fn}`, { restaurantId: RID, sessionId, ...body });

  // ── DC-S20 roles ───────────────────────────────────────────────────────────
  {
    const r = await dc('close', captain, { businessDate: PAST_SHORT, countedCash: 0 });
    check('DC-S20 a captain cannot close the day → permission-denied, no PIN box', codeOf(r) === 'permission-denied' && errData(r).requires === undefined, r);
    const m = await dc('move', captain, { movementId: 'dc_cap', kind: 'out', amount: 100, reason: 'vendor payment', pin: '1234' });
    check('DC-S20 a captain cannot move cash out of the drawer → permission-denied', codeOf(m) === 'permission-denied', m);
    const g = await dc('get', captain, { businessDate: TODAY });
    check('DC-S20 a captain CAN read the day', g.status === 'success' && g.data?.businessDate === TODAY, g);
  }

  // ── BT · NC: a staff meal comped whole shows at close as a discount by reason ──
  {
    // A paid ₹0 bill (BL-S22) with a 42000 bill discount under `staff meal`, issued now, so it sits on TODAY.
    await seed('bills/bill_dc_nc', { billId: 'bill_dc_nc', cid: 'cid_dc', status: 'paid', number: 'NC1', series: 'A', issuedAt: Date.now(), issuedBy: 'manager_dc', tableIds: ['table_dc'], sessionId: 'sess_dc_nc', draftId: 'sess_dc_nc', payable: 0, subtotal: 0, taxTotal: 0, roundOff: 0, discount: { amount: 42000, pct: 100, source: { reason: 'staff meal', note: 'kitchen dinner', approverId: 'manager_dc' } }, lines: [{ lineId: 'dc_nc_1', countsTowardTotal: true, billDiscount: 42000 }], blocks: [], charges: [], creditNotes: [] });
    const g = await dc('get', manager, { businessDate: TODAY });
    const row = (g.data?.discounts || []).find(x => x.reason === 'staff meal');
    check('BT-N staff meal 42000 shows on the open day under discounts, by reason, even blind', g.status === 'success' && row?.amount === 42000 && row?.count === 1, g.data?.discounts);
  }

  // ── DC-S30 blind count is a server rule ────────────────────────────────────
  {
    const g = await dc('get', manager, { businessDate: TODAY });
    const d = g.data || {};
    const leaked = JSON.stringify(d).includes('"cash"');
    check('DC-S30 while open and blind, no expected cash, no float, no staff split, no movements',
      d.closed === false && d.expectedCash === undefined && d.openingFloat === undefined && d.byStaff === undefined && d.movements === undefined && !leaked, d);
    check('DC-S30 the reasons and the blind flag do come back, so the till can draw the screen',
      Array.isArray(d.reasons) && d.reasons.includes('vendor payment') && d.blindCount === true, d);
  }

  // ── DC-S8 / DC-S9 drawer movements, PIN, and what they do to expected cash ──
  let before = 0;
  {
    // Read the figure with blind off, so the suite can assert its own DELTA and ignore other suites.
    await seed('config/settings', { ...((await getDoc('config/settings')) || {}), dayClose: { blindCount: false, overShortP0Above: 10000, reasons: ['opening float', 'vendor payment', 'bank drop', 'correction'] } });
    before = (await dc('get', manager, { businessDate: TODAY })).data?.expectedCash;
    check('DC-S4 with blindCount false the expected figure is present', Number.isInteger(before), before);

    const noPin = await dc('move', manager, { movementId: 'dc_float', kind: 'float', amount: 200000, reason: 'opening float' });
    check('DC-S8 a drawer movement with no PIN → permission-denied requires pin, and nothing is written',
      codeOf(noPin) === 'permission-denied' && errData(noPin).requires === 'pin' && (await getDoc('drawerMovements/dc_float')) === null, noPin);

    const wrong = await dc('move', manager, { movementId: 'dc_float', kind: 'float', amount: 200000, reason: 'opening float', pin: '9999' });
    check('DC-S8 a wrong PIN → permission-denied wrong, still nothing written',
      errData(wrong).wrong === true && (await getDoc('drawerMovements/dc_float')) === null, wrong);

    const bad = await dc('move', manager, { movementId: 'dc_bad', kind: 'out', amount: 100, reason: 'because I said so', pin: '1234' });
    check('DC-S8 a reason outside the configured list → invalid-argument', codeOf(bad) === 'invalid-argument', bad);

    const f = await dc('move', manager, { movementId: 'dc_float', kind: 'float', amount: 200000, reason: 'opening float', pin: '1234' });
    check('DC-S9 the ₹2,000 opening float is recorded, stamped with the server`s business date',
      f.status === 'success' && f.data?.movement?.businessDate === TODAY && f.data?.movement?.by === 'manager_dc' && f.data?.movement?.amount === 200000, f);

    const o = await dc('move', manager, { movementId: 'dc_vendor', kind: 'out', amount: 120000, reason: 'vendor payment', note: 'vegetables', pin: '1234' });
    check('DC-S8 ₹1,200 to the vegetable vendor is recorded', o.status === 'success' && o.data?.movement?.kind === 'out', o);
    check('DC-S8 each movement leaves one P0 audit row', (await getDoc('audit/dc_vendor_drawer'))?.sev === 'P0', await getDoc('audit/dc_vendor_drawer'));

    const again = await dc('move', manager, { movementId: 'dc_vendor', kind: 'out', amount: 120000, reason: 'vendor payment', note: 'vegetables', pin: '1234' });
    check('DC-S12 the same movementId twice is ONE row and a success', again.status === 'success' && again.data?.retry === true &&
      (await listCol('drawerMovements')).filter(m => m.id === 'dc_vendor').length === 1, again);

    const clash = await dc('move', manager, { movementId: 'dc_vendor', kind: 'out', amount: 999, reason: 'vendor payment', pin: '1234' });
    check('DC-S12 the same movementId with a different amount → failed-precondition, the row is untouched',
      codeOf(clash) === 'failed-precondition' && (await getDoc('drawerMovements/dc_vendor'))?.amount === 120000, clash);

    const after = (await dc('get', manager, { businessDate: TODAY })).data?.expectedCash;
    check('DC-S1 expected cash moved by exactly +200000 − 120000 = +80000', after - before === 80000, { before, after });
    before = after;
  }

  // ── DC-S10 a mistyped movement is voided, never deleted ────────────────────
  {
    await dc('move', manager, { movementId: 'dc_typo', kind: 'out', amount: 1200000, reason: 'vendor payment', pin: '1234' });
    const mid = (await dc('get', manager, { businessDate: TODAY })).data?.expectedCash;
    check('DC-S10 the ₹12,000 mistype takes expected cash down with it', before - mid === 1200000, { before, mid });
    const noPin = await dc('voidMove', manager, { movementId: 'dc_typo', reason: 'correction' });
    check('DC-S10 voiding a movement asks for a PIN', errData(noPin).requires === 'pin', noPin);
    const v = await dc('voidMove', manager, { movementId: 'dc_typo', reason: 'correction', pin: '1234' });
    check('DC-S10 the void is recorded on the row, which still exists', v.status === 'success' && (await getDoc('drawerMovements/dc_typo'))?.void?.reason === 'correction', v);
    const back = (await dc('get', manager, { businessDate: TODAY })).data?.expectedCash;
    check('DC-S10 expected cash comes back to where it was', back === before, { before, back });
  }

  // ── a real bill, really paid, really in the drawer ─────────────────────────
  let billId;
  {
    await seed('lines/dc_biryani', line('dc_biryani', 'Mutton Biryani', 50000));
    await seed('lines/dc_naan', line('dc_naan', 'Butter Naan', 8000));
    const issued = await call('billing-issue', { restaurantId: RID, sessionId: manager, cid: 'cid_dc', draftId: 'draft_dc', tableIds: ['table_dc'], expectedV: await draftVersions(RID, 'draft_dc') });
    billId = issued.data?.billId;
    check('a bill is issued for ₹609.00 so the day has real money in it', issued.status === 'success' && issued.data?.payable === 60900, issued);

    const blocked = await dc('close', manager, { businessDate: TODAY, countedCash: 0 });
    check('DC-S5 the close is refused while bill 0001 is still issued, and the message names it',
      codeOf(blocked) === 'failed-precondition' && /still unpaid/.test(blocked.message || ''), blocked);

    const paid = await call('payments-take', { restaurantId: RID, sessionId: manager, billId, paymentId: 'dc_pay1', tenderId: 'cash', tendered: 70000 });
    check('the guest pays ₹700 cash for the ₹609.00 bill: ₹91.00 change', paid.status === 'success' && paid.data?.row?.amount === 60900 && paid.data?.row?.change === 9100, paid);

    const after = (await dc('get', manager, { businessDate: TODAY })).data?.expectedCash;
    check('DC-S1 the drawer gained the ₹609.00 taken, never the ₹700 tendered', after - before === 60900, { before, after });
    before = after;
  }

  // ── DC-S25 food on a table with no bill at all ─────────────────────────────
  {
    await seed('lines/dc_walkout', line('dc_walkout', 'Paneer 65', 150000, 'draft_dc_open'));
    const r = await dc('close', manager, { businessDate: TODAY, countedCash: before });
    check('DC-S25 the close is refused over food that is not on any bill yet, naming the table',
      codeOf(r) === 'failed-precondition' && /not on a bill yet/.test(r.message || '') && /table_dc/.test(r.message || ''), r);
    check('DC-S25 nothing was written', (await getDoc(`dayClose/${TODAY}`)) === null);
    const g = await dc('get', manager, { businessDate: TODAY });
    check('DC-S25 the day view says why: one unbilled item on the floor', g.data?.floor?.unbilledItems === 1, g.data?.floor);
    await delDoc('lines/dc_walkout');
  }

  // ── DC-S1 the close itself, then the lid ───────────────────────────────────
  {
    const left = Math.min(200000, before);   // the bank bag takes the rest
    const r = await dc('close', manager, { businessDate: TODAY, countedCash: before, leftInDrawer: left, note: 'counted twice' });
    const d = r.data?.doc || {};
    check('DC-S1 the day closes exact: difference 0, and the count and the float are frozen on it',
      r.status === 'success' && d.closed === true && d.difference === 0 && d.countedCash === before && d.openingFloat === 200000 && d.closedBy === 'manager_dc', r);
    check('DC-S1 the tender split is frozen, cash and card apart', Array.isArray(d.byTender) && d.byTender.some(t => t.tenderId === 'cash' && t.taken >= 60900), d.byTender);
    check('DC-S1 an exact count writes NO audit row', (await getDoc(`audit/${TODAY}_dayClose`)) === null);
    check('DC-S31 what was left in the drawer is on the document, and more than was counted is refused',
      d.leftInDrawer === left && codeOf(await dc('close', manager, { businessDate: PAST_RACE, countedCash: 100, leftInDrawer: 101 })) === 'invalid-argument', d);
    check('DC-S10 the voided movement is frozen on too — three things happened, three rows show',
      (d.movements || []).length === 3 && (d.movements || []).some(m => m.void), d.movements);

    const again = await dc('close', manager, { businessDate: TODAY, countedCash: before });
    check('DC-S27 the same count again is a SUCCESS, not a red "already exists" at midnight',
      again.status === 'success' && again.data?.retry === true, again);

    const other = await dc('close', manager, { businessDate: TODAY, countedCash: 1 });
    check('DC-S7 a DIFFERENT count is refused, and the refusal carries what was frozen',
      codeOf(other) === 'failed-precondition' && errData(other).countedCash === before, other);
    check('DC-S7 there is exactly one close document for the date', (await listCol('dayClose')).filter(x => x.id === TODAY).length === 1);
  }

  // ── DC-S6 / DC-S11 nothing may be written to a closed day ──────────────────
  {
    const m = await dc('move', manager, { movementId: 'dc_late', kind: 'out', amount: 500, reason: 'vendor payment', pin: '1234' });
    check('DC-S11 a drawer movement on a closed day → failed-precondition, nothing written',
      codeOf(m) === 'failed-precondition' && (await getDoc('drawerMovements/dc_late')) === null, m);

    const v = await dc('voidMove', manager, { movementId: 'dc_vendor', reason: 'correction', pin: '1234' });
    check('DC-S11 a movement on a closed day can no longer be voided', codeOf(v) === 'failed-precondition' &&
      (await getDoc('drawerMovements/dc_vendor'))?.void == null, v);

    // The whole point of R6, and the reason PY changed in this session.
    await seed('lines/dc_late', { ...line('dc_late', 'Late Dosa', 20000, 'draft_dc_late'), orderId: 'order_dc_late' });
    const issued = await call('billing-issue', { restaurantId: RID, sessionId: manager, cid: 'cid_dc', draftId: 'draft_dc_late', tableIds: ['table_dc'], expectedV: await draftVersions(RID, 'draft_dc_late') });
    const take = await call('payments-take', { restaurantId: RID, sessionId: manager, billId: issued.data?.billId, paymentId: 'dc_pay_late', tenderId: 'cash', tendered: 21000 });
    check('DC-S6 cash offered after the lid is on → failed-precondition, and NO payment row is written',
      codeOf(take) === 'failed-precondition' && /closed and counted/.test(take.message || '') && (await getDoc('payments/dc_pay_late')) === null, take);

    const froze = await getDoc(`dayClose/${TODAY}`);
    check('DC-S6 the signed document did not move a paisa', froze?.countedCash === before && froze?.difference === 0, froze);
    await delDoc('lines/dc_late');
    if (issued.data?.billId) await delDoc(`bills/${issued.data.billId}`);
  }

  // ── DC-S24 read it back, frozen ────────────────────────────────────────────
  {
    const g = await dc('get', manager, { businessDate: TODAY });
    check('DC-S24 a closed day reads back exactly as it was signed, whatever blindCount says',
      g.data?.closed === true && g.data?.countedCash === before && g.data?.difference === 0 && g.data?.closedBy === 'manager_dc', g.data);
  }

  // ── DC-S2 / DC-S23 / DC-S29 the short drawer, on empty past dates ──────────
  {
    const r = await dc('close', manager, { businessDate: PAST_SHORT, countedCash: 5000 });
    check('DC-S2/S3 an empty day counted ₹50 over closes, difference +5000, P1 audit row',
      r.status === 'success' && r.data?.doc?.difference === 5000 && (await getDoc(`audit/${PAST_SHORT}_dayClose`))?.sev === 'P1', r);

    const big = await dc('close', manager, { businessDate: PAST_BIG, countedCash: 90000 });
    check('DC-S29 a difference over ₹100 asks for a PIN first, and writes nothing',
      codeOf(big) === 'permission-denied' && errData(big).requires === 'pin' && (await getDoc(`dayClose/${PAST_BIG}`)) === null, big);

    const ok = await dc('close', manager, { businessDate: PAST_BIG, countedCash: 90000, pin: '1234' });
    check('DC-S29 with the PIN it is still RECORDED, not blocked — R4 does not bend',
      ok.status === 'success' && ok.data?.doc?.difference === 90000 && (await getDoc(`audit/${PAST_BIG}_dayClose`))?.sev === 'P0', ok);
    check('DC-S23 the threshold in force is frozen onto the document', ok.data?.doc?.thresholds?.overShortP0Above === 10000, ok.data?.doc);
  }

  // ── DC-S22 / DC-S32 ────────────────────────────────────────────────────────
  {
    const future = bdFor(Date.now() + 3 * 86400_000);
    const r = await dc('close', manager, { businessDate: future, countedCash: 0 });
    check('DC-S22 a day that has not happened yet → invalid-argument', codeOf(r) === 'invalid-argument', r);

    // 2026-01-04 was never closed, so the 5th must say so; the 7th follows the ₹900-over 6th.
    const g = await dc('get', manager, { businessDate: PAST_SHORT });
    check('DC-S32 a day whose previous one was never closed says so, and does not refuse',
      g.status === 'success' && g.data?.previousDayClosed === false && g.data?.previousClose === null, g.data);
    const g2 = await dc('get', manager, { businessDate: PAST_RACE });
    check('DC-S31/S32 the next day sees the ₹900-over close as its previous one',
      g2.data?.previousDayClosed === true && g2.data?.previousClose?.countedCash === 90000, g2.data);
  }

  // ── the rules deny a client write; only the Admin SDK may touch either collection ──────────
  {
    // An unsigned JWT: the emulator runs with skipTokenVerification, so this authenticates as uid
    // `staff_1` and the RULES decide, not the token parser. A bare string would be a 400 before
    // rules ever ran. Without this, "a closed day is closed" is one Firestore write away from false.
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'staff_1', user_id: 'staff_1', aud: config.PROJECT_ID, iss: `https://securetoken.google.com/${config.PROJECT_ID}`, iat: now, exp: now + 3600 })}.`;
    const client = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };
    const PROBE = '2026-02-02';   // a date this suite never closes, so `null` afterwards means the write was refused
    await delDoc(`dayClose/${PROBE}`);
    const c = await seed(`dayClose/${PROBE}`, { closed: true }, client);
    check('a client write to dayClose/ with a non-owner bearer → refused (403). Without this, "closed" is one write from false',
      c.status === 403 && (await getDoc(`dayClose/${PROBE}`)) === null, { status: c.status });
    const m = await seed('drawerMovements/rules_probe', { amount: 1 }, client);
    check('a client write to drawerMovements/ → refused (403), never a row',
      m.status === 403 && (await getDoc('drawerMovements/rules_probe')) === null, { status: m.status });
  }

  // ── put the day back the way we found it ───────────────────────────────────
  // There is no reopen in the product and there should not be (R11). This is housekeeping, not a
  // feature: a sealed CURRENT business date would refuse every payment the other suites take after
  // this one runs, and a test that breaks its neighbours is a test nobody trusts.
  await delDoc(`dayClose/${TODAY}`);
  check('the suite leaves today open again, so the suites that run after it can still take money',
    (await getDoc(`dayClose/${TODAY}`)) === null);

  if (strays.bills || strays.lines) record(true, `note: cleared ${strays.bills} stray issued bill(s) and ${strays.lines} unbilled line(s) left by other suites → ok`);
  return results;
}
