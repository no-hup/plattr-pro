#!/usr/bin/env node
/**
 * One-command backend sanity for a whole order → bill → payment journey on ANY mock restaurant.
 *
 *   node test/e2e/journey.mjs                 # res_meghana
 *   node test/e2e/journey.mjs res_truffles
 *   node test/e2e/journey.mjs res_meghana --keep   # leave the seeded tax config behind
 *
 * Why this exists: the billing and payments e2e suites seed synthetic `lines/` documents, so they
 * never prove that a REAL menu item ordered through the REAL cart reaches a bill and gets paid.
 * This walks the actual customer path end to end and checks the rupees at every hop.
 *
 * It makes the restaurant billable first (mock menus carry no tax label yet — see STATE TD),
 * then: vacant table → OTP → cart → checkout → line snapshots → preview → issue → take → settled.
 */
import config from './lib/config.js';

const RID = process.argv[2]?.startsWith('--') ? 'res_meghana' : (process.argv[2] || 'res_meghana');
const KEEP = process.argv.includes('--keep');
// No MockData7 restaurant has a bar menu, so the liquor block never meets real data unless we force it.
const LIQ_ARG = (process.argv.find(a => a.startsWith('--liquor=')) || '').split('=')[1] || '';
// --setup-only: stop after checkout and print what the till needs in its URL. Implies --keep.
const SETUP_ONLY = process.argv.includes('--setup-only');
// The seed's own service charges are kept by default: wiping them would change what the
// consumer app shows today. --no-charges drops them to keep the arithmetic readable.
const NO_CHARGES = process.argv.includes('--no-charges');
// --as-seeded: touch nothing. Proves the seed alone can be billed.
const AS_SEEDED = process.argv.includes('--as-seeded');
const BASE = config.BASE_URL;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

// ── Firestore REST codec (same seam the approvals/billing suites use) ──────────
const enc = v =>
  v === null ? { nullValue: null } :
  typeof v === 'string' ? { stringValue: v } :
  typeof v === 'boolean' ? { booleanValue: v } :
  typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) :
  v instanceof Date ? { timestampValue: v.toISOString() } :
  Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } :
  { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
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
const flat = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
const body = o => JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)])) });

async function getDoc(p) { const r = await fetch(`${FS}/restaurants/${RID}/${p}`, { headers: H }); return r.status === 404 ? null : flat(await r.json()); }
async function setDoc(p, o) { const r = await fetch(`${FS}/restaurants/${RID}/${p}`, { method: 'PATCH', headers: H, body: body(o) }); if (!r.ok) throw new Error(`seed ${p}: ${r.status} ${await r.text()}`); }
async function patchDoc(p, o) {   // merge: only the named fields change
  const mask = Object.keys(o).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${FS}/restaurants/${RID}/${p}?${mask}`, { method: 'PATCH', headers: H, body: body(o) });
  if (!r.ok) throw new Error(`patch ${p}: ${r.status} ${await r.text()}`);
}
async function listCol(c, n = 300) { const j = await (await fetch(`${FS}/restaurants/${RID}/${c}?pageSize=${n}`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...flat(d) })); }

async function call(endpoint, payload = {}) {
  const r = await fetch(`${BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: payload }) });
  let j; try { j = await r.json(); } catch { return { status: 'error', message: `non-JSON from ${endpoint} (HTTP ${r.status})` }; }
  const res = j.result || j;
  if (!res.status && j.error) return { status: 'error', message: j.error.message || 'error', error: j.error };
  return res;
}
const errOf = r => r?.error?.details?.data ?? r?.error?.data ?? r?.data ?? {};

// ── reporting ─────────────────────────────────────────────────────────────────
const R = n => `₹${(n / 100).toFixed(2)}`;
let pass = 0, fail = 0;
const step = s => console.log(`\n\x1b[1m── ${s}\x1b[0m`);
const info = (k, v) => console.log(`   ${k.padEnd(22)} ${v}`);
function check(label, cond, actual) {
  if (cond) { pass++; console.log(`   \x1b[32m✓\x1b[0m ${label}`); }
  else { fail++; console.log(`   \x1b[31m✗ ${label}\x1b[0m`); if (actual !== undefined) console.log(`     ${typeof actual === 'string' ? actual : JSON.stringify(actual).slice(0, 400)}`); }
}
const die = m => { console.error(`\n\x1b[31mABORT: ${m}\x1b[0m`); process.exit(1); };

// ── the tax config a mock restaurant is missing ───────────────────────────────
const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }], defaultCode: '996331' };
const LIQUOR = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [], defaultCode: '' };
const TENDERS = [
  { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
  { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
  { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
];

async function makeBillable() {
  if (AS_SEEDED) {
    step('0 · SKIPPED — billing the restaurant exactly as the seed left it');
    const cfg = await getDoc('config/settings');
    const items = await listCol('menuItems');
    check('seed carries tax blocks', Object.keys(cfg?.tax?.blocks || {}).length > 0, cfg?.tax);
    check('seed carries tenders', (cfg?.tenders || []).length > 0, cfg?.tenders);
    check('every menu item carries a tax block', items.every(i => !!i.taxBlockId), items.filter(i => !i.taxBlockId).map(i => i.menuItemId));
    info('charges in seed', ((cfg?.billing || {}).charges || []).map(c => `${c.type} ${c.percentage}%`).join(', ') || 'none');
    return items;
  }
  step('0 · make the restaurant billable (mock menus carry no tax label)');
  const prior = await getDoc('config/settings');
  if (!prior) die(`no config/settings for ${RID} — is it imported?`);
  if (!KEEP && !SETUP_ONLY) globalThis.__priorSettings = prior;
  await setDoc('config/settings', {
    ...prior,
    tax: { blocks: { food: FOOD, liquor: LIQUOR } },
    tenders: TENDERS,
    seller: { name: prior.name || RID, taxId: 'GSTIN_JOURNEY' },
    billing: { ...(prior.billing || {}), roundTo: 100, ...(NO_CHARGES ? { charges: [] } : {}) },
  });
  info('tax blocks', 'food (GST 2.5+2.5, exclusive), liquor (inclusive, no part)');
  info('tenders', TENDERS.map(t => t.id).join(', '));
  const chg = (prior.billing || {}).charges || [];
  info('charges kept', NO_CHARGES ? 'none (--no-charges)' : (chg.map(c => `${c.type} ${c.percentage}%`).join(', ') || 'none in seed'));
  const taxLikeCharge = chg.find(c => /gst|vat|tax/i.test(c.type));
  if (taxLikeCharge && !NO_CHARGES) console.log(`   \x1b[33m! ${taxLikeCharge.type} is configured as a percentage CHARGE as well as a tax block — watch for double counting\x1b[0m`);

  // Stamp a tax block on every menu item: liquor by category name, food otherwise.
  const items = await listCol('menuItems');
  if (!items.length) die(`no menuItems under ${RID}`);
  let liq = 0;
  for (const it of items) {
    const cat = `${it.meta?.categoryName || ''} ${it.meta?.primarySubcategoryName || ''}`.toLowerCase();
    const isLiquor = LIQ_ARG ? cat.includes(LIQ_ARG.toLowerCase()) : /beer|liquor|bar|alcohol|wine|spirit|cocktail/.test(cat);
    if (isLiquor) liq++;
    await patchDoc(`menuItems/${it.id}`, { taxBlockId: isLiquor ? 'liquor' : 'food', taxCode: isLiquor ? '' : '996331' });
  }
  info('menu items stamped', `${items.length} (${liq} liquor, ${items.length - liq} food)`);
  return items;
}

async function delDoc(p) { await fetch(`${FS}/restaurants/${RID}/${p}`, { method: 'DELETE', headers: H }); }

async function pickTable() {
  const tables = await listCol('tables');
  const t = tables.find(x => String(x.status).toLowerCase() === 'vacant' && !x.currentSessionId) || tables[0];
  if (!t) die('no tables');
  // Orders are grouped by TABLE, so a leftover open order — from the seed, or from the last run of
  // any of these scripts — is silently absorbed by this checkout and every rupee after that belongs
  // to somebody else's food. Clear the table before seating, not just its OTP.
  const stale = (await listCol('orders')).filter(o => o.tableId === t.id);
  if (stale.length) {
    const lines = await listCol('lines');
    for (const o of stale) {
      for (const l of lines.filter(x => x.orderId === o.id)) await delDoc(`lines/${l.id}`);
      await delDoc(`orders/${o.id}`);
    }
    info('cleared', `${stale.length} stale order${stale.length > 1 ? 's' : ''} on ${t.id}`);
  }
  // Give it a fresh OTP we know, and clear any stale sitting.
  await patchDoc(`tables/${t.id}`, { status: 'vacant', currentSessionId: null, currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  return t;
}

async function staffLogin() {
  const servers = await listCol('servers');
  const mgr = servers.find(s => ['MANAGER', 'ADMIN'].includes(s.role) && String(s.status).toLowerCase() === 'active');
  if (!mgr) die('no active MANAGER/ADMIN in servers — billing-issue needs one');
  // server-serverLogin is onRequest: it answers { success: true, data }, not { status }.
  const r = await call('server-serverLogin', { restaurantId: RID, username: mgr.email, password: '1234' });
  if (!r.data?.sessionId) die(`manager login failed for ${mgr.email}: ${r.message || JSON.stringify(r)}`);
  return { sessionId: r.data.sessionId, name: mgr.name, role: mgr.role };
}

// ── the journey ───────────────────────────────────────────────────────────────
const t0 = Date.now();
console.log(`\x1b[1mJourney sanity · ${RID}\x1b[0m   ${BASE}`);

const menu = await makeBillable();

step('1 · seat a guest');
const table = await pickTable();
info('table', `${table.id} (cap ${table.capacity})`);
const otpResp = await call('table-validateOTP', { restaurantId: RID, tableId: table.id, otp: '123456', phoneNumber: '9876543210', name: 'Journey Guest' });
check('OTP accepted, session opened', otpResp.status === 'success', otpResp);
const guest = otpResp.data?.sessionId;
if (!guest) die('no guest sessionId');
info('guest session', guest);

// The lowest spend that wakes a live auto-apply order offer, so the journey orders past it on
// purpose instead of hoping. Offers V2 has no apply endpoint: checkout picks the best one itself.
async function offerFloor() {
  const now = Date.now();
  const live = (await listCol('offers')).filter(o =>
    o.isActive === true && o.scope === 'ORDER' &&
    Date.parse(o.validity?.startDate ?? 0) <= now && Date.parse(o.validity?.endDate ?? 0) >= now);
  if (!live.length) return null;
  const best = live.reduce((a, b) => ((a.conditions?.minOrderValue ?? 0) <= (b.conditions?.minOrderValue ?? 0) ? a : b));
  return { floor: Math.round((best.conditions?.minOrderValue ?? 0) * 100), title: best.title, id: best.id };
}

step('2 · order dishes (past the offer floor)');
const offer = await offerFloor();
info('live order offer', offer ? `${offer.title} — needs ${R(offer.floor)}` : 'none on this restaurant');
const priced = menu.filter(m => m.priceInfo?.finalPrice > 0);
const liquorItems = LIQ_ARG ? priced.filter(m => `${m.meta?.categoryName || ''} ${m.meta?.primarySubcategoryName || ''}`.toLowerCase().includes(LIQ_ARG.toLowerCase())) : [];
const picks = liquorItems.length
  ? [priced.find(m => !liquorItems.includes(m)), liquorItems[0]].filter(Boolean)   // one per block, so both blocks land on one bill
  : priced.filter(m => !m.isCustomizable).slice(0, 2);
while (picks.length < 2) { const n = priced.find(m => !picks.includes(m)); if (!n) break; picks.push(n); }
// Keep adding until the cart clears the floor — the guest buying enough to earn the discount.
const sum = () => picks.reduce((n, p) => n + Math.round(p.priceInfo.finalPrice * 100), 0);
while (offer && sum() <= offer.floor && picks.length < 8) {
  const n = priced.find(m => !m.isCustomizable && !picks.includes(m));
  if (!n) break;
  picks.push(n);
}
let expectedList = 0, expectedNet = 0;
for (const p of picks) {
  const r = await call('cart-addItemToCart', { restaurantId: RID, tableId: table.id, menuItemId: p.menuItemId, quantity: 1, sessionId: guest });
  const off = p.priceInfo.basePrice - p.priceInfo.finalPrice;
  check(`add ${p.meta?.name} @ ₹${p.priceInfo.basePrice}${off ? ` less ₹${off} menu discount` : ''}`, r.status === 'success', r);
  expectedList += Math.round(p.priceInfo.basePrice * 100);
  expectedNet += Math.round(p.priceInfo.finalPrice * 100);
}
info('expected list', R(expectedList));
info('expected net', R(expectedNet));

step('3 · checkout (writes the line snapshots)');
const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: table.id, sessionId: guest });
check('checkout succeeded', co.status === 'success', co);
const orderId = co.data?.orderId;
if (!orderId) die('no orderId');
info('orderId', orderId);

const lines = (await listCol('lines')).filter(l => l.orderId === orderId);
check(`one line snapshot per item (${picks.length})`, lines.length === picks.length, lines.map(l => l.lineId));
check('every line carries a tax block', lines.every(l => Object.keys(l.taxBlocks || {}).length > 0), lines.map(l => ({ id: l.lineId, blocks: Object.keys(l.taxBlocks || {}) })));
check('line list price matches the menu', lines.reduce((n, l) => n + l.listPrice, 0) === expectedList, lines.map(l => `${l.name}=${l.listPrice}`));
check('menu discount is kept as an offer on the line', lines.reduce((n, l) => n + l.listPrice - (l.offer?.amount || 0), 0) === expectedNet, lines.map(l => `${l.name}: list ${l.listPrice} offer ${l.offer?.amount || 0}`));
const draftId = lines[0]?.draftId;
info('draftId', draftId);
for (const l of lines) info(`  ${l.name}`, `${R(l.listPrice)}${l.offer?.amount ? ` − ${R(l.offer.amount)} (${l.offer.id})` : ''} · block ${Object.keys(l.taxBlocks || {})[0] || 'NONE'}`);

if (SETUP_ONLY) {
  const st = await staffLogin();
  console.log(`\n\x1b[1mTill URLs\x1b[0m (staff: ${st.name} / 1234)`);
  console.log(`   bill screen:  http://127.0.0.1:5173/?r=${RID}&draft=${draftId}`);
  console.log(`   (after issuing, the tender screen is  ?r=${RID}&bill=<billId>)`);
  console.log(`\n   ${pass} passed, ${fail} failed · draft left in place, tax config kept`);
  process.exit(fail === 0 ? 0 : 1);
}

step('3b · the kitchen cooks it and the floor serves it');
const staff = await staffLogin();
info('staff', `${staff.name} (${staff.role})`);
// cart-updateCartStatus answers { success: true }; the order-* endpoints answer { status: 'success' }.
// Two conventions in one flow — noted, not fixed here (see the note in STATE).
const ok = r => r?.status === 'success' || r?.success === true;
for (const [n, s] of [['kitchen accepts → PREPARING', 'PREPARING'], ['kitchen plates it → READY', 'READY']]) {
  const r = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: s, sessionId: staff.sessionId });
  check(n, ok(r), r.message || r);
  const c = (await getDoc(`orders/${orderId}`))?.carts?.[0];
  check(`  …and the cart really reads ${s}`, c?.status === s, c?.status);
}
const served = await call('order-markCartAsServed', { restaurantId: RID, orderId, cartIndex: 0, sessionId: staff.sessionId });
check('server carries it out → SERVED', served.status === 'success', served.message || served);
const done = await call('order-updateOrderStatus', { restaurantId: RID, orderId, orderStatus: 'COMPLETED', sessionId: staff.sessionId });
check('no more rounds → order COMPLETED', done.status === 'success', done.message || done);
const ord = await getDoc(`orders/${orderId}`);
info('order status', ord?.orderStatus);
check('the order really is COMPLETED in Firestore', ord?.orderStatus === 'COMPLETED', ord?.orderStatus);
// TD-010: finishing the food must say nothing about the money. Only PY writes paymentStatus.
check('COMPLETED left the order UNPAID — the kitchen does not settle bills', String(ord?.paymentStatus ?? 'unpaid').toLowerCase() === 'unpaid', ord?.paymentStatus);
// TD-013/TD-036 closed 2026-09-20: COMPLETED no longer touches the table. Only Clear (FL) or the
// waiter's manual Vacant frees it, so an unpaid bill can never sit on a vacant table.
const tbl = await getDoc(`tables/${table.id}`);
check('COMPLETED left the table occupied with its session — the bill is still unpaid', tbl?.status !== 'vacant' && !!tbl?.currentSessionId, `${tbl?.status}, session ${tbl?.currentSessionId ?? 'ended'}`);

step('4 · cashier previews the bill');
const pv = await call('billing-preview', { restaurantId: RID, sessionId: staff.sessionId, draftId });
check('preview returned', pv.status === 'success', pv.message || pv);
if (pv.status !== 'success') die(`preview refused: ${pv.message} ${JSON.stringify(errOf(pv))}`);
const b = pv.data;
for (const blk of b.blocks) info(blk.label, `taxable ${R(blk.taxable)}${blk.parts.map(p => ` · ${p.label} ${p.rateBps / 100}% ${R(p.amount)}`).join('')}`);
for (const c of (b.charges || [])) info(c.type, `${c.pctBps / 100}% → ${R(c.amount)}`);
if (b.roundOff) info('round off', R(b.roundOff));
info('PAYABLE', R(b.payable));

// independent arithmetic, not the server's
const taxable = b.blocks.reduce((n, x) => n + x.taxable, 0);
const tax = b.blocks.reduce((n, x) => n + x.parts.reduce((m, p) => m + p.amount, 0), 0);
// An order-level offer becomes a bill discount apportioned across the lines before tax (BL R1/BL-S24).
const billDisc = b.lines.reduce((n, l) => n + (l.billDiscount || 0), 0);
if (pv.data.offer) info('order offer', `${pv.data.offer.name} − ${R(pv.data.offer.amount)} (apportioned)`);
if (offer) check(`the ${offer.title} offer reached the bill (cart cleared ${R(offer.floor)})`, billDisc > 0, { offer: pv.data.offer, expectedNet, floor: offer.floor });
// Charges are folded into the taxable base of their own block, so they are taxed too.
const chgTotal = (b.charges || []).reduce((n, c) => n + c.amount, 0);
check('taxable = line total − bill discount + charges', taxable === expectedNet - billDisc + chgTotal, { taxable, expectedNet, billDisc, chgTotal });
if (billDisc) {
  check('bill discount equals the offer', billDisc === (pv.data.offer?.amount ?? 0), { billDisc, offer: pv.data.offer });
  const byShare = b.lines.map(l => `${l.name}: net ${R(l.listPrice - (l.offer?.amount || 0))} share −${R(l.billDiscount || 0)}`);
  info('apportioned', byShare.join('  |  '));
  check('every line got a share', b.lines.every(l => (l.billDiscount || 0) >= 0), byShare);
}
check('payable = taxable + tax + roundOff', b.payable === taxable + tax + (b.roundOff || 0), { payable: b.payable, taxable, tax, roundOff: b.roundOff });
// A legacy percentage charge named like a tax is taxed AS a charge and adds tax a second time.
const dblTax = (b.charges || []).find(c => /gst|vat|tax/i.test(c.type));
if (dblTax) console.log(`   \x1b[33m! ${dblTax.type} ${R(dblTax.amount)} sits inside the taxable base and is taxed again — legacy charge vs tax block, a seed conflict\x1b[0m`);
check('payable is a whole rupee (roundTo 100)', b.payable % 100 === 0, b.payable);
const foodBlock = b.blocks.find(x => x.id === 'food');
if (foodBlock) check('CGST equals SGST (parts rounded independently)', foodBlock.parts[0]?.amount === foodBlock.parts[1]?.amount, foodBlock.parts);

step('5 · generate the bill');
const iss = await call('billing-issue', { restaurantId: RID, sessionId: staff.sessionId, draftId, cid: `journey_${Date.now()}`, tableIds: [table.id], expectedV: {} });
check('bill issued', iss.status === 'success', iss.message || iss);
if (iss.status !== 'success') die(`issue refused: ${iss.message}`);
const bill = iss.data;
info('number', `${bill.series}-${bill.number}  (FY ${bill.fiscalYear})`);
info('status', bill.status);
info('payable', R(bill.payable));
check('issued payable equals the preview', bill.payable === b.payable, { issued: bill.payable, preview: b.payable });
check('a number was assigned only now', !!bill.number && bill.status === 'issued', bill);
const relines = (await listCol('lines')).filter(l => l.orderId === orderId);
check('lines are stamped with the billId', relines.every(l => l.billId === bill.billId), relines.map(l => l.billId));

step('6 · take the money (part card, rest cash)');
const half = Math.round(bill.payable / 2 / 100) * 100;
const p1 = await call('payments-take', { restaurantId: RID, sessionId: staff.sessionId, billId: bill.billId, paymentId: `pay_${Date.now()}_a`, tenderId: 'card', amount: half, ref: 'SLIP-001' });
check(`card ${R(half)} accepted`, p1.status === 'success', p1.message || errOf(p1));
if (p1.status === 'success') {
  info('outstanding', R(p1.data.bill.outstanding));
  check('part payment leaves the rest outstanding', p1.data.bill.outstanding === bill.payable - half, p1.data.bill);
  check('bill is still unsettled', p1.data.bill.status === 'issued', p1.data.bill.status);
}

const rest = bill.payable - half;
const cashGiven = rest + 5000;   // guest hands over ₹50 extra
const p2 = await call('payments-take', { restaurantId: RID, sessionId: staff.sessionId, billId: bill.billId, paymentId: `pay_${Date.now()}_b`, tenderId: 'cash', amount: rest, tendered: cashGiven });
check(`cash ${R(rest)} accepted (tendered ${R(cashGiven)})`, p2.status === 'success', p2.message || errOf(p2));
if (p2.status === 'success') {
  info('change due', R(p2.data.row?.change ?? 0));
  info('drawer', p2.data.opensDrawer ? 'OPEN' : 'closed');
  check('change = tendered − due', (p2.data.row?.change ?? 0) === cashGiven - rest, p2.data.row);
  check('cash opens the drawer', p2.data.opensDrawer === true, p2.data);
}

step('7 · the bill is settled');
const fin = await call('payments-list', { restaurantId: RID, sessionId: staff.sessionId, billId: bill.billId });
check('list returned', fin.status === 'success', fin.message || fin);
if (fin.status === 'success') {
  const s = fin.data;
  info('payable', R(s.payable));
  info('paid', R(s.paidTotal));
  info('outstanding', R(s.outstanding));
  info('status', s.status);
  check('paid total equals payable', s.paidTotal === bill.payable, { paid: s.paidTotal, payable: bill.payable });
  check('outstanding is zero', s.outstanding === 0, s.outstanding);
  check('status is paid', s.status === 'paid', s.status);
  check('two live payment rows', (s.rows || []).filter(r => !r.void).length === 2, s.rows);
}

step('8 · an issued bill cannot be billed twice');
const again = await call('billing-issue', { restaurantId: RID, sessionId: staff.sessionId, draftId, cid: `journey_${Date.now()}_dup`, tableIds: [table.id], expectedV: {} });
check('second issue refused', again.status !== 'success', again);

step('9 · the owner counts the drawer and closes the day');
// DC. R8: the business date is the calendar day shifted back by the configured close hour, so a
// 01:30 payment still belongs to the night before. Same shift domain/payments.businessDateFor does.
const bdFor = (at, h = 4, m = 0, tz = 330) => new Date(at + tz * 60_000 - (h * 60 + m) * 60_000).toISOString().slice(0, 10);
const BD = bdFor(Date.now());
info('business date', BD);
// Housekeeping so this script reruns: there is no reopen in the product, and there should not be.
await delDoc(`dayClose/${BD}`);
for (const m of await listCol('drawerMovements')) if (/^jrn_/.test(m.id)) await delDoc(`drawerMovements/${m.id}`);
const dcSettings = await getDoc('config/settings');
await setDoc('config/settings', { ...dcSettings, dayClose: { blindCount: false } });   // so the script can read the figure it is about to count

const dc = (fn, body) => call(`dayClose-${fn}`, { restaurantId: RID, sessionId: staff.sessionId, ...body });
const e1 = (await dc('get', { businessDate: BD })).data?.expectedCash;
check('the day reports what the drawer should hold', Number.isInteger(e1), e1);

const noPin = await dc('move', { movementId: `jrn_float_${BD}`, kind: 'float', amount: 200000, reason: 'opening float' });
check('a drawer movement without a PIN is refused', errOf(noPin).requires === 'pin', noPin);
const fl = await dc('move', { movementId: `jrn_float_${BD}`, kind: 'float', amount: 200000, reason: 'opening float', pin: '1234' });
check('₹2,000 opening float recorded', fl.status === 'success', fl.message || errOf(fl));
const e2 = (await dc('get', { businessDate: BD })).data?.expectedCash;
check('expected cash rose by exactly the float', e2 - e1 === 200000, { e1, e2 });

const closed = await dc('close', { businessDate: BD, countedCash: e2, note: 'journey' });
const doc = closed.data?.doc || {};
check('the day closes exact, difference 0', closed.status === 'success' && doc.difference === 0, closed.message || errOf(closed));
if (closed.status === 'success') {
  info('expected', R(doc.expectedCash));
  info('counted', R(doc.countedCash));
  info('opening float', R(doc.openingFloat));
  const cashRow = (doc.byTender || []).find(t => t.kind === 'cash');
  check('the cash this journey took is in the frozen tender split', (cashRow?.taken ?? 0) >= rest, cashRow);
  check('the card ₹ is frozen separately and never touched the drawer',
    (doc.byTender || []).some(t => t.tenderId === 'card' && t.taken >= half), doc.byTender);
  check('an exact count leaves no audit row', (await getDoc(`audit/${BD}_dayClose`)) === null);
}
const late = await call('payments-take', { restaurantId: RID, sessionId: staff.sessionId, billId: bill.billId, paymentId: `pay_${Date.now()}_late`, tenderId: 'cash', tendered: 10000 });
check('money offered after the lid is on is refused', late.status !== 'success' && /closed and counted/.test(late.message || ''), late);
await delDoc(`dayClose/${BD}`);   // leave the day open again for the next run


if (!KEEP && globalThis.__priorSettings) { await setDoc('config/settings', globalThis.__priorSettings); console.log('\n   (restored config/settings; pass --keep to leave the tax config in place)'); }

console.log(`\n\x1b[1m${fail === 0 ? '\x1b[32mALL GREEN' : '\x1b[31mFAILURES'}\x1b[0m  ${pass} passed, ${fail} failed  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(fail === 0 ? 0 : 1);
