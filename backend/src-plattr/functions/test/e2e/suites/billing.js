// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared. A suite
// that seeds only a plaintext password logs in fine and then fails at every PIN. Same constant
// hash of 1234 the seeds carry.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
/**
 * Suite: billing (BL · Billing & tax). Real Cloud Functions on the emulator.
 * Seeds staff, tax config and full line snapshots via the Firestore REST API (Bearer owner), deletes its own
 * docs first so it reruns without a reset. Money is minor units on the line; pizza 50000 + coke 8000 → 60900.
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
async function seed(path, obj) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
async function getDoc(path) { const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H }); return r.status === 404 ? null : doc(await r.json()); }
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
async function listCol(col) { const j = await (await fetch(`${FS}/restaurants/${RID}/${col}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...doc(d) })); }
const errData = resp => resp?.error?.details?.data || resp?.data || {};

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const LIQ = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [] };
const line = (lineId, name, list, blockId, draftId = 'draft_bl') => ({
  lineId, cid: 'order_bl', orderId: 'order_bl', cartId: 'cart_bl', cartItemId: lineId, tableId: 'table_bl', sessionId: 'sess_bl', placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: blockId, taxCode: '9963' }],
  taxBlocks: blockId === 'food' ? { food: FOOD } : blockId === 'liquor' ? { liquor: LIQ } : {}, offer: null,
});

export default async function billingSuite() {
  const results = { name: 'billing', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ──
  const OURS = ['bl_pizza', 'bl_coke', 'bl_beer', 'bl_dal', 'bl_off_pizza', 'bl_off_coke'];
  for (const l of OURS) await delDoc(`lines/${l}`);
  for (const b of await listCol('bills')) if (b.cid === 'cid_bl') await delDoc(`bills/${b.id}`);
  for (const a of await listCol('audit')) if (a.cid === 'cid_bl') await delDoc(`audit/${a.id}`);
  await delDoc('counters/A_2026-27'); await delDoc('counters/CN_2026-27');
  for (const k of await listCol('counters')) if (/^(A|CN)_/.test(k.id)) await delDoc(`counters/${k.id}`);
  await seed('servers/manager_bl', { name: 'Manager BL', role: 'MANAGER', status: 'active', email: 'manager@bl.test', password: '1234', pinHash: PIN_1234 });
  await seed('servers/captain_bl', { name: 'Captain BL', role: 'SERVER', status: 'active', email: 'captain@bl.test', password: '1234', pinHash: PIN_1234 });
  const settings = (await getDoc('config/settings')) || {};
  await seed('config/settings', { ...settings, tax: { blocks: { food: FOOD, liquor: LIQ } }, seller: { name: 'E2E Bar', taxId: 'GSTIN_E2E' }, billing: { ...(settings.billing || {}), charges: [] } });
  await seed('lines/bl_pizza', line('bl_pizza', 'Margherita', 50000, 'food'));
  await seed('lines/bl_coke', line('bl_coke', 'Coke', 8000, 'food'));
  await seed('lines/bl_beer', line('bl_beer', 'Kingfisher', 49900, 'liquor', 'draft_bl2'));

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@bl.test');
  const captain = await login('captain@bl.test');
  if (!manager || !captain) { record(false, 'ABORT: staff login failed', { manager, captain }); return results; }
  // TD-040: an issue sends what the preview showed unless the check says otherwise.
  const as = async (sessionId, fn, body = {}) => call(`billing-${fn}`, { restaurantId: RID, sessionId, cid: 'cid_bl', draftId: 'draft_bl', tableIds: ['table_bl'], ...(fn === 'issue' ? { expectedV: await draftVersions(RID, body.draftId ?? 'draft_bl') } : {}), ...body });

  // ── BT parcel: a counter ticket carries the flat PACKING charge and not the service charge ──
  // Seeded here, first, so the rest of the suite (which sets charges: []) is untouched: pizza 50000 on
  // table_bl_p → packing 2000 taxed 50 + 50, food taxable 52000, payable 54600. The dine-in draft on
  // table_bl carries the 10 % service charge instead: base 58000 → 5800 taxed 145 + 145; block 66990, round-off +10 (BL-S6), payable 67000.
  {
    await delDoc('lines/bl_parcel'); await delDoc('tables/table_bl_p');
    await seed('tables/table_bl_p', { number: 'P1', capacity: 0, status: 'vacant', charges: ['PACKING'] });
    await seed('config/settings', { ...(await getDoc('config/settings')), billing: { ...(settings.billing || {}), charges: [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }, { type: 'PACKING', amount: 2000, taxBlockId: 'food', optIn: true }] } });
    await seed('lines/bl_parcel', { ...line('bl_parcel', 'Margherita', 50000, 'food', 'draft_bl_p'), tableId: 'table_bl_p' });
    const p = await as(manager, 'preview', { draftId: 'draft_bl_p', tableIds: ['table_bl_p'] });
    const d = p.data || {};
    check('BT-P parcel preview: PACKING 2000 only (no service charge), taxed 50 + 50, payable 54600', d.charges?.length === 1 && d.charges[0].type === 'PACKING' && d.charges[0].amount === 2000 && d.charges[0].tax?.parts?.map(x => x.amount).join(',') === '50,50' && d.payable === 54600, p);
    const t = await as(manager, 'preview', {});
    check('BT-P dine-in preview on the same config: SERVICE_CHARGE 5800 only, round-off +10, payable 67000', t.data?.charges?.length === 1 && t.data.charges[0].type === 'SERVICE_CHARGE' && t.data.charges[0].amount === 5800 && t.data.roundOff === 10 && t.data.payable === 67000, t);
    const dropped = await as(manager, 'preview', { draftId: 'draft_bl_p', tableIds: ['table_bl_p'], dropCharges: ['PACKING'] });
    check('BT-P dropCharges removes packing from the parcel: payable 52500', dropped.data?.charges?.length === 0 && dropped.data?.payable === 52500, dropped);
    await seed('config/settings', { ...(await getDoc('config/settings')), billing: { ...(settings.billing || {}), charges: [] } });
    await delDoc('lines/bl_parcel');
  }

  // BL-S1 preview
  {
    const r = await as(captain, 'preview', {});
    const d = r.data || {};
    check('BL-S1 captain previews pizza + coke → payable 60900, tax 1450 + 1450, no number', r.status === 'success' && d.payable === 60900 && d.taxTotal === 2900 && d.blocks?.[0]?.parts?.map(p => p.amount).join(',') === '1450,1450' && d.number === undefined, r);
    check('BL-S1 preview wrote no bill', (await listCol('bills')).filter(b => b.cid === 'cid_bl').length === 0);
  }
  // BL-S14
  {
    await seed('lines/bl_dal', line('bl_dal', 'Dal Tadka', 20000, null));
    const r = await as(manager, 'preview', {});
    check('BL-S14 a line with no tax block → failed-precondition naming Dal Tadka', errData(r).code === 'failed-precondition' && /Dal Tadka/.test(r.message || ''), r);
    await delDoc('lines/bl_dal');
  }
  // TD-040: the cashier previewed pizza + coke (₹609.00); a naan (₹60) lands before they press Issue.
  // The issue carries the preview's versions, so it is refused and takes no number.
  {
    const seen = await draftVersions(RID, 'draft_bl');
    await seed('lines/bl_naan', line('bl_naan', 'Butter Naan', 6000, 'food'));
    const r = await as(manager, 'issue', { expectedV: seen });
    check('TD-040 a dish added after the preview → failed-precondition "preview again" naming it', errData(r).code === 'failed-precondition' && /preview again/.test(r.message || '') && errData(r).lineId === 'bl_naan', r);
    check('TD-040 …and no invoice number was taken', (await listCol('counters')).filter(k => /^A_/.test(k.id)).length === 0);
    await delDoc('lines/bl_naan');
  }
  // BL-S7 issue
  let billId;
  {
    const c = await as(captain, 'issue', {});
    check('BL-S7 captain cannot issue → permission-denied', errData(c).code === 'permission-denied', c);
    const r = await as(manager, 'issue', { payable: 1 });
    const b = r.data || {};
    billId = b.billId;
    check('BL-S7 manager issues → number 0001 series A, payable 60900 (client money ignored), seller frozen', r.status === 'success' && b.number === '0001' && b.series === 'A' && b.payable === 60900 && b.seller?.taxId === 'GSTIN_E2E' && b.status === 'issued', r);
    check('BL-S7 counter A_<fy> is now {next: 2}', (await getDoc(`counters/A_${b.fiscalYear}`))?.next === 2);
    check('BL-S7 both lines carry billId', (await getDoc('lines/bl_pizza'))?.billId === billId && (await getDoc('lines/bl_coke'))?.billId === billId);
    const again = await as(manager, 'issue', {});
    check('BL-S7 second issue → failed-precondition "already issued"', errData(again).code === 'failed-precondition' && /already issued/.test(again.message || ''), again);
    const stored = await getDoc(`bills/${billId}`);
    check('BL-S7 stored bill has 2 frozen lines with tax keyed by component', stored?.lines?.length === 2 && stored.lines[0].tax?.[stored.lines[0].components[0].id]?.taxable > 0, stored);
  }
  // BL-S8 ST refuses on a billed line
  {
    const r = await call('approvals-apply', { restaurantId: RID, sessionId: manager, cid: 'cid_bl', lineId: 'bl_pizza', action: 'discount', amount: 50, reason: 'regular' });
    check('BL-S8 ₹50 off a billed line → failed-precondition "bill already issued"', errData(r).code === 'failed-precondition' && /already issued/.test(r.message || ''), r);
  }
  // BL-S9 cancel → re-issue 0002
  {
    const bad = await as(manager, 'cancel', { billId, reason: '', pin: '1234' });
    check('BL-S9 cancel without reason → invalid-argument (ST rule)', errData(bad).code === 'invalid-argument', bad);
    const ask = await as(manager, 'cancel', { billId, reason: 'other', note: 'service charge removed' });
    check('BL-S9 cancel without PIN → permission-denied requires pin, bill still issued', errData(ask).code === 'permission-denied' && errData(ask).requires === 'pin' && (await getDoc(`bills/${billId}`))?.status === 'issued', ask);
    const cap = await as(captain, 'cancel', { billId, reason: 'other', pin: '1234' });
    check('BL-S9 captain cannot cancel', errData(cap).code === 'permission-denied' && errData(cap).requires === undefined, cap);
    const r = await as(manager, 'cancel', { billId, reason: 'other', note: 'service charge removed', pin: '1234' });
    check('BL-S9 cancel → status cancelled, number 0001 kept', r.status === 'success' && r.data?.status === 'cancelled' && r.data?.number === '0001', r);
    check('BL-S9 lines freed (billId null)', (await getDoc('lines/bl_pizza'))?.billId === null);
    const audit = (await listCol('audit')).find(a => a.cid === 'cid_bl' && a.action === 'cancelBill');
    check('BL-S9 ST wrote the P0 audit row naming bill 0001 and ₹60900, no pin anywhere', audit?.sev === 'P0' && /bill 0001 ₹60900/.test(audit?.note || '') && !JSON.stringify(audit).includes('1234'), audit);
    const re = await as(manager, 'issue', {});
    billId = re.data?.billId;
    check('BL-S9 re-issue → 0002', re.data?.number === '0002', re);
    const twice = await as(manager, 'cancel', { billId: re.data?.billId, reason: 'other', pin: '1234' });
    check('BL-S9 cancel of 0002 then again → second is failed-precondition', twice.status === 'success' && errData(await as(manager, 'cancel', { billId, reason: 'other', pin: '1234' })).code === 'failed-precondition');
    const re3 = await as(manager, 'issue', {});
    billId = re3.data?.billId;
    check('BL-S9 third issue → 0003, no number reused', re3.data?.number === '0003', re3);
  }
  // BL-S11 credit note on a paid bill
  {
    const unpaid = await as(manager, 'creditNote', { billId, reason: 'complaint', pin: '1234', credits: [{ lineId: 'bl_coke', qty: 1 }] });
    check('BL-S11 credit note on an unpaid bill → failed-precondition', errData(unpaid).code === 'failed-precondition', unpaid);
    await seed(`bills/${billId}`, { ...(await getDoc(`bills/${billId}`)), status: 'paid' });   // PY's job; seeded here
    const ask = await as(manager, 'creditNote', { billId, reason: 'complaint', credits: [{ lineId: 'bl_coke', qty: 1 }] });
    check('BL-S11 credit note without PIN → requires pin', errData(ask).requires === 'pin', ask);
    const r = await as(manager, 'creditNote', { billId, reason: 'complaint', note: 'coke not served', pin: '1234', credits: [{ lineId: 'bl_coke', qty: 1 }] });
    const n = r.data || {};
    check('BL-S11 CN 0001 in series CN: payable −8400, cites 0003', r.status === 'success' && n.series === 'CN' && n.number === '0001' && n.payable === -8400 && n.creditNoteOf?.number === '0003', r);
    const o = await getDoc(`bills/${billId}`);
    check('BL-S11 original still paid, creditNotes[] has one, coke credited 1', o?.status === 'paid' && o?.creditNotes?.length === 1 && o?.lines?.find(l => l.lineId === 'bl_coke')?.credited?.qty === 1, o);
    const again = await as(manager, 'creditNote', { billId, reason: 'complaint', pin: '1234', credits: [{ lineId: 'bl_coke', qty: 1 }] });
    check('BL-S11 crediting the coke again → failed-precondition, CN counter stays 2', errData(again).code === 'failed-precondition' && (await getDoc(`counters/CN_${n.fiscalYear}`))?.next === 2, again);
    const g = await call('billing-get', { restaurantId: RID, sessionId: captain, billId });
    check('BL-S16 get returns the bill for a captain (reprint is ST audit)', g.status === 'success' && g.data?.number === '0003', g);
  }
  // BL-S4 / BL-S12 liquor draft on its own number
  {
    const p = await as(manager, 'preview', { draftId: 'draft_bl2' });
    check('BL-S4 beer 49900 in the liquor block, no tax part, payable 49900', p.data?.payable === 49900 && p.data?.taxTotal === 0 && p.data?.blocks?.[0]?.id === 'liquor', p);
    const mv = await as(manager, 'split', { moves: [{ lineId: 'bl_beer', toDraftId: 'draft_bl3' }] });
    check('BL-S12 split moves the beer to a third draft', mv.data?.moved === 1, mv);
    const r = await as(manager, 'issue', { draftId: 'draft_bl3' });
    check('BL-S12 the beer draft issues as 0004, payable 49900', r.data?.number === '0004' && r.data?.payable === 49900, r);
    const stuck = await as(manager, 'split', { moves: [{ lineId: 'bl_beer', toDraftId: 'draft_bl' }] });
    check('BL-S12 an issued line cannot be moved', errData(stuck).code === 'failed-precondition', stuck);
  }
  // ── TD-019: a bill-level discount goes through ST's door. Until 2026-09-16 `billing-issue`
  // took it straight from the request body: no PIN, no audit row, an approverId the caller typed.
  {
    const D = 'draft_bl_comp';
    await seed('lines/bl_comp', line('bl_comp', 'Walkout Biryani', 150000, 'food', D));
    const comp = { amount: 150000, pct: 100, source: { reason: 'guest left', note: 'left at 23:10', approverId: 'manager_bl' } };
    const as2 = async (sessionId, fn, body = {}) => call(`billing-${fn}`, { restaurantId: RID, sessionId, cid: 'cid_bl', draftId: D, tableIds: ['table_bl'], ...(fn === 'issue' ? { expectedV: await draftVersions(RID, D) } : {}), ...body });

    const pre = await as2(manager, 'preview', { discount: comp });
    check('TD-019 preview still shows what a comp would come to, with no PIN — looking costs nothing', pre.status === 'success' && pre.data?.payable === 0, pre);

    const before = (await listCol('bills')).length;
    const noPin = await as2(manager, 'issue', { discount: comp });
    check('TD-019 issuing a 100 % comp with no PIN → permission-denied requires pin, and no bill is written',
      errData(noPin).code === 'permission-denied' && errData(noPin).requires === 'pin' && (await listCol('bills')).length === before, noPin);

    const wrong = await as2(manager, 'issue', { discount: comp, pin: '9999' });
    check('TD-019 a wrong PIN is refused too', errData(wrong).wrong === true && (await listCol('bills')).length === before, wrong);

    const bad = await as2(manager, 'issue', { discount: { ...comp, source: { ...comp.source, reason: 'because' } }, pin: '1234' });
    check('TD-019 a reason that is not on the configured list → invalid-argument', errData(bad).code === 'invalid-argument', bad);

    const ok = await as2(manager, 'issue', { discount: comp, pin: '1234' });
    check('DC-S25a with the PIN the comp issues a numbered ₹0 bill that reads paid', ok.status === 'success' && ok.data?.payable === 0 && ok.data?.status === 'paid' && !!ok.data?.number, ok);
    const row = (await listCol('audit')).find(a => a.action === 'billDiscount');
    check('TD-019 and it leaves a P0 audit row naming who, why and how much — the audit is the point',
      row?.sev === 'P0' && row?.reason === 'guest left' && row?.staffId === 'manager_bl', row);

    await delDoc('lines/bl_comp');
    if (ok.data?.billId) await delDoc(`bills/${ok.data.billId}`);
  }

  // ── BL-S24 / TD-016 · the order offer becomes the bill discount, on the lines the offer actually named ──
  // The only end-to-end exercise of the `orderOffer` port: a real Offers V2 `appliedOffer` document on a real
  // order, read by the real adapter, apportioned by the real domain. Offer money on the order doc is FLOAT
  // RUPEES (old money), so ₹200 must arrive as 20000 paise.
  {
    const offLine = (id, name, list) => ({ ...line(id, name, list, 'food', 'draft_td016'), orderId: 'order_td016', cid: 'order_td016' });
    await seed('lines/bl_off_pizza', offLine('bl_off_pizza', 'Margherita', 50000));
    await seed('lines/bl_off_coke', offLine('bl_off_coke', 'Coke', 8000));
    const previewOffer = async appliedOffer => {
      await seed('orders/order_td016', { orderId: 'order_td016', appliedOffer });
      const r = await call('billing-preview', { restaurantId: RID, sessionId: manager, cid: 'cid_bl', draftId: 'draft_td016', tableIds: ['table_bl'], expectedV: {} });
      const by = Object.fromEntries((r.data?.lines || []).map(l => [l.lineId, l.billDiscount]));
      return { r, by, payable: r.data?.payable, offer: r.data?.offer };
    };

    // ITEM scope: appliedItems names the pizza's cart item and nothing else.
    {
      const { r, by, payable, offer } = await previewOffer({
        id: 'offer_flat_item_50', title: 'Flat 200 off the pizza', type: 'FLAT', scope: 'ITEM', discountAmount: 200,
        appliedItems: [{ menuItemId: 'mi_bl_off_pizza', cartItemId: 'bl_off_pizza', originalPrice: 500, discountAmount: 200, discountedPrice: 300 }],
      });
      check('BL-S24 the order offer is read off the order doc and converted to paise → 20000', offer?.amount === 20000, offer);
      check('TD-016 the ₹200 pizza offer lands entirely on the pizza line, nothing on the coke (old code: 17242 / 2758)',
        by.bl_off_pizza === 20000 && by.bl_off_coke === 0, by);
      check('TD-016 and the payable is unchanged at 39900 — the total was always right, the lines were not',
        payable === 39900 && r.data?.blocks?.[0]?.parts?.map(p => p.amount).join(',') === '950,950', r.data);
    }

    // ORDER scope: Offers V2 ships no itemised breakdown for it by design, so it must still spread by net share.
    {
      const { by, payable, offer } = await previewOffer({
        id: 'offer_first_time_20', title: '₹200 off the order', type: 'FLAT', scope: 'ORDER', discountAmount: 200, appliedItems: [],
      });
      check('TD-016 an ORDER offer carries no appliedItems and still spreads across every line: coke 2758, pizza 17242',
        by.bl_off_coke === 2758 && by.bl_off_pizza === 17242, by);
      check('TD-016 same payable either way: 39900', payable === 39900 && offer?.amount === 20000, { payable, offer });
    }

    // BL-S12 split: the offer names the pizza, so a bill holding only the coke claims none of it.
    {
      await seed('orders/order_td016', { orderId: 'order_td016', appliedOffer: {
        id: 'offer_flat_item_50', title: 'Flat 200 off the pizza', type: 'FLAT', scope: 'ITEM', discountAmount: 200,
        appliedItems: [{ menuItemId: 'mi_bl_off_pizza', cartItemId: 'bl_off_pizza', originalPrice: 500, discountAmount: 200, discountedPrice: 300 }],
      } });
      await seed('lines/bl_off_pizza', { ...offLine('bl_off_pizza', 'Margherita', 50000), draftId: 'draft_td016_b' });
      const r = await call('billing-preview', { restaurantId: RID, sessionId: manager, cid: 'cid_bl', draftId: 'draft_td016', tableIds: ['table_bl'], expectedV: {} });
      check('TD-016 BL-S12 the split half that holds none of the named lines gets no discount and claims none (old code: both halves took ₹200)',
        r.data?.payable === 8400 && r.data?.lines?.[0]?.billDiscount === 0 && r.data?.discount === null, r.data);
    }

    await delDoc('orders/order_td016');
    await delDoc('lines/bl_off_pizza'); await delDoc('lines/bl_off_coke');
  }

  return results;
}
