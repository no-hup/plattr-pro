/**
 * Suite: qa-findings. The QA findings of 2026-09-25 that only show when the REAL writers produce the state
 * (TESTING.md "Seams are tested from the real writer"): guest OTP → cart → checkout → billing-issue →
 * payments-take → floor-clear, on MockData7's res_meghana, the restaurant and menu the QA runs used.
 * Rules with pure logic are unit tests in test/unit/qa/. Fix plan: moonshot/reviews/2026-09-25-qa-fix-plan.md.
 *
 * Each open finding is recorded with `knownBug: '<id>'` (run.js): listed, not failed, while the bug is there;
 * a failure the day it passes, so the mark is removed with the fix.
 *
 * Own state: the suite wipes res_meghana's sittings, orders, lines, bills, carts, payments and audit rows,
 * then re-imports MockData7 on top (no --clean, nothing else is touched). Tables 7, 8, 10, 11, 12 only.
 *
 * Hand-computed at Meghana (5 % service charge, GST 5 % exclusive, bills round to the rupee):
 *   Butter Naan 6000 → 6000 + 300 SC = 6300 + 2 × 157.5 tax = 6615 → bill 6600 (the QA run's ₹66.00)
 *   Chicken 65 28000 + Coastal Crab Roast 62000, FLAT ₹100 order offer → the QA run's ₹882.00 (88200)
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../lib/config.js';
import { call, fsFor, draftVersions, errOf } from '../lib/rest.mjs';

const RID = 'res_meghana';
const PIN = '1234';
const NAAN = 'mi_butter_naan';
const T = n => `tbl_meg_${n}`;
const { getDoc, patchDoc, listCol, delDoc } = fsFor(RID);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ok = r => r?.status === 'success' || r?.success === true;
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };

async function wipeAndImport() {
  for (const col of ['sessions', 'lines', 'bills', 'orders', 'carts', 'payments', 'audit']) {
    for (let docs = await listCol(col, 300); docs.length; docs = await listCol(col, 300)) for (const d of docs) await delDoc(`${col}/${d.id}`);
  }
  execSync(`node "${resolve(__dirname, '../../../mock/importMockData5.js')}" --file=mock/MockData7ProductionMenus.json --refresh-timestamps`, {
    cwd: resolve(__dirname, '../../..'), env: { ...process.env, FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST }, stdio: 'ignore', timeout: 60000,
  });
}

let till;   // the cashier's login: till@ is a MANAGER (CLAUDE.md "the app's own name is the username")
const seat = async n => {
  await patchDoc(`tables/${T(n)}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const r = await call('table-validateOTP', { restaurantId: RID, tableId: T(n), otp: '123456', phoneNumber: '9876543210', name: `QA ${n}` });
  return need(r, `seat ${n}`).sessionId;
};
const order = async (n, guest, items) => {
  for (const id of items) need(await call('cart-addItemToCart', { restaurantId: RID, tableId: T(n), menuItemId: id, quantity: 1, sessionId: guest }), `add ${id}`);
  return need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(n), sessionId: guest }), `checkout ${n}`).orderId;
};
const issue = async (draftId, extra = {}) => need(await call('billing-issue', { restaurantId: RID, sessionId: till, draftId, cid: `qa_${draftId}_${Date.now()}`, expectedV: await draftVersions(RID, draftId), ...extra }), `issue ${draftId}`);
const preview = async draftId => need(await call('billing-preview', { restaurantId: RID, sessionId: till, draftId }), `preview ${draftId}`);
const walkOut = (n, cid) => call('floor-clear', { restaurantId: RID, staffSessionId: till, tableId: T(n), cid, reason: 'guest left', note: 'walk-out', pin: PIN });

export default async function qaFindingsSuite() {
  const results = { name: 'qa-findings', pass: 0, fail: 0, tests: [] };
  // knownBug: see run.js. The runner re-counts these; here they count like any other test.
  const check = (label, cond, actual, knownBug) => {
    results.tests.push({ pass: Boolean(cond), message: `${knownBug ? `[known bug] ${knownBug} ` : ''}${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual, knownBug });
    cond ? results.pass++ : results.fail++;
  };
  const scene = async (label, fn) => { try { await fn(); } catch (e) { check(`${label}: setup failed — ${e.message}`, false); } };

  await wipeAndImport();
  till = need(await call('server-serverLogin', { restaurantId: RID, username: 'till@meg.test', password: '1234' }), 'till login').sessionId;

  // ── QF-1 · P0 ── 21:10 the couple at 7 walks out on printed bill 6600; 21:30 a family sits at 7 and orders a
  // naan (6000). R9 / FL-S1: the family's 6000 is on a tile of table 7.
  await scene('QF-1', async () => {
    const couple = await seat(7);
    await order(7, couple, [NAAN]);
    const bill = await issue(couple);
    check('QF-1 setup: the couple\'s naan bills at 6600', bill.payable === 6600, bill);
    const out = await walkOut(7, 'qa_qf1_walkout');
    check('QF-1 setup: walk-out with the PIN frees table 7', ok(out) && (out.data?.freed || []).includes(T(7)), out);
    const family = await seat(7);
    await order(7, family, [NAAN]);
    const tiles = need(await call('floor-get', { restaurantId: RID, staffSessionId: till }), 'floor-get').tiles;
    const t7 = tiles.filter(t => t.tableIds.includes(T(7)));
    check('FL R9: the new party at walked-out table 7 shows its 6000 on the floor', t7.some(t => t.onTable === 6000), t7, 'QF-1');
  });

  // ── QF-6 · P2 ── Table 10's 6600 bill is printed, then they order a naan (6000), then walk out. The P0 row
  // "owed" is the amount abandoned: the bill 6600 plus what the naan would bill at, 6600 → 13200.
  // Today it is 6600 + 6000 = 12600, a post-tax figure plus a pre-tax one.
  await scene('QF-6', async () => {
    const g = await seat(10);
    await order(10, g, [NAAN]);
    await issue(g);
    await order(10, g, [NAAN]);
    need(await walkOut(10, 'qa_qf6_walkout'), 'walk-out 10');
    const row = await getDoc('audit/qa_qf6_walkout_clear');
    check('ST: the walk-out audit row records the abandoned amount as it would be billed, 13200', row?.owed === 13200, row, 'QF-6');
  });

  // ── QB-2 · P0 ── Table 11's 6600 bill; one guest pays 3300 cash; the cashier cancels with the PIN.
  // BL "Who can do what": cancel is for an issued, unpaid bill. Refused, and the bill keeps its 3300.
  await scene('QB-2', async () => {
    const g = await seat(11);
    await order(11, g, [NAAN]);
    const bill = await issue(g);
    need(await call('payments-take', { restaurantId: RID, sessionId: till, billId: bill.billId, paymentId: `qa_qb2_${Date.now()}`, tenderId: 'cash', amount: 3300, tendered: 3300 }), 'take 3300');
    const r = await call('billing-cancel', { restaurantId: RID, sessionId: till, cid: 'qa_qb2_cancel', billId: bill.billId, reason: 'other', pin: PIN });
    const after = await getDoc(`bills/${bill.billId}`);
    check('BL: a bill with 3300 cash on it cannot be cancelled, and stays issued', !ok(r) && errOf(r).code !== undefined && after?.status === 'issued', { r, status: after?.status, paidTotal: after?.paidTotal }, 'QB-2');
  });

  // ── QB-1 · P0 ── Table 12: Chicken 65 + Coastal Crab Roast, the ₹100 order offer fires, 88200. The crab is
  // split onto its own draft. However the offer is treated (dropped, D 2026-09-15; or apportioned), the two
  // halves never add up to less than the unsplit 88200. Today each half takes the full ₹100 (QA: 19800 + 57300).
  await scene('QB-1', async () => {
    const g = await seat(12);
    await order(12, g, ['mi_chicken65', 'mi_crab_roast']);
    const whole = await preview(g);
    check('QB-1 setup: the unsplit table previews at 88200', whole.payable === 88200, whole);
    const crab = (await listCol('lines')).find(l => l.sessionId === g && l.menuItemId === 'mi_crab_roast');
    need(await call('billing-split', { restaurantId: RID, sessionId: till, cid: 'qa_qb1_split', draftId: g, moves: [{ lineId: crab.lineId, toDraftId: `${g}_b` }] }), 'split');
    const a = await preview(g), b = await preview(`${g}_b`);
    check('BL-S12: the split halves add up to at least the unsplit 88200', a.payable + b.payable >= 88200, { a: a.payable, b: b.payable }, 'QB-1');
  });

  // ── QB-12 · P2 ── Table 8: a naan comped in full for a birthday (the till sends amount 6000, pct 100).
  // The P0 audit row says what was given: amount 6000, pct 100. Today pct is 0.
  await scene('QB-12', async () => {
    const g = await seat(8);
    await order(8, g, [NAAN]);
    const cid = `qa_qb12_${Date.now()}`;
    const bill = need(await call('billing-issue', { restaurantId: RID, sessionId: till, draftId: g, cid, expectedV: await draftVersions(RID, g), discount: { amount: 6000, pct: 100, source: { reason: 'birthday', note: '' } }, pin: PIN }), 'comp');
    check('QB-12 setup: the comped bill is paid at 0', bill.payable === 0 && bill.status === 'paid', bill);
    const row = (await listCol('audit')).find(a => a.cid === cid && a.action === 'billDiscount');
    check('ST: the comp audit row reads amount 6000, pct 100', row?.amount === 6000 && row?.pct === 100, row, 'QB-12');
  });

  return results;
}
