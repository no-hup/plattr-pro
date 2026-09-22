/**
 * Suite: order-entry (OR-S1 · S19 · S22 — the captain app's Add-dishes screen, server side).
 * Sheet: moonshot/SPEC_OR_till_order_entry.md. Real Cloud Functions on the emulator; seeds through
 * the Firestore REST API (Bearer owner) and deletes its own documents first, so it reruns.
 *
 * Own fixtures: tables table_or_1 / _out / _p / _c, staff manager@or.test and server@or.test
 * (password 1234). Menu items are the restaurant's own (config.ITEMS.TIRAMISU, ₹200, no offer on it).
 *
 * Hand-computed (minor units):
 *   OR-S1   one tiramisu sent by staff → the line reads placedBy 'staff:<serverId>', sent: true
 *   OR-S19  a second round of one tiramisu → SAME order, two carts, onTable 20000 + 20000 = 40000
 *   OR-S22  opening an open table again → created:false, same session, expiresAt later, no new session
 */
import { call } from '../lib/api.js';
import config from '../lib/config.js';

const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
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
const ok = r => r?.status === 'success' || r?.success === true;

const TABLES = ['table_or_1', 'table_or_out', 'table_or_p', 'table_or_c'];
const ITEM = config.ITEMS.TIRAMISU.id;   // ₹200, no variants, no offer → 20000 minor per line

export default async function orderEntrySuite() {
  const results = { name: 'order-entry', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ────────────────────────────────────────────────────
  const mine = s => TABLES.includes(s.tableId);
  const oldSessions = (await listCol('sessions')).filter(mine);
  for (const s of oldSessions) await delDoc(`sessions/${s.id}`);
  for (const l of await listCol('lines')) if (oldSessions.some(s => s.id === l.sessionId) || TABLES.includes(l.tableId)) await delDoc(`lines/${l.id}`);
  for (const o of await listCol('orders')) if (mine(o)) await delDoc(`orders/${o.id}`);
  for (const t of TABLES) { await delDoc(`tables/${t}`); await delDoc(`carts/${t}`); }

  await seed('tables/table_or_1', { number: 'OR1', capacity: 4, status: 'vacant' });
  await seed('tables/table_or_out', { number: 'OROUT', capacity: 2, status: 'disabled' });
  await seed('tables/table_or_p', { number: 'ORP', capacity: 4, status: 'vacant' });
  await seed('tables/table_or_c', { number: 'ORC', capacity: 4, status: 'vacant', mergedInto: 'table_or_p' });
  await seed('sessions/sess_or_guest', { tableId: 'table_or_1', status: 'active', users: ['guest_or'], primaryUserId: 'guest_or', createdAt: new Date(), updatedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000) });
  await seed('servers/manager_or', { name: 'Manager OR', role: 'MANAGER', status: 'active', email: 'manager@or.test', password: '1234', pinHash: PIN_1234 });
  await seed('servers/server_or', { name: 'Server OR', role: 'SERVER', status: 'active', email: 'server@or.test', password: '1234', pinHash: PIN_1234 });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@or.test');
  const server = await login('server@or.test');
  check('staff logins resolve for manager@or.test and server@or.test', manager && server, { manager, server });

  const open = (tableId, extra = {}, sessionId = server) => call('table-openTable', { restaurantId: RID, sessionId, tableId, ...extra });
  const add = (tableId, sessionId, addedBy, quantity = 1) => call('cart-addItemToCart', { restaurantId: RID, tableId, sessionId, addedBy, menuItemId: ITEM, quantity });
  const send = (tableId, sessionId, addedBy) => call('cart-checkoutCart', { restaurantId: RID, tableId, sessionId, addedBy });
  const kitchen = () => call('order-getActiveCartsForKitchen', { restaurantId: RID, sessionId: manager });
  const floor = () => call('floor-get', { restaurantId: RID, staffSessionId: manager });

  // The guest's own session was seeded on table_or_1 but is not the live sitting the endpoint looks
  // for — delete it before the real open so OR-S1 starts from a vacant table. It served one refusal:
  {
    const r = await open('table_or_1', { sessionId: 'sess_or_guest' });
    check('a CUSTOMER session offered as the staff session is refused', !ok(r), r);
    await delDoc('sessions/sess_or_guest');
  }

  // ── refusals ────────────────────────────────────────────────────────────
  {
    const out = await open('table_or_out');
    check('a disabled table is refused failed-precondition', codeOf(out) === 'failed-precondition', out);
    const zero = await open('table_or_1', { covers: 0 });
    const hundred = await open('table_or_1', { covers: 100 });
    check('covers 0 and covers 100 are refused invalid-argument', codeOf(zero) === 'invalid-argument' && codeOf(hundred) === 'invalid-argument', { zero, hundred });
    check('the refused opens minted no session on table_or_1', !(await listCol('sessions')).some(s => s.tableId === 'table_or_1'), null);
  }

  // ── OR-S1: staff open a vacant table and send one round ─────────────────
  let sitting, addedBy, orderNumber, orderId;
  {
    const r = await open('table_or_1', { covers: 2 });
    sitting = r.data?.sessionId; addedBy = r.data?.addedBy;
    check('OR-S1 open a vacant table → created:true, addedBy staff:server_or, covers 2', r.data?.created === true && addedBy === 'staff:server_or' && r.data?.covers === 2, r);
    const t = await getDoc('tables/table_or_1');
    const s = sitting ? await getDoc(`sessions/${sitting}`) : null;
    check('OR-S1 the table is active and opened by the staff tag; the session says openedBy too', t?.status === 'active' && t?.openedBy === addedBy && s?.openedBy === addedBy && s?.covers === 2, { t, s });

    const a = await add('table_or_1', sitting, addedBy);
    check('OR-S1 cart-addItemToCart on the TABLE session accepts the staff round', ok(a), a);
    const c = await send('table_or_1', sitting, addedBy);
    orderNumber = c.data?.orderNumber; orderId = c.data?.orderId;
    check('OR-S1 cart-checkoutCart places the round: an order with a number', ok(c) && orderId && orderNumber, c);

    const lines = (await listCol('lines')).filter(l => l.sessionId === sitting);
    check('OR-S1 exactly one line snapshot, sent:true, tableId table_or_1', lines.length === 1 && lines[0].sent === true && lines[0].tableId === 'table_or_1', lines);
    check('OR-S1 the line names who placed it: placedBy = staff:server_or (never "system")', lines[0]?.placedBy === addedBy, lines[0]);
  }

  // ── OR-S22: open the same table again → the same sitting, extended ──────
  {
    const before = await getDoc(`sessions/${sitting}`);
    await new Promise(r => setTimeout(r, 1100));   // whole-second resolution on expiresAt
    const r = await open('table_or_1');
    const after = await getDoc(`sessions/${sitting}`);
    check('OR-S22 created:false and the same sessionId', r.data?.created === false && r.data?.sessionId === sitting && r.data?.covers === 2, r);
    const secs = t => t?._seconds ?? Date.parse(t) / 1000;   // the emulator hands back {_seconds,_nanoseconds}
    check('OR-S22 expiresAt moved forward, nothing minted (still one session on the table)', secs(after?.expiresAt) > secs(before?.expiresAt) && (await listCol('sessions')).filter(s => s.tableId === 'table_or_1').length === 1, { before: before?.expiresAt, after: after?.expiresAt });
  }

  // ── OR-S19: a second round lands on the same order ──────────────────────
  {
    await add('table_or_1', sitting, addedBy);
    const c = await send('table_or_1', sitting, addedBy);
    check('OR-S19 the second round answers the SAME order id and number', c.data?.orderId === orderId && c.data?.orderNumber === orderNumber, { c, orderId, orderNumber });
    const k = await kitchen();
    const o = (k.data?.orders || []).find(x => x.orderId === orderId);
    check('OR-S19 the kitchen read shows one order with two carts (two rounds)', o && (o.carts || []).length === 2, o || k);
    const f = await floor();
    const tile = (f.data?.tiles || []).find(t => t.label === 'OR1');
    check('OR-S1/S19 floor-get: table OR1 onTable 40000 (two tiramisu at 20000, no offer)', tile?.onTable === 40000, tile || f);
  }

  // ── a merged child opens the parent's sitting ───────────────────────────
  {
    const r = await open('table_or_c', {}, manager);
    check('opening a merged child answers the PARENT table and a session on it', r.data?.tableId === 'table_or_p' && r.data?.created === true, r);
    const s = r.data?.sessionId ? await getDoc(`sessions/${r.data.sessionId}`) : null;
    check('that session sits on table_or_p, opened by staff:manager_or', s?.tableId === 'table_or_p' && s?.openedBy === 'staff:manager_or', s);
  }

  return results;
}
