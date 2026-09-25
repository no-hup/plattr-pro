// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared. A suite
// that seeds only a plaintext password logs in fine and then fails at every PIN. Same constant
// hash of 1234 the seeds carry.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
/**
 * Suite: floor (FL · Floor & moves). Real Cloud Functions on the emulator.
 * Sheet: moonshot/SPEC_FL_floor_and_moves.md. Seeds through the Firestore REST API (Bearer owner)
 * and deletes its own documents first, so it reruns without a reset.
 *
 * Own fixtures, so no other suite's seed can move underneath it: tables table_fl_12 / _7 / _5 /
 * _6 / _9 / _19 / _out, sessions sess_fl_*, staff manager@fl.test (MANAGER) and server@fl.test
 * (SERVER), both password 1234.
 *
 * Hand-computed (minor units; food block exclusive CGST 2.5 + SGST 2.5):
 *   FL-S19  table_fl_12: tikka 32000 + pitcher 125000 less offer 10000 + biryani 45000 voided
 *           → onTable 147000. NOT the bill: the bill adds service charge, so the two differ by design.
 *   FL-S22  table_fl_7: bill fl_0701 payable 100000, paidTotal 40000 → unpaid 60000
 *   FL-S6   table_fl_5 + table_fl_6 merged → ONE tile labelled "5+6", onTable 412000
 *   FL-S20  after issue, a 30000 jamun lands on the same sitting → unpaid 200000 AND onTable 30000
 *   FL-S10  move sess_fl_4 from table_fl_4 to table_fl_9: session.tableId, the cart doc,
 *           the PREPARING order and the one unbilled line (168000) all read table_fl_9 after
 */
import { call } from '../lib/api.js';
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
const msgOf = r => r?.error?.message || r?.message || '';

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const line = (lineId, name, list, sessionId, extra = {}) => ({
  lineId, cid: 'cid_fl', orderId: 'order_fl', cartId: 'cart_fl', cartItemId: lineId,
  tableId: extra.tableId || 'table_fl_12', sessionId, placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0,
  countsTowardTotal: true, draftId: sessionId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }],
  taxBlocks: { food: FOOD }, offer: null, ...extra,
});

const TABLES = ['table_fl_12', 'table_fl_7', 'table_fl_5', 'table_fl_6', 'table_fl_9', 'table_fl_19', 'table_fl_out', 'table_fl_4'];
const LINES = ['fl_tikka', 'fl_pitcher', 'fl_biryani', 'fl_7', 'fl_group', 'fl_out', 'fl_biryani4', 'fl_jamun'];
const SESSIONS = ['sess_fl_12', 'sess_fl_7', 'sess_fl_5', 'sess_fl_out', 'sess_fl_4'];

export default async function floorSuite() {
  const results = { name: 'floor', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ────────────────────────────────────────────────────
  for (const t of TABLES) await delDoc(`tables/${t}`);
  for (const l of LINES) await delDoc(`lines/${l}`);
  for (const s of SESSIONS) await delDoc(`sessions/${s}`);
  for (const b of await listCol('bills')) if (/^fl_/.test(b.id)) await delDoc(`bills/${b.id}`);
  for (const a of await listCol('audit')) if (/^cid_fl/.test(a.id)) await delDoc(`audit/${a.id}`);
  for (const o of await listCol('orders')) if (/^order_fl/.test(o.id)) await delDoc(`orders/${o.id}`);
  for (const c of ['table_fl_4', 'table_fl_9']) await delDoc(`carts/${c}`);

  const hourAgo = new Date(Date.now() - 3600_000);
  const active = (tableId) => ({ tableId, status: 'active', users: ['guest_1'], primaryUserId: 'guest_1', createdAt: hourAgo, updatedAt: hourAgo, expiresAt: new Date(Date.now() + 3600_000) });

  await seed('tables/table_fl_12', { number: '12', capacity: 4, status: 'active' });
  await seed('tables/table_fl_7', { number: '7', capacity: 2, status: 'active' });
  // `charges: []`: this table names no charge rows (BT), so what a walk-out bills is the food + GST alone, whatever
  // service charge another suite leaves on this restaurant's config.
  await seed('tables/table_fl_5', { number: '5', capacity: 4, status: 'active', charges: [] });
  await seed('tables/table_fl_6', { number: '6', capacity: 4, status: 'vacant' });
  await seed('tables/table_fl_9', { number: '9', capacity: 4, status: 'vacant' });
  await seed('tables/table_fl_19', { number: '19', capacity: 2, status: 'vacant' });
  await seed('tables/table_fl_out', { number: 'OUT', capacity: 2, status: 'disabled' });
  await seed('tables/table_fl_4', { number: '4', capacity: 4, status: 'active' });

  await seed('sessions/sess_fl_12', active('table_fl_12'));
  await seed('sessions/sess_fl_7', active('table_fl_7'));
  await seed('sessions/sess_fl_5', active('table_fl_5'));
  await seed('sessions/sess_fl_out', active('table_fl_out'));
  await seed('sessions/sess_fl_4', active('table_fl_4'));

  await seed('lines/fl_tikka', line('fl_tikka', 'Paneer Tikka', 32000, 'sess_fl_12'));
  await seed('lines/fl_pitcher', line('fl_pitcher', 'Pitcher', 125000, 'sess_fl_12', { offer: { id: 'happy_hour', name: 'Happy Hour', amount: 10000 } }));
  await seed('lines/fl_biryani', line('fl_biryani', 'Biryani', 45000, 'sess_fl_12', { countsTowardTotal: false, void: { reason: 'sent back', note: '', approverId: 'mgr' } }));
  await seed('lines/fl_group', line('fl_group', 'Party platter', 412000, 'sess_fl_5', { tableId: 'table_fl_5' }));
  await seed('lines/fl_out', line('fl_out', 'Thali', 234000, 'sess_fl_out', { tableId: 'table_fl_out' }));
  await seed('lines/fl_biryani4', line('fl_biryani4', 'Biryani', 168000, 'sess_fl_4', { tableId: 'table_fl_4' }));
  await seed('lines/fl_7', line('fl_7', 'Dosa', 100000, 'sess_fl_7', { tableId: 'table_fl_7', billId: 'fl_0701' }));

  await seed('bills/fl_0701', { billId: 'fl_0701', sittingId: 'sess_fl_7', payable: 100000, paidTotal: 40000, status: 'issued', cid: 'cid_fl7', number: 'fl_0701', tableIds: ['table_fl_7'] });
  await seed('orders/order_fl4', { orderId: 'order_fl4', sessionId: 'sess_fl_4', tableId: 'table_fl_4', status: 'PREPARING', restaurantId: RID });
  await seed('orders/order_fl4_done', { orderId: 'order_fl4_done', sessionId: 'sess_fl_4', tableId: 'table_fl_4', status: 'COMPLETED', restaurantId: RID });
  await seed('carts/table_fl_4', { tableId: 'table_fl_4', items: [{ cartItemId: 'ci_1', menuItemId: 'mi_x', quantity: 1 }] });

  await seed('servers/manager_fl', { name: 'Manager FL', role: 'MANAGER', status: 'active', email: 'manager@fl.test', password: '1234', pinHash: PIN_1234 });
  await seed('servers/server_fl', { name: 'Server FL', role: 'SERVER', status: 'active', email: 'server@fl.test', password: '1234', pinHash: PIN_1234 });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@fl.test');
  const server = await login('server@fl.test');
  check('staff logins resolve for manager@fl.test and server@fl.test', manager && server, { manager, server });

  const floor = (sessionId = manager) => call('floor-get', { restaurantId: RID, staffSessionId: sessionId });
  const open = (tableId, sessionId = manager) => call('floor-open', { restaurantId: RID, staffSessionId: sessionId, tableId });
  const tileOf = (r, label) => (r.data?.tiles || []).find(t => t.label === label);

  // ── FL-S1, S19, S22: the two numbers ────────────────────────────────────
  {
    const r = await floor();
    const t12 = tileOf(r, '12');
    const t7 = tileOf(r, '7');
    check('FL-S19 table 12 onTable 147000 (32000 + 125000−10000; the voided 45000 is not in it)', t12?.onTable === 147000, t12);
    check('FL-S19 the tile is not the bill: 147000, never 161700 with service charge', t12?.onTable !== 161700, t12);
    check('FL-S19 table 12 reads "ordered" with nothing issued', t12?.word === 'ordered', t12);
    check('FL-S22 table 7 unpaid 60000 of a 100000 bill with 40000 taken, never 0 and never 100000', t7?.unpaid === 60000, t7);
    check('FL-S22 a part-paid table reads "billed", never settled', t7?.word === 'billed', t7);
    check('FL-S1 minutes are computed server-side and non-negative', Number.isInteger(t12?.minutes) && t12.minutes >= 59, t12);
    check('FL-S4 table 19 is a free tile with 0 on both axes', tileOf(r, '19')?.word === 'free' && tileOf(r, '19')?.onTable === 0, tileOf(r, '19'));
    check('FL-S1 the config the screen polls on comes back with the floor', r.data?.config?.pollSeconds === 5, r.data?.config);
  }

  // ── FL-S30: a retired table keeps its door ──────────────────────────────
  {
    const r = await floor();
    const out = tileOf(r, 'OUT');
    check('FL-S30 an out-of-service table with 234000 open still returns a tile (R17)', out?.onTable === 234000, out);
  }

  // ── FL-S29: who may read, who may act ───────────────────────────────────
  {
    const r = await floor(server);
    check('FL-S29 a SERVER may READ the floor; only the three acts are a manager\'s', (r.data?.tiles || []).length > 0, r);
    const bad = await call('floor-get', { restaurantId: RID, staffSessionId: 'not_a_session' });
    check('an unknown staff session is refused, not served an empty floor', bad.status !== 'success', bad);
  }

  // ── FL-S2, S3, S4: the tap is a read of the truth ───────────────────────
  {
    const r = await open('table_fl_12');
    check('FL-S2 tapping table 12 returns one draft worth 147000 over 2 counting lines', r.data?.drafts?.length === 1 && r.data.drafts[0].onTable === 147000 && r.data.drafts[0].lineIds.length === 2, r.data);
    check('FL-S2 the answer is drafts: [...], never one draftId (R12)', Array.isArray(r.data?.drafts) && r.data.draftId === undefined, r.data);

    const seven = await open('table_fl_7');
    check('FL-S3 tapping table 7 after issue returns the issued bill, not a second draft', seven.data?.drafts?.length === 0 && seven.data?.bills?.[0]?.billId === 'fl_0701', seven.data);
    check('FL-S3 the bill carries what is still owed: payable 100000, paid 40000', seven.data?.bills?.[0]?.payable === 100000 && seven.data.bills[0].paid === 40000, seven.data);

    const empty = await open('table_fl_19');
    check('FL-S4 tapping empty table 19 opens nothing and mints no draft', empty.data?.sessionId === null && empty.data?.drafts?.length === 0, empty.data);
    check('FL-S4 no session document was created as a side effect', (await listCol('sessions')).every(s => s.tableId !== 'table_fl_19'), null);
  }

  // ── FL-S7, S9, S26, S6: merge ───────────────────────────────────────────
  {
    const asServer = await call('table-setMerge', { restaurantId: RID, staffSessionId: server, parentTableId: 'table_fl_5', childTableIds: ['table_fl_6'], cid: 'cid_fl_m0' });
    check('FL-S29 a SERVER is refused permission-denied on merge, with no PIN offered', codeOf(asServer) === 'permission-denied' && !/requires/.test(JSON.stringify(asServer)), asServer);

    const busy = await call('table-setMerge', { restaurantId: RID, staffSessionId: manager, parentTableId: 'table_fl_5', childTableIds: ['table_fl_12'], cid: 'cid_fl_m1' });
    check('FL-S9 merging occupied table 12 is refused: it is not vacant', codeOf(busy) === 'failed-precondition', busy);

    const ok = await call('table-setMerge', { restaurantId: RID, staffSessionId: manager, parentTableId: 'table_fl_5', childTableIds: ['table_fl_6'], cid: 'cid_fl_m2' });
    const child = await getDoc('tables/table_fl_6');
    check('FL-S7 merging 6 into 5 succeeds and writes the child disabled + mergedInto', ok.status === 'success' && child?.status === 'disabled' && child?.mergedInto === 'table_fl_5', { ok, child });
    const row = await getDoc('audit/cid_fl_m2_merge');
    check('FL-S7 one audit row names the staff and every child', row?.action === 'table.merge' && row?.role === 'MANAGER' && JSON.stringify(row?.childTableIds) === JSON.stringify(['table_fl_6']), row);

    const again = await call('table-setMerge', { restaurantId: RID, staffSessionId: manager, parentTableId: 'table_fl_12', childTableIds: ['table_fl_6'], cid: 'cid_fl_m3' });
    check('FL-S26 merging table 6, already in another group, is refused', codeOf(again) === 'failed-precondition', again);

    const r = await floor();
    const group = tileOf(r, '5+6');
    check('FL-S6 the merged pair is ONE tile reading 412000, never two greyed tiles (R9)', group?.onTable === 412000, r.data?.tiles);
    check('FL-S6 table 6 has no tile of its own', !tileOf(r, '6'), r.data?.tiles);
  }

  // ── FL-S27, S8: unmerge over money, then OR-5a ──────────────────────────
  {
    const held = await call('table-setMerge', { restaurantId: RID, staffSessionId: manager, parentTableId: 'table_fl_5', merge: false, cid: 'cid_fl_u1' });
    check('FL-S27 unmerge is refused while the group holds 412000 unbilled (R14)', codeOf(held) === 'failed-precondition' && /bill it or move it first/i.test(msgOf(held)), held);
    check('FL-S27 nothing was released: table 6 still points at 5', (await getDoc('tables/table_fl_6'))?.mergedInto === 'table_fl_5', null);
    // TD-037: the captain's manual Vacant is the same act by another door, on the parent or the child.
    const vacate = tableId => call('table-updateTableStatus', { restaurantId: RID, sessionId: server, tableId, status: 'vacant' });
    const vParent = await vacate('table_fl_5'), vChild = await vacate('table_fl_6');
    // Shaurya 2026-09-24: a table that still owes frees only by the cashier's PIN, so the captain is denied outright.
    check('TD-037 captain Vacant on table 5 is denied while the group holds 412000 unbilled', codeOf(vParent) === 'permission-denied' && /only the cashier/i.test(msgOf(vParent)), vParent);
    check('TD-037 captain Vacant on child 6 is denied too: its money is the group\'s', codeOf(vChild) === 'permission-denied', vChild);
    const noPin = await call('floor-clear', { restaurantId: RID, staffSessionId: manager, tableId: 'table_fl_5', cid: 'cid_fl_walk' });
    // D1 / QF-6 (2026-09-25): the amount named is what the walk-out would write off AS BILLED, not the pre-tax food:
    // 412000 + CGST 2.5 % 10300 + SGST 2.5 % 10300 = 432600 (table 5 carries no charge rows).
    check('cashier Clear on the owing group without a PIN → refused, asking for the PIN and naming 432600 as billed', codeOf(noPin) === 'failed-precondition' && errData(noPin).requires === 'pin' && errData(noPin).owed === 432600, noPin);
    check('TD-037 …and nothing moved: 6 still in the group, 5 not vacant', (await getDoc('tables/table_fl_6'))?.mergedInto === 'table_fl_5' && (await getDoc('tables/table_fl_5'))?.status !== 'vacant', null);

    await delDoc('lines/fl_group');   // the group is billed and settled; nothing open
    const freed = await call('table-setMerge', { restaurantId: RID, staffSessionId: manager, parentTableId: 'table_fl_5', merge: false, cid: 'cid_fl_u2' });
    const after = await getDoc('tables/table_fl_6');
    check('FL-S8 OR-5a: a group that owes nothing releases every child at once', freed.status === 'success' && after?.status === 'vacant' && after?.mergedInto === null, { freed, after });
    check('FL-S8 the release writes its own audit row', (await getDoc('audit/cid_fl_u2_unmerge'))?.action === 'table.unmerge', null);
  }

  // ── FL-S10, S28, S18, S25: the move ─────────────────────────────────────
  {
    const asServer = await call('table-moveTable', { restaurantId: RID, staffSessionId: server, fromTableId: 'table_fl_4', toTableId: 'table_fl_9', cid: 'cid_fl_v0' });
    check('FL-S29 a SERVER is refused permission-denied on move', codeOf(asServer) === 'permission-denied', asServer);

    const onto = await call('table-moveTable', { restaurantId: RID, staffSessionId: manager, fromTableId: 'table_fl_4', toTableId: 'table_fl_12', cid: 'cid_fl_v1' });
    check('FL-S11 moving onto occupied table 12 is refused', codeOf(onto) === 'failed-precondition', onto);

    const billed = await call('table-moveTable', { restaurantId: RID, staffSessionId: manager, fromTableId: 'table_fl_7', toTableId: 'table_fl_9', cid: 'cid_fl_v2' });
    check('FL-S24 moving a sitting whose line carries a billId is refused', codeOf(billed) === 'failed-precondition' && /printed bill/i.test(msgOf(billed)), billed);

    const r = await call('table-moveTable', { restaurantId: RID, staffSessionId: manager, fromTableId: 'table_fl_4', toTableId: 'table_fl_9', cid: 'cid_fl_v3' });
    check('FL-S10 the move succeeds and reports both tables', r.status === 'success' && JSON.stringify(r.data?.moved) === JSON.stringify(['table_fl_4', 'table_fl_9']), r);
    check('FL-S10 the session now sits at table 9', (await getDoc('sessions/sess_fl_4'))?.tableId === 'table_fl_9', null);
    check('FL-S10 the cart moved: table 9 holds it and table 4 has none', (await getDoc('carts/table_fl_9'))?.items?.length === 1 && (await getDoc('carts/table_fl_4')) === null, null);
    check('FL-S28 the PREPARING order was re-pointed so the runner walks to table 9', (await getDoc('orders/order_fl4'))?.tableId === 'table_fl_9', null);
    check('FL-Q2 the COMPLETED order was left alone at table 4', (await getDoc('orders/order_fl4_done'))?.tableId === 'table_fl_4', null);
    const moved = await getDoc('lines/fl_biryani4');
    check('FL-S28 the unbilled 168000 line moved with them', moved?.tableId === 'table_fl_9', moved);
    check('R5 no price was rewritten: listPrice still 168000 and no offer appeared', moved?.listPrice === 168000 && !moved?.offer, moved);
    check('FL-S13 table 4 is left vacant and table 9 active', (await getDoc('tables/table_fl_4'))?.status === 'vacant' && (await getDoc('tables/table_fl_9'))?.status === 'active', null);
    const row = await getDoc('audit/cid_fl_v3_move');
    check('FL-S18 one audit row names the staff, both tables and the session', row?.action === 'table.move' && row?.from === 'table_fl_4' && row?.to === 'table_fl_9' && row?.sessionId === 'sess_fl_4', row);

    const tile = tileOf(await floor(), '9');
    check('FL-S10 the floor now shows the 168000 at table 9, and table 4 is free', tile?.onTable === 168000 && tileOf(await floor(), '4')?.word === 'free', tile);
  }

  // ── FL-S20: billed and still eating ─────────────────────────────────────
  {
    await seed('lines/fl_jamun', line('fl_jamun', 'Gulab Jamun', 30000, 'sess_fl_7', { tableId: 'table_fl_7' }));
    const t7 = tileOf(await floor(), '7');
    check('FL-S20 a table with 60000 due AND 30000 ordered after issue shows BOTH numbers (R11)', t7?.unpaid === 60000 && t7?.onTable === 30000, t7);
    check('FL-S20 a tile with anything on either axis is never "settled"', t7?.word !== 'settled', t7);
    await delDoc('lines/fl_jamun');
  }

  // ── FL-S14, FL-Q1: Clear ────────────────────────────────────────────────
  {
    const stillOwed = await call('floor-clear', { restaurantId: RID, staffSessionId: manager, tableId: 'table_fl_7', cid: 'cid_fl_c1' });
    check('FL-Q1 Clear is refused while 60000 is still owed, so it can never hide money', codeOf(stillOwed) === 'failed-precondition', stillOwed);

    await seed('bills/fl_0701', { billId: 'fl_0701', sittingId: 'sess_fl_7', payable: 100000, paidTotal: 100000, status: 'paid', cid: 'cid_fl7', number: 'fl_0701', tableIds: ['table_fl_7'] });
    check('FL-S14 once settled the tile reads "settled", not free', tileOf(await floor(), '7')?.word === 'settled', null);

    const freed = await call('floor-clear', { restaurantId: RID, staffSessionId: manager, tableId: 'table_fl_7', cid: 'cid_fl_c2' });
    check('FL-Q1 Clear frees a settled table immediately', freed.status === 'success' && (await getDoc('tables/table_fl_7'))?.status === 'vacant', { freed });
    check('FL-Q1 Clear writes its own audit row naming the cashier', (await getDoc('audit/cid_fl_c2_clear'))?.action === 'table.clear', null);
  }

  return results;
}
