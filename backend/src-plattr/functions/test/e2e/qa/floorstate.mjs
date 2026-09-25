// QA helper for screen exploration of the till floor (AGENT_QA.md §5 "seed, act, check").
// Puts one Meghana table into a named state THROUGH THE REAL ENDPOINTS (guest OTP, cart, checkout,
// billing-issue, payments-take), so every state is one the product itself produced — never a
// hand-written document in the shape the reader expects.
//
//   node floorstate.mjs <tableNumber> <state>      state: see STATES below
//   node floorstate.mjs <tableNumber> dump         what the database says about that table
//   node floorstate.mjs audit [n]                  the newest n audit rows (default 8)
//
// Env: FIRESTORE_EMULATOR_HOST and PLATTR_BASE_URL from `EMU_SLOT=<n> ./emu.sh env`.
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
const get = async p => { const r = await fetch(`${FS}/${p}`, { headers: H }); return r.ok ? flat(await r.json()) : null; };
const list = async c => ((await (await fetch(`${FS}/${c}?pageSize=500`, { headers: H })).json()).documents || []).map(flat);
const patch = async (p, o) => {
  const mask = Object.keys(o).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${FS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`patch ${p}: ${r.status} ${await r.text()}`);
};
async function call(endpoint, data) {
  const r = await fetch(`${BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  const j = await r.json().catch(() => ({}));
  const res = j.result || j;
  if (res.status === 'success' || res.success === true) return res.data ?? res;
  throw new Error(`${endpoint}: ${j.error?.message || res.message || JSON.stringify(j).slice(0, 300)}`);
}
const R = n => `₹${(n / 100).toFixed(2)}`;
const die = m => { console.error(`ABORT: ${m}`); process.exit(1); };

const tableByNumber = async n => (await list('tables')).find(t => String(t.number) === String(n)) || die(`no table numbered ${n}`);
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
  console.log(`  ordered ${d.meta?.name} ${R(Math.round(d.priceInfo.finalPrice * 100))}, order ${co.orderId}`);
  return co.orderId;
}
async function versions(draftId) {
  return Object.fromEntries((await list('lines')).filter(l => l.draftId === draftId && !l.billId).map(l => [l.lineId, l.v]));
}
async function issue(st, draftId) {
  const b = await call('billing-issue', { restaurantId: RID, sessionId: st, draftId, cid: `qa_${Date.now()}`, expectedV: await versions(draftId) });
  console.log(`  issued bill ${b.billId} ${b.series}-${b.number} payable ${R(b.payable)}`);
  return b;
}
const pay = (st, b, amount) => call('payments-take', { restaurantId: RID, sessionId: st, billId: b.billId, paymentId: `qa_pay_${Date.now()}`, tenderId: 'cash', amount, tendered: amount });

const STATES = {
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
};

async function dump(t) {
  const tb = await get(`tables/${t.id}`);
  const sess = (await list('sessions')).filter(s => s.tableId === t.id && s.entity !== 'server');
  const lines = (await list('lines')).filter(l => l.tableId === t.id || sess.some(s => s.id === l.sessionId));
  const bills = (await list('bills')).filter(b => (b.tableIds || []).includes(t.id) || sess.some(s => s.id === b.sittingId));
  const orders = (await list('orders')).filter(o => o.tableId === t.id);
  console.log(JSON.stringify({
    table: { id: tb.id, number: tb.number, status: tb.status, mergedInto: tb.mergedInto ?? null, mergedTables: tb.mergedTables ?? null, currentSessionId: tb.currentSessionId ?? null, otpInFlight: !!tb.currentOTP },
    sessions: sess.map(s => ({ id: s.id, status: s.status, tableId: s.tableId, expiresAt: s.expiresAt })),
    orders: orders.map(o => ({ id: o.id, status: o.orderStatus, tableId: o.tableId, carts: (o.carts || []).map(c => c.status) })),
    lines: lines.map(l => ({ id: l.lineId, name: l.name, list: l.listPrice, tableId: l.tableId, sessionId: l.sessionId, draftId: l.draftId, billId: l.billId, counts: l.countsTowardTotal })),
    bills: bills.map(b => ({ id: b.billId, no: `${b.series}-${b.number}`, status: b.status, payable: b.payable, paid: b.paidTotal ?? b.paid, sittingId: b.sittingId, tableIds: b.tableIds })),
  }, null, 1));
}

const [arg, state] = process.argv.slice(2);
if (arg === 'audit') {
  const rows = (await list('audit')).sort((a, b) => String(b.at ?? b.createdAt).localeCompare(String(a.at ?? a.createdAt))).slice(0, Number(state) || 8);
  for (const r of rows) console.log(JSON.stringify(r));
  process.exit(0);
}
if (!arg || !state) { console.log('usage: floorstate.mjs <tableNumber> <state|dump>\nstates:'); for (const [k, v] of Object.entries(STATES)) console.log(`  ${k.padEnd(10)} ${v}`); process.exit(1); }
const t = await tableByNumber(arg);
if (state === 'dump') { await dump(t); process.exit(0); }
if (!STATES[state]) die(`unknown state ${state}`);
if (t.status !== 'vacant' && !['reserved', 'disabled'].includes(state)) die(`table ${arg} is ${t.status}, not vacant — pick a free one or re-seed`);

console.log(`table ${arg} → ${state}`);
if (state === 'reserved' || state === 'disabled') { await patch(`tables/${t.id}`, { status: state }); process.exit(0); }
if (state === 'holding') { await patch(`tables/${t.id}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } }); process.exit(0); }
const guest = await seat(t);
console.log(`  guest session ${guest}`);
if (state === 'seated') process.exit(0);
if (state === 'offer') {
  for (const id of ['mi_chicken65', 'mi_crab_roast']) await call('cart-addItemToCart', { restaurantId: RID, tableId: t.id, menuItemId: id, quantity: 1, sessionId: guest });
  const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: t.id, sessionId: guest });
  console.log(`  ordered Chicken 65 + Coastal Crab Roast, order ${co.orderId}`);
  process.exit(0);
}
const orderId = await order(t, guest);
if (state === 'split') {
  await order(t, guest);
  const st = await staff();
  const second = (await list('lines')).filter(l => l.sessionId === guest).sort((a, b) => a.lineId.localeCompare(b.lineId))[1];
  await call('billing-split', { restaurantId: RID, sessionId: st, cid: `qa_split_${Date.now()}`, draftId: guest, moves: [{ lineId: second.lineId, toDraftId: `${guest}_b` }] });
  console.log(`  split ${second.name} onto draft ${guest}_b`);
  process.exit(0);
}
if (state === 'ordered') process.exit(0);
if (state === 'completed') {
  const st = await staff();
  await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'COMPLETED', sessionId: st });
  console.log('  captain marked the order COMPLETED'); process.exit(0);
}
if (state === 'expired') { await patch(`sessions/${guest}`, { expiresAt: new Date(Date.now() - 60_000) }); console.log('  session expiresAt set a minute ago'); process.exit(0); }
const st = await staff();
const b = await issue(st, guest);
if (state === 'billed') process.exit(0);
if (state === 'dessert') { await order(t, guest); process.exit(0); }
if (state === 'partpaid') { await pay(st, b, Math.floor(b.payable / 200) * 100); console.log(`  took ${R(Math.floor(b.payable / 200) * 100)} cash`); process.exit(0); }
if (state === 'settled') { await pay(st, b, b.payable); console.log(`  took ${R(b.payable)} cash, bill paid`); process.exit(0); }
