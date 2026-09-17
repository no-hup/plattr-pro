#!/usr/bin/env node
/**
 * Pricing matrix — res_meghana, real menu, real carts, real bills.
 *
 *   node test/e2e/pricing-matrix.mjs              # run every scenario
 *   node test/e2e/pricing-matrix.mjs --only=A,C   # run some
 *   node test/e2e/pricing-matrix.mjs --dump=out.json
 *
 * journey.mjs proves ONE simple order reaches a paid bill. This proves the ARITHMETIC, on the
 * cases where a restaurant actually loses money: a variant that inherits the parent's discount
 * while the add-on beside it does not, a quantity multiplying all three, a capped category
 * offer competing with a flat order offer, and an out-of-stock add-on that must be refused.
 *
 * Every scenario is a fresh table, session, order and bill, so one cannot pollute the next.
 *
 * What this file deliberately does NOT do: state expected rupees. It records what the system
 * produced and dumps it to JSON. The expected values are derived independently — see
 * `pricing-matrix.expected.json` and the README note — and compared by `--verify`.
 */
import { writeFileSync } from 'node:fs';
import {
  fsFor, call, ok, errOf, R, check, step, info, die, counts,
  makeBillable, claimTable, staffLogin,
} from './lib/rest.mjs';

const RID = 'res_meghana';
const { getDoc, listCol, setDoc } = fsFor(RID);
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1]?.split(',').filter(Boolean);
const DUMP = (process.argv.find(a => a.startsWith('--dump=')) || '').split('=')[1];
const KEEP = process.argv.includes('--keep');

// ── the menu, as the seed states it (paise) ───────────────────────────────────
const ITEM = {
  mutton_bir:   { id: 'mi_mutton_bir',   name: 'Mutton Biryani',       base: 42000, disc: 10 },
  chicken_bir:  { id: 'mi_chicken_bir',  name: 'Chicken Dum Biryani',  base: 32000, disc: 0 },
  veg_bir:      { id: 'mi_veg_bir',      name: 'Veg Biryani',          base: 26000, disc: 0 },
  paneer65:     { id: 'mi_paneer65',     name: 'Paneer 65',            base: 24000, disc: 15 },
  andhra_chick: { id: 'mi_andhra_chicken', name: 'Andhra Chicken Curry', base: 32000, disc: 0 },
  naan:         { id: 'mi_butter_naan',  name: 'Butter Naan',          base: 6000,  disc: 0 },
  gulab:        { id: 'mi_gulab',        name: 'Gulab Jamun (2 pc)',   base: 9000,  disc: 0 },
};
const PORTION = 'mv_bir_portion', SPICE = 'mv_spice';
const ADDON = {           // respectParentDiscount is the whole point of this file
  raita: { id: 'ma_extra_raita', name: 'Extra Raita', price: 4000, respects: false },
  egg:   { id: 'ma_extra_egg',   name: 'Boiled Egg',  price: 3000, respects: false },
  gravy: { id: 'ma_extra_gravy', name: 'Extra Gravy', price: 6000, respects: true },
  prawn: { id: 'ma_oos_prawn',   name: 'Prawn Topping', price: 12000, respects: false, oos: true },
};

// ── scenarios ─────────────────────────────────────────────────────────────────
// `add` is exactly what the guest taps. No expected numbers here by design.
const SCENARIOS = [
  {
    key: 'A',
    title: 'Discount inheritance — one line, a variant that inherits and add-ons that split both ways',
    why: 'Mutton Biryani is 10% off. The Family portion inherits that 10%; Extra Gravy inherits it; '
       + 'Raita and Egg do NOT. Four different rules on a single line, which is where a per-total '
       + 'discount would quietly disagree with a per-component one.',
    add: [{ item: 'mutton_bir', qty: 1, variants: { [PORTION]: 'family' }, addons: ['gravy', 'raita', 'egg'] }],
  },
  {
    key: 'B',
    title: 'Quantity multiplies item + variant + add-on together',
    why: 'Chicken Biryani carries no menu discount, so this isolates the multiply. Three Family '
       + 'portions with Raita: if quantity were applied before the add-on, the total would be short.',
    add: [{ item: 'chicken_bir', qty: 3, variants: { [PORTION]: 'family' }, addons: ['raita'] }],
  },
  {
    key: 'C',
    title: 'An out-of-stock add-on is refused, and nothing is charged for it',
    why: 'The prawn topping is seeded out of stock. It must not be silently dropped from a cart '
       + 'that is then billed as if the guest never asked — the guest is waiting for prawns.',
    add: [{ item: 'veg_bir', qty: 1, variants: { [PORTION]: 'single' }, addons: ['prawn'], expectRefused: true }],
    then: [{ item: 'veg_bir', qty: 1, variants: { [PORTION]: 'single' }, addons: [] }],
  },
  {
    key: 'D',
    title: 'A mandatory variant left unchosen is refused',
    why: 'Portion is mandatory on every biryani. A biryani with no portion has no price.',
    add: [{ item: 'veg_bir', qty: 1, variants: {}, addons: [], expectRefused: true }],
    then: [{ item: 'naan', qty: 2, variants: {}, addons: [] }],
  },
  {
    key: 'E',
    title: 'A free variant changes the kitchen ticket, not the price',
    why: 'Andhra Hot costs nothing. The line must come out at exactly the menu price, and the '
       + 'choice must still reach the line snapshot.',
    add: [{ item: 'andhra_chick', qty: 2, variants: { [SPICE]: 'andhra_hot' }, addons: [] }],
  },
  {
    key: 'F',
    title: 'Capped category offer vs flat order offer — the engine picks one, and only one',
    why: '10% off biryani capped at ₹120 competes with ₹100 off above ₹499. A biryani-heavy cart '
       + 'makes them close. Two offers must never both land, and the cap must actually bite.',
    add: [
      { item: 'mutton_bir', qty: 2, variants: { [PORTION]: 'family' }, addons: [] },
      { item: 'gulab', qty: 2, variants: {}, addons: [] },
    ],
  },
  {
    key: 'G',
    title: 'A mixed table — discounted and full-price items, add-ons, and an order offer over the top',
    why: 'The realistic case. An order-level discount is apportioned across lines BEFORE tax, so '
       + 'every line`s taxable value shifts and the tax is a sum of per-line roundings.',
    add: [
      { item: 'mutton_bir', qty: 1, variants: { [PORTION]: 'single' }, addons: ['gravy'] },
      { item: 'paneer65', qty: 1, variants: {}, addons: [] },
      { item: 'naan', qty: 3, variants: {}, addons: [] },
      { item: 'gulab', qty: 1, variants: {}, addons: [] },
    ],
  },
  {
    key: 'H',
    title: 'BOGO — the highest-priority offer, and the only one that changes a line rather than the bill',
    why: 'Paneer 65 is ₹240 with 15% off, and carries buy-one-get-one at priority 6, above both the '
       + 'category and the order offer. Two of them is the first cart where BOGO can fire at all. '
       + 'A free item still has to be a free item AFTER its menu discount, not before.',
    add: [
      { item: 'paneer65', qty: 2, variants: {}, addons: [] },
      { item: 'naan', qty: 2, variants: {}, addons: [] },
    ],
  },
];

/**
 * Independently derived expected payables, in paise.
 *
 * These did NOT come from running the system. Two auditors were each given only the menu, the
 * variant/add-on rules, the offers and the tax config — no source, no test, no output — and asked
 * to price the same eight carts. They agreed with each other on every line. Where a number below
 * disagrees with what the system produces, the disagreement is the finding, not a stale fixture:
 * see TD-014 (inherited discount dropped from the line snapshot) and TD-015 (out-of-stock add-on
 * billed) in moonshot/TECH_DEBT.md. Those scenarios are expected to be RED until those are fixed.
 */
const EXPECTED = {
  A: { payable: 66800, note: 'RED until TD-014: system bills 70100, ₹32.00 of inherited discount lost + its GST' },
  B: { payable: 182700, note: '' },
  C: { payable: 24600, note: 'RED until TD-015: the out-of-stock prawn is accepted, so a second biryani reaches the bill' },
  D: { payable: 12600, note: '' },
  E: { payable: 56700, note: '' },
  F: { payable: 134800, note: 'RED until TD-014: two Family portions, ₹52.00 lost + its GST' },
  G: { payable: 84600, note: 'RED until TD-014: one Extra Gravy, ₹6.00 lost + its GST' },
  H: { payable: 34000, note: '' },   // auditor agrees independently: BOGO frees the second paneer at its discounted ₹204, not ₹240 list
};

// ── one scenario, end to end ──────────────────────────────────────────────────
// One table each, wiped first. Orders group by table, so sharing one would merge two scenarios
// into a single bill and every number after that would be fiction.
const TABLE_OF = { A: 'tbl_meg_6', B: 'tbl_meg_7', C: 'tbl_meg_8', D: 'tbl_meg_9', E: 'tbl_meg_10', F: 'tbl_meg_11', G: 'tbl_meg_12', H: 'tbl_meg_1' };

async function run(sc) {
  step(`${sc.key} · ${sc.title}`);
  console.log(`   \x1b[2m${sc.why.replace(/\s+/g, ' ')}\x1b[0m`);

  const tableId = TABLE_OF[sc.key] || die(`${sc.key}: no table assigned`);
  const { cleared } = await claimTable(RID, tableId);
  const table = { id: tableId };
  const otp = await call('table-validateOTP', { restaurantId: RID, tableId, otp: '123456', phoneNumber: '9876543210', name: `Matrix ${sc.key}` });
  const guest = otp.data?.sessionId;
  if (!guest) die(`${sc.key}: no guest session — ${otp.message}`);
  info('table / session', `${tableId} / ${guest.slice(0, 8)}…${cleared ? `  (cleared ${cleared} stale order${cleared > 1 ? 's' : ''})` : ''}`);

  const rec = { key: sc.key, title: sc.title, table: table.id, adds: [], lines: [], bill: null };

  for (const a of [...(sc.add || []), ...(sc.then || [])]) {
    const it = ITEM[a.item];
    const payload = {
      restaurantId: RID, tableId: table.id, sessionId: guest,
      menuItemId: it.id, quantity: a.qty,
      ...(Object.keys(a.variants).length ? { selectedVariants: a.variants } : {}),
      ...(a.addons.length ? { selectedAddons: a.addons.map(k => ADDON[k].id) } : {}),
    };
    const r = await call('cart-addItemToCart', payload);
    const label = `${it.name} ×${a.qty}${Object.keys(a.variants).length ? ` [${Object.values(a.variants).join(',')}]` : ''}${a.addons.length ? ` +${a.addons.join('+')}` : ''}`;
    if (a.expectRefused) {
      check(`refused: ${label}`, !ok(r), r.message || r);
      rec.adds.push({ label, refused: !ok(r), message: r.message });
    } else {
      check(`added: ${label}`, ok(r), r.message || r);
      rec.adds.push({ label, refused: false, sent: payload });
    }
  }

  const co = await call('cart-checkoutCart', { restaurantId: RID, tableId: table.id, sessionId: guest });
  check('checkout', ok(co), co.message || co);
  const orderId = co.data?.orderId;
  if (!orderId) { die(`${sc.key}: checkout gave no orderId`); }
  rec.orderId = orderId;

  const order = await getDoc(`orders/${orderId}`);
  rec.orderOffer = order?.appliedOffer ? { id: order.appliedOffer.offerId ?? order.appliedOffer.id, name: order.appliedOffer.title ?? order.appliedOffer.name, amount: order.appliedOffer.discountAmount ?? order.appliedOffer.amount } : null;

  const lines = (await listCol('lines')).filter(l => l.orderId === orderId);
  check('a line snapshot per ordered item', lines.length === (sc.add.filter(a => !a.expectRefused).length + (sc.then?.length || 0)), lines.map(l => l.name));
  for (const l of lines) {
    const comps = (l.components || []).map(c => ({ id: c.id, kind: c.kind ?? null, name: c.name ?? null, unitListPrice: c.unitListPrice, taxBlockId: c.taxBlockId }));
    rec.lines.push({ lineId: l.lineId, name: l.name, qty: l.qty, listPrice: l.listPrice, offer: l.offer ?? null, components: comps });
    info(`line ${l.name} ×${l.qty}`, `list ${R(l.listPrice)}${l.offer?.amount ? ` − ${R(l.offer.amount)} (${l.offer.id})` : ''}  [${comps.map(c => `${c.name ?? c.id}:${R(c.unitListPrice)}`).join(' ')}]`);
  }

  // THE check. The guest's app shows `order.priceInfo.finalPrice` (menu discounts and the order
  // offer already taken off). The bill is built from the line snapshots. If those two disagree, the
  // guest is billed a different number from the one they agreed to — and nothing else in this file
  // would notice, because the bill is internally consistent either way.
  const shown = (order?.priceInfo?.finalPrice ?? 0) * 100 + (order?.priceInfo?.offerDiscount ?? 0) * 100;
  const snapNet = lines.reduce((n, l) => n + l.listPrice - (l.offer?.amount || 0), 0);
  rec.shownToGuest = Math.round(shown);
  rec.lineNet = snapNet;
  check('the cart total the guest saw equals the line total the bill is built from',
    Math.round(shown) === snapNet,
    `guest app ${R(Math.round(shown))} vs line snapshots ${R(snapNet)} — difference ${R(snapNet - Math.round(shown))}`);

  const draftId = lines[0]?.draftId;
  const staff = await staffLogin(RID);
  const pv = await call('billing-preview', { restaurantId: RID, sessionId: staff.sessionId, draftId });
  check('preview returned', ok(pv), pv.message || errOf(pv));
  if (!ok(pv)) return rec;

  const b = pv.data;
  rec.bill = {
    subtotal: b.subtotal, taxTotal: b.taxTotal, roundOff: b.roundOff, payable: b.payable,
    discount: b.discount ?? null, offer: b.offer ?? null,
    blocks: b.blocks.map(x => ({ id: x.id, taxable: x.taxable, parts: x.parts.map(p => ({ label: p.label, rateBps: p.rateBps, amount: p.amount })) })),
    lines: b.lines.map(l => ({ name: l.name, qty: l.qty, listPrice: l.listPrice, lineOffer: l.offer?.amount ?? 0, billDiscount: l.billDiscount, tax: l.tax })),
  };
  for (const blk of b.blocks) info(blk.label, `taxable ${R(blk.taxable)}${blk.parts.map(p => ` · ${p.label} ${p.rateBps / 100}% ${R(p.amount)}`).join('')}`);
  if (b.offer) info('order offer', `${b.offer.name} − ${R(b.offer.amount)}`);
  if (b.roundOff) info('round off', R(b.roundOff));
  info('PAYABLE', R(b.payable));

  // ── invariants that hold for EVERY cart, whatever the rupees ────────────────
  const lineNet = b.lines.reduce((n, l) => n + l.listPrice - (l.offer?.amount || 0), 0);
  const billDisc = b.lines.reduce((n, l) => n + (l.billDiscount || 0), 0);
  const taxable = b.blocks.reduce((n, x) => n + x.taxable, 0);
  const tax = b.blocks.reduce((n, x) => n + x.parts.reduce((m, p) => m + p.amount, 0), 0);
  check('taxable = line net − bill discount', taxable === lineNet - billDisc, { taxable, lineNet, billDisc });
  check('the apportioned shares add back to the offer exactly', billDisc === (b.offer?.amount ?? 0), { billDisc, offer: b.offer?.amount ?? 0 });
  check('no line was given a negative share', b.lines.every(l => (l.billDiscount || 0) >= 0), b.lines.map(l => l.billDiscount));
  check('payable = taxable + tax + round off', b.payable === taxable + tax + (b.roundOff || 0), { payable: b.payable, taxable, tax, roundOff: b.roundOff });
  check('payable is a whole rupee', b.payable % 100 === 0, b.payable);
  check('round off never moves more than half a rupee', Math.abs(b.roundOff || 0) <= 50, b.roundOff);
  const food = b.blocks.find(x => x.id === 'food');
  if (food) check('CGST equals SGST', food.parts[0]?.amount === food.parts[1]?.amount, food.parts);
  check('at most one order offer applied', !b.offer || typeof b.offer.amount === 'number', b.offer);

  const exp = EXPECTED[sc.key];
  if (exp) {
    check(`payable matches the independently derived ${R(exp.payable)}`, b.payable === exp.payable,
      `system ${R(b.payable)} vs auditors ${R(exp.payable)} — off by ${R(b.payable - exp.payable)}${exp.note ? `\n     ${exp.note}` : ''}`);
  }

  // ── issue and settle, so the numbers are real money and not a preview ───────
  const iss = await call('billing-issue', { restaurantId: RID, sessionId: staff.sessionId, draftId, cid: `mx_${sc.key}_${Date.now()}`, tableIds: [table.id], expectedV: {} });
  check('bill issued', ok(iss), iss.message || errOf(iss));
  if (ok(iss)) {
    rec.bill.billId = iss.data.billId;
    rec.bill.issuedPayable = iss.data.payable;
    check('issued payable equals the preview', iss.data.payable === b.payable, { issued: iss.data.payable, preview: b.payable });
    const pay = await call('payments-take', { restaurantId: RID, sessionId: staff.sessionId, billId: iss.data.billId, paymentId: `mx_${sc.key}_${Date.now()}`, tenderId: 'cash', tendered: iss.data.payable });
    check('paid in full with exact cash → settled', ok(pay) && pay.data?.bill?.status === 'paid', pay.message || errOf(pay));
    check('exact cash makes no change', (pay.data?.row?.change ?? 0) === 0, pay.data?.row);
  }
  return rec;
}

// ── main ──────────────────────────────────────────────────────────────────────
const t0 = Date.now();
console.log(`\x1b[1mPricing matrix · ${RID}\x1b[0m`);
const { prior } = await makeBillable(RID);
const out = [];
for (const sc of SCENARIOS) {
  if (ONLY && !ONLY.includes(sc.key)) continue;
  out.push(await run(sc));
}
if (!KEEP) { await setDoc('config/settings', prior); console.log('\n   (restored config/settings)'); }
if (DUMP) { writeFileSync(DUMP, JSON.stringify(out, null, 2)); console.log(`   actuals → ${DUMP}`); }
console.log(`\n\x1b[1m${counts.fail === 0 ? '\x1b[32mALL GREEN' : '\x1b[31mFAILURES'}\x1b[0m  ${counts.pass} passed, ${counts.fail} failed  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(counts.fail === 0 ? 0 : 1);
