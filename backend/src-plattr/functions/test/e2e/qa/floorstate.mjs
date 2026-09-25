// QA helper for screen exploration of the till floor (AGENT_QA.md §5 "seed, act, check").
// Puts one Meghana table into a named state THROUGH THE REAL ENDPOINTS (guest OTP, cart, checkout,
// billing-issue, payments-take), so every state is one the product itself produced — never a
// hand-written document in the shape the reader expects.
//
//   node floorstate.mjs <tableNumber> <state>      state: see STATES below
//   node floorstate.mjs <tableNumber> dump         what the database says about that table
//   node floorstate.mjs audit [n]                  the newest n audit rows (default 8)
//   node floorstate.mjs <tableNumber> reset        that table (and any table merged into it) back to the seed, free
//
// Also a module: the till's Playwright specs import setState / resetTable / dump from here, so the QA
// driver and the tests share one set of states (ticket 2026-09-25-ticket-till-test-stack.md).
// Env: FIRESTORE_EMULATOR_HOST and PLATTR_BASE_URL from `EMU_SLOT=<n> ./emu.sh env`.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const RID = process.env.QA_RID || 'res_meghana';
const FSH = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const BASE = process.env.PLATTR_BASE_URL || 'http://127.0.0.1:5002/rms-app-dd875/us-central1';
const FS = `http://${FSH}/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/${RID}`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

const enc = v => v === null ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : v instanceof Date ? { timestampValue: v.toISOString() }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const dec = f => !f ? undefined : 'nullValue' in f ? null : 'stringValue' in f ? f.stringValue : 'booleanValue' in f ? f.booleanValue
  : 'integerValue' in f ? Number(f.integerValue) : 'doubleValue' in f ? f.doubleValue : 'timestampValue' in f ? f.timestampValue
  : 'arrayValue' in f ? (f.arrayValue.values || []).map(dec) : 'mapValue' in f ? Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : undefined;
const flat = d => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, dec(v)])) });
export const get = async p => { const r = await fetch(`${FS}/${p}`, { headers: H }); return r.ok ? flat(await r.json()) : null; };
export const list = async c => ((await (await fetch(`${FS}/${c}?pageSize=500`, { headers: H })).json()).documents || []).map(flat);
const patch = async (p, o) => {
  const mask = Object.keys(o).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${FS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`patch ${p}: ${r.status} ${await r.text()}`);
};
export async function call(endpoint, data) {
  const r = await fetch(`${BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  const j = await r.json().catch(() => ({}));
  const res = j.result || j;
  if (res.status === 'success' || res.success === true) return res.data ?? res;
  throw new Error(`${endpoint}: ${j.error?.message || res.message || JSON.stringify(j).slice(0, 300)}`);
}
const R = n => `₹${(n / 100).toFixed(2)}`;
const die = m => { throw new Error(m); };
let log = () => {};   // the CLI prints each step; an importing spec stays quiet

export const tableByNumber = async n => (await list('tables')).find(t => String(t.number) === String(n)) || die(`no table numbered ${n}`);
async function staff() {
  const r = await call('server-serverLogin', { restaurantId: RID, username: 'manager@meg.test', password: '1234' });
  return r.sessionId || die('manager login failed');
}
// One plain dish: not customizable, priced, no category offer on biryani. Fixed so amounts repeat.
async function dish() {
  const items = await list('menuItems');
  const plain = items.filter(m => !m.isCustomizable && m.priceInfo?.finalPrice > 0 && m.priceInfo.finalPrice === m.priceInfo.basePrice && !/biryani|\bml\)|beer|bira/i.test(m.meta?.name || ''));
  return plain.sort((a, b) => a.id.localeCompare(b.id))[0] || die('no plain dish');
}

async function seat(t) {
  await patch(`tables/${t.id}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const r = await call('table-validateOTP', { restaurantId: RID, tableId: t.id, otp: '123456', phoneNumber: '9876543210', name: `QA ${t.number}` });
  return r.sessionId || die('no guest session');
}
async function order(t, guest) {
  const d = await dish();
  await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, menuItemId: d.id, quantity: 1, sessionId: guest });
  const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: t.id, sessionId: guest });
  log(`  ordered ${d.meta?.name} ${R(Math.round(d.priceInfo.finalPrice * 100))}, order ${co.orderId}`);
  return co.orderId;
}
async function versions(draftId) {
  return Object.fromEntries((await list('lines')).filter(l => l.draftId === draftId && !l.billId).map(l => [l.lineId, l.v]));
}
async function issue(st, draftId) {
  const b = await call('billing-issue', { restaurantId: RID, sessionId: st, draftId, cid: `qa_${Date.now()}`, expectedV: await versions(draftId) });
  log(`  issued bill ${b.billId} ${b.series}-${b.number} payable ${R(b.payable)}`);
  return b;
}
const pay = (st, b, amount) => call('payments-take', { restaurantId: RID, sessionId: st, billId: b.billId, paymentId: `qa_pay_${Date.now()}`, tenderId: 'cash', amount, tendered: amount });

export const STATES = {
  holding: 'a guest scanned the QR and is on the code screen (OTP in flight, no session)',
  seated: 'guest signed in, nothing ordered',
  ordered: 'one plain dish checked out, no bill',
  billed: 'ordered + bill issued, nothing paid',
  partpaid: 'billed + half paid in cash',
  settled: 'billed + paid in full, sitting still open',
  dessert: 'billed, then the guest ordered again (FL-S20)',
  split: 'two dishes, split onto two drafts (FL-S21)',
  offer: 'Chicken 65 + Coastal Crab Roast in one checkout, so the ORDER offer FLAT ₹100 fires (BL-S24)',
  completed: 'ordered, then the captain marked the order COMPLETED (FL-S16)',
  expired: 'ordered, then the guest session expired (FL-S34)',
  reserved: 'table status reserved',
  disabled: 'table status disabled',
  // Added by the tender-screen run (2026-09-25). PIN 1234, reason 'other'.
  comped: 'ordered, then the whole bill comped at issue (BL-S22): payable ₹0, born paid (PY-S8)',
  cancelled: 'billed, then the bill cancelled before anyone paid (PY-S14)',
  cancelpp: 'part-paid ₹33 cash, then the bill cancelled anyway (QB-2 shape)',
  credited: 'settled in cash, then a credit note raised on the dish (PY-S9 setup)',
  onaccount: 'billed, then put on account for "Acme" (BT)',
};

export async function dump(t) {
  const tb = await get(`tables/${t.id}`);
  const sess = (await list('sessions')).filter(s => s.tableId === t.id && s.entity !== 'server');
  const lines = (await list('lines')).filter(l => l.tableId === t.id || sess.some(s => s.id === l.sessionId));
  const bills = (await list('bills')).filter(b => (b.tableIds || []).includes(t.id) || sess.some(s => s.id === b.sittingId));
  const orders = (await list('orders')).filter(o => o.tableId === t.id);
  return {
    table: { id: tb.id, number: tb.number, status: tb.status, mergedInto: tb.mergedInto ?? null, mergedTables: tb.mergedTables ?? null, currentSessionId: tb.currentSessionId ?? null, otpInFlight: !!tb.currentOTP },
    sessions: sess.map(s => ({ id: s.id, status: s.status, tableId: s.tableId, expiresAt: s.expiresAt })),
    orders: orders.map(o => ({ id: o.id, status: o.orderStatus, tableId: o.tableId, carts: (o.carts || []).map(c => c.status) })),
    lines: lines.map(l => ({ id: l.lineId, name: l.name, list: l.listPrice, tableId: l.tableId, sessionId: l.sessionId, draftId: l.draftId, billId: l.billId, counts: l.countsTowardTotal })),
    bills: bills.map(b => ({ id: b.billId, no: `${b.series}-${b.number}`, status: b.status, payable: b.payable, paid: b.paidTotal ?? b.paid, sittingId: b.sittingId, tableIds: b.tableIds })),
  };
}


/** Puts table `n` into `state` through the real endpoints. Returns the ids a caller needs next. */
export async function setState(n, state) {
  if (!STATES[state]) die(`unknown state ${state}`);
  const t = await tableByNumber(n);
  if (t.status !== 'vacant' && !['reserved', 'disabled'].includes(state)) die(`table ${n} is ${t.status}, not vacant — pick a free one or re-seed`);
  const out = { tableId: t.id, guest: null, orderId: null, bill: null };
  log(`table ${n} → ${state}`);
  if (state === 'reserved' || state === 'disabled') { await patch(`tables/${t.id}`, { status: state }); return out; }
  if (state === 'holding') { await patch(`tables/${t.id}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } }); return out; }
  const guest = out.guest = await seat(t);
  log(`  guest session ${guest}`);
  if (state === 'seated') return out;
  if (state === 'offer') {
    for (const id of ['mi_chicken65', 'mi_crab_roast']) await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, menuItemId: id, quantity: 1, sessionId: guest });
    const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: t.id, sessionId: guest });
    log(`  ordered Chicken 65 + Coastal Crab Roast, order ${co.orderId}`);
    out.orderId = co.orderId; return out;
  }
  const orderId = out.orderId = await order(t, guest);
  if (state === 'split') {
    await order(t, guest);
    const st = await staff();
    const second = (await list('lines')).filter(l => l.sessionId === guest).sort((a, b) => a.lineId.localeCompare(b.lineId))[1];
    await call('billing-split', { restaurantId: RID, sessionId: st, cid: `qa_split_${Date.now()}`, draftId: guest, moves: [{ lineId: second.lineId, toDraftId: `${guest}_b` }] });
    log(`  split ${second.name} onto draft ${guest}_b`);
    return out;
  }
  if (state === 'ordered') return out;
  if (state === 'completed') {
    const st = await staff();
    await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'COMPLETED', sessionId: st });
    log('  captain marked the order COMPLETED'); return out;
  }
  if (state === 'expired') { await patch(`sessions/${guest}`, { expiresAt: new Date(Date.now() - 60_000) }); log('  session expiresAt set a minute ago'); return out; }
  if (state === 'comped') {   // what the bill screen's Comp sends: the whole net as a 100 % bill discount, PIN
    const st0 = await staff();
    const net = (await list('lines')).filter(l => l.draftId === guest && !l.billId && l.countsTowardTotal !== false).reduce((s, l) => s + l.listPrice, 0);
    const c = out.bill = await call('billing-issue', { restaurantId: RID, sessionId: st0, draftId: guest, cid: `qa_comp_${Date.now()}`, expectedV: await versions(guest), discount: { amount: net, pct: 100, source: { reason: 'complimentary', note: 'qa' } }, pin: '1234' });
    log(`  comped: bill ${c.billId} ${c.series}-${c.number} payable ${R(c.payable)} status ${c.status}`); return out;
  }
  const st = await staff();
  const b = out.bill = await issue(st, guest);
  if (state === 'billed') return out;
  if (state === 'dessert') { await order(t, guest); return out; }
  if (state === 'partpaid') { await pay(st, b, Math.floor(b.payable / 200) * 100); log(`  took ${R(Math.floor(b.payable / 200) * 100)} cash`); return out; }
  if (state === 'settled') { await pay(st, b, b.payable); log(`  took ${R(b.payable)} cash, bill paid`); return out; }
  // ── tender-screen states (2026-09-25) ──
  const cancelBill = () => call('billing-cancel', { restaurantId: RID, sessionId: st, cid: b.cid || `qa_c_${Date.now()}`, billId: b.billId, reason: 'other', note: 'qa', pin: '1234' });
  if (state === 'cancelled') { await cancelBill(); log(`  cancelled ${b.billId}`); return out; }
  if (state === 'cancelpp') { await pay(st, b, Math.floor(b.payable / 200) * 100); await cancelBill(); log(`  took ${R(Math.floor(b.payable / 200) * 100)} cash, then cancelled ${b.billId}`); return out; }
  if (state === 'credited') {
    await pay(st, b, b.payable);
    const line = (b.lines || []).find(l => l.countsTowardTotal !== false) || die('no line on the bill');
    const n2 = out.note = await call('billing-creditNote', { restaurantId: RID, sessionId: st, cid: b.cid || `qa_cn_${Date.now()}`, billId: b.billId, reason: 'other', note: 'qa', pin: '1234', credits: [{ lineId: line.lineId, qty: 1 }] });
    log(`  paid ${R(b.payable)} cash, credit note ${n2.billId} ${n2.series}-${n2.number} for ${R(-n2.payable)}`); return out;
  }
  if (state === 'onaccount') {
    await call('payments-take', { restaurantId: RID, sessionId: st, billId: b.billId, paymentId: `qa_acct_${Date.now()}`, tenderId: 'account', amount: b.payable, ref: 'Acme' });
    log(`  put ${R(b.payable)} on account for Acme`); return out;
  }
  return out;
}

// Per-table reset, so one table goes back to free without re-importing the whole seed (the QA runs re-seeded
// three times each to reset one table). A reset is a delete, not a state a reader sees, so writing documents
// here is fine: the table doc goes back to the seed file's own copy, and its sittings, orders, lines, bills,
// credit notes and payments are deleted. Audit rows stay: they are append-only.
const SEED = new URL('../../../mock/MockData7ProductionMenus.json', import.meta.url);
const fromSeed = v => v && typeof v === 'object' && '_seconds' in v ? new Date(v._seconds * 1000)
  : Array.isArray(v) ? v.map(fromSeed) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromSeed(x)])) : v;
const del = p => fetch(`${FS}/${p}`, { method: 'DELETE', headers: H });
export async function resetTable(n) {
  const t = await tableByNumber(n);
  const seedTables = JSON.parse(readFileSync(SEED, 'utf8')).restaurants[RID].tables;
  const ids = [t.id, ...(await list('tables')).filter(x => x.mergedInto === t.id).map(x => x.id)];
  const sess = (await list('sessions')).filter(s => ids.includes(s.tableId) && s.entity !== 'server').map(s => s.id);
  const bills = (await list('bills')).filter(b => (b.tableIds || []).some(i => ids.includes(i)) || sess.includes(b.sittingId));
  const billIds = bills.map(b => b.id);
  const notes = (await list('bills')).filter(b => billIds.includes(b.creditNoteOf?.billId)).map(b => b.id);
  for (const l of (await list('lines')).filter(l => ids.includes(l.tableId) || sess.includes(l.sessionId))) await del(`lines/${l.id}`);
  for (const p of (await list('payments')).filter(p => billIds.includes(p.billId) || notes.includes(p.billId))) await del(`payments/${p.id}`);
  for (const id of [...billIds, ...notes]) await del(`bills/${id}`);
  for (const o of (await list('orders')).filter(o => ids.includes(o.tableId))) await del(`orders/${o.id}`);
  for (const c of (await list('carts')).filter(c => ids.includes(c.tableId))) await del(`carts/${c.id}`);
  for (const id of sess) await del(`sessions/${id}`);
  for (const id of ids) {
    const doc = fromSeed(seedTables[id]) || die(`${id} is not in the seed file`);
    const r = await fetch(`${FS}/tables/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, enc(v)])) }) });
    if (!r.ok) die(`reset tables/${id}: ${r.status}`);
  }
  log(`reset ${ids.join(', ')}: ${sess.length} sittings, ${billIds.length} bills, ${notes.length} credit notes`);
}

// ── CLI ──
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  log = console.log;
  const [arg, state] = process.argv.slice(2);
  try {
    if (arg === 'audit') {
      const rows = (await list('audit')).sort((a, b) => String(b.at ?? b.createdAt).localeCompare(String(a.at ?? a.createdAt))).slice(0, Number(state) || 8);
      for (const r of rows) console.log(JSON.stringify(r));
    } else if (!arg || !state) {
      console.log('usage: floorstate.mjs <tableNumber> <state|dump|reset>\nstates:'); for (const [k, v] of Object.entries(STATES)) console.log(`  ${k.padEnd(10)} ${v}`); process.exit(1);
    } else if (state === 'dump') console.log(JSON.stringify(await dump(await tableByNumber(arg)), null, 1));
    else if (state === 'reset') await resetTable(arg);
    else await setState(arg, state);
  } catch (e) { console.error(`ABORT: ${e.message}`); process.exit(1); }
}
