/**
 * Suite: housekeeping (FL-S36 · the table nobody frees, TD-044). Real Cloud Functions on the emulator.
 * Sheet: moonshot/SPEC_FL_floor_and_moves.md, R21. The schedule `floor-releaseIdleTables` is never
 * fired by the emulator, so the sweep is called through its emulator-only manual trigger
 * `table-cleanupInactiveSessions`. Seeds over the Firestore REST API and cleans its own documents.
 *
 * Own fixtures: tables table_hk_*, sessions sess_hk_*. Threshold is the default 60 minutes; every
 * sitting below was opened 2 hours ago unless the name says otherwise.
 *
 * Hand-computed outcomes (minor units):
 *   walk     nothing since the scan                       → freed, audit sess_hk_walk_autoVacate by system, idle 120m
 *   cart     cart written 5m ago, nothing sent            → busy, still active
 *   reopen   session updatedAt 10m ago (OR-S22 extend)    → busy
 *   scan     table.lastActivity 3m ago (a re-scan)        → busy
 *   food     one unbilled line 184000                     → money, not freed
 *   bill     issued bill 184000, paid 0                   → money, not freed
 *   paid     bill 184000 paid 184000 two hours ago        → freed
 *   fresh    opened 40 minutes ago                        → not a candidate, active
 *   nodate   active session with no createdAt             → never a candidate, active (fail closed)
 *   group    parent p + child c merged, walked out        → both vacant, child unmerged, one audit row
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

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const NAMES = ['walk', 'cart', 'reopen', 'scan', 'food', 'bill', 'paid', 'fresh', 'nodate', 'p', 'c'];
const T = n => `table_hk_${n}`;
const S = n => `sess_hk_${n}`;

export default async function housekeepingSuite() {
  const results = { name: 'housekeeping', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ────────────────────────────────────────────────────
  for (const n of NAMES) { await delDoc(`tables/${T(n)}`); await delDoc(`sessions/${S(n)}`); await delDoc(`carts/${T(n)}`); }
  for (const l of await listCol('lines')) if (/^hk_/.test(l.id)) await delDoc(`lines/${l.id}`);
  for (const b of await listCol('bills')) if (/^hk_/.test(b.id)) await delDoc(`bills/${b.id}`);
  for (const a of await listCol('audit')) if (/^sess_hk_/.test(a.id)) await delDoc(`audit/${a.id}`);

  const now = Date.now();
  const ago = min => new Date(now - min * 60_000);
  const session = (n, createdMin, over = {}) => seed(`sessions/${S(n)}`, {
    tableId: T(n), status: 'active', users: ['guest_hk'], primaryUserId: 'guest_hk',
    createdAt: ago(createdMin), updatedAt: ago(createdMin), expiresAt: new Date(now + 3600_000), ...over,
  });
  const active = (n, over = {}) => seed(`tables/${T(n)}`, { number: `HK-${n}`, capacity: 4, status: 'active', ...over });

  for (const n of ['walk', 'cart', 'reopen', 'food', 'bill', 'paid', 'fresh', 'nodate']) await active(n);
  await active('scan', { lastActivity: ago(3) });   // a PATCH replaces the document, so the stamp goes in with the seed
  await active('p');
  await seed(`tables/${T('c')}`, { number: 'HK-c', capacity: 4, status: 'disabled', mergedInto: T('p') });

  await session('walk', 120);
  await session('cart', 120);
  await seed(`carts/${T('cart')}`, { tableId: T('cart'), sessionId: S('cart'), items: [{ cartItemId: 'ci_1', menuItemId: 'mi_x', quantity: 1 }], lastUpdated: ago(5).toISOString() });
  await session('reopen', 120, { updatedAt: ago(10) });
  await session('scan', 120);
  await session('food', 120);
  await seed('lines/hk_food', {
    lineId: 'hk_food', cid: 'cid_hk', orderId: 'order_hk', cartId: 'cart_hk', cartItemId: 'hk_food',
    tableId: T('food'), sessionId: S('food'), placedAt: now - 120 * 60_000, placedBy: 'guest', menuItemId: 'mi_biryani',
    name: 'Biryani', qty: 1, listPrice: 184000, sent: true, v: 0, countsTowardTotal: true, draftId: S('food'), billId: null,
    components: [{ id: 'hk_food_item', kind: 'item', name: 'Biryani', unitListPrice: 184000, taxBlockId: 'food', taxCode: '9963' }],
    taxBlocks: { food: FOOD }, offer: null,
  });
  await session('bill', 120);
  await seed('bills/hk_bill', { billId: 'hk_bill', sittingId: S('bill'), payable: 184000, paidTotal: 0, status: 'issued', cid: 'cid_hk_bill', number: 'hk_bill', tableIds: [T('bill')], issuedAt: now - 120 * 60_000 });
  await session('paid', 120);
  await seed('bills/hk_paid', { billId: 'hk_paid', sittingId: S('paid'), payable: 184000, paidTotal: 184000, status: 'paid', cid: 'cid_hk_paid', number: 'hk_paid', tableIds: [T('paid')], issuedAt: now - 125 * 60_000, paidAt: now - 120 * 60_000 });
  await session('fresh', 40);
  await seed(`sessions/${S('nodate')}`, { tableId: T('nodate'), status: 'active', users: ['guest_hk'], expiresAt: new Date(now + 3600_000) });
  await session('p', 120);

  // ── the sweep ───────────────────────────────────────────────────────────
  const r = await call('table-cleanupInactiveSessions', {});
  const report = (r.data?.reports || []).find(x => x.restaurantId === RID);
  check('the manual trigger answers a report for this restaurant', r.status === 'success' && report, r);

  const table = n => getDoc(`tables/${T(n)}`);
  const sess = n => getDoc(`sessions/${S(n)}`);

  {
    const [t, s, a] = await Promise.all([table('walk'), sess('walk'), getDoc(`audit/${S('walk')}_autoVacate`)]);
    check('FL-S36 walk: 2h idle, nothing owed → table vacant, session ended', t?.status === 'vacant' && s?.status === 'ended', { t, s });
    check('FL-S36 walk: one audit row by "system" saying idle 120m, no open money', a?.action === 'table.autoVacate' && a?.by === 'system' && a?.idleMinutes === 120 && a?.why === 'idle 120m, no open money', a);
  }
  check('FL-S36 cart: a round written 5m ago keeps the table (busy)', (await table('cart'))?.status === 'active' && (await sess('cart'))?.status === 'active', await table('cart'));
  check('FL-S36 reopen: an OR-S22 extend 10m ago keeps the table', (await table('reopen'))?.status === 'active', await table('reopen'));
  check('FL-S36 scan: a re-scan 3m ago (table.lastActivity) keeps the table', (await table('scan'))?.status === 'active', await table('scan'));
  check('FL-S36 food: 184000 unbilled, 2h idle → NOT freed', (await table('food'))?.status === 'active' && (await sess('food'))?.status === 'active' && report?.money?.includes(S('food')), report);
  check('FL-S36 bill: 184000 unpaid, 2h idle → NOT freed', (await table('bill'))?.status === 'active' && report?.money?.includes(S('bill')), report);
  check('FL-S36 paid: settled 2h ago, nobody cleared → freed', (await table('paid'))?.status === 'vacant' && (await sess('paid'))?.status === 'ended', await table('paid'));
  check('FL-S36 fresh: opened 40m ago is not a candidate', (await table('fresh'))?.status === 'active', await table('fresh'));
  check('FL-S36 nodate: a session with no createdAt is never freed (fail closed)', (await table('nodate'))?.status === 'active' && (await sess('nodate'))?.status === 'active', await sess('nodate'));
  {
    const [p, c, s, a] = await Promise.all([table('p'), table('c'), sess('p'), getDoc(`audit/${S('p')}_autoVacate`)]);
    check('FL-S36 group: parent and child both vacant, child unmerged, session ended', p?.status === 'vacant' && c?.status === 'vacant' && c?.mergedInto === null && s?.status === 'ended', { p, c, s });
    check('FL-S36 group: the one audit row lists both tables', Array.isArray(a?.tableIds) && a.tableIds.length === 2, a);
  }
  const hk = xs => (xs || []).filter(x => /_hk_/.test(x));   // other suites leave sittings with money behind; count only ours
  check('report counts: freed 4 tables (walk, paid, p, c), money 2 (food, bill), skipped 0', hk(report?.freed).length === 4 && hk(report?.money).length === 2 && report?.skipped?.length === 0, report);

  // ── a second sweep is a no-op ───────────────────────────────────────────
  {
    const again = await call('table-cleanupInactiveSessions', {});
    const rep2 = (again.data?.reports || []).find(x => x.restaurantId === RID);
    check('running the sweep again frees nothing and writes no second audit row', rep2?.freed?.length === 0 && (await listCol('audit')).filter(x => x.id === `${S('walk')}_autoVacate`).length === 1, rep2);
  }

  return results;
}
