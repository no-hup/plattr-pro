/**
 * Shared harness for the .mjs journeys (journey.mjs, pricing-matrix.mjs).
 *
 * Everything here talks to the emulator the way an outside client would: Cloud Functions over
 * HTTP, Firestore over its REST API with `Bearer owner`. No app code is imported, on purpose —
 * a test that imports the thing it is checking can only ever agree with it.
 */
import config from './config.js';

export const BASE = config.BASE_URL;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

// ── Firestore REST codec ──────────────────────────────────────────────────────
const enc = v =>
  v === null ? { nullValue: null } :
  typeof v === 'string' ? { stringValue: v } :
  typeof v === 'boolean' ? { booleanValue: v } :
  typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) :
  v instanceof Date ? { timestampValue: v.toISOString() } :
  Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } :
  { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };

export function dec(f) {
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
const flat = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
const body = o => JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)])) });

/** Document helpers bound to one restaurant. */
export function fsFor(RID) {
  const at = p => `${FS}/restaurants/${RID}/${p}`;
  return {
    getDoc: async p => { const r = await fetch(at(p), { headers: H }); return r.status === 404 ? null : flat(await r.json()); },
    setDoc: async (p, o) => { const r = await fetch(at(p), { method: 'PATCH', headers: H, body: body(o) }); if (!r.ok) throw new Error(`seed ${p}: ${r.status} ${await r.text()}`); },
    patchDoc: async (p, o) => {                                     // merge: only the named fields change
      const mask = Object.keys(o).map(k => `updateMask.fieldPaths=${k}`).join('&');
      const r = await fetch(`${at(p)}?${mask}`, { method: 'PATCH', headers: H, body: body(o) });
      if (!r.ok) throw new Error(`patch ${p}: ${r.status} ${await r.text()}`);
    },
    listCol: async (c, n = 300) => {
      const j = await (await fetch(`${at(c)}?pageSize=${n}`, { headers: H })).json();
      return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...flat(d) }));
    },
    delDoc: async p => { await fetch(at(p), { method: 'DELETE', headers: H }); },
  };
}

export async function call(endpoint, payload = {}) {
  const r = await fetch(`${BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: payload }) });
  let j; try { j = await r.json(); } catch { return { status: 'error', message: `non-JSON from ${endpoint} (HTTP ${r.status})` }; }
  const res = j.result || j;
  if (!res.status && j.error) return { status: 'error', message: j.error.message || 'error', error: j.error };
  return res;
}
export const errOf = r => r?.error?.details?.data ?? r?.error?.data ?? r?.data ?? {};
// The cart endpoints answer { success: true }; the order and billing ones answer
// { status: 'success' }. Two conventions in one flow, so accept either.
export const ok = r => r?.status === 'success' || r?.success === true;

// ── reporting ─────────────────────────────────────────────────────────────────
export const R = n => `₹${(n / 100).toFixed(2)}`;
export const counts = { pass: 0, fail: 0 };
export const step = s => console.log(`\n\x1b[1m── ${s}\x1b[0m`);
export const info = (k, v) => console.log(`   ${String(k).padEnd(24)} ${v}`);
export function check(label, cond, actual) {
  if (cond) { counts.pass++; console.log(`   \x1b[32m✓\x1b[0m ${label}`); }
  else { counts.fail++; console.log(`   \x1b[31m✗ ${label}\x1b[0m`); if (actual !== undefined) console.log(`     ${typeof actual === 'string' ? actual : JSON.stringify(actual).slice(0, 400)}`); }
}
export const die = m => { console.error(`\n\x1b[31mABORT: ${m}\x1b[0m`); process.exit(1); };

// ── the tax config a mock restaurant is missing ───────────────────────────────
export const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }], defaultCode: '996331' };
export const LIQUOR = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [], defaultCode: '' };
export const TENDERS = [
  { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
  { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
  { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
];

/** Stamp GST onto every menu item and give the restaurant tenders. Returns { items, prior }. */
export async function makeBillable(RID, { liquorMatch = '' } = {}) {
  const { getDoc, setDoc, patchDoc, listCol } = fsFor(RID);
  const prior = await getDoc('config/settings');
  if (!prior) die(`no config/settings for ${RID} — is it imported?`);
  await setDoc('config/settings', {
    ...prior,
    tax: { blocks: { food: FOOD, liquor: LIQUOR } },
    tenders: TENDERS,
    seller: { name: prior.name || RID, taxId: 'GSTIN_JOURNEY' },
    billing: { ...(prior.billing || {}), charges: [], roundTo: 100 },
  });
  const items = await listCol('menuItems');
  if (!items.length) die(`no menuItems under ${RID}`);
  let liq = 0;
  for (const it of items) {
    const cat = `${it.meta?.categoryName || ''} ${it.meta?.primarySubcategoryName || ''}`.toLowerCase();
    const isLiquor = liquorMatch ? cat.includes(liquorMatch.toLowerCase()) : /beer|liquor|bar|alcohol|wine|spirit|cocktail/.test(cat);
    if (isLiquor) liq++;
    await patchDoc(`menuItems/${it.id}`, { taxBlockId: isLiquor ? 'liquor' : 'food', taxCode: isLiquor ? '' : '996331' });
  }
  return { items, prior, liquorCount: liq };
}

/** A vacant table with an OTP we know. Pass `avoid` to keep parallel scenarios off each other. */
export async function pickTable(RID, avoid = []) {
  const { patchDoc, listCol } = fsFor(RID);
  const tables = await listCol('tables');
  const free = tables.filter(t => !avoid.includes(t.id));
  const t = free.find(x => String(x.status).toLowerCase() === 'vacant' && !x.currentSessionId) || free[0];
  if (!t) die('no tables left');
  await patchDoc(`tables/${t.id}`, { status: 'vacant', currentSessionId: null, currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  return t;
}

/**
 * A table with NOTHING on it. Orders are grouped by table (see the pre-launch findings note), so a
 * leftover open order — from the seed, or from the last run of this file — silently absorbs the next
 * checkout and the scenario ends up billing someone else's food. Clear it, then seat.
 */
export async function claimTable(RID, tableId) {
  const { patchDoc, listCol, delDoc } = fsFor(RID);
  const orders = (await listCol('orders')).filter(o => o.tableId === tableId);
  const lines = await listCol('lines');
  for (const o of orders) {
    for (const l of lines.filter(x => x.orderId === o.id)) await delDoc(`lines/${l.id}`);
    await delDoc(`orders/${o.id}`);
  }
  await patchDoc(`tables/${tableId}`, {
    status: 'vacant', currentSessionId: null,
    currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) },
  });
  return { tableId, cleared: orders.length };
}

/**
 * TD-040: what the cashier's preview shows — the draft's unbilled lines and the version each was shown at.
 * `billing-issue` refuses unless its `expectedV` is exactly this set, so every scripted issue sends it.
 */
export async function draftVersions(RID, draftId) {
  const q = { structuredQuery: { from: [{ collectionId: 'lines' }], where: { fieldFilter: { field: { fieldPath: 'draftId' }, op: 'EQUAL', value: { stringValue: draftId } } } } };
  const r = await fetch(`${FS}/restaurants/${RID}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify(q) });
  const rows = (await r.json()).filter(x => x.document).map(x => flat(x.document));
  return Object.fromEntries(rows.filter(l => l.billId === null || l.billId === undefined).map(l => [l.lineId, l.v]));
}

export async function staffLogin(RID) {
  const { listCol } = fsFor(RID);
  const servers = await listCol('servers');
  const mgr = servers.find(s => ['MANAGER', 'ADMIN'].includes(s.role) && String(s.status).toLowerCase() === 'active');
  if (!mgr) die('no active MANAGER/ADMIN in servers — billing-issue needs one');
  const r = await call('server-serverLogin', { restaurantId: RID, username: mgr.email, password: '1234' });
  if (!r.data?.sessionId) die(`manager login failed for ${mgr.email}: ${r.message || JSON.stringify(r)}`);
  return { sessionId: r.data.sessionId, name: mgr.name, role: mgr.role };
}
