// QA helper for screen exploration of the till floor (AGENT_QA.md §5 "seed, act, check").
// Puts one Meghana table into a named state THROUGH THE REAL ENDPOINTS (guest OTP, cart, checkout,
// billing-issue, payments-take), so every state is one the product itself produced — never a
// hand-written document in the shape the reader expects.
//
//   node floorstate.mjs <tableNumber> <state>      state: see STATES below
//   node floorstate.mjs <tableNumber> dump         what the database says about that table
//   node floorstate.mjs audit [n]                  the newest n audit rows (default 8)
//   node floorstate.mjs <tableNumber> reset        that table (and any table merged into it) back to the seed, free
//   node floorstate.mjs <tableNumber> seen         what each other app sees: till tile, each draft's preview, kitchen and waiter reads
//   node floorstate.mjs gate on|off                Meghana's waiter-confirmation gate (the leaf only)
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
async function staff(user = 'manager') {
  const r = await call('server-serverLogin', { restaurantId: RID, username: `${user}@meg.test`, password: '1234' });
  return r.sessionId || die(`${user} login failed`);
}
export { staff as login };
// The waiter-confirmation gate (CLAUDE.md). Masks the leaf only: masking `ordering` would wipe Meghana's parcels.
export async function gate(on) {
  const r = await fetch(`${FS}/config/settings?updateMask.fieldPaths=ordering.requireWaiterConfirmation`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { ordering: enc({ requireWaiterConfirmation: on }) } }) });
  if (!r.ok) die(`gate: ${r.status} ${await r.text()}`);
  const v = (await get('config/settings'))?.ordering;
  log(`  gate requireWaiterConfirmation=${v?.requireWaiterConfirmation}, takeawayTableIds=${JSON.stringify(v?.takeawayTableIds)}`);
  return v;
}
const cartTo = async (orderId, cartIndex, newStatus, user = 'kitchen') =>
  call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex, newStatus, sessionId: await staff(user) });
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
  // Added by the waiter-app run (2026-09-25). Kitchen acts as kitchen@, a serve as server2@ (not server@, the captain on screen).
  preparing: 'ordered, then the kitchen moved the round to PREPARING',
  ready: 'ordered, then the kitchen marked the round READY',
  served: 'ready, then server2@ marked it SERVED',
  cartcancelled: 'ordered, then manager@ cancelled the round (cart CANCELLED)',
  ordercancelled: 'ordered, then manager@ cancelled the whole order',
  samedish: 'the same dish in two rounds on one guest; round 1 PENDING, round 2 READY',
  samedish2: 'as samedish, both rounds READY',
  awaiting: 'gate ON, guest checkout lands AWAITING_CONFIRMATION (gate left ON: run `gate off` after)',
  clearedlive: 'ordered (PENDING), billed, paid, cleared by manager@ with the round still at the kitchen',
  merged: '8 merged into this table by manager@ (this table vacant; run `ordered` first for "group owes")',
  mergedowes: 'this table ordered, then 8 merged into it',
  staffopen: 'server@ opened the table with covers 2, nothing sent',
  orphan: 'staffopen + one staff line in the cart, never checked out (interrupted Send)',
  guestdraft: 'seated + one dish in the guest cart, not checked out',
  staffexpired: 'no table change: server@\'s staff session expiresAt set a minute ago',
  // Added by the kitchen-app run (2026-09-25): what a cook has to read off a ticket.
  note: 'server@ opened the table and sent Butter Naan with the note "no onion" (Add dishes\' note dialog)',
  qty3: 'one round of Chicken 65 x3',
  tworounds: 'round 1 Butter Naan, round 2 Gulab Jamun, both PENDING',
  variant: 'Chicken Biryani, Family portion + Extra Raita, note "less spicy"',
  biground: 'one round of six different dishes',
  linevoid: 'ordered, then manager@ voided the line with a PIN (approvals-apply void, ST-S5)',
  confirmed: 'awaiting, then server2@ sent it to the kitchen; gate turned off again',
  mergedchild: '8 merged into this table, then a guest scanned table 8 and ordered',
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

// What the till, the kitchen and the waiter each see for one table (the waiter-app run read this after every tap).
export async function seen(t) {
  const [mgr, kit, srv] = [await staff(), await staff('kitchen'), await staff('server')];
  const tile = (await call('floor-get', { restaurantId: RID, staffSessionId: mgr })).tiles.find(x => x.tableIds.includes(t.id)) ?? null;
  const drafts = {};
  for (const s of (await list('sessions')).filter(s => s.tableId === t.id && s.entity !== 'server')) {
    const p = await call('billing-preview', { restaurantId: RID, sessionId: mgr, cid: `qa_seen_${Date.now()}`, draftId: s.id, dropCharges: [] }).catch(e => ({ error: e.message }));
    drafts[`${s.id} (${s.status})`] = p.error ?? { lines: (p.lines || []).map(l => `${l.name} ${l.listPrice}`), payable: p.payable };
  }
  const mine = async (fn, sessionId) => ((r => r.orders || r)(await call(fn, { restaurantId: RID, sessionId }))).filter(o => o.tableId === t.id).map(o => ({ id: o.id || o.orderId, status: o.orderStatus, carts: (o.carts || []).map(c => c.status) }));
  return { tile, drafts, kitchen: await mine('order-getActiveCartsForKitchen', kit), waiter: await mine('order-getActiveOrdersForRestaurant', srv) };
}

/** Puts table `n` into `state` through the real endpoints. Returns the ids a caller needs next. */
export async function setState(n, state) {
  if (!STATES[state]) die(`unknown state ${state}`);
  const t = await tableByNumber(n);
  if (t.status !== 'vacant' && !['reserved', 'disabled', 'staffexpired'].includes(state)) die(`table ${n} is ${t.status}, not vacant — pick a free one or re-seed`);
  const out = { tableId: t.id, guest: null, orderId: null, bill: null };
  log(`table ${n} → ${state}`);
  if (state === 'reserved' || state === 'disabled') { await patch(`tables/${t.id}`, { status: state }); return out; }
  if (state === 'staffexpired') {
    const sid = await staff('server');
    await patch(`sessions/${sid}`, { expiresAt: new Date(Date.now() - 60_000) }); log(`  staff session ${sid} expiresAt a minute ago`); return { ...out, staff: sid };
  }
  if (state === 'merged' || state === 'mergedowes') {
    if (state === 'mergedowes') out.orderId = await order(t, out.guest = await seat(t));
    const c = (await tableByNumber(8)); if (c.status !== 'vacant') die('table 8 is not vacant');
    await call('table-setMerge', { restaurantId: RID, staffSessionId: await staff(), parentTableId: t.id, childTableIds: [c.id], cid: `qa_merge_${Date.now()}`, merge: true });
    log(`  merged ${c.id} into ${t.id}`); return out;
  }
  if (state === 'staffopen' || state === 'orphan') {
    const o = await call('table-openTable', { restaurantId: RID, sessionId: await staff('server'), tableId: t.id, covers: 2 });
    out.guest = o.sessionId; log(`  opened by staff, table session ${o.sessionId}`);
    if (state === 'orphan') { const d = await dish(); await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, sessionId: o.sessionId, addedBy: 'staff:srv_meg_1', menuItemId: d.id, quantity: 1 }); log(`  staff line ${d.meta?.name} left in the cart`); }
    return out;
  }
  if (state === 'awaiting' || state === 'confirmed') await gate(true);
  if (state === 'note') {
    const srv = await staff('server'), o = await call('table-openTable', { restaurantId: RID, sessionId: srv, tableId: t.id, covers: 2 });
    await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, sessionId: o.sessionId, addedBy: 'staff:srv_meg_1', menuItemId: 'mi_butter_naan', quantity: 1, note: 'no onion' });
    const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: t.id, sessionId: o.sessionId, addedBy: 'staff:srv_meg_1' });
    log(`  server@ sent Butter Naan "no onion", order ${co.orderId}`); return { ...out, guest: o.sessionId, orderId: co.orderId };
  }
  if (state === 'mergedchild') {
    const c = await tableByNumber(8); if (c.status !== 'vacant') die('table 8 is not vacant');
    await call('table-setMerge', { restaurantId: RID, staffSessionId: await staff(), parentTableId: t.id, childTableIds: [c.id], cid: `qa_merge_${Date.now()}`, merge: true });
    const g = out.guest = await seat(c);
    await call('cart-addItemToCart', { restaurantId: RID, tableId: c.id, menuItemId: 'mi_gulab', quantity: 1, sessionId: g });
    const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: c.id, sessionId: g });
    log(`  merged ${c.id} into ${t.id}; guest on 8 ordered Gulab Jamun, order ${co.orderId}`); return { ...out, orderId: co.orderId };
  }
  if (state === 'holding') { await patch(`tables/${t.id}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } }); return out; }
  const guest = out.guest = await seat(t);
  log(`  guest session ${guest}`);
  if (state === 'seated') return out;
  if (state === 'guestdraft') { const d = await dish(); await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, menuItemId: d.id, quantity: 1, sessionId: guest }); log(`  ${d.meta?.name} in the guest cart, not checked out`); return out; }
  const one = async (menuItemId, quantity = 1, extra = {}) => call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, menuItemId, quantity, sessionId: guest, ...extra });
  const send = async () => (await call('cart-checkoutCart', { restaurantId: RID, tableId: t.id, sessionId: guest })).orderId;
  if (state === 'qty3') { await one('mi_chicken65', 3); out.orderId = await send(); log(`  Chicken 65 x3, order ${out.orderId}`); return out; }
  if (state === 'tworounds') { await one('mi_butter_naan'); await send(); await one('mi_gulab'); out.orderId = await send(); log(`  round 1 Butter Naan, round 2 Gulab Jamun, order ${out.orderId}`); return out; }
  if (state === 'variant') { await one('mi_chicken_bir', 1, { selectedVariants: { mv_bir_portion: 'family' }, selectedAddons: ['ma_extra_raita'], note: 'less spicy' }); out.orderId = await send(); log(`  Chicken Biryani Family + Extra Raita "less spicy", order ${out.orderId}`); return out; }
  if (state === 'biground') { for (const id of ['mi_butter_naan', 'mi_gulab', 'mi_chicken65', 'mi_crab_roast', 'mi_apollo_fish', 'mi_paneer65']) await one(id); out.orderId = await send(); log(`  six dishes in one round, order ${out.orderId}`); return out; }
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
  if (state === 'ordered' || state === 'awaiting') return out;
  if (state === 'confirmed') { await cartTo(orderId, 0, 'PENDING', 'server2'); await gate(false); log('  server2: sent to the kitchen, gate off'); return out; }
  if (state === 'linevoid') {
    const line = (await list('lines')).find(l => l.sessionId === guest) || die('no line');
    await call('approvals-apply', { restaurantId: RID, sessionId: await staff(), cid: `qa_void_${Date.now()}`, lineId: line.lineId, action: 'void', reason: 'other', note: 'qa', pin: '1234' });
    log(`  manager voided line ${line.lineId}`); return out;
  }
  if (state === 'preparing' || state === 'ready' || state === 'served') {
    if (state === 'preparing') { await cartTo(orderId, 0, 'PREPARING'); log('  kitchen: PREPARING'); return out; }
    await cartTo(orderId, 0, 'READY'); log('  kitchen: READY');
    if (state === 'served') { await call('order-markCartAsServed', { restaurantId: RID, orderId, cartIndex: 0, sessionId: await staff('server2') }); log('  server2: SERVED'); }
    return out;
  }
  if (state === 'cartcancelled') { await cartTo(orderId, 0, 'CANCELLED', 'manager'); log('  manager: cart CANCELLED'); return out; }
  if (state === 'ordercancelled') { await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'CANCELLED', sessionId: await staff() }); log('  manager: order CANCELLED'); return out; }
  if (state === 'samedish' || state === 'samedish2') {
    await order(t, guest);
    if (state === 'samedish2') await cartTo(orderId, 0, 'READY');
    await cartTo(orderId, 1, 'READY'); log(`  kitchen: round 2 READY${state === 'samedish2' ? ', round 1 READY' : ''}`); return out;
  }
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
  if (state === 'clearedlive') {
    await pay(st, b, b.payable);
    await call('floor-clear', { restaurantId: RID, staffSessionId: st, tableId: t.id, cid: `qa_clear_${Date.now()}` });
    log(`  paid ${R(b.payable)} and cleared, round still PENDING`); return out;
  }
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
  const tLines = (await list('lines')).filter(l => ids.includes(l.tableId) || sess.includes(l.sessionId));
  // A print job whose lines are gone is refused at claim, and the agent retries it forever ahead of every
  // other ticket for that station (kitchen-app run, 2026-09-25). Jobs are keyed `<kind>:<cartId>:…`.
  const cartIds = new Set(tLines.map(l => l.cartId));
  for (const j of (await list('printJobs')).filter(j => cartIds.has(j.id.split(':')[1]))) await del(`printJobs/${encodeURIComponent(j.id)}`);
  for (const l of tLines) await del(`lines/${l.id}`);
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
    if (arg === 'gate') await gate(state === 'on');
    else if (arg === 'audit') {
      const rows = (await list('audit')).sort((a, b) => String(b.at ?? b.createdAt).localeCompare(String(a.at ?? a.createdAt))).slice(0, Number(state) || 8);
      for (const r of rows) console.log(JSON.stringify(r));
    } else if (!arg || !state) {
      console.log('usage: floorstate.mjs <tableNumber> <state|dump|seen|reset> | gate on|off\nstates:'); for (const [k, v] of Object.entries(STATES)) console.log(`  ${k.padEnd(10)} ${v}`); process.exit(1);
    } else if (state === 'dump') console.log(JSON.stringify(await dump(await tableByNumber(arg)), null, 1));
    else if (state === 'reset') await resetTable(arg);
    else if (state === 'seen') console.log(JSON.stringify(await seen(await tableByNumber(arg)), null, 1));
    else await setState(arg, state);
  } catch (e) { console.error(`ABORT: ${e.message}`); process.exit(1); }
}
